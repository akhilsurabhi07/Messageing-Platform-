const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'broadcasthub.db');
const db = new Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

console.log('Connected to the SQLite database.');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id INTEGER,
    user_id INTEGER,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    group_id INTEGER,
    link_url TEXT,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users (id),
    FOREIGN KEY (group_id) REFERENCES groups (id)
  );

  CREATE TABLE IF NOT EXISTS message_recipients (
    message_id INTEGER,
    user_id INTEGER,
    read INTEGER DEFAULT 0,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Migration for existing tables
const columns = db.prepare("PRAGMA table_info(messages)").all();
const columnNames = columns.map(r => r.name);

if (!columnNames.includes('link_url')) {
  db.prepare('ALTER TABLE messages ADD COLUMN link_url TEXT').run();
}
if (!columnNames.includes('attachments')) {
  db.prepare('ALTER TABLE messages ADD COLUMN attachments TEXT').run();
}

module.exports = db;