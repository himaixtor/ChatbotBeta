const express = require('express');
const roleController = require('../controllers/roleController');
const authenticate = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');

const router = express.Router();

router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', roleController.listRoles);
router.post('/', roleController.createRole);
router.put('/:uid', roleController.updateRole);
router.delete('/:uid', roleController.deleteRole);

module.exports = router;
