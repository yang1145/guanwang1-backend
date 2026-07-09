const db = require('../config/db');

class Ticket {
  // 用户创建工单
  static async create({ userId, departmentId, urgency, title, content }) {
    const [result] = await db.query(
      `INSERT INTO tickets (user_id, department_id, urgency, title, content, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [userId, departmentId, urgency, title, content]
    );
    return result.insertId;
  }

  // 用户获取自己的工单列表
  static async getByUserId(userId, { page = 1, limit = 20, status } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE t.user_id = ?';
    const params = [userId];

    if (status) {
      where += ' AND t.status = ?';
      params.push(status);
    }

    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM tickets t ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT t.*, d.name as department_name,
              (SELECT COUNT(*) FROM ticket_replies WHERE ticket_id = t.id) as reply_count
       FROM tickets t
       LEFT JOIN ticket_departments d ON t.department_id = d.id
       ${where}
       ORDER BY t.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // 管理员获取工单列表（支持部门筛选）
  static async getAll({ page = 1, limit = 20, status, departmentId, urgency, search, departmentIds } = {}) {
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND t.status = ?';
      params.push(status);
    }
    if (departmentId) {
      where += ' AND t.department_id = ?';
      params.push(departmentId);
    }
    if (urgency) {
      where += ' AND t.urgency = ?';
      params.push(urgency);
    }
    if (search) {
      where += ' AND (t.title LIKE ? OR t.content LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (departmentIds && departmentIds.length > 0) {
      where += ` AND t.department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }

    const [countRows] = await db.query(`SELECT COUNT(*) as total FROM tickets t ${where}`, params);
    const total = countRows[0].total;

    const [rows] = await db.query(
      `SELECT t.*, d.name as department_name,
              u.phone as user_phone, u.email as user_email,
              a.username as assigned_admin_name,
              (SELECT COUNT(*) FROM ticket_replies WHERE ticket_id = t.id) as reply_count
       FROM tickets t
       LEFT JOIN ticket_departments d ON t.department_id = d.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN admins a ON t.assigned_admin_id = a.id
       ${where}
       ORDER BY t.urgency_order DESC, t.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // 根据ID获取工单详情
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT t.*, d.name as department_name,
              u.phone as user_phone, u.email as user_email,
              a.username as assigned_admin_name
       FROM tickets t
       LEFT JOIN ticket_departments d ON t.department_id = d.id
       LEFT JOIN users u ON t.user_id = u.id
       LEFT JOIN admins a ON t.assigned_admin_id = a.id
       WHERE t.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // 更新工单状态
  static async updateStatus(id, status, adminId = null) {
    if (adminId) {
      const [result] = await db.query(
        'UPDATE tickets SET status = ?, assigned_admin_id = COALESCE(assigned_admin_id, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, adminId, id]
      );
      return result.affectedRows > 0;
    }
    const [result] = await db.query(
      'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    return result.affectedRows > 0;
  }

  // 接手工单（管理员认领）
  static async assign(id, adminId) {
    const [result] = await db.query(
      'UPDATE tickets SET assigned_admin_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [adminId, id]
    );
    return result.affectedRows > 0;
  }

  // 转交工单
  static async transfer(id, { departmentId, assignedAdminId }) {
    const updates = [];
    const params = [];

    if (departmentId) {
      updates.push('department_id = ?');
      params.push(departmentId);
    }
    if (assignedAdminId !== undefined) {
      updates.push('assigned_admin_id = ?');
      params.push(assignedAdminId);
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const [result] = await db.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    return result.affectedRows > 0;
  }

  // 关闭工单
  static async close(id, closedBy) {
    const [result] = await db.query(
      'UPDATE tickets SET status = ?, closed_by = ?, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['closed', closedBy, id]
    );
    return result.affectedRows > 0;
  }

  // 用户获取自己的工单数量统计
  static async getUserStats(userId) {
    const [rows] = await db.query(
      `SELECT status, COUNT(*) as count FROM tickets WHERE user_id = ? GROUP BY status`,
      [userId]
    );
    return rows;
  }

  // 管理员获取工单统计
  static async getAdminStats(departmentIds) {
    let where = '';
    const params = [];
    if (departmentIds && departmentIds.length > 0) {
      where = `WHERE department_id IN (${departmentIds.map(() => '?').join(',')})`;
      params.push(...departmentIds);
    }
    const [rows] = await db.query(
      `SELECT status, COUNT(*) as count FROM tickets ${where} GROUP BY status`,
      params
    );
    return rows;
  }
}

module.exports = Ticket;
