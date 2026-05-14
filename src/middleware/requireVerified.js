const Producer = require('../models/Producer');

const requireVerified = async (req, res, next) => {
  const producer = await Producer.findById(req.user.userId);
  if (!producer) return res.status(404).json({ error: 'Producer not found' });
  if (!producer.isVerified) return res.status(403).json({ error: 'Account pending admin verification' });
  return next();
};

module.exports = requireVerified;
