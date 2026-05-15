const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Producer = require('../models/Producer');
const Processor = require('../models/Processor');
const Distributor = require('../models/Distributor');
const Warehouse = require('../models/Warehouse');
const Retailer = require('../models/Retailer');
const ProcessedProduct = require('../models/ProcessedProduct');
const RawProduct = require('../models/RawProduct');
const Batch = require('../models/Batch');
const ProcessorHistory = require('../models/ProcessorHistory');
const DistributorHistory = require('../models/DistributorHistory');
const WarehouseHistory = require('../models/WarehouseHistory');
const RetailerHistory = require('../models/RetailerHistory');
const Report = require('../models/Report');
const { getCityFromReverseGeocode } = require('../utils/reverseGeocode');
const { getMPRTOCode } = require('../utils/mpRtoCode');
const { signToken } = require('../utils/auth');

const ENTITY_MODELS = {
  producer: { model: Producer, idParam: 'producerId' },
  processor: { model: Processor, idParam: 'processorId' },
  distributor: { model: Distributor, idParam: 'distributorId' },
  warehouse: { model: Warehouse, idParam: 'warehouseId' },
  retailer: { model: Retailer, idParam: 'retailerId' }
};

const getEntityConfig = (entityType) => ENTITY_MODELS[String(entityType || '').toLowerCase()];

const normalizeEntityRow = (entityType, item) => ({
  entityType,
  entityId: String(item._id),
  name: item.name,
  email: item.email,
  geoLocation: item.geoLocation || null,
  isVerified: item.isVerified,
  createdAt: item.createdAt
});

