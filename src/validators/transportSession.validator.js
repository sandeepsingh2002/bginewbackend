const { body, param } = require('express-validator');
const { PRODUCT_TYPES, SENDER_TYPES } = require('../models/TransportSession');

const startSessionValidation = [
  body('masterProductId').trim().notEmpty().withMessage('masterProductId is required'),
  body('senderId').isMongoId().withMessage('senderId must be a valid MongoDB ObjectId'),
  body('senderType').isIn(SENDER_TYPES).withMessage(`senderType must be one of: ${SENDER_TYPES.join(', ')}`),
  body('productName').trim().notEmpty().withMessage('productName is required'),
  body('productType').isIn(PRODUCT_TYPES).withMessage(`productType must be one of: ${PRODUCT_TYPES.join(', ')}`),
  body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be greater than 0'),
  body('chainId').trim().notEmpty().withMessage('chainId is required'),
  body('pickupLocation.lat').isFloat({ min: -90, max: 90 }).withMessage('pickupLocation.lat must be between -90 and 90'),
  body('pickupLocation.lng').isFloat({ min: -180, max: 180 }).withMessage('pickupLocation.lng must be between -180 and 180'),
  body('dropLocation.lat').isFloat({ min: -90, max: 90 }).withMessage('dropLocation.lat must be between -90 and 90'),
  body('dropLocation.lng').isFloat({ min: -180, max: 180 }).withMessage('dropLocation.lng must be between -180 and 180')
];

const updateTrackingValidation = [
  param('sessionId').trim().notEmpty().withMessage('sessionId is required'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),
  body('truckTemperature').optional().isFloat().withMessage('truckTemperature must be a number'),
  body('humidity').optional().isFloat({ min: 0, max: 100 }).withMessage('humidity must be between 0 and 100')
];

const sessionIdValidation = [
  param('sessionId').trim().notEmpty().withMessage('sessionId is required')
];

module.exports = {
  startSessionValidation,
  updateTrackingValidation,
  sessionIdValidation
};
