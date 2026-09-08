#!/usr/bin/env node
/**
 * 全站一致性门禁（发文链最后一步，任何断言失败 exit 1）
 *
 *   a) blog/posts/*.html 文件名集合、articles-index.json posts[].slug 集合、
 *      related-posts.js ARTICLE_INDEX slug 集合三者双向相等
 *   b) blog/meta/*.json 与 posts 一一对应，且 dateTime 可解析（+08:00）
 *   c) 4 个主页面（index/blog/about/projects）style.css ?v= 值一致
 *   d) search.js 在 index.html 只加载一次
 *
 * 本地 Run: node scripts/verify.js
 * generate-post.py 在索引重建成功后自动调用。
 */

const fs = require('fs');
const path = require('path');

const CWD = path.join(__dirname, '..');
const errors = [];
const infos = [];

function fail(msg) { errors.push(msg); }

function readText(p) {
  return fs.readFileSync(path.join(CWD, p), 'utf-8');
}

function exists(p) {
  return fs.existsSync(path.join(CWD, p));
}

// ── a) 三处 slug 集合双向相等 ────────────────────────────
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

let relatedSlugs = new Set();
try {
  const js = readText('assets/js/related-posts.js');
  const block = js.match(/const ARTICLE_INDEX = \[([\s\S]*?)\n\];/);
  if (!block) {
    fail('a) related-posts.js 中找不到 const ARTICLE_INDEX = [...] 块');
  } else {
    const slugs = [...block[1].matchAll(/\{\s*slug:\s*"((?:[^"\\]|\\.)*)"/g)].map(m => m[1]);
    relatedSlugs = new Set(slugs);
    if (slugs.length !== relatedSlugs.size) {
      fail(`a) related-posts.js 存在重复 slug（共 ${slugs.length} 条、去重后 ${relatedSlugs.size}）`);
    }
  }
} catch (e) {
  fail(`a) related-posts.js 读取失败: ${e.message}`);
}

function diffSets(name, set) {
  const missing = [...htmlSlugs].filter(s => !set.has(s));
  const extra = [...set].filter(s => !htmlSlugs.has(s));
  if (missing.length) fail(`a) ${name} 缺少 ${missing.length} 篇: ${missing.join(', ')}`);
  if (extra.length) fail(`a) ${name} 多出 ${extra.length} 条(ghost): ${extra.join(', ')}`);
}
diffSets('articles-index.json', indexSlugs);
diffSets('related-posts.js ARTICLE_INDEX', relatedSlugs);

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
console.log(`✅ verify.js 全部通过（posts/index/related/meta 各 ${htmlSlugs.size} 条对齐，主页面版本一致）`);
