---
title: "React Server Components 深入解析"
description: "React Server Components 深入解析：理解服务端组件的工作原理、数据获取方式、与客户端组件的交互，以及最佳实践"
date: 2026-04-26 15:11:29
category: 前端
tags: ["React", "Server Components", "Next.js", "前端架构"]
read_time: 15
slug: react-server-components
---

<p>React Server Components（RSC）是 React 19 的核心特性，也是 Next.js App Router 的基础。它彻底改变了我们构建 React 应用的方式，将组件分为服务端和客户端两种类型，各自有不同的职责和限制。</p>

      <div class="tip-box">
        <strong>核心概念</strong>：Server Components 在服务端渲染，不发送 JavaScript 到客户端；Client Components 在客户端渲染，可以使用状态和交互。
        </div>

      <h2>一、Server Components vs Client Components</h2>

      <p>理解两种组件的区别是掌握 RSC 的第一步：</p>

      <table class="comparison-table">
        <tr>
          <th>特性</th>
          <th>Server Components</th>
          <th>Client Components</th>
        </tr>
        <tr>
          <td>渲染位置</td>
          <td>服务端</td>
          <td>客户端（浏览器）</td>
        </tr>
        <tr>
          <td>JavaScript 发送</td>
          <td>不发送（仅 HTML）</td>
          <td>发送到客户端</td>
        </tr>
        <tr>
          <td>数据获取</td>
          <td>直接访问数据库、文件系统</td>
          <td>需要通过 API 或 props</td>
        </tr>
        <tr>
          <td>状态管理</td>
          <td>不能使用 useState、useEffect</td>
          <td>可以使用所有 Hooks</td>
        </tr>
        <tr>
          <td>交互事件</td>
          <td>不能使用 onClick 等事件</td>
          <td>可以使用所有事件</td>
        </tr>
        <tr>
          <td>导入限制</td>
          <td>不能导入 Client Components 的库</td>
          <td>可以导入任何组件</td>
        </tr>
      </table>

      <h2>二、Server Components 的优势</h2>

      <h3>1. 更小的客户端 JavaScript 包</h3>

      <p>Server Components 的代码永远不会发送到客户端。这意味着：</p>

      <pre><code>// Server Component - 代码不发送到客户端
async function ProductList() {
  // 直接查询数据库
  const products = await db.products.findMany();
  
  return (
    &lt;ul&gt;
      {products.map(p => &lt;li key={p.id}>{p.name}&lt;/li&gt;)}
    &lt;/ul&gt;
  );
}</code></pre>

      <p>上面的组件中，数据库连接代码、查询逻辑都不会出现在客户端 bundle 中。</p>

      <h3>2. 直接访问后端资源</h3>

      <pre><code>// Server Component 可以直接读取文件
import { readFile } from 'fs/promises';

async function MarkdownPost({ slug }) {
  const content = await readFile(`./posts/${slug}.md`, 'utf-8');
  return &lt;article>{content}&lt;/article&gt;;
}

// 直接访问数据库
async function UserProfile({ id }) {
  const user = await prisma.user.findUnique({ where: { id } });
  return &lt;div>{user.name}&lt;/div&gt;;
}</code></pre>

      <h3>3. 自动代码分割</h3>

      <p>Client Components 会自动进行代码分割，只有需要时才加载：</p>

      <pre><code>// Server Component
import { Suspense } from 'react';

function Page() {
  return (
    &lt;Suspense fallback={&lt;Loading /&gt;}>
      &lt;HeavyChart /> {/* Client Component - 懒加载 */}
    &lt;/Suspense&gt;
  );
}</code></pre>

      <h2>三、如何标记 Client Components</h2>

      <p>在文件顶部添加 <code>'use client'</code> 指令：</p>

      <pre><code>'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    &lt;button onClick={() => setCount(count + 1)}>
      点击次数: {count}
    &lt;/button&gt;
  );
}</code></pre>

      <div class="warning-box">
        <strong>注意</strong>：<code>'use client'</code> 必须在文件最顶部，在所有 import 之前。标记后，该文件及其导入的所有模块都会被视为客户端代码。
      </div>

      <h2>四、组件组合模式</h2>

      <h3>Server Component 导入 Client Component</h3>

      <pre><code>// Server Component
import { Counter } from './Counter'; // Client Component

function Page() {
  return (
    &lt;div>
      &lt;h1>服务端标题&lt;/h1>
      &lt;Counter initialCount={0} /> {/* 交互部分 */}
    &lt;/div&gt;
  );
}</code></pre>

      <h3>Client Component 导入 Server Component</h3>

      <p>这是<strong>不允许</strong>的！Client Component 不能直接导入 Server Component：</p>

      <pre><code>// ❌ 错误：Client Component 不能导入 Server Component
