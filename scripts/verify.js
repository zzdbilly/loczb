#!/usr/bin/env node
/**
 * 全站一致性门禁（发文链最后一步，任何断言失败 exit 1）
 *
 *   a) blog/posts/*.html 文件名集合、articles-index.json posts[].slug 集合双向相等
 *   b) blog/meta/*.json 与 posts 一一对应，且 dateTime 可解析（+08:00）
 *   c) 4 个主页面（index/blog/about/projects）style.css ?v= 值一致
 *   d) search.js 在 index.html 只加载一次
 *   e) 体积门禁：articles-index.json 超 250KB 只预警（非阻断），超 400KB 才阻断；
 *      related-posts.js 全量索引必须已下线
 *   f) 静态相关文章：文章页内联的 related 块标记齐全、链接指向真实文章（每篇 ≥1 条，
 *      期望 top 5；不足 3 条只提示不阻断）
 *   g) 列表静态分页：页数 = ceil(总文章数 / 10)、每页卡片数 ∈ [1,10]、跨页 slug 不重复、
 *      合计等于 posts 总数，且每页有自指 canonical 与可达的 prev/next 导航
 *   h) 内容质量（阻断，2026-09-27 由警告升级）：① 每篇 JSON-LD 能 JSON.parse；
 *      datePublished/dateModified 是合法 ISO 8601；③ og:url/canonical 与文章实际路径一致；
 *      ④ tags 非空。存量（109 篇坏日期 / 1 篇 og:url / 10 篇空 tags）已于 1a066148 清干净，
 *      故改为 fail() 阻断——否则「门禁全绿 ≠ 无问题」，坏数据会再次长期藏进绿灯下。
 *      只有出现「确实要放行的存量数据」（例如上游批量导入无法立刻修正）时，才应该把这四条
 *      降回警告（infos.push），且必须在描述里写明降级的理由和计划修正日期。
 *   i) 评论组件引用版本：每个含 <script src="…comment-widget.js?v="> 的页面，其 ?v= 必须
 *      等于 workers/comment-system/comment-widget.js 的内容哈希（sha256 前 10 位），
 *      组件内部注入 CSS 的 CSS_PATH 版本必须等于 comment-widget.css 的内容哈希。
 *      作用：改组件后不重建（引用版本陈旧）会立刻在这里暴露，而不是上线后等 10 分钟缓存。
 *
 * 本地 Run: node scripts/verify.js
 * generate-post.py 在索引重建成功后自动调用。
 */

const fs = require('fs');
const path = require('path');

const CWD = path.join(__dirname, '..');
const POSTS_PER_PAGE = 10;
const INDEX_WARN_BYTES = Number(process.env.INDEX_WARN_BYTES) || 250 * 1024;   // 预警线：只提示，不阻断发文
const INDEX_FAIL_BYTES = Number(process.env.INDEX_FAIL_BYTES) || 400 * 1024;   // 阻断线：约 1000 篇（实测 ≈407 字节/篇）
// 两条线均可用环境变量覆盖，便于验证门禁行为：INDEX_WARN_BYTES=1024 node scripts/verify.js
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

