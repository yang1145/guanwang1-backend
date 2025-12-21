#!/usr/bin/env node

require('dotenv').config();
const db = require('../config/db');

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

/**
 * 生成数据库兼容的INSERT查询语句
 * @param {string} table - 表名
 * @param {string[]} columns - 字段名数组
 * @param {string} returning - PostgreSQL需要的RETURNING子句
 * @returns {string} 生成的SQL查询
 */
function generateInsertQuery(table, columns, returning = '') {
  const dbType = process.env.DB_TYPE || 'sqlite';
  const placeholders = dbType === 'postgresql'
    ? columns.map((_, i) => `$${i + 1}`).join(', ')
    : columns.map(() => '?').join(', ');
  
  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ${returning}`.trim();
}

/**
 * 安全关闭数据库连接
 * @returns {Promise<void>}
 */
async function closeDatabase() {
  if (db && typeof db.end === 'function') {
    try {
      await db.end();
      console.log('✅ 数据库连接已安全关闭');
    } catch (err) {
      console.warn('⚠️ 关闭数据库连接时出错:', err.message);
    }
  }
}

/**
 * 处理插入结果获取ID
 * @param {any[]} result - 查询结果
 * @returns {number|string|null} 插入ID
 */
function getInsertId(result) {
  const dbType = process.env.DB_TYPE || 'sqlite';
  if (dbType === 'postgresql') {
    return result?.[0]?.rows?.[0]?.id || null;
  }
  return result?.[0]?.insertId || null;
}

async function seedData() {
  console.log('🌱 开始填充测试数据...');
  
  const dbType = process.env.DB_TYPE || 'sqlite';
  console.log(`🔌 当前数据库类型: ${dbType}`);

  try {
    // 1. 插入产品数据
    console.log('\n📦 正在插入产品数据...');
    const productQuery = generateInsertQuery(
      'products', 
      ['name', 'description', 'category', 'image_url'],
      dbType === 'postgresql' ? 'RETURNING id' : ''
    );

    for (const product of sampleProducts) {
      const params = [
        product.name, 
        product.description, 
        product.category, 
        product.image_url
      ];
      
      const result = await db.query(productQuery, params);
      const insertId = getInsertId(result);
      console.log(`✅ 已插入产品 [ID: ${insertId || 'N/A'}]: ${product.name}`);
    }

    // 2. 插入新闻数据
    console.log('\n📰 正在插入新闻数据...');
    const newsQuery = generateInsertQuery(
      'news', 
      ['title', 'content', 'author', 'image_url'],
      dbType === 'postgresql' ? 'RETURNING id' : ''
    );

    for (const news of sampleNews) {
      const params = [
        news.title, 
        news.content, 
        news.author, 
        news.image_url
      ];
      
      const result = await db.query(newsQuery, params);
      const insertId = getInsertId(result);
      console.log(`✅ 已插入新闻 [ID: ${insertId || 'N/A'}]: ${news.title}`);
    }

    console.log('\n🎉 测试数据填充完成！');
    return true;
  } catch (error) {
    console.error('\n❌ 填充测试数据时出错:');
    console.error(`   消息: ${error.message}`);
    if (error.sql) console.error(`   SQL: ${error.sql}`);
    if (error.sqlMessage) console.error(`   详情: ${error.sqlMessage}`);
    return false;
  }
}

// ===== 主执行流程 =====
(async () => {
  // 1. 设置超时保护 (10秒，足够种子数据)
  const TIMEOUT_MS = 10000;
  const timeout = setTimeout(() => {
    console.error('\n⏰ 操作超时，强制终止进程');
    closeDatabase().finally(() => process.exit(1));
  }, TIMEOUT_MS);

  try {
    // 2. 执行种子填充
    const success = await seedData();
    
    // 3. 清除超时定时器
    clearTimeout(timeout);
    
    // 4. 根据结果设置退出码
    process.exitCode = success ? 0 : 1;
    console.log(success 
      ? '\n✨ 脚本成功执行完成' 
      : '\n💔 脚本执行失败'
    );
  } catch (error) {
    clearTimeout(timeout);
    console.error('\n💥 未捕获的异常:', error);
    process.exitCode = 1;
  } finally {
    // 5. 确保数据库连接总是关闭
    await closeDatabase();
    process.exit(process.exitCode || 0);
  }
})();