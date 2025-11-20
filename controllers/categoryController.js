const Category = require('../models/Category');
const Product = require('../models/Product');
const Goods = require('../models/Goods');

// 获取所有分类列表
const getAllCategories = async (req, res) => {
  try {
    // 从分类表中获取所有分类
    const categories = await Category.getAll();
    
    res.json({
      message: '分类列表获取成功',
      data: categories
    });
  } catch (error) {
    console.error('获取分类列表时出错: ' + error.stack);
    res.status(500).json({ error: '获取分类列表失败' });
  }
};

// 更新分类列表（替换整个分类列表）
const updateCategories = async (req, res) => {
  try {
    const { categories } = req.body;
    
    // 验证请求体
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: '请提供有效的分类数组' });
    }
    
    // 格式化分类数据
    const formattedCategories = categories.map(cat => {
      if (typeof cat === 'string') {
        return { name: cat, description: '' };
      }
      return { name: cat.name || cat, description: cat.description || '' };
    });
    
    // 更新分类表中的所有分类
    const updatedCount = await Category.updateAll(formattedCategories);
    
    res.json({
      message: '分类列表更新成功',
      data: {
        updatedCount
      }
    });
  } catch (error) {
    console.error('更新分类列表时出错: ' + error.stack);
    res.status(500).json({ error: '更新分类列表失败' });
  }
};

// 根据现有产品和商品数据同步分类表
const syncCategories = async (req, res) => {
  try {
    // 获取现有的所有产品和商品
    const products = await Product.getAll();
    const goods = await Goods.getAll();
    
    // 收集所有现有的分类
    const allCategories = [
      ...new Set([
        ...products.map(p => p.category).filter(cat => cat !== null),
        ...goods.map(g => g.category).filter(cat => cat !== null)
      ])
    ];
    
    // 格式化为分类对象数组
    const formattedCategories = allCategories.map(cat => ({
      name: cat,
      description: ''
    }));
    
    // 更新分类表
    const updatedCount = await Category.updateAll(formattedCategories);
    
    res.json({
      message: '分类表同步成功',
      data: {
        updatedCount,
        categories: allCategories
      }
    });
  } catch (error) {
    console.error('同步分类表时出错: ' + error.stack);
    res.status(500).json({ error: '同步分类表失败' });
  }
};

// 获取特定分类
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.getById(id);
    
    if (!category) {
      return res.status(404).json({ error: '未找到该分类' });
    }
    
    res.json({
      message: '分类获取成功',
      data: category
    });
  } catch (error) {
    console.error('获取分类时出错: ' + error.stack);
    res.status(500).json({ error: '获取分类失败' });
  }
};

// 创建分类
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({ error: '请提供分类名称' });
    }
    
    // 检查分类是否已存在
    const existingCategory = await Category.getByName(name);
    if (existingCategory) {
      return res.status(400).json({ error: '该分类已存在' });
    }
    
    const categoryId = await Category.create({ name, description });
    
    res.status(201).json({
      message: '分类创建成功',
      data: { id: categoryId }
    });
  } catch (error) {
    console.error('创建分类时出错: ' + error.stack);
    res.status(500).json({ error: '创建分类失败' });
  }
};

// 更新分类
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // 检查分类是否存在
    const existingCategory = await Category.getById(id);
    if (!existingCategory) {
      return res.status(404).json({ error: '未找到该分类' });
    }
    
    // 如果提供了名称，检查是否与其他分类冲突
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await Category.getByName(name);
      if (duplicateCategory) {
        return res.status(400).json({ error: '该分类名称已存在' });
      }
    }
    
    const result = await Category.update(id, { name, description });
    
    if (result === 0) {
      return res.status(400).json({ error: '更新分类失败' });
    }
    
    res.json({
      message: '分类更新成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('更新分类时出错: ' + error.stack);
    res.status(500).json({ error: '更新分类失败' });
  }
};

// 删除分类
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查分类是否存在
    const existingCategory = await Category.getById(id);
    if (!existingCategory) {
      return res.status(404).json({ error: '未找到该分类' });
    }
    
    const result = await Category.delete(id);
    
    if (result === 0) {
      return res.status(400).json({ error: '删除分类失败' });
    }
    
    res.json({
      message: '分类删除成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除分类时出错: ' + error.stack);
    res.status(500).json({ error: '删除分类失败' });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategories,
  syncCategories,
  deleteCategory
};