const enrichRegion = async (row) => {
  if (!row.geoLocation || typeof row.geoLocation.lat !== 'number' || typeof row.geoLocation.lng !== 'number') {
    return { ...row, regionCode: 'MP00', regionCity: null };
  }

  try {
    const city = await getCityFromReverseGeocode(row.geoLocation.lat, row.geoLocation.lng);
    const regionCode = getMPRTOCode(city) || 'MP00';
    return { ...row, regionCode, regionCity: city || null };
  } catch (_err) {
    return { ...row, regionCode: 'MP00', regionCity: null };
  }
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const monthKey = (date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const aggregateMonthly = async (Model, match = {}) => {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const map = new Map();
  for (const r of rows) {
    const key = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
    map.set(key, r.count);
  }
  return map;
};

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

exports.dashboardUsers = async (req, res) => {
  const requestedEntityType = String(req.query.entityType || '').toLowerCase();
  const entityTypes = requestedEntityType
    ? [requestedEntityType]
    : ['producer', 'processor', 'distributor', 'warehouse', 'retailer'];

  const invalid = entityTypes.find((t) => !ENTITY_MODELS[t]);
  if (invalid) {
    return res.status(400).json({ error: 'Invalid entityType. Use producer, processor, distributor, warehouse, or retailer' });
  }

  const rows = [];
  for (const type of entityTypes) {
    const cfg = ENTITY_MODELS[type];
    const items = await cfg.model.find().select('name email geoLocation isVerified createdAt').sort({ createdAt: -1 }).lean();
    rows.push(...items.map((item) => normalizeEntityRow(type, item)));
  }

  const enriched = await Promise.all(rows.map(enrichRegion));
  enriched.sort((a, b) => {
    if (a.regionCode !== b.regionCode) return a.regionCode.localeCompare(b.regionCode);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return res.json(enriched);
};

exports.dashboardEntityDetails = async (req, res) => {
  const { entityType, entityId } = req.params;
  const cfg = getEntityConfig(entityType);
  if (!cfg) {
    return res.status(400).json({ error: 'Invalid entityType. Use producer, processor, distributor, warehouse, or retailer' });
  }

  const profile = await cfg.model.findById(entityId).select('-passwordHash').lean();
  if (!profile) return res.status(404).json({ error: `${entityType} not found` });

  if (entityType === 'producer') {
    const rawMaterials = await RawProduct.find({ producerId: entityId }).sort({ createdAt: -1 }).lean();
    const batchIds = await Batch.find({ rawProductIds: { $in: rawMaterials.map((r) => r.rawProductId) } }).select('batchId').lean();
    const batchIdSet = new Set(batchIds.map((b) => b.batchId));
    const products = await ProcessedProduct.find({ 'inputBatches.batchId': { $in: [...batchIdSet] } }).sort({ createdAt: -1 }).lean();
    const reports = await Report.find({ masterProductId: { $in: products.map((p) => p.masterProductId) } }).sort({ createdAt: -1 }).lean();
    return res.json({ profile, rawMaterials, products, reports });
  }

  if (entityType === 'processor') {
    const batches = await Batch.find({ processorId: entityId }).sort({ createdAt: -1 }).lean();
    const products = await ProcessedProduct.find({ processorId: entityId }).sort({ createdAt: -1 }).lean();
    const history = await ProcessorHistory.find({ processorId: entityId }).sort({ createdAt: -1 }).lean();
    const reports = await Report.find({ masterProductId: { $in: products.map((p) => p.masterProductId) } }).sort({ createdAt: -1 }).lean();
    return res.json({ profile, batches, products, history, reports });
  }

  if (entityType === 'distributor') {
    const history = await DistributorHistory.find({ distributorId: entityId }).sort({ createdAt: -1 }).lean();
    const products = await ProcessedProduct.find({
      $or: [{ 'distributionLeg1.distributorId': entityId }, { 'distributionLeg2.distributorId': entityId }]
    }).sort({ createdAt: -1 }).lean();
    const reports = await Report.find({ masterProductId: { $in: products.map((p) => p.masterProductId) } }).sort({ createdAt: -1 }).lean();
    return res.json({ profile, history, products, reports });
  }

  if (entityType === 'warehouse') {
    const history = await WarehouseHistory.find({ warehouseId: entityId }).sort({ createdAt: -1 }).lean();
    const products = await ProcessedProduct.find({ 'warehouseStop.warehouseId': entityId }).sort({ createdAt: -1 }).lean();
    const reports = await Report.find({ masterProductId: { $in: products.map((p) => p.masterProductId) } }).sort({ createdAt: -1 }).lean();
    return res.json({ profile, history, products, reports });
  }

  const history = await RetailerHistory.find({ retailerId: entityId }).sort({ createdAt: -1 }).lean();
  const products = await ProcessedProduct.find({ 'retailerStop.retailerId': entityId }).sort({ createdAt: -1 }).lean();
  const reports = await Report.find({ masterProductId: { $in: products.map((p) => p.masterProductId) } }).sort({ createdAt: -1 }).lean();
  return res.json({ profile, history, products, reports });
};

exports.dashboardTimeseries = async (req, res) => {
  const startDate = parseDateOrNull(req.query.startDate);
  const endDate = parseDateOrNull(req.query.endDate);
  const sort = String(req.query.sort || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  if ((req.query.startDate && !startDate) || (req.query.endDate && !endDate)) {
    return res.status(400).json({ error: 'Invalid date format. Use ISO date (YYYY-MM-DD).' });
  }
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({ error: 'startDate must be less than or equal to endDate.' });
  }

  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) {
      const inclusiveEnd = new Date(endDate);
      inclusiveEnd.setUTCHours(23, 59, 59, 999);
      match.createdAt.$lte = inclusiveEnd;
    }
  }

  const [
    producersByMonth,
    processorsByMonth,
    distributorsByMonth,
    warehousesByMonth,
    retailersByMonth,
    rawAddedByMonth,
    processedAddedByMonth,
    reportsByMonth
  ] = await Promise.all([
    aggregateMonthly(Producer, match),
    aggregateMonthly(Processor, match),
    aggregateMonthly(Distributor, match),
    aggregateMonthly(Warehouse, match),
    aggregateMonthly(Retailer, match),
    aggregateMonthly(RawProduct, match),
    aggregateMonthly(ProcessedProduct, match),
    aggregateMonthly(Report, match)
  ]);

  const allMonths = new Set([
    ...producersByMonth.keys(),
    ...processorsByMonth.keys(),
    ...distributorsByMonth.keys(),
    ...warehousesByMonth.keys(),
    ...retailersByMonth.keys(),
    ...rawAddedByMonth.keys(),
    ...processedAddedByMonth.keys(),
    ...reportsByMonth.keys()
  ]);

  const months = [...allMonths].sort((a, b) => (sort === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));

  const series = months.map((month) => {
    const usersNew =
      (producersByMonth.get(month) || 0) +
      (processorsByMonth.get(month) || 0) +
      (distributorsByMonth.get(month) || 0) +
      (warehousesByMonth.get(month) || 0) +
      (retailersByMonth.get(month) || 0);

    return {
      month,
      usersNew,
      usersNewByEntity: {
        producer: producersByMonth.get(month) || 0,
        processor: processorsByMonth.get(month) || 0,
        distributor: distributorsByMonth.get(month) || 0,
        warehouse: warehousesByMonth.get(month) || 0,
        retailer: retailersByMonth.get(month) || 0
      },
      rawProductsAdded: rawAddedByMonth.get(month) || 0,
      processedProductsAdded: processedAddedByMonth.get(month) || 0,
      productsRemoved: 0,
      reportsCreated: reportsByMonth.get(month) || 0
    };
  });

  return res.json({
    range: {
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null
    },
    sort,
    series
  });
};
