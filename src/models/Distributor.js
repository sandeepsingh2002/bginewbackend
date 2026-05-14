const mongoose = require('mongoose');

const distributorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  companyName: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Distributor', distributorSchema);
