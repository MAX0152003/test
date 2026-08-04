import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from './googleAuth';
import { ClassSession, AttendanceRecord, ChatMessage, UserProfile } from '../types';

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
