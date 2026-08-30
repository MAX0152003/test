import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './googleAuth';
import { 
  ClassSession, 
  AttendanceRecord, 
  ChatMessage, 
  UserProfile, 
  AuditLogEntry, 
  FacultyStatus, 
  LeaveRequest, 
  Enrollment, 
  ConsultationBooking 
} from '../types';
import { normalizeUserIdentity, generateSessionToken } from './authUtils';

/**
 * Interface for queued Firestore request items
 */
interface FirestoreQueueItem<T = any> {
  id: string;
  name: string;
  task: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  retriesRemaining: number;
  initialRetries: number;
  baseDelayMs: number;
  dedupKey?: string;
  createdAt: number;
}

/**
 * Centralized Central Firestore Request Queue with Exponential Backoff and Jitter
 * Ensures high-frequency UI events do not exceed Firestore transaction limits or block the main thread.
 */
class FirestoreRequestQueue {
  private queue: FirestoreQueueItem[] = [];
  private activeCount = 0;
  private maxConcurrency = 3;
  private pendingDedupKeys = new Map<string, FirestoreQueueItem>();

  public enqueue<T>(
    name: string,
    task: () => Promise<T>,
    options?: {
      maxRetries?: number;
      baseDelayMs?: number;
      dedupKey?: string;
    }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const maxRetries = options?.maxRetries ?? 3;
      const baseDelayMs = options?.baseDelayMs ?? 200;
      const dedupKey = options?.dedupKey;

      const item: FirestoreQueueItem<T> = {
        id: `fq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        task,
        resolve,
        reject,
        retriesRemaining: maxRetries,
        initialRetries: maxRetries,
        baseDelayMs,
        dedupKey,
        createdAt: Date.now()
      };

      if (dedupKey && this.pendingDedupKeys.has(dedupKey)) {
        // Coalesce rapid writes to the same document key
        const existing = this.pendingDedupKeys.get(dedupKey)!;
        existing.task = task;
        existing.resolve = resolve;
        return;
      }

      if (dedupKey) {
        this.pendingDedupKeys.set(dedupKey, item);
      }

      this.queue.push(item);
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    if (item.dedupKey) {
      this.pendingDedupKeys.delete(item.dedupKey);
    }

    this.activeCount++;

    try {
      const result = await item.task();
      item.resolve(result);
    } catch (error: any) {
      const isRetryable = this.isRetryableError(error);

      if (isRetryable && item.retriesRemaining > 0) {
        const attempt = item.initialRetries - item.retriesRemaining + 1;
        const jitter = Math.random() * 100;
        const delay = Math.min(item.baseDelayMs * Math.pow(2, attempt - 1) + jitter, 4000);
        console.warn(`[FirestoreQueue] Task ${item.name} (${item.id}) failed transiently. Retrying in ${Math.round(delay)}ms (attempt ${attempt}/${item.initialRetries})...`);
        
        item.retriesRemaining--;
        setTimeout(() => {
          this.queue.unshift(item); // Prioritize retry at front
          this.processNext();
        }, delay);
      } else {
        console.warn(`[FirestoreQueue] Task ${item.name} completed with error (permanent or max retries reached):`, error?.message || error);
        item.reject(error);
      }
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    const msg = (error.message || error.code || String(error)).toLowerCase();

    // Permission denied or missing is NOT transient — do not spam Firestore
    if (msg.includes('permission') || msg.includes('unauthorized') || msg.includes('permission-denied')) {
      return false;
    }

    if (
      msg.includes('unavailable') ||
      msg.includes('resource-exhausted') ||
      msg.includes('deadline-exceeded') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('failed to fetch') ||
      msg.includes('aborted')
    ) {
      return true;
    }

    // Default to transient for generic fetch anomalies
    return true;
  }

  public getQueueStats() {
    return {
      pending: this.queue.length,
      active: this.activeCount,
      maxConcurrency: this.maxConcurrency
    };
  }
}

export const firestoreQueue = new FirestoreRequestQueue();

/**
 * Recursively removes undefined fields from an object or array before passing to Firestore setDoc/updateDoc.
 * Firestore will throw "Unsupported field value: undefined" if any object key is undefined.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

/**
 * Sync enrollments: pulls all subject enrollments from Firestore via centralized queue.
 */
export async function syncEnrollmentsFromFirestore(
  isOffline: boolean,
  onSync: (enrollments: Enrollment[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'enrollments';

  return firestoreQueue.enqueue('syncEnrollments', async () => {
    try {
      const querySnapshot = await getDocs(collection(db, colPath));
      const enrollments: Enrollment[] = [];
      querySnapshot.forEach((docSnap) => {
        enrollments.push(docSnap.data() as Enrollment);
      });
      if (enrollments.length > 0) {
        onSync(enrollments);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  });
}

/**
 * Saves or updates an Enrollment document in Firestore via centralized queue.
 */
export async function saveEnrollmentToFirestore(
  isOffline: boolean,
  enrollmentObj: Enrollment
): Promise<void> {
  if (isOffline || !enrollmentObj || !enrollmentObj.id) return;
  const colPath = 'enrollments';

  return firestoreQueue.enqueue(
    `saveEnrollment:${enrollmentObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, enrollmentObj.id), sanitizeForFirestore(enrollmentObj), { merge: true });
        console.log(`Enrollment ${enrollmentObj.id} (${enrollmentObj.studentName} in ${enrollmentObj.classId}) saved to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${enrollmentObj.id}`);
      }
    },
    { dedupKey: `enrollment:${enrollmentObj.id}` }
  );
}

