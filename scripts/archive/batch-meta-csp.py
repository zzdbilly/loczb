#!/usr/bin/env python3
"""批量：给全站 HTML 的 <head> 注入 meta 版 CSP（GitHub Pages 无法下发响应头，只能力求可控的那部分）。

用法：python3 scripts/archive/batch-meta-csp.py --dry
      python3 scripts/archive/batch-meta-csp.py

为什么用 meta：GitHub Pages 忽略 _headers 里的响应头，线上实测无 CSP。
meta 能承载的策略有限（frame-ancestors / XFO / nosniff / Permissions-Policy 只能靠响应头），
所以这里落地的是「能生效的那部分」：默认拒绝未知来源、object-src none、base-uri self、
form-action self、upgrade-insecure-requests，并保留站内既有依赖（Cloudflare 轻量分析、评论 Worker）。
"""
import glob, os, re, sys

DRY = '--dry' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

CSP = (
    "default-src 'self'; "
    # jsdelivr 只作脚本兜底（fuse / marked / DOMPurify 的本地 vendor 加载失败时才用，
    # 见 search.js:40、comment-widget.js:81/94），缺了它兜底路径会被 CSP 静默掐断。
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net "
    "https://static.cloudflareinsights.com "
    "https://loczb-comments.billycust716.workers.dev; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: https:; "
    "font-src 'self' data:; "
    "connect-src 'self' https://loczb-comments.billycust716.workers.dev "
    "https://dashscope.aliyuncs.com https://709527.xyz https://www.709527.xyz "
    # Cloudflare 轻量分析：beacon.min.js 被允许后它还会 XHR 上报到 cloudflareinsights.com，
    # 本地实测这一条漏了会被 CSP 掐掉（"Connecting to ... violates connect-src"）→ 分析静默丢失。
    "https://cloudflareinsights.com; "
    "media-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "upgrade-insecure-requests"
)

files = sorted(p for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
               if 'node_modules' not in p)

PAT = re.compile(r'([ \t]*)<meta charset="UTF-8">')
CSP_PAT = re.compile(r'(<meta http-equiv="Content-Security-Policy" content=")[^"]*(">)')

done = updated = skipped = 0
for f in files:
    t = open(f, encoding='utf-8').read()
    if CSP_PAT.search(t):
        new = CSP_PAT.sub(lambda m: m.group(1) + CSP + m.group(2), t, count=1)
        if new == t:
            skipped += 1
            continue
        updated += 1
        if not DRY:
            open(f, 'w', encoding='utf-8').write(new)
        continue
    if not PAT.search(t):
        print('⚠️ 找不到 charset 锚点，跳过:', os.path.relpath(f, ROOT))
        continue
    new = PAT.sub(lambda m: (m.group(0) + '\n' + m.group(1) +
                             f'<meta http-equiv="Content-Security-Policy" content="{CSP}">'), t, count=1)
    done += 1
    if not DRY:
        open(f, 'w', encoding='utf-8').write(new)

print(f"{'[dry]' if DRY else '[write]'} HTML {len(files)} 个 | 新注入 {done} | 更新已有 {updated} | 已是最新 {skipped}")

# 残留与前提核查
left = []
for f in files:
    t = open(f, encoding='utf-8').read()
    n = t.count('http-equiv="Content-Security-Policy"')
    if n != 1:
        left.append((os.path.relpath(f, ROOT), n))
print("CSP 锚点异常文件:", left[:5], "共", len(left))

css = open(os.path.join(ROOT, 'assets', 'css', 'style.css'), encoding='utf-8').read()
print("style.css 里是否还有 Google Fonts 依赖:", 'fonts.googleapis' in css, '| fonts.gstatic:', 'fonts.gstatic' in css)
js = ''.join(open(p, encoding='utf-8').read() for p in glob.glob(os.path.join(ROOT, 'assets', 'js', '*.js')))
print("assets/js 里是否引用 jsdelivr:", 'jsdelivr' in js, "| googleapis:", 'googleapis' in js)
wj = open(os.path.join(ROOT, 'workers', 'comment-system', 'comment-widget.js'), encoding='utf-8').read()
print("comment-widget.js 里是否引用 jsdelivr:", 'jsdelivr' in wj, "| 外链 host:",
      sorted(set(re.findall(r'https?://([a-z0-9.-]+)', wj)))[:6])
