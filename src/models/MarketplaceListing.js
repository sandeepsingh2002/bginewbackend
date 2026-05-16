const mongoose = require('mongoose');

const geoSchema = new mongoose.Schema({
  lat: { type: Number },
  lng: { type: Number }
}, { _id: false });

const marketplaceListingSchema = new mongoose.Schema({
  sellerType: { type: String, enum: ['producer', 'processor'], required: true, index: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  sellerSnapshot: {
    name: String,
    email: String,
    producerType: String,
    companyName: String
  },
  productName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String, trim: true },
  priceMin: { type: Number, required: true, min: 0 },
  priceMax: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  quantityAvailable: { type: Number, min: 0 },
  quantityUnit: { type: String, trim: true },
  productLocation: { type: String, required: true, trim: true },
  geoLocation: geoSchema,
  farmType: { type: String, trim: true },
  status: { type: String, enum: ['active', 'paused', 'sold'], default: 'active', index: true },
  viewCount: { type: Number, default: 0 }
}, { timestamps: true });

marketplaceListingSchema.index({ createdAt: -1 });
marketplaceListingSchema.index({ sellerType: 1, sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('MarketplaceListing', marketplaceListingSchema);
