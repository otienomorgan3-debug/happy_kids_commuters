const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const trackingRoutes = require('./routes/tracking');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
require('./config/db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Store connected users with their socket IDs
const connectedUsers = {};

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.get('/', (req, res) => res.json({ status: 'HKCS API running' }));

// Real-time GPS tracking via Socket.IO
io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  // User registers their socket (call this on app login)
  socket.on('user:register', (data) => {
    connectedUsers[data.user_id] = socket.id;
    console.log(`User ${data.user_id} registered with socket ${socket.id}`);
  });

  // Driver joins their bus room
  socket.on('driver:join', (data) => {
    socket.join(`bus_${data.bus_id}`);
    console.log(`Driver joined room: bus_${data.bus_id}`);
  });

  // Driver sends GPS update
  socket.on('driver:location', (data) => {
    const { bus_id, latitude, longitude } = data;
    console.log(`Bus ${bus_id} location: ${latitude}, ${longitude}`);
    io.to(`bus_${bus_id}`).emit('bus:location', {
      bus_id,
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
  });

  // Parent watches a bus
  socket.on('parent:watch', (data) => {
    socket.join(`bus_${data.bus_id}`);
    console.log(`Parent watching bus_${data.bus_id}`);
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
    Object.keys(connectedUsers).forEach(user_id => {
      if (connectedUsers[user_id] === socket.id) {
        delete connectedUsers[user_id];
      }
    });
    console.log('Device disconnected:', socket.id);
  });
});

// Export so controllers can send real-time notifications
module.exports.io = io;
module.exports.connectedUsers = connectedUsers;

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));