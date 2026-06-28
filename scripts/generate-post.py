#!/usr/bin/env python3
"""
博客文章生成脚本
使用模板 templates/blog-post-template.html 生成统一的文章页面

用法:
  python3 scripts/generate-post.py "标题" "描述" [选项]

选项:
  --date YYYY-MM-DD     发布日期 (默认: 今日)
  --read-time N         阅读时间分钟数 (默认: 5)
  --tags "标签1,标签2"  文章标签（逗号分隔）
  --content FILE        从 markdown 文件读取内容

示例:
  python3 scripts/generate-post.py "我的新文章" "这是一篇关于..." --tags "Android,AI" --read-time 10
  python3 scripts/generate-post.py "文章标题" "描述" --content article.md
"""

import re
import os
import sys
from datetime import date

TEMPLATE = 'templates/blog-post-template.html'
POSTS_DIR = 'blog/posts'
RELATED_JS = 'assets/js/related-posts.js'

def load_template():
    with open(TEMPLATE, 'r', encoding='utf-8') as f:
        return f.read()

def slugify(title):
    """将标题转为文件 slug"""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = slug.strip('-')
    return slug

def generate(title, description, article_date=None, read_time=5, tags=None, content_html=None):
    """生成文章 HTML"""
    template = load_template()
    slug = slugify(title)
    
    # 默认日期
    if article_date is None:
        article_date = date.today().strftime('%Y-%m-%d')
    
    # OG URL
    og_url = f"https://709527.xyz/blog/posts/{slug}.html"
    
    # 标签 HTML
    if tags:
        tags_html = '\n          '.join([f'<span class="tag">{t.strip()}</span>' for t in tags.split(',')])
    else:
        tags_html = ''
    
    html = template
    html = html.replace('{{TITLE}}', f"{title} | 张小猛 - loczb")
    html = html.replace('{{DESCRIPTION}}', description)
    html = html.replace('{{OG_URL}}', og_url)
    html = html.replace('{{JSON_LD}}', '')
    html = html.replace('{{INLINE_STYLES}}', '')
    
    # 新增变量
    html = html.replace('{{ARTICLE_TITLE}}', title)
    html = html.replace('{{ARTICLE_DATE}}', article_date)
    html = html.replace('{{ARTICLE_READ_TIME}}', f"{read_time} min read")
    html = html.replace('{{ARTICLE_TAGS}}', tags_html)
    html = html.replace('{{ARTICLE_CONTENT}}', content_html or '<p>在这里写文章内容...</p>')
    
    return html, slug

def add_to_index(slug, title, tags):
    """将文章添加到 related-posts.js 索引"""
    import json
    
    with open(RELATED_JS, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已存在
    if f'{{ slug: "{slug}"' in content:
        print(f"⚠️ {slug} 已在索引中，跳过")
        return
    
    # 解析现有标签
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
    else:
        tag_list = []
    
    tags_json = json.dumps(tag_list, ensure_ascii=False)
    new_entry = f'  {{ slug: "{slug}", tags: {tags_json}, title: "{title}" }}'
    
    # 插入到 ARTICLE_INDEX 中
    content = content.replace(
        'const ARTICLE_INDEX = [',
        'const ARTICLE_INDEX = [\n' + new_entry + ','
    )
    
    with open(RELATED_JS, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ 已添加到相关文章索引")

if __name__ == '__main__':
    # 解析参数
    args = sys.argv[1:]
    if not args or '-h' in args or '--help' in args:
        print(__doc__)
        sys.exit(1)
    
    title = args[0]
    description = args[1] if len(args) > 1 else ""
    
    article_date = None
    read_time = 5
    tags = None
    content_file = None
    content_html = None
    
    i = 2
    while i < len(args):
        if args[i] == '--date' and i + 1 < len(args):
            article_date = args[i + 1]
            i += 2
        elif args[i] == '--read-time' and i + 1 < len(args):
            read_time = int(args[i + 1])
            i += 2
        elif args[i] == '--tags' and i + 1 < len(args):
            tags = args[i + 1]
            i += 2
        elif args[i] == '--content' and i + 1 < len(args):
            content_file = args[i + 1]
            i += 2
        else:
            i += 1
    
    # 读取内容文件
    if content_file:
        if os.path.exists(content_file):
            # 简单转换 markdown 到 HTML（实际应该用 pandoc）
            with open(content_file, 'r', encoding='utf-8') as f:
                md_content = f.read()
            # 非常简化的转换
            content_html = md_content
        else:
            print(f"❌ 文件不存在: {content_file}")
            sys.exit(1)
    
    html, slug = generate(title, description, article_date, read_time, tags, content_html)
    
    output_path = os.path.join(POSTS_DIR, f'{slug}.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ 已生成: {output_path}")
    
    # 添加到索引
    if tags:
        add_to_index(slug, title, tags)