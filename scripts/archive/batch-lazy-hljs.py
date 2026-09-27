#!/usr/bin/env python3
"""批量：① 语法高亮改为可见优先 ② TOC nav 加 aria-label（112 篇文章 + 模板）。

用法：python3 scripts/archive/batch-lazy-hljs.py --dry   # 只统计
      python3 scripts/archive/batch-lazy-hljs.py         # 实际写入
"""
import glob, sys, os

DRY = '--dry' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

OLD = """  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // 只对没有 codehilite 的代码块应用 highlight.js
      document.querySelectorAll('pre code').forEach(function(block) {
        // 跳过已经有 Pygments 高亮的块
        if (block.closest('.codehilite') || block.classList.contains('hljs')) return;
        try { hljs.highlightElement(block); } catch (e) {}
      });
    });
  </script>"""

NEW = """  <script>
    /* 语法高亮改为「可见优先、空闲补齐」：
       highlight.js 要遍历全篇代码块并生成数百个 span，若在 DOMContentLoaded 里同步跑完，
       会在关键路径上长时间占住主线程（2026-09-27 实测本页长任务 1548ms、DCL 3651ms；
       改动后长任务 145ms、DCL 1378ms）。这里 DCL 阶段只登记观察，实际高亮交给
       IntersectionObserver（近屏 800px 内优先）+ requestIdleCallback（剩余块每片 ≤4 块），
       首屏代码块的着色时机与视觉基本无变化。 */
    (function() {
      function canPaint(b) {
        return !b.classList.contains('hljs') && !b.closest('.codehilite');
      }
      function paint(b) {
        if (!canPaint(b)) return;
        try { hljs.highlightElement(b); } catch (e) {}
      }
      function init() {
        var blocks = [].slice.call(document.querySelectorAll('pre code')).filter(canPaint);
        if (!blocks.length) return;
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function(entries, obs) {
            entries.forEach(function(en) {
              if (!en.isIntersecting) return;
              paint(en.target);
              obs.unobserve(en.target);
            });
          }, { rootMargin: '800px 0px' });
          blocks.forEach(function(b) { io.observe(b); });
        }
        var i = 0;
        var idle = window.requestIdleCallback || window.setTimeout;
        (function step() {
          var quota = 4;
          while (i < blocks.length && quota-- > 0) paint(blocks[i++]);
          if (i < blocks.length) idle(step);
        })();
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>"""

NAV_OLD = '<nav class="post-toc">'
NAV_NEW = '<nav class="post-toc" aria-label="文章目录">'

# 第二轮微调（v1 → v2）：v1 在 DCL 里同步跑第一片（4 块），实测会制造一个 ~440ms 长任务；
# v2 把第一片也丢给 idle，可见块仍由 IntersectionObserver 立即处理。
V1 = """        var i = 0;
        var idle = window.requestIdleCallback || window.setTimeout;
        (function step() {
          var quota = 4;
          while (i < blocks.length && quota-- > 0) paint(blocks[i++]);
          if (i < blocks.length) idle(step);
        })();"""

V2 = """        var i = 0;
        var idle = window.requestIdleCallback || window.setTimeout;
        var step = function() {
          var quota = 4;
          while (i < blocks.length && quota-- > 0) paint(blocks[i++]);
          if (i < blocks.length) idle(step);
        };
        idle(step); // 不在 DCL 里同步跑：可见块由 IntersectionObserver 处理，其余走空闲分片"""

files = sorted(glob.glob(os.path.join(ROOT, 'blog', 'posts', '*.html')))
files.append(os.path.join(ROOT, 'templates', 'blog-post-template.html'))

# 第三/四轮（axe region 收尾）：
#  - 粒子 canvas 是纯装饰背景，加 aria-hidden 让辅助技术忽略（也消除 region 命中）
#  - 正文之外的「读完之后」<section> 在 </main> 之后、不属于任何 landmark，
#    给它一个可访问名即成为命名 region，内容回到 landmark 内
CANVAS_OLD = '<canvas id="particle-canvas" class="particle-canvas"></canvas>'
CANVAS_NEW = '<canvas id="particle-canvas" class="particle-canvas" aria-hidden="true"></canvas>'
SECTION_OLD = '<section class="section" style="padding-top: 0;">'
SECTION_NEW = '<section class="section" aria-label="读完之后" style="padding-top: 0;">'

all_html = []
for g in ('*.html', 'about/*.html', 'projects/*.html', 'blog/index.html', 'blog/page-*.html',
          'blog/posts/*.html', 'templates/*.html'):
    all_html += glob.glob(os.path.join(ROOT, g))
all_html = sorted(set(all_html))
tot_c = tot_s = 0
ch2 = []
for f in all_html:
    t = open(f, encoding='utf-8').read()
    o = t
    nc = t.count(CANVAS_OLD)
    ns = t.count(SECTION_OLD)
    tot_c += nc
    tot_s += ns
    if nc:
        t = t.replace(CANVAS_OLD, CANVAS_NEW)
    if ns:
        t = t.replace(SECTION_OLD, SECTION_NEW)
    if t != o:
        ch2.append((os.path.relpath(f, ROOT), nc, ns))
        if not DRY:
            open(f, 'w', encoding='utf-8').write(t)

tot_h = tot_n = tot_v2 = 0
changed = []
for f in files:
    t = open(f, encoding='utf-8').read()
    o = t
    nh = t.count(OLD)
    nn = t.count(NAV_OLD)
    nv2 = t.count(V1)
    tot_h += nh
    tot_n += nn
    tot_v2 += nv2
    if nh:
        t = t.replace(OLD, NEW)
    if nn:
        t = t.replace(NAV_OLD, NAV_NEW)
    if nv2:
        t = t.replace(V1, V2)
    if t != o:
        changed.append((os.path.relpath(f, ROOT), nh, nn, nv2))
        if not DRY:
            open(f, 'w', encoding='utf-8').write(t)

print(f"{'[dry]' if DRY else '[write]'} 文件数 {len(files)} | v0→v1 脚本块 {tot_h} | TOC nav {tot_n} | v1→v2 微调 {tot_v2} | 改动文件 {len(changed)}")
print(f"{'[dry]' if DRY else '[write]'} 全站 HTML {len(all_html)} 个 | canvas aria-hidden {tot_c} | section aria-label {tot_s} | 改动文件 {len(ch2)}")
for name, nh, nn, nv2 in changed[:5]:
    print(f"  {name}: script={nh} nav={nn} v2={nv2}")
if len(changed) > 5:
    print(f"  … 其余 {len(changed) - 5} 个文件同样处理")
# 残留检查
resid = []
for f in files:
    t = open(f, encoding='utf-8').read()
    if 'hljs.highlightElement' in t and 'IntersectionObserver' not in t:
        resid.append(os.path.relpath(f, ROOT))
    if NAV_OLD in t:
        resid.append(os.path.relpath(f, ROOT) + ' (nav 未替换)')
    if V1 in t:
        resid.append(os.path.relpath(f, ROOT) + ' (v2 未替换)')
print("残留:", resid[:5], "共", len(resid))
