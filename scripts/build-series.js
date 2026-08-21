#!/usr/bin/env node
/**
 * 系列专栏聚合构建脚本 (Article Series Builder)
 * 为 100 篇博文中的核心文章注入专栏便当盒 (Series Widget) 与专栏上下篇直达卡片 (Series Nav)
 *
 * 运行方式: node scripts/build-series.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, 'blog', 'posts');
const ARTICLES_JSON = path.join(ROOT_DIR, 'blog', 'articles-index.json');

// 6 大核心旗舰系列专栏定义
const SERIES_CONFIG = [
  {
    id: 'ai-agent',
    title: 'AI Agent 与本地大模型实战',
    desc: '从平台工作区迁移、定时自动化脚本投递，到 MCP 协议集成、本地 RAG 知识库与端侧大模型落地实录。',
    articles: [
      'ai-助手定时任务投递指南从-agent-废话到-no-agent-脚本',
      '从-openclaw-到-hermesai-agent-工作区迁移完整记录',
      'openclaw-guide',
      'local-rag-ollama',
      'rag-introduction',
      'ai-agent-skill-development',
      'mcp-server-deep-dive',
      'mcp-android-integration',
      'android-gemini-nano-integration'
    ]
  },
  {
    id: 'android-16',
    title: 'Android 16 深度演进与系统适配',
    desc: '系统梳理 Android 16 核心新特性、前台服务与后台任务约束、通知系统重构与性能深度调优。',
    articles: [
      'android-16-features',
      'android-16-notifications',
      'android-16-background-tasks',
      'android-16-foreground-service-constraints',
      'android-15-privacy-media-visual-permission',
      'android-performance-optimization'
    ]
  },
  {
    id: 'kotlin-modern',
    title: 'Kotlin 现代并发与响应式架构',
    desc: '深入剖析 Kotlin 协程最佳实践、异常处理机制、Flow 背压策略、KMP 跨端与现代语言演进。',
    articles: [
      'kotlin-coroutines-best-practices',
      'kotlin-coroutine-exception-handling',
      'kotlin-flow-advanced',
      'kotlin-240-features',
      'kotlin-multiplatform-practice',
      'kotlin-coroutines-并发实战从入门到优雅的并发编程',
      'kotlin-scope-functions-实战选择五个函数一个决策树'
    ]
  },
  {
    id: 'compose-ui',
    title: 'Jetpack Compose 现代 UI 实战',
    desc: '掌握 Compose 动画体系、Navigation 路由解耦与最新版本特性，构建高性能声明式 UI。',
    articles: [
      'compose-april-2026-update',
      'compose-navigation-guide',
      'jetpack-compose-animation'
    ]
  },
  {
    id: 'fullstack-arch',
    title: '全栈工程化与高性能架构',
    desc: '聚焦构建提速、静态化极致性能、容器化运维、数据库 WAL 索引优化与高可用网关设计。',
    articles: [
      'static-blog-performance-optimization-59mb',
      'gradle-build-acceleration-5min-to-30sec',
      'docker-compose-best-practices',
      'sqlite-wal-performance',
      'postgresql-index-optimization',
      'nginx-reverse-proxy-tuning'
    ]
  },
  {
    id: 'engineering-mindset',
    title: '程序员的工程思维与成长',
    desc: '将系统工程思维融入带娃、技术写作、认知进阶与生活节奏，构建可持续的长期复利成长模式。',
    articles: [
      '程序员带娃把养孩子当成一个长期运维的系统工程',
      'why-tech-people-should-write',
      'how-tech-people-learn-new-tech',
      'programmers-should-learn-to-unplug',
      'soft-skills-tech-people-overlook',
      'less-is-more-focus-in-information-age'
    ]
  }
];

// 遍历并更新文章 HTML
let updatedCount = 0;

SERIES_CONFIG.forEach(series => {
  const total = series.articles.length;

  // 预读取文章真实标题
  const articleMeta = series.articles.map(slug => {
    const filename = slug.endsWith('.html') ? slug : slug + '.html';
    const filePath = path.join(POSTS_DIR, filename);
    let title = slug;
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const tm = content.match(/<title>([^<]+)<\/title>/);
      if (tm) title = tm[1].replace(/ \| 张小猛 - loczb$/, '');
    }
    return { slug, filename, title };
  });

  series.articles.forEach((slug, idx) => {
    const filename = slug.endsWith('.html') ? slug : slug + '.html';
    const filePath = path.join(POSTS_DIR, filename);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    const order = idx + 1;

    // 构建顶部专栏便当盒
    const listHtml = articleMeta.map((item, i) => {
      if (i === idx) {
        return `<li class="series-item current-article"><span>[${i+1}/${total}] ${item.title} (当前阅读)</span></li>`;
      } else {
        return `<li class="series-item"><a href="${item.filename}">[${i+1}/${total}] ${item.title}</a></li>`;
      }
    }).join('\n            ');

    const seriesCardHtml = `
        <!-- Series Card Widget -->
        <div class="series-card spotlight-card">
          <div class="series-header">
            <div class="series-badge">
              <span class="pulse-dot"></span>
              <span>专题专栏</span>
            </div>
            <span class="series-progress">第 ${order} 篇 · 共 ${total} 篇</span>
          </div>
          <div class="series-name">《${series.title}》</div>
          <div class="series-desc">${series.desc}</div>
          <details class="series-accordion">
            <summary class="series-summary">查看专栏全集目录 (${total} 篇文章) ▾</summary>
            <ol class="series-list">
            ${listHtml}
            </ol>
          </details>
        </div>
        <!-- /Series Card Widget -->`;

    // 移除旧的 series-banner 或 series-card
    content = content.replace(/<!-- Series Card Widget -->[\s\S]*?<!-- \/Series Card Widget -->\s*/g, '');
    content = content.replace(/<div class="series-banner[\s\S]*?<\/div>\s*/g, '');

    // 注入到 post-tags 后面
    if (content.includes('class="post-tags"')) {
      content = content.replace(/(<div class="post-tags">[\s\S]*?<\/div>)/, `$1\n${seriesCardHtml}`);
    }

    // 构建底部专栏上一篇/下一篇
    let prevItem = idx > 0 ? articleMeta[idx - 1] : null;
    let nextItem = idx < total - 1 ? articleMeta[idx + 1] : null;

    if (prevItem || nextItem) {
      let navHtml = `
      <!-- Series Nav Widget -->
      <div class="series-nav">
        ${prevItem ? `
        <a href="${prevItem.filename}" class="series-nav-btn series-nav-prev">
          <span class="series-nav-sub">← 专栏上一篇 (${idx}/${total})</span>
          <span class="series-nav-title">${prevItem.title}</span>
        </a>` : '<div></div>'}
        ${nextItem ? `
        <a href="${nextItem.filename}" class="series-nav-btn series-nav-next">
          <span class="series-nav-sub">专栏下一篇 (${idx+2}/${total}) →</span>
          <span class="series-nav-title">${nextItem.title}</span>
        </a>` : '<div></div>'}
      </div>
      <!-- /Series Nav Widget -->`;

      // 移除旧的 series-nav
      content = content.replace(/<!-- Series Nav Widget -->[\s\S]*?<!-- \/Series Nav Widget -->\s*/g, '');

      // 注入在 相关文章 hr 之前
      if (content.includes('<!-- Related Posts / Navigation -->')) {
        content = content.replace('<!-- Related Posts / Navigation -->', `${navHtml}\n  <!-- Related Posts / Navigation -->`);
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    updatedCount++;
  });
});

console.log(`✅ 成功将 ${SERIES_CONFIG.length} 大专栏注入到 ${updatedCount} 篇相关核心博文中！`);