/**
 * Deletes an Enrollment document from Firestore via centralized queue.
 */
export async function deleteEnrollmentFromFirestore(
  isOffline: boolean,
  enrollmentId: string
): Promise<void> {
  if (isOffline || !enrollmentId) return;
  const colPath = 'enrollments';

  return firestoreQueue.enqueue(`deleteEnrollment:${enrollmentId}`, async () => {
    try {
      await deleteDoc(doc(db, colPath, enrollmentId));
      console.log(`Enrollment ${enrollmentId} deleted from Firestore.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colPath}/${enrollmentId}`);
    }
  });
}

/**
 * Real-time listener for subject enrollments from Firestore.
 */
export function listenToEnrollments(
  isOffline: boolean,
  onSync: (enrollments: Enrollment[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'enrollments';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const enrollments: Enrollment[] = [];
        snapshot.forEach((docSnap) => {
          enrollments.push(docSnap.data() as Enrollment);
        });
        if (enrollments.length > 0) {
          onSync(enrollments);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToEnrollments error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToEnrollments setup error:", error);
    return () => {};
  }
}

/**
 * Sync classes: pulls classes from Firestore via centralized queue.
 */
export async function syncClassesFromFirestore(
  isOffline: boolean,
  onSync: (classes: ClassSession[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'classes';

  return firestoreQueue.enqueue('syncClasses', async () => {
    try {
      const querySnapshot = await getDocs(collection(db, colPath));
      const classes: ClassSession[] = [];
      querySnapshot.forEach((docSnap) => {
        classes.push(docSnap.data() as ClassSession);
      });
      if (classes.length > 0) {
        onSync(classes);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  });
}

/**
 * Saves or updates a ClassSession document in Firestore via centralized queue.
 */
export async function saveClassToFirestore(
  isOffline: boolean,
  classObj: ClassSession
): Promise<void> {
  if (isOffline || !classObj || !classObj.id) return;
  const colPath = 'classes';

  return firestoreQueue.enqueue(
    `saveClass:${classObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, classObj.id), sanitizeForFirestore(classObj), { merge: true });
        console.log(`Class ${classObj.code} saved to Firestore successfully.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${classObj.id}`);
      }
    },
    { dedupKey: `class:${classObj.id}` }
  );
}

/**
 * Deletes a ClassSession document from Firestore via centralized queue.
 */
export async function deleteClassFromFirestore(
  isOffline: boolean,
  classId: string
): Promise<void> {
  if (isOffline || !classId) return;
  const colPath = 'classes';

  return firestoreQueue.enqueue(`deleteClass:${classId}`, async () => {
    try {
      await deleteDoc(doc(db, colPath, classId));
      console.log(`Class ${classId} deleted from Firestore successfully.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colPath}/${classId}`);
    }
  });
}

/**
 * Sync attendance records: pulls records from Firestore via centralized queue.
 */
export async function syncAttendanceFromFirestore(
  isOffline: boolean,
  onSync: (records: AttendanceRecord[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'records';

  return firestoreQueue.enqueue('syncAttendance', async () => {
    try {
      const querySnapshot = await getDocs(collection(db, colPath));
      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        records.push(docSnap.data() as AttendanceRecord);
      });
      if (records.length > 0) {
        onSync(records);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  });
}

/**
 * Real-time listener for attendance records from Firestore.
 */
export function listenToAttendance(
  isOffline: boolean,
  onSync: (records: AttendanceRecord[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'records';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push(docSnap.data() as AttendanceRecord);
        });
        if (records.length > 0) {
          onSync(records);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToAttendance error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToAttendance setup error:", error);
    return () => {};
  }
}

/**
 * Real-time listener for classes from Firestore.
 */
export function listenToClasses(
  isOffline: boolean,
  onSync: (classes: ClassSession[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'classes';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const classes: ClassSession[] = [];
        snapshot.forEach((docSnap) => {
          classes.push(docSnap.data() as ClassSession);
        });
        if (classes.length > 0) {
          onSync(classes);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToClasses error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToClasses setup error:", error);
    return () => {};
  }
}

/**
 * Saves or updates an AttendanceRecord in Firestore via centralized queue.
 */
export async function saveAttendanceToFirestore(
  isOffline: boolean,
  recordObj: AttendanceRecord
): Promise<void> {
  if (isOffline || !recordObj || !recordObj.id) return;
  const colPath = 'records';

  return firestoreQueue.enqueue(
    `saveAttendance:${recordObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, recordObj.id), sanitizeForFirestore(recordObj), { merge: true });
        console.log(`Attendance record ${recordObj.id} saved to Firestore successfully.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${recordObj.id}`);
      }
    },
    { dedupKey: `attendance:${recordObj.id}` }
  );
}

/**
 * Listen to real-time chat messages from Firestore.
 */
export function listenToMessages(
  isOffline: boolean,
  onMessagesUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'messages';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push(docSnap.data() as ChatMessage);
        });
        msgs.sort((a, b) => {
          const aId = parseInt(a.id.replace('msg-', '')) || 0;
          const bId = parseInt(b.id.replace('msg-', '')) || 0;
          return aId - bId;
        });
        onMessagesUpdate(msgs);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, colPath);
        } catch (e) {
          console.warn("[Firestore] listenToMessages error caught safely:", e);
        }
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
    return () => {};
  }
}

