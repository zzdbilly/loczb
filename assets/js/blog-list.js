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
    // 检查文章是否匹配筛选条件（支持 category 和 tags）
    function postMatchesFilter(post, filter) {
      if (filter === 'all' || filter === '全部') return true;
      // 1. 检查 data-category
      if (post.dataset.category === filter) return true;
      // 2. 检查 data-tags（逗号分隔的标签列表）
      var tagsStr = post.getAttribute('data-tags') || '';
      var tags = tagsStr ? tagsStr.split(',').filter(Boolean) : [];
      if (tags.indexOf(filter) !== -1) return true;
      // 3. 检查文章内 .tag / .tag-accent / .blog-list-tag 元素的文本
      var tagEls = post.querySelectorAll('.tag, .tag-accent, .blog-list-tag');
      for (var i = 0; i < tagEls.length; i++) {
        if (tagEls[i].textContent.trim() === filter) return true;
      }
      return false;
    }
    // 应用筛选（支持 category 和 tags，整合 main.js 的 _blogApplyFilter 逻辑）
    function applyFilter(filter) {
      currentFilter = filter;
      currentPage = 1; // 筛选后重置到第一页
      // 更新筛选按钮（.filter-btn 和 .tag）
      document.querySelectorAll('.filter-btn').forEach(btn => {
        var btnFilter = btn.dataset.filter || btn.textContent.trim();
        var isAll = btnFilter === 'all' || btnFilter === '全部';
        var isActive = (filter === 'all' || filter === '全部') ? isAll : (btnFilter === filter);
        btn.classList.toggle('filter-btn-active', isActive);
        btn.classList.toggle('tag-accent', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      // 筛选文章
      filteredPosts = (filter === 'all' || filter === '全部')
        ? Array.from(allPosts)
        : Array.from(allPosts).filter(post => postMatchesFilter(post, filter));
      // 更新标题显示
      var titleEl = document.getElementById('blog-filter-title');
      if (titleEl) {
        if (filter === 'all' || filter === '全部') {
          titleEl.textContent = '全部文章';
        } else {
          titleEl.textContent = filter + ' · ' + filteredPosts.length + ' 篇';
        }
      }
      // 显示/隐藏 Featured section（只在 "all" 时显示）
      var featuredSection = document.getElementById('featured-section');
      if (featuredSection) {
        var isAll = (filter === 'all' || filter === '全部');
        featuredSection.style.display = isAll ? '' : 'none';
      }
      // 显示/隐藏空状态
      var emptyState = document.getElementById('blog-empty-state');
      if (emptyState) {
        emptyState.style.display = filteredPosts.length === 0 ? 'block' : 'none';
      }
      totalPages = calcTotalPages();
      showPage(1);
      // 更新 URL
      var params = new URLSearchParams();
      if (filter !== 'all' && filter !== '全部') params.set('filter', filter);
      if (currentPage > 1) params.set('page', currentPage);
      var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
      window.history.pushState({ page: currentPage, filter: filter }, '', newUrl);
    }
    // 暴露到全局，让 main.js 的标签云点击可以调用
    // 加 _blogListJS 标记，让 main.js 的 initBlogFilters 检测到已由 blog-list.js 接管
    applyFilter._blogListJS = true;
    window._blogApplyFilter = applyFilter;
    window.applyFilter = applyFilter;
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
      if (currentFilter !== 'all' && currentFilter !== '全部') params.set('filter', currentFilter);
      if (page > 1) params.set('page', page);
      var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
      window.history.pushState({ page: page, filter: currentFilter }, '', newUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // 更新分页按钮 - 标准页码按钮组
    function updatePagination(page) {
      var container = document.getElementById('pagination');
      if (!container) return;
      if (totalPages <= 1) {
        container.innerHTML = '';
        return;
      }
      var html = '';
      // 上一页按钮
      if (page > 1) {
        html += '<a href="#" class="pagination-btn pagination-prev" onclick="event.preventDefault(); showPage(' + (page - 1) + ')">← 上一页</a>';
      } else {
        html += '<span class="pagination-btn disabled">← 上一页</span>';
      }
      // 生成页码按钮
      var pageNumbers = generatePageNumbers(page, totalPages);
      pageNumbers.forEach(function(item) {
        if (item === '...') {
          html += '<span class="pagination-ellipsis">···</span>';
        } else if (item === page) {
          html += '<span class="pagination-btn active">' + item + '</span>';
        } else {
          html += '<a href="#" class="pagination-btn" onclick="event.preventDefault(); showPage(' + item + ')">' + item + '</a>';
        }
      });
      // 下一页按钮
      if (page < totalPages) {
        html += '<a href="#" class="pagination-btn pagination-next" onclick="event.preventDefault(); showPage(' + (page + 1) + ')">下一页 →</a>';
      } else {
        html += '<span class="pagination-btn disabled">下一页 →</span>';
      }
      container.innerHTML = html;
    }
    // 生成页码数组（当前页前后各2页 + 首尾 + 省略号）
    function generatePageNumbers(current, total) {
      var pages = [];
      if (total <= 7) {
        // 总页数 <= 7，全部显示
        for (var i = 1; i <= total; i++) pages.push(i);
        return pages;
      }
      // 首页
      pages.push(1);
      var leftStart = Math.max(2, current - 2);
      var rightEnd = Math.min(total - 1, current + 2);
      // 左省略号
      if (leftStart > 2) {
        pages.push('...');
      }
      // 中间页码
      for (var i = leftStart; i <= rightEnd; i++) {
        pages.push(i);
      }
      // 右省略号
      if (rightEnd < total - 1) {
        pages.push('...');
      }
      // 尾页
      pages.push(total);
      return pages;
    }
    // 初始化
    window.addEventListener('DOMContentLoaded', function() {
      // 重新声明 window._blogApplyFilter 为我们的版本（覆盖 main.js 的 initBlogFilters 中设置的版本）
      window._blogApplyFilter = applyFilter;
      initFromURL();
      // 设置初始筛选状态
      if (currentFilter !== 'all') {
        applyFilter(currentFilter);
      } else {
        totalPages = calcTotalPages();
        showPage(currentPage);
      }
      // 绑定筛选按钮（.filter-btn 和 .tag）
      document.querySelectorAll('.filter-btn, .blog-filters .tag').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          applyFilter(this.dataset.filter || this.textContent.trim());
        });
      });

      // 处理浏览器后退
      window.addEventListener('popstate', function(e) {
        if (e.state) {
          currentPage = e.state.page || 1;
          currentFilter = e.state.filter || 'all';
          filteredPosts = (currentFilter === 'all' || currentFilter === '全部')
            ? Array.from(allPosts)
            : Array.from(allPosts).filter(post => postMatchesFilter(post, currentFilter));
          totalPages = calcTotalPages();
          // 更新筛选按钮
          document.querySelectorAll('.filter-btn').forEach(btn => {
            var btnFilter = btn.dataset.filter;
            var isAll = btnFilter === 'all';
            var isActive = (currentFilter === 'all') ? isAll : (btnFilter === currentFilter);
            btn.classList.toggle('filter-btn-active', isActive);
          });
          showPage(currentPage);
        } else {
          applyFilter('all');
        }
      });
    });
    // 归档功能 - 按年份+月份分组
    let archiveData = null;
    async function loadArchive() {
      try {
        const response = await fetch('articles-index.json?t=' + Date.now());
        const data = await response.json();
        // 按年份分组
        const yearGroups = {};
        data.posts.forEach(post => {
          const year = post.date.substring(0, 4);
          const month = post.date.substring(0, 7);
          if (!yearGroups[year]) yearGroups[year] = {};
          if (!yearGroups[year][month]) yearGroups[year][month] = [];
          yearGroups[year][month].push({
            title: post.title,
            date: post.date,
            url: post.url,
            category: post.category
          });
        });
        // Convert to sorted array
        archiveData = Object.keys(yearGroups).sort().reverse().map(year => {
          const months = Object.keys(yearGroups[year]).sort().reverse().map(month => ({
            month,
            count: yearGroups[year][month].length,
            posts: yearGroups[year][month].sort((a, b) => b.date.localeCompare(a.date))
          }));
          const total = months.reduce((sum, m) => sum + m.count, 0);
          return { year, count: total, months };
        });
      } catch (e) {
        console.error('加载归档失败:', e);
      }
    }
    function renderArchive() {
      const container = document.getElementById('archive-view');
      if (!container || !archiveData) return;
      var html = '';
      archiveData.forEach(function(yg) {
        html += '<div class="archive-year">';
        html += '<div class="archive-year-header">' + yg.year + '年 <span class="archive-count">' + yg.count + ' posts</span></div>';
        html += '<div class="archive-year-body">';
        yg.months.forEach(function(m) {
          html += '<div class="archive-month">';
          html += '<div class="archive-month-header">' + m.month.substring(5) + '月 <span class="archive-count">' + m.count + '</span></div>';
          html += '<div class="archive-month-body">';
          m.posts.forEach(function(p) {
            var dayStr = p.date.substring(5); // MM-DD
            html += '<div class="archive-post">';
            html += '<span class="archive-post-date">' + dayStr + '</span>';
            html += '<span class="archive-post-title"><a href="posts/' + p.url.replace('blog/posts/', '') + '">' + p.title + '</a></span>';
            if (p.category) {
              html += '<span class="archive-post-cat">' + p.category + '</span>';
            }
            html += '</div>';
          });
          html += '</div>'; // archive-month-body
          html += '</div>'; // archive-month
        });
        html += '</div>'; // archive-year-body
        html += '</div>'; // archive-year
      });
      container.innerHTML = html;
    }
    function toggleBlogView(view) {
      const listContainer = document.querySelector('.blog-list-container');
      const pagination = document.getElementById('pagination');
      const archiveView = document.getElementById('archive-view');
      const listBtn = document.querySelector('[data-view="list"]');
      const archiveBtn = document.querySelector('[data-view="archive"]');
      // Reset all
      listContainer.classList.remove('hidden');
      if (pagination) pagination.classList.remove('hidden');
      archiveView.classList.remove('active');
      listBtn.classList.remove('active');
      archiveBtn.classList.remove('active');
      if (view === 'archive') {
        listContainer.classList.add('hidden');
        if (pagination) pagination.classList.add('hidden');
        archiveView.classList.add('active');
        archiveBtn.classList.add('active');
        if (!archiveData) loadArchive().then(renderArchive).catch(function(e) { console.error(e); });
        else renderArchive();
      } else {
        listBtn.classList.add('active');
      }
    }
    window.toggleBlogView = toggleBlogView;