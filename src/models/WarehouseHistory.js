const mongoose = require('mongoose');

const warehouseHistorySchema = new mongoose.Schema({
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  masterProductId: { type: String, required: true },
  receivedAt: Date,
  quantityReceived: Number,
  storageTemp: Number,
  storageHumidity: Number,
  dispatchedAt: Date,
  notes: String
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('WarehouseHistory', warehouseHistorySchema);
