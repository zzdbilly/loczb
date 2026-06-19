/**
 * Site Search - 站内搜索
 * 支持按标题、摘要、标签搜索博客文章
 */

class SiteSearch {
  constructor() {
    this.posts = [];
    this.searchInput = null;
    this.searchResults = null;
    this.isOpen = false;
    this.init();
  }

  async init() {
    // 加载文章数据
    await this.loadPosts();
    // 创建搜索 UI
    this.createUI();
    this.bindEvents();
  }

  async loadPosts() {
    // 文章数据（可以从外部 JSON 加载，这里直接嵌入）
    this.posts = [
      { title: 'AI 编程工作流优化：从 Prompt 设计到上下文管理', url: 'blog/posts/ai-coding-workflow-optimization.html', date: '2026-05-08', category: 'AI', tags: ['AI', '工作流', 'Prompt'], excerpt: '从 Prompt 设计到上下文管理的实战指南，掌握高效 AI 辅助编程的核心方法论。' },
      { title: 'Android 端侧 AI 实战：Gemini Nano 集成指南', url: 'blog/posts/android-gemini-nano-integration.html', date: '2026-05-07', category: 'Android', tags: ['Android', 'Gemini Nano', '端侧AI'], excerpt: '深入解析 AICore 架构与 ML Kit GenAI API，提供完整集成代码与性能优化建议。' },
      { title: 'SQLite 进阶：WAL 模式与性能优化', url: 'blog/posts/sqlite-wal-performance.html', date: '2026-04-26', category: '数据库', tags: ['SQLite', '数据库', '性能优化'], excerpt: '深入 SQLite 的 WAL 模式原理、并发处理、索引策略、PRAGMA 配置等性能优化技巧。' },
      { title: 'Docker Compose 最佳实践', url: 'blog/posts/docker-compose-best-practices.html', date: '2026-04-26', category: 'DevOps', tags: ['Docker', 'DevOps', '容器化'], excerpt: '多容器编排、网络配置、数据持久化、环境变量管理、健康检查等实战技巧。' },
      { title: 'Rust 入门：从零到生产', url: 'blog/posts/rust-getting-started.html', date: '2026-04-26', category: '系统编程', tags: ['Rust', '系统编程'], excerpt: '从零开始学习 Rust，掌握所有权、借用、生命周期等核心概念。' },
      { title: 'CSS Container Queries 实战', url: 'blog/posts/css-container-queries.html', date: '2026-04-26', category: '前端', tags: ['CSS', '前端', '响应式'], excerpt: '深入理解 Container Queries 的工作原理和实际应用场景。' },
      { title: 'React Server Components 深度解析', url: 'blog/posts/react-server-components.html', date: '2026-04-26', category: '前端', tags: ['React', '前端', 'SSR'], excerpt: '理解 React Server Components 的设计理念、优势和最佳实践。' },
      { title: 'Git 高级技巧', url: 'blog/posts/git-advanced-techniques.html', date: '2026-04-25', category: '开发', tags: ['Git', '开发工具'], excerpt: 'Git 高级命令、工作流优化、问题排查技巧。' },
      { title: 'Jetpack Compose 动画实战', url: 'blog/posts/jetpack-compose-animation.html', date: '2026-04-25', category: 'Android', tags: ['Android', 'Jetpack Compose', '动画'], excerpt: 'Compose 动画 API 详解，从简单动画到复杂状态转换。' },
      { title: 'TypeScript 类型体操', url: 'blog/posts/typescript-type-gymnastics.html', date: '2026-04-25', category: '前端', tags: ['TypeScript', '前端', '类型系统'], excerpt: '掌握 TypeScript 高级类型技巧，提升代码类型安全性。' },
      { title: 'Next.js 16 教程', url: 'blog/posts/nextjs-16-tutorial.html', date: '2026-04-20', category: '前端', tags: ['Next.js', 'React', '前端'], excerpt: 'Next.js 16 新特性、App Router、Server Actions 实战。' },
      { title: 'AI 编程工具对比', url: 'blog/posts/ai-coding-tools-comparison.html', date: '2026-04-19', category: 'AI', tags: ['AI', '编程工具', '效率'], excerpt: 'Cursor、Copilot、Claude 等 AI 编程工具对比分析。' },
      { title: 'Gemini + NotebookLM 集成', url: 'blog/posts/gemini-notebooklm-integration.html', date: '2026-04-11', category: 'AI', tags: ['AI', 'Gemini', 'NotebookLM'], excerpt: 'Gemini 与 NotebookLM 的集成实践。' },
      { title: 'GitHub Pages 博客搭建', url: 'blog/posts/github-pages-blog-setup.html', date: '2026-04-09', category: 'DevOps', tags: ['GitHub Pages', '博客', 'DevOps'], excerpt: '从零开始搭建 GitHub Pages 个人博客。' },
      { title: 'Kotlin 协程最佳实践', url: 'blog/posts/kotlin-coroutines-best-practices.html', date: '2026-04-08', category: 'Android', tags: ['Kotlin', 'Android', '协程'], excerpt: 'Kotlin 协程的正确使用姿势和常见陷阱。' },
      { title: '本地 RAG + Ollama 实战', url: 'blog/posts/local-rag-ollama.html', date: '2026-04-07', category: 'AI', tags: ['AI', 'RAG', 'Ollama'], excerpt: '使用 Ollama 搭建本地 RAG 知识库。' },
      { title: 'Android 离线语音输入', url: 'blog/posts/android-offline-speech-input.html', date: '2026-04-03', category: 'Android', tags: ['Android', '语音识别', '离线'], excerpt: 'Android 端离线语音输入实现方案。' },
      { title: 'ONNX 移动端部署', url: 'blog/posts/onnx-mobile-deployment.html', date: '2026-04-02', category: 'AI', tags: ['AI', 'ONNX', '移动端'], excerpt: 'ONNX 模型在移动端的部署优化。' },
      { title: 'PWA 离线 Web 应用', url: 'blog/posts/pwa-offline-web-app.html', date: '2026-04-02', category: '前端', tags: ['PWA', '前端', '离线'], excerpt: 'PWA 实战：从零打造离线可用的 Web 应用。' },
      { title: 'OpenClaw 深度使用指南', url: 'blog/posts/openclaw-guide.html', date: '2026-03-14', category: 'AI', tags: ['AI Agent', 'OpenClaw', '自动化'], excerpt: '全面介绍 OpenClaw 的安装配置、核心功能、高级技巧。' }
    ];
  }

