const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  warehouseName: { type: String, required: true },
  location: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Warehouse', warehouseSchema);