/**
 * Saves a ChatMessage to Firestore via centralized queue.
 */
export async function saveMessageToFirestore(
  isOffline: boolean,
  messageObj: ChatMessage
): Promise<void> {
  if (isOffline || !messageObj || !messageObj.id) return;
  const colPath = 'messages';

  return firestoreQueue.enqueue(
    `saveMessage:${messageObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, messageObj.id), sanitizeForFirestore(messageObj), { merge: true });
        console.log(`Message ${messageObj.id} sent and committed to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${messageObj.id}`);
      }
    },
    { dedupKey: `msg:${messageObj.id}` }
  );
}

/**
 * Saves or updates a user profile in Firestore via centralized queue.
 */
export async function saveUserProfileToFirestore(
  isOffline: boolean,
  profile: UserProfile
): Promise<void> {
  if (isOffline || !profile || !profile.id) return;
  const colPath = 'users';

  return firestoreQueue.enqueue(
    `saveUserProfile:${profile.id}`,
    async () => {
      try {
        const cleanProfile = sanitizeForFirestore(profile);
        await setDoc(doc(db, colPath, profile.id), cleanProfile, { merge: true });
        
        // Also sync to registered_users collection so admin directory and other clients receive it
        const regUserDoc = {
          ...cleanProfile,
          uid: profile.studentId || profile.facultyId || profile.id
        };
        await setDoc(doc(db, 'registered_users', profile.id), regUserDoc, { merge: true });

        // Update local registered users cache
        if (typeof localStorage !== 'undefined') {
          try {
            const currentReg: any[] = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
            let matched = false;
            const updatedReg = currentReg.map(u => {
              if (u.id === profile.id || (u.email && profile.email && u.email.toLowerCase() === profile.email.toLowerCase())) {
                matched = true;
                return { ...u, ...regUserDoc };
              }
              return u;
            });
            if (!matched) {
              updatedReg.push(regUserDoc);
            }
            localStorage.setItem('classpulse_registered_users', JSON.stringify(updatedReg));
            localStorage.setItem('classpulse_registered_admins', JSON.stringify(updatedReg.filter(u => u.role === 'admin')));
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('registered-users-changed'));
            }
          } catch (storageErr) {
            console.warn("Storage sync warning in saveUserProfileToFirestore:", storageErr);
          }
        }

        console.log(`User profile for ${profile.name} updated in Firestore (users & registered_users).`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${profile.id}`);
      }
    },
    { dedupKey: `profile:${profile.id}` }
  );
}

/**
 * Saves or updates a registered user account in Firestore via centralized queue.
 */
export async function saveRegisteredUserToFirestore(
  isOffline: boolean,
  userObj: any
): Promise<void> {
  if (isOffline || !userObj || !userObj.id) return;
  const colPath = 'registered_users';

  return firestoreQueue.enqueue(
    `saveRegisteredUser:${userObj.id}`,
    async () => {
      try {
        const cleanObj = sanitizeForFirestore(userObj);
        await setDoc(doc(db, colPath, userObj.id), cleanObj, { merge: true });
        await setDoc(doc(db, 'users', userObj.id), cleanObj, { merge: true });
        console.log(`Registered user ${userObj.email || userObj.name} saved to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${userObj.id}`);
      }
    },
    { dedupKey: `registeredUser:${userObj.id}` }
  );
}

/**
 * Directly looks up a user from Firestore across registered_users and users collections.
 */
