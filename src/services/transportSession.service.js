const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const Producer = require('../models/Producer');
const Processor = require('../models/Processor');
const Warehouse = require('../models/Warehouse');
const { TransportSession } = require('../models/TransportSession');
const { TransportLifecycleEvent } = require('../models/TransportLifecycleEvent');

const SENDER_MODELS = {
  producer: Producer,
  processor: Processor,
  warehouse: Warehouse
};

const createSessionId = () => `TS-${nanoid(10).toUpperCase()}`;

const createLifecycleEvent = async ({ session, eventType, payload, status }) => {
  await TransportLifecycleEvent.create({
    sessionId: session.sessionId,
    masterProductId: session.masterProductId,
    distributorId: session.distributorId,
    eventType,
    status,
    senderId: session.senderId,
    senderType: session.senderType,
    payload
  });
};

const ensureSenderExists = async (senderId, senderType) => {
  const Model = SENDER_MODELS[senderType];
  if (!Model) return false;
  if (!mongoose.isValidObjectId(senderId)) return false;
  const sender = await Model.findById(senderId).select('_id').lean();
  return Boolean(sender);
};

const startSession = async ({ distributorId, payload }) => {
  const senderExists = await ensureSenderExists(payload.senderId, payload.senderType);
  if (!senderExists) {
    const err = new Error('Sender not found');
    err.statusCode = 404;
    throw err;
  }

  const session = await TransportSession.create({
    sessionId: createSessionId(),
    distributorId,
    senderId: payload.senderId,
    senderType: payload.senderType,
    masterProductId: payload.masterProductId,
    productName: payload.productName,
    productType: payload.productType,
    quantity: payload.quantity,
    pickupLocation: payload.pickupLocation,
    dropLocation: payload.dropLocation,
    status: 'active',
    startedAt: new Date()
  });

  await createLifecycleEvent({
    session,
    eventType: 'TRANSPORT_STARTED',
    status: 'active',
    payload: {
      pickupLocation: session.pickupLocation,
      dropLocation: session.dropLocation,
      productName: session.productName,
      productType: session.productType,
      quantity: session.quantity
    }
  });

  return session;
};

const addTrackingPoint = async ({ distributorId, sessionId, payload }) => {
  const trackingPoint = {
    timestamp: new Date(),
    location: { lat: payload.lat, lng: payload.lng },
    truckTemperature: payload.truckTemperature,
    humidity: payload.humidity
  };

  const session = await TransportSession.findOneAndUpdate(
    { sessionId, distributorId, status: 'active' },
    { $push: { trackingPoints: trackingPoint } },
    { new: true }
  );

  if (!session) {
    const err = new Error('Active transport session not found');
    err.statusCode = 404;
    throw err;
  }

  await createLifecycleEvent({
    session,
    eventType: 'TRANSPORT_UPDATE',
    status: session.status,
    payload: trackingPoint
  });

  return { session, trackingPoint };
};

const stopSession = async ({ distributorId, sessionId }) => {
  const session = await TransportSession.findOneAndUpdate(
    { sessionId, distributorId, status: 'active' },
    { $set: { status: 'completed', endedAt: new Date() } },
    { new: true }
  );

  if (!session) {
    const err = new Error('Active transport session not found');
    err.statusCode = 404;
    throw err;
  }

  await createLifecycleEvent({
    session,
    eventType: 'TRANSPORT_COMPLETED',
    status: 'completed',
    payload: {
      endedAt: session.endedAt,
      trackingPointsCount: session.trackingPoints.length
    }
  });

  return session;
};

const getSessionForDistributor = async ({ distributorId, sessionId }) => {
  const session = await TransportSession.findOne({ sessionId, distributorId }).lean();
  if (!session) {
    const err = new Error('Transport session not found');
    err.statusCode = 404;
    throw err;
  }

  const lifecycleEvents = await TransportLifecycleEvent.find({ sessionId }).sort({ createdAt: 1 }).lean();
  return { session, lifecycleEvents };
};

const getDistributorSessions = async ({ distributorId }) => {
  return TransportSession.find({ distributorId }).sort({ createdAt: -1 }).lean();
};

module.exports = {
  startSession,
  addTrackingPoint,
  stopSession,
  getSessionForDistributor,
  getDistributorSessions
};
