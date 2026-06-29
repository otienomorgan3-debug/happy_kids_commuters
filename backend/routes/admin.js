const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  addBus, getAllBuses, updateBus, deleteBus,
  getAllDrivers, assignDriverToBus, unassignDriver,
  addRoute, getAllRoutes, updateRoute, deleteRoute,
  addSchool, getAllSchools,
  getAttendanceReport, getTripReport,
  getAnalytics, getAttendanceTrends,
  getAllParents, getParentDetails, updateParentStatus,
  getFinancialReport,
  getIncidents, updateIncidentStatus, getIncidentStats,
  getAllPaymentsAdmin, getPaymentStatsAdmin,
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.use(protect, restrictTo('admin', 'superadmin'));

// Dashboard
router.get('/stats', getDashboardStats);

// Analytics
router.get('/analytics', getAnalytics);
router.get('/analytics/attendance-trends', getAttendanceTrends);

// Parent management
router.get('/parents', getAllParents);
router.get('/parents/:id', getParentDetails);
router.put('/parents/:id/status', updateParentStatus);

// Financial reports
router.get('/financial-report', getFinancialReport);

// Incident management
router.get('/incidents', getIncidents);
router.get('/incidents/stats', getIncidentStats);
router.put('/incidents/:id/status', updateIncidentStatus);

// Bus management
router.get('/buses', getAllBuses);
router.post('/buses', addBus);
router.put('/buses/:id', updateBus);
router.delete('/buses/:id', deleteBus);

// Driver management
router.get('/drivers', getAllDrivers);
router.post('/drivers/assign', assignDriverToBus);
router.put('/drivers/:driver_id/unassign', unassignDriver);

// Route management
router.get('/routes', getAllRoutes);
router.post('/routes', addRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);

// Schools
router.get('/schools', getAllSchools);
router.post('/schools', addSchool);

// Reports
router.get('/reports/attendance', getAttendanceReport);
router.get('/reports/trips', getTripReport);

// Payments
router.get('/payments', getAllPaymentsAdmin);
router.get('/payments/stats', getPaymentStatsAdmin);

module.exports = router;