import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function wipeAllData() {
  console.log('[WIPE] Reading firebase-applet-config.json...');
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  const configRaw = fs.readFileSync(configPath, 'utf8');
  const firebaseConfig = JSON.parse(configRaw);

  console.log('[WIPE] Initializing Firebase App with Project:', firebaseConfig.projectId);
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

  const collectionsToWipe = [
    'classes',
    'records',
    'messages',
    'users',
    'registered_users',
    'credentials',
    'password_resets',
    'session_links',
    'audit_logs',
    'faculty_statuses',
    'excuse_letters',
    'support_tickets',
    'announcements',
    'enrollments',
    'lab_rooms',
    'rooms',
    'tickets',
    'subjects'
  ];

  let totalDeleted = 0;

  for (const colName of collectionsToWipe) {
    try {
      console.log(`[WIPE] Querying collection "${colName}"...`);
      const snapshot = await getDocs(collection(db, colName));
      console.log(`[WIPE] Found ${snapshot.size} documents in "${colName}".`);
      
      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, colName, docSnap.id));
        console.log(`  -> Deleted [${colName}/${docSnap.id}]`);
        totalDeleted++;
      }
    } catch (err: any) {
      console.error(`[WIPE] Error wiping collection "${colName}":`, err?.message || err);
    }
  }

  console.log(`\n========================================`);
  console.log(`[WIPE COMPLETE] Deleted ${totalDeleted} total documents across all Firebase collections.`);
  console.log(`Database is now 100% brand new and empty.`);
  console.log(`========================================\n`);
}

wipeAllData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[WIPE FAILED]', err);
    process.exit(1);
  });
