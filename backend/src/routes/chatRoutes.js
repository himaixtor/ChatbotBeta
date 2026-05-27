const express = require('express');
const chatController = require('../controllers/chatController');
const { chatLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/message', chatLimiter, chatController.sendMessage);
router.get('/history/:sessionId', chatController.getHistory);

module.exports = router;
