/**
 * Blog Search - Fuse.js powered fuzzy search
 * 搜索文章标题、摘要、标签、分类
 */
(function() {
  'use strict';

  let fuse;
  let searchData = { posts: [], tagCloud: [], archives: [] };
  const searchInput = document.getElementById('blog-search-input');
  const searchResults = document.getElementById('blog-search-results');
  const searchClear = document.querySelector('.search-clear');

  // 加载搜索数据
  async function loadSearchData() {
    try {
      const resp = await fetch('articles-index.json');
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
      
      // 渲染标签云
      renderTagCloud(data.tagCloud);
      
      // 渲染归档视图
      renderArchive(data.archives);
    } catch (e) {
      console.error('加载搜索数据失败:', e);
    }
  }

  // 渲染标签云
  function renderTagCloud(tagCloud) {
    const container = document.getElementById('tag-cloud');
    if (!container || !tagCloud.length) return;

    // 取前 20 个高频标签
    const topTags = tagCloud.slice(0, 20);
    container.innerHTML = topTags.map(tag => `
      <button class="tag-cloud-item" data-tag="${tag.tag}">
        ${tag.tag}<span class="tag-count">${tag.count}</span>
      </button>
    `).join('');

    // 绑定点击事件
    container.querySelectorAll('.tag-cloud-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.tag;
        // 搜索包含该标签的文章
        searchByTag(tag);
      });
    });
  }

  // 按标签搜索 - 直接渲染到列表
  function searchByTag(tag) {
    if (!fuse) return;
    
    // 激活标签样式
    document.querySelectorAll('.tag-cloud-item').forEach(b => {
      b.classList.toggle('active', b.dataset.tag === tag);
    });
    // 清除搜索框
    searchInput.value = '';
    searchResults.classList.remove('active');
    searchClear.classList.remove('visible');
    
    const results = searchData.posts.filter(post => 
      post.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
    
    // 直接渲染到页面列表
    renderPostsToList(results, `标签: ${tag}`);
  }

  // 渲染文章到列表容器
  function renderPostsToList(posts, title) {
    const container = document.querySelector('.blog-list-container');
    const pagination = document.getElementById('pagination');
    const filterTitle = document.getElementById('blog-filter-title');
    
    if (!container) return;
    
    // 确保在列表视图
    container.classList.remove('hidden');
    pagination.classList.remove('hidden');
    document.getElementById('archive-view')?.classList.remove('active');
    
    // 更新标题
    if (filterTitle) filterTitle.textContent = title || '全部文章';
    
    // 渲染文章
    container.innerHTML = posts.map(post => `
      <article class="blog-list-item" data-category="${post.category}">
        <div class="blog-list-meta">
          <time datetime="${post.date}">${post.date}</time>
          <span class="blog-list-tag">${post.category}</span>
        </div>
        <h3 class="blog-list-title">
          <a href="posts/${post.slug}.html">${post.title}</a>
        </h3>
        <p class="blog-list-excerpt">${post.excerpt}</p>
      </article>
    `).join('');
    
    // 隐藏分页
    pagination.style.display = 'none';
    
    // 添加返回全部按钮
    if (title) {
      const backBtn = document.createElement('div');
      backBtn.id = 'tag-search-back';
      backBtn.innerHTML = `<button onclick="clearTagFilter()" style="margin: 1rem auto; padding: 0.5rem 1.5rem; border-radius: var(--radius-full); border: 1px solid var(--color-border); background: var(--color-bg-secondary); color: var(--color-text-secondary); cursor: pointer;">← 显示全部文章</button>`;
      container.before(backBtn);
    }
  }

  // 清除标签过滤
  window.clearTagFilter = function() {
    const backBtn = document.getElementById('tag-search-back');
    if (backBtn) backBtn.remove();
    
    document.querySelectorAll('.tag-cloud-item').forEach(b => b.classList.remove('active'));
    document.getElementById('pagination').style.display = 'flex';
    
    // 重新加载原始列表（刷新页面最简单）
    window.location.reload();
  };

  // 渲染归档视图
  function renderArchive(archives) {
    const container = document.getElementById('archive-view');
    if (!container || !archives.length) return;

    const monthNames = { '01': '一月', '02': '二月', '03': '三月', '04': '四月', '05': '五月', '06': '六月', '07': '七月', '08': '八月', '09': '九月', '10': '十月', '11': '十一月', '12': '十二月' };
    
    container.innerHTML = archives.map(arch => {
      const [year, month] = arch.month.split('-');
      const monthName = monthNames[month] || month;
      
      return `
        <div class="archive-month">
          <h3 class="archive-month-header">${year}年 ${monthName}<span class="archive-count">${arch.count} 篇</span></h3>
          ${arch.posts.map(post => `
            <div class="archive-post">
              <span class="archive-post-date">${post.date}</span>
              <span class="archive-post-title"><a href="${post.url.replace('blog/posts/', 'posts/')}">${post.title}</a></span>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');
  }

  // 切换视图
  window.toggleBlogView = function(view) {
    const listContainer = document.querySelector('.blog-list-container');
    const pagination = document.getElementById('pagination');
    const archiveView = document.getElementById('archive-view');
    const buttons = document.querySelectorAll('.view-toggle-btn');
    
    // Toggle button active state
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    if (view === 'list') {
      listContainer.classList.remove('hidden');
      pagination.classList.remove('hidden');
      archiveView.classList.remove('active');
    } else {
      listContainer.classList.add('hidden');
      pagination.classList.add('hidden');
      archiveView.classList.add('active');
    }
  };

  // 执行搜索
  function performSearch(query) {
    if (!query.trim()) {
      searchResults.classList.remove('active');
      searchClear.classList.remove('visible');
      // 清除标签激活状态
      document.querySelectorAll('.tag-cloud-item').forEach(b => b.classList.remove('active'));
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
      <a href="${post.url.replace('blog/posts/', 'posts/')}" class="sr-item">
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