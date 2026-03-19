#!/bin/bash
# quick-fix.sh - loczb 网站 P0 问题快速修复脚本
# 执行时间：约 1 分钟

set -e

PROJECT_DIR="/root/.openclaw/workspace-xiaoma/nook/loczb"
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