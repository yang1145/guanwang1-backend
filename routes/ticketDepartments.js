const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getAll, getById, create, update, remove } = require('../controllers/ticketDepartmentController');

// 用户端获取部门列表（公开，提交工单时需要选择部门）
const TicketDepartment = require('../models/TicketDepartment');
router.get('/public', async (req, res) => {
  try {
    const departments = await TicketDepartment.getAll();
    res.json({ message: '获取部门列表成功', data: departments });
  } catch (error) {
    res.status(500).json({ error: '获取部门列表失败' });
  }
});

// 管理端
router.use(adminAuth);
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
