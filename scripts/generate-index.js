/**
 * Generate blog index data for search and tags
 * Run: node scripts/generate-index.js
 * 
 * Reads from blog/posts/*.html for tags/excerpt
 * Reads from blog/index.html for categories (data-category)
 * 
 * 支持的格式:
 * - 日期: <span>📅 2026-06-28</span>
 * - 标签: <span class="tag">Android</span>
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '..', 'blog', 'posts');
const INDEX_FILE = path.join(__dirname, '..', 'blog', 'index.html');
const OUTPUT_FILE = path.join(__dirname, '..', 'blog', 'articles-index.json');

// Get all HTML files in posts directory
const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.html'));

// Read index.html to get category mapping
const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');

// Parse category from each article link in index.html
// Pattern: data-category="X" in the blog-list-item article
const categoryMap = {};
const articleRegex = /<article[^>]*class="blog-list-item[^"]*"[^>]*data-category="([^"]+)"[^>]*>[\s\S]*?href="posts\/([^"]+\.html)"[\s\S]*?<\/article>/g;
let match;
while ((match = articleRegex.exec(indexContent)) !== null) {
  const category = match[1];
  const filename = match[2];
  categoryMap[filename] = category;
}

const posts = files.map(file => {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
  
  // Extract title (remove site suffix)
  const titleMatch = content.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(/ \| 张小猛 - loczb$/, '') : '';
  
  // Extract date from <span>📅 YYYY-MM-DD</span>
  const dateMatch = content.match(/<span>📅 (\d{4}-\d{1,2}-\d{1,2})<\/span>/);
  // 标准化日期格式，补齐前导零
  let date = dateMatch ? dateMatch[1] : '';
  if (date) {
    const parts = date.split('-');
    if (parts.length === 3) {
      date = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  
  // Extract description/excerpt
  const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
  const excerpt = descMatch ? descMatch[1] : '';
  
  // Extract tags from <span class="tag"> format
  const tagMatches = content.match(/<span class="tag">([^<]+)<\/span>/g);
  let tags = [];
  if (tagMatches) {
    tags = tagMatches.map(t => t.replace(/<[^>]*>/g, ''));
  }
  
  // Fallback: extract from tech-tag spans (old format)
  if (tags.length === 0) {
    const oldTags = content.match(/<span class="tech-tag"[^>]*>([^<]+)<\/span>/g);
    tags = oldTags ? oldTags.map(t => t.replace(/<[^>]*>/g, '')) : [];
  }
  
  // Get category from index.html mapping, fallback to '技术'
  const category = categoryMap[file] || '技术';
  
  // Generate slug from filename
  const slug = file.replace('.html', '');
  
  // Use existing timestamp if available, otherwise use extracted date
  const finalDate = existingTimestamps[slug] || date;
  
  return {
    slug,
    title,
    date: finalDate,
    category,
    tags,
    excerpt,
    url: `blog/posts/${file}`
  };
});

// Sort by date descending
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

// Load existing JSON to preserve timestamps if they exist
let existingData = {};
try {
  if (fs.existsSync(OUTPUT_FILE)) {
    existingData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  }
} catch (e) {}

// Create a map of slug -> existing timestamp
const existingTimestamps = {};
if (existingData.posts) {
  existingData.posts.forEach(p => {
    if (p.date && p.date.includes(':')) {
      existingTimestamps[p.slug] = p.date;
    }
  });
}

// Generate tag cloud with counts
const tagCounts = {};
posts.forEach(post => {
  post.tags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
});

const tagCloud = Object.entries(tagCounts)
  .map(([tag, count]) => ({ tag, count }))
  .sort((a, b) => b.count - a.count);

// Generate archives (group by month)
const archives = {};
posts.forEach(post => {
  const month = post.date.substring(0, 7); // YYYY-MM
  if (!archives[month]) {
    archives[month] = [];
  }
  archives[month].push({
    title: post.title,
    date: post.date,
    url: post.url
  });
});

const archiveList = Object.entries(archives)
  .map(([month, items]) => ({
    month,
    count: items.length,
    posts: items.sort((a, b) => b.date.localeCompare(a.date))
  }))
  .sort((a, b) => b.month.localeCompare(a.month));

// Output
const data = {
  posts,
  tagCloud,
  archives: archiveList,
  categories: [...new Set(posts.map(p => p.category))],
  stats: {
    totalPosts: posts.length,
    totalTags: Object.keys(tagCounts).length,
    latestDate: posts[0]?.date || '',
    oldestDate: posts[posts.length - 1]?.date || ''
  }
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
console.log(`Generated ${OUTPUT_FILE}`);
console.log(`- ${data.stats.totalPosts} posts`);
console.log(`- ${data.stats.totalTags} unique tags`);
console.log(`- ${archiveList.length} archive months`);