const mongoose = require('mongoose');

const distributorHistorySchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  masterProductId: { type: String, required: true },
  leg: { type: String, enum: ['leg1', 'leg2'], required: true },
  dispatchedAt: Date,
  receivedAt: Date,
  vehicleId: String,
  startTemp: Number,
  endTemp: Number,
  notes: String
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('DistributorHistory', distributorHistorySchema);
