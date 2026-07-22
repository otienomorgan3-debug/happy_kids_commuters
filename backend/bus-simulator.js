// Bus Movement Simulator for Demo
// This script simulates buses driving along their routes
// It reads route stops from the database, interpolates positions,
// and broadcasts via Socket.IO so the map shows live movement.

const pool = require('./config/db');
const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:5000';

// Route stop coordinates from seed data
const ROUTE_STOPS = {
   1: [ // Karen Morning Route (Karen Stage pickup for all children)
     { name: 'Karen Stage', lat: -1.3197, lng: 36.7258 },
     { name: 'Sunshine School', lat: -1.3120, lng: 36.7280 },
   ],
   2: [ // Kitengela Evening Route (Kitengela Stage pickup for all children)
     { name: 'Kitengela Estate', lat: -1.4833, lng: 36.9667 },
     { name: 'Kitengela Stage', lat: -1.4750, lng: 36.9700 },
     { name: 'Sunshine School', lat: -1.3120, lng: 36.7280 },
   ],
  };

// Interpolate between two points
function interpolate(p1, p2, t) {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lng: p1.lng + (p2.lng - p1.lng) * t,
  };
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function simulateBus(socket, busId, driverId, routeId, routeName) {
  const stops = ROUTE_STOPS[routeId];
  if (!stops || stops.length < 2) {
    console.log(`  Route ${routeId} has insufficient stops, skipping`);
    return;
  }

  const STEPS_BETWEEN_STOPS = 20;  // Number of interpolated points between stops
  const INTERVAL_MS = 3000;        // Time between updates (3 seconds)

  console.log(`  Starting simulation for Bus ${busId} on "${routeName}" (${stops.length} stops)`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (let i = 0; i < stops.length - 1; i++) {
      const from = stops[i];
      const to = stops[i + 1];

      for (let step = 0; step <= STEPS_BETWEEN_STOPS; step++) {
        const t = step / STEPS_BETWEEN_STOPS;
        const pos = interpolate(from, to, t);

        const locationData = {
          bus_id: busId,
          latitude: parseFloat(pos.lat.toFixed(7)),
          longitude: parseFloat(pos.lng.toFixed(7)),
        };

        // Emit via socket for real-time updates
        socket.emit('driver:location', locationData);

        // Also update the database so REST API works too
        try {
          await pool.query(
            `INSERT INTO bus_locations (bus_id, driver_id, latitude, longitude, recorded_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (bus_id) 
             DO UPDATE SET latitude=$3, longitude=$4, recorded_at=NOW()`,
            [busId, driverId, pos.lat, pos.lng]
          );
        } catch (dbErr) {
          // Silent fail for DB updates
        }

        // Log periodically
        if (step === 0 || step === STEPS_BETWEEN_STOPS) {
          const direction = step === 0 ? '→ Departing' : '✓ Arrived at';
          console.log(`  Bus ${busId}: ${direction} ${to.name} (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`);
        }

        await sleep(INTERVAL_MS);
      }
    }

    // Reverse the route to go back (or restart from beginning)
    // For demo, we reverse to simulate round trip
    console.log(`  Bus ${busId}: Reached end of route, reversing...`);
    ROUTE_STOPS[routeId] = ROUTE_STOPS[routeId].reverse();
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   HKCS Bus Movement Simulator v1.0      ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  // Connect to the backend via Socket.IO
  console.log(`Connecting to backend at ${SOCKET_URL}...`);
  const socket = io(SOCKET_URL);

  socket.on('connect', () => {
    console.log('✓ Connected to backend Socket.IO server');
    console.log('');

    // Get active bus/route assignments from database
    pool.query(`
      SELECT b.id as bus_id, b.plate_number, d.id as driver_id, 
             d.user_id as driver_user_id, r.id as route_id, r.route_name
      FROM buses b
      JOIN drivers d ON d.bus_id = b.id
      CROSS JOIN routes r
      ORDER BY b.id, r.id
    `).then(async (result) => {
      const assignments = result.rows;
      console.log(`Found ${assignments.length} bus-route assignments:`);
      assignments.forEach(a => {
        console.log(`  Bus ${a.bus_id} (${a.plate_number}) → Route ${a.route_id} (${a.route_name})`);
      });
      console.log('');

      // Start simulations in parallel
      const simulations = assignments.map(a =>
        simulateBus(socket, a.bus_id, a.driver_user_id, a.route_id, a.route_name)
      );

      await Promise.all(simulations);
    }).catch(err => {
      console.error('Database query failed:', err.message);
      process.exit(1);
    });
  });

  socket.on('connect_error', (err) => {
    console.error('✗ Connection failed:', err.message);
    console.log('  Make sure the backend server is running on port 5000');
    process.exit(1);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});