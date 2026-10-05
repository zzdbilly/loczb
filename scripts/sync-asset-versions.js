#!/usr/bin/env node
/**
 * 静态资源版本号同步（内容哈希）
 *
 * 声明式资产表 ASSETS：每个资产声明「内容文件」与「HTML 引用正则」，
 * 统一把引用 URL 追加 ?v=<sha256 前 10 位>。内容不变则不写盘（幂等）。
 *
 * 目前覆盖两类「裸引用」资产：
 *   · style.css   —— <link ... href="...style.css">
 *   · article.js  —— <script ... src="...article.js">
 *
 * ⚠️ 故意不收 search.js / blog-list.js / main.js 等：它们当前用的是手写日期串
 *    （如 ?v=20261002-a11y1），若盖内容哈希会与既有手写版本冲突，造成无意义漂移。
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CWD = path.join(__dirname, '..');
const HASH_LEN = 10;

const ASSETS = [
  {
    name: 'style.css',
    file: 'assets/css/style.css',
    required: true,
    re: /(<link[^>]*?\bhref=")([^"]*?style\.css)(?:\?[^"]*)?(")/g,
  },
  {
    name: 'article.js',
    file: 'assets/js/article.js',
    required: false,
    re: /(<script[^>]*?\bsrc=")([^"]*?article\.js)(?:\?[^"]*)?(")/g,
  },
];

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

function syncAssetVersions(opts = {}) {
  const dry = !!opts.dry;

  const hashes = {};
  const active = [];
  for (const asset of ASSETS) {
    const full = path.join(CWD, asset.file);
    if (!fs.existsSync(full)) {
      if (asset.required) return { ok: false, error: `${asset.name} not found` };
      continue;
    }
    hashes[asset.name] = sha256Hex(fs.readFileSync(full));
    active.push(asset);
  }

  const htmlFiles = walkHtml(CWD);

  let updated = 0;
  let totalRefs = 0;
  const changedFiles = [];

  for (const file of htmlFiles) {
    const raw = fs.readFileSync(file, 'utf-8');
    let newHtml = raw;
    for (const asset of active) {
      newHtml = newHtml.replace(asset.re, (match, prefix, pathOnly, suffix) => {
        totalRefs++;
        return `${prefix}${pathOnly}?v=${hashes[asset.name]}${suffix}`;
      });
    }

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
    // styleHash 保留为向后兼容字段（generate-index.js 读取它打日志）
    styleHash: hashes['style.css'],
    articleHash: hashes['article.js'],
    hashes,
    scanned: htmlFiles.length,
    totalRefs,
    updated,
    changedFiles
  };
}

if (require.main === module) {
  const r = syncAssetVersions();
  if (!r.ok) {
    console.error(`❌ 静态资源版本号同步失败: ${r.error}`);
    process.exit(1);
  }
  const parts = Object.entries(r.hashes).map(([k, v]) => `${k} -> ?v=${v}`).join(', ');
  console.log(`🔖 静态资源版本号同步: ${parts}`);
  console.log(`   扫描 ${r.scanned} 个 HTML, 匹配 ${r.totalRefs} 处引用, 更新 ${r.updated} 个文件`);
}

module.exports = { syncAssetVersions };
