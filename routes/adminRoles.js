const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions
} = require('../controllers/adminRoleController');

// 所有路由都需要管理员认证
router.use(adminAuth);

router.get('/', getAllRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);
router.put('/:id/permissions', assignPermissions);

module.exports = router;
