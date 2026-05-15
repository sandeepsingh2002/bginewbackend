const transportSessionService = require('../services/transportSession.service');

exports.startSession = async (req, res, next) => {
  try {
    const session = await transportSessionService.startSession({
      distributorId: req.user.userId,
      payload: req.body
    });
    return res.status(201).json(session);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.updateTracking = async (req, res, next) => {
  try {
    const { session, trackingPoint } = await transportSessionService.addTrackingPoint({
      distributorId: req.user.userId,
      sessionId: req.params.sessionId,
      payload: req.body
    });

    return res.json({
      sessionId: session.sessionId,
      status: session.status,
      trackingPoint
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.stopSession = async (req, res, next) => {
  try {
    const session = await transportSessionService.stopSession({
      distributorId: req.user.userId,
      sessionId: req.params.sessionId
    });
    return res.json(session);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.getSession = async (req, res, next) => {
  try {
    const data = await transportSessionService.getSessionForDistributor({
      distributorId: req.user.userId,
      sessionId: req.params.sessionId
    });
    return res.json(data);
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return next(err);
  }
};

exports.mySessions = async (req, res, next) => {
  try {
    const sessions = await transportSessionService.getDistributorSessions({
      distributorId: req.user.userId
    });
    return res.json(sessions);
  } catch (err) {
    return next(err);
  }
};
