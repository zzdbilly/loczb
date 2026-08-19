/**
 * back-to-top.js - 返回顶部与阅读进度
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    let backToTop = document.getElementById('backToTop') || document.querySelector('.back-to-top');
    const progressBar = document.getElementById('readingProgress') || document.querySelector('.reading-progress');

    if (backToTop || progressBar) {
      window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || window.pageYOffset;
        if (backToTop) {
          if (scrollTop > 300) {
            backToTop.classList.add('visible');
          } else {
            backToTop.classList.remove('visible');
          }
        }

        if (progressBar && document.querySelector('.post-content')) {
          const docHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (docHeight > 0) {
            const progress = (scrollTop / docHeight) * 100;
            progressBar.style.width = Math.min(100, Math.max(0, progress)) + '%';
          }
        }
      }, { passive: true });
    }

    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 键盘快捷键 (j/k 滚动, / 搜索, Esc 关闭搜索)
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'j') {
        window.scrollBy({ top: 200, behavior: 'smooth' });
      } else if (e.key === 'k') {
        window.scrollBy({ top: -200, behavior: 'smooth' });
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'Escape') {
        const searchResults = document.getElementById('blog-search-results');
        if (searchResults) searchResults.classList.remove('active');
      }
    });
  });
})();
