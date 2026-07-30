const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  addBus, getAllBuses, updateBus, deleteBus,
  getAllDrivers, assignDriverToBus, unassignDriver, addDriver,
  addRoute, getAllRoutes, updateRoute, deleteRoute, optimizeRoute,
  addSchool, getAllSchools, updateSchool, deleteSchool,
  getAttendanceReport, getTripReport,
  getAnalytics, getAttendanceTrends,
  getAllParents, getParentDetails, updateParentStatus,
  getFinancialReport,
  getIncidents, updateIncidentStatus, getIncidentStats,
  getAllPaymentsAdmin, getPaymentStatsAdmin,
} = require('../controllers/adminController');
const {
  getAvailableDrivers,
  getDriverAvailabilityHistory,
  updateDriverAvailability,
  reassignTrip
} = require('../controllers/driverAvailabilityController');
const { sendMessage, getConversation, getChatList, getContacts, markMessagesRead } = require('../controllers/chatController');
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
router.get('/drivers/available', getAvailableDrivers);
router.get('/drivers/availability-history', getDriverAvailabilityHistory);
router.post('/drivers', addDriver);
router.post('/drivers/assign', assignDriverToBus);
router.put('/drivers/:driver_id/unassign', unassignDriver);
router.patch('/drivers/:driver_id/availability', updateDriverAvailability);
router.post('/trips/:trip_id/reassign', reassignTrip);

// Route management
router.get('/routes', getAllRoutes);
router.post('/routes', addRoute);
router.put('/routes/:id', updateRoute);
router.delete('/routes/:id', deleteRoute);
router.post('/routes/:id/optimize', optimizeRoute);

// Schools
router.get('/schools', getAllSchools);
router.post('/schools', addSchool);
router.put('/schools/:id', updateSchool);
router.delete('/schools/:id', deleteSchool);

// Reports
router.get('/reports/attendance', getAttendanceReport);
router.get('/reports/trips', getTripReport);

// Chat/Messaging
router.post('/chat/send', sendMessage);
router.get('/chat/list', getChatList);
router.get('/chat/contacts', getContacts);
router.get('/chat/conversation/:other_user_id', getConversation);
router.put('/chat/read/:other_user_id', markMessagesRead);

// Payments
router.get('/payments', getAllPaymentsAdmin);
router.get('/payments/stats', getPaymentStatsAdmin);

module.exports = router;
