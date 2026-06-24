const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General API rate limiter
const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many API requests, please try again later.'
);

// Strict rate limiter for auth endpoints (prevent brute force)
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts, please try again later.'
);

// Rate limiter for payment endpoints
const paymentLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  3, // 3 requests per minute
  'Too many payment requests, please wait before trying again.'
);

// Validation middleware
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  };
};

// Common validation rules
const validators = {
  // User registration validation
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone number is required')
      .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format'),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    body('role')
      .optional()
      .isIn(['parent', 'driver', 'admin', 'superadmin']).withMessage('Invalid role')
  ],

  // Login validation
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],

  // Student validation
  student: [
    body('name')
      .trim()
      .notEmpty().withMessage('Student name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('school_id')
      .optional()
      .isInt({ min: 1 }).withMessage('Invalid school ID'),
    body('pickup_location')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Pickup location too long'),
    body('dropoff_location')
      .optional()
      .trim()
      .isLength({ max: 255 }).withMessage('Dropoff location too long')
  ],

  // Payment validation
  payment: [
    body('amount')
      .notEmpty().withMessage('Amount is required')
      .isFloat({ min: 1 }).withMessage('Amount must be at least 1'),
    body('phone_number')
      .trim()
      .notEmpty().withMessage('Phone number is required')
      .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Invalid phone number format')
  ],

  // Trip validation
  trip: [
    body('bus_id')
      .notEmpty().withMessage('Bus ID is required')
      .isInt({ min: 1 }).withMessage('Invalid bus ID'),
    body('route_id')
      .notEmpty().withMessage('Route ID is required')
      .isInt({ min: 1 }).withMessage('Invalid route ID')
  ],

  // Attendance validation
  attendance: [
    body('student_id')
      .notEmpty().withMessage('Student ID is required')
      .isInt({ min: 1 }).withMessage('Invalid student ID'),
    body('trip_id')
      .notEmpty().withMessage('Trip ID is required')
      .isInt({ min: 1 }).withMessage('Invalid trip ID'),
    body('action')
      .notEmpty().withMessage('Action is required')
      .isIn(['board', 'drop']).withMessage('Action must be either board or drop')
  ],

  // Bus validation
  bus: [
    body('plate_number')
      .trim()
      .notEmpty().withMessage('Plate number is required')
      .isLength({ max: 20 }).withMessage('Plate number too long'),
    body('capacity')
      .notEmpty().withMessage('Capacity is required')
      .isInt({ min: 1, max: 100 }).withMessage('Capacity must be 1-100'),
    body('gps_device_id')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('GPS device ID too long')
  ],

  // Route validation
  route: [
    body('route_name')
      .trim()
      .notEmpty().withMessage('Route name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Route name must be 2-100 characters'),
    body('estimated_time')
      .optional()
      .isInt({ min: 1 }).withMessage('Estimated time must be positive')
  ],

  // Route stop validation
  routeStop: [
    body('route_id')
      .notEmpty().withMessage('Route ID is required')
      .isInt({ min: 1 }).withMessage('Invalid route ID'),
    body('stop_name')
      .trim()
      .notEmpty().withMessage('Stop name is required')
      .isLength({ max: 150 }).withMessage('Stop name too long'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('stop_order')
      .notEmpty().withMessage('Stop order is required')
      .isInt({ min: 1 }).withMessage('Stop order must be positive')
  ]
};

// Sanitize input to prevent XSS
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Basic XSS prevention - remove script tags and common attack vectors
        req.body[key] = req.body[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      }
    });
  }

  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent XSS
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Remove server info
  res.removeHeader('X-Powered-By');
  
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  validate,
  validators,
  sanitizeInput,
  securityHeaders
};