/**
 * Blog Search - Fuse.js powered fuzzy search
 * 搜索文章标题、摘要、标签、分类
 */
(function() {
  'use strict';

  let fuse;
  let searchData = { posts: [], archives: [] };
  let fuseLoaded = false;
  const searchInput = document.getElementById('blog-search-input');
  const searchResults = document.getElementById('blog-search-results');
  const searchClear = document.querySelector('.search-clear');

  // 动态加载 Fuse.js（按需加载，不阻塞首屏）
  async function loadFuse() {
    if (fuseLoaded) return true;
    if (typeof Fuse !== 'undefined') { fuseLoaded = true; return true; }
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
        script.onload = () => { fuseLoaded = true; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      return true;
    } catch (e) {
      console.error('Fuse.js 加载失败:', e);
      return false;
    }
  }

  // 加载搜索数据
  async function loadSearchData() {
    try {
      const loaded = await loadFuse();
      if (!loaded) return;
      
      const resp = await fetch('articles-index.json?t=' + Date.now());
      const data = await resp.json();
      searchData = data;
      
      // 初始化 Fuse.js
      const options = {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'excerpt', weight: 0.25 },
          { name: 'tags', weight: 0.25 },
          { name: 'category', weight: 0.1 }
        ],
        threshold: 0.3,
        includeMatches: true,
        minMatchCharLength: 2
      };
      fuse = new Fuse(data.posts, options);
    } catch (e) {
      console.error('加载搜索数据失败:', e);
    }
  }

  // 执行搜索
  function performSearch(query) {
    if (!query.trim()) {
      searchResults.classList.remove('active');
      searchClear.classList.remove('visible');
      return;
    }

    searchClear.classList.add('visible');
    
    // 搜索
    const results = fuse.search(query).slice(0, 10);
    displayResults(results.map(r => r.item), query);
  }

  // 显示结果
  function displayResults(results, query) {
    if (!searchResults) return;
    
    if (results.length === 0) {
      searchResults.innerHTML = `<div class="sr-empty">没有找到 "${query}" 相关的文章</div>`;
      searchResults.classList.add('active');
      return;
    }

    const highlight = (text, q) => {
      if (!q) return text;
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark>$1</mark>');
    };

    searchResults.innerHTML = results.map(post => `
      <a href="posts/${post.url.replace('blog/posts/', '')}" class="sr-item">
        <div class="sr-title">${highlight(post.title, query)}</div>
        <div class="sr-excerpt">${highlight(post.excerpt, query)}</div>
        <div class="sr-meta">${post.date} · ${post.category}</div>
      </a>
    `).join('');
    
    searchResults.classList.add('active');
  }

  // 绑定事件
  function bindEvents() {
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => performSearch(e.target.value), 200);
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        performSearch('');
        searchInput.focus();
      });
    }

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.blog-search-bar')) {
        searchResults.classList.remove('active');
      }
    });
  }

  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    loadSearchData();
    bindEvents();
  });
})();