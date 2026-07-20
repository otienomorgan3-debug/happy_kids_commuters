const pool = require('../config/db');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calculateRouteFuel = async (routeId) => {
  const stopsResult = await pool.query(
    'SELECT latitude, longitude FROM route_stops WHERE route_id = $1 ORDER BY stop_order',
    [routeId]
  );
  const stops = stopsResult.rows.filter(s => s.latitude !== null && s.longitude !== null);
  let distanceKm = 0;
  for (let i = 1; i < stops.length; i++) {
    distanceKm += haversine(stops[i - 1].latitude, stops[i - 1].longitude, stops[i].latitude, stops[i].longitude);
  }
  const busResult = await pool.query(
    `SELECT b.fuel_consumption_rate, b.fuel_price_per_liter
     FROM trips t JOIN buses b ON t.bus_id = b.id
     WHERE t.route_id = $1 AND t.status = 'active' LIMIT 1`,
    [routeId]
  );
  const bus = busResult.rows[0];
  if (!bus || !distanceKm) return { distance_km: 0, estimated_fuel_liters: 0, estimated_fuel_cost: 0 };
  const rate = Number(bus.fuel_consumption_rate) || 10;
  const price = Number(bus.fuel_price_per_liter) || 175;
  const liters = (distanceKm * rate) / 100;
  return {
    distance_km: Math.round(distanceKm * 100) / 100,
    estimated_fuel_liters: Math.round(liters * 100) / 100,
    estimated_fuel_cost: Math.round(liters * price * 100) / 100
  };
};

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
