const db = require('../config/db');

class AiUserQuota {
  // 根据用户 ID 获取配额
  static async getByUser(userId) {
    const [rows] = await db.query(
      'SELECT * FROM ai_user_quotas WHERE user_id = ?',
      [userId]
    );
    return rows[0] || null;
  }

  // 获取或创建用户配额，并自动处理日/月重置
  static async getOrCreate(userId, config) {
    let quota = await this.getByUser(userId);

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    const defaults = {
      daily_limit: config.default_daily_limit,
      monthly_limit: config.default_monthly_limit,
      total_limit: config.default_total_limit
    };

    if (!quota) {
      // 创建新配额记录
      const [result] = await db.query(
        `INSERT INTO ai_user_quotas 
         (user_id, daily_limit, monthly_limit, total_limit, used_today, used_month, used_total, last_reset_date, last_reset_month) 
         VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)`,
        [userId, defaults.daily_limit, defaults.monthly_limit, defaults.total_limit, today, month]
      );
      const newId = result.insertId;
      return await this.getById(newId);
    }

    // 检查是否需要重置日/月计数
    const needsDayReset = quota.last_reset_date !== today;
    const needsMonthReset = quota.last_reset_month !== month;

    if (needsDayReset || needsMonthReset) {
      const updates = [];
      const values = [];

      if (needsDayReset) {
        updates.push('used_today = 0');
        updates.push('last_reset_date = ?');
        values.push(today);
      }

      if (needsMonthReset) {
        updates.push('used_month = 0');
        updates.push('last_reset_month = ?');
        values.push(month);
      }

      values.push(quota.id);

      await db.query(
        `UPDATE ai_user_quotas SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      quota = await this.getById(quota.id);
    }

    return quota;
  }

  // 根据 ID 获取配额
  static async getById(id) {
    const [rows] = await db.query(
      'SELECT * FROM ai_user_quotas WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  // 设置用户配额限制
  static async setLimits(userId, { daily_limit, monthly_limit, total_limit }) {
    const [result] = await db.query(
      `UPDATE ai_user_quotas 
       SET daily_limit = ?, monthly_limit = ?, total_limit = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [daily_limit, monthly_limit, total_limit, userId]
    );
    return result.affectedRows;
  }

  // 增加用户使用量
  static async incrementUsage(userId) {
    const [result] = await db.query(
      `UPDATE ai_user_quotas 
       SET used_today = used_today + 1, used_month = used_month + 1, used_total = used_total + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = ?`,
      [userId]
    );
    return result.affectedRows;
  }

  // 检查用户配额是否超出限制
  static checkQuota(quota, config, todayAssistantCount) {
    // 检查 AI 功能是否启用
    if (!config || !config.enabled) {
      return { allowed: false, reason: 'AI 聊天功能未启用' };
    }

    // 检查全局日限额
    if (config.daily_global_limit > 0 && todayAssistantCount >= config.daily_global_limit) {
      return { allowed: false, reason: '今日全站 AI 调用额度已用完，请明天再试' };
    }

    // 检查用户日限额
    if (quota.daily_limit > 0 && quota.used_today >= quota.daily_limit) {
      return { allowed: false, reason: '您今日的 AI 调用额度已用完，请明天再试' };
    }

    // 检查用户月限额
    if (quota.monthly_limit > 0 && quota.used_month >= quota.monthly_limit) {
      return { allowed: false, reason: '您当月的 AI 调用额度已用完' };
    }

    // 检查用户总限额
    if (quota.total_limit > 0 && quota.used_total >= quota.total_limit) {
      return { allowed: false, reason: '您的 AI 调用总额度已用完' };
    }

    return { allowed: true };
  }
}

module.exports = AiUserQuota;
