#!/usr/bin/env python3
"""
博客文章生成脚本 v2
使用模板 templates/blog-post-template.html 生成统一文章，自动更新博客列表和首页

用法:
  python3 scripts/generate-post.py "标题" "描述" [选项]

必需参数:
  --tags "标签1,标签2"    文章标签（逗号分隔）
  --category 分类         Android | Kotlin | AI | 前端 | DevOps | 安全 | 数据库 | 系统编程 | 开发

可选参数:
  --date YYYY-MM-DD     发布日期 (默认: 今日)
  --read-time N         阅读时间分钟数 (默认: 5)
  --content FILE        从 markdown 文件读取内容
  --text "内容正文"      直接在命令行输入内容（支持 <h2>、<p>、<ul> 等 HTML）

示例:
  python3 scripts/generate-post.py "KSP 使用指南" "KSP 入门教程" \\
    --tags "Kotlin,KSP,Android" --category Kotlin --read-time 10 \\
    --text "<p>KSP 是...</p><h2>为什么</h2><p>...</p>"

  python3 scripts/generate-post.py "文章标题" "描述" \\
    --tags "标签" --category Android --content article.md
"""

import re
import os
import sys
import json
from datetime import date

TEMPLATE = 'templates/blog-post-template.html'
INLINE_STYLES = 'templates/inline-styles.css'
POSTS_DIR = 'blog/posts'
RELATED_JS = 'assets/js/related-posts.js'
BLOG_INDEX = 'blog/index.html'
HOME_INDEX = 'index.html'


def slugify(title):
    """将标题转为文件 slug"""
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = slug.strip('-')
    return slug


def load_template():
    with open(TEMPLATE, 'r', encoding='utf-8') as f:
        return f.read()

def load_default_styles():
    if os.path.exists(INLINE_STYLES):
        with open(INLINE_STYLES, 'r', encoding='utf-8') as f:
            return f.read()
    return ''


def generate_article(title, description, article_date, read_time, tags, content_html, category):
    """生成文章 HTML"""
    template = load_template()
    slug = slugify(title)
    
    og_url = f"https://709527.xyz/blog/posts/{slug}.html"
    
    # 标签 HTML 
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
        tags_html = '\n          '.join([f'<span class="tag">{t}</span>' for t in tag_list])
    else:
        tag_list = []
        tags_html = ''
    
    html = template
    html = html.replace('{{TITLE}}', f"{title} | 张小猛 - loczb")
    html = html.replace('{{DESCRIPTION}}', description)
    html = html.replace('{{OG_URL}}', og_url)
    html = html.replace('{{JSON_LD}}', '')
    html = html.replace('{{INLINE_STYLES}}', load_default_styles())
    html = html.replace('{{ARTICLE_TITLE}}', title)
    html = html.replace('{{ARTICLE_DATE}}', article_date)
    html = html.replace('{{ARTICLE_READ_TIME}}', f"{read_time} min read")
    html = html.replace('{{ARTICLE_TAGS}}', tags_html)
    html = html.replace('{{ARTICLE_CONTENT}}', content_html or '<p>文章内容...</p>')
    
    return html, slug, tag_list


