const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategories,
  syncCategories,
  deleteCategory
} = require('../controllers/categoryController');

// 获取所有分类
router.get('/', getAllCategories);

// 更新分类列表
router.put('/', updateCategories);

// 根据现有产品和商品数据同步分类表
router.post('/sync', syncCategories);

// 获取特定分类
router.get('/:id', getCategoryById);

// 创建分类
router.post('/', createCategory);

// 更新分类
router.put('/:id', updateCategory);

// 删除分类
router.delete('/:id', deleteCategory);

module.exports = router;