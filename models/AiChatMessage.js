const db = require('../config/db');

class AiChatMessage {
  // 创建消息
  static async create({ session_id, user_id, role, content }) {
    const [result] = await db.query(
      'INSERT INTO ai_chat_messages (session_id, user_id, role, content) VALUES (?, ?, ?, ?)',
      [session_id, user_id, role, content]
    );
    return result.insertId;
  }

  // 根据 ID 获取消息
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM ai_chat_messages WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // 获取会话中的消息（按时间正序，管理员/用户查看完整历史）
  static async getBySession(sessionId) {
    const [rows] = await db.query(
      'SELECT * FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    return rows;
  }

  // 获取会话中最近 N 条消息（按时间倒序，用于构造上下文）
  static async getRecentBySession(sessionId, limit) {
    const [rows] = await db.query(
      'SELECT * FROM ai_chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?',
      [sessionId, limit]
    );
    // 返回按时间正序排列的消息，方便拼接上下文
    return rows.reverse();
  }

  // 获取今天所有访客助手回复的数量（用于访客日限额统计）
  static async getTodayGuestAssistantCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM ai_chat_messages WHERE role = ? AND user_id = 0 AND created_at >= ?',
      ['assistant', todayStr]
    );
    return rows[0].count;
  }

  // 获取今天所有助手回复的数量（用于全局日限额统计）
  static async getTodayAssistantCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM ai_chat_messages WHERE role = ? AND created_at >= ?',
      ['assistant', todayStr]
    );
    return rows[0].count;
  }

  // 根据 ID 删除消息
  static async deleteById(id) {
    const [result] = await db.query(
      'DELETE FROM ai_chat_messages WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }

  // 删除会话下的所有消息
  static async deleteBySession(sessionId) {
    const [result] = await db.query(
      'DELETE FROM ai_chat_messages WHERE session_id = ?',
      [sessionId]
    );
    return result.affectedRows;
  }

  // 删除指定天数之前的消息
  static async deleteOlderThan(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    const [result] = await db.query(
      'DELETE FROM ai_chat_messages WHERE created_at < ?',
      [cutoffStr]
    );
    return result.affectedRows;
  }
}

module.exports = AiChatMessage;
