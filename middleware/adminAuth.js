const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AdminPermission = require('../models/AdminPermission');

/**
 * 管理员 JWT 认证中间件
 * 读取请求头 Authorization: Bearer <token>
 * 验证通过后挂载 req.admin = { id, username, role_id, role_name }
 */
const adminAuth = async (req, res, next) => {
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

    if (!decoded || !decoded.id || decoded.type !== 'admin') {
      return res.status(401).json({ error: '令牌无效' });
    }

    // 验证管理员是否仍然存在
    const admin = await Admin.getById(decoded.id);
    if (!admin) {
      return res.status(401).json({ error: '管理员账户不存在' });
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      role_id: admin.role_id,
      role_name: admin.role_name
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '登录已过期，请重新登录' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '令牌格式错误' });
    }
    console.error('管理员认证时出错:', error);
    return res.status(401).json({ error: '认证失败' });
  }
};

/**
 * 权限检查中间件工厂函数
 * @param {string} permissionCode - 需要的权限代码
 * @returns {Function} Express 中间件
 *
 * 用法示例:
 *   const { requirePermission } = require('../middleware/adminAuth');
 *   router.delete('/:id', adminAuth, requirePermission('admins.manage'), deleteAdmin);
 */
const requirePermission = (permissionCode) => {
  return async (req, res, next) => {
    try {
      const permissions = await AdminPermission.getByAdminId(req.admin.id);
      const codes = permissions.map(p => p.code);

      if (!codes.includes(permissionCode)) {
        return res.status(403).json({ error: '没有操作权限' });
      }

      next();
    } catch (error) {
      console.error('权限检查失败:', error);
      return res.status(500).json({ error: '权限检查失败' });
    }
  };
};

module.exports = adminAuth;
module.exports.requirePermission = requirePermission;
