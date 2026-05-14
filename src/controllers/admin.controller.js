const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Producer = require('../models/Producer');
const ProcessedProduct = require('../models/ProcessedProduct');
const { signToken } = require('../utils/auth');

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.json({ token: signToken({ userId: admin._id, role: 'admin' }) });
};

exports.pendingProducers = async (_req, res) => {
  const items = await Producer.find({ isVerified: false }).select('-passwordHash');
  return res.json(items);
};

exports.verifyProducer = async (req, res) => {
  const producer = await Producer.findByIdAndUpdate(
    req.params.producerId,
    { isVerified: true, verifiedAt: new Date(), verifiedBy: req.user.userId },
    { new: true }
  ).select('-passwordHash');
  if (!producer) return res.status(404).json({ error: 'Producer not found' });
  return res.json(producer);
};

exports.listProducts = async (_req, res) => {
  const products = await ProcessedProduct.find().sort({ createdAt: -1 });
  return res.json(products);
};

exports.listProducers = async (_req, res) => {
  const producers = await Producer.find().select('-passwordHash').sort({ createdAt: -1 });
  return res.json(producers);
};
