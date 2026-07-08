const jwt = require('jsonwebtoken');

/**
 * 用户 JWT 认证中间件
 * 读取请求头 Authorization: Bearer <token>
 * 验证通过后挂载 req.user = { id, phone }
 */
const userAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供访问令牌' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '访问令牌格式不正确' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: '令牌无效' });
    }

    req.user = {
      id: decoded.id,
      phone: decoded.phone
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '令牌格式错误' });
    }
    console.error('用户认证时出错:', error);
    return res.status(401).json({ error: '认证失败' });
  }
};

module.exports = userAuth;
