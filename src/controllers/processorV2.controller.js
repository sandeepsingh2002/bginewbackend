const bcrypt = require('bcryptjs');
const Processor = require('../models/Processor');
const Producer = require('../models/Producer');
const RawProduct = require('../models/RawProduct');
const ProcessorInventory = require('../models/ProcessorInventory');
const { ProcessorBatch, BATCH_PRODUCT_TYPES } = require('../models/ProcessorBatch');
const ProcessedProductV2 = require('../models/ProcessedProductV2');
const Chain = require('../models/Chain');
const { signToken } = require('../utils/auth');
const { generateCustomIdFromGeo } = require('../utils/customId');

const isValidLocation = (location) => (
  location &&
  typeof location.lat === 'number' &&
  typeof location.lng === 'number'
);

const getProcessorLocation = (processor) => processor?.currentLocation || processor?.geoLocation;

const getRawProductType = (rawProduct) => {
  if (rawProduct.producerType === 'farmer') return rawProduct?.farmFields?.cropName;
  if (rawProduct.producerType === 'wood_collector') return rawProduct?.woodFields?.woodType;
  if (rawProduct.producerType === 'dairy_meat_producer') return rawProduct?.dairyMeatFields?.productType;
  return null;
};

const getRawProductQuantity = (rawProduct) => {
  if (rawProduct.producerType === 'farmer') return rawProduct?.farmFields?.quantity;
  if (rawProduct.producerType === 'wood_collector') return rawProduct?.woodFields?.quantity;
  if (rawProduct.producerType === 'dairy_meat_producer') return rawProduct?.dairyMeatFields?.quantity;
  return null;
};

