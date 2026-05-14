const { Router } = require('express');
const c = require('../controllers/public.controller');

const router = Router();
router.get('/product/:masterProductId', c.getProduct);
router.get('/product/raw/:rawProductId', c.getRawProduct);
router.get('/traceability/:masterProductId', c.getTraceability);

module.exports = router;
