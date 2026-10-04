---
title: "Next.js 16 实战：App Router + Server Actions + Turbopack"
description: "Next.js 16 实战指南：App Router、Server Actions、Turbopack 完整教程与最佳实践"
date: 2026-04-20 21:26:40
category: 前端
tags: ["Next.js", "React", "全栈开发", "App Router", "Server Actions"]
read_time: 20
slug: nextjs-16-tutorial
---

<p>Next.js 16 于 2026 年 3 月正式发布，带来了许多重大更新。作为目前最流行的 React 全栈框架，Next.js 16 进一步简化了开发体验，提升了性能。</p>

      <p>本文通过一个完整的博客系统示例，带你掌握 Next.js 16 的核心特性。</p>

      <div class="tip-box">
        <strong>核心特性</strong>：App Router 稳定版、Server Actions 正式支持、Turbopack 默认启用、部分预渲染（PPR）
      </div>

      <h2>环境准备</h2>

      <h3>系统要求</h3>

      <ul>
        <li>Node.js 20.17+ 或 22.11+</li>
        <li>npm / pnpm / yarn</li>
        <li>推荐：VS Code + ESLint + Prettier</li>
      </ul>

      <h3>创建项目</h3>

      <pre><code># 使用 pnpm（推荐）
pnpm create next-app@latest my-blog

# 选择配置：
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - `src/` directory: Yes
# - App Router: Yes
# - Turbopack: Yes (默认启用)

cd my-blog
pnpm dev</code></pre>

      <div class="tip-box">
        <strong>Next.js 16 变化</strong>：Turbopack 现在是默认选项，开发速度比 Webpack 快 53%。
      </div>

      <h2>项目结构</h2>

      <pre><code>my-blog/
├── src/
│   ├── app/                    # App Router 路由
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页
│   │   ├── blog/
│   │   │   ├── page.tsx        # 博客列表
│   │   │   └── [slug]/
│   │   │       └── page.tsx    # 博客详情
│   │   └── api/                # API 路由
│   ├── components/             # React 组件
│   ├── lib/                    # 工具函数
│   └── styles/                 # 全局样式
├── public/                     # 静态资源
└── package.json</code></pre>

      <h2>核心特性实战</h2>

      <h3>1. App Router 基础</h3>

      <p>Next.js 16 中 App Router 已经是稳定版本，推荐使用。</p>

      <pre><code>// src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    &lt;html lang="zh-CN">
      &lt;body>
        &lt;nav>
          &lt;a href="/">首页&lt;/a>
          &lt;a href="/blog">博客&lt;/a>
        &lt;/nav>
        {children}
      
  &lt;!-- Back to Top &amp; Reading Progress -->
  &lt;button class="back-to-top" id="backToTop" aria-label="回到顶部">
    &lt;svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      &lt;path d="M18 15l-6-6-6 6"/>
    &lt;/svg>
  &lt;/button>
  &lt;div class="reading-progress" id="readingProgress">&lt;/div>

  &lt;!-- Post TOC -->
  &lt;div class="post-toc-container" id="postToc">
    &lt;nav class="post-toc">
      &lt;div class="post-toc-title">目录&lt;/div>
      &lt;ul class="post-toc-list" id="tocList">&lt;/ul>
    &lt;/nav>
  &lt;/div>

  
&lt;script src="../../assets/js/particles.js">&lt;/script>
  &lt;!-- Comment System -->
  &lt;script src="../../workers/comment-system/comment-widget.js" defer>&lt;/script>
&lt;/body>
    &lt;/html>
  )
}</code></pre>

      <h3>3. 缓存策略</h3>

      <pre><code>// 手动控制缓存
const data = await fetch(url, {
  cache: 'force-cache',      // 默认，缓存
  // cache: 'no-store',      // 不缓存
  // next: { revalidate: 60 } // ISR
})</code></pre>

      <h2>部署</h2>

      <h3>Vercel（推荐）</h3>

      <pre><code># 1. 推送到 GitHub
git push

# 2. 在 Vercel 导入项目
# 3. 自动构建部署</code></pre>

      <h3>Docker 部署</h3>

      <pre><code># Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]</code></pre>

      <h2>总结</h2>

      <p>Next.js 16 是一个成熟的全栈框架，适合构建各种类型的 Web 应用：</p>

      <ul>
        <li>✅ <strong>App Router</strong>：更直观的路由系统</li>
        <li>✅ <strong>Server Components</strong>：默认服务端渲染，性能优秀</li>
        <li>✅ <strong>Server Actions</strong>：简化数据突变</li>
        <li>✅ <strong>Turbopack</strong>：开发速度提升 53%</li>
        <li>✅ <strong>部分预渲染</strong>：静态 + 动态混合渲染</li>
      </ul>

      <div class="tip-box">
        <strong>学习建议</strong>：
        <ul>
          <li>先理解 RSC 和 Client Component 的区别</li>
          <li>掌握 Server Actions 的使用场景</li>
          <li>了解缓存和重新验证策略</li>
          <li>实践一个完整项目加深理解</li>
        </ul>
      </div>
