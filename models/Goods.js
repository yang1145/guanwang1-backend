const db = require('../config/db');

class Goods {
  // 获取所有商品
  static async getAll(category = null) {
    let query = 'SELECT * FROM goods WHERE 1=1';
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await db.query(query, params);
    return rows;
  }
  
  // 获取所有分类
  static async getAllCategories() {
    const query = 'SELECT DISTINCT category FROM goods WHERE category IS NOT NULL';
    const [rows] = await db.query(query);
    return rows.map(row => row.category);
  }
  
  // 根据ID获取商品
  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM goods WHERE id = ?', [id]);
    return rows[0];
  }
  
  // 创建商品
  static async create(goodsData) {
    const { name, price, currency, description, category, image_url } = goodsData;
    const [result] = await db.query(
      'INSERT INTO goods (name, price, currency, description, category, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [name, price, currency, description, category, image_url]
    );
    return result.insertId;
  }
  
  // 更新商品
  static async update(id, goodsData) {
    const { name, price, currency, description, category, image_url } = goodsData;
    const [result] = await db.query(
      'UPDATE goods SET name = ?, price = ?, currency = ?, description = ?, category = ?, image_url = ? WHERE id = ?',
      [name, price, currency, description, category, image_url, id]
    );
    return result.affectedRows;
  }
  
  // 删除商品
  static async delete(id) {
    const [result] = await db.query('DELETE FROM goods WHERE id = ?', [id]);
    return result.affectedRows;
  }
}

module.exports = Goods;