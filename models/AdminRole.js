const db = require('../config/db');

class AdminRole {
  // 获取所有角色
  static async getAll() {
    const [rows] = await db.query(
      'SELECT id, name, description, created_at FROM admin_roles ORDER BY id'
    );
    return rows;
  }

  // 根据ID获取角色
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT id, name, description, created_at FROM admin_roles WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // 根据名称获取角色
  static async getByName(name) {
    const [rows] = await db.query(
      'SELECT id, name, description FROM admin_roles WHERE name = ?',
      [name]
    );
    return rows[0] || null;
  }

  // 创建角色
  static async create(name, description) {
    const [result] = await db.query(
      'INSERT INTO admin_roles (name, description) VALUES (?, ?)',
      [name, description]
    );
    return result.insertId;
  }

  // 更新角色
  static async update(id, name, description) {
    const [result] = await db.query(
      'UPDATE admin_roles SET name = ?, description = ? WHERE id = ?',
      [name, description, id]
    );
    return result.affectedRows > 0;
  }

  // 删除角色
  static async delete(id) {
    // 先解除该角色的管理员关联
    await db.query('UPDATE admins SET role_id = NULL WHERE role_id = ?', [id]);
    // 删除角色权限关联
    await db.query('DELETE FROM admin_role_permissions WHERE role_id = ?', [id]);
    // 删除角色
    const [result] = await db.query('DELETE FROM admin_roles WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // 为角色分配权限
  static async assignPermissions(roleId, permissionIds) {
    // 先清除现有权限
    await db.query('DELETE FROM admin_role_permissions WHERE role_id = ?', [roleId]);
    // 批量插入新权限
    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds.map(pid => [roleId, pid]);
      // 构建批量插入SQL
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const flatValues = values.flat();
      await db.query(
        `INSERT INTO admin_role_permissions (role_id, permission_id) VALUES ${placeholders}`,
        flatValues
      );
    }
    return true;
  }

  // 获取角色的权限ID列表
  static async getPermissionIds(roleId) {
    const [rows] = await db.query(
      'SELECT permission_id FROM admin_role_permissions WHERE role_id = ?',
      [roleId]
    );
    return rows.map(r => r.permission_id);
  }

  // 获取角色详情（含权限列表）
  static async getDetail(id) {
    const role = await this.getById(id);
    if (!role) return null;
    const permissions = await db.query(
      `SELECT p.id, p.code, p.name, p.description
       FROM admin_permissions p
       INNER JOIN admin_role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.code`,
      [id]
    );
    role.permissions = permissions[0];
    return role;
  }
}

module.exports = AdminRole;
