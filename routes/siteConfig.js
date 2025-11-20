const express = require('express');
const router = express.Router();
const { getSiteConfig, updateSiteConfig } = require('../controllers/siteConfigController');
const adminAuth = require('../middleware/adminAuth');

// 获取网站配置信息
router.get('/', getSiteConfig);

// 更新网站配置信息（管理接口）
router.put('/', adminAuth, updateSiteConfig);

module.exports = router;