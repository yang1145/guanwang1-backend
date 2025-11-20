const express = require('express');
const router = express.Router();
const { register, login, getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const adminAuth = require('../middleware/adminAuth');

// 用户注册
router.post('/register', register);

// 用户登录
router.post('/login', login);

// 获取所有用户（管理接口）
router.get('/', adminAuth, getAllUsers);

// 获取特定用户信息（管理接口）
router.get('/:id', adminAuth, getUserById);

// 更新用户信息（管理接口）
router.put('/:id', adminAuth, updateUser);

// 删除用户（管理接口）
router.delete('/:id', adminAuth, deleteUser);

module.exports = router;