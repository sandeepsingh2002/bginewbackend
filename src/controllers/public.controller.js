const ProcessedProduct = require('../models/ProcessedProduct');
const RawProduct = require('../models/RawProduct');
const Processor = require('../models/Processor');
const Batch = require('../models/Batch');
const Producer = require('../models/Producer');
const Warehouse = require('../models/Warehouse');
const Retailer = require('../models/Retailer');

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
