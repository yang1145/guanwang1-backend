const db = require('../config/db');
const bcrypt = require('bcryptjs');

class Admin {
  // 根据用户名获取管理员信息（含角色）
  static async getByUsername(username) {
    const [rows] = await db.query(
      `SELECT a.id, a.username, a.password, a.role_id, a.created_at,
              r.name as role_name
       FROM admins a
       LEFT JOIN admin_roles r ON a.role_id = r.id
       WHERE a.username = ?`,
      [username]
    );
    return rows[0] || null;
  }

  // 验证管理员密码
  static async validatePassword(inputPassword, hashedPassword) {
    return bcrypt.compare(inputPassword, hashedPassword);
  }

  // 创建管理员
  static async create(username, password, roleId) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO admins (username, password, role_id) VALUES (?, ?, ?)',
      [username, hashedPassword, roleId || null]
    );
    return result.insertId;
  }

  // 重置管理员密码
  static async resetPassword(username, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query(
      'UPDATE admins SET password = ? WHERE username = ?',
      [hashedPassword, username]
    );
    return result.affectedRows;
  }

  // 修改管理员密码
  static async changePassword(id, currentPassword, newPassword) {
    const [rows] = await db.query('SELECT password FROM admins WHERE id = ?', [id]);
    if (rows.length === 0) {
      throw new Error('管理员不存在');
    }
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!isCurrentPasswordValid) {
      throw new Error('当前密码错误');
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const [result] = await db.query(
      'UPDATE admins SET password = ? WHERE id = ?',
      [hashedNewPassword, id]
    );
    return result.affectedRows > 0;
  }

  // 获取所有管理员（含角色信息）
  static async getAll() {
    const [rows] = await db.query(
      `SELECT a.id, a.username, a.role_id, a.created_at,
              r.name as role_name
       FROM admins a
       LEFT JOIN admin_roles r ON a.role_id = r.id
       ORDER BY a.id`
    );
    return rows;
  }

  // 根据ID获取管理员信息（含角色）
  static async getById(id) {
    const [rows] = await db.query(
      `SELECT a.id, a.username, a.role_id, a.created_at,
              r.name as role_name
       FROM admins a
       LEFT JOIN admin_roles r ON a.role_id = r.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  // 更新管理员信息
  static async update(id, { username, password, roleId }) {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        'UPDATE admins SET username = ?, password = ?, role_id = ? WHERE id = ?',
        [username, hashedPassword, roleId, id]
      );
      return result.affectedRows > 0;
    } else {
      const [result] = await db.query(
        'UPDATE admins SET username = ?, role_id = ? WHERE id = ?',
        [username, roleId, id]
      );
      return result.affectedRows > 0;
    }
  }

  // 删除管理员
  static async delete(id) {
    const [result] = await db.query('DELETE FROM admins WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // 检查用户名是否已存在
  static async usernameExists(username, excludeId) {
    let sql = 'SELECT id FROM admins WHERE username = ?';
    const params = [username];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    return rows.length > 0;
  }
}

module.exports = Admin;