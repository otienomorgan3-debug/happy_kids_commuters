const pool = require('../config/db');
const { createStkPush, normalizePhone } = require('../services/mpesaService');
const { createNotification } = require('./notificationController');

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const getParentIdForUser = async (userId) => {
  const parentResult = await pool.query('SELECT id FROM parents WHERE user_id = $1', [userId]);
  return parentResult.rows[0]?.id || null;
};

const getStudentForParent = async (studentId, parentId) => {
  const result = await pool.query(
    `SELECT s.id, s.name, s.parent_id, s.transport_fee, s.outstanding_balance,
            u.phone as parent_phone, u.id as parent_user_id, u.name as parent_name
     FROM students s
     JOIN parents p ON s.parent_id = p.id
     JOIN users u ON p.user_id = u.id
     WHERE s.id = $1 AND p.id = $2`,
    [studentId, parentId]
  );

  return result.rows[0] || null;
};

const initiateStkPush = async (req, res) => {
  const { student_id, amount, phone_number, description } = req.body;
  const userId = req.user.id;

  try {
    if (!student_id) {
      return res.status(400).json({ message: 'student_id is required' });
    }

    const parentId = await getParentIdForUser(userId);
    if (!parentId) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const student = await getStudentForParent(student_id, parentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found for this parent' });
    }

    const requestedAmount = amount !== undefined && amount !== null ? roundMoney(amount) : null;
    const dueAmount = roundMoney(student.outstanding_balance || student.transport_fee || 0);
    const paymentAmount = requestedAmount || dueAmount;

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        message: 'No transport fee is configured for this child yet',
      });
    }

    const paymentPhone = normalizePhone(phone_number || student.parent_phone);
    if (!paymentPhone) {
      return res.status(400).json({ message: 'A valid parent phone number is required' });
    }

    const accountReference = `HKCS-${student.id}-${Date.now()}`;
    const transactionDesc = description || `Transport fee for ${student.name}`;

    const pendingPayment = await pool.query(
      `INSERT INTO payments (
         parent_id, student_id, amount, phone_number, account_reference,
         status, balance_before
       )
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [parentId, student.id, paymentAmount, paymentPhone, accountReference, dueAmount]
    );

    let stkResponse;
    try {
      stkResponse = await createStkPush({
        amount: paymentAmount,
        phoneNumber: paymentPhone,
        accountReference,
        transactionDesc,
      });
    } catch (stkError) {
      await pool.query(
        `UPDATE payments
         SET status = 'failed',
             result_desc = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [stkError.response?.data?.errorMessage || stkError.message, pendingPayment.rows[0].id]
      );
      throw stkError;
    }

    await pool.query(
      `UPDATE payments
       SET merchant_request_id = $1,
           checkout_request_id = $2
       WHERE id = $3`,
      [stkResponse.MerchantRequestID, stkResponse.CheckoutRequestID, pendingPayment.rows[0].id]
    );

    return res.status(200).json({
      message: stkResponse.CustomerMessage || 'STK push sent successfully',
      payment: {
        id: pendingPayment.rows[0].id,
        amount: paymentAmount,
        phone_number: paymentPhone,
        account_reference: accountReference,
        student_id: student.id,
      },
      stk_response: stkResponse,
    });
  } catch (error) {
    console.error('Initiate STK push error:', error.response?.data || error.message);
    return res.status(500).json({
      message: error.response?.data?.errorMessage || error.message || 'Server error initiating payment',
    });
  }
};

