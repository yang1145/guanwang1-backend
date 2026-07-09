const Ticket = require('../models/Ticket');
const TicketReply = require('../models/TicketReply');

// 用户提交工单
const createTicket = async (req, res) => {
  try {
    const { departmentId, urgency, title, content } = req.body;

    if (!departmentId || !urgency || !title || !content) {
      return res.status(400).json({ error: '请填写完整的工单信息' });
    }

    const validUrgency = ['low', 'medium', 'high', 'urgent'];
    if (!validUrgency.includes(urgency)) {
      return res.status(400).json({ error: '紧急程度无效，可选: low, medium, high, urgent' });
    }

    const id = await Ticket.create({
      userId: req.user.id,
      departmentId,
      urgency,
      title,
      content
    });

    const ticket = await Ticket.getById(id);
    const replies = await TicketReply.getByTicketId(id);

    res.status(201).json({
      message: '工单提交成功',
      data: { ticket, replies }
    });
  } catch (error) {
    console.error('提交工单失败:', error);
    res.status(500).json({ error: '提交工单失败' });
  }
};

// 用户获取自己的工单列表
const getMyTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await Ticket.getByUserId(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    res.json({ message: '获取工单列表成功', ...result });
  } catch (error) {
    console.error('获取工单列表失败:', error);
    res.status(500).json({ error: '获取工单列表失败' });
  }
};

// 用户获取工单详情
const getTicketDetail = async (req, res) => {
  try {
    const ticket = await Ticket.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.user_id !== req.user.id) return res.status(403).json({ error: '无权查看该工单' });

    const replies = await TicketReply.getByTicketId(req.params.id);

    res.json({
      message: '获取工单详情成功',
      data: { ticket, replies }
    });
  } catch (error) {
    console.error('获取工单详情失败:', error);
    res.status(500).json({ error: '获取工单详情失败' });
  }
};

// 用户回复工单
const replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: '回复内容不能为空' });

    const ticket = await Ticket.getById(id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.user_id !== req.user.id) return res.status(403).json({ error: '无权操作该工单' });
    if (ticket.status === 'closed') return res.status(400).json({ error: '工单已关闭，无法回复' });

    await TicketReply.createByUser(id, req.user.id, content);
    const updated = await Ticket.getById(id);
    const replies = await TicketReply.getByTicketId(id);

    res.json({ message: '回复成功', data: { ticket: updated, replies } });
  } catch (error) {
    console.error('回复工单失败:', error);
    res.status(500).json({ error: '回复工单失败' });
  }
};

// 用户关闭工单
const closeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.user_id !== req.user.id) return res.status(403).json({ error: '无权操作该工单' });
    if (ticket.status === 'closed') return res.status(400).json({ error: '工单已关闭' });

    await Ticket.close(req.params.id, 'user');

    res.json({ message: '工单已关闭' });
  } catch (error) {
    console.error('关闭工单失败:', error);
    res.status(500).json({ error: '关闭工单失败' });
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketDetail,
  replyTicket,
  closeTicket
};
