const pool = require('../config/db');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const normalizeStops = (stops) => {
  if (!Array.isArray(stops)) {
    return [];
  }

  return stops
    .filter((stop) => stop && stop.stop_name)
    .map((stop, index) => ({
      stop_name: stop.stop_name,
      location: stop.location || null,
      latitude: stop.latitude === '' || stop.latitude === undefined ? null : Number(stop.latitude),
      longitude: stop.longitude === '' || stop.longitude === undefined ? null : Number(stop.longitude),
      stop_order: Number(stop.stop_order) || index + 1
    }))
    .sort((firstStop, secondStop) => firstStop.stop_order - secondStop.stop_order);
};

const hasCoordinates = (stops) =>
  stops.every((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));

const formatRouteResponse = async (routeId, clientOrPool = pool) => {
  const result = await clientOrPool.query(
    `SELECT r.id, r.route_name, r.estimated_time,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', rs.id,
                  'stop_name', rs.stop_name,
                  'location', rs.location,
                  'latitude', rs.latitude,
                  'longitude', rs.longitude,
                  'stop_order', rs.stop_order
                )
                ORDER BY rs.stop_order
              ) FILTER (WHERE rs.id IS NOT NULL),
              '[]'
            ) AS stops
     FROM routes r
     LEFT JOIN route_stops rs ON rs.route_id = r.id
     WHERE r.id = $1
     GROUP BY r.id`,
    [routeId]
  );

  return result.rows[0];
};

const optimizeStopsOrder = async (stops) => {
  if (!hasCoordinates(stops) || stops.length < 2) {
    return stops;
  }

  const response = await fetch(`${AI_SERVICE_URL}/optimize-route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stops: stops.map((stop) => ({
        id: stop.id,
        name: stop.stop_name,
        latitude: stop.latitude,
        longitude: stop.longitude
      }))
    })
  });

  if (!response.ok) {
    throw new Error(`AI optimization failed with status ${response.status}`);
  }

  const payload = await response.json();
  const optimizedRoute = payload.optimized_route || [];

  return optimizedRoute
    .map((optimizedStop, index) => ({
      ...stops.find((stop) => stop.id === optimizedStop.id) || optimizedStop,
      stop_order: index + 1
    }))
    .filter(Boolean);
};

const persistOptimizedStops = async (client, routeId, stops) => {
  await client.query('DELETE FROM route_stops WHERE route_id = $1', [routeId]);

  for (const stop of stops) {
    await client.query(
      `INSERT INTO route_stops (route_id, stop_name, location, latitude, longitude, stop_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [routeId, stop.stop_name, stop.location, stop.latitude, stop.longitude, stop.stop_order]
    );
  }
};

// ─── DASHBOARD STATS ────────────────────────────────────────────

