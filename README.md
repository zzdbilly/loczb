# loczb - 张小猛的个人博客

> 纯静态个人博客，Python 脚本生成文章，GitHub Pages 托管，Cloudflare Workers 增强。零运行时依赖。

🌐 **https://709527.xyz**

---

## 功能

### 博客

- 📝 **84+ 篇文章** — 覆盖 AI、Android、Kotlin、前端、DevOps、数据库、系统编程、安全等
- 🏠 **首页** — 粒子动画背景，最新文章卡片，项目展示
- 📋 **文章列表** — 标签筛选、分类筛选、客户端静态分页
- 🏷️ **标签云** — 按标签聚合，点击筛选相关文章
- 📅 **归档时间线** — 按年月分组浏览全部文章
- 🔍 **站内搜索** — `Ctrl+K` / `Cmd+K` 唤起，Fuse.js 模糊搜索标题、描述、标签

### 文章页

- 📖 **正文阅读** — Markdown 渲染，highlight.js 语法高亮（客户端）
- 📑 **目录导航** — 自动生成 TOC，桌面端侧边栏 + 移动端抽屉式
- 🔗 **相关文章** — 底部按标签相似度智能推荐
- 🖼️ **图片放大** — 点击图片弹出大图查看
- ⬆️ **返回顶部** — 滚动超过阈值后出现，阅读进度条
- 🔗 **分享按钮** — 一键复制文章链接

### 交互体验

- 🌗 **暗色主题** — localStorage 持久化，全站一致切换
- 📱 **响应式布局** — 移动端、平板、桌面三端适配
- ⌨️ **键盘快捷键** — 搜索 `Ctrl+K`，关闭 `Esc`
- ⏱️ **年度时间进度条** — 顶栏显示今年已过百分比

### 评论系统

- 💬 **嵌套评论** — 支持多级回复，树状展示
- 🔐 **编辑/删除** — edit_token 验证，仅作者可操作
- 🛡️ **垃圾过滤** — URL 数量检测、乱码检测、速率限制
- 🚦 **速率限制** — 每 IP 每 10 分钟最多 5 条评论
- 📊 **管理后台** — 登录认证，评论列表/搜索/编辑/删除，统计面板

### AI 助手

- 🤖 **博客问答** — Cloudflare Workers 驱动，基于全站文章知识库
- 📚 **知识库覆盖** — 全部 84+ 篇文章内容索引
- 💬 **对话交互** — 文章页右下角悬浮入口

### 其他

- 📡 **RSS Feed** — `rss.xml` 订阅源
- 🗺️ **Sitemap** — `sitemap.xml` 搜索引擎友好
- 🖼️ **OG 图片** — 文章分享卡片自动生成，社交媒体友好
- 📊 **访问统计** — Cloudflare Web Analytics（无 Cookie）
- 🤖 **JSON-LD** — 文章页结构化数据，SEO 优化
- 🔄 **PWA** — Service Worker 离线缓存

## 技术栈

| 层面 | 技术 |
|------|------|
| 托管 | GitHub Pages + 自定义域名 |
| 前端 | 纯 HTML + CSS + JavaScript（零框架） |
| 文章生成 | Python（`generate-post.py`） |
| 索引构建 | Node.js（`generate-index.js`） |
| 样式 | Tailwind CSS → 内联样式 |
| 语法高亮 | highlight.js（客户端渲染） |
| 搜索 | Fuse.js（纯前端，`articles-index.json`） |
| 评论系统 | Cloudflare Workers + D1 |
| AI 助手 | Cloudflare Workers + 通义千问 |
| 评论 CI/CD | GitHub Actions（wrangler 4.x + Node 22） |
| 统计 | Cloudflare Web Analytics |

## 项目结构

