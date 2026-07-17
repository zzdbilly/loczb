#!/bin/bash
set -e

echo "🚀 开始部署 loczb 评论系统..."
echo ""

# 加载 Cloudflare API Token
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ 未设置 CLOUDFLARE_API_TOKEN"
  echo "   请在 .env 文件中写入: CLOUDFLARE_API_TOKEN=your_token_here"
  exit 1
fi

# 1. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 2. 创建 D1 数据库（如果已存在则跳过）
echo "🗄️  检查 D1 数据库..."
D1_LIST=$(npx wrangler d1 list 2>&1)
if echo "$D1_LIST" | grep -q "loczb-comments"; then
  echo "✅ D1 数据库 loczb-comments 已存在"
else
  echo "  创建 D1 数据库..."
  npx wrangler d1 create loczb-comments
fi

# 3. 初始化数据库表
echo "📋 初始化数据库表..."
npx wrangler d1 execute loczb-comments --remote --file=schema.sql

# 4. 部署 Worker
echo "🌐 部署 Worker..."
npx wrangler deploy

echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "Worker URL: https://loczb-comments.billycust716.workers.dev"
echo "========================================="

# deploy script for remote execution
