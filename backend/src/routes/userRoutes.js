const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const { requirePermission, requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticate);
router.use((req, res, next) => {
  if (req.user?.role === 'super_admin') {
    return next();
  }
  requirePermission('can_manage_users')(req, res, next);
});

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/:uid', userController.updateUser);

module.exports = router;