def add_to_index(slug, title, tag_list):
    """添加文章到 related-posts.js 索引"""
    with open(RELATED_JS, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if f'{{ slug: "{slug}"' in content:
        print(f"  ⚠️ 已在索引中，跳过")
        return False
    
    tags_json = json.dumps(tag_list, ensure_ascii=False)
    new_entry = f'  {{ slug: "{slug}", tags: {tags_json}, title: "{title}" }}'
    
    content = content.replace(
        'const ARTICLE_INDEX = [',
        'const ARTICLE_INDEX = [\n' + new_entry + ','
    )
    
    with open(RELATED_JS, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✅ 已添加到相关文章索引")
    return True


def update_blog_list(slug, title, description, article_date, read_time, tags, category):
    """更新 blog/index.html 列表"""
    tag_list = [t.strip() for t in tags.split(',')]
    first_tag = tag_list[0] if tag_list else "博客"
    
    # 新建文章项
    new_post = f'''
        <article class="blog-list-item animate-on-scroll" data-category="{category}" data-page="1">
          <div class="blog-list-header">
            <div class="blog-list-meta">
              <span class="blog-date">{article_date}</span>
              <span>·</span>
              <span class="blog-read-time">{read_time} min</span>
            </div>
            <span class="blog-list-tag">{category}</span>
          </div>
          <h3 class="blog-list-title">
            <a href="posts/{slug}.html">{title}</a>
          </h3>
          <p class="blog-list-excerpt">{description}</p>
        </article>
'''
    
    with open(BLOG_INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 在 <!-- Post List --> 后面插入
    content = content.replace(
        '<!-- Post List -->',
        '<!-- Post List -->' + new_post
    )
    
    with open(BLOG_INDEX, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"  ✅ 已添加到博客列表")


def update_homepage(slug, title, description, article_date, read_time, tags, category):
    """更新首页 index.html - 大卡和最新文章列表"""
    tag_list = [t.strip() for t in tags.split(',')]
    tags_html = ''.join([f'<span class="tech-tag">{t}</span>' for t in tag_list])
    
    # 1. 更新大卡
    featured = f'''        <article class="blog-card-featured animate-on-scroll" id="home-featured-post" style="display: block;">
          <div class="blog-card-header">
            <div class="blog-card-meta">
              <span class="blog-date">{article_date}</span>
              <span>·</span>
              <span class="blog-read-time">{read_time} min</span>
            </div>
            <span class="blog-list-tag">{category}</span>
          </div>
          <h3 class="blog-card-title">
            <a href="blog/posts/{slug}.html">{title}</a>
          </h3>
          <p class="blog-card-excerpt">{description}...</p>
          <div class="blog-card-tags">
            {tags_html}
          </div>
        </article>'''
    
    # 2. 最新列表��（第2、3篇保留原来的，将原第1篇移为第2篇）
    list_item = f'''          <article class="blog-list-item animate-on-scroll">
            <div class="blog-list-meta">
              <span class="blog-date">{article_date}</span>
              <span>·</span>
              <span class="blog-read-time">{read_time} min</span>
            </div>
            <h4 class="blog-list-title">
              <a href="blog/posts/{slug}.html">{title}</a>
            </h4>
            <div class="blog-list-tags">
              {tags_html}
            </div>
          </article>'''
    
    with open(HOME_INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找大卡替换：id="home-featured-post" 的 article
    featured_match = re.search(
        r'<article class="blog-card-featured animate-on-scroll" id="home-featured-post".*?</article>',
        content,
        re.DOTALL
    )
    if featured_match:
        # 把大卡内容替换成新文章
        old_featured = featured_match.group(0)
        content = content.replace(old_featured, featured)
        
        # 在最新文章列表顶部插入新文章的列表项
        # 找到第一个 blog-list-item
        list_match = re.search(
            r'(<article class="blog-list-item animate-on-scroll">)',
            content
        )
        if list_match:
            # 插入在第一个列表项之前（新文章会占据第一个位置）
            # 但需要保持总共3篇最新文章：新文章 + 原来第1、2篇
            # 删除最后1个列表项（原来第3篇），在前面插入新文章
            # 找到所有列表项
            all_items = list(re.finditer(
                r'<article class="blog-list-item animate-on-scroll">.*?</article>',
                content,
                re.DOTALL
            ))
            if len(all_items) >= 2:
                # 删除最后一项（第3篇）
                last_item = all_items[-1]
                content_before = content[:last_item.start()]
                content_after = content[last_item.end():]
                # 在第一个列表项（原第1篇）前插入新文章
                first_item = all_items[0]
                content = (content_before[:first_item.start()] + 
                          list_item + '\n' +
                          content_before[first_item.start():] + 
                          content_after)
        
        with open(HOME_INDEX, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✅ 已更新首页")
    else:
        print(f"  ⚠️ 首页大卡未找到，请检查 index.html 结构")


def parse_args(args):
    """解析命令行参数"""
    params = {
        'title': None,
        'description': '',
        'article_date': date.today().strftime('%Y-%m-%d'),
        'read_time': 5,
        'tags': None,
        'category': '博客',
        'content_file': None,
        'text': None,
    }
    
    i = 0
    while i < len(args):
        if args[i].startswith('--'):
            key = args[i][2:]
            if key in ('date', 'read-time', 'tags', 'category', 'content', 'text'):
                i += 1
                if i < len(args):
                    mapped_key = key.replace('-', '_')
                    params[mapped_key] = args[i]
            else:
                print(f"❌ 未知参数: --{key}")
                sys.exit(1)
        else:
            if params['title'] is None:
                params['title'] = args[i]
            elif params['description'] == '':
                params['description'] = args[i]
            else:
                print(f"❌ 多余参数: {args[i]}")
                sys.exit(1)
        i += 1
    
    return params


def main():
    if len(sys.argv) < 3 or '-h' in sys.argv or '--help' in sys.argv:
        print(__doc__)
        sys.exit(0 if '-h' in sys.argv or '--help' in sys.argv else 1)
    
    params = parse_args(sys.argv[1:])
    
    if not params['title']:
        print("❌ 缺少标题")
        sys.exit(1)
    if not params['tags']:
        print("❌ 缺少 --tags 参数")
        sys.exit(1)
    if not params['category']:
        print("❌ 缺少 --category 参数")
        sys.exit(1)
    
    # 获取内容
    content_html = None
    if params['content_file']:
        if os.path.exists(params['content_file']):
            with open(params['content_file'], 'r', encoding='utf-8') as f:
                content_html = f.read()
            print(f"  📖 从文件读取内容 ({len(content_html)} chars)")
        else:
            print(f"❌ 文件不存在: {params['content_file']}")
            sys.exit(1)
    elif params['text']:
        content_html = params['text']
        print(f"  📖 从命令行读取内容 ({len(content_html)} chars)")
    
    # 生成文章
    title = params['title']
    description = params['description']
    article_date = params['article_date']
    read_time = params['read_time']
    tags = params['tags']
    category = params['category']
    
    print(f"\n📝 生成文章: {title}")
    print(f"   日期: {article_date} | 阅读: {read_time} min | 分类: {category}")
    print(f"   标签: {tags}")
    
    html, slug, tag_list = generate_article(
        title, description, article_date, read_time, tags, content_html, category
    )
    
    # 写入文件
    output_path = os.path.join(POSTS_DIR, f'{slug}.html')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"\n✅ 文章已生成: {output_path}")
    
    # 更新相关文章索引
    add_to_index(slug, title, tag_list)
    
    # 更新博客列表页
    update_blog_list(slug, title, description, article_date, read_time, tags, category)
    
    # 更新首页
    update_homepage(slug, title, description, article_date, read_time, tags, category)
    
    print(f"\n🎉 全部完成！访问: https://709527.xyz/blog/posts/{slug}.html")


if __name__ == '__main__':
    main()
