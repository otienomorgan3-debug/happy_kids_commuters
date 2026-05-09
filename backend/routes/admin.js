const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  addBus, getAllBuses, updateBus, deleteBus,
  getAllDrivers, assignDriverToBus, unassignDriver,
  addRoute, getAllRoutes, updateRoute, deleteRoute,
  addSchool, getAllSchools,
  getAttendanceReport, getTripReport
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const adminOnly = [protect, restrictTo('admin', 'superadmin')];

// Dashboard
router.get('/stats', ...adminOnly, getDashboardStats);

// Bus management
router.post('/buses', ...adminOnly, addBus);
router.get('/buses', ...adminOnly, getAllBuses);
router.put('/buses/:id', ...adminOnly, updateBus);
router.delete('/buses/:id', ...adminOnly, deleteBus);

// Driver management
router.get('/drivers', ...adminOnly, getAllDrivers);
router.post('/drivers/assign', ...adminOnly, assignDriverToBus);
router.put('/drivers/:driver_id/unassign', ...adminOnly, unassignDriver);

// Route management
router.post('/routes', ...adminOnly, addRoute);
router.get('/routes', ...adminOnly, getAllRoutes);
router.put('/routes/:id', ...adminOnly, updateRoute);
router.delete('/routes/:id', ...adminOnly, deleteRoute);

// School management
router.post('/schools', ...adminOnly, addSchool);
router.get('/schools', ...adminOnly, getAllSchools);

// Reports
router.get('/reports/attendance', ...adminOnly, getAttendanceReport);
router.get('/reports/trips', ...adminOnly, getTripReport);

module.exports = router;