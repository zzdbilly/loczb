#!/usr/bin/env node
/**
 * 评论组件引用版本号同步（内容哈希）
 *
 * 背景：文章页里的评论组件是**不带版本号**引用的
 *   <script src="../../workers/comment-system/comment-widget.js" defer>
 * GitHub Pages 对静态资源下发 `cache-control: max-age=600`，改了组件之后边缘节点
 * 还会继续吐旧文件最多 10 分钟（实测踩到过：push 了、Pages 构建也好了，用户拿到旧 JS）。
 * 给引用挂上内容哈希（`?v=<sha256 前 10 位>`）后，内容一变 URL 就变 ⇒ 立即生效。
 *
 * 做三件事：
 *   1) comment-widget.css 内容哈希 → 写进 comment-widget.js 的 CSS_PATH 常量。
 *      CSS 不在 HTML 里，是组件自己动态注入 <link> 的（loadCSS()），所以只能把版本
 *      拼在注入 URL 上，否则改 CSS 照样吃 10 分钟旧缓存。
 *   2) comment-widget.js 内容哈希 → 写进所有 HTML 的 <script src="…comment-widget.js?v=">。
 *   3) 先落盘 1) 再算 2) 的哈希：CSS 变 ⇒ JS 内容变 ⇒ JS 版本变 ⇒ 全站 HTML 换 URL，
 *      一遍收敛（不会出现「HTML 指向新 JS、新 JS 指向旧 CSS」的半新状态）。
 *
 * 幂等：逐字节比对，内容不变不落盘；连跑两次第二次零改动。
 * 无引用 / 锚点异常（找不到 CSS_PATH 常量、正文之外有裸引用却没写成 <script src>）
 * 一律报错并非零退出，不静默跳过。
 *
 * 用法:
 *   node scripts/sync-widget-version.js          # 同步写盘
 *   node scripts/sync-widget-version.js --dry    # 预演：只报将要改动的文件数与新旧版本号
 *
 * 由 scripts/generate-index.js 在写完文章页之后自动调用（见其文件末尾执行段），
 * 由 scripts/verify.js 的 i) 断言把关（引用版本必须等于当前组件内容哈希）。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CWD = path.join(__dirname, '..');
const WIDGET_JS_REL = 'workers/comment-system/comment-widget.js';
const WIDGET_CSS_REL = 'workers/comment-system/comment-widget.css';
// 版本号长度：sha256 十六进制前 10 位（40 bit）。仓库既有先例 sw.js 用 8 位，
// 这里多 2 位纯粹是把碰撞概率再压低一个量级，代价只是长 2 个字符。
const HASH_LEN = 10;

// HTML 里真正生效的引用：只认裸 <script src="…comment-widget.js">。
// 文章正文里的示例代码是 HTML 转义过的（&lt;script …），天然不命中；
// 再额外剥掉 <pre>…</pre> 区间（沿用 check-links.js 的既有做法），双保险：
// 正文示例永远不被脚本改写。
const SCRIPT_REF_RE = /(<script[^>]*\bsrc=")([^"]*?comment-widget\.js)(\?v=[0-9a-f]+)?(")/g;
const PRE_BLOCK_RE = /<pre[\s\S]*?<\/pre>/gi;
// comment-widget.js 里的 CSS_PATH 常量（含可选 ?v=）：版本号的唯一锚点
const CSS_PATH_RE = /(const CSS_PATH = '[^']*\/comment-widget\.css)(\?v=[0-9a-f]+)?';/;

// 必须带引用、且只能有一处的页面：文章页（含模板）。
// 其它 HTML（首页 / 列表页 / 404 等）允许 0 处。
const MUST_REF = [path.join('templates', 'blog-post-template.html')];

function sha256Hex(buf, len = HASH_LEN) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, len);
}

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkHtml(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * 同步版本号。
 * @param {{dry?: boolean}} opts
 * @returns {{ok: boolean, dry: boolean, jsVersion: string, cssVersion: string,
 *            jsChanged: boolean, cssChanged: boolean, files: number, refs: number,
 *            changedFiles: string[], errors: string[]}}
 */