  createUI() {
    const html = `
      <!-- Search Toggle Button -->
      <button id="search-toggle" class="search-toggle" aria-label="搜索" title="搜索 (Ctrl+K)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <span class="search-toggle-shortcut">⌘K</span>
      </button>

      <!-- Search Modal -->
      <div id="search-modal" class="search-modal" aria-hidden="true">
        <div class="search-modal-backdrop"></div>
        <div class="search-modal-content">
          <div class="search-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" id="search-input" placeholder="搜索文章..." autocomplete="off" aria-label="搜索文章">
            <button class="search-close" aria-label="关闭搜索">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div id="search-results" class="search-results"></div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    this.searchInput = document.getElementById('search-input');
    this.searchResults = document.getElementById('search-results');
  }

  bindEvents() {
    const toggle = document.getElementById('search-toggle');
    const modal = document.getElementById('search-modal');
    const close = document.querySelector('.search-close');
    const backdrop = document.querySelector('.search-modal-backdrop');

    toggle.addEventListener('click', () => this.open());
    close.addEventListener('click', () => this.close());
    backdrop.addEventListener('click', () => this.close());

    this.searchInput.addEventListener('input', (e) => this.search(e.target.value));

    // 快捷键
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.isOpen ? this.close() : this.open();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open() {
    const modal = document.getElementById('search-modal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    this.searchInput.focus();
    this.isOpen = true;
  }

  close() {
    const modal = document.getElementById('search-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    this.searchInput.value = '';
    this.searchResults.innerHTML = '';
    this.isOpen = false;
  }

  search(query) {
    if (!query.trim()) {
      this.searchResults.innerHTML = '';
      return;
    }

    const q = query.toLowerCase();
    const results = this.posts.filter(post => {
      return post.title.toLowerCase().includes(q) ||
             post.excerpt.toLowerCase().includes(q) ||
             post.tags.some(tag => tag.toLowerCase().includes(q)) ||
             post.category.toLowerCase().includes(q);
    });

    this.renderResults(results, query);
  }

  renderResults(results, query) {
    if (results.length === 0) {
      this.searchResults.innerHTML = `
        <div class="search-empty">
          <p>没有找到 "${query}" 相关的文章</p>
        </div>
      `;
      return;
    }

    // Calculate correct URL based on current page depth
    // post.url is always 'blog/posts/xxx.html' (relative from site root)
    // Count how many directory levels deep we are from the root
    const pathParts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    const depth = pathParts.length;
    // depth 0 = root (homepage), depth 1 = /blog/ or /projects/, depth 2 = /blog/posts/
    const basePath = depth > 0 ? '../'.repeat(depth) : '';
    
    const html = results.map(post => `
      <a href="${basePath}${post.url}" class="search-result-item">
        <div class="search-result-meta">
          <span class="search-result-category">${post.category}</span>
          <span class="search-result-date">${post.date}</span>
        </div>
        <h4 class="search-result-title">${this.highlight(post.title, query)}</h4>
        <p class="search-result-excerpt">${this.highlight(post.excerpt, query)}</p>
        <div class="search-result-tags">
          ${post.tags.map(tag => `<span class="search-tag">${tag}</span>`).join('')}
        </div>
      </a>
    `).join('');

    this.searchResults.innerHTML = `<div class="search-results-list">${html}</div>`;
  }

  highlight(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// 初始化搜索
document.addEventListener('DOMContentLoaded', () => {
  window.siteSearch = new SiteSearch();
});
