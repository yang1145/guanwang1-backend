const TicketDepartment = require('../models/TicketDepartment');

const getAll = async (req, res) => {
  try {
    const departments = await TicketDepartment.getAll();
    res.json({ message: '获取部门列表成功', data: departments });
  } catch (error) {
    console.error('获取部门列表失败:', error);
    res.status(500).json({ error: '获取部门列表失败' });
  }
};

const getById = async (req, res) => {
  try {
    const dept = await TicketDepartment.getById(req.params.id);
    if (!dept) return res.status(404).json({ error: '部门不存在' });
    res.json({ message: '获取部门成功', data: dept });
  } catch (error) {
    console.error('获取部门失败:', error);
    res.status(500).json({ error: '获取部门失败' });
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: '部门名称不能为空' });

    const exists = await TicketDepartment.getByName(name);
    if (exists) return res.status(400).json({ error: '部门名称已存在' });

    const id = await TicketDepartment.create(name, description || '');
    const dept = await TicketDepartment.getById(id);
    res.status(201).json({ message: '部门创建成功', data: dept });
  } catch (error) {
    console.error('创建部门失败:', error);
    res.status(500).json({ error: '创建部门失败' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const dept = await TicketDepartment.getById(id);
    if (!dept) return res.status(404).json({ error: '部门不存在' });

    if (name && name !== dept.name) {
      const exists = await TicketDepartment.getByName(name);
      if (exists) return res.status(400).json({ error: '部门名称已存在' });
    }

    await TicketDepartment.update(id, name || dept.name, description !== undefined ? description : dept.description);
    const updated = await TicketDepartment.getById(id);
    res.json({ message: '部门更新成功', data: updated });
  } catch (error) {
    console.error('更新部门失败:', error);
    res.status(500).json({ error: '更新部门失败' });
  }
};

const remove = async (req, res) => {
  try {
    const dept = await TicketDepartment.getById(req.params.id);
    if (!dept) return res.status(404).json({ error: '部门不存在' });
    await TicketDepartment.delete(req.params.id);
    res.json({ message: '部门删除成功' });
  } catch (error) {
    console.error('删除部门失败:', error);
    res.status(500).json({ error: '删除部门失败' });
  }
};

module.exports = { getAll, getById, create, update, remove };
