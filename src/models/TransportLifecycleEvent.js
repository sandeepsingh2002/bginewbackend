const mongoose = require('mongoose');

const TRANSPORT_EVENT_TYPES = ['TRANSPORT_STARTED', 'TRANSPORT_UPDATE', 'TRANSPORT_COMPLETED'];

const transportLifecycleEventSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  masterProductId: { type: String, required: true, index: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true, index: true },
  eventType: { type: String, enum: TRANSPORT_EVENT_TYPES, required: true, index: true },
  status: { type: String, enum: ['active', 'completed'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderType: { type: String, enum: ['producer', 'processor', 'warehouse'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

transportLifecycleEventSchema.index({ masterProductId: 1, createdAt: -1 });

module.exports = {
  TransportLifecycleEvent: mongoose.model('TransportLifecycleEvent', transportLifecycleEventSchema),
  TRANSPORT_EVENT_TYPES
};
