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

jest.mock('../models/User', () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/Parent', () => ({
  create: jest.fn()
}));

const authRoutes = require('../routes/auth');
const { protect } = require('../middleware/authMiddleware');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new parent user', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700000000',
        role: 'parent',
        password_hash: 'hashed_password'
      };

      const User = require('../models/User');
      const Parent = require('../models/Parent');
      
      User.findByEmail.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);
      Parent.create.mockResolvedValue({ id: 1, user_id: 1 });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+254700000000',
          password: 'password123',
          role: 'parent'
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.name).toBe('John Doe');
      expect(res.body.email).toBe('john@example.com');
    });

    it('should reject duplicate email', async () => {
      const User = require('../models/User');
      User.findByEmail.mockResolvedValue({ id: 1, email: 'john@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+254700000000',
          password: 'password123',
          role: 'parent'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject invalid role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+254700000000',
          password: 'password123',
          role: 'invalid_role'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid role/i);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+254700000000',
        role: 'parent',
        password_hash: '$2a$10$hashed_password'
      };

      const User = require('../models/User');
      User.findByEmail.mockResolvedValue(mockUser);

      // Mock bcrypt comparison
      jest.mock('bcryptjs', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('john@example.com');
    });

    it('should reject invalid email', async () => {
      const User = require('../models/User');
      User.findByEmail.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/password required/i);
    });
  });
});

describe('Authentication Middleware', () => {
  it('should reject requests without token', () => {
    const req = {
      headers: {}
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided, access denied' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject requests with invalid token', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid_token'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept valid token', () => {
    const validToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'parent' },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );

    const req = {
      headers: {
        authorization: `Bearer ${validToken}`
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
  });
});