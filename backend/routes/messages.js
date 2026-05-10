const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyAdmin, verifyToken } = require('../middleware/authMiddleware');

// Send a message (broadcast or selective)
router.post('/', verifyAdmin, (req, res) => {
  const { content, type, groupId, userIds, linkUrl, attachmentNames } = req.body; 
  const senderId = req.user.id;

  if (!content && (!attachmentNames || attachmentNames.length === 0)) {
    return res.status(400).json({ error: 'Content or attachments are required' });
  }

  db.run(
    'INSERT INTO messages (sender_id, content, type, group_id, link_url, attachments) VALUES (?, ?, ?, ?, ?, ?)',
    [senderId, content || '', type, groupId || null, linkUrl || null, JSON.stringify(attachmentNames || [])],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const messageId = this.lastID;

      // Determine recipients
      if (type === 'broadcast' && groupId) {
        // Get all users in the group and insert into message_recipients
        db.all('SELECT user_id FROM group_members WHERE group_id = ?', [groupId], (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          
          if (rows.length > 0) {
            const placeholders = rows.map(() => '(?, ?)').join(',');
            const values = [];
            rows.forEach(row => {
              values.push(messageId, row.user_id);
            });

            db.run(`INSERT INTO message_recipients (message_id, user_id) VALUES ${placeholders}`, values, (err) => {
              if (err) console.error('Error inserting broadcast recipients', err);
            });
          }
        });
      } else if (type === 'selective' && userIds && userIds.length > 0) {
        // Insert specific users
        const placeholders = userIds.map(() => '(?, ?)').join(',');
        const values = [];
        userIds.forEach(id => {
          values.push(messageId, id);
        });

        db.run(`INSERT INTO message_recipients (message_id, user_id) VALUES ${placeholders}`, values, (err) => {
          if (err) console.error('Error inserting selective recipients', err);
        });
      }

      res.status(201).json({ id: messageId, message: 'Message sent successfully' });
    }
  );
});

// Get recent messages for Admin dashboard (filtered by admin's own history)
router.get('/recent', verifyAdmin, (req, res) => {
  const adminId = req.user.id;
  const query = `
    SELECT m.id, m.content, m.created_at, m.type, g.name as group_name, m.link_url, m.attachments,
           (SELECT COUNT(*) FROM message_recipients WHERE message_id = m.id) as recipients_count
    FROM messages m
    LEFT JOIN groups g ON m.group_id = g.id
    WHERE m.sender_id = ?
    ORDER BY m.created_at DESC
    LIMIT 10
  `;
  
  db.all(query, [adminId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get messages for a regular User (Inbox)
router.get('/inbox', verifyToken, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT m.id, m.content, m.created_at, m.type, u.name as sender_name, mr.read, m.link_url, m.attachments
    FROM messages m
    JOIN message_recipients mr ON m.id = mr.message_id
    JOIN users u ON m.sender_id = u.id
    WHERE mr.user_id = ?
    ORDER BY m.created_at DESC
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Mark message as read
router.put('/:messageId/read', verifyToken, (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.messageId;

  db.run(
    'UPDATE message_recipients SET read = 1 WHERE message_id = ? AND user_id = ?',
    [messageId, userId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Marked as read' });
    }
  );
});

module.exports = router;
