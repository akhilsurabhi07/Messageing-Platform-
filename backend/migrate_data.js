const Database = require('better-sqlite3');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyAAmDj5e-GMunO16JPi_3hNFO0eU45J55Y",
  authDomain: "broadcasthub-v1-akhil.firebaseapp.com",
  projectId: "broadcasthub-v1-akhil",
  storageBucket: "broadcasthub-v1-akhil.firebasestorage.app",
  messagingSenderId: "439985722984",
  appId: "1:439985722984:web:bb2861ddc31ca76c954ddd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sqliteDbPath = path.resolve(__dirname, 'broadcasthub.db');
const sqlDb = new Database(sqliteDbPath);

async function migrateData() {
  console.log('Starting migration...');
  
  // 1. Migrate Users to 'users' collection
  const users = sqlDb.prepare('SELECT * FROM users').all();
  let userBatch = writeBatch(db);
  for (const user of users) {
    const userRef = doc(db, 'users', user.id.toString());
    userBatch.set(userRef, {
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at || new Date().toISOString()
    });
  }
  await userBatch.commit();
  console.log(`Migrated ${users.length} users.`);

  // 2. Migrate Groups to 'groups' collection
  const groups = sqlDb.prepare('SELECT * FROM groups').all();
  for (const group of groups) {
    const groupRef = doc(db, 'groups', group.id.toString());
    await setDoc(groupRef, {
      name: group.name,
      created_by: group.created_by.toString(),
      created_at: group.created_at || new Date().toISOString()
    });
    
    // Migrate group members
    const members = sqlDb.prepare('SELECT * FROM group_members WHERE group_id = ?').all(group.id);
    if (members.length > 0) {
      let memberBatch = writeBatch(db);
      for (const member of members) {
        const memberRef = doc(db, 'groups', group.id.toString(), 'members', member.user_id.toString());
        memberBatch.set(memberRef, {
          user_id: member.user_id.toString(),
          joined_at: member.added_at || new Date().toISOString()
        });
      }
      await memberBatch.commit();
    }
  }
  console.log(`Migrated ${groups.length} groups.`);

  // 3. Migrate Messages to 'messages' collection
  const messages = sqlDb.prepare('SELECT * FROM messages').all();
  for (const msg of messages) {
    // Get sender info
    const sender = users.find(u => u.id === msg.sender_id);
    
    // Get recipients
    const recipients = sqlDb.prepare('SELECT user_id FROM message_recipients WHERE message_id = ?').all(msg.id);
    const recipientIds = recipients.map(r => r.user_id.toString());
    
    let groupName = 'Individual';
    if (msg.group_id) {
      const g = groups.find(g => g.id === msg.group_id);
      if (g) groupName = g.name;
    }
    
    // Parse attachments if any
    let attachmentsArr = [];
    try {
      if (msg.attachments) attachmentsArr = JSON.parse(msg.attachments);
    } catch (e) {
      if (msg.attachments) attachmentsArr = [msg.attachments];
    }
    
    const msgRef = doc(db, 'messages', msg.id.toString());
    await setDoc(msgRef, {
      content: msg.content,
      sender_id: msg.sender_id.toString(),
      sender_name: sender ? sender.name : 'Unknown',
      group_id: msg.group_id ? msg.group_id.toString() : null,
      group_name: groupName,
      type: msg.type,
      link_url: msg.link_url || '',
      attachments: attachmentsArr,
      recipients: recipientIds,
      created_at: msg.created_at || new Date().toISOString()
    });
  }
  console.log(`Migrated ${messages.length} messages.`);
  
  console.log('Migration complete!');
  process.exit(0);
}

migrateData().catch(console.error);
