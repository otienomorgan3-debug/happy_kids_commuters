const pool = require('../config/db');
const { getIO } = require('../services/socketService');

// ========== CHAT ==========

// Send a chat message (parent to driver or admin)
const sendMessage = async (req, res) => {
  const { receiver_id, message, chat_type, trip_id } = req.body;
  const sender_id = req.user.id;
  const sender_name = req.user.name;
  const sender_role = req.user.role;

  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO chat_messages (sender_id, receiver_id, message, chat_type, trip_id, sender_name, sender_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [sender_id, receiver_id ? parseInt(receiver_id) : null, message, chat_type || 'parent_driver', trip_id || null, sender_name, sender_role]
    );

    const savedMessage = result.rows[0];

    // Emit real-time notification if receiver is connected
    const io = getIO();
    if (receiver_id && io) {
      // Emit to the recipient room so every open session stays synchronized.
      io.to(`user:${receiver_id}`).emit('chat:message', {
        ...savedMessage,
        sender_name,
        sender_role,
      });
    }

    // Also emit to admin room if chat_type is parent_admin
    if (chat_type === 'parent_admin' && io) {
      io.emit('chat:admin_message', {
        ...savedMessage,
        sender_name,
        sender_role,
      });
    }

    res.status(201).json({ message: 'Message sent', chat: savedMessage });
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
       LIMIT 200`,
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

    // Notify the other user that messages were read
    const io = getIO();
    if (io) {
      io.to(`user:${other_user_id}`).emit('chat:read', {
        read_by: user_id,
        other_user_id,
      });
    }

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
        io.to(`user:${driverUser.driver_user_id}`).emit('absence:notify', {
          student_id,
          student_name: driverUser.student_name,
          parent_id,
          date: date || new Date().toISOString().split('T')[0],
          reason: reason || 'Not specified'
        });
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
        io.to(`user:${driverUser.driver_user_id}`).emit('pickup:change:notify', {
          student_id,
          student_name: driverUser.student_name,
          new_pickup_location,
          effective_date,
          reason
        });
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
       JOIN drivers d ON d.id = t.driver_id
       JOIN users u ON u.id = d.user_id
       LEFT JOIN attendance a ON a.trip_id = t.id AND a.student_id IN (SELECT student_id FROM parent_students)
       LEFT JOIN parent_students ps ON a.student_id = ps.student_id
       WHERE (t.status = 'completed'
          OR (t.status = 'active' AND t.start_time IS NOT NULL))
         AND EXISTS (
           SELECT 1 FROM attendance parent_attendance
           JOIN parent_students parent_student ON parent_student.student_id = parent_attendance.student_id
           WHERE parent_attendance.trip_id = t.id
         )
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
       ),
       student_routes AS (
         SELECT DISTINCT ps.student_id, ps.student_name, ps.pickup_location, rs.route_id
         FROM parent_students ps
         JOIN route_stops rs ON (
           LOWER(ps.pickup_location) LIKE '%' || LOWER(rs.location) || '%'
           OR LOWER(ps.pickup_location) LIKE '%' || LOWER(rs.stop_name) || '%'
           OR LOWER(rs.location) LIKE '%' || LOWER(ps.pickup_location) || '%'
           OR LOWER(rs.stop_name) LIKE '%' || LOWER(ps.pickup_location) || '%'
         )
       )
       SELECT t.id, t.start_time, t.end_time, t.status,
              r.route_name, r.estimated_time,
              b.plate_number, u.name as driver_name,
              sr.student_name, sr.pickup_location
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       JOIN buses b ON t.bus_id = b.id
       JOIN users u ON u.id = (SELECT user_id FROM drivers WHERE id = t.driver_id)
       JOIN student_routes sr ON sr.route_id = t.route_id
       WHERE t.status IN ('active', 'pending')
         AND EXISTS (SELECT 1 FROM student_routes parent_route WHERE parent_route.route_id = t.route_id)
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

const getParentTripStatus = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `WITH parent_students AS (
         SELECT s.id AS student_id, s.name AS student_name, s.pickup_location
         FROM students s
         JOIN parents p ON s.parent_id = p.id
         WHERE p.user_id = $1
       ),
       route_students AS (
         SELECT DISTINCT
           ps.student_id,
           ps.student_name,
           ps.pickup_location,
           rs.route_id,
           r.route_name
         FROM parent_students ps
         JOIN route_stops rs ON (
           LOWER(ps.pickup_location) LIKE '%' || LOWER(rs.location) || '%'
           OR LOWER(ps.pickup_location) LIKE '%' || LOWER(rs.stop_name) || '%'
           OR LOWER(rs.location) LIKE '%' || LOWER(ps.pickup_location) || '%'
           OR LOWER(rs.stop_name) LIKE '%' || LOWER(ps.pickup_location) || '%'
         )
         JOIN routes r ON r.id = rs.route_id
       ),
       latest_trips AS (
         SELECT DISTINCT ON (t.route_id)
           t.id,
           t.route_id,
           t.bus_id,
           t.driver_id,
           t.status,
           t.status_reason,
           t.start_time,
           t.end_time,
           t.updated_at,
           b.plate_number,
           u.name AS driver_name,
           u.phone AS driver_phone
         FROM trips t
         LEFT JOIN buses b ON b.id = t.bus_id
         LEFT JOIN drivers d ON d.id = t.driver_id
         LEFT JOIN users u ON u.id = d.user_id
         WHERE t.route_id IN (SELECT route_id FROM route_students)
           AND t.status IN ('active', 'reassignment_pending', 'delayed')
         ORDER BY t.route_id, t.updated_at DESC NULLS LAST, t.start_time DESC
       ),
       latest_reassignment AS (
         SELECT DISTINCT ON (trl.trip_id)
           trl.trip_id,
           trl.reason,
           trl.created_at,
           old_u.name AS old_driver_name,
           new_u.name AS new_driver_name
         FROM trip_reassignment_log trl
         LEFT JOIN drivers old_d ON old_d.id = trl.old_driver_id
         LEFT JOIN users old_u ON old_u.id = old_d.user_id
         LEFT JOIN drivers new_d ON new_d.id = trl.new_driver_id
         LEFT JOIN users new_u ON new_u.id = new_d.user_id
         WHERE trl.trip_id IN (SELECT id FROM latest_trips)
         ORDER BY trl.trip_id, trl.created_at DESC
       )
       SELECT
         lt.id AS trip_id,
         lt.route_id,
         lt.route_name,
         lt.bus_id,
         lt.plate_number,
         lt.driver_id,
         lt.driver_name,
         lt.driver_phone,
         lt.status AS trip_status,
         lt.status_reason,
         lt.start_time,
         lt.end_time,
         lt.updated_at,
         lr.reason AS reassignment_reason,
         lr.created_at AS reassignment_at,
         lr.old_driver_name,
         lr.new_driver_name,
         CASE
           WHEN lt.status = 'reassignment_pending' THEN 'delayed'
           WHEN lt.status = 'delayed' THEN 'delayed'
           WHEN lr.trip_id IS NOT NULL THEN 'reassigned'
           ELSE 'active'
         END AS card_state,
         json_agg(
           json_build_object(
             'student_id', rs.student_id,
             'student_name', rs.student_name,
             'pickup_location', rs.pickup_location
           )
           ORDER BY rs.student_name
         ) AS affected_students
       FROM latest_trips lt
       JOIN route_students rs ON rs.route_id = lt.route_id
       LEFT JOIN latest_reassignment lr ON lr.trip_id = lt.id
       GROUP BY
         lt.id, lt.route_id, lt.route_name, lt.bus_id, lt.plate_number, lt.driver_id,
         lt.driver_name, lt.driver_phone, lt.status, lt.status_reason, lt.start_time,
         lt.end_time, lt.updated_at, lr.reason, lr.created_at, lr.old_driver_name,
         lr.new_driver_name, lr.trip_id
       ORDER BY
         CASE
           WHEN lt.status = 'reassignment_pending' THEN 1
           WHEN lt.status = 'delayed' THEN 2
           WHEN lr.trip_id IS NOT NULL THEN 3
           ELSE 4
         END,
         lt.updated_at DESC NULLS LAST`,
      [user_id]
    );

    res.status(200).json({
      trip_statuses: result.rows
    });
  } catch (error) {
    console.error('Get parent trip status error:', error.message);
    res.status(500).json({ message: 'Server error getting parent trip status' });
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
  getParentTripStatus,
};
