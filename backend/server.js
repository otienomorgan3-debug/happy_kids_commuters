const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const routeRoutes = require('./routes/routes');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const advancedFeaturesRoutes = require('./routes/advancedFeatures');
const parentActionsRoutes = require('./routes/parentActions');
const { apiLimiter, authLimiter, paymentLimiter, securityHeaders, sanitizeInput } = require('./middleware/security');
const {
  setIO,
  setConnectedUsers,
  setUserSockets,
  addUserSocket,
  removeUserSocket,
  isUserOnline
} = require('./services/socketService');
require('./config/db');
const pool = require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Store connected users with their socket IDs
const connectedUsers = {};
const userSockets = {};
setIO(io);
setConnectedUsers(connectedUsers);
setUserSockets(userSockets);

// Security middleware
app.use(securityHeaders);
app.use(sanitizeInput);
app.use(cors());
app.use(express.json());

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/payments', paymentLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/advanced', advancedFeaturesRoutes);
app.use('/api/parent', parentActionsRoutes);
app.get('/', (req, res) => res.json({ status: 'HKCS API running' }));

// Real-time GPS tracking via Socket.IO
io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  // User registers their socket (call this on app login)
  socket.on('user:register', (data) => {
    const userId = String(data.user_id);
    if (!userId) return;

    const wasOffline = addUserSocket(userId, socket.id);
    socket.data.userId = userId;
    socket.join(`user:${userId}`);
    console.log(`User ${userId} registered with socket ${socket.id}`);

    if (wasOffline) {
      io.emit('user:online', { user_id: userId, online: true });
    }
  });

  // Driver joins their bus room
  socket.on('driver:join', (data) => {
    socket.join(`bus_${data.bus_id}`);
    console.log(`Driver joined room: bus_${data.bus_id}`);
  });

  // Driver sends GPS update
  socket.on('driver:location', async (data) => {
    const { bus_id, latitude, longitude } = data;
    console.log(`Bus ${bus_id} location: ${latitude}, ${longitude}`);
    const payload = {
      bus_id,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    };

    // Emit to the specific bus room (for subscribed clients)
    io.to(`bus_${bus_id}`).emit('bus:location', payload);
    // Also emit globally as a fallback so dashboards that are not
    // joined to the room receive updates (helps admin dashboard)
    io.emit('bus:location', payload);

    // Persist latest location to DB so HTTP callers can fetch initial state
    try {
      // Try to map socket user -> drivers.id if available
      const userId = socket.data.userId ? Number(socket.data.userId) : null;
      let driverId = null;
      if (userId) {
        const drv = await pool.query('SELECT id FROM drivers WHERE user_id = $1', [userId]);
        if (drv.rows[0]) driverId = drv.rows[0].id;
      }

      await pool.query(
        `INSERT INTO bus_locations (bus_id, driver_id, latitude, longitude, recorded_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (bus_id) DO UPDATE SET latitude = $3, longitude = $4, recorded_at = NOW()`,
        [bus_id, driverId, latitude, longitude]
      );
    } catch (err) {
      console.error('Failed to persist bus location from socket:', err.message || err);
    }
  });

  // Parent watches a bus
  socket.on('parent:watch', (data) => {
    socket.join(`bus_${data.bus_id}`);
    console.log(`Parent watching bus_${data.bus_id}`);
  });

  // Driver cancels SOS
  socket.on('driver:sos_cancel', (data) => {
    console.log('SOS CANCELLED for bus:', data.bus_id);
    io.emit('emergency:cancelled', {
      bus_id: data.bus_id,
      driver_name: data.driver_name,
      message: 'Emergency resolved - SOS cancelled',
      timestamp: new Date().toISOString()
    });
  });

  // Chat messages are written through the authenticated HTTP API before being
  // broadcast. Keep this event as a no-op for older clients; never relay an
  // unsaved client payload.
  socket.on('chat:send', (data) => {
    socket.emit('chat:error', { message: 'Send messages through the API so they are saved.' });
  });

  // Mark messages as read in real-time
  socket.on('chat:mark_read', (data) => {
    const { other_user_id } = data;
    const userId = userSockets[socket.id];
    if (userId && other_user_id) {
      io.to(`user:${other_user_id}`).emit('chat:read', {
        read_by: userId,
        other_user_id,
      });
    }
  });

  // User typing indicator
  socket.on('chat:typing', (data) => {
    const { receiver_id, is_typing } = data;
    const userId = userSockets[socket.id];
    if (receiver_id && userId) {
      io.to(`user:${receiver_id}`).emit('chat:typing', {
        user_id: userId,
        is_typing,
      });
    }
  });

  // Driver SOS emergency alert
  socket.on('driver:sos', (data) => {
    console.log('SOS ALERT from bus:', data.bus_id);
    io.emit('emergency:alert', {
      bus_id: data.bus_id,
      latitude: data.latitude,
      longitude: data.longitude,
      message: 'EMERGENCY - Driver needs help!',
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const userId = removeUserSocket(socket.id) || socket.data.userId;
    console.log('Device disconnected:', socket.id);

    // Notify that user is offline
    if (userId && !isUserOnline(userId)) {
      io.emit('user:online', { user_id: userId, online: false });
    }
  });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
