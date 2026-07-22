const pool = require('../config/db');
const { createNotification } = require('./notificationController');

// Driver starts a trip
const startTrip = async (req, res) => {
  const { route_id } = req.body;
  const user_id = req.user.id;

  try {
    // Get driver's bus
    const driverResult = await pool.query(
      'SELECT id, bus_id FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const { id: driver_id, bus_id } = driverResult.rows[0];

    if (!bus_id) {
      return res.status(400).json({ message: 'No bus assigned to this driver' });
    }

    // Check no active trip already running
    const activeTrip = await pool.query(
      `SELECT id FROM trips WHERE bus_id = $1 AND status = 'active'`,
      [bus_id]
    );

    if (activeTrip.rows.length > 0) {
      return res.status(400).json({ message: 'A trip is already active for this bus' });
    }

    // Create new trip
    const result = await pool.query(
      `INSERT INTO trips (bus_id, route_id, driver_id, start_time, status)
       VALUES ($1, $2, $3, NOW(), 'active')
       RETURNING *`,
      [bus_id, route_id || null, driver_id]
    );

    res.status(201).json({
      message: 'Trip started successfully',
      trip: result.rows[0]
    });

  } catch (error) {
    console.error('Start trip error:', error.message);
    res.status(500).json({ message: 'Server error starting trip' });
  }
};

// Driver ends a trip
const endTrip = async (req, res) => {
  const { trip_id } = req.body;
  const user_id = req.user.id;

  try {
    // Verify this trip belongs to this driver
    const driverResult = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1',
      [user_id]
    );

    const driver_id = driverResult.rows[0]?.id;

    const tripCheck = await pool.query(
      `SELECT id FROM trips WHERE id = $1 AND driver_id = $2 AND status = 'active'`,
      [trip_id, driver_id]
    );

    if (tripCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Active trip not found' });
    }

    // End the trip
    await pool.query(
      `UPDATE trips SET status = 'completed', end_time = NOW() WHERE id = $1`,
      [trip_id]
    );

    res.status(200).json({ message: 'Trip ended successfully' });

  } catch (error) {
    console.error('End trip error:', error.message);
    res.status(500).json({ message: 'Server error ending trip' });
  }
};

// Driver marks student as boarded
const studentBoarded = async (req, res) => {
  const { student_id, trip_id } = req.body;

  try {
    // Check if attendance record already exists
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND trip_id = $2',
      [student_id, trip_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Student already marked as boarded' });
    }

    // Create attendance record
    const result = await pool.query(
      `INSERT INTO attendance (student_id, trip_id, boarded_at)
       VALUES ($1, $2, NOW())
       RETURNING *`,
      [student_id, trip_id]
    );

    // Get student and parent info for notification
    const studentInfo = await pool.query(
      `SELECT s.name as student_name, u.name as parent_name, 
            u.phone as parent_phone, u.id as parent_user_id
        FROM students s
        JOIN parents p ON s.parent_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE s.id = $1`,
      [student_id]
    );

    const info = studentInfo.rows[0];

    // Send real notification to parent
    await createNotification(
        studentInfo.rows[0].parent_user_id,
        `${info.student_name} has boarded the bus safely`,
        'boarding',
        info.parent_phone
    );
    console.log(`NOTIFY: ${info.parent_name} - ${info.student_name} has boarded the bus`);

    res.status(201).json({
      message: `${info.student_name} marked as boarded`,
      attendance: result.rows[0],
      notification_sent_to: info.parent_phone
    });

  } catch (error) {
    console.error('Student boarded error:', error.message);
    res.status(500).json({ message: 'Server error marking student boarded' });
  }
};

// Driver marks student as dropped off
const studentDropped = async (req, res) => {
  const { student_id, trip_id } = req.body;

  try {
    // Find the attendance record
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND trip_id = $2',
      [student_id, trip_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'No boarding record found for this student' });
    }

    // Update drop off time
    const result = await pool.query(
      `UPDATE attendance SET dropped_at = NOW()
       WHERE student_id = $1 AND trip_id = $2
       RETURNING *`,
      [student_id, trip_id]
    );

    // Get student info for notification
    const studentInfo = await pool.query(
      `SELECT s.name as student_name, u.name as parent_name, u.phone as parent_phone
       FROM students s
       JOIN parents p ON s.parent_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE s.id = $1`,
      [student_id]
    );

    const info = studentInfo.rows[0];

    await createNotification(
        info.parent_user_id,
        `${info.student_name} has been dropped off safely`,
        'dropoff',
        info.parent_phone
    );
    console.log(`NOTIFY: ${info.parent_name} - ${info.student_name} has been dropped off safely`);

    res.status(200).json({
      message: `${info.student_name} marked as dropped off`,
      attendance: result.rows[0],
      notification_sent_to: info.parent_phone
    });

  } catch (error) {
    console.error('Student dropped error:', error.message);
    res.status(500).json({ message: 'Server error marking student dropped' });
  }
};

// Get attendance report for a trip
const getTripAttendance = async (req, res) => {
  const { trip_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT s.name as student_name,
              a.boarded_at, a.dropped_at,
              CASE 
                WHEN a.dropped_at IS NOT NULL THEN 'dropped off'
                WHEN a.boarded_at IS NOT NULL THEN 'on bus'
                ELSE 'absent'
              END as status
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.trip_id = $1
       ORDER BY a.boarded_at`,
      [trip_id]
    );

    res.status(200).json({
      trip_id,
      total: result.rows.length,
      attendance: result.rows
    });

  } catch (error) {
    console.error('Get attendance error:', error.message);
    res.status(500).json({ message: 'Server error getting attendance' });
  }
};

const getMyAssignment = async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await pool.query(
      `SELECT d.id as driver_id, d.license_number, b.id as bus_id, b.plate_number, b.capacity,
              r.id as route_id, r.route_name, r.estimated_time
       FROM drivers d
       JOIN buses b ON d.bus_id = b.id
       LEFT JOIN trips t ON t.bus_id = b.id AND t.status = 'active'
       LEFT JOIN routes r ON r.id = t.route_id
       WHERE d.user_id = $1
       LIMIT 1`,
      [user_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No driver assignment found' });
    }
    res.status(200).json({ assignment: result.rows[0] });
  } catch (error) {
    console.error('Get assignment error:', error.message);
    res.status(500).json({ message: 'Server error getting assignment' });
  }
};

module.exports = {
  startTrip,
  endTrip,
  studentBoarded,
  studentDropped,
  getTripAttendance,
  getMyAssignment
};