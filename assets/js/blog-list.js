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
    var viewParam = params.get('view');
    if (filterParam) currentFilter = filterParam;
    if (pageParam && !isNaN(pageParam)) {
      currentPage = Math.max(1, parseInt(pageParam));
    }
    if (viewParam === 'series' || viewParam === 'archive') {
      setTimeout(function() { toggleBlogView(viewParam); }, 10);
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
      html += '<a href="#" class="pagination-btn pagination-prev" data-page="' + (page - 1) + '" aria-label="上一页"><span class="pagination-arrow">←</span><span class="pagination-label">上一页</span></a>';
    } else {
      html += '<span class="pagination-btn pagination-prev disabled" aria-disabled="true"><span class="pagination-arrow">←</span><span class="pagination-label">上一页</span></span>';
    }
    var pageNumbersHtml = '';
    var pageNumbers = generatePageNumbers(page, totalPages);
    pageNumbers.forEach(function(item) {
      if (item === '...') {
        pageNumbersHtml += '<span class="pagination-ellipsis">···</span>';
      } else if (item === page) {
        pageNumbersHtml += '<span class="pagination-btn active" aria-current="page">' + item + '</span>';
      } else {
        pageNumbersHtml += '<a href="#" class="pagination-btn" data-page="' + item + '">' + item + '</a>';
      }
    });
    html += '<div class="pagination-pages">' + pageNumbersHtml + '</div>';
    if (page < totalPages) {
      html += '<a href="#" class="pagination-btn pagination-next" data-page="' + (page + 1) + '" aria-label="下一页"><span class="pagination-label">下一页</span><span class="pagination-arrow">→</span></a>';
    } else {
      html += '<span class="pagination-btn pagination-next disabled" aria-disabled="true"><span class="pagination-label">下一页</span><span class="pagination-arrow">→</span></span>';
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

  const SERIES_DATA = [
    {
      icon: '🤖',
      title: 'AI Agent 与本地大模型实战',
      desc: '从平台工作区迁移、定时自动化脚本投递，到 MCP 协议集成、本地 RAG 知识库与端侧大模型落地实录。',
      articles: [
        { url: 'posts/ai-助手定时任务投递指南从-agent-废话到-no-agent-脚本.html', title: 'AI 助手定时任务投递指南：从 Agent 废话到 No-Agent 脚本' },
        { url: 'posts/从-openclaw-到-hermesai-agent-工作区迁移完整记录.html', title: '从 OpenClaw 到 Hermes：AI Agent 工作区迁移完整记录' },
        { url: 'posts/openclaw-guide.html', title: 'OpenClaw 从入门到进阶实战指南' },
        { url: 'posts/local-rag-ollama.html', title: '基于 Ollama 构建本地 RAG 检索增强系统' },
        { url: 'posts/mcp-server-deep-dive.html', title: 'Model Context Protocol (MCP) 架构与服务端实战' }
      ],
      totalCount: 9
    },
    {
      icon: '📱',
      title: 'Android 16 深度演进与系统适配',
      desc: '系统梳理 Android 16 核心新特性、前台服务与后台任务约束、通知系统重构与性能深度调优。',
      articles: [
        { url: 'posts/android-16-features.html', title: 'Android 16 新特性详解：开发者需要知道的 8 件事' },
        { url: 'posts/android-16-notifications.html', title: 'Android 16 通知系统新 API 详解' },
        { url: 'posts/android-16-background-tasks.html', title: 'Android 16 后台任务新限制：开发者迁移指南' },
        { url: 'posts/android-16-foreground-service-constraints.html', title: 'Android 16 前台服务类型与约束详解' },
        { url: 'posts/android-performance-optimization.html', title: 'Android 性能优化实战：从卡顿分析到内存泄漏排查' }
      ],
      totalCount: 6
    },
    {
      icon: '⚡',
      title: 'Kotlin 现代并发与响应式架构',
      desc: '深入剖析 Kotlin 协程最佳实践、异常处理机制、Flow 背压策略、KMP 跨端与现代语言演进。',
      articles: [
        { url: 'posts/kotlin-coroutines-best-practices.html', title: 'Kotlin Coroutines 协程最佳实践' },
        { url: 'posts/kotlin-coroutine-exception-handling.html', title: 'Kotlin Coroutine 异常处理机制全面解析' },
        { url: 'posts/kotlin-flow-advanced.html', title: 'Kotlin Flow 进阶：背压策略与共享流' },
        { url: 'posts/kotlin-240-features.html', title: 'Kotlin 2.4.0 新特性全景' },
        { url: 'posts/kotlin-multiplatform-practice.html', title: 'Kotlin Multiplatform 实战：共享业务逻辑到 iOS' }
      ],
      totalCount: 7
    },
    {
      icon: '🎨',
      title: 'Jetpack Compose 现代 UI 实战',
      desc: '掌握 Compose 动画体系、Navigation 路由解耦与最新版本特性，构建高性能声明式 UI。',
      articles: [
        { url: 'posts/compose-april-2026-update.html', title: 'Jetpack Compose April 2026 Update 深度解读' },
        { url: 'posts/compose-navigation-guide.html', title: 'Jetpack Compose Navigation 进阶指南：从路由设计到深层链接' },
        { url: 'posts/jetpack-compose-animation.html', title: 'Jetpack Compose 动画系统实战：从基础到复杂手势联动' }
      ],
      totalCount: 3
    },
    {
      icon: '🛠️',
      title: '全栈工程化与高性能架构',
      desc: '聚焦构建提速、静态化极致性能、容器化运维、数据库 WAL 索引优化与高可用网关设计。',
      articles: [
        { url: 'posts/static-blog-performance-optimization-59mb.html', title: '纯静态个人博客性能调优实录：从 5.9MB 到 320KB' },
        { url: 'posts/gradle-build-acceleration-5min-to-30sec.html', title: 'Gradle 构建加速实战：从 5 分钟到 30 秒' },
        { url: 'posts/docker-compose-best-practices.html', title: 'Docker Compose 生产级多容器编排最佳实践' },
        { url: 'posts/sqlite-wal-performance.html', title: 'SQLite WAL 模式深度解析与性能调优' },
        { url: 'posts/postgresql-index-optimization.html', title: 'PostgreSQL 索引优化实战：从慢查询排查到复合索引设计' }
      ],
      totalCount: 6
    },
    {
      icon: '💡',
      title: '程序员的工程思维与成长',
      desc: '将系统工程思维融入带娃、技术写作、认知进阶与生活节奏，构建可持续的长期复利成长模式。',
      articles: [
        { url: 'posts/程序员带娃把养孩子当成一个长期运维的系统工程.html', title: '程序员带娃：把养孩子当成一个长期运维的系统工程' },
        { url: 'posts/why-tech-people-should-write.html', title: '技术人为什么要坚持写技术博客' },
        { url: 'posts/how-tech-people-learn-new-tech.html', title: '技术人如何高效学习一门全新技术栈' },
        { url: 'posts/programmers-should-learn-to-unplug.html', title: '程序员要学会「断联」：信息过载时代的注意力保卫战' },
        { url: 'posts/soft-skills-tech-people-overlook.html', title: '技术人最容易忽视的 5 项软技能' }
      ],
      totalCount: 6
    }
  ];

  function renderSeries() {
    var container = document.getElementById('series-view');
    if (!container) return;
    var html = '';
    SERIES_DATA.forEach(function(series) {
      var linksHtml = series.articles.map(function(a, idx) {
        return '<div class="series-bento-link-item"><span style="color: var(--color-accent-primary); font-weight:600;">' + (idx + 1) + '.</span> <a href="' + a.url + '">' + a.title + '</a></div>';
      }).join('');

      html += '<div class="series-bento-card spotlight-card">';
      html += '  <div>';
      html += '    <div class="series-bento-header">';
      html += '      <span class="series-bento-icon">' + series.icon + '</span>';
      html += '      <span class="series-bento-count">共 ' + series.totalCount + ' 篇</span>';
      html += '    </div>';
      html += '    <h3 class="series-bento-title">' + series.title + '</h3>';
      html += '    <p class="series-bento-desc">' + series.desc + '</p>';
      html += '    <div class="series-bento-articles">' + linksHtml + '</div>';
      html += '  </div>';
      html += '  <div class="series-bento-footer">';
      html += '    <a href="' + series.articles[0].url + '">开始阅读专栏 ➔</a>';
      html += '  </div>';
      html += '</div>';
    });
    container.innerHTML = html;
    if (window.initSpotlightCards) window.initSpotlightCards();
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
    var seriesView = document.getElementById('series-view');
    var heading = document.getElementById('blog-filter-title');

    var listBtn = document.querySelector('[data-view="list"]');
    var seriesBtn = document.querySelector('[data-view="series"]');
    var archiveBtn = document.querySelector('[data-view="archive"]');

    if (listContainer) listContainer.classList.remove('hidden');
    if (pagination) pagination.classList.remove('hidden');
    if (archiveView) archiveView.classList.remove('active');
    if (seriesView) seriesView.classList.remove('active');

    if (listBtn) listBtn.classList.remove('active');
    if (seriesBtn) seriesBtn.classList.remove('active');
    if (archiveBtn) archiveBtn.classList.remove('active');

    if (view === 'archive') {
      if (listContainer) listContainer.classList.add('hidden');
      if (pagination) pagination.classList.add('hidden');
      if (archiveView) archiveView.classList.add('active');
      if (archiveBtn) archiveBtn.classList.add('active');
      if (heading) heading.textContent = '时间归档';
      if (!archiveData) loadArchive().then(renderArchive).catch(function(e) { console.error(e); });
      else renderArchive();
    } else if (view === 'series') {
      if (listContainer) listContainer.classList.add('hidden');
      if (pagination) pagination.classList.add('hidden');
      if (seriesView) seriesView.classList.add('active');
      if (seriesBtn) seriesBtn.classList.add('active');
      if (heading) heading.textContent = '专题专栏 (6)';
      renderSeries();
    } else {
      if (listBtn) listBtn.classList.add('active');
      if (heading) heading.textContent = currentFilter === 'all' ? '全部文章' : currentFilter;
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
