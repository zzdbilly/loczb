#!/usr/bin/env python3
"""
博客文章生成脚本 v3
使用模板 templates/blog-post-template.html 生成统一文章，自动更新全站索引

支持两种模式：
1. Frontmatter 模式（推荐，零命令行参数）：
   python3 scripts/generate-post.py article.md

   在 article.md 顶部添加：
   ---
   title: 文章标题
   description: 文章简要描述
   date: 2026-08-19
   category: Android
   tags: [Android, Kotlin, Jetpack Compose]
   read_time: 10 # 可选，默认按字数自动计算
   slug: custom-slug # 可选，默认按标题生成
   ---
   ## 第一节
   正文...

2. 命令行参数模式（兼容传统用法）：
   python3 scripts/generate-post.py "标题" "描述" \\
     --tags "标签1,标签2" --category Android --content article.md
"""

import re
import os
import sys
import json
import subprocess
from datetime import datetime
from xml.sax.saxutils import escape as xml_escape

TEMPLATE = 'templates/blog-post-template.html'
POSTS_DIR = 'blog/posts'
RELATED_JS = 'assets/js/related-posts.js'
BLOG_INDEX = 'blog/index.html'
HOME_INDEX = 'index.html'
ARTICLES_JSON = 'blog/articles-index.json'


def slugify(title):
    """将标题转为文件 slug，保留中文"""
    slug = title.lower()
    slug = re.sub(r'[^\w\u4e00-\u9fff\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = slug.strip('-')
    return slug


def load_template():
    with open(TEMPLATE, 'r', encoding='utf-8') as f:
        return f.read()


def extract_frontmatter(content):
    """从 Markdown 提取 YAML Frontmatter 元数据与正文"""
    metadata = {}
    body = content

    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            fm_text = parts[1]
            body = parts[2].strip()

            current_list_key = None
            for line in fm_text.strip().split('\n'):
                line_stripped = line.strip()
                if not line_stripped or line_stripped.startswith('#'):
                    continue

                # 处理列表项格式: - item
                if line_stripped.startswith('-') and current_list_key:
                    item_val = line_stripped[1:].strip().strip('"').strip("'")
                    if isinstance(metadata[current_list_key], list):
                        metadata[current_list_key].append(item_val)
                    continue

                if ':' in line_stripped:
                    key, val = line_stripped.split(':', 1)
                    key = key.strip().lower().replace('-', '_')
                    val = val.strip()

                    # 移除双引号/单引号
                    if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                        val = val[1:-1]

                    # 处理内联数组 [a, b, c]
                    if val.startswith('[') and val.endswith(']'):
                        val = [item.strip().strip('"').strip("'") for item in val[1:-1].split(',') if item.strip()]
                        current_list_key = None
                    elif val == '':
                        val = []
                        current_list_key = key
                    else:
                        current_list_key = None

                    metadata[key] = val

    return metadata, body


def pure_python_markdown_to_html(md_text):
    """零外部依赖的纯 Python Markdown 转 HTML 渲染器"""
    code_blocks = []
    def save_code_block(match):
        lang = match.group(1).strip() if match.group(1) else ''
        code = match.group(2)
        escaped_code = code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        lang_attr = f' class="language-{lang}"' if lang else ''
        idx = len(code_blocks)
        code_blocks.append(f'<pre><code{lang_attr}>{escaped_code}</code></pre>')
        return f'__CODE_BLOCK_{idx}__'

    text = re.sub(r'```([a-zA-Z0-9_+#-]*)\r?\n(.*?)\r?\n```', save_code_block, md_text, flags=re.DOTALL)

    inline_codes = []
    def save_inline_code(match):
        code = match.group(1)
        escaped = code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        idx = len(inline_codes)
        inline_codes.append(f'<code>{escaped}</code>')
        return f'__INLINE_CODE_{idx}__'
    text = re.sub(r'`([^`\n]+)`', save_inline_code, text)

    lines = text.split('\n')
    output = []
    in_list = None
    in_table = False
    table_rows = []

    def close_list():
        nonlocal in_list
        if in_list:
            output.append(f'</{in_list}>')
            in_list = None

    def close_table():
        nonlocal in_table, table_rows
        if in_table and table_rows:
            html_table = ['<table>']
            if len(table_rows) >= 2 and re.match(r'^\s*\|?\s*:?-+:?\s*\|', table_rows[1]):
                headers = [c.strip() for c in table_rows[0].strip('|').split('|')]
                html_table.append('<thead><tr>' + ''.join(f'<th>{h}</th>' for h in headers) + '</tr></thead>')
                html_table.append('<tbody>')
                for row in table_rows[2:]:
                    cells = [c.strip() for c in row.strip('|').split('|')]
                    html_table.append('<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>')
                html_table.append('</tbody>')
            else:
                html_table.append('<tbody>')
                for row in table_rows:
                    cells = [c.strip() for c in row.strip('|').split('|')]
                    html_table.append('<tr>' + ''.join(f'<td>{c}</td>' for c in cells) + '</tr>')
                html_table.append('</tbody>')
            html_table.append('</table>')
            output.append('\n'.join(html_table))
            table_rows = []
            in_table = False

    for line in lines:
        s = line.strip()

        if s.startswith('|') and s.endswith('|'):
            close_list()
            in_table = True
            table_rows.append(s)
            continue
        else:
            close_table()

        if re.match(r'^(-{3,}|\*{3,}|_{3,})$', s):
            close_list()
            output.append('<hr>')
            continue

        hm = re.match(r'^(#{1,6})\s+(.*)$', s)
        if hm:
            close_list()
            lvl = len(hm.group(1))
            output.append(f'<h{lvl}>{hm.group(2)}</h{lvl}>')
            continue

        if s.startswith('>'):
            close_list()
            output.append(f'<blockquote><p>{s.lstrip(">").strip()}</p></blockquote>')
            continue

        ulm = re.match(r'^[\*\-]\s+(.*)$', s)
        if ulm:
            if in_list != 'ul':
                close_list()
                in_list = 'ul'
                output.append('<ul>')
            output.append(f'<li>{ulm.group(1)}</li>')
            continue

        olm = re.match(r'^\d+\.\s+(.*)$', s)
        if olm:
            if in_list != 'ol':
                close_list()
                in_list = 'ol'
                output.append('<ol>')
            output.append(f'<li>{olm.group(1)}</li>')
            continue

        if not s:
            close_list()
            continue

        if s.startswith('__CODE_BLOCK_') and s.endswith('__'):
            close_list()
            output.append(s)
            continue

        close_list()
        output.append(f'<p>{s}</p>')

    close_list()
    close_table()

    res = '\n'.join(output)

    res = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1">', res)
    res = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', res)
    res = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', res)
    res = re.sub(r'__(.+?)__', r'<strong>\1</strong>', res)
    res = re.sub(r'\*([^\*\n]+)\*', r'<em>\1</em>', res)
    res = re.sub(r'_([^_\n]+)_', r'<em>\1</em>', res)

    for i, c in enumerate(inline_codes):
        res = res.replace(f'__INLINE_CODE_{i}__', c)
    for i, b in enumerate(code_blocks):
        res = res.replace(f'__CODE_BLOCK_{i}__', b)

    return res


def markdown_to_html(md_text):
    """转换 Markdown 为 HTML，优先使用 markdown 库，回退使用纯 Python 渲染"""
    try:
        import markdown as md_lib
        return md_lib.markdown(md_text, extensions=['fenced_code', 'tables', 'sane_lists'])
    except ImportError:
        return pure_python_markdown_to_html(md_text)


def generate_article(title, description, article_date, read_time, tags, content_html, category, custom_slug=None, series=None):
    """生成文章 HTML"""
    template = load_template()
    slug = custom_slug if custom_slug else slugify(title)
    
    og_url = f"https://709527.xyz/blog/posts/{slug}.html"
    
    # 标签 HTML 
    if isinstance(tags, list):
        tag_list = tags
    elif tags:
        tag_list = [t.strip() for t in tags.split(',') if t.strip()]
    else:
        tag_list = []

    tags_html = '\n          '.join([f'<span class="tag">{t}</span>' for t in tag_list])
    tag_links_html = '\n          '.join([f'<a href="../../blog/index.html?tag={t}" class="post-info-link"># {t}</a>' for t in tag_list])
    
    # 计算文章统计
    text_only = re.sub(r'<[^>]+>', '', content_html) if content_html else ''
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text_only))
    words = len(re.findall(r'[a-zA-Z]+', text_only))
    total_word_count = chinese_chars + words
    
    # 如果未指定阅读时间，按约 300 字/分钟计算
    if not read_time or read_time == 5:
        read_time = max(1, round(total_word_count / 300)) if total_word_count > 0 else 5

    # h2/h3 数量
    h2_count = content_html.count('<h2') if content_html else 0
    h3_count = content_html.count('<h3') if content_html else 0
    code_block_count = content_html.count('<pre') if content_html else 0
    
    # 短日期
    date_short = article_date[:10] if len(article_date) >= 10 else article_date
    
    # JSON-LD 结构化数据
    json_ld_obj = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "image": "https://709527.xyz/assets/images/og-image.png",
        "author": {
            "@type": "Person",
            "name": "张小猛",
            "url": "https://709527.xyz/about/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "loczb",
            "logo": {
                "@type": "ImageObject",
                "url": "https://709527.xyz/assets/images/favicon.svg"
            }
        },
        "datePublished": f"{article_date}T00:00:00+08:00" if len(article_date) == 10 else article_date,
        "dateModified": f"{article_date}T00:00:00+08:00" if len(article_date) == 10 else article_date,
        "url": og_url,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": og_url
        },
        "keywords": ", ".join(tag_list),
        "articleSection": category,
        "timeRequired": f"PT{read_time}M",
        "inLanguage": "zh-CN"
    }
    json_ld_str = json.dumps(json_ld_obj, ensure_ascii=False, indent=6)
    json_ld = f'    <script type="application/ld+json">\n{json_ld_str}\n    </script>'
    
    # 专栏 Banner
    series_html = f'<div class="series-banner spotlight-card"><div class="series-badge">📌 专栏收录</div><div class="series-title">{series}</div></div>' if series else ''
    
    html = template
    html = html.replace('{{TITLE}}', f"{title} | 张小猛 - loczb")
    html = html.replace('{{DESCRIPTION}}', description)
    html = html.replace('{{OG_URL}}', og_url)
    html = html.replace('{{JSON_LD}}', json_ld)
    html = html.replace('{{ARTICLE_TITLE}}', title)
    html = html.replace('{{ARTICLE_DATE}}', article_date)
    html = html.replace('{{ARTICLE_READ_TIME}}', f"{read_time} min read")
    html = html.replace('{{ARTICLE_TAGS}}', tags_html)
    html = html.replace('{{SERIES_BANNER}}', series_html)
    html = html.replace('{{ARTICLE_CONTENT}}', content_html or '<p>文章内容...</p>')
    
    # 左侧面板统计信息
    html = html.replace('{{ARTICLE_DATE_SHORT}}', date_short)
    html = html.replace('{{ARTICLE_WORD_COUNT}}', str(total_word_count))
    html = html.replace('{{ARTICLE_H2_COUNT}}', str(h2_count))
    html = html.replace('{{ARTICLE_H3_COUNT}}', str(h3_count))
    html = html.replace('{{ARTICLE_CODE_BLOCKS}}', str(code_block_count))
    html = html.replace('{{ARTICLE_TAG_LINKS}}', tag_links_html)
    html = html.replace('{{POST_SLUG}}', slug)
    
    return html, slug, tag_list, read_time


def add_to_index(slug, title, tag_list):
    """添加文章到 related-posts.js 索引"""
    with open(RELATED_JS, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if f'{{ slug: "{slug}"' in content:
        print(f"  ⚠️ 已在索引中，跳过")
        return False
    
    safe_title = title.replace('\\', '\\\\').replace('"', '\\"')
    tags_json = json.dumps(tag_list, ensure_ascii=False)
    new_entry = f'  {{ slug: "{slug}", tags: {tags_json}, title: "{safe_title}" }}'
    
    content = content.replace(
        'const ARTICLE_INDEX = [',
        'const ARTICLE_INDEX = [\n' + new_entry + ','
    )
    
    with open(RELATED_JS, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✅ 已添加到相关文章索引")
    return True


def parse_args(args):
    """解析命令行参数，支持 Frontmatter 自动推断与覆盖"""
    params = {
        'title': None,
        'description': '',
        'article_date': None,  # 保持 None：无指定时回退到 Frontmatter date，最后才是今天
        'read_time': None,
        'tags': None,
        'category': None,
        'series': None,
        'slug': None,
        'content_file': None,
        'text': None,
    }
    
    # 快捷模式：如果直接传入一个 .md / .html 文件作为第一个参数
    if len(args) == 1 and not args[0].startswith('--') and (args[0].endswith('.md') or args[0].endswith('.html') or os.path.isfile(args[0])):
        params['content_file'] = args[0]
        return params

    i = 0
    while i < len(args):
        if args[i].startswith('--'):
            key = args[i][2:]
            if key in ('date', 'read-time', 'tags', 'category', 'series', 'content', 'text', 'slug'):
                i += 1
                if i < len(args):
                    # --date 写入 article_date（main() 读取的键）；其余按 - 转 _ 映射
                    mapped_key = 'article_date' if key == 'date' else key.replace('-', '_')
                    params[mapped_key] = args[i]
            i += 1
        elif params['title'] is None:
            params['title'] = args[i]
            i += 1
        elif not params['description']:
            params['description'] = args[i]
            i += 1
        else:
            i += 1
            
    return params


def main():
    if len(sys.argv) < 2 or '-h' in sys.argv or '--help' in sys.argv:
        print(__doc__)
        sys.exit(0 if '-h' in sys.argv or '--help' in sys.argv else 1)
    
    params = parse_args(sys.argv[1:])
    
    content_html = None
    frontmatter = {}

    # 读取正文内容并解析 Frontmatter
    if params['content_file']:
        if os.path.exists(params['content_file']):
            with open(params['content_file'], 'r', encoding='utf-8') as f:
                content_raw = f.read()

            # 解析 Frontmatter
            frontmatter, md_body = extract_frontmatter(content_raw)

            # 转换为 HTML
            if params['content_file'].endswith('.md') or content_raw.startswith('---'):
                content_html = markdown_to_html(md_body)
                # 移除 markdown 中的第一个 h1（模板自带 h1）
                content_html = re.sub(r'^<h1>.*?</h1>\s*', '', content_html, count=1)
                print(f"  📖 从 Markdown 文件读取并转换 ({len(content_raw)} chars -> {len(content_html)} chars)")
            else:
                content_html = md_body
                print(f"  📖 从文件读取内容 ({len(content_html)} chars)")
        else:
            print(f"❌ 文件不存在: {params['content_file']}")
            sys.exit(1)
    elif params['text']:
        content_html = params['text']
        print(f"  📖 从命令行读取内容 ({len(content_html)} chars)")

    # 优先使用 CLI 参数，其次回退到 Frontmatter 元数据
    title = params['title'] or frontmatter.get('title')
    description = params['description'] or frontmatter.get('description') or frontmatter.get('desc') or frontmatter.get('excerpt') or ''
    article_date = params['article_date'] or frontmatter.get('date') or datetime.now().strftime('%Y-%m-%d')
    read_time = params['read_time'] or frontmatter.get('read_time') or frontmatter.get('readtime')
    tags = params['tags'] or frontmatter.get('tags') or []
    category = params['category'] or frontmatter.get('category') or frontmatter.get('categories') or '开发'
    series = params['series'] or frontmatter.get('series')
    custom_slug = params['slug'] or frontmatter.get('slug')

    if not title:
        print("❌ 缺少标题（可通过 Frontmatter 包含 title: ... 或命令行传入）")
        sys.exit(1)
    if not tags:
        print("❌ 缺少标签（可通过 Frontmatter 包含 tags: [...] 或使用 --tags 参数）")
        sys.exit(1)

    print(f"\n📝 生成文章: {title}")
    print(f"   日期: {article_date} | 分类: {category}")
    print(f"   标签: {tags}")

    html, slug, tag_list, read_time = generate_article(
        title, description, str(article_date), read_time, tags, content_html, category, custom_slug, series
    )

    # 写入文件
    output_path = os.path.join(POSTS_DIR, f'{slug}.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"\n✅ 文章已生成: {output_path}")

    # 更新相关文章索引
    add_to_index(slug, title, tag_list)

    # 调用 generate-index.js 重建所有全站索引
    script_dir = os.path.dirname(os.path.abspath(__file__))
    proj_root = os.path.dirname(script_dir)
    result = subprocess.run(['node', 'scripts/generate-index.js'], capture_output=True, text=True, cwd=proj_root)
    if result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            print(f"  {line}")
        print(f"  ✅ generate-index.js 重建完成")
    else:
        print(f"  ⚠️ generate-index.js 失败: {result.stderr}")

    print(f"\n🎉 文章已发布！所有索引已更新，直接 git push 即可")


if __name__ == '__main__':
    main()
