#!/usr/bin/env node
/**
 * build-custom-hljs.js
 * 定制构建仅包含博客所需语言的轻量 highlight.js (89KB / 28KB gzip)
 * 替代 121KB 的全量包。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ENTRY = path.join(__dirname, 'custom-hljs-entry.js');
const OUT = path.join(ROOT, 'assets', 'vendor', 'highlight', 'highlight.min.js');

const entryCode = `import hljs from 'highlight.js/lib/core';

import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import gradle from 'highlight.js/lib/languages/gradle';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import properties from 'highlight.js/lib/languages/properties';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import ini from 'highlight.js/lib/languages/ini';
import yaml from 'highlight.js/lib/languages/yaml';
import xml from 'highlight.js/lib/languages/xml';
import go from 'highlight.js/lib/languages/go';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import nginx from 'highlight.js/lib/languages/nginx';
import cpp from 'highlight.js/lib/languages/cpp';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('diff', diff);
hljs.registerLanguage('gradle', gradle);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('properties', properties);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('rs', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('toml', ini);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('go', go);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('docker', dockerfile);
hljs.registerLanguage('nginx', nginx);
hljs.registerLanguage('conf', nginx);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('cpp', cpp);

window.hljs = hljs;
export default hljs;
`;

fs.writeFileSync(ENTRY, entryCode, 'utf-8');

try {
  execSync(`npx esbuild "${ENTRY}" --bundle --minify --format=iife --outfile="${OUT}"`, {
    cwd: ROOT,
    stdio: 'inherit'
  });
  console.log(`✅ 定制 highlight.min.js 构建完成: ${(fs.statSync(OUT).size / 1024).toFixed(1)} KB`);
} finally {
  if (fs.existsSync(ENTRY)) fs.unlinkSync(ENTRY);
}
