#!/bin/bash
# deploy-check.sh — 推送后**只读**校验 GitHub Pages 是否已发布当前 HEAD 的内容
#
# 用法：
#   git push && ./scripts/deploy-check.sh
#   DOMAIN=https://709527.xyz MAX_WAIT_SEC=60 ./scripts/deploy-check.sh   # 覆盖默认值
#
# 原理：
#   1. 非 main 分支直接跳过（只有 main 触发 Pages 构建）
#   2. 轮询线上几个关键页面，把响应体的 sha256 与本地工作区对应文件比对
#      - 逐字节一致 ⇒ 当前 HEAD 的内容确实已上线
#      - 带 cache-buster 查询串，绕过 GitHub Pages 的 max-age=600 边缘缓存
#   3. 超时则打印排查指引并以 1 退出
#
# 安全边界（2026-09-27 重写，务必保持）：
#   ✗ 不 commit、✗ 不 push、✗ 不产生任何写操作。旧版本在“检测失败”时会
#   `git commit --allow-empty` + `git push` 重试，实测会把垃圾提交推上 main，
#   还会把工作区里已暂存的文件一起带走（该行为已删除，不要再加回来）。
#   旧版本更致命的是：它只 HEAD 首页判 200，而 Pages 构建期间也会返回上一版 200，
#   所以“✅ 部署成功”其实证明不了新 commit 上线——现在改为内容哈希比对。
#
# 依赖：curl、sha256sum、git

set -u

DOMAIN="${DOMAIN:-https://709527.xyz}"
MAX_WAIT_SEC="${MAX_WAIT_SEC:-300}"
POLL_INTERVAL="${POLL_INTERVAL:-15}"
# 比对清单：改动频繁、且能代表一次部署是否真的上线的文件。
# 注意 style.css 也要在列——纯 CSS 的提交只改这一个文件，漏了它就会出现
# 「5 个页面都一致」但实际上新样式还没上的假绿（2026-09-27 踩到）。
FILES=(index.html blog/index.html projects/index.html about/index.html blog/articles-index.json assets/css/style.css)

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
HEAD_SHORT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

if [ "$BRANCH" != "main" ]; then
  echo "⏭️  当前分支: $BRANCH，跳过部署校验（仅 main 会触发 Pages 构建）"
  exit 0
fi

echo "🔍 部署校验（只读，不会 push）"
echo "   站点: $DOMAIN/"
echo "   Commit: $HEAD_SHORT  分支: $BRANCH"
echo "   比对: ${FILES[*]}"
echo "   超时 ${MAX_WAIT_SEC}s / 间隔 ${POLL_INTERVAL}s"

local_hash() {
  sha256sum "$1" 2>/dev/null | cut -d' ' -f1
}

# --compressed：GitHub Pages 对支持 gzip 的客户端返回压缩体，curl 会自动解压，
# 拿到的明文与仓库里的文件逐字节可比。
live_hash() {
  curl -fsSL --compressed --max-time 20 "$DOMAIN/$1?deploy-check=$HEAD_SHORT" 2>/dev/null \
    | sha256sum | cut -d' ' -f1
}

present=0
for f in "${FILES[@]}"; do [ -f "$f" ] && present=$((present + 1)); done

elapsed=0
while :; do
  pending=()
  for f in "${FILES[@]}"; do
    [ -f "$f" ] || continue
    if [ "$(local_hash "$f")" != "$(live_hash "$f")" ]; then
      pending+=("$f")
    fi
  done

  if [ ${#pending[@]} -eq 0 ]; then
    echo "✅ 部署成功：线上 $present 个页面与本地 HEAD 逐字节一致（用时 ${elapsed}s）"
    exit 0
  fi

  echo "   ⏳ 未就绪（${elapsed}s/${MAX_WAIT_SEC}s）: ${pending[*]}"
  [ "$elapsed" -ge "$MAX_WAIT_SEC" ] && break
  sleep "$POLL_INTERVAL"
  elapsed=$((elapsed + POLL_INTERVAL))
done

echo "❌ 超时：以上页面的线上内容与本地 HEAD 仍不一致"
echo "   1) 确认真的推上去了：git log --oneline origin/main -1"
echo "   2) 看构建日志：https://github.com/zzdbilly/loczb/actions"
echo "   3) 本脚本只校验、不自动重推——确认是 Pages 侧问题时，手动空提交再推一次。"
exit 1
