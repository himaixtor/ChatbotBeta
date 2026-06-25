const express = require('express');
const chatController = require('../controllers/chatController');
const { chatLimiter } = require('../middleware/rateLimiter');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.post('/message', chatLimiter, chatController.sendMessage);
router.get('/history/:sessionId', chatController.getHistory);
router.post('/upload', chatLimiter, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size must be 5MB or less' });
      }
      return res.status(400).json({ error: err.message || 'Invalid file upload' });
    }
    next();
  });
}, chatController.uploadFile);
router.get('/history/:sessionId/messages/:messageId/file', chatController.getMessageAttachment);

module.exports = router;
