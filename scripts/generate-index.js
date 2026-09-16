/**
 * CI 用的全量索引重建脚本
 * 生成：articles-index.json, blog/index.html + blog/page-2..N.html,
 *       index.html, sitemap.xml, rss.xml, sw.js；并为每篇文章内联静态「相关文章」
 *
 * 本地 Run: node scripts/generate-index.js
 * CI Run:  由 GitHub Actions 在 push blog/posts/ 后自动触发
 */

const fs = require('fs');
const path = require('path');

const CWD = path.join(__dirname, '..');
const POSTS_DIR = path.join(CWD, 'blog', 'posts');
const HOME_INDEX = path.join(CWD, 'index.html');
const BLOG_INDEX = path.join(CWD, 'blog', 'index.html');
const OUTPUT_FILE = path.join(CWD, 'blog', 'articles-index.json');
const SITEMAP_XML = path.join(CWD, 'sitemap.xml');
const RSS_XML = path.join(CWD, 'rss.xml');
const BASE_URL = 'https://709527.xyz';

// ═══════════════════════════════════════════════
// Phase 1: 解析所有文章
// ═══════���═══════════════════════════════════════

// 文章文件名 => 日期排序（按文件修改时间，保证稳定性）
const fileDates = {};
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));
files.forEach(file => {
  const stat = fs.statSync(path.join(POSTS_DIR, file));
  fileDates[file] = stat.mtimeMs;
});

// 解析每篇文章
// 元数据 sidecar（blog/meta/{slug}.json，单一真相源）优先：字段取 sidecar，
// 缺失字段（空串/null）回退下方正则；sidecar 不存在则完全走正则路径。
// 语义与旧正则逐字符一致（backfill-meta.py 保证），产物输出不受迁移影响。
const META_DIR = path.join(CWD, 'blog', 'meta');

function readSidecar(slug) {
  const p = path.join(META_DIR, slug + '.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    console.warn(`⚠️ blog/meta/${slug}.json 解析失败，回退正则: ${e.message}`);
    return null;
  }
}

const posts = files.map(file => {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
  const slug = file.replace('.html', '');
  const sidecar = readSidecar(slug) || {};

  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/ \| 张小猛 - loczb$/, '') : '';

  const dateMatch = content.match(/<span>📅 (\d{4}-\d{1,2}-\d{1,2})(?:\s+(\d{1,2}:\d{1,2}:\d{1,2}))?<\/span>/);
  let date = dateMatch ? dateMatch[1] : '';
  let dateTime = dateMatch ? dateMatch[1] + (dateMatch[2] ? ' ' + dateMatch[2] : '') : '';
  if (date) {
    const parts = date.split('-');
    date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  if (dateTime) {
    const parts = dateTime.split(/[- :]/);
    const m = (n) => String(n).padStart(2, '0');
    dateTime = `${parts[0]}-${m(parts[1])}-${m(parts[2])} ${m(parts[3] || '0')}:${m(parts[4] || '0')}:${m(parts[5] || '0')}`;
  }

  const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
  const excerpt = descMatch ? descMatch[1] : '';

  const tagMatches = content.match(/<span class="tag">([^<]+)<\/span>/g);
  let tags = tagMatches ? tagMatches.map(t => t.replace(/<[^>]*>/g, '')) : [];

  if (tags.length === 0) {
    const oldTags = content.match(/<span class="tech-tag"[^>]*>([^<]+)<\/span>/g);
    tags = oldTags ? oldTags.map(t => t.replace(/<[^>]*>/g, '')) : [];
  }

  // 优先从 schema.org articleSection 读取，其次从 category-tag 读取
  const sectionMatch = content.match(/"articleSection":\s*"([^"]+)"/);
  const catTagMatch = content.match(/<span class="category-tag"[^>]*>([^<]+)<\/span>/);
  let category = (sectionMatch ? sectionMatch[1] : null) || (catTagMatch ? catTagMatch[1] : '');

  // 从文章中读阅读时间
  const readTimeMatch = content.match(/(\d+)\s*min/);
  const readTime = readTimeMatch ? parseInt(readTimeMatch[1]) : 5;

  // sidecar 优先（空值回退正则结果）
  const sTitle = sidecar.title || title;
  const sDate = sidecar.date || date;
  const sDateTime = sidecar.dateTime || dateTime;
  const sExcerpt = sidecar.description || excerpt;
  const sTags = (sidecar.tags && sidecar.tags.length) ? sidecar.tags : tags;
  const sCategory = sidecar.category || category;
  const sReadTime = (sidecar.readTime != null && sidecar.readTime !== '') ? sidecar.readTime : readTime;

  return {
    slug,
    title: sTitle,
    date: sDate,
    dateTime: sDateTime,
    category: sCategory,
    tags: sTags,
    excerpt: sExcerpt,
    readTime: sReadTime,
    url: `blog/posts/${file}`
  };
});

