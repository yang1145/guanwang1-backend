const Ticket = require('../models/Ticket');
const TicketReply = require('../models/TicketReply');
const AdminPermission = require('../models/AdminPermission');

// 获取当前管理员的部门权限范围
async function getAdminDepartmentScope(adminId) {
  // 检查是否有 tickets.manage 权限（全部门）
  const perms = await AdminPermission.getByAdminId(adminId);
  const codes = perms.map(p => p.code);
  if (codes.includes('tickets.manage')) {
    return { all: true, ids: null };
  }
  // 否则只返回已分配的部门
  const ids = await TicketReply.getAdminDepartmentIds(adminId);
  return { all: false, ids };
}

// 管理员获取工单列表
const getAllTickets = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, departmentId, urgency, search } = req.query;
    const scope = await getAdminDepartmentScope(req.admin.id);

    if (!scope.all && scope.ids.length === 0) {
      return res.json({ message: '获取工单列表成功', rows: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    }

    const result = await Ticket.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      departmentId: departmentId ? parseInt(departmentId) : null,
      urgency,
      search,
      departmentIds: scope.all ? null : scope.ids
    });

    res.json({ message: '获取工单列表成功', ...result });
  } catch (error) {
    console.error('获取工单列表失败:', error);
    res.status(500).json({ error: '获取工单列表失败' });
  }
};

// 管理员获取工单详情
const getTicketDetail = async (req, res) => {
  try {
    const ticket = await Ticket.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });

    // 权限检查：必须有全部门权限或者是该部门的受理人
    const scope = await getAdminDepartmentScope(req.admin.id);
    if (!scope.all && !scope.ids.includes(ticket.department_id)) {
      return res.status(403).json({ error: '无权查看该部门的工单' });
    }

    const replies = await TicketReply.getByTicketId(req.params.id);
    const transfers = await TicketReply.getTransfersByTicketId(req.params.id);

    res.json({
      message: '获取工单详情成功',
      data: { ticket, replies, transfers }
    });
  } catch (error) {
    console.error('获取工单详情失败:', error);
    res.status(500).json({ error: '获取工单详情失败' });
  }
};

// 管理员回复工单
const replyTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) return res.status(400).json({ error: '回复内容不能为空' });

    const ticket = await Ticket.getById(id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.status === 'closed') return res.status(400).json({ error: '工单已关闭，无法回复' });

    const scope = await getAdminDepartmentScope(req.admin.id);
    if (!scope.all && !scope.ids.includes(ticket.department_id)) {
      return res.status(403).json({ error: '无权操作该部门的工单' });
    }

    await TicketReply.createByAdmin(id, req.admin.id, content);
    const updated = await Ticket.getById(id);
    const replies = await TicketReply.getByTicketId(id);

    res.json({ message: '回复成功', data: { ticket: updated, replies } });
  } catch (error) {
    console.error('回复工单失败:', error);
    res.status(500).json({ error: '回复工单失败' });
  }
};

// 管理员接手工单
const assignTicket = async (req, res) => {
  try {
    const ticket = await Ticket.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });

    const scope = await getAdminDepartmentScope(req.admin.id);
    if (!scope.all && !scope.ids.includes(ticket.department_id)) {
      return res.status(403).json({ error: '无权操作该部门的工单' });
    }

    await Ticket.assign(req.params.id, req.admin.id);
    const updated = await Ticket.getById(req.params.id);

    res.json({ message: '已接手工单', data: { ticket: updated } });
  } catch (error) {
    console.error('接手工单失败:', error);
    res.status(500).json({ error: '接手工单失败' });
  }
};

// 管理员转交工单
const transferTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId, assignedAdminId, reason } = req.body;

    if (!departmentId && !assignedAdminId) {
      return res.status(400).json({ error: '请指定转交目标部门或管理员' });
    }

    const ticket = await Ticket.getById(id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.status === 'closed') return res.status(400).json({ error: '工单已关闭，无法转交' });

    const scope = await getAdminDepartmentScope(req.admin.id);
    if (!scope.all && !scope.ids.includes(ticket.department_id)) {
      return res.status(403).json({ error: '无权操作该部门的工单' });
    }

    // 记录转交日志
    await TicketReply.logTransfer(
      id,
      ticket.department_id,
      departmentId || null,
      req.admin.id,
      assignedAdminId || null,
      reason || ''
    );

    // 执行转交
    await Ticket.transfer(id, {
      departmentId: departmentId || null,
      assignedAdminId: assignedAdminId || null
    });

    const updated = await Ticket.getById(id);
    const transfers = await TicketReply.getTransfersByTicketId(id);

    res.json({ message: '工单转交成功', data: { ticket: updated, transfers } });
  } catch (error) {
    console.error('转交工单失败:', error);
    res.status(500).json({ error: '转交工单失败' });
  }
};

// 管理员关闭工单
const closeTicket = async (req, res) => {
  try {
    const ticket = await Ticket.getById(req.params.id);
    if (!ticket) return res.status(404).json({ error: '工单不存在' });
    if (ticket.status === 'closed') return res.status(400).json({ error: '工单已关闭' });

    const scope = await getAdminDepartmentScope(req.admin.id);
    if (!scope.all && !scope.ids.includes(ticket.department_id)) {
      return res.status(403).json({ error: '无权操作该部门的工单' });
    }

    await Ticket.close(req.params.id, 'admin');

    res.json({ message: '工单已关闭' });
  } catch (error) {
    console.error('关闭工单失败:', error);
    res.status(500).json({ error: '关闭工单失败' });
  }
};

// 管理员获取工单统计
const getTicketStats = async (req, res) => {
  try {
    const scope = await getAdminDepartmentScope(req.admin.id);
    const stats = await Ticket.getAdminStats(scope.all ? null : scope.ids);
    res.json({ message: '获取工单统计成功', data: stats });
  } catch (error) {
    console.error('获取工单统计失败:', error);
    res.status(500).json({ error: '获取工单统计失败' });
  }
};

module.exports = {
  getAllTickets,
  getTicketDetail,
  replyTicket,
  assignTicket,
  transferTicket,
  closeTicket,
  getTicketStats
};
