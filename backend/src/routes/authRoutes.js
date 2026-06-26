const express = require('express');
const authController = require('../controllers/authController');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.post('/register', registerLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/setup-2fa', authenticate, authController.setup2FA);
router.post('/confirm-2fa', authenticate, authController.confirm2FA);
router.post('/verify-2fa', authenticate, authController.verify2FA);

module.exports = router;
