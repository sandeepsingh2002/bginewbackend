const { body, param } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('email').isEmail().withMessage('valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('warehouseName').trim().notEmpty().withMessage('warehouseName is required'),
  body('location').trim().notEmpty().withMessage('location is required'),
  body('geoLocation.lat').isFloat({ min: -90, max: 90 }).withMessage('geoLocation.lat must be between -90 and 90'),
  body('geoLocation.lng').isFloat({ min: -180, max: 180 }).withMessage('geoLocation.lng must be between -180 and 180')
];

const loginValidation = [
  body('email').isEmail().withMessage('valid email is required'),
  body('password').notEmpty().withMessage('password is required')
];

const sessionIdValidation = [
  param('sessionId').trim().notEmpty().withMessage('sessionId is required')
];

const batchIdValidation = [
  param('batchId').trim().notEmpty().withMessage('batchId is required')
];

const traceIdValidation = [
  param('traceId').isMongoId().withMessage('valid traceId is required')
];

const environmentalUpdateValidation = [
  param('batchId').trim().notEmpty().withMessage('batchId is required'),
  body('temperature').isFloat().withMessage('temperature must be a number'),
  body('humidity').isFloat({ min: 0, max: 100 }).withMessage('humidity must be between 0 and 100')
];

module.exports = {
  registerValidation,
  loginValidation,
  sessionIdValidation,
  batchIdValidation,
  traceIdValidation,
  environmentalUpdateValidation
};
