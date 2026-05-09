const pool = require('../config/db');
const { sendSMS } = require('../config/sms');

// Create and send a notification
const createNotification = async (user_id, message, type, phone = null) => {
  try {
    // Save to database
    await pool.query(
      `INSERT INTO notifications (user_id, message, type)
       VALUES ($1, $2, $3)`,
      [user_id, message, type]
    );

    // Send SMS if phone provided
    if (phone) {
      await sendSMS(phone, message);
    }

    return true;
  } catch (error) {
    console.error('Create notification error:', error.message);
    return false;
  }
};

// Get all notifications for logged in user
const getMyNotifications = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT id, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user_id]
    );

    // Count unread
    const unread = result.rows.filter(n => !n.is_read).length;

    res.status(200).json({
      total: result.rows.length,
      unread,
      notifications: result.rows
    });

  } catch (error) {
    console.error('Get notifications error:', error.message);
    res.status(500).json({ message: 'Server error getting notifications' });
  }
};

// Mark a notification as read
const markAsRead = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );

    res.status(200).json({ message: 'Notification marked as read' });

  } catch (error) {
    console.error('Mark as read error:', error.message);
    res.status(500).json({ message: 'Server error marking notification' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  const user_id = req.user.id;

  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [user_id]
    );

    res.status(200).json({ message: 'All notifications marked as read' });

  } catch (error) {
    console.error('Mark all as read error:', error.message);
    res.status(500).json({ message: 'Server error marking all notifications' });
  }
};

// Delete a notification
const deleteNotification = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );

    res.status(200).json({ message: 'Notification deleted' });

  } catch (error) {
    console.error('Delete notification error:', error.message);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};