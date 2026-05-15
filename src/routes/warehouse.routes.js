const express = require('express');
const router = express.Router();
const warehouseController = require('../controllers/warehouse.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const {
  registerValidation,
  loginValidation,
  sessionIdValidation,
  batchIdValidation,
  traceIdValidation,
  environmentalUpdateValidation
} = require('../validators/warehouse.validator');

router.post('/register', registerValidation, validate, warehouseController.register);
router.post('/login', loginValidation, validate, warehouseController.login);

router.post('/scan/:sessionId', authenticate('warehouse'), sessionIdValidation, validate, warehouseController.scanBatch);
router.post('/environment/:batchId', authenticate('warehouse'), environmentalUpdateValidation, validate, warehouseController.updateEnvironment);
router.post('/debit/:batchId', authenticate('warehouse'), batchIdValidation, validate, warehouseController.debitBatch);
router.get('/batch/:batchId', batchIdValidation, validate, warehouseController.traceBatch);
router.get('/trace/:traceId', traceIdValidation, validate, warehouseController.traceBatchByTraceId);
router.get('/my-batches', authenticate('warehouse'), warehouseController.myBatches);

module.exports = router;
