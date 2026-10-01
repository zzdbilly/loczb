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
    // 索引已瘦身：excerpt 不再内联（改为命中后按需拉 sidecar），故 Fuse 不再索引该字段
    fuse = new Fuse(searchData.posts, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'category', weight: 0.2 },
        { name: 'tags', weight: 0.2 }
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
    if (!query || !query.trim()) return escapeHtml(text);

    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (!terms.length) return escapeHtml(text);

    const pattern = terms
      .map(t => t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'))
      .filter(Boolean)
      .join('|');

    if (!pattern) return escapeHtml(text);

    try {
      const regex = new RegExp(`(${pattern})`, 'gi');
      return text.split(regex).map(part => {
        if (!part) return '';
        return regex.test(part) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part);
      }).join('');
    } catch (e) {
      return escapeHtml(text);
    }
  }

  function nativeSearch(query) {
    const q = query.toLowerCase().trim();
    if (!q || !searchData.posts) return [];

    const terms = q.split(/\s+/).filter(Boolean);

    const scored = searchData.posts.map(post => {
      let score = 0;
      const titleLower = (post.title || '').toLowerCase();
      const catLower = (post.category || '').toLowerCase();
      const tagsLower = (post.tags || []).join(' ').toLowerCase();

      for (const term of terms) {
        if (titleLower.includes(term)) score += 10;
        if (catLower.includes(term)) score += 5;
        if (tagsLower.includes(term)) score += 4;
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

  const CATEGORY_ICONS = {
    'AI': '🤖',
    'Android': '📱',
    'Kotlin': '⚡',
    '数据库': '🗄️',
    'DevOps': '🛠️',
    '思考': '💡',
    '安全': '🛡️',
    '前端': '🌐',
    '系统编程': '⚙️',
    '开发': '💻'
  };

  function getCategoryIcon(cat) {
    if (!cat) return '🏷️';
    return CATEGORY_ICONS[cat] || '🏷️';
  }

  function postMatchesCategory(post, filter) {
    if (!filter || filter === 'all') return true;
    const cat = (post.category || '').toLowerCase();
    const f = filter.toLowerCase();
    if (cat === f) return true;
    if (f === 'ai' && (cat.includes('ai') || cat.includes('agent') || cat.includes('llm'))) return true;
    if (f === 'devops' && (cat.includes('devops') || cat.includes('运维') || cat.includes('vps') || cat.includes('docker'))) return true;
    if (f === 'thought' || f === '思考') return cat.includes('思考') || cat.includes('thought');
    if (f === 'database' || f === '数据库') return cat.includes('数据库') || cat.includes('sql') || cat.includes('database');
    if (f === 'security' || f === '安全') return cat.includes('安全') || cat.includes('security');
    if (f === 'android') return cat.includes('android') || cat.includes('compose');
    if (f === 'kotlin') return cat.includes('kotlin');
    if (f === '前端') return cat.includes('前端') || cat.includes('web') || cat.includes('css') || cat.includes('js');
    if (f === '系统编程') return cat.includes('系统编程') || cat.includes('linux') || cat.includes('c++') || cat.includes('rust');
    if (f === '开发') return cat.includes('开发') || cat.includes('工程');

    const tags = (post.tags || []).map(t => t.toLowerCase());
    return tags.includes(f);
  }


  // 动态分面标签生成器：根据当前搜索词匹配的所有文章，动态提取命中的分类和篇数
  function getDynamicFilterBarHtml(matchedPosts, activeFilter) {
    if (!matchedPosts || matchedPosts.length === 0) return '';

    const catCounts = {};
    matchedPosts.forEach(p => {
      const c = p.category || '未分类';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const cats = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);

    const filters = [{
      id: 'all',
      label: '全部',
      count: matchedPosts.length
    }].concat(
      cats.map(c => ({
        id: c,
        label: `${getCategoryIcon(c)} ${c}`,
        count: catCounts[c]
      }))
    );

    return `
      <div class="sr-filter-bar">
        ${filters.map(f => `
          <button type="button" class="sr-filter-chip ${activeFilter === f.id ? 'active' : ''}" data-filter="${escapeHtml(f.id)}">
            <span>${escapeHtml(f.label)}</span>
            <span class="sr-chip-count">${f.count}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  let lastMatchedPosts = [];
  let lastSearchQuery = '';

  function displaySmartRecs() {
    if (!searchResults) return;
    const isBlogDir = window.location.pathname.includes('/blog/');

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
      <div class="sr-rec-container">
        <div class="sr-rec-title">
          <span>📚 6 大精选旗舰专栏直达</span>
          <span style="font-size: 0.7rem; color: var(--color-accent-text); font-weight: 500;">快捷跳转 ➔</span>
        </div>
        <div class="sr-series-grid">
          ${seriesHtml}
        </div>
        <div class="sr-quick-hint">
          <span>⚡ 即时全文模糊检索 · 支持标题、分类与标签</span>
          <span>按 <kbd>ESC</kbd> 关闭</span>
        </div>
      </div>
    `;
    searchResults.classList.add('active');
  }

  function bindFilterChips(query) {
    if (!searchResults) return;
    const chips = searchResults.querySelectorAll('.sr-filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selected = chip.getAttribute('data-filter') || 'all';
        currentFilter = selected;

        if (query) {
          let displayed = lastMatchedPosts;
          if (currentFilter !== 'all') {
            displayed = lastMatchedPosts.filter(p => postMatchesCategory(p, currentFilter));
          }
          displayResults(displayed, query, lastMatchedPosts, currentFilter);
        }
      });
    });
  }

  async function performSearch(query, keepFilter) {
    if (!query || !query.trim()) {
      currentFilter = 'all';
      lastMatchedPosts = [];
      lastSearchQuery = '';
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

    let cleanQuery = query.trim();

    // 当搜索词变动且未强制保留分类时，重置分类为 'all'
    if (cleanQuery !== lastSearchQuery && !keepFilter) {
      currentFilter = 'all';
    }
    lastSearchQuery = cleanQuery;

    // 自动检测 @ 前缀筛选
    const atMatch = cleanQuery.match(/^@([a-zA-Z0-9_\u4e00-\u9fa5]+)\s*/);
    if (atMatch) {
      currentFilter = atMatch[1];
      cleanQuery = cleanQuery.replace(/^@[^\s]+\s*/, '');
    }

    const allPosts = searchData.posts || [];
    let matched = [];

    if (!cleanQuery) {
      matched = allPosts.slice();
    } else {
      if (fuse) {
        try {
          matched = fuse.search(cleanQuery).map(r => r.item);
        } catch (e) {
          matched = nativeSearchWithPool(cleanQuery, allPosts);
        }
      } else {
        matched = nativeSearchWithPool(cleanQuery, allPosts);
      }
    }

    lastMatchedPosts = matched;

    let displayedPosts = matched;
    if (currentFilter && currentFilter !== 'all') {
      displayedPosts = matched.filter(p => postMatchesCategory(p, currentFilter));
    }

    displayResults(displayedPosts, cleanQuery, matched, currentFilter);
  }

  function nativeSearchWithPool(query, pool) {
    const q = query.toLowerCase().trim();
    if (!q) return pool.slice(0, 8);
    const terms = q.split(/\s+/).filter(Boolean);

    const scored = pool.map(post => {
      let score = 0;
      const titleLower = (post.title || '').toLowerCase();
      const catLower = (post.category || '').toLowerCase();
      const tagsLower = (post.tags || []).join(' ').toLowerCase();

      for (const term of terms) {
        if (titleLower.includes(term)) score += 10;
        if (catLower.includes(term)) score += 5;
        if (tagsLower.includes(term)) score += 4;
      }

      return { post, score };
    }).filter(item => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map(s => s.post);
  }

  function displayResults(results, query, allMatched, activeFilter) {
    if (!searchResults) return;
    allMatched = allMatched || results || [];
    activeFilter = activeFilter || 'all';

    const filterBar = getDynamicFilterBarHtml(allMatched, activeFilter);

    if (!results || results.length === 0) {
      searchResults.innerHTML = `
        ${filterBar}
        <div class="sr-empty">
          <div class="sr-empty-icon">🔍</div>
          <div>未找到包含 <strong>"${escapeHtml(query)}"</strong> 的文章</div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">建议尝试点击上方分类标签或尝试：数据库、Android、Kotlin、AI、架构 等关键词</div>
        </div>`;
      searchResults.classList.add('active');
      bindFilterChips(query);
      return;
    }

    const filterLabel = activeFilter === 'all' ? '' : ` · 筛选「${activeFilter}」`;
    const headerHtml = `
      <div class="sr-header">
        <span>找到 ${results.length} 篇相关文章${escapeHtml(filterLabel)}</span>
        <span>↑↓ 导航 · Enter 确认 · ESC 关闭</span>
      </div>`;

    const isBlogDir = window.location.pathname.includes('/blog/');
    const itemsHtml = results.map((post, idx) => {
      const title = highlightText(post.title, query);
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
          <span style="font-size: 0.75rem; color: var(--color-accent-text);">➔</span>
        </div>
        <div class="sr-excerpt" data-meta-slug="${escapeHtml(postSlug)}"></div>
        <div class="sr-meta">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: -1px; margin-right: 3px; opacity: 0.7;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${date}</span>
          <span class="sr-category">${category}</span>
          ${tags ? `<span>${tags}</span>` : ''}
        </div>
      </a>`;
    }).join('');

    searchResults.innerHTML = filterBar + headerHtml + itemsHtml;
    searchResults.classList.add('active');
    bindFilterChips(query);
    fillExcerpts(results, query);
  }

  // 摘要按需加载：只对当前真正展示的 ≤8 条结果拉 blog/meta/{slug}.json，结果由
  // window.LoczbMeta 缓存（同一篇文章不会重复请求）
  let excerptToken = 0;

  function fillExcerpts(results, query) {
    if (!window.LoczbMeta) return;
    const token = ++excerptToken;
    results.forEach(post => {
      const slug = post.slug || (post.url || '').replace(/^blog\/posts\//, '').replace(/\.html$/, '');
      if (!slug) return;
      const apply = (meta) => {
        if (token !== excerptToken) return;
        const el = searchResults && searchResults.querySelector(`.sr-excerpt[data-meta-slug="${slug}"]`);
        if (el && meta && meta.description) el.innerHTML = highlightText(meta.description, query);
      };
      const cached = window.LoczbMeta.cached(slug);
      if (cached) apply(cached);
      else window.LoczbMeta.get(slug).then(apply);
    });
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
        // 交互时才懒加载索引数据与 Fuse.js（不再在页面加载时预取）
        loadSearchData();
        loadFuse();
        if (searchInput.value.trim()) {
          performSearch(searchInput.value);
        } else {
          displaySmartRecs();
        }
      });

      // 鼠标悬停搜索框即预热：提前拉取索引与 Fuse.js，减少首次输入的等待
      const searchWrap = searchInput.closest('.hero-search-bar, .blog-search-bar, .hero-search-wrapper');
      if (searchWrap) {
        searchWrap.addEventListener('mouseenter', () => {
          loadSearchData();
          loadFuse();
        }, { passive: true, once: true });
      }

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
    // 索引数据与 Fuse.js 均改为交互懒加载（focus / hover / Cmd-Ctrl-K→focus），
    // 页面加载时零额外请求，避免 102KB JSON + Fuse.js 阻塞首屏
    bindEvents();
    initShortcut();
  });
})();
