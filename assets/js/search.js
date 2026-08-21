/**
 * Blog Search - High-Performance Command Palette Fuzzy Search
 * 支持即时多关键词检索、高亮、快捷键与键盘导航，毫秒级响应，零卡顿
 */
(function() {
  'use strict';

  let fuse = null;
  let searchData = { posts: [] };
  let isLoading = false;
  let isFuseLoading = false;
  let selectedIndex = -1;

  const searchInput = document.getElementById('home-search-input') || document.getElementById('blog-search-input');
  const searchResults = document.getElementById('home-search-results') || document.getElementById('blog-search-results');
  const searchClear = document.getElementById('search-clear-btn') || document.querySelector('.search-clear');
  const searchKbd = document.getElementById('search-kbd-badge') || document.querySelector('.search-kbd');

  // 动态按需加载 Fuse.js 增强模糊匹配能力
  function loadFuse() {
    if (typeof Fuse !== 'undefined') {
      initFuse();
      return;
    }
    if (isFuseLoading) return;
    isFuseLoading = true;

    const fuseSrc = window.location.pathname.includes('/blog/')
      ? '../assets/vendor/fuse/fuse.min.js'
      : 'assets/vendor/fuse/fuse.min.js';

    const script = document.createElement('script');
    script.src = fuseSrc;
    script.onload = () => {
      isFuseLoading = false;
      initFuse();
    };
    script.onerror = () => {
      const fallback = document.createElement('script');
      fallback.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
      fallback.onload = () => {
        isFuseLoading = false;
        initFuse();
      };
      fallback.onerror = () => { isFuseLoading = false; };
      document.head.appendChild(fallback);
    };
    document.head.appendChild(script);
  }

  // 加载文章索引数据
  async function loadSearchData() {
    if (searchData.posts && searchData.posts.length > 0) return true;
    if (isLoading) return false;
    isLoading = true;

    const isSubDir = window.location.pathname.includes('/blog/') || window.location.pathname.includes('/projects/') || window.location.pathname.includes('/about/');
    const paths = isSubDir 
      ? ['articles-index.json', '../blog/articles-index.json', '/blog/articles-index.json']
      : ['blog/articles-index.json', '/blog/articles-index.json'];

    for (const p of paths) {
      try {
        const resp = await fetch(p);
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.posts) {
            searchData = data;
            isLoading = false;
            if (typeof Fuse !== 'undefined') initFuse();
            return true;
          }
        }
      } catch (e) {}
    }
    isLoading = false;
    return false;
  }

  function initFuse() {
    if (!searchData.posts || !searchData.posts.length || typeof Fuse === 'undefined') return;
    fuse = new Fuse(searchData.posts, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'category', weight: 0.2 },
        { name: 'tags', weight: 0.2 },
        { name: 'excerpt', weight: 0.1 }
      ],
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightText(text, query) {
    if (!text) return '';
    const safeText = escapeHtml(text);
    if (!query || !query.trim()) return safeText;

    const terms = query.trim().split(/\s+/).filter(t => t.length > 0);
    if (!terms.length) return safeText;

    const pattern = terms
      .map(t => escapeHtml(t).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'))
      .filter(Boolean)
      .join('|');

    if (!pattern) return safeText;

    try {
      const regex = new RegExp(`(${pattern})`, 'gi');
      return safeText.replace(regex, '<mark>$1</mark>');
    } catch (e) {
      return safeText;
    }
  }

  function nativeSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q || !searchData.posts) return [];

    const terms = q.split(/\s+/).filter(Boolean);

    const scored = searchData.posts.map(post => {
      let score = 0;
      const titleLower = (post.title || '').toLowerCase();
      const excerptLower = (post.excerpt || '').toLowerCase();
      const catLower = (post.category || '').toLowerCase();
      const tagsLower = (post.tags || []).join(' ').toLowerCase();

      for (const term of terms) {
        if (titleLower.includes(term)) score += 10;
        if (catLower.includes(term)) score += 5;
        if (tagsLower.includes(term)) score += 4;
        if (excerptLower.includes(term)) score += 2;
      }

      return { post, score };
    }).filter(item => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map(s => s.post);
  }

  async function performSearch(query) {
    if (!query || !query.trim()) {
      if (searchResults) {
        searchResults.classList.remove('active');
        searchResults.innerHTML = '';
      }
      if (searchClear) searchClear.classList.remove('visible');
      if (searchKbd) searchKbd.style.display = '';
      selectedIndex = -1;
      return;
    }

    if (searchClear) searchClear.classList.add('visible');
    if (searchKbd) searchKbd.style.display = 'none';

    if (!searchData.posts || !searchData.posts.length) {
      await loadSearchData();
    }

    let matched = [];
    if (fuse) {
      try {
        matched = fuse.search(query).slice(0, 8).map(r => r.item);
      } catch (e) {
        matched = nativeSearch(query);
      }
    } else {
      matched = nativeSearch(query);
    }

    displayResults(matched, query);
  }

  function displayResults(results, query) {
    if (!searchResults) return;

    if (!results || results.length === 0) {
      searchResults.innerHTML = `
        <div class="sr-empty">
          <div class="sr-empty-icon">🔍</div>
          <div>未找到包含 <strong>"${escapeHtml(query)}"</strong> 的文章</div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">建议尝试：Android、Kotlin、AI Agent、架构、思考 等关键词</div>
        </div>`;
      searchResults.classList.add('active');
      return;
    }

    const headerHtml = `
      <div class="sr-header">
        <span>找到 ${results.length} 篇相关文章</span>
        <span>↑↓ 导航 · Enter 确认 · ESC 关闭</span>
      </div>`;

    const isBlogDir = window.location.pathname.includes('/blog/');
    const itemsHtml = results.map((post, idx) => {
      const title = highlightText(post.title, query);
      const excerpt = highlightText(post.excerpt, query);
      const category = escapeHtml(post.category || '');
      const date = escapeHtml(post.date || '');
      const postSlug = post.slug || (post.url || '').replace(/^blog\/posts\//, '').replace(/\.html$/, '');
      const href = isBlogDir ? `posts/${postSlug}.html` : `blog/posts/${postSlug}.html`;

      const tags = (post.tags || []).slice(0, 3).map(tag =>
        `<span style="color: var(--color-text-muted);">#${escapeHtml(tag)}</span>`
      ).join(' ');

      return `
      <a href="${href}" class="sr-item" data-index="${idx}">
        <div class="sr-title">
          <span>${title}</span>
          <span style="font-size: 0.75rem; color: var(--color-accent-primary); opacity: 0.8;">➔</span>
        </div>
        <div class="sr-excerpt">${excerpt}</div>
        <div class="sr-meta">
          <span>📅 ${date}</span>
          <span class="sr-category">${category}</span>
          ${tags ? `<span>${tags}</span>` : ''}
        </div>
      </a>`;
    }).join('');

    searchResults.innerHTML = headerHtml + itemsHtml;
    searchResults.classList.add('active');
  }

  function updateSelected() {
    if (!searchResults) return;
    const items = searchResults.querySelectorAll('.sr-item');
    items.forEach((item, idx) => {
      item.classList.toggle('sr-selected', idx === selectedIndex);
      if (idx === selectedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function bindEvents() {
    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(e.target.value), 120);
      });

      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
          performSearch(searchInput.value);
        } else {
          loadSearchData();
          loadFuse();
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (!searchResults || !searchResults.classList.contains('active')) return;
        const items = searchResults.querySelectorAll('.sr-item');
        if (!items.length) return;

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex = (selectedIndex + 1) % items.length;
          updateSelected();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex = (selectedIndex - 1 + items.length) % items.length;
          updateSelected();
        } else if (e.key === 'Enter') {
          if (selectedIndex >= 0 && items[selectedIndex]) {
            e.preventDefault();
            items[selectedIndex].click();
          }
        } else if (e.key === 'Escape') {
          searchResults.classList.remove('active');
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', (e) => {
        e.preventDefault();
        if (searchInput) {
          searchInput.value = '';
          performSearch('');
          searchInput.focus();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.blog-search-bar')) {
        if (searchResults) searchResults.classList.remove('active');
      }
    });
  }

  function initShortcut() {
    const isMac = typeof navigator !== 'undefined' && navigator.platform && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (searchKbd) {
      searchKbd.textContent = isMac ? '⌘K' : 'Ctrl K';
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadSearchData();
    loadFuse();
    bindEvents();
    initShortcut();
  });
})();
