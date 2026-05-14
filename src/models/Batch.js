const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchId: { type: String, unique: true, required: true },
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true },
  rawProductIds: [{ type: String }],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closedAt: Date
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Batch', batchSchema);
