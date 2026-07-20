const express = require('express');
const router = express.Router();
const { updateLocation, getBusLocation, getAllBusLocations } = require('../controllers/trackingController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Driver updates their location
router.post('/update-location', protect, restrictTo('driver'), updateLocation);

// Parent gets a specific bus location
router.get('/bus/:bus_id', protect, getBusLocation);

// Admin/Parent gets all buses locations
router.get('/all', protect, restrictTo('admin', 'superadmin', 'parent'), getAllBusLocations);

module.exports = router;