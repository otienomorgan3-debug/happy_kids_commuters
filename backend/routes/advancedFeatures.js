const express = require('express');
const router = express.Router();
const {
  getAllGeofences, createGeofence, updateGeofence, deleteGeofence,
  getGeofenceAlerts, acknowledgeGeofenceAlert, checkGeofence,
  logDriverBehavior, getDriverBehaviorLogs, getDriverBehaviorScores, getDriverBehaviorScore,
  queueOfflineAction, getOfflineQueue, syncOfflineActions, clearSyncedActions,
} = require('../controllers/advancedFeaturesController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Geofencing routes
router.get('/geofences', protect, getAllGeofences);
router.post('/geofences', protect, restrictTo('admin', 'superadmin'), createGeofence);
router.put('/geofences/:id', protect, restrictTo('admin', 'superadmin'), updateGeofence);
router.delete('/geofences/:id', protect, restrictTo('admin', 'superadmin'), deleteGeofence);
router.get('/geofences/alerts', protect, getGeofenceAlerts);
router.put('/geofences/alerts/:id/acknowledge', protect, acknowledgeGeofenceAlert);
router.post('/geofences/check', protect, checkGeofence);

// Driver behavior routes
router.post('/driver-behavior', protect, logDriverBehavior);
router.get('/driver-behavior/logs', protect, getDriverBehaviorLogs);
router.get('/driver-behavior/scores', protect, getDriverBehaviorScores);
router.get('/driver-behavior/scores/:driver_id', protect, getDriverBehaviorScore);

// Offline sync routes
router.post('/offline/queue', protect, queueOfflineAction);
router.get('/offline/queue', protect, getOfflineQueue);
router.post('/offline/sync', protect, syncOfflineActions);
router.post('/offline/clear', protect, clearSyncedActions);

module.exports = router;