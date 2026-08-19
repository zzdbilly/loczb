// 博客列表：分页 + 筛选 + 视图切换（IIFE 封装，无全局污染）
(function() {
  'use strict';

  var POSTS_PER_PAGE = 10;
  var allPosts = document.querySelectorAll('.blog-list-item');
  var filteredPosts = Array.from(allPosts);
  var totalPages = 1;
  var currentPage = 1;
  var currentFilter = 'all';

  function calcTotalPages() {
    return Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  }

  function initFromURL() {
    var params = new URLSearchParams(window.location.search);
    var pageParam = params.get('page');
    var filterParam = params.get('filter');
    if (filterParam) currentFilter = filterParam;
    if (pageParam && !isNaN(pageParam)) {
      currentPage = Math.max(1, parseInt(pageParam));
    }
  }

  function postMatchesFilter(post, filter) {
    if (filter === 'all' || filter === '全部') return true;
    if (post.dataset.category === filter) return true;
    var tagsStr = post.getAttribute('data-tags') || '';
    var tags = tagsStr ? tagsStr.split(',').filter(Boolean) : [];
    if (tags.indexOf(filter) !== -1) return true;
    var tagEls = post.querySelectorAll('.tag, .tag-accent, .blog-list-tag');
    for (var i = 0; i < tagEls.length; i++) {
      if (tagEls[i].textContent.trim() === filter) return true;
    }
    return false;
  }

  function applyFilter(filter) {
    currentFilter = filter;
    currentPage = 1;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      var btnFilter = btn.dataset.filter || btn.textContent.trim();
      var isAll = btnFilter === 'all' || btnFilter === '全部';
      var isActive = (filter === 'all' || filter === '全部') ? isAll : (btnFilter === filter);
      btn.classList.toggle('filter-btn-active', isActive);
      btn.classList.toggle('tag-accent', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    filteredPosts = (filter === 'all' || filter === '全部')
      ? Array.from(allPosts)
      : Array.from(allPosts).filter(post => postMatchesFilter(post, filter));
    var titleEl = document.getElementById('blog-filter-title');
    if (titleEl) {
      if (filter === 'all' || filter === '全部') {
        titleEl.textContent = '全部文章';
      } else {
        titleEl.textContent = filter + ' · ' + filteredPosts.length + ' 篇';
      }
    }
    var featuredSection = document.getElementById('featured-section');
    if (featuredSection) {
      var isAll = (filter === 'all' || filter === '全部');
      featuredSection.style.display = isAll ? '' : 'none';
    }
    var emptyState = document.getElementById('blog-empty-state');
    if (emptyState) {
      emptyState.style.display = filteredPosts.length === 0 ? 'block' : 'none';
    }
    totalPages = calcTotalPages();
    showPage(1);
    var params = new URLSearchParams();
    if (filter !== 'all' && filter !== '全部') params.set('filter', filter);
    if (currentPage > 1) params.set('page', currentPage);
    var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
    window.history.pushState({ page: currentPage, filter: filter }, '', newUrl);
  }

  // 暴露给 main.js 的标签云点击（最小全局接口）
  applyFilter._blogListJS = true;
  window._blogApplyFilter = applyFilter;

  function showPage(page) {
    if (page < 1 || page > totalPages) return;
    allPosts.forEach(post => post.style.display = 'none');
    var start = (page - 1) * POSTS_PER_PAGE;
    var end = start + POSTS_PER_PAGE;
    filteredPosts.slice(start, end).forEach(post => post.style.display = '');
    currentPage = page;
    updatePagination(page);
    var params = new URLSearchParams();
    if (currentFilter !== 'all' && currentFilter !== '全部') params.set('filter', currentFilter);
    if (page > 1) params.set('page', page);
    var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
    window.history.pushState({ page: page, filter: currentFilter }, '', newUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function generatePageNumbers(current, total) {
    var pages = [];
    if (total <= 7) {
      for (var i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    var leftStart = Math.max(2, current - 2);
    var rightEnd = Math.min(total - 1, current + 2);
    if (leftStart > 2) pages.push('...');
    for (var i = leftStart; i <= rightEnd; i++) pages.push(i);
    if (rightEnd < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  }

  function updatePagination(page) {
    var container = document.getElementById('pagination');
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }
    var html = '';
    if (page > 1) {
      html += '<a href="#" class="pagination-btn pagination-prev" data-page="' + (page - 1) + '">← 上一页</a>';
    } else {
      html += '<span class="pagination-btn disabled">← 上一页</span>';
    }
    var pageNumbers = generatePageNumbers(page, totalPages);
    pageNumbers.forEach(function(item) {
      if (item === '...') {
        html += '<span class="pagination-ellipsis">···</span>';
      } else if (item === page) {
        html += '<span class="pagination-btn active">' + item + '</span>';
      } else {
        html += '<a href="#" class="pagination-btn" data-page="' + item + '">' + item + '</a>';
      }
    });
    if (page < totalPages) {
      html += '<a href="#" class="pagination-btn pagination-next" data-page="' + (page + 1) + '">下一页 -></a>';
    } else {
      html += '<span class="pagination-btn disabled">下一页 -></span>';
    }
    container.innerHTML = html;
  }

  // 归档功能
  var archiveData = null;

  function loadArchive() {
    return fetch('articles-index.json')
      .then(response => response.json())
      .then(data => {
        var yearGroups = {};
        data.posts.forEach(post => {
          var year = post.date.substring(0, 4);
          var month = post.date.substring(0, 7);
          if (!yearGroups[year]) yearGroups[year] = {};
          if (!yearGroups[year][month]) yearGroups[year][month] = [];
          yearGroups[year][month].push({
            title: post.title,
            date: post.date,
            url: post.url,
            category: post.category
          });
        });
        archiveData = Object.keys(yearGroups).sort().reverse().map(year => {
          var months = Object.keys(yearGroups[year]).sort().reverse().map(month => ({
            month: month,
            count: yearGroups[year][month].length,
            posts: yearGroups[year][month].sort((a, b) => b.date.localeCompare(a.date))
          }));
          var total = months.reduce((sum, m) => sum + m.count, 0);
          return { year: year, count: total, months: months };
        });
      })
      .catch(e => console.error('加载归档失败:', e));
  }

  function renderArchive() {
    var container = document.getElementById('archive-view');
    if (!container || !archiveData) return;
    var html = '';
    archiveData.forEach(function(yg) {
      html += '<div class="archive-year">';
      html += '<div class="archive-year-header">' + yg.year + ' <span class="archive-count">· ' + yg.count + ' 篇</span></div>';
      html += '<div class="archive-year-body">';
      yg.months.forEach(function(m) {
        html += '<div class="archive-month spotlight-card">';
        html += '<div class="archive-month-header"><span class="month-pill">' + parseInt(m.month.substring(5)) + ' 月</span> <span class="archive-count">' + m.count + ' 篇文章</span></div>';
        html += '<div class="archive-month-body">';
        m.posts.forEach(function(p) {
          var dayStr = p.date.substring(5);
          html += '<div class="archive-post">';
          html += '<span class="archive-post-date">' + dayStr + '</span>';
          html += '<span class="archive-post-title"><a href="posts/' + p.url.replace('blog/posts/', '') + '">' + p.title + '</a></span>';
          if (p.category) {
            html += '<span class="archive-post-cat">' + p.category + '</span>';
          }
          html += '</div>';
        });
        html += '</div></div>';
      });
      html += '</div></div>';
    });
    container.innerHTML = html;
    if (window.initSpotlightCards) window.initSpotlightCards();
  }

  function toggleBlogView(view) {
    var listContainer = document.querySelector('.blog-list-container');
    var pagination = document.getElementById('pagination');
    var archiveView = document.getElementById('archive-view');
    var listBtn = document.querySelector('[data-view="list"]');
    var archiveBtn = document.querySelector('[data-view="archive"]');
    if (listContainer) listContainer.classList.remove('hidden');
    if (pagination) pagination.classList.remove('hidden');
    if (archiveView) archiveView.classList.remove('active');
    if (listBtn) listBtn.classList.remove('active');
    if (archiveBtn) archiveBtn.classList.remove('active');
    if (view === 'archive') {
      if (listContainer) listContainer.classList.add('hidden');
      if (pagination) pagination.classList.add('hidden');
      if (archiveView) archiveView.classList.add('active');
      if (archiveBtn) archiveBtn.classList.add('active');
      if (!archiveData) loadArchive().then(renderArchive).catch(function(e) { console.error(e); });
      else renderArchive();
    } else {
      if (listBtn) listBtn.classList.add('active');
    }
  }

  // 暴露最小接口（main.js 和 HTML data-view 按钮需要）
  window.toggleBlogView = toggleBlogView;

  // === 事件绑定（替代内联 onclick） ===

  // 分页按钮事件委托
  document.addEventListener('click', function(e) {
    var target = e.target.closest('.pagination-btn[data-page]');
    if (target) {
      e.preventDefault();
      showPage(parseInt(target.dataset.page));
      return;
    }
    // 视图切换按钮
    var viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      e.preventDefault();
      toggleBlogView(viewBtn.dataset.view);
      return;
    }
    // 筛选按钮
    var filterBtn = e.target.closest('.filter-btn, .blog-filters .tag');
    if (filterBtn) {
      e.preventDefault();
      applyFilter(filterBtn.dataset.filter || filterBtn.textContent.trim());
      return;
    }
  });

  // 浏览器后退
  window.addEventListener('popstate', function(e) {
    if (e.state) {
      currentPage = e.state.page || 1;
      currentFilter = e.state.filter || 'all';
      filteredPosts = (currentFilter === 'all' || currentFilter === '全部')
        ? Array.from(allPosts)
        : Array.from(allPosts).filter(post => postMatchesFilter(post, currentFilter));
      totalPages = calcTotalPages();
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

  // 初始化
  window.addEventListener('DOMContentLoaded', function() {
    window._blogApplyFilter = applyFilter;
    initFromURL();
    if (currentFilter !== 'all') {
      applyFilter(currentFilter);
    } else {
      totalPages = calcTotalPages();
      showPage(currentPage);
    }
  });
})();
