#!/usr/bin/env node
/**
 * 全站内链与静态资源体检巡检脚本 (Broken Link Doctor)
 * 检查所有 HTML 文件的内部链接、相对路径与静态资源引用，确保无 404 死链
 *
 * 运行方式: node scripts/check-links.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT_DIR, 'blog', 'posts');

const targetFiles = [
  path.join(ROOT_DIR, 'index.html'),
  path.join(ROOT_DIR, 'about', 'index.html'),
  path.join(ROOT_DIR, 'projects', 'index.html'),
  path.join(ROOT_DIR, 'blog', 'index.html'),
];

if (fs.existsSync(POSTS_DIR)) {
  fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.html'))
    .forEach(f => targetFiles.push(path.join(POSTS_DIR, f)));
}

let totalLinksChecked = 0;
let errors = [];

function resolvePath(baseFile, refUrl) {
  if (!refUrl || /^(https?:|\/\/|mailto:|tel:|javascript:|#|data:|\$\{)/i.test(refUrl)) {
    return null;
  }

  const cleanUrl = refUrl.split('?')[0].split('#')[0];
  if (!cleanUrl) return null;

  if (cleanUrl.startsWith('/')) {
    let target = path.join(ROOT_DIR, cleanUrl.slice(1));
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    return target;
  } else {
    let target = path.join(path.dirname(baseFile), cleanUrl);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      target = path.join(target, 'index.html');
    }
    return target;
  }
}

targetFiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  const relPath = path.relative(ROOT_DIR, filePath);

  // 剔除 <pre><code> 示例代码块和 <script> 脚本内容，避免示例代码被误判为实际 DOM 链接
  content = content.replace(/<pre[\s\S]*?<\/pre>/gi, '');
  content = content.replace(/<script[\s\S]*?<\/script>/gi, '');

  const linkRegex = /(?:href|src)=["']([^"']+)["']/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const rawUrl = match[1];
    const resolved = resolvePath(filePath, rawUrl);
    if (resolved) {
      totalLinksChecked++;
      if (!fs.existsSync(resolved)) {
        errors.push({
          source: relPath,
          url: rawUrl,
          expectedPath: path.relative(ROOT_DIR, resolved)
        });
      }
    }
  }
});

console.log('🩺 全站内链与资源巡检完成！');
console.log(`📊 扫描文件: ${targetFiles.length} 个 HTML 页面`);
console.log(`🔗 校验内链: ${totalLinksChecked} 个真实 DOM 本地资源与页面跳转`);

if (errors.length === 0) {
  console.log('✨ 完美！未发现任何 404 内部死链或缺失静态资源。');
  process.exit(0);
} else {
  console.error(`\n❌ 发现 ${errors.length} 处潜在失效引用:`);
  errors.forEach(err => {
    console.error(`  - [${err.source}] 引用: "${err.url}" -> 目标文件不存在: "${err.expectedPath}"`);
  });
  process.exit(1);
}
