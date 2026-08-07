const express = require('express');
const router = express.Router();
const { updateLocation, getBusLocation, getAllBusLocations } = require('../controllers/trackingController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const Trip = require('../models/Trip');
const Attendance = require('../models/Attendance');

// Driver updates their location
router.post('/update-location', protect, restrictTo('driver'), updateLocation);

// Parent gets a specific bus location
router.get('/bus/:bus_id', protect, getBusLocation);

// Admin/Parent gets all buses locations
router.get('/all', protect, restrictTo('admin', 'superadmin', 'parent'), getAllBusLocations);

// Start a trip (driver)
router.post('/start-trip', protect, restrictTo('driver'), async (req, res) => {
	const { bus_id, route_id } = req.body;
	const driver_user_id = req.user.id;
	try {
		const trip = await Trip.create({ bus_id, route_id, driver_id: driver_user_id, status: 'active', start_time: new Date() });
		res.status(201).json(trip);
	} catch (err) {
		console.error('Start trip error:', err.message || err);
		res.status(500).json({ message: 'Server error starting trip' });
	}
});

// End a trip (driver)
router.post('/end-trip', protect, restrictTo('driver'), async (req, res) => {
	const { trip_id } = req.body;
	try {
		const trip = await Trip.findByPk(trip_id);
		if (!trip) return res.status(404).json({ message: 'Trip not found' });
		if (trip.status !== 'active') return res.status(400).json({ message: 'Trip is not active' });
		await trip.update({ status: 'completed', end_time: new Date() });
		res.status(200).json({ message: 'Trip ended successfully' });
	} catch (err) {
		console.error('End trip error:', err.message || err);
		res.status(500).json({ message: 'Server error ending trip' });
	}
});

// Attendance endpoints (board/drop)
router.post('/attendance', protect, restrictTo('driver'), async (req, res) => {
	const { student_id, trip_id, action } = req.body;
	try {
		if (action === 'board') {
			const att = await Attendance.create({ student_id, trip_id, boarded_at: new Date() });
			return res.status(201).json(att);
		}
		if (action === 'drop') {
			const att = await Attendance.findByPk(student_id);
			if (!att) return res.status(404).json({ message: 'Attendance record not found' });
			await att.update({ dropped_at: new Date() });
			return res.status(200).json({ message: 'Dropped' });
		}
		return res.status(400).json({ message: 'Invalid action' });
	} catch (err) {
		console.error('Attendance error:', err.message || err);
		res.status(500).json({ message: 'Server error processing attendance' });
	}
});

module.exports = router;