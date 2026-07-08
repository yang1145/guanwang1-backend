const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const adminAuth = require('../middleware/adminAuth');
const userAuth = require('../middleware/userAuth');
const guestAuth = require('../middleware/guestAuth');

const {
  getConfig,
  updateConfig,
  cleanupNow,
  listSessions,
  getSessionMessages: adminGetSessionMessages,
  deleteSession: adminDeleteSession,
  deleteMessage,
  getUserQuota,
  setUserQuota
} = require('../controllers/aiChatAdminController');

const {
  createSession,
  listMySessions,
  getSessionMessages,
  sendMessage,
  deleteMySession,
  getMyQuota
} = require('../controllers/aiChatUserController');

const {
  createGuestSession,
  getGuestSessionMessages,
  sendGuestMessage
} = require('../controllers/aiChatGuestController');

// 用户发送消息限流：每用户每分钟 30 次
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user.id.toString(),
  message: { error: '请求过于频繁，请稍后再试' }
});

// 访客发送消息限流：每会话每分钟 10 次
const guestChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.guestSessionId.toString(),
  message: { error: '请求过于频繁，请稍后再试' }
});

// ==================== 管理员接口 ====================

// 获取 AI 配置
router.get('/admin/config', adminAuth, getConfig);

// 更新 AI 配置
router.put('/admin/config', adminAuth, updateConfig);

// 立即清理聊天记录
router.post('/admin/cleanup', adminAuth, cleanupNow);

// 获取所有会话
router.get('/admin/sessions', adminAuth, listSessions);

// 获取某会话消息
router.get('/admin/sessions/:id/messages', adminAuth, adminGetSessionMessages);

// 删除某会话
router.delete('/admin/sessions/:id', adminAuth, adminDeleteSession);

// 删除单条消息
router.delete('/admin/messages/:id', adminAuth, deleteMessage);

// 获取用户配额
router.get('/admin/quotas/:userId', adminAuth, getUserQuota);

// 设置用户配额
router.put('/admin/quotas/:userId', adminAuth, setUserQuota);

// ==================== 用户接口 ====================

// 创建会话
router.post('/sessions', userAuth, createSession);

// 获取当前用户会话列表
router.get('/sessions', userAuth, listMySessions);

// 获取当前用户某会话消息
router.get('/sessions/:id/messages', userAuth, getSessionMessages);

// 发送消息（带限流）
router.post('/sessions/:id/messages', userAuth, aiChatLimiter, sendMessage);

// 删除当前用户某会话
router.delete('/sessions/:id', userAuth, deleteMySession);

// 获取当前用户配额
router.get('/quota', userAuth, getMyQuota);

// ==================== 访客接口 ====================

// 创建访客会话（无需认证）
router.post('/guest/sessions', createGuestSession);

// 获取访客会话消息
router.get('/guest/sessions/:id/messages', guestAuth, getGuestSessionMessages);

// 访客发送消息（带限流）
router.post('/guest/sessions/:id/messages', guestAuth, guestChatLimiter, sendGuestMessage);

module.exports = router;
