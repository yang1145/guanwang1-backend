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
│   ├── productController.js
│   ├── goodsController.js # 商品管理控制器
│   └── siteConfigController.js # 网站配置控制器
├── middleware/            # 中间件
├── models/                # 数据模型
│   ├── ContactMessage.js
│   ├── News.js
│   ├── Product.js
│   ├── Goods.js          # 商品数据模型
│   └── SiteConfig.js     # 网站配置数据模型
├── routes/                # 路由
│   ├── contact.js
│   ├── news.js
│   ├── products.js
│   ├── goods.js          # 商品管理路由
│   └── siteConfig.js     # 网站配置路由
├── scripts/               # 脚本文件
│   └── seedTestData.js   # 测试数据填充脚本
└── README.md              # 后端说明文档
```

## 安装依赖

在首次克隆项目后，需要安装项目依赖：

```bash
npm install
```

## 构建可执行文件

项目支持使用pkg工具构建跨平台可执行文件：

```bash
npm run build
```

该命令会生成针对Windows、Linux和macOS三个平台的可执行文件，并输出到dist目录中。

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

### 用户管理接口

- `GET /api/users` - 获取所有用户列表（管理接口）
- `GET /api/users/:id` - 获取特定用户信息（管理接口）
- `PUT /api/users/:id` - 更新用户信息（管理接口）
- `DELETE /api/users/:id` - 删除用户（管理接口）
- `GET /api/users/count` - 获取用户总数（管理接口）

### 商品管理接口

- `GET /api/goods` - 获取所有商品（支持分类筛选）
- `GET /api/goods/:id` - 获取特定商品详情
- `POST /api/goods` - 创建新商品
- `PUT /api/goods/:id` - 更新商品
- `DELETE /api/goods/:id` - 删除商品

### 网站管理接口

- `GET /api/site-config` - 获取网站配置信息
- `PUT /api/site-config` - 更新网站配置信息（管理接口）

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