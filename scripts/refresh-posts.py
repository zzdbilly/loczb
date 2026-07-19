#!/usr/bin/env python3
"""
回刷脚本：用最新模板重新渲染所有文章的骨架（head/nav/footer/scripts），
只保留每篇文章的内容数据（标题、描述、日期、标签、正文），重新套模板。

用法:
  python3 scripts/refresh-posts.py              # 回刷所有文章
  python3 scripts/refresh-posts.py --dry-run     # 只检查不写入
  python3 scripts/refresh-posts.py --post slug   # 只回刷指定文章
"""

import re
import os
import sys
import json
import glob

TEMPLATE = 'templates/blog-post-template.html'
POSTS_DIR = 'blog/posts'

def load_template():
    with open(TEMPLATE, 'r', encoding='utf-8') as f:
        return f.read()

def extract_post_data(html):
    """从现有文章 HTML 中提取所有变量数据"""
    data = {}
    
    # title: <title>xxx | 张小猛 - loczb</title>
    m = re.search(r'<title>(.*?) \| 张小猛 - loczb</title>', html)
    data['title'] = m.group(1) if m else None
    
    # description
    m = re.search(r'<meta name="description" content="(.*?)">', html)
    data['description'] = m.group(1) if m else ''
    
    # og_url
    m = re.search(r'<meta property="og:url" content="(.*?)">', html)
    data['og_url'] = m.group(1) if m else ''
    
    # JSON-LD
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    data['json_ld'] = m.group(1).strip() if m else ''
    
    # article title (h1)
    m = re.search(r'<article class="post-content">\s*<h1>(.*?)</h1>', html)
    data['article_title'] = m.group(1) if m else data.get('title', '')
    
    # date
    m = re.search(r'📅 (.*?)</span>', html)
    data['article_date'] = m.group(1).strip() if m else ''
    
    # read time
    m = re.search(r'⏱️ (.*?)</span>', html)
    data['read_time'] = m.group(1).strip() if m else '5 min read'
    
    # tags
    tags = re.findall(r'<span class="tag">(.*?)</span>', html)
    data['tags_html'] = '\n          '.join([f'<span class="tag">{t}</span>' for t in tags])
    data['tags'] = tags
    
    # content: 提取 <article class="post-content"> 内部，去掉 h1/post-meta/post-tags
    m = re.search(r'<article class="post-content">(.*?)</article>', html, re.DOTALL)
    if m:
        inner = m.group(1)
        # 去掉 h1
        inner = re.sub(r'<h1>.*?</h1>\s*', '', inner, count=1, flags=re.DOTALL)
        # 去掉 post-meta
        inner = re.sub(r'<div class="post-meta">.*?</div>\s*', '', inner, count=1, flags=re.DOTALL)
        # 去掉 post-tags
        inner = re.sub(r'<div class="post-tags">.*?</div>\s*', '', inner, count=1, flags=re.DOTALL)
        data['content'] = inner.strip()
    else:
        data['content'] = None
    
    return data

def render_with_template(template, data):
    """用模板渲染文章"""
    html = template
    html = html.replace('{{TITLE}}', f"{data['title']} | 张小猛 - loczb")
    html = html.replace('{{DESCRIPTION}}', data['description'])
    html = html.replace('{{OG_URL}}', data['og_url'])
    html = html.replace('{{JSON_LD}}', f'    <script type="application/ld+json">\n{data["json_ld"]}\n    </script>')
    html = html.replace('{{ARTICLE_TITLE}}', data['article_title'])
    html = html.replace('{{ARTICLE_DATE}}', data['article_date'])
    html = html.replace('{{ARTICLE_READ_TIME}}', data['read_time'])
    html = html.replace('{{ARTICLE_TAGS}}', data['tags_html'])
    html = html.replace('{{ARTICLE_CONTENT}}', data['content'] or '<p>文章内容...</p>')
    
    # 左侧面板统计信息
    html = html.replace('{{ARTICLE_DATE_SHORT}}', data['article_date'][:10] if len(data['article_date']) >= 10 else data['article_date'])
    
    import re as _re
    text_only = _re.sub(r'<[^>]+>', '', data['content']) if data['content'] else ''
    chinese_chars = len(_re.findall(r'[\u4e00-\u9fff]', text_only))
    words = len(_re.findall(r'[a-zA-Z]+', text_only))
    total_word_count = str(chinese_chars + words)
    
    h2_count = str(data['content'].count('<h2')) if data['content'] else '0'
    h3_count = str(data['content'].count('<h3')) if data['content'] else '0'
    code_block_count = str(data['content'].count('<pre')) if data['content'] else '0'
    
    html = html.replace('{{ARTICLE_WORD_COUNT}}', total_word_count)
    html = html.replace('{{ARTICLE_H2_COUNT}}', h2_count)
    html = html.replace('{{ARTICLE_H3_COUNT}}', h3_count)
    html = html.replace('{{ARTICLE_CODE_BLOCKS}}', code_block_count)
    
    # 标签链接
    tag_links = []
    for t in data.get('tags', []):
        safe_t = _re.sub(r'[^\w\u4e00-\u9fff]', '', t)
        tag_links.append(f'<a href="../../blog/index.html?tag={safe_t}" class="post-info-link"># {t}</a>')
    html = html.replace('{{ARTICLE_TAG_LINKS}}', '\n          '.join(tag_links))
    
    return html

def refresh_post(filepath, template, dry_run=False):
    """回刷单篇文章"""
    filename = os.path.basename(filepath)
    slug = filename[:-5]  # 去掉 .html
    
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()
    
    data = extract_post_data(original)
    
    # 验证提取的数据
    missing = []
    if not data['title']:
        missing.append('title')
    if not data['description']:
        missing.append('description')
    if not data['og_url']:
        missing.append('og_url')
    if not data['json_ld']:
        missing.append('json_ld')
    if not data['article_date']:
        missing.append('article_date')
    if not data['content']:
        missing.append('content')
    
    if missing:
        print(f"  ❌ {slug}: 缺少 {', '.join(missing)}")
        return False
    
    # 用模板重新渲染
    new_html = render_with_template(template, data)
    
    # 检查是否有变化
    if new_html == original:
        print(f"  - {slug}: 无变化")
        return True
    
    # 验证渲染结果
    h1_count = new_html.count('<h1>')
    if h1_count != 1:
        print(f"  ⚠️ {slug}: h1 数量={h1_count}，跳过")
        return False
    
    if not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_html)
    
    # 计算变化
    size_diff = len(new_html) - len(original)
    sign = '+' if size_diff >= 0 else ''
    print(f"  ✅ {slug}: 已回刷 ({sign}{size_diff} bytes)")
    return True

def main():
    dry_run = '--dry-run' in sys.argv
    post_filter = None
    if '--post' in sys.argv:
        idx = sys.argv.index('--post')
        if idx + 1 < len(sys.argv):
            post_filter = sys.argv[idx + 1]
    
    print(f"🔄 回刷文章 (dry_run={dry_run})")
    print(f"   模板: {TEMPLATE}")
    print()
    
    template = load_template()
    
    # 收集所有文章
    posts = sorted(glob.glob(f'{POSTS_DIR}/*.html'))
    if post_filter:
        posts = [p for p in posts if post_filter in p]
    
    print(f"   共 {len(posts)} 篇文章")
    print()
    
    success = 0
    skipped = 0
    failed = 0
    changed = 0
    
    for post in posts:
        result = refresh_post(post, template, dry_run)
        if result:
            success += 1
            # 检查是否真的有变化
            if not dry_run:
                # 已经写入了，比较困难，假设都变了
                changed += 1
        else:
            failed += 1
    
    print()
    print(f"📊 结果: {success} 成功, {failed} 失败, 共 {len(posts)} 篇")
    if dry_run:
        print("   (dry-run 模式，未实际写入)")

if __name__ == '__main__':
    main()
