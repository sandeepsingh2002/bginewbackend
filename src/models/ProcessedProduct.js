const mongoose = require('mongoose');

const processedProductSchema = new mongoose.Schema({
  masterProductId: { type: String, unique: true, required: true },
  processorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Processor', required: true },
  productName: { type: String, required: true },
  productCategory: { type: String, required: true },
  totalQuantityProduced: { type: Number, required: true },
  quantityUnit: { type: String, required: true },
  inputBatches: [{ batchId: String, materialDescription: String }],
  manufacturingDate: Date,
  expiryDate: Date,
  otherIngredients: [String],
  qrCodeUrl: String,
  distributionLeg1: {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor' },
    dispatchedAt: Date,
    receivedAt: Date,
    vehicleId: String,
    startTemp: Number,
    endTemp: Number,
    startHumidity: Number,
    endHumidity: Number,
    notes: String
  },
  warehouseStop: {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    receivedAt: Date,
    quantityReceived: Number,
    storageTemp: Number,
    storageHumidity: Number,
    dispatchedAt: Date,
    notes: String
  },
  distributionLeg2: {
    distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor' },
    dispatchedAt: Date,
    receivedAt: Date,
    vehicleId: String,
    startTemp: Number,
    endTemp: Number,
    startHumidity: Number,
    endHumidity: Number,
    notes: String
  },
  retailerStop: {
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Retailer' },
    receivedAt: Date,
    shelfLocation: String,
    notes: String
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('ProcessedProduct', processedProductSchema);
