#!/usr/bin/env python3
"""[已归档 · 禁止无脑重跑] 一次性性能清理脚本：移除全屏 loading 遮罩 + Google Fonts 依赖（全站 HTML 批量）。
运行: cd <仓库根> && python3 scripts/archive/perf-cleanup.py --dry [--force-run]

2026-09-27 归档原因（审计实测）：
  本脚本已全站生效（重跑 0 变更的新增），但它第 45 行的全局 `re.sub(r'\\n{3,}', '\\n\\n', text)`
  会作用到**正文**：实跑一次就改掉了 blog/posts/idempotent-reproducible-builds.html 里
  <pre><code> 内 Python 示例的一个空行（diff 0 增 1 删）。另外 glob 不含 blog/page-*.html。
  所以它不再适合作为可反复执行的工具；如需复用，请先把空行收敛限定在 <head> 区间。
"""
import os, re, sys, glob

if '--force-run' not in sys.argv:
    print("⛔ 本脚本已归档停用：重跑会改写文章正文（代码块丢空行），且不覆盖 blog/page-*.html。")
    print("   确认要跑请加 --force-run（建议先 --dry 看逐文件计数）。")
    sys.exit(1)
if not os.path.exists('index.html'):
    print("⛔ 必须在仓库根目录运行（脚本用相对 glob 找 HTML）。")
    sys.exit(1)

DRY = '--dry' in sys.argv

files = (
    glob.glob('*.html')
    + glob.glob('about/*.html')
    + glob.glob('projects/*.html')
    + glob.glob('blog/index.html')
    + glob.glob('blog/posts/*.html')
    + glob.glob('templates/*.html')
)

# loading 块：可选 <!-- Loading --> 注释 + <div class="loading">(...spinner...)</div>
RE_LOADING = re.compile(
    r'[ \t]*(?:<!--\s*Loading\s*-->\s*\n)?[ \t]*<div class="loading">[^<]*(?:<div class="loading-spinner"></div>\s*)?</div>\s*\n',
)
# Google Fonts: preconnect 两行
RE_PRECONNECT = re.compile(r'[ \t]*<link rel="preconnect" href="https://fonts\.(?:googleapis|gstatic)\.com"[^>]*>\s*\n')
# Google Fonts: print/onload 样式表 + noscript 回退块 + 相关注释
RE_FONT_CSS = re.compile(r'[ \t]*<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\s*\n')
RE_FONT_NOSCRIPT = re.compile(r'[ \t]*<!--\s*Fallback for fonts\s*-->\s*\n\s*<noscript>\s*<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\s*</noscript>\s*\n', re.I)
RE_FONT_NOSCRIPT_BARE = re.compile(r'[ \t]*<noscript>\s*<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\s*</noscript>\s*\n', re.I)
RE_FONT_COMMENT = re.compile(r'[ \t]*<!--\s*(?:Preconnect to Google Fonts[^-]*|Google Fonts)\s*-->\s*\n')

changed = 0
for f in sorted(set(files)):
    try:
        text = open(f, encoding='utf-8').read()
    except Exception as e:
        print('SKIP', f, e); continue
    orig = text
    n_load = len(RE_LOADING.findall(text))
    text = RE_LOADING.sub('', text)
    n_pc = len(RE_PRECONNECT.findall(text)); text = RE_PRECONNECT.sub('', text)
    n_ns = len(RE_FONT_NOSCRIPT.findall(text)); text = RE_FONT_NOSCRIPT.sub('', text)
    n_ns2 = len(RE_FONT_NOSCRIPT_BARE.findall(text)); text = RE_FONT_NOSCRIPT_BARE.sub('', text)
    n_css = len(RE_FONT_CSS.findall(text)); text = RE_FONT_CSS.sub('', text)
    text = RE_FONT_COMMENT.sub('', text)
    # 收敛因删除产生的连续空行
    text = re.sub(r'\n{3,}', '\n\n', text)
    if text != orig:
        changed += 1
        if not DRY:
            open(f, 'w', encoding='utf-8').write(text)
        print(f'{f}: loading={n_load} preconnect={n_pc} fontcss={n_css} noscript={n_ns+n_ns2}')

# 残留检查
print('--- leftover scan ---')
for f in sorted(set(files)):
    t = open(f, encoding='utf-8').read()
    if 'fonts.googleapis' in t or 'fonts.gstatic' in t:
        for i, line in enumerate(t.splitlines(), 1):
            if 'fonts.g' in line:
                print(f'LEFTOVER {f}:{i}: {line.strip()[:120]}')
    if 'class="loading"' in t:
        for i, line in enumerate(t.splitlines(), 1):
            if 'class="loading"' in line:
                print(f'LEFTOVER-LOADING {f}:{i}: {line.strip()[:120]}')
print(f'files changed: {changed}')
