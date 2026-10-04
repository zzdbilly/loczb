---
title: "Cursor Rules 实战：自定义 AI 代码助手的进阶指南"
description: "从零搭建 Cursor Rules 体系，涵盖规则语法、分层架构、真实 Android 项目案例和最佳实践"
date: 2026-06-30 14:26:53
category: AI
tags: ["Cursor", "AI编程", "效率工具", "开发规范"]
read_time: 12
slug: cursor-rules-guide
---

<section>
<h2>引言</h2>
<p>很多开发者使用 Cursor 时，只是把它当一个"能聊天的编辑器"，写代码靠手动提需求。但 Cursor 真正强大的地方在于 <strong>Rules（规则系统）</strong>——你可以通过规则文件告诉 AI 助手你的项目规范、代码风格、架构约定，让 AI 生成的代码天然符合你的要求。</p>
<p>这篇文章会从一个真实项目的角度，带你从零搭建完整的 Cursor Rules 体系，涵盖规则语法、分层架构、实际案例和最佳实践。</p>
</section>

<section>
<h2>什么是 Cursor Rules？</h2>
<p>Cursor Rules 是一组 Markdown 格式的配置文件，放在项目根目录的 <code>.cursor/rules/</code> 文件夹下。它告诉 AI 编辑器：</p>
<ul>
<li>项目使用什么技术栈和版本</li>
<li>代码风格和命名规范是什么</li>
<li>架构约束和设计模式有哪些</li>
<li>常见陷阱和注意事项</li>
</ul>
<p>简单说，Rules 就是<strong>给 AI 的开发规范书</strong>——不需要你在每次对话里重复强调 "用 TypeScript、用箭头函数、不要 any" 等约定。</p>
</section>

<section>
<h2>Rules 文件结构</h2>

<h3>文件格式</h3>
<pre><code># 文件名：.cursor/rules/文件名.md

---
description: "规则说明"
glob: "**/*.ts"
---
## 规则内容
...</code></pre>

<ul>
<li><code>description</code>：描述该规则用途</li>
<li><code>glob</code>：文件匹配模式，控制规则应用到哪些文件</li>
<li><code>---</code>：YAML front matter 分隔符</li>
</ul>

<h3>推荐目录结构</h3>
<pre><code>.cursor/rules/
├── project-overview.md         # 项目概览（技术栈、架构说明）
├── typescript-rules.md         # TypeScript 规范
├── naming-conventions.md       # 命名规范
├── react-guidelines.md        # React 最佳实践
├── testing-standards.md        # 测试标准
├── error-handling.md           # 错误处理规范
├── file-organization.md        # 文件组织规范
└── git-commit-conventions.md   # Git 提交规范</code></pre>
</section>

<section>
<h2>实战案例：Kotlin Android 项目</h2>

<h3>1. 项目概览规则</h3>
<pre><code>---
description: "项目技术栈和架构概览"
glob: "**/*.{kt,kts,xml}"
---
# Android 项目概览

## 技术栈
- 语言：Kotlin 2.0+
- UI 框架：Jetpack Compose + Material 3
- 架构：MVVM + Clean Architecture
- 依赖注入：Hilt
- 网络层：Retrofit + OkHttp
- 数据库：Room
- 协程：基于协程的异步处理

## 项目结构
app/src/main/java/com/example/app/
├── data/          # 数据层
├── domain/        # 领域层
├── ui/            # UI 层
├── di/            # 依赖注入
└── core/          # 公共工具

## 核心约定
- 禁止在 ViewModel 中持有 Activity/Fragment 引用
- 所有 IO 操作必须使用 Dispatchers.IO
- UI 状态使用 sealed class / sealed interface</code></pre>

<h3>2. Kotlin 编码规范</h3>
<pre><code>---
description: "Kotlin 代码风格和命名规范"
glob: "**/*.kt"
---
# Kotlin 规范

## 命名规则
- 类和接口：PascalCase
- 函数和变量：camelCase
- 常量：SCREAMING_SNAKE_CASE
- Compose 函数：PascalCase
- 私有函数以下划线开头：_internalHelper()

## 禁止使用的模式
- ❌ `!!` 操作符（除非在测试中）
- ❌ GlobalScope
- ❌ 未命名的协程
- ❌ 使用 var 替代 mutable state

## 优先使用的模式
- ✅ sealed interface 替代枚举
- ✅ by viewModels() 替代手动创建 ViewModel
- ✅ Result 或 sealed class 处理操作结果
- ✅ Data Class 替代手动数据容器</code></pre>

<h3>3. Compose UI 规范</h3>
<pre><code>---
description: "Jetpack Compose UI 编写规范"
glob: "**/*.kt"
---
# Compose UI 规范

