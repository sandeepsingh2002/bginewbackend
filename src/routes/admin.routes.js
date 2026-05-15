const { Router } = require('express');
const c = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();
router.post('/login', c.login);
router.get('/producers/pending', authenticate('admin'), c.pendingProducers);
router.patch('/producers/:producerId/verify', authenticate('admin'), c.verifyProducer);
router.get('/accounts/pending', authenticate('admin'), c.pendingAllEntities);
router.get('/accounts/pending/:entityType', authenticate('admin'), c.pendingByEntity);
router.patch('/accounts/:entityType/:entityId/verify', authenticate('admin'), c.verifyEntity);
router.get('/products', authenticate('admin'), c.listProducts);
router.get('/producers', authenticate('admin'), c.listProducers);

module.exports = router;
