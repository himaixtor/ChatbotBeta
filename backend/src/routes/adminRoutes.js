const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const { requireRole, requirePermission } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin', 'manager', 'viewer'));


router.get('/chats', adminController.listChats);
router.get('/stats', adminController.getStats);
router.get(
  '/chats/:sessionId/messages',
  adminController.getSessionMessages
);

router.get(
  '/export/session/:sessionId',
  requirePermission('can_download'),
  adminController.exportSession
);
router.get(
  '/export/all',
  requirePermission('can_download'),
  adminController.exportAll
);

router.delete(
  '/chats/:sessionId',
  requireRole('admin'),
  adminController.deleteSession
);

module.exports = router;
