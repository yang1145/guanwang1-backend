const db = require('../config/db');

class Category {
  // 获取所有分类
  static async getAll() {
    try {
      const query = 'SELECT * FROM categories ORDER BY name';
      const [rows] = await db.query(query);
      return rows;
    } catch (error) {
      console.error('获取分类列表时出错:', error);
      throw error;
    }
  }
  
  // 根据ID获取分类
  static async getById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error(`获取分类(id: ${id})时出错:`, error);
      throw error;
    }
  }
  
  // 根据名称获取分类
  static async getByName(name) {
    try {
      const [rows] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
      return rows[0];
    } catch (error) {
      console.error(`获取分类(name: ${name})时出错:`, error);
      throw error;
    }
  }
  
  // 创建分类
  static async create(categoryData) {
    try {
      const { name, description } = categoryData;
      const [result] = await db.query(
        'INSERT INTO categories (name, description) VALUES (?, ?)',
        [name, description]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建分类时出错:', error);
      throw error;
    }
  }
  
  // 批量创建分类
  static async createBatch(categories) {
    try {
      // 构建批量插入语句
      const values = categories.map(cat => [cat.name, cat.description || '']);
      const placeholders = values.map(() => '(?, ?)').join(', ');
      const flatValues = values.flat();
      
      const query = `INSERT IGNORE INTO categories (name, description) VALUES ${placeholders}`;
      const [result] = await db.query(query, flatValues);
      return result.affectedRows;
    } catch (error) {
      console.error('批量创建分类时出错:', error);
      throw error;
    }
  }
  
  // 更新分类
  static async update(id, categoryData) {
    try {
      const { name, description } = categoryData;
      const [result] = await db.query(
        'UPDATE categories SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
      );
      return result.affectedRows;
    } catch (error) {
      console.error(`更新分类(id: ${id})时出错:`, error);
      throw error;
    }
  }
  
  // 删除分类
  static async delete(id) {
    try {
      const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);
      return result.affectedRows;
    } catch (error) {
      console.error(`删除分类(id: ${id})时出错:`, error);
      throw error;
    }
  }
  
  // 批量更新分类（替换整个分类列表）
  static async updateAll(categories) {
    try {
      // 开始事务
      const connection = await db.getConnection();
      await connection.beginTransaction();
      
      try {
        // 清空现有分类
        await connection.query('DELETE FROM categories');
        
        // 如果有新分类，则插入
        if (categories.length > 0) {
          const values = categories.map(cat => [cat.name, cat.description || '']);
          const placeholders = values.map(() => '(?, ?)').join(', ');
          const flatValues = values.flat();
          
          const query = `INSERT INTO categories (name, description) VALUES ${placeholders}`;
          await connection.query(query, flatValues);
        }
        
        // 提交事务
        await connection.commit();
        connection.release();
        return categories.length;
      } catch (error) {
        // 回滚事务
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('批量更新分类时出错:', error);
      throw error;
    }
  }
}

module.exports = Category;