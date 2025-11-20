const express = require('express');
const router = express.Router();
const {
  getAllGoods,
  getGoodsById,
  createGoods,
  updateGoods,
  deleteGoods
} = require('../controllers/goodsController');

// 获取所有商品
router.get('/', getAllGoods);

// 获取特定商品详情
router.get('/:id', getGoodsById);

// 创建新商品
router.post('/', createGoods);

// 更新商品
router.put('/:id', updateGoods);

// 删除商品
router.delete('/:id', deleteGoods);

module.exports = router;