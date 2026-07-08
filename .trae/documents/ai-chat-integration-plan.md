# AI 聊天功能集成实施计划

## 背景与目标

本项目（guanwang1-backend）目前已具备用户、新闻、商品、网站配置等基础管理能力。用户希望新增 AI 聊天能力，用于为官网访客提供智能问答。该功能需要：

- 接入通用 OpenAI 兼容接口的 AI 服务；
- 提供独立 API 文档，不混入现有 `API.md`；
- 聊天记录持久化，并支持按保留天数自动清理；
- 提供管理员接口（配置、监控、清理、设置用户配额）和用户接口（会话、发消息、查配额）；
- AI 相关配置存储在数据库中，管理员可通过 API 实时修改；
- 用户端接口需要真实 JWT 校验，以实现会话隔离和配额控制。

## 关键约束

- 不引入 `axios`、`node-cron` 等新依赖：AI 请求使用 Node.js 内置 `https`/`http`；定时任务使用 `setInterval`。
- 兼容 SQLite（sql.js 内存 + 文件持久化）、MySQL、PostgreSQL 三种数据库。
- 遵循现有模型/控制器/路由分层风格，复用 `config/db.js` 的查询接口。
- SQLite 路径下必须保持 `getRowsModified()` 在 `stmt.free()` 之前调用（当前代码已修复）。
- 现有 `middleware/adminAuth.js` 仍为模拟实现；本次仅在它之上增加管理员接口，不改造管理员认证逻辑。

## 推荐方案

### 1. 数据库表结构

在 `config/initDb.js` 的三个数据库分支（Postgres / SQLite / MySQL）中追加以下四张表。

#### 1.1 `ai_config` — AI 服务配置

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | 单条记录，固定 id=1 |
| provider | VARCHAR/TEXT | 提供商标识，如 `openai`、`custom` |
| api_key | VARCHAR/TEXT | API Key |
| api_base_url | VARCHAR/TEXT | 基础 URL，如 `https://api.openai.com/v1` |
| model | VARCHAR/TEXT | 模型名 |
| system_prompt | TEXT | 系统提示词 |
| max_context_messages | INT | 保留的最大上下文消息数 |
| daily_global_limit | INT | 全局每日调用上限 |
| retention_days | INT | 聊天记录保留天数 |
| enabled | INT/BOOLEAN | 是否启用 |
| default_daily_limit | INT | 新用户默认日限额 |
| default_monthly_limit | INT | 新用户默认月限额 |
| default_total_limit | INT | 新用户默认总限额（0 表示不限） |
| temperature | REAL/FLOAT | 采样温度 |
| max_tokens | INT | 最大返回 token 数 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

默认初始化值：

```text
provider=openai
api_base_url=https://api.openai.com/v1
model=gpt-3.5-turbo
system_prompt=你是一个 helpful 的助手。
max_context_messages=10
daily_global_limit=100
retention_days=30
enabled=1
default_daily_limit=50
default_monthly_limit=500
default_total_limit=0
temperature=0.7
max_tokens=2048
```

#### 1.2 `ai_chat_sessions` — 聊天会话

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | 自增主键 |
| user_id | INT/FK | 所属用户 |
| title | VARCHAR/TEXT | 会话标题 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 最后更新时间 |

#### 1.3 `ai_chat_messages` — 聊天记录

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | 自增主键 |
| session_id | INT/FK | 所属会话 |
| user_id | INT | 冗余字段，便于按用户统计与清理 |
| role | VARCHAR/TEXT | `system` / `user` / `assistant` |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 创建时间 |

#### 1.4 `ai_user_quotas` — 用户配额

| 字段 | 类型 | 说明 |
|---|---|---|
| id | PK | 自增主键 |
| user_id | INT/UNIQUE | 用户 ID |
| daily_limit | INT | 日限额 |
| monthly_limit | INT | 月限额 |
| total_limit | INT | 总限额（0 表示不限） |
| used_today | INT | 今日已用次数 |
| used_month | INT | 当月已用次数 |
| used_total | INT | 累计已用次数 |
| last_reset_date | VARCHAR/TEXT | 上次日重置日期 `YYYY-MM-DD` |
| last_reset_month | VARCHAR/TEXT | 上次月重置月份 `YYYY-MM` |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 2. 模型层

按现有静态类风格在 `models/` 下新建四个文件：

