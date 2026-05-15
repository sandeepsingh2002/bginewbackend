const mongoose = require('mongoose');

const processorInventorySchema = new mongoose.Schema({
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true, unique: true, index: true },
  batchIds: { type: [String], default: [] }
}, { timestamps: { createdAt: true, updatedAt: true } });

module.exports = mongoose.model('ProcessorInventory', processorInventorySchema);
