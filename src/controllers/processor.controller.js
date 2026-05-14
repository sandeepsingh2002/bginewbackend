const bcrypt = require('bcryptjs');
const Processor = require('../models/Processor');
const Batch = require('../models/Batch');
const RawProduct = require('../models/RawProduct');
const ProcessedProduct = require('../models/ProcessedProduct');
const ProcessorHistory = require('../models/ProcessorHistory');
const { signToken } = require('../utils/auth');
const { generateBatchId, generateMasterId } = require('../utils/generateId');

exports.register = async (req, res) => {
  const { name, email, password, companyName } = req.body;
  const exists = await Processor.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await Processor.create({ name, email, passwordHash, companyName });
  return res.status(201).json({ id: user._id });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await Processor.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({ token: signToken({ userId: user._id, role: 'processor' }) });
};

exports.createBatch = async (req, res) => {
  const batch = await Batch.create({ batchId: generateBatchId(), processorId: req.user.userId, rawProductIds: [] });
  return res.status(201).json(batch);
};

exports.scanRawProduct = async (req, res) => {
  const { rawProductId } = req.body;
  const batch = await Batch.findOne({ batchId: req.params.batchId, processorId: req.user.userId, status: 'open' });
  if (!batch) return res.status(404).json({ error: 'Open batch not found' });

  const raw = await RawProduct.findOne({ rawProductId, status: 'available' });
  if (!raw) return res.status(409).json({ error: 'Raw product unavailable' });

  if (batch.rawProductIds.includes(rawProductId)) return res.status(409).json({ error: 'Already scanned into this batch' });

  batch.rawProductIds.push(rawProductId);
  await batch.save();
  raw.status = 'in_batch';
  await raw.save();

  return res.json(batch);
};

exports.getBatch = async (req, res) => {
  const batch = await Batch.findOne({ batchId: req.params.batchId, processorId: req.user.userId });
  if (!batch) return res.status(404).json({ error: 'Batch not found' });
  const raws = await RawProduct.find({ rawProductId: { $in: batch.rawProductIds } });
  return res.json({ batch, rawProducts: raws });
};

exports.closeBatch = async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    { batchId: req.params.batchId, processorId: req.user.userId, status: 'open' },
    { status: 'closed', closedAt: new Date() },
    { new: true }
  );
  if (!batch) return res.status(404).json({ error: 'Open batch not found' });
  return res.json(batch);
};

exports.createProcessedProduct = async (req, res) => {
  const {
    productName, productCategory, totalQuantityProduced, quantityUnit, inputBatches,
    manufacturingDate, expiryDate, otherIngredients
  } = req.body;

  const batchIds = (inputBatches || []).map((b) => b.batchId);
  const batches = await Batch.find({ batchId: { $in: batchIds }, processorId: req.user.userId, status: 'closed' });
  if (batches.length !== batchIds.length) return res.status(400).json({ error: 'All input batches must be closed and belong to processor' });

  const masterProductId = generateMasterId();
  const product = await ProcessedProduct.create({
    masterProductId,
    processorId: req.user.userId,
    productName,
    productCategory,
    totalQuantityProduced,
    quantityUnit,
    inputBatches,
    manufacturingDate,
    expiryDate,
    otherIngredients,
    qrCodeUrl: `${process.env.BASE_URL || ''}/qr/${masterProductId}.png`
  });

  await ProcessorHistory.create({
    processorId: req.user.userId,
    masterProductId,
    batchIds,
    manufacturingDate,
    expiryDate
  });

  return res.status(201).json({ masterProductId: product.masterProductId, qrCodeUrl: product.qrCodeUrl });
};

exports.listOwnProducts = async (req, res) => {
  const items = await ProcessedProduct.find({ processorId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(items);
};