## 组件命名
- 页面级：XxxScreen
- 可复用组件：XxxComponent / XxxItem

## 状态管理
- 使用 collectAsStateWithLifecycle() 替代 collectAsState()
- ViewModel 状态使用 StateFlow，事件使用 SharedFlow
- 局部 UI 状态使用 remember + mutableStateOf

## 预览
- 所有公共组件必须提供 Preview
- Preview 需要覆盖不同状态

## 性能
- 使用 derivedStateOf 减少不必要的重组
- 列表使用 LazyColumn + key 参数
- 避免在重组范围执行高开销计算</code></pre>
</section>

<section>
<h2>高级技巧</h2>

<h3>1. 使用 glob 精确匹配</h3>
<pre><code># 只匹配测试文件
glob: "**/*.test.{ts,tsx}"

# 匹配所有配置文件
glob: "**/*.{json,yaml,toml}"

# 排除 node_modules
glob: "**/*.ts"
exclude: ["node_modules/**"]</code></pre>

<h3>2. 分层规则设计</h3>
<pre><code>.cursor/rules/
├── 0-project.md         # 第一层：项目概览
├── 1-typescript.md      # 第二层：语言规范
├── 1-python.md          # 第二层：多语言
├── 2-react.md           # 第三层：框架规范
├── 3-testing.md         # 第三层：测试规范
└── 9-common.md          # 底层：通用规范</code></pre>

<h3>3. Rules vs .cursorrules</h3>
<table>
<thead><tr><th>特性</th><th>.cursorrules</th><th>.cursor/rules/*.md</th></tr></thead>
<tbody>
<tr><td>文件数量</td><td>单个文件</td><td>多个文件</td></tr>
<tr><td>粒度控制</td><td>全局统一</td><td>按 glob 匹配文件</td></tr>
<tr><td>维护性</td><td>容易变得臃肿</td><td>模块化，可独立更新</td></tr>
</tbody>
</table>
<p><strong>建议</strong>：新项目直接用多文件方式。</p>

<h3>4. 为特定文件类型定制规则</h3>
<pre><code>---
description: "SQL 文件规范"
glob: "**/*.sql"
---
# SQL 规范
- 关键字大写（SELECT、FROM、WHERE）
- 表名使用 snake_case 复数形式
- 每个查询必须显式指定列名，禁止 SELECT *
- WHERE 条件使用参数化查询</code></pre>
</section>

<section>
<h2>常见问题</h2>

<table>
<thead><tr><th>问题</th><th>解决</th></tr></thead>
<tbody>
<tr><td>规则没生效</td><td>检查文件名是否以 .md 结尾，YAML front matter 格式是否正确</td></tr>
<tr><td>规则太严格导致 AI 生成困难</td><td>建议性规则用模糊描述，硬性约束用精确描述</td></tr>
<tr><td>多语言项目如何管理</td><td>用 glob 按扩展名分流，每种语言一个规则文件</td></tr>
<tr><td>团队成员规则不一致</td><td>将 rules 目录提交到 Git，团队统一维护</td></tr>
</tbody>
</table>
</section>

<section>
<h2>验证 Rules 是否生效</h2>
<ol>
<li><strong>检查自动补全</strong>：输入 val 或 fun，看 AI 是否按规范补全</li>
<li><strong>运行规则测试</strong>：在 Cursor 对话中问"这个项目的技术栈是什么？"</li>
<li><strong>生成一段代码</strong>："写一个 Room DAO 接口"——检查是否符合规范</li>
<li><strong>审查建议</strong>：注意 AI 建议的代码风格是否跟规则一致</li>
</ol>
</section>

<section>
<h2>总结</h2>
<p>Cursor Rules 可以让 AI 生成的代码从一开始就符合项目规范，大幅减少后期修改。关键点：</p>
<ul>
<li><strong>模块化</strong>：按项目/语言/框架分层管理</li>
<li><strong>精确匹配</strong>：使用 glob 控制规则作用范围</li>
<li><strong>渐进式</strong>：先从最关键的规范开始，逐步完善</li>
<li><strong>团队共享</strong>：提交到 Git，统一团队规范</li>
</ul>
<p>写好 Rules 就像给 AI 装上了一本精准的手册——它会变成你最懂项目规范的队友。</p>

<p><strong>相关阅读：</strong></p>
<ul>
<li><a href="../posts/mcp-server-deep-dive.html">MCP 协议深入实战：从入门到编写自定义 MCP Server</a></li>
<li><a href="../posts/ai-coding-workflow-optimization.html">AI 编程工作流优化：从辅助到协作</a></li>
</ul>
</section>
