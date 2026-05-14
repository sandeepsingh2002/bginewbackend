const { Router } = require('express');
const c = require('../controllers/retailer.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();
router.post('/register', c.register);
router.post('/login', c.login);
router.post('/receive', authenticate('retailer'), c.receive);
router.get('/history', authenticate('retailer'), c.history);

module.exports = router;
