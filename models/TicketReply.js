const db = require('../config/db');

class TicketReply {
  // 获取工单的所有回复
  static async getByTicketId(ticketId) {
    const [rows] = await db.query(
      `SELECT tr.*, 
              u.phone as user_phone, u.email as user_email,
              a.username as admin_username
       FROM ticket_replies tr
       LEFT JOIN users u ON tr.user_id = u.id
       LEFT JOIN admins a ON tr.admin_id = a.id
       WHERE tr.ticket_id = ?
       ORDER BY tr.created_at ASC`,
      [ticketId]
    );
    return rows;
  }

  // 用户回复
  static async createByUser(ticketId, userId, content) {
    const [result] = await db.query(
      'INSERT INTO ticket_replies (ticket_id, user_id, content, reply_type) VALUES (?, ?, ?, ?)',
      [ticketId, userId, content, 'user']
    );
    // 更新工单状态为 replied
    await db.query(
      "UPDATE tickets SET status = 'replied', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [ticketId]
    );
    return result.insertId;
  }

  // 管理员回复
  static async createByAdmin(ticketId, adminId, content) {
    const [result] = await db.query(
      'INSERT INTO ticket_replies (ticket_id, admin_id, content, reply_type) VALUES (?, ?, ?, ?)',
      [ticketId, adminId, content, 'admin']
    );
    // 更新工单状态为 replied，并关联管理员
    await db.query(
      "UPDATE tickets SET status = 'replied', assigned_admin_id = COALESCE(assigned_admin_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [adminId, ticketId]
    );
    return result.insertId;
  }

  // 管理员获取某个部门ID列表（通过 admin_departments）
  static async getAdminDepartmentIds(adminId) {
    const [rows] = await db.query(
      'SELECT department_id FROM admin_departments WHERE admin_id = ?',
      [adminId]
    );
    return rows.map(r => r.department_id);
  }

  // 记录转交
  static async logTransfer(ticketId, fromDeptId, toDeptId, fromAdminId, toAdminId, reason) {
    const [result] = await db.query(
      `INSERT INTO ticket_transfers (ticket_id, from_department_id, to_department_id, from_admin_id, to_admin_id, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, fromDeptId || null, toDeptId || null, fromAdminId, toAdminId || null, reason || '']
    );
    return result.insertId;
  }

  // 获取工单转交记录
  static async getTransfersByTicketId(ticketId) {
    const [rows] = await db.query(
      `SELECT tr.*, 
              fd.name as from_department_name,
              td.name as to_department_name,
              fa.username as from_admin_name,
              ta.username as to_admin_name
       FROM ticket_transfers tr
       LEFT JOIN ticket_departments fd ON tr.from_department_id = fd.id
       LEFT JOIN ticket_departments td ON tr.to_department_id = td.id
       LEFT JOIN admins fa ON tr.from_admin_id = fa.id
       LEFT JOIN admins ta ON tr.to_admin_id = ta.id
       WHERE tr.ticket_id = ?
       ORDER BY tr.created_at ASC`,
      [ticketId]
    );
    return rows;
  }
}

module.exports = TicketReply;