const getDashboardStats = async (req, res) => {
  try {
    const [students, drivers, buses, activeTrips, payments, outstanding] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM students'),
      pool.query('SELECT COUNT(*) FROM drivers'),
      pool.query('SELECT COUNT(*) FROM buses'),
      pool.query("SELECT COUNT(*) FROM trips WHERE status = 'active'"),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'"),
      pool.query("SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM students")
    ]);

    res.status(200).json({
      stats: {
        total_students: parseInt(students.rows[0].count),
        total_drivers: parseInt(drivers.rows[0].count),
        total_buses: parseInt(buses.rows[0].count),
        active_trips: parseInt(activeTrips.rows[0].count),
        total_revenue: parseFloat(payments.rows[0].total),
        total_outstanding: parseFloat(outstanding.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    res.status(500).json({ message: 'Server error getting stats' });
  }
};

// ─── BUS MANAGEMENT ─────────────────────────────────────────────

const addBus = async (req, res) => {
  const { plate_number, capacity, gps_device_id } = req.body;

  try {
    if (!plate_number || !capacity) {
      return res.status(400).json({ message: 'Plate number and capacity are required' });
    }

    const existing = await pool.query(
      'SELECT id FROM buses WHERE plate_number = $1',
      [plate_number]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bus with this plate number already exists' });
    }

    const result = await pool.query(
      `INSERT INTO buses (plate_number, capacity, gps_device_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [plate_number, capacity, gps_device_id || null]
    );

    res.status(201).json({
      message: 'Bus added successfully',
      bus: result.rows[0]
    });

  } catch (error) {
    console.error('Add bus error:', error.message);
    res.status(500).json({ message: 'Server error adding bus' });
  }
};

const getAllBuses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.plate_number, b.capacity, b.gps_device_id,
              u.name as driver_name, u.phone as driver_phone,
              COUNT(s.id) as total_students
       FROM buses b
       LEFT JOIN drivers d ON d.bus_id = b.id
       LEFT JOIN users u ON d.user_id = u.id
       LEFT JOIN students s ON s.school_id IS NOT NULL
       GROUP BY b.id, u.name, u.phone
       ORDER BY b.plate_number`
    );

    res.status(200).json({ buses: result.rows });

  } catch (error) {
    console.error('Get buses error:', error.message);
    res.status(500).json({ message: 'Server error getting buses' });
  }
};

const updateBus = async (req, res) => {
  const { id } = req.params;
  const { plate_number, capacity, gps_device_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE buses SET plate_number=$1, capacity=$2, gps_device_id=$3
       WHERE id=$4 RETURNING *`,
      [plate_number, capacity, gps_device_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    res.status(200).json({
      message: 'Bus updated successfully',
      bus: result.rows[0]
    });

  } catch (error) {
    console.error('Update bus error:', error.message);
    res.status(500).json({ message: 'Server error updating bus' });
  }
};

const deleteBus = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM buses WHERE id = $1', [id]);
    res.status(200).json({ message: 'Bus deleted successfully' });

  } catch (error) {
    console.error('Delete bus error:', error.message);
    res.status(500).json({ message: 'Server error deleting bus' });
  }
};

// ─── DRIVER MANAGEMENT ──────────────────────────────────────────

const getAllDrivers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.license_number, d.bus_id,
              u.name, u.email, u.phone,
              b.plate_number as assigned_bus
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       LEFT JOIN buses b ON d.bus_id = b.id
       ORDER BY u.name`
    );

    res.status(200).json({ drivers: result.rows });

  } catch (error) {
    console.error('Get drivers error:', error.message);
    res.status(500).json({ message: 'Server error getting drivers' });
  }
};

const assignDriverToBus = async (req, res) => {
  const { driver_id, bus_id } = req.body;

  try {
    if (!driver_id || !bus_id) {
      return res.status(400).json({ message: 'driver_id and bus_id are required' });
    }

    // Check if bus exists
    const busCheck = await pool.query('SELECT id FROM buses WHERE id = $1', [bus_id]);
    if (busCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    // Check if bus already has a driver
    const existingDriver = await pool.query(
      'SELECT id FROM drivers WHERE bus_id = $1 AND id != $2',
      [bus_id, driver_id]
    );

    if (existingDriver.rows.length > 0) {
      return res.status(400).json({ message: 'This bus already has a driver assigned' });
    }

    // Assign driver to bus
    const result = await pool.query(
      `UPDATE drivers SET bus_id = $1 WHERE id = $2 RETURNING *`,
      [bus_id, driver_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.status(200).json({
      message: 'Driver assigned to bus successfully',
      driver: result.rows[0]
    });

  } catch (error) {
    console.error('Assign driver error:', error.message);
    res.status(500).json({ message: 'Server error assigning driver' });
  }
};

const unassignDriver = async (req, res) => {
  const { driver_id } = req.params;

  try {
    await pool.query(
      'UPDATE drivers SET bus_id = NULL WHERE id = $1',
      [driver_id]
    );

    res.status(200).json({ message: 'Driver unassigned from bus successfully' });

  } catch (error) {
    console.error('Unassign driver error:', error.message);
    res.status(500).json({ message: 'Server error unassigning driver' });
  }
};

// ─── ROUTE MANAGEMENT ───────────────────────────────────────────

const addRoute = async (req, res) => {
  const { route_name, estimated_time, stops = [] } = req.body;
  const normalizedStops = normalizeStops(stops);
  const client = await pool.connect();

  try {
    if (!route_name) {
      return res.status(400).json({ message: 'Route name is required' });
    }

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO routes (route_name, estimated_time)
       VALUES ($1, $2) RETURNING *`,
      [route_name, estimated_time || null]
    );

    const route = result.rows[0];
    let stopsToSave = normalizedStops;

    if (normalizedStops.length > 1) {
      try {
        stopsToSave = await optimizeStopsOrder(normalizedStops);
      } catch (optimizationError) {
        console.warn('Route optimization skipped:', optimizationError.message);
      }
    }

    await persistOptimizedStops(client, route.id, stopsToSave);
    await client.query('COMMIT');

    const routeWithStops = await formatRouteResponse(route.id);

    res.status(201).json({
      message: 'Route added successfully',
      route: routeWithStops.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Add route error:', error.message);
    res.status(500).json({ message: 'Server error adding route' });
  } finally {
    client.release();
  }
};

const getAllRoutes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.route_name, r.estimated_time,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', rs.id,
                    'stop_name', rs.stop_name,
                    'location', rs.location,
                    'latitude', rs.latitude,
                    'longitude', rs.longitude,
                    'stop_order', rs.stop_order
                  )
                  ORDER BY rs.stop_order
                ) FILTER (WHERE rs.id IS NOT NULL),
                '[]'
              ) AS stops
       FROM routes r
       LEFT JOIN route_stops rs ON rs.route_id = r.id
       GROUP BY r.id
       ORDER BY r.route_name`
    );

    res.status(200).json({ routes: result.rows });

  } catch (error) {
    console.error('Get routes error:', error.message);
    res.status(500).json({ message: 'Server error getting routes' });
  }
};

const updateRoute = async (req, res) => {
  const { id } = req.params;
  const { route_name, estimated_time, stops } = req.body;
  const normalizedStops = Array.isArray(stops) ? normalizeStops(stops) : null;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE routes SET route_name=$1, estimated_time=$2
       WHERE id=$3 RETURNING *`,
      [route_name, estimated_time, id]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Route not found' });
    }

    if (normalizedStops) {
      let stopsToSave = normalizedStops;

      if (normalizedStops.length > 1) {
        try {
          stopsToSave = await optimizeStopsOrder(normalizedStops);
        } catch (optimizationError) {
          console.warn('Route optimization skipped:', optimizationError.message);
        }
      }

      await persistOptimizedStops(client, id, stopsToSave);
    }

    await client.query('COMMIT');
    const routeWithStops = await formatRouteResponse(id);

    res.status(200).json({
      message: 'Route updated successfully',
      route: routeWithStops.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update route error:', error.message);
    res.status(500).json({ message: 'Server error updating route' });
  } finally {
    client.release();
  }
};

const deleteRoute = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM routes WHERE id = $1', [id]);
    res.status(200).json({ message: 'Route deleted successfully' });

  } catch (error) {
    console.error('Delete route error:', error.message);
    res.status(500).json({ message: 'Server error deleting route' });
  }
};

// ─── SCHOOL MANAGEMENT ──────────────────────────────────────────

const addSchool = async (req, res) => {
  const { school_name, address } = req.body;

  try {
    if (!school_name) {
      return res.status(400).json({ message: 'School name is required' });
    }

    const result = await pool.query(
      `INSERT INTO schools (school_name, address)
       VALUES ($1, $2) RETURNING *`,
      [school_name, address || null]
    );

    res.status(201).json({
      message: 'School added successfully',
      school: result.rows[0]
    });

  } catch (error) {
    console.error('Add school error:', error.message);
    res.status(500).json({ message: 'Server error adding school' });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM schools ORDER BY school_name'
    );

    res.status(200).json({ schools: result.rows });

  } catch (error) {
    console.error('Get schools error:', error.message);
    res.status(500).json({ message: 'Server error getting schools' });
  }
};

// ─── REPORTS ────────────────────────────────────────────────────

const getAttendanceReport = async (req, res) => {
  const { date } = req.query;

  try {
    const filterDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT s.name as student_name,
              u.name as parent_name,
              u.phone as parent_phone,
              a.boarded_at, a.dropped_at,
              b.plate_number as bus,
              CASE
                WHEN a.dropped_at IS NOT NULL THEN 'dropped off'
                WHEN a.boarded_at IS NOT NULL THEN 'on bus'
                ELSE 'absent'
              END as status
       FROM students s
       JOIN parents p ON s.parent_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN attendance a ON a.student_id = s.id
         AND DATE(a.boarded_at) = $1
       LEFT JOIN trips t ON a.trip_id = t.id
       LEFT JOIN buses b ON t.bus_id = b.id
       ORDER BY s.name`,
      [filterDate]
    );

    res.status(200).json({
      date: filterDate,
      total: result.rows.length,
      report: result.rows
    });

  } catch (error) {
    console.error('Attendance report error:', error.message);
    res.status(500).json({ message: 'Server error getting attendance report' });
  }
};

const getTripReport = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id as trip_id, t.status, t.start_time, t.end_time,
              b.plate_number,
              u.name as driver_name,
              r.route_name,
              COUNT(a.id) as students_transported
       FROM trips t
       JOIN buses b ON t.bus_id = b.id
       JOIN drivers d ON t.driver_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN routes r ON t.route_id = r.id
       LEFT JOIN attendance a ON a.trip_id = t.id
       GROUP BY t.id, b.plate_number, u.name, r.route_name
       ORDER BY t.start_time DESC
       LIMIT 50`
    );

    res.status(200).json({
      total: result.rows.length,
      trips: result.rows
    });

  } catch (error) {
    console.error('Trip report error:', error.message);
    res.status(500).json({ message: 'Server error getting trip report' });
  }
};

module.exports = {
  getDashboardStats,
  addBus, getAllBuses, updateBus, deleteBus,
  getAllDrivers, assignDriverToBus, unassignDriver,
  addRoute, getAllRoutes, updateRoute, deleteRoute,
  addSchool, getAllSchools,
  getAttendanceReport, getTripReport
};
