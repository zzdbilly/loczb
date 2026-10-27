#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""pre-commit 产物一致性检查

拦住「源改了、产物没重新编译或没 add」的提交 —— 这正是 GitHub Actions 里
"Ensure generated artifacts match committed files" 那一步在查的东西。

CI 的做法是 build → git add -A → git diff --cached --exit-code。
钩子里不能去动暂存区，所以换成等价且更安全的判据：
  构建一次 → 看「暂存区 vs 工作区」在产物路径上还有没有差异。
  有差异 = 这些产物没进本次提交 = 推上去 CI 必红。

只读暂存区、只跑构建，不修改 index、不自动 add、不回滚工作区。
"""

import os
import subprocess
import sys

# 命中这些路径的改动才值得跑一次构建（否则纯文档提交直接放行，保持快）
TRIGGERS = (
    "blog/posts-src/", "blog/", "templates/", "assets/css/",
    "index.html", "rss.xml", "sitemap.xml", "about/", "projects/",
    "404.html", "offline.html", "sw.js",
)

# 构建会重写的产物（漏 add 的高发区，按历史频率排序：rss > sitemap > index）
PRODUCTS = [
    "blog/posts", "blog/meta", "blog/articles-index.json", "blog/index.html",
    "index.html", "rss.xml", "sitemap.xml", "about", "projects",
    "404.html", "offline.html", "sw.js",
]


def git(repo, *args):
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True)


def main():
    top = git(os.getcwd(), "rev-parse", "--show-toplevel")
    if top.returncode != 0:
        return 0
    repo = top.stdout.strip()

    staged = [p for p in git(repo, "diff", "--cached", "--name-only", "-z").stdout.split("\0") if p]
    if not staged:
        return 0                                    # 空提交（--allow-empty）放行
    if not any(p.startswith(TRIGGERS) for p in staged):
        return 0                                    # 与站点产物无关的提交，不跑构建

    py = os.path.join(repo, ".venv", "bin", "python3")
    if not os.path.exists(py):
        print("⚠️  pre-commit: 没找到 .venv，跳过产物一致性检查（CI 仍会查）")
        return 0

    build = subprocess.run([py, "scripts/build-posts.py"], cwd=repo, capture_output=True, text=True)
    if build.returncode != 0:
        print("❌ pre-commit: 构建失败，提交已阻断")
        tail = (build.stdout + build.stderr).strip()[-1000:]
        if tail:
            print(tail)
        return 1

    # 工作区 vs 暂存区：构建刚重写过、但没被 add 的产物
    dirty = [p for p in git(repo, "diff", "--name-only", "--", *PRODUCTS).stdout.split("\n") if p]

    if dirty:
        print("❌ pre-commit: 这些产物已被重新生成，但没进本次提交 —— 推上去 CI 会红")
        for p in dirty[:20]:
            print("   ", p)
        if len(dirty) > 20:
            print("    … 以及另外 %d 个" % (len(dirty) - 20))
        print("\n修复：git add -- <上面这些文件>，然后重新 commit")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
