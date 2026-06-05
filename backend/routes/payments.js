const express = require('express');
const router = express.Router();
const {
  initiateStkPush,
  handleMpesaCallback,
  getPaymentHistory,
  getPaymentSummary,
  getPaymentReceipt,
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.post('/mpesa/stkpush', protect, restrictTo('parent'), initiateStkPush);
router.post('/mpesa/callback', handleMpesaCallback);
router.get('/history', protect, restrictTo('parent'), getPaymentHistory);
router.get('/summary', protect, restrictTo('parent'), getPaymentSummary);
router.get('/receipts/:id', protect, restrictTo('parent'), getPaymentReceipt);

module.exports = router;
