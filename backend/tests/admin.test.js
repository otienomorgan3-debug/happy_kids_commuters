const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Mock database
const mockPool = {
  query: jest.fn(),
  connect: jest.fn()
};

jest.mock('../config/db', () => mockPool);

// Mock axios for AI service calls (used in route optimization)
jest.mock('axios', () => ({
  post: jest.fn().mockRejectedValue(new Error('AI service not available')) // Fallback behavior
}));

// Mock bcryptjs for driver creation
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashed_password')
}));

const adminRoutes = require('../routes/admin');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

const adminToken = jwt.sign(
  { id: 1, email: 'admin@example.com', role: 'admin' },
  process.env.JWT_SECRET || 'test_secret',
  { expiresIn: '1h' }
);

const parentToken = jwt.sign(
  { id: 2, email: 'parent@example.com', role: 'parent' },
  process.env.JWT_SECRET || 'test_secret',
  { expiresIn: '1h' }
);

describe('Admin Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
  });

  describe('GET /api/admin/stats - Dashboard Stats', () => {
    it('should return aggregated dashboard statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '150' }] })    // students
        .mockResolvedValueOnce({ rows: [{ count: '25' }] })     // drivers
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })     // buses
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })      // active trips
        .mockResolvedValueOnce({ rows: [{ total: '500000' }] }) // revenue
        .mockResolvedValueOnce({ rows: [{ total: '75000' }] }); // outstanding

      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.total_students).toBe(150);
      expect(res.body.stats.total_drivers).toBe(25);
      expect(res.body.stats.total_buses).toBe(20);
      expect(res.body.stats.active_trips).toBe(5);
      expect(res.body.stats.total_revenue).toBe(500000);
      expect(res.body.stats.total_outstanding).toBe(75000);
    });

    it('should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/admin/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/analytics', () => {
    it('should return analytics data with all four sections', async () => {
      mockPool.query
        .mockResolvedValueOnce({                                    // weekly trips
          rows: [
            { date: '2026-06-23', trip_count: 12 },
            { date: '2026-06-24', trip_count: 15 }
          ]
        })
        .mockResolvedValueOnce({                                    // attendance rates
          rows: [
            { name: 'Student A', days_present: 5, total_days: 5 },
            { name: 'Student B', days_present: 4, total_days: 5 }
          ]
        })
        .mockResolvedValueOnce({                                    // monthly payments
          rows: [
            { month: '2026-06-01', transaction_count: 30, total_amount: 150000 }
          ]
        })
        .mockResolvedValueOnce({                                    // bus utilization
          rows: [
            { plate_number: 'KCA 001A', trip_count: 45 },
            { plate_number: 'KCA 002B', trip_count: 38 }
          ]
        });

      const res = await request(app)
        .get('/api/admin/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('weekly_trips');
      expect(res.body).toHaveProperty('attendance_rates');
      expect(res.body).toHaveProperty('monthly_payments');
      expect(res.body).toHaveProperty('bus_utilization');
      expect(res.body.weekly_trips).toHaveLength(2);
    });
  });

  describe('Bus CRUD', () => {
    it('POST /api/admin/buses - should create a new bus', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })                     // SELECT existing check (no duplicate)
        .mockResolvedValueOnce({                                  // INSERT
          rows: [{ id: 1, plate_number: 'KCA 001A', capacity: 40, driver_id: null }]
        });

      const res = await request(app)
        .post('/api/admin/buses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          plate_number: 'KCA 001A',
          capacity: 40
        });

      expect(res.status).toBe(201);
      expect(res.body.bus.plate_number).toBe('KCA 001A');
    });

    it('GET /api/admin/buses - should list all buses', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, plate_number: 'KCA 001A', capacity: 40, driver_name: 'John Doe' },
            { id: 2, plate_number: 'KCA 002B', capacity: 30 }
          ]
        });

      const res = await request(app)
        .get('/api/admin/buses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.buses).toHaveLength(2);
    });

    it('DELETE /api/admin/buses/:id - should delete a bus', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/admin/buses/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  describe('Driver Management', () => {
    it('GET /api/admin/drivers - should list all drivers', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'Driver One', email: 'driver1@example.com', assigned_bus: 'KCA 001A' },
            { id: 2, name: 'Driver Two', email: 'driver2@example.com', assigned_bus: null }
          ]
        });

      const res = await request(app)
        .get('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.drivers).toHaveLength(2);
    });

    it('POST /api/admin/drivers - should create a new driver', async () => {
      // addDriver requires: name, email, phone, license_number (NOT bus_id)
      // It does NOT use transactions - direct queries + bcrypt
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })                     // existing user check (no duplicate)
        .mockResolvedValueOnce({ rows: [] })                     // existing license check (no duplicate)
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })            // INSERT users
        .mockResolvedValueOnce({                                  // INSERT drivers
          rows: [{ id: 1, user_id: 1, license_number: 'LIC123' }]
        });

      const res = await request(app)
        .post('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Driver',
          email: 'newdriver@example.com',
          phone: '+254700000000',
          license_number: 'LIC123'
        });

      expect(res.status).toBe(201);
      expect(res.body.driver.name).toBe('New Driver');
      expect(res.body.driver.default_password).toBe('driver123');
    });

    it('POST /api/admin/drivers/assign - should assign driver to bus', async () => {
      // assignDriverToBus checks: bus exists, no other driver on this bus, then UPDATE
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })             // bus check (exists)
        .mockResolvedValueOnce({ rows: [] })                       // existing driver on bus check (none)
        .mockResolvedValueOnce({                                   // UPDATE driver
          rows: [{ id: 1, bus_id: 1 }]
        });

      const res = await request(app)
        .post('/api/admin/drivers/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ driver_id: 1, bus_id: 1 });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/assigned/i);
    });
  });

  describe('Route Management', () => {
    it('POST /api/admin/routes - should create a route with stops', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce()                                // BEGIN
        .mockResolvedValueOnce({                                // INSERT route
          rows: [{ id: 1, route_name: 'Route A', estimated_time: 45 }]
        })
        .mockResolvedValueOnce({ rows: [] })                     // DELETE old stops
        .mockResolvedValueOnce({ rows: [] })                     // INSERT stop 1
        .mockResolvedValueOnce({ rows: [] })                     // INSERT stop 2
        .mockResolvedValueOnce({ rows: [] });                    // COMMIT

      // formatRouteResponse runs after COMMIT and uses pool.query()
      // It's the first call to mockPool.query in this test
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, route_name: 'Route A', estimated_time: 45,
            stops: [
              { id: 1, stop_name: 'Stop One', location: null, latitude: -1.2921, longitude: 36.8219, stop_order: 1 },
              { id: 2, stop_name: 'Stop Two', location: null, latitude: -1.2922, longitude: 36.8220, stop_order: 2 }
            ]
          }]
        });

      const res = await request(app)
        .post('/api/admin/routes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          route_name: 'Route A',
          estimated_time: 45,
          stops: [
            { stop_name: 'Stop One', latitude: -1.2921, longitude: 36.8219, stop_order: 1 },
            { stop_name: 'Stop Two', latitude: -1.2922, longitude: 36.8220, stop_order: 2 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.route.route_name).toBe('Route A');
    });

    it('GET /api/admin/routes - should list all routes with stops', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, route_name: 'Route A', estimated_time: 45, stops: [] },
            { id: 2, route_name: 'Route B', estimated_time: 30, stops: [] }
          ]
        });

      const res = await request(app)
        .get('/api/admin/routes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.routes).toHaveLength(2);
    });

    it('DELETE /api/admin/routes/:id - should delete a route', async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] });

      const res = await request(app)
        .delete('/api/admin/routes/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted/i);
    });
  });

  describe('Parent Management', () => {
    it('GET /api/admin/parents - should list all parents', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, name: 'Parent One', email: 'parent1@example.com', children_count: 2, total_outstanding: 10000, payments_count: 5 },
            { id: 2, name: 'Parent Two', email: 'parent2@example.com', children_count: 1, total_outstanding: 5000, payments_count: 3 }
          ]
        });

      const res = await request(app)
        .get('/api/admin/parents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.parents).toHaveLength(2);
    });

    it('GET /api/admin/parents/:id - should get parent details with children and payments', async () => {
      mockPool.query
        .mockResolvedValueOnce({                                // parent info (by user_id, PARAM is :id from URL)
          rows: [{ id: 1, name: 'Parent One', email: 'parent1@example.com', phone: '+254700000000' }]
        })
        .mockResolvedValueOnce({                                // children
          rows: [
            { id: 1, name: 'Child One', transport_fee: 10000, outstanding_balance: 5000, school_name: null },
            { id: 2, name: 'Child Two', transport_fee: 10000, outstanding_balance: 0, school_name: null }
          ]
        })
        .mockResolvedValueOnce({                                // recent payments
          rows: [
            { id: 1, amount: 5000, status: 'paid', created_at: new Date() }
          ]
        });

      const res = await request(app)
        .get('/api/admin/parents/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.parent.name).toBe('Parent One');
      expect(res.body.students).toHaveLength(2);
      expect(res.body.payments).toHaveLength(1);
    });
  });

  describe('Incident Management', () => {
    it('GET /api/admin/incidents - should list all incidents', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, plate_number: 'KCA 001A', driver_name: 'Driver One', status: 'active', created_at: new Date() },
            { id: 2, plate_number: 'KCA 002B', driver_name: 'Driver Two', status: 'resolved', created_at: new Date() }
          ]
        });

      const res = await request(app)
        .get('/api/admin/incidents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.incidents).toHaveLength(2);
    });

    it('GET /api/admin/incidents/stats - should return incident statistics', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: 10, active: 2, resolved: 7, pending: 1, this_week: 3 }]
        });

      const res = await request(app)
        .get('/api/admin/incidents/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.total).toBe(10);
      expect(res.body.stats.active).toBe(2);
    });

    it('PUT /api/admin/incidents/:id/status - should update incident status', async () => {
      // updateIncidentStatus only runs UPDATE and returns { message }, no SELECT
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .put('/api/admin/incidents/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved' });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/updated/i);
    });
  });

  describe('Financial Reports', () => {
    it('GET /api/admin/financial-report - should return financial report', async () => {
      // getFinancialReport returns { summary, outstanding, daily_breakdown } 
      // It always runs 3 queries: summary, outstanding, daily_breakdown
      mockPool.query
        .mockResolvedValueOnce({                                // summary
          rows: [{
            paid_transactions: 50, pending_transactions: 10, failed_transactions: 2,
            collected_revenue: 500000, pending_revenue: 50000
          }]
        })
        .mockResolvedValueOnce({                                // outstanding
          rows: [{ total_outstanding: 80000, parents_with_debt: 15 }]
        })
        .mockResolvedValueOnce({                                // daily_breakdown
          rows: [
            { date: '2026-06-29', paid_amount: 15000, pending_amount: 5000 },
            { date: '2026-06-30', paid_amount: 20000, pending_amount: 3000 }
          ]
        });

      const res = await request(app)
        .get('/api/admin/financial-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.collected_revenue).toBe(500000);
      expect(res.body.daily_breakdown).toHaveLength(2);
    });
  });

  describe('Reports', () => {
    it('GET /api/admin/reports/attendance - should return attendance report', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { student_name: 'Student A', parent_name: 'Parent A', parent_phone: '+254700000001', boarded_at: new Date(), dropped_at: null, bus: 'KCA 001A', status: 'on bus' },
            { student_name: 'Student B', parent_name: 'Parent B', parent_phone: '+254700000002', boarded_at: null, dropped_at: null, bus: null, status: 'absent' }
          ]
        });

      const res = await request(app)
        .get('/api/admin/reports/attendance')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.report).toHaveLength(2);
    });

    it('GET /api/admin/reports/trips - should return trip report', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { trip_id: 1, route_name: 'Route A', driver_name: 'Driver One', plate_number: 'KCA 001A', status: 'completed', students_transported: 20, start_time: new Date() }
          ]
        });

      const res = await request(app)
        .get('/api/admin/reports/trips')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.trips).toHaveLength(1);
    });
  });

  describe('School Management', () => {
    it('POST /api/admin/schools - should create a new school', async () => {
      // addSchool uses field: school_name (NOT 'name')
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, school_name: 'Test School', address: 'Nairobi' }]
        });

      const res = await request(app)
        .post('/api/admin/schools')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          school_name: 'Test School',
          address: 'Nairobi'
        });

      expect(res.status).toBe(201);
      expect(res.body.school.school_name).toBe('Test School');
    });

    it('GET /api/admin/schools - should list all schools', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { id: 1, school_name: 'School A', address: 'Nairobi' },
            { id: 2, school_name: 'School B', address: 'Mombasa' }
          ]
        });

      const res = await request(app)
        .get('/api/admin/schools')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.schools).toHaveLength(2);
    });
  });
});