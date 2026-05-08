#!/bin/bash

# 为博客文章添加 SEO 元信息
# 使用方法: bash scripts/add-seo-to-posts.sh

POSTS_DIR="blog/posts"
BASE_URL="https://709527.xyz"

for post in $POSTS_DIR/*.html; do
  filename=$(basename "$post" .html)
  
  # 提取 title
  title=$(grep -oP '(?<=<title>).*?(?=</title>)' "$post" | head -1)
  
  # 提取 description
  description=$(grep -oP '(?<=<meta name="description" content=").*?(?=">)' "$post" | head -1)
  
  # 提取 publish-date
  pubdate=$(grep -oP '(?<=<meta name="publish-date" content=").*?(?=">)' "$post" | head -1)
  
  # 如果没有 description，用 title 生成
  if [ -z "$description" ]; then
    description="$title - 张小猛的技术博客"
  fi
  
  # 检查是否已有 og:type
  if grep -q 'og:type' "$post"; then
    echo "⏭️  Skipping $filename (SEO already exists)"
    continue
  fi
  
  # 在 <title> 之后插入 SEO 标签
  seo_block="
  <!-- SEO Meta -->
  <link rel=\"canonical\" href=\"$BASE_URL/blog/posts/$filename.html\">
  <meta name=\"robots\" content=\"index, follow\">
  
  <!-- Open Graph -->
  <meta property=\"og:type\" content=\"article\">
  <meta property=\"og:url\" content=\"$BASE_URL/blog/posts/$filename.html\">
  <meta property=\"og:title\" content=\"$title\">
  <meta property=\"og:description\" content=\"$description\">
  <meta property=\"og:image\" content=\"$BASE_URL/assets/images/og-image.png\">
  <meta property=\"og:locale\" content=\"zh_CN\">
  <meta property=\"article:author\" content=\"张小猛\">
  <meta property=\"article:published_time\" content=\"$pubdate\">
  
  <!-- Twitter Card -->
  <meta name=\"twitter:card\" content=\"summary_large_image\">
  <meta name=\"twitter:title\" content=\"$title\">
  <meta name=\"twitter:description\" content=\"$description\">
  <meta name=\"twitter:image\" content=\"$BASE_URL/assets/images/og-image.png\">
"
  
  # 在 </title> 后插入
  sed -i "s|</title>|</title>$seo_block|" "$post"
  
  echo "✅ Added SEO to $filename"
done

echo ""
echo "Done! All blog posts now have SEO meta tags."
