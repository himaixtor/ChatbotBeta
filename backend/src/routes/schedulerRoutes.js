const express = require('express');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const schedulerController = require('../controllers/schedulerController');

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
  if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Insufficient permissions' });
});

router.get('/jobs', schedulerController.listJobs);
router.post('/jobs', schedulerController.createJob);
router.put('/jobs/:id', schedulerController.updateJob);

router.get('/executions', schedulerController.listExecutions);
router.post('/jobs/:jobId/run-now', schedulerController.runNow);

module.exports = router;

