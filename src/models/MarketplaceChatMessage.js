const mongoose = require('mongoose');

const marketplaceChatMessageSchema = new mongoose.Schema({
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceInquiry', required: true, index: true },
  senderType: { type: String, enum: ['buyer', 'seller'], required: true },
  senderRole: { type: String, enum: ['producer', 'processor', 'buyer'], required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId },
  message: { type: String, required: true, trim: true }
}, { timestamps: true });

marketplaceChatMessageSchema.index({ inquiryId: 1, createdAt: 1 });

module.exports = mongoose.model('MarketplaceChatMessage', marketplaceChatMessageSchema);
