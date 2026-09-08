#!/usr/bin/env python3
"""
回填 blog/meta/{slug}.json 元数据 sidecar。

从现有 blog/posts/*.html 提取规范化字段（slug/title/description/date/
dateTime/category/tags/readTime），作为全站元数据的单一真相源，供
generate-index.js 优先读取、verify.js 做一致性门禁。

只读 HTML 的 <head> 元数据与 meta 展示区，绝不写入正文内容。

本地 Run: python3 scripts/backfill-meta.py [--force]
  默认跳过已存在的 sidecar（幂等）；--force 全部重建。
"""

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS_DIR = os.path.join(ROOT, 'blog', 'posts')
META_DIR = os.path.join(ROOT, 'blog', 'meta')


def norm_date(raw):
    """'2026-8-5' -> '2026-08-05'，非法返回 ''"""
    m = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})$', raw.strip())
    if not m:
        return ''
    return f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"


def extract_meta(slug, html):
    """从文章 HTML 提取 sidecar 字段；返回 dict（缺失字段为 None/''/[]）"""
    # title：<title> 去掉站点后缀（与 generate-index.js 逐字符一致：仅尾部一次替换）
    m = re.search(r'<title>([^<]+)</title>', html)
    title = re.sub(r' \| 张小猛 - loczb$', '', m.group(1)) if m else ''

    # description：meta description
    m = re.search(r'<meta name="description" content="([^"]*)"', html)
    description = m.group(1).strip() if m else ''

    # date/dateTime：📅 span（有 HH:MM:SS 就带上，无则补 00:00:00）
    date, date_time = '', ''
    m = re.search(r'<span>📅 (\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{1,2}:\d{1,2}))?</span>', html)
    if m:
        date = norm_date(m.group(1))
        if date:
            if m.group(2):
                h, mi, s = m.group(2).split(':')
                date_time = f"{date} {int(h):02d}:{int(mi):02d}:{int(s):02d}"
            else:
                date_time = f"{date} 00:00:00"

    # category：优先 JSON-LD articleSection，次选 category-tag
    category = ''
    m = re.search(r'"articleSection":\s*"([^"]+)"', html)
    if m:
        category = m.group(1)
    else:
        m = re.search(r'<span class="category-tag"[^>]*>([^<]+)</span>', html)
        if m:
            category = m.group(1)

    # tags：span.tag → span.tech-tag → []（与 generate-index.js 现有行为一致）
    tags = [t for t in re.findall(r'<span class="tag">([^<]+)</span>', html)]
    if not tags:
        tags = [t for t in re.findall(r'<span class="tech-tag"[^>]*>([^<]+)</span>', html)]

    # readTime：只认展示区 `⏱️ (\d+) min`。提取不到则置 None——由
    # generate-index.js 回退旧正则（(\d+)\s*min，兜底 5），保证迁移前后
    # 产物输出逐字节一致；不在 sidecar 里自作主张修正（onnx/pwa 两篇
    # 正文写「阅读约 N 分钟」而展示区缺失，旧构建实际输出 5）。
    m = re.search(r'⏱️ (\d+) min', html)
    read_time = int(m.group(1)) if m else None

    return {
        'slug': slug,
        'title': title,
        'description': description,
        'date': date,
        'dateTime': date_time,
        'category': category,
        'tags': tags,
        'readTime': read_time,
    }


def main():
    force = '--force' in sys.argv
    os.makedirs(META_DIR, exist_ok=True)
    files = sorted(f for f in os.listdir(POSTS_DIR) if f.endswith('.html'))
    written, skipped, warnings = 0, 0, []

    for file in files:
        slug = file[:-5]
        out = os.path.join(META_DIR, f'{slug}.json')
        if os.path.exists(out) and not force:
            skipped += 1
            continue
        with open(os.path.join(POSTS_DIR, file), encoding='utf-8') as f:
            html = f.read()
        meta = extract_meta(slug, html)
        if not meta['date']:
            warnings.append(f"⚠️ {slug}: 未找到 📅 日期 span，date/dateTime 留空（verify 会提示）")
        if not meta['category']:
            warnings.append(f"⚠️ {slug}: 无 articleSection/category-tag，category 留空")
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
            f.write('\n')
        written += 1

    print(f"✅ backfill-meta: 写入 {written}，跳过已存在 {skipped}，共 {len(files)} 篇")
    for w in warnings:
        print(w)


if __name__ == '__main__':
    main()
