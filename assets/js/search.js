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
      
      const resp = await fetch('/blog/articles-index.json?t=' + Date.now());
      const data = await resp.json();
      searchData = data;
      
      // 初始化 Fuse.js
      // minMatchCharLength: 1 — 支持单字中文搜索
      // threshold: 0.35 — 稍宽松，允许中文模糊匹配
      // ignoreLocation: true — 中文文本中关键词可能分散在长文本各处
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
      fuse = new Fuse(data.posts, options);
    } catch (e) {
      console.error('加载搜索数据失败:', e);
    }
  }

  // 中文分词：将查询拆分为关键词数组
  // 策略：按空格/标点分词，英文整词保留，中文按字/双字组合
  function tokenizeQuery(query) {
    const tokens = [];
    // 按空格、逗号、顿号等分隔符拆分
    const rawTokens = query.split(/[\s,，、;；|]+/).filter(t => t.length > 0);
    
    rawTokens.forEach(token => {
      // 英文/数字：整体作为一个 token
      if (/^[a-zA-Z0-9\-_.]+$/.test(token)) {
        tokens.push(token);
      } else {
        // 中文：把整个 token 作为一个关键词
        // 同时拆出双字组合和单字，用于高亮匹配
        tokens.push(token);
        // 如果中文词超过 2 字，额外添加双字滑窗
        if (token.length > 2) {
          for (let i = 0; i < token.length - 1; i++) {
            const bigram = token.substring(i, i + 2);
            if (!tokens.includes(bigram)) tokens.push(bigram);
          }
        }
        // 单字也加入，用于短查询高亮
        if (token.length > 1) {
          for (let i = 0; i < token.length; i++) {
            const char = token[i];
            if (!tokens.includes(char)) tokens.push(char);
          }
        }
      }
    });
    return tokens;
  }

  // 构建高亮正则：支持多关键词高亮
  function buildHighlightRegex(tokens) {
    if (!tokens || tokens.length === 0) return null;
    // 按 token 长度降序排列，优先匹配长词
    const sorted = [...new Set(tokens)].sort((a, b) => b.length - a.length);
    const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`(${escaped.join('|')})`, 'gi');
  }

  // 高亮文本：在标题和摘要中高亮匹配的关键词
  function highlightText(text, highlightRegex) {
    if (!text || !highlightRegex) return escapeHtml(text);
    const escaped = escapeHtml(text);
    return escaped.replace(highlightRegex, '<mark>$1</mark>');
  }

  // HTML 转义
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    
    // 构建高亮正则（用分词后的结果）
    const tokens = tokenizeQuery(query);
    const highlightRegex = buildHighlightRegex(tokens);
    
    displayResults(results.map(r => r.item), highlightRegex, query);
  }

  // 显示结果
  function displayResults(results, highlightRegex, query) {
    if (!searchResults) return;
    
    if (results.length === 0) {
      searchResults.innerHTML = `<div class="sr-empty">没有找到 "${escapeHtml(query)}" 相关的文章</div>`;
      searchResults.classList.add('active');
      return;
    }

    searchResults.innerHTML = results.map(post => {
      const title = highlightText(post.title, highlightRegex);
      const excerpt = highlightText(post.excerpt, highlightRegex);
      const category = escapeHtml(post.category || '');
      const date = escapeHtml(post.date || '');
      
      // 显示标签（最多 3 个）
      const tags = (post.tags || []).slice(0, 3).map(tag => 
        `<span class="sr-tag">${escapeHtml(tag)}</span>`
      ).join('');
      
      return `
      <a href="/blog/posts/${(post.url || '').replace('blog/posts/', '')}" class="sr-item">
        <div class="sr-title">${title}</div>
        <div class="sr-excerpt">${excerpt}</div>
        <div class="sr-meta">
          <span class="sr-date">${date}</span>
          <span class="sr-category">${category}</span>
          ${tags ? `<span class="sr-tags">${tags}</span>` : ''}
        </div>
      </a>`;
    }).join('');
    
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
