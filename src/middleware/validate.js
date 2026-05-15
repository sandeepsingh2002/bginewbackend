const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    error: 'Validation failed',
    details: errors.array().map((err) => ({
      field: err.path,
      message: err.msg
    }))
  });
};
