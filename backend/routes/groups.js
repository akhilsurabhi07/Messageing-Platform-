const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin } = require('../middleware/authMiddleware');

// Get all groups with member count and message count
router.get('/', verifyAdmin, (req, res) => {
  const query = `
    SELECT 
      g.id, 
      g.name, 
      g.created_at,
      COUNT(DISTINCT gm.user_id) as member_count,
      COUNT(DISTINCT m.id) as message_count
    FROM groups g
    LEFT JOIN group_members gm ON g.id = gm.group_id
    LEFT JOIN messages m ON g.id = m.group_id
    GROUP BY g.id
  `;

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create a new group
router.post('/', verifyAdmin, (req, res) => {
  const { name } = req.body;
  const adminId = req.user.id;

  db.run('INSERT INTO groups (name, created_by) VALUES (?, ?)', [name, adminId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, name, created_by: adminId });
  });
});

// Add members to a group
router.post('/:id/members', verifyAdmin, (req, res) => {
  const groupId = req.params.id;
  const { userIds } = req.body; // Array of user IDs

  if (!userIds || userIds.length === 0) {
    return res.status(400).json({ error: 'No users provided' });
  }

  // Use a transaction or multiple inserts
  const placeholders = userIds.map(() => '(?, ?)').join(',');
  const values = [];
  userIds.forEach(id => {
    values.push(groupId, id);
  });

  const query = `INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES ${placeholders}`;

  db.run(query, values, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Members added successfully', added: this.changes });
  });
});

// Get members of a specific group
router.get('/:id/members', verifyAdmin, (req, res) => {
  const groupId = req.params.id;

  const query = `
    SELECT u.id, u.name, u.email 
    FROM users u
    JOIN group_members gm ON u.id = gm.user_id
    WHERE gm.group_id = ?
  `;

  db.all(query, [groupId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
