const mongoose = require('mongoose');

const chainSchema = new mongoose.Schema({
  chainId: { type: String, required: true, unique: true, index: true },
  customQrText: { type: String, required: true, unique: true, index: true },
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true, index: true },
  processedProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessedProductV2', required: true },
  batchIds: { type: [String], default: [] }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Chain', chainSchema);
