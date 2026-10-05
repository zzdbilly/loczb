#!/usr/bin/env python3
"""
文章源编译构建脚本 (Post Sources Build Pipeline)
读取 blog/posts-src/*.md，结合 templates/blog-post-template.html，
统一编译生成 blog/posts/*.html 与 blog/meta/*.json。

用法:
  python3 scripts/build-posts.py              # 全量编译所有文章源文件
  python3 scripts/build-posts.py --slug xxx   # 仅编译指定 slug 文章
  python3 scripts/build-posts.py --dry-run    # 仅测试检查，不写盘
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


def build_post(src_file, template_str, dry_run=False):
    slug = os.path.basename(src_file)[:-3]
    with open(src_file, 'r', encoding='utf-8') as f:
        raw_text = f.read()

    frontmatter, md_body = extract_frontmatter(raw_text)

    title = frontmatter.get('title') or slug
    description = frontmatter.get('description') or ''
    date_str = frontmatter.get('date') or datetime.now().strftime('%Y-%m-%d')
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
        "readTime": int(str(read_time).replace('min', '').replace('read', '').strip() or 5)
    }
    if series:
        meta_data["series"] = series

    if not dry_run:
        with open(out_post_path, 'w', encoding='utf-8') as f:
            f.write(html)
        with open(out_meta_path, 'w', encoding='utf-8') as f:
            json.dump(meta_data, f, ensure_ascii=False, indent=2)

    return True

def main():
    args = sys.argv[1:]
    dry_run = '--dry-run' in args
    target_slug = None
    if '--slug' in args:
        idx = args.index('--slug')
        if idx + 1 < len(args):
            target_slug = args[idx + 1]

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

    print(f"🔨 开始从 posts-src 编译文章: 共 {len(src_files)} 篇 {'[DRY RUN]' if dry_run else ''}")
    built = 0
    for f in src_files:
        slug = os.path.basename(f)[:-3]
        try:
            build_post(f, template_str, dry_run)
            built += 1
        except Exception as e:
            print(f"  ❌ 编译失败 {slug}: {e}")
            sys.exit(1)

    print(f"✅ 文章编译完成: {built} 篇成功")

    if not dry_run:
        print("\n🔁 触发全站索引与门禁重建...")
        cmd_index = ['node', os.path.join(ROOT_DIR, 'scripts', 'generate-index.js')]
        res = subprocess.run(cmd_index)
        if res.returncode != 0:
            print("❌ 索引生成失败")
            sys.exit(res.returncode)

        cmd_verify = ['node', os.path.join(ROOT_DIR, 'scripts', 'verify.js')]
        res_v = subprocess.run(cmd_verify)
        if res_v.returncode != 0:
            print("❌ verify 门禁失败")
            sys.exit(res_v.returncode)

if __name__ == '__main__':
    main()