| 文件 | 核心方法 |
|---|---|
| `models/AiConfig.js` | `get()`、`update(fields)` |
| `models/AiChatSession.js` | `create(userId, title)`、`getByUser(userId)`、`getById(id)`、`updateTimestamp(id)`、`deleteById(id)`、`deleteEmptyOlderThan(days)` |
| `models/AiChatMessage.js` | `create(message)`、`getBySession(sessionId, limit)`、`deleteById(id)`、`deleteBySession(sessionId)`、`deleteOlderThan(days)` |
| `models/AiUserQuota.js` | `getOrCreate(userId)`、`setLimits(userId, limits)`、`incrementUsage(userId)`、`checkQuota(userId, config)` |

`AiUserQuota.getOrCreate()` 中需自动处理日/月重置：比较当前日期/月份与 `last_reset_date` / `last_reset_month`，不一致则清零对应计数。

### 3. 服务层

新建 `services/aiProvider.js`：

- 使用 Node.js 内置 `https`/`http` 模块；
- 读取 `ai_config` 中的 `api_base_url`、`api_key`、`model`、`temperature`、`max_tokens`；
- 构造 OpenAI 兼容请求：`POST ${api_base_url}/chat/completions`；
- 返回助手回复文本，非 2xx 时抛出可识别错误。

### 4. 中间件

#### 4.1 `middleware/userAuth.js`（新增）

- 读取请求头 `Authorization: Bearer <token>`；
- 使用 `jsonwebtoken` 和 `process.env.JWT_SECRET` 校验；
- 成功后挂载 `req.user = { id, phone }`；
- 失败返回 `401 { error: '未登录或令牌无效' }`。

该中间件仅用于 AI 聊天用户端点，与现有 `/api/users/login` 返回的 token 保持一致。

#### 4.2 限流（复用已安装依赖）

在 `routes/aiChat.js` 中对发送消息接口使用 `express-rate-limit`：

```js
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user.id.toString(),
  message: { error: '请求过于频繁，请稍后再试' }
});
```

### 5. 控制器层

#### 5.1 `controllers/aiChatAdminController.js`

| 方法 | 接口 | 说明 |
|---|---|---|
| `getConfig` | `GET /api/ai-chat/admin/config` | 获取配置，`api_key` 掩码返回 |
| `updateConfig` | `PUT /api/ai-chat/admin/config` | 更新配置 |
| `cleanupNow` | `POST /api/ai-chat/admin/cleanup` | 根据 `retention_days` 立即清理 |
| `listSessions` | `GET /api/ai-chat/admin/sessions` | 分页查看所有会话 |
| `getSessionMessages` | `GET /api/ai-chat/admin/sessions/:id/messages` | 查看某会话全部消息 |
| `deleteSession` | `DELETE /api/ai-chat/admin/sessions/:id` | 删除会话及其消息 |
| `deleteMessage` | `DELETE /api/ai-chat/admin/messages/:id` | 删除单条消息 |
| `getUserQuota` | `GET /api/ai-chat/admin/quotas/:userId` | 查看指定用户配额 |
| `setUserQuota` | `PUT /api/ai-chat/admin/quotas/:userId` | 设置指定用户配额 |

#### 5.2 `controllers/aiChatUserController.js`

| 方法 | 接口 | 说明 |
|---|---|---|
| `createSession` | `POST /api/ai-chat/sessions` | 创建新会话 |
| `listMySessions` | `GET /api/ai-chat/sessions` | 当前用户会话列表 |
| `getSessionMessages` | `GET /api/ai-chat/sessions/:id/messages` | 当前用户某会话消息 |
| `sendMessage` | `POST /api/ai-chat/sessions/:id/messages` | 发送消息并调用 AI |
| `deleteMySession` | `DELETE /api/ai-chat/sessions/:id` | 删除自己的会话 |
| `getMyQuota` | `GET /api/ai-chat/quota` | 当前用户配额使用情况 |

`sendMessage` 核心流程：

1. 校验会话归属当前用户；
2. 检查 `ai_config.enabled`；
3. 读取/初始化 `ai_user_quotas`，必要时重置日/月计数；
4. 校验用户级日/月/总限额及全局日限额；
5. 保存用户消息；
6. 构造上下文：`system_prompt` + 最近 `max_context_messages` 条历史 + 当前消息；
7. 调用 `aiProvider.chatCompletion()`；
8. 保存助手回复；
9. 更新会话 `updated_at`；若会话标题为空且为首次用户消息，自动生成标题；
10. 增加配额计数并返回助手消息。

### 6. 路由层

新建 `routes/aiChat.js`，统一挂载到 `/api/ai-chat`。

管理员接口使用 `adminAuth`，用户接口使用 `userAuth`。