// category 兜底映射：从已生成的列表页（blog/index.html + blog/page-N.html）里
// 反查 data-category。sidecar 与文章 HTML 一般都能取到 category，这条只是最后兜底；
// 分页改造后列表被拆到多页，故需把 page-N.html 一起扫。
const categoryMap = {};
function collectCategoryMap() {
  const pages = [BLOG_INDEX];
  fs.readdirSync(path.join(CWD, 'blog'))
    .filter(f => /^page-\d+\.html$/.test(f))
    .forEach(f => pages.push(path.join(CWD, 'blog', f)));
  const articleRegex = /<article[^>]*class="blog-list-item[^"]*"[^>]*data-category="([^"]+)"[^>]*>[\s\S]*?href="posts\/([^"]+\.html)"[\s\S]*?<\/article>/g;
  pages.forEach(page => {
    if (!fs.existsSync(page)) return;
    const html = fs.readFileSync(page, 'utf-8');
    let match;
    while ((match = articleRegex.exec(html)) !== null) {
      categoryMap[match[2]] = match[1];
    }
    articleRegex.lastIndex = 0;
  });
}
collectCategoryMap();
posts.forEach(p => {
  const filename = p.slug + '.html';
  if (!p.category && categoryMap[filename]) {
    p.category = categoryMap[filename];
  }
  if (!p.category) p.category = '技术';
});

// 排序：按日期时间降序（同日的文章按精确时间排，新写的排前面）
// 健壮性（2026-09-08）：
// - 日期串统一补 +08:00，避免无 Z 无偏移时按机器本地时区解析（UTC 与 CST
//   机器跨日边界顺序不一致）；
// - 同日无精确时间时，用文件 mtime 作 tiebreaker（fileDates 早就算好了却
//   被闲置），mtime 再并列用 slug 字典序——不再依赖 readdirSync 的偶然顺序；
// - 解析不出日期的文章不再混进比较器产生 NaN，收集后统一报 warning 并排末尾。
function parseTime(s) {
  const t = new Date(s + '+08:00').getTime();
  return Number.isNaN(t) ? null : t;
}
const badDates = [];
posts.forEach(p => {
  const key = p.dateTime || p.date + ' 00:00:00';
  p._ts = parseTime(key);
  if (p._ts === null) { badDates.push(p.slug); p._ts = 0; }
  p._mt = fileDates[p.slug + '.html'] || 0;
});
if (badDates.length) {
  console.warn(`⚠️ 以下文章日期无法解析，已排到列表末尾: ${badDates.join(', ')}`);
}
posts.sort((a, b) => {
  if (a._ts !== b._ts) return b._ts - a._ts;         // 日期时间降序
  if (a._mt !== b._mt) return b._mt - a._mt;         // 同日 → 文件 mtime
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0; // 再并列 → slug 字典序
});

console.log(`📊 解析完成: ${posts.length} 篇文章`);

// ═══════════════════════════════════════════════
// Phase 2: 生成 articles-index.json
// ═══════════════════════════════════════════════

const tagCounts = {};
posts.forEach(post => {
  post.tags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
});

// Series 功能已移除
//
// 索引瘦身（2026-09-16）：
// - 不再输出 `archives` / `tagCloud`：两者都是 posts 的重复派生数据（归档视图由
//   blog-list.js 现算、标签云已下线），删掉可省 ~20KB raw；
// - 不再输出 `excerpt`：搜索/筛选视图只在真正展示某条结果时才按需拉
//   blog/meta/{slug}.json sidecar（≤10 条，localStorage 级别缓存见 meta-cache.js）。