export async function fetchUserByEmailOrIdFromFirestore(identifier: string): Promise<any | null> {
  if (!identifier) return null;
  const cleanId = identifier.toLowerCase().trim();

  return firestoreQueue.enqueue(`fetchUser:${cleanId}`, async () => {
    try {
      // 1. Check registered_users collection
      const userSnap = await getDocs(collection(db, 'registered_users'));
      for (const docSnap of userSnap.docs) {
        const u = docSnap.data();
        if (
          (u.email && u.email.toLowerCase().trim() === cleanId) ||
          (u.uid && u.uid.toLowerCase().trim() === cleanId) ||
          (u.id && u.id.toLowerCase().trim() === cleanId) ||
          (u.name && u.name.toLowerCase().trim() === cleanId)
        ) {
          return u;
        }
      }

      // 2. Check users collection
      const profileSnap = await getDocs(collection(db, 'users'));
      for (const docSnap of profileSnap.docs) {
        const u = docSnap.data();
        if (
          (u.email && u.email.toLowerCase().trim() === cleanId) ||
          (u.uid && u.uid.toLowerCase().trim() === cleanId) ||
          (u.id && u.id.toLowerCase().trim() === cleanId) ||
          (u.studentId && u.studentId.toLowerCase().trim() === cleanId) ||
          (u.facultyId && u.facultyId.toLowerCase().trim() === cleanId) ||
          (u.name && u.name.toLowerCase().trim() === cleanId)
        ) {
          return u;
        }
      }
      return null;
    } catch (err) {
      console.warn("[Firestore] Error in fetchUserByEmailOrIdFromFirestore:", err);
      return null;
    }
  });
}

/**
 * Directly looks up password credential from Firestore via centralized queue.
 */
export async function fetchUserCredentialFromFirestore(key: string): Promise<string | null> {
  if (!key) return null;
  const sanitizedKey = key.toLowerCase().trim();
  const safeDocId = sanitizedKey.replace(/[^a-zA-Z0-9_-]/g, '_');

  return firestoreQueue.enqueue(`fetchCredential:${sanitizedKey}`, async () => {
    try {
      const directDoc = await getDoc(doc(db, 'credentials', safeDocId));
      if (directDoc.exists() && directDoc.data()?.password) {
        return directDoc.data().password;
      }

      const uriDoc = await getDoc(doc(db, 'credentials', encodeURIComponent(sanitizedKey)));
      if (uriDoc.exists() && uriDoc.data()?.password) {
        return uriDoc.data().password;
      }

      const credSnap = await getDocs(collection(db, 'credentials'));
      for (const docSnap of credSnap.docs) {
        const data = docSnap.data();
        if (data && (data.key === sanitizedKey || docSnap.id === safeDocId || docSnap.id === sanitizedKey)) {
          return data.password;
        }
      }
      return null;
    } catch (err) {
      console.warn("[Firestore] Error in fetchUserCredentialFromFirestore:", err);
      return null;
    }
  });
}

/**
 * Deletes a registered user account from Firestore via centralized queue.
 */
export async function deleteRegisteredUserFromFirestore(
  isOffline: boolean,
  userId: string
): Promise<void> {
  if (isOffline || !userId) return;
  const colPath = 'registered_users';

  return firestoreQueue.enqueue(`deleteRegisteredUser:${userId}`, async () => {
    try {
      await deleteDoc(doc(db, colPath, userId));
      await deleteDoc(doc(db, 'users', userId));
      console.log(`User ${userId} deleted from Firestore.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colPath}/${userId}`);
    }
  });
}

/**
 * Saves or updates custom password credentials in Firestore via centralized queue.
 */
export async function saveUserCredentialToFirestore(
  isOffline: boolean,
  key: string,
  password: string
): Promise<void> {
  if (isOffline || !key || !password) return;
  const sanitizedKey = key.toLowerCase().trim();
  const safeDocId = sanitizedKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  const colPath = 'credentials';

  return firestoreQueue.enqueue(
    `saveCredential:${safeDocId}`,
    async () => {
      try {
        await setDoc(
          doc(db, colPath, safeDocId),
          sanitizeForFirestore({ id: safeDocId, key: sanitizedKey, password: password.trim(), updatedAt: new Date().toISOString() }),
          { merge: true }
        );
        console.log(`Credential for ${sanitizedKey} saved to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${safeDocId}`);
      }
    },
    { dedupKey: `cred:${safeDocId}` }
  );
}

/**
 * Saves or updates a password reset request in Firestore via centralized queue.
 */
