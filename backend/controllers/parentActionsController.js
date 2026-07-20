const pool = require('../config/db');
const { getIO, getConnectedUsers } = require('../services/socketService');

// ========== CHAT ==========

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
      [sender_id, receiver_id || null, message, chat_type || 'parent_driver', trip_id || null]
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
      [user_id, other_user_id]
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
      [other_user_id, user_id]
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ========== MARK CHILD ABSENT ==========

// Mark a child as absent for a given trip/date
const markChildAbsent = async (req, res) => {
  const { student_id, date, reason, trip_id } = req.body;
  const user_id = req.user.id;

  if (!student_id) {
    return res.status(400).json({ message: 'student_id is required' });
  }

  try {
    // Verify this student belongs to this parent
    const check = await pool.query(
      `SELECT s.id FROM students s
       JOIN parents p ON s.parent_id = p.id
       WHERE s.id = $1 AND p.user_id = $2`,
      [student_id, user_id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized to mark this student absent' });
    }

    // Get parent_id
    const parentResult = await pool.query(
      'SELECT id FROM parents WHERE user_id = $1',
      [user_id]
    );
    const parent_id = parentResult.rows[0].id;

    const result = await pool.query(
      `INSERT INTO absence_requests (student_id, parent_id, trip_id, date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'approved')
       RETURNING *`,
      [student_id, parent_id, trip_id || null, date || new Date().toISOString().split('T')[0], reason || 'Not specified']
    );

    const io = getIO();
    if (io) {
      const driverResult = await pool.query(
        `SELECT u.id as driver_user_id, u.name as driver_name, s.name as student_name
         FROM students s
         JOIN trips t ON t.id = $2
         JOIN drivers d ON d.id = t.driver_id
         JOIN users u ON u.id = d.user_id
         WHERE s.id = $1`,
        [student_id, trip_id || null]
      );
      if (driverResult.rows.length > 0) {
        const driverUser = driverResult.rows[0];
        const connectedUsers = getConnectedUsers();
        const driverSocket = connectedUsers[driverUser.driver_user_id];
        if (driverSocket) {
          io.to(driverSocket).emit('absence:notify', {
            student_id,
            student_name: driverUser.student_name,
            parent_id,
            date: date || new Date().toISOString().split('T')[0],
            reason: reason || 'Not specified'
          });
        }
      }
    }

    res.status(201).json({
      message: 'Child marked as absent successfully',
      absence: result.rows[0]
    });
  } catch (error) {
    console.error('Mark absent error:', error.message);
    res.status(500).json({ message: 'Server error marking child absent' });
  }
};

// Get absence records for parent's children
const getAbsenceRecords = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT ar.*, s.name as student_name
       FROM absence_requests ar
       JOIN students s ON ar.student_id = s.id
       JOIN parents p ON s.parent_id = p.id
       WHERE p.user_id = $1
       ORDER BY ar.created_at DESC
       LIMIT 50`,
      [user_id]
    );

    res.status(200).json({ absences: result.rows });
  } catch (error) {
    console.error('Get absences error:', error.message);
    res.status(500).json({ message: 'Server error getting absence records' });
  }
};

// ========== CHANGE PICKUP POINT ==========

// Request a pickup point change
const requestPickupChange = async (req, res) => {
  const { student_id, new_pickup_location, effective_date, reason } = req.body;
  const user_id = req.user.id;

  if (!student_id || !new_pickup_location) {
    return res.status(400).json({ message: 'student_id and new_pickup_location are required' });
  }

  try {
    // Verify this student belongs to this parent
    const check = await pool.query(
      `SELECT s.id, s.pickup_location FROM students s
       JOIN parents p ON s.parent_id = p.id
       WHERE s.id = $1 AND p.user_id = $2`,
      [student_id, user_id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized to change pickup for this student' });
    }

    // Get parent_id
    const parentResult = await pool.query(
      'SELECT id FROM parents WHERE user_id = $1',
      [user_id]
    );
    const parent_id = parentResult.rows[0].id;

    const old_pickup = check.rows[0].pickup_location;

    const result = await pool.query(
      `INSERT INTO pickup_change_requests (student_id, parent_id, old_pickup_location, new_pickup_location, effective_date, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [student_id, parent_id, old_pickup, new_pickup_location, effective_date || null, reason || null]
    );

    const io = getIO();
    if (io) {
      const driverResult = await pool.query(
        `SELECT u.id as driver_user_id, u.name as driver_name, s.name as student_name
         FROM students s
         JOIN trips t ON t.route_id = (SELECT route_id FROM trips WHERE status = 'active' LIMIT 1)
         JOIN drivers d ON d.id = t.driver_id
         JOIN users u ON u.id = d.user_id
         WHERE s.id = $1`,
        [student_id]
      );
      if (driverResult.rows.length > 0) {
        const driverUser = driverResult.rows[0];
        const connectedUsers = getConnectedUsers();
        const driverSocket = connectedUsers[driverUser.driver_user_id];
        if (driverSocket) {
          io.to(driverSocket).emit('pickup:change:notify', {
            student_id,
            student_name: driverUser.student_name,
            new_pickup_location,
            effective_date,
            reason
          });
        }
      }
    }

    res.status(201).json({
      message: 'Pickup change request submitted. Awaiting admin approval.',
      request: result.rows[0]
    });
  } catch (error) {
    console.error('Pickup change error:', error.message);
    res.status(500).json({ message: 'Server error requesting pickup change' });
  }
};

