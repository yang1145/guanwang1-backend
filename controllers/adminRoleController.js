const AdminRole = require('../models/AdminRole');

// 获取所有角色
const getAllRoles = async (req, res) => {
  try {
    const roles = await AdminRole.getAll();
    res.json({ message: '获取角色列表成功', data: roles });
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ error: '获取角色列表失败' });
  }
};

// 获取角色详情（含权限）
const getRoleById = async (req, res) => {
  try {
    const role = await AdminRole.getDetail(req.params.id);
    if (!role) {
      return res.status(404).json({ error: '角色不存在' });
    }
    res.json({ message: '获取角色详情成功', data: role });
  } catch (error) {
    console.error('获取角色详情失败:', error);
    res.status(500).json({ error: '获取角色详情失败' });
  }
};

// 创建角色
const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: '角色名称不能为空' });
    }

    const existing = await AdminRole.getByName(name);
    if (existing) {
      return res.status(400).json({ error: '角色名称已存在' });
    }

    const id = await AdminRole.create(name, description || '');
    const role = await AdminRole.getById(id);

    res.status(201).json({ message: '角色创建成功', data: role });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ error: '创建角色失败' });
  }
};

// 更新角色
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const role = await AdminRole.getById(id);
    if (!role) {
      return res.status(404).json({ error: '角色不存在' });
    }

    if (name && name !== role.name) {
      const existing = await AdminRole.getByName(name);
      if (existing) {
        return res.status(400).json({ error: '角色名称已存在' });
      }
    }

    await AdminRole.update(id, name || role.name, description !== undefined ? description : role.description);
    const updated = await AdminRole.getDetail(id);

    res.json({ message: '角色更新成功', data: updated });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ error: '更新角色失败' });
  }
};

// 删除角色
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await AdminRole.getById(id);
    if (!role) {
      return res.status(404).json({ error: '角色不存在' });
    }

    await AdminRole.delete(id);
    res.json({ message: '角色删除成功' });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ error: '删除角色失败' });
  }
};

// 为角色分配权限
const assignPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    const role = await AdminRole.getById(id);
    if (!role) {
      return res.status(404).json({ error: '角色不存在' });
    }

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({ error: '权限ID列表格式不正确' });
    }

    await AdminRole.assignPermissions(id, permissionIds);
    const updated = await AdminRole.getDetail(id);

    res.json({ message: '权限分配成功', data: updated });
  } catch (error) {
    console.error('分配权限失败:', error);
    res.status(500).json({ error: '分配权限失败' });
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  assignPermissions
};
