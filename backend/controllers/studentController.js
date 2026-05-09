const pool = require('../config/db');

// Add a new student (parent adds their child)
const addStudent = async (req, res) => {
  const { name, school_id, pickup_location, dropoff_location } = req.body;
  const user_id = req.user.id;

  try {
    // Get parent_id from parents table
    const parentResult = await pool.query(
      'SELECT id FROM parents WHERE user_id = $1',
      [user_id]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    const parent_id = parentResult.rows[0].id;

    // Add student
    const result = await pool.query(
      `INSERT INTO students (name, parent_id, school_id, pickup_location, dropoff_location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, parent_id, school_id, pickup_location, dropoff_location]
    );

    res.status(201).json({
      message: 'Student added successfully',
      student: result.rows[0]
    });

  } catch (error) {
    console.error('Add student error:', error.message);
    res.status(500).json({ message: 'Server error adding student' });
  }
};

// Get all students for a parent
const getMyStudents = async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.pickup_location, s.dropoff_location,
              sc.school_name
       FROM students s
       JOIN parents p ON s.parent_id = p.id
       LEFT JOIN schools sc ON s.school_id = sc.id
       WHERE p.user_id = $1`,
      [user_id]
    );

    res.status(200).json({ students: result.rows });

  } catch (error) {
    console.error('Get students error:', error.message);
    res.status(500).json({ message: 'Server error getting students' });
  }
};

// Get all students assigned to a driver's bus (driver views)
const getStudentsForDriver = async (req, res) => {
  const user_id = req.user.id;

  try {
    // Get bus assigned to this driver
    const driverResult = await pool.query(
      'SELECT bus_id FROM drivers WHERE user_id = $1',
      [user_id]
    );

    if (driverResult.rows.length === 0 || !driverResult.rows[0].bus_id) {
      return res.status(404).json({ message: 'No bus assigned to this driver' });
    }

    const bus_id = driverResult.rows[0].bus_id;

    // Get active trip for this bus
    const tripResult = await pool.query(
      `SELECT id FROM trips 
       WHERE bus_id = $1 AND status = 'active'
       ORDER BY start_time DESC LIMIT 1`,
      [bus_id]
    );

    if (tripResult.rows.length === 0) {
      return res.status(404).json({ message: 'No active trip found for this bus' });
    }

    const trip_id = tripResult.rows[0].id;

    // Get all students with their attendance status for this trip
    const result = await pool.query(
      `SELECT s.id, s.name, s.pickup_location, s.dropoff_location,
              u.phone as parent_phone,
              a.boarded_at, a.dropped_at,
              CASE 
                WHEN a.dropped_at IS NOT NULL THEN 'dropped'
                WHEN a.boarded_at IS NOT NULL THEN 'boarded'
                ELSE 'waiting'
              END as status
       FROM students s
       JOIN parents p ON s.parent_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN attendance a ON a.student_id = s.id AND a.trip_id = $1
       WHERE s.school_id IN (
         SELECT DISTINCT school_id FROM students
       )
       ORDER BY s.name`,
      [trip_id]
    );

    res.status(200).json({
      trip_id,
      bus_id,
      students: result.rows
    });

  } catch (error) {
    console.error('Get students for driver error:', error.message);
    res.status(500).json({ message: 'Server error getting students' });
  }
};

// Admin gets all students
const getAllStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.pickup_location, s.dropoff_location,
              u.name as parent_name, u.phone as parent_phone,
              sc.school_name
       FROM students s
       JOIN parents p ON s.parent_id = p.id
       JOIN users u ON p.user_id = u.id
       LEFT JOIN schools sc ON s.school_id = sc.id
       ORDER BY s.name`
    );

    res.status(200).json({ students: result.rows });

  } catch (error) {
    console.error('Get all students error:', error.message);
    res.status(500).json({ message: 'Server error getting all students' });
  }
};

// Update student details
const updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, pickup_location, dropoff_location } = req.body;
  const user_id = req.user.id;

  try {
    // Make sure this student belongs to this parent
    const check = await pool.query(
      `SELECT s.id FROM students s
       JOIN parents p ON s.parent_id = p.id
       WHERE s.id = $1 AND p.user_id = $2`,
      [id, user_id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized to update this student' });
    }

    const result = await pool.query(
      `UPDATE students SET name=$1, pickup_location=$2, dropoff_location=$3
       WHERE id=$4 RETURNING *`,
      [name, pickup_location, dropoff_location, id]
    );

    res.status(200).json({
      message: 'Student updated successfully',
      student: result.rows[0]
    });

  } catch (error) {
    console.error('Update student error:', error.message);
    res.status(500).json({ message: 'Server error updating student' });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const check = await pool.query(
      `SELECT s.id FROM students s
       JOIN parents p ON s.parent_id = p.id
       WHERE s.id = $1 AND p.user_id = $2`,
      [id, user_id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: 'Not authorized to delete this student' });
    }

    await pool.query('DELETE FROM students WHERE id = $1', [id]);

    res.status(200).json({ message: 'Student deleted successfully' });

  } catch (error) {
    console.error('Delete student error:', error.message);
    res.status(500).json({ message: 'Server error deleting student' });
  }
};

module.exports = {
  addStudent,
  getMyStudents,
  getStudentsForDriver,
  getAllStudents,
  updateStudent,
  deleteStudent
};