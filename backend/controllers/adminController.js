const pool = require('../config/db');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const normalizeStops = (stops) => {
  if (!Array.isArray(stops)) return [];
  return stops
    .filter((stop) => stop && stop.stop_name)
    .map((stop, index) => ({
      stop_name: stop.stop_name,
      location: stop.location || null,
      latitude: stop.latitude === '' || stop.latitude === undefined ? null : Number(stop.latitude),
      longitude: stop.longitude === '' || stop.longitude === undefined ? null : Number(stop.longitude),
      stop_order: Number(stop.stop_order) || index + 1
    }))
    .sort((a, b) => a.stop_order - b.stop_order);
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
  if (!hasCoordinates(stops) || stops.length < 2) return stops;
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/optimize-route`, {
      stops: stops.map((stop) => ({
        id: stop.id, name: stop.stop_name,
        latitude: stop.latitude, longitude: stop.longitude
      }))
    });
    const payload = response.data;
    const optimizedRoute = payload.optimized_route || [];
    return optimizedRoute
      .map((optimizedStop, index) => ({
        ...stops.find((stop) => stop.id === optimizedStop.id) || optimizedStop,
        stop_order: index + 1
      }))
      .filter(Boolean);
  } catch {
    return stops;
  }
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

// ─── ANALYTICS ───────────────────────────────────────────────────

const getAnalytics = async (req, res) => {
  try {
    // Weekly trip counts
    const weeklyTrips = await pool.query(
      `SELECT DATE(start_time) as date, COUNT(*) as trip_count
       FROM trips WHERE start_time > NOW() - INTERVAL '7 days'
       GROUP BY DATE(start_time) ORDER BY date`
    );

    // Student attendance rates
    const attendanceRates = await pool.query(
      `SELECT s.name,
              COUNT(a.id) FILTER (WHERE a.boarded_at IS NOT NULL) as days_present,
              COUNT(t.id) as total_days
       FROM students s
       CROSS JOIN trips t
       LEFT JOIN attendance a ON a.student_id = s.id AND a.trip_id = t.id
       WHERE t.status = 'completed'
       GROUP BY s.id, s.name
       ORDER BY days_present DESC`
    );

    // Payment trends (monthly)
    const monthlyPayments = await pool.query(
      `SELECT DATE_TRUNC('month', created_at) as month,
              COUNT(*) as transaction_count,
              COALESCE(SUM(amount), 0) as total_amount
       FROM payments WHERE status = 'paid'
       GROUP BY month ORDER BY month DESC LIMIT 12`
    );

    // Bus utilization
    const busUtilization = await pool.query(
      `SELECT b.plate_number, COUNT(t.id) as trip_count
       FROM buses b
       LEFT JOIN trips t ON t.bus_id = b.id AND t.start_time > NOW() - INTERVAL '30 days'
       GROUP BY b.id, b.plate_number
       ORDER BY trip_count DESC`
    );

    res.status(200).json({
      weekly_trips: weeklyTrips.rows,
      attendance_rates: attendanceRates.rows,
      monthly_payments: monthlyPayments.rows,
      bus_utilization: busUtilization.rows,
    });
  } catch (error) {
    console.error('Analytics error:', error.message);
    res.status(500).json({ message: 'Server error getting analytics' });
  }
};

const getAttendanceTrends = async (req, res) => {
  const { days = 30 } = req.query;
  try {
    const result = await pool.query(
      `SELECT DATE(a.boarded_at) as date,
              COUNT(DISTINCT a.student_id) as present_count,
              COUNT(DISTINCT s.id) as total_count
       FROM attendance a
       RIGHT JOIN students s ON 1=1
       WHERE a.boarded_at > NOW() - INTERVAL '1 day' * $1
          OR a.boarded_at IS NULL
       GROUP BY DATE(a.boarded_at)
       ORDER BY date DESC LIMIT $1`,
      [days]
    );
    res.status(200).json({ trends: result.rows });
  } catch (error) {
    console.error('Attendance trends error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── PARENT MANAGEMENT ───────────────────────────────────────────

const getAllParents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              p.address,
              COUNT(DISTINCT s.id) as children_count,
              COALESCE(SUM(s.outstanding_balance), 0) as total_outstanding,
              COUNT(DISTINCT pay.id) FILTER (WHERE pay.status = 'paid') as payments_count
       FROM users u
       JOIN parents p ON u.id = p.user_id
       LEFT JOIN students s ON s.parent_id = p.id
       LEFT JOIN payments pay ON pay.parent_id = p.id
       WHERE u.role = 'parent'
       GROUP BY u.id, u.name, u.email, u.phone, u.created_at, p.address
       ORDER BY u.name`
    );
    res.status(200).json({ parents: result.rows });
  } catch (error) {
    console.error('Get parents error:', error.message);
    res.status(500).json({ message: 'Server error getting parents' });
  }
};

const getParentDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const parentResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at, p.address
       FROM users u JOIN parents p ON u.id = p.user_id WHERE u.id = $1`,
      [id]
    );
    if (parentResult.rows.length === 0) return res.status(404).json({ message: 'Parent not found' });

    const studentsResult = await pool.query(
      `SELECT s.id, s.name, s.pickup_location, s.dropoff_location, s.transport_fee,
              s.outstanding_balance, sc.school_name
       FROM students s LEFT JOIN schools sc ON s.school_id = sc.id
       WHERE s.parent_id = (SELECT id FROM parents WHERE user_id = $1)`,
      [id]
    );

    const paymentsResult = await pool.query(
      `SELECT id, amount, mpesa_receipt, status, created_at
       FROM payments WHERE parent_id = (SELECT id FROM parents WHERE user_id = $1)
       ORDER BY created_at DESC LIMIT 20`,
      [id]
    );

    res.status(200).json({
      parent: parentResult.rows[0],
      students: studentsResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    console.error('Get parent details error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateParentStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [is_active, id]);
    res.status(200).json({ message: 'Parent status updated' });
  } catch (error) {
    console.error('Update parent error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── FINANCIAL REPORTS ──────────────────────────────────────────

const getFinancialReport = async (req, res) => {
  const { period = 'monthly', start_date, end_date } = req.query;
  try {
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE p.created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    } else if (period === 'weekly') {
      dateFilter = "WHERE p.created_at > NOW() - INTERVAL '7 days'";
    } else if (period === 'yearly') {
      dateFilter = "WHERE p.created_at > NOW() - INTERVAL '1 year'";
    } else {
      dateFilter = "WHERE p.created_at > NOW() - INTERVAL '30 days'";
    }

    // Summary
    const summary = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE p.status = 'paid') as paid_transactions,
         COUNT(*) FILTER (WHERE p.status = 'pending') as pending_transactions,
         COUNT(*) FILTER (WHERE p.status = 'failed') as failed_transactions,
         COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) as collected_revenue,
         COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) as pending_revenue
       FROM payments p ${dateFilter}`,
      params
    );

    // Outstanding balances
    const outstanding = await pool.query(
      `SELECT COALESCE(SUM(outstanding_balance), 0) as total_outstanding,
              COUNT(*) FILTER (WHERE outstanding_balance > 0) as parents_with_debt
       FROM students WHERE outstanding_balance > 0`
    );

    // Daily breakdown for chart
    const dailyBreakdown = await pool.query(
      `SELECT DATE(p.created_at) as date,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'paid'), 0) as paid_amount,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'pending'), 0) as pending_amount
       FROM payments p
       WHERE p.created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(p.created_at)
       ORDER BY date DESC`
    );

    res.status(200).json({
      summary: summary.rows[0],
      outstanding: outstanding.rows[0],
      daily_breakdown: dailyBreakdown.rows,
    });
  } catch (error) {
    console.error('Financial report error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── INCIDENT MANAGEMENT ─────────────────────────────────────────

const getIncidents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ea.id, ea.location, ea.status, ea.created_at,
              b.plate_number, u.name as driver_name
       FROM emergency_alerts ea
       JOIN buses b ON ea.bus_id = b.id
       LEFT JOIN drivers d ON d.bus_id = ea.bus_id
       LEFT JOIN users u ON d.user_id = u.id
       ORDER BY ea.created_at DESC
       LIMIT 50`
    );
    res.status(200).json({ incidents: result.rows });
  } catch (error) {
    console.error('Get incidents error:', error.message);
    res.status(500).json({ message: 'Server error getting incidents' });
  }
};

const updateIncidentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE emergency_alerts SET status = $1 WHERE id = $2', [status, id]);
    res.status(200).json({ message: 'Incident status updated' });
  } catch (error) {
    console.error('Update incident error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getIncidentStats = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week
       FROM emergency_alerts`
    );
    res.status(200).json({ stats: result.rows[0] });
  } catch (error) {
    console.error('Incident stats error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── BUS MANAGEMENT ─────────────────────────────────────────────

const addBus = async (req, res) => {
  const { plate_number, capacity, gps_device_id } = req.body;
  try {
    if (!plate_number || !capacity) {
      return res.status(400).json({ message: 'Plate number and capacity are required' });
    }
    const existing = await pool.query('SELECT id FROM buses WHERE plate_number = $1', [plate_number]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bus with this plate number already exists' });
    }
    const result = await pool.query(
      `INSERT INTO buses (plate_number, capacity, gps_device_id) VALUES ($1, $2, $3) RETURNING *`,
      [plate_number, capacity, gps_device_id || null]
    );
    res.status(201).json({ message: 'Bus added successfully', bus: result.rows[0] });
  } catch (error) {
    console.error('Add bus error:', error.message);
    res.status(500).json({ message: 'Server error adding bus' });
  }
};

const getAllBuses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.id, b.plate_number, b.capacity, b.gps_device_id,
              u.name as driver_name, u.phone as driver_phone
       FROM buses b
       LEFT JOIN drivers d ON d.bus_id = b.id
       LEFT JOIN users u ON d.user_id = u.id
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
      `UPDATE buses SET plate_number=$1, capacity=$2, gps_device_id=$3 WHERE id=$4 RETURNING *`,
      [plate_number, capacity, gps_device_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Bus not found' });
    res.status(200).json({ message: 'Bus updated successfully', bus: result.rows[0] });
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
    if (!driver_id || !bus_id) return res.status(400).json({ message: 'driver_id and bus_id are required' });
    const busCheck = await pool.query('SELECT id FROM buses WHERE id = $1', [bus_id]);
    if (busCheck.rows.length === 0) return res.status(404).json({ message: 'Bus not found' });
    const existingDriver = await pool.query('SELECT id FROM drivers WHERE bus_id = $1 AND id != $2', [bus_id, driver_id]);
    if (existingDriver.rows.length > 0) return res.status(400).json({ message: 'This bus already has a driver assigned' });
    const result = await pool.query(`UPDATE drivers SET bus_id = $1 WHERE id = $2 RETURNING *`, [bus_id, driver_id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
    res.status(200).json({ message: 'Driver assigned to bus successfully', driver: result.rows[0] });
  } catch (error) {
    console.error('Assign driver error:', error.message);
    res.status(500).json({ message: 'Server error assigning driver' });
  }
};

const unassignDriver = async (req, res) => {
  const { driver_id } = req.params;
  try {
    await pool.query('UPDATE drivers SET bus_id = NULL WHERE id = $1', [driver_id]);
    res.status(200).json({ message: 'Driver unassigned successfully' });
  } catch (error) {
    console.error('Unassign driver error:', error.message);
    res.status(500).json({ message: 'Server error unassigning driver' });
  }
};

const addDriver = async (req, res) => {
  const { name, email, phone, license_number, password } = req.body;
  const defaultPassword = password || 'driver123';
  try {
    if (!name || !email || !phone || !license_number) {
      return res.status(400).json({ message: 'Name, email, phone, and license number are required' });
    }
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR phone = $2', [email, phone]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User with this email or phone already exists' });
    }
    const existingLicense = await pool.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
    if (existingLicense.rows.length > 0) {
      return res.status(400).json({ message: 'Driver with this license number already exists' });
    }
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const userResult = await pool.query(
      `INSERT INTO users (role, name, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      ['driver', name, email, phone, hashedPassword]
    );
    const user_id = userResult.rows[0].id;
    const driverResult = await pool.query(
      `INSERT INTO drivers (user_id, license_number) VALUES ($1, $2) RETURNING *`,
      [user_id, license_number]
    );
    res.status(201).json({
      message: 'Driver added successfully',
      driver: {
        id: driverResult.rows[0].id,
        user_id,
        name,
        email,
        phone,
        license_number,
        default_password: defaultPassword
      }
    });
  } catch (error) {
    console.error('Add driver error:', error.message);
    res.status(500).json({ message: 'Server error adding driver' });
  }
};

// ─── ROUTE MANAGEMENT ───────────────────────────────────────────

const addRoute = async (req, res) => {
  const { route_name, estimated_time, stops = [] } = req.body;
  const normalizedStops = normalizeStops(stops);
  const client = await pool.connect();
  try {
    if (!route_name) return res.status(400).json({ message: 'Route name is required' });
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO routes (route_name, estimated_time) VALUES ($1, $2) RETURNING *`,
      [route_name, estimated_time || null]
    );
    const route = result.rows[0];
    let stopsToSave = normalizedStops;
    if (normalizedStops.length > 1) {
      try { stopsToSave = await optimizeStopsOrder(normalizedStops); } catch {}
    }
    await persistOptimizedStops(client, route.id, stopsToSave);
    await client.query('COMMIT');
    const routeWithStops = await formatRouteResponse(route.id);
    res.status(201).json({ message: 'Route added successfully', route: routeWithStops });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Add route error:', error.message);
    res.status(500).json({ message: 'Server error adding route' });
  } finally { client.release(); }
};

