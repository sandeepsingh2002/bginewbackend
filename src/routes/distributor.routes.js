const { Router } = require('express');
const c = require('../controllers/distributor.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/scan', authenticate('distributor'), c.scan);
router.post('/dispatch/leg1', authenticate('distributor'), c.dispatchLeg1);
router.patch('/dispatch/leg1/:masterProductId/received', authenticate('distributor'), c.receiveLeg1);
router.post('/dispatch/leg2', authenticate('distributor'), c.dispatchLeg2);
router.patch('/dispatch/leg2/:masterProductId/received', authenticate('distributor'), c.receiveLeg2);
router.get('/history', authenticate('distributor'), c.history);

module.exports = router;
