const pool = require('../config/db');
const { createNotification } = require('./notificationController');
const { getIO } = require('../services/socketService');

const AVAILABILITY_STATUSES = ['available', 'unavailable', 'on_leave', 'sick', 'offline'];

const getDriverOverviewQuery = () => `
  SELECT d.id, d.user_id, d.license_number, d.bus_id,
         d.availability_status, d.dispatch_status, d.availability_reason,
         d.availability_until, d.is_dispatchable, d.last_status_update_at,
         u.name, u.email, u.phone,
         b.plate_number AS assigned_bus,
         active_trip.id AS active_trip_id,
         active_trip.status AS active_trip_status,
         active_trip.route_id AS active_route_id,
         active_trip.bus_id AS active_trip_bus_id,
         active_trip.route_name AS active_route_name
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN buses b ON d.bus_id = b.id
    LEFT JOIN LATERAL (
      SELECT t.id, t.status, t.route_id, t.bus_id, r.route_name
        FROM trips t
        LEFT JOIN routes r ON r.id = t.route_id
       WHERE t.driver_id = d.id
         AND t.status IN ('active', 'reassignment_pending')
       ORDER BY t.start_time DESC NULLS LAST, t.id DESC
       LIMIT 1
    ) active_trip ON TRUE
`;

const getDriverIdByUserId = async (userId, client = pool) => {
  const result = await client.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
};

const getDriverOverviewById = async (driverId, client = pool) => {
  const result = await client.query(`${getDriverOverviewQuery()} WHERE d.id = $1`, [driverId]);
  return result.rows[0] || null;
};

const getAvailableDrivers = async (req, res) => {
  const { bus_id } = req.query;
  try {
    const params = [];
    let query = `${getDriverOverviewQuery()} WHERE d.availability_status = 'available' AND d.is_dispatchable = TRUE`;
    if (bus_id) {
      params.push(Number(bus_id));
      query += ` AND (d.bus_id = $1 OR d.bus_id IS NULL)`;
    }
    query += ' ORDER BY u.name ASC';
    const result = await pool.query(query, params);
    res.status(200).json({ drivers: result.rows });
  } catch (error) {
    console.error('Get available drivers error:', error.message);
    res.status(500).json({ message: 'Server error getting available drivers' });
  }
};

const getDriverAvailabilityHistory = async (req, res) => {
  const { driver_id, limit = 20 } = req.query;
  try {
    const params = [Number(limit) || 20];
    let query = `
      SELECT dah.*, du.name AS driver_name, cu.name AS changed_by_name
        FROM driver_availability_history dah
        JOIN drivers d ON d.id = dah.driver_id
        JOIN users du ON du.id = d.user_id
        LEFT JOIN users cu ON cu.id = dah.changed_by
    `;
    if (driver_id) {
      params.unshift(Number(driver_id));
      query += ' WHERE dah.driver_id = $1';
      query += ' ORDER BY dah.created_at DESC LIMIT $2';
    } else {
      query += ' ORDER BY dah.created_at DESC LIMIT $1';
    }
    const result = await pool.query(query, params);
    res.status(200).json({ history: result.rows });
  } catch (error) {
    console.error('Get driver availability history error:', error.message);
    res.status(500).json({ message: 'Server error getting driver history' });
  }
};

