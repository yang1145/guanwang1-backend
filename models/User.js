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
}

module.exports = User;