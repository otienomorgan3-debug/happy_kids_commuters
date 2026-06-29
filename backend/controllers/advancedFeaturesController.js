const pool = require('../config/db');

// GEOFENCING

const getAllGeofences = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT g.*,
              COUNT(DISTINCT ga.id) FILTER (WHERE ga.status = 'active') as active_alerts_count
       FROM geofences g
       LEFT JOIN geofence_alerts ga ON ga.geofence_id = g.id
       GROUP BY g.id
       ORDER BY g.created_at DESC`
    );
    res.status(200).json({ geofences: result.rows });
  } catch (error) {
    console.error('Get geofences error:', error.message);
    res.status(500).json({ message: 'Server error getting geofences' });
  }
};

const createGeofence = async (req, res) => {
  const { name, type, latitude, longitude, radius_meters, alert_message } = req.body;
  try {
    if (!name || !type || !latitude || !longitude) {
      return res.status(400).json({ message: 'Name, type, latitude, and longitude are required' });
    }
    const result = await pool.query(
      `INSERT INTO geofences (name, type, latitude, longitude, radius_meters, alert_message)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, type, latitude, longitude, radius_meters || 100, alert_message || null]
    );
    res.status(201).json({ message: 'Geofence created successfully', geofence: result.rows[0] });
  } catch (error) {
    console.error('Create geofence error:', error.message);
    res.status(500).json({ message: 'Server error creating geofence' });
  }
};

const updateGeofence = async (req, res) => {
  const { id } = req.params;
  const { name, type, latitude, longitude, radius_meters, alert_message, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE geofences SET name=$1, type=$2, latitude=$3, longitude=$4, radius_meters=$5, alert_message=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, type, latitude, longitude, radius_meters, alert_message, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Geofence not found' });
    res.status(200).json({ message: 'Geofence updated successfully', geofence: result.rows[0] });
  } catch (error) {
    console.error('Update geofence error:', error.message);
    res.status(500).json({ message: 'Server error updating geofence' });
  }
};

const deleteGeofence = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM geofences WHERE id = $1', [id]);
    res.status(200).json({ message: 'Geofence deleted successfully' });
  } catch (error) {
    console.error('Delete geofence error:', error.message);
    res.status(500).json({ message: 'Server error deleting geofence' });
  }
};