function syncWidgetVersion(opts = {}) {
  const dry = !!opts.dry;
  const errors = [];
  const jsPath = path.join(CWD, WIDGET_JS_REL);
  const cssPath = path.join(CWD, WIDGET_CSS_REL);

  // ── 1) CSS 版本 → 写进组件自身的 CSS_PATH ──────────────
  if (!fs.existsSync(cssPath)) {
    errors.push(`缺少 ${WIDGET_CSS_REL}（无法计算 CSS 内容哈希）`);
  }
  if (!fs.existsSync(jsPath)) {
    errors.push(`缺少 ${WIDGET_JS_REL}（无法计算 JS 内容哈希）`);
  }
  if (errors.length) {
    return { ok: false, dry, jsVersion: '-', cssVersion: '-', jsChanged: false, cssChanged: false, files: 0, refs: 0, changedFiles: [], errors };
  }

  const cssVersion = sha256Hex(fs.readFileSync(cssPath));
  const jsSrc = fs.readFileSync(jsPath, 'utf-8');

  if (!CSS_PATH_RE.test(jsSrc)) {
    errors.push(`锚点异常：${WIDGET_JS_REL} 里找不到 \`const CSS_PATH = '…/comment-widget.css'\`，无法写入 CSS 版本号`);
    return { ok: false, dry, jsVersion: '-', cssVersion, jsChanged: false, cssChanged: false, files: 0, refs: 0, changedFiles: [], errors };
  }

  const jsSrcNew = jsSrc.replace(CSS_PATH_RE, (_m, head) => `${head}?v=${cssVersion}';`);
  const cssChanged = jsSrcNew !== jsSrc;

  // ── 2) JS 版本：以「写入 CSS 版本之后」的内容为准 ────────
  const jsVersion = sha256Hex(Buffer.from(jsSrcNew, 'utf-8'));
  if (!dry && cssChanged) fs.writeFileSync(jsPath, jsSrcNew, 'utf-8');

  // ── 3) 全站 HTML 引用改写 ──────────────────────────────
  const htmlFiles = walkHtml(CWD).sort();
  const changedFiles = [];
  let refs = 0;
  const perFile = new Map();

  for (const full of htmlFiles) {
    const rel = path.relative(CWD, full);
    const html = fs.readFileSync(full, 'utf-8');

    const matches = [...html.matchAll(SCRIPT_REF_RE)];
    const count = matches.length;
    perFile.set(rel, count);
    refs += count;

    // 锚点检查：剥掉 <pre> 后仍出现 comment-widget.js 字样，却没有可改写的
    // <script src> 引用 ⇒ 说明引用写法变了（被删 / 被改成别的形式），报错不静默跳过。
    const outside = html.replace(PRE_BLOCK_RE, '');
    const mentions = (outside.match(/comment-widget\.js/g) || []).length;
    if (mentions > count) {
      errors.push(`锚点异常：${rel} 正文（<pre> 之外）出现 comment-widget.js 共 ${mentions} 处，但只匹配到 ${count} 处可改写的 <script src> 引用`);
    }
    if (!/^blog[\\/]posts[\\/]/.test(rel) && count > 1) {
      errors.push(`锚点异常：${rel} 出现 ${count} 处评论组件引用（非文章页不应超过 1 处）`);
    }
    if (/^blog[\\/]posts[\\/]/.test(rel) && count !== 1) {
      errors.push(`${rel} 的评论组件引用 ${count} 处（文章页应恰好 1 处，模板模板化异常）`);
    }

    if (count === 0) continue;

    let oldVersions = new Set();
    const out = html.replace(SCRIPT_REF_RE, (_m, head, url, ver, tail) => {
      oldVersions.add(ver ? ver.slice(3) : '(无版本号)');
      return `${head}${url}?v=${jsVersion}${tail}`;
    });
    if (out !== html) {
      if (!dry) fs.writeFileSync(full, out, 'utf-8');
      changedFiles.push({ rel, old: [...oldVersions].join('/'), count });
    }
  }

  for (const rel of MUST_REF) {
    const count = perFile.get(rel);
    if (count === undefined) errors.push(`锚点异常：${rel} 不存在（模板是文章页引用的源头）`);
    else if (count !== 1) errors.push(`${rel} 的评论组件引用 ${count} 处（应为 1 处）`);
  }

  return {
    ok: errors.length === 0,
    dry,
    jsVersion,
    cssVersion,
    jsChanged: cssChanged,
    cssChanged,
    files: htmlFiles.length,
    refs,
    changedFiles,
    errors,
  };
}

function report(r) {
  const tag = r.dry ? '🚧 --dry 预演（不写盘）' : '🔖 评论组件引用版本同步';
  console.log(`${tag}`);
  console.log(`   组件 JS  ?v=${r.jsVersion}   组件 CSS ?v=${r.cssVersion}`);
  console.log(`   扫描 HTML ${r.files} 个，命中引用 ${r.refs} 处`);
  if (r.changedFiles.length === 0) {
    console.log(`   ✅ 0 个文件需要改动（HTML 与组件版本已一致，幂等）`);
  } else {
    console.log(`   ${r.dry ? '将' : '已'}更新 ${r.changedFiles.length} 个文件的引用版本：`);
    r.changedFiles.slice(0, 5).forEach(c => console.log(`      ${c.rel}  ${c.old} → ${r.jsVersion}`));
    if (r.changedFiles.length > 5) console.log(`      … 其余 ${r.changedFiles.length - 5} 个同理`);
  }
  if (r.errors.length) {
    console.error(`\n❌ sync-widget-version.js 失败，共 ${r.errors.length} 处：`);
    r.errors.forEach(e => console.error(`   - ${e}`));
  }
}

if (require.main === module) {
  const dry = process.argv.includes('--dry');
  const r = syncWidgetVersion({ dry });
  report(r);
  process.exit(r.ok ? 0 : 1);
}

module.exports = { syncWidgetVersion, report, sha256Hex, HASH_LEN, WIDGET_JS_REL, WIDGET_CSS_REL };
