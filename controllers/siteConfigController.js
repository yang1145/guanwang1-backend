const SiteConfig = require('../models/SiteConfig');

// 获取网站配置信息
const getSiteConfig = async (req, res) => {
  try {
    const config = await SiteConfig.get();
    
    if (!config) {
      return res.status(404).json({ error: '网站配置信息不存在' });
    }
    
    res.json({
      message: '网站配置信息获取成功',
      data: config
    });
  } catch (error) {
    console.error('获取网站配置信息时出错: ' + error.stack);
    res.status(500).json({ error: '获取网站配置信息失败' });
  }
};

// 更新网站配置信息
const updateSiteConfig = async (req, res) => {
  try {
    const {
      company_name,
      site_url,
      icp_number,
      police_number,
      copyright_info,
      company_description,
      seo_keywords,
      site_title,
      friend_links
    } = req.body;
    
    // 验证必填字段
    if (!company_name || !site_url || !site_title) {
      return res.status(400).json({ 
        error: '请提供公司名称、网站URL和网站标题' 
      });
    }
    
    // 验证网址格式
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(site_url)) {
      return res.status(400).json({ error: '网站URL格式不正确' });
    }
    
    const result = await SiteConfig.update({
      company_name,
      site_url,
      icp_number,
      police_number,
      copyright_info,
      company_description,
      seo_keywords,
      site_title,
      friend_links
    });
    
    if (result === 0) {
      return res.status(400).json({ error: '更新网站配置信息失败' });
    }
    
    // 获取更新后的配置信息
    const updatedConfig = await SiteConfig.get();
    
    res.json({
      message: '网站配置信息更新成功',
      data: updatedConfig
    });
  } catch (error) {
    console.error('更新网站配置信息时出错: ' + error.stack);
    res.status(500).json({ error: '更新网站配置信息失败' });
  }
};

module.exports = {
  getSiteConfig,
  updateSiteConfig
};