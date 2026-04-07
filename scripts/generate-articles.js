/**
 * 自动生成 articles.json
 * 扫描 blog/posts/ 目录下所有 HTML 文件，提取 meta 信息
 */

const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '../blog/posts');
const outputFile = path.join(__dirname, '../blog/articles.json');

const articles = [];

// 扫描所有 HTML 文件
const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 提取 meta 信息
  const meta = {
    url: `posts/${file}`,
    title: extractMeta(content, 'og:title') || extractMeta(content, 'title') || file.replace('.html', ''),
    date: extractMeta(content, 'publish-date'),
    readTime: extractMeta(content, 'description')?.match(/(\d+)\s*分钟/) ? `${extractMeta(content, 'description').match(/(\d+)\s*分钟/)[1]} min` : '10 min',
    category: extractMeta(content, 'keywords')?.split(',')[0]?.trim() || '其他',
    excerpt: extractMeta(content, 'description') || '',
    tags: extractMeta(content, 'keywords')?.split(',').map(t => t.trim()).filter(t => t) || []
  };
  
  if (meta.date) {
    articles.push(meta);
  }
});

// 按日期降序排序
articles.sort((a, b) => new Date(b.date) - new Date(a.date));

// 写入文件
fs.writeFileSync(outputFile, JSON.stringify(articles, null, 2));
console.log(`✅ 生成 ${articles.length} 篇文章索引`);

function extractMeta(content, key) {
  // 尝试 <meta name="key" content="...">
  let match = content.match(new RegExp(`<meta\\s+name=["']${key}["']\\s+content=["']([^"']+)["']`, 'i'));
  if (match) return match[1];
  
  // 尝试 <meta property="og:key" content="...">
  match = content.match(new RegExp(`<meta\\s+property=["']og:${key}["']\\s+content=["']([^"']+)["']`, 'i'));
  if (match) return match[1];
  
  // 尝试 <title>...</title>
  if (key === 'title') {
    match = content.match(/<title>([^<]+)<\/title>/i);
    if (match) return match[1].replace(/\s*\|\s*loczb/, '');
  }
  
  return null;
}
