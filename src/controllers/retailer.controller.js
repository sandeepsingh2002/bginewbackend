const bcrypt = require('bcryptjs');
const Retailer = require('../models/Retailer');
const ProcessedProduct = require('../models/ProcessedProduct');
const RetailerHistory = require('../models/RetailerHistory');
const { signToken } = require('../utils/auth');

exports.register = async (req, res) => {
  const { name, email, password, storeName, storeLocation } = req.body;
  const exists = await Retailer.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Retailer.create({ name, email, passwordHash, storeName, storeLocation });
  return res.status(201).json({ id: user._id });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await Retailer.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({ token: signToken({ userId: user._id, role: 'retailer' }) });
};

exports.receive = async (req, res) => {
  const { masterProductId, ...rest } = req.body;
  const product = await ProcessedProduct.findOne({ masterProductId });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.distributionLeg2?.receivedAt) return res.status(409).json({ error: 'Leg 2 must be completed first' });
  if (product.retailerStop?.retailerId) return res.status(409).json({ error: 'Retailer stop already filled' });

  product.retailerStop = { retailerId: req.user.userId, ...rest };
  await product.save();
  await RetailerHistory.create({ retailerId: req.user.userId, masterProductId, ...rest });

  return res.json(product.retailerStop);
};

exports.history = async (req, res) => {
  const items = await RetailerHistory.find({ retailerId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(items);
};
