const express = require('express');
const router = express.Router();
const {
  startTrip,
  endTrip,
  studentBoarded,
  studentDropped,
  getTripAttendance
} = require('../controllers/attendanceController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Trip management (driver only)
router.post('/trip/start', protect, restrictTo('driver'), startTrip);
router.post('/trip/end', protect, restrictTo('driver'), endTrip);

// Attendance marking (driver only)
router.post('/boarded', protect, restrictTo('driver'), studentBoarded);
router.post('/dropped', protect, restrictTo('driver'), studentDropped);

// View attendance (admin + driver)
router.get('/trip/:trip_id', protect, getTripAttendance);

module.exports = router;