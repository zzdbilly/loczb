/**
 * article.js - 文章页专用脚本
 * 包含：返回顶部、阅读进度、键盘快捷键、TOC 目录、手机端 TOC 抽屉
 */

(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    // === 返回顶部 & 阅读进度 ===
    const backToTop = document.getElementById('backToTop');

    // === macOS 风格代码块与复制功能 ===
    initCodeBlocks();

    window.addEventListener('scroll', () => {
      if (backToTop) {
        if (window.scrollY > 300) {
          backToTop.classList.add('visible');
        } else {
          backToTop.classList.remove('visible');
        }
      }

      const progressBar = document.getElementById('readingProgress');
      if (progressBar && document.querySelector('.post-content')) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        progressBar.style.width = progress + '%';
      }
    });

    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // === 键盘快捷键 ===
    document.addEventListener('keydown', (e) => {
      if (e.key === 'j') window.scrollBy({ top: 200, behavior: 'smooth' });
      else if (e.key === 'k') window.scrollBy({ top: -200, behavior: 'smooth' });
      else if (e.key === 'Escape') {
        document.getElementById('blog-search-results')?.classList.remove('active');
        // 关闭手机端 TOC 抽屉
        document.querySelector('.toc-drawer')?.classList.remove('open');
        document.querySelector('.toc-drawer-overlay')?.classList.remove('open');
      }
      else if (e.altKey && e.key === 'b') window.location.href = '../index.html';
    });

    // === 左侧面板兜底：旧文章未嵌入模板时 JS 动态生成 ===
    if (!document.getElementById('postSidebar')) {
      (function() {
        const content = document.querySelector('.post-content');
        if (!content) return;

        const sidebar = document.createElement('aside');
        sidebar.className = 'post-sidebar-info';
        sidebar.id = 'postSidebar';

        // 提取文章数据
        const h2Count = content.querySelectorAll('h2').length;
        const h3Count = content.querySelectorAll('h3').length;
        const codeBlocks = content.querySelectorAll('pre code').length;
        const textLen = content.textContent.replace(/\s+/g, '').length;

        // 从 meta 获取日期
        const dateSpan = document.querySelector('.post-meta span:first-child');
        const dateStr = dateSpan ? dateSpan.textContent.replace('📅 ', '').split(' ')[0] : '';
        const readSpan = document.querySelector('.post-meta span:nth-child(2)');
        const readStr = readSpan ? readSpan.textContent.replace('⏱️ ', '') : '';

        const tags = document.querySelectorAll('.post-tags .tag');
        const tagsList = Array.from(tags).map(t => t.textContent);

        sidebar.innerHTML = `
          <div class="post-info-card">
            <div class="post-info-section">
              <div class="post-info-label">作者</div>
              <div class="post-info-author">
                <div class="post-info-avatar">小</div>
                <div>
                  <div class="post-info-author-name">张小猛</div>
                  <div class="post-info-author-desc">写代码，做产品</div>
                </div>
              </div>
            </div>
            <div class="post-info-section">
              <div class="post-info-label">文章信息</div>
              <div class="post-info-stat"><span class="post-info-stat-label">📅 发布日期</span><span class="post-info-stat-value">${dateStr}</span></div>
              <div class="post-info-stat"><span class="post-info-stat-label">⏱️ 阅读时间</span><span class="post-info-stat-value">${readStr}</span></div>
              <div class="post-info-stat"><span class="post-info-stat-label">📝 文章字数</span><span class="post-info-stat-value">${textLen} 字</span></div>
              <div class="post-info-stat"><span class="post-info-stat-label">📊 章节数</span><span class="post-info-stat-value">${h2Count} 节 · ${h3Count} 子节</span></div>
              <div class="post-info-stat"><span class="post-info-stat-label">💻 代码块</span><span class="post-info-stat-value">${codeBlocks} 段</span></div>
            </div>
            <div class="post-info-section">
              <div class="post-info-label">标签</div>
              <div class="post-info-links">
                ${tagsList.map(t => `<a href="../../blog/index.html?tag=${encodeURIComponent(t)}" class="post-info-link"># ${t}</a>`).join('')}
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(sidebar);
      })();
    }

    // === TOC 目录（桌面端） ===
    const tocList = document.getElementById('tocList');
    const tocContainer = document.getElementById('postToc');
    if (!tocList || !tocContainer) return;

    const headings = document.querySelectorAll('.post-content h2, .post-content h3');
    if (headings.length === 0) {
      tocContainer.style.display = 'none';
      return;
    }

    headings.forEach((h, i) => {
      const id = 'toc-' + i;
      h.id = h.id || id;

      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/^\d+[.、]\s*/, '');
      a.className = h.tagName === 'H3' ? 'toc-h3' : 'toc-h2';

      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(h.id).scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', '#' + h.id);
      });

      li.appendChild(a);
      tocList.appendChild(li);
    });

    // 滚动高亮当前 TOC 项
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocList.querySelectorAll('a').forEach(a => a.classList.remove('active'));
          const id = entry.target.id;
          const activeLink = tocList.querySelector('a[href="#' + id + '"]');
          if (activeLink) {
            activeLink.classList.add('active');
            activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }, { rootMargin: '-20% 0px -60% 0px' });

    headings.forEach(h => observer.observe(h));

    // === 手机端 TOC 按钮 & 抽屉 ===
    (function() {
      // 创建手机端 TOC 按钮
      const tocBtn = document.createElement('button');
      tocBtn.className = 'mobile-toc-btn';
      tocBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
      tocBtn.setAttribute('aria-label', '显示目录');

      // 创建抽屉
      const drawer = document.createElement('div');
      drawer.className = 'toc-drawer';
      drawer.innerHTML = `
        <div class="toc-drawer-header">
          <span class="toc-drawer-title">目录</span>
          <button class="toc-drawer-close" aria-label="关闭目录">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <ul class="post-toc-list"></ul>
      `;

      // 创建遮罩层
      const overlay = document.createElement('div');
      overlay.className = 'toc-drawer-overlay';

      // 把目录项复制到抽屉
      const drawerList = drawer.querySelector('.post-toc-list');
      const originalItems = tocList.querySelectorAll('li');
      originalItems.forEach(item => {
        var clone = item.cloneNode(true);
        drawerList.appendChild(clone);
      });

      // 添加到页面
      document.body.appendChild(tocBtn);
      document.body.appendChild(drawer);
      document.body.appendChild(overlay);

      // 事件处理
      const openDrawer = () => {
        drawer.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      };
      const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
      };

      tocBtn.addEventListener('click', openDrawer);
      overlay.addEventListener('click', closeDrawer);
      drawer.querySelector('.toc-drawer-close').addEventListener('click', closeDrawer);

      // 抽屉内链接点击后关闭
      drawerList.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          closeDrawer();
        });
      });
    })();
  });

  // === macOS 风格代码块与一键复制 ===
  function initCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.post-content pre');
    if (!codeBlocks.length) return;

    codeBlocks.forEach(pre => {
      if (pre.parentElement.classList.contains('code-block-wrapper')) return;

      const code = pre.querySelector('code');
      const langClass = code ? Array.from(code.classList).find(c => c.startsWith('language-') || c.startsWith('lang-')) : null;
      const lang = langClass ? langClass.replace(/^(language-|lang-)/, '').toUpperCase() : 'CODE';

      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper';

      const header = document.createElement('div');
      header.className = 'code-block-header';
      header.innerHTML = `
        <div class="code-dots">
          <span class="code-dot code-dot-red"></span>
          <span class="code-dot code-dot-yellow"></span>
          <span class="code-dot code-dot-green"></span>
          <span class="code-lang-badge">${lang}</span>
        </div>
        <button class="code-copy-btn" aria-label="复制代码">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>复制</span>
        </button>
      `;

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);

      const copyBtn = header.querySelector('.code-copy-btn');
      copyBtn.addEventListener('click', async () => {
        const text = code ? code.innerText : pre.innerText;
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>已复制</span>
          `;
          showToast('代码已成功复制到剪贴板');
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>复制</span>
            `;
          }, 2000);
        } catch (err) {
          console.error('复制失败', err);
        }
      });
    });
  }

  function showToast(msg) {
    let toast = document.getElementById('toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>✨</span> <span>${msg}</span>`;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }
})();
