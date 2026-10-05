#!/usr/bin/env python3
"""
文章源编译构建脚本 (Post Sources Build Pipeline)
读取 blog/posts-src/*.md，结合 templates/blog-post-template.html，
统一编译生成 blog/posts/*.html 与 blog/meta/*.json。

用法:
  python3 scripts/build-posts.py              # 全量编译所有文章源文件
  python3 scripts/build-posts.py --slug xxx   # 仅编译指定 slug 文章
  python3 scripts/build-posts.py --dry-run    # 仅测试检查，不写盘也不跑下游

参数白名单由 parse_args() 统一维护（唯一真相源，scripts/refresh-posts.py 复用），
未知参数一律报错 exit(1)，不再静默忽略或降级。
"""

import os
import sys
import re
import json
import glob
import subprocess
from datetime import datetime
import html as html_lib

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT_DIR, 'blog', 'posts-src')
POSTS_DIR = os.path.join(ROOT_DIR, 'blog', 'posts')
META_DIR = os.path.join(ROOT_DIR, 'blog', 'meta')
TEMPLATE_PATH = os.path.join(ROOT_DIR, 'templates', 'blog-post-template.html')

SUPPORTED_ARGS = '--slug, --dry-run'

import importlib.util
_spec = importlib.util.spec_from_file_location("generate_post", os.path.join(ROOT_DIR, 'scripts', 'generate-post.py'))
generate_post = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(generate_post)

def extract_frontmatter(content):
    """解析 YAML Frontmatter"""
    return generate_post.extract_frontmatter(content)

def parse_read_time(val, text=''):
    if val is not None and str(val).strip() not in ('', 'None', 'null'):
        m = re.search(r'\d+', str(val))
        if m:
            num = int(m.group(0))
            if num > 0:
                return num
    # 自动按字数推算：中英混排约 350 字/分钟
    text_only = re.sub(r'<[^>]+>', '', text)
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text_only))
    words = len(re.findall(r'[a-zA-Z]+', text_only))
    return max(1, round((chinese_chars + words) / 350))

PRE_OPEN_RE = re.compile(r'<pre\b', re.I)
PRE_CLOSE_RE = re.compile(r'</pre>', re.I)
HTML_INDENTED_RE = re.compile(r'^[ \t]*<')

def normalize_src_indent(body):
    """去掉正文里 HTML 行前面的缩进，避免 Markdown 把它们当「缩进代码块」。

    背景：blog/posts-src/*.md 的正文是从既有 HTML 反向提取来的，保留着原始缩进
    （实测 113 篇里 88 篇命中，9799 行缩进、其中 9551 行以 < 开头）。而 Markdown
    规范把「4 个及以上空格缩进」当缩进代码块，于是整段正文会被转义进 <pre><code>
    （原始症状：android-16-features 的正文被编译成 &lt;p&gt;… 的纯文本）。

    两条不变量：
      1. <pre>…</pre> 内部的行一律原样保留 —— 那里的缩进是代码排版语义；
      2. 不以 < 开头的行不碰 —— Markdown 的列表/引用/嵌套靠行首缩进表达，
         动它会改变 Markdown 语义。
    HTML 块内的空白对渲染无意义，所以只去掉「行首缩进 + 紧跟 <」的行是安全的。
    """
    out = []
    in_pre = False
    for line in body.split('\n'):
        if in_pre:
            out.append(line)
            if PRE_CLOSE_RE.search(line):
                in_pre = False
            continue
        if PRE_OPEN_RE.search(line):
            out.append(line.lstrip(' \t'))
            if not PRE_CLOSE_RE.search(line):
                in_pre = True
            continue
        out.append(line.lstrip(' \t') if HTML_INDENTED_RE.match(line) else line)
    return '\n'.join(out)


def parse_args(args):
    """解析命令行参数（唯一真相源，scripts/refresh-posts.py 复用同一份校验）。

    支持 --slug <slug> 与 --dry-run；遇到未知参数直接打印错误并 sys.exit(1)，
    错误信息列出支持项，避免旧的 --post 等参数被静默忽略/降级成全量重编译。
    返回 (dry_run, target_slug)。
    """
    dry_run = False
    target_slug = None
    i = 0
    while i < len(args):
        a = args[i]
        if a == '--dry-run':
            dry_run = True
        elif a == '--slug':
            if i + 1 >= len(args) or args[i + 1].startswith('--'):
                print(f"❌ 参数 --slug 缺少值")
                print(f"   支持项: {SUPPORTED_ARGS}")
                sys.exit(1)
            target_slug = args[i + 1]
            i += 1
        else:
            print(f"❌ 未知参数: {a}")
            print(f"   支持项: {SUPPORTED_ARGS}")
            sys.exit(1)
        i += 1
    return dry_run, target_slug


# 强 Markdown 信号检测（防止纯 Markdown 正文被误判为 HTML 壳型而静默降级）
PRE_STRIP_RE = re.compile(r'<pre\b.*?</pre>', re.S | re.I)
MD_HEADING_RE = re.compile(r'^\s{0,3}#{1,6}(\s|$)')
MD_TABLE_ROW_RE = re.compile(r'^\s*\|.*\|\s*$')


def detect_misclassified_md_body(body):
    """HTML 壳型正文里出现强 Markdown 信号 → 疑似纯 Markdown 被误判。

    渲染器按「正文首个非空行是否以 < 开头」分流（generate_post._looks_like_html_body）：
    若一篇纯 Markdown 文章正文恰好以 HTML 标签/注释起头，会被当 HTML 壳型走逐行渲染器，
    复杂表格与嵌套列表静默退化，而原子化写盘与 git diff 门禁都拦不住。

    判据（可解释、经 114 篇存量实测零误报）：
      · 先剥掉 <pre>…</pre>（代码示例里的 # / | 是字面量，不算正文信号）；
      · 正文含 ≥2 行以 # 开头的 ATX 标题行，或 ≥2 行管道表格行 → 命中。
    返回 (是否命中, 原因)。
    """
    if not generate_post._looks_like_html_body(body):
        return False, ''
    outside = PRE_STRIP_RE.sub('', body)
    heading_lines = [l for l in outside.split('\n') if MD_HEADING_RE.match(l)]
    if len(heading_lines) >= 2:
        return True, f'正文含 {len(heading_lines)} 行以 # 开头的标题行'
    table_rows = [l for l in outside.split('\n') if MD_TABLE_ROW_RE.match(l)]
    if len(table_rows) >= 2:
        return True, f'正文含 {len(table_rows)} 行管道表格行'
    return False, ''


def check_dependencies(src_files):
    """构建前置环境嗅探：若存在纯 Markdown 文章，必须装有 python markdown 库。
    在任何写盘动作前执行，确保 fail-fast 且绝不留下破坏性脏状态。"""
    has_pure_md = False
    for f in src_files:
        try:
            with open(f, 'r', encoding='utf-8') as fp:
                raw_text = fp.read()
            _, body = extract_frontmatter(raw_text)
            if not generate_post._looks_like_html_body(body):
                has_pure_md = True
                break
        except Exception:
            pass

    if has_pure_md:
        try:
            import markdown  # noqa: F401
        except ImportError:
            print("❌ 构建失败: 检测到纯 Markdown 源文件，但当前 Python 环境未安装 `markdown` 库。")
            print("   为确保排版语法渲染正确且避免同一份源产出不同产物，请先安装依赖：")
            print("   👉 pip install -r requirements.txt\n")
            sys.exit(1)


def atomic_write(path, content):
    """真原子写盘：先写同目录临时文件（.tmp-<pid>-<name>），再 os.replace() 覆盖。

    同目录 + os.replace() 在 POSIX 上是原子重命名，杜绝中途失败留下截断/半截文件。
    """
    tmp = os.path.join(os.path.dirname(path), f".tmp-{os.getpid()}-{os.path.basename(path)}")
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(content)
    os.replace(tmp, path)


def snapshot_files(paths):
    """把每个目标文件的原有内容读进内存快照（原先不存在记 None），用于下游失败时回滚。"""
    snap = {}
    for p in paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                snap[p] = f.read()
        else:
            snap[p] = None
    return snap


def rollback_files(snapshot):
    """把快照写回：原有内容写回、原先不存在的文件删掉。返回实际发生还原的文件数。"""
    restored = 0
    for p, content in snapshot.items():
        if content is None:
            if os.path.exists(p):
                os.remove(p)
                restored += 1
        else:
            current = None
            if os.path.exists(p):
                with open(p, 'r', encoding='utf-8') as f:
                    current = f.read()
            if current != content:
                atomic_write(p, content)
                restored += 1
    return restored


def _rollback_and_exit(snapshot, article_count, code, reason):
    """下游（generate-index.js / verify.js）失败：回滚 posts 与 meta，同码退出。"""
    restored = rollback_files(snapshot)
    print(f"❌ {reason}（下游返回码 {code}）")
    print(f"↩️  已回滚 {article_count} 篇文章的产物到构建前状态"
          f"（posts + meta 共 {len(snapshot)} 个文件，其中 {restored} 个发生还原）")
    print("   若 git status 仍显示索引/分页/sw.js 等下游产物被改动，"
          "请用 `git checkout -- <路径>` 恢复。")
    sys.exit(code)


def render_post(src_file, template_str):
    slug = os.path.basename(src_file)[:-3]
    with open(src_file, 'r', encoding='utf-8') as f:
        raw_text = f.read()

    frontmatter, md_body = extract_frontmatter(raw_text)

    # 硬校验：HTML 壳型正文里出现强 Markdown 信号 → 疑似纯 Markdown 被误判，直接拒绝
    misclassified, why = detect_misclassified_md_body(md_body)
    if misclassified:
        raise ValueError(
            f"疑似纯 Markdown 正文被误判为 HTML 壳型（{why}）。"
            f"渲染器按「正文首行是否以 < 开头」分流，本文正文以 HTML 标签/注释起头，"
            f"会被当 HTML 壳型走逐行渲染器，复杂表格与嵌套列表会静默退化。"
            f"请把正文第一条改为二级标题（## 标题）。"
        )

    title = frontmatter.get('title') or slug
    description = frontmatter.get('description') or ''
    date_str = frontmatter.get('date')
    if not date_str or str(date_str).strip() in ('', 'None', 'null'):
        raise ValueError(f"文章 {slug} 缺少 frontmatter `date` 字段，无法确定构建日期（禁止动态降级以确保构建可重现）")

    fm_slug = frontmatter.get('slug')
    if fm_slug and str(fm_slug).strip() != slug:
        raise ValueError(f"文章 {slug} 的 frontmatter slug ('{fm_slug}') 与文件名 ('{slug}.md') 不一致")

    category = frontmatter.get('category') or '开发'
    tags = frontmatter.get('tags') or []
    read_time = parse_read_time(frontmatter.get('read_time'), md_body)
    series = frontmatter.get('series')

    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(',') if t.strip()]

    display_date, iso_date = generate_post.normalize_date(str(date_str))
    if not display_date:
        display_date = str(date_str)[:10]
        iso_date = f"{display_date}T00:00:00+08:00"

    content_html = generate_post.markdown_to_html(normalize_src_indent(md_body))
    content_html = re.sub(r'^<h1>.*?</h1>\s*', '', content_html, count=1)

    html, _, _, _ = generate_post.generate_article(
        title=title,
        description=description,
        article_date=display_date,
        read_time=read_time,
        tags=tags,
        content_html=content_html,
        category=category,
        custom_slug=slug,
        series=series,
        iso_datetime=iso_date
    )

    out_post_path = os.path.join(POSTS_DIR, f"{slug}.html")
    out_meta_path = os.path.join(META_DIR, f"{slug}.json")

    # Meta sidecar 数据
    meta_data = {
        "slug": slug,
        "title": title,
        "description": description,
        "date": display_date[:10],
        "dateTime": display_date,
        "category": category,
        "tags": tags,
        "readTime": read_time
    }
    if series:
        meta_data["series"] = series

    return slug, out_post_path, out_meta_path, html, meta_data


def main():
    dry_run, target_slug = parse_args(sys.argv[1:])

    if not os.path.exists(TEMPLATE_PATH):
        print(f"❌ 找不到文章模板: {TEMPLATE_PATH}")
        sys.exit(1)

    with open(TEMPLATE_PATH, 'r', encoding='utf-8') as f:
        template_str = f.read()

    src_files = sorted(glob.glob(os.path.join(SRC_DIR, '*.md')))
    if target_slug:
        src_files = [f for f in src_files if os.path.basename(f)[:-3] == target_slug]
        if not src_files:
            print(f"❌ 未在 blog/posts-src/ 中找到 slug 为 {target_slug} 的 .md 源文件")
            sys.exit(1)

    # 阶段 0: 前置环境检查（fail-fast，依赖缺失时一篇都不写）
    check_dependencies(src_files)

    print(f"🔨 开始从 posts-src 编译文章: 共 {len(src_files)} 篇 {'[DRY RUN]' if dry_run else ''}")

    # 阶段 1: 内存批量渲染与校验（任一篇文章出错直接退出，绝不产生部分写盘）
    rendered_batch = []
    for f in src_files:
        slug = os.path.basename(f)[:-3]
        try:
            item = render_post(f, template_str)
            rendered_batch.append(item)
        except Exception as e:
            print(f"  ❌ 渲染/校验失败 {slug}: {e}")
            sys.exit(1)

    # --dry-run 语义：不写盘、不跑下游
    if dry_run:
        print(f"✅ 文章编译完成: {len(rendered_batch)} 篇成功")
        return

    # 阶段 2: 仅当全部文章在内存中成功渲染且校验无误后，才执行统一原子写盘。
    # 写盘前先对每个目标文件（posts + meta）做内存快照，供下游失败时回滚。
    targets = []
    for slug, out_post_path, out_meta_path, html, meta_data in rendered_batch:
        targets.extend([out_post_path, out_meta_path])
    snapshot = snapshot_files(targets)

    for slug, out_post_path, out_meta_path, html, meta_data in rendered_batch:
        atomic_write(out_post_path, html)
        atomic_write(out_meta_path, json.dumps(meta_data, ensure_ascii=False, indent=2))

    print(f"✅ 文章编译完成: {len(rendered_batch)} 篇成功")

    print("\n🔁 触发全站索引与门禁重建...")
    cmd_index = ['node', os.path.join(ROOT_DIR, 'scripts', 'generate-index.js')]
    res = subprocess.run(cmd_index)
    if res.returncode != 0:
        _rollback_and_exit(snapshot, len(rendered_batch), res.returncode, "索引生成失败")

    cmd_verify = ['node', os.path.join(ROOT_DIR, 'scripts', 'verify.js')]
    res_v = subprocess.run(cmd_verify)
    if res_v.returncode != 0:
        _rollback_and_exit(snapshot, len(rendered_batch), res_v.returncode, "verify 门禁失败")

if __name__ == '__main__':
    main()