export async function savePasswordResetToFirestore(
  isOffline: boolean,
  resetReq: any
): Promise<void> {
  if (isOffline || !resetReq || !resetReq.id) return;
  const colPath = 'password_resets';

  return firestoreQueue.enqueue(
    `savePasswordReset:${resetReq.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, resetReq.id), sanitizeForFirestore(resetReq), { merge: true });
        console.log(`Password reset request ${resetReq.id} saved to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${resetReq.id}`);
      }
    },
    { dedupKey: `reset:${resetReq.id}` }
  );
}

/**
 * Real-time listener for registered users from Firestore.
 */
export function listenToRegisteredUsers(
  isOffline: boolean,
  onSync?: (users: any[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'registered_users';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const users: any[] = [];
        snapshot.forEach((docSnap) => {
          users.push(docSnap.data());
        });
        if (users.length > 0) {
          let localUsers: any[] = [];
          try {
            localUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
          } catch {}
          const userMap = new Map<string, any>();
          localUsers.forEach(u => u.id && userMap.set(u.id, u));
          users.forEach(u => u.id && userMap.set(u.id, u));
          const merged = Array.from(userMap.values());

          localStorage.setItem('classpulse_registered_users', JSON.stringify(merged));
          localStorage.setItem('classpulse_registered_admins', JSON.stringify(merged.filter(u => u.role === 'admin')));
          window.dispatchEvent(new Event('registered-users-changed'));
          if (onSync) onSync(merged);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToRegisteredUsers error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToRegisteredUsers setup error:", error);
    return () => {};
  }
}

/**
 * Real-time listener for credentials from Firestore.
 */
export function listenToCredentials(
  isOffline: boolean
): () => void {
  if (isOffline) return () => {};
  const colPath = 'credentials';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        let savedPasswords: Record<string, string> = {};
        try {
          savedPasswords = JSON.parse(localStorage.getItem('classpulse_custom_passwords') || '{}');
        } catch {}
        
        let changed = false;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && data.key && data.password) {
            savedPasswords[data.key] = data.password;
            changed = true;
          }
        });

        if (changed) {
          localStorage.setItem('classpulse_custom_passwords', JSON.stringify(savedPasswords));
        }
      },
      (error) => {
        console.warn("[Firestore] listenToCredentials error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToCredentials setup error:", error);
    return () => {};
  }
}

/**
 * Real-time listener for password reset requests from Firestore.
 */
export function listenToPasswordResets(
  isOffline: boolean,
  onSync?: (resets: any[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'password_resets';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const resets: any[] = [];
        snapshot.forEach((docSnap) => {
          resets.push(docSnap.data());
        });
        if (resets.length > 0) {
          localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(resets));
          window.dispatchEvent(new Event('password-reset-requests-changed'));
          if (onSync) onSync(resets);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToPasswordResets error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToPasswordResets setup error:", error);
    return () => {};
  }
}

/**
 * Synchronizes all registered accounts, credentials, and password resets from Firestore via centralized queue.
 */
export async function syncAllAccountsFromFirestore(isOffline: boolean): Promise<void> {
  if (isOffline) return;

  return firestoreQueue.enqueue('syncAllAccounts', async () => {
    try {
      // 1. Fetch registered_users
      const userSnap = await getDocs(collection(db, 'registered_users'));
      const firestoreUsers: any[] = [];
      userSnap.forEach((docSnap) => {
        firestoreUsers.push(docSnap.data());
      });

      let localUsers: any[] = [];
      try {
        localUsers = JSON.parse(localStorage.getItem('classpulse_registered_users') || '[]');
      } catch {}

      const userMap = new Map<string, any>();
      localUsers.forEach(u => u && u.id && userMap.set(u.id, u));
      firestoreUsers.forEach(u => u && u.id && userMap.set(u.id, u));

      const combinedUsers = Array.from(userMap.values());
      localStorage.setItem('classpulse_registered_users', JSON.stringify(combinedUsers));
      localStorage.setItem('classpulse_registered_admins', JSON.stringify(combinedUsers.filter(u => u.role === 'admin')));
      window.dispatchEvent(new Event('registered-users-changed'));

      // 2. Fetch credentials
      const credSnap = await getDocs(collection(db, 'credentials'));
      let savedPasswords: Record<string, string> = {};
      try {
        savedPasswords = JSON.parse(localStorage.getItem('classpulse_custom_passwords') || '{}');
      } catch {}

      credSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.key && data.password) {
          savedPasswords[data.key] = data.password;
        }
      });

      localStorage.setItem('classpulse_custom_passwords', JSON.stringify(savedPasswords));

      // 3. Fetch password_resets
      const resetSnap = await getDocs(collection(db, 'password_resets'));
      const firestoreResets: any[] = [];
      resetSnap.forEach((docSnap) => {
        firestoreResets.push(docSnap.data());
      });

      let localResets: any[] = [];
      try {
        localResets = JSON.parse(localStorage.getItem('classpulse_password_reset_requests') || '[]');
      } catch {}

      const resetMap = new Map<string, any>();
      localResets.forEach(r => r.id && resetMap.set(r.id, r));
      firestoreResets.forEach(r => r.id && resetMap.set(r.id, r));

      const combinedResets = Array.from(resetMap.values());
      if (combinedResets.length > 0) {
        localStorage.setItem('classpulse_password_reset_requests', JSON.stringify(combinedResets));
        window.dispatchEvent(new Event('password-reset-requests-changed'));

        for (const r of combinedResets) {
          if (!firestoreResets.some(fr => fr.id === r.id)) {
            await savePasswordResetToFirestore(isOffline, r);
          }
        }
      }
    } catch (err) {
      console.warn("[Firestore] Error syncing all accounts from Firestore:", err);
    }
  });
}

/**
 * Creates an Account Link document in Firestore for scanning QR code from Desktop to Mobile.
 */
export async function createSessionLinkInFirestore(
  isOffline: boolean,
  userProfile: any
): Promise<{ tokenId: string; payload: any; encodedPayload: string } | null> {
  if (isOffline || !userProfile) return null;
  const tokenData = generateSessionToken(userProfile);
  const colPath = 'session_links';

  return firestoreQueue.enqueue(`createSessionLink:${tokenData.tokenId}`, async () => {
    try {
      await setDoc(doc(db, colPath, tokenData.tokenId), sanitizeForFirestore({
        tokenId: tokenData.tokenId,
        userProfile: normalizeUserIdentity(userProfile),
        status: 'pending',
        createdAt: tokenData.payload.createdAt,
        expiresAt: tokenData.payload.expiresAt,
        claimedByDevice: null
      }));
      console.log(`Session link ${tokenData.tokenId} generated in Firestore.`);
      return tokenData;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${colPath}/${tokenData.tokenId}`);
      return null;
    }
  });
}