const updateDriverAvailability = async (req, res) => {
  const requestedStatus = String(req.body.availability_status || req.body.status || '').toLowerCase();
  const reason = req.body.reason || null;
  const availabilityUntil = req.body.availability_until || null;
  const driverIdParam = req.params.driver_id || req.body.driver_id;
  const targetUserId = req.user.role === 'driver' ? req.user.id : null;
  const source = req.user.role === 'driver' ? 'driver' : 'admin';

  if (!AVAILABILITY_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ message: 'Invalid availability status' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const driverLookup = targetUserId
        ? await getDriverIdByUserId(targetUserId, client)
        : driverIdParam
          ? await client.query('SELECT id FROM drivers WHERE id = $1', [Number(driverIdParam)])
          : null;

      const targetDriverId = targetUserId
        ? driverLookup?.id
        : driverLookup?.rows?.[0]?.id;

      if (!targetDriverId) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Driver not found' });
      }

      const driverRes = await client.query(
        `SELECT d.id, d.user_id, d.availability_status, d.dispatch_status, d.is_dispatchable, d.bus_id,
                d.availability_reason, d.availability_until, u.name, u.phone
           FROM drivers d
           JOIN users u ON d.user_id = u.id
          WHERE d.id = $1
          FOR UPDATE`,
        [targetDriverId]
      );
      const driver = driverRes.rows[0];
      if (!driver) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Driver not found' });
      }

      const activeTripRes = await client.query(
        `SELECT id, bus_id, route_id, status
           FROM trips
          WHERE driver_id = $1 AND status = 'active'
          ORDER BY start_time DESC, id DESC
          LIMIT 1
          FOR UPDATE`,
        [targetDriverId]
      );
      const activeTrip = activeTripRes.rows[0] || null;

      if (requestedStatus === 'available' && activeTrip) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'End the active trip before marking the driver available again' });
      }

      const dispatchStatus = activeTrip && requestedStatus !== 'available' ? 'reassignment_pending' : 'idle';
      const isDispatchable = requestedStatus === 'available';
      const nextAvailableAt = requestedStatus === 'available' ? new Date() : (availabilityUntil || null);

      const updated = await client.query(
        `UPDATE drivers
            SET availability_status = $1,
                dispatch_status = $2,
                availability_reason = $3,
                availability_until = $4,
                is_dispatchable = $5,
                next_available_at = $6,
                last_status_update_at = NOW(),
                last_status_updated_by = $7,
                updated_at = NOW()
          WHERE id = $8
          RETURNING *`,
        [
          requestedStatus,
          dispatchStatus,
          reason,
          availabilityUntil || null,
          isDispatchable,
          nextAvailableAt,
          req.user.id,
          targetDriverId
        ]
      );

      if (activeTrip && requestedStatus !== 'available') {
        await client.query(
          `UPDATE trips
              SET status = 'reassignment_pending',
                  status_reason = $2,
                  updated_at = NOW()
            WHERE id = $1`,
          [activeTrip.id, reason || `Driver marked ${requestedStatus}`]
        );

        await client.query(
          `INSERT INTO trip_reassignment_log (trip_id, old_driver_id, new_driver_id, bus_id, route_id, reason, reassigned_by)
           VALUES ($1, $2, NULL, $3, $4, $5, $6)`,
          [activeTrip.id, targetDriverId, activeTrip.bus_id, activeTrip.route_id, reason || `Driver marked ${requestedStatus}`, req.user.id]
        );
      }

      await client.query(
        `INSERT INTO driver_availability_history (driver_id, old_status, new_status, reason, source, changed_by, trip_id, bus_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          targetDriverId,
          driver.availability_status || 'available',
          requestedStatus,
          reason,
          source,
          req.user.id,
          activeTrip?.id || null,
          driver.bus_id || null
        ]
      );

      await client.query('COMMIT');

      const io = getIO();
      if (io) {
        io.emit('driver:availability_changed', {
          driver_id: targetDriverId,
          status: requestedStatus,
          dispatch_status: dispatchStatus,
          active_trip_id: activeTrip?.id || null
        });
        if (activeTrip && requestedStatus !== 'available') {
          io.emit('trip:reassignment_needed', {
            trip_id: activeTrip.id,
            driver_id: targetDriverId,
            bus_id: activeTrip.bus_id,
            route_id: activeTrip.route_id
          });
        }
      }

      const notifyMessage = activeTrip && requestedStatus !== 'available'
        ? `Your availability was updated to ${requestedStatus}. An active trip now needs reassignment.`
        : `Your availability was updated to ${requestedStatus}.`;

      if (req.user.role !== 'driver') {
        await createNotification(driver.user_id, notifyMessage, 'availability', driver.phone).catch(() => {});
      }

      const admins = await pool.query(`SELECT id, phone FROM users WHERE role IN ('admin', 'superadmin')`);
      await Promise.all(admins.rows.map((admin) =>
        createNotification(
          admin.id,
          `${driver.name} is now ${requestedStatus}${activeTrip && requestedStatus !== 'available' ? ' and their active trip needs reassignment' : ''}.`,
          'availability',
          admin.phone
        ).catch(() => {})
      ));

      return res.status(200).json({
        message: 'Driver availability updated successfully',
        driver: updated.rows[0],
        active_trip: activeTrip
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update driver availability error:', error.message);
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error updating driver availability' });
  }
};

const reassignTrip = async (req, res) => {
  const tripId = Number(req.params.trip_id || req.body.trip_id);
  const replacementDriverId = Number(req.body.replacement_driver_id || req.body.driver_id);
  const reason = req.body.reason || 'Driver unavailable';

  if (!tripId || !replacementDriverId) {
    return res.status(400).json({ message: 'trip_id and replacement_driver_id are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tripRes = await client.query(
      `SELECT t.id, t.bus_id, t.route_id, t.driver_id, t.status, b.plate_number, r.route_name
         FROM trips t
         LEFT JOIN buses b ON b.id = t.bus_id
         LEFT JOIN routes r ON r.id = t.route_id
        WHERE t.id = $1
        FOR UPDATE`,
      [tripId]
    );
    const trip = tripRes.rows[0];
    if (!trip) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Trip not found' });
    }
    if (!['active', 'reassignment_pending'].includes(trip.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Only active or reassignment pending trips can be reassigned' });
    }

    const replacementRes = await client.query(
      `SELECT d.id, d.user_id, d.bus_id, d.availability_status, d.dispatch_status,
              d.is_dispatchable, u.name, u.phone
         FROM drivers d
         JOIN users u ON u.id = d.user_id
        WHERE d.id = $1
        FOR UPDATE`,
      [replacementDriverId]
    );
    const replacement = replacementRes.rows[0];
    if (!replacement) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Replacement driver not found' });
    }
    if (replacement.availability_status !== 'available' || !replacement.is_dispatchable) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Replacement driver is not available' });
    }
    if (replacement.bus_id && replacement.bus_id !== trip.bus_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Replacement driver must already be assigned to this bus or be unassigned' });
    }

    const oldDriverRes = await client.query(
      `SELECT d.id, d.user_id, u.name, u.phone
         FROM drivers d
         JOIN users u ON u.id = d.user_id
        WHERE d.id = $1`,
      [trip.driver_id]
    );
    const oldDriver = oldDriverRes.rows[0] || null;

    if (!replacement.bus_id) {
      await client.query('UPDATE drivers SET bus_id = $1 WHERE id = $2', [trip.bus_id, replacement.id]);
    }

    const updatedTrip = await client.query(
      `UPDATE trips
          SET driver_id = $1,
              status = 'active',
              status_reason = NULL,
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [replacement.id, trip.id]
    );

    await client.query(
      `UPDATE drivers
          SET dispatch_status = 'idle',
              last_status_update_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [trip.driver_id]
    );

    await client.query(
      `UPDATE drivers
          SET dispatch_status = 'on_trip',
              last_status_update_at = NOW(),
              updated_at = NOW()
        WHERE id = $1`,
      [replacement.id]
    );

    await client.query(
      `INSERT INTO trip_reassignment_log (trip_id, old_driver_id, new_driver_id, bus_id, route_id, reason, reassigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [trip.id, trip.driver_id, replacement.id, trip.bus_id, trip.route_id, reason, req.user.id]
    );

    await client.query('COMMIT');

    const io = getIO();
    if (io) {
      io.emit('trip:reassigned', {
        trip_id: trip.id,
        bus_id: trip.bus_id,
        route_id: trip.route_id,
        old_driver_id: trip.driver_id,
        new_driver_id: replacement.id
      });
      io.emit('driver:availability_changed', {
        driver_id: replacement.id,
        status: 'available',
        dispatch_status: 'on_trip',
        active_trip_id: trip.id
      });
    }

    await Promise.all([
      createNotification(
        replacement.user_id,
        `You have been assigned to ${trip.route_name || 'a trip'} on bus ${trip.plate_number || trip.bus_id}.`,
        'trip_reassignment',
        replacement.phone
      ).catch(() => {}),
      oldDriver ? createNotification(
        oldDriver.user_id,
        `Your trip on ${trip.route_name || 'the route'} was reassigned to another driver.`,
        'trip_reassignment',
        oldDriver.phone
      ).catch(() => {}) : Promise.resolve()
    ]);

    const routeStudents = await pool.query(
      `SELECT DISTINCT u.id, u.phone, u.name, s.name AS student_name
         FROM students s
         JOIN parents p ON p.id = s.parent_id
         JOIN users u ON u.id = p.user_id
         JOIN route_stops rs ON rs.route_id = $1
        WHERE rs.location ILIKE '%' || s.pickup_location || '%'
           OR rs.stop_name ILIKE '%' || s.pickup_location || '%'`,
      [trip.route_id]
    );

    await Promise.all(routeStudents.rows.map((parent) =>
      createNotification(
        parent.id,
        `Trip ${trip.id} has been reassigned and may depart later than planned.`,
        'trip_reassignment',
        parent.phone
      ).catch(() => {})
    ));

    res.status(200).json({
      message: 'Trip reassigned successfully',
      trip: updatedTrip.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Trip reassignment error:', error.message);
    res.status(error.statusCode || 500).json({ message: error.message || 'Server error reassigning trip' });
  } finally {
    client.release();
  }
};

module.exports = {
  getAvailableDrivers,
  getDriverAvailabilityHistory,
  updateDriverAvailability,
  reassignTrip,
  getDriverOverviewById,
  getDriverIdByUserId
};