const indexData = {
  // post 对象含 dateTime/readTime（来自 sidecar 单一真相源）；
  // 已核对 assets/js/search.js、blog-list.js 均按固定 key 取值，多字段安全。
  posts: posts.map(p => ({ slug: p.slug, title: p.title, date: p.date, dateTime: p.dateTime, category: p.category, tags: p.tags, readTime: p.readTime, url: p.url })),
  categories: [...new Set(posts.map(p => p.category))],
  stats: { totalPosts: posts.length, totalTags: Object.keys(tagCounts).length, latestDate: posts[0]?.date || '', oldestDate: posts[posts.length - 1]?.date || '' }
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(indexData, null, 2));
console.log(`✅ articles-index.json: ${indexData.stats.totalPosts} posts, ${indexData.stats.totalTags} tags (archives/tagCloud/excerpt 已移除)`);

// ═══════════════════════════════════════════════
// 数量同步：替换 HTML 里的 <!-- POSTS_COUNT -->N<!-- /POSTS_COUNT --> 锚点
// ═══════════════════════════════════════════════

function syncPostCount(html) {
  html = html.replace(/<!-- POSTS_COUNT -->[\s\S]*?<!-- \/POSTS_COUNT -->/g,
    `<!-- POSTS_COUNT -->${posts.length}<!-- /POSTS_COUNT -->`);
  // 搜索框 placeholder 属性里不能放注释锚点（会原样显示），单独按数字同步
  html = html.replace(/(placeholder="即时检索 )\d+( 篇博文)/g,
    `$1${posts.length}$2`);
  return html;
}

// ═══════════════════════════════════════════════
// Phase 3: 列表页静态分页 — blog/index.html 就是第 1 页，其余派生 page-2..N.html
// ═══════════════════════════════════════════════
//
// 设计：卡片渲染抽成构建期共用函数；blog/index.html 原地重建为「第 1 页」，
// page-N.html（与 index.html 同目录）由重建后的 index.html 派生 —— 卡片内链接是
// posts/xxx.html、脚本是 ../assets/...，同目录才能原样复用相对路径。每页只装该页
// 的 POSTS_PER_PAGE 张卡 + 写死的 <a> 分页导航（无 JS 也能翻页）。
// 静态导航不带 data-page，因此 blog-list.js 的动态分页逻辑不会接管这些真链接。

const POSTS_PER_PAGE = 10;
const BLOG_DIR = path.join(CWD, 'blog');

// 列表顺序（沿用旧行为：按日期降序；同日保持 posts 的 dateTime 降序，稳定排序不破坏）
const listPosts = [...posts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const totalPages = Math.max(1, Math.ceil(listPosts.length / POSTS_PER_PAGE));

/** 单张列表卡（构建期共用：第 1 页与 page-N 完全同一渲染器） */
function renderListCard(p, pageNo) {
  const dataTags = p.tags.map(t => escapeHtml(t)).join(',');
  const tagsHtml = p.tags.slice(0, 3).map(t => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join(' ');
  return `        <article class="blog-list-item spotlight-card animate-on-scroll" data-category="${escapeHtml(p.category)}" data-tags="${dataTags}" data-page="${pageNo}">
          <div>
            <div class="blog-list-header">
              <div class="blog-list-meta">
                <span class="blog-date">📅 ${escapeHtml(p.date)}</span>
                <span>·</span>
                <span class="blog-read-time">⏱️ ${p.readTime} min</span>
              </div>
              <span class="blog-list-tag">${escapeHtml(p.category)}</span>
            </div>
            <h3 class="blog-list-title">
              <a href="posts/${p.slug}.html">${escapeHtml(p.title)}</a>
            </h3>
            <p class="blog-list-excerpt">${escapeHtml(p.excerpt)}</p>
          </div>
          <div class="blog-list-footer">
            <div class="blog-list-tags">
              ${tagsHtml}
            </div>
            <a href="posts/${p.slug}.html" style="font-size: var(--text-xs); color: var(--color-accent-primary); font-weight: 600; text-decoration: none;">阅读全文 ➔</a>
          </div>
        </article>`;
}

/** 页码序列（与 blog-list.js 动态分页同一算法：首页/尾页 + 当前 ±2 + 省略号） */
function pageNumberSequence(current, total) {
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  const leftStart = Math.max(2, current - 2);
  const rightEnd = Math.min(total - 1, current + 2);
  if (leftStart > 2) pages.push('...');
  for (let i = leftStart; i <= rightEnd; i++) pages.push(i);
  if (rightEnd < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}

/** 静态分页导航（真 <a> 链接，无 data-page；标记/CSS 与 blog-list.js 动态版一致） */
function renderStaticPagination(pageNo, total) {
  if (total <= 1) return '';
  const href = n => (n === 1 ? 'index.html' : `page-${n}.html`);
  let html = '';
  if (pageNo > 1) {
    html += `        <a href="${href(pageNo - 1)}" class="pagination-btn pagination-prev" rel="prev" aria-label="上一页" title="上一页"><span class="pagination-arrow">←</span></a>`;
  } else {
    html += `        <span class="pagination-btn pagination-prev disabled" aria-disabled="true" title="上一页"><span class="pagination-arrow">←</span></span>`;
  }
  const nums = pageNumberSequence(pageNo, total).map(item => {
    if (item === '...') return `          <span class="pagination-ellipsis">···</span>`;
    if (item === pageNo) return `          <span class="pagination-btn active" aria-current="page">${item}</span>`;
    return `          <a href="${href(item)}" class="pagination-btn">${item}</a>`;
  }).join('\n');
  html += `\n        <div class="pagination-pages">\n${nums}\n        </div>`;
  if (pageNo < total) {
    html += `\n        <a href="${href(pageNo + 1)}" class="pagination-btn pagination-next" rel="next" aria-label="下一页" title="下一页"><span class="pagination-arrow">→</span></a>`;
  } else {
    html += `\n        <span class="pagination-btn pagination-next disabled" aria-disabled="true" title="下一页"><span class="pagination-arrow">→</span></span>`;
  }
  return html;
}

const LIST_PATTERN = /(<!-- Post List -->)[\s\S]*?(<!-- \/Post List -->)/;
// 分页容器：吞掉到「Archive View」注释前的整块（含上一轮生成的嵌套 div）
const PAGINATION_PATTERN = /([ \t]*<div class="pagination" id="pagination")[^>]*>[\s\S]*?(<!-- Archive View -->)/;

/** 把某一页的卡片与静态分页写进给定 HTML 骨架 */
function applyPageContent(html, pageNo) {
  const start = (pageNo - 1) * POSTS_PER_PAGE;
  const pagePosts = listPosts.slice(start, start + POSTS_PER_PAGE);
  const cards = pagePosts.map(p => renderListCard(p, pageNo)).join('\n');

  if (!LIST_PATTERN.test(html)) {
    console.warn('⚠️  列表页缺少 <!-- Post List --> 标记，跳过列表更新');
    return null;
  }
  html = html.replace(LIST_PATTERN, `$1\n${cards}\n      $2`);

  const nav = renderStaticPagination(pageNo, totalPages);
  if (PAGINATION_PATTERN.test(html)) {
    html = html.replace(PAGINATION_PATTERN,
      `$1 data-total-pages="${totalPages}" data-static-page="${pageNo}">\n${nav}\n      </div>\n      $2`);
  } else {
    console.warn('⚠️  列表页缺少分页容器，跳过分页导航');
  }
  return { html, count: pagePosts.length };
}

/** 自指 canonical + rel=prev/next（先清掉上一轮插入的，保证幂等） */
function applyHeadLinks(html, pageNo) {
  const canonicalUrl = pageNo === 1 ? `${BASE_URL}/blog/` : `${BASE_URL}/blog/page-${pageNo}.html`;
  html = html.replace(/[ \t]*<link rel="(?:prev|next)" href="[^"]*">\n?/g, '');
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${canonicalUrl}$2`);

  const links = [];
  if (pageNo > 1) {
    const prevUrl = pageNo === 2 ? `${BASE_URL}/blog/` : `${BASE_URL}/blog/page-${pageNo - 1}.html`;
    links.push(`  <link rel="prev" href="${prevUrl}">`);
  }
  if (pageNo < totalPages) {
    links.push(`  <link rel="next" href="${BASE_URL}/blog/page-${pageNo + 1}.html">`);
  }
  if (links.length) {
    html = html.replace(/(<link rel="canonical" href="[^"]*">)/, `$1\n${links.join('\n')}`);
  }
  return html;
}

/** 第 2..N 页的标题/OG 元数据（canonical 已由 applyHeadLinks 处理） */
function applyPageMeta(html, pageNo) {
  if (pageNo === 1) return html;
  const title = `博客 第 ${pageNo} 页 | 张小猛 - loczb`;
  const url = `${BASE_URL}/blog/page-${pageNo}.html`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`);
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`);
  html = html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`);
  return html;
}

function rebuildBlogIndex() {
  if (!fs.existsSync(BLOG_INDEX)) {
    console.log('⚠️  blog/index.html 不存在，跳过');
    return;
  }
  let html = fs.readFileSync(BLOG_INDEX, 'utf-8');

  // 更新筛选按钮（分类筛选栏）
  const priorityOrder = ['AI', 'Android', 'Kotlin', '前端', '思考', 'DevOps', '数据库', '系统编程', '安全', '开发'];
  const allCategories = indexData.categories;
  const sortedCats = [...allCategories].sort((a, b) => {
    const ai = priorityOrder.indexOf(a), bi = priorityOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const filterButtons = `        <button class="filter-btn filter-btn-active" data-filter="all" role="tab" aria-selected="true">全部</button>\n` +
    sortedCats.map(c => `        <button class="filter-btn" data-filter="${escapeHtml(c)}" role="tab" aria-selected="false">${escapeHtml(c)}</button>`).join('\n');

  const filterPattern = /(<div class="blog-filters"[^>]*>)[\s\S]*?(<\/div>\s*<!-- Tag Cloud -->)/;
  if (filterPattern.test(html)) {
    html = html.replace(filterPattern, `$1\n${filterButtons}\n      $2`);
  }

  // 移除标签云（功能重复，分类筛选按钮已覆盖）
  const tagCloudPattern = /(<!-- Tag Cloud -->)[\s\S]*?(<!-- \/Tag Cloud -->)/;
  if (tagCloudPattern.test(html)) {
    html = html.replace(tagCloudPattern, `$1\n        <!-- 标签云已移除（分类筛选按钮已覆盖功能） -->\n      $2`);
  }

  // 数量同步：替换 <!-- POSTS_COUNT --> 锚点
  html = syncPostCount(html);

  // 第 1 页：就地重建列表 + 静态分页导航
  const page1 = applyPageContent(html, 1);
  if (!page1) return;
  let page1Html = applyHeadLinks(page1.html, 1);
  fs.writeFileSync(BLOG_INDEX, page1Html);

  // 第 2..N 页：由重建后的 index.html 派生（同目录，相对路径原样复用）
  const baseHtml = fs.readFileSync(BLOG_INDEX, 'utf-8');
  for (let n = 2; n <= totalPages; n++) {
    const page = applyPageContent(baseHtml, n);
    if (!page) break;
    const pageHtml = applyPageMeta(applyHeadLinks(page.html, n), n);
    fs.writeFileSync(path.join(BLOG_DIR, `page-${n}.html`), pageHtml);
  }

  // 清理过期分页（文章数变少时不留死页；page-1.html 非法，第 1 页永远是 index.html）
  let removed = 0;
  fs.readdirSync(BLOG_DIR).filter(f => /^page-\d+\.html$/.test(f)).forEach(f => {
    const n = parseInt(f.match(/^page-(\d+)\.html$/)[1], 10);
    if (n < 2 || n > totalPages) {
      fs.unlinkSync(path.join(BLOG_DIR, f));
      removed++;
      console.log(`🗑️  删除过期分页: blog/${f}`);
    }
  });

  console.log(`✅ 列表静态分页: ${listPosts.length} 篇 → ${totalPages} 页（blog/index.html + blog/page-2..${totalPages}.html），每页 ${POSTS_PER_PAGE} 篇${removed ? `，清理 ${removed} 个过期页` : ''}`);
  console.log(`✅ blog/index.html: 第 1 页 ${page1.count} 张卡, ${sortedCats.length} 个分类按钮`);
}

// ═══════════════════════════════════════════════
// Phase 4: 更新 index.html 首页
// ═══════════════════════════════════════════════

function rebuildHomePage() {
  if (!fs.existsSync(HOME_INDEX)) {
    console.log('⚠️  index.html 不存在，跳过');
    return;
  }
  let html = fs.readFileSync(HOME_INDEX, 'utf-8');

  if (posts.length === 0) {
    console.log('⚠️  没有文章，跳过首页更新');
    return;
  }

  const latest = posts[0];
  const tagsHtml = latest.tags.map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('\n            ');

  // 更新大卡 (featured post)
  const featured = `        <article class="blog-card-featured animate-on-scroll" id="home-featured-post" style="display: block;">
          <div class="blog-card-header">
            <div class="blog-card-meta">
              <span class="blog-date">${escapeHtml(latest.date)}</span>
              <span>·</span>
              <span class="blog-read-time">${latest.readTime} min</span>
            </div>
            <span class="blog-list-tag">${escapeHtml(latest.category)}</span>
          </div>
          <h3 class="blog-card-title">
            <a href="blog/posts/${latest.slug}.html">${escapeHtml(latest.title)}</a>
          </h3>
          <p class="blog-card-excerpt">${escapeHtml(latest.excerpt)}...</p>
          <div class="blog-card-tags">
            ${tagsHtml}
          </div>
        </article>`;

  const featuredPattern = /[ \t]*<article class="blog-card-featured animate-on-scroll" id="home-featured-post".*?<\/article>/s;
  html = html.replace(featuredPattern, featured);

  // 更新最新文章列表 (第2、3篇)
  const listArticles = posts.slice(1, 3);
  if (listArticles.length > 0) {
    const listItems = listArticles.map(p => {
      const tagsHtml = p.tags.slice(0, 3).map(t => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('\n            ');
      return `        <article class="blog-mini-card animate-on-scroll" data-category="${escapeHtml(p.category)}" data-page="1">
          <div class="blog-mini-card-header">
            <div class="blog-list-meta">
              <span class="blog-date">${escapeHtml(p.date)}</span>
              <span>·</span>
              <span class="blog-read-time">${p.readTime} min</span>
            </div>
            <span class="blog-list-tag">${escapeHtml(p.category)}</span>
          </div>
          <h3 class="blog-mini-card-title">
            <a href="blog/posts/${p.slug}.html">${escapeHtml(p.title)}</a>
          </h3>
          <p class="blog-mini-card-excerpt">${escapeHtml(p.excerpt)}</p>
          <div class="blog-mini-card-tags">
            ${tagsHtml}
          </div>
        </article>`;
    }).join('\n');

    const listBlockPattern = /(<!-- 最新文章列表 -->[\s\S]*?<div class="blog-list">)[\s\S]*?(<\/div>\s*<!-- \/最新文章列表 -->)/;
    if (listBlockPattern.test(html)) {
      html = html.replace(listBlockPattern, `$1\n${listItems}\n        $2`);
    } else {
      // fallback: replace blog-list div
      const blogListPattern = /(<div class="blog-list">)[\s\S]*?(<\/div>)/;
      html = html.replace(blogListPattern, `$1\n${listItems}\n        $2`);
    }
  }

  // 更新 JS posts 数组
  const topPosts = posts.slice(0, 10);
  const postsJsArray = '[\n' + topPosts.map(p => {
    const url = p.url.startsWith('blog/') ? p.url : 'blog/' + p.url;
    return `      {
        url: '${jsEscape(url)}',
        title: '${jsEscape(p.title)}',
        date: '${jsEscape(p.date)}',
        readTime: '${p.readTime} min',
        category: '${jsEscape(p.category)}',
        category2: '${jsEscape(p.category)}',
        desc: '${jsEscape(p.excerpt)}'
      }`;
  }).join(',\n') + '\n    ]';

  const postsArrayPattern = /const posts = \[[\s\S]*?\];/;
  html = html.replace(postsArrayPattern, 'const posts = ' + postsJsArray + ';');

  // 数量同步：替换 <!-- POSTS_COUNT --> 锚点
  html = syncPostCount(html);

  fs.writeFileSync(HOME_INDEX, html);
  console.log(`✅ index.html: featured="${latest.title}", list=${listArticles.length} posts, JS array=${topPosts.length} posts`);
}

// ═══════════════════════════════════════════════
// Phase 4.5: 文章页静态「相关文章」（构建期内联，替代运行时 related-posts.js）
// ═══════════════════════════════════════════════
//
// 旧方案让每个文章页加载 assets/js/related-posts.js（内嵌全站 110 篇的
// ARTICLE_INDEX，22KB raw），却只展示 4-6 条 —— 成本随「篇数 × 阅读量」线性放大。
// 现在改为构建期算好、直接写成静态 HTML（复用同一套 .related-posts 标记与 CSS），
// 文章页零额外请求；要更新推荐只需重跑本脚本。
//
// 相关度：共有 tag ×3 + 同 category ×1；同分用发布时间新的优先（dateTime 降序）。

const RELATED_TOP = 5;

function relatedScore(base, other) {
  const shared = other.tags.filter(t => base.tags.includes(t)).length;
  return shared * 3 + (base.category && base.category === other.category ? 1 : 0);
}

function relatedPostsFor(post) {
  return posts
    .filter(p => p.slug !== post.slug)
    .map(p => ({ p, score: relatedScore(post, p) }))
    .filter(x => x.score > 0)
    .sort((a, b) => (b.score - a.score) || (b.p._ts - a.p._ts) || (a.p.slug < b.p.slug ? -1 : 1))
    .slice(0, RELATED_TOP)
    .map(x => x.p);
}

function renderRelatedBlock(post) {
  const items = relatedPostsFor(post).map(r => `          <a class="related-post-card" href="${r.slug}.html">
            <div class="related-post-card-title">${escapeHtml(r.title)}</div>
            <div class="related-post-card-tags">${r.tags.slice(0, 3).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>
          </a>`).join('\n');
  return `        <div class="related-posts">
          <div class="related-posts-title">📌 相关文章</div>
          <div class="related-posts-list">
${items}
          </div>
        </div>`;
}

// 标记区间由模板提供（templates/blog-post-template.html），本阶段只替换区间内容，
// 不移动位置 —— 与 build-series 注入互相独立，重跑幂等。
const RELATED_PATTERN = /([ \t]*<!-- Related Static -->)[\s\S]*?([ \t]*<!-- \/Related Static -->)/;

function injectStaticRelated() {
  let written = 0, noMarker = 0, thin = 0;
  const relatedCount = {};

  posts.forEach(post => {
    const file = path.join(POSTS_DIR, post.slug + '.html');
    if (!fs.existsSync(file)) return;
    const html = fs.readFileSync(file, 'utf-8');
    if (!RELATED_PATTERN.test(html)) {
      noMarker++;
      console.warn(`⚠️  blog/posts/${post.slug}.html 缺少 <!-- Related Static --> 标记，跳过`);
      return;
    }
    const rel = relatedPostsFor(post);
    relatedCount[post.slug] = rel.length;
    if (rel.length < 3) thin++;
    const out = html.replace(RELATED_PATTERN, `$1\n${renderRelatedBlock(post)}\n\n$2`);
    if (out !== html) {
      fs.writeFileSync(file, out, 'utf-8');
      written++;
    }
  });

  console.log(`✅ 静态相关文章: ${posts.length} 篇处理，${written} 篇写入，每篇 top ${RELATED_TOP}（<3 条的 ${thin} 篇${noMarker ? `，缺标记跳过 ${noMarker} 篇` : ''}）`);
  return relatedCount;
}

// ═══════════════════════════════════════════════
// Phase 5: 生成 sitemap.xml
// ═══════════════════════════════════════════════
//
// 注意：分页页 page-N.html 刻意不进 sitemap —— 它们与第 1 页内容同源，收录只会
// 稀释抓取预算；靠每页的自指 canonical + rel=prev/next 让搜索引擎自己串联。

function generateSitemap() {
  let lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // 固定页面
  const staticPages = [
    { url: BASE_URL + '/', freq: 'weekly', priority: '1.0' },
    { url: BASE_URL + '/blog/', freq: 'daily', priority: '0.9' },
    { url: BASE_URL + '/projects/', freq: 'monthly', priority: '0.8' },
    { url: BASE_URL + '/about/', freq: 'monthly', priority: '0.7' },
  ];
  staticPages.forEach(p => {
    lines.push('  <url>');
    lines.push(`    <loc>${p.url}</loc>`);
    lines.push(`    <changefreq>${p.freq}</changefreq>`);
    lines.push(`    <priority>${p.priority}</priority>`);
    lines.push('  </url>');
  });

  // 文章页面 - lastmod 使用文章发布日期（meta 中的 date），
  // 不再取 fs mtime：旧逻辑下 build-series 每次重写文章文件就把 mtime 刷成
  // 「脚本运行日」，导致 106 条 lastmod 挤在同一天，污染搜索引擎信任。
  posts.forEach(p => {
    const filename = p.slug + '.html';
    let lastmod = p.date; // 发布日期（YYYY-MM-DD）
    lines.push('  <url>');
    lines.push(`    <loc>${BASE_URL}/blog/posts/${p.slug}.html</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push('    <changefreq>monthly</changefreq>');
    lines.push('    <priority>0.6</priority>');
    lines.push('  </url>');
  });

  lines.push('</urlset>');
  fs.writeFileSync(SITEMAP_XML, lines.join('\n') + '\n');
  console.log(`✅ sitemap.xml: ${posts.length} articles`);
}

// ═══════════════════════════════════════════════
// Phase 6: 生成 rss.xml
// ═══════════════════════════════════════════════

function generateRSS() {
  const rssPosts = posts.slice(0, 20);
  let lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">');
  lines.push('  <channel>');
  lines.push('    <title>张小猛 - loczb 技术博客</title>');
  lines.push(`    <link>${BASE_URL}/blog/</link>`);
  lines.push('    <description>张小猛的技术博客 - Android、Kotlin、AI、全栈开发</description>');
  lines.push('    <language>zh-CN</language>');
  lines.push(`    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`);

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  rssPosts.forEach(p => {
    let rssDate = p.date;
    try {
      const [y, m, d] = p.date.split('-').map(Number);
      const localDate = new Date(y, m - 1, d);
      rssDate = `${DAYS[localDate.getDay()]}, ${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y} 00:00:00 +0800`;
    } catch (e) { /* use raw date */ }

    lines.push('    <item>');
    lines.push(`      <title>${xmlEscape(p.title)}</title>`);
    lines.push(`      <link>${BASE_URL}/blog/posts/${p.slug}.html</link>`);
    lines.push(`      <guid isPermaLink="true">${BASE_URL}/blog/posts/${p.slug}.html</guid>`);
    lines.push(`      <description>${xmlEscape(p.excerpt)}</description>`);
    lines.push(`      <category>${xmlEscape(p.category)}</category>`);
    lines.push(`      <pubDate>${rssDate}</pubDate>`);
    lines.push('    </item>');
  });

  lines.push('  </channel>');
  lines.push('</rss>');
  fs.writeFileSync(RSS_XML, lines.join('\n') + '\n');
  console.log(`✅ rss.xml: ${rssPosts.length} articles`);
}

// ═══════════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════════

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jsEscape(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function updateServiceWorker() {
  const SW_PATH = path.join(CWD, 'sw.js');
  if (!fs.existsSync(SW_PATH)) return;
  const swCode = fs.readFileSync(SW_PATH, 'utf-8');
  // 内容驱动版本号：以关键产物（文章索引 JSON）的哈希为版本，
  // 内容不变则 sw.js 不落盘（幂等）。取代旧的「当前时间戳后4位」——
  // 时间戳版本导致每次重建 sw.js 必 dirty，重跑产生无意义 diff。
  const crypto = require('crypto');
  let digest = 'empty';
  try {
    digest = crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(CWD, 'blog', 'articles-index.json')))
      .digest('hex').slice(0, 8);
  } catch (e) { /* 索引缺失时退回 stable 标记 */ }
  const newSwVersion = `c-${digest}`;
  if (swCode.includes(`const SW_VERSION = '${newSwVersion}';`)) {
    console.log(`✅ sw.js: cache version unchanged (${newSwVersion}), skip write`);
    return;
  }
  const updated = swCode.replace(/const SW_VERSION = '[^']+';/, `const SW_VERSION = '${newSwVersion}';`);
  if (updated !== swCode) {
    fs.writeFileSync(SW_PATH, updated, 'utf-8');
    console.log(`✅ sw.js: updated cache version to ${newSwVersion}`);
  }
}

function buildSeries() {
  const seriesScript = path.join(__dirname, 'build-series.js');
  if (fs.existsSync(seriesScript)) {
    try {
      require('child_process').execSync(`node "${seriesScript}"`, { stdio: 'inherit' });
    } catch (e) {
      console.error('构建专栏失败:', e);
    }
  }
}

// ═══════════════════════════════════════════════
// Execute all phases
// ═══════════════════════════════════════════════

console.log('\n🔨 CI 全量索引重建开始...\n');

buildSeries();
rebuildBlogIndex();
rebuildHomePage();
injectStaticRelated();
generateSitemap();
generateRSS();
updateServiceWorker();

console.log('\n🎉 完成！');
