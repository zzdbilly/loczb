# loczb 博客系统规范

---

## 一、文件架构

```
loczb/
├── index.html                    # 首页 - Bento Grid 2.0 + 动态打字机 + Hero ⌘K 秒搜 + 精选推荐
├── blog/
│   ├── index.html                # 博客列表第 1 页 - 全部文章 / 📚 专题专栏 / 时间归档三重视图
│   ├── page-2.html ... page-N.html  # 静态分页页（每页 10 张卡 + 写死的 <a> 分页导航，无 JS 可翻页）
│   ├── articles-index.json       # 文章索引与元数据（瘦身版：posts/categories/stats，无 excerpt/archives/tagCloud）
│   ├── meta/{slug}.json          # 每篇文章元数据 sidecar（摘要按需拉取，单一真相源）
│   ├── posts-src/{slug}.md       # ★ 每篇文章 Markdown 原文与 Frontmatter（正文源唯一真相源）
│   └── posts/                    # 编译产出的文章 HTML（支持专栏便当盒注入 + 静态「相关文章」内联）
├── templates/
│   ├── post-src-template.md      # ★ 文章源脚手架模板（复制到 blog/posts-src/ 用）
│   ├── blog-post-template.html   # 文章骨架模板（含 <!-- Related Static --> 相关文章标记区间）
│   └── partials/                 # 公共布局片段（nav / footer / skip-link）
├── scripts/
│   ├── generate-post.py          # 单篇发文脚本（CLI / Frontmatter 模式）
│   ├── build-posts.py            # ★ 文章批量编译脚本 (npm run build:posts)
│   ├── generate-index.js         # 全站 CI 全量索引重建管线 (npm run build)
│   ├── sync-partials.js          # 公共布局片段同步脚本 (npm run sync-partials)
│   ├── verify.js                 # 核心门禁校验脚本 (npm run verify，含 a-o 项校验)
│   ├── check-links.js            # 自动化死链与静态资源巡检医生 (npm run check-links)
│   └── refresh-posts.py          # 全量文章骨架回刷脚本 (npm run refresh)
├── assets/
│   ├── css/style.css             # 全局核心样式 (@layer 层叠分层，Bento 2.0，双模高对比度)
│   ├── js/
│   │   ├── main.js               # 核心交互、打字机、Instant Prefetch 预加载引擎
│   │   ├── blog-list.js          # 列表页：默认走静态卡/静态分页，筛选/归档/专栏才回退 JSON 渲染
│   │   ├── meta-cache.js         # 按需拉取 blog/meta/{slug}.json 摘要 + 内存缓存（搜索/筛选共用）
│   │   └── search.js             # 全局 Command Palette 模糊检索 (⌘K / Ctrl+K)
│   └── images/                   # 图片资源
├── .github/workflows/
│   └── verify.yml                # CI: push / PR 自动化全站门禁与死链巡检
├── BLOG-SYSTEM.md                # 博客系统完整规范（本文件）
└── README.md                     # 项目全局品牌说明与架构指南
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

- **分页**：构建期静态分页（`blog/index.html` 是第 1 页，`blog/page-2..N.html` 是其余页，每页 10 篇）。
  卡片与分页导航都是静态 HTML，无 JS 也能翻页；每页带自指 canonical + rel=prev/next，不进 sitemap。
  旧 URL `blog/index.html?page=N`（N≥2）由 `blog-list.js` 重定向到 `page-N.html`。
- **筛选**：按分类 / 标签筛选。静态页只装一页数据，故筛选时 `blog-list.js` 懒加载
  `articles-index.json` 后客户端 10 条/页渲染；归档、专栏视图同理。
- **搜索**：Ctrl+K 弹出搜索框（命中后才按需拉 meta sidecar 显示摘要）
- **归档视图**：按月份分组（从 `posts[]` 现算，索引不再存派生字段）
- **相关文章**：构建期算好、内联进文章页静态 HTML（`generate-index.js` 的 injectStaticRelated）

---

## 三、生成脚本 `generate-post.py`

### 函数清单（按调用顺序）

```python
# 工具函数
slugify(title)                       # 标题→slug（去标点、转小写、空格变连字符）
load_template()                      # 读取文章模板

# 文章生成
generate_article(...)                # 替换模板占位符，写出 HTML 文件

