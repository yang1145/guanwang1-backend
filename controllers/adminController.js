const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const AdminPermission = require('../models/AdminPermission');

// 管理员登录
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请提供用户名和密码' });
    }

    const admin = await Admin.getByUsername(username);
    if (!admin) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 签发JWT（24小时有效期）
    const token = jwt.sign(
      { id: admin.id, username: admin.username, type: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 获取管理员权限
    const permissions = await AdminPermission.getByAdminId(admin.id);

    res.json({
      message: '登录成功',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          role_id: admin.role_id,
          role_name: admin.role_name
        },
        permissions
      }
    });
  } catch (error) {
    console.error('管理员登录时出错:', error);
    res.status(500).json({ error: '登录失败：服务器内部错误' });
  }
};

// 获取当前管理员信息
const getAdminInfo = async (req, res) => {
  try {
    const admin = await Admin.getById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }
    const permissions = await AdminPermission.getByAdminId(admin.id);
    res.json({
      message: '获取管理员信息成功',
      data: { admin, permissions }
    });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ error: '获取管理员信息失败' });
  }
};

// 修改管理员密码
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const adminId = req.admin.id;

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ error: '请提供当前密码、新密码和确认新密码' });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: '新密码和确认密码不一致' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6位' });
    }

    const result = await Admin.changePassword(adminId, currentPassword, newPassword);

    if (result) {
      res.json({ message: '密码修改成功' });
    } else {
      res.status(500).json({ error: '密码修改失败' });
    }
  } catch (error) {
    console.error('修改密码时出错:', error);
    if (error.message === '当前密码错误') {
      return res.status(400).json({ error: '当前密码错误' });
    } else if (error.message === '管理员不存在') {
      return res.status(404).json({ error: '管理员不存在' });
    }
    res.status(500).json({ error: '服务器内部错误' });
  }
};

module.exports = {
  login,
  getAdminInfo,
  changePassword
};
