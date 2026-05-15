const bcrypt = require('bcryptjs');
const Warehouse = require('../models/Warehouse');
const { signToken } = require('../utils/auth');
const warehouseService = require('../services/warehouse.service');

exports.register = async (req, res) => {
  const { name, email, password, warehouseName, location, geoLocation } = req.body;
  if (!geoLocation || typeof geoLocation.lat !== 'number' || typeof geoLocation.lng !== 'number') {
    return res.status(400).json({ error: 'geoLocation with numeric lat and lng is required' });
  }
  const exists = await Warehouse.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Warehouse.create({ name, email, passwordHash, warehouseName, location, geoLocation });
  return res.status(201).json({ id: user._id });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await Warehouse.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.json({ token: signToken({ userId: user._id, role: 'warehouse' }) });
};

exports.scanBatch = async (req, res, next) => {
  try {
    const batch = await warehouseService.scanBatch({
      warehouseId: req.user.userId,
      sessionId: req.params.sessionId
    });
    return res.status(201).json(batch);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.updateEnvironment = async (req, res, next) => {
  try {
    const batch = await warehouseService.addEnvironmentalRecord({
      warehouseId: req.user.userId,
      batchId: req.params.batchId,
      temperature: req.body.temperature,
      humidity: req.body.humidity
    });
    return res.json({ batchId: batch.batchId, status: batch.status, recordAdded: true });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.debitBatch = async (req, res, next) => {
  try {
    const batch = await warehouseService.debitBatch({
      warehouseId: req.user.userId,
      batchId: req.params.batchId
    });
    return res.json({ batchId: batch.batchId, traceId: batch._id });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.traceBatch = async (req, res, next) => {
  try {
    const batch = await warehouseService.getBatchDetails({
      batchId: req.params.batchId
    });
    return res.json(batch);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.myBatches = async (req, res, next) => {
  try {
    const batches = await warehouseService.getWarehouseBatches({
      warehouseId: req.user.userId
    });
    return res.json(batches);
  } catch (err) {
    return next(err);
  }
};
