const express = require('express');
const router = express.Router();
const { login, getAdminInfo, changePassword } = require('../controllers/adminController');
const adminAuth = require('../middleware/adminAuth');

// 管理员登录（公开接口）
router.post('/login', login);

// 获取当前管理员信息（需认证）
router.get('/info', adminAuth, getAdminInfo);

// 修改管理员密码（需认证）
router.put('/change-password', adminAuth, changePassword);

module.exports = router;
