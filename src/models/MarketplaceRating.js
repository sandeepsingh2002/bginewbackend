const mongoose = require('mongoose');

const marketplaceRatingSchema = new mongoose.Schema({
  sellerType: { type: String, enum: ['producer', 'processor'], required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceListing' },
  buyerName: { type: String, required: true, trim: true },
  buyerContact: { type: String, required: true, trim: true },
  stars: { type: Number, required: true, min: 1, max: 5 },
  review: { type: String, trim: true }
}, { timestamps: true });

marketplaceRatingSchema.index({ sellerType: 1, sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplaceRating', marketplaceRatingSchema);
