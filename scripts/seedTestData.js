#!/usr/bin/env node

require('dotenv').config();
const mysql = require('mysql2/promise');
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
    title: '全球数据中心扩展计划',
    content: '我们计划在未来一年内新增5个全球数据中心，进一步提升服务覆盖范围和质量...',
    author: '基础设施团队',
    image_url: '/images/news-datacenter-expansion.jpg'
  },
  {
    title: '容器服务Kubernetes获安全合规认证',
    content: '我们的容器服务Kubernetes已经通过多项国际安全合规认证，为企业用户提供更高安全保障...',
    author: '安全团队',
    image_url: '/images/news-k8s-certification.jpg'
  }
];

// 虚拟联系信息数据
const sampleContacts = [
  {
    name: '张经理',
    email: 'zhang.manager@company.com',
    phone: '13800138001',
    message: '我们公司想采购一批云服务器ECS，希望能安排技术专家进行方案介绍。'
  },
  {
    name: '李工程师',
    email: 'li.engineer@startup.com',
    phone: '13800138002',
    message: '在使用对象存储OSS时遇到上传速度慢的问题，请求技术支持协助解决。'
  },
  {
    name: '王先生',
    email: 'wang.cto@enterprise.com',
    phone: '13800138003',
    message: '咨询关于混合云解决方案的相关信息，以及如何迁移现有业务系统。'
  }
];

async function seedDatabase() {
  try {
    console.log('开始插入测试数据...');
    
    // 插入产品数据
    console.log('插入产品数据...');
    for (const product of sampleProducts) {
      await db.execute(
        'INSERT INTO products (name, description, category, image_url) VALUES (?, ?, ?, ?)',
        [product.name, product.description, product.category, product.image_url]
      );
    }
    console.log(`成功插入 ${sampleProducts.length} 条产品数据`);
    
    // 插入新闻数据
    console.log('插入新闻数据...');
    for (const news of sampleNews) {
      await db.execute(
        'INSERT INTO news (title, content, author, image_url) VALUES (?, ?, ?, ?)',
        [news.title, news.content, news.author, news.image_url]
      );
    }
    console.log(`成功插入 ${sampleNews.length} 条新闻数据`);
    
    // 插入联系信息数据
    console.log('插入联系信息数据...');
    for (const contact of sampleContacts) {
      await db.execute(
        'INSERT INTO contact_messages (name, email, phone, message) VALUES (?, ?, ?, ?)',
        [contact.name, contact.email, contact.phone, contact.message]
      );
    }
    console.log(`成功插入 ${sampleContacts.length} 条联系信息数据`);
    
    console.log('所有测试数据插入完成！');
  } catch (error) {
    console.error('插入测试数据时发生错误:', error);
  } finally {
    // 关闭数据库连接
    await db.end();
    console.log('数据库连接已关闭');
  }
}

// 执行脚本
if (require.main === module) {
  seedDatabase();
}

module.exports = { sampleProducts, sampleNews, sampleContacts };