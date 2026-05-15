const mongoose = require('mongoose');

const environmentalRecordSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  temperature: { type: Number, required: true },
  humidity: { type: Number, required: true }
}, { _id: false });

const warehouseBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  masterProductId: { type: String, required: true, index: true },
  productName: { type: String, required: true },
  productType: { type: String, required: true },
  quantity: { type: Number, required: true },
  chainId: { type: String, required: true },
  scannedAt: { type: Date, default: Date.now, required: true },
  debitedAt: Date,
  status: { type: String, enum: ['in_inventory', 'debited'], default: 'in_inventory', required: true, index: true },
  environmentalRecords: {
    type: [environmentalRecordSchema],
    default: []
  }
}, { timestamps: { createdAt: true, updatedAt: true } });

warehouseBatchSchema.index({ warehouseId: 1, status: 1, scannedAt: -1 });

module.exports = mongoose.model('WarehouseBatch', warehouseBatchSchema);
