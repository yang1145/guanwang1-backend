# 后端管理系统

基于 Node.js + Express + MySQL 的后端管理系统，为科技企业官网提供 API 接口。

## 项目结构

```
backend/
├── app.js                 # 应用入口文件
├── package.json           # 项目配置和依赖
├── .env.example          # 环境变量示例文件
├── .gitignore            # Git忽略文件配置
├── .dockerignore         # Docker忽略文件配置
├── Dockerfile            # Docker镜像构建文件
├── docker-compose.yml    # Docker Compose配置文件
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

该命令会生成针对Windows和Linux两个平台的可执行文件，并输出到dist目录中。

## 配置环境变量

构建后的可执行文件需要环境变量才能正确运行。有以下几种方式配置：

### 方法一：使用.env文件（推荐）

在可执行文件同目录下创建一个名为`.env`的文件，内容参考[.env.example](../.env.example)：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=tech_company
DB_PORT=3306

# 服务器配置
PORT=3001

# JWT密钥
JWT_SECRET=your-secret-key-change-in-production
```

### 方法二：设置系统环境变量

在运行可执行文件前，设置相应的系统环境变量。

Linux/macOS示例：
```bash
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
# 设置其他必要环境变量...
./guanwang1-backend-linux
```

Windows示例：
```cmd
set DB_HOST=localhost
set DB_USER=root
set DB_PASSWORD=your_password
# 设置其他必要环境变量...
guanwang1-backend-win.exe
```

### 方法三：直接在命令行中指定

Linux/macOS示例：
```bash
DB_HOST=localhost DB_USER=root DB_PASSWORD=your_password ./guanwang1-backend-linux
```

Windows示例：
```cmd
set DB_HOST=localhost && set DB_USER=root && set DB_PASSWORD=your_password && guanwang1-backend-win.exe
```

## 使用 Docker 运行

项目支持使用 Docker 容器化部署。提供了 Dockerfile 和 docker-compose.yml 文件。

### 构建 Docker 镜像

```bash
docker build -t guanwang1-backend .
```

### 使用 Docker Compose 运行（推荐）

Docker Compose 会同时启动应用和 MySQL 数据库：

```bash
docker-compose up -d
```

这将启动两个容器：
1. 应用容器：运行后端服务，默认端口 3001
2. 数据库容器：运行 MySQL 8.0

应用容器会在启动时自动初始化数据库表结构，然后启动服务。

### 单独运行 Docker 容器

如果您已有 MySQL 数据库，可以直接运行应用容器：

```bash
docker run -p 3001:3001 --env-file .env guanwang1-backend
```

注意需要提供有效的 .env 文件来配置数据库连接。

如果数据库尚未初始化，需要先进入容器手动运行初始化命令：
```bash
docker exec -it <container_id> npm run init-db
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