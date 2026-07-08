const AiConfig = require('../models/AiConfig');
const AiChatSession = require('../models/AiChatSession');
const AiChatMessage = require('../models/AiChatMessage');
const AiUserQuota = require('../models/AiUserQuota');

// 获取 AI 配置（api_key 做掩码处理）
const getConfig = async (req, res) => {
  try {
    const config = await AiConfig.get();

    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    // 对 API Key 做掩码处理，避免前端直接暴露完整密钥
    if (config.api_key && config.api_key.length > 8) {
      config.api_key = config.api_key.slice(0, 4) + '****' + config.api_key.slice(-4);
    }

    res.json({
      message: 'AI 配置获取成功',
      data: config
    });
  } catch (error) {
    console.error('获取 AI 配置时出错:', error);
    res.status(500).json({ error: '获取 AI 配置失败' });
  }
};

// 更新 AI 配置
const updateConfig = async (req, res) => {
  try {
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

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '没有提供可更新的配置字段' });
    }

    // 简单校验数值字段
    if (updates.max_context_messages !== undefined && (!Number.isInteger(updates.max_context_messages) || updates.max_context_messages < 0)) {
      return res.status(400).json({ error: 'max_context_messages 必须是大于等于 0 的整数' });
    }
    if (updates.daily_global_limit !== undefined && (!Number.isInteger(updates.daily_global_limit) || updates.daily_global_limit < 0)) {
      return res.status(400).json({ error: 'daily_global_limit 必须是大于等于 0 的整数' });
    }
    if (updates.retention_days !== undefined && (!Number.isInteger(updates.retention_days) || updates.retention_days < 0)) {
      return res.status(400).json({ error: 'retention_days 必须是大于等于 0 的整数' });
    }
    if (updates.enabled !== undefined && ![0, 1, true, false].includes(updates.enabled)) {
      return res.status(400).json({ error: 'enabled 必须是 0 或 1' });
    }
    if (updates.guest_allowed !== undefined && ![0, 1, true, false].includes(updates.guest_allowed)) {
      return res.status(400).json({ error: 'guest_allowed 必须是 0 或 1' });
    }
    if (updates.guest_daily_limit !== undefined && (!Number.isInteger(updates.guest_daily_limit) || updates.guest_daily_limit < 0)) {
      return res.status(400).json({ error: 'guest_daily_limit 必须是大于等于 0 的整数' });
    }

    const result = await AiConfig.update(updates);

    if (result === 0) {
      return res.status(400).json({ error: '更新 AI 配置失败' });
    }

    const updatedConfig = await AiConfig.get();

    res.json({
      message: 'AI 配置更新成功',
      data: updatedConfig
    });
  } catch (error) {
    console.error('更新 AI 配置时出错:', error);
    res.status(500).json({ error: '更新 AI 配置失败' });
  }
};

// 立即清理超过保留天数的聊天记录
const cleanupNow = async (req, res) => {
  try {
    const config = await AiConfig.get();

    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    const retentionDays = config.retention_days || 30;
    const deletedMessages = await AiChatMessage.deleteOlderThan(retentionDays);
    const deletedSessions = await AiChatSession.deleteEmptyOlderThan(retentionDays);

    res.json({
      message: '聊天记录清理完成',
      data: {
        deletedMessages,
        deletedSessions,
        retentionDays
      }
    });
  } catch (error) {
    console.error('清理聊天记录时出错:', error);
    res.status(500).json({ error: '清理聊天记录失败' });
  }
};

// 获取所有会话（分页）
const listSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await AiChatSession.getAll(page, limit);

    res.json({
      message: '会话列表获取成功',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('获取会话列表时出错:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
};

// 获取某会话的所有消息
const getSessionMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await AiChatSession.getById(id);

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const messages = await AiChatMessage.getBySession(id);

    res.json({
      message: '会话消息获取成功',
      data: {
        session,
        messages
      }
    });
  } catch (error) {
    console.error('获取会话消息时出错:', error);
    res.status(500).json({ error: '获取会话消息失败' });
  }
};

// 删除会话及其消息
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    await AiChatMessage.deleteBySession(id);
    const result = await AiChatSession.deleteById(id);

    if (result === 0) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json({
      message: '会话删除成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除会话时出错:', error);
    res.status(500).json({ error: '删除会话失败' });
  }
};

// 删除单条消息
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await AiChatMessage.deleteById(id);

    if (result === 0) {
      return res.status(404).json({ error: '消息不存在' });
    }

    res.json({
      message: '消息删除成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除消息时出错:', error);
    res.status(500).json({ error: '删除消息失败' });
  }
};

// 获取指定用户的配额
const getUserQuota = async (req, res) => {
  try {
    const { userId } = req.params;

    const config = await AiConfig.get();
    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    const quota = await AiUserQuota.getOrCreate(parseInt(userId), config);

    res.json({
      message: '用户配额获取成功',
      data: quota
    });
  } catch (error) {
    console.error('获取用户配额时出错:', error);
    res.status(500).json({ error: '获取用户配额失败' });
  }
};

// 设置指定用户的配额
const setUserQuota = async (req, res) => {
  try {
    const { userId } = req.params;
    const { daily_limit, monthly_limit, total_limit } = req.body;

    if (daily_limit === undefined && monthly_limit === undefined && total_limit === undefined) {
      return res.status(400).json({ error: '请提供 daily_limit、monthly_limit 或 total_limit' });
    }

    // 校验数值
    const limits = {};
    if (daily_limit !== undefined) {
      if (!Number.isInteger(daily_limit) || daily_limit < 0) {
        return res.status(400).json({ error: 'daily_limit 必须是大于等于 0 的整数' });
      }
      limits.daily_limit = daily_limit;
    }
    if (monthly_limit !== undefined) {
      if (!Number.isInteger(monthly_limit) || monthly_limit < 0) {
        return res.status(400).json({ error: 'monthly_limit 必须是大于等于 0 的整数' });
      }
      limits.monthly_limit = monthly_limit;
    }
    if (total_limit !== undefined) {
      if (!Number.isInteger(total_limit) || total_limit < 0) {
        return res.status(400).json({ error: 'total_limit 必须是大于等于 0 的整数' });
      }
      limits.total_limit = total_limit;
    }

    // 确保用户配额记录存在
    const config = await AiConfig.get();
    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    await AiUserQuota.getOrCreate(parseInt(userId), config);

    const result = await AiUserQuota.setLimits(parseInt(userId), {
      daily_limit: limits.daily_limit,
      monthly_limit: limits.monthly_limit,
      total_limit: limits.total_limit
    });

    if (result === 0) {
      return res.status(400).json({ error: '设置用户配额失败' });
    }

    const updatedQuota = await AiUserQuota.getByUser(parseInt(userId));

    res.json({
      message: '用户配额设置成功',
      data: updatedQuota
    });
  } catch (error) {
    console.error('设置用户配额时出错:', error);
    res.status(500).json({ error: '设置用户配额失败' });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  cleanupNow,
  listSessions,
  getSessionMessages,
  deleteSession,
  deleteMessage,
  getUserQuota,
  setUserQuota
};
