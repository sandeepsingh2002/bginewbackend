const { Router } = require('express');
const c = require('../controllers/warehouse.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/receive', authenticate('warehouse'), c.receive);
router.patch('/dispatch/:masterProductId', authenticate('warehouse'), c.dispatch);
router.get('/history', authenticate('warehouse'), c.history);

module.exports = router;
