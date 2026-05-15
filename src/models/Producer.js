const mongoose = require('mongoose');

const producerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  producerType: { type: String, enum: ['farmer', 'wood_collector', 'dairy_meat_producer'], required: true },
  geoLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('Producer', producerSchema);
