const Goods = require('../models/Goods');

// 获取所有商品
const getAllGoods = async (req, res) => {
  try {
    const { category } = req.query;
    const goods = await Goods.getAll(category);
    
    res.json({
      message: '商品获取成功',
      data: goods
    });
  } catch (error) {
    console.error('获取商品时出错: ' + error.stack);
    res.status(500).json({ error: '获取商品失败' });
  }
};

// 获取特定商品详情
const getGoodsById = async (req, res) => {
  try {
    const { id } = req.params;
    const goods = await Goods.getById(id);
    
    if (!goods) {
      return res.status(404).json({ error: '未找到该商品' });
    }
    
    res.json({
      message: '商品详情获取成功',
      data: goods
    });
  } catch (error) {
    console.error('获取商品详情时出错: ' + error.stack);
    res.status(500).json({ error: '获取商品详情失败' });
  }
};

// 创建新商品
const createGoods = async (req, res) => {
  try {
    const { name, price, currency, description, category, image_url } = req.body;
    
    // 验证必填字段
    if (!name || price === undefined || !currency || !description || !category) {
      return res.status(400).json({ error: '请提供商品名称、价格、货币类型、描述和分类' });
    }
    
    // 验证价格为数字
    if (isNaN(price)) {
      return res.status(400).json({ error: '价格必须是有效数字' });
    }
    
    const goodsId = await Goods.create({ name, price, currency, description, category, image_url });
    
    res.status(201).json({
      message: '商品创建成功',
      data: { id: goodsId }
    });
  } catch (error) {
    console.error('创建商品时出错: ' + error.stack);
    res.status(500).json({ error: '创建商品失败' });
  }
};

// 更新商品
const updateGoods = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, currency, description, category, image_url } = req.body;
    
    // 检查商品是否存在
    const existingGoods = await Goods.getById(id);
    if (!existingGoods) {
      return res.status(404).json({ error: '未找到该商品' });
    }
    
    // 如果提供了价格，验证它是否为数字
    if (price !== undefined && isNaN(price)) {
      return res.status(400).json({ error: '价格必须是有效数字' });
    }
    
    const result = await Goods.update(id, { name, price, currency, description, category, image_url });
    
    if (result === 0) {
      return res.status(400).json({ error: '更新商品失败' });
    }
    
    res.json({
      message: '商品更新成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('更新商品时出错: ' + error.stack);
    res.status(500).json({ error: '更新商品失败' });
  }
};

// 删除商品
const deleteGoods = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查商品是否存在
    const existingGoods = await Goods.getById(id);
    if (!existingGoods) {
      return res.status(404).json({ error: '未找到该商品' });
    }
    
    const result = await Goods.delete(id);
    
    if (result === 0) {
      return res.status(400).json({ error: '删除商品失败' });
    }
    
    res.json({
      message: '商品删除成功',
      data: { id: parseInt(id) }
    });
  } catch (error) {
    console.error('删除商品时出错: ' + error.stack);
    res.status(500).json({ error: '删除商品失败' });
  }
};

module.exports = {
  getAllGoods,
  getGoodsById,
  createGoods,
  updateGoods,
  deleteGoods
};