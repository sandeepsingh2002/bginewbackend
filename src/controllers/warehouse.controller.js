const bcrypt = require('bcryptjs');
const Warehouse = require('../models/Warehouse');
const ProcessedProduct = require('../models/ProcessedProduct');
const WarehouseHistory = require('../models/WarehouseHistory');
const { signToken } = require('../utils/auth');

exports.register = async (req, res) => {
  const { name, email, password, warehouseName, location } = req.body;
  const exists = await Warehouse.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Warehouse.create({ name, email, passwordHash, warehouseName, location });
  return res.status(201).json({ id: user._id });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await Warehouse.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({ token: signToken({ userId: user._id, role: 'warehouse' }) });
};

exports.receive = async (req, res) => {
  const { masterProductId, ...rest } = req.body;
  const product = await ProcessedProduct.findOne({ masterProductId });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.distributionLeg1?.receivedAt) return res.status(409).json({ error: 'Leg 1 must be completed first' });
  if (product.warehouseStop?.warehouseId) return res.status(409).json({ error: 'Warehouse stop already filled' });

  product.warehouseStop = { warehouseId: req.user.userId, ...rest };
  await product.save();
  await WarehouseHistory.create({ warehouseId: req.user.userId, masterProductId, ...rest });

  return res.json(product.warehouseStop);
};

exports.dispatch = async (req, res) => {
  const { dispatchedAt } = req.body;
  const updated = await ProcessedProduct.findOneAndUpdate(
    { masterProductId: req.params.masterProductId, 'warehouseStop.warehouseId': req.user.userId },
    { $set: { 'warehouseStop.dispatchedAt': dispatchedAt } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Warehouse record not found' });

  await WarehouseHistory.findOneAndUpdate(
    { warehouseId: req.user.userId, masterProductId: req.params.masterProductId },
    { $set: { dispatchedAt } }
  );

  return res.json(updated.warehouseStop);
};

exports.history = async (req, res) => {
  const items = await WarehouseHistory.find({ warehouseId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(items);
};
