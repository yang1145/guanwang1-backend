#!/usr/bin/env node

require('dotenv').config();
const db = require('../config/db');
const dbModule = require('../config/db.js');

// 虚拟云产品数据
const sampleProducts = [
  {
    name: '云服务器 ECS',
    description: '高性能云计算服务，提供可弹性伸缩的计算能力，支持多种操作系统',
    category: '计算',
    image_url: '/images/cloud-server.jpg'
  },
  {
    name: '对象存储 OSS',
    description: '海量、安全、低成本、高可靠的云存储服务，支持多种存储类型',
    category: '存储',
    image_url: '/images/object-storage.jpg'
  },
  {
    name: '内容分发 CDN',
    description: '全球加速内容分发网络，提升用户访问速度和体验',
    category: '网络',
    image_url: '/images/cdn.jpg'
  },
  {
    name: '云数据库 RDS',
    description: '稳定可靠、可弹性伸缩的在线数据库服务，支持主流数据库引擎',
    category: '数据库',
    image_url: '/images/cloud-database.jpg'
  },
  {
    name: '容器服务 Kubernetes',
    description: '高性能容器应用管理平台，支持Docker和Kubernetes',
    category: '容器',
    image_url: '/images/container-service.jpg'
  }
];

// 虚拟云相关新闻数据
const sampleNews = [
  {
    title: '云服务器ECS性能大幅提升',
    content: '我们很高兴地宣布，云服务器ECS实例性能相比上一代提升高达50%，同时价格保持不变...',
    author: '产品团队',
    image_url: '/images/news-cloud-performance.jpg'
  },
  {
    title: '对象存储OSS新增智能分层功能',
    content: '为了帮助客户进一步降低存储成本，我们在对象存储OSS中引入了智能分层功能...',
    author: '存储团队',
    image_url: '/images/news-storage-tiering.jpg'
  },
  {
    title: 'CDN全球节点扩展至3000+',
    content: '我们的内容分发网络现已覆盖全球超过3000个节点，为用户提供更快的访问速度...',
    author: '网络团队',
    image_url: '/images/news-cdn-expansion.jpg'
  }
];

async function closeDatabaseConnection() {
  try {
    // 通过反射获取数据库实例并关闭连接池
    const dbInstance = await require('../config/db');
    if (dbInstance && typeof dbInstance.end === 'function') {
      await dbInstance.end();
      console.log('数据库连接已关闭');
    }
  } catch (error) {
    console.warn('警告：关闭数据库连接时出现问题（可以忽略）', error.message);
  }
}

async function seedData() {
  try {
    console.log('开始填充测试数据...');
    
    // 插入产品数据
    console.log('正在插入产品数据...');
    for (const product of sampleProducts) {
      console.log('插入产品:', product);
      const [result] = await db.query(
        'INSERT INTO products (name, description, category, image_url) VALUES (?, ?, ?, ?)',
        [product.name, product.description, product.category, product.image_url]
      );
      console.log(`已插入产品: ${product.name}, 插入ID: ${result.insertId}`);
    }

    // 插入新闻数据
    console.log('正在插入新闻数据...');
    for (const news of sampleNews) {
      console.log('插入新闻:', news);
      const [result] = await db.query(
        'INSERT INTO news (title, content, author, image_url) VALUES (?, ?, ?, ?)',
        [news.title, news.content, news.author, news.image_url]
      );
      console.log(`已插入新闻: ${news.title}, 插入ID: ${result.insertId}`);
    }

    console.log('测试数据填充完成！');
    return true;
  } catch (error) {
    console.error('填充测试数据时出错:', error.message);
    console.error('错误堆栈:', error.stack);
    return false;
  }
}

// 设置超时，防止进程挂起
const timeout = setTimeout(() => {
  console.error('脚本执行超时，强制退出');
  process.exit(1);
}, 30000); // 30秒超时

// 运行数据填充
seedData().then(async (success) => {
  // 清除超时定时器
  clearTimeout(timeout);
  
  // 关闭数据库连接
  await closeDatabaseConnection();
  
  if (success) {
    console.log('脚本执行成功完成');
    process.exit(0);
  } else {
    console.error('脚本执行失败');
    process.exit(1);
  }
}).catch(async (error) => {
  clearTimeout(timeout);
  console.error('严重错误:', error);
  
  // 关闭数据库连接
  await closeDatabaseConnection();
  
  process.exit(1);
});