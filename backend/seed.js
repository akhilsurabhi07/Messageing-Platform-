const db = require('./db');
const bcrypt = require('bcrypt');

const seed = async () => {
  const name = 'Admin';
  const email = 'admin@broadcast.com';
  const password = 'admin123';
  const role = 'admin';

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  db.run(
    'INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, role],
    function(err) {
      if (err) {
        console.error('Error seeding admin:', err.message);
      } else if (this.changes > 0) {
        console.log('Default admin created: admin@broadcast.com / admin123');
      } else {
        console.log('Admin already exists.');
      }
      process.exit();
    }
  );
};

seed();