const handleMpesaCallback = async (req, res) => {
  try {
    const callback = req.body?.Body?.stkCallback;

    if (!callback) {
      return res.status(400).json({ message: 'Invalid callback payload' });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const merchantRequestId = callback.MerchantRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;
    const metadataItems = callback.CallbackMetadata?.Item || [];
    const metadata = metadataItems.reduce((acc, item) => {
      acc[item.Name] = item.Value;
      return acc;
    }, {});

    const paymentResult = await pool.query(
      `SELECT p.*, s.name as student_name, s.outstanding_balance, s.transport_fee
       FROM payments p
       LEFT JOIN students s ON p.student_id = s.id
       WHERE p.checkout_request_id = $1
       LIMIT 1`,
      [checkoutRequestId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Payment record not found for callback' });
    }

    const payment = paymentResult.rows[0];

    if (payment.status === 'paid') {
      return res.status(200).json({ message: 'Callback already processed' });
    }

    const receiptNumber = metadata.MpesaReceiptNumber || null;
    const transactionDateRaw = metadata.TransactionDate || null;
    const transactionDate = transactionDateRaw
      ? `${String(transactionDateRaw).slice(0, 4)}-${String(transactionDateRaw).slice(4, 6)}-${String(transactionDateRaw).slice(6, 8)} ${String(transactionDateRaw).slice(8, 10)}:${String(transactionDateRaw).slice(10, 12)}:${String(transactionDateRaw).slice(12, 14)}`
      : null;
    const amount = roundMoney(metadata.Amount || payment.amount);

    if (Number(resultCode) === 0) {
      const balanceBefore = roundMoney(payment.balance_before ?? payment.outstanding_balance ?? payment.transport_fee ?? amount);
      const balanceAfter = Math.max(0, roundMoney(balanceBefore - amount));

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(
          `UPDATE payments
           SET status = 'paid',
               mpesa_receipt = $1,
               result_code = $2,
               result_desc = $3,
               transaction_date = $4,
               merchant_request_id = $5,
               callback_payload = $6,
               balance_before = $7,
               balance_after = $8,
               updated_at = NOW()
           WHERE checkout_request_id = $9`,
          [
            receiptNumber,
            resultCode,
            resultDesc,
            transactionDate,
            merchantRequestId,
            req.body,
            balanceBefore,
            balanceAfter,
            checkoutRequestId,
          ]
        );

        await client.query(
          `UPDATE students
           SET outstanding_balance = $1,
               last_payment_at = NOW()
           WHERE id = $2`,
          [balanceAfter, payment.student_id]
        );

        await client.query('COMMIT');
      } catch (transactionError) {
        await client.query('ROLLBACK').catch(() => {});
        throw transactionError;
      } finally {
        client.release();
      }

      await createNotification(
        payment.parent_user_id,
        `M-Pesa payment of KES ${amount.toFixed(2)} for ${payment.student_name} was received successfully.`,
        'payment',
        payment.phone_number
      );
    } else {
      await pool.query(
        `UPDATE payments
         SET status = 'failed',
             result_code = $1,
             result_desc = $2,
             merchant_request_id = $3,
             callback_payload = $4,
             updated_at = NOW()
         WHERE checkout_request_id = $5`,
        [resultCode, resultDesc, merchantRequestId, req.body, checkoutRequestId]
      );
    }

    return res.status(200).json({ message: 'Callback processed successfully' });
  } catch (error) {
    console.error('M-Pesa callback error:', error.message);
    return res.status(500).json({ message: 'Server error processing callback' });
  }
};

const getPaymentHistory = async (req, res) => {
  try {
    const parentId = await getParentIdForUser(req.user.id);
    if (!parentId) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const result = await pool.query(
      `SELECT p.id, p.amount, p.status, p.mpesa_receipt, p.phone_number,
              p.account_reference, p.checkout_request_id, p.merchant_request_id,
              p.result_code, p.result_desc, p.balance_before, p.balance_after,
              p.transaction_date, p.created_at, p.updated_at,
              s.id as student_id, s.name as student_name
       FROM payments p
       LEFT JOIN students s ON p.student_id = s.id
       WHERE p.parent_id = $1
       ORDER BY p.created_at DESC
       LIMIT 100`,
      [parentId]
    );

    res.status(200).json({ payments: result.rows });
  } catch (error) {
    console.error('Get payment history error:', error.message);
    res.status(500).json({ message: 'Server error getting payment history' });
  }
};

const getPaymentSummary = async (req, res) => {
  try {
    const parentId = await getParentIdForUser(req.user.id);
    if (!parentId) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const [studentsResult, paymentsResult] = await Promise.all([
      pool.query(
        `SELECT s.id, s.name, COALESCE(s.transport_fee, 0) as transport_fee,
                COALESCE(s.outstanding_balance, 0) as outstanding_balance,
                s.last_payment_at
         FROM students s
         WHERE s.parent_id = $1
         ORDER BY s.name`,
        [parentId]
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_paid
         FROM payments
         WHERE parent_id = $1`,
        [parentId]
      ),
    ]);

    const totalOutstanding = studentsResult.rows.reduce(
      (sum, student) => sum + roundMoney(student.outstanding_balance),
      0
    );

    res.status(200).json({
      summary: {
        students: studentsResult.rows,
        paid_count: Number(paymentsResult.rows[0].paid_count || 0),
        pending_count: Number(paymentsResult.rows[0].pending_count || 0),
        total_paid: roundMoney(paymentsResult.rows[0].total_paid || 0),
        total_outstanding: roundMoney(totalOutstanding),
      },
    });
  } catch (error) {
    console.error('Get payment summary error:', error.message);
    res.status(500).json({ message: 'Server error getting payment summary' });
  }
};

const getPaymentReceipt = async (req, res) => {
  const { id } = req.params;

  try {
    const parentId = await getParentIdForUser(req.user.id);
    if (!parentId) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const result = await pool.query(
      `SELECT p.id, p.amount, p.status, p.mpesa_receipt, p.phone_number,
              p.account_reference, p.checkout_request_id, p.merchant_request_id,
              p.result_code, p.result_desc, p.balance_before, p.balance_after,
              p.transaction_date, p.created_at, p.updated_at,
              s.id as student_id, s.name as student_name,
              u.name as parent_name, u.phone as parent_phone
       FROM payments p
       LEFT JOIN students s ON p.student_id = s.id
       JOIN parents pr ON p.parent_id = pr.id
       JOIN users u ON pr.user_id = u.id
       WHERE p.id = $1 AND p.parent_id = $2
       LIMIT 1`,
      [id, parentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    res.status(200).json({ receipt: result.rows[0] });
  } catch (error) {
    console.error('Get payment receipt error:', error.message);
    res.status(500).json({ message: 'Server error getting receipt' });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT p.id, p.amount, p.status, p.mpesa_receipt, p.phone_number,
             p.account_reference, p.transaction_date, p.created_at,
             s.name as student_name,
             u.name as parent_name, u.email as parent_email
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      JOIN parents pr ON p.parent_id = pr.id
      JOIN users u ON pr.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
    }

    if (startDate) {
      paramCount++;
      query += ` AND p.created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND p.created_at <= $${paramCount}`;
      params.push(endDate);
    }

    paramCount++;
    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      WHERE 1=1
      ${status ? ' AND p.status = $1' : ''}
      ${startDate ? ' AND p.created_at >= $' + (status ? '2' : '1') : ''}
      ${endDate ? ' AND p.created_at <= $' + (status ? (startDate ? '3' : '2') : '1') : ''}
    `;
    const countParams = [];
    if (status) countParams.push(status);
    if (startDate) countParams.push(startDate);
    if (endDate) countParams.push(endDate);
    const countResult = await pool.query(countQuery, countParams);

    res.status(200).json({
      payments: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Get all payments error:', error.message);
    res.status(500).json({ message: 'Server error getting payments' });
  }
};

const getPaymentStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'WHERE p.created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'WHERE p.created_at >= $1';
      params.push(startDate);
    } else if (endDate) {
      dateFilter = 'WHERE p.created_at <= $1';
      params.push(endDate);
    }

    const statsQuery = `
      SELECT
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as total_revenue,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) as failed_amount
      FROM payments p
      ${dateFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);

    // Get recent payments
    const recentQuery = `
      SELECT p.id, p.amount, p.status, p.created_at,
             s.name as student_name,
             u.name as parent_name
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      JOIN parents pr ON p.parent_id = pr.id
      JOIN users u ON pr.user_id = u.id
      ${dateFilter.replace('p.created_at', 'p.created_at')}
      ORDER BY p.created_at DESC
      LIMIT 10
    `;
    const recentResult = await pool.query(recentQuery, params);

    res.status(200).json({
      stats: {
        totalPayments: parseInt(statsResult.rows[0].total_payments || 0),
        paidCount: parseInt(statsResult.rows[0].paid_count || 0),
        pendingCount: parseInt(statsResult.rows[0].pending_count || 0),
        failedCount: parseInt(statsResult.rows[0].failed_count || 0),
        totalRevenue: roundMoney(statsResult.rows[0].total_revenue || 0),
        pendingAmount: roundMoney(statsResult.rows[0].pending_amount || 0),
        failedAmount: roundMoney(statsResult.rows[0].failed_amount || 0),
      },
      recentPayments: recentResult.rows,
    });
  } catch (error) {
    console.error('Get payment stats error:', error.message);
    res.status(500).json({ message: 'Server error getting payment stats' });
  }
};

const generateInvoices = async (req, res) => {
  const { student_ids, amount, description } = req.body;
  try {
    let targets = [];
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      const result = await pool.query(
        `SELECT s.id, s.name, p.id as parent_id, u.email as parent_email, u.phone as parent_phone
         FROM students s JOIN parents p ON s.parent_id = p.id JOIN users u ON u.id = p.user_id
         WHERE s.id = ANY($1::int[])`,
        [student_ids]
      );
      targets = result.rows;
    } else {
      const result = await pool.query(
        `SELECT s.id, s.name, p.id as parent_id, u.email as parent_email, u.phone as parent_phone
         FROM students s JOIN parents p ON s.parent_id = p.id JOIN users u ON u.id = p.user_id
         WHERE COALESCE(s.outstanding_balance, 0) > 0`
      );
      targets = result.rows;
    }
    const inserted = [];
    for (const student of targets) {
      const amt = amount || Number(student.outstanding_balance) || 0;
      if (amt <= 0) continue;
      const payResult = await pool.query(
        `INSERT INTO payments (parent_id, student_id, amount, mpesa_receipt, status, description)
         VALUES ($1, $2, $3, NULL, 'pending', $4) RETURNING *`,
        [student.parent_id, student.id, amt, description || 'Auto-generated invoice']
      );
      inserted.push(payResult.rows[0]);
    }
    res.status(201).json({ message: `Generated ${inserted.length} invoices`, invoices: inserted });
  } catch (error) {
    console.error('Generate invoices error:', error.message);
    res.status(500).json({ message: 'Server error generating invoices' });
  }
};

const sendPaymentReminders = async (req, res) => {
  const { student_ids } = req.body;
  try {
    let query = `SELECT p.id as payment_id, s.name as student_name, p.amount, u.name as parent_name, u.phone as parent_phone
                 FROM payments p
                 JOIN students s ON s.id = p.student_id
                 JOIN parents pr ON pr.id = p.parent_id
                 JOIN users u ON u.id = pr.user_id
                 WHERE p.status = 'pending'`;
    const params = [];
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      query += ' AND s.id = ANY($1::int[])';
      params.push(student_ids);
    }
    const result = await pool.query(query, params);
    const reminders = result.rows.map(row => ({
      ...row,
      message: `Reminder: Payment of KES ${row.amount} for ${row.student_name} is pending. Please complete payment.`
    }));
    res.status(200).json({ reminders, count: reminders.length });
  } catch (error) {
    console.error('Send reminders error:', error.message);
    res.status(500).json({ message: 'Server error sending reminders' });
  }
};

const processRefund = async (req, res) => {
  const { payment_id, reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE payments SET status = 'refunded', description = COALESCE(description, '') || ' | Refund: ' || $2 WHERE id = $1 AND status = 'paid' RETURNING *`,
      [payment_id, reason || 'No reason provided']
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment not found or not eligible for refund' });
    res.status(200).json({ message: 'Refund processed successfully', payment: result.rows[0] });
  } catch (error) {
    console.error('Process refund error:', error.message);
    res.status(500).json({ message: 'Server error processing refund' });
  }
};

module.exports = {
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
};
