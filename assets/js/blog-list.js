// 博客列表：分页 + 筛选 + 视图切换（从 blog/index.html 内联脚本抽离）
// 博客列表分页 + 筛选 - 稳定方案
    var POSTS_PER_PAGE = 10;
    var allPosts = document.querySelectorAll('.blog-list-item');
    var filteredPosts = Array.from(allPosts); // 筛选后的文章
    var totalPages = 1;
    var currentPage = 1;
    var currentFilter = 'all';
    // 计算总页数
    function calcTotalPages() {
      return Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
    }
    // 从 URL 读取参数
    function initFromURL() {
      var params = new URLSearchParams(window.location.search);
      var pageParam = params.get('page');
      var filterParam = params.get('filter');
      if (filterParam) currentFilter = filterParam;
      if (pageParam && !isNaN(pageParam)) {
        currentPage = Math.max(1, parseInt(pageParam));
      }
    }
    // 应用筛选
    function applyFilter(filter) {
      currentFilter = filter;
      currentPage = 1; // 筛选后重置到第一页
      // 更新筛选按钮
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('filter-btn-active', btn.dataset.filter === filter);
        btn.setAttribute('aria-selected', btn.dataset.filter === filter);
      });
      // 筛选文章
      filteredPosts = filter === 'all' 
        ? Array.from(allPosts)
        : Array.from(allPosts).filter(post => post.dataset.category === filter);
      // 更新标题显示
      var titleEl = document.getElementById('blog-filter-title');
      if (titleEl) {
        if (filter === 'all') {
          titleEl.textContent = '全部文章';
        } else {
          titleEl.textContent = filter + ' 文章 · ' + filteredPosts.length + ' 篇';
        }
      }
      totalPages = calcTotalPages();
      showPage(1);
      // 更新 URL
      var params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (currentPage > 1) params.set('page', currentPage);
      var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
      window.history.pushState({ page: currentPage, filter: filter }, '', newUrl);
    }
    // 显示指定页
    window.showPage = function(page) {
      if (page < 1 || page > totalPages) return;
      // 先隐藏所有文章
      allPosts.forEach(post => post.style.display = 'none');
      // 显示当前页的筛选文章
      var start = (page - 1) * POSTS_PER_PAGE;
      var end = start + POSTS_PER_PAGE;
      filteredPosts.slice(start, end).forEach(post => post.style.display = '');
      currentPage = page;
      updatePagination(page);
      // 更新 URL
      var params = new URLSearchParams();
      if (currentFilter !== 'all') params.set('filter', currentFilter);
      if (page > 1) params.set('page', page);
      var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
      window.history.pushState({ page: page, filter: currentFilter }, '', newUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // 更新分页按钮
    function updatePagination(page) {
      var container = document.getElementById('pagination');
      if (!container) return;
      if (totalPages <= 1) {
        container.innerHTML = '';
        return;
      }
      var prevDisabled = page === 1 ? 'disabled' : '';
      var nextDisabled = page === totalPages ? 'disabled' : '';
      container.innerHTML = [
        '<a href="#" class="pagination-btn ' + prevDisabled + '" onclick="event.preventDefault(); showPage(' + (page - 1) + ')">← 上一页</a>',
        '<span class="pagination-info">第 ' + page + ' / ' + totalPages + ' 页（共 ' + filteredPosts.length + ' 篇）</span>',
        '<a href="#" class="pagination-btn ' + nextDisabled + '" onclick="event.preventDefault(); showPage(' + (page + 1) + ')">下一页 →</a>'
      ].join('');
    }
    // 初始化
    window.addEventListener('DOMContentLoaded', function() {
      initFromURL();
      // 设置初始筛选状态
      if (currentFilter !== 'all') {
        applyFilter(currentFilter);
      } else {
        totalPages = calcTotalPages();
        showPage(currentPage);
      }
      // 绑定筛选按钮
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          applyFilter(this.dataset.filter);
        });
      });
      // 处理浏览器后退
      window.addEventListener('popstate', function(e) {
        if (e.state) {
          currentPage = e.state.page || 1;
          currentFilter = e.state.filter || 'all';
          filteredPosts = currentFilter === 'all' 
            ? Array.from(allPosts)
            : Array.from(allPosts).filter(post => post.dataset.category === currentFilter);
          totalPages = calcTotalPages();
          // 更新筛选按钮
          document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('filter-btn-active', btn.dataset.filter === currentFilter);
          });
          showPage(currentPage);
        } else {
          applyFilter('all');
        }
      });
    });
    // 归档功能
    let archiveData = null;
    async function loadArchive() {
      try {
        const response = await fetch('../blog/articles-index.json?t=' + Date.now());
        const data = await response.json();
        // 生成归档数据
        const archives = {};
        data.posts.forEach(post => {
          const month = post.date.substring(0, 7);
          if (!archives[month]) archives[month] = [];
          archives[month].push({
            title: post.title,
            date: post.date,
            url: post.url,
            category: post.category
          });
        });
        // Convert to array and sort properly
        const months = Object.keys(archives).sort().reverse();
        archiveData = months.map(month => ({
          month,
          count: archives[month].length,
          posts: archives[month].sort((a, b) => b.date.localeCompare(a.date))
        }));
      } catch (e) {
        console.error('加载归档失败:', e);
      }
    }
    function renderArchive() {
      const container = document.getElementById('archive-view');
      if (!container || !archiveData) return;
      container.innerHTML = archiveData.map(m => `
        <div class="archive-month">
          <div class="archive-month-header">
            ${m.month} <span class="archive-count">${m.count} 篇</span>
          </div>
          ${m.posts.map(p => `
            <div class="archive-post">
              <span class="archive-post-date">${p.date.substring(0, 10)}</span>
              <span class="archive-post-title">
                <a href="posts/${p.url.replace('blog/posts/', '')}">${p.title}</a>
              </span>
              <span class="archive-post-cat">${p.category || ''}</span>
            </div>
          `).join('')}
        </div>
      `).join('');
    }
    let seriesData = null;
    async function loadSeries() {
      if (seriesData) return seriesData;
      const resp = await fetch('articles-index.json?t=' + Date.now());
      const data = await resp.json();
      seriesData = data.series || [];
      return seriesData;
    }
    function renderSeries(series) {
      const container = document.getElementById('series-view');
      if (!container || !series.length) {
        if (container) container.innerHTML = '<p style="text-align:center;color:var(--color-text-muted);padding:2rem;">暂无系列文章</p>';
        return;
      }
      container.innerHTML = series.map(s => `
        <div class="series-card">
          <div class="series-card-header">
            <div class="series-card-title">
              <span class="series-icon">📚</span>
              ${s.name}
            </div>
            <span class="series-card-count">${s.count} 篇</span>
          </div>
          <ul class="series-post-list">
            ${s.posts.map((p, i) => `
              <li class="series-post-item">
                <span class="series-post-num">${String(i + 1).padStart(2, '0')}</span>
                <span class="series-post-date">${p.date}</span>
                <span class="series-post-title"><a href="posts/${p.url.replace('blog/posts/', '')}">${p.title}</a></span>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('');
    }
    function toggleBlogView(view) {
      const listContainer = document.querySelector('.blog-list-container');
      const pagination = document.getElementById('pagination');
      const archiveView = document.getElementById('archive-view');
      const seriesView = document.getElementById('series-view');
      const listBtn = document.querySelector('[data-view="list"]');
      const archiveBtn = document.querySelector('[data-view="archive"]');
      const seriesBtn = document.querySelector('[data-view="series"]');
      // Reset all
      listContainer.classList.remove('hidden');
      if (pagination) pagination.classList.remove('hidden');
      archiveView.classList.remove('active');
      seriesView.classList.remove('active');
      listBtn.classList.remove('active');
      archiveBtn.classList.remove('active');
      if (seriesBtn) seriesBtn.classList.remove('active');
      if (view === 'archive') {
        listContainer.classList.add('hidden');
        if (pagination) pagination.classList.add('hidden');
        archiveView.classList.add('active');
        archiveBtn.classList.add('active');
        if (!archiveData) loadArchive().then(renderArchive).catch(e => console.error(e));
      } else if (view === 'series') {
        listContainer.classList.add('hidden');
        if (pagination) pagination.classList.add('hidden');
        seriesView.classList.add('active');
        seriesBtn.classList.add('active');
        if (!seriesData) {
          loadSeries().then(renderSeries).catch(e => console.error(e));
        } else {
          renderSeries(seriesData);
        }
      } else {
        listBtn.classList.add('active');
      }
    }
