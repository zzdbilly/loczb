# loczb 优化方案

> 审计时间：2026-03-19
> 项目路径：`/root/.hermes/workspaces/xiaoma/nook/loczb/`

---

## P0 - 立即修复（预计 1 小时）

| 问题 | 位置 | 修改内容 | 工作量 |
|------|------|----------|--------|
| GitHub 链接 404 | 首页 L46, L204 | `github.com/billyzl` → `github.com/zzdbilly` | 5min |
| GitHub 链接 404 | 项目页 L121 | 同上 | 2min |
| GitHub 链接 404 | 博客页 L145 | 同上 | 2min |
| GitHub 链接 404 | 关于页 L120, L129 | 同上 | 2min |
| 项目外链过时 | 首页 L133 | `zzdbilly.github.io/loczb/` → `709527.xyz` | 2min |
| 项目外链过时 | 项目页 L47 | 同上 | 2min |
| OG URL 过时 | 首页 L13 | `billyzl.github.io/loczb/` → `709527.xyz` | 1min |
| OG URL 过时 | 博客文章 ssh-security-hardening.html L15 | 同上 | 1min |
| 博客分类按钮无功能 | 博客页 blog/index.html | 添加 JavaScript 过滤逻辑 | 30min |
| 博客分类按钮无功能 | main.js | 添加 `initBlogFilters()` 函数 | 15min |

**详细修复方案：**

### 1. GitHub 链接修复

**影响文件**：`index.html`, `projects/index.html`, `blog/index.html`, `about/index.html`

```diff
- <a href="https://github.com/billyzl" 
+ <a href="https://github.com/zzdbilly" 
```

### 2. 项目外链修复

**影响文件**：`index.html` L133, `projects/index.html` L47

```diff
- <a href="https://zzdbilly.github.io/loczb/" 
+ <a href="https://709527.xyz" 
```

### 3. Open Graph URL 修复

**影响文件**：`index.html` L13

```diff
- <meta property="og:url" content="https://billyzl.github.io/loczb/">
+ <meta property="og:url" content="https://709527.xyz">
```

**影响文件**：所有 `blog/posts/*.html`

需要批量更新 og:url：

```bash
# 批量替换命令
find blog/posts -name "*.html" -exec sed -i 's|https://zzdbilly.github.io/loczb/|https://709527.xyz/|g' {} \;
```

### 4. 博客分类过滤功能

**新增代码**（添加到 `main.js`）：

```javascript
// ===================================
// Blog Category Filter
// ===================================
function initBlogFilters() {
  const filterButtons = document.querySelectorAll('.blog-filters .tag');
  const blogPosts = document.querySelectorAll('.blog-post');
  
  if (filterButtons.length === 0 || blogPosts.length === 0) return;
  
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      filterButtons.forEach(btn => btn.classList.remove('tag-accent'));
      button.classList.add('tag-accent');
      
      const filter = button.textContent.trim();
      
      // Filter posts
      blogPosts.forEach(post => {
        if (filter === '全部') {
          post.style.display = '';
          post.classList.add('animate-on-scroll');
        } else {
          const tags = post.querySelectorAll('.tag-accent');
          const hasTag = Array.from(tags).some(tag => 
            tag.textContent.trim().toLowerCase().includes(filter.toLowerCase())
          );
          post.style.display = hasTag ? '' : 'none';
        }
      });
    });
  });
}

// 在 DOMContentLoaded 中调用
document.addEventListener('DOMContentLoaded', () => {
  // ... existing code
  initBlogFilters();
});
```

---

## P1 - 近期优化（预计 0.5 小时）

| 问题 | 位置 | 修改内容 | 工作量 |
|------|------|----------|--------|
| 外链按钮无 aria-label | 所有页面 | 添加 aria-label 属性 | 15min |
| Footer 对比度不足 | style.css L803 | `#52525b` → 提亮至 `#71717a` 或更高 | 5min |
| Section 描述对比度 | style.css L576 | 检查并确保对比度 ≥ 4.5:1 | 5min |

**详细修复方案：**

### 1. 图标按钮 aria-label

**首页**：

```diff
  <!-- GitHub 按钮 L46 -->
- <a href="https://github.com/zzdbilly" class="btn btn-secondary" target="_blank" rel="noopener">
+ <a href="https://github.com/zzdbilly" class="btn btn-secondary" target="_blank" rel="noopener" aria-label="访问 GitHub 主页">
    <svg ...>...</svg>
    GitHub
  </a>

  <!-- 项目卡片外链 L133 -->
  <a href="https://709527.xyz" class="btn btn-ghost" target="_blank" rel="noopener"
+    aria-label="访问 loczb 网站">
    <svg ...>...</svg>
  </a>
```

**项目页**：

```diff
  <a href="https://709527.xyz" class="btn btn-ghost" target="_blank" rel="noopener"
+   aria-label="访问项目网站">
    <svg ...>...</svg>
    访问
  </a>

  <a href="https://github.com/zzdbilly/no-fap-tracker-web" class="btn btn-ghost" target="_blank" rel="noopener"
+   aria-label="查看 GitHub 仓库">
    <svg ...>...</svg>
    GitHub
  </a>
```

### 2. 对比度修复

**style.css**：

```diff
  :root {
-   --color-text-muted: #52525b;
+   --color-text-muted: #71717a;
  }
```

---

## P2 - 中期调整（预计 2 小时）

| 问题 | 位置 | 修改内容 | 工作量 |
|------|------|----------|--------|
| 首屏定位语不够锋利 | 首页 L64 | 调整表述 | 15min |
| 技术栈权重平均 | 首页 L77-120 | 重新排序和调整描述 | 30min |
| 项目卡片描述单薄 | 首页、项目页 | 补充"解决的问题 + 角色 + 结果" | 45min |
| 首页内容"空" | 首页 | 新增"当前重点"区块 | 30min |

**详细修改方案：**

### 1. 首屏定位语

**当前**：
```
安卓开发工程师 · 全栈探索者 · AI 爱好者
```

**建议改为**：
```
专注 Android + AI 接入 · 把模型真正做成可用功能
```

### 2. 技术栈权重调整

**当前顺序**：Android → Frontend → Backend → AI

**建议顺序**：Android → AI & Tools → Frontend → Backend

**调整建议**：
- Android 卡片：保持核心位置，描述更突出
- AI 卡片：提前到第二位，补充"端侧推理、模型接入"等关键词
- Frontend/Backend：标注为"辅助能力"

### 3. 项目卡片描述增强

**loczb 项目**：

**当前**：
```
个人主页（GitHub Pages）- 极简主义设计，展示技术栈和项目
```

**建议改为**：
```
个人品牌网站
解决的问题：需要统一展示技术能力、项目和博客内容
角色：全栈设计开发
结果：月访问量 500+，成为技术社交名片
```

**No Fap Tracker Web**：

**当前**：
```
戒色打卡 Web 应用 - 成就系统、进度可视化、自定义奖惩
```

**建议改为**：
```
习惯养成 Web 应用
解决的问题：用户需要可视化的习惯追踪工具
角色：全栈开发（React + Go）
结果：完整 MVP，支持成就系统和进度可视化
```

### 4. 首页新增"当前重点"区块

**建议在 Hero Section 后添加**：

```html
<!-- Current Focus Section -->
<section class="section section-narrow">
  <div class="container">
    <div class="section-header">
      <div class="section-label">Current Focus</div>
      <h2 class="section-title">当前重点</h2>
    </div>
    
    <div class="grid grid-3">
      <div class="card">
        <div class="card-header">
          <div class="project-icon">🤖</div>
          <h3 class="card-title">AI Agent 开发</h3>
        </div>
        <p class="card-desc">维护 OpenClaw 项目，探索端侧 AI 能力接入</p>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="project-icon">📱</div>
          <h3 class="card-title">Android + AI</h3>
        </div>
        <p class="card-desc">将 AI 能力落地到移动端，打造实用功能</p>
      </div>
      
      <div class="card">
        <div class="card-header">
          <div class="project-icon">✍️</div>
          <h3 class="card-title">技术写作</h3>
        </div>
        <p class="card-desc">记录技术实践，分享踩坑经验</p>
      </div>
    </div>
  </div>
</section>
```

---

## P3 - 长期优化（预计 1 小时）

| 问题 | 位置 | 修改内容 | 工作量 |
|------|------|----------|--------|
| 关于页叙事不统一 | about/index.html | 统一定位为"端侧 + AI" | 30min |
| 部分句子过于直白 | about/index.html L91-92 | 调整表述 | 15min |
| 首页博客内容偏 DevOps | 首页 L159-207 | 固定 Android+AI 文章 | 15min |

**详细修改方案：**

### 1. 关于页叙事统一

**当前问题**：
- 简介说"安卓开发工程师"
- 但历程提到"前端技术经理"
- 2026 目标又说"端侧 + AI 接入架构负责人"

**建议调整**：

```html
<!-- 统一表述 -->
<p class="about-bio">
  安卓开发工程师，专注端侧 + AI 接入架构。
  通过 OpenClaw 等实战项目积累端云混合架构经验。
  目标：成为"把 AI 模型用好的人"，而不是"训练模型的人"。
</p>
```

### 2. 敏感句子调整

**当前**：
```
讨厌上班，觉得被束缚。但热爱写代码，这算矛盾吗？
```

**建议改为**：
```
更喜欢自由的工作方式，追求代码带来的成就感。
```

### 3. 首页博客推荐

**当前首页显示的最新博客都是 DevOps 相关**：
- SSH 安全加固
- Tailscale DERP
- VS Code 端口转发

**建议**：首页固定展示 1-2 篇 Android+AI 相关文章：
- Mobile-GS 论文解读
- OpenClaw 深度指南

---

## 执行顺序

1. **P0 修复**（优先级最高，立即执行）
   - 批量替换 GitHub 链接
   - 修复项目外链
   - 修复 OG URL
   - 实现博客分类过滤功能

2. **P1 优化**（可访问性，一周内完成）
   - 添加 aria-label
   - 修复对比度问题

3. **P2 调整**（内容和定位，两周内完成）
   - 调整首屏定位语
   - 优化技术栈展示
   - 增强项目卡片描述
   - 新增"当前重点"区块

4. **P3 优化**（长期迭代）
   - 统一关于页叙事
   - 调整敏感表述
   - 优化首页博客推荐

---

## 总体工作量评估

| 优先级 | 预计时间 | 说明 |
|--------|----------|------|
| P0 | 1 小时 | 批量替换 + 新增 JS 功能 |
| P1 | 0.5 小时 | 可访问性修复 |
| P2 | 2 小时 | 内容和定位调整 |
| P3 | 1 小时 | 叙事优化 |
| **总计** | **4.5 小时** | |

---

## 快速修复脚本

```bash
#!/bin/bash
# quick-fix.sh - P0 批量修复脚本

cd /root/.hermes/workspaces/xiaoma/nook/loczb

# 1. 修复 GitHub 链接
find . -name "*.html" -exec sed -i 's|github.com/billyzl|github.com/zzdbilly|g' {} \;

# 2. 修复项目外链
find . -name "*.html" -exec sed -i 's|https://zzdbilly.github.io/loczb/|https://709527.xyz|g' {} \;

# 3. 修复 OG URL（首页）
sed -i 's|https://billyzl.github.io/loczb/|https://709527.xyz|g' index.html

# 4. 修复 OG URL（博客文章）
find blog/posts -name "*.html" -exec sed -i 's|https://zzdbilly.github.io/loczb/|https://709527.xyz/|g' {} \;

echo "✅ P0 链接修复完成"
echo "⚠️  请手动添加博客分类过滤功能（见方案文档）"
```

---

## 验收清单

- [ ] 所有 GitHub 链接指向 `github.com/zzdbilly`
- [ ] 所有项目外链指向 `709527.xyz`
- [ ] Open Graph URL 统一为 `709527.xyz`
- [ ] 博客分类按钮可正常过滤
- [ ] 外链按钮有 aria-label
- [ ] Footer 文字对比度 ≥ 4.5:1
- [ ] 首屏定位语更新
- [ ] 技术栈展示权重调整
- [ ] 项目卡片描述完整
- [ ] 首页有"当前重点"区块
- [ ] 关于页叙事统一
- [ ] 敏感表述调整