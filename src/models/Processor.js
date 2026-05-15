const mongoose = require('mongoose');

const processorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  companyName: { type: String, required: true },
  gstinNumber: { type: String, unique: true, sparse: true },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  geoLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Processor', processorSchema);
