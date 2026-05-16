const mongoose = require('mongoose');

const marketplaceInquirySchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceListing', required: true, index: true },
  sellerType: { type: String, enum: ['producer', 'processor'], required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  buyerName: { type: String, required: true, trim: true },
  buyerContact: { type: String, required: true, trim: true },
  buyerMessage: { type: String, trim: true },
  offeredPrice: { type: Number, min: 0 },
  status: { type: String, enum: ['open', 'accepted', 'rejected', 'closed'], default: 'open' },
  unreadForSeller: { type: Boolean, default: true }
}, { timestamps: true });

marketplaceInquirySchema.index({ sellerType: 1, sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplaceInquiry', marketplaceInquirySchema);
