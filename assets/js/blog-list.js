// 博客列表：静态分页（默认视图）+ 动态筛选/归档/专栏视图（IIFE 封装，无全局污染）
//
// 分页改造（2026-09-16）：列表卡与分页导航在构建期写死 —— blog/index.html 是第 1 页，
// blog/page-2..N.html 是其余页，默认视图（filter=all）不依赖 JS，无 JS 也能翻页，
// 且每页 DOM 只有 10 张卡而不是全站 110 张。
// 只有「分类筛选 / 标签筛选 / 专栏 / 归档」这些静态页装不下的视图才回退到客户端渲染：
// 懒加载瘦身后的 articles-index.json，客户端 10 条/页；摘要按需拉 blog/meta/{slug}.json。
(function() {
  'use strict';

  var POSTS_PER_PAGE = 10;
  var INDEX_URL = 'articles-index.json';

  // 静态视图状态（由构建脚本写进 HTML：data-total-pages / data-static-page）
  var paginationEl = document.getElementById('pagination');
  var listContainer = document.getElementById('blog-list');
  var staticTotalPages = parseInt((paginationEl && paginationEl.getAttribute('data-total-pages')) || '1', 10) || 1;
  var staticCards = Array.from(document.querySelectorAll('.blog-list-item'));

  var dynamic = false;       // 是否已切换为客户端渲染（静态卡已被替换）
  var allPostsData = null;   // 瘦身后的 posts[]（懒加载 + 缓存）
  var loadingPromise = null;
  var filteredPosts = [];
  var totalPages = 1;
  var currentPage = 1;
  var currentFilter = 'all';
  var renderToken = 0;       // 丢弃过期渲染的异步回填（摘要）

  function staticPageNo() {
    var m = window.location.pathname.match(/page-(\d+)\.html$/);
    return m ? parseInt(m[1], 10) : 1;
  }

  // 旧 URL 兼容：?page=N（N≥2）是分页改造前的客户端分页参数，静态页只装了一页数据，
  // 必须真跳到 page-N.html，否则会停在首页或 404。filter/tag/view 参数原样带走。
  function redirectLegacyPageParam() {
    var params = new URLSearchParams(window.location.search);
    var p = parseInt(params.get('page') || '', 10);
    if (!p || p < 2 || p === staticPageNo() || p > staticTotalPages) return false;
    var qs = new URLSearchParams();
    ['filter', 'tag', 'view'].forEach(function(k) {
      var v = params.get(k);
      if (v) qs.set(k, v);
    });
    window.location.replace('page-' + p + '.html' + (qs.toString() ? '?' + qs.toString() : ''));
    return true;
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function slugOf(post) {
    return post.slug || String(post.url || '').replace(/^blog\/posts\//, '').replace(/\.html$/, '');
  }

  function loadPosts() {
    if (allPostsData) return Promise.resolve(allPostsData);
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch(INDEX_URL)
      .then(function(resp) { return resp.ok ? resp.json() : null; })
      .then(function(data) {
        allPostsData = (data && data.posts) || [];
        return allPostsData;
      })
      .catch(function(e) {
        console.error('加载文章索引失败:', e);
        allPostsData = [];
        return allPostsData;
      });
    return loadingPromise;
  }

  // 归一化：忽略大小写、空白与标点（保留中日韩字符）。用于兜底匹配旧版文章侧栏生成的
  // 「去空格」标签链接（如 ?tag=ContainerQueries → "Container Queries"），这些链接可能
  // 已被外部引用或搜索引擎收录，2026-10-05 修复生成端后仍需兼容。
  function normTag(s) {
    return String(s || '').toLowerCase().replace(/[^0-9a-z\u4e00-\u9fff]+/g, '');
  }

  function postMatchesFilter(post, filter) {
    if (filter === 'all' || filter === '全部') return true;
    if ((post.category || '') === filter) return true;
    var tags = post.tags || [];
    if (tags.indexOf(filter) !== -1) return true;
    var nf = normTag(filter);
    if (!nf) return false;
    if (normTag(post.category) === nf) return true;
    for (var i = 0; i < tags.length; i++) {
      if (normTag(tags[i]) === nf) return true;
    }
    return false;
  }

  // 动态卡片（客户端渲染）：结构与构建期卡片一致，但不带 animate-on-scroll
  // （滚动动画观察器在首屏已绑定，后插入的节点会一直 opacity:0）。
  function renderCardHtml(post, pageNo) {
    var tags = post.tags || [];
    var slug = slugOf(post);
    var pills = tags.slice(0, 3).map(function(t) { return '<span class="tag-pill">#' + esc(t) + '</span>'; }).join(' ');
    return '        <article class="blog-list-item spotlight-card" data-category="' + esc(post.category || '') + '" data-tags="' + tags.map(esc).join(',') + '" data-page="' + pageNo + '">\n' +
      '          <div>\n' +
      '            <div class="blog-list-header">\n' +
      '              <div class="blog-list-meta">\n' +
      '                <span class="blog-date">📅 ' + esc(post.date || '') + '</span>\n' +
      '                <span>·</span>\n' +
      '                <span class="blog-read-time">⏱️ ' + esc(post.readTime || 5) + ' min</span>\n' +
      '              </div>\n' +
      '              <span class="blog-list-tag">' + esc(post.category || '') + '</span>\n' +
      '            </div>\n' +
      '            <h3 class="blog-list-title">\n' +
      '              <a href="posts/' + slug + '.html">' + esc(post.title || '') + '</a>\n' +
      '            </h3>\n' +
      '            <p class="blog-list-excerpt" data-meta-slug="' + esc(slug) + '"></p>\n' +
      '          </div>\n' +
      '          <div class="blog-list-footer">\n' +
      '            <div class="blog-list-tags">\n' +
      '              ' + pills + '\n' +
      '            </div>\n' +
      '            <a href="posts/' + slug + '.html" class="blog-read-more" aria-label="阅读全文：' + esc(post.title || '') + '"><span>阅读全文</span><span class="read-more-arrow">→</span></a>\n' +
      '          </div>\n' +
      '        </article>';
  }

  // 摘要按需拉取：索引里已无 excerpt，只对当前页真正展示的 ≤10 条拉 sidecar，结果缓存
  function fillExcerpts(posts, token) {
    if (!window.LoczbMeta) return;
    posts.forEach(function(post) {
      var slug = slugOf(post);
      var cached = window.LoczbMeta.cached(slug);
      var apply = function(meta) {
        if (token !== renderToken) return;
        var el = document.querySelector('.blog-list-excerpt[data-meta-slug="' + slug.replace(/"/g, '\\"') + '"]');
        if (el && meta && meta.description) el.textContent = meta.description;
      };
      if (cached) apply(cached);
      else window.LoczbMeta.get(slug).then(apply);
    });
  }

  function calcTotalPages() {
    return Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
  }

  function renderDynamicList() {
    if (!listContainer) return;
    var start = (currentPage - 1) * POSTS_PER_PAGE;
    var pagePosts = filteredPosts.slice(start, start + POSTS_PER_PAGE);
    listContainer.innerHTML = pagePosts.map(function(p) { return renderCardHtml(p, currentPage); }).join('\n');
    var emptyState = document.getElementById('blog-empty-state');
    if (emptyState) emptyState.style.display = filteredPosts.length === 0 ? 'block' : 'none';
    if (window.initSpotlightCards) window.initSpotlightCards();
    if (window._cleanMetaIcons) window._cleanMetaIcons(listContainer);
    fillExcerpts(pagePosts, renderToken);
    updatePagination(currentPage);
  }

  function applyFilter(filter, opts) {
    opts = opts || {};
    if (filter === '全部') filter = 'all';
    currentFilter = filter || 'all';
    currentPage = opts.page || 1;
    dynamic = true;

    document.querySelectorAll('.filter-btn').forEach(function(btn) {
      var btnFilter = btn.dataset.filter || btn.textContent.trim();
      var isAll = btnFilter === 'all' || btnFilter === '全部';
      var isActive = (currentFilter === 'all') ? isAll : (btnFilter === currentFilter);
      btn.classList.toggle('filter-btn-active', isActive);
      btn.classList.toggle('tag-accent', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    var titleEl = document.getElementById('blog-filter-title');
    if (titleEl) {
      titleEl.textContent = currentFilter === 'all' ? '全部文章' : currentFilter + ' · 加载中…';
    }
    var featuredSection = document.getElementById('featured-section');
    if (featuredSection) featuredSection.style.display = currentFilter === 'all' ? '' : 'none';

    // 从归档/专栏视图切回列表时，先把视图容器收起来，恢复筛选栏与工作台标识
    var archiveView = document.getElementById('archive-view');
    var seriesView = document.getElementById('series-view');
    var filtersBar = document.querySelector('.blog-filters');
    var viewLabel = document.getElementById('blog-current-view-label');
    var subtitleEl = document.getElementById('blog-filter-subtitle');

    if (filtersBar) filtersBar.classList.remove('hidden-filters');
    if (viewLabel) viewLabel.textContent = 'VIEWPORT // POSTS';
    if (archiveView) archiveView.classList.remove('active');
    if (seriesView) seriesView.classList.remove('active');
    if (listContainer) listContainer.classList.remove('hidden');
    if (paginationEl) paginationEl.classList.remove('hidden');
    document.querySelectorAll('.view-toggle-btn').forEach(function(b) {
      var isList = b.dataset.view === 'list';
      b.classList.toggle('active', isList);
      b.setAttribute('aria-selected', isList ? 'true' : 'false');
    });

    var token = ++renderToken;
    loadPosts().then(function(posts) {
      if (token !== renderToken) return;   // 有更新的筛选，丢弃本次结果
      filteredPosts = currentFilter === 'all' ? posts.slice() : posts.filter(function(p) { return postMatchesFilter(p, currentFilter); });
      totalPages = calcTotalPages();
      if (currentPage > totalPages) currentPage = 1;
      if (titleEl) {
        titleEl.textContent = currentFilter === 'all' ? '全部文章' : currentFilter + ' · ' + filteredPosts.length + ' 篇';
      }
      if (subtitleEl) {
        subtitleEl.textContent = currentFilter === 'all'
          ? '按时间倒序收录的完整技术沉淀与架构思考'
          : '分类「' + currentFilter + '」下共收录 ' + filteredPosts.length + ' 篇深度沉淀';
      }
      renderDynamicList();
      if (opts.pushState !== false) pushStateForList();
    });
  }

  // 暴露给 main.js 的标签云点击 / 内联兜底脚本（最小全局接口）
  applyFilter._blogListJS = true;
  window._blogApplyFilter = applyFilter;

  function pushStateForList() {
    var params = new URLSearchParams();
    if (currentFilter !== 'all') params.set('filter', currentFilter);
    if (currentPage > 1) params.set('page', currentPage);
    var newUrl = params.toString() ? '?' + params.toString() : window.location.pathname;
    window.history.pushState({ page: currentPage, filter: currentFilter, dynamic: true }, '', newUrl);
  }

  function showPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderDynamicList();
    pushStateForList();
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
    for (var j = leftStart; j <= rightEnd; j++) pages.push(j);
    if (rightEnd < total - 1) pages.push('...');
    pages.push(total);
    return pages;
  }

  // 动态分页导航：带 data-page，由下方事件委托接管（静态导航不带 data-page，是普通跳转）
  function updatePagination(page) {
    if (!paginationEl) return;
    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }
    var html = '';
    if (page > 1) {
      html += '<a href="#" class="pagination-btn pagination-prev" data-page="' + (page - 1) + '" aria-label="上一页" title="上一页"><span class="pagination-arrow">←</span></a>';
    } else {
      html += '<span class="pagination-btn pagination-prev disabled" aria-disabled="true" title="上一页"><span class="pagination-arrow">←</span></span>';
    }
    var pageNumbersHtml = '';
    generatePageNumbers(page, totalPages).forEach(function(item) {
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
      html += '<a href="#" class="pagination-btn pagination-next" data-page="' + (page + 1) + '" aria-label="下一页" title="下一页"><span class="pagination-arrow">→</span></a>';
    } else {
      html += '<span class="pagination-btn pagination-next disabled" aria-disabled="true" title="下一页"><span class="pagination-arrow">→</span></span>';
    }
    paginationEl.innerHTML = html;
  }

  // 归档功能（数据从瘦身后的 posts[] 现算，不再依赖索引里的派生字段）
  var archiveData = null;

  function buildArchive(posts) {
    var yearGroups = {};
    posts.forEach(function(post) {
      var year = (post.date || '').substring(0, 4);
      var month = (post.date || '').substring(0, 7);
      if (!yearGroups[year]) yearGroups[year] = {};
      if (!yearGroups[year][month]) yearGroups[year][month] = [];
      yearGroups[year][month].push({
        title: post.title,
        date: post.date,
        url: post.url,
        category: post.category
      });
    });
    return Object.keys(yearGroups).sort().reverse().map(function(year) {
      var months = Object.keys(yearGroups[year]).sort().reverse().map(function(month) {
        return {
          month: month,
          count: yearGroups[year][month].length,
          posts: yearGroups[year][month].sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); })
        };
      });
      var total = months.reduce(function(sum, m) { return sum + m.count; }, 0);
      return { year: year, count: total, months: months };
    });
  }

  function loadArchive() {
    return loadPosts().then(function(posts) {
      archiveData = buildArchive(posts);
      return archiveData;
    }).catch(function(e) { console.error('加载归档失败:', e); });
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
      desc: '将系统工程思维融入注意力管理、长期健康运维、阳明心学实践、带娃与认知进阶，构建可持续的长期复利成长模式。',
      articles: [
        { url: 'posts/心学不是鸡汤一个程序员的阳明心学实践手册.html', title: '心学不是鸡汤：一个程序员的阳明心学实践手册' },
        { url: 'posts/程序员的注意力管理比时间更稀缺的资源.html', title: '程序员的注意力管理：比时间更稀缺的资源' },
        { url: 'posts/如何维持好自己的健康写给程序员的长期运维指南.html', title: '如何维持好自己的健康：写给程序员的长期运维指南' },
        { url: 'posts/程序员带娃把养孩子当成一个长期运维的系统工程.html', title: '程序员带娃：把养孩子当成一个长期运维的系统工程' },
        { url: 'posts/why-tech-people-should-write.html', title: '技术人为什么要坚持写技术博客' },
        { url: 'posts/how-tech-people-learn-new-tech.html', title: '技术人如何高效学习一门全新技术栈' }
      ],
      totalCount: 9
    }
  ];

  function renderSeries() {
    var container = document.getElementById('series-view');
    if (!container) return;
    var html = '';
    SERIES_DATA.forEach(function(series) {
      var linksHtml = series.articles.map(function(a, idx) {
        var stepNum = (idx + 1) < 10 ? '0' + (idx + 1) : String(idx + 1);
        return '<div class="series-roadmap-item">' +
          '<span class="series-step-pill">' + stepNum + '</span>' +
          '<a class="series-roadmap-link" href="' + esc(a.url) + '" title="' + esc(a.title) + '">' + esc(a.title) + '</a>' +
          '</div>';
      }).join('');

      html += '<article class="series-dossier-card spotlight-card">';
      html += '  <div>';
      html += '    <div class="series-dossier-header">';
      html += '      <div class="series-dossier-icon-box">' + series.icon + '</div>';
      html += '      <span class="series-dossier-badge">收录 ' + series.totalCount + ' 篇</span>';
      html += '    </div>';
      html += '    <h3 class="series-dossier-title">' + esc(series.title) + '</h3>';
      html += '    <p class="series-dossier-desc">' + esc(series.desc) + '</p>';
      html += '    <div class="series-roadmap-track">' + linksHtml + '</div>';
      html += '  </div>';
      html += '  <div class="series-dossier-footer">';
      html += '    <a class="series-explore-btn" href="' + esc(series.articles[0].url) + '"><span>进入专栏第一篇</span> <span class="read-more-arrow">➔</span></a>';
      html += '  </div>';
      html += '</article>';
    });
    container.innerHTML = html;
    if (window.initSpotlightCards) window.initSpotlightCards();
  }

  function renderArchive() {
    var container = document.getElementById('archive-view');
    if (!container || !archiveData) return;
    var html = '<div class="archive-timeline-wrapper">';
    archiveData.forEach(function(yg) {
      html += '<section class="archive-year-section">';
      html += '  <div class="archive-year-hub">';
      html += '    <div class="archive-year-node" aria-hidden="true"></div>';
      html += '    <h3 class="archive-year-title">' + esc(yg.year) + '</h3>';
      html += '    <span class="archive-year-badge">' + yg.count + ' 篇归档</span>';
      html += '    <span class="archive-year-watermark" aria-hidden="true">' + esc(yg.year) + '</span>';
      html += '  </div>';

      yg.months.forEach(function(m) {
        var monthNum = parseInt(m.month.substring(5), 10);
        html += '  <div class="archive-month-group spotlight-card">';
        html += '    <div class="archive-month-header">';
        html += '      <span class="archive-month-tag">' + monthNum + ' 月度归档</span>';
        html += '      <span class="archive-month-stats">共 ' + m.count + ' 篇</span>';
        html += '    </div>';
        html += '    <div class="archive-month-body">';
        m.posts.forEach(function(p) {
          var dayStr = (p.date || '').substring(5);
          var slug = String(p.url || '').replace('blog/posts/', '');
          html += '      <div class="archive-entry-row">';
          html += '        <time class="archive-entry-date">' + esc(dayStr) + '</time>';
          html += '        <span class="archive-entry-title"><a href="posts/' + esc(slug) + '">' + esc(p.title) + '</a></span>';
          if (p.category) {
            html += '        <span class="archive-entry-cat">' + esc(p.category) + '</span>';
          }
          html += '      </div>';
        });
        html += '    </div>';
        html += '  </div>';
      });

      html += '</section>';
    });
    html += '</div>';
    container.innerHTML = html;
    if (window.initSpotlightCards) window.initSpotlightCards();
  }

  function toggleBlogView(view) {
    var archiveView = document.getElementById('archive-view');
    var seriesView = document.getElementById('series-view');
    var heading = document.getElementById('blog-filter-title');
    var subheading = document.getElementById('blog-filter-subtitle');
    var viewLabel = document.getElementById('blog-current-view-label');
    var filtersBar = document.querySelector('.blog-filters');

    var listBtn = document.querySelector('[data-view="list"]');
    var seriesBtn = document.querySelector('[data-view="series"]');
    var archiveBtn = document.querySelector('[data-view="archive"]');

    if (listContainer) listContainer.classList.remove('hidden');
    if (paginationEl) paginationEl.classList.remove('hidden');
    if (archiveView) archiveView.classList.remove('active');
    if (seriesView) seriesView.classList.remove('active');

    if (listBtn) { listBtn.classList.remove('active'); listBtn.setAttribute('aria-selected', 'false'); }
    if (seriesBtn) { seriesBtn.classList.remove('active'); seriesBtn.setAttribute('aria-selected', 'false'); }
    if (archiveBtn) { archiveBtn.classList.remove('active'); archiveBtn.setAttribute('aria-selected', 'false'); }

    if (view === 'archive') {
      if (listContainer) listContainer.classList.add('hidden');
      if (paginationEl) paginationEl.classList.add('hidden');
      if (archiveView) archiveView.classList.add('active');
      if (archiveBtn) { archiveBtn.classList.add('active'); archiveBtn.setAttribute('aria-selected', 'true'); }
      if (heading) heading.textContent = '时光归档';
      if (subheading) subheading.textContent = '按年份与月份演进的全站技术博文时光轨迹';
      if (viewLabel) viewLabel.textContent = 'TIMELINE // ARCHIVE';
      if (filtersBar) filtersBar.classList.add('hidden-filters');
      if (!archiveData) loadArchive().then(renderArchive).catch(function(e) { console.error(e); });
      else renderArchive();
    } else if (view === 'series') {
      if (listContainer) listContainer.classList.add('hidden');
      if (paginationEl) paginationEl.classList.add('hidden');
      if (seriesView) seriesView.classList.add('active');
      if (seriesBtn) { seriesBtn.classList.add('active'); seriesBtn.setAttribute('aria-selected', 'true'); }
      if (heading) heading.textContent = '专题专栏';
      if (subheading) subheading.textContent = '6 大体系化工程专栏，涵盖端侧大模型、Android 演进、Kotlin 异步与工程实践';
      if (viewLabel) viewLabel.textContent = 'DOSSIER // SERIES';
      if (filtersBar) filtersBar.classList.add('hidden-filters');
      renderSeries();
    } else {
      if (listBtn) { listBtn.classList.add('active'); listBtn.setAttribute('aria-selected', 'true'); }
      if (heading) heading.textContent = currentFilter === 'all' ? '全部文章' : currentFilter;
      if (subheading) subheading.textContent = '按时间倒序收录的完整技术沉淀与架构思考';
      if (viewLabel) viewLabel.textContent = 'VIEWPORT // POSTS';
      if (filtersBar) filtersBar.classList.remove('hidden-filters');
      // 静态视图（未过滤过）无需重渲染；已切到客户端渲染则重建当前页
      if (dynamic) renderDynamicList();
    }
  }

  // 暴露最小接口（main.js 和 HTML data-view 按钮需要）
  window.toggleBlogView = toggleBlogView;

  // === 事件绑定（替代内联 onclick） ===

  document.addEventListener('click', function(e) {
    // 动态分页按钮（data-page 由 JS 自己生成的才拦截；静态导航是真链接，走正常跳转）
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

  // 浏览器后退：仅客户端渲染模式需要接管（静态分页由浏览器正常导航）
  window.addEventListener('popstate', function() {
    if (!dynamic) return;
    var params = new URLSearchParams(window.location.search);
    applyFilter(params.get('filter') || 'all', { page: parseInt(params.get('page') || '1', 10) || 1, pushState: false });
  });

  // 初始化
  window.addEventListener('DOMContentLoaded', function() {
    window._blogApplyFilter = applyFilter;
    if (redirectLegacyPageParam()) return;   // 旧 ?page=N 兼容跳转中

    var params = new URLSearchParams(window.location.search);
    var viewParam = params.get('view');
    var filterParam = params.get('filter');
    var tagParam = params.get('tag');

    if (viewParam === 'series' || viewParam === 'archive') {
      setTimeout(function() { toggleBlogView(viewParam); }, 10);
      return;
    }
    if (tagParam) {          // 文章侧栏标签链接：?tag=xxx
      applyFilter(tagParam);
      return;
    }
    if (filterParam && filterParam !== 'all') {
      applyFilter(filterParam);
      return;
    }
    // 默认视图：静态卡片 + 静态分页导航已就绪，不做任何重渲染
    filteredPosts = staticCards.slice();
    totalPages = staticTotalPages;
  });
})();
