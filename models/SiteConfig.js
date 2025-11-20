const db = require('../config/db');

class SiteConfig {
  // 获取网站配置信息
  static async get() {
    const [rows] = await db.query('SELECT * FROM site_config LIMIT 1');
    return rows[0];
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
    
    // 检查是否已存在配置记录
    const existingConfig = await this.get();
    
    let result;
    if (existingConfig) {
      // 更新现有配置
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
          company_name,
          site_url,
          icp_number,
          police_number,
          copyright_info,
          company_description,
          seo_keywords,
          site_title,
          friend_links,
          existingConfig.id
        ]
      );
    } else {
      // 创建新配置
      [result] = await db.query(
        `INSERT INTO site_config 
         (company_name, site_url, icp_number, police_number, copyright_info, company_description, seo_keywords, site_title, friend_links) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          company_name,
          site_url,
          icp_number,
          police_number,
          copyright_info,
          company_description,
          seo_keywords,
          site_title,
          friend_links
        ]
      );
    }
    
    return result.affectedRows;
  }
}

module.exports = SiteConfig;