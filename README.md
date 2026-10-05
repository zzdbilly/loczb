# loczb - 张小猛的个人技术品牌与知识库

> 纯静态极客风个人技术品牌与博客，Bento Grid 2.0 便当盒架构，6 大核心旗舰系列专栏，Raycast 鼠标聚光灯流光动效，0ms 即时预加载引擎，macOS 风格代码块，Python/Node.js 自动化脚本构建，GitHub Pages 托管，Cloudflare Workers 增强。

🌐 **官方网站**: [https://709527.xyz](https://709527.xyz)

---

## 🌟 核心特性与视觉创新

### 🎨 现代设计与交互系统
- 🍱 **Bento Grid 2.0 便当盒架构** — 模块化沉浸式信息展示，涵盖：
  1. **工作站实况态（Live Status & Terminal）**：高对比度 macOS 风格双模式终端控制台，实时展示 Focus 与站内 Pulse；
  2. **核心技术雷达（Tech Radar）**：原生 Android 底座 + 端云协同全栈赋能；
  3. **6 大旗舰专题专栏便当盒（Curated Series）**：聚合展示 AI Agent、Android 16、Kotlin 协程、工程思维等专栏封面芯片；
  4. **工程技术原则（Engineering Principles）**：实用主义优先、毫秒级极致体验、AI 工具化闭环；
  5. **量化影响力（Track Record）**：113 篇深度博文、6 大专题专栏、5+ 年移动端沉淀；
  6. **工程师哲学语录（Philosophy Quote）**：自适应双模引语便当盒。
- ⌨️ **Hero 动态变幻打字机** — 流畅光标节奏循环变幻，传递鲜明的技术定位。
- 🔍 **Raycast 级 ⌘K 即时全站微搜索** — 首页与博客页全局 Command Palette 支持，零卡顿毫秒级全文检索博文、专栏与项目，支持键盘 `↑↓` 导航与 `Enter` 秒开。
- ✨ **Raycast 鼠标聚光灯（`.spotlight-card`）** — 纯 CSS 变量与微光追踪，鼠标划过卡片时产生柔和的渐变微光与边缘流光跟随。
- 🔮 **全站毛玻璃拟态（Glassmorphism）** — `backdrop-filter: blur(16px - 24px)` 多层深色磨砂质感与发光呼吸状态胶囊。
- ☀️/🌙 **全天候高对比度双模自适应** — 针对亮色模式深度调优，确保终端卡片、代码块、文字标签在深浅色下皆具备最高可读性（对比度 7:1+ ~ 12:1+）。
- 💻 **macOS 风格代码块** — 自动注入红黄绿三色控制点、编程语言标识徽章、一键复制代码与磨砂 Toast 浮层动画反馈。

---

### 📝 博客与 6 大旗舰系列专栏
- 📚 **113 篇全量深度文章** — 深度覆盖 `Android`、`Kotlin`、`AI Agent`、`前端`、`DevOps`、`思考`、`数据库`、`系统编程`、`安全`、`开发` 等 10 大垂直领域。
- 📖 **6 大核心旗舰系列专栏**（自动化脚本 `scripts/build-series.js` 构建）：
  1. 🤖 **《AI Agent 与本地大模型实战》** (9 篇) — 工作区迁移、定时无废话直投、MCP 协议、本地 RAG 与端侧模型；
  2. 📱 **《Android 16 深度演进与系统适配》** (6 篇) — 前台服务新约束、通知大改、多媒体权限与性能深度优化；
  3. ⚡ **《Kotlin 现代并发与响应式架构》** (7 篇) — Coroutines 结构化并发、Flow 背压、Kotlin 2.4+ 与 KMP；
  4. 🎨 **《Jetpack Compose 现代 UI 实战》** (3 篇) — 复杂手势动画、Navigation 路由解耦与声明式 UI；
  5. 🛠️ **《全栈工程化与高性能架构》** (6 篇) — 构建提速、静态化极致调优、容器化编排与数据库 WAL 优化；
  6. 💡 **《程序员的工程思维与成长》** (9 篇) — 阳明心学实践、注意力管理、长期健康运维、带娃系统工程与技术写作。
- 📑 **三维内容视图切换** — 博客列表页支持 `[ 全部文章 ]` | `[ 📚 专题专栏 ]` | `[ 时间归档 ]` 瞬切。
- 🚀 **0ms 即时页面预加载（Instant Page Prefetch）** — 悬停 65ms 自动预拉取 HTML 页面，实现页面跳转 0 延迟瞬开。
- 🔘 **全端统一现代圆角图标分页** — 桌面与移动端对称统一 `( ← ) ( 1 ) ( 2 ) ... ( → )` 药丸胶囊交互。

---

### 🛠️ 基础设施与云端生态
- 🩺 **自动化死链巡检医生（`scripts/check-links.js`）** — 极速全量扫描 129 个 HTML 页面中的内链与资源引用，保障 0 死链（2026-10-05 实测：129 个 HTML、4071 条内链、0 死链）。
- 🔄 **Service Worker 离线强缓存与构建自动版本同步** — 构建时按 `sha256(articles-index.json + search.js + style.css)` 前 8 位生成 `c-xxxxxxxx` 缓存版本（内容哈希：内容不变版本不变），避免旧缓存残留。
- 💬 **评论系统** — Cloudflare Workers + Cloudflare D1 边缘数据库，支持嵌套树状回复、Token 鉴权与独立管理后台。
- 🤖 **AI 问答助手** — Cloudflare Workers 驱动，基于全站博文知识库进行 RAG 即时检索问答。
- 📡 **全自动化索引与 SEO** — `sitemap.xml`、`rss.xml`、JSON-LD 结构化数据与 Open Graph 社交分享卡片全自动构建。

---

## 🛠️ 技术栈一览

| 维度 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **托管部署** | GitHub Pages + 自定义域名 (`709527.xyz`) | 零服务器成本，Cloudflare 全球边缘 CDN 分发 |
| **前端架构** | 原生 HTML5 + CSS3 + 现代 JavaScript（ES6+） | 零框架运行时依赖，极速首屏，Instant Prefetch |
| **UI 视觉体系** | Bento Grid 2.0 + Spotlight Glow + Glassmorphism | 动态打字机、高对比度双模控制台、macOS 代码块 |
| **专栏体系** | 6 大核心旗舰系列专栏 | 自动化专栏便当盒、全集目录折叠板、上下篇导航直达 |
| **本地依赖** | Fuse.js / highlight.js（Node）+ python `markdown`（`requirements.txt`） | Vendor 本地化托管，无外链 CDN 阻塞风险；`markdown` 是纯 Markdown 正文编译的**硬依赖**（缺了构建直接失败） |
| **构建与质量**| Python 3 + Node.js + build-posts.py + verify.js + check-links.js 门禁 | 推送前本地重建索引、0 死链校验、一致性门禁、Service Worker 同步 |
| **边缘计算** | Cloudflare Workers + D1 数据库 | 支撑无服务器评论系统与 AI 知识库问答 |
| **自动化工作流**| 本地脚本链 + GitHub Actions CI | 推送前本地重建索引 + verify.js 门禁；push 后 CI 再复核（`.github/workflows/verify.yml`：pnpm 冻结安装 + 单测 + 全量编译 + 源产物一致性 + verify + check-links），GitHub Pages 自动构建部署 |

---

## 📂 项目工程结构

```
loczb/
├── index.html                     # 首页 (Bento Grid 2.0、动态打字机、Hero ⌘K 微搜索)
├── about/                         # 关于我 (Profile、4维能力矩阵、专栏知识图谱、Get in Touch)
├── projects/
│   └── index.html                 # 项目案例展示页 (Android 16 Lab / Hermes Agent Toolkit 等)
├── blog/
│   ├── index.html                 # 博客列表页 (全部文章 / 📚 专题专栏 / 时间归档三重视图)
│   ├── page-2..N.html             # 构建期静态分页 (每页 10 篇，无 JS 也能翻页)
│   ├── articles-index.json        # 全站 113 篇博文索引与标签元数据
│   ├── meta/{slug}.json           # 每篇元数据 sidecar (摘要按需拉取)
│   ├── posts-src/{slug}.md        # ★ 文章正文源 (Markdown + YAML Frontmatter，唯一真相源)
│   └── posts/                     # 编译产出的文章 HTML (内嵌专栏卡片、静态相关文章与上下篇直达)
├── assets/
│   ├── css/
│   │   ├── style.css              # 全局核心样式 (Bento 2.0、Spotlight、高对比度双模适配)
│   │   ├── article.css            # 博客正文排版样式
│   │   ├── syntax-highlight.css   # 代码语法高亮主题
│   │   └── ai-assistant.css       # AI 助手悬浮窗样式
│   ├── js/
│   │   ├── main.js                # 全局逻辑、打字机、Instant Prefetch 预加载引擎
│   │   ├── blog-list.js           # 博客分页、3重视图切换与专栏渲染
│   │   ├── search.js              # Command Palette 模糊检索引擎 (支持首页/博客/快捷键)
│   │   ├── article.js             # 文章详情页 (macOS 代码块、TOC、Toast、返回顶部)
│   │   ├── meta-cache.js          # 文章元数据按需缓存与懒拉取
│   │   └── particles.js           # 粒子动画背景
│   └── vendor/                    # 本地化第三方基础库 (Fuse, marked, dompurify)
├── scripts/
│   ├── generate-post.py           # 单篇发文 (Frontmatter / CLI 两种模式) + 自动归档 md 源
│   ├── build-posts.py             # ★ 从 posts-src/*.md 批量编译文章 (npm run build:posts)
│   ├── extract-posts-src.py       # 反向从已发 HTML 提取回 md 源
│   ├── generate-index.js          # 全站索引重建管线 (npm run build)
│   ├── verify.js                  # 一致性门禁 (npm run verify)
│   ├── check-links.js             # 死链与静态资源巡检医生 (npm run check-links)
│   ├── sync-partials.js           # 公共布局片段同步 (npm run sync-partials)
│   ├── sync-asset-versions.js     # style.css / article.js 内容哈希版本号自动同步 (generate-index 内自动调用)
│   ├── sync-widget-version.js     # 评论组件引用版本同步
│   ├── build-series.js            # 6 大旗舰系列专栏聚合构建器
│   ├── build-custom-hljs.js       # 定制 highlight.js 构建 (89KB / 28KB gzip)
│   ├── build-posts.py             # ★ 文章源编译构建管线 (npm run build:posts，从 posts-src/ 批量编译)
│   ├── refresh-posts.py           # 历史回刷兼容代理 (已废弃，转发至 build-posts.py；旧参数 --post 不再支持)
│   └── deploy-check.sh            # 部署状态自动验证脚本
├── workers/
│   ├── comment-system/            # Cloudflare Workers + D1 评论系统
│   └── ai-assistant/              # Cloudflare Workers AI 博客知识库助手
├── templates/
│   ├── post-src-template.md       # ★ 文章源脚手架模板 (复制到 blog/posts-src/ 后改名使用)
│   ├── blog-post-template.html    # 文章详情页标准化骨架模板
│   └── partials/                  # 公共布局片段 (nav / footer / skip-link，由 sync-partials.js 注入)
├── CNAME                          # 自定义域名配置
├── 404.html                       # 极客风格 404 缺省页 (集成专栏智能推荐)
├── sw.js                          # Service Worker 离线强缓存 (构建自动版本迭代)
├── sitemap.xml                    # 全量文章搜索引擎站点地图
├── rss.xml                        # 博客 RSS 订阅源
├── offline.html                   # 离线兜底页
├── requirements.txt               # 构建依赖 (python markdown，纯 Markdown 正文编译必需)
├── .github/workflows/verify.yml   # CI: push / PR 跑单测 + 全量编译 + 源产物一致性 + verify + check-links
└── BLOG-SYSTEM.md                 # 博客系统规范 (构建链与模板系统细则)
```

---

## 🚀 写作与本地构建工作流

### 1. 发布新博文

**正文源 = `blog/posts-src/{slug}.md`**（Markdown + YAML Frontmatter，唯一真相源），编译产出
`blog/posts/{slug}.html` + `blog/meta/{slug}.json`。改文章只改 md，重跑编译即可，不用手改 HTML。

**前置：构建依赖**（纯 Markdown 正文编译必需，缺失会直接构建失败并提示）：

```bash
pip install -r requirements.txt   # python markdown：复杂表格对齐、嵌套列表、多行引用等标准语法
```

Frontmatter 示例（`slug` 与 `read_time` 建议显式给；`date` 带时分秒可避免同日文章排序歧义）：

```markdown
---
title: "文章标题"
description: "文章摘要与核心观点"
date: 2026-10-05 09:30:00
category: "Android"
tags: ["Kotlin", "Jetpack Compose", "架构"]
read_time: 12
slug: my-new-post
---

## 1. 章节标题
正文内容（Markdown）...
```

**三个近义入口（别混用）**：

| 入口 | 等价命令 | 做什么 |
| :--- | :--- | :--- |
| `pnpm run build` | `node scripts/generate-index.js` | **只重算索引**：专栏注入 + 列表分页 + 首页推荐 + Sitemap + RSS + SW 版本（不重编译文章正文） |
| `pnpm run build:posts` | `python3 scripts/build-posts.py` | **文章编译（唯一推荐入口）**：从 `posts-src/*.md` 全量/单篇重编译，自带索引重建 + verify 门禁 |
| `pnpm run refresh` | 同 `pnpm run build:posts` | 历史别名，等价于 `build:posts`（底层 `scripts/refresh-posts.py` 已弃用为转发代理） |

**发布与校验命令**：

```bash
# 1. 从 md 源批量编译文章（末尾自动接索引重建 + verify 门禁，唯一推荐入口）
#    新文从模板开始：cp templates/post-src-template.md blog/posts-src/my-new-post.md
pnpm run build:posts                  # 或 python3 scripts/build-posts.py（单篇加 --slug my-new-post）

# 2. 只想单独重算全站索引（不重编译正文）时才跑：专栏注入 + 列表分页 + 首页 + Sitemap + RSS + SW 版本
pnpm run build                        # 或 node scripts/generate-index.js

# 3. 门禁与死链巡检（推送前必须双绿）
pnpm run verify                       # 或 node scripts/verify.js
pnpm run check-links                  # 或 node scripts/check-links.js

# 4. 部署校验（推送后确认线上与本地 HEAD 逐字节一致）
./scripts/deploy-check.sh
```

> `scripts/refresh-posts.py` **已弃用**：现为转发代理，**旧参数 `--post <slug>` 不再支持**（单篇统一用 `--slug <slug>`），
> 未知参数一律 `exit 1` 报错，不再静默转成全量重编译。旧「从 HTML 反解回刷」实现归档在
> `scripts/archive/refresh-posts.py`，**默认拒绝运行、需显式 `--force-run`**（`scripts/archive/` 下所有归档脚本同此纪律）。
>
> **CI 会挡住「只改产物、不改源」**：`.github/workflows/verify.yml` 顺序 = `pnpm install --frozen-lockfile` + `pip install -r requirements.txt`
> → `pnpm run test` → `pnpm run build:posts` → `git add -A && git diff --cached --exit-code`（含未跟踪新文件）→ `pnpm run verify` → `pnpm run check-links`。
> 任何手改 `blog/posts/*.html` / `blog/meta/*.json` 而不动 `blog/posts-src/*.md` 的改动，push 后 CI 必红（重建结果与提交文件逐字节比对不过）。**改正文一律改 md 源再编译。**
>
> 只想发单篇、正文直接用 HTML 写时，也可用 `python3 scripts/generate-post.py templates/post-src-template.md`（或任意自定义路径）
> （Frontmatter 模式）——它同样会把正文归档进 `posts-src/`，保证源与产物对齐。

**删除一篇文章**（无专用脚本，手工三步）：删掉 `blog/posts-src/{slug}.md`、
`blog/posts/{slug}.html`、`blog/meta/{slug}.json`，再跑 `node scripts/generate-index.js`
重建索引（列表/分页/sitemap/rss/SW 版本与别处的「相关文章」卡片会自动回滚），
最后 `verify.js` + `check-links.js` 双绿再推。

---

### 2. 专题专栏维护

在 `scripts/build-series.js` 中维护 6 大专栏配置，执行后自动向所有相关文章正文注入便当盒与关联导航：
```bash
node scripts/build-series.js
```

---

### 3. 代码提交与推送规范

遵循 Conventional Commits 规范，统一使用 **Git SSH** 协议推送：
```bash
git add -A
git commit -m "feat(blog): 新增博文"
git push origin main
```

---

## 📜 许可证

本项目采用 [MIT License](LICENSE) 开源协议。  
© 2026 [张小猛 (zzdbilly)](https://github.com/zzdbilly). All rights reserved.
