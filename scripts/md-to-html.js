const fs = require('fs');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

// 初始化 markdown-it，启用代码高亮
const md = new MarkdownIt({
  html: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, value: str }).value +
          '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

// 读取 Markdown 文件
const markdownContent = fs.readFileSync('./blog/mobile-gs-paper-review.md', 'utf8');

// 转换为 HTML
const htmlContent = md.render(markdownContent);

// 生成完整 HTML 页面
const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Mobile-GS：让 3D 高斯泼溅在移动端实时渲染 - 论文解读，ICLR 2026，移动端 3D 渲染新突破">
  <meta name="keywords" content="Mobile-GS, 3D Gaussian Splatting, 3DGS, 移动端渲染，计算机视觉，AI, ICLR 2026">
  <meta name="author" content="张小猛">
  <meta name="publish-date" content="2026-03-16">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Mobile-GS：让 3D 高斯泼溅在移动端实时渲染">
  <meta property="og:description" content="论文解读：Mobile-GS 第一次让 3DGS 在移动端实现实时渲染，骁龙 8 Gen 3 上 116 FPS，模型仅 4.8MB">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://zzdbilly.github.io/loczb/blog/posts/mobile-gs-paper-review.html">
  
  <title>Mobile-GS：让 3D 高斯泼溅在移动端实时渲染 | 张小猛 - loczb</title>
  
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍡</text></svg>">
  <link rel="stylesheet" href="../../assets/css/style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
  
  <style>
    .post-content {
      max-width: 720px;
      margin: 0 auto;
      line-height: 1.8;
    }
    .post-content h1 { font-size: 2.5rem; margin: 2rem 0 1rem; }
    .post-content h2 { font-size: 1.8rem; margin: 2rem 0 1rem; color: var(--color-accent-primary); }
    .post-content h3 { font-size: 1.4rem; margin: 1.5rem 0 0.8rem; }
    .post-content p { margin: 1rem 0; }
    .post-content ul, .post-content ol { margin: 1rem 0; padding-left: 2rem; }
    .post-content li { margin: 0.5rem 0; }
    .post-content code { 
      background: var(--color-bg-tertiary); 
      padding: 0.2rem 0.4rem; 
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9em;
    }
    .post-content pre {
      background: var(--color-bg-tertiary);
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 1.5rem 0;
    }
    .post-content pre code {
      background: none;
      padding: 0;
    }
    .post-content blockquote {
      border-left: 4px solid var(--color-accent-primary);
      padding-left: 1.5rem;
      margin: 1.5rem 0;
      color: var(--color-text-secondary);
      font-style: italic;
    }
    .post-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
    }
    .post-content th, .post-content td {
      border: 1px solid var(--color-border);
      padding: 0.8rem;
      text-align: left;
    }
    .post-content th {
      background: var(--color-bg-tertiary);
      font-weight: 600;
    }
    .post-content a {
      color: var(--color-accent-primary);
      text-decoration: none;
    }
    .post-content a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <!-- Loading -->
  <div class="loading">
    <div class="loading-spinner"></div>
  </div>

  <!-- Navigation -->
  <nav class="nav">
    <div class="nav-inner">
      <a href="../index.html" class="nav-logo">
        loc<span>zb</span>
      </a>
      <button class="nav-toggle" aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <ul class="nav-links">
        <li><a href="../index.html" class="nav-link">首页</a></li>
        <li><a href="../projects/index.html" class="nav-link">项目</a></li>
        <li><a href="../blog/index.html" class="nav-link active">博客</a></li>
        <li><a href="../about/index.html" class="nav-link">关于</a></li>
      </ul>
    </div>
  </nav>

  <!-- Post Content -->
  <section class="section">
    <div class="container container-narrow">
      <article class="post-content animate-on-scroll">
        ${htmlContent}
      </article>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-links">
        <a href="https://github.com/billyzl" class="footer-link" target="_blank" rel="noopener">GitHub</a>
        <a href="../projects/index.html" class="footer-link">项目</a>
        <a href="../about/index.html" class="footer-link">关于</a>
      </div>
      <p class="footer-copyright">
        © 2026 张小猛。Built with ❤️
      </p>
    </div>
  </footer>

  <script src="../../assets/js/main.js"></script>
</body>
</html>`;

// 写入 HTML 文件
fs.writeFileSync('./blog/posts/mobile-gs-paper-review.html', fullHtml, 'utf8');
console.log('✅ HTML 生成成功：blog/posts/mobile-gs-paper-review.html');
