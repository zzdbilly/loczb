#!/usr/bin/env node
/**
 * 全站一致性门禁（发文链最后一步，任何断言失败 exit 1）
 *
 *   a) blog/posts/*.html 文件名集合、articles-index.json posts[].slug 集合双向相等
 *   b) blog/meta/*.json 与 posts 一一对应，且 dateTime 可解析（+08:00）
 *   c) 4 个主页面（index/blog/about/projects）style.css ?v= 值一致
 *   d) search.js 在 index.html 只加载一次
 *   e) 体积门禁：articles-index.json raw ≤ 250KB；related-posts.js 全量索引必须已下线
 *   f) 静态相关文章：文章页内联的 related 块标记齐全、链接指向真实文章（每篇 ≥1 条，
 *      期望 top 5；不足 3 条只提示不阻断）
 *   g) 列表静态分页：页数 = ceil(总文章数 / 10)、每页卡片数 ∈ [1,10]、跨页 slug 不重复、
 *      合计等于 posts 总数，且每页有自指 canonical 与可达的 prev/next 导航
 *
 * 本地 Run: node scripts/verify.js
 * generate-post.py 在索引重建成功后自动调用。
 */

const fs = require('fs');
const path = require('path');

const CWD = path.join(__dirname, '..');
const POSTS_PER_PAGE = 10;
const INDEX_MAX_BYTES = 250 * 1024;
const errors = [];
const infos = [];

function fail(msg) { errors.push(msg); }

function readText(p) {
  return fs.readFileSync(path.join(CWD, p), 'utf-8');
}

function exists(p) {
  return fs.existsSync(path.join(CWD, p));
}

// ── a) posts 文件名集合与索引 slug 集合双向相等 ──────────
const htmlSlugs = new Set(
  fs.readdirSync(path.join(CWD, 'blog', 'posts'))
    .filter(f => f.endsWith('.html'))
    .map(f => f.replace(/\.html$/, ''))
);

let indexSlugs = new Set();
try {
  const data = JSON.parse(readText('blog/articles-index.json'));
  indexSlugs = new Set((data.posts || []).map(p => p.slug));
} catch (e) {
  fail(`a) articles-index.json 读取/解析失败: ${e.message}`);
}

function diffSets(name, set) {
  const missing = [...htmlSlugs].filter(s => !set.has(s));
  const extra = [...set].filter(s => !htmlSlugs.has(s));
  if (missing.length) fail(`a) ${name} 缺少 ${missing.length} 篇: ${missing.join(', ')}`);
  if (extra.length) fail(`a) ${name} 多出 ${extra.length} 条(ghost): ${extra.join(', ')}`);
}
diffSets('articles-index.json', indexSlugs);

// ── b) blog/meta 与 posts 一一对应 + dateTime 可解析 ─────
const META_DIR = path.join(CWD, 'blog', 'meta');
const metaSlugs = exists('blog/meta')
  ? new Set(fs.readdirSync(META_DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, '')))
  : new Set();

{
  const missing = [...htmlSlugs].filter(s => !metaSlugs.has(s));
  const extra = [...metaSlugs].filter(s => !htmlSlugs.has(s));
  if (missing.length) fail(`b) blog/meta/ 缺少 ${missing.length} 个 sidecar: ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ' …' : ''}`);
  if (extra.length) fail(`b) blog/meta/ 多出 ${extra.length} 个无对应文章的 sidecar: ${extra.join(', ')}`);
}

for (const slug of metaSlugs) {
  let meta;
  try {
    meta = JSON.parse(readText(`blog/meta/${slug}.json`));
  } catch (e) {
    fail(`b) blog/meta/${slug}.json 解析失败: ${e.message}`);
    continue;
  }
  if (meta.slug !== slug) fail(`b) blog/meta/${slug}.json 的 slug 字段 "${meta.slug}" 与文件名不一致`);
  const dt = meta.dateTime || (meta.date ? meta.date + ' 00:00:00' : '');
  if (!dt || Number.isNaN(new Date(dt + '+08:00').getTime())) {
    fail(`b) blog/meta/${slug}.json 的 dateTime 无法解析: "${meta.dateTime || ''}"`);
  }
  if (!meta.category) infos.push(`b) ${slug}: category 为空（建议补 JSON-LD articleSection）`);
}

// ── c) 4 个主页面 style.css ?v= 一致 ─────────────────────
{
  const pages = ['index.html', 'blog/index.html', 'about/index.html', 'projects/index.html'];
  const versions = {};
  pages.forEach(page => {
    if (!exists(page)) { fail(`c) ${page} 不存在`); return; }
    const m = readText(page).match(/style\.css\?v=([^"']+)"/);
    versions[page] = m ? m[1] : null;
    if (!m) fail(`c) ${page} 的 style.css 引用缺少 ?v= 版本参数`);
  });
  const vals = new Set(Object.values(versions).filter(Boolean));
  if (vals.size > 1) {
    fail(`c) style.css ?v= 不一致: ${pages.map(p => `${p}=${versions[p] || '-'}`).join(', ')}`);
  }
}

// ── d) search.js 在 index.html 只加载一次 ────────────────
{
  if (exists('index.html')) {
    const hits = [...readText('index.html').matchAll(/<script[^>]*src="[^"]*search\.js[^"]*"[^>]*>/g)];
    if (hits.length !== 1) {
      fail(`d) index.html 中 search.js 被加载 ${hits.length} 次（应为 1 次）: ${hits.map(h => h[0]).join(' | ')}`);
    }
  } else {
    fail('d) index.html 不存在');
  }
}

// ── e) 体积门禁 ──────────────────────────────────────────
{
  const indexPath = path.join(CWD, 'blog', 'articles-index.json');
  if (!fs.existsSync(indexPath)) {
    fail('e) blog/articles-index.json 不存在');
  } else {
    const size = fs.statSync(indexPath).size;
    if (size > INDEX_MAX_BYTES) {
      fail(`e) 体积门禁: blog/articles-index.json ${size} 字节 > 上限 ${INDEX_MAX_BYTES} 字节（索引必须保持瘦身，禁止内联 excerpt/派生数据）`);
    }
  }

  const relatedPath = path.join(CWD, 'assets', 'js', 'related-posts.js');
  if (fs.existsSync(relatedPath)) {
    const js = fs.readFileSync(relatedPath, 'utf-8');
    if (/const ARTICLE_INDEX = \[/.test(js)) {
      fail('e) 体积门禁: assets/js/related-posts.js 仍内嵌全量 ARTICLE_INDEX（相关文章已改为构建期内联，该文件应已删除）');
    }
  }

  const referenced = [];
  const SCRIPT_REF = /<script[^>]*src="[^"]*related-posts\.js[^"]*"[^>]*>/;
  const scanDirs = [path.join(CWD, 'blog', 'posts'), path.join(CWD, 'blog'), path.join(CWD, 'templates')];
  scanDirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(f => {
      const full = path.join(dir, f);
      // 只认真正的 <script src> 引用：文章正文里提到 related-posts.js 字样是内容，不算
      if (SCRIPT_REF.test(fs.readFileSync(full, 'utf-8'))) {
        referenced.push(path.relative(CWD, full));
      }
    });
  });
  ['index.html', 'about/index.html', 'projects/index.html'].forEach(p => {
    if (exists(p) && SCRIPT_REF.test(readText(p))) referenced.push(p);
  });
  if (referenced.length) {
    fail(`e) 以下 ${referenced.length} 个页面仍在引用已下线的 related-posts.js: ${referenced.slice(0, 5).join(', ')}${referenced.length > 5 ? ' …' : ''}`);
  }
}

// ── f) 文章页静态相关文章块 ──────────────────────────────
{
  const RELATED_BLOCK = /<!-- Related Static -->([\s\S]*?)<!-- \/Related Static -->/;
  let missingBlock = 0, emptyBlock = 0, brokenLink = 0, thin = 0;
  const brokenSamples = [];

  for (const slug of htmlSlugs) {
    const html = readText(`blog/posts/${slug}.html`);
    const block = html.match(RELATED_BLOCK);
    if (!block) { missingBlock++; continue; }
    const links = [...block[1].matchAll(/<a class="related-post-card" href="([^"]+)"[^>]*>/g)].map(m => m[1]);
    if (links.length === 0) { emptyBlock++; continue; }
    if (links.length < 3) thin++;
    links.forEach(href => {
      const target = href.replace(/\.html$/, '').replace(/^posts\//, '');
      if (!htmlSlugs.has(target)) {
        brokenLink++;
        if (brokenSamples.length < 5) brokenSamples.push(`${slug} → ${href}`);
      }
    });
  }

  if (missingBlock) fail(`f) ${missingBlock} 篇文章页缺少 <!-- Related Static --> 标记（需跑一次 refresh-posts.py 回刷模板）`);
  if (emptyBlock) fail(`f) ${emptyBlock} 篇文章页的相关文章块为空`);
  if (brokenLink) fail(`f) 静态相关链接指向不存在的文章 ${brokenLink} 处: ${brokenSamples.join(', ')}`);
  if (thin) infos.push(`f) ${thin} 篇文章的相关推荐不足 3 条（相关度过滤后候选偏少，非阻断）`);
}

// ── g) 列表静态分页 ──────────────────────────────────────
{
  const BLOG_DIR = path.join(CWD, 'blog');
  const listFiles = ['index.html', ...fs.readdirSync(BLOG_DIR).filter(f => /^page-\d+\.html$/.test(f)).sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))];
  const expectedPages = Math.max(1, Math.ceil(htmlSlugs.size / POSTS_PER_PAGE));

  if (listFiles.length !== expectedPages) {
    fail(`g) 列表页数 ${listFiles.length} ≠ ceil(${htmlSlugs.size} / ${POSTS_PER_PAGE}) = ${expectedPages}`);
  }

  const seen = new Map();   // slug -> pageNo（跨页查重）
  let totalCards = 0;

  listFiles.forEach((file, idx) => {
    const pageNo = idx + 1;
    const full = path.join(BLOG_DIR, file);
    if (!fs.existsSync(full)) { fail(`g) 缺少列表页 blog/${file}`); return; }
    const html = fs.readFileSync(full, 'utf-8');

    const cards = html.match(/<article class="blog-list-item/g) || [];
    const slugs = [...html.matchAll(/<h3 class="blog-list-title">\s*<a href="posts\/([^"]+)\.html"/g)].map(m => m[1].replace(/\.html$/, ''));

    if (cards.length !== slugs.length) {
      fail(`g) blog/${file}: 卡片数 ${cards.length} 与标题链接数 ${slugs.length} 不一致`);
    }
    if (cards.length < 1 || cards.length > POSTS_PER_PAGE) {
      fail(`g) blog/${file}: 卡片数 ${cards.length} 超出 [1, ${POSTS_PER_PAGE}]`);
    }
    totalCards += slugs.length;
    slugs.forEach(s => {
      if (seen.has(s)) fail(`g) 文章 ${s} 同时在 blog/${seen.get(s)} 与 blog/${file}（跨页重复）`);
      else seen.set(s, file);
      if (!htmlSlugs.has(s)) fail(`g) blog/${file} 引用了不存在的文章 ${s}`);
    });

    // canonical 自指
    const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1] || '';
    const expected = pageNo === 1 ? 'https://709527.xyz/blog/' : `https://709527.xyz/blog/page-${pageNo}.html`;
    if (canonical !== expected) fail(`g) blog/${file}: canonical=${canonical || '(缺失)'}，应为 ${expected}`);

    // 分页导航可达性：静态页里第 1 页是 index.html，其余是 page-N.html
    const navHrefOf = n => (n === 1 ? 'index.html' : `page-${n}.html`);
    const navHrefs = new Set([...html.matchAll(/class="pagination-btn[^"]*"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="pagination-btn[^"]*"/g)]
      .map(m => m[1] || m[2]).filter(Boolean));
    if (pageNo > 1 && !navHrefs.has(navHrefOf(pageNo - 1))) {
      fail(`g) blog/${file}: 分页导航缺少上一页链接 ${navHrefOf(pageNo - 1)}`);
    }
    if (pageNo < expectedPages && !navHrefs.has(navHrefOf(pageNo + 1))) {
      fail(`g) blog/${file}: 分页导航缺少下一页链接 ${navHrefOf(pageNo + 1)}`);
    }
  });

  if (totalCards !== htmlSlugs.size) {
    fail(`g) 分页卡片合计 ${totalCards} ≠ 文章总数 ${htmlSlugs.size}`);
  }
}

// ── 结果 ─────────────────────────────────────────────────
if (infos.length) {
  console.log('ℹ️  非阻断提示:');
  infos.forEach(i => console.log('   ' + i));
}
if (errors.length) {
  console.error(`\n❌ verify.js 失败，共 ${errors.length} 处不一致：`);
  errors.forEach(e => console.error('   - ' + e));
  process.exit(1);
}
console.log(`✅ verify.js 全部通过（posts/index/meta 各 ${htmlSlugs.size} 条对齐，静态相关与静态分页门禁通过，主页面版本一致）`);
