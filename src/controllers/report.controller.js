const Report = require('../models/Report');
const ProcessedProduct = require('../models/ProcessedProduct');

const generateReportId = () => {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `RPT-${Date.now()}-${rand}`;
};

exports.createReport = async (req, res) => {
  const {
    title,
    consumerName,
    reportType = 'general_product_report',
    description,
    imageUrls = [],
    masterProductId
  } = req.body;

  if (!title || !consumerName || !description || !masterProductId) {
    return res.status(400).json({ error: 'title, consumerName, description and masterProductId are required' });
  }

  const product = await ProcessedProduct.findOne({ masterProductId }).select('_id').lean();
  if (!product) return res.status(404).json({ error: 'Master product not found' });

  const report = await Report.create({
    reportId: generateReportId(),
    title,
    consumerName,
    reportType,
    description,
    imageUrls,
    masterProductId,
    phase: 'SEEN'
  });

  return res.status(201).json({ reportId: report.reportId });
};

exports.getReportById = async (req, res) => {
  const report = await Report.findOne({ reportId: req.params.reportId }).lean();
  if (!report) return res.status(404).json({ error: 'Report not found' });
  return res.json(report);
};

exports.getAllReports = async (_req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 }).lean();
  return res.json(reports);
};

exports.updateReportPhase = async (req, res) => {
  const { phase } = req.body;
  const validPhases = ['SEEN', 'ON_INVESTIGATION', 'FIX'];
  if (!validPhases.includes(phase)) {
    return res.status(400).json({ error: 'Invalid phase. Use SEEN, ON_INVESTIGATION, or FIX' });
  }

  const report = await Report.findOneAndUpdate(
    { reportId: req.params.reportId },
    { $set: { phase, phaseUpdatedAt: new Date() } },
    { new: true }
  ).lean();

  if (!report) return res.status(404).json({ error: 'Report not found' });
  return res.json(report);
};

exports.updateReportConclusion = async (req, res) => {
  const { conclusion } = req.body;
  if (!conclusion) return res.status(400).json({ error: 'conclusion is required' });

  const report = await Report.findOne({ reportId: req.params.reportId });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  if (report.phase !== 'FIX') {
    return res.status(409).json({ error: 'Conclusion can only be added when report phase is FIX' });
  }

  report.conclusion = conclusion;
  await report.save();

  return res.json(report);
};
