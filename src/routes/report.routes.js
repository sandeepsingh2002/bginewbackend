const { Router } = require('express');
const c = require('../controllers/report.controller');
const authenticate = require('../middleware/authenticate');

const router = Router();

router.get('/admin/all', authenticate('admin'), c.getAllReports);
router.patch('/admin/:reportId/phase', authenticate('admin'), c.updateReportPhase);
router.patch('/admin/:reportId/conclusion', authenticate('admin'), c.updateReportConclusion);
router.post('/', c.createReport);
router.get('/:reportId', c.getReportById);

module.exports = router;