exports.register = async (req, res) => {
  const { companyName, email, gstinNumber, password, currentLocation } = req.body;

  if (!companyName || !email || !gstinNumber || !password || !isValidLocation(currentLocation)) {
    return res.status(400).json({ error: 'companyName, email, gstinNumber, password and valid currentLocation are required' });
  }

  const [emailExists, gstinExists] = await Promise.all([
    Processor.findOne({ email }).lean(),
    Processor.findOne({ gstinNumber }).lean()
  ]);
  if (emailExists) return res.status(409).json({ error: 'Email already exists' });
  if (gstinExists) return res.status(409).json({ error: 'GSTIN already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const processor = await Processor.create({
    name: companyName,
    companyName,
    email,
    gstinNumber,
    passwordHash,
    currentLocation,
    geoLocation: currentLocation
  });

  await ProcessorInventory.create({ processorId: processor._id, batchIds: [] });
  return res.status(201).json({ id: processor._id, companyName: processor.companyName, isVerified: processor.isVerified });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const processor = await Processor.findOne({ email });
  if (!processor || !(await bcrypt.compare(password, processor.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.json({ token: signToken({ userId: processor._id, role: 'processor', apiVersion: 'v2' }) });
};

exports.getInventory = async (req, res) => {
  const inventory = await ProcessorInventory.findOneAndUpdate(
    { processorId: req.user.userId },
    { $setOnInsert: { processorId: req.user.userId, batchIds: [] } },
    { new: true, upsert: true }
  ).lean();

  const batches = await ProcessorBatch.find({
    processorId: req.user.userId,
    batchId: { $in: inventory.batchIds }
  }).sort({ createdAt: -1 }).lean();

  return res.json({
    inventoryId: inventory._id,
    processorId: inventory.processorId,
    totalBatches: inventory.batchIds.length,
    batchIds: inventory.batchIds,
    batches
  });
};

exports.listInventoryBatches = async (req, res) => {
  const inventory = await ProcessorInventory.findOneAndUpdate(
    { processorId: req.user.userId },
    { $setOnInsert: { processorId: req.user.userId, batchIds: [] } },
    { new: true, upsert: true }
  ).lean();

  const batches = await ProcessorBatch.find({
    processorId: req.user.userId,
    batchId: { $in: inventory.batchIds }
  }).sort({ createdAt: -1 }).lean();

  return res.json(batches);
};

exports.listBatches = async (req, res) => {
  const batches = await ProcessorBatch.find({ processorId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(batches);
};

exports.createBatch = async (req, res) => {
  const { batchName, productType } = req.body;
  const normalizedProductType = String(productType || '').trim().toLowerCase();

  if (!batchName || !normalizedProductType) {
    return res.status(400).json({ error: 'batchName and productType are required' });
  }
  if (!BATCH_PRODUCT_TYPES.includes(normalizedProductType)) {
    return res.status(400).json({ error: `Invalid productType. Allowed values: ${BATCH_PRODUCT_TYPES.join(', ')}` });
  }

  const processor = await Processor.findById(req.user.userId).select('currentLocation geoLocation').lean();
  const batchId = await generateCustomIdFromGeo(getProcessorLocation(processor), 'MP04');

  const batch = await ProcessorBatch.create({
    batchId,
    processorId: req.user.userId,
    batchName,
    productType: normalizedProductType,
    totalWeight: 0,
    rawProductIds: [],
    status: 'in_inventory'
  });

  await ProcessorInventory.findOneAndUpdate(
    { processorId: req.user.userId },
    {
      $setOnInsert: { processorId: req.user.userId, batchIds: [] },
      $addToSet: { batchIds: batch.batchId }
    },
    { upsert: true }
  );

  return res.status(201).json(batch);
};

exports.addBatchToInventory = async (req, res) => {
  const { batchId } = req.params;
  const batch = await ProcessorBatch.findOne({ batchId, processorId: req.user.userId });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  if (batch.status === 'consumed') {
    return res.status(409).json({ error: 'Consumed batch cannot be added back to inventory' });
  }

  await ProcessorInventory.findOneAndUpdate(
    { processorId: req.user.userId },
    {
      $setOnInsert: { processorId: req.user.userId, batchIds: [] },
      $addToSet: { batchIds: batchId }
    },
    { upsert: true }
  );

  if (batch.status === 'removed') {
    batch.status = 'in_inventory';
    batch.removedAt = undefined;
    await batch.save();
  }

  return res.json({ message: 'Batch added to inventory', batch });
};

exports.removeBatchFromInventory = async (req, res) => {
  const { batchId } = req.params;
  const inventory = await ProcessorInventory.findOne({ processorId: req.user.userId });
  if (!inventory || !inventory.batchIds.includes(batchId)) {
    return res.status(404).json({ error: 'Batch not found in inventory' });
  }

  await ProcessorInventory.updateOne(
    { processorId: req.user.userId },
    { $pull: { batchIds: batchId } }
  );

  const batch = await ProcessorBatch.findOneAndUpdate(
    { batchId, processorId: req.user.userId, status: 'in_inventory' },
    { status: 'removed', removedAt: new Date() },
    { new: true }
  );
  if (!batch) return res.status(404).json({ error: 'Active batch not found' });

  return res.json({ message: 'Batch removed from inventory', batch });
};

exports.scanIntoBatch = async (req, res) => {
  const { batchId } = req.params;
  const { productString } = req.body;
  if (!productString) return res.status(400).json({ error: 'productString is required' });

  const batch = await ProcessorBatch.findOne({
    batchId,
    processorId: req.user.userId,
    status: 'in_inventory'
  });
  if (!batch) return res.status(404).json({ error: 'Batch not found in inventory' });

  const inventory = await ProcessorInventory.findOne({ processorId: req.user.userId }).lean();
  if (!inventory || !inventory.batchIds.includes(batchId)) {
    return res.status(409).json({ error: 'Batch is not currently part of inventory' });
  }

  if (batch.rawProductIds.includes(productString)) {
    return res.status(409).json({ error: 'Raw product already scanned in this batch' });
  }

  const rawProduct = await RawProduct.findOne({ rawProductId: productString, status: 'available' });
  if (!rawProduct) return res.status(404).json({ error: 'Raw product not found or unavailable' });

  const rawType = String(getRawProductType(rawProduct) || '').toLowerCase();
  if (!rawType || rawType !== batch.productType) {
    return res.status(409).json({ error: `Product type mismatch. Batch accepts ${batch.productType}` });
  }

  const quantity = Number(getRawProductQuantity(rawProduct));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Scanned raw product does not have a valid quantity' });
  }

  batch.rawProductIds.push(rawProduct.rawProductId);
  batch.totalWeight = Number(batch.totalWeight || 0) + quantity;
  await batch.save();

  rawProduct.status = 'in_batch';
  await rawProduct.save();

  return res.json({
    batchId: batch.batchId,
    productType: batch.productType,
    scannedRawProductId: rawProduct.rawProductId,
    addedWeight: quantity,
    totalWeight: batch.totalWeight
  });
};

exports.createNewProduct = async (req, res) => {
  const {
    productName,
    manufacturingDate,
    expiryDate,
    companyName,
    quantityProduced,
    productBatchQuantity,
    batchIds
  } = req.body;

  const outputQuantity = Number(quantityProduced ?? productBatchQuantity);
  if (!productName || !manufacturingDate || !expiryDate || !Array.isArray(batchIds) || batchIds.length === 0) {
    return res.status(400).json({ error: 'productName, manufacturingDate, expiryDate and batchIds are required' });
  }
  if (!Number.isFinite(outputQuantity) || outputQuantity <= 0) {
    return res.status(400).json({ error: 'quantityProduced (or productBatchQuantity) must be a positive number' });
  }

  const uniqueBatchIds = [...new Set(batchIds)];
  const inventory = await ProcessorInventory.findOne({ processorId: req.user.userId });
  if (!inventory) return res.status(404).json({ error: 'Inventory not found for processor' });

  const missingFromInventory = uniqueBatchIds.filter((id) => !inventory.batchIds.includes(id));
  if (missingFromInventory.length > 0) {
    return res.status(400).json({ error: `These batches are not in inventory: ${missingFromInventory.join(', ')}` });
  }

  const batches = await ProcessorBatch.find({
    batchId: { $in: uniqueBatchIds },
    processorId: req.user.userId,
    status: 'in_inventory'
  });
  if (batches.length !== uniqueBatchIds.length) {
    return res.status(400).json({ error: 'All selected batches must be in inventory and belong to the processor' });
  }

  const processor = await Processor.findById(req.user.userId).select('companyName email gstinNumber currentLocation geoLocation').lean();
  const customQrText = await generateCustomIdFromGeo(getProcessorLocation(processor), 'MP04');
  const totalInputWeight = batches.reduce((sum, batch) => sum + Number(batch.totalWeight || 0), 0);

  const product = await ProcessedProductV2.create({
    customQrText,
    processorId: req.user.userId,
    companyName: companyName || processor.companyName,
    productName,
    manufacturingDate,
    expiryDate,
    quantityProduced: outputQuantity,
    batchIds: uniqueBatchIds,
    totalInputWeight
  });

  const chain = await Chain.create({
    chainId: customQrText,
    customQrText,
    processorId: req.user.userId,
    processedProductId: product._id,
    batchIds: uniqueBatchIds
  });

  await Promise.all([
    ProcessorInventory.updateOne(
      { processorId: req.user.userId },
      { $pull: { batchIds: { $in: uniqueBatchIds } } }
    ),
    ProcessorBatch.updateMany(
      { processorId: req.user.userId, batchId: { $in: uniqueBatchIds } },
      { status: 'consumed', consumedAt: new Date(), consumedInProductQrText: customQrText }
    )
  ]);

  return res.status(201).json({
    customQrText: product.customQrText,
    chainId: chain.chainId,
    productId: product._id,
    usedBatchIds: uniqueBatchIds
  });
};

exports.listProducts = async (req, res) => {
  const products = await ProcessedProductV2.find({ processorId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(products);
};

exports.getChainByQrText = async (req, res) => {
  const customQrText = req.params.customQrText;

  const chain = await Chain.findOne({ customQrText }).lean();
  if (!chain) return res.status(404).json({ error: 'Chain not found for this QR text' });

  const [product, processor, batches] = await Promise.all([
    ProcessedProductV2.findById(chain.processedProductId).lean(),
    Processor.findById(chain.processorId).select('companyName email gstinNumber currentLocation').lean(),
    ProcessorBatch.find({ processorId: chain.processorId, batchId: { $in: chain.batchIds } }).lean()
  ]);
  if (!product) return res.status(404).json({ error: 'Processed product not found' });

  const rawProductIds = [...new Set(batches.flatMap((batch) => batch.rawProductIds || []))];
  const rawProducts = rawProductIds.length
    ? await RawProduct.find({ rawProductId: { $in: rawProductIds } }).lean()
    : [];

  const producerIdSet = new Set(rawProducts.map((raw) => String(raw.producerId)).filter(Boolean));
  const producerIds = [...producerIdSet];
  const producers = producerIds.length
    ? await Producer.find({ _id: { $in: producerIds } }).select('name email producerType geoLocation').lean()
    : [];

  const producerById = new Map(producers.map((producer) => [String(producer._id), producer]));
  const batchTrace = batches.map((batch) => {
    const raws = rawProducts.filter((raw) => batch.rawProductIds.includes(raw.rawProductId));
    const batchProducerIds = [...new Set(raws.map((raw) => String(raw.producerId)).filter(Boolean))];
    const farmerIds = [
      ...new Set(
        raws
          .filter((raw) => raw.producerType === 'farmer')
          .map((raw) => String(raw.producerId))
          .filter(Boolean)
      )
    ];

    return {
      batchId: batch.batchId,
      batchName: batch.batchName,
      productType: batch.productType,
      totalWeight: batch.totalWeight,
      rawProductCount: raws.length,
      rawProductIds: batch.rawProductIds,
      producerCount: batchProducerIds.length,
      farmerCount: farmerIds.length
    };
  });

  const farmerProducerIds = [
    ...new Set(
      rawProducts
        .filter((raw) => raw.producerType === 'farmer')
        .map((raw) => String(raw.producerId))
        .filter(Boolean)
    )
  ];

  return res.json({
    chainId: chain.chainId,
    customQrText: chain.customQrText,
    processor: {
      companyName: processor?.companyName,
      email: processor?.email,
      gstinNumber: processor?.gstinNumber,
      currentLocation: processor?.currentLocation
    },
    product,
    traceability: {
      totals: {
        totalBatches: batches.length,
        totalRawProducts: rawProducts.length,
        totalProducers: producerIds.length,
        totalFarmers: farmerProducerIds.length
      },
      batches: batchTrace,
      rawProducts,
      producers: producerIds.map((id) => producerById.get(id)).filter(Boolean)
    }
  });
};