const getAllRoutes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.route_name, r.estimated_time,
              COALESCE(json_agg(json_build_object('id', rs.id, 'stop_name', rs.stop_name, 'location', rs.location, 'latitude', rs.latitude, 'longitude', rs.longitude, 'stop_order', rs.stop_order) ORDER BY rs.stop_order) FILTER (WHERE rs.id IS NOT NULL), '[]') AS stops
       FROM routes r LEFT JOIN route_stops rs ON rs.route_id = r.id
       GROUP BY r.id ORDER BY r.route_name`
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
      `UPDATE routes SET route_name=$1, estimated_time=$2 WHERE id=$3 RETURNING *`,
      [route_name, estimated_time, id]
    );
    if (result.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Route not found' }); }
    if (normalizedStops) {
      let stopsToSave = normalizedStops;
      if (normalizedStops.length > 1) { try { stopsToSave = await optimizeStopsOrder(normalizedStops); } catch {} }
      await persistOptimizedStops(client, id, stopsToSave);
    }
    await client.query('COMMIT');
    const routeWithStops = await formatRouteResponse(id);
    res.status(200).json({ message: 'Route updated successfully', route: routeWithStops });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update route error:', error.message);
    res.status(500).json({ message: 'Server error updating route' });
  } finally { client.release(); }
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
    if (!school_name) return res.status(400).json({ message: 'School name is required' });
    const result = await pool.query(`INSERT INTO schools (school_name, address) VALUES ($1, $2) RETURNING *`,
      [school_name, address || null]);
    res.status(201).json({ message: 'School added successfully', school: result.rows[0] });
  } catch (error) {
    console.error('Add school error:', error.message);
    res.status(500).json({ message: 'Server error adding school' });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schools ORDER BY school_name');
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
      `SELECT s.name as student_name, u.name as parent_name, u.phone as parent_phone,
              a.boarded_at, a.dropped_at, b.plate_number as bus,
              CASE WHEN a.dropped_at IS NOT NULL THEN 'dropped off' WHEN a.boarded_at IS NOT NULL THEN 'on bus' ELSE 'absent' END as status
       FROM students s JOIN parents p ON s.parent_id = p.id JOIN users u ON p.user_id = u.id
       LEFT JOIN attendance a ON a.student_id = s.id AND DATE(a.boarded_at) = $1
       LEFT JOIN trips t ON a.trip_id = t.id LEFT JOIN buses b ON t.bus_id = b.id ORDER BY s.name`,
      [filterDate]
    );
    res.status(200).json({ date: filterDate, total: result.rows.length, report: result.rows });
  } catch (error) {
    console.error('Attendance report error:', error.message);
    res.status(500).json({ message: 'Server error getting attendance report' });
  }
};

const getTripReport = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id as trip_id, t.status, t.start_time, t.end_time, b.plate_number, u.name as driver_name, r.route_name, COUNT(a.id) as students_transported
       FROM trips t JOIN buses b ON t.bus_id = b.id JOIN drivers d ON t.driver_id = d.id JOIN users u ON d.user_id = u.id
       LEFT JOIN routes r ON t.route_id = r.id LEFT JOIN attendance a ON a.trip_id = t.id
       GROUP BY t.id, b.plate_number, u.name, r.route_name ORDER BY t.start_time DESC LIMIT 50`
    );
    res.status(200).json({ total: result.rows.length, trips: result.rows });
  } catch (error) {
    console.error('Trip report error:', error.message);
    res.status(500).json({ message: 'Server error getting trip report' });
  }
};

