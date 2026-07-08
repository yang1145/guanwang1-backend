const db = require('../config/db');

class AiConfig {
  // 获取 AI 配置（单条记录，固定 id=1）
  static async get() {
    try {
      const [rows] = await db.query('SELECT * FROM ai_config LIMIT 1');
      return rows[0] || null;
    } catch (error) {
      console.error('获取 AI 配置时出错:', error);
      throw error;
    }
  }

  // 更新 AI 配置（仅更新传入的字段）
  static async update(fields) {
    const allowedFields = [
      'provider',
      'api_key',
      'api_base_url',
      'model',
      'system_prompt',
      'max_context_messages',
      'daily_global_limit',
      'retention_days',
      'enabled',
      'guest_allowed',
      'guest_daily_limit',
      'default_daily_limit',
      'default_monthly_limit',
      'default_total_limit',
      'temperature',
      'max_tokens'
    ];

    const updates = [];
    const values = [];

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    if (updates.length === 0) {
      throw new Error('没有提供可更新的配置字段');
    }

    values.push(1); // id = 1

    const query = `UPDATE ai_config SET ${updates.join(', ')} WHERE id = ?`;

    try {
      const [result] = await db.query(query, values);
      return result.affectedRows;
    } catch (error) {
      console.error('更新 AI 配置时出错:', error);
      throw error;
    }
  }
}

module.exports = AiConfig;
