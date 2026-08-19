#!/usr/bin/env python3
"""
Generate projects/index.html dynamically from projects/projects.json data.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "projects" / "projects.json"
OUTPUT = ROOT / "projects" / "index.html"


def render_case_card(p):
    tech_tags = "\n                ".join(f'<span class="tech-tag">{t}</span>' for t in p.get("tech", []))
    highlights_html = "<br>".join(f"• {h}" for h in p.get("highlights", []))
    
    metrics_html = "".join(f'''
                <div class="case-metric">
                  <div class="case-metric-value">{m["value"]}</div>
                  <div class="case-metric-label">{m["label"]}</div>
                </div>''' for m in p.get("metrics", []))
    
    links_html = "".join(f'''
              <a href="{l["url"]}" class="btn {'btn-primary' if l.get('primary') else 'btn-ghost'}" target="_blank" rel="noopener">{l["label"]}</a>''' for l in p.get("links", []))
    
    tech_classes = " ".join(t.lower().replace("/", " ").replace(".", "") for t in p.get("tech", []))
    section_title = "功能特性" if p.get("id") == "pastebin" else "亮点能力"

    return f'''        <!-- Case: {p["title"]} -->
        <article class="case-card spotlight-card animate-on-scroll" data-category="{p["category"]}" data-tech="{tech_classes}">
          <div class="case-card-header">
            <span class="case-card-badge">{p["badge"]}</span>
            <h2 class="case-card-title">{p["title"]}</h2>
            <p class="case-card-subtitle">{p["subtitle"]}</p>
          </div>
          <div class="case-card-body">
            <div class="case-section">
              <h3 class="case-section-title">项目背景</h3>
              <p class="case-section-content">{p["background"]}</p>
            </div>
            <div class="case-section">
              <h3 class="case-section-title">我的角色</h3>
              <p class="case-section-content">{p["role"]}</p>
            </div>
            <div class="case-section">
              <h3 class="case-section-title">技术方案</h3>
              <div class="tech-tags">
                {tech_tags}
              </div>
            </div>
            <div class="case-section">
              <h3 class="case-section-title">{section_title}</h3>
              <p class="case-section-content">{highlights_html}</p>
            </div>
            <div class="case-section">
              <h3 class="case-section-title">结果指标</h3>
              <div class="case-metrics">{metrics_html}
              </div>
            </div>
            <div class="case-links">{links_html}
            </div>
          </div>
        </article>'''


def generate():
    if not DATA_FILE.exists():
        print(f"❌ 数据文件不存在: {DATA_FILE}")
        return

    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        projects = json.load(f)

    cards_html = "\n\n".join(render_case_card(p) for p in projects)

    html = f'''<!DOCTYPE html>
<html lang="zh-CN" data-theme="dark">
<head>
  <script>try{{const t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t);}}catch(e){{}}</script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- SEO Basic -->
  <meta name="description" content="张小猛的项目案例 - 个人品牌网站、PasteBin 便利贴工具。从想法到落地的完整案例。">
  <meta name="keywords" content="项目案例, loczb, PasteBin, 便利贴, 张小猛">
  <meta name="author" content="张小猛">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://709527.xyz/projects/">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://709527.xyz/projects/">
  <meta property="og:title" content="项目案例 | 张小猛 - loczb">
  <meta property="og:description" content="张小猛的项目案例 - 个人品牌网站、PasteBin 便利贴。">
  <meta property="og:image" content="https://709527.xyz/assets/images/og-image.png">
  <meta property="og:locale" content="zh_CN">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="项目案例 | 张小猛 - loczb">
  <meta name="twitter:description" content="张小猛的项目案例 - 个人品牌网站、PasteBin 便利贴。">
  <meta name="twitter:image" content="https://709527.xyz/assets/images/og-image.png">
  
  <title>项目案例 | 张小猛 - loczb</title>
  
  <!-- Favicon -->
  <link rel="icon" type="image/x-icon" href="../assets/images/favicon.ico">
  <link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg">
  <link rel="icon" type="image/png" sizes="16x16" href="../assets/images/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/images/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="../assets/images/apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  <meta name="theme-color" content="#3b82f6">
  <link rel="stylesheet" href="../assets/css/style.css?v=spotlight-ui">
  <!-- Preconnect to Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Noto+Sans+SC:wght@500;700&family=Noto+Serif+SC:wght@600;700&family=JetBrains+Mono:wght@500&display=swap" media="print" onload="this.media='all'">
  <noscript>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700&family=Noto+Sans+SC:wght@500;700&family=Noto+Serif+SC:wght@600;700&family=JetBrains+Mono:wght@500&display=swap">
  </noscript>
</head>
<body>
  <div class="loading"><div class="loading-spinner"></div></div>

  <nav class="nav">
    <div class="nav-inner">
      <a href="../index.html" class="nav-logo">loc<span>zb</span></a>
      <button class="nav-toggle" aria-label="打开菜单" aria-expanded="false"><span></span><span></span><span></span></button>
      <div class="nav-overlay"></div>
      <ul class="nav-links" id="nav-links-menu">
        <li><a href="../index.html" class="nav-link">首页</a></li>
        <li><a href="index.html" class="nav-link active">项目</a></li>
        <li><a href="../blog/index.html" class="nav-link">博客</a></li>
        <li><a href="../about/index.html" class="nav-link">关于</a></li>
      </ul>
      <button class="theme-toggle" aria-label="切换主题">
        <svg class="theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
        <svg class="theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  </nav>
  <!-- Particle Canvas Background -->
  <canvas id="particle-canvas" class="particle-canvas"></canvas>

  <main id="main-content">
    <section class="projects-hero">
      <div class="container">
        <div class="section-header">
          <div class="section-label">Case Studies</div>
          <h1 class="section-title">项目案例</h1>
          <p class="section-desc">从想法到落地，每个项目都是一次技术与产品的探索</p>
        </div>
      </div>
    </section>

    <section class="section section-narrow" style="padding: 1rem var(--space-lg);">
      <div class="container">

        <!-- Filter Bar -->
        <div class="projects-filter-bar" id="projects-filter-bar">
          <button class="projects-filter-btn projects-filter-btn--active" data-filter="all">全部</button>
          <button class="projects-filter-btn" data-filter="website">网站</button>
          <button class="projects-filter-btn" data-filter="app">应用</button>
          <button class="projects-filter-btn" data-filter="tool">工具</button>
        </div>

{cards_html}

        <!-- Empty state -->
        <div class="projects-empty" id="projects-empty" style="display:none;">
          <p class="blog-empty-text">该分类下暂无项目</p>
        </div>

      </div>
    </section>

  </main>

  <footer class="footer">
    <div class="footer-inner">
      <p class="footer-signature">写代码，做产品，也认真生活。</p>
      <div class="footer-social">
        <a href="https://github.com/zzdbilly" class="footer-social-link" target="_blank" rel="noopener" aria-label="GitHub">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a href="../rss.xml" class="footer-social-link" aria-label="RSS">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>
        </a>
      </div>
      <div class="footer-links">
        <a href="../blog/index.html" class="footer-link">博客</a>
        <a href="../about/index.html" class="footer-link">关于</a>
        <a href="../projects/index.html" class="footer-link">项目</a>
      </div>
      <p class="footer-copyright">© 2026 张小猛</p>
    </div>
  </footer>

  <script defer src="../assets/js/main.js"></script>
  <script defer src="../assets/js/search.js"></script>
  <script defer src="../assets/js/particles.js"></script>

  <!-- Projects Filter Logic -->
  <script>
  (function() {{
    const filterBar = document.getElementById('projects-filter-bar');
    if (!filterBar) return;
    const buttons = filterBar.querySelectorAll('.projects-filter-btn');
    const cards = document.querySelectorAll('.case-card[data-category]');
    const emptyState = document.getElementById('projects-empty');

    buttons.forEach(btn => {{
      btn.addEventListener('click', function() {{
        const filter = this.getAttribute('data-filter');

        // Update active button
        buttons.forEach(b => b.classList.remove('projects-filter-btn--active'));
        this.classList.add('projects-filter-btn--active');

        // Filter cards with smooth transition
        let visibleCount = 0;
        cards.forEach(card => {{
          const cat = card.getAttribute('data-category');
          const show = (filter === 'all' || cat === filter);

          if (show) {{
            card.style.display = '';
            card.style.opacity = '0';
            card.style.transform = 'translateY(12px)';
            requestAnimationFrame(() => {{
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }});
            visibleCount++;
          }} else {{
            card.style.opacity = '0';
            card.style.transform = 'translateY(8px)';
            setTimeout(() => {{ card.style.display = 'none'; }}, 200);
          }}
        }});

        // Toggle empty state
        if (emptyState) {{
          emptyState.style.display = visibleCount === 0 ? '' : 'none';
        }}
      }});
    }});
  }})();
  </script>

  <!-- Cloudflare Web Analytics -->
  <script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "29e7cff6f37448989538e2165cb79187"}}'></script>

</body>
</html>
'''

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(html, encoding='utf-8')
    print(f"✅ 已成功生成: {OUTPUT} ({len(html)} bytes, {len(projects)} 个项目案例)")


if __name__ == '__main__':
    generate()
