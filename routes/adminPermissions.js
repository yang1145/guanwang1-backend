const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getAllPermissions,
  getMyPermissions
} = require('../controllers/adminPermissionController');

// 所有路由都需要管理员认证
router.use(adminAuth);

router.get('/', getAllPermissions);
router.get('/mine', getMyPermissions);

module.exports = router;
