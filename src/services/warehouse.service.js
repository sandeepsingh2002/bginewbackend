const WarehouseBatch = require('../models/WarehouseBatch');
const axios = require('axios');
const { nanoid } = require('nanoid');

const generateBatchId = () => `WB-${nanoid(10).toUpperCase()}`;

exports.scanBatch = async ({ warehouseId, sessionId }) => {
  const distributorApiUrl = process.env.DISTRIBUTOR_API_URL || 'http://localhost:5000';
  let sessionData;
  
  try {
    const response = await axios.get(`${distributorApiUrl}/api/v1/distributor/session/${sessionId}`, {
      timeout: 5000
    });
    sessionData = response.data.session;
  } catch (err) {
    if (err.response?.status === 404) {
      const error = new Error('Transport session not found');
      error.statusCode = 404;
      throw error;
    }
    const error = new Error('Failed to fetch transport session');
    error.statusCode = 500;
    throw error;
  }

  if (sessionData.status !== 'completed') {
    const error = new Error('Transport session must be completed before scanning');
    error.statusCode = 400;
    throw error;
  }

  const existingBatch = await WarehouseBatch.findOne({ sessionId });
  if (existingBatch) {
    const error = new Error('Batch already scanned for this session');
    error.statusCode = 409;
    throw error;
  }

  const batch = await WarehouseBatch.create({
    batchId: generateBatchId(),
    warehouseId,
    sessionId,
    masterProductId: sessionData.masterProductId,
    productName: sessionData.productName,
    productType: sessionData.productType,
    quantity: sessionData.quantity,
    chainId: sessionData.chainId
  });

  return batch;
};

exports.addEnvironmentalRecord = async ({ warehouseId, batchId, temperature, humidity }) => {
  const batch = await WarehouseBatch.findOne({ batchId, warehouseId, status: 'in_inventory' });
  
  if (!batch) {
    const error = new Error('Active batch not found in your inventory');
    error.statusCode = 404;
    throw error;
  }

  batch.environmentalRecords.push({ temperature, humidity });
  await batch.save();

  return batch;
};

exports.debitBatch = async ({ warehouseId, batchId }) => {
  const batch = await WarehouseBatch.findOne({ batchId, warehouseId, status: 'in_inventory' });
  
  if (!batch) {
    const error = new Error('Active batch not found in your inventory');
    error.statusCode = 404;
    throw error;
  }

  batch.status = 'debited';
  batch.debitedAt = new Date();
  await batch.save();

  return batch;
};

exports.getBatchDetails = async ({ batchId }) => {
  const batch = await WarehouseBatch.findOne({ batchId }).lean();
  
  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  const timeInWarehouse = batch.debitedAt 
    ? Math.floor((new Date(batch.debitedAt) - new Date(batch.scannedAt)) / 1000 / 60 / 60)
    : null;

  return {
    ...batch,
    timeInWarehouseHours: timeInWarehouse
  };
};

exports.getBatchDetailsByTraceId = async ({ traceId }) => {
  const batch = await WarehouseBatch.findById(traceId).lean();

  if (!batch) {
    const error = new Error('Batch not found');
    error.statusCode = 404;
    throw error;
  }

  const timeInWarehouse = batch.debitedAt
    ? Math.floor((new Date(batch.debitedAt) - new Date(batch.scannedAt)) / 1000 / 60 / 60)
    : null;

  return {
    ...batch,
    timeInWarehouseHours: timeInWarehouse
  };
};

exports.getWarehouseBatches = async ({ warehouseId }) => {
  const batches = await WarehouseBatch.find({ warehouseId })
    .sort({ scannedAt: -1 })
    .select('batchId masterProductId productName quantity status scannedAt debitedAt')
    .lean();
  
  return batches;
};
