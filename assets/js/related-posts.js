// ===================================
// Related Posts Recommendations
// ===================================

// Article index with tags
const ARTICLE_INDEX = [
  { slug: "nextjs-prisma-部署-vercel-常见踩坑外键约束与构建时数据修复", tags: ["Next.js", "Prisma", "Vercel", "部署", "DevOps"], title: "Next.js + Prisma 部署 Vercel 常见踩坑：外键约束与构建时数据修复" },
  { slug: "ai-agent-实战用子代理并行驱动多项目开发", tags: ["AI", "Agent", "工程实践", "并行开发"], title: "AI Agent 实战：用子代理并行驱动多项目开发" },
  { slug: "agentic-ai-架构演进从-chatbot-到自主-agent", tags: ["AI", "Agent", "架构"], title: "Agentic AI 架构演进：从 Chatbot 到自主 Agent" },
  { slug: "postgresql-从-17-到-18生产环境升级实战", tags: ["PostgreSQL", "数据库", "DevOps", "性能优化"], title: "PostgreSQL 从 17 到 18：生产环境升级实战" },
  { slug: "ai-编码代理实战从-copilot-到-agent", tags: ["AI", "AI编程", "Agent", "开发规范", "效率提升"], title: "AI 编码代理实战：从 Copilot 到 Agent" },
  { slug: "rust-入局2026-年的生态全景", tags: ["Rust", "TIOBE", "系统编程", "编程语言"], title: "Rust 入局：2026 年的生态全景" },
  { slug: "rust-在-ai-基础设施中的崛起为什么大模型框架纷纷拥抱-rust", tags: ["Rust", "AI", "大模型", "基础设施", "性能优化"], title: "Rust 在 AI 基础设施中的崛起：为什么大模型框架纷纷拥抱 Rust" },
  { slug: "从-tdd-到-tdd²测试驱动开发的进阶实践", tags: ["TDD", "测试", "开发实践", "重构"], title: "从 TDD 到 TDD²：测试驱动开发的进阶实践" },
  { slug: "医生不会告诉你的健康习惯从睡眠到饮食的系统性方案", tags: ["健康", "生活习惯", "效率", "心理"], title: "医生不会告诉你的健康习惯：从睡眠到饮食的系统性方案" },
  { slug: "prisma-orm-完全指南从入门到实战", tags: ["Prisma", "TypeScript", "PostgreSQL", "ORM", "数据库", "Next.js"], title: "Prisma ORM 完全指南：从入门到实战" },
  { slug: "技术人员转行指南当写代码不再是你想做的事", tags: ["转行", "职业选择", "思考", "程序员"], title: "技术人员转行指南：当写代码不再是你想做的事" },
  { slug: "打工人理财第一课从看懂钱去哪了到让钱自己长大", tags: ["理财", "打工人", "程序员", "投资", "省钱", "保险"], title: "打工人理财第一课：从看懂钱去哪了到让钱自己长大" },
  { slug: "当-ai-编程-agent-有了眼睛safari-mcp-server-深度解读", tags: ["AI", "MCP", "WebKit", "Safari", "前端开发", "调试"], title: "当 AI 编程 Agent 有了\"眼睛\"：Safari MCP Server 深度解读" },
  { slug: "这些年我攒下来的生活小技巧", tags: ["生活技巧", "效率", "极简主义", "个人管理"], title: "这些年我攒下来的生活小技巧" },
  { slug: "测试文章", tags: ["test"], title: "测试文章" },
  { slug: "gradle-构建加速全攻略从-5-分钟到-30-秒", tags: ["Gradle", "Android", "构建优化", "性能优化"], title: "Gradle 构建加速全攻略：从 5 分钟到 30 秒" },
  { slug: "kotlin-scope-functions-实战选择五个函数一个决策树", tags: ["Kotlin", "Android", "最佳实践"], title: "Kotlin Scope Functions 实战选择：五个函数一个决策树" },
  { slug: "vps-选购与使用指南五个常见场景的配置与避坑", tags: ["VPS", "服务器", "运维", "DevOps"], title: "VPS 选购与使用指南：五个常见场景的配置与避坑" },
  { slug: "mysql-索引优化实战从慢查询到最佳实践", tags: ["MySQL", "数据库", "索引", "性能优化"], title: "MySQL 索引优化实战：从慢查询到最佳实践" },
  { slug: "ai-编程助手进化论从结对编程到自主编程团队-2026", tags: ["AI 工具", "AI Agent", "Agent", "编程"], title: "AI 编程助手进化论：从结对编程到自主编程团队 (2026)" },
  { slug: "linux-inode-mechanism-deep-dive", tags: ["Linux", "inode", "文件系统", "ext4", "系统编程", "运维"], title: "Linux inode 机制深入理解：从数据结构到实战排查" },
  { slug: "github-actions-auto-index-blog-cicd", tags: ["CI/CD", "DevOps", "GitHub Actions", "前端", "自动化"], title: "GitHub Actions 自动索引：我的静态博客 CI/CD 进化之路" },
  { slug: "programmers-should-learn-to-unplug", tags: ["工作方法", "生活方式", "自我管理"], title: "程序员应该学会「关机」：工作焦虑如何侵蚀你的休息时间" },
  { slug: "static-blog-performance-optimization-59mb", tags: ["性能优化", "静态网站", "GitHub Pages", "前端优化", "CSS", "JavaScript"], title: "静态博客性能优化实战：从 59MB 到精简高效" },
  { slug: "gradle-build-acceleration-5min-to-30sec", tags: ["Gradle", "Android", "构建优化", "KSP", "模块化", "CI", "DevOps"], title: "Gradle 构建加速全攻略：从 5 分钟到 30 秒" },
  { slug: "urban-planning-inspires-software-architecture", tags: ["架构设计", "领域驱动设计", "微服务", "演进式架构", "韧性", "跨行业", "思考"], title: "像规划城市一样设计系统：城市规划给软件架构的启示" },
  { slug: "software-engineer-learns-from-manufacturing-lean", tags: ["精益", "DevOps", "敏捷开发", "持续交付", "流程优化", "跨行业", "思考"], title: "软件工程师能从制造业学到什么：精益思维重塑开发流程" },
  { slug: "how-tech-people-learn-new-tech", tags: ["学习方法", "个人成长", "技术人", "效率", "知识管理"], title: "how-tech-people-learn-new-tech" },
  { slug: "why-tech-people-should-write", tags: ["思考", "写作", "个人成长", "技术人", "学习方法", "个人品牌"], title: "why-tech-people-should-write" },
  { slug: "kotlin-coroutine-exception-handling", tags: ["Kotlin", "协程", "Coroutine", "异常处理", "Android", "Kotlin进阶"], title: "Kotlin Coroutine 异常处理机制全面解析" },
  { slug: "android-15-privacy-media-visual-permission", tags: ["Android", "隐私", "Android 15", "权限", "适配"], title: "Android 15 隐私新特性：所有文件都需要 MEDIA_VISUAL_PERMISSION" },
  { slug: "soft-skills-tech-people-overlook", tags: ["思考", "软技能", "职业发展", "技术人成长", "沟通"], title: "代码之外的竞争力：技术人最容易忽视的软技能" },
  { slug: "less-is-more-focus-in-information-age", tags: ["思考", "专注力", "深度工作", "信息管理", "自我管理"], title: "少即是多：信息过载时代的专注力修炼" },
  { slug: "why-i-started-blogging", tags: ["思考", "学习", "个人成长", "博客"], title: "为什么我开始写博客：从潜水到发声" },
  { slug: "android-16-foreground-service-constraints", tags: ["Android 16", "前台服务", "后台任务", "WorkManager"], title: "Android 16 前台服务类型全新限制：类型强制匹配与迁移指南" },
  { slug: "cursor-rules-guide", tags: ["Cursor", "AI编程", "效率工具", "开发规范"], title: "Cursor Rules 实战：自定义 AI 代码助手的进阶指南" },
  { slug: "mcp-server-deep-dive", tags: ["AI", "MCP", "工具调用", "协议"], title: "MCP 协议深入实战：从入门到编写自定义 MCP Server" },
  { slug: "ai-code-editor-review-cursor-windsurf-copilot", tags: ["AI", "AI 工具", "开发技巧"], title: "AI 代码编辑器深度横评：Cursor vs Windsurf vs Copilot" },
  { slug: "git-worktree-multi-branch-guide", tags: ["Git", "开发技巧", "效率工具"], title: "Git Worktree 高效多分支开发指南" },
  { slug: "ai-agent-skill-development", tags: ["AI", "Agent", "\u5f00\u53d1\u6280\u5de7", "OpenClaw"], title: "AI Agent 技能开发实战" },
  { slug: "ai-coding-tools-comparison", tags: ["AI 工具", "Cursor", "Claude Code", "GitHub Copilot", "编程效率"], title: "主流 AI 编程工具深度对比" },
  { slug: "ai-coding-workflow-optimization", tags: ["AI", "工作流", "Prompt设计", "效率提升"], title: "AI 编程工作流优化" },
  { slug: "android-16-background-tasks", tags: ["Android 16", "后台任务", "WorkManager", "前台服务", "电池优化"], title: "Android 16 后台任务新限制：开发者迁移指南" },
  { slug: "android-16-features", tags: ["Android", "Android 16", "Live Updates", "AICore", "大屏适配"], title: "Android 16 新特性详解" },
  { slug: "android-16-notifications", tags: ["Android 16", "通知系统", "Live Updates", "Notifications", "Android 开发"], title: "Android 16 通知系统新 API 详解" },
  { slug: "android-app-security-hardening", tags: ["Android", "安全", "签名", "混淆", "Play Integrity"], title: "Android 应用签名与安全加固" },
  { slug: "android-gemini-nano-integration", tags: ["Android", "AI", "Gemini Nano", "端侧AI", "ML Kit"], title: "Android 端侧 AI 实战：Gemini Nano" },
  { slug: "android-gradle-kts-migration", tags: ["Android", "Gradle", "KTS", "Kotlin DSL", "构建优化"], title: "Android Gradle 迁移到 KTS 完整指南：从 Groovy 到 Kotlin DSL" },
  { slug: "android-hilt-dependency-injection", tags: ["Hilt", "依赖注入", "Android", "Dagger", "ViewModel", "模块化"], title: "Android Hilt 依赖注入最佳实践：从入门到架构" },
  { slug: "android-offline-speech-input", tags: ["Android", "离线语音识别", "Sherpa ONNX", "Whisper", "端侧AI"], title: "Android 离线语音输入实现方案" },
  { slug: "android-performance-optimization", tags: ["Android", "性能优化", "启动优化", "内存优化", "渲染优化"], title: "Android 性能优化完整实战：从启动到渲染" },
  { slug: "compose-april-2026-update", tags: ["Jetpack Compose", "Android", "Compose Multiplatform", "UI", "Kotlin"], title: "Jetpack Compose April 2026 Update" },
  { slug: "compose-navigation-guide", tags: ["Jetpack Compose", "Android", "Navigation", "Kotlin", "DeepLink"], title: "Jetpack Compose Navigation 进阶指南：从路由设计到深层链接" },
  { slug: "css-container-queries", tags: ["CSS", "Container Queries", "响应式设计", "前端开发"], title: "CSS Container Queries 实战" },
  { slug: "css-view-transitions", tags: ["前端", "CSS", "View Transitions", "页面过渡", "SPA"], title: "CSS View Transitions API 实战：页面过渡动画新范式" },
  { slug: "docker-compose-best-practices", tags: ["Docker", "Docker Compose", "容器化", "DevOps"], title: "Docker Compose 最佳实践" },
  { slug: "gemini-notebooklm-integration", tags: ["AI 工具", "Gemini", "NotebookLM", "Notebooks", "生产力", "Google AI"], title: "Gemini Notebooks 深度体验" },
  { slug: "gemini-notebooklm-workflow", tags: ["AI 工具", "Gemini", "NotebookLM", "生产力", "知识管理"], title: "Gemini + NotebookLM 使用指南" },
  { slug: "git-advanced-techniques", tags: ["Git", "版本控制", "开发技巧", "团队协作"], title: "Git 高级技巧" },
  { slug: "github-actions-advanced", tags: ["DevOps", "GitHub Actions", "CI/CD", "OIDC", "自动化"], title: "GitHub Actions 高级工作流：CI/CD 最佳实践" },
  { slug: "github-pages-blog-setup", tags: ["GitHub Pages", "博客系统", "自动化部署", "CI/CD", "静态网站"], title: "从零搭建个人博客系统" },
  { slug: "go-concurrency-patterns", tags: ["Go", "Golang", "并发", "Goroutine", "Channel", "Context"], title: "Go 并发模式：Channel 与 Context" },
  { slug: "google-io-2026-recap", tags: ["AI", "Android", "Google I/O", "Gemini", "Agent"], title: "Google I/O 2026 完整回顾" },
  { slug: "https-tls13-deep-dive", tags: ["安全", "HTTPS", "TLS 1.3", "Nginx"], title: "HTTPS 与 TLS 1.3 深度解析" },
  { slug: "jetpack-compose-animation", tags: ["Jetpack Compose", "Android", "动画", "Kotlin", "UI"], title: "Jetpack Compose 动画实战" },
  { slug: "kotlin-240-features", tags: ["Kotlin", "编程语言", "JetBrains", "JVM", "Kotlin 2.4.0", "Context Parameters", "Compose Multiplatform"], title: "Kotlin 2.4.0 重磅发布" },
  { slug: "kotlin-coroutines-best-practices", tags: ["Kotlin", "Coroutines", "异步编程", "Android", "最佳实践"], title: "Kotlin Coroutines 最佳实践" },
  { slug: "kotlin-flow-advanced", tags: ["Kotlin Flow", "背压策略", "SharedFlow", "StateFlow", "Android"], title: "Kotlin Flow 进阶：背压策略与共享流" },
  { slug: "kotlin-multiplatform-practice", tags: ["Kotlin Multiplatform", "KMP", "Android", "iOS", "跨平台", "Ktor"], title: "Kotlin Multiplatform 实战：共享业务逻辑到 iOS" },
  { slug: "linux-ebpf-getting-started", tags: ["eBPF", "Linux 内核", "可观测性", "bpftrace", "云原生"], title: "Linux eBPF 入门：内核可观测性新范式" },
  { slug: "local-rag-ollama", tags: ["RAG", "Ollama", "LLM", "向量数据库", "本地部署"], title: "RAG 本地实践：用 Ollama 搭建私有知识库" },
  { slug: "mcp-android-integration", tags: ["Android", "MCP", "AI", "Agent", "Kotlin"], title: "MCP 协议在 Android 端的应用" },
  { slug: "mobile-gs-paper-review", tags: ["3D\u6e32\u67d3", "\u79fb\u52a8\u7aef", "\u8bba\u6587\u89e3\u8bfb", "ICLR"], title: "Mobile-GS：移动端 3D 高斯泼溅" },
  { slug: "nextjs-16-tutorial", tags: ["Next.js", "React", "全栈开发", "App Router", "Server Actions"], title: "Next.js 16 实战" },
  { slug: "nginx-reverse-proxy-tuning", tags: ["Nginx", "反向代理", "性能调优", "SSL", "负载均衡", "DevOps"], title: "Nginx 反向代理性能调优：从入门到生产" },
  { slug: "onnx-mobile-deployment", tags: ["ONNX", "移动端AI", "模型量化", "Android", "端侧推理"], title: "ONNX 移动端模型部署" },
  { slug: "openclaw-guide", tags: ["OpenClaw", "AI", "Agent", "\u5f00\u53d1\u6280\u5de7"], title: "OpenClaw 深度使用指南" },
  { slug: "postgresql-index-optimization", tags: ["PostgreSQL", "索引优化", "B-Tree", "GIN", "EXPLAIN", "慢查询", "数据库"], title: "PostgreSQL 索引优化实战" },
  { slug: "prompt-engineering-systematic", tags: ["Prompt Engineering", "CRISPE", "Chain-of-Thought", "Function Calling", "AI"], title: "Prompt Engineering 系统化方法论" },
  { slug: "pwa-offline-web-app", tags: ["PWA", "\u524d\u7aef", "\u79bb\u7ebfWeb", "Service Worker"], title: "PWA 实战：离线 Web 应用" },
  { slug: "rag-introduction", tags: ["RAG", "检索增强生成", "LLM", "向量数据库", "Embedding", "LangChain", "AI"], title: "RAG 检索增强生成入门：从理念到落地" },
  { slug: "react-server-components", tags: ["React", "Server Components", "Next.js", "前端架构"], title: "React Server Components 深入解析" },
  { slug: "rust-getting-started", tags: ["Rust", "系统编程", "所有权", "内存安全"], title: "Rust 入门：从零到生产" },
  { slug: "sqlite-wal-performance", tags: ["SQLite", "数据库", "WAL", "性能优化"], title: "SQLite 进阶：WAL 模式与性能优化" },
  { slug: "ssh-security-hardening", tags: ["SSH", "\u5b89\u5168", "DevOps", "\u670d\u52a1\u5668"], title: "SSH 安全加固完整指南" },
  { slug: "tailscale-derp-server", tags: ["Tailscale", "\u7f51\u7edc", "VPN", "\u81ea\u5efa"], title: "自建 Tailscale DERP 中继服务器" },
  { slug: "typescript-type-gymnastics", tags: ["TypeScript", "类型体操", "前端", "类型安全"], title: "TypeScript 类型体操指南" },
  { slug: "vscode-port-forward", tags: ["VS Code", "\u5f00\u53d1\u5de5\u5177", "\u7aef\u53e3\u8f6c\u53d1", "\u8fdc\u7a0b\u5f00\u53d1"], title: "VS Code 端口转发原理详解" },
  { slug: "webassembly-in-practice", tags: ["WebAssembly", "Rust", "前端性能", "WASM", "浏览器"], title: "WebAssembly 实战：浏览器端高性能计算" },
  { slug: "zig-language-introduction", tags: ["Zig", "系统编程", "comptime", "Allocator", "交叉编译", "build.zig", "C 互操作"], title: "Zig 语言入门：比 C 更安全的系统编程" }
];

function initRelatedPosts() {
  // 使用 querySelectorAll 获取所有匹配元素，检查第一个
  const postTagsElements = document.querySelectorAll('.post-tags');
  if (postTagsElements.length === 0) {
    return;
  }
  const postTags = postTagsElements[0];
  const postContent = document.querySelector('.post-content');
  if (!postContent || !postTags) {
    return;
  }
  
  // Identify current article from URL
  // 注意：URL 中的中文是编码的（如 %E9%9A%90），需要解码
  const currentPath = window.location.pathname;
  let currentSlug = currentPath.split('/').pop().replace('.html', '');
  // 解码 URL 编码的中文字符
  try { currentSlug = decodeURIComponent(currentSlug); } catch (e) {}
  const currentArticle = ARTICLE_INDEX.find(a => a.slug === currentSlug);
  if (!currentArticle) {
    return;
  }
  
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
  
  if (scored.length === 0) {
    return;
  }
  
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