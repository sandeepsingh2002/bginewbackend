const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Retailer = require('../models/Retailer');
const ProcessedProduct = require('../models/ProcessedProduct');
const RetailerHistory = require('../models/RetailerHistory');
const WarehouseBatch = require('../models/WarehouseBatch');
const Warehouse = require('../models/Warehouse');
const { signToken } = require('../utils/auth');

exports.register = async (req, res) => {
  const { name, email, password, storeName, storeLocation, geoLocation } = req.body;
  if (!geoLocation || typeof geoLocation.lat !== 'number' || typeof geoLocation.lng !== 'number') {
    return res.status(400).json({ error: 'geoLocation with numeric lat and lng is required' });
  }
  const exists = await Retailer.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Retailer.create({ name, email, passwordHash, storeName, storeLocation, geoLocation });
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

exports.scanByTraceId = async (req, res) => {
  const { traceId } = req.params;
  if (!mongoose.isValidObjectId(traceId)) {
    return res.status(400).json({ error: 'Invalid traceId' });
  }

  const batch = await WarehouseBatch.findById(traceId).lean();
  if (!batch) return res.status(404).json({ error: 'Trace batch not found' });

  const warehouse = await Warehouse.findById(batch.warehouseId)
    .select('name warehouseName location email')
    .lean();

  const product = await ProcessedProduct.findOne({ masterProductId: batch.masterProductId })
    .select('masterProductId productName productCategory totalQuantityProduced quantityUnit retailerStop distributionLeg2')
    .lean();

  const alreadyAccepted = Boolean(product?.retailerStop?.retailerId);

  return res.json({
    traceId: batch._id,
    batch: {
      batchId: batch.batchId,
      masterProductId: batch.masterProductId,
      productName: batch.productName,
      productType: batch.productType,
      quantity: batch.quantity,
      status: batch.status,
      scannedAt: batch.scannedAt,
      debitedAt: batch.debitedAt,
      environmentalRecords: batch.environmentalRecords
    },
    warehouse,
    product: product
      ? {
          masterProductId: product.masterProductId,
          productName: product.productName,
          productType: product.productCategory,
          quantity: product.totalQuantityProduced,
          quantityUnit: product.quantityUnit
        }
      : null,
    canAccept: Boolean(product?.distributionLeg2?.receivedAt) && !alreadyAccepted,
    alreadyAccepted
  });
};

exports.acceptByTraceId = async (req, res) => {
  const { traceId } = req.params;
  const { receivedAt, shelfLocation, notes } = req.body;

  if (!mongoose.isValidObjectId(traceId)) {
    return res.status(400).json({ error: 'Invalid traceId' });
  }
  if (!receivedAt || Number.isNaN(new Date(receivedAt).getTime())) {
    return res.status(400).json({ error: 'Valid receivedAt is required' });
  }

  const batch = await WarehouseBatch.findById(traceId).lean();
  if (!batch) return res.status(404).json({ error: 'Trace batch not found' });

  const product = await ProcessedProduct.findOne({ masterProductId: batch.masterProductId });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (!product.distributionLeg2?.receivedAt) return res.status(409).json({ error: 'Leg 2 must be completed first' });
  if (product.retailerStop?.retailerId) return res.status(409).json({ error: 'Retailer stop already filled' });

  product.retailerStop = {
    retailerId: req.user.userId,
    receivedAt: new Date(receivedAt),
    shelfLocation,
    notes
  };
  await product.save();

  await RetailerHistory.create({
    retailerId: req.user.userId,
    masterProductId: product.masterProductId,
    receivedAt: new Date(receivedAt),
    shelfLocation,
    notes
  });

  return res.json({
    traceId,
    masterProductId: product.masterProductId,
    retailerStop: product.retailerStop
  });
};

exports.history = async (req, res) => {
  const items = await RetailerHistory.find({ retailerId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(items);
};