```
loczb/
├── index.html                     # 首页
├── about/                         # 关于页
├── projects/                      # 项目展示页
├── blog/
│   ├── index.html                 # 博客列表（筛选 + 分页 + 搜索）
│   ├── articles-index.json        # 搜索索引（自动生成）
│   └── posts/                     # 所有文章 HTML
├── assets/
│   ├── css/
│   │   ├── style.css              # 主样式
│   │   ├── article.css            # 文章页样式
│   │   ├── syntax-highlight.css   # 代码高亮主题
│   │   └── ai-assistant.css       # AI 助手样式
│   ├── js/
│   │   ├── main.js                # 全局逻辑
│   │   ├── blog-list.js           # 博客列表筛选/分页
│   │   ├── search.js              # 站内搜索（Ctrl+K）
│   │   ├── article.js             # 文章页（TOC、进度条、返回顶部）
│   │   ├── related-posts.js       # 相关文章推荐
│   │   ├── share.js               # 分享功能
│   │   ├── back-to-top.js         # 返回顶部
│   │   ├── time-progress.js       # 年度时间进度
│   │   └── particles.js           # 首页粒子动画
│   └── images/                    # 图片资源
├── scripts/
│   ├── generate-post.py           # 文章生成脚本（v2）
│   ├── generate-index.js          # 全量索引重建
│   ├── refresh-posts.py           # 模板变更后回刷旧文章
│   └── deploy-check.sh            # 部署状态验证（失败自动重试）
├── workers/
│   ├── comment-system/            # 评论系统 Worker
│   │   ├── src/
│   │   │   ├── worker.js          # 评论 API 路由
│   │   │   └── admin.js           # 管理后台
│   │   ├── comment-widget.js      # 评论前端组件
│   │   ├── comment-widget.css     # 评论组件样式
│   │   ├── schema.sql             # D1 数据库表结构
│   │   ├── wrangler.toml          # CF Workers 配置
│   │   └── package.json
│   └── ai-assistant/              # AI 助手 Worker
│       ├── worker.js              # AI 问答逻辑
│       └── wrangler.toml
├── templates/
│   └── blog-post-template.html    # 文章页面模板
├── .github/workflows/
│   └── deploy-comments.yml        # 评论系统自动部署
├── CNAME                          # 自定义域名 (709527.xyz)
├── .nojekyll                      # 禁用 Jekyll
├── _redirects                     # URL 重定向规则
├── sw.js                          # Service Worker
├── robots.txt                     # 爬虫规则
├── sitemap.xml                    # 搜索引擎 sitemap
├── rss.xml                        # RSS 订阅源
└── site.webmanifest               # PWA manifest
```

## 开发

### 发布新文章

```bash
# 1. 写 Markdown 文件（从 ## h2 开始，不要写 # h1）
vim article.md

# 2. 生成文章 HTML
python3 scripts/generate-post.py "文章标题" "描述" \
  --tags "标签1,标签2" --category 分类 \
  --content article.md

# 3. 重建搜索索引
node scripts/generate-index.js

# 4. 推送
git add -A && git commit -m "feat(blog): 新文章标题" && git push

# 5. 验证部署（GitHub Pages 间歇性失败时自动重试）
./scripts/deploy-check.sh
```

### 模板变更后回刷旧文章

修改 `templates/blog-post-template.html` 后，需要回刷所有已有文章：

```bash
# 回刷所有文章（保留内容，重新套模板）
python3 scripts/refresh-posts.py

# 预览模式（不写入文件）
python3 scripts/refresh-posts.py --dry-run

# 只回刷指定文章
python3 scripts/refresh-posts.py --post slug
```

### 重建搜索索引

```bash
node scripts/generate-index.js
```

### 生成项目页

```bash
python3 scripts/gen_projects.py
```

生成 `/projects/index.html` 项目展示页，从配置文件读取项目信息并渲染为 HTML。

### 注入评论组件

```bash
python3 scripts/inject-comments.py
```

批量为博客文章 HTML 注入评论系统前端组件（`comment-widget.js` + `comment-widget.css`）。新增文章或更新评论组件后运行。

### 写作规范

- ✅ 从 `## h2` 开始写，不写 `# h1`（模板已包含）
- ✅ 技术文章目标：8+ h2，15+ h3，10+ 代码块，20KB+
- ❌ 禁止手动编辑 HTML 文件（必须用脚本生成）
- ❌ 改动模板后必须运行 `refresh-posts.py` 回刷旧文章

### 分类

`AI` · `Android` · `Kotlin` · `前端` · `DevOps` · `数据库` · `系统编程` · `安全` · `思考` · `开发`

## 评论系统开发

```bash
cd workers/comment-system
pnpm install

# 本地开发
pnpm dev                         # wrangler dev

# 数据库初始化
pnpm db:init:local               # 本地 D1
pnpm db:init:remote              # 远程 D1

# 部署
pnpm deploy                      # wrangler deploy
```

### 环境变量（Cloudflare Dashboard）

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

## 部署

### 博客（GitHub Pages）

推送 `main` 分支即可自动部署：

```bash
git push origin main
```

GitHub Pages 通过 Actions 部署，`deploy-check.sh` 可验证部署状态。

### 评论系统（Cloudflare Workers）

修改 `workers/comment-system/` 下的文件并推送后，GitHub Actions 自动部署。

手动部署：

```bash
cd workers/comment-system
pnpm deploy
```

### AI 助手（Cloudflare Workers）

```bash
cd workers/ai-assistant
npx wrangler deploy
```

需在 Cloudflare Dashboard 设置 `DASHSCOPE_API_KEY` 环境变量。

## 已知问题

- GitHub Pages 的 `deploy-pages` 组件存在**间歇性部署失败**
- 推送后用 `./scripts/deploy-check.sh` 自动检测并重试
- 不是代码/配置问题，是 GitHub 服务端问题

## 许可证

MIT © [zzdbilly](https://github.com/zzdbilly)
