const express = require('express');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');
const schedulerController = require('../controllers/schedulerController');

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('can_access_scheduler'));

router.get('/jobs', schedulerController.listJobs);
router.post('/jobs', schedulerController.createJob);
router.put('/jobs/:id', schedulerController.updateJob);

router.get('/executions', schedulerController.listExecutions);
router.post('/jobs/:jobId/run-now', schedulerController.runNow);

module.exports = router;

