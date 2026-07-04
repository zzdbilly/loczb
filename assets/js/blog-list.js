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
      // 更新标签云 active 状态
      document.querySelectorAll('.tag-cloud-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-filter') === filter);
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
      // 绑定标签云点击（事件委托到容器）
      var tagCloud = document.getElementById('blog-tag-cloud');
      if (tagCloud) {
        tagCloud.addEventListener('click', function(e) {
          var item = e.target.closest('.tag-cloud-item');
          if (!item) return;
          e.preventDefault();
          var tag = item.getAttribute('data-filter');
          if (!tag) return;
          // 切换到列表视图
          var viewBtn = document.querySelector('[data-view="list"]');
          if (viewBtn && !viewBtn.classList.contains('active')) {
            toggleBlogView('list');
          }
          applyFilter(tag);
        });
      }
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
    // 归档功能
    let archiveData = null;
    var ARCHIVE_EXPANDED_COUNT = 3; // 默认展开最近3个月
    async function loadArchive() {
      try {
        const response = await fetch('articles-index.json?t=' + Date.now());
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
      var html = '';
      archiveData.forEach(function(m, idx) {
        var isCollapsed = idx >= ARCHIVE_EXPANDED_COUNT;
        html += '<div class="archive-month' + (isCollapsed ? ' archive-month-collapsed' : '') + '" data-archive-idx="' + idx + '">';
        html += '<div class="archive-month-header" onclick="toggleArchiveMonth(' + idx + ')">';
        html += '<span class="archive-expand-icon">' + (isCollapsed ? '▶' : '▼') + '</span>';
        html += m.month + ' <span class="archive-count">' + m.count + ' 篇</span>';
        html += '</div>';
        html += '<div class="archive-month-body"' + (isCollapsed ? ' style="display:none;"' : '') + '>';
        html += m.posts.map(function(p) {
          return '<div class="archive-post">'
            + '<span class="archive-post-date">' + p.date.substring(0, 10) + '</span>'
            + '<span class="archive-post-title"><a href="posts/' + p.url.replace('blog/posts/', '') + '">' + p.title + '</a></span>'
            + '<span class="archive-post-cat">' + (p.category || '') + '</span>'
            + '</div>';
        }).join('');
        html += '</div>'; // archive-month-body
        html += '</div>'; // archive-month
      });
      // 如果有超过 ARCHIVE_EXPANDED_COUNT 个月的归档，加一个"展开更早归档"按钮
      if (archiveData.length > ARCHIVE_EXPANDED_COUNT) {
        html += '<div class="archive-expand-more-wrap" id="archive-expand-more-wrap">';
        html += '<button class="archive-expand-more-btn" onclick="expandAllArchive()">';
        html += '展开更早归档 (' + (archiveData.length - ARCHIVE_EXPANDED_COUNT) + ' 个月)';
        html += '</button>';
        html += '</div>';
      }
      container.innerHTML = html;
    }
    window.toggleArchiveMonth = function(idx) {
      var monthEl = document.querySelector('[data-archive-idx="' + idx + '"]');
      if (!monthEl) return;
      var body = monthEl.querySelector('.archive-month-body');
      var icon = monthEl.querySelector('.archive-expand-icon');
      if (!body) return;
      if (body.style.display === 'none') {
        body.style.display = '';
        if (icon) icon.textContent = '▼';
        monthEl.classList.remove('archive-month-collapsed');
      } else {
        body.style.display = 'none';
        if (icon) icon.textContent = '▶';
        monthEl.classList.add('archive-month-collapsed');
      }
    };
    window.expandAllArchive = function() {
      // 展开所有折叠的月份
      document.querySelectorAll('.archive-month-collapsed').forEach(function(el) {
        var body = el.querySelector('.archive-month-body');
        var icon = el.querySelector('.archive-expand-icon');
        if (body) body.style.display = '';
        if (icon) icon.textContent = '▼';
        el.classList.remove('archive-month-collapsed');
      });
      // 隐藏"展开更早归档"按钮
      var btnWrap = document.getElementById('archive-expand-more-wrap');
      if (btnWrap) btnWrap.style.display = 'none';
      // 显示"折叠更早归档"按钮
      var collapseBtn = document.getElementById('archive-collapse-more-wrap');
      if (collapseBtn) collapseBtn.style.display = '';
    };
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
      var SERIES_COLLAPSE_THRESHOLD = 3; // 默认显示前3篇
      container.innerHTML = series.map(function(s, sIdx) {
        var needCollapse = s.posts.length > SERIES_COLLAPSE_THRESHOLD;
        var visiblePosts = needCollapse ? s.posts.slice(0, SERIES_COLLAPSE_THRESHOLD) : s.posts;
        var html = '<div class="series-card" data-series-idx="' + sIdx + '">';
        html += '<div class="series-card-header">';
        html += '<div class="series-card-title"><span class="series-icon">📚</span>' + s.name + '</div>';
        html += '<span class="series-card-count">' + s.count + ' 篇</span>';
        html += '</div>';
        html += '<ul class="series-post-list">';
        // 渲染可见的文章
        visiblePosts.forEach(function(p, i) {
          html += '<li class="series-post-item">'
            + '<span class="series-post-num">' + String(i + 1).padStart(2, '0') + '</span>'
            + '<span class="series-post-date">' + p.date + '</span>'
            + '<span class="series-post-title"><a href="posts/' + p.url.replace('blog/posts/', '') + '">' + p.title + '</a></span>'
            + '</li>';
        });
        html += '</ul>';
        // 如果需要折叠，加展开按钮
        if (needCollapse) {
          html += '<button class="series-expand-btn" onclick="toggleSeriesExpand(' + sIdx + ')">';
          html += '展开全部 ' + s.count + ' 篇 ▼';
          html += '</button>';
        }
        html += '</div>';
        return html;
      }).join('');
    }
    window.toggleSeriesExpand = function(sIdx) {
      var card = document.querySelector('[data-series-idx="' + sIdx + '"]');
      if (!card) return;
      var list = card.querySelector('.series-post-list');
      var btn = card.querySelector('.series-expand-btn');
      if (!list || !btn) return;
      // 检查是否已展开
      var isExpanded = list.dataset.expanded === '1';
      if (isExpanded) {
        // 折叠：只显示前3篇
        var allItems = list.querySelectorAll('.series-post-item');
        allItems.forEach(function(item, idx) {
          if (idx >= 3) item.style.display = 'none';
        });
        list.dataset.expanded = '0';
        btn.textContent = '展开全部 ' + (parseInt(btn.dataset.count) || 0) + ' 篇 ▼';
      } else {
        // 展开：从 seriesData 恢复全部文章
        var series = seriesData[sIdx];
        if (!series) return;
        var html = '';
        series.posts.forEach(function(p, i) {
          html += '<li class="series-post-item">'
            + '<span class="series-post-num">' + String(i + 1).padStart(2, '0') + '</span>'
            + '<span class="series-post-date">' + p.date + '</span>'
            + '<span class="series-post-title"><a href="posts/' + p.url.replace('blog/posts/', '') + '">' + p.title + '</a></span>'
            + '</li>';
        });
        list.innerHTML = html;
        list.dataset.expanded = '1';
        if (!btn.dataset.count) btn.dataset.count = series.count;
        btn.textContent = '收起 ▲';
      }
    };
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
        if (!archiveData) loadArchive().then(renderArchive).catch(function(e) { console.error(e); });
        else renderArchive();
      } else if (view === 'series') {
        listContainer.classList.add('hidden');
        if (pagination) pagination.classList.add('hidden');
        seriesView.classList.add('active');
        seriesBtn.classList.add('active');
        if (!seriesData) {
          loadSeries().then(renderSeries).catch(function(e) { console.error(e); });
        } else {
          renderSeries(seriesData);
        }
      } else {
        listBtn.classList.add('active');
      }
    }
    window.toggleBlogView = toggleBlogView;