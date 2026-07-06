# loczb — 张小猛的个人博客

> 一个基于 **GitHub Pages** 的静态博客，所有文章通过 Python 脚本生成，零运行时依赖。

🌐 **https://709527.xyz**

---

## 🚀 快速发布一篇博客

```bash
# 1. 写 markdown 文件（从 ## 开始，不用写 # 标题）
vim article.md

# 2. 脚本生成
python3 scripts/generate-post.py "文章标题" "描述" \
  --tags "标签1,标签2" --category 分类 \
  --content article.md

# 3. 推送并验证部署
git add -A && git commit -m "feat(blog): ..." && git push && ./scripts/deploy-check.sh
```

## 📂 项目结构

```
loczb/
├── index.html                  # 首页
├── about/                      # 关于页
├── blog/
│   ├── index.html              # 博客列表（筛选+分页+搜索）
│   ├── articles-index.json     # 搜索索引（77+ 篇文章）
│   └── posts/                  # 所有文章（.html）
├── assets/
│   ├── css/style.css           # 主样式
│   └── js/
│       ├── main.js             # 博客筛选/分页逻辑
│       ├── search.js           # 站内搜索（Ctrl+K）
│       └── related-posts.js    # 相关文章推荐
├── scripts/
│   ├── generate-post.py        # 文章生成脚本（v2）
│   ├── generate-index.js       # 全量索引重建
│   ├── refresh-posts.py        # 模板变更后回刷旧文章
│   └── deploy-check.sh         # 部署状态验证（失败自动重试）
├── templates/
│   ├── blog-post-template.html # 文章页面模板
│   └── inline-styles.css       # 内联样式
├── CNAME                       # 自定义域名（709527.xyz）
├── sitemap.xml                 # 搜索引擎 sitemap
├── rss.xml                     # RSS 订阅源
└── robots.txt                  # 爬虫规则
```

## 🛠 技术栈

| 层面 | 技术 |
|------|------|
| 托管 | GitHub Pages + 自定义域名 |
| 生成 | Python（`generate-post.py`） |
| 索引 | Node.js（`generate-index.js`） |
| 样式 | Tailwind CSS → 内联样式 |
| 高亮 | highlight.js（客户端渲染） |
| 搜索 | 纯前端（`articles-index.json`）|
| 统计 | Cloudflare Web Analytics |
| AI助手 | Cloudflare Workers（博客问答）|

## 📝 写作规范

参见 [`BLOG-SYSTEM.md`](./BLOG-SYSTEM.md) 获取完整规范。

核心要求：
- 从 `## h2` 开始写，不要写 `# h1`（模板已有）
- 技术文章：8+ h2，15+ h3，10+ 代码块，20KB+
- ❌ 禁止手动编辑 HTML 文件
- ❌ 改动模板后必须运行 `scripts/refresh-posts.py` 回刷旧文章

## 📊 分类

AI · Android · Kotlin · 前端 · DevOps · 数据库 · 系统编程 · 安全 · 思考 · 开发

## 🔧 已知问题

- GitHub Pages 的 `deploy-pages` 组件存在**间歇性部署失败**（`Deployment failed, try again later`）
- 推送后用 `./scripts/deploy-check.sh` 自动检测并重试
- 不是代码/配置问题，是 GitHub 服务端问题

## 📄 许可证

MIT © [zzdbilly](https://github.com/zzdbilly)
