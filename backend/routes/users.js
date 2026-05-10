const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Get all users (Admin only)
router.get('/', verifyAdmin, (req, res) => {
  db.all('SELECT id, name, email, role, created_at FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Update user role (Promote/Demote)
router.put('/:id/role', verifyAdmin, (req, res) => {
  const userId = req.params.id;
  const { role } = req.body; // 'admin' or 'user'

  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Prevent demoting yourself (if you want to be extra safe)
  if (parseInt(userId) === req.user.id && role === 'user') {
    return res.status(400).json({ error: 'You cannot demote yourself' });
  }

  db.run('UPDATE users SET role = ? WHERE id = ?', [role, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `User role updated to ${role}` });
  });
});

// Remove user (Admin only)
router.delete('/:id', verifyAdmin, (req, res) => {
  const userId = req.params.id;
  console.log(`Attempting to delete user ${userId}`);

  db.serialize(() => {
    // 1. Delete message recipients entries for messages sent by this user
    db.run('DELETE FROM message_recipients WHERE message_id IN (SELECT id FROM messages WHERE sender_id = ?)', [userId]);
    
    // 2. Delete messages sent by this user
    db.run('DELETE FROM messages WHERE sender_id = ?', [userId]);
    
    // 3. Delete recipient entries for this user
    db.run('DELETE FROM message_recipients WHERE user_id = ?', [userId]);
    
    // 4. Delete group memberships for this user
    db.run('DELETE FROM group_members WHERE user_id = ?', [userId]);
    
    // 5. Update groups created by this user (set created_by to NULL or delete?)
    // For now, let's just set created_by to NULL to avoid deleting groups
    db.run('UPDATE groups SET created_by = NULL WHERE created_by = ?', [userId]);

    // 6. Finally delete the user
    db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
      if (err) {
        console.error(`Error deleting user ${userId}:`, err.message);
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        console.warn(`User ${userId} not found for deletion`);
        return res.status(404).json({ error: 'User not found' });
      }
      console.log(`User ${userId} deleted successfully`);
      res.json({ message: 'User removed successfully' });
    });
  });
});

// Get dashboard stats (personalized for each admin)
router.get('/stats', verifyAdmin, (req, res) => {
  const adminId = req.user.id;
  const stats = {
    totalGroups: 0,
    totalMembers: 0,
    messagesSent: 0
  };

  db.get('SELECT COUNT(*) as count FROM groups', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    stats.totalGroups = row.count;

    db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['user'], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      stats.totalMembers = row.count;

      db.get('SELECT COUNT(*) as count FROM messages WHERE sender_id = ?', [adminId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.messagesSent = row.count;

        res.json(stats);
      });
    });
  });
});

module.exports = router;
