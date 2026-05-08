#!/usr/bin/env python3
"""
为博客文章添加 SEO 元信息
"""

import os
import re
from pathlib import Path

BASE_URL = "https://709527.xyz"
POSTS_DIR = Path("blog/posts")

def extract_meta(content, tag):
    """提取 meta 标签内容"""
    pattern = rf'<meta name="{tag}" content="([^"]*)"'
    match = re.search(pattern, content)
    return match.group(1) if match else None

def extract_title(content):
    """提取 title 标签内容"""
    match = re.search(r'<title>(.*?)</title>', content)
    return match.group(1) if match else None

def add_seo(filepath):
    """为文章添加 SEO 标签"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已有 og:type
    if 'og:type' in content:
        print(f"⏭️  Skipping {filepath.name} (SEO already exists)")
        return
    
    # 提取信息
    title = extract_title(content) or "张小猛的技术博客"
    description = extract_meta(content, 'description') or title
    pubdate = extract_meta(content, 'publish-date') or "2026-01-01"
    
    filename = filepath.stem
    
    # SEO 标签
    seo_block = f'''
  <!-- SEO Meta -->
  <link rel="canonical" href="{BASE_URL}/blog/posts/{filename}.html">
  <meta name="robots" content="index, follow">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="{BASE_URL}/blog/posts/{filename}.html">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:image" content="{BASE_URL}/assets/images/og-image.png">
  <meta property="og:locale" content="zh_CN">
  <meta property="article:author" content="张小猛">
  <meta property="article:published_time" content="{pubdate}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{BASE_URL}/assets/images/og-image.png">
'''
    
    # 在 </title> 后插入
    new_content = content.replace('</title>', '</title>' + seo_block)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Added SEO to {filepath.name}")

def main():
    os.chdir(Path(__file__).parent.parent)  # 切换到项目根目录
    
    for filepath in sorted(POSTS_DIR.glob("*.html")):
        add_seo(filepath)
    
    print("\nDone! All blog posts now have SEO meta tags.")

if __name__ == "__main__":
    main()
