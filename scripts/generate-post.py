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
import subprocess
from datetime import datetime
from xml.sax.saxutils import escape as xml_escape

TEMPLATE = 'templates/blog-post-template.html'
POSTS_DIR = 'blog/posts'
RELATED_JS = 'assets/js/related-posts.js'
BLOG_INDEX = 'blog/index.html'
HOME_INDEX = 'index.html'
ARTICLES_JSON = 'blog/articles-index.json'
SITEMAP = 'sitemap.xml'
RSS_XML = 'rss.xml'


def slugify(title):
    """将标题转为文件 slug，保留中文"""
    slug = title.lower()
    # 保留中文、字母、数字、空格、连字符
    slug = re.sub(r'[^\w\u4e00-\u9fff\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = slug.strip('-')
    return slug


def load_template():
    with open(TEMPLATE, 'r', encoding='utf-8') as f:
        return f.read()


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
    
    # 生成 JSON-LD 结构化数据（使用 json.dumps 确保正确转义）
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
        "datePublished": f"{article_date}T00:00:00+08:00",
        "dateModified": f"{article_date}T00:00:00+08:00",
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
    
    html = template
    html = html.replace('{{TITLE}}', f"{title} | 张小猛 - loczb")
    html = html.replace('{{DESCRIPTION}}', description)
    html = html.replace('{{OG_URL}}', og_url)
    html = html.replace('{{JSON_LD}}', json_ld)
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
    
    # 转义标题中的双引号
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


def update_blog_list(slug, title, description, article_date, read_time, tags, category):
    """更新 blog/index.html 列表"""
    # 检查文章是否已存在
    with open(BLOG_INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if f'href="posts/{slug}.html"' in content:
        print(f"  ⚠️ 已在博客列表中，跳过")
        return False
    
    tag_list = [t.strip() for t in tags.split(',')]
    first_tag = tag_list[0] if tag_list else "博客"
    
    # 新建文章项
    new_post = f'''
        <article class="blog-list-item animate-on-scroll" data-category="{category}" data-page="1">
          <div class="blog-list-header">
            <div class="blog-list-meta">
              <span class="blog-date">{article_date[:10]}</span>
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
              <span class="blog-date">{article_date[:10]}</span>
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
    
    # 2. 从博客列表页读取最新文章，填充首页列表
    # 首页展示：大卡(第1新) + 列表(第2、3新)
    with open(BLOG_INDEX, 'r', encoding='utf-8') as f:
        blog_content = f.read()
    
    # 提取博客列表中的前N篇文章
    article_pattern = r'<article class="blog-list-item[^>]*>(.*?)</article>'
    articles = list(re.finditer(article_pattern, blog_content, re.DOTALL))
    
    # 取第2-3篇（索引1和2）填入首页列表
    list_articles = articles[1:3] if len(articles) >= 3 else articles[1:]
    
    with open(HOME_INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 更新大卡
    featured_match = re.search(
        r'<article class="blog-card-featured animate-on-scroll" id="home-featured-post".*?</article>',
        content,
        re.DOTALL
    )
    if featured_match:
        old_featured = featured_match.group(0)
        content = content.replace(old_featured, featured)
        
        # 替换首页的最新文章列表区域
        # 匹配 <!-- 最新文章列表 --> 到 <!-- /最新文章列表 --> 之间的内容
        list_match = re.search(
            r'(<!-- 最新文章列表 -->[\s\S]*?<div class="blog-list">)(.*?)(</div>\s*<!-- /最新文章列表 -->)',
            content,
            re.DOTALL
        )
        
        if list_match and list_articles:
            # 构建新的列表内容
            new_list = list_match.group(1)
            for article in list_articles:
                new_list += '\n' + article.group(0)
            new_list += '\n        ' + list_match.group(3)
            
            # 替换
            old_list = list_match.group(0)
            content = content.replace(old_list, new_list)
        else:
            # 回退方案：直接替换 blog-list div 内容
            if list_articles:
                list_div_match = re.search(
                    r'(<div class="blog-list">)(.*?)(</div>)',
                    content,
                    re.DOTALL
                )
                if list_div_match:
                    new_content = list_div_match.group(1)
                    for article in list_articles:
                        new_content += '\n' + article.group(0)
                    new_content += '\n        ' + list_div_match.group(3)
                    content = content.replace(list_div_match.group(0), new_content)
                    print(f"  ⚠️ 使用回退方案更新列表")
        
        with open(HOME_INDEX, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"  ✅ 已更新首页")
    else:
        print(f"  ⚠️ 首页大卡未找到，请检查 index.html 结构")


def update_articles_index(slug, title, description, article_date, read_time, tags, category):
    """调用 generate-index.js 重建完整的 articles-index.json（包括 series/tagCloud/archives）"""
    try:
        result = subprocess.run(
            ['node', 'scripts/generate-index.js'],
            capture_output=True, text=True, cwd=os.getcwd()
        )
        if result.returncode == 0:
            print(f"  ✅ 已重建 articles-index.json (via generate-index.js)")
        else:
            print(f"  ⚠️ generate-index.js 失败: {result.stderr}")
    except Exception as e:
        print(f"  ⚠️ 调用 generate-index.js 失败: {e}")


def update_filter_buttons():
    """更新 blog/index.html 的分类筛选按钮 - 从 articles-index.json 读取分类"""
    if not os.path.exists(ARTICLES_JSON):
        return
    
    with open(ARTICLES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    categories = data.get('categories', [])
    if not categories:
        return
    
    # 按固定顺序排列分类（优先显示的排前面）
    priority_order = ['AI', 'Android', 'Kotlin', '前端', '思考', 'DevOps', '数据库', '系统编程', '安全', '开发']
    sorted_cats = sorted(categories, key=lambda x: (priority_order.index(x) if x in priority_order else 999, x))
    
    with open(BLOG_INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 构建新的筛选按钮 HTML
    buttons_html = '''
        <button class="filter-btn filter-btn-active" data-filter="all" role="tab" aria-selected="true">全部</button>'''
    
    for cat in sorted_cats:
        buttons_html += f'''
        <button class="filter-btn" data-filter="{cat}" role="tab" aria-selected="false">{cat}</button>'''
    
    # 替换旧的筛选按钮区域
    import re
    pattern = r'(<div class="blog-filters"[^>]*>)[\s\S]*?(</div>\s*<!-- Search Bar -->)'
    # 检查是否匹配到
    match = re.search(pattern, content)
    if not match:
        print(f"  ⚠️ 分类筛选按钮区域未找到")
        return
    
    def replace_buttons(m):
        return m.group(1) + buttons_html + '\n      ' + m.group(2)
    
    new_content = re.sub(pattern, replace_buttons, content)
    
    if new_content != content:
        with open(BLOG_INDEX, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  ✅ 已更新分类筛选按钮 ({len(sorted_cats)} 个分类)")
    else:
        print(f"  ✅ 分类筛选按钮已是最新 ({len(sorted_cats)} 个分类)")


def parse_args(args):
    """解析命令行参数"""
    params = {
        'title': None,
        'description': '',
        'article_date': datetime.now().strftime('%Y-%m-%d'),
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
                    # content 映射到 content_file
                    if key == 'content':
                        mapped_key = 'content_file'
                    else:
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
                content_raw = f.read()
            # 如果是 markdown 文件，转换为 HTML
            if params['content_file'].endswith('.md'):
                import markdown as md_lib
                content_html = md_lib.markdown(content_raw, extensions=['fenced_code', 'codehilite', 'tables', 'sane_lists'])
                # 移除 markdown 第一个 h1（模板已有 <h1>{{ARTICLE_TITLE}}</h1>）
                import re as _re
                content_html = _re.sub(r'^<h1>.*?</h1>\s*', '', content_html, count=1)
                print(f"  📖 从 markdown 文件读取并转换 ({len(content_raw)} chars -> {len(content_html)} chars)")
            else:
                content_html = content_raw
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
    
    print(f"\n💡 提示: 索引/列表/首页/sitemap/RSS 由 CI 自动更新，请 push 后等待 Pages 部署")

    # ═══════════════════════════════════════════════
    # 以下索引更新已迁移至 CI workflow
    # 本地不再自动更新 index.html / blog/index.html /
    # sitemap.xml / rss.xml / articles-index.json
    # ═══════════════════════════════════════════════


def update_sitemap():
    """从 articles-index.json 重新生成 sitemap.xml"""
    if not os.path.exists(ARTICLES_JSON):
        print("  ⚠️ articles-index.json 不存在，跳过 sitemap 更新")
        return
    
    with open(ARTICLES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    BASE_URL = 'https://709527.xyz'
    
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    # 固定页面
    static_pages = [
        (f'{BASE_URL}/', 'weekly', '1.0'),
        (f'{BASE_URL}/blog/', 'daily', '0.9'),
        (f'{BASE_URL}/projects/', 'monthly', '0.8'),
        (f'{BASE_URL}/about/', 'monthly', '0.7'),
    ]
    for url, freq, priority in static_pages:
        lines.append(f'  <url>')
        lines.append(f'    <loc>{url}</loc>')
        lines.append(f'    <changefreq>{freq}</changefreq>')
        lines.append(f'    <priority>{priority}</priority>')
        lines.append(f'  </url>')
    
    # 博客文章
    for post in data.get('posts', []):
        slug = post.get('slug', '')
        date = post.get('date', '')
        if not slug:
            continue
        lines.append(f'  <url>')
        lines.append(f'    <loc>{BASE_URL}/blog/posts/{slug}.html</loc>')
        if date:
            lines.append(f'    <lastmod>{date}</lastmod>')
        lines.append(f'    <changefreq>monthly</changefreq>')
        lines.append(f'    <priority>0.6</priority>')
        lines.append(f'  </url>')
    
    lines.append('</urlset>')
    
    with open(SITEMAP, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    
    post_count = len(data.get('posts', []))
    print(f"  ✅ 已更新 sitemap.xml ({post_count} 篇文章)")


def update_rss():
    """从 articles-index.json 重新生成 rss.xml"""
    if not os.path.exists(ARTICLES_JSON):
        print("  ⚠️ articles-index.json 不存在，跳过 RSS 更新")
        return
    
    with open(ARTICLES_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    BASE_URL = 'https://709527.xyz'
    posts = data.get('posts', [])[:20]  # RSS 取最新 20 篇
    
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">')
    lines.append('  <channel>')
    lines.append(f'    <title>张小猛 - loczb 技术博客</title>')
    lines.append(f'    <link>{BASE_URL}/blog/</link>')
    lines.append(f'    <description>张小猛的技术博客 - Android、Kotlin、AI、全栈开发</description>')
    lines.append(f'    <language>zh-CN</language>')
    lines.append(f'    <atom:link href="{BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>')
    
    for post in posts:
        slug = post.get('slug', '')
        title = post.get('title', '')
        date = post.get('date', '')
        desc = post.get('excerpt', '')
        category = post.get('category', '')
        
        # RSS 日期格式: RFC 822
        try:
            dt = datetime.strptime(date, '%Y-%m-%d')
            rss_date = dt.strftime('%a, %d %b %Y 00:00:00 +0800')
        except:
            rss_date = date
        
        lines.append('    <item>')
        lines.append(f'      <title>{xml_escape(title)}</title>')
        lines.append(f'      <link>{BASE_URL}/blog/posts/{slug}.html</link>')
        lines.append(f'      <guid isPermaLink="true">{BASE_URL}/blog/posts/{slug}.html</guid>')
        lines.append(f'      <description>{xml_escape(desc)}</description>')
        lines.append(f'      <category>{xml_escape(category)}</category>')
        lines.append(f'      <pubDate>{rss_date}</pubDate>')
        lines.append('    </item>')
    
    lines.append('  </channel>')
    lines.append('</rss>')
    
    with open(RSS_XML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    
    print(f"  ✅ 已更新 rss.xml ({len(posts)} 篇文章)")

def update_homepage_js_array():
    """更新首页的 JavaScript posts 数组，使用博客列表的最新文章"""
    import re
    
    # 从博客列表读取最新文章
    with open(BLOG_INDEX, 'r', encoding='utf-8') as f:
        blog_html = f.read()
    
    # 提取前10篇文章
    article_pattern = r'<article class="blog-list-item[^>]*>(.*?)</article>'
    articles = list(re.finditer(article_pattern, blog_html, re.DOTALL))[:10]
    
    posts_js = "[\n"
    for a in articles:
        html = a.group(0)
        url_match = re.search(r'href="([^"]+\.html)"', html)
        url = url_match.group(1) if url_match else ""
        title_match = re.search(r'blog-list-title">[^<]*<a[^>]*>([^<]+)</a>', html)
        title = title_match.group(1) if title_match else ""
        date_match = re.search(r'blog-date">([^<]+)', html)
        date = date_match.group(1) if date_match else ""
        read_time_match = re.search(r'(\d+)\s*min', html)
        read_time = read_time_match.group(1) if read_time_match else "5"
        cat1_match = re.search(r'blog-list-tag">([^<]+)', html)
        cat1 = cat1_match.group(1) if cat1_match else ""
        # 博客列表中没有 individual tags，只有 category
        # category2 使用与 category 相同的值（前端会处理显示）
        cat2 = cat1
        desc_match = re.search(r'blog-list-excerpt">([^<]+)', html)
        desc = desc_match.group(1) if desc_match else ""
        
        # 确保 URL 有 blog/ 前缀
        if url and not url.startswith('blog/'):
            url = 'blog/' + url
        
        # 转义单引号
        safe_title = title.replace("\\", "\\\\").replace("'", "\\'")
        safe_desc = desc.replace("\\", "\\\\").replace("'", "\\'")
        safe_url = url.replace("'", "\\'")
        safe_cat1 = cat1.replace("'", "\\'")
        safe_cat2 = cat2.replace("'", "\\'")
        safe_date = date.replace("'", "\\'")
        safe_read_time = read_time.replace("'", "\\'")
        
        posts_js += f'''      {{
        url: '{safe_url}',
        title: '{safe_title}',
        date: '{safe_date}',
        readTime: '{safe_read_time} min',
        category: '{safe_cat1}',
        category2: '{safe_cat2}',
        desc: '{safe_desc}'
      }},
'''
    
    posts_js += "    ];"
    
    # 读取首页
    with open(HOME_INDEX, 'r', encoding='utf-8') as f:
        home_html = f.read()
    
    # 替换 posts 数组
    old_pattern = r'const posts = \[[\s\S]*?\];'
    new_html = re.sub(old_pattern, 'const posts = ' + posts_js, home_html)
    
    # 写入首页
    with open(HOME_INDEX, 'w', encoding='utf-8') as f:
        f.write(new_html)
    
    print(f"  ✅ 已更新首页 JS posts 数组 ({len(articles)} 篇文章)")



if __name__ == '__main__':
    main()
