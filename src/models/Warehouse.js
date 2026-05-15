const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  warehouseName: { type: String, required: true },
  location: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Warehouse', warehouseSchema);