const getGeofenceAlerts = async (req, res) => {
  try {
    const { status, bus_id } = req.query;
    let query = `SELECT ga.*, g.name as geofence_name, g.type as geofence_type,
                 b.plate_number, u.name as driver_name
                 FROM geofence_alerts ga
                 JOIN geofences g ON ga.geofence_id = g.id
                 JOIN buses b ON ga.bus_id = b.id
                 LEFT JOIN drivers d ON ga.driver_id = d.id
                 LEFT JOIN users u ON d.user_id = u.id`;
    const params = [];
    const conditions = [];
    if (status) { conditions.push(`ga.status = $${params.length + 1}`); params.push(status); }
    if (bus_id) { conditions.push(`ga.bus_id = $${params.length + 1}`); params.push(bus_id); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY ga.created_at DESC LIMIT 100';
    const result = await pool.query(query, params);
    res.status(200).json({ alerts: result.rows });
  } catch (error) {
    console.error('Get geofence alerts error:', error.message);
    res.status(500).json({ message: 'Server error getting alerts' });
  }
};

const acknowledgeGeofenceAlert = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  try {
    await pool.query(
      `UPDATE geofence_alerts SET status = 'acknowledged', acknowledged_by = $1, acknowledged_at = NOW() WHERE id = $2`,
      [userId, id]
    );
    res.status(200).json({ message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Acknowledge alert error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const checkGeofence = async (req, res) => {
  const { latitude, longitude, bus_id, driver_id } = req.body;
  try {
    const geofences = await pool.query(
      `SELECT g.*, 
              (6371000 * acos(cos(radians($1)) * cos(radians(g.latitude)) * cos(radians(g.longitude) - radians($2)) + sin(radians($1)) * sin(radians(g.latitude)))) AS distance_meters
       FROM geofences g
       WHERE g.is_active = TRUE
       HAVING (6371000 * acos(cos(radians($1)) * cos(radians(g.latitude)) * cos(radians(g.longitude) - radians($2)) + sin(radians($1)) * sin(radians(g.latitude)))) <= g.radius_meters`,
      [latitude, longitude]
    );
    const alerts = [];
    for (const gf of geofences.rows) {
      const existingAlert = await pool.query(
        `SELECT id FROM geofence_alerts WHERE geofence_id = $1 AND bus_id = $2 AND status = 'active' AND created_at > NOW() - INTERVAL '5 minutes'`,
        [gf.id, bus_id]
      );
      if (existingAlert.rows.length === 0) {
        const alert = await pool.query(
          `INSERT INTO geofence_alerts (geofence_id, bus_id, driver_id, alert_type, latitude, longitude, status)
           VALUES ($1, $2, $3, 'enter', $4, $5, 'active') RETURNING *`,
          [gf.id, bus_id, driver_id, latitude, longitude]
        );
        alerts.push(alert.rows[0]);
      }
    }
    res.status(200).json({ triggered: alerts.length > 0, alerts });
  } catch (error) {
    console.error('Check geofence error:', error.message);
    res.status(500).json({ message: 'Server error checking geofence' });
  }
};

// ─── DRIVER BEHAVIOR MONITORING ─────────────────────────────────

const logDriverBehavior = async (req, res) => {
  const { driver_id, bus_id, trip_id, behavior_type, severity, latitude, longitude, speed_kmh, details } = req.body;
  try {
    if (!driver_id || !behavior_type) {
      return res.status(400).json({ message: 'driver_id and behavior_type are required' });
    }
    const result = await pool.query(
      `INSERT INTO driver_behavior_logs (driver_id, bus_id, trip_id, behavior_type, severity, latitude, longitude, speed_kmh, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [driver_id, bus_id, trip_id || null, behavior_type, severity || 'medium', latitude, longitude, speed_kmh || null, details || {}]
    );
    await updateDriverBehaviorScore(driver_id);
    res.status(201).json({ message: 'Behavior logged', log: result.rows[0] });
  } catch (error) {
    console.error('Log behavior error:', error.message);
    res.status(500).json({ message: 'Server error logging behavior' });
  }
};

const updateDriverBehaviorScore = async (driverId) => {
  try {
    const stats = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE behavior_type = 'speeding') as speeding_count,
        COUNT(*) FILTER (WHERE behavior_type = 'harsh_braking') as harsh_braking_count,
        COUNT(*) FILTER (WHERE behavior_type = 'rapid_acceleration') as rapid_acceleration_count,
        SUM(CASE WHEN behavior_type = 'idle_time' THEN COALESCE((details->>'minutes')::int, 0) ELSE 0 END) as idle_time_minutes,
        COUNT(*) FILTER (WHERE behavior_type = 'route_deviation') as route_deviations,
        COUNT(DISTINCT trip_id) as total_trips
       FROM driver_behavior_logs
       WHERE driver_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [driverId]
    );
    const s = stats.rows[0];
    const score = Math.max(0, 100 - (s.speeding_count * 5) - (s.harsh_braking_count * 3) - (s.rapid_acceleration_count * 2) - Math.floor(s.idle_time_minutes / 10) - (s.route_deviations * 10));
    await pool.query(
      `INSERT INTO driver_behavior_scores (driver_id, overall_score, speeding_count, harsh_braking_count, rapid_acceleration_count, idle_time_minutes, route_deviations, total_trips, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (driver_id) DO UPDATE SET
         overall_score = EXCLUDED.overall_score,
         speeding_count = EXCLUDED.speeding_count,
         harsh_braking_count = EXCLUDED.harsh_braking_count,
         rapid_acceleration_count = EXCLUDED.rapid_acceleration_count,
         idle_time_minutes = EXCLUDED.idle_time_minutes,
         route_deviations = EXCLUDED.route_deviations,
         total_trips = EXCLUDED.total_trips,
         last_updated = NOW()`,
      [driverId, score, s.speeding_count, s.harsh_braking_count, s.rapid_acceleration_count, s.idle_time_minutes, s.route_deviations, s.total_trips]
    );
  } catch (error) {
    console.error('Update score error:', error.message);
  }
};

const getDriverBehaviorLogs = async (req, res) => {
  const { driver_id, trip_id, behavior_type, limit = 50 } = req.query;
  try {
    let query = `SELECT dbl.*, u.name as driver_name, b.plate_number
                 FROM driver_behavior_logs dbl
                 JOIN drivers d ON dbl.driver_id = d.id
                 JOIN users u ON d.user_id = u.id
                 JOIN buses b ON dbl.bus_id = b.id`;
    const params = [];
    const conditions = [];
    if (driver_id) { conditions.push(`dbl.driver_id = $${params.length + 1}`); params.push(driver_id); }
    if (trip_id) { conditions.push(`dbl.trip_id = $${params.length + 1}`); params.push(trip_id); }
    if (behavior_type) { conditions.push(`dbl.behavior_type = $${params.length + 1}`); params.push(behavior_type); }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY dbl.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const result = await pool.query(query, params);
    res.status(200).json({ logs: result.rows });
  } catch (error) {
    console.error('Get behavior logs error:', error.message);
    res.status(500).json({ message: 'Server error getting logs' });
  }
};

const getDriverBehaviorScores = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dbs.*, u.name as driver_name, b.plate_number
       FROM driver_behavior_scores dbs
       JOIN drivers d ON dbs.driver_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN buses b ON d.bus_id = b.id
       ORDER BY dbs.overall_score DESC`
    );
    res.status(200).json({ scores: result.rows });
  } catch (error) {
    console.error('Get behavior scores error:', error.message);
    res.status(500).json({ message: 'Server error getting scores' });
  }
};

const getDriverBehaviorScore = async (req, res) => {
  const { driver_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT dbs.*, u.name as driver_name, b.plate_number
       FROM driver_behavior_scores dbs
       JOIN drivers d ON dbs.driver_id = d.id
       JOIN users u ON d.user_id = u.id
       LEFT JOIN buses b ON d.bus_id = b.id
       WHERE dbs.driver_id = $1`,
      [driver_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
    res.status(200).json({ score: result.rows[0] });
  } catch (error) {
    console.error('Get behavior score error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── OFFLINE SYNC ───────────────────────────────────────────────

const queueOfflineAction = async (req, res) => {
  const { user_id, device_id, action_type, entity_type, entity_id, payload } = req.body;
  try {
    if (!user_id || !action_type || !entity_type || !payload) {
      return res.status(400).json({ message: 'user_id, action_type, entity_type, and payload are required' });
    }
    const result = await pool.query(
      `INSERT INTO offline_sync_queue (user_id, device_id, action_type, entity_type, entity_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, device_id || null, action_type, entity_type, entity_id || null, payload]
    );
    res.status(201).json({ message: 'Action queued for sync', queue_item: result.rows[0] });
  } catch (error) {
    console.error('Queue offline action error:', error.message);
    res.status(500).json({ message: 'Server error queuing action' });
  }
};

const getOfflineQueue = async (req, res) => {
  const { user_id, status } = req.query;
  try {
    let query = 'SELECT * FROM offline_sync_queue WHERE 1=1';
    const params = [];
    if (user_id) { query += ` AND user_id = $${params.length + 1}`; params.push(user_id); }
    if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
    query += ' ORDER BY created_at ASC LIMIT 100';
    const result = await pool.query(query, params);
    res.status(200).json({ queue: result.rows });
  } catch (error) {
    console.error('Get offline queue error:', error.message);
    res.status(500).json({ message: 'Server error getting queue' });
  }
};

const syncOfflineActions = async (req, res) => {
  const { user_id } = req.body;
  try {
    const pending = await pool.query(
      'SELECT * FROM offline_sync_queue WHERE user_id = $1 AND status = $2 ORDER BY created_at ASC LIMIT 50',
      [user_id, 'pending']
    );
    const results = [];
    for (const item of pending.rows) {
      try {
        await pool.query('UPDATE offline_sync_queue SET status = $1, synced_at = NOW() WHERE id = $2', ['synced', item.id]);
        results.push({ id: item.id, status: 'synced' });
      } catch {
        await pool.query('UPDATE offline_sync_queue SET retry_count = retry_count + 1 WHERE id = $1', [item.id]);
        results.push({ id: item.id, status: 'failed' });
      }
    }
    res.status(200).json({ synced: results.length, results });
  } catch (error) {
    console.error('Sync offline actions error:', error.message);
    res.status(500).json({ message: 'Server error syncing actions' });
  }
};

const clearSyncedActions = async (req, res) => {
  const { user_id, older_than_days = 7 } = req.body;
  try {
    const result = await pool.query(
      `DELETE FROM offline_sync_queue WHERE user_id = $1 AND status = 'synced' AND synced_at < NOW() - INTERVAL '1 day' * $2`,
      [user_id, older_than_days]
    );
    res.status(200).json({ message: `Cleared ${result.rowCount} synced actions` });
  } catch (error) {
    console.error('Clear synced actions error:', error.message);
    res.status(500).json({ message: 'Server error clearing actions' });
  }
};

module.exports = {
  getAllGeofences, createGeofence, updateGeofence, deleteGeofence,
  getGeofenceAlerts, acknowledgeGeofenceAlert, checkGeofence,
  logDriverBehavior, getDriverBehaviorLogs, getDriverBehaviorScores, getDriverBehaviorScore,
  queueOfflineAction, getOfflineQueue, syncOfflineActions, clearSyncedActions,
};