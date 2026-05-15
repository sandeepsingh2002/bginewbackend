const mongoose = require('mongoose');

const PRODUCT_TYPES = ['short_shelf_life', 'medium_shelf_life', 'long_shelf_life', 'frozen', 'fragile'];
const SENDER_TYPES = ['producer', 'processor', 'warehouse'];
const SESSION_STATUSES = ['active', 'completed'];

const trackingPointSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  truckTemperature: Number,
  humidity: Number
}, { _id: false });

const coordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true },
  lng: { type: Number, required: true }
}, { _id: false });

const transportSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderType: { type: String, enum: SENDER_TYPES, required: true, index: true },
  masterProductId: { type: String, required: true, index: true },
  productName: { type: String, required: true },
  productType: { type: String, enum: PRODUCT_TYPES, required: true },
  quantity: { type: Number, required: true },
  pickupLocation: { type: coordinateSchema, required: true },
  dropLocation: { type: coordinateSchema, required: true },
  startedAt: { type: Date, default: Date.now, required: true },
  endedAt: Date,
  status: { type: String, enum: SESSION_STATUSES, default: 'active', required: true, index: true },
  trackingPoints: {
    type: [trackingPointSchema],
    default: []
  }
}, { timestamps: { createdAt: true, updatedAt: true } });

transportSessionSchema.index({ distributorId: 1, status: 1, createdAt: -1 });
transportSessionSchema.index({ masterProductId: 1, createdAt: -1 });

module.exports = {
  TransportSession: mongoose.model('TransportSession', transportSessionSchema),
  PRODUCT_TYPES,
  SENDER_TYPES,
  SESSION_STATUSES
};