// ─── ADVANCED PAYMENT ADMIN ─────────────────────────────────────

const getAllPaymentsAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pay.id, pay.amount, pay.mpesa_receipt, pay.status, pay.created_at,
              u.name as parent_name, u.email as parent_email, u.phone as parent_phone,
              COALESCE(json_agg(json_build_object('id', s.id, 'name', s.name)) FILTER (WHERE s.id IS NOT NULL), '[]') as students
       FROM payments pay
       JOIN parents p ON pay.parent_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN students s ON s.parent_id = p.id
       GROUP BY pay.id, u.name, u.email, u.phone
       ORDER BY pay.created_at DESC`
    );
    res.status(200).json({ payments: result.rows });
  } catch (error) {
    console.error('Get payments error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPaymentStatsAdmin = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as totalRevenue,
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as paidAmount,
         COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pendingAmount,
         COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) as failedAmount,
         COUNT(*) FILTER (WHERE status = 'paid') as paidCount,
         COUNT(*) FILTER (WHERE status = 'pending') as pendingCount,
         COUNT(*) FILTER (WHERE status = 'failed') as failedCount
       FROM payments`
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Payment stats error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  addBus, getAllBuses, updateBus, deleteBus,
  getAllDrivers, assignDriverToBus, unassignDriver, addDriver,
  addRoute, getAllRoutes, updateRoute, deleteRoute,
  addSchool, getAllSchools,
  getAttendanceReport, getTripReport,
  getAnalytics, getAttendanceTrends,
  getAllParents, getParentDetails, updateParentStatus,
  getFinancialReport,
  getIncidents, updateIncidentStatus, getIncidentStats,
  getAllPaymentsAdmin, getPaymentStatsAdmin,
};
