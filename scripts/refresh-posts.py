#!/usr/bin/env python3
"""
已弃用 (Deprecated) 代理脚本:
自 P3 阶段起，全站文章的唯一真相源已统一归档至 blog/posts-src/*.md。
全量重新编译/回刷请统一运行：
  npm run build:posts  # 或 python3 scripts/build-posts.py
本历史脚本（从 HTML 正则反解回刷）已归档至 scripts/archive/refresh-posts.py。
为保持兼容性，本脚本自动转发至 scripts/build-posts.py。
"""

import sys
import os
import subprocess

print("ℹ️  [DEPRECATED] scripts/refresh-posts.py 已弃用。")
print("ℹ️  文章唯一真相源为 blog/posts-src/*.md，正在自动转调 scripts/build-posts.py ...\n")

proj_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cmd = [sys.executable, os.path.join(proj_root, 'scripts', 'build-posts.py')] + sys.argv[1:]
res = subprocess.run(cmd)
sys.exit(res.returncode)
