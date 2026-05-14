const mongoose = require('mongoose');

const retailerHistorySchema = new mongoose.Schema({
  retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer', required: true },
  masterProductId: { type: String, required: true },
  receivedAt: Date,
  shelfLocation: String,
  notes: String
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('RetailerHistory', retailerHistorySchema);
