#!/usr/bin/env node
/**
 * 布局片段同步脚本 (Partials Synchronization)
 *
 * 将 templates/partials/ 下的公共片段：
 *   - skip-link.html (键盘与无障碍跳过导航)
 *   - nav.html       (全站统一样式与结构的导航条)
 *   - footer.html    (全站统一标语、社交与版权信息)
 * 幂等地注入/同步到所有主页面与文章模板中，彻底消除模板漂移。
 *
 * 目标页面：
 *   - index.html
 *   - blog/index.html
 *   - about/index.html
 *   - projects/index.html
 *   - offline.html
 *   - 404.html
 *   - templates/blog-post-template.html
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const PARTIALS_DIR = path.join(ROOT_DIR, 'templates', 'partials');

const SKIP_LINK_SRC = fs.readFileSync(path.join(PARTIALS_DIR, 'skip-link.html'), 'utf-8').trim();
const NAV_SRC = fs.readFileSync(path.join(PARTIALS_DIR, 'nav.html'), 'utf-8').trim();
const FOOTER_SRC = fs.readFileSync(path.join(PARTIALS_DIR, 'footer.html'), 'utf-8').trim();

const TARGET_PAGES = [
  { file: 'index.html', activeNav: 'home' },
  { file: 'blog/index.html', activeNav: 'blog' },
  { file: 'about/index.html', activeNav: 'about' },
  { file: 'projects/index.html', activeNav: 'projects' },
  { file: 'offline.html', activeNav: null },
  { file: '404.html', activeNav: null },
  { file: 'templates/blog-post-template.html', activeNav: 'blog' },
];

function buildNav(activeNav) {
  let navHtml = NAV_SRC;
  if (activeNav) {
    const activeRegex = new RegExp(`(<a\\s+href="[^"]*"\\s+class="nav-link)(?:\\s+active)?"(\\s+data-nav="${activeNav}")`);
    navHtml = navHtml.replace(activeRegex, '$1 active"$2');
  }
  return navHtml;
}

function syncFilePartials(relPath, activeNav) {
  const fullPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(fullPath)) return false;

  let html = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;

  // 1. Skip Link
  const skipLinkBlock = `<!-- PARTIAL:SKIP_LINK -->\n  ${SKIP_LINK_SRC}\n  <!-- /PARTIAL:SKIP_LINK -->`;
  const skipLinkPattern = /<!-- PARTIAL:SKIP_LINK -->[\s\S]*?<!-- \/PARTIAL:SKIP_LINK -->/;
  if (skipLinkPattern.test(html)) {
    html = html.replace(skipLinkPattern, skipLinkBlock);
  } else {
    // 首次注入在 <body> 紧接处
    html = html.replace(/<body([^>]*)>\s*/, `<body$1>\n  ${skipLinkBlock}\n\n  `);
  }

  // 2. Navigation
  const pageNav = buildNav(activeNav);
  const navBlock = `<!-- PARTIAL:NAV -->\n  ${pageNav}\n  <!-- /PARTIAL:NAV -->`;
  const navPattern = /<!-- PARTIAL:NAV -->[\s\S]*?<!-- \/PARTIAL:NAV -->/;
  if (navPattern.test(html)) {
    html = html.replace(navPattern, navBlock);
  } else {
    // 替换原生 <nav class="nav"...>...</nav>
    const rawNavPattern = /[ \t]*<nav class="nav"[^>]*>[\s\S]*?<\/nav>/;
    if (rawNavPattern.test(html)) {
      html = html.replace(rawNavPattern, navBlock);
    }
  }

  // 3. Footer
  const footerBlock = `<!-- PARTIAL:FOOTER -->\n  ${FOOTER_SRC}\n  <!-- /PARTIAL:FOOTER -->`;
  const footerPattern = /<!-- PARTIAL:FOOTER -->[\s\S]*?<!-- \/PARTIAL:FOOTER -->/;
  if (footerPattern.test(html)) {
    html = html.replace(footerPattern, footerBlock);
  } else {
    // 替换原生 <footer class="footer"...>...</footer>
    const rawFooterPattern = /[ \t]*<footer class="footer"[^>]*>[\s\S]*?<\/footer>/;
    if (rawFooterPattern.test(html)) {
      html = html.replace(rawFooterPattern, footerBlock);
    }
  }

  const oldHtml = fs.readFileSync(fullPath, 'utf-8');
  if (html !== oldHtml) {
    fs.writeFileSync(fullPath, html, 'utf-8');
    return true;
  }
  return false;
}

function syncAllPartials() {
  let modifiedCount = 0;
  TARGET_PAGES.forEach(({ file, activeNav }) => {
    if (syncFilePartials(file, activeNav)) {
      modifiedCount++;
      console.log(`  📝 同步片段: ${file}`);
    }
  });
  console.log(`🔖 布局片段同步完成: ${TARGET_PAGES.length} 个页面扫描，${modifiedCount} 个写入`);
}

if (require.main === module) {
  syncAllPartials();
}

module.exports = { syncAllPartials, syncFilePartials };
