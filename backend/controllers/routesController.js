const pool = require('../config/db');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const getRouteById = async (req, res) => {
  const { id } = req.params;

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
       WHERE r.id = $1
       GROUP BY r.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }

    res.status(200).json({ route: result.rows[0] });
  } catch (error) {
    console.error('Get route error:', error.message);
    res.status(500).json({ message: 'Server error getting route' });
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

const getRouteEta = async (req, res) => {
  const { id } = req.params;
  const { bus_lat, bus_lng } = req.body;

  if (bus_lat === undefined || bus_lng === undefined) {
    return res.status(400).json({ message: 'bus_lat and bus_lng are required' });
  }

  try {
    const routeResult = await pool.query(
      `SELECT r.id, r.route_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', rs.id,
                    'name', rs.stop_name,
                    'latitude', rs.latitude,
                    'longitude', rs.longitude,
                    'location', rs.location,
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
      [id]
    );

    if (routeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const route = routeResult.rows[0];
    const validStops = (route.stops || []).filter(
      (stop) => stop.latitude !== null && stop.longitude !== null
    );

    if (validStops.length === 0) {
      return res.status(400).json({ message: 'Route has no coordinate-based stops yet' });
    }

    const response = await fetch(`${AI_SERVICE_URL}/route-eta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stops: validStops,
        bus_lat: Number(bus_lat),
        bus_lng: Number(bus_lng)
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        message: errorPayload.detail || 'Failed to calculate route ETA'
      });
    }

    const payload = await response.json();
    res.status(200).json({
      route_id: route.id,
      route_name: route.route_name,
      ...payload
    });
  } catch (error) {
    console.error('Route ETA error:', error.message);
    res.status(500).json({ message: 'Server error calculating ETA' });
  }
};

module.exports = {
  getRouteById,
  getAllRoutes,
  getRouteEta
};
