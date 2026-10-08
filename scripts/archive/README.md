# scripts/archive/ — 已归档的一次性历史脚本

这里放**不可反复执行**的历史脚本。它们都已经把该做的事做完了，保留只是为了留证据、方便日后照抄思路。
每个脚本头部都写清了归档原因，并加了显式开关（统一为 `--force-run`），
默认直接拒绝运行，避免手滑。

| 脚本 | 归档日期 | 为什么不能跑 |
|------|----------|--------------|
| `perf-cleanup.py` | 2026-09-27 | 全站生效已完成（重跑新增 0）。但第 45 行的全局 `re.sub(r'\n{3,}', '\n\n', text)` 会作用到**正文**：实跑一次即改掉一篇文章 `<pre><code>` 里的空行；glob 也不含 `blog/page-*.html`。 |
| `quick-fix.sh` | 2026-09-27 | 一次性 P0 链接修复，目标串已全站落地。它对整个仓库所有 `*.html` 做**无备份**的全局 `sed -i`，目标串一变就会静默改坏文件。 |
| `inject-comments.py` | 2026-09-27 | 112/112 篇文章已注入评论组件，重跑 0 变更（本身幂等，风险最低，归档只为收口“一次性脚本”）。 |
| `batch-lazy-hljs.py` | 2026-09-27 | 一次性的批量手术工具（112 篇文章 + 模板）：语法高亮改「可见优先」、TOC nav 补 aria-label、装饰 canvas 加 aria-hidden、正文外 section 补可访问名。已执行完毕，dry-run 复核为 0 变更；保留是为了留证据与复用写法。 |
| `time-progress.js` | 2026-10-01 | 时光进度条组件。DOM 容器 `.time-progress-container` 已于 Commit 3c15377 移除，脚本此前仍在首页与博客列表页作为死代码加载，现全站下线并归档。 |
| `backfill-meta.py` | 2026-10-05 | P0 阶段从 HTML 正则抽取生成 sidecar `blog/meta/*.json` 的一次性迁移脚本。全量 114 篇元数据已全部生成并转由 `build-posts.py` 在编译时自动写入。 |
| `extract-posts-src.py` | 2026-10-05 | P3 阶段从存量文章逆向提取 `blog/posts-src/*.md` 的一次性迁移脚本。源文件体系已建立完成。 |
| `refresh-posts.py` | 2026-10-05 | 历史文章骨架回刷脚本（从 HTML 反解）。自 P3 阶段确立 Markdown 唯一真相源后，已统一转由 `build-posts.py` 编译；原路径保留转发代理。 |

## 归档后的正确做法

- **项目页**：直接手维 `projects/index.html`。原本的脚本化链路已**彻底删除**（2026-10-04）：
  `projects/projects.json`（数据源）与 `scripts/archive/gen_projects.py`（生成器）都不再存在，
  项目页的唯一真相源就是 `projects/index.html` 本身。删除原因：该生成器不只是数据过期，
  它的模板本身也是旧的（会插回 loading 遮罩、Google Fonts 外链，并把 `style.css?v=` 退回旧值），
  线上实测重跑一次即 `52 insertions / 144 deletions`——即便补齐数据也得整体重写模板才能与现页对齐，
  而案例卡是编辑性内容、更新频率极低，维护成本反而更高。
  若日后确需恢复脚本化：从 git 历史取回这两个文件（`git log -- projects/projects.json`），
  **先按当前页面规范重写模板**（`<!-- POSTS_COUNT -->` 锚点、CSP meta、无外链字体、`?v=` 同步），
  再删掉脚本里的守卫，并在一次性 worktree 里与 HEAD 逐字节比对通过后才允许进主树。
- **head 批量手术**：不要复用 `perf-cleanup.py` 的空行收敛逻辑。参考
  `~/.hermes/profiles/xiaoma/skills/software-development/blog-site-maintenance/` 的规范：
  逐变体正则 + `--dry` 计数 + 残留扫描 + 标签平衡抽查，且**空行收敛仅限 `<head>` 区间**。
- **链接批量替换**：先 `git commit` 干净基线，且把 `find` 范围限定到内容目录，不要全仓 `sed -i`。

## 仍在维护链路上、不要归档的脚本

`check-links.js`（唯一死链门禁）、`verify.js`（发布前一致性门禁）、
`build-posts.py`（文章源编译管线）、`generate-index.js`（全站索引/分页/导航生成）、
`generate-post.py`（底层渲染器）、`build-series.js`、`deploy-check.sh`。