// ── c) 全站主页面及模板 style.css ?v= 与内容哈希一致 ─────────────────────
{
  const crypto = require('crypto');
  const stylePath = 'assets/css/style.css';
  const expectedHash = exists(stylePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(stylePath)).digest('hex').slice(0, 10)
    : null;

  const pages = ['index.html', 'blog/index.html', 'about/index.html', 'projects/index.html', 'templates/blog-post-template.html'];
  const versions = {};
  pages.forEach(page => {
    if (!exists(page)) { fail(`c) ${page} 不存在`); return; }
    const m = readText(page).match(/style\.css\?v=([^"']+)"/);
    versions[page] = m ? m[1] : null;
    if (!m) fail(`c) ${page} 的 style.css 引用缺少 ?v= 版本参数`);
    else if (expectedHash && m[1] !== expectedHash) {
      fail(`c) ${page} 的 style.css ?v=${m[1]} 与内容哈希 ${expectedHash} 不一致`);
    }
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
    if (size > INDEX_FAIL_BYTES) {
      fail(`e) 体积门禁: blog/articles-index.json ${size} 字节 > 阻断线 ${INDEX_FAIL_BYTES} 字节（索引必须保持瘦身，禁止内联 excerpt/派生数据；突破此线说明该改搜索/索引架构了）`);
    } else if (size > INDEX_WARN_BYTES) {
      infos.push(`e) 索引体积 ${size} 字节已超预警线 ${INDEX_WARN_BYTES} 字节（约 ${Math.round(size / (htmlSlugs.size || 1))} 字节/篇，${htmlSlugs.size} 篇；未阻断，但已接近需要重构索引的规模）`);
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

// ── h) 内容质量（阻断：命中即 exit 1，2026-09-27 由警告升级）───────
// 历史背景：这四条曾是 warnCheck（非阻断），存量问题就长期藏在绿灯下
// （109 篇 JSON-LD 坏日期 / 1 篇 og:url 不一致 / 10 篇空 tags）。
// 存量已于 1a066148 清零，故升级为 fail()。若将来真有必须放行的存量数据，
// 降回警告时必须在本行注明降级理由与计划修正日期，不能静默降级。
function contentCheck(name, count, samples) {
  if (!count) return;
  const list = samples.slice(0, 5).join(', ') + (count > samples.length ? ' …' : '');
  fail(`h) ${name}: 命中 ${count} 篇${count ? ' — 例: ' + list : ''}`);
}

{
  const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  const JSON_LD_RE = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;

  let ldMissing = 0, ldBadJson = 0, ldBadIso = 0, urlMismatch = 0, emptyTags = 0;
  const ldMissingList = [], ldBadJsonList = [], ldBadIsoList = [], urlMismatchList = [], emptyTagsList = [];

  for (const slug of [...htmlSlugs].sort()) {
    const html = readText(`blog/posts/${slug}.html`);

    // ① JSON-LD 能否 JSON.parse
    const m = html.match(JSON_LD_RE);
    let ld = null;
    if (!m) {
      ldMissing++;
      ldMissingList.push(slug);
    } else {
      try {
        ld = JSON.parse(m[1]);
      } catch (e) {
        ldBadJson++;
        ldBadJsonList.push(slug);
      }
    }

    // ② datePublished / dateModified 是否合法 ISO 8601
    if (ld) {
      const badKeys = ['datePublished', 'dateModified'].filter(k =>
        !(typeof ld[k] === 'string' && ISO_8601.test(ld[k]) && !Number.isNaN(new Date(ld[k]).getTime())));
      if (badKeys.length) {
        ldBadIso++;
        ldBadIsoList.push(`${slug}(${badKeys.join('/')}=${JSON.stringify(ld[badKeys[0]])})`);
      }
    }

    // ③ og:url / canonical 与文章实际路径是否一致
    const expectedUrl = `https://709527.xyz/blog/posts/${slug}.html`;
    const ogUrl = (html.match(/<meta property="og:url" content="([^"]*)"/) || [])[1] || '';
    const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
    if (ogUrl !== expectedUrl || canonical !== expectedUrl) {
      urlMismatch++;
      urlMismatchList.push(`${slug}(og:url=${ogUrl || '缺失'}, canonical=${canonical || '缺失'})`);
    }

    // ④ tags 是否为空（sidecar 是元数据真相源；解析失败已在 b) 阻断，这里跳过）
    try {
      const meta = JSON.parse(readText(`blog/meta/${slug}.json`));
      if (!Array.isArray(meta.tags) || meta.tags.filter(t => String(t).trim()).length === 0) {
        emptyTags++;
        emptyTagsList.push(slug);
      }
    } catch (e) { /* ignore */ }
  }

  contentCheck('① JSON-LD 缺失', ldMissing, ldMissingList);
  contentCheck('① JSON-LD 无法 JSON.parse', ldBadJson, ldBadJsonList);
  contentCheck('② datePublished/dateModified 非法 ISO 8601', ldBadIso, ldBadIsoList);
  contentCheck('③ og:url/canonical 与文章路径不一致', urlMismatch, urlMismatchList);
  contentCheck('④ tags 为空', emptyTags, emptyTagsList);
}

// ── i) 评论组件引用版本 = 组件当前内容哈希 ────────────────
// 为什么需要：comment-widget.js 是通过 <script src="…?v=<hash>"> 引用的，
// GitHub Pages 对静态资源下发 max-age=600，内容变了而 URL 没变 ⇒ 用户最长 10 分钟
// 拿到旧组件。版本号由 scripts/sync-widget-version.js 写（generate-index.js 末尾自动跑），
// 这里对账「引用里的 ?v= == 组件内容 sha256 前 10 位」，挡住两类事故：
//   ① 手改了 comment-widget.js/.css 却没重建（引用版本陈旧 ⇒ 改动不生效）
//   ② 手改 HTML 版本号凑数（版本与内容哈希脱钩，缓存永不失效或错命中）
// CSS 由组件自己动态注入 <link>（loadCSS()），不在 HTML 里，所以单独查它的 CSS_PATH 常量。
{
  const crypto = require('crypto');
  const JS_REL = 'workers/comment-system/comment-widget.js';
  const CSS_REL = 'workers/comment-system/comment-widget.css';
  const HASH_LEN = 10;
  const REF_RE = /<script[^>]*\bsrc="[^"]*comment-widget\.js(?:\?v=([0-9a-f]+))?"/g;

  const hashOf = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(CWD, p))).digest('hex').slice(0, HASH_LEN);

  function walkHtml(dir, out = []) {
    for (const name of fs.readdirSync(dir)) {
      if (name === '.git' || name === 'node_modules') continue;
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walkHtml(full, out);
      else if (name.endsWith('.html')) out.push(full);
    }
    return out;
  }

  if (!exists(JS_REL) || !exists(CSS_REL)) {
    fail(`i) 缺少评论组件文件（${JS_REL} / ${CSS_REL}）`);
  } else {
    const expectJs = hashOf(JS_REL);
    const expectCss = hashOf(CSS_REL);

    // 组件内部注入的 CSS 版本
    const m = readText(JS_REL).match(/const CSS_PATH = '[^']*\/comment-widget\.css\?v=([0-9a-f]+)'/);
    if (!m) fail(`i) ${JS_REL} 的 CSS_PATH 没有 ?v= 版本参数（改 CSS 会继续吃 10 分钟旧缓存）`);
    else if (m[1] !== expectCss) fail(`i) 评论组件 CSS 版本不一致: CSS_PATH=${m[1]}，当前 ${CSS_REL} 内容哈希=${expectCss}（跑 node scripts/sync-widget-version.js）`);

    const pagesWithRef = [];
    const stale = [], noVersion = [];
    let refTotal = 0;

    for (const full of walkHtml(CWD)) {
      const rel = path.relative(CWD, full);
      const html = fs.readFileSync(full, 'utf-8');
      const matches = [...html.matchAll(REF_RE)];
      if (!matches.length) continue;
      refTotal += matches.length;
      pagesWithRef.push(rel);
      matches.forEach(mm => {
        if (!mm[1]) noVersion.push(rel);
        else if (mm[1] !== expectJs) stale.push(`${rel}(v=${mm[1]})`);
      });
    }

    if (refTotal === 0) fail('i) 全站找不到任何评论组件引用（引用写法被改动过？）');
    if (noVersion.length) fail(`i) ${noVersion.length} 处评论组件引用缺少 ?v= 版本参数: ${noVersion.slice(0, 5).join(', ')}${noVersion.length > 5 ? ' …' : ''}`);
    if (stale.length) fail(`i) ${stale.length} 处评论组件引用版本 ≠ 当前组件内容哈希 ${expectJs}（改组件后未重建）: ${stale.slice(0, 5).join(', ')}${stale.length > 5 ? ' …' : ''}`);

    // 文章页与模板必须恰好 1 处引用（多/少都说明模板链漂了）
    const mustRef = ['templates/blog-post-template.html'];
    for (const slug of htmlSlugs) mustRef.push(`blog/posts/${slug}.html`);
    const missing = mustRef.filter(p => !pagesWithRef.includes(p));
    const dup = pagesWithRef.filter(p => /^blog[\/]posts[\/]|^templates[\/]/.test(p)
      && [...fs.readFileSync(path.join(CWD, p), 'utf-8').matchAll(REF_RE)].length !== 1);
    if (missing.length) fail(`i) ${missing.length} 个文章页/模板缺少评论组件引用: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' …' : ''}`);
    if (dup.length) fail(`i) ${dup.length} 个文章页/模板的评论组件引用不是恰好 1 处: ${dup.slice(0, 5).join(', ')}`);

    infos.push(`i) 评论组件引用版本 ${expectJs}：${pagesWithRef.length} 个页面 / ${refTotal} 处引用全部一致`);
  }
}

// ── j) 全站文章数量锚点同步校验 ─────────────────────────────
// 所有含 <!-- POSTS_COUNT -->N<!-- /POSTS_COUNT --> 的页面，N 必须等于 htmlSlugs.size。
// 避免主页/关于页/项目页/404页在发布新文后出现数量滞后与漂移。
{
  const checkPages = ['index.html', 'blog/index.html', 'about/index.html', 'projects/index.html', '404.html'];
  const expectedCount = String(htmlSlugs.size);
  let totalAnchors = 0;
  checkPages.forEach(p => {
    if (!exists(p)) return;
    const html = readText(p);
    const matches = [...html.matchAll(/<!-- POSTS_COUNT -->([\s\S]*?)<!-- \/POSTS_COUNT -->/g)];
    totalAnchors += matches.length;
    matches.forEach(m => {
      const val = m[1].trim();
      if (val !== expectedCount) {
        fail(`j) ${p}: 文章数锚点值 "${val}" ≠ 当前文章总数 ${expectedCount}`);
      }
    });
  });
  if (totalAnchors === 0) {
    fail('j) 全站主页面找不到任何 <!-- POSTS_COUNT --> 锚点');
  } else {
    infos.push(`j) 全站文章数锚点已对齐最新数据（${expectedCount} 篇 / ${totalAnchors} 处锚点一致）`);
  }
}

// ── k) 废弃脚本与冗余引用清理门禁 ─────────────────────────────
// time-progress.js 已于 3c15377 移除页面展示，现已全站下线，禁止死灰复燃；
// projects/index.html 不含搜索框，禁止引入 search.js / meta-cache.js。
{
  const TIME_PROGRESS_REF = /<script[^>]*src="[^"]*time-progress\.js[^"]*"[^>]*>/;
  const badPages = [];
  ['index.html', 'blog/index.html', 'about/index.html', 'projects/index.html', '404.html'].forEach(p => {
    if (exists(p) && TIME_PROGRESS_REF.test(readText(p))) badPages.push(p);
  });
  if (badPages.length) {
    fail(`k) 以下页面仍在引用已废弃的 time-progress.js: ${badPages.join(', ')}`);
  }
  if (exists('projects/index.html')) {
    const projHtml = readText('projects/index.html');
    if (projHtml.includes('search.js') || projHtml.includes('meta-cache.js')) {
      fail('k) projects/index.html 仍在引用无用的 search.js 或 meta-cache.js');
    }
  }
}

// ── l) 文章静态上一篇/下一篇导航门禁 ─────────────────────────────
// 每篇文章必须包含 <!-- Post Nav Prev Next --> 块，且包含有效导航结构
{
  const missingNav = [];
  for (const slug of htmlSlugs) {
    const p = `blog/posts/${slug}.html`;
    if (!exists(p)) continue;
    const html = readText(p);
    if (!html.includes('<!-- Post Nav Prev Next -->') || !html.includes('class="post-nav"')) {
      missingNav.push(slug);
    }
  }
  if (missingNav.length) {
    fail(`l) ${missingNav.length} 篇文章缺少静态「上一篇/下一篇」导航: ${missingNav.slice(0, 5).join(', ')}${missingNav.length > 5 ? ' …' : ''}`);
  } else {
    infos.push(`l) 静态上一篇/下一篇导航已覆盖全量 ${htmlSlugs.size} 篇博文`);
  }
}

// ── m) 无障碍跳至正文 (skip-link) 门禁 ─────────────────────────────
// 核心页面与文章模板必须包含 <a href="#main-content" class="skip-link">
{
  const corePages = ['index.html', 'blog/index.html', 'about/index.html', 'projects/index.html', 'offline.html', '404.html', 'templates/blog-post-template.html'];
  const missingSkip = [];
  corePages.forEach(p => {
    if (!exists(p)) return;
    const html = readText(p);
    if (!html.includes('class="skip-link"') || !html.includes('href="#main-content"')) {
      missingSkip.push(p);
    }
  });
  if (missingSkip.length) {
    fail(`m) ${missingSkip.length} 个核心页面缺少 skip-link: ${missingSkip.join(', ')}`);
  }
}

// ── n) 全站导航与页脚片段一致性门禁 ─────────────────────────────
{
  const corePartialPages = ['index.html', 'blog/index.html', 'about/index.html', 'projects/index.html', '404.html', 'templates/blog-post-template.html'];
  const missingFooter = [];
  const missingNav = [];
  const unstyledCopy = [];

  corePartialPages.forEach(p => {
    if (!exists(p)) return;
    const html = readText(p);
    if (!html.includes('<!-- PARTIAL:FOOTER -->') || !html.includes('class="footer"')) {
      missingFooter.push(p);
    }
    if (!html.includes('<!-- PARTIAL:NAV -->') || !html.includes('class="nav"')) {
      missingNav.push(p);
    }
    if (html.includes('class="footer-copy"') && !html.includes('footer-copyright')) {
      unstyledCopy.push(p);
    }
  });

  if (missingFooter.length) {
    fail(`n) ${missingFooter.length} 个核心页面缺少页脚 Partial: ${missingFooter.join(', ')}`);
  }
  if (missingNav.length) {
    fail(`n) ${missingNav.length} 个核心页面缺少导航 Partial: ${missingNav.join(', ')}`);
  }
  if (unstyledCopy.length) {
    fail(`n) ${unstyledCopy.length} 个页面包含未声明样式的 footer-copy 类名: ${unstyledCopy.join(', ')}`);
  }
}

// ── o) 全量博文 posts-src 源文件对齐门禁 ─────────────────────────────
{
  const missingSrc = [];
  const invalidSrc = [];
  for (const slug of htmlSlugs) {
    const srcPath = `blog/posts-src/${slug}.md`;
    if (!exists(srcPath)) {
      missingSrc.push(slug);
    } else {
      const srcText = readText(srcPath);
      if (!srcText.startsWith('---') || !srcText.includes('title:') || !srcText.includes('slug:')) {
        invalidSrc.push(slug);
      }
    }
  }

  if (missingSrc.length) {
    fail(`o) ${missingSrc.length} 篇博文缺少 blog/posts-src/ 源文件: ${missingSrc.slice(0, 5).join(', ')}${missingSrc.length > 5 ? ' …' : ''}`);
  } else {
    infos.push(`o) 全部 ${htmlSlugs.size} 篇博文均具备独立的 posts-src/*.md 源文件与 Frontmatter`);
  }
  if (invalidSrc.length) {
    fail(`o) ${invalidSrc.length} 篇 posts-src 源文件缺少 Frontmatter: ${invalidSrc.join(', ')}`);
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
console.log(`✅ verify.js 全部通过（posts/index/meta 各 ${htmlSlugs.size} 条对齐，静态相关与静态分页门禁通过，主页面版本一致，评论组件引用版本 = 组件内容哈希）`);
