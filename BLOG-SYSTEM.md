# loczb 博客系统规范

---

## 一、文件架构

```
loczb/
├── index.html                    # 首页 - 大卡(via JS) + 最新文章列表 + 精选项目 + 关于
├── blog/
│   ├── index.html                # 博客列表页 - 筛选/分页/搜索/标签云/归档
│   ├── articles-index.json       # 文章索引（搜索用，关联推荐用）
│   └── posts/                    # 所有文章 HTML（54 篇）
├── templates/
│   ├── blog-post-template.html   # 文章骨架模板
│   └── inline-styles.css         # 内联样式（嵌入每篇文章 <style>）
├── scripts/
│   ├── generate-post.py          # ★ 主生成脚本（Python）
│   └── generate-index.js         # 完整生成 articles-index.json（Node.js）
├── assets/
│   ├── css/style.css             # 全局样式
│   ├── js/
│   │   ├── main.js               # 筛选/分页/归档/标签云
│   │   ├── search.js             # 站内搜索（Ctrl+K）
│   │   └── related-posts.js      # 相关文章推荐索引
│   └── images/                   # 图片资源
├── .github/workflows/
│   └── update-index.yml          # CI: 自动更新 articles-index.json
├── BLOG-SYSTEM.md                # 博客系统完整规范（本文件）
└── README.md                      # （已删除，整合到 BLOG-SYSTEM.md）
```

---

## 二、模板系统

### 2.1 文章模板 `templates/blog-post-template.html`

使用 `{{PLACEHOLDER}}` 占位符替换：

| 占位符 | 说明 | 来源 |
|--------|------|------|
| `{{TITLE}}` | `<title>` + OG title | 自动生成 |
| `{{DESCRIPTION}}` | `<meta description>` + OG description | 脚本参数 |
| `{{OG_URL}}` | 文章完整 URL | 自动构建 |
| `{{JSON_LD}}` | JSON-LD 结构化数据 | 自动生成 |
| `{{INLINE_STYLES}}` | 内联样式（从 inline-styles.css 读取） | 自动嵌入 |
| `{{ARTICLE_TITLE}}` | 文章标题（h1） | 脚本参数 |
| `{{ARTICLE_DATE}}` | 发布日期 | 脚本参数（默认今日） |
| `{{ARTICLE_READ_TIME}}` | 阅读时间 | 脚本参数（默认5min） |
| `{{ARTICLE_TAGS}}` | 标签 HTML（`<a>` 链接） | 自动生成 |
| `{{ARTICLE_CONTENT}}` | 文章正文（HTML） | `--content` 或 `--text` |

### 2.2 文章代码块样式（重要！）

发布新文章时，代码块 CSS 必须包含以下修复，防止首行比其他行多缩进一个字符：

```css
.post-content pre {
  background: var(--color-bg-tertiary);
  padding: 1.2rem 1.2rem 1.2rem 1.5rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0;
  font-size: 0.9rem;
  white-space: pre;
  text-indent: 0;
  line-height: 1.5;
  font-family: Consolas, "Courier New", monospace;
  -webkit-padding-start: 1.5rem;
  -moz-padding-start: 1.5rem;
  padding-left: 1.5rem;
}
.post-content pre code {
  line-height: 1.5;
  display: block;
}
```

**关键点**：
- `-webkit-padding-start: 1.5rem` 是核心修复，防止首行额外缩进
- `padding-left: 1.5rem` 提供整体右缩进（2字符）
- `margin: 0` 移除默认外边距
- 模板 `templates/inline-styles.css` 已包含此样式

### 2.2 首页 `index.html`

三层展示：
1. **大卡（Featured Card）** — 最新1篇文章，通过 JS 动态渲染
2. **最新文章列表** — 第2、3篇文章（静态 HTML + 自动更新）
3. **精选项目** — 静态区域

### 2.3 博客列表 `blog/index.html`

- **筛选**：按分类（Android / AI / 前端 / DevOps / ...）
- **分页**：客户端静态分页，JS 控制显示/隐藏
- **搜索**：Ctrl+K 弹出搜索框
- **标签云**：从 articles-index.json 读取
- **归档视图**：按月份分组

---

## 三、生成脚本 `generate-post.py`

### 函数清单（按调用顺序）

```python
# 工具函数
slugify(title)                       # 标题→slug（去标点、转小写、空格变连字符）
load_template()                      # 读取文章模板
load_default_styles()                # 读取内联样式

# 文章生成
generate_article(...)                # 替换模板占位符，写出 HTML 文件

# 索引更新
add_to_index(slug, title, tags)      # 更新 related-posts.js（关联推荐）

# 列表更新
update_blog_list(...)                # 在 blog/index.html 顶部插入新文章
update_homepage(...)                 # 更新首页大卡 + 最新文章列表
update_articles_index(...)           # 更新 articles-index.json（标签云/归档/分类）
update_homepage_js_array()           # 更新首页 JS posts 数组（大卡用）

# 入口
parse_args(args)                     # 参数解析
main()                               # 主流程（按顺序调用以上函数）
```