/**
 * Claims a session link on mobile device from scanned QR code.
 */
export async function claimSessionLinkFromFirestore(
  isOffline: boolean,
  tokenId: string
): Promise<any | null> {
  if (isOffline || !tokenId) return null;
  const colPath = 'session_links';

  return firestoreQueue.enqueue(`claimSessionLink:${tokenId}`, async () => {
    try {
      const docRef = doc(db, colPath, tokenId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.warn("Session link token not found or expired.");
        return null;
      }

      const data = docSnap.data();
      if (data.status === 'expired' || new Date(data.expiresAt).getTime() < Date.now()) {
        console.warn("Session link token has expired.");
        return null;
      }

      await setDoc(docRef, { status: 'claimed', claimedAt: new Date().toISOString() }, { merge: true });
      return data.userProfile;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${colPath}/${tokenId}`);
      return null;
    }
  });
}

/**
 * Listen to a session link document on Desktop to detect when Mobile successfully scans it.
 */
export function listenToSessionLink(
  isOffline: boolean,
  tokenId: string,
  onClaimed: (data: any) => void
): () => void {
  if (isOffline || !tokenId) return () => {};
  const colPath = 'session_links';

  try {
    const unsubscribe = onSnapshot(doc(db, colPath, tokenId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'claimed') {
          onClaimed(data);
        }
      }
    });
    return unsubscribe;
  } catch (error) {
    console.warn("listenToSessionLink error:", error);
    return () => {};
  }
}

/**
 * Saves an immutable AuditLogEntry to Firestore via centralized queue.
 */
export async function saveAuditLogToFirestore(
  isOffline: boolean,
  auditLog: AuditLogEntry
): Promise<void> {
  if (isOffline || !auditLog || !auditLog.id) return;
  const colPath = 'audit_logs';

  return firestoreQueue.enqueue(
    `saveAuditLog:${auditLog.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, auditLog.id), sanitizeForFirestore(auditLog), { merge: true });
      } catch (error) {
        console.warn("[Firestore] Could not save audit log:", error);
      }
    },
    { dedupKey: `audit:${auditLog.id}` }
  );
}

/**
 * Listens to real-time Audit Logs from Firestore.
 */
