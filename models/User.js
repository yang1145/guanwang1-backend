const db = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  // 根据手机号获取用户信息
  static async getByPhone(phone) {
    try {
      const [rows] = await db.query(
        'SELECT id, phone, email, password FROM users WHERE phone = ?',
        [phone]
      );
      
      if (rows.length > 0) {
        return rows[0];
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  // 根据邮箱获取用户信息
  static async getByEmail(email) {
    try {
      const [rows] = await db.query(
        'SELECT id, phone, email, password FROM users WHERE email = ?',
        [email]
      );
      
      if (rows.length > 0) {
        return rows[0];
      } else {
        return null;
      }
    } catch (error) {
      throw error;
    }
  }

  // 创建用户
  static async create(userData) {
    const { phone, email, password } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (phone, email, password) VALUES (?, ?, ?)',
      [phone, email, hashedPassword]
    );
    return result.insertId;
  }

  // 验证用户密码
  static async validatePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  // 获取所有用户（供管理员使用）
  static async getAll() {
    const [rows] = await db.query('SELECT id, phone, email, created_at FROM users ORDER BY created_at DESC');
    return rows;
  }

  // 根据ID获取用户（不含密码）
  static async getById(id) {
    const [rows] = await db.query('SELECT id, phone, email, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  }

  // 更新用户信息
  static async update(id, userData) {
    const { phone, email } = userData;
    const [result] = await db.query(
      'UPDATE users SET phone = ?, email = ? WHERE id = ?',
      [phone, email, id]
    );
    return result.affectedRows;
  }

  // 删除用户
  static async delete(id) {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows;
  }

  // 获取用户总数
  static async getCount() {
    try {
      const [rows] = await db.query('SELECT COUNT(*) as count FROM users');
      return rows[0].count;
    } catch (error) {
      console.error('获取用户总数时出错:', error);
      throw error;
    }
  }
}

module.exports = User;