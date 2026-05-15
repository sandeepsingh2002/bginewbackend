const mongoose = require('mongoose');

const geoSchema = new mongoose.Schema({ lat: Number, lng: Number }, { _id: false });
const FARM_CROP_ENUM = ['wheat', 'rice', 'maize', 'soybean', 'cotton', 'pulses', 'vegetables', 'fruits', 'sugarcane'];
const WOOD_TYPE_ENUM = ['teak', 'sal', 'eucalyptus', 'bamboo', 'pine', 'sandalwood'];
const DAIRY_MEAT_PRODUCT_ENUM = ['milk', 'curd', 'paneer', 'cheese', 'butter', 'ghee', 'chicken', 'goat_meat', 'eggs'];

const rawProductSchema = new mongoose.Schema({
  rawProductId: { type: String, unique: true, required: true },
  producerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producer', required: true },
  producerType: { type: String, required: true },
  farmFields: {
    cropName: { type: String, enum: FARM_CROP_ENUM },
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
    woodType: { type: String, enum: WOOD_TYPE_ENUM },
    quantity: Number,
    quantityUnit: String,
    forestRegion: String,
    geoLocation: geoSchema,
    harvestDate: Date,
    sustainabilityCertified: Boolean
  },
  dairyMeatFields: {
    productType: { type: String, enum: DAIRY_MEAT_PRODUCT_ENUM },
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

const RawProduct = mongoose.model('RawProduct', rawProductSchema);

module.exports = RawProduct;
module.exports.FARM_CROP_ENUM = FARM_CROP_ENUM;
module.exports.WOOD_TYPE_ENUM = WOOD_TYPE_ENUM;
module.exports.DAIRY_MEAT_PRODUCT_ENUM = DAIRY_MEAT_PRODUCT_ENUM;
