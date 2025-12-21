require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

let db;

// 异步初始化函数
async function initDb() {
  switch (dbType.toLowerCase()) {
    case 'postgres':
    case 'postgresql':
      try {
        const { Pool: PgPool } = require('pg');
        const pgConfig = {
          host: process.env.POSTGRES_HOST || 'localhost',
          user: process.env.POSTGRES_USER || 'postgres',
          password: process.env.POSTGRES_PASSWORD || '',
          database: process.env.POSTGRES_DB || 'tech_company',
          port: parseInt(process.env.POSTGRES_PORT, 10) || 5432,
        };
        db = new PgPool(pgConfig);
      } catch (error) {
        console.error('无法加载 PostgreSQL 驱动，请确保已安装 pg 包: npm install pg');
        throw error;
      }
      break;

    case 'sqlite':
      try {
        // 使用 sql.js 作为纯 JavaScript SQLite 实现
        const initSqlJs = require('sql.js');
        const fs = require('fs');
        
        // 初始化 SQL.js
        const SQL = await (typeof initSqlJs === 'function' ? initSqlJs() : Promise.resolve(initSqlJs));
        
        let dbData;
        const dbPath = process.env.SQLITE_PATH || './database.db';
        
        // 如果数据库文件存在，则加载它
        if (fs.existsSync(dbPath)) {
          dbData = fs.readFileSync(dbPath);
        }
        
        // 创建数据库实例
        const sqlDb = new SQL.Database(dbData);
        
        // 重写 query 方法以兼容 mysql2 的接口
        sqlDb.query = function(sql, params = []) {
          return new Promise((resolve, reject) => {
            try {
              if (sql.trim().toLowerCase().startsWith('select')) {
                // SELECT 查询返回行数据
                const allResults = this.exec(sql.replace(/\?/g, () => '?')); // 简单处理参数占位符
                if (allResults.length > 0) {
                  const stmtResult = allResults[0];
                  const rows = [];
                  for (const row of stmtResult.values) {
                    const obj = {};
                    for (let i = 0; i < stmtResult.columns.length; i++) {
                      obj[stmtResult.columns[i]] = row[i];
                    }
                    rows.push(obj);
                  }
                  resolve([rows]);
                } else {
                  resolve([[]]);
                }
              } else {
                // 其他操作（INSERT, UPDATE, DELETE等）
                this.run(sql);
                // 尝试获取最后插入的ID
                let insertId = 0;
                try {
                  const lastIdResult = this.exec("SELECT last_insert_rowid();");
                  if (lastIdResult.length > 0 && lastIdResult[0].values.length > 0) {
                    insertId = lastIdResult[0].values[0][0];
                  }
                } catch (e) {
                  // 如果无法获取insertId，就设为0
                }
                resolve([{ affectedRows: 0, insertId: insertId }]);
              }
            } catch (error) {
              reject(error);
            }
          });
        };
        
        // 添加保存数据库到文件的方法
        sqlDb.saveToFile = function(filePath) {
          const data = this.export();
          fs.writeFileSync(filePath, data);
        };
        
        db = sqlDb;
      } catch (error) {
        console.error('无法加载 SQLite 驱动，请确保已安装 sql.js 包: npm install sql.js');
        throw error;
      }
      break;

    case 'mysql':
    default:
      try {
        const mysql = require('mysql2');
        const mysqlConfig = {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'tech_company',
          port: parseInt(process.env.DB_PORT, 10) || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        };
        const pool = mysql.createPool(mysqlConfig);
        db = pool.promise();
      } catch (error) {
        console.error('无法加载 MySQL 驱动，请确保已安装 mysql2 包');
        throw error;
      }
      break;
  }
  
  return db;
}

// 立即初始化数据库
const dbPromise = initDb();

// 导出一个包装器，确保在使用前数据库已初始化
module.exports = new Proxy({}, {
  get: function(target, prop) {
    return function(...args) {
      return dbPromise.then(db => {
        if (typeof db[prop] === 'function') {
          return db[prop](...args);
        } else {
          return db[prop];
        }
      });
    };
  }
});