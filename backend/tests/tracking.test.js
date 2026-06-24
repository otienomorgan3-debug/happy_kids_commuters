const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Mock database and models
jest.mock('../config/db', () => ({
  authenticate: jest.fn(),
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    sync: jest.fn()
  }
}));

jest.mock('../models/Trip', () => ({
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
}));

jest.mock('../models/Attendance', () => ({
  create: jest.fn(),
  findByPk: jest.fn()
}));

const trackingRoutes = require('../routes/tracking');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const app = express();
app.use(express.json());
app.use('/api/tracking', trackingRoutes);

describe('Tracking Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/tracking/start-trip', () => {
    it('should start a trip for a driver', async () => {
      const mockDriver = {
        id: 1,
        user_id: 1,
        bus_id: 1
      };

      const mockTrip = {
        id: 1,
        bus_id: 1,
        route_id: 1,
        driver_id: 1,
        status: 'active'
      };

      const Trip = require('../models/Trip');
      Trip.create.mockResolvedValue(mockTrip);

      const token = jwt.sign(
        { id: 1, email: 'driver@example.com', role: 'driver' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/start-trip')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bus_id: 1,
          route_id: 1
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('active');
    });

    it('should reject without authentication', async () => {
      const res = await request(app)
        .post('/api/tracking/start-trip')
        .send({
          bus_id: 1,
          route_id: 1
        });

      expect(res.status).toBe(401);
    });

    it('should reject non-driver users', async () => {
      const token = jwt.sign(
        { id: 1, email: 'parent@example.com', role: 'parent' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/start-trip')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bus_id: 1,
          route_id: 1
        });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/tracking/end-trip', () => {
    it('should end an active trip', async () => {
      const mockTrip = {
        id: 1,
        bus_id: 1,
        route_id: 1,
        driver_id: 1,
        status: 'active',
        update: jest.fn().mockResolvedValue(true)
      };

      const Trip = require('../models/Trip');
      Trip.findByPk.mockResolvedValue(mockTrip);

      const token = jwt.sign(
        { id: 1, email: 'driver@example.com', role: 'driver' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/end-trip')
        .set('Authorization', `Bearer ${token}`)
        .send({ trip_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/ended successfully/i);
    });

    it('should reject ending non-active trip', async () => {
      const mockTrip = {
        id: 1,
        status: 'completed',
        update: jest.fn()
      };

      const Trip = require('../models/Trip');
      Trip.findByPk.mockResolvedValue(mockTrip);

      const token = jwt.sign(
        { id: 1, email: 'driver@example.com', role: 'driver' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/end-trip')
        .set('Authorization', `Bearer ${token}`)
        .send({ trip_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/not active/i);
    });
  });

  describe('POST /api/tracking/attendance', () => {
    it('should mark student as boarded', async () => {
      const mockAttendance = {
        id: 1,
        student_id: 1,
        trip_id: 1,
        boarded_at: new Date()
      };

      const Attendance = require('../models/Attendance');
      Attendance.create.mockResolvedValue(mockAttendance);

      const token = jwt.sign(
        { id: 1, email: 'driver@example.com', role: 'driver' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/attendance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          student_id: 1,
          trip_id: 1,
          action: 'board'
        });

      expect(res.status).toBe(201);
      expect(res.body.student_id).toBe(1);
    });

    it('should mark student as dropped', async () => {
      const mockAttendance = {
        id: 1,
        student_id: 1,
        trip_id: 1,
        boarded_at: new Date(),
        dropped_at: new Date()
      };

      const Attendance = require('../models/Attendance');
      Attendance.findByPk.mockResolvedValue(mockAttendance);
      mockAttendance.update = jest.fn().mockResolvedValue(mockAttendance);

      const token = jwt.sign(
        { id: 1, email: 'driver@example.com', role: 'driver' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/attendance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          student_id: 1,
          trip_id: 1,
          action: 'drop'
        });

      expect(res.status).toBe(200);
    });

    it('should reject invalid action', async () => {
      const token = jwt.sign(
        { id: 1, email: 'driver@example.com', role: 'driver' },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/tracking/attendance')
        .set('Authorization', `Bearer ${token}`)
        .send({
          student_id: 1,
          trip_id: 1,
          action: 'invalid'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid action/i);
    });
  });
});