const bcrypt = require('bcryptjs');
const Producer = require('../models/Producer');
const RawProduct = require('../models/RawProduct');
const { signToken } = require('../utils/auth');
const { generateRawId } = require('../utils/generateId');

exports.register = async (req, res) => {
  const { name, email, password, producerType } = req.body;
  if (!name || !email || !password || !producerType) return res.status(400).json({ error: 'Missing fields' });
  const exists = await Producer.findOne({ email });
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const producer = await Producer.create({ name, email, passwordHash, producerType });
  return res.status(201).json({ id: producer._id, isVerified: producer.isVerified });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const producer = await Producer.findOne({ email });
  if (!producer || !(await bcrypt.compare(password, producer.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.json({ token: signToken({ userId: producer._id, role: 'producer', producerType: producer.producerType }) });
};

exports.me = async (req, res) => {
  const producer = await Producer.findById(req.user.userId).select('-passwordHash');
  if (!producer) return res.status(404).json({ error: 'Producer not found' });
  return res.json(producer);
};

exports.addRawProduct = async (req, res) => {
  const { producerType, userId } = req.user;
  const rawProductId = generateRawId();

  const payload = {
    rawProductId,
    producerId: userId,
    producerType,
    qrCodeUrl: `${process.env.BASE_URL || ''}/qr/${rawProductId}.png`
  };

  if (producerType === 'farmer') payload.farmFields = req.body;
  else if (producerType === 'wood_collector') payload.woodFields = req.body;
  else if (producerType === 'dairy_meat_producer') payload.dairyMeatFields = req.body;
  else return res.status(400).json({ error: 'Unsupported producer type' });

  const product = await RawProduct.create(payload);
  return res.status(201).json({ rawProductId: product.rawProductId, qrCodeUrl: product.qrCodeUrl });
};

exports.listOwnRawProducts = async (req, res) => {
  const items = await RawProduct.find({ producerId: req.user.userId }).sort({ createdAt: -1 });
  return res.json(items);
};

exports.getOwnRawProductById = async (req, res) => {
  const item = await RawProduct.findOne({
    rawProductId: req.params.rawProductId,
    producerId: req.user.userId
  });
  if (!item) return res.status(404).json({ error: 'Raw product not found' });
  return res.json(item);
};
