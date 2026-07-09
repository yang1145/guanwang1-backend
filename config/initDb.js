require('dotenv').config();
const fs = require('fs');
const { createTables } = require('./db/tables');
const { seedAll } = require('./db/seed');

const dbType = process.env.DB_TYPE || 'sqlite';

/**
 * 初始化数据库连接
 */
async function initConnection() {
  let connection, dbName;

  switch (dbType.toLowerCase()) {
    case 'postgres':
    case 'postgresql': {
      const { Client } = require('pg');
      const pgConfig = { host: process.env.POSTGRES_HOST || 'localhost', user: process.env.POSTGRES_USER || 'postgres', password: process.env.POSTGRES_PASSWORD || '', port: parseInt(process.env.POSTGRES_PORT, 10) || 5432 };
      const tempClient = new Client({ ...pgConfig, database: 'postgres' });
      await tempClient.connect();
      dbName = process.env.POSTGRES_DB || 'tech_company';
      try { await tempClient.query(`CREATE DATABASE "${dbName}"`); console.log(`数据库 ${dbName} 已创建`); }
      catch (e) { if (e.message.includes('already exists')) console.log(`数据库 ${dbName} 已存在`); else throw e; }
      await tempClient.end();
      connection = new Client({ ...pgConfig, database: dbName });
      await connection.connect();
      break;
    }

    case 'sqlite': {
      const initSqlJs = require('sql.js');
      const SQL = await initSqlJs();
      connection = new SQL.Database();
      connection.asyncRun = function (sql, params = []) {
        return new Promise((resolve, reject) => {
          try {
            const stmt = this.prepare(sql); if (params.length > 0) stmt.bind(params); stmt.step(); stmt.free();
            let insertId = 0;
            if (sql.trim().toLowerCase().startsWith('insert')) {
              try { const s = this.prepare('SELECT last_insert_rowid() as id;'); s.step(); insertId = s.getAsObject().id || 0; s.free(); } catch (e) { }
            }
            resolve({ affectedRows: this.getRowsModified ? this.getRowsModified() : 0, insertId });
          } catch (e) { reject(e); }
        });
      };
      connection.asyncAll = function (sql, params = []) {
        return new Promise((resolve, reject) => {
          try { const stmt = this.prepare(sql); if (params.length > 0) stmt.bind(params); const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); stmt.free(); resolve(rows); } catch (e) { reject(e); }
        });
      };
      connection.saveToFile = function (filePath) { fs.writeFileSync(filePath, this.export()); };
      break;
    }

    case 'mysql':
    default: {
      const mysql = require('mysql2/promise');
      connection = await mysql.createConnection({ host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT, 10) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' });
      dbName = process.env.DB_NAME || 'tech_company';
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.query(`USE \`${dbName}\``);
      console.log(`已连接到数据库 ${dbName}`);
      break;
    }
  }
  return connection;
}

/**
 * 主流程：连接 → 建表 → 种子数据 → 关闭
 */
(async () => {
  let connection;
  try {
    connection = await initConnection();
    await createTables(dbType, connection);
    await seedAll(dbType, connection);
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
  } finally {
    if (connection) {
      if (dbType.toLowerCase() === 'sqlite') {
        const dbPath = process.env.SQLITE_PATH || './database.db';
        try { connection.saveToFile(dbPath); console.log(`SQLite数据库已保存到: ${dbPath}`); } catch (e) { console.error('保存SQLite失败:', e.message); }
      } else {
        await connection.end();
        console.log('数据库连接已关闭');
      }
    }
  }
})();
