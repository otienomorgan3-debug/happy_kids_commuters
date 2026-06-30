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

// Mock M-Pesa service
jest.mock('../services/mpesaService', () => ({
  createStkPush: jest.fn(),
  normalizePhone: jest.fn((phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('254')) return digits;
    if (digits.startsWith('0')) return `254${digits.slice(1)}`;
    return digits || '';
  })
}));

// Mock notification controller
jest.mock('../controllers/notificationController', () => ({
  createNotification: jest.fn().mockResolvedValue(true)
}));

const paymentRoutes = require('../routes/payments');
const { createStkPush } = require('../services/mpesaService');

const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);

const parentToken = jwt.sign(
  { id: 1, email: 'parent@example.com', role: 'parent' },
  process.env.JWT_SECRET || 'test_secret',
  { expiresIn: '1h' }
);

const adminToken = jwt.sign(
  { id: 2, email: 'admin@example.com', role: 'admin' },
  process.env.JWT_SECRET || 'test_secret',
  { expiresIn: '1h' }
);

const driverToken = jwt.sign(
  { id: 3, email: 'driver@example.com', role: 'driver' },
  process.env.JWT_SECRET || 'test_secret',
  { expiresIn: '1h' }
);

describe('Payment Module - M-Pesa Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for pool.query - override in specific tests
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
  });

  describe('POST /api/payments/mpesa/stkpush', () => {
    const validPaymentBody = {
      student_id: 1,
      amount: 5000,
      phone_number: '+254700000000',
      description: 'Transport fee for Term 1'
    };

    it('should initiate STK push successfully for a parent', async () => {
      // Mock parent profile lookup
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getParentIdForUser
        .mockResolvedValueOnce({                        // getStudentForParent
          rows: [{
            id: 1, name: 'Student One', parent_id: 1,
            transport_fee: 10000, outstanding_balance: 5000,
            parent_phone: '254700000000', parent_user_id: 1, parent_name: 'Parent One'
          }]
        })
        .mockResolvedValueOnce({                        // INSERT payment (pending)
          rows: [{
            id: 1, parent_id: 1, student_id: 1, amount: 5000,
            phone_number: '254700000000',
            account_reference: 'HKCS-1-1234567890',
            status: 'pending',
            balance_before: 5000
          }]
        })
        .mockResolvedValueOnce({ rows: [] });           // UPDATE payment with merchant/checkout IDs

      createStkPush.mockResolvedValue({
        MerchantRequestID: 'MERCH-123',
        CheckoutRequestID: 'CHECKOUT-123',
        CustomerMessage: 'Success. Request accepted for processing'
      });

      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(validPaymentBody);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('payment');
      expect(res.body.payment.amount).toBe(5000);
      expect(res.body).toHaveProperty('stk_response');
      expect(res.body.stk_response.MerchantRequestID).toBe('MERCH-123');
    });

    it('should fail when student_id is missing', async () => {
      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ amount: 5000 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/student_id is required/i);
    });

    it('should fail when parent profile does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // getParentIdForUser returns null

      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(validPaymentBody);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/parent profile not found/i);
    });

    it('should fail when student does not belong to parent', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] }); // getStudentForParent returns null

      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(validPaymentBody);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/student not found for this parent/i);
    });

    it('should fail with zero or negative amount', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Student One', parent_id: 1, transport_fee: 0, outstanding_balance: 0, parent_phone: '254700000000', parent_user_id: 1, parent_name: 'Parent One' }]
        });

      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${parentToken}`)
        .send({ ...validPaymentBody, amount: 0 });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no transport fee is configured/i);
    });

    it('should fail without authentication', async () => {
      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .send(validPaymentBody);

      expect(res.status).toBe(401);
    });

    it('should reject non-parent roles (driver)', async () => {
      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${driverToken}`)
        .send(validPaymentBody);

      expect(res.status).toBe(403);
    });

    it('should handle M-Pesa STK push failure gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, name: 'Student One', parent_id: 1, transport_fee: 10000, outstanding_balance: 5000, parent_phone: '254700000000', parent_user_id: 1, parent_name: 'Parent One' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1, parent_id: 1, student_id: 1, amount: 5000, phone_number: '254700000000', account_reference: 'HKCS-1-123', status: 'pending', balance_before: 5000 }]
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE payment to failed

      createStkPush.mockRejectedValue(new Error('M-Pesa service unavailable'));

      const res = await request(app)
        .post('/api/payments/mpesa/stkpush')
        .set('Authorization', `Bearer ${parentToken}`)
        .send(validPaymentBody);

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/M-Pesa service unavailable/i);
    });
  });

  describe('POST /api/payments/mpesa/callback', () => {
    const successfulCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MERCH-123',
          CheckoutRequestID: 'CHECKOUT-123',
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'MpesaReceiptNumber', Value: 'MPESA123' },
              { Name: 'TransactionDate', Value: 20260630120000 },
              { Name: 'Amount', Value: 5000 }
            ]
          }
        }
      }
    };

    const failedCallback = {
      Body: {
        stkCallback: {
          MerchantRequestID: 'MERCH-456',
          CheckoutRequestID: 'CHECKOUT-456',
          ResultCode: 1,
          ResultDesc: 'The balance is insufficient for the transaction.',
          CallbackMetadata: { Item: [] }
        }
      }
    };

    it('should process successful payment callback', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.query
        .mockResolvedValueOnce({                     // Find payment by checkout_request_id
          rows: [{
            id: 1, student_id: 1, amount: 5000, status: 'pending',
            balance_before: 5000, outstanding_balance: 5000, transport_fee: 10000,
            parent_user_id: 1, student_name: 'Student One',
            phone_number: '254700000000'
          }]
        });

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(successfulCallback);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/processed successfully/i);

      // Verify transaction: BEGIN -> UPDATE payments -> UPDATE students -> COMMIT
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE payments/i),
        expect.arrayContaining(['MPESA123', 0, 'CHECKOUT-123'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE students/i),
        expect.arrayContaining([0, 1])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should process failed payment callback', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 2, student_id: 2, amount: 5000, status: 'pending',
            balance_before: 5000, outstanding_balance: 5000, transport_fee: 10000,
            parent_user_id: 1, student_name: 'Student Two',
            phone_number: '254700000000'
          }]
        });

      const res = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(failedCallback);

      expect(res.status).toBe(200);
      // Verify payment status updated to 'failed'
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE payments\s+SET status\s*=\s*'failed'/i),
        expect.any(Array)
      );
    });

    it('should handle duplicate callback (already paid)', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, student_id: 1, amount: 5000, status: 'paid',
            balance_before: 5000, outstanding_balance: 0, transport_fee: 10000,
            parent_user_id: 1, student_name: 'Student One',
            phone_number: '254700000000'
          }]
        });

      const res = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(successfulCallback);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/already processed/i);
    });

    it('should reject invalid callback payload', async () => {
      const res = await request(app)
        .post('/api/payments/mpesa/callback')
        .send({ invalid: 'payload' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid callback payload/i);
    });

    it('should handle payment record not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(successfulCallback);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/payment record not found/i);
    });

    it('should handle transaction rollback on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1, student_id: 1, amount: 5000, status: 'pending',
            balance_before: 5000, outstanding_balance: 5000, transport_fee: 10000,
            parent_user_id: 1, student_name: 'Student One',
            phone_number: '254700000000'
          }]
        });

      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.query
        .mockResolvedValueOnce()  // BEGIN
        .mockRejectedValueOnce(new Error('DB update failed'));  // UPDATE payments fails

      const res = await request(app)
        .post('/api/payments/mpesa/callback')
        .send(successfulCallback);

      expect(res.status).toBe(500);
      // ROLLBACK should have been attempted
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('GET /api/payments/history', () => {
    it('should return payment history for authenticated parent', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getParentIdForUser
        .mockResolvedValueOnce({                       // payment history query
          rows: [
            { id: 1, amount: 5000, status: 'paid', mpesa_receipt: 'MPESA123', student_name: 'Student One', created_at: new Date() },
            { id: 2, amount: 3000, status: 'pending', student_name: 'Student One', created_at: new Date() }
          ]
        });

      const res = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(2);
      expect(res.body.payments[0].status).toBe('paid');
      expect(res.body.payments[1].status).toBe('pending');
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/payments/history');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/payments/summary', () => {
    it('should return payment summary with student balances', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getParentIdForUser
        .mockResolvedValueOnce({                       // students
          rows: [
            { id: 1, name: 'Student One', transport_fee: 10000, outstanding_balance: 5000, last_payment_at: null },
            { id: 2, name: 'Student Two', transport_fee: 8000, outstanding_balance: 2000, last_payment_at: null }
          ]
        })
        .mockResolvedValueOnce({                       // payment stats
          rows: [{ paid_count: 3, pending_count: 1, total_paid: 15000 }]
        });

      const res = await request(app)
        .get('/api/payments/summary')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.students).toHaveLength(2);
      expect(res.body.summary.total_outstanding).toBe(7000); // 5000 + 2000
      expect(res.body.summary.paid_count).toBe(3);
      expect(res.body.summary.total_paid).toBe(15000);
    });
  });

  describe('GET /api/payments/receipts/:id', () => {
    it('should return a receipt for a valid payment', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getParentIdForUser
        .mockResolvedValueOnce({                       // receipt query
          rows: [{
            id: 1, amount: 5000, status: 'paid', mpesa_receipt: 'MPESA123',
            student_name: 'Student One', parent_name: 'Parent One',
            transaction_date: '2026-06-30 12:00:00'
          }]
        });

      const res = await request(app)
        .get('/api/payments/receipts/1')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.receipt.mpesa_receipt).toBe('MPESA123');
      expect(res.body.receipt.amount).toBe(5000);
    });

    it('should return 404 for non-existent receipt', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/receipts/999')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/receipt not found/i);
    });
  });

  describe('Admin Payment Endpoints', () => {
    it('GET /api/payments/admin/payments - should list all payments for admin', async () => {
      mockPool.query
        .mockResolvedValueOnce({                       // getAllPayments
          rows: [
            { id: 1, amount: 5000, status: 'paid', student_name: 'Student One', parent_name: 'Parent One' },
            { id: 2, amount: 3000, status: 'pending', student_name: 'Student Two', parent_name: 'Parent Two' }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ total: 2 }] }); // count query

      const res = await request(app)
        .get('/api/payments/admin/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.payments).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('GET /api/payments/admin/payments - should reject non-admin users', async () => {
      const res = await request(app)
        .get('/api/payments/admin/payments')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/payments/admin/payments/stats - should return payment stats', async () => {
      mockPool.query
        .mockResolvedValueOnce({                       // stats query
          rows: [{
            total_payments: 10, paid_count: 7, pending_count: 2, failed_count: 1,
            total_revenue: 35000, pending_amount: 10000, failed_amount: 5000
          }]
        })
        .mockResolvedValueOnce({                       // recent payments
          rows: [{ id: 1, amount: 5000, status: 'paid', student_name: 'Student One', parent_name: 'Parent One' }]
        });

      const res = await request(app)
        .get('/api/payments/admin/payments/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.totalPayments).toBe(10);
      expect(res.body.stats.totalRevenue).toBe(35000);
      expect(res.body.stats.paidCount).toBe(7);
      expect(res.body.recentPayments).toHaveLength(1);
    });

    it('GET /api/payments/admin/payments/stats - should filter by date', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total_payments: 5, paid_count: 3, pending_count: 1, failed_count: 1, total_revenue: 15000, pending_amount: 5000, failed_amount: 2000 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/admin/payments/stats?startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });
});