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
import { db, handleFirestoreError, OperationType, auth } from './googleAuth';
import { ClassSession, AttendanceRecord, ChatMessage, UserProfile, AuditLogEntry } from '../types';
import { normalizeUserIdentity, normalizeUid, normalizeEmail, generateSessionToken } from './authUtils';

/**
 * Sync classes: pulls classes from Firestore.
 */
export async function syncClassesFromFirestore(
  isOffline: boolean,
  onSync: (classes: ClassSession[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'classes';
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
}

/**
 * Saves or updates a ClassSession document in Firestore.
 */
export async function saveClassToFirestore(
  isOffline: boolean,
  classObj: ClassSession
): Promise<void> {
  if (isOffline) return;
  const colPath = 'classes';
  try {
    await setDoc(doc(db, colPath, classObj.id), classObj, { merge: true });
    console.log(`Class ${classObj.code} saved to Firestore successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${classObj.id}`);
  }
}

/**
 * Deletes a ClassSession document from Firestore.
 */
export async function deleteClassFromFirestore(
  isOffline: boolean,
  classId: string
): Promise<void> {
  if (isOffline) return;
  const colPath = 'classes';
  try {
    await deleteDoc(doc(db, colPath, classId));
    console.log(`Class ${classId} deleted from Firestore successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colPath}/${classId}`);
  }
}

/**
 * Sync attendance records: pulls records from Firestore.
 */
export async function syncAttendanceFromFirestore(
  isOffline: boolean,
  onSync: (records: AttendanceRecord[]) => void
): Promise<void> {
  if (isOffline) return;
  const colPath = 'records';
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
}

/**
 * Real-time listener for attendance records from Firestore.
 * Ensures desktop and mobile instantly recognize attendance updates.
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
 * Ensures desktop and mobile instantly recognize class updates.
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
 * Saves or updates an AttendanceRecord in Firestore.
 */
export async function saveAttendanceToFirestore(
  isOffline: boolean,
  recordObj: AttendanceRecord
): Promise<void> {
  if (isOffline) return;
  const colPath = 'records';
  try {
    await setDoc(doc(db, colPath, recordObj.id), recordObj, { merge: true });
    console.log(`Attendance record ${recordObj.id} saved to Firestore successfully.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${recordObj.id}`);
  }
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
    const q = query(collection(db, colPath), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          msgs.push(docSnap.data() as ChatMessage);
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
 * Saves a ChatMessage to Firestore.
 */
export async function saveMessageToFirestore(
  isOffline: boolean,
  messageObj: ChatMessage
): Promise<void> {
  if (isOffline) return;
  const colPath = 'messages';
  try {
    await setDoc(doc(db, colPath, messageObj.id), messageObj, { merge: true });
    console.log(`Message ${messageObj.id} sent and committed to Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${messageObj.id}`);
  }
}

/**
 * Saves or updates a user profile in Firestore.
 */
export async function saveUserProfileToFirestore(
  isOffline: boolean,
  profile: UserProfile
): Promise<void> {
  if (isOffline) return;
  const colPath = 'users';
  try {
    await setDoc(doc(db, colPath, profile.id), profile, { merge: true });
    console.log(`User profile for ${profile.name} updated in Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${profile.id}`);
  }
}

/**
 * Saves or updates a registered user account in Firestore so all devices/windows recognize it.
 */
export async function saveRegisteredUserToFirestore(
  isOffline: boolean,
  userObj: any
): Promise<void> {
  if (isOffline || !userObj || !userObj.id) return;
  const colPath = 'registered_users';
  try {
    await setDoc(doc(db, colPath, userObj.id), userObj, { merge: true });
    // Also mirror to users collection
    await setDoc(doc(db, 'users', userObj.id), userObj, { merge: true });
    console.log(`Registered user ${userObj.email || userObj.name} saved to Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${userObj.id}`);
  }
}

/**
 * Deletes a registered user account from Firestore.
 */
export async function deleteRegisteredUserFromFirestore(
  isOffline: boolean,
  userId: string
): Promise<void> {
  if (isOffline || !userId) return;
  const colPath = 'registered_users';
  try {
    await deleteDoc(doc(db, colPath, userId));
    await deleteDoc(doc(db, 'users', userId));
    console.log(`User ${userId} deleted from Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${colPath}/${userId}`);
  }
}

/**
 * Saves or updates custom password credentials in Firestore so mobile and window browsers share login passwords.
 */
export async function saveUserCredentialToFirestore(
  isOffline: boolean,
  key: string,
  password: string
): Promise<void> {
  if (isOffline || !key || !password) return;
  const sanitizedKey = key.toLowerCase().trim();
  const docId = encodeURIComponent(sanitizedKey);
  const colPath = 'credentials';
  try {
    await setDoc(
      doc(db, colPath, docId),
      { key: sanitizedKey, password: password.trim(), updatedAt: new Date().toISOString() },
      { merge: true }
    );
    console.log(`Credential for ${sanitizedKey} saved to Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${docId}`);
  }
}

/**
 * Saves or updates a password reset request in Firestore.
 */
export async function savePasswordResetToFirestore(
  isOffline: boolean,
  resetReq: any
): Promise<void> {
  if (isOffline || !resetReq || !resetReq.id) return;
  const colPath = 'password_resets';
  try {
    await setDoc(doc(db, colPath, resetReq.id), resetReq, { merge: true });
    console.log(`Password reset request ${resetReq.id} saved to Firestore.`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${resetReq.id}`);
  }
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
          // Merge with local storage
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
 * Synchronizes all registered accounts, credentials, and password resets from Firestore.
 * Seeds initial demo accounts into Firestore if empty.
 */
export async function syncAllAccountsFromFirestore(isOffline: boolean): Promise<void> {
  if (isOffline) return;

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
    // Pre-populate default demo users if neither local nor firestore has users
    const defaultDemos = [
      {
        id: 'usr-demo-student',
        name: 'John Doe',
        email: 'john.doe@msu.edu.ph',
        role: 'student',
        uid: '2023-10924',
        department: 'CCS Department'
      },
      {
        id: 'usr-demo-faculty',
        name: 'Dr. Ahmad Khan',
        email: 'ahmad.khan@msu.edu.ph',
        role: 'faculty',
        uid: 'FAC-88102',
        department: 'College of Computer Studies'
      },
      {
        id: 'usr-demo-admin',
        name: 'Admin Strator',
        email: 'admin@msu.edu.ph',
        role: 'admin',
        uid: 'ADM-00001',
        department: 'Academic Registrar Board'
      }
    ];

    defaultDemos.forEach(u => userMap.set(u.id, u));
    localUsers.forEach(u => u.id && userMap.set(u.id, u));
    firestoreUsers.forEach(u => u.id && userMap.set(u.id, u));

    const combinedUsers = Array.from(userMap.values());
    localStorage.setItem('classpulse_registered_users', JSON.stringify(combinedUsers));
    localStorage.setItem('classpulse_registered_admins', JSON.stringify(combinedUsers.filter(u => u.role === 'admin')));
    window.dispatchEvent(new Event('registered-users-changed'));

    // Upload local/demo users to Firestore if they aren't in Firestore yet
    for (const u of combinedUsers) {
      if (!firestoreUsers.some(f => f.id === u.id)) {
        await saveRegisteredUserToFirestore(isOffline, u);
      }
    }

    // 2. Fetch credentials
    const credSnap = await getDocs(collection(db, 'credentials'));
    let savedPasswords: Record<string, string> = {};
    try {
      savedPasswords = JSON.parse(localStorage.getItem('classpulse_custom_passwords') || '{}');
    } catch {}

    // Default passwords
    if (!savedPasswords['john.doe@msu.edu.ph']) savedPasswords['john.doe@msu.edu.ph'] = 'student123';
    if (!savedPasswords['ahmad.khan@msu.edu.ph']) savedPasswords['ahmad.khan@msu.edu.ph'] = 'faculty123';
    if (!savedPasswords['admin@msu.edu.ph']) savedPasswords['admin@msu.edu.ph'] = 'admin123';

    credSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.key && data.password) {
        savedPasswords[data.key] = data.password;
      }
    });

    localStorage.setItem('classpulse_custom_passwords', JSON.stringify(savedPasswords));

    // Upload credentials to Firestore if not present
    for (const [key, pass] of Object.entries(savedPasswords)) {
      await saveUserCredentialToFirestore(isOffline, key, pass as string);
    }

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

  try {
    await setDoc(doc(db, colPath, tokenData.tokenId), {
      tokenId: tokenData.tokenId,
      userProfile: normalizeUserIdentity(userProfile),
      status: 'pending',
      createdAt: tokenData.payload.createdAt,
      expiresAt: tokenData.payload.expiresAt,
      claimedByDevice: null
    });
    console.log(`Session link ${tokenData.tokenId} generated in Firestore.`);
    return tokenData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${colPath}/${tokenData.tokenId}`);
    return null;
  }
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

    // Mark as claimed
    await setDoc(docRef, { status: 'claimed', claimedAt: new Date().toISOString() }, { merge: true });

    return data.userProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${colPath}/${tokenId}`);
    return null;
  }
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
 * Saves an immutable AuditLogEntry to Firestore.
 */
export async function saveAuditLogToFirestore(
  isOffline: boolean,
  auditLog: AuditLogEntry
): Promise<void> {
  if (isOffline) return;
  const colPath = 'audit_logs';
  try {
    await setDoc(doc(db, colPath, auditLog.id), auditLog, { merge: true });
  } catch (error) {
    console.warn("[Firestore] Could not save audit log:", error);
  }
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
 * Clears volatile local cache and re-fetches all Firestore collections (users, credentials, classes, attendance, messages)
 */
export async function forceResyncAllFromFirestore(
  isOffline: boolean,
  callbacks?: {
    onClassesSync?: (classes: ClassSession[]) => void;
    onAttendanceSync?: (records: AttendanceRecord[]) => void;
    onUserSync?: () => void;
  }
): Promise<{ success: boolean; durationMs: number; stats: { users: number; classes: number; records: number } }> {
  const startTime = Date.now();
  if (isOffline) {
    return { success: false, durationMs: Date.now() - startTime, stats: { users: 0, classes: 0, records: 0 } };
  }

  try {
    // 1. Re-sync accounts and credentials
    await syncAllAccountsFromFirestore(false);

    // 2. Re-sync classes
    let classCount = 0;
    await syncClassesFromFirestore(false, (fetchedClasses) => {
      classCount = fetchedClasses.length;
      if (callbacks?.onClassesSync) callbacks.onClassesSync(fetchedClasses);
    });

    // 3. Re-sync attendance
    let recordCount = 0;
    await syncAttendanceFromFirestore(false, (fetchedRecords) => {
      recordCount = fetchedRecords.length;
      if (callbacks?.onAttendanceSync) callbacks.onAttendanceSync(fetchedRecords);
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
        records: recordCount
      }
    };
  } catch (err) {
    console.error("[Firestore] forceResyncAllFromFirestore failed:", err);
    return { success: false, durationMs: Date.now() - startTime, stats: { users: 0, classes: 0, records: 0 } };
  }
}