```text
GET    /api/ai-chat/admin/config
PUT    /api/ai-chat/admin/config
POST   /api/ai-chat/admin/cleanup
GET    /api/ai-chat/admin/sessions
GET    /api/ai-chat/admin/sessions/:id/messages
DELETE /api/ai-chat/admin/sessions/:id
DELETE /api/ai-chat/admin/messages/:id
GET    /api/ai-chat/admin/quotas/:userId
PUT    /api/ai-chat/admin/quotas/:userId

POST   /api/ai-chat/sessions
GET    /api/ai-chat/sessions
GET    /api/ai-chat/sessions/:id/messages
POST   /api/ai-chat/sessions/:id/messages
DELETE /api/ai-chat/sessions/:id
GET    /api/ai-chat/quota
```

在 `app.js` 中新增：

```js
const aiChatRoutes = require('./routes/aiChat');
app.use('/api/ai-chat', aiChatRoutes);
```

### 7. 自动清理机制

在 `app.js` 中启动时执行，并每 24 小时执行一次：

```js
const AiConfig = require('./models/AiConfig');
const AiChatMessage = require('./models/AiChatMessage');
const AiChatSession = require('./models/AiChatSession');

async function cleanupAiChatHistory() {
  try {
    const config = await AiConfig.get();
    if (!config || !config.retention_days) return;
    await AiChatMessage.deleteOlderThan(config.retention_days);
    await AiChatSession.deleteEmptyOlderThan(config.retention_days);
    console.log('AI 聊天记录清理完成');
  } catch (err) {
    console.error('AI 聊天记录清理失败:', err);
  }
}

cleanupAiChatHistory();
setInterval(cleanupAiChatHistory, 24 * 60 * 60 * 1000);
```

管理员也可通过 `POST /api/ai-chat/admin/cleanup` 手动触发。

### 8. API 文档

新建独立文件 `AI_CHAT_API.md`（项目根目录），包含：

1. 基础信息（base URL、认证头）；
2. 管理员接口详细说明（URL、方法、请求体、响应示例）；
3. 用户接口详细说明；
4. 错误码与配额说明；
5. 配置字段默认值。

### 9. 实施顺序

1. 修改 `config/initDb.js` 增加四张表及默认配置；
2. 创建 `models/AiConfig.js`、`models/AiChatSession.js`、`models/AiChatMessage.js`、`models/AiUserQuota.js`；
3. 创建 `services/aiProvider.js`；
4. 创建 `middleware/userAuth.js`；
5. 创建 `controllers/aiChatAdminController.js` 和 `controllers/aiChatUserController.js`；
6. 创建 `routes/aiChat.js`；
7. 修改 `app.js` 注册路由并启动定时清理；
8. 编写 `AI_CHAT_API.md`；
9. 运行 `npm run init-db` 并做端到端验证。

## 关键文件清单

- `d:\documents\GitHub\guanwang1-backend\config\initDb.js`
- `d:\documents\GitHub\guanwang1-backend\models\AiConfig.js`
- `d:\documents\GitHub\guanwang1-backend\models\AiChatSession.js`
- `d:\documents\GitHub\guanwang1-backend\models\AiChatMessage.js`
- `d:\documents\GitHub\guanwang1-backend\models\AiUserQuota.js`
- `d:\documents\GitHub\guanwang1-backend\services\aiProvider.js`
- `d:\documents\GitHub\guanwang1-backend\middleware\userAuth.js`
- `d:\documents\GitHub\guanwang1-backend\controllers\aiChatAdminController.js`
- `d:\documents\GitHub\guanwang1-backend\controllers\aiChatUserController.js`
- `d:\documents\GitHub\guanwang1-backend\routes\aiChat.js`
- `d:\documents\GitHub\guanwang1-backend\app.js`
- `d:\documents\GitHub\guanwang1-backend\AI_CHAT_API.md`

## 验证方案

1. 初始化：`npm run init-db`，确认四张新表和默认 `ai_config` 已生成；
2. 用户端：注册/登录获取 token → 创建会话 → 发送消息 → 查看配额变化；
3. 管理端：查看/修改配置 → 设置用户配额 → 查看所有会话/消息 → 手动触发清理；
4. 清理：将 `retention_days` 调为 0 或插入过期测试数据，调用 cleanup 接口验证删除；
5. 限流：连续调用发送消息接口超过 30 次/分钟，确认返回 429；
6. 跨库：如环境允许，分别使用 SQLite、MySQL、PostgreSQL 跑一遍 `init-db` 和核心接口。

## 待用户确认事项

- [x] 接入通用 OpenAI 兼容接口（可配置端点、模型、API Key）。
- [x] 用户端接口实现真实 JWT 校验。
- [ ] 是否需要在发送消息接口支持 SSE 流式响应？（当前计划为非流式，实现更简单；如需要可在后续迭代中增加。）
