# loczb 评论系统部署指南

## 架构

```
用户浏览器 (GitHub Pages)
    ↓ fetch API
Cloudflare Worker (loczb-comments)
    ↓ query
Cloudflare D1 (loczb-comments DB)
```

## 文件结构

```
workers/comment-system/
├── src/
│   └── worker.js          # Workers API 服务端
├── comment-widget.js       # 前端评论组件（JS）
├── comment-widget.css      # 前端评论组件样式
├── schema.sql              # D1 数据库表结构
├── wrangler.toml           # Wrangler 部署配置
├── package.json            # 项目依赖和脚本
└── DEPLOY.md               # 本文件
```

## 部署步骤

### 1. 前置条件

- 安装 Node.js 18+
- 安装 Wrangler：`pnpm add -g wrangler` 或 `npm install -g wrangler`
- 登录 Cloudflare：`wrangler login`
- 确保已安装依赖：`cd workers/comment-system && pnpm install`

### 2. 创建 D1 数据库

```bash
cd workers/comment-system

# 创建数据库
wrangler d1 create loczb-comments

# 输出会包含 database_id，将其填入 wrangler.toml
# 例如：database_id = "xxxx-xxxx-xxxx-xxxx"
```

**将输出的 `database_id` 填入 `wrangler.toml` 的 `database_id` 字段。**

### 3. 初始化数据库表

```bash
# 本地开发环境
wrangler d1 execute loczb-comments --local --file=schema.sql

# 生产环境
wrangler d1 execute loczb-comments --remote --file=schema.sql
```

### 4. 部署 Worker

```bash
wrangler deploy
```

部署成功后，你会得到一个 Worker URL，类似：
`https://loczb-comments.709527.workers.dev`

### 5. 更新前端配置

在 `comment-widget.js` 的顶部，将 `API_BASE` 替换为你的实际 Worker URL：

```javascript
const API_BASE = 'https://loczb-comments.709527.workers.dev';
```

### 6. 验证

```bash
# 健康检查
curl https://loczb-comments.709527.workers.dev/api/health

# 应返回: {"ok":true,"timestamp":...}
```

### 7. 推送前端代码

```bash
cd ../../  # 回到 loczb 根目录
git add workers/comment-system/ templates/blog-post-template.html blog/posts/
git commit -m "feat: 集成评论系统"
git push
```

GitHub Pages 部署后，访问任意博客文章即可看到评论区。

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/comments` | 创建评论（body: slug, author, email, content, parent_id） |
| GET | `/api/comments?slug=xxx` | 获取文章评论（嵌套结构） |
| GET | `/api/comments/:id` | 获取单条评论 |
| PUT | `/api/comments/:id` | 编辑评论（需 edit_token） |
| DELETE | `/api/comments/:id?token=xxx` | 删除评论（需 edit_token） |

## 安全特性

- **CORS 白名单**：只允许指定域名访问
- **速率限制**：每个 IP 每分钟最多 5 条评论
- **垃圾过滤**：URL 数量限制、内容长度限制、重复字符检测
- **XSS 防护**：前端使用 DOMPurify 对 Markdown 渲染结果进行消毒
- **Token 认证**：编辑/删除评论需要 localStorage 中的 edit_token

## 数据库管理

```bash
# 查看所有评论
wrangler d1 execute loczb-comments --remote --command "SELECT * FROM comments ORDER BY created_at DESC LIMIT 20"

# 删除某条评论（管理员）
wrangler d1 execute loczb-comments --remote --command "DELETE FROM comments WHERE id = <ID>"

# 统计评论数
wrangler d1 execute loczb-comments --remote --command "SELECT COUNT(*) as total FROM comments"

# 按文章统计评论数
wrangler d1 execute loczb-comments --remote --command "SELECT post_slug, COUNT(*) as count FROM comments GROUP BY post_slug ORDER BY count DESC"
```

## 本地开发

```bash
cd workers/comment-system

# 启动本地 Wrangler 开发服务器
wrangler dev

# 本地 D1 操作
wrangler d1 execute loczb-comments --local --file=schema.sql
```

本地开发时，Worker 默认运行在 `http://localhost:8787`。
需要将 `comment-widget.js` 中的 `API_BASE` 改为本地地址进行测试。
