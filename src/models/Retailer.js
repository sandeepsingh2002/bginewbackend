const mongoose = require('mongoose');

const retailerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  storeName: { type: String, required: true },
  storeLocation: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Retailer', retailerSchema);
