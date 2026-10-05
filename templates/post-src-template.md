---
# ── 文章源模板（复制到 blog/posts-src/{slug}.md 后改名使用）──────────────
# 用法：
#   cp templates/post-src-template.md blog/posts-src/my-new-post.md
#   python3 scripts/build-posts.py --slug my-new-post
#
# 正文源是唯一真相源，编译产出 blog/posts/{slug}.html + blog/meta/{slug}.json。
# 改文章只改这里，别手改 blog/posts/ 下的 HTML（下次编译会被覆盖）。
#
# ⚠️ 正文第一条**必须是 Markdown 标题**（`## …`），不要以 HTML 注释或标签开头：
#    编译器按「正文首行是否以 < 开头」判断走哪个渲染器 —— 以 < 开头会被当成
#    「HTML 外壳型」（存量旧文那种），复杂表格/嵌套列表会静默退化。
#
# ⚠️ 依赖：先 `pip install -r requirements.txt`（缺库会直接构建失败）。
# ⚠️ 不支持 GFM 扩展：删除线 ~~x~~、任务列表 - [x] 都不渲染，别写。
# ⚠️ 表格每行都要带首尾 `|`，否则该行被当普通文本丢掉。
# ⚠️ 嵌套列表用 4 空格缩进（Python-Markdown 不认 2 空格，会被摊平成同级）。
# ⚠️ 不要写 `# 一级标题`：页面 h1 由模板渲染，正文从 h2 开始。
# ─────────────────────────────────────────────────────────────
title: "文章标题（必填，会进 <title> / OG / JSON-LD）"
description: "一句话摘要（必填，进 meta description / OG description / 列表页摘要）"
# date 必填；同一天已有文章时**必须带时分秒**，否则同日排序会错乱
date: 2026-01-01 09:00:00
# 分类只能从这 10 个里选（verify.js 会核对）：
# AI | Android | Kotlin | 前端 | 思考 | DevOps | 数据库 | 系统编程 | 安全 | 开发
category: 开发
# 标签用 YAML 数组，2-4 个为宜（影响「相关文章」与筛选）
tags: ["标签一", "标签二"]
# read_time 可选：不写会按正文字数自动估算（约 350 字/分钟）
read_time: 10
# slug 可选：不写会按标题生成（中文标题会生成中文 slug，不好看，建议显式给英文）
slug: my-new-post
---

## 第一节：标题用动作短语

正文段落。行内代码写作 `npm run build`，加粗用 **加粗**，斜体用 *斜体*，链接写 [文字](https://709527.xyz)。

### 1.1 小节

- 无序列表项
- 另一项
    - 嵌套项要 4 个空格缩进
- 第三项

1. 有序列表项
2. 第二项

> 引用块：适合放结论、注意事项或原文摘录。

```bash
# 代码块务必标语言（highlight.js 按语言高亮，也决定右上角的语言徽章）
python3 scripts/build-posts.py --slug my-new-post
node scripts/verify.js
```

| 列一 | 列二 | 列三 |
|:-----|-----:|:----:|
| 左对齐 | 右对齐 | 居中 |

---

## 最后一节：怎么验证自己成功了

写完跑门禁，两条都绿才算完成：

```bash
python3 scripts/build-posts.py --slug my-new-post   # 编译（末尾自动接索引重建 + verify）
node scripts/check-links.js                          # 死链巡检
```

<!-- 模板文件本身不会被编译（build-posts.py 只扫 blog/posts-src/*.md）。 -->