// Get pickup change requests for parent
const getPickupChangeRequests = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT pcr.*, s.name as student_name
       FROM pickup_change_requests pcr
       JOIN students s ON pcr.student_id = s.id
       JOIN parents p ON s.parent_id = p.id
       WHERE p.user_id = $1
       ORDER BY pcr.created_at DESC
       LIMIT 50`,
      [user_id]
    );

    res.status(200).json({ requests: result.rows });
  } catch (error) {
    console.error('Get pickup requests error:', error.message);
    res.status(500).json({ message: 'Server error getting pickup requests' });
  }
};

// ========== TRANSPORT HISTORY (enhanced) ==========

const getTransportHistory = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `WITH parent_students AS (
         SELECT s.id as student_id, s.name as student_name
         FROM students s
         JOIN parents p ON s.parent_id = p.id
         WHERE p.user_id = $1
       )
       SELECT 
         t.id,
         t.start_time,
         t.end_time,
         t.status,
         r.route_name,
         b.plate_number,
         u.name as driver_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', a.id,
               'student_id', a.student_id,
               'student_name', ps.student_name,
               'boarded_at', a.boarded_at,
               'dropped_at', a.dropped_at,
               'was_absent', (a.boarded_at IS NULL AND a.dropped_at IS NULL)
             )
             ORDER BY ps.student_name
           ) FILTER (WHERE a.id IS NOT NULL),
           '[]'
         ) as attendance
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       JOIN buses b ON t.bus_id = b.id
       JOIN users u ON t.driver_id = u.id
       LEFT JOIN attendance a ON a.trip_id = t.id AND a.student_id IN (SELECT student_id FROM parent_students)
       LEFT JOIN parent_students ps ON a.student_id = ps.student_id
       WHERE t.status = 'completed'
          OR (t.status = 'active' AND t.start_time IS NOT NULL)
       GROUP BY t.id, r.route_name, b.plate_number, u.name
       ORDER BY t.start_time DESC
       LIMIT 50`,
      [user_id]
    );

    res.status(200).json({ trips: result.rows });
  } catch (error) {
    console.error('Get transport history error:', error.message);
    res.status(500).json({ message: 'Server error getting transport history' });
  }
};

const getEmergencyAlerts = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT ea.*, b.plate_number, u.name as driver_name, r.route_name
       FROM emergency_alerts ea
       JOIN buses b ON ea.bus_id = b.id
       JOIN trips t ON t.bus_id = b.id AND t.status = 'active'
       JOIN routes r ON t.route_id = r.id
       JOIN drivers d ON d.id = t.driver_id
       JOIN users u ON u.id = d.user_id
       WHERE EXISTS (
         SELECT 1 FROM students s
         JOIN parents p ON s.parent_id = p.id
         WHERE p.user_id = $1
       )
       ORDER BY ea.created_at DESC
       LIMIT 50`,
      [user_id]
    );

    res.status(200).json({ alerts: result.rows });
  } catch (error) {
    console.error('Get emergency alerts error:', error.message);
    res.status(500).json({ message: 'Server error getting emergency alerts' });
  }
};

const getSchedulePreview = async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `WITH parent_students AS (
         SELECT s.id as student_id, s.name as student_name, s.pickup_location
         FROM students s JOIN parents p ON s.parent_id = p.id WHERE p.user_id = $1
       )
       SELECT t.id, t.start_time, t.end_time, t.status,
              r.route_name, r.estimated_time,
              b.plate_number, u.name as driver_name,
              ps.student_name, ps.pickup_location
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       JOIN buses b ON t.bus_id = b.id
       JOIN users u ON u.id = (SELECT user_id FROM drivers WHERE id = t.driver_id)
       JOIN route_stops rs ON rs.route_id = r.id
       JOIN parent_students ps ON 1=1
       WHERE t.status IN ('active', 'pending')
       ORDER BY t.start_time ASC
       LIMIT 20`,
      [user_id]
    );
    res.status(200).json({ schedule: result.rows });
  } catch (error) {
    console.error('Get schedule preview error:', error.message);
    res.status(500).json({ message: 'Server error getting schedule' });
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getChatList,
  markMessagesRead,
  markChildAbsent,
  getAbsenceRecords,
  requestPickupChange,
  getPickupChangeRequests,
  getTransportHistory,
  getEmergencyAlerts,
  getSchedulePreview,
};