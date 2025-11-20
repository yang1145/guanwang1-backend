# 后端管理系统

基于 Node.js + Express + MySQL 的后端管理系统，为科技企业官网提供 API 接口。

## 项目结构

```
backend/
├── app.js                 # 应用入口文件
├── package.json           # 项目配置和依赖
├── .env.example          # 环境变量示例文件
├── .gitignore            # Git忽略文件配置
├── config/                # 配置文件
│   ├── db.js             # 数据库配置
│   └── initDb.js         # 数据库初始化脚本
├── controllers/           # 控制器
│   ├── contactController.js
│   ├── newsController.js
│   └── productController.js
├── middleware/            # 中间件
├── models/                # 数据模型
│   ├── ContactMessage.js
│   ├── News.js
│   └── Product.js
├── routes/                # 路由
│   ├── contact.js
│   ├── news.js
│   └── products.js
├── scripts/               # 脚本文件
│   └── seedTestData.js   # 测试数据填充脚本
└── README.md              # 后端说明文档
```

## 安装依赖

在首次克隆项目后，需要安装项目依赖：

```bash
npm install
```

## API 接口

### 产品相关接口

- `GET /api/products` - 获取所有产品（支持分类筛选）
- `GET /api/products/:id` - 获取特定产品详情
- `POST /api/products` - 创建新产品
- `PUT /api/products/:id` - 更新产品
- `DELETE /api/products/:id` - 删除产品

### 新闻相关接口

- `GET /api/news` - 获取所有新闻（支持分页）
- `GET /api/news/:id` - 获取特定新闻详情
- `GET /api/news/popular` - 获取热门新闻
- `POST /api/news` - 创建新闻
- `PUT /api/news/:id` - 更新新闻
- `DELETE /api/news/:id` - 删除新闻

### 联系表单接口

- `POST /api/contact` - 提交联系表单
- `GET /api/contact` - 获取所有联系信息（管理接口）
- `GET /api/contact/:id` - 获取特定联系信息（管理接口）

## 环境配置

1. 复制 [.env.example](../.env.example) 文件并重命名为 `.env`
2. 根据实际情况修改配置参数

## 数据库初始化

运行以下命令初始化数据库表：

```bash
npm run init-db
```

## 填充测试数据

运行以下命令向数据库中添加云产品相关的测试数据：

```bash
npm run seed-test-data
```

## 启动服务

### 开发环境

```bash
npm run dev
```

### 生产环境

```bash
npm start
```