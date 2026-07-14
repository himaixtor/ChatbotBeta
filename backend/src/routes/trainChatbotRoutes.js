const express = require('express');
const trainChatbotController = require('../controllers/trainChatbotController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');
const { uploadTraining } = require('../middleware/upload');

const router = express.Router();

// Public endpoint for viewing documents (no auth required)
router.get('/:documentId/view', trainChatbotController.getDocument);

// Protected endpoints below
router.use(authenticate);
router.use(requirePermission('can_access_train_ai'));

router.get('/', trainChatbotController.listDocuments);
router.post('/upload', (req, res, next) => {
  uploadTraining.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size must be 50MB or less' });
      }
      return res.status(400).json({ error: err.message || 'Invalid file upload' });
    }
    next();
  });
}, trainChatbotController.uploadDocument);
router.delete('/:documentId', trainChatbotController.revertDocument);

module.exports = router;
