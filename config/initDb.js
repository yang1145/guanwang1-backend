require('dotenv').config();
const bcrypt = require('bcryptjs');
const fs = require('fs');

// 数据库配置
const dbType = process.env.DB_TYPE || 'sqlite';

let connection;
let dbName;

async function initConnection() {
  switch (dbType.toLowerCase()) {
    case 'postgres':
    case 'postgresql':
      try {
        const { Client } = require('pg');
        const pgConfig = {
          host: process.env.POSTGRES_HOST || 'localhost',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || '',
          port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
        };
        
        // 先连接到默认数据库创建tech_company数据库
        const tempClient = new Client({
          ...pgConfig,
          database: 'postgres'
        });
        
        await tempClient.connect();
        dbName = process.env.POSTGRES_DB || 'tech_company';
        
        // 创建数据库（如果不存在）
        try {
          await tempClient.query(`CREATE DATABASE "${dbName}"`);
          console.log(`数据库 ${dbName} 已创建`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`数据库 ${dbName} 已存在`);
          } else {
            throw error;
          }
        }
        
        await tempClient.end();
        
        // 连接到目标数据库
        const pgClient = new Client({
          ...pgConfig,
          database: dbName
        });
        
        await pgClient.connect();
        connection = pgClient;
      } catch (error) {
        console.error('无法加载 PostgreSQL 驱动，请确保已安装 pg 包: npm install pg');
        throw error;
      }
      break;

    case 'sqlite':
      try {
        // 使用 sql.js 作为纯 JavaScript SQLite 实现
        const initSqlJs = require('sql.js');
        
        // 初始化 SQL.js (异步加载 WebAssembly)
        const SQL = await initSqlJs();
        
        // 创建数据库实例
        connection = new SQL.Database();
        
        // 重写异步方法以兼容现有的 SQLite 代码
        connection.asyncRun = function(sql, params = []) {
          return new Promise((resolve, reject) => {
            try {
              const stmt = this.prepare(sql);
              
              // 绑定参数
              if (params && params.length > 0) {
                stmt.bind(params);
              }
              
              // 执行语句
              stmt.step();
              stmt.free();
              
              // 获取最后插入的ID和影响行数
              let insertId = 0;
              if (sql.trim().toLowerCase().startsWith('insert')) {
                try {
                  const lastIdStmt = this.prepare("SELECT last_insert_rowid() as id;");
                  lastIdStmt.step();
                  const result = lastIdStmt.getAsObject();
                  insertId = result.id || 0;
                  lastIdStmt.free();
                } catch (e) {
                  // 如果无法获取insertId，就设为0
                }
              }
              
              const changes = this.getRowsModified ? this.getRowsModified() : 0;
              resolve({ 
                affectedRows: changes, 
                insertId: insertId 
              });
            } catch (error) {
              reject(error);
            }
          });
        };
        
        connection.asyncAll = function(sql, params = []) {
          return new Promise((resolve, reject) => {
            try {
              const stmt = this.prepare(sql);
              
              // 绑定参数
              if (params && params.length > 0) {
                stmt.bind(params);
              }
              
              // 获取所有行
              const rows = [];
              while (stmt.step()) {
                rows.push(stmt.getAsObject());
              }
              stmt.free();
              
              resolve(rows);
            } catch (error) {
              reject(error);
            }
          });
        };
        
        connection.asyncExec = function(sql) {
          return new Promise((resolve, reject) => {
            try {
              this.run(sql);
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        };
        
        // 添加保存数据库到文件的方法
        connection.saveToFile = function(filePath) {
          const data = this.export();
          fs.writeFileSync(filePath, data);
        };
      } catch (error) {
        console.error('无法加载 SQLite 驱动，请确保已安装 sql.js 包: npm install sql.js');
        throw error;
      }
      break;

    case 'mysql':
    default:
      try {
        const mysql = require('mysql2/promise');
        const mysqlConfig = {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          port: parseInt(process.env.DB_PORT, 10) || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        };

        dbName = process.env.DB_NAME || 'tech_company';

        console.log('正在连接数据库服务器...');
        console.log(`主机: ${mysqlConfig.host}, 端口: ${mysqlConfig.port}, 用户: ${mysqlConfig.user}`);
        
        // 首先连接到 MySQL 服务器（不指定数据库）
        connection = await mysql.createConnection({
          host: mysqlConfig.host,
          port: mysqlConfig.port,
          user: mysqlConfig.user,
          password: mysqlConfig.password
        });

        console.log('数据库服务器连接成功');

        // 创建数据库（如果不存在）
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`数据库 ${dbName} 已创建或已存在`);

        // 选择数据库
        await connection.query(`USE \`${dbName}\``);
        console.log(`已连接到数据库 ${dbName}`);
      } catch (error) {
        console.error('无法加载 MySQL 驱动，请确保已安装 mysql2 包');
        throw error;
      }
      break;
  }
}

// 创建数据库表
const initDb = async () => {
  try {
    await initConnection();
    
    switch (dbType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        // 创建产品表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建新闻表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS news (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            author VARCHAR(100),
            image_url VARCHAR(255),
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建联系信息表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS contact_messages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建管理员表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS admins (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建用户表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            phone VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建商品表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS goods (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            description TEXT,
            category VARCHAR(100),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建网站配置表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS site_config (
            id SERIAL PRIMARY KEY,
            company_name VARCHAR(255) NOT NULL,
            site_url VARCHAR(255) NOT NULL,
            icp_number VARCHAR(100),
            police_number VARCHAR(100),
            copyright_info TEXT,
            company_description TEXT,
            seo_keywords TEXT,
            site_title VARCHAR(255) NOT NULL,
            friend_links JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建分类表
        await connection.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        break;

      case 'sqlite':
        // 创建产品表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建新闻表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT,
            author TEXT,
            image_url TEXT,
            views INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建联系信息表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建管理员表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建用户表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建商品表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS goods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'CNY',
            description TEXT,
            category TEXT,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建网站配置表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS site_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT NOT NULL,
            site_url TEXT NOT NULL,
            icp_number TEXT,
            police_number TEXT,
            copyright_info TEXT,
            company_description TEXT,
            seo_keywords TEXT,
            site_title TEXT NOT NULL,
            friend_links TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建分类表
        await connection.asyncRun(`
          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        break;

      case 'mysql':
      default:
        // 创建产品表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // 创建新闻表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS news (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT,
            author VARCHAR(100),
            image_url VARCHAR(255),
            views INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // 创建联系信息表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS contact_messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(20),
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建管理员表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS admins (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建用户表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(20) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // 创建商品表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS goods (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
            description TEXT,
            category VARCHAR(100),
            image_url VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // 创建网站配置表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS site_config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            company_name VARCHAR(255) NOT NULL,
            site_url VARCHAR(255) NOT NULL,
            icp_number VARCHAR(100),
            police_number VARCHAR(100),
            copyright_info TEXT,
            company_description TEXT,
            seo_keywords TEXT,
            site_title VARCHAR(255) NOT NULL,
            friend_links JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        // 创建分类表
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `);
        
        break;
    }

    // 创建默认管理员账户 (用户名: admin, 密码: admin123)
    console.log('生成默认管理员账户密码哈希...');
    const salt = await bcrypt.genSalt(10);
    console.log('Salt:', salt);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    console.log('生成的哈希密码:', hashedPassword);
    
    // 验证生成的哈希密码
    const isPasswordValid = await bcrypt.compare('admin123', hashedPassword);
    console.log('验证新生成的密码哈希:', isPasswordValid);
    
    switch (dbType.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        // PostgreSQL 使用 UPSERT 语法
        await connection.query(
          `INSERT INTO admins (username, password) VALUES ($1, $2) 
           ON CONFLICT (username) DO NOTHING`,
          ['admin', hashedPassword]
        );
        
        // 插入默认网站配置信息
        await connection.query(`
          INSERT INTO site_config 
          (company_name, site_url, site_title) 
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, ['默认公司名称', 'https://www.example.com', '默认网站标题']);
        break;

      case 'sqlite':
        // SQLite 使用 INSERT OR IGNORE 语法
        await connection.asyncRun(
          `INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`,
          ['admin', hashedPassword]
        );
        
        // 插入默认网站配置信息
        await connection.asyncRun(`
          INSERT OR IGNORE INTO site_config 
          (company_name, site_url, site_title) 
          VALUES (?, ?, ?)
        `, ['默认公司名称', 'https://www.example.com', '默认网站标题']);
        break;

      case 'mysql':
      default:
        await connection.execute(
          `INSERT IGNORE INTO admins (username, password) VALUES (?, ?)`,
          ['admin', hashedPassword]
        );
        
        // 插入默认网站配置信息
        await connection.execute(`
          INSERT IGNORE INTO site_config 
          (company_name, site_url, site_title) 
          VALUES (?, ?, ?)
        `, ['默认公司名称', 'https://www.example.com', '默认网站标题']);
        break;
    }
    
    console.log('默认管理员账户已创建或已存在');
    console.log('默认网站配置已创建或已存在');
    console.log('数据库表创建成功');
  } catch (error) {
    console.error('创建数据库表时出错: ' + error.message);
    console.error('错误码: ' + error.code);
    console.error('错误详情: ' + error.stack);
  } finally {
    // 关闭连接
    if (connection) {
      switch (dbType.toLowerCase()) {
        case 'postgres':
        case 'postgresql':
          await connection.end();
          console.log('数据库连接已关闭');
          break;

        case 'sqlite':
          // 保存 SQLite 数据库到文件
          const dbPath = process.env.SQLITE_PATH || './database.db';
          try {
            connection.saveToFile(dbPath);
            console.log(`SQLite数据库已保存到: ${dbPath}`);
          } catch (saveError) {
            console.error(`保存SQLite数据库时出错: ${saveError.message}`);
          }
          console.log('数据库连接已关闭');
          break;

        case 'mysql':
        default:
          await connection.end();
          console.log('数据库连接已关闭');
          break;
      }
    }
  }
};

// 运行初始化
initDb();