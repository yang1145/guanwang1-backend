const express = require('express');
const router = express.Router();
const userAuth = require('../middleware/userAuth');
const {
  createTicket,
  getMyTickets,
  getTicketDetail,
  replyTicket,
  closeTicket
} = require('../controllers/ticketController');

// 所有工单操作需要用户登录
router.use(userAuth);

// 提交工单
router.post('/', createTicket);

// 获取我的工单列表
router.get('/', getMyTickets);

// 获取工单详情
router.get('/:id', getTicketDetail);

// 回复工单
router.post('/:id/reply', replyTicket);

// 关闭工单
router.put('/:id/close', closeTicket);

module.exports = router;
