const bcrypt = require('bcryptjs');
const Distributor = require('../models/Distributor');
const ProcessedProduct = require('../models/ProcessedProduct');
const DistributorHistory = require('../models/DistributorHistory');
const { signToken } = require('../utils/auth');

exports.register = async (req, res) => {
  const { name, email, password, companyName, geoLocation } = req.body;
  if (!geoLocation || typeof geoLocation.lat !== 'number' || typeof geoLocation.lng !== 'number') {
    return res.status(400).json({ error: 'geoLocation with numeric lat and lng is required' });
  }
  const exists = await Distributor.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Distributor.create({ name, email, passwordHash, companyName, geoLocation });
  return res.status(201).json({ id: user._id });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await Distributor.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({ token: signToken({ userId: user._id, role: 'distributor' }) });
};

exports.scan = async (req, res) => {
  const { masterProductId } = req.body;
  const p = await ProcessedProduct.findOne({ masterProductId });
  if (!p) return res.status(404).json({ error: 'Product not found' });
  const leg = !p.distributionLeg1?.distributorId ? 'leg1' : p.warehouseStop?.warehouseId ? 'leg2' : 'warehouse_pending';
  return res.json({ masterProductId, nextLeg: leg });
};

exports.dispatchLeg1 = async (req, res) => {
  const { masterProductId, ...rest } = req.body;
  const updated = await ProcessedProduct.findOneAndUpdate(
    { masterProductId, 'distributionLeg1.distributorId': { $exists: false } },
    { $set: { distributionLeg1: { distributorId: req.user.userId, ...rest } } },
    { new: true }
  );
  if (!updated) return res.status(409).json({ error: 'Leg 1 already assigned or product missing' });

  await DistributorHistory.create({ distributorId: req.user.userId, masterProductId, leg: 'leg1', ...rest });
  return res.json(updated);
};

exports.receiveLeg1 = async (req, res) => {
  const { receivedAt, endTemp, endHumidity } = req.body;
  const updated = await ProcessedProduct.findOneAndUpdate(
    { masterProductId: req.params.masterProductId, 'distributionLeg1.distributorId': req.user.userId },
    { $set: { 'distributionLeg1.receivedAt': receivedAt, 'distributionLeg1.endTemp': endTemp, 'distributionLeg1.endHumidity': endHumidity } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Leg 1 dispatch not found' });

  await DistributorHistory.findOneAndUpdate(
    { distributorId: req.user.userId, masterProductId: req.params.masterProductId, leg: 'leg1' },
    { $set: { receivedAt, endTemp, endHumidity } }
  );

  return res.json(updated.distributionLeg1);
};

exports.dispatchLeg2 = async (req, res) => {
  const { masterProductId, ...rest } = req.body;
  const product = await ProcessedProduct.findOne({ masterProductId });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.warehouseStop?.dispatchedAt) return res.status(409).json({ error: 'Warehouse dispatch required first' });
  if (product.distributionLeg2?.distributorId) return res.status(409).json({ error: 'Leg 2 already assigned' });

  product.distributionLeg2 = { distributorId: req.user.userId, ...rest };
  await product.save();

  await DistributorHistory.create({ distributorId: req.user.userId, masterProductId, leg: 'leg2', ...rest });
  return res.json(product);
};

exports.receiveLeg2 = async (req, res) => {
  const { receivedAt, endTemp, endHumidity } = req.body;
  const updated = await ProcessedProduct.findOneAndUpdate(
    { masterProductId: req.params.masterProductId, 'distributionLeg2.distributorId': req.user.userId },
    { $set: { 'distributionLeg2.receivedAt': receivedAt, 'distributionLeg2.endTemp': endTemp, 'distributionLeg2.endHumidity': endHumidity } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ error: 'Leg 2 dispatch not found' });

  await DistributorHistory.findOneAndUpdate(
    { distributorId: req.user.userId, masterProductId: req.params.masterProductId, leg: 'leg2' },
    { $set: { receivedAt, endTemp, endHumidity } }
  );

  return res.json(updated.distributionLeg2);
};

exports.history = async (req, res) => {
  const items = await DistributorHistory.find({ distributorId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(items);
};
