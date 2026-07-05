/**
 * CI 用的全量索引重建脚本
 * 生成：articles-index.json, blog/index.html, index.html, sitemap.xml, rss.xml
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
const posts = files.map(file => {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');

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

  const slug = file.replace('.html', '');

  return {
    slug,
    title,
    date,
    dateTime,
    category,
    tags,
    excerpt,
    readTime,
    url: `blog/posts/${file}`
  };
});

// 从 blog/index.html 获取已有的 category 映射
let blogIndexContent = '';
if (fs.existsSync(BLOG_INDEX)) {
  blogIndexContent = fs.readFileSync(BLOG_INDEX, 'utf-8');
}
const categoryMap = {};
const articleRegex = /<article[^>]*class="blog-list-item[^"]*"[^>]*data-category="([^"]+)"[^>]*>[\s\S]*?href="posts\/([^"]+\.html)"[\s\S]*?<\/article>/g;
let match;
while ((match = articleRegex.exec(blogIndexContent)) !== null) {
  categoryMap[match[2]] = match[1];
}
posts.forEach(p => {
  const filename = p.slug + '.html';
  if (!p.category && categoryMap[filename]) {
    p.category = categoryMap[filename];
  }
  if (!p.category) p.category = '技术';
});

// 排序：按日期时间降序（同日的文章按精确时间排，新写的排前面）
posts.sort((a, b) => {
  const aTime = a.dateTime || a.date + ' 00:00:00';
  const bTime = b.dateTime || b.date + ' 00:00:00';
  return new Date(bTime) - new Date(aTime);
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

const tagCloud = Object.entries(tagCounts)
  .map(([tag, count]) => ({ tag, count }))
  .sort((a, b) => b.count - a.count);

const archives = {};
posts.forEach(post => {
  const month = post.date.substring(0, 7);
  if (!archives[month]) archives[month] = [];
  archives[month].push({ title: post.title, date: post.date, url: post.url });
});
const archiveList = Object.entries(archives)
  .map(([month, items]) => ({ month, count: items.length, posts: items }))
  .sort((a, b) => b.month.localeCompare(a.month));

// Series 功能已移除

const indexData = {
  posts: posts.map(p => ({ slug: p.slug, title: p.title, date: p.date, category: p.category, tags: p.tags, excerpt: p.excerpt, url: p.url })),
  tagCloud,
  archives: archiveList,
  categories: [...new Set(posts.map(p => p.category))],
  stats: { totalPosts: posts.length, totalTags: Object.keys(tagCounts).length, latestDate: posts[0]?.date || '', oldestDate: posts[posts.length - 1]?.date || '' }
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(indexData, null, 2));
console.log(`✅ articles-index.json: ${indexData.stats.totalPosts} posts, ${indexData.stats.totalTags} tags, ${archiveList.length} months`);

// ═══════════════════════════════════════════════
// Phase 3: 重建 blog/index.html 列表
// ═══════════════════════════════════════════════

function rebuildBlogIndex() {
  if (!fs.existsSync(BLOG_INDEX)) {
    console.log('⚠️  blog/index.html 不存在，跳过');
    return;
  }
  let html = fs.readFileSync(BLOG_INDEX, 'utf-8');

  // 生成所有文章项 HTML
  const articleItems = [...posts]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(p => {
    const tagsForArticle = p.tags;
    const dateStr = p.date;
    // data-tags 用逗号分隔（避免多词标签被空格误拆）
    const dataTags = tagsForArticle.map(t => escapeHtml(t)).join(',');
    return `        <article class="blog-list-item animate-on-scroll" data-category="${escapeHtml(p.category)}" data-tags="${dataTags}" data-page="1">
          <div class="blog-list-header">
            <div class="blog-list-meta">
              <span class="blog-date">${escapeHtml(dateStr)}</span>
              <span>·</span>
              <span class="blog-read-time">${p.readTime} min</span>
            </div>
            <span class="blog-list-tag">${escapeHtml(p.category)}</span>
          </div>
          <h3 class="blog-list-title">
            <a href="posts/${p.slug}.html">${escapeHtml(p.title)}</a>
          </h3>
          <p class="blog-list-excerpt">${escapeHtml(p.excerpt)}</p>
        </article>`;
  }).join('\n');

  // 替换 <!-- Post List --> 到 <!-- /Post List --> 之间的内容
  const listPattern = /(<!-- Post List -->)[\s\S]*?(<!-- \/Post List -->)/;
  if (!listPattern.test(html)) {
    console.warn('⚠️  blog/index.html: 缺少 <!-- Post List --> 或 <!-- /Post List --> 标记，跳过列表更新');
    return;
  }
  const replacement = `$1\n${articleItems}\n      $2`;
  html = html.replace(listPattern, replacement);

  // 更新筛选按钮
  const priorityOrder = ['AI', 'Android', 'Kotlin', '前端', '思考', 'DevOps', '数据库', '系统编程', '安全', '开发'];
  const allCategories = indexData.categories;
  const sortedCats = [...allCategories].sort((a, b) => {
    const ai = priorityOrder.indexOf(a), bi = priorityOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const filterButtons = `        <button class="filter-btn filter-btn-active" data-filter="all" role="tab" aria-selected="true">全部</button>\n` +
    sortedCats.map(c => `        <button class="filter-btn" data-filter="${escapeHtml(c)}" role="tab" aria-selected="false">${escapeHtml(c)}</button>`).join('\n');

  const filterPattern = /(<div class="blog-filters"[^>]*>)[\s\S]*?(<\/div>\s*<!-- Search Bar -->)/;
  html = html.replace(filterPattern, `$1\n${filterButtons}\n      $2`);

  // 移除标签云（功能重复，分类筛选按钮已覆盖）
  const tagCloudPattern = /(<!-- Tag Cloud -->)[\s\S]*?(<!-- \/Tag Cloud -->)/;
  if (tagCloudPattern.test(html)) {
    html = html.replace(tagCloudPattern, `$1\n        <!-- 标签云已移除（分类筛选按钮已覆盖功能） -->\n      $2`);
  }

  fs.writeFileSync(BLOG_INDEX, html);
  console.log(`✅ blog/index.html: ${posts.length} articles, ${sortedCats.length} categories`);
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

  const featuredPattern = /<article class="blog-card-featured animate-on-scroll" id="home-featured-post".*?<\/article>/s;
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

  fs.writeFileSync(HOME_INDEX, html);
  console.log(`✅ index.html: featured="${latest.title}", list=${listArticles.length} posts, JS array=${topPosts.length} posts`);
}

// ═══════════════════════════════════════════════
// Phase 5: 生成 sitemap.xml
// ═══════════════════════════════════════════════

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

  // 文章页面
  posts.forEach(p => {
    lines.push('  <url>');
    lines.push(`    <loc>${BASE_URL}/blog/posts/${p.slug}.html</loc>`);
    if (p.date) lines.push(`    <lastmod>${p.date}</lastmod>`);
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

// ═══════════════════════════════════════════════
// Execute all phases
// ═══════════════════════════════════════════════

console.log('\n🔨 CI 全量索引重建开始...\n');

rebuildBlogIndex();
rebuildHomePage();
generateSitemap();
generateRSS();

console.log('\n🎉 完成！');