'use client';
import { ServerComponent } from './ServerComponent'; // 错误！

function ClientComponent() {
  return &lt;ServerComponent />; // 报错
}</code></pre>

      <p>解决方案：通过 <code>children</code> props 传递：</p>

      <pre><code>// ✅ 正确：通过 children 传递
'use client';

function ClientComponent({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    &lt;div>
      &lt;button onClick={() => setIsOpen(!isOpen)}>切换&lt;/button>
      {isOpen &amp;&amp; children}
    &lt;/div&gt;
  );
}

// Server Component 作为父组件传递
function Page() {
  return (
    &lt;ClientComponent>
      &lt;ServerComponent /> {/* 通过 children 传递 */}
    &lt;/ClientComponent&gt;
  );
}</code></pre>

      <h2>五、数据获取最佳实践</h2>

      <h3>在 Server Components 中直接获取</h3>

      <pre><code>// 推荐：Server Component 直接获取
async function ProductPage({ id }) {
  const product = await fetchProduct(id);
  
  return (
    &lt;div>
      &lt;h1>{product.name}&lt;/h1>
      &lt;p>{product.description}&lt;/p>
    &lt;/div&gt;
  );
}</code></pre>

      <h3>并行数据获取</h3>

      <pre><code>// 并行获取多个数据源
async function Dashboard() {
  // 同时发起请求，不等待
  const usersPromise = fetchUsers();
  const ordersPromise = fetchOrders();
  const statsPromise = fetchStats();
  
  // 并行等待
  const [users, orders, stats] = await Promise.all([
    usersPromise,
    ordersPromise,
    statsPromise
  ]);
  
  return (
    &lt;div>
      &lt;UserList users={users} />
      &lt;OrderList orders={orders} />
      &lt;StatsPanel stats={stats} />
    &lt;/div&gt;
  );
}</code></pre>

      <h3>使用 Suspense 流式渲染</h3>

      <pre><code>// 流式渲染：先显示快的内容，慢的内容后加载
function Page() {
  return (
    &lt;div>
      &lt;FastContent /> {/* 立即显示 */}
      
      &lt;Suspense fallback={&lt;Skeleton /&gt;}>
        &lt;SlowData /> {/* 等数据就绪后显示 */}
      &lt;/Suspense&gt;
    &lt;/div&gt;
  );
}</code></pre>

      <h2>六、常见陷阱</h2>

      <h3>1. 在 Server Component 中使用 useState</h3>

      <pre><code>// ❌ 错误
function ServerComponent() {
  const [state, setState] = useState(); // 报错！
  return &lt;div /&gt;;
}</code></pre>

      <h3>2. 在 Server Component 中使用事件处理</h3>

      <pre><code>// ❌ 错误
function ServerComponent() {
  return &lt;button onClick={() => {}}&gt;点击&lt;/button&gt;; // 报错！
}</code></pre>

      <h3>3. 传递函数 props 给 Client Component</h3>

      <pre><code>// ❌ 错误：函数不能从 Server Component 传递
function Page() {
  const handleClick = () => {}; // 服务端定义的函数
  return &lt;ClientButton onClick={handleClick} />; // 报错！
}

// ✅ 正确：在 Client Component 中定义
'use client';
function ClientButton() {
  const handleClick = () => {};
  return &lt;button onClick={handleClick}&gt;点击&lt;/button&gt;;
}</code></pre>

      <div class="tip-box">
        <strong>可传递的 props</strong>：Server Components 可以向 Client Components 传递序列化数据（字符串、数字、数组、对象），但不能传递函数、类实例等非序列化数据。
      </div>

      <h2>七、何时使用哪种组件</h2>

      <p><strong>使用 Server Components</strong>：</p>
      <ul>
        <li>展示静态内容</li>
        <li>从数据库或文件系统获取数据</li>
        <li>不需要交互的页面部分</li>
        <li>SEO 重要的内容</li>
      </ul>

      <p><strong>使用 Client Components</strong>：</p>
      <ul>
        <li>需要交互（点击、输入等）</li>
        <li>需要状态管理（useState、useReducer）</li>
        <li>需要生命周期（useEffect）</li>
        <li>使用浏览器 API（localStorage、window）</li>
        <li>使用依赖客户端的第三方库</li>
      </ul>

      <h2>总结</h2>

      <p>React Server Components 代表了 React 的未来方向。理解它们的区别和组合方式，能帮助你构建更高效、更快速的 React 应用。核心原则：</p>

      <ul>
        <li>默认使用 Server Components</li>
        <li>只在需要交互时使用 Client Components</li>
        <li>通过 children 模式组合两种组件</li>
        <li>在 Server Components 中获取数据</li>
      </ul>
