const express = require('express');
const router = express.Router();
const {
  markChildAbsent,
  getAbsenceRecords,
  requestPickupChange,
  getPickupChangeRequests,
  getTransportHistory,
  getEmergencyAlerts,
  getSchedulePreview,
  getParentTripStatus,
} = require('../controllers/parentActionsController');
const { sendMessage, getConversation, getChatList, getContacts, markMessagesRead } = require('../controllers/chatController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes require authentication (parent)
router.use(protect, restrictTo('parent'));

// Chat
router.post('/chat/send', sendMessage);
router.get('/chat/list', getChatList);
router.get('/chat/contacts', getContacts);
router.get('/chat/conversation/:other_user_id', getConversation);
router.put('/chat/read/:other_user_id', markMessagesRead);

// Absence
router.post('/absent', markChildAbsent);
router.get('/absences', getAbsenceRecords);

// Pickup change
router.post('/pickup-change', requestPickupChange);
router.get('/pickup-changes', getPickupChangeRequests);

// Transport history
router.get('/transport-history', getTransportHistory);

// Emergency alerts
router.get('/emergency-alerts', getEmergencyAlerts);

// Schedule preview
router.get('/schedule-preview', getSchedulePreview);

// Live trip status
router.get('/trip-status', getParentTripStatus);

module.exports = router;
