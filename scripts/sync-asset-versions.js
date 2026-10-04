#!/usr/bin/env node
/**
 * 核心静态资源版本号同步（内容哈希）
 *
 * 类似 scripts/sync-widget-version.js，为全站 HTML 中的 style.css
 * 统一追加 ?v=<sha256 前 10 位>。
 * 内容不变则不写盘（幂等）。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CWD = path.join(__dirname, '..');
const STYLE_PATH = path.join(CWD, 'assets', 'css', 'style.css');
const HASH_LEN = 10;

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

const STYLE_RE = /(<link[^>]*?\bhref=")([^"]*?style\.css)(?:\?[^"]*)?(")/g;

function syncAssetVersions(opts = {}) {
  const dry = !!opts.dry;
  if (!fs.existsSync(STYLE_PATH)) {
    return { ok: false, error: 'style.css not found' };
  }

  const styleHash = sha256Hex(fs.readFileSync(STYLE_PATH));
  const htmlFiles = walkHtml(CWD);

  let updated = 0;
  let totalRefs = 0;
  const changedFiles = [];

  for (const file of htmlFiles) {
    const raw = fs.readFileSync(file, 'utf-8');
    let fileRefs = 0;
    const newHtml = raw.replace(STYLE_RE, (match, prefix, pathOnly, suffix) => {
      fileRefs++;
      return `${prefix}${pathOnly}?v=${styleHash}${suffix}`;
    });

    totalRefs += fileRefs;
    if (newHtml !== raw) {
      if (!dry) {
        fs.writeFileSync(file, newHtml, 'utf-8');
      }
      updated++;
      changedFiles.push(path.relative(CWD, file));
    }
  }

  return {
    ok: true,
    styleHash,
    scanned: htmlFiles.length,
    totalRefs,
    updated,
    changedFiles
  };
}

if (require.main === module) {
  const r = syncAssetVersions();
  console.log(`🔖 静态资源版本号同步: style.css -> ?v=${r.styleHash}`);
  console.log(`   扫描 ${r.scanned} 个 HTML, 匹配 ${r.totalRefs} 处引用, 更新 ${r.updated} 个文件`);
}

module.exports = { syncAssetVersions };
