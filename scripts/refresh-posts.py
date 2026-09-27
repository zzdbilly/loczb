#!/usr/bin/env python3
"""
回刷脚本：用最新模板重新渲染所有文章的骨架（head/nav/footer/scripts），
只保留每篇文章的内容数据（标题、描述、日期、标签、正文），重新套模板。

注意：元数据（标题、描述、日期、标签）从 HTML 正则提取。
虽然 articles-index.json 包含部分元数据，但正文内容只存在于 HTML 中，
因此仍需从 HTML 解析。如需增强可考虑在文章 HTML 中嵌入 JSON-LD metadata block。

用法:
  python3 scripts/refresh-posts.py              # 回刷所有文章
  python3 scripts/refresh-posts.py --dry-run     # 只检查不写入
  python3 scripts/refresh-posts.py --post slug   # 只回刷指定文章

注意（2026-09-27 起）：回刷会清空每篇文章的静态「相关文章」块，脚本末尾会自动补跑
generate-index.js（重新内联相关文章 + 重建列表/分页/sitemap/rss/sw）与 verify.js 门禁，
两者失败都会以非 0 退出。--dry-run 只检查，不补跑。
"""

import html as html_lib
import re
import os
import sys
import json
import glob
import subprocess

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
    
    # description（先反转义实体，与 generate-post.py 的写入口径配对：
    # 渲染时会用 html_lib.escape(quote=True) 重新转义，round-trip 逐字节稳定）
    m = re.search(r'<meta name="description" content="(.*?)">', html)
    data['description'] = html_lib.unescape(m.group(1)) if m else ''
    
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

    # 文章字数：沿用页面上已有的值，不重算。
    # refresh 只重渲染骨架、不改正文，重算会因「正文里的实体/转义」与 generate-post.py
    # 的计数口径产生差异（正文被 &lt; 转义过的文章会多算 lt/div/gt 这些「单词」），
    # 于是每次回刷都刷出 23 篇文章的数字变化（2026-09-27 修复）。取不到才回退到重算。
    m = re.search(r'文章字数</span><span class="post-info-stat-value">(\d+)', html)
    data['word_count'] = m.group(1) if m else None

    # 专栏 banner（generate-post.py --series 生成时是单行 HTML；存量文章基本没有）
    m = re.search(r'^.*<div class="series-banner.*$', html, re.MULTILINE)
    data['series_banner'] = m.group(0).strip() if m else ''
    
    # tags
    tags = re.findall(r'<span class="tag">(.*?)</span>', html)
    data['tags_html'] = '\n          '.join([f'<span class="tag">{t}</span>' for t in tags])
    data['tags'] = tags
    
    # content: 提取 <article class="post-content"> 内部，去掉 h1/post-meta/post-tags
    # 以及构建期注入的片段（专栏卡/相关文章），并在版权卡前截断 ——
    # 模板自带版权卡与相关文章标记，若不清干净，回刷会把它们复制一份
    # （2026-09-16 修复：旧版会把版权卡叠加成两份、并让 {{SERIES_BANNER}} 字面量漏到页面上）。
    m = re.search(r'<article class="post-content">(.*?)</article>', html, re.DOTALL)
    if m:
        inner = m.group(1)
        # 截断模板自带尾部（版权卡由模板渲染）
        inner = re.split(r'[ \t]*<!-- Post Copyright & License Card -->', inner)[0]
        # 去掉 h1
        inner = re.sub(r'<h1>.*?</h1>\s*', '', inner, count=1, flags=re.DOTALL)
        # 去掉 post-meta
        inner = re.sub(r'<div class="post-meta">.*?</div>\s*', '', inner, count=1, flags=re.DOTALL)
        # 去掉 post-tags
        inner = re.sub(r'<div class="post-tags">.*?</div>\s*', '', inner, count=1, flags=re.DOTALL)
        # 去掉构建期注入：专栏卡 / 专栏 banner / 静态相关文章 / 未替换占位符
        inner = re.sub(r'\s*<!-- Series Card Widget -->[\s\S]*?<!-- /Series Card Widget -->\s*', '', inner)
        inner = re.sub(r'\s*<div class="series-banner[\s\S]*?</div></div>\s*', '', inner)
        inner = re.sub(r'\s*<!-- Related Static -->[\s\S]*?<!-- /Related Static -->\s*', '', inner)
        inner = re.sub(r'[ \t]*\{\{SERIES_BANNER\}\}[ \t]*\n?', '', inner)
        data['content'] = inner.strip()
    else:
        data['content'] = None
    
    return data

def render_with_template(template, data, slug=''):
    """用模板渲染文章"""
    html = template
    html = html.replace('{{TITLE}}', f"{data['title']} | 张小猛 - loczb")
    # description 进的是 HTML 属性（meta description / og:description / twitter:description），
    # 必须转义：历史文章（how-engineers-report）摘要里带裸双引号，未转义时属性在第一个引号处
    # 闭合，线上三个 description 全被解析成「写给」（2026-09-27 修复）。
    html = html.replace('{{DESCRIPTION}}', html_lib.escape(data['description'], quote=True))
    html = html.replace('{{OG_URL}}', data['og_url'])
    html = html.replace('{{JSON_LD}}', f'    <script type="application/ld+json">\n{data["json_ld"]}\n    </script>')
    html = html.replace('{{ARTICLE_TITLE}}', data['article_title'])
    html = html.replace('{{ARTICLE_DATE}}', data['article_date'])
    html = html.replace('{{ARTICLE_READ_TIME}}', data['read_time'])
    html = html.replace('{{ARTICLE_TAGS}}', data['tags_html'])
    html = html.replace('{{SERIES_BANNER}}', data.get('series_banner', ''))
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
    
    html = html.replace('{{ARTICLE_WORD_COUNT}}', data.get('word_count') or total_word_count)
    html = html.replace('{{ARTICLE_H2_COUNT}}', h2_count)
    html = html.replace('{{ARTICLE_H3_COUNT}}', h3_count)
    html = html.replace('{{ARTICLE_CODE_BLOCKS}}', code_block_count)
    
    # 标签链接
    tag_links = []
    for t in data.get('tags', []):
        safe_t = _re.sub(r'[^\w\u4e00-\u9fff]', '', t)
        tag_links.append(f'<a href="../../blog/index.html?tag={safe_t}" class="post-info-link"># {t}</a>')
    html = html.replace('{{ARTICLE_TAG_LINKS}}', '\n          '.join(tag_links))
    html = html.replace('{{POST_SLUG}}', slug)
    
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
        return 'fail'
    
    # 用模板重新渲染
    new_html = render_with_template(template, data, slug)

    # 占位符残留检查：模板加了新占位符但这里没替换时，字面量会直接漏到页面上
    # （历史踩坑：{{SERIES_BANNER}} 曾整段显示在文章里），宁可跳过也不写坏
    residue = re.findall(r'\{\{[A-Z_]+\}\}', new_html)
    if residue:
        print(f"  ❌ {slug}: 渲染结果残留占位符 {', '.join(sorted(set(residue)))}，跳过")
        return 'fail'
    
    # 检查是否有变化
    if new_html == original:
        print(f"  - {slug}: 无变化")
        return 'unchanged'
    
    # 验证渲染结果
    h1_count = new_html.count('<h1>')
    if h1_count != 1:
        print(f"  ⚠️ {slug}: h1 数量={h1_count}，跳过")
        return 'fail'
    
    if not dry_run:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_html)
    
    # 计算变化
    size_diff = len(new_html) - len(original)
    sign = '+' if size_diff >= 0 else ''
    if dry_run:
        print(f"  🔍 {slug}: 待回刷 ({sign}{size_diff} bytes)")
    else:
        print(f"  ✅ {slug}: 已回刷 ({sign}{size_diff} bytes)")
    return 'ok'

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
        if result == 'ok':
            success += 1
            changed += 1
        elif result == 'unchanged':
            skipped += 1
        else:
            failed += 1
    
    print()
    label = '待回刷' if dry_run else '成功'
    print(f"📊 结果: {success} {label}, {skipped} 无变化, {failed} 失败, 共 {len(posts)} 篇")
    if dry_run:
        print("   (dry-run 模式，未实际写入)")
        return

    proj_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # 回刷会按设计清空每篇文章的静态「相关文章」块（模板里 `<!-- Related Static -->` 区间），
    # 等着 generate-index.js 重新内联。只跑 refresh 不跑 generate-index 会让 verify.js 的
    # f) 断言直接失败——实测回刷 1 篇即触发「1 篇文章页的相关文章块为空」。
    # 所以这里自动补跑 generate-index.js + verify.js，与 generate-post.py 的发布链路对齐。
    if changed == 0:
        print("\n本次没有文件变化，跳过索引重建。")
    else:
        print("\n🔁 回刷后重建全站索引（相关文章 / 列表页 / 分页 / sitemap / rss / sw）：")
        r = subprocess.run(['node', 'scripts/generate-index.js'], capture_output=True, text=True, cwd=proj_root)
        for line in (r.stdout + r.stderr).strip().split('\n'):
            if line.strip():
                print(f"  {line}")
        if r.returncode != 0:
            print("❌ generate-index.js 失败：已回刷文章的相关文章块可能为空，请修复后重跑")
            sys.exit(r.returncode)

    v = subprocess.run(['node', 'scripts/verify.js'], capture_output=True, text=True, cwd=proj_root)
    for line in (v.stdout + v.stderr).strip().split('\n'):
        if line.strip():
            print(f"  {line}")
    if v.returncode != 0:
        print("❌ 一致性校验未通过，请修复后重新运行（详见 scripts/verify.js 断言）")
        sys.exit(v.returncode)

    print("\n🎉 回刷完成：所有索引已重建，直接 git push 即可")

if __name__ == '__main__':
    main()
