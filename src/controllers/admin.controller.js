const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Producer = require('../models/Producer');
const Processor = require('../models/Processor');
const Distributor = require('../models/Distributor');
const Warehouse = require('../models/Warehouse');
const Retailer = require('../models/Retailer');
const ProcessedProduct = require('../models/ProcessedProduct');
const { signToken } = require('../utils/auth');

const ENTITY_MODELS = {
  producer: { model: Producer, idParam: 'producerId' },
  processor: { model: Processor, idParam: 'processorId' },
  distributor: { model: Distributor, idParam: 'distributorId' },
  warehouse: { model: Warehouse, idParam: 'warehouseId' },
  retailer: { model: Retailer, idParam: 'retailerId' }
};

const getEntityConfig = (entityType) => ENTITY_MODELS[String(entityType || '').toLowerCase()];

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

exports.pendingByEntity = async (req, res) => {
  const cfg = getEntityConfig(req.params.entityType);
  if (!cfg) {
    return res.status(400).json({ error: 'Invalid entityType. Use producer, processor, distributor, warehouse, or retailer' });
  }

  const items = await cfg.model.find({ isVerified: false }).select('-passwordHash').sort({ createdAt: -1 });
  return res.json(items);
};

exports.pendingAllEntities = async (_req, res) => {
  const [producers, processors, distributors, warehouses, retailers] = await Promise.all([
    Producer.find({ isVerified: false }).select('-passwordHash').sort({ createdAt: -1 }),
    Processor.find({ isVerified: false }).select('-passwordHash').sort({ createdAt: -1 }),
    Distributor.find({ isVerified: false }).select('-passwordHash').sort({ createdAt: -1 }),
    Warehouse.find({ isVerified: false }).select('-passwordHash').sort({ createdAt: -1 }),
    Retailer.find({ isVerified: false }).select('-passwordHash').sort({ createdAt: -1 })
  ]);

  return res.json({
    producer: producers,
    processor: processors,
    distributor: distributors,
    warehouse: warehouses,
    retailer: retailers
  });
};

exports.verifyEntity = async (req, res) => {
  const cfg = getEntityConfig(req.params.entityType);
  if (!cfg) {
    return res.status(400).json({ error: 'Invalid entityType. Use producer, processor, distributor, warehouse, or retailer' });
  }

  const entityId = req.params.entityId;
  const updated = await cfg.model.findByIdAndUpdate(
    entityId,
    { isVerified: true, verifiedAt: new Date(), verifiedBy: req.user.userId },
    { new: true }
  ).select('-passwordHash');

  if (!updated) return res.status(404).json({ error: `${req.params.entityType} not found` });
  return res.json(updated);
};
