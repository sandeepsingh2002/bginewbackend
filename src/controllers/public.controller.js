const ProcessedProduct = require('../models/ProcessedProduct');
const RawProduct = require('../models/RawProduct');
const Processor = require('../models/Processor');
const ProcessorHistory = require('../models/ProcessorHistory');
const Batch = require('../models/Batch');
const Producer = require('../models/Producer');
const Distributor = require('../models/Distributor');
const DistributorHistory = require('../models/DistributorHistory');
const Warehouse = require('../models/Warehouse');
const WarehouseHistory = require('../models/WarehouseHistory');
const Retailer = require('../models/Retailer');
const RetailerHistory = require('../models/RetailerHistory');
const { TransportSession } = require('../models/TransportSession');
const { TransportLifecycleEvent } = require('../models/TransportLifecycleEvent');

exports.getProduct = async (req, res) => {
  const product = await ProcessedProduct.findOne({ masterProductId: req.params.masterProductId }).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const processor = await Processor.findById(product.processorId).select('companyName').lean();

  const enrichedBatches = await Promise.all((product.inputBatches || []).map(async (b) => {
    const batch = await Batch.findOne({ batchId: b.batchId }).lean();
    const raws = await RawProduct.find({ rawProductId: { $in: batch?.rawProductIds || [] } }).lean();
    const withProducer = await Promise.all(raws.map(async (r) => {
      const prod = await Producer.findById(r.producerId).select('name').lean();
      return { ...r, producerName: prod?.name || null };
    }));
    return { ...b, rawProducts: withProducer };
  }));

  let warehouseName = null;
  let storeName = null;
  if (product.warehouseStop?.warehouseId) {
    const w = await Warehouse.findById(product.warehouseStop.warehouseId).select('warehouseName').lean();
    warehouseName = w?.warehouseName || null;
  }
  if (product.retailerStop?.retailerId) {
    const r = await Retailer.findById(product.retailerStop.retailerId).select('storeName').lean();
    storeName = r?.storeName || null;
  }

  return res.json({
    ...product,
    processor,
    inputBatches: enrichedBatches,
    warehouseStop: { ...product.warehouseStop, warehouseName },
    retailerStop: { ...product.retailerStop, storeName }
  });
};

exports.getRawProduct = async (req, res) => {
  const raw = await RawProduct.findOne({ rawProductId: req.params.rawProductId }).lean();
  if (!raw) return res.status(404).json({ error: 'Raw product not found' });
  const producer = await Producer.findById(raw.producerId).select('name producerType').lean();
  return res.json({ ...raw, producerName: producer?.name || null });
};

exports.getTraceability = async (req, res) => {
  const { masterProductId } = req.params;

  const product = await ProcessedProduct.findOne({ masterProductId }).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const processor = await Processor.findById(product.processorId).select('name companyName email').lean();
  const processorHistory = await ProcessorHistory.findOne({ masterProductId }).lean();

  const inputBatches = await Promise.all((product.inputBatches || []).map(async (inputBatch) => {
    const batch = await Batch.findOne({ batchId: inputBatch.batchId }).lean();
    const rawProducts = await RawProduct.find({ rawProductId: { $in: batch?.rawProductIds || [] } }).lean();

    const rawProductsWithProducer = await Promise.all(rawProducts.map(async (rawProduct) => {
      const producer = await Producer.findById(rawProduct.producerId)
        .select('name producerType isVerified verifiedAt')
        .lean();

      return {
        ...rawProduct,
        producer
      };
    }));

    return {
      ...inputBatch,
      batch,
      rawProducts: rawProductsWithProducer
    };
  }));

  const leg1History = await DistributorHistory.findOne({ masterProductId, leg: 'leg1' }).lean();
  const leg2History = await DistributorHistory.findOne({ masterProductId, leg: 'leg2' }).lean();
  const warehouseHistory = await WarehouseHistory.findOne({ masterProductId }).lean();
  const retailerHistory = await RetailerHistory.findOne({ masterProductId }).lean();
  const transportSessions = await TransportSession.find({ masterProductId }).sort({ createdAt: -1 }).lean();
  const transportLifecycle = await TransportLifecycleEvent.find({ masterProductId }).sort({ createdAt: 1 }).lean();

  const leg1DistributorId = product.distributionLeg1?.distributorId || leg1History?.distributorId;
  const leg2DistributorId = product.distributionLeg2?.distributorId || leg2History?.distributorId;
  const warehouseId = product.warehouseStop?.warehouseId || warehouseHistory?.warehouseId;
  const retailerId = product.retailerStop?.retailerId || retailerHistory?.retailerId;

  const leg1Distributor = leg1DistributorId
    ? await Distributor.findById(leg1DistributorId).select('name companyName email').lean()
    : null;

  const leg2Distributor = leg2DistributorId
    ? await Distributor.findById(leg2DistributorId).select('name companyName email').lean()
    : null;

  const warehouse = warehouseId
    ? await Warehouse.findById(warehouseId).select('name warehouseName location email').lean()
    : null;

  const retailer = retailerId
    ? await Retailer.findById(retailerId).select('name storeName storeLocation email').lean()
    : null;

  return res.json({
    masterProductId,
    product,
    processing: {
      processor,
      history: processorHistory,
      inputBatches
    },
    distribution: {
      leg1: {
        distributor: leg1Distributor,
        details: product.distributionLeg1 || null,
        history: leg1History || null
      },
      leg2: {
        distributor: leg2Distributor,
        details: product.distributionLeg2 || null,
        history: leg2History || null
      }
    },
    warehouse: {
      profile: warehouse,
      details: product.warehouseStop || null,
      history: warehouseHistory || null
    },
    transport: {
      sessions: transportSessions,
      lifecycle: transportLifecycle
    },
    retailer: {
      profile: retailer,
      details: product.retailerStop || null,
      history: retailerHistory || null
    }
  });
};
