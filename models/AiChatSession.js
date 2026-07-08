const db = require('../config/db');

class AiChatSession {
  // 创建会话
  static async create(userId, title = '') {
    const [result] = await db.query(
      'INSERT INTO ai_chat_sessions (user_id, title) VALUES (?, ?)',
      [userId, title]
    );
    return result.insertId;
  }

  // 根据 ID 获取会话
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM ai_chat_sessions WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // 获取用户的所有会话
  static async getByUser(userId) {
    const [rows] = await db.query(
      'SELECT * FROM ai_chat_sessions WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    return rows;
  }

  // 分页获取所有会话（管理员使用）
  static async getAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      'SELECT * FROM ai_chat_sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM ai_chat_sessions');
    const total = countResult[0].total;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // 更新会话标题
  static async updateTitle(id, title) {
    const [result] = await db.query(
      'UPDATE ai_chat_sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, id]
    );
    return result.affectedRows;
  }

  // 更新会话时间戳
  static async updateTimestamp(id) {
    const [result] = await db.query(
      'UPDATE ai_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  // 根据 ID 删除会话
  static async deleteById(id) {
    const [result] = await db.query(
      'DELETE FROM ai_chat_sessions WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  // 删除指定天数前更新的空会话（没有消息的会话）
  static async deleteEmptyOlderThan(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const [result] = await db.query(
      `DELETE FROM ai_chat_sessions 
       WHERE updated_at < ? 
         AND id NOT IN (SELECT session_id FROM ai_chat_messages)`,
      [cutoffStr]
    );
    return result.affectedRows;
  }
}

module.exports = AiChatSession;
