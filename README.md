# loczb — 张小猛的个人博客

> 一个基于 **GitHub Pages** 的静态博客，所有文章通过 Python 脚本生成，零运行时依赖。

🌐 **https://709527.xyz**

---

## 功能

### 博客

- 📝 **82+ 篇文章** — 覆盖 AI、Android、Kotlin、前端、DevOps、数据库等
- 🔍 **站内搜索** — `Ctrl+K` / `Cmd+K` 快捷键，Fuse.js 模糊搜索
- 🏷️ **标签云 + 归档** — 按标签筛选、按时间线归档
- 📱 **暗色主题** — localStorage 持久化，全站一致
- 📖 **相关文章推荐** — 文章页底部智能推荐
- 🔗 **RSS Feed + Sitemap** — 搜索引擎友好

### 评论系统

- 💬 **文章评论区** — 每篇文章底部有评论框
- 🔐 **编辑/删除** — 通过 edit_token 验证
- 🛡️ **垃圾过滤** — URL 数量、乱码检测、速率限制
- 📬 **嵌套结构** — 支持子评论回复
- 📊 **管理后台** — `https://loczb-comments.billycust716.workers.dev/admin`

### 其他

- 🤖 **AI 助手** — Cloudflare Workers 驱动，支持博客内容问答
- 🖼️ **OG 图片生成** — 文章分享卡片自动生成
- 📊 **访问统计** — Cloudflare Web Analytics
- 🎯 **项目展示页** — loczb / Zest / PasteBin 项目介绍

## 技术栈

| 层面 | 技术 |
|------|------|
| 托管 | GitHub Pages + 自定义域名 |
| 生成 | Python（`generate-post.py`） |
| 索引 | Node.js（`generate-index.js`） |
| 样式 | Tailwind CSS → 内联样式 |
| 高亮 | highlight.js（客户端渲染） |
| 搜索 | 纯前端（`articles-index.json`）|
| 统计 | Cloudflare Web Analytics |
| AI 助手 | Cloudflare Workers |
| 评论系统 | Cloudflare Workers + D1 |
| 评论 CI/CD | GitHub Actions（wrangler 4.x + Node 22）|

## 项目结构

```
loczb/
├── index.html                     # 首页
├── about/                         # 关于页
├── blog/
│   ├── index.html                 # 博客列表（筛选+分页+搜索）
│   ├── articles-index.json        # 搜索索引
│   └── posts/                     # 所有文章（.html）
├── assets/
│   ├── css/style.css              # 主样式
│   └── js/
│       ├── main.js                # 博客筛选/分页逻辑
│       ├── search.js              # 站内搜索（Ctrl+K）
│       └── related-posts.js       # 相关文章推荐
├── scripts/
│   ├── generate-post.py           # 文章生成脚本（v2）
│   ├── generate-index.js          # 全量索引重建
│   ├── refresh-posts.py           # 模板变更后回刷旧文章
│   └── deploy-check.sh            # 部署状态验证（失败自动重试）
├── workers/
│   └── comment-system/            # 评论系统 Worker
│       ├── wrangler.toml          # CF Workers 配置
│       ├── package.json
│       ├── schema.sql             # D1 数据库表结构
│       └── src/
│           ├── worker.js          # 评论 API 路由
│           └── admin.js           # 管理后台
├── templates/
│   ├── blog-post-template.html    # 文章页面模板
│   └── inline-styles.css          # 内联样式
├── CNAME                          # 自定义域名
├── sitemap.xml                    # 搜索引擎 sitemap
├── rss.xml                        # RSS 订阅源
└── robots.txt                     # 爬虫规则
```

## 快速发布一篇博客

```bash
# 1. 写 markdown 文件（从 ## 开始，不用写 # 标题）
vim article.md

# 2. 脚本生成
python3 scripts/generate-post.py "文章标题" "描述" \
  --tags "标签1,标签2" --category 分类 \
  --content article.md

# 3. 重建索引 + 推送
node scripts/generate-index.js
git add -A && git commit -m "feat(blog): ..." && git push

# 4. 验证部署
./scripts/deploy-check.sh
```

## 写作规范

核心要求：
- 从 `## h2` 开始写，不要写 `# h1`（模板已有）
- 技术文章：8+ h2，15+ h3，10+ 代码块，20KB+
- ❌ 禁止手动编辑 HTML 文件
- ❌ 改动模板后必须运行 `scripts/refresh-posts.py` 回刷旧文章

## 评论系统开发

```bash
# 本地开发
cd workers/comment-system
pnpm install
pnpm dev                        # wrangler dev

# 数据库操作
pnpm db:init:local              # 初始化本地 D1 数据库
pnpm db:init:remote             # 初始化远程 D1 数据库

# 部署
pnpm deploy                     # wrangler deploy
```

### 环境变量（Cloudflare Dashboard 设置）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ADMIN_USERNAME` | 管理后台用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理后台密码 | `admin123` |

### 管理后台

`https://loczb-comments.billycust716.workers.dev/admin`

- 评论列表（分页、搜索、按文章筛选）
- 编辑评论内容
- 删除评论（级联删除子评论）
- 统计面板（总评论数、文章数、今日新增）

## 分类

AI · Android · Kotlin · 前端 · DevOps · 数据库 · 系统编程 · 安全 · 思考 · 开发

## 已知问题

- GitHub Pages 的 `deploy-pages` 组件存在**间歇性部署失败**
- 推送后用 `./scripts/deploy-check.sh` 自动检测并重试
- 不是代码/配置问题，是 GitHub 服务端问题

## 许可证

MIT © [zzdbilly](https://github.com/zzdbilly)
