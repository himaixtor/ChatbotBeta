const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticate);

// Dashboard page
router.get('/stats', requirePermission('can_access_dashboard'), adminController.getStats);

// Chat History page
router.get('/chats', requirePermission('can_view_all_chats'), adminController.listChats);
router.get(
  '/chats/:sessionId/messages',
  requirePermission('can_view_all_chats'),
  adminController.getSessionMessages
);
router.get(
  '/chats/:sessionId/messages/:messageId/file',
  requirePermission('can_view_all_chats'),
  adminController.getMessageAttachment
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

// Chat deletion is an administrative action — tied to the user-management permission
router.delete(
  '/chats/:sessionId',
  requirePermission('can_manage_users'),
  adminController.deleteSession
);

module.exports = router;