# 触发全量重建（Node.js）
generate-index.js                    # 重建 articles-index.json / 列表页+静态分页 / 首页 / Sitemap / RSS
                                     # 并内联每篇文章的静态「相关文章」与专栏卡

# 入口
parse_args(args)                     # 参数解析
main()                               # 主流程（调用生成并触发 generate-index.js）
```

### 发布自动更新流程

```
generate_article() → write_sidecar() → scripts/generate-index.js → scripts/verify.js
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

完整重新生成全站产物：
- 读取所有 `blog/posts/*.html`（元数据优先取 `blog/meta/{slug}.json` sidecar）
- 解析标题、日期、标签、slug、分类、统计，写入 `blog/articles-index.json`
  （**已瘦身**：不再内联 `excerpt`，也不再输出 `archives` / `tagCloud` 这类重复派生数据）
- 重建 `blog/index.html` 第 1 页 + `blog/page-2..N.html` 静态分页页（每页 10 篇）
- 为每篇文章内联静态「相关文章」（共有 tag ×3 + 同 category ×1，取 top 5，新文优先做 tiebreaker）
- 重建首页、sitemap.xml（不含 page-N）、rss.xml、sw.js 缓存版本

触发方式：
- **本地**：`node scripts/generate-index.js`（`npm run build`）
- **自动**：发文/回刷脚本末尾自动调用（`generate-post.py`、`build-posts.py`、`refresh-posts.py`）
- **CI 不重建索引**（见第五节）：索引必须在推送前本地重建并一起提交，否则 CI 门禁会红

---

## 五、CI/CD 现状（2026-10-05 更正）

**CI 已恢复**：`.github/workflows/verify.yml`（P3 重构引入）在 push / PR 到 `main` 时执行
`npm install` → `npm run verify` → `npm run check-links`（Node 22 / Python 3.11）。

⚠️ **CI 只做校验，不重建索引**：它既不跑 `generate-index.js`，也不跑 `build-posts.py`
（后者需要 `pip install -r requirements.txt`，CI 未装 python 依赖）。所以**仍然没有
「push 后 CI 补索引」的兜底**——发文/回刷必须把本地重建产物一起提交。

⚠️ **本地门禁绿 ≠ CI 绿**：CI 是独立第三方复核，push 后若红要去看 Actions 日志。
（旧文档写的「GitHub Actions 已下线、`.github/` 下无 workflow」是 2026-09-08 的历史状态，
P3 之后已不成立。）

---

## 六、发布工作流

### 标准流程（md 源优先，2026-10-05 起）

```bash
cd nook/loczb

# 0. 前置：构建依赖（纯 Markdown 正文编译必需，缺了会直接构建失败）
pip install -r requirements.txt

# 1. 写正文源：从模板复制后改名
cp templates/post-src-template.md blog/posts-src/{slug}.md
#    Frontmatter 含 title / description / date（建议带时分秒）/ category / tags / read_time / slug
#    正文第一条必须是 ## 标题（不能以 HTML 注释/标签开头，否则会被当 HTML 外壳型渲染器）
#    正文写 Markdown（复杂表格、嵌套列表用 4 空格缩进）

# 2. 从 md 源批量编译（末尾自动接 generate-index.js + verify.js）
python3 scripts/build-posts.py          # npm run build:posts

# 3. 门禁与死链（推送前必须双绿）
node scripts/verify.js                  # npm run verify
node scripts/check-links.js             # npm run check-links

# 4. 提交推送
git add -A
git commit -m "feat(posts): 新增文章 - 文章标题"
git push

# 5. 部署校验（确认线上与本地 HEAD 逐字节一致）
./scripts/deploy-check.sh
```

> 单篇发文也可用 `python3 scripts/generate-post.py article.md`（Frontmatter 模式，正文可写 HTML）——
> 它同样会把正文归档进 `posts-src/`，保证源与产物对齐。

### 删除一篇文章（无专用脚本）

```bash
rm blog/posts-src/{slug}.md blog/posts/{slug}.html blog/meta/{slug}.json
node scripts/generate-index.js     # 列表/分页/sitemap/rss/SW 版本 + 别处的相关文章卡片自动回滚
node scripts/verify.js && node scripts/check-links.js   # 双绿再推
```

