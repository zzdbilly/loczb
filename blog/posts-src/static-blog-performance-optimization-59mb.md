---
title: "静态博客性能优化实战：从 59MB 到精简高效"
description: "66篇文章4KB重复内联样式、4.4MB死文件、404幽灵引用——一次完整的静态博客性能优化记录"
date: 2026-07-03 20:48:53
category: 前端
tags: ["性能优化", "静态网站", "前端", "CSS"]
read_time: 5
slug: static-blog-performance-optimization-59mb
---

<h2>为什么需要性能优化</h2>
<p>很多人觉得静态网站（如 GitHub Pages）天然就快，不需要优化。但实际情况是，随着内容增长，没有维护的静态站会积累大量问题：死文件占空间、内联样式膨胀、缓存策略缺失、404 错误拖慢加载……</p>
<p>我的博客运行在 GitHub Pages 上，经过半年的内容积累，仓库膨胀到 59MB，66 篇文章每篇都带着 4KB 重复的内联样式，文章页引用着不存在的 JS 文件，社交分享图指向 404 图片。这些问题单个看起来不大，但叠加起来严重影响用户体验和 SEO。</p>
<p>本文记录了一次完整的性能优化过程，涵盖文件清理、CSS/JS 优化、缓存策略、结构化数据等方面。</p>
<h2>第一步：全面体检</h2>
<h3>文件体积分析</h3>
<p>优化的第一步是搞清楚现状。用 <code>du</code> 命令快速扫描：</p>
<pre><code># 查看各目录体积
du -sh assets/ blog/ templates/

