const mongoose = require('mongoose');

const geoSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });

const rawProductSchema = new mongoose.Schema({
  rawProductId: { type: String, unique: true, required: true },
  producerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producer', required: true },
  producerType: { type: String, required: true },
  farmFields: {
    cropName: String,
    quantity: Number,
    quantityUnit: String,
    geoLocation: geoSchema,
    farmSizeAcres: Number,
    pesticideUsed: Boolean,
    pesticideDetails: String,
    harvestDate: Date,
    organicCertified: Boolean
  },
  woodFields: {
    woodType: String,
    quantity: Number,
    quantityUnit: String,
    forestRegion: String,
    geoLocation: geoSchema,
    harvestDate: Date,
    sustainabilityCertified: Boolean
  },
  dairyMeatFields: {
    productType: String,
    animalBreed: String,
    quantity: Number,
    quantityUnit: String,
    farmLocation: geoSchema,
    antibioticsUsed: Boolean,
    feedType: String,
    collectionDate: Date
  },
  qrCodeUrl: String,
  status: { type: String, enum: ['available', 'in_batch'], default: 'available' }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('RawProduct', rawProductSchema);
