const pool = require('../config/db');

// Driver updates their GPS location (REST backup)
const updateLocation = async (req, res) => {
  const { bus_id, latitude, longitude } = req.body;
  const driver_id = req.user.id;

  try {
    if (!bus_id || !latitude || !longitude) {
      return res.status(400).json({ message: 'bus_id, latitude and longitude are required' });
    }

    // Store latest location in DB
    await pool.query(
      `INSERT INTO bus_locations (bus_id, driver_id, latitude, longitude, recorded_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (bus_id) 
       DO UPDATE SET latitude=$3, longitude=$4, recorded_at=NOW()`,
      [bus_id, driver_id, latitude, longitude]
    );

    res.status(200).json({ message: 'Location updated successfully' });

  } catch (error) {
    console.error('Update location error:', error.message);
    res.status(500).json({ message: 'Server error updating location' });
  }
};

// Get live location of a specific bus
const getBusLocation = async (req, res) => {
  const { bus_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT bus_id, latitude, longitude, recorded_at 
       FROM bus_locations WHERE bus_id = $1`,
      [bus_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'No location found for this bus' });
    }

    res.status(200).json({ location: result.rows[0] });

  } catch (error) {
    console.error('Get location error:', error.message);
    res.status(500).json({ message: 'Server error getting location' });
  }
};

// Get all active buses locations (for admin dashboard)
const getAllBusLocations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bl.bus_id, bl.latitude, bl.longitude, bl.recorded_at,
              b.plate_number, u.name as driver_name
       FROM bus_locations bl
       JOIN buses b ON bl.bus_id = b.id
       JOIN drivers d ON bl.driver_id = d.user_id
       JOIN users u ON d.user_id = u.id
       WHERE bl.recorded_at > NOW() - INTERVAL '1 hour'`
    );

    res.status(200).json({ buses: result.rows });

  } catch (error) {
    console.error('Get all locations error:', error.message);
    res.status(500).json({ message: 'Server error getting all locations' });
  }
};

module.exports = { updateLocation, getBusLocation, getAllBusLocations };