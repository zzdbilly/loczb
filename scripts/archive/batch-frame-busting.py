#!/usr/bin/env python3
"""批量：给全站 HTML 注入「反点击劫持」兜底脚本。

背景：GitHub Pages 无法下发 X-Frame-Options / CSP frame-ancestors（meta 里这两者都无效），
线上实测 site 可以被任意站点 iframe 嵌入。这里做前端兜底：被嵌框时把顶层导航到自身；
被跨域父页阻止时就把自己的内容隐藏，避免点击劫持。
（这是没有响应头控制权时的标准兜底，不能替代真正的响应头；真正的头仍需前置 Cloudflare。）

用法：python3 scripts/archive/batch-frame-busting.py --dry
      python3 scripts/archive/batch-frame-busting.py
"""
import glob, os, re, sys

DRY = '--dry' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# v1 只做了 try{top.location=self.location}：现代 Chrome 对跨域父页的顶层导航是「静默拦截」
# （不抛异常），v1 于是既不跳转也不隐藏，等于没防住。v2 加一个延时复核：还在框里就自己隐藏。
V1 = ("<script>/* 反点击劫持兜底：GitHub Pages 无法下发 X-Frame-Options / CSP frame-ancestors */"
      "if(self!==top){try{top.location=self.location}catch(e){document.documentElement.style.display='none'}}</script>")
SNIPPET = ("<script>/* 反点击劫持兜底：GitHub Pages 无法下发 X-Frame-Options / CSP frame-ancestors */"
           "(function(){if(self===top)return;try{top.location=self.location}catch(e){}"
           "setTimeout(function(){if(self!==top){document.documentElement.style.display='none';}},400);})();</script>")
MARK = '反点击劫持兜底'

CSP_META = re.compile(r'([ \t]*)<meta http-equiv="Content-Security-Policy"[^>]*>')

files = sorted(p for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)
               if 'node_modules' not in p)

done = skipped = 0
for f in files:
    t = open(f, encoding='utf-8').read()
    if MARK in t and V1 in t:
        t = t.replace(V1, SNIPPET, 1)
        done += 1
        if not DRY:
            open(f, 'w', encoding='utf-8').write(t)
        continue
    if MARK in t:
        skipped += 1
        continue
    m = CSP_META.search(t)
    if not m:
        print('⚠️ 找不到 CSP 锚点，跳过:', os.path.relpath(f, ROOT))
        continue
    t = CSP_META.sub(lambda mm: mm.group(0) + '\n' + mm.group(1) + SNIPPET, t, count=1)
    done += 1
    if not DRY:
        open(f, 'w', encoding='utf-8').write(t)

print(f"{'[dry]' if DRY else '[write]'} HTML {len(files)} 个 | 注入 {done} | 已有 {skipped}")

bad = []
for f in files:
    t = open(f, encoding='utf-8').read()
    n = t.count(MARK)
    if n != 1:
        bad.append((os.path.relpath(f, ROOT), n))
    if 'X-Frame-Options' in t.replace(MARK, ''):
        pass
print("锚点异常:", bad[:5], "共", len(bad))
