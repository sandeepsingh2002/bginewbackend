const { Router } = require('express');
const c = require('../controllers/processor.controller');
const marketplaceController = require('../controllers/marketplace.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/batches', authenticate('processor'), c.createBatch);
router.post('/batches/:batchId/scan', authenticate('processor'), c.scanRawProduct);
router.get('/batches/:batchId', authenticate('processor'), c.getBatch);
router.post('/batches/:batchId/close', authenticate('processor'), c.closeBatch);
router.post('/products', authenticate('processor'), c.createProcessedProduct);
router.post('/marketplace/products', authenticate('processor'), marketplaceController.createListing);
router.get('/products', authenticate('processor'), c.listOwnProducts);

module.exports = router;
