const db = require('../config/db');

class SiteConfig {
  // 获取网站配置信息
  static async get() {
    try {
      const [rows] = await db.query('SELECT * FROM site_config LIMIT 1');
      return rows[0];
    } catch (error) {
      console.error('获取网站配置信息时出错:', error);
      return null;
    }
  }
  
  // 更新网站配置信息
  static async update(configData) {
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
    } = configData;
    
    // 处理空值，确保所有字段都有默认值
    const processedData = {
      company_name: company_name || '',
      site_url: site_url || '',
      icp_number: icp_number || '',
      police_number: police_number || '',
      copyright_info: copyright_info || '',
      company_description: company_description || '',
      seo_keywords: seo_keywords || '',
      site_title: site_title || '',
      friend_links: friend_links || '[]'
    };
    
    // 确保 friend_links 是字符串类型
    if (typeof processedData.friend_links !== 'string') {
      processedData.friend_links = JSON.stringify(processedData.friend_links) || '[]';
    }
    
    // 检查是否已存在配置记录
    let existingConfig;
    try {
      const [rows] = await db.query('SELECT id FROM site_config LIMIT 1');
      existingConfig = rows[0];
    } catch (error) {
      console.error('查询现有配置时出错:', error);
      throw error;
    }
    
    let result;
    try {
      if (existingConfig && existingConfig.id) {
        // 更新现有配置
        console.log('更新现有配置，ID为:', existingConfig.id);
        console.log('更新数据:', processedData);
        [result] = await db.query(
          `UPDATE site_config SET 
           company_name = ?, 
           site_url = ?, 
           icp_number = ?, 
           police_number = ?, 
           copyright_info = ?, 
           company_description = ?, 
           seo_keywords = ?, 
           site_title = ?, 
           friend_links = ? 
           WHERE id = ?`,
          [
            processedData.company_name,
            processedData.site_url,
            processedData.icp_number,
            processedData.police_number,
            processedData.copyright_info,
            processedData.company_description,
            processedData.seo_keywords,
            processedData.site_title,
            processedData.friend_links,
            existingConfig.id
          ]
        );
      } else {
        // 创建新配置
        console.log('创建新配置');
        console.log('配置数据:', processedData);
        [result] = await db.query(
          `INSERT INTO site_config 
           (company_name, site_url, icp_number, police_number, copyright_info, company_description, seo_keywords, site_title, friend_links) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            processedData.company_name,
            processedData.site_url,
            processedData.icp_number,
            processedData.police_number,
            processedData.copyright_info,
            processedData.company_description,
            processedData.seo_keywords,
            processedData.site_title,
            processedData.friend_links
          ]
        );
      }
    } catch (error) {
      console.error('数据库操作错误:', error);
      throw error;
    }
    
    return result.affectedRows;
  }
}

module.exports = SiteConfig;