#!/usr/bin/env python3
"""
博客文章生成脚本
使用模板 templates/blog-post-template.html 生成统一的文章页面

用法:
  python3 scripts/generate-post.py <文章标题> <文章描述> [og-url]

生成的文件: blog/posts/<slug>.html
"""

import re
import os
import sys

TEMPLATE = 'templates/blog-post-template.html'
POSTS_DIR = 'blog/posts'

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

def generate(title, description, og_url=None, json_ld=None, inline_styles=None, content_html=None):
    """生成文章 HTML"""
    template = load_template()
    slug = slugify(title)
    og_url = og_url or f"https://709527.xyz/blog/posts/{slug}.html"
    
    html = template
    html = html.replace('{{TITLE}}', title)
    html = html.replace('{{DESCRIPTION}}', description)
    html = html.replace('{{OG_URL}}', og_url)
    html = html.replace('{{JSON_LD}}', json_ld or '')
    html = html.replace('{{INLINE_STYLES}}', inline_styles or '')
    html = html.replace('{{ARTICLE_CONTENT}}', content_html or '')
    
    return html

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("用法: python3 scripts/generate-post.py <标题> <描述>")
        sys.exit(1)
    
    title = sys.argv[1]
    description = sys.argv[2]
    og_url = sys.argv[3] if len(sys.argv) > 3 else None
    
    html = generate(title, description, og_url)
    slug = slugify(title)
    output_path = os.path.join(POSTS_DIR, f'{slug}.html')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ 已生成: {output_path}")
