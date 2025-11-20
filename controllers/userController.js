const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 用户注册
const register = async (req, res) => {
  try {
    const { phone, email, password } = req.body;

    // 检查是否提供了必需的字段
    if (!phone || !email || !password) {
      return res.status(400).json({ error: '请提供手机号、邮箱和密码' });
    }

    // 检查手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    // 检查邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '邮箱格式不正确' });
    }

    // 检查密码长度（至少6位）
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    // 检查手机号是否已存在
    const existingUserByPhone = await User.getByPhone(phone);
    if (existingUserByPhone) {
      return res.status(400).json({ error: '该手机号已被注册' });
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await User.getByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 创建新用户
    const userId = await User.create({ phone, email, password });

    // 注册成功，返回用户信息（不包含密码）
    res.status(201).json({
      message: '注册成功',
      data: {
        user: {
          id: userId,
          phone,
          email
        }
      }
    });
  } catch (error) {
    console.error('用户注册时出错: ' + error.stack);
    res.status(500).json({ error: '注册失败：服务器内部错误' });
  }
};

// 用户登录
const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 检查是否提供了手机号和密码
    if (!phone || !password) {
      return res.status(400).json({ error: '请提供手机号和密码' });
    }

    // 检查手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: '手机号格式不正确' });
    }

    // 检查密码长度（至少6位）
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    // 获取用户信息
    const user = await User.getByPhone(phone);
    if (!user) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await User.validatePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '手机号或密码错误' });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // 登录成功，返回用户信息和令牌
    res.json({
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    console.error('用户登录时出错: ' + error.stack);
    res.status(500).json({ error: '登录失败：服务器内部错误' });
  }
};

// 获取用户列表（管理员接口）
const getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    
    res.json({
      message: '用户列表获取成功',
      data: users
    });
  } catch (error) {
    console.error('获取用户列表时出错: ' + error.stack);
    res.status(500).json({ error: '获取用户列表失败' });
  }
};

// 获取特定用户信息（管理员接口）
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.getById(id);
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    res.json({
      message: '用户信息获取成功',
      data: user
    });
  } catch (error) {
    console.error('获取用户信息时出错: ' + error.stack);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

// 更新用户信息（管理员接口）
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, email } = req.body;
    
    // 检查用户是否存在
    const existingUser = await User.getById(id);
    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 检查手机号格式
    if (phone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: '手机号格式不正确' });
      }
    }
    
    // 检查邮箱格式
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: '邮箱格式不正确' });
      }
    }
    
    const result = await User.update(id, { phone, email });
    
    if (result === 0) {
      return res.status(400).json({ error: '更新用户信息失败' });
    }
    
    // 获取更新后的用户信息
    const updatedUser = await User.getById(id);
    
    res.json({
      message: '用户信息更新成功',
      data: updatedUser
    });
  } catch (error) {
    console.error('更新用户信息时出错: ' + error.stack);
    res.status(500).json({ error: '更新用户信息失败' });
  }
};

// 删除用户（管理员接口）
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查用户是否存在
    const existingUser = await User.getById(id);
    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    const result = await User.delete(id);
    
    if (result === 0) {
      return res.status(400).json({ error: '删除用户失败' });
    }
    
    res.json({
      message: '用户删除成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除用户时出错: ' + error.stack);
    res.status(500).json({ error: '删除用户失败' });
  }
};

module.exports = {
  register,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};