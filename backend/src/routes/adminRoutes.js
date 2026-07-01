const express = require('express');
const adminController = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const { requireRole, requirePermission } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }
  requirePermission('can_view_all_chats')(req, res, next);
});


router.get('/chats', adminController.listChats);
router.get('/stats', adminController.getStats);
router.get(
  '/chats/:sessionId/messages',
  adminController.getSessionMessages
);
router.get(
  '/chats/:sessionId/messages/:messageId/file',
  adminController.getMessageAttachment
);

router.get(
  '/export/session/:sessionId',
  (req, res, next) => {
    if (req.user?.role === 'super_admin') {
      return next();
    }
    requirePermission('can_download')(req, res, next);
  },
  adminController.exportSession
);
router.get(
  '/export/all',
  (req, res, next) => {
    if (req.user?.role === 'super_admin') {
      return next();
    }
    requirePermission('can_download')(req, res, next);
  },
  adminController.exportAll
);

router.delete(
  '/chats/:sessionId',
  (req, res, next) => {
    if (req.user?.role === 'super_admin' || req.user?.role === 'admin') {
      return next();
    }
    res.status(403).json({ error: 'Insufficient permissions' });
  },
  adminController.deleteSession
);

module.exports = router;
