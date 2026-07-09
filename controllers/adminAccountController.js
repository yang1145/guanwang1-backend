const Admin = require('../models/Admin');

// 获取所有管理员
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.getAll();
    res.json({ message: '获取管理员列表成功', data: admins });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    res.status(500).json({ error: '获取管理员列表失败' });
  }
};

// 根据ID获取管理员
const getAdminById = async (req, res) => {
  try {
    const admin = await Admin.getById(req.params.id);
    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }
    res.json({ message: '获取管理员信息成功', data: admin });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ error: '获取管理员信息失败' });
  }
};

// 创建管理员
const createAdmin = async (req, res) => {
  try {
    const { username, password, roleId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    const exists = await Admin.usernameExists(username);
    if (exists) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const id = await Admin.create(username, password, roleId || null);
    const newAdmin = await Admin.getById(id);

    res.status(201).json({ message: '管理员创建成功', data: newAdmin });
  } catch (error) {
    console.error('创建管理员失败:', error);
    res.status(500).json({ error: '创建管理员失败' });
  }
};

// 更新管理员
const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, roleId } = req.body;

    const admin = await Admin.getById(id);
    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    if (username && username !== admin.username) {
      const exists = await Admin.usernameExists(username, id);
      if (exists) {
        return res.status(400).json({ error: '用户名已存在' });
      }
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    await Admin.update(id, {
      username: username || admin.username,
      password: password || null,
      roleId: roleId !== undefined ? roleId : admin.role_id
    });

    const updated = await Admin.getById(id);
    res.json({ message: '管理员更新成功', data: updated });
  } catch (error) {
    console.error('更新管理员失败:', error);
    res.status(500).json({ error: '更新管理员失败' });
  }
};

// 删除管理员
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    const admin = await Admin.getById(id);
    if (!admin) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    await Admin.delete(id);
    res.json({ message: '管理员删除成功' });
  } catch (error) {
    console.error('删除管理员失败:', error);
    res.status(500).json({ error: '删除管理员失败' });
  }
};

module.exports = {
  getAllAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin
};
