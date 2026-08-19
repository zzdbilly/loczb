# loczb - 张小猛的个人技术品牌站

> 纯静态极客风个人技术品牌与博客，Bento Grid 便当盒架构，Raycast 鼠标聚光灯流光动效，macOS 风格代码块，Python 零依赖脚本构建，GitHub Pages 托管，Cloudflare Workers 增强。

🌐 **官方网站**: [https://709527.xyz](https://709527.xyz)

---

## 🌟 核心特性与视觉创新

### 🎨 现代设计与交互系统
- 🍱 **Bento Grid 便当盒架构** — 模块化信息展示，终端实时状态机、技术栈雷达图、量化影响力数据网格与工程哲学语录。
- ✨ **Raycast 鼠标聚光灯（`.spotlight-card`）** — 纯 CSS 变量与微光追踪，鼠标划过卡片时产生柔和的渐变微光与边缘流光跟随。
- 🔮 **全站毛玻璃拟态（Glassmorphism）** — `backdrop-filter: blur(16px - 24px)` 多层深色磨砂质感与发光呼吸状态胶囊。
- 🖋️ **高雅排版系统** — 中文衬线大标题（`Noto Serif SC`）+ 正文极客等宽/无衬线（`Inter` / `JetBrains Mono`），层次分明。
- 💻 **macOS 风格代码块** — 自动注入红黄绿三色控制点、编程语言标识徽章、一键复制代码与磨砂 Toast 浮层动画反馈。
- ⚡ **Command Palette 即时检索** — 全局快捷键 `⌘K`（macOS）/ `Ctrl+K`（Windows）一键唤起，支持键盘上下方向键导航与回车直达。

---

### 📝 博客与内容系统
- 📚 **99 篇全量深度文章** — 深度覆盖 `Android`、`Kotlin`、`AI Agent`、`前端`、`DevOps`、`思考`、`数据库`、`系统编程`、`安全`、`开发` 等 10 大垂直领域。
- 📰 **双列现代文章流** — 自适应响应式排版，每篇博文卡片整合阅读耗时、分类徽章、摘要截断与技术标签胶囊。
- 📅 **时间轴月份便当盒归档** — 按年份与月份独立封装的折叠便当盒，带等宽日历徽标与文章总数统计。
- 📑 **文章阅读增强** — 动态生成 TOC 目录（桌面侧边栏 + 移动端抽屉）、阅读进度条、相关文章智能推荐与图片灯箱。

---

### 🛠️ 基础设施与云端生态
- 💬 **评论系统** — Cloudflare Workers + Cloudflare D1 边缘数据库，支持嵌套树状回复、Token 鉴权与独立管理后台。
- 🤖 **AI 问答助手** — Cloudflare Workers 驱动，基于全站 99 篇博文知识库进行 RAG 即时检索问答。
- 📦 **纯前端离线化与 PWA** — 核心依赖（Fuse.js / marked / DOMPurify）本地化托管，Service Worker 全站静态离线缓存。
- 📡 **全自动化索引与 SEO** — `sitemap.xml`、`rss.xml`、JSON-LD 结构化数据与 Open Graph 社交分享卡片全自动构建。

---

## 🛠️ 技术栈一览

| 维度 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **托管部署** | GitHub Pages + 自定义域名 (`709527.xyz`) | 零服务器成本，静态即时分发 |
| **前端架构** | 原生 HTML5 + CSS3 + 现代 JavaScript（ES6+） | 零框架运行时依赖，极速首屏 |
| **UI 视觉体系** | Bento Grid + Spotlight Glow + Glassmorphism | 衬线标题、macOS 代码块、呼吸状态指示器 |
| **本地依赖** | Fuse.js / marked / DOMPurify | Vendor 本地化托管，无外链 CDN 阻塞 |
| **构建脚本** | Python 3 + Node.js | 零第三方依赖标准库解析，PEP 668 环境原生支持 |
| **边缘计算** | Cloudflare Workers + D1 数据库 | 支撑无服务器评论系统与 AI 知识库问答 |
| **自动化工作流**| GitHub Actions (CI/CD) | 自动化测试、评论系统部署与全站索引校验 |

---

## 📂 项目工程结构

```
loczb/
├── index.html                     # 首页 (Bento Grid 便当盒架构)
├── about/                         # 关于我 (个人 Profile、技能雷达与职业旅程)
├── projects/
│   ├── index.html                 # 项目案例展示页 (Spotlight 卡片)
│   └── projects.json              # 项目案例结构化数据源 (解耦管理)
├── blog/
│   ├── index.html                 # 博客列表与归档页 (双列网格 + Command Palette 搜索)
│   ├── articles-index.json        # 全站 99 篇博文索引与元数据
│   └── posts/                     # 99 篇博客详情 HTML 正文
├── assets/
│   ├── css/
│   │   ├── style.css              # 全局核心样式 (Bento、Spotlight、Codeblock 等)
│   │   ├── article.css            # 博客正文排版样式
│   │   ├── syntax-highlight.css   # 代码语法高亮主题
│   │   └── ai-assistant.css       # AI 助手悬浮窗样式
│   ├── js/
│   │   ├── main.js                # 全局逻辑与 Spotlight 鼠标光标追踪
│   │   ├── blog-list.js           # 博客分页、分类筛选与归档视图切换
│   │   ├── search.js              # Command Palette 模糊检索引擎 (支持键盘导航)
│   │   ├── article.js             # 文章详情页 (macOS 代码块、TOC、Toast、返回顶部)
│   │   ├── related-posts.js       # 相关文章算法推荐
│   │   └── particles.js           # 粒子动画背景
│   └── vendor/                    # 本地化第三方基础库 (Fuse, marked, dompurify)
├── scripts/
│   ├── generate-post.py           # Markdown 文章构建器 (支持 YAML Frontmatter & 单文件 CLI)
│   ├── generate-index.js          # 全站 CI 索引重建 (自动同步首页/博客/sitemap/rss)
│   ├── gen_projects.py            # 项目案例页生成脚本 (读 projects.json)
│   ├── refresh-posts.py           # 模板变更后批量刷新旧文章
│   └── deploy-check.sh            # 部署状态自动验证与重试脚本
├── workers/
│   ├── comment-system/            # Cloudflare Workers + D1 评论系统
│   └── ai-assistant/              # Cloudflare Workers AI 博客知识库助手
├── templates/
│   └── blog-post-template.html    # 文章详情页标准化骨架模板
├── CNAME                          # 自定义域名配置
├── sw.js                          # Service Worker 离线缓存
├── sitemap.xml                    # 99 篇文章搜索引擎站点地图
└── rss.xml                        # 博客 RSS 订阅源
```

---

## 🚀 写作与本地构建工作流

### 1. 发布新博文

支持直接在 Markdown 头部声明 **YAML Frontmatter**：

```markdown
---
title: "文章标题"
description: "文章摘要与核心观点"
category: "Android"
tags: ["Kotlin", "Jetpack Compose", "架构"]
date: "2026-08-19"
---

## 1. 章节标题
正文内容...
```

**单文件极简生成命令**：
```bash
# 自动解析 Frontmatter 并生成 blog/posts/xxx.html
python3 scripts/generate-post.py article.md

# 重建全站索引 (自动同步 首页最新推荐、博客列表、sitemap.xml 与 rss.xml)
node scripts/generate-index.js
```

---

### 2. 更新项目案例

修改 `projects/projects.json` 数据文件后，一键重新生成项目展示页：
```bash
python3 scripts/gen_projects.py
```

---

### 3. 全量索引与多端校验

```bash
# 全量构建索引
node scripts/generate-index.js

# 推送并上线
git add -A && git commit -m "feat(blog): 新增博文" && git push origin main
```

---

## 📜 许可证

本项目采用 [MIT License](LICENSE) 开源协议。  
© 2026 [张小猛 (zzdbilly)](https://github.com/zzdbilly). All rights reserved.
