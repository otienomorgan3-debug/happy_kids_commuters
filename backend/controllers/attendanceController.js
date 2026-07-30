const pool = require('../config/db');
const { createNotification } = require('./notificationController');
const { getDriverIdByUserId } = require('./driverAvailabilityController');

// Attendance screens can remain open while a trip is ended and restarted.
// Resolve the driver's current trip on the server so stale client state cannot
// make Board or Drop Off stop working.
const getDriverActiveTrip = async (userId) => {
  const result = await pool.query(
    `SELECT t.id
       FROM drivers d
       JOIN trips t ON t.driver_id = d.id AND t.status = 'active'
      WHERE d.user_id = $1
      ORDER BY t.start_time DESC
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
};

// Driver starts a trip
const startTrip = async (req, res) => {
  const { route_id } = req.body;
  const user_id = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const driverResult = await client.query(
      `SELECT id, bus_id, availability_status, dispatch_status, is_dispatchable
         FROM drivers
        WHERE user_id = $1
        FOR UPDATE`,
      [user_id]
    );

    if (driverResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const { id: driver_id, bus_id, availability_status, dispatch_status, is_dispatchable } = driverResult.rows[0];

    if (!bus_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No bus assigned to this driver' });
    }

    if (availability_status !== 'available' || !is_dispatchable) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `Driver is currently ${availability_status}. Mark them available before starting a trip.` });
    }

    if (dispatch_status === 'on_trip') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'A trip is already active for this driver' });
    }

    const activeTrip = await client.query(
      `SELECT id FROM trips
        WHERE bus_id = $1 AND status IN ('active', 'reassignment_pending')
        FOR UPDATE`,
      [bus_id]
    );

    if (activeTrip.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'A trip is already active for this bus' });
    }

    const result = await client.query(
      `INSERT INTO trips (bus_id, route_id, driver_id, start_time, status)
       VALUES ($1, $2, $3, NOW(), 'active')
       RETURNING *`,
      [bus_id, route_id || null, driver_id]
    );

    await client.query(
      `UPDATE drivers
          SET dispatch_status = 'on_trip',
              last_status_update_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [driver_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Trip started successfully',
      trip: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Start trip error:', error.message);
    res.status(500).json({ message: 'Server error starting trip' });
  } finally {
    client.release();
  }
};

// Driver ends a trip
const endTrip = async (req, res) => {
  const user_id = req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const driverLookup = await getDriverIdByUserId(user_id, client);
    if (!driverLookup) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    const driver_id = driverLookup.id;
    const tripCheck = await client.query(
      `SELECT id FROM trips
        WHERE driver_id = $1 AND status = 'active'
        ORDER BY start_time DESC
        LIMIT 1
        FOR UPDATE`,
      [driver_id]
    );

    if (tripCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Active trip not found' });
    }

    const activeTripId = tripCheck.rows[0].id;
    const result = await client.query(
      `UPDATE trips
          SET status = 'completed',
              end_time = NOW(),
              updated_at = NOW()
        WHERE id = $1 AND driver_id = $2 AND status = 'active'
        RETURNING *`,
      [activeTripId, driver_id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Trip was already ended' });
    }

    await client.query(
      `UPDATE drivers
          SET dispatch_status = 'idle',
              last_status_update_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [driver_id]
    );

    await client.query('COMMIT');

    res.status(200).json({ message: 'Trip ended successfully', trip: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('End trip error:', error.message);
    res.status(500).json({ message: 'Server error ending trip' });
  } finally {
    client.release();
  }
};

// Driver marks student as boarded
const studentBoarded = async (req, res) => {
  const { student_id } = req.body;

  try {
    const activeTrip = await getDriverActiveTrip(req.user.id);
    if (!activeTrip) return res.status(409).json({ message: 'No active trip found. Start a trip first.' });
    const trip_id = activeTrip.id;

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

    // A notification problem must not make a completed boarding action fail.
    try {
      await createNotification(
          studentInfo.rows[0].parent_user_id,
          `${info.student_name} has boarded the bus safely`,
          'boarding',
          info.parent_phone
      );
    } catch (notificationError) {
      console.error('Boarding notification error:', notificationError.message);
    }
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
  const { student_id } = req.body;

  try {
    const activeTrip = await getDriverActiveTrip(req.user.id);
    if (!activeTrip) return res.status(409).json({ message: 'No active trip found. Start a trip first.' });
    const trip_id = activeTrip.id;

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
      `SELECT s.name as student_name, u.name as parent_name, u.phone as parent_phone,
              u.id as parent_user_id
       FROM students s
       JOIN parents p ON s.parent_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE s.id = $1`,
      [student_id]
    );

    const info = studentInfo.rows[0];

    // Keep the drop-off successful even if a notification provider is down.
    try {
      await createNotification(
          info.parent_user_id,
          `${info.student_name} has been dropped off safely`,
          'dropoff',
          info.parent_phone
      );
    } catch (notificationError) {
      console.error('Drop-off notification error:', notificationError.message);
    }
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
      `SELECT d.id as driver_id, d.license_number, d.availability_status, d.dispatch_status,
              d.availability_reason, d.availability_until, d.is_dispatchable,
              b.id as bus_id, b.plate_number, b.capacity,
              t.id as trip_id, t.status as trip_status, r.id as route_id, r.route_name, r.estimated_time
       FROM drivers d
       JOIN buses b ON d.bus_id = b.id
       LEFT JOIN trips t ON t.driver_id = d.id AND t.status IN ('active', 'reassignment_pending')
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
