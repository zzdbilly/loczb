#!/usr/bin/env python3
"""
为所有已存在的博客文章注入评论组件
在 </body> 标签前插入 comment-widget.js 引用
"""
import os
import re
import glob

POSTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'blog', 'posts')
COMMENT_SCRIPT_TAG = '  <!-- Comment System -->\n  <script src="../../workers/comment-system/comment-widget.js"></script>\n'

def inject_comments(filepath):
    """在 </body> 前注入评论组件脚本"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否已注入
    if 'comment-widget.js' in content:
        return False
    
    # 在 </body> 前插入
    pattern = r'(</body>)'
    match = re.search(pattern, content)
    if not match:
        print(f"  ⚠️ 未找到 </body> 标签: {os.path.basename(filepath)}")
        return False
    
    content = content.replace('</body>', COMMENT_SCRIPT_TAG + '</body>')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def main():
    posts = glob.glob(os.path.join(POSTS_DIR, '*.html'))
    print(f"找到 {len(posts)} 篇文章")
    
    updated = 0
    skipped = 0
    for post in sorted(posts):
        name = os.path.basename(post)
        if inject_comments(post):
            print(f"  ✅ 已注入: {name}")
            updated += 1
        else:
            skipped += 1
    
    print(f"\n完成: 注入 {updated} 篇，跳过 {skipped} 篇")

if __name__ == '__main__':
    main()
