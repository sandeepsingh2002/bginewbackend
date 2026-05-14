const mongoose = require('mongoose');

const processorHistorySchema = new mongoose.Schema({
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true },
  masterProductId: { type: String, required: true },
  batchIds: [String],
  manufacturingDate: Date,
  expiryDate: Date
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('ProcessorHistory', processorHistorySchema);
