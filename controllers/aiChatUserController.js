const AiConfig = require('../models/AiConfig');
const AiChatSession = require('../models/AiChatSession');
const AiChatMessage = require('../models/AiChatMessage');
const AiUserQuota = require('../models/AiUserQuota');
const { chatCompletion } = require('../services/aiProvider');

// 创建新会话
const createSession = async (req, res) => {
  try {
    const { title } = req.body;
    const userId = req.user.id;

    const sessionId = await AiChatSession.create(userId, title || '');

    res.status(201).json({
      message: '会话创建成功',
      data: {
        id: sessionId,
        user_id: userId,
        title: title || ''
      }
    });
  } catch (error) {
    console.error('创建会话时出错:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
};

// 获取当前用户的所有会话
const listMySessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await AiChatSession.getByUser(userId);

    res.json({
      message: '会话列表获取成功',
      data: sessions
    });
  } catch (error) {
    console.error('获取会话列表时出错:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
};

// 获取当前用户某会话的消息
const getSessionMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await AiChatSession.getById(id);

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    if (session.user_id !== userId) {
      return res.status(403).json({ error: '无权访问该会话' });
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

// 发送消息并调用 AI
const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '请提供消息内容' });
    }

    const trimmedContent = content.trim();

    // 校验会话归属
    const session = await AiChatSession.getById(id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ error: '无权访问该会话' });
    }

    // 获取 AI 配置
    const config = await AiConfig.get();
    if (!config) {
      return res.status(500).json({ error: 'AI 配置不存在' });
    }

    // 获取或创建用户配额，并检查配额
    const quota = await AiUserQuota.getOrCreate(userId, config);
    const todayAssistantCount = await AiChatMessage.getTodayAssistantCount();
    const quotaCheck = AiUserQuota.checkQuota(quota, config, todayAssistantCount);

    if (!quotaCheck.allowed) {
      return res.status(429).json({ error: quotaCheck.reason });
    }

    // 保存用户消息
    const userMessageId = await AiChatMessage.create({
      session_id: id,
      user_id: userId,
      role: 'user',
      content: trimmedContent
    });

    // 构造上下文消息
    const messages = [];
    if (config.system_prompt) {
      messages.push({ role: 'system', content: config.system_prompt });
    }

    // 获取最近历史消息作为上下文
    const maxContext = config.max_context_messages || 10;
    const recentMessages = await AiChatMessage.getRecentBySession(id, maxContext);
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

    // 如果上下文里还没包含刚发的消息，则加入
    const hasCurrentMessage = recentMessages.some(m => m.id === userMessageId);
    if (!hasCurrentMessage) {
      messages.push({ role: 'user', content: trimmedContent });
    }

    // 调用 AI
    let assistantContent;
    try {
      assistantContent = await chatCompletion(messages);
    } catch (aiError) {
      console.error('AI 调用失败:', aiError.message);
      return res.status(503).json({ error: `AI 服务调用失败: ${aiError.message}` });
    }

    // 保存助手回复
    const assistantMessageId = await AiChatMessage.create({
      session_id: id,
      user_id: userId,
      role: 'assistant',
      content: assistantContent
    });

    // 更新会话时间戳
    await AiChatSession.updateTimestamp(id);

    // 自动生成标题（首次用户消息且标题为空）
    if (!session.title && recentMessages.filter(m => m.role === 'user').length === 0) {
      const autoTitle = trimmedContent.slice(0, 20) + (trimmedContent.length > 20 ? '...' : '');
      await AiChatSession.updateTitle(id, autoTitle);
    }

    // 增加用户使用量
    await AiUserQuota.incrementUsage(userId);

    res.json({
      message: '消息发送成功',
      data: {
        user_message: {
          id: userMessageId,
          role: 'user',
          content: trimmedContent
        },
        assistant_message: {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent
        }
      }
    });
  } catch (error) {
    console.error('发送消息时出错:', error);
    res.status(500).json({ error: '发送消息失败' });
  }
};

// 删除当前用户的会话
const deleteMySession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const session = await AiChatSession.getById(id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }
    if (session.user_id !== userId) {
      return res.status(403).json({ error: '无权删除该会话' });
    }

    await AiChatMessage.deleteBySession(id);
    await AiChatSession.deleteById(id);

    res.json({
      message: '会话删除成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除会话时出错:', error);
    res.status(500).json({ error: '删除会话失败' });
  }
};

// 获取当前用户的配额
const getMyQuota = async (req, res) => {
  try {
    const userId = req.user.id;

    const config = await AiConfig.get();
    if (!config) {
      return res.status(404).json({ error: 'AI 配置不存在' });
    }

    const quota = await AiUserQuota.getOrCreate(userId, config);

    res.json({
      message: '配额信息获取成功',
      data: quota
    });
  } catch (error) {
    console.error('获取配额信息时出错:', error);
    res.status(500).json({ error: '获取配额信息失败' });
  }
};

module.exports = {
  createSession,
  listMySessions,
  getSessionMessages,
  sendMessage,
  deleteMySession,
  getMyQuota
};
