const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getAllTickets,
  getTicketDetail,
  replyTicket,
  assignTicket,
  transferTicket,
  closeTicket,
  getTicketStats
} = require('../controllers/ticketAdminController');

// 所有操作需要管理员认证
router.use(adminAuth);

// 获取工单统计
router.get('/stats', getTicketStats);

// 获取所有工单
router.get('/', getAllTickets);

// 获取工单详情
router.get('/:id', getTicketDetail);

// 回复工单
router.post('/:id/reply', replyTicket);

// 接手工单
router.put('/:id/assign', assignTicket);

// 转交工单
router.put('/:id/transfer', transferTicket);

// 关闭工单
router.put('/:id/close', closeTicket);

module.exports = router;
