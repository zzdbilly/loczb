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
        # 左侧面板的标签链接
        tag_links_html = '\n          '.join([f'<a href="../../blog/index.html?tag={t}" class="post-info-link"># {t}</a>' for t in tag_list])
    else:
        tag_list = []
        tags_html = ''
        tag_links_html = ''
    
    # 计算文章统计
    # 字数（去掉 HTML 标签后的中文 + 英文单词数）
    import re as re_count
    text_only = re_count.sub(r'<[^>]+>', '', content_html) if content_html else ''
    # 中文字数 + 英文单词数 ≈ 字数
    chinese_chars = len(re_count.findall(r'[\u4e00-\u9fff]', text_only))
    words = len(re_count.findall(r'[a-zA-Z]+', text_only))
    total_word_count = chinese_chars + words
    
    # h2/h3 数量
    h2_count = content_html.count('<h2') if content_html else 0
    h3_count = content_html.count('<h3') if content_html else 0
    
    # 代码块数量
    code_block_count = content_html.count('<pre') if content_html else 0
    
    # 短日期（用于左侧面板）
    date_short = article_date[:10] if len(article_date) >= 10 else article_date
    
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
    
    # 左侧面板统计信息
    html = html.replace('{{ARTICLE_DATE_SHORT}}', date_short)
    html = html.replace('{{ARTICLE_WORD_COUNT}}', str(total_word_count))
    html = html.replace('{{ARTICLE_H2_COUNT}}', str(h2_count))
    html = html.replace('{{ARTICLE_H3_COUNT}}', str(h3_count))
    html = html.replace('{{ARTICLE_CODE_BLOCKS}}', str(code_block_count))
    html = html.replace('{{ARTICLE_TAG_LINKS}}', tag_links_html)
    html = html.replace('{{POST_SLUG}}', slug)
    
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





def parse_args(args):
    """解析命令行参数"""
    params = {
        'title': None,
        'description': '',
        'article_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
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
                content_html = md_lib.markdown(content_raw, extensions=['fenced_code', 'tables', 'sane_lists'])
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
    
    # 调用 generate-index.js 重建所有索引
    import subprocess as sp
    result = sp.run(['node', 'scripts/generate-index.js'], capture_output=True, text=True, cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    if result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            print(f"  {line}")
        print(f"  ✅ generate-index.js 重建完成")
    else:
        print(f"  ⚠️ generate-index.js 失败: {result.stderr}")
    
    print(f"")
    print(f"🎉 文章已发布！所有索引已更新，直接 git push 即可")


if __name__ == '__main__':
    main()
