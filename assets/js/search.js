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

  let currentFilter = 'all';

  const SERIES_QUICK_LINKS = [
    { icon: '🤖', title: 'AI Agent 与本地大模型', url: 'blog/posts/ai-助手定时任务投递指南从-agent-废话到-no-agent-脚本.html' },
    { icon: '📱', title: 'Android 16 深度演进', url: 'blog/posts/android-16-features.html' },
    { icon: '⚡', title: 'Kotlin 现代并发与架构', url: 'blog/posts/kotlin-coroutines-best-practices.html' },
    { icon: '🎨', title: 'Jetpack Compose 现代 UI', url: 'blog/posts/compose-april-2026-update.html' },
    { icon: '🛠️', title: '全栈工程化与高性能架构', url: 'blog/posts/static-blog-performance-optimization-59mb.html' },
    { icon: '💡', title: '程序员的工程思维与成长', url: 'blog/posts/程序员带娃把养孩子当成一个长期运维的系统工程.html' }
  ];

  function getFilterBarHtml() {
    const filters = [
      { id: 'all', label: '全部' },
      { id: 'ai', label: '🤖 AI Agent' },
      { id: 'android', label: '📱 Android' },
      { id: 'kotlin', label: '⚡ Kotlin' },
      { id: 'devops', label: '🛠️ DevOps' },
      { id: 'thought', label: '💡 思考' }
    ];

    return `
      <div class="sr-filter-bar">
        ${filters.map(f => `
          <button type="button" class="sr-filter-chip ${currentFilter === f.id ? 'active' : ''}" data-filter="${f.id}">
            ${f.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  function displaySmartRecs() {
    if (!searchResults) return;
    const isBlogDir = window.location.pathname.includes('/blog/');
    const filterBar = getFilterBarHtml();

    const seriesHtml = SERIES_QUICK_LINKS.map(s => {
      const href = isBlogDir ? s.url.replace(/^blog\//, '') : s.url;
      return `
        <a href="${href}" class="sr-series-item">
          <span class="sr-series-item-icon">${s.icon}</span>
          <span class="sr-series-item-title">${s.title}</span>
        </a>
      `;
    }).join('');

    searchResults.innerHTML = `
      ${filterBar}
      <div class="sr-rec-container">
        <div class="sr-rec-title">
          <span>📚 6 大精选旗舰专栏直达</span>
          <span style="font-size: 0.7rem; color: var(--color-accent-primary); font-weight: 500;">快捷跳转 ➔</span>
        </div>
        <div class="sr-series-grid">
          ${seriesHtml}
        </div>
      </div>
    `;
    searchResults.classList.add('active');
    bindFilterChips();
  }

  function bindFilterChips() {
    if (!searchResults) return;
    const chips = searchResults.querySelectorAll('.sr-filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentFilter = chip.getAttribute('data-filter') || 'all';
        chips.forEach(c => c.classList.toggle('active', c === chip));
        if (searchInput && searchInput.value.trim()) {
          performSearch(searchInput.value);
        } else {
          displaySmartRecs();
        }
      });
    });
  }

  async function performSearch(query) {
    if (!query || !query.trim()) {
      displaySmartRecs();
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

    // 自动检测 @ 前缀筛选
    let cleanQuery = query.trim();
    if (cleanQuery.startsWith('@ai')) {
      currentFilter = 'ai';
      cleanQuery = cleanQuery.replace(/^@ai\s*/i, '');
    } else if (cleanQuery.startsWith('@android')) {
      currentFilter = 'android';
      cleanQuery = cleanQuery.replace(/^@android\s*/i, '');
    } else if (cleanQuery.startsWith('@kotlin')) {
      currentFilter = 'kotlin';
      cleanQuery = cleanQuery.replace(/^@kotlin\s*/i, '');
    } else if (cleanQuery.startsWith('@devops')) {
      currentFilter = 'devops';
      cleanQuery = cleanQuery.replace(/^@devops\s*/i, '');
    } else if (cleanQuery.startsWith('@thought')) {
      currentFilter = 'thought';
      cleanQuery = cleanQuery.replace(/^@thought\s*/i, '');
    }

    let rawPosts = searchData.posts || [];
    if (currentFilter !== 'all') {
      rawPosts = rawPosts.filter(p => {
        const cat = (p.category || '').toLowerCase();
        const tags = (p.tags || []).join(' ').toLowerCase();
        if (currentFilter === 'ai') return cat.includes('ai') || tags.includes('ai') || tags.includes('agent') || tags.includes('llm');
        if (currentFilter === 'android') return cat.includes('android') || tags.includes('compose') || tags.includes('android');
        if (currentFilter === 'kotlin') return cat.includes('kotlin') || tags.includes('coroutine') || tags.includes('flow') || tags.includes('kmp');
        if (currentFilter === 'devops') return cat.includes('devops') || tags.includes('docker') || tags.includes('ci') || tags.includes('gradle');
        if (currentFilter === 'thought') return cat.includes('思考') || cat.includes('thought') || tags.includes('成长') || tags.includes('思维');
        return true;
      });
    }

    let matched = [];
    if (!cleanQuery) {
      matched = rawPosts.slice(0, 8);
    } else if (fuse && currentFilter === 'all') {
      try {
        matched = fuse.search(cleanQuery).slice(0, 8).map(r => r.item);
      } catch (e) {
        matched = nativeSearchWithPool(cleanQuery, rawPosts);
      }
    } else {
      matched = nativeSearchWithPool(cleanQuery, rawPosts);
    }

    displayResults(matched, cleanQuery);
  }

  function nativeSearchWithPool(query, pool) {
    const q = query.toLowerCase().trim();
    if (!q) return pool.slice(0, 8);
    const terms = q.split(/\s+/).filter(Boolean);

    const scored = pool.map(post => {
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

  function displayResults(results, query) {
    if (!searchResults) return;
    const filterBar = getFilterBarHtml();

    if (!results || results.length === 0) {
      searchResults.innerHTML = `
        ${filterBar}
        <div class="sr-empty">
          <div class="sr-empty-icon">🔍</div>
          <div>未找到包含 <strong>"${escapeHtml(query)}"</strong> 的文章</div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">建议尝试切换顶部分类标签或尝试：Android、Kotlin、AI Agent、架构 等关键词</div>
        </div>`;
      searchResults.classList.add('active');
      bindFilterChips();
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

    searchResults.innerHTML = filterBar + headerHtml + itemsHtml;
    searchResults.classList.add('active');
    bindFilterChips();
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
        debounceTimer = setTimeout(() => performSearch(e.target.value), 100);
      });

      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) {
          performSearch(searchInput.value);
        } else {
          loadSearchData();
          loadFuse();
          displaySmartRecs();
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
          displaySmartRecs();
          searchInput.focus();
        }
      });
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.blog-search-bar') && !e.target.closest('.hero-search-bar') && !e.target.closest('.hero-search-wrapper') && !e.target.closest('.blog-search-results')) {
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
