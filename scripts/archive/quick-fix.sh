#!/bin/bash
# [已归档 · 禁止无脑重跑] quick-fix.sh - loczb 网站 P0 问题快速修复脚本
# 执行时间：约 1 分钟
#
# 2026-09-27 归档原因：一次性历史脚本（P0 链接修复已全量落地，实测全站已无
# github.com/billyzl 残留）。它对**整个仓库所有 *.html** 做无备份的全局 `sed -i`，
# 目标串一旦变化就会静默改坏文件，因此不再作为可反复执行的工具保留。
# 确需复用请先 git commit 干净基线并核对 sed 目标。

set -e

if [ "$1" != "--force-run" ]; then
  echo "⛔ quick-fix.sh 已归档停用（无备份的全站 sed -i，属一次性历史脚本）。"
  echo "   确认要跑请显式传 --force-run，并先 commit 干净基线。"
  exit 1
fi

PROJECT_DIR="/root/.hermes/workspaces/xiaoma/nook/loczb"
cd "$PROJECT_DIR"

echo "🔧 开始修复 P0 问题..."
echo ""

# 1. 修复 GitHub 链接（billyzl → zzdbilly）
echo "📝 修复 GitHub 链接..."
find . -name "*.html" -exec sed -i 's|github\.com/billyzl|github.com/zzdbilly|g' {} \;
echo "   ✅ GitHub 链接已修复"

# 2. 修复项目外链（旧域名 → 709527.xyz）
echo "📝 修复项目外链..."
find . -name "*.html" -exec sed -i 's|https://zzdbilly\.github\.io/loczb/|https://709527.xyz|g' {} \;
echo "   ✅ 项目外链已修复"

# 3. 修复 OG URL（首页）
echo "📝 修复 Open Graph URL..."
sed -i 's|https://billyzl\.github\.io/loczb/|https://709527.xyz|g' index.html

# 4. 修复 OG URL（博客文章）
find blog/posts -name "*.html" -exec sed -i 's|https://zzdbilly\.github\.io/loczb/|https://709527.xyz/|g' {} \;
echo "   ✅ Open Graph URL 已修复"

echo ""
echo "✅ P0 链接问题修复完成！"
echo ""
echo "⚠️  以下问题需要手动处理："
echo "   1. 博客分类过滤功能 - 需要修改 main.js（见 OPTIMIZATION_PLAN.md）"
echo "   2. aria-label 属性 - 需要逐个添加到外链按钮"
echo "   3. 对比度问题 - 需要修改 CSS 变量"
echo ""
echo "📖 详细方案请查看: OPTIMIZATION_PLAN.md"