const express = require('express');
const router = express.Router();
const {
  startTrip,
  endTrip,
  studentBoarded,
  studentDropped,
  getTripAttendance,
  getMyAssignment
} = require('../controllers/attendanceController');
const {
  updateDriverAvailability
} = require('../controllers/driverAvailabilityController');
const { sendMessage, getConversation, getChatList, getContacts, markMessagesRead } = require('../controllers/chatController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Trip management (driver only)
router.post('/trip/start', protect, restrictTo('driver'), startTrip);
router.post('/trip/end', protect, restrictTo('driver'), endTrip);

// Attendance marking (driver only)
router.post('/boarded', protect, restrictTo('driver'), studentBoarded);
router.post('/dropped', protect, restrictTo('driver'), studentDropped);

// View attendance (admin + driver)
router.get('/trip/:trip_id', protect, getTripAttendance);

// Driver assignment
router.get('/driver/assignment', protect, restrictTo('driver'), getMyAssignment);
router.put('/driver/availability', protect, restrictTo('driver'), updateDriverAvailability);

// Chat/Messaging for drivers
router.post('/chat/send', protect, restrictTo('driver'), sendMessage);
router.get('/chat/list', protect, restrictTo('driver'), getChatList);
router.get('/chat/contacts', protect, restrictTo('driver'), getContacts);
router.get('/chat/conversation/:other_user_id', protect, restrictTo('driver'), getConversation);
router.put('/chat/read/:other_user_id', protect, restrictTo('driver'), markMessagesRead);

module.exports = router;
