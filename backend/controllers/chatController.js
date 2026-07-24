const pool = require('../config/db');
const { getIO, getConnectedUsers } = require('../services/socketService');

// Send a chat message (parent to driver or admin)
const sendMessage = async (req, res) => {
  const { receiver_id, message, chat_type, trip_id } = req.body;
  const sender_id = req.user.id;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, message, chat_type, trip_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sender_id, receiver_id ? parseInt(receiver_id) : null, message, chat_type || 'parent_driver', trip_id || null]
    );

    // Emit real-time notification if receiver is connected
    const io = getIO();
    const connectedUsers = getConnectedUsers();
    if (receiver_id && io) {
      const receiverSocket = connectedUsers[receiver_id];
      if (receiverSocket) {
        io.to(receiverSocket).emit('chat:message', {
          ...result.rows[0],
          sender_name: req.user.name,
        });
      }
    }

    // Also emit to admin room if chat_type is parent_admin
    if (chat_type === 'parent_admin' && io) {
      io.emit('chat:admin_message', {
        ...result.rows[0],
        sender_name: req.user.name,
      });
    }

    res.status(201).json({ message: 'Message sent', chat: result.rows[0] });
  } catch (error) {
    console.error('Send message error:', error.message);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

// Get conversation between parent and driver/admin
const getConversation = async (req, res) => {
  const user_id = req.user.id;
  const { other_user_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT cm.*, u.name as sender_name, u.role as sender_role
        FROM chat_messages cm
        JOIN users u ON cm.sender_id = u.id
        WHERE (cm.sender_id = $1 AND cm.receiver_id = $2)
           OR (cm.sender_id = $2 AND cm.receiver_id = $1)
        ORDER BY cm.created_at ASC
        LIMIT 100`,
      [user_id, parseInt(other_user_id)]
    );

    res.status(200).json({ messages: result.rows });
  } catch (error) {
    console.error('Get conversation error:', error.message);
    res.status(500).json({ message: 'Server error getting conversation' });
  }
};

// Get all chats for the current user (list of conversations)
const getChatList = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (other_user_id)
         u.id as other_user_id,
         u.name as other_user_name,
         u.role as other_user_role,
         cm.message as last_message,
         cm.created_at as last_message_time,
         cm.is_read as last_message_read
       FROM (
         SELECT 
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as other_user_id,
           sender_id, receiver_id, message, created_at, is_read
         FROM chat_messages
         WHERE $1 IN (sender_id, receiver_id)
       ) cm
       JOIN users u ON u.id = cm.other_user_id
       WHERE cm.other_user_id IS NOT NULL
       ORDER BY other_user_id, cm.created_at DESC`,
      [user_id]
    );

    res.status(200).json({ chats: result.rows });
  } catch (error) {
    console.error('Get chat list error:', error.message);
    res.status(500).json({ message: 'Server error getting chat list' });
  }
};

// Mark messages as read
const markMessagesRead = async (req, res) => {
  const user_id = req.user.id;
  const { other_user_id } = req.params;

  try {
    await pool.query(
      `UPDATE chat_messages SET is_read = true
        WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
      [parseInt(other_user_id), user_id]
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getChatList,
  markMessagesRead,
};