const express = require('express');
const router = express.Router();
const {
  initiateStkPush,
  handleMpesaCallback,
  getPaymentHistory,
  getPaymentSummary,
  getPaymentReceipt,
  getAllPayments,
  getPaymentStats,
  generateInvoices,
  sendPaymentReminders,
  processRefund,
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Parent routes
router.post('/mpesa/stkpush', protect, restrictTo('parent'), initiateStkPush);
router.post('/mpesa/callback', handleMpesaCallback);
router.get('/history', protect, restrictTo('parent'), getPaymentHistory);
router.get('/summary', protect, restrictTo('parent'), getPaymentSummary);
router.get('/receipts/:id', protect, restrictTo('parent'), getPaymentReceipt);

// Admin routes
router.get('/admin/payments', protect, restrictTo('admin', 'superadmin'), getAllPayments);
router.get('/admin/payments/stats', protect, restrictTo('admin', 'superadmin'), getPaymentStats);
router.post('/admin/invoices/generate', protect, restrictTo('admin', 'superadmin'), generateInvoices);
router.post('/admin/reminders/send', protect, restrictTo('admin', 'superadmin'), sendPaymentReminders);
router.post('/admin/refund', protect, restrictTo('admin', 'superadmin'), processRefund);

module.exports = router;