# 查看 JS 文件大小
du -h assets/js/*.js | sort -rh

# 查看图片大小
find assets/images/ -type f -exec du -h {} \; | sort -rh
</code></pre>

<p>扫描结果发现了几个明显的问题：</p>
<ul>
<li>仓库总体积 59MB，其中图片占了大部分</li>
<li>有 4.4MB 的图片没有被任何页面引用</li>
<li>有 20KB 的 JS 文件（ai-assistant.js、toc.js）没有被任何页面加载</li>
<li>66 篇文章每篇都有约 4KB 的内联 <code>&lt;style&gt;</code> 块</li>
</ul>
<h3>死文件检测</h3>
<p>检测死文件的核心思路是：遍历所有 HTML 文件中的引用，找出没有被引用的资源文件。</p>
<pre><code># 检查 JS 文件是否被引用
for js in assets/js/*.js; do
  name=$(basename &quot;$js&quot;)
  count=$(grep -rl &quot;$name&quot; --include=&quot;*.html&quot; . | wc -l)
  if [ &quot;$count&quot; -eq 0 ]; then
    echo &quot;❌ 死文件: $js&quot;
  fi
done
</code></pre>

<p>这个脚本可以快速找出没有被任何 HTML 文件引用的 JS 文件。同样的方法也适用于 CSS 和图片文件。</p>
<h3>404 错误检测</h3>
<p>比死文件更隐蔽的是"幽灵引用"——HTML 中引用了不存在的文件。这会导致浏览器请求返回 404，虽然不会直接报错，但会拖慢页面加载。</p>
<pre><code># 检查文章页引用的 JS 是否存在
for f in blog/posts/*.html; do
  refs=$(grep -o &#39;src=&quot;[^&quot;]*\.js[^&quot;]*&quot;&#39; &quot;$f&quot;)
  for ref in $refs; do
    path=$(echo &quot;$ref&quot; | sed &#39;s/src=&quot;//;s/&quot;//;s/..\///&#39;)
    if [ ! -f &quot;$path&quot; ]; then
      echo &quot;❌ 404: $f -&gt; $ref&quot;
    fi
  done
done
</code></pre>

<p>通过这个检查，发现 66 篇文章都引用了一个不存在的 <code>og-generator.js</code> 文件。这个文件可能在某次重构中被删除了，但文章模板中的引用没有同步清理。</p>
<h2>第二步：文件清理</h2>
<h3>删除死文件</h3>
<p>清理工作从最简单的开始——直接删除没有被引用的文件：</p>
<pre><code># 删除未被引用的 JS
rm assets/js/ai-assistant.js    # 16KB
rm assets/js/toc.js              # 4KB

# 删除未被引用的图片
rm assets/images/qwen_20260424_*.png  # 4.4MB
</code></pre>

<h3>修复幽灵引用</h3>
<p>对于引用了不存在文件的幽灵引用，需要从所有 HTML 文件中移除这些引用：</p>
<pre><code>import re, os

for fname in os.listdir(&#39;blog/posts&#39;):
    if not fname.endswith(&#39;.html&#39;):
        continue
    fpath = os.path.join(&#39;blog/posts&#39;, fname)
    with open(fpath, &#39;r&#39;, encoding=&#39;utf-8&#39;) as f:
        html = f.read()

    # 移除对不存在文件的引用
    new_html = re.sub(
        r&#39;\s*&lt;script src=&quot;[^&quot;]*og-generator\.js[^&quot;]*&quot;\s*&gt;&lt;/script&gt;\s*\n?&#39;,
        &#39;\n&#39;, html
    )

    if new_html != html:
        with open(fpath, &#39;w&#39;, encoding=&#39;utf-8&#39;) as f:
            f.write(new_html)
</code></pre>

<h3>修复 og:image 路径</h3>
<p>文章模板中的 Open Graph 图片指向了 <code>og-default.webp</code>，但实际文件是 <code>og-image.png</code>。这会导致社交分享时图片无法显示：</p>
<pre><code># 批量修复 og:image 路径
for fname in os.listdir(&#39;blog/posts&#39;):
    if not fname.endswith(&#39;.html&#39;):
        continue
    fpath = os.path.join(&#39;blog/posts&#39;, fname)
    with open(fpath, &#39;r&#39;, encoding=&#39;utf-8&#39;) as f:
        html = f.read()

    html = html.replace(
        &#39;assets/images/og-default.webp&#39;,
        &#39;assets/images/og-image.png&#39;
    )

    with open(fpath, &#39;w&#39;, encoding=&#39;utf-8&#39;) as f:
        f.write(html)
</code></pre>

<h2>第三步：CSS 优化</h2>
<h3>内联样式抽离</h3>
<p>这是本次优化中收益最大的一项。66 篇文章每篇都有约 4KB 的内联 <code>&lt;style&gt;</code> 块，这些样式大部分是重复的（文章页专用样式如代码块高亮、提示框、表格等）。</p>
<h4>问题分析</h4>
<p>通过对比发现，66 篇文章的内联样式有 14 种变体，但核心内容几乎相同。去重后只有 6.7KB 的有效 CSS。</p>
<pre><code>import re, hashlib, os

# 统计内联样式变体
hashes = {}
for f in os.listdir(&#39;blog/posts&#39;):
    if not f.endswith(&#39;.html&#39;):
        continue
    with open(f&#39;blog/posts/{f}&#39;) as fh:
        html = fh.read()
    styles = re.findall(r&#39;&lt;style&gt;(.*?)&lt;/style&gt;&#39;, html, re.DOTALL)
    combined = &#39;&#39;.join(s.strip() for s in styles)
    h = hashlib.md5(combined.encode()).hexdigest()
    hashes.setdefault(h, []).append(f)

print(f&#39;唯一样式块数量: {len(hashes)}&#39;)
for h, files in hashes.items():
    print(f&#39;  {h[:8]}: {len(files)} 篇文章&#39;)
</code></pre>

<h4>抽离方案</h4>
<p>将所有内联样式合并去重，生成一个 <code>article.css</code> 文件：</p>
<pre><code>import re, os

# 收集所有不同的内联样式规则
all_css = set()
for f in os.listdir(&#39;blog/posts&#39;):
    if not f.endswith(&#39;.html&#39;):
        continue
    with open(f&#39;blog/posts/{f}&#39;) as fh:
        html = fh.read()
    styles = re.findall(r&#39;&lt;style&gt;(.*?)&lt;/style&gt;&#39;, html, re.DOTALL)
    for s in styles:
        rules = re.findall(r&#39;[^{}]+\{[^{}]+\}&#39;, s)
        all_css.update(rules)

# 写入文章页专用 CSS
article_css = &#39;\n&#39;.join(sorted(all_css))
with open(&#39;assets/css/article.css&#39;, &#39;w&#39;, encoding=&#39;utf-8&#39;) as f:
    f.write(&#39;/* 文章页专用样式 */\n&#39;)
    f.write(article_css)
</code></pre>

