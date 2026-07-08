const jwt = require('jsonwebtoken');

/**
 * 访客 JWT 认证中间件
 * 读取请求头 Authorization: Bearer <guest_token>
 * 验证通过后挂载 req.guestSessionId
 * 访客令牌由 POST /api/ai-chat/guest/sessions 签发，仅包含 session_id
 */
const guestAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供访客令牌' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '访客令牌格式不正确' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (!decoded || decoded.type !== 'guest' || !decoded.session_id) {
      return res.status(401).json({ error: '访客令牌无效' });
    }

    req.guestSessionId = decoded.session_id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '访客令牌已过期' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '访客令牌格式错误' });
    }
    console.error('访客认证时出错:', error);
    return res.status(401).json({ error: '访客认证失败' });
  }
};

module.exports = guestAuth;
