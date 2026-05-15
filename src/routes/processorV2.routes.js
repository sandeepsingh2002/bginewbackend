const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const c = require('../controllers/processorV2.controller');

const router = Router();

router.post('/register', c.register);
router.post('/login', c.login);

router.get('/inventory', authenticate('processor'), c.getInventory);
router.post('/inventory/batches/:batchId', authenticate('processor'), c.addBatchToInventory);
router.delete('/inventory/batches/:batchId', authenticate('processor'), c.removeBatchFromInventory);

router.get('/batches', authenticate('processor'), c.listBatches);
router.post('/batches', authenticate('processor'), c.createBatch);
router.post('/batches/:batchId/scan', authenticate('processor'), c.scanIntoBatch);

router.post('/products', authenticate('processor'), c.createNewProduct);
router.get('/products', authenticate('processor'), c.listProducts);

router.get('/chain/:customQrText', c.getChainByQrText);

module.exports = router;
