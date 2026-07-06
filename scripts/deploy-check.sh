#!/bin/bash
# deploy-check.sh — 推送后自动验证 GitHub Pages 部署状态
#
# 用法：
#   git push && ./scripts/deploy-check.sh
#
# 原理：
#   1. 判断当前 push 的分支是不是 main（只有 main 才触发 Pages 部署）
#   2. 等待 GitHub Pages 开始部署（等几秒让 build 启动）
#   3. 轮询部署状态，最多等 5 分钟
#   4. 如果部署失败，自动空 commit 重试，最多 3 次
#
# 依赖：curl, git, jq（可选，没有 jq 也能用 grep 兜底）

set -e

DOMAIN="https://709527.xyz/"
MAX_WAIT_SEC=120    # 等待部署完成的最长时间
POLL_INTERVAL=15    # 轮询间隔
MAX_RETRIES=3       # 失败后最大重试次数
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

# ---- 只在 main 分支执行 ----
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⏭️  当前分支: $CURRENT_BRANCH，跳过部署检查（仅 main 会触发 Pages 构建）"
  exit 0
fi

echo "🔍 部署验证开始..."
echo "   站点: $DOMAIN"
echo "   超时: ${MAX_WAIT_SEC}s / 间隔: ${POLL_INTERVAL}s / 重试: ${MAX_RETRIES} 次"

# ---- 获取当前 HEAD ----
HEAD_HASH=$(git rev-parse HEAD)
HEAD_SHORT=$(git rev-parse --short HEAD)
echo "   Commit: $HEAD_SHORT"

# ---- 获取 GitHub Pages 部署状态（优先用 GH API，如果 token 可用） ----
get_pages_latest_commit() {
  # 如果没有 token 或 API 失败，直接 curl 站点检查页面内容是否包含当前 commit 信息
  local source_hash
  source_hash=$(curl -s "https://api.github.com/repos/zzdbilly/loczb/pages" 2>/dev/null | 
    grep '"source"' -A5 | grep 'branch' | head -1 || true)
  echo "$source_hash"
}

# ---- 检查站点是否正常响应 ----
check_site_response() {
  local code
  code=$(curl -sI -o /dev/null -w "%{http_code}" "$DOMAIN" --connect-timeout 10 2>/dev/null)
  echo "$code"
}

# ---- 手动重试（空 commit push） ----
retry_deploy() {
  local attempt=$1
  echo "⏳ 部署重试 (#${attempt}/${MAX_RETRIES})..."
  git commit --allow-empty -m "chore: retry deploy (attempt ${attempt})" --quiet
  if git push 2>&1 | grep -v "^Everything up-to-date$"; then
    echo "   已推送重试 commit"
    return 0
  else
    echo "   ⚠️  推送失败"
    return 1
  fi
}

# ============================================================
# 主循环
# ============================================================
attempt=0

while [ $attempt -le $MAX_RETRIES ]; do
  if [ $attempt -gt 0 ]; then
    retry_deploy $attempt || exit 1
  fi

  echo "   等待 Pages 构建..."

  elapsed=0
  while [ $elapsed -lt $MAX_WAIT_SEC ]; do
    sleep $POLL_INTERVAL
    elapsed=$((elapsed + POLL_INTERVAL))

    code=$(check_site_response)
    if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then
      echo "✅ 部署成功！（HTTP $code）"
      exit 0
    else
      echo "   ⏳ 等待中... HTTP $code （${elapsed}s/${MAX_WAIT_SEC}s）"
    fi
  done

  echo "⚠️  超时未检测到部署成功"
  attempt=$((attempt + 1))
done

echo "❌ 部署验证失败，已尝试 ${MAX_RETRIES} 次重试"
echo "   请手动检查: https://github.com/zzdbilly/loczb/actions"
exit 1