<p>然后从所有文章中移除内联样式块，替换为外部 CSS 引用：</p>
<pre><code>for f in os.listdir(&#39;blog/posts&#39;):
    if not f.endswith(&#39;.html&#39;):
        continue
    fpath = f&#39;blog/posts/{f}&#39;
    with open(fpath, &#39;r&#39;, encoding=&#39;utf-8&#39;) as fh:
        html = fh.read()

    # 移除 &lt;style&gt; 块
    new_html = re.sub(r&#39;\s*&lt;style&gt;.*?&lt;/style&gt;\s*&#39;, &#39;\n&#39;, html, flags=re.DOTALL)

    # 添加外部 CSS 引用
    new_html = new_html.replace(
        &#39;&lt;link rel=&quot;stylesheet&quot; href=&quot;../../assets/css/style.css&quot;&gt;&#39;,
        &#39;&lt;link rel=&quot;stylesheet&quot; href=&quot;../../assets/css/style.css&quot;&gt;\n&#39;
        &#39;    &lt;link rel=&quot;stylesheet&quot; href=&quot;../../assets/css/article.css&quot;&gt;&#39;
    )

    with open(fpath, &#39;w&#39;, encoding=&#39;utf-8&#39;) as fh:
        fh.write(new_html)
</code></pre>

<h4>效果</h4>
<table>
<thead>
<tr>
<th>指标</th>
<th>优化前</th>
<th>优化后</th>
</tr>
</thead>
<tbody>
<tr>
<td>每篇文章内联 CSS</td>
<td>~4KB</td>
<td>0</td>
</tr>
<tr>
<td>article.css</td>
<td>不存在</td>
<td>6.7KB</td>
</tr>
<tr>
<td>总 CSS 冗余</td>
<td>~262KB</td>
<td>0</td>
</tr>
<tr>
<td>浏览器缓存</td>
<td>不支持</td>
<td>支持</td>
</tr>
</tbody>
</table>
<p>净节省 252KB，且浏览器缓存 <code>article.css</code> 后，后续文章页加载更快。</p>
<h2>第四步：JavaScript 优化</h2>
<h3>内联脚本抽离</h3>
<p>和 CSS 类似，文章页有约 80 行内联 JavaScript，包含返回顶部、阅读进度、键盘快捷键、TOC 目录等功能。</p>
<h4>抽离到 article.js</h4>
<pre><code>/**
 * article.js - 文章页专用脚本
 * 返回顶部、阅读进度、键盘快捷键、TOC 目录
 */

(function() {
  &#39;use strict&#39;;

  document.addEventListener(&#39;DOMContentLoaded&#39;, () =&gt; {
    // 返回顶部 &amp; 阅读进度
    const backToTop = document.getElementById(&#39;backToTop&#39;);
    window.addEventListener(&#39;scroll&#39;, () =&gt; {
      // ... 滚动逻辑
    });

    // TOC 目录
    const headings = document.querySelectorAll(&#39;.post-content h2, .post-content h3&#39;);
    headings.forEach((h, i) =&gt; {
      // ... TOC 生成逻辑
    });
  });
})();
</code></pre>

<h4>关键陷阱：DOMContentLoaded</h4>
<p>抽离内联脚本时最容易踩的坑是执行时机。内联 <code>&lt;script&gt;</code> 在解析到该行时同步执行，此时 DOM 可能还没准备好。抽到外部文件后如果不用 <code>DOMContentLoaded</code> 包裹，<code>getElementById</code> 会返回 null。</p>
<pre><code>// ❌ 错误：外部脚本同步执行时 DOM 未就绪
(function() {
  const tocList = document.getElementById(&#39;tocList&#39;);
  if (!tocList) return; // 直接退出了！
})();

// ✅ 正确：等 DOM 准备好再执行
document.addEventListener(&#39;DOMContentLoaded&#39;, () =&gt; {
  const tocList = document.getElementById(&#39;tocList&#39;);
  // ...
});
</code></pre>

<p>这个坑导致了 TOC 目录全部消失，花了时间才定位到。</p>
<h3>手机端 TOC 抽屉</h3>
<p>桌面端 TOC 是固定在右侧的浮动面板，但在手机端屏幕太窄不适合。方案是：</p>
<ul>
<li>大屏（≥1200px）：显示固定浮动 TOC</li>
<li>小屏（&lt;1200px）：隐藏浮动 TOC，显示右下角按钮，点击弹出抽屉</li>
</ul>
<pre><code>/* 桌面端：固定浮动 */
.post-toc-container {
  display: none;
}

@media (min-width: 1200px) {
  .post-toc-container {
    display: block;
  }
}

/* 手机端：浮动按钮 */
.mobile-toc-btn {
  display: none;
}

@media (max-width: 1199px) {
  .mobile-toc-btn {
    display: flex;
  }
}

/* 抽屉 */
.toc-drawer {
  position: fixed;
  right: -280px;
  width: 280px;
  height: 100vh;
  transition: right 0.3s ease;
}

.toc-drawer.open {
  right: 0;
}
</code></pre>

<h2>第五步：缓存策略</h2>
<h3>CSS/JS 版本化</h3>
<p>静态资源更新后，浏览器缓存会导致用户看到旧版本。解决方案是给文件引用加内容 hash：</p>
<pre><code>&lt;!-- 优化前 --&gt;
&lt;link rel=&quot;stylesheet&quot; href=&quot;assets/css/style.css&quot;&gt;
&lt;script src=&quot;assets/js/main.js&quot;&gt;&lt;/script&gt;

&lt;!-- 优化后 --&gt;
&lt;link rel=&quot;stylesheet&quot; href=&quot;assets/css/style.css?v=a1b2c3d4&quot;&gt;
&lt;script src=&quot;assets/js/main.js?v=e5f6g7h8&quot;&gt;&lt;/script&gt;
</code></pre>

<h3>GitHub Actions 自动注入 hash</h3>
<p>手动维护 hash 不现实，用 CI 自动化。在每次 push 时扫描文件内容，生成 8 位 hash 并注入到 HTML 引用中：</p>
<pre><code># .github/workflows/update-index.yml
- name: Update cache hashes
  run: |
    node -e &quot;
    const fs = require(&#39;fs&#39;);
    const crypto = require(&#39;crypto&#39;);

    const files = [
      [&#39;assets/css/style.css&#39;, &#39;index.html&#39;],
      [&#39;assets/js/main.js&#39;, &#39;index.html&#39;],
      // ... 更多文件
    ];

    files.forEach(([asset, page]) =&gt; {
      const content = fs.readFileSync(asset);
      const hash = crypto.createHash(&#39;md5&#39;).update(content).digest(&#39;hex&#39;).slice(0, 8);
      let html = fs.readFileSync(page, &#39;utf8&#39;);
      html = html.replace(
        new RegExp(asset + &#39;\\?v=[a-f0-9]+&#39;, &#39;g&#39;),
        asset + &#39;?v=&#39; + hash
      );
      fs.writeFileSync(page, html);
    });
    &quot;
</code></pre>

<h3>robots.txt 优化</h3>
<p>之前 robots.txt 禁止了 <code>/assets/css/</code> 和 <code>/assets/js/</code> 目录的抓取，这没有必要。虽然不影响搜索排名，但有些爬虫会因此不缓存这些资源：</p>
<pre><code>- Disallow: /assets/css/
- Disallow: /assets/js/
+ Disallow: /node_modules/
</code></pre>

<h2>第六步：结构化数据</h2>
<h3>JSON-LD 结构化数据</h3>
<p>Google 搜索结果中显示作者、发布日期、阅读时间等富文本信息，需要 JSON-LD 结构化数据。</p>
<h4>安全生成 JSON-LD</h4>
<p>直接用字符串拼接生成 JSON-LD 有风险——标题或描述中包含双引号会破坏 JSON 结构。正确做法是用 <code>json.dumps</code>：</p>
<pre><code>import json

json_ld_obj = {
    &quot;@context&quot;: &quot;https://schema.org&quot;,
    &quot;@type&quot;: &quot;Article&quot;,
    &quot;headline&quot;: title,
    &quot;description&quot;: description,
    &quot;image&quot;: &quot;https://709527.xyz/assets/images/og-image.png&quot;,
    &quot;author&quot;: {
        &quot;@type&quot;: &quot;Person&quot;,
        &quot;name&quot;: &quot;张小猛&quot;,
        &quot;url&quot;: &quot;https://709527.xyz/about/&quot;
    },
    &quot;datePublished&quot;: f&quot;{article_date}T00:00:00+08:00&quot;,
    &quot;keywords&quot;: &quot;, &quot;.join(tag_list),
    &quot;articleSection&quot;: category
}

# json.dumps 自动处理转义
json_ld_str = json.dumps(json_ld_obj, ensure_ascii=False, indent=6)
</code></pre>

<h4>RSS XML 转义</h4>
<p>同样，RSS 中的标题和描述也需要 XML 转义：</p>
<pre><code>from xml.sax.saxutils import escape as xml_escape

lines.append(f&#39;      &lt;title&gt;{xml_escape(title)}&lt;/title&gt;&#39;)
lines.append(f&#39;      &lt;description&gt;{xml_escape(description)}&lt;/description&gt;&#39;)
</code></pre>

<h2>第七步：访问统计</h2>
<h3>Cloudflare Web Analytics</h3>
<p>对于部署在 Cloudflare 后面的域名，Cloudflare Web Analytics 是最佳选择：</p>
<ul>
<li>免费</li>
<li>无 cookie</li>
<li>不需要 JS SDK（只是一个 beacon 请求）</li>
<li>隐私友好</li>
</ul>
<pre><code>&lt;script defer src=&#39;https://static.cloudflareinsights.com/beacon.min.js&#39;
  data-cf-beacon=&#39;{&quot;token&quot;: &quot;your-token-here&quot;}&#39;&gt;&lt;/script&gt;
</code></pre>

<p>只需要在 Cloudflare Dashboard → Web Analytics 中添加站点，获取 token 后填入即可。</p>
<h2>效果总结</h2>
<h3>仓库体积</h3>
<table>
<thead>
<tr>
<th>项目</th>
<th>优化前</th>
<th>优化后</th>
</tr>
</thead>
<tbody>
<tr>
<td>死文件</td>
<td>4.4MB 图片 + 20KB JS</td>
<td>0</td>
</tr>
<tr>
<td>内联 CSS</td>
<td>262KB（66篇×4KB）</td>
<td>6.7KB article.css</td>
</tr>
<tr>
<td>内联 JS</td>
<td>~80行/篇</td>
<td>3KB article.js</td>
</tr>
<tr>
<td>总节省</td>
<td>-</td>
<td>~252KB + 4.4MB</td>
</tr>
</tbody>
</table>
<h3>加载性能</h3>
<table>
<thead>
<tr>
<th>指标</th>
<th>优化前</th>
<th>优化后</th>
</tr>
</thead>
<tbody>
<tr>
<td>404 请求</td>
<td>66个文章页各1个</td>
<td>0</td>
</tr>
<tr>
<td>重复 CSS 下载</td>
<td>每篇 4KB</td>
<td>缓存后 0</td>
</tr>
<tr>
<td>缓存命中率</td>
<td>低（无版本化）</td>
<td>高（hash 版本化）</td>
</tr>
<tr>
<td>移动端 TOC</td>
<td>不可用</td>
<td>抽屉式可用</td>
</tr>
</tbody>
</table>
<h3>SEO 改善</h3>
<table>
<thead>
<tr>
<th>指标</th>
<th>优化前</th>
<th>优化后</th>
</tr>
</thead>
<tbody>
<tr>
<td>sitemap 文章数</td>
<td>32</td>
<td>66</td>
</tr>
<tr>
<td>JSON-LD 结构化数据</td>
<td>无</td>
<td>66篇全有</td>
</tr>
<tr>
<td>og:image</td>
<td>404</td>
<td>正常显示</td>
</tr>
<tr>
<td>RSS 订阅</td>
<td>10篇</td>
<td>20篇</td>
</tr>
</tbody>
</table>
<h2>经验总结</h2>
<h3>1. 静态站也需要定期维护</h3>
<p>静态网站不是"设好就忘"的。随着内容增长，会积累死文件、幽灵引用、内联代码膨胀等问题。建议每季度做一次全面体检。</p>
<h3>2. 内联代码是万恶之源</h3>
<p>内联 CSS 和 JS 虽然方便，但会导致：
- 重复代码膨胀
- 浏览器无法缓存
- 维护困难（改一处要更新所有页面）
- 容易引发冲突</p>
<p>尽量抽到外部文件，用缓存策略管理版本。</p>
<h3>3. 抽离代码时注意执行时机</h3>
<p>内联脚本同步执行，外部脚本也是同步执行（除非加 defer/async），但放入外部文件后容易忽略 DOM 就绪问题。始终用 <code>DOMContentLoaded</code> 包裹是安全的做法。</p>
<h3>4. CI 自动化是关键</h3>
<p>手动维护缓存 hash、sitemap、索引等容易出错。用 GitHub Actions 自动化可以避免人为错误，每次提交自动更新所有依赖文件。</p>
<h3>5. 数据驱动优化</h3>
<p>不要凭感觉优化。用 <code>du</code>、<code>grep</code>、脚本统计来量化问题，优化后再验证效果。每一步优化都应该有可测量的数据支撑。</p>
