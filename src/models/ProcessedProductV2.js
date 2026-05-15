const mongoose = require('mongoose');

const processedProductV2Schema = new mongoose.Schema({
  customQrText: { type: String, required: true, unique: true, index: true },
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true, index: true },
  companyName: { type: String, required: true },
  productName: { type: String, required: true },
  manufacturingDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  quantityProduced: { type: Number, required: true, min: 0 },
  batchIds: { type: [String], default: [] },
  totalInputWeight: { type: Number, default: 0, min: 0 }
}, { timestamps: { createdAt: true, updatedAt: false } });

processedProductV2Schema.index({ processorId: 1, createdAt: -1 });

module.exports = mongoose.model('ProcessedProductV2', processedProductV2Schema);
