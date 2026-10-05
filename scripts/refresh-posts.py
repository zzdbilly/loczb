#!/usr/bin/env python3
"""
已弃用 (Deprecated) 代理脚本:
自 P3 阶段起，全站文章的唯一真相源已统一归档至 blog/posts-src/*.md。
全量重新编译/回刷请统一运行：
  npm run build:posts  # 或 python3 scripts/build-posts.py
本历史脚本（从 HTML 正则反解回刷）已归档至 scripts/archive/refresh-posts.py。
为保持兼容性，本脚本自动转发至 scripts/build-posts.py。

参数校验复用 build-posts.py 的 parse_args()（单一真相源）：白名单外的参数
（如旧的 --post）一律报错 exit(1)，不再静默转成全量重编译。
"""

import sys
import os
import subprocess
import importlib.util

proj_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 单一真相源：加载 build-posts.py 复用同一份参数白名单校验逻辑
_spec = importlib.util.spec_from_file_location(
    "build_posts", os.path.join(proj_root, 'scripts', 'build-posts.py'))
build_posts = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(build_posts)

args = sys.argv[1:]

print("ℹ️  [DEPRECATED] scripts/refresh-posts.py 已弃用。")
print("ℹ️  文章唯一真相源为 blog/posts-src/*.md，正在自动转调 scripts/build-posts.py ...\n")

# 旧参数 --post 明确弃用（单篇改用 --slug），不再静默转成全量重编译
if '--post' in args:
    print("❌ 参数 --post 已弃用，单篇请用 --slug。")
    print("   例如: python3 scripts/refresh-posts.py --slug <slug>")
    sys.exit(1)

# 其余未知参数由 build-posts.parse_args 统一报错并 exit(1)
build_posts.parse_args(args)

cmd = [sys.executable, os.path.join(proj_root, 'scripts', 'build-posts.py')] + args
res = subprocess.run(cmd)
sys.exit(res.returncode)
