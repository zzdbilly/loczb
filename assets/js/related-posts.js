// ===================================
// Related Posts Recommendations
// ===================================

// Article index with tags
const ARTICLE_INDEX = [
  { slug: "ai-agent-skill-development", tags: [], title: "AI Agent 技能开发实战" },
  { slug: "ai-coding-tools-comparison", tags: ["AI 工具", "Cursor", "Claude Code", "GitHub Copilot", "编程效率"], title: "主流 AI 编程工具深度对比" },
  { slug: "ai-coding-workflow-optimization", tags: ["AI", "工作流", "Prompt设计", "效率提升"], title: "AI 编程工作流优化" },
  { slug: "android-16-features", tags: ["Android", "Android 16", "Live Updates", "AICore", "大屏适配"], title: "Android 16 新特性详解" },
  { slug: "android-app-security-hardening", tags: ["Android", "安全", "签名", "混淆", "Play Integrity"], title: "Android 应用签名与安全加固" },
  { slug: "android-gemini-nano-integration", tags: ["Android", "AI", "Gemini Nano", "端侧AI", "ML Kit"], title: "Android 端侧 AI 实战：Gemini Nano" },
  { slug: "android-offline-speech-input", tags: ["Android", "离线语音识别", "Sherpa ONNX", "Whisper", "端侧AI"], title: "Android 离线语音输入实现方案" },
  { slug: "compose-april-2026-update", tags: ["Jetpack Compose", "Android", "Compose Multiplatform", "UI", "Kotlin"], title: "Jetpack Compose April 2026 Update" },
  { slug: "css-container-queries", tags: ["CSS", "Container Queries", "响应式设计", "前端开发"], title: "CSS Container Queries 实战" },
  { slug: "docker-compose-best-practices", tags: ["Docker", "Docker Compose", "容器化", "DevOps"], title: "Docker Compose 最佳实践" },
  { slug: "gemini-notebooklm-integration", tags: ["AI 工具", "Gemini", "NotebookLM", "Notebooks", "生产力", "Google AI"], title: "Gemini Notebooks 深度体验" },
  { slug: "gemini-notebooklm-workflow", tags: ["AI 工具", "Gemini", "NotebookLM", "生产力", "知识管理"], title: "Gemini + NotebookLM 使用指南" },
  { slug: "git-advanced-techniques", tags: ["Git", "版本控制", "开发技巧", "团队协作"], title: "Git 高级技巧" },
  { slug: "github-pages-blog-setup", tags: ["GitHub Pages", "博客系统", "自动化部署", "CI/CD", "静态网站"], title: "从零搭建个人博客系统" },
  { slug: "google-io-2026-recap", tags: ["AI", "Android", "Google I/O", "Gemini", "Agent"], title: "Google I/O 2026 完整回顾" },
  { slug: "jetpack-compose-animation", tags: ["Jetpack Compose", "Android", "动画", "Kotlin", "UI"], title: "Jetpack Compose 动画实战" },
  { slug: "kotlin-240-features", tags: ["Kotlin", "编程语言", "JetBrains", "JVM", "Kotlin 2.4.0", "Context Parameters", "Compose Multiplatform"], title: "Kotlin 2.4.0 重磅发布" },
  { slug: "kotlin-coroutines-best-practices", tags: ["Kotlin", "Coroutines", "异步编程", "Android", "最佳实践"], title: "Kotlin Coroutines 最佳实践" },
  { slug: "local-rag-ollama", tags: ["RAG", "Ollama", "LLM", "向量数据库", "本地部署"], title: "RAG 本地实践：用 Ollama 搭建私有知识库" },
  { slug: "mcp-android-integration", tags: ["Android", "MCP", "AI", "Agent", "Kotlin"], title: "MCP 协议在 Android 端的应用" },
  { slug: "mobile-gs-paper-review", tags: [], title: "Mobile-GS：移动端 3D 高斯泼溅" },
  { slug: "nextjs-16-tutorial", tags: ["Next.js", "React", "全栈开发", "App Router", "Server Actions"], title: "Next.js 16 实战" },
  { slug: "onnx-mobile-deployment", tags: ["ONNX", "移动端AI", "模型量化", "Android", "端侧推理"], title: "ONNX 移动端模型部署" },
  { slug: "openclaw-guide", tags: [], title: "OpenClaw 深度使用指南" },
  { slug: "pwa-offline-web-app", tags: [], title: "PWA 实战：离线 Web 应用" },
  { slug: "react-server-components", tags: ["React", "Server Components", "Next.js", "前端架构"], title: "React Server Components 深入解析" },
  { slug: "rust-getting-started", tags: ["Rust", "系统编程", "所有权", "内存安全"], title: "Rust 入门：从零到生产" },
  { slug: "sqlite-wal-performance", tags: ["SQLite", "数据库", "WAL", "性能优化"], title: "SQLite 进阶：WAL 模式与性能优化" },
  { slug: "ssh-security-hardening", tags: [], title: "SSH 安全加固完整指南" },
  { slug: "tailscale-derp-server", tags: [], title: "自建 Tailscale DERP 中继服务器" },
  { slug: "typescript-type-gymnastics", tags: ["TypeScript", "类型体操", "前端", "类型安全"], title: "TypeScript 类型体操指南" },
  { slug: "vscode-port-forward", tags: [], title: "VS Code 端口转发原理详解" }
];

function initRelatedPosts() {
  const postContent = document.querySelector('.post-content');
  const postTags = document.querySelector('.post-tags');
  if (!postContent || !postTags) return;
  
  // Identify current article from URL
  const currentPath = window.location.pathname;
  const currentSlug = currentPath.split('/').pop().replace('.html', '');
  const currentArticle = ARTICLE_INDEX.find(a => a.slug === currentSlug);
  if (!currentArticle) return;
  
  // Find related articles by tag overlap
  const scored = ARTICLE_INDEX
    .filter(a => a.slug !== currentSlug)
    .map(a => {
      const overlap = a.tags.filter(t => currentArticle.tags.includes(t)).length;
      return { ...a, score: overlap };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  
  if (scored.length === 0) return;
  
  // Build HTML
  const section = document.createElement('div');
  section.className = 'related-posts';
  
  const heading = document.createElement('div');
  heading.className = 'related-posts-title';
  heading.textContent = '📌 相关文章';
  section.appendChild(heading);
  
  const list = document.createElement('div');
  list.className = 'related-posts-list';
  
  scored.forEach(article => {
    const card = document.createElement('a');
    card.className = 'related-post-card';
    card.href = article.slug + '.html';
    
    const title = document.createElement('div');
    title.className = 'related-post-card-title';
    title.textContent = article.title;
    card.appendChild(title);
    
    if (article.tags.length > 0) {
      const tags = document.createElement('div');
      tags.className = 'related-post-card-tags';
      article.tags.slice(0, 3).forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        tags.appendChild(span);
      });
      card.appendChild(tags);
    }
    
    list.appendChild(card);
  });
  
  section.appendChild(list);
  postTags.parentNode.insertBefore(section, postTags.nextSibling);
}

document.addEventListener('DOMContentLoaded', initRelatedPosts);