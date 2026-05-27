const express = require('express');
const sessionController = require('../controllers/sessionController');

const router = express.Router();

router.post('/create', sessionController.createSession);
router.get('/validate/:sessionId', sessionController.validateSession);

module.exports = router;
