# scripts/archive/ — 已归档的一次性历史脚本

这里放**不可反复执行**的历史脚本。它们都已经把该做的事做完了，保留只是为了留证据、方便日后照抄思路。
每个脚本头部都写清了归档原因，并加了显式开关（`--force-run` / `--i-know-this-is-stale`），
默认直接拒绝运行，避免手滑。

| 脚本 | 归档日期 | 为什么不能跑 |
|------|----------|--------------|
| `gen_projects.py` | 2026-09-27 | 数据源 `projects/projects.json` 只剩 2 条，而线上 `projects/index.html` 是手维的 4 张案例卡。跑一次会删掉 2 张卡（Android 16 AICore & Compose Lab、Hermes Agent Toolkit），并插回已清理的 loading 遮罩 + Google Fonts，还把 `style.css?v=` 退回旧值。实测 diff：51 insertions / 143 deletions。 |
| `perf-cleanup.py` | 2026-09-27 | 全站生效已完成（重跑新增 0）。但第 45 行的全局 `re.sub(r'\n{3,}', '\n\n', text)` 会作用到**正文**：实跑一次即改掉一篇文章 `<pre><code>` 里的空行；glob 也不含 `blog/page-*.html`。 |
| `quick-fix.sh` | 2026-09-27 | 一次性 P0 链接修复，目标串已全站落地。它对整个仓库所有 `*.html` 做**无备份**的全局 `sed -i`，目标串一变就会静默改坏文件。 |
| `inject-comments.py` | 2026-09-27 | 112/112 篇文章已注入评论组件，重跑 0 变更（本身幂等，风险最低，归档只为收口“一次性脚本”）。 |
| `batch-lazy-hljs.py` | 2026-09-27 | 一次性的批量手术工具（112 篇文章 + 模板）：语法高亮改「可见优先」、TOC nav 补 aria-label、装饰 canvas 加 aria-hidden、正文外 section 补可访问名。已执行完毕，dry-run 复核为 0 变更；保留是为了留证据与复用写法。 |

## 归档后的正确做法

- **项目页**：直接手维 `projects/index.html`。若日后要恢复脚本化，先把 `projects/projects.json`
  补齐到与页面完全一致，再删掉脚本里的守卫。
- **head 批量手术**：不要复用 `perf-cleanup.py` 的空行收敛逻辑。参考
  `~/.hermes/profiles/xiaoma/skills/software-development/blog-site-maintenance/` 的规范：
  逐变体正则 + `--dry` 计数 + 残留扫描 + 标签平衡抽查，且**空行收敛仅限 `<head>` 区间**。
- **链接批量替换**：先 `git commit` 干净基线，且把 `find` 范围限定到内容目录，不要全仓 `sed -i`。

## 仍在维护链路上、不要归档的脚本

`backfill-meta.py`（sidecar 元数据真相源）、`check-links.js`（唯一死链门禁）、
`verify.js`（发布前一致性门禁）、`generate-index.js`、`generate-post.py`、
`refresh-posts.py`、`build-series.js`、`deploy-check.sh`。
