require('dotenv').config();

const dbType = process.env.DB_TYPE || 'sqlite';

let db;

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
      const path = require('path');
      
      // 初始化 SQL.js
      const SQL = initSqlJs.default || initSqlJs;
      
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
              const stmt = this.prepare(sql);
              const result = stmt.getAsObject(params);
              const columnNames = stmt.getColumnNames();
              
              // 对于 SELECT 查询，我们需要获取所有行
              const allResults = this.exec(sql);
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
              const stmt = this.prepare(sql);
              stmt.run(params);
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

// 导出连接池
module.exports = db;