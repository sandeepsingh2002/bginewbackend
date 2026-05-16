const mongoose = require('mongoose');

const marketplacePurchaseSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceListing', required: true, index: true },
  sellerType: { type: String, enum: ['producer', 'processor'], required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  buyerName: { type: String, required: true, trim: true },
  buyerContact: { type: String, required: true, trim: true },
  quantity: { type: Number, min: 0 },
  quantityUnit: { type: String, trim: true },
  offeredPrice: { type: Number, min: 0 },
  note: { type: String, trim: true },
  status: { type: String, enum: ['requested', 'accepted', 'rejected', 'cancelled'], default: 'requested' }
}, { timestamps: true });

marketplacePurchaseSchema.index({ sellerType: 1, sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplacePurchase', marketplacePurchaseSchema);
