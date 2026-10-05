#!/usr/bin/env python3
"""
文章源文件反向提取与归一化脚本
将 blog/posts/*.html 与 blog/meta/*.json 中的文章正文与元数据，
提取并保存为 blog/posts-src/{slug}.md（带标准 Frontmatter），
实现正文源与 HTML 外壳的彻底分离。
"""

import os
import re
import json
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
POSTS_DIR = os.path.join(ROOT_DIR, 'blog', 'posts')
META_DIR = os.path.join(ROOT_DIR, 'blog', 'meta')
SRC_DIR = os.path.join(ROOT_DIR, 'blog', 'posts-src')

if '--force-run' not in sys.argv:
    print("⛔ 本脚本已归档停用：P3 阶段存量文章逆向提取已完成，posts-src 已建立并持续维护。")
    print("   如确实需要重新提取并覆盖 posts-src/*.md，请显式传入 --force-run 参数。")
    sys.exit(1)

def extract_content(html):
    m = re.search(r'<article class="post-content">(.*?)</article>', html, re.DOTALL)
    if not m:
        return None
    inner = m.group(1)
    inner = re.split(r'[ \t]*<!-- Post Copyright & License Card -->', inner)[0]
    inner = re.sub(r'<h1>.*?</h1>\s*', '', inner, count=1, flags=re.DOTALL)
    inner = re.sub(r'<div class="post-meta">.*?</div>\s*', '', inner, count=1, flags=re.DOTALL)
    inner = re.sub(r'<div class="post-tags">.*?</div>\s*', '', inner, count=1, flags=re.DOTALL)
    inner = re.sub(r'\s*<!-- Series Card Widget -->[\s\S]*?<!-- /Series Card Widget -->\s*', '', inner)
    inner = re.sub(r'\s*<div class="series-banner[\s\S]*?</div></div>\s*', '', inner)
    inner = re.sub(r'\s*<!-- Related Static -->[\s\S]*?<!-- /Related Static -->\s*', '', inner)
    inner = re.sub(r'[ \t]*\{\{SERIES_BANNER\}\}[ \t]*\n?', '', inner)
    return inner.strip()

def main():
    posts = sorted(glob.glob(os.path.join(POSTS_DIR, '*.html')))
    print(f"📦 开始扫描并提取博文源文件: {len(posts)} 篇...")

    extracted = 0
    preserved = 0

    # 优先将 root 的 article.md 移入作为 android-testing-playbook.md 源文件
    root_article_md = os.path.join(ROOT_DIR, 'article.md')
    target_testing_md = os.path.join(SRC_DIR, 'android-testing-playbook.md')
    if os.path.exists(root_article_md) and not os.path.exists(target_testing_md):
        with open(root_article_md, 'r', encoding='utf-8') as f:
            content = f.read()
        with open(target_testing_md, 'w', encoding='utf-8') as f:
            f.write(content)
        print("  📄 已从根目录 article.md 同步到 blog/posts-src/android-testing-playbook.md")

    for p in posts:
        slug = os.path.basename(p)[:-5]
        src_path = os.path.join(SRC_DIR, f"{slug}.md")
        meta_path = os.path.join(META_DIR, f"{slug}.json")

        if os.path.exists(src_path):
            preserved += 1
            continue

        if not os.path.exists(meta_path):
            print(f"  ⚠️  缺少元数据文件: {meta_path}")
            continue

        with open(meta_path, 'r', encoding='utf-8') as f:
            meta = json.load(f)

        with open(p, 'r', encoding='utf-8') as f:
            html = f.read()

        content = extract_content(html)
        if not content:
            print(f"  ❌ 无法提取正文: {slug}")
            continue

        title = meta.get('title', slug).replace('"', '\\"')
        desc = meta.get('description', '').replace('"', '\\"')
        date_str = meta.get('dateTime') or meta.get('date', '')
        category = meta.get('category', '开发')
        tags = meta.get('tags', [])
        read_time = meta.get('readTime', 5)

        tags_yaml = json.dumps(tags, ensure_ascii=False)

        md_output = f"""---
title: "{title}"
description: "{desc}"
date: {date_str}
category: {category}
tags: {tags_yaml}
read_time: {read_time}
slug: {slug}
---

{content}
"""

        with open(src_path, 'w', encoding='utf-8') as f:
            f.write(md_output)

        extracted += 1

    print(f"✅ 博文源文件提取完成: 新增 {extracted} 篇，已有保留 {preserved} 篇，总计 {len(posts)} 篇")

if __name__ == '__main__':
    main()
