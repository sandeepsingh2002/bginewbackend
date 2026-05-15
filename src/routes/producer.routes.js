const { Router } = require('express');
const c = require('../controllers/producer.controller');
const authenticate = require('../middleware/authenticate');
const requireVerified = require('../middleware/requireVerified');

const router = Router();
router.post('/register', c.register);
router.post('/login', c.login);
router.get('/me', authenticate('producer'), c.me);
router.post('/products', authenticate('producer'), requireVerified, c.addRawProduct);
router.get('/products', authenticate('producer'), c.listOwnRawProducts);
router.get('/products/:rawProductId', authenticate('producer'), c.getOwnRawProductById);

module.exports = router;
