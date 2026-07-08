const jwt = require('jsonwebtoken');
const AiConfig = require('../models/AiConfig');
const AiChatSession = require('../models/AiChatSession');
const AiChatMessage = require('../models/AiChatMessage');
const { chatCompletion } = require('../services/aiProvider');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GUEST_TOKEN_EXPIRES_IN = '7d'; // 访客令牌 7 天有效

// 生成访客令牌
function generateGuestToken(sessionId) {
  return jwt.sign(
    { type: 'guest', session_id: sessionId },
    JWT_SECRET,
    { expiresIn: GUEST_TOKEN_EXPIRES_IN }
  );
}

// 创建访客会话
const createGuestSession = async (req, res) => {
  try {
    const config = await AiConfig.get();

    if (!config || !config.enabled) {
      return res.status(503).json({ error: 'AI 聊天功能未启用' });
    }

    if (!config.guest_allowed) {
      return res.status(403).json({ error: '未登录用户暂不可使用 AI 聊天，请先登录' });
    }

    const sessionId = await AiChatSession.create(0, '访客会话');
    const guestToken = generateGuestToken(sessionId);

    res.status(201).json({
      message: '访客会话创建成功',
      data: {
        session_id: sessionId,
        guest_token: guestToken
      }
    });
  } catch (error) {
    console.error('创建访客会话时出错:', error);
    res.status(500).json({ error: '创建访客会话失败' });
  }
};

// 获取访客会话消息
const getGuestSessionMessages = async (req, res) => {
  try {
    const sessionId = req.guestSessionId;
    const { id } = req.params;

    if (parseInt(id) !== sessionId) {
      return res.status(403).json({ error: '无权访问该会话' });
    }

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
    console.error('获取访客会话消息时出错:', error);
    res.status(500).json({ error: '获取访客会话消息失败' });
  }
};

// 访客发送消息
const sendGuestMessage = async (req, res) => {
  try {
    const sessionId = req.guestSessionId;
    const { id } = req.params;
    const { content } = req.body;

    if (parseInt(id) !== sessionId) {
      return res.status(403).json({ error: '无权访问该会话' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: '请提供消息内容' });
    }

    const trimmedContent = content.trim();

    const session = await AiChatSession.getById(id);
    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const config = await AiConfig.get();
    if (!config || !config.enabled) {
      return res.status(503).json({ error: 'AI 聊天功能未启用' });
    }
    if (!config.guest_allowed) {
      return res.status(403).json({ error: '未登录用户暂不可使用 AI 聊天，请先登录' });
    }

    // 访客日限额检查
    if (config.guest_daily_limit > 0) {
      const todayGuestCount = await AiChatMessage.getTodayGuestAssistantCount();
      if (todayGuestCount >= config.guest_daily_limit) {
        return res.status(429).json({ error: '今日访客 AI 调用额度已用完，请明天再试或登录后继续使用' });
      }
    }

    // 保存访客消息
    const userMessageId = await AiChatMessage.create({
      session_id: id,
      user_id: 0,
      role: 'user',
      content: trimmedContent
    });

    // 构造上下文
    const messages = [];
    if (config.system_prompt) {
      messages.push({ role: 'system', content: config.system_prompt });
    }

    const maxContext = config.max_context_messages || 10;
    const recentMessages = await AiChatMessage.getRecentBySession(id, maxContext);
    for (const msg of recentMessages) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }

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
      user_id: 0,
      role: 'assistant',
      content: assistantContent
    });

    // 更新会话时间戳
    await AiChatSession.updateTimestamp(id);

    // 自动生成标题
    if (!session.title || session.title === '访客会话') {
      const autoTitle = trimmedContent.slice(0, 20) + (trimmedContent.length > 20 ? '...' : '');
      await AiChatSession.updateTitle(id, autoTitle);
    }

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
    console.error('访客发送消息时出错:', error);
    res.status(500).json({ error: '发送消息失败' });
  }
};

module.exports = {
  createGuestSession,
  getGuestSessionMessages,
  sendGuestMessage
};
