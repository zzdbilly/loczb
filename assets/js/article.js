/**
 * article.js - 文章页专用脚本
 * 包含：返回顶部、阅读进度、键盘快捷键、TOC 目录
 */

(function() {
  'use strict';

  // === 返回顶部 & 阅读进度 ===
  const backToTop = document.getElementById('backToTop');

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
    else if (e.key === 'Escape') document.getElementById('blog-search-results')?.classList.remove('active');
    else if (e.altKey && e.key === 'b') window.location.href = '../index.html';
  });

  // === TOC 目录 ===
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
})();
