const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'broadcasthub.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create tables
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Groups table
      db.run(`CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`);

      // Group Members table
      db.run(`CREATE TABLE IF NOT EXISTS group_members (
        group_id INTEGER,
        user_id INTEGER,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES groups (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);

      // Messages table
      db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL, -- 'broadcast', 'selective'
        group_id INTEGER,
        link_url TEXT,
        attachments TEXT, -- JSON string of file names/urls
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (group_id) REFERENCES groups (id)
      )`);

      // Migration for existing tables
      db.all("PRAGMA table_info(messages)", (err, rows) => {
        if (err) return;
        const columnNames = rows.map(r => r.name);
        if (!columnNames.includes('link_url')) {
          db.run('ALTER TABLE messages ADD COLUMN link_url TEXT');
        }
        if (!columnNames.includes('attachments')) {
          db.run('ALTER TABLE messages ADD COLUMN attachments TEXT');
        }
      });

      // Message Recipients table (for tracking who gets what)
      db.run(`CREATE TABLE IF NOT EXISTS message_recipients (
        message_id INTEGER,
        user_id INTEGER,
        read INTEGER DEFAULT 0,
        PRIMARY KEY (message_id, user_id),
        FOREIGN KEY (message_id) REFERENCES messages (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`);
    });
  }
});

module.exports = db;
