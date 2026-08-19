/**
 * Blog Search - Fuse.js powered fuzzy search
 * 搜索文章标题、摘要、标签、分类
 * 支持中文分词、关键词高亮、分类标签显示
 */
(function() {
  'use strict';

  let fuse;
  let searchData = { posts: [], archives: [] };
  let fuseLoaded = false;
  const searchInput = document.getElementById('blog-search-input');
  const searchResults = document.getElementById('blog-search-results');
  const searchClear = document.getElementById('search-clear-btn') || document.querySelector('.search-clear');
  const searchKbd = document.getElementById('search-kbd-badge') || document.querySelector('.search-kbd');
  let selectedIndex = -1;

  // 动态加载 Fuse.js(优先本地 vendor 按需加载,不阻塞首屏)
  async function loadFuse() {
    if (fuseLoaded) return true;
    if (typeof Fuse !== 'undefined') { fuseLoaded = true; return true; }
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/assets/vendor/fuse/fuse.min.js';
        script.onload = () => { fuseLoaded = true; resolve(); };
        script.onerror = () => {
          // CDN 回退
          const fallback = document.createElement('script');
          fallback.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
          fallback.onload = () => { fuseLoaded = true; resolve(); };
          fallback.onerror = reject;
          document.head.appendChild(fallback);
        };
        document.head.appendChild(script);
      });
      return true;
    } catch (e) {
      console.error('Fuse.js 加载失败:', e);
      return false;
    }
  }

  // 加载搜索数据（带 sessionStorage 缓存，5 分钟过期）
  const CACHE_KEY = 'loczb-search-data';
  const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

  async function loadSearchData() {
    try {
      // 检查 sessionStorage 缓存
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) {
          searchData = parsed.data;
          initFuse();
          return;
        }
      }

      const loaded = await loadFuse();
      if (!loaded) return;
      
      const resp = await fetch('/blog/articles-index.json');
      const data = await resp.json();
      searchData = data;

      // 写入缓存
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      } catch (e) {
        // sessionStorage 满了或不可用，忽略
      }

      initFuse();
    } catch (e) {
      console.error('加载搜索数据失败:', e);
    }
  }

  // 初始化 Fuse.js
  function initFuse() {
    const options = {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'excerpt', weight: 0.25 },
        { name: 'tags', weight: 0.2 },
        { name: 'category', weight: 0.15 }
      ],
      threshold: 0.35,
      includeMatches: true,
      minMatchCharLength: 1,
      ignoreLocation: true,
      findAllMatches: true
    };
    fuse = new Fuse(searchData.posts, options);
  }

  // 中文分词
  function tokenizeQuery(query) {
    const tokens = [];
    const clean = query.trim().toLowerCase();
    if (!clean) return tokens;

    const parts = clean.split(/[\s,，、;；|/]+/);
    for (const part of parts) {
      if (!part) continue;
      tokens.push(part);
      const isChinese = /[\u4e00-\u9fa5]/.test(part);
      if (isChinese && part.length > 2) {
        for (let i = 0; i < part.length - 1; i++) {
          tokens.push(part.substring(i, i + 2));
        }
      }
    }
    return [...new Set(tokens)];
  }

  // 构建高亮正则:支持多关键词高亮
  function buildHighlightRegex(tokens) {
    if (!tokens.length) return null;
    // 按 token 长度降序排列,优先匹配长词
    const sorted = [...tokens].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(${escaped.join('|')})`, 'gi');
  }

  // 高亮文本:在标题和摘要中高亮匹配的关键词
  function highlightText(text, regex) {
    if (!text || !regex) return escapeHtml(text || '');
    const parts = text.split(regex);
    return parts.map(part => {
      if (regex.test(part)) {
        return `<mark>${escapeHtml(part)}</mark>`;
      }
      return escapeHtml(part);
    }).join('');
  }

  // HTML 转义
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 执行搜索
  function performSearch(query) {
    selectedIndex = -1;
    if (!query.trim()) {
      if (searchResults) searchResults.classList.remove('active');
      if (searchClear) searchClear.classList.remove('visible');
      if (searchKbd) searchKbd.style.display = '';
      return;
    }

    if (searchClear) searchClear.classList.add('visible');
    if (searchKbd) searchKbd.style.display = 'none';

    if (!fuse) {
      loadSearchData().then(() => performSearch(query));
      return;
    }

    // 搜索
    const results = fuse.search(query).slice(0, 8);

    // 构建高亮正则(用分词后的结果)
    const tokens = tokenizeQuery(query);
    const highlightRegex = buildHighlightRegex(tokens);

    displayResults(results.map(r => r.item), highlightRegex, query);
  }

  // 显示结果
  function displayResults(results, highlightRegex, query) {
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div class="sr-empty">
          <div class="sr-empty-icon">🔍</div>
          <div>未找到包含 <strong>"${escapeHtml(query)}"</strong> 的文章</div>
          <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.25rem;">建议尝试：Android、Kotlin、AI Agent、架构 等关键词</div>
        </div>`;
      searchResults.classList.add('active');
      return;
    }

    const headerHtml = `
      <div class="sr-header">
        <span>找到 ${results.length} 篇相关文章</span>
        <span>↑↓ 导航 · Enter 确认 · ESC 关闭</span>
      </div>`;

    const itemsHtml = results.map((post, idx) => {
      const title = highlightText(post.title, highlightRegex);
      const excerpt = highlightText(post.excerpt, highlightRegex);
      const category = escapeHtml(post.category || '');
      const date = escapeHtml(post.date || '');
      const postUrl = (post.url || '').replace(/^blog\/posts\//, 'posts/').replace(/^\/blog\/posts\//, 'posts/');

      const tags = (post.tags || []).slice(0, 3).map(tag =>
        `<span style="color: var(--color-text-muted);">#${escapeHtml(tag)}</span>`
      ).join(' ');

      return `
      <a href="${postUrl.startsWith('posts/') ? postUrl : 'posts/' + postUrl}" class="sr-item" data-index="${idx}">
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
    const items = searchResults.querySelectorAll('.sr-item');
    items.forEach((item, idx) => {
      item.classList.toggle('sr-selected', idx === selectedIndex);
      if (idx === selectedIndex) {
        item.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // 绑定事件
  function bindEvents() {
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(e.target.value), 180);
      });

      searchInput.addEventListener('keydown', (e) => {
        if (!searchResults.classList.contains('active')) return;
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
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          performSearch('');
          searchInput.focus();
        }
      });
    }

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.blog-search-bar')) {
        if (searchResults) searchResults.classList.remove('active');
      }
    });
  }

  // 全局 Ctrl+K / Cmd+K 快捷键
  function initShortcut() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+K 或 Cmd+K(Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    });
  }

  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    loadSearchData();
    bindEvents();
    initShortcut();
  });
})();
