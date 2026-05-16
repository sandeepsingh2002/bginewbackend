const mongoose = require('mongoose');

const marketplaceNotificationSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['producer', 'processor'], required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  metadata: { type: Object },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

marketplaceNotificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplaceNotification', marketplaceNotificationSchema);
