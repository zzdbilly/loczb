# loczb 评论系统

> 基于 Cloudflare Workers + D1 的博客评论系统，支持嵌套回复、管理后台、垃圾过滤。

## 功能

- 💬 **嵌套评论** - 支持多级回复，树状展示
- 🔐 **编辑/删除** - edit_token 验证，仅作者可操作
- 🛡️ **垃圾过滤** - URL 数量检测、乱码检测、速率限制
- 🚦 **速率限制** - 每 IP 每 10 分钟最多 5 条评论
- 📊 **管理后台** - 登录认证，评论列表/搜索/编辑/删除，统计面板
- 🛡️ **XSS 防护** - 前端 DOMPurify 消毒

## 技术栈

- **运行时**：Cloudflare Workers
- **数据库**：Cloudflare D1（SQLite）
- **前端**：纯 JS + CSS（`comment-widget.js` + `comment-widget.css`）

## 主要 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/comments` | 创建评论 |
| GET | `/api/comments?slug=xxx` | 获取文章评论（嵌套） |
| PUT | `/api/comments/:id` | 编辑评论（需 edit_token） |
| DELETE | `/api/comments/:id?token=xxx` | 删除评论（需 edit_token） |

## 部署

详细的部署步骤、数据库初始化、环境变量配置请参考 **[DEPLOY.md](./DEPLOY.md)**。

快速开始：

```bash
cd workers/comment-system
pnpm install
pnpm db:init:remote    # 初始化远程 D1
pnpm deploy            # 部署 Worker
```

## 本地开发

```bash
cd workers/comment-system
pnpm dev               # wrangler dev
pnpm db:init:local     # 初始化本地 D1
```

## 文件结构

```
workers/comment-system/
├── src/
│   ├── worker.js          # 评论 API 路由
│   └── admin.js           # 管理后台
├── comment-widget.js      # 前端评论组件
├── comment-widget.css     # 评论组件样式
├── schema.sql             # D1 数据库表结构
├── wrangler.toml          # Wrangler 部署配置
├── package.json           # 项目依赖和脚本
├── DEPLOY.md              # 详细部署指南
└── README.md              # 本文件
```