export function listenToAuditLogs(
  isOffline: boolean,
  onSync: (logs: AuditLogEntry[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'audit_logs';
  try {
    const q = query(collection(db, colPath), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: AuditLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          logs.push(docSnap.data() as AuditLogEntry);
        });
        if (logs.length > 0) {
          onSync(logs);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToAuditLogs error caught safely:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToAuditLogs setup error:", error);
    return () => {};
  }
}

/**
 * Clears volatile local cache and re-fetches all Firestore collections via centralized queue.
 */
export async function forceResyncAllFromFirestore(
  isOffline: boolean,
  callbacks?: {
    onClassesSync?: (classes: ClassSession[]) => void;
    onAttendanceSync?: (records: AttendanceRecord[]) => void;
    onEnrollmentsSync?: (enrollments: Enrollment[]) => void;
    onUserSync?: () => void;
  }
): Promise<{ success: boolean; durationMs: number; stats: { users: number; classes: number; records: number; enrollments: number } }> {
  const startTime = Date.now();
  if (isOffline) {
    return { success: false, durationMs: Date.now() - startTime, stats: { users: 0, classes: 0, records: 0, enrollments: 0 } };
  }

  return firestoreQueue.enqueue('forceResyncAll', async () => {
    try {
      await syncAllAccountsFromFirestore(false);

      let classCount = 0;
      await syncClassesFromFirestore(false, (fetchedClasses) => {
        classCount = fetchedClasses.length;
        if (callbacks?.onClassesSync) callbacks.onClassesSync(fetchedClasses);
      });

      let recordCount = 0;
      await syncAttendanceFromFirestore(false, (fetchedRecords) => {
        recordCount = fetchedRecords.length;
        if (callbacks?.onAttendanceSync) callbacks.onAttendanceSync(fetchedRecords);
      });

      let enrollmentCount = 0;
      await syncEnrollmentsFromFirestore(false, (fetchedEnrollments) => {
        enrollmentCount = fetchedEnrollments.length;
        if (callbacks?.onEnrollmentsSync) callbacks.onEnrollmentsSync(fetchedEnrollments);
      });

      if (callbacks?.onUserSync) callbacks.onUserSync();

      const usersListRaw = localStorage.getItem('classpulse_registered_users') || '[]';
      let usersCount = 0;
      try {
        usersCount = JSON.parse(usersListRaw).length;
      } catch {}

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        durationMs,
        stats: {
          users: usersCount,
          classes: classCount,
          records: recordCount,
          enrollments: enrollmentCount
        }
      };
    } catch (err) {
      console.error("[Firestore] forceResyncAllFromFirestore failed:", err);
      return { success: false, durationMs: Date.now() - startTime, stats: { users: 0, classes: 0, records: 0, enrollments: 0 } };
    }
  });
}

/**
 * Sync faculty statuses: pulls statuses from Firestore via centralized queue.
 */
export async function syncFacultyStatusesFromFirestore(
  isOffline: boolean,
  onSync: (statuses: FacultyStatus[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'faculty_statuses';

  return firestoreQueue.enqueue('syncFacultyStatuses', async () => {
    try {
      const querySnapshot = await getDocs(collection(db, colPath));
      const statuses: FacultyStatus[] = [];
      querySnapshot.forEach((docSnap) => {
        statuses.push(docSnap.data() as FacultyStatus);
      });
      if (statuses.length > 0) {
        onSync(statuses);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  });
}

/**
 * Saves or updates a FacultyStatus in Firestore via centralized queue.
 */
export async function saveFacultyStatusToFirestore(
  isOffline: boolean,
  statusObj: FacultyStatus
): Promise<void> {
  if (isOffline || !statusObj || !statusObj.id) return;
  const colPath = 'faculty_statuses';

  return firestoreQueue.enqueue(
    `saveFacultyStatus:${statusObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, statusObj.id), sanitizeForFirestore(statusObj), { merge: true });
        console.log(`Faculty status for ${statusObj.name} (${statusObj.status}) saved to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${statusObj.id}`);
      }
    },
    { dedupKey: `facultyStatus:${statusObj.id}` }
  );
}

/**
 * Real-time listener for faculty statuses from Firestore.
 */
export function listenToFacultyStatuses(
  isOffline: boolean,
  onSync: (statuses: FacultyStatus[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'faculty_statuses';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const statuses: FacultyStatus[] = [];
        snapshot.forEach((docSnap) => {
          statuses.push(docSnap.data() as FacultyStatus);
        });
        if (statuses.length > 0) {
          onSync(statuses);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToFacultyStatuses error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToFacultyStatuses setup error:", error);
    return () => {};
  }
}

/**
 * Sync excuse letters: pulls filed student excuse letters from Firestore via centralized queue.
 */
export async function syncExcuseLettersFromFirestore(
  isOffline: boolean,
  onSync: (letters: LeaveRequest[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'excuse_letters';

  return firestoreQueue.enqueue('syncExcuseLetters', async () => {
    try {
      const querySnapshot = await getDocs(collection(db, colPath));
      const letters: LeaveRequest[] = [];
      querySnapshot.forEach((docSnap) => {
        letters.push(docSnap.data() as LeaveRequest);
      });
      if (letters.length > 0) {
        onSync(letters);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  });
}

/**
 * Saves or updates an excuse letter in Firestore via centralized queue.
 */
export async function saveExcuseLetterToFirestore(
  isOffline: boolean,
  letterObj: LeaveRequest
): Promise<void> {
  if (isOffline || !letterObj || !letterObj.id) return;
  const colPath = 'excuse_letters';

  return firestoreQueue.enqueue(
    `saveExcuseLetter:${letterObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, letterObj.id), sanitizeForFirestore(letterObj), { merge: true });
        console.log(`Excuse letter ${letterObj.id} (${letterObj.studentName}) committed to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${letterObj.id}`);
      }
    },
    { dedupKey: `excuse:${letterObj.id}` }
  );
}

/**
 * Deletes an excuse letter from Firestore via centralized queue.
 */
export async function deleteExcuseLetterFromFirestore(
  isOffline: boolean,
  letterId: string
): Promise<void> {
  if (isOffline || !letterId) return;
  const colPath = 'excuse_letters';

  return firestoreQueue.enqueue(`deleteExcuseLetter:${letterId}`, async () => {
    try {
      await deleteDoc(doc(db, colPath, letterId));
      console.log(`Excuse letter ${letterId} deleted from Firestore.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colPath}/${letterId}`);
    }
  });
}

/**
 * Real-time listener for excuse letters from Firestore.
 */
export function listenToExcuseLetters(
  isOffline: boolean,
  onSync: (letters: LeaveRequest[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'excuse_letters';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const letters: LeaveRequest[] = [];
        snapshot.forEach((docSnap) => {
          letters.push(docSnap.data() as LeaveRequest);
        });
        if (letters.length > 0) {
          onSync(letters);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToExcuseLetters error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToExcuseLetters setup error:", error);
    return () => {};
  }
}

/**
 * Sync consultation bookings from Firestore via centralized queue.
 */
export async function syncConsultationBookingsFromFirestore(
  isOffline: boolean,
  onSync: (bookings: ConsultationBooking[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'consultation_bookings';

  return firestoreQueue.enqueue('syncConsultationBookings', async () => {
    try {
      const querySnapshot = await getDocs(collection(db, colPath));
      const bookings: ConsultationBooking[] = [];
      querySnapshot.forEach((docSnap) => {
        bookings.push(docSnap.data() as ConsultationBooking);
      });
      if (bookings.length > 0) {
        onSync(bookings);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  });
}

/**
 * Saves or updates a ConsultationBooking in Firestore via centralized queue.
 */
export async function saveConsultationBookingToFirestore(
  isOffline: boolean,
  bookingObj: ConsultationBooking
): Promise<void> {
  if (isOffline || !bookingObj || !bookingObj.id) return;
  const colPath = 'consultation_bookings';

  return firestoreQueue.enqueue(
    `saveConsultationBooking:${bookingObj.id}`,
    async () => {
      try {
        await setDoc(doc(db, colPath, bookingObj.id), sanitizeForFirestore(bookingObj), { merge: true });
        console.log(`Consultation booking ${bookingObj.id} saved to Firestore.`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `${colPath}/${bookingObj.id}`);
      }
    },
    { dedupKey: `booking:${bookingObj.id}` }
  );
}

/**
 * Deletes a ConsultationBooking from Firestore via centralized queue.
 */
export async function deleteConsultationBookingFromFirestore(
  isOffline: boolean,
  bookingId: string
): Promise<void> {
  if (isOffline || !bookingId) return;
  const colPath = 'consultation_bookings';

  return firestoreQueue.enqueue(`deleteConsultationBooking:${bookingId}`, async () => {
    try {
      await deleteDoc(doc(db, colPath, bookingId));
      console.log(`Consultation booking ${bookingId} deleted from Firestore.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colPath}/${bookingId}`);
    }
  });
}

/**
 * Real-time listener for consultation bookings from Firestore.
 */
export function listenToConsultationBookings(
  isOffline: boolean,
  onSync: (bookings: ConsultationBooking[]) => void
): () => void {
  if (isOffline) return () => {};
  const colPath = 'consultation_bookings';
  try {
    const unsubscribe = onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const bookings: ConsultationBooking[] = [];
        snapshot.forEach((docSnap) => {
          bookings.push(docSnap.data() as ConsultationBooking);
        });
        if (bookings.length > 0) {
          onSync(bookings);
        }
      },
      (error) => {
        console.warn("[Firestore] listenToConsultationBookings error caught:", error);
      }
    );
    return unsubscribe;
  } catch (error) {
    console.warn("[Firestore] listenToConsultationBookings setup error:", error);
    return () => {};
  }
}

/**
 * Completely purges all Firestore collections and local storage data for a 100% fresh start.
 */
export async function wipeAllFirestoreAndLocalData(): Promise<void> {
  const collectionsToWipe = [
    'registered_users',
    'credentials',
    'classes',
    'attendance',
    'enrollments',
    'faculty_statuses',
    'excuse_letters',
    'consultation_bookings',
    'messages',
    'password_resets',
    'announcements',
    'user_profiles',
    'lab_rooms',
    'session_links',
    'audit_logs',
    'support_tickets',
    'tickets',
    'notifications',
    'users',
    'conversations'
  ];

  try {
    for (const colName of collectionsToWipe) {
      try {
        const snap = await getDocs(collection(db, colName));
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, colName, d.id)));
        await Promise.all(deletePromises);
      } catch (err) {
        console.warn(`[Firestore] Failed to delete collection ${colName}:`, err);
      }
    }
  } catch (error) {
    console.warn('[Firestore] Error during wipeAllFirestoreAndLocalData:', error);
  }

  // Clear all local storage records
  try {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('classpulse_') || k.startsWith('cp_') || k.startsWith('firebase:'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('classpulse_registered_users');
      localStorage.removeItem('classpulse_registered_admins');
      localStorage.removeItem('classpulse_custom_passwords');
      localStorage.removeItem('classpulse_classes');
      localStorage.removeItem('classpulse_attendance');
      localStorage.removeItem('classpulse_faculty_statuses');
      localStorage.removeItem('classpulse_excuse_letters');
      localStorage.removeItem('classpulse_password_reset_requests');
      localStorage.removeItem('classpulse_messages');
      localStorage.removeItem('classpulse_active_user');
      localStorage.removeItem('classpulse_active_role');
      localStorage.removeItem('classpulse_remember_me');
    }
  } catch (err) {
    console.warn('[Storage] Failed to clear local storage:', err);
  }
}