### 生成脚本自动完成的内容
- ✅ 生成 `blog/posts/<slug>.html` + `blog/meta/<slug>.json` sidecar
- ✅ 更新 `blog/articles-index.json`（posts/categories/stats）
- ✅ 重建 `blog/index.html` + `blog/page-2..N.html` 静态分页
- ✅ 内联全站文章的静态「相关文章」与专栏卡
- ✅ 更新 `index.html` 大卡 + 文章列表 + JS posts 数组
- ✅ 跑 `scripts/verify.js` 一致性门禁（posts/index/meta 对账 + 主页面 ?v= 一致 + 体积门禁 + 静态相关文章 + 静态分页；非零退出即阻断 push）
  - 体积门禁阈值：`articles-index.json` 超 **250KB 只预警**（非阻断提示）、超 **400KB 阻断**；两条线可用 `INDEX_WARN_BYTES` / `INDEX_FAIL_BYTES` 环境变量覆盖，便于验证门禁行为
  - 当前实测 ≈436 字节/篇（113 篇 49KB），按此外推：581 篇触预警、930 篇触阻断

### 推送后自动完成
- **GitHub Pages** 推送后自动构建部署（常规 1-2 分钟；若线上仍旧版，查首页 `last-modified` 判断是否漏触发构建）
- ❌ 索引重建**不在**推送后发生（CI 只跑 verify + check-links，不重建索引，见第五节）

---

## 七、重要规范和注意事项

### ⚠️ Slug 问题
- `slugify()` 会产生中文 slug，**不美观**
- 建议生成后手动 rename 为英文 slug（如 `mcp-协议深入实战...` → `mcp-server-deep-dive.html`）
- 需要同步更新：
  - `blog/index.html` 中的链接
  - `blog/articles-index.json` 中的 url 和 slug
  - `blog/meta/<slug>.json` sidecar 与文章页内联的相关文章链接（重跑 `generate-index.js` 即可）
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
| `index.html` | `generate-index.js` | 从 `posts[]` 读最新文章 |
| `blog/index.html` + `blog/page-*.html` | `generate-index.js` | `posts[]`（每页 10 张卡） |
| `blog/posts/*.html` | `generate-post.py` / `refresh-posts.py` + `generate-index.js` | 模板 `templates/` + 内联相关文章 |
| `blog/articles-index.json` | `generate-index.js` | 各 JS 文件（搜索/筛选/归档） |
| `blog/meta/{slug}.json` | `generate-post.py` | `generate-index.js`、`meta-cache.js` |
| `assets/js/blog-list.js` | — | `articles-index.json`（仅筛选/归档视图） |
| `assets/js/search.js` | — | `articles-index.json` + `blog/meta/*` 摘要 |
| `assets/js/main.js` | — | — |

---

## 九、md → html 编译器语义（2026-10-05 定案）

`scripts/generate-post.py` 的 `markdown_to_html()` **按正文形态自动选渲染器**：

| 正文形态 | 渲染器 | 原因 |
|---------|--------|------|
| HTML 外壳型（首行以 `<` 开头，存量 111 篇） | 零依赖逐行渲染器 | 与线上产物逐字一致，重建不产生无意义 diff；不受「构建机装没装库」影响 |
| 纯 Markdown 型（首行是 `## 标题` 等，存量 2 篇 + 以后新写的） | python `markdown` 库 | 复杂表格对齐语法、无外框竖线的表格行、嵌套列表、多行引用才正确；正文里的 `snake_case` 不会被吃成斜体 |

⚠️ **`requirements.txt` 是构建机的硬依赖**：纯 Markdown 正文缺库时 `build-posts.py` **直接
exit 1**（不再静默退回逐行渲染器）。实测两种引擎在同一份复杂语法样例上装库 8/10 项 vs
纯 Python 3/10，且产物逐字不同（984 vs 730 字符）⇒ 缺库时整站重建都会失败（因为那 2 篇）。
重建前先 `python3 -c 'import markdown'` 确认。

⚠️ **不支持 GFM 扩展**：删除线 `~~`、任务列表 `[x]` 两个引擎都不认，需要另加扩展
（`extra` / `pymdownx`），别指望装库就有。

---

## 十、Git 配置

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

*文档版本 v1.3 / 2026-10-05（更正 CI 现状：verify.yml 已恢复但只校验不重建索引；补 md→html 编译器语义与 requirements.txt 硬依赖；发布流程改为 md 源优先；新增删除文章流程）*
