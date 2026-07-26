const pool = require('../config/db');
const { getIO } = require('../services/socketService');

const ADMIN_ROLES = ['admin', 'superadmin'];

const chatTypeFor = (senderRole, receiverRole) => {
  const sender = ADMIN_ROLES.includes(senderRole) ? 'admin' : senderRole;
  const receiver = ADMIN_ROLES.includes(receiverRole) ? 'admin' : receiverRole;
  return `${sender}_${receiver}`;
};

const isParentLinkedToDriver = async (parentUserId, driverUserId) => {
  const result = await pool.query(
    `SELECT 1
       FROM students s
       JOIN parents p ON p.id = s.parent_id
       JOIN route_stops rs ON rs.location ILIKE '%' || s.pickup_location || '%'
                         OR rs.stop_name ILIKE '%' || s.pickup_location || '%'
       JOIN trips t ON t.route_id = rs.route_id
       JOIN drivers d ON d.id = t.driver_id
      WHERE p.user_id = $1 AND d.user_id = $2
      ORDER BY t.start_time DESC
      LIMIT 1`,
    [parentUserId, driverUserId]
  );
  return result.rowCount > 0;
};

const canMessage = async (sender, receiver) => {
  if (ADMIN_ROLES.includes(sender.role)) return ['parent', 'driver'].includes(receiver.role);
  if (sender.role === 'parent') {
    return ADMIN_ROLES.includes(receiver.role) ||
      (receiver.role === 'driver' && await isParentLinkedToDriver(sender.id, receiver.id));
  }
  if (sender.role === 'driver') {
    return ADMIN_ROLES.includes(receiver.role) ||
      (receiver.role === 'parent' && await isParentLinkedToDriver(receiver.id, sender.id));
  }
  return false;
};

const getRecipient = async (id) => {
  const result = await pool.query('SELECT id, name, role FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
};

const validateRecipient = async (req, res, otherUserId) => {
  const parsedId = Number(otherUserId);
  if (!Number.isInteger(parsedId)) {
    res.status(400).json({ message: 'A valid recipient is required' });
    return null;
  }
  const receiver = await getRecipient(parsedId);
  if (!receiver || receiver.id === req.user.id) {
    res.status(404).json({ message: 'Recipient not found' });
    return null;
  }
  if (!(await canMessage(req.user, receiver))) {
    res.status(403).json({ message: 'You cannot message this user' });
    return null;
  }
  return receiver;
};

// HTTP is the single write path: a message is stored before it is broadcast.
const sendMessage = async (req, res) => {
  const { receiver_id, message, trip_id } = req.body;
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return res.status(400).json({ message: 'Message is required' });
  if (text.length > 4000) return res.status(400).json({ message: 'Message is too long' });

  try {
    const receiver = await validateRecipient(req, res, receiver_id);
    if (!receiver) return;
    const chatType = chatTypeFor(req.user.role, receiver.role);
    const result = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, message, chat_type, trip_id, sender_name, sender_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, receiver.id, text, chatType, trip_id || null, req.user.name, req.user.role]
    );
    const chat = result.rows[0];
    const io = getIO();
    if (io) {
      // Notify both rooms so all devices stay synchronized with the persisted record.
      io.to(`user:${receiver.id}`).to(`user:${req.user.id}`).emit('chat:message', chat);
    }
    res.status(201).json({ message: 'Message sent', chat });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

const getConversation = async (req, res) => {
  try {
    const receiver = await validateRecipient(req, res, req.params.other_user_id);
    if (!receiver) return;
    const result = await pool.query(
      `SELECT cm.*, u.name AS sender_name, u.role AS sender_role
         FROM chat_messages cm JOIN users u ON u.id = cm.sender_id
        WHERE (cm.sender_id = $1 AND cm.receiver_id = $2)
           OR (cm.sender_id = $2 AND cm.receiver_id = $1)
        ORDER BY cm.created_at ASC, cm.id ASC LIMIT 200`,
      [req.user.id, receiver.id]
    );
    res.status(200).json({ messages: result.rows });
  } catch (error) {
    console.error('Get conversation error:', error.message);
    res.status(500).json({ message: 'Server error getting conversation' });
  }
};

const getChatList = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (other_user_id)
          u.id AS other_user_id, u.name AS other_user_name, u.role AS other_user_role,
          cm.message AS last_message, cm.created_at AS last_message_time,
          cm.is_read AS last_message_read, cm.sender_id AS last_message_sender
       FROM (
         SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id,
                sender_id, receiver_id, message, created_at, is_read
           FROM chat_messages WHERE $1 IN (sender_id, receiver_id)
       ) cm JOIN users u ON u.id = cm.other_user_id
       WHERE cm.other_user_id IS NOT NULL
       ORDER BY other_user_id, cm.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json({ chats: result.rows });
  } catch (error) {
    console.error('Get chat list error:', error.message);
    res.status(500).json({ message: 'Server error getting chat list' });
  }
};

const getContacts = async (req, res) => {
  try {
    let query;
    let params = [];
    if (ADMIN_ROLES.includes(req.user.role)) {
      query = `SELECT id, name, role FROM users WHERE role IN ('parent', 'driver') ORDER BY role, name`;
    } else if (req.user.role === 'parent') {
      query = `SELECT id, name, role FROM users WHERE role IN ('admin', 'superadmin')
               UNION
               SELECT DISTINCT u.id, u.name, u.role
                 FROM users u JOIN drivers d ON d.user_id = u.id
                 JOIN trips t ON t.driver_id = d.id
                 JOIN route_stops rs ON rs.route_id = t.route_id
                 JOIN students s ON rs.location ILIKE '%' || s.pickup_location || '%'
                                  OR rs.stop_name ILIKE '%' || s.pickup_location || '%'
                 JOIN parents p ON p.id = s.parent_id
                WHERE p.user_id = $1
               ORDER BY role, name`;
      params = [req.user.id];
    } else {
      query = `SELECT id, name, role FROM users WHERE role IN ('admin', 'superadmin')
               UNION
               SELECT DISTINCT u.id, u.name, u.role
                 FROM users u JOIN parents p ON p.user_id = u.id
                 JOIN students s ON s.parent_id = p.id
                 JOIN route_stops rs ON rs.location ILIKE '%' || s.pickup_location || '%'
                                  OR rs.stop_name ILIKE '%' || s.pickup_location || '%'
                 JOIN trips t ON t.route_id = rs.route_id
                 JOIN drivers d ON d.id = t.driver_id
                WHERE d.user_id = $1
               ORDER BY role, name`;
      params = [req.user.id];
    }
    const result = await pool.query(query, params);
    res.status(200).json({ contacts: result.rows });
  } catch (error) {
    console.error('Get chat contacts error:', error.message);
    res.status(500).json({ message: 'Server error getting chat contacts' });
  }
};

const markMessagesRead = async (req, res) => {
  try {
    const receiver = await validateRecipient(req, res, req.params.other_user_id);
    if (!receiver) return;
    await pool.query(
      `UPDATE chat_messages SET is_read = true
        WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [receiver.id, req.user.id]
    );
    const io = getIO();
    if (io) io.to(`user:${receiver.id}`).emit('chat:read', { read_by: req.user.id, other_user_id: receiver.id });
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { sendMessage, getConversation, getChatList, getContacts, markMessagesRead };
