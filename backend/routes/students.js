const express = require('express');
const router = express.Router();
const {
  addStudent,
  getMyStudents,
  getStudentsForDriver,
  getAllStudents,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Parent routes
router.post('/', protect, restrictTo('parent'), addStudent);
router.get('/my', protect, restrictTo('parent'), getMyStudents);
router.put('/:id', protect, restrictTo('parent'), updateStudent);
router.delete('/:id', protect, restrictTo('parent'), deleteStudent);

// Driver routes
router.get('/assigned', protect, restrictTo('driver'), getStudentsForDriver);

// Admin routes
router.get('/all', protect, restrictTo('admin', 'superadmin'), getAllStudents);

module.exports = router;