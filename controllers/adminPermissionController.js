const AdminPermission = require('../models/AdminPermission');

// 获取所有权限
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await AdminPermission.getAll();
    res.json({ message: '获取权限列表成功', data: permissions });
  } catch (error) {
    console.error('获取权限列表失败:', error);
    res.status(500).json({ error: '获取权限列表失败' });
  }
};

// 获取当前管理员的权限
const getMyPermissions = async (req, res) => {
  try {
    const permissions = await AdminPermission.getByAdminId(req.admin.id);
    res.json({ message: '获取权限成功', data: permissions });
  } catch (error) {
    console.error('获取管理员权限失败:', error);
    res.status(500).json({ error: '获取管理员权限失败' });
  }
};

module.exports = {
  getAllPermissions,
  getMyPermissions
};
