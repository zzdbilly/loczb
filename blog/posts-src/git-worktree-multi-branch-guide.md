---
title: "Git Worktree 高效多分支开发指南"
description: "Git Worktree 让你同时检出多个分支，切换零成本，告别 stash 和冲突的烦恼。本文详解 worktree 的使用场景和最佳实践。"
date: 2026-06-28 16:00:04
category: 开发
tags: ["Git", "开发技巧", "效率工具"]
read_time: 12
slug: git-worktree-multi-branch-guide
---

<p>在日常开发中，我们经常面临这样的场景：正在 A 分支上写代码，突然需要切到 B 分支修一个紧急 bug。这时候要么 stash 当前工作（然后忘记它），要么提交半成品。Git Worktree 优雅解决了这个问题。</p>

<h2 id="what">什么是 Git Worktree</h2>

<p>Git Worktree 允许你在同一仓库中同时检出多个分支，每个分支有独立的工作目录。所有 worktree 共享同一份 .git 对象存储，不会增加仓库体积。</p>

<p>核心命令：</p>

<pre><code class="language-bash"># 创建一个新 worktree
git worktree add ../project-feature feature-branch

# 列出所有 worktree
git worktree list

# 删除 worktree
git worktree remove ../project-feature

# 清理过期 worktree
git worktree prune</code></pre>

<h2 id="scenarios">核心使用场景</h2>

<h3>1. 修bug同时继续开发</h3>

<p>正在开发新功能时，线上突然报 bug：</p>

<pre><code class="language-bash"># 在当前目录继续开发新功能
# 在新目录检出版本分支修 bug
git worktree add ../hotfix release/v2.1
cd ../hotfix
# 修 bug、commit、push
cd -  # 切回原来目录继续开发</code></pre>

<p>整个过程不需要 stash，不需要担心工作丢失。</p>

<h3>2. 并行 review</h3>

<p>同时 review 多个 PR 时非常方便：</p>

<pre><code class="language-bash">git worktree add ../pr-review-1 pr/feature-a
git worktree add ../pr-review-2 pr/feature-b
git worktree add ../pr-review-3 pr/feature-c</code></pre>

<p>在三个 IDE 窗口打开，互不干扰。</p>

<h2 id="tips">最佳实践</h2>

<ul>
  <li><strong>命名规范</strong>：worktree 目录名用项目名+分支名，如 <code>myapp-feature-x</code></li>
  <li><strong>磁盘清理</strong>：定期执行 <code>git worktree prune</code> 清理过期记录</li>
  <li><strong>避免主 worktree 直接开发</strong>：把主检出当作 hub，用子 worktree 开发实际工作</li>
  <li><strong>自动化脚本</strong>：配合 shell alias 快速创建/切换 worktree</li>
</ul>

<h2 id="vs-other">与其他方案的对比</h2>

<table>
  <tr><th>方案</th><th>切换速度</th><th>冲突风险</th><th>磁盘占用</th></tr>
  <tr><td>git stash</td><td>快</td><td>高（容易忘）</td><td>低</td></tr>
  <tr><td>git clone 新仓库</td><td>慢</td><td>无</td><td>高（重复下载）</td></tr>
  <tr><td>git worktree</td><td>极快</td><td>无</td><td>低（共享对象）</td></tr>
</table>

<h2 id="conclusion">总结</h2>

<p>Git Worktree 是每个开发者都应该掌握的高效技巧。它解决了多分支并行开发的核心痛点，尤其适合需要频繁切分支修 hotfix 的场景。下次遇到切分支需求时，试试 <code>git worktree add</code>，你会爱上这个功能。</p>
