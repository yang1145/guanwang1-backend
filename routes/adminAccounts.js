const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin
} = require('../controllers/adminAccountController');

// 所有路由都需要管理员认证
router.use(adminAuth);

router.get('/', getAllAdmins);
router.get('/:id', getAdminById);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;
