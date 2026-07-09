/**
 * 种子数据初始化
 * @param {string} dbType - 'postgres' | 'sqlite' | 'mysql'
 * @param {object} connection - 数据库连接
 * @param {object} bcrypt - bcryptjs 实例
 */
async function seedAll(dbType, connection) {
  const bcrypt = require('bcryptjs');
  const isPG = dbType.toLowerCase() === 'postgres' || dbType.toLowerCase() === 'postgresql';

  // ── 统一种子数据写入适配器 ──
  const dbSeed = {
    insertIgnore: async (table, columns, values) => {
      const placeholders = values.map((_, i) => isPG ? `$${i + 1}` : '?').join(', ');
      let sql;
      if (isPG) {
        sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        await connection.query(sql, values);
      } else if (dbType.toLowerCase() === 'sqlite') {
        sql = `INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`;
        await connection.asyncRun(sql, values);
      } else {
        sql = `INSERT IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`;
        await connection.execute(sql, values);
      }
    },
    upsert: async (table, columns, values, updateCols, updateVals) => {
      const placeholders = values.map((_, i) => isPG ? `$${i + 1}` : '?').join(', ');
      if (isPG) {
        const setClause = updateCols.map((c, i) => `${c} = $${values.length + i + 1}`).join(', ');
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON CONFLICT (username) DO UPDATE SET ${setClause}`;
        await connection.query(sql, [...values, ...updateVals]);
      } else if (dbType.toLowerCase() === 'sqlite') {
        await connection.asyncRun(`INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`, values);
        const setClause = updateCols.map(c => `${c} = ?`).join(', ');
        await connection.asyncRun(`UPDATE ${table} SET ${setClause} WHERE username = ?`, [...updateVals, values[0]]);
      } else {
        const setClause = updateCols.map(c => `${c} = VALUES(${c})`).join(', ');
        const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${setClause}`;
        await connection.execute(sql, values);
      }
    },
    query: async (sql, params = []) => {
      const realSql = isPG ? sql.replace(/\?/g, (() => { let i = 0; return () => `$${++i}`; })()) : sql;
      if (isPG) {
        const [rows] = await connection.query(realSql, params);
        return rows;
      } else if (dbType.toLowerCase() === 'sqlite') {
        return await connection.asyncAll(realSql, params);
      } else {
        const [rows] = await connection.execute(realSql, params);
        return rows;
      }
    }
  };

  // ── 权限数据 ──
  console.log('正在初始化权限和角色数据...');
  const permissions = [
    { code: 'users.manage', name: '用户管理', description: '查看、创建、编辑、删除用户' },
    { code: 'products.manage', name: '产品管理', description: '查看、创建、编辑、删除产品' },
    { code: 'news.manage', name: '新闻管理', description: '查看、创建、编辑、删除新闻' },
    { code: 'contact.manage', name: '联系我们管理', description: '查看和管理联系表单消息' },
    { code: 'goods.manage', name: '商品管理', description: '查看、创建、编辑、删除商品' },
    { code: 'categories.manage', name: '分类管理', description: '查看、创建、编辑、删除分类' },
    { code: 'siteConfig.manage', name: '网站配置管理', description: '查看和修改网站配置' },
    { code: 'aiChat.manage', name: 'AI聊天管理', description: '管理AI聊天配置和会话' },
    { code: 'admins.manage', name: '管理员管理', description: '创建、编辑、删除管理员账户' },
    { code: 'roles.manage', name: '角色与权限管理', description: '管理角色和分配权限' },
    { code: 'tickets.manage', name: '工单管理', description: '管理所有部门工单（查看、回复、转交、关闭）' }
  ];
  for (const perm of permissions) {
    await dbSeed.insertIgnore('admin_permissions', 'code, name, description', [perm.code, perm.name, perm.description]);
  }
  console.log('默认权限数据已初始化');

  // ── 超级管理员角色 ──
  await dbSeed.insertIgnore('admin_roles', 'name, description', ['超级管理员', '拥有所有权限']);
  const roleRows = await dbSeed.query('SELECT id FROM admin_roles WHERE name = ?', ['超级管理员']);
  const superAdminRoleId = roleRows[0].id;

  const allPerms = await dbSeed.query('SELECT id FROM admin_permissions');
  for (const perm of allPerms) {
    await dbSeed.insertIgnore('admin_role_permissions', 'role_id, permission_id', [superAdminRoleId, perm.id]);
  }
  console.log('超级管理员角色和权限已初始化');

  // ── 默认管理员 ──
  console.log('生成默认管理员账户密码哈希...');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);
  console.log('验证新生成的密码哈希:', await bcrypt.compare('admin123', hashedPassword));

  await dbSeed.upsert('admins', 'username, password, role_id', ['admin', hashedPassword, superAdminRoleId], ['role_id'], [superAdminRoleId]);
  await dbSeed.insertIgnore('site_config', 'company_name, site_url, site_title', ['默认公司名称', 'https://www.example.com', '默认网站标题']);
  await dbSeed.insertIgnore('ai_config', 'id, provider, api_base_url, model, system_prompt, max_context_messages, daily_global_limit, retention_days, enabled, guest_allowed, guest_daily_limit, default_daily_limit, default_monthly_limit, default_total_limit, temperature, max_tokens', [1, 'openai', 'https://api.openai.com/v1', 'gpt-3.5-turbo', '你是一个 helpful 的助手。', 10, 100, 30, 1, 1, 20, 50, 500, 0, 0.7, 2048]);

  console.log('默认管理员账户已创建或已存在（已关联超级管理员角色）');
  console.log('默认网站配置已创建或已存在');
  console.log('默认 AI 配置已创建或已存在');

  // ── 工单部门 ──
  console.log('正在初始化工单部门数据...');
  const ticketDepts = [
    { name: '技术支持', description: '技术问题、系统故障、功能咨询' },
    { name: '售后服务', description: '退换货、维修、服务投诉' },
    { name: '商务合作', description: '商务洽谈、合作咨询、采购需求' },
    { name: '投诉建议', description: '服务投诉、改进建议' },
    { name: '其他', description: '其他未分类问题' }
  ];
  for (const dept of ticketDepts) {
    await dbSeed.insertIgnore('ticket_departments', 'name, description', [dept.name, dept.description]);
  }
  console.log('工单部门数据已初始化');

  const allDepts = await dbSeed.query('SELECT id FROM ticket_departments');
  for (const dept of allDepts) {
    await dbSeed.insertIgnore('admin_departments', 'admin_id, department_id', [1, dept.id]);
  }
  console.log('超级管理员已关联所有部门');
  console.log('数据库表创建成功');
}

module.exports = { seedAll };
