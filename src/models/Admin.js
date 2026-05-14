const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Admin', adminSchema);
