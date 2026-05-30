const express = require('express');
const router = express.Router();
const { getRouteById, getAllRoutes, getRouteEta } = require('../controllers/routesController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.get('/', protect, restrictTo('parent', 'driver', 'admin', 'superadmin'), getAllRoutes);
router.get('/:id', protect, restrictTo('parent', 'driver', 'admin', 'superadmin'), getRouteById);
router.post('/:id/eta', protect, restrictTo('parent', 'driver', 'admin', 'superadmin'), getRouteEta);

module.exports = router;
