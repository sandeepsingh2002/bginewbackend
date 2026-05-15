const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  consumerName: { type: String, required: true },
  reportType: {
    type: String,
    required: true,
    enum: ['general_product_report'],
    default: 'general_product_report'
  },
  description: { type: String, required: true },
  imageUrls: [{ type: String }],
  masterProductId: { type: String, required: true },
  phase: {
    type: String,
    enum: ['SEEN', 'ON_INVESTIGATION', 'FIX'],
    default: 'SEEN'
  },
  conclusion: { type: String, default: null },
  phaseUpdatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Report', reportSchema);
