const express = require('express');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/authenticate');
const { requirePermission } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('can_manage_users'));

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.put('/:uid', userController.updateUser);

module.exports = router;
