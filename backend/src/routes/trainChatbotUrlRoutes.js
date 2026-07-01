const express = require('express');
const trainChatbotUrlController = require('../controllers/trainChatbotUrlController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

// Public endpoint for viewing URLs (no auth required)
// (None needed for URLs - they're just web links)

// Protected endpoints below
router.use(authenticate);
router.use(requireRole('super_admin'));

router.get('/', trainChatbotUrlController.listUrls);
router.post('/ingest', trainChatbotUrlController.ingestUrls);
router.delete('/:urlId', trainChatbotUrlController.revertUrl);

module.exports = router;
