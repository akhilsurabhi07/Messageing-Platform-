const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'broadcasthub.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT * FROM users').all();

const firebaseUsers = {
  users: users.map(user => ({
    localId: user.id.toString(),
    email: user.email,
    passwordHash: Buffer.from(user.password).toString('base64'),
    displayName: user.name
  }))
};

fs.writeFileSync(path.resolve(__dirname, 'users.json'), JSON.stringify(firebaseUsers, null, 2));
console.log(`Exported ${users.length} users to users.json`);