### 发布自动更新流程

```
generate_article() → add_to_index() → update_blog_list()
    → update_articles_index() → update_homepage() → update_homepage_js_array()
```

### 命令行用法

```bash
# 从文件读取正文（推荐）
python3 scripts/generate-post.py "标题" "描述" \
  --tags "标签1,标签2,标签3" --category 分类 \
  --read-time 14 \
  --content /tmp/article.html

# 从命令行输入正文（短篇）
python3 scripts/generate-post.py "标题" "描述" \
  --tags "标签" --category Android \
  --text "<p>正文...</p>"
```

**必需参数**：
- `--tags`：逗号分隔标签
- `--category`：文章分类（Android | Kotlin | AI | 前端 | DevOps | 安全 | 数据库 | 系统编程 | 开发）

**可选参数**：
- `--date YYYY-MM-DD`：指定日期（默认今天）
- `--read-time N`：阅读分钟数（默认5）

---

## 四、索引更新脚本 `generate-index.js`

完整重新生成 `blog/articles-index.json`：
- 读取所有 `blog/posts/*.html`
- 解析标题、日期、标签、slug
- 计算标签云、归档、分类、统计
- 写入 JSON

触发方式：
- **本地**：`node scripts/generate-index.js`
- **自动**：GitHub Actions（push 时自动运行）

---

## 五、CI/CD `update-index.yml`

GitHub Actions 自动更新 `articles-index.json`：

```
触发条件: push 到 blog/posts/** 或 blog/index.html
执行: node scripts/generate-index.js
提交: github-actions[bot] 自动 git commit + push
```

---

## 六、发布工作流

### 标准流程

```bash
cd nook/loczb

# 1. 准备正文 HTML 文件
# 2. 运行生成脚本
python3 scripts/generate-post.py "文章标题" "描述" \
  --tags "标签" --category 分类 \
  --read-time N \
  --content /tmp/content.html

# 3. 提交推送
git add -A
git commit -m "feat: 新文章 - 文章标题"
git push
```

### 生成脚本自动完成的内容
- ✅ 生成 `blog/posts/<slug>.html`
- ✅ 更新 `assets/js/related-posts.js`
- ✅ 更新 `blog/index.html`（列表顶部插入）
- ✅ 更新 `blog/articles-index.json`（标签云/归档/分类）
- ✅ 更新 `index.html` 大卡 + 文章列表
- ✅ 更新 `index.html` JS posts 数组

### CI 自动完成
- **GitHub Actions** 推送后自动运行 `generate-index.js`，确保索引最新
- **GitHub Pages** 自动部署

---

## 七、重要规范和注意事项

### ⚠️ Slug 问题
- `slugify()` 会产生中文 slug，**不美观**
- 建议生成后手动 rename 为英文 slug（如 `mcp-协议深入实战...` → `mcp-server-deep-dive.html`）
- 需要同步更新：
  - `blog/index.html` 中的链接
  - `blog/articles-index.json` 中的 url 和 slug
  - `assets/js/related-posts.js` 中的 slug
  - `index.html` 首页中的链接
  - 文章本身的 OG URL

### ⚠️ 首页大卡由 JS 渲染
- `index.html` 有一个硬编码的 `const posts` 数组（10条最新）
- JS 取 `posts[0]` 显示为大卡
- 脚本 `update_homepage_js_array()` 从 `blog/index.html` 动态提取最新10篇
- 如果 `category === category2`，第二个标签自动隐藏

### ⚠️ URLs 统一用 `blog/posts/` 前缀
- 所有链接从博客列表/首页必须 `blog/posts/xxx.html`
- `articles-index.json` 中用 `blog/posts/xxx.html`
- 从 JSON 取 URL 时（如归档视图），需要 strip `blog/` 前缀

### ⚠️ `generate-post.py` 的函数调用顺序有依赖
- `update_homepage_js_array()` 必须最后调用，因为它依赖 `blog/index.html` 已更新
- `update_homepage()` 依赖 `BLOG_INDEX` 已更新



---

## 八、关键文件引用清单

| 文件 | 被谁更新 | 读谁 |
|------|---------|------|
| `index.html` | `generate-post.py` | 从 `blog/index.html` 读最新文章 |
| `blog/index.html` | `generate-post.py` | 静态插入 |
| `blog/posts/*.html` | `generate-post.py` | 模板 `templates/` |
| `blog/articles-index.json` | `generate-post.py` + CI | 各 JS 文件 |
| `assets/js/related-posts.js` | `generate-post.py` | 文章页底部 |
| `assets/js/search.js` | — | `articles-index.json` |
| `assets/js/main.js` | — | `articles-index.json` |

---

## 九、Git 配置

```bash
# 仓库
git@github.com:zzdbilly/loczb.git

# SSH 配置
Host github.com
    HostName ssh.github.com
    Port 443
    User git
    IdentityFile ~/.ssh/id_ed25519

# 推送
git push
```

---

*文档版本 v1.0 / 2026-06-30*
