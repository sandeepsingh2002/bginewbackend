const mongoose = require('mongoose');
const { FARM_CROP_ENUM, WOOD_TYPE_ENUM, DAIRY_MEAT_PRODUCT_ENUM } = require('./RawProduct');

const BATCH_STATUSES = ['in_inventory', 'consumed', 'removed'];
const BATCH_PRODUCT_TYPES = [...new Set([...FARM_CROP_ENUM, ...WOOD_TYPE_ENUM, ...DAIRY_MEAT_PRODUCT_ENUM])];

const processorBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true, index: true },
  batchName: { type: String, required: true },
  productType: { type: String, enum: BATCH_PRODUCT_TYPES, required: true, index: true },
  totalWeight: { type: Number, default: 0, min: 0 },
  rawProductIds: { type: [String], default: [] },
  status: { type: String, enum: BATCH_STATUSES, default: 'in_inventory', required: true, index: true },
  consumedInProductQrText: String,
  consumedAt: Date,
  removedAt: Date
}, { timestamps: { createdAt: true, updatedAt: true } });

processorBatchSchema.index({ processorId: 1, status: 1, createdAt: -1 });

module.exports = {
  ProcessorBatch: mongoose.model('ProcessorBatch', processorBatchSchema),
  BATCH_STATUSES,
  BATCH_PRODUCT_TYPES
};
