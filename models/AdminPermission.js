const db = require('../config/db');

class AdminPermission {
  // 获取所有权限
  static async getAll() {
    const [rows] = await db.query(
      'SELECT id, code, name, description, created_at FROM admin_permissions ORDER BY code'
    );
    return rows;
  }

  // 根据code获取权限
  static async getByCode(code) {
    const [rows] = await db.query(
      'SELECT id, code, name, description FROM admin_permissions WHERE code = ?',
      [code]
    );
    return rows[0] || null;
  }

  // 根据ID获取权限
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT id, code, name, description, created_at FROM admin_permissions WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // 获取角色拥有的权限
  static async getByRoleId(roleId) {
    const [rows] = await db.query(
      `SELECT p.id, p.code, p.name, p.description
       FROM admin_permissions p
       INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.code`,
      [roleId]
    );
    return rows;
  }

  // 获取管理员的所有权限（通过角色）
  static async getByAdminId(adminId) {
    const [rows] = await db.query(
      `SELECT DISTINCT p.id, p.code, p.name, p.description
       FROM admin_permissions p
       INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
       INNER JOIN admins a ON a.role_id = rp.role_id
       WHERE a.id = ?
       ORDER BY p.code`,
      [adminId]
    );
    return rows;
  }
}

module.exports = AdminPermission;
