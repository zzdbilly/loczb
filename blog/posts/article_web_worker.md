# Web Worker 与前端多线程开发：把主线程从繁重计算中解放出来

JavaScript 从诞生之初就被设计为单线程语言，这在当时是合理的——浏览器的页面交互逻辑并不需要多线程的复杂性。然而，随着 Web 应用变得越来越复杂，Canvas 动画、大数据处理、密码学运算、音视频编码等计算密集型任务不断涌现，"单线程"这把双刃剑开始显露出它的另一面：一个长任务就能让整个页面卡死，用户的点击、滚动、输入全都得不到响应。

Web Worker 正是浏览器为应对这一困境提供的解决方案。它允许开发者在后台线程中运行 JavaScript，让主线程专注于 UI 渲染和用户交互，把繁重的计算任务交给 Worker 线程去处理。本文将从基础概念到进阶实践，全面解析 Web Worker 在前端开发中的应用。

## 为什么前端需要多线程

### JavaScript 单线程的限制

JavaScript 的"单线程"特性源于它的设计初衷：操作 DOM。如果允许多个线程同时操作 DOM，就会出现竞态条件——一个线程在删除节点，另一个线程同时在修改该节点的属性，结果将不可预测。为了避免这种复杂性，浏览器选择了单线程模型，通过事件循环（Event Loop）来调度所有任务。

```javascript
// 这段代码会阻塞主线程约 5 秒
function blockingTask() {
  const start = performance.now();
  while (performance.now() - start < 5000) {
    // 模拟繁重计算
    Math.sqrt(Math.random());
  }
  console.log('阻塞结束');
}

document.getElementById('btn').addEventListener('click', () => {
  blockingTask(); // 点击按钮后，页面卡死 5 秒
  console.log('按钮点击处理完成');
});
```

在这个例子中，当用户点击按钮后，整个页面会冻结 5 秒。期间用户无法滚动、无法输入、无法点击其他按钮——因为主线程被 `while` 循环完全占用了。

### 主线程阻塞的真实代价

主线程阻塞的代价远不止"卡顿"这么简单。从用户体验和业务指标来看，影响是全方位的：

**性能指标恶化**：Google 的 Core Web Vitals 中，INP（Interaction to Next Paint）直接衡量页面响应用户交互的速度。主线程长任务会严重拖累 INP 分数，影响 SEO 排名。

**交互反馈延迟**：用户点击后超过 50ms 没有视觉反馈，就会产生"延迟"感；超过 100ms 会感到"卡顿"；超过 1000ms，用户很可能认为页面已经崩溃。

```javascript
// 使用 PerformanceObserver 检测长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`长任务警告: ${entry.duration.toFixed(2)}ms`, entry);
    }
  }
});

observer.observe({ type: 'longtask', buffered: true });
```

**浏览器无响应警告**：Chromium 内核浏览器对长时间阻塞的主线程有"页面无响应"对话框。当脚本连续运行超过一定时间，浏览器会弹出警告，用户可能选择直接关闭页面。

```javascript
// 模拟触发浏览器无响应警告的场景
// 在循环中不加任何 yield，纯计算数百万次
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 计算 fib(45) 在主线程可能耗时数十秒
console.time('fib(45) main-thread');
fibonacci(45);
console.timeEnd('fib(45) main-thread');
// 期间页面完全冻结，浏览器可能弹出"页面无响应"警告
```

### Web Worker 的基本概念

Web Worker 是浏览器提供的在后台线程中运行脚本的机制。它运行在独立于主线程的上下文中，有自己的事件循环，通过消息传递与主线程通信。

```javascript
// 主线程 (main.js)
const worker = new Worker('worker.js');

// 向 Worker 发送消息
worker.postMessage({ type: 'fibonacci', data: 45 });

// 接收 Worker 返回的结果
worker.onmessage = (event) => {
  console.log('计算结果:', event.data.result);
  console.timeEnd('fib-calculation');
};

worker.onerror = (error) => {
  console.error('Worker 错误:', error.message);
};

console.time('fib-calculation');
// 主线程不会被阻塞，UI 保持响应
document.getElementById('loading').textContent = '计算中...';
```

```javascript
// Worker 线程 (worker.js)
self.onmessage = (event) => {
  const { type, data } = event.data;
  
  if (type === 'fibonacci') {
    const result = fibonacci(data);
    // 将结果发送回主线程
    self.postMessage({ type: 'fibonacci', result });
  }
};

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
```

Worker 线程是一个独立的全局上下文，不是 `window` 的子集。在 Worker 中可以访问：

| 可用 | 不可用 |
|------|--------|
| `navigator`、`location`（只读） | `window`、`document` |
| `fetch`、`XMLHttpRequest` | DOM 操作相关 API |
| `setTimeout`、`setInterval` | `localStorage`（部分浏览器支持 `navigator.storage`） |
| `importScripts()` | `alert`、`confirm` 等对话框 |

## Worker 类型全解析

### Dedicated Worker：一对一的专用线程

Dedicated Worker 是最基本的 Worker 类型，由单个页面创建和使用。它的生命周期与创建它的页面绑定——页面关闭后，Worker 也会被终止。

```javascript
// 创建 Dedicated Worker 的几种方式

// 1. 从外部脚本文件创建（最常用）
const worker = new Worker('/workers/heavy-task.js');

// 2. 从 Blob URL 创建（适合内联脚本）
const blob = new Blob([`
  self.onmessage = function(e) {
    const result = e.data.map(x => x * 2);
    self.postMessage(result);
  };
`], { type: 'application/javascript' });

const blobUrl = URL.createObjectURL(blob);
const inlineWorker = new Worker(blobUrl);
URL.revokeObjectURL(blobUrl); // 释放 Blob URL

// 3. 使用 { type: 'module' } 选项支持 ES Module
const moduleWorker = new Worker('/workers/compute.js', { type: 'module' });
// 在 worker.js 中可以使用 import 语句
// import { heavyCalculation } from './utils.js';

// 终止 Worker
worker.terminate();
```

Dedicated Worker 的特点：

- **一对一绑定**：每个 Worker 实例只服务于创建它的页面
- **双向通信**：通过 `postMessage` 和 `onmessage` 收发数据
- **可主动终止**：调用 `terminate()` 立即结束 Worker
- **内存独立**：每个 Worker 有自己的堆内存，不共享变量

### Shared Worker：多页面共享的线程

Shared Worker 允许多个页面（同源）共享同一个 Worker 实例，非常适合需要跨标签页同步数据或共享连接的场景，比如 WebSocket 连接的复用。

```javascript
// main.js（主线程，可在多个同源页面中运行）
const sharedWorker = new SharedWorker('/workers/shared-ws.js');

// Shared Worker 通过 port 通信
sharedWorker.port.start(); // 必须先调用 start()

// 发送消息
sharedWorker.port.postMessage({
  action: 'subscribe',
  channel: 'chat-room-1'
});

// 接收消息
sharedWorker.port.onmessage = (e) => {
  const { action, data } = e.data;
  if (action === 'message') {
    console.log('收到消息:', data);
    appendMessage(data);
  }
};

// 页面关闭时通知 Worker
window.addEventListener('beforeunload', () => {
  sharedWorker.port.postMessage({ action: 'close' });
});
```

```javascript
// workers/shared-ws.js（Shared Worker 内部）
const connections = new Map();
let ws = null;

// 使用 onconnect 处理新连接
self.onconnect = (e) => {
  const port = e.ports[0];
  const clientId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  
  connections.set(clientId, port);
  console.log(`新连接: ${clientId}，当前连接数: ${connections.size}`);
  
  port.onmessage = (event) => {
    const { action, channel, data } = event.data;
    
    switch (action) {
      case 'subscribe':
        if (!ws) {
          initializeWebSocket(channel);
        }
        break;
      case 'send':
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
        break;
      case 'close':
        connections.delete(clientId);
        if (connections.size === 0 && ws) {
          ws.close();
          ws = null;
        }
        break;
    }
  };
  
  port.start();
  
  // 向新加入的客户端广播当前连接数
  port.postMessage({ action: 'status', data: `当前 ${connections.size} 个标签页已连接` });
};

function initializeWebSocket(channel) {
  ws = new WebSocket(`wss://example.com/ws/${channel}`);
  
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    // 向所有连接的页面广播消息
    connections.forEach((port) => {
      port.postMessage({ action: 'message', data: msg });
    });
  };
  
  ws.onclose = () => {
    ws = null;
    connections.forEach((port) => {
      port.postMessage({ action: 'status', data: '连接已断开' });
    });
  };
}
```

### Service Worker：不只是多线程

Service Worker 虽然名字里有 "Worker"，但它的定位和 Dedicated/Shared Worker 完全不同。它是一个位于浏览器与服务器之间的**可编程网络代理**，核心价值是离线缓存和后台同步，而非纯粹的计算。

```javascript
// sw.js（Service Worker 文件）
const CACHE_NAME = 'my-app-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png'
];

// 安装阶段：预缓存关键资源
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('预缓存资源');
      return cache.addAll(urlsToCache);
    }).then(() => {
      // 强制新 SW 立即接管（跳过 waiting 状态）
      return self.skipWaiting();
    })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('Service Worker 已激活');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // 立即接管所有页面
      return self.clients.claim();
    })
  );
});

// 拦截请求：实现缓存策略（Stale-While-Revalidate）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 并行发起网络请求
      const networkFetch = fetch(event.request).then((response) => {
        // 将新响应存入缓存
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      });
      
      // 立即返回缓存（如果存在），同时刷新缓存
      return cachedResponse || networkFetch;
    })
  );
});
```

```javascript
// 主线程注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    }).then((registration) => {
      console.log('Service Worker 注册成功，scope:', registration.scope);
      
      // 监听更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('新版本可用！');
            // 提示用户刷新
            showUpdateBanner();
          }
        });
      });
    }).catch((error) => {
      console.error('Service Worker 注册失败:', error);
    });
  });
}
```

### 三种 Worker 对比总结

| 特性 | Dedicated Worker | Shared Worker | Service Worker |
|------|-----------------|---------------|----------------|
| **作用域** | 单页面 | 同源多页面 | 同源多页面（含未打开的页面）
| **生命周期** | 随页面销毁 | 所有关联页面关闭后 | 独立于页面，浏览器管理 |
| **DOM 访问** | ❌ | ❌ | ❌ |
| **通信方式** | `postMessage` 双向 | `port.postMessage` 双向 | `postMessage` + `MessageChannel` |
| **典型场景** | 计算密集型任务 | WebSocket 共享、状态同步 | 离线缓存、推送通知、后台同步 |
| **调试入口** | DevTools → Sources → Workers | DevTools → Sources → Workers | DevTools → Application → Service Workers |
| **内存模型** | 独立堆 | 共享堆 | 独立堆 |

## Worker 通信机制深入

### postMessage 与结构化克隆

主线程与 Worker 之间的通信依赖 `postMessage` 方法。当数据被发送时，浏览器会执行**结构化克隆算法**（Structured Clone Algorithm）来复制数据。

```javascript
// 主线程
const worker = new Worker('worker.js');

// 可以传递多种数据类型
worker.postMessage({
  array: [1, 2, 3],
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  date: new Date(),
  regexp: /hello/gi,
  buffer: new ArrayBuffer(16),
  typedArray: new Uint8Array([1, 2, 3]),
  // ❌ 不能传递：函数、DOM 节点、Error 对象（部分）
});

// Worker 线程
self.onmessage = (e) => {
  console.log(e.data.map instanceof Map); // true
  // 注意：这是副本，修改不会影响主线程
  e.data.map.set('new', 'value');
  console.log(e.data.map.size); // 2
};
```

结构化克隆的特点：

- ✅ **支持的类型**：基本类型、Array、Object、Date、RegExp、Map、Set、ArrayBuffer、TypedArray、Blob、File
- ❌ **不支持的类型**：Function、DOM 节点、Error 对象、Symbol、WeakMap/WeakSet
- ⚠️ **注意**：克隆的是**深拷贝**副本，Worker 修改数据不会影响主线程中的原始数据

### Transferable Objects：零拷贝传递

对于大数据（尤其是 `ArrayBuffer`），结构化克隆的开销很大。`postMessage` 提供了 `transfer` 选项，可以**转移所有权**而非复制，实现零拷贝传递。

```javascript
// 主线程
const worker = new Worker('image-processor.js');

// 创建一个大缓冲区（模拟图片数据）
const pixelData = new Uint8Array(10 * 1024 * 1024); // 10MB
// 填充模拟数据
for (let i = 0; i < pixelData.length; i++) {
  pixelData[i] = i % 256;
}

console.log('转移前 buffer 长度:', pixelData.buffer.byteLength); // 10485760

// 使用 transfer 转移所有权
worker.postMessage(
  { pixelData }, 
  [pixelData.buffer] // 第二个参数：要转移所有权的对象列表
);

// 转移后，原 buffer 被置零
console.log('转移后 buffer 长度:', pixelData.buffer.byteLength); // 0
console.log('原始数组长度:', pixelData.length); // 0
// ⚠️ 转移后主线程不能再使用该数据
```

```javascript
// Worker 线程 (image-processor.js)
self.onmessage = (e) => {
  const { pixelData } = e.data;
  
  console.log('收到数据大小:', pixelData.length); // 10485760
  console.log('开始处理图像...');
  
  // 在 Worker 中处理像素数据（例如应用滤镜）
  for (let i = 0; i < pixelData.length; i += 4) {
    // 灰度化：R = G = B = 加权平均值
    const gray = pixelData[i] * 0.299 + pixelData[i + 1] * 0.587 + pixelData[i + 2] * 0.114;
    pixelData[i] = gray;     // R
    pixelData[i + 1] = gray; // G
    pixelData[i + 2] = gray; // B
  }
  
  // 处理完成后，将结果转移回主线程
  self.postMessage(
    { processedData: pixelData, status: 'done' },
    [pixelData.buffer]
  );
};
```

Transferable 对象的优势：

| 传递方式 | 10MB ArrayBuffer | 100MB ArrayBuffer |
|----------|-----------------|-------------------|
| 结构化克隆（复制） | ~15-30ms | ~150-300ms |
| Transfer（转移） | < 1ms | < 1ms |
| 结果 | 主线程仍可用 | 主线程数据被"清空" |

### MessageChannel 与广播通信

`MessageChannel` 提供了一对一的双向通信管道，非常适合在复杂的多 Worker 场景中建立精确的点对点连接。

```javascript
// 主线程
const worker1 = new Worker('worker-a.js');
const worker2 = new Worker('worker-b.js');

// 创建 MessageChannel
const channel = new MessageChannel();

// worker1 使用 port1，worker2 使用 port2
worker1.postMessage({ type: 'connect', port: channel.port1 }, [channel.port1]);
worker2.postMessage({ type: 'connect', port: channel.port2 }, [channel.port2]);

// 现在 worker1 和 worker2 可以互相直接通信，无需经过主线程中转
```

```javascript
// worker-a.js
let peerPort = null;

self.onmessage = (e) => {
  if (e.data.type === 'connect') {
    peerPort = e.data.port;
    
    peerPort.onmessage = (event) => {
      console.log('worker-a 收到来自 worker-b 的直接消息:', event.data);
    };
    
    // 向 worker-b 发送消息
    peerPort.postMessage({ greeting: '你好，我是 Worker A！' });
  }
};
```

```javascript
// worker-b.js
let peerPort = null;

self.onmessage = (e) => {
  if (e.data.type === 'connect') {
    peerPort = e.data.port;
    
    peerPort.onmessage = (event) => {
      console.log('worker-b 收到来自 worker-a 的直接消息:', event.data);
      // 回复
      peerPort.postMessage({ reply: '你好 Worker A，消息已收到！' });
    };
  }
};
```

如果需要一对多的广播模式，可以利用 `BroadcastChannel` API（在 Worker 中同样可用）：

```javascript
// 可在主线程或任一 Worker 中使用
const bc = new BroadcastChannel('global-state');

// 发送广播
bc.postMessage({ type: 'theme-changed', theme: 'dark' });

// 接收广播
bc.onmessage = (event) => {
  console.log('收到广播:', event.data);
  if (event.data.type === 'theme-changed') {
    // 更新主题
  }
};

// 关闭频道
bc.close();
```

## Comlink：让 Worker 通信像调用函数

### Comlink 的基本用法

原生的 `postMessage` 回调模式在复杂场景下容易产生"回调地狱"，类型也很难保证。Google Chrome 团队开源的 Comlink 库通过 Proxy 代理，让跨线程通信变得像是普通的函数调用。

```bash
npm install comlink
```

```javascript
// math.worker.js
import { expose } from 'comlink';

const mathAPI = {
  add(a, b) {
    return a + b;
  },
  
  factorial(n) {
    if (n <= 1) return 1n;
    let result = 1n;
    for (let i = 2n; i <= n; i++) {
      result *= i;
    }
    return result;
  },
  
  async processLargeArray(data) {
    // 模拟耗时计算
    const result = data.map(x => x * x).filter(x => x % 2 === 0);
    return result;
  },
  
  // 支持事件回调
  onProgress: null,
  
  async longRunningTask(nums) {
    const results = [];
    for (let i = 0; i < nums.length; i++) {
      results.push(await this.compute(nums[i]));
      // 通过回调报告进度
      if (this.onProgress) {
        this.onProgress(i + 1, nums.length);
      }
    }
    return results;
  },
  
  compute(n) {
    // 模拟耗时计算
    let sum = 0;
    for (let i = 0; i < n * 1000000; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  }
};

expose(mathAPI);
```

```javascript
// main.js（主线程）
import { wrap } from 'comlink';

const worker = new Worker(new URL('./math.worker.js', import.meta.url), {
  type: 'module'
});

// wrap 让 worker 的方法调用看起来是普通的异步函数
const mathAPI = wrap(worker);

async function main() {
  // 像调用本地函数一样使用 Worker 中的方法
  const sum = await mathAPI.add(10, 20);
  console.log('加法结果:', sum); // 30
  
  const fact = await mathAPI.factorial(50n);
  console.log('阶乘结果:', fact.toString());
  
  // 设置进度回调
  mathAPI.onProgress = (current, total) => {
    console.log(`计算进度: ${current}/${total}`);
  };
  
  const results = await mathAPI.longRunningTask([1, 2, 3, 4, 5]);
  console.log('任务完成:', results);
}

main();
```

### 使用 TypeScript 保证类型安全

Comlink 的另一个重要优势是类型安全——如果你使用 TypeScript，可以定义共享接口，获得完整的类型检查和智能提示。

```typescript
// types/worker-api.ts
export interface MathWorkerAPI {
  add(a: number, b: number): Promise<number>;
  factorial(n: bigint): Promise<bigint>;
  processLargeArray(data: number[]): Promise<number[]>;
  
  // 回调属性
  onProgress: ((current: number, total: number) => void) | null;
  
  longRunningTask(nums: number[]): Promise<number[]>;
  compute(n: number): Promise<number>;
}
```

```typescript
// math.worker.ts
import { expose } from 'comlink';
import type { MathWorkerAPI } from './types/worker-api';

const mathAPI: MathWorkerAPI & { 
  compute(n: number): number  // 内部实现是非异步的
} = {
  add(a: number, b: number): number {
    return a + b;
  },
  
  factorial(n: bigint): bigint {
    if (n <= 1n) return 1n;
    let result = 1n;
    for (let i = 2n; i <= n; i++) {
      result *= i;
    }
    return result;
  },
  
  async processLargeArray(data: number[]): Promise<number[]> {
    return data.map(x => x * x).filter(x => x % 2 === 0);
  },
  
  onProgress: null,
  
  async longRunningTask(nums: number[]): Promise<number[]> {
    const results: number[] = [];
    for (let i = 0; i < nums.length; i++) {
      results.push(this.compute(nums[i]));
      this.onProgress?.(i + 1, nums.length);
    }
    return results;
  },
  
  compute(n: number): number {
    let sum = 0;
    for (let i = 0; i < n * 1000000; i++) {
      sum += Math.sqrt(i);
    }
    return sum;
  }
};

expose(mathAPI);
```

```typescript
// main.ts（主线程，完整类型检查）
import { wrap, Remote } from 'comlink';
import type { MathWorkerAPI } from './types/worker-api';

const worker = new Worker(
  new URL('./math.worker.ts', import.meta.url),
  { type: 'module' }
);

const mathAPI = wrap<MathWorkerAPI>(worker);

async function main() {
  // ✅ 完整的类型安全和智能提示
  const result = await mathAPI.add(1, 2);
  // ✅ 编译时报错：参数类型不匹配
  // const error = await mathAPI.add("1", "2"); ❌
}
```

### Comlink 的原理简析

Comlink 的核心原理并不复杂，可以分为几层：

**1. Proxy 拦截**：`wrap()` 返回的 Proxy 对象会拦截所有属性访问和方法调用，将其转换为 RPC（Remote Procedure Call）消息。

**2. 请求-响应模式**：每次方法调用生成一个唯一 ID，通过 `postMessage` 发送到 Worker 侧执行，Worker 完成后再将结果通过消息返回。

**3. Transfer 自动识别**：Comlink 会自动识别 Transferable 对象并使用 `transfer` 参数传递，避免不必要的复制。

```javascript
// Comlink 核心原理的精简实现（不是完整代码，仅示意）
function wrap(worker) {
  const pending = new Map();
  let uid = 0;
  
  worker.onmessage = (e) => {
    const { id, result, error } = e.data;
    const { resolve, reject } = pending.get(id);
    pending.delete(id);
    if (error) reject(new Error(error));
    else resolve(result);
  };
  
  const handler = {
    get(target, prop) {
      return (...args) => {
        return new Promise((resolve, reject) => {
          const id = ++uid;
          pending.set(id, { resolve, reject });
          
          worker.postMessage({
            id,
            call: prop,
            args
          });
        });
      };
    }
  };
  
  return new Proxy({}, handler);
}
```

## Worker 池与任务调度

### 为什么需要 Worker 池

单个 Worker 仍然是单线程的——如果提交给 Worker 的任务是串行处理的，大量任务会排队等待。而创建和销毁 Worker 的开销也不小（内存、线程创建）。

Worker 池解决两个核心问题：

1. **并行处理**：利用多个 Worker 实例并行执行任务，充分利用多核 CPU
2. **资源复用**：避免频繁创建/销毁 Worker，池化管理复用实例

```javascript
// 理想并行度：取 CPU 核心数和任务数的较小值
const idealConcurrency = Math.min(
  navigator.hardwareConcurrency || 4,
  tasks.length
);
console.log(`使用 ${idealConcurrency} 个 Worker 并行处理`);
```

### 实现一个简单的 Worker 池

```javascript
// worker-pool.js
class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency || 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.taskQueue = [];
    this.availableWorkers = [];
    
    this._initialize();
  }
  
  _initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript, { type: 'module' });
      const workerId = i;
      
      worker.onmessage = (e) => {
        // Worker 完成任务，归还到可用池
        this.availableWorkers.push(workerId);
        
        // 执行任务回调
        const task = this.workers[workerId].currentTask;
        if (task) {
          task.resolve(e.data);
          this.workers[workerId].currentTask = null;
        }
        
        // 如果有排队任务，立即分派
        if (this.taskQueue.length > 0) {
          this._dispatch(this.taskQueue.shift());
        }
      };
      
      worker.onerror = (e) => {
        const task = this.workers[i].currentTask;
        if (task) {
          task.reject(new Error(e.message));
          this.workers[i].currentTask = null;
        }
        this.availableWorkers.push(i);
      };
      
      this.workers.push({ worker, currentTask: null });
      this.availableWorkers.push(i);
    }
  }
  
  exec(data, transferables) {
    return new Promise((resolve, reject) => {
      const task = { data, transferables, resolve, reject };
      // 取消令牌
      task.cancelled = false;
      task.abort = () => { task.cancelled = true; };
      
      if (this.availableWorkers.length > 0) {
        this._dispatch(task);
      } else {
        this.taskQueue.push(task);
      }
    });
  }
  
  _dispatch(task) {
    if (task.cancelled) return;
    
    const workerId = this.availableWorkers.shift();
    const { worker } = this.workers[workerId];
    this.workers[workerId].currentTask = task;
    
    worker.postMessage(task.data, task.transferables || []);
  }
  
  // 批量处理：自动分配任务到空闲 Worker
  async execAll(tasks) {
    const results = await Promise.all(
      tasks.map(task => this.exec(task.data, task.transferables))
    );
    return results;
  }
  
  // 终止所有 Worker
  terminate() {
    this.workers.forEach(({ worker }) => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
  }
}

export default WorkerPool;
```

使用 Worker 池的示例：

```javascript
// main.js
import WorkerPool from './worker-pool.js';

// 创建一个包含 4 个 Worker 的池
const pool = new WorkerPool(
  new URL('./heavy-task.worker.js', import.meta.url),
  4
);

// 假设有 100 个文件需要哈希计算
const files = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  data: crypto.getRandomValues(new Uint8Array(1024 * 1024)) // 1MB 随机数据
}));

console.time('parallel-processing');

const tasks = files.map((file, idx) => ({
  data: { id: file.id, data: file.data.buffer },
  transferables: [file.data.buffer]
}));

// 提交所有任务，池自动调度
await pool.execAll(tasks);

console.timeEnd('parallel-processing');

// 清理
pool.terminate();
```

### 任务优先级与取消

真实的业务场景中，并非所有任务都同等重要。为 Worker 池添加优先级和取消机制非常必要：

```javascript
// priority-worker-pool.js
class PriorityWorkerPool extends WorkerPool {
  constructor(workerScript, poolSize) {
    super(workerScript, poolSize);
    this.taskQueue = []; 
    // 任务队列现在按优先级排序
  }
  
  exec(data, transferables, priority = 0) {
    return new Promise((resolve, reject) => {
      const task = { 
        data, transferables, resolve, reject, 
        priority, cancelled: false,
        id: `task-${Date.now()}-${Math.random().toString(36)}`
      };
      
      // 注册取消令牌
      task.abort = () => { 
        task.cancelled = true;
        // 从队列中移除
        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
      };
      
      if (this.availableWorkers.length > 0) {
        this._dispatch(task);
      } else {
        // 按优先级插入队列（高优先级在前）
        this.taskQueue.push(task);
        this.taskQueue.sort((a, b) => b.priority - a.priority);
      }
    });
  }
  
  // 可取消的任务包装器
  execWithTimeout(data, transferables, timeoutMs, priority = 0) {
    const task = this.exec(data, transferables, priority);
    
    const timeout = new Promise((_, reject) => {
      setTimeout(() => {
        task.then(t => t.abort?.());
        reject(new Error(`任务超时 (${timeoutMs}ms)`));
      }, timeoutMs);
    });
    
    return Promise.race([task, timeout]);
  }
}
```

## 实战场景

### 场景一：图片处理与压缩

图片上传是前端最常见的计算密集型场景之一。在 Worker 中处理图片可以避免阻塞 UI。

```javascript
// image-compress.worker.js
self.onmessage = async (e) => {
  const { imageData, quality = 0.7, maxWidth = 1920, maxHeight = 1080 } = e.data;
  
  try {
    // 从 ArrayBuffer 创建 ImageBitmap
    const bitmap = await createImageBitmap(
      new Blob([imageData])
    );
    
    // 计算缩放比例（保持宽高比）
    let { width, height } = bitmap;
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }
    
    // 使用 OffscreenCanvas 在 Worker 中处理图片
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 绘制缩放后的图片
    ctx.drawImage(bitmap, 0, 0, width, height);
    
    // 导出为压缩后的 Blob
    const blob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: quality
    });
    
    // 将压缩结果返回主线程
    const resultBuffer = await blob.arrayBuffer();
    self.postMessage(
      { 
        success: true, 
        buffer: resultBuffer,
        originalSize: imageData.byteLength,
        compressedSize: resultBuffer.byteLength,
        dimensions: { width, height }
      },
      [resultBuffer] // 使用 Transferable 避免复制
    );
    
    bitmap.close();
    
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
```

```javascript
// main.js（主线程使用示例）
const compressWorker = new Worker(
  new URL('./image-compress.worker.js', import.meta.url),
  { type: 'module' }
);

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const arrayBuffer = reader.result;
      
      compressWorker.onmessage = (e) => {
        if (e.data.success) {
          console.log(
            `压缩完成: ${(e.data.originalSize / 1024).toFixed(1)}KB → ` +
            `${(e.data.compressedSize / 1024).toFixed(1)}KB ` +
            `(${(e.data.compressedSize / e.data.originalSize * 100).toFixed(1)}%)`
          );
          resolve(e.data);
        } else {
          reject(new Error(e.data.error));
        }
      };
      
      compressWorker.postMessage(
        { imageData: arrayBuffer, quality: 0.6, maxWidth: 1280 },
        [arrayBuffer]
      );
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// 批量压缩（利用 Worker 池并行，每张图用独立的 Worker 调用）
document.getElementById('upload').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  const results = await Promise.all(files.map(compressImage));
  console.log(`${results.length} 张图片压缩完成`);
});
```

### 场景二：大数据 JSON 解析

当 JSON 数据量很大（比如几 MB 以上的 API 响应），在主线程中解析会阻塞渲染。`JSON.parse` 虽然很快，但几 MB 的数据仍然可能需要十几毫秒甚至更多，更重要的是解析后的对象会占用大量堆内存，触发 GC 暂停。

```javascript
// json-parse.worker.js
self.onmessage = (e) => {
  const { rawText, options } = e.data;
  
  try {
    console.time('worker-json-parse');
    const parsed = JSON.parse(rawText);
    console.timeEnd('worker-json-parse');
    
    // 可选：只提取需要的字段，减小返回数据量
    let result = parsed;
    if (options && options.fields) {
      result = applyFieldFilter(parsed, options.fields);
    }
    
    self.postMessage({ success: true, data: result });
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error.message,
      position: extractErrorPosition(error.message, rawText)
    });
  }
};

function applyFieldFilter(obj, fields) {
  if (Array.isArray(obj)) {
    return obj.map(item => applyFieldFilter(item, fields));
  }
  if (typeof obj === 'object' && obj !== null) {
    const filtered = {};
    for (const key of fields) {
      if (obj.hasOwnProperty(key)) {
        filtered[key] = obj[key];
      }
    }
    return filtered;
  }
  return obj;
}

function extractErrorPosition(message, text) {
  const match = message.match(/position (\d+)/);
  if (match) {
    const pos = parseInt(match[1]);
    const start = Math.max(0, pos - 50);
    const end = Math.min(text.length, pos + 50);
    return text.slice(start, end).replace(/\n/g, '\\n');
  }
  return null;
}
```

```javascript
// main.js
const jsonWorker = new Worker(
  new URL('./json-parse.worker.js', import.meta.url)
);

async function parseLargeJSON(url, options) {
  // 先异步获取文本（不阻塞主线程）
  const response = await fetch(url);
  const rawText = await response.text();
  
  console.log(`JSON 文本大小: ${(rawText.length / 1024 / 1024).toFixed(2)}MB`);
  
  return new Promise((resolve, reject) => {
    jsonWorker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.data);
      } else {
        console.error('JSON 解析错误位置:', e.data.position);
        reject(new Error(e.data.error));
      }
    };
    
    jsonWorker.postMessage({ rawText, options });
  });
}

// 使用示例：解析大型 API 响应，仅保留必要字段
const data = await parseLargeJSON('/api/large-dataset.json', {
  fields: ['id', 'name', 'price', 'stock', 'category']
});
```

### 场景三：实时搜索与过滤

对于实时搜索功能，当数据集很大时，需要在 Worker 中进行过滤和排序，保持输入框的流畅响应。

```javascript
// search.worker.js
let documents = [];
let searchIndex = new Map(); // 简单的倒排索引

self.onmessage = (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'init':
      documents = payload.documents;
      buildIndex(documents, payload.searchFields);
      self.postMessage({ type: 'ready', count: documents.length });
      break;
      
    case 'search':
      const results = search(payload.query, payload.options);
      self.postMessage({ 
        type: 'results', 
        query: payload.query,
        results: results.slice(0, payload.options?.limit || 50),
        total: results.length
      });
      break;
      
    case 'add':
      documents.push(payload.document);
      addToIndex(payload.document, documents.length - 1, payload.fields);
      break;
  }
};

function buildIndex(docs, fields) {
  searchIndex.clear();
  
  docs.forEach((doc, id) => {
    for (const field of fields) {
      const text = String(doc[field] || '').toLowerCase();
      const tokens = tokenize(text);
      
      for (const token of tokens) {
        if (!searchIndex.has(token)) {
          searchIndex.set(token, new Set());
        }
        searchIndex.get(token).add(id);
      }
    }
  });
}

function tokenize(text) {
  // 中文按单个字+双字组合，英文按单词
  const segments = [];
  
  // 提取英文单词
  const words = text.match(/[a-zA-Z]+/g) || [];
  segments.push(...words.map(w => w.toLowerCase()));
  
  // 中文分词（简单的二元组+单元）
  const chinese = text.replace(/[^\\u4e00-\\u9fff]/g, '');
  for (let i = 0; i < chinese.length; i++) {
    segments.push(chinese[i]); // 单字
    if (i < chinese.length - 1) {
      segments.push(chinese[i] + chinese[i + 1]); // 双字
    }
  }
  
  return segments;
}

function search(query, options = {}) {
  if (!query || query.trim() === '') {
    return documents.map((doc, id) => ({ ...doc, _id: id, _score: 0 }));
  }
  
  const tokens = tokenize(query.toLowerCase());
  const scores = new Map();
  
  for (const token of tokens) {
    const matchedIds = searchIndex.get(token);
    if (matchedIds) {
      for (const id of matchedIds) {
        scores.set(id, (scores.get(id) || 0) + 1);
      }
    }
  }
  
  // 转换为结果数组并排序
  const results = Array.from(scores.entries())
    .map(([id, score]) => ({
      ...documents[id],
      _id: id,
      _score: score
    }))
    .sort((a, b) => b._score - a._score);
  
  // 添加模糊匹配（包含查询字符串但未被分词的文档）
  if (options.fuzzy !== false && results.length < 10) {
    const queryLower = query.toLowerCase();
    const existing = new Set(results.map(r => r._id));
    
    for (let i = 0; i < documents.length; i++) {
      if (!existing.has(i)) {
        const text = options.searchFields
          .map(f => String(documents[i][f] || '').toLowerCase())
          .join(' ');
        if (text.includes(queryLower)) {
          results.push({ ...documents[i], _id: i, _score: 0.5 });
        }
      }
    }
  }
  
  return results;
}

function addToIndex(doc, id, fields) {
  for (const field of fields) {
    const text = String(doc[field] || '').toLowerCase();
    const tokens = tokenize(text);
    
    for (const token of tokens) {
      if (!searchIndex.has(token)) {
        searchIndex.set(token, new Set());
      }
      searchIndex.get(token).add(id);
    }
  }
}
```

```javascript
// main.js（主线程实时搜索）
const searchWorker = new Worker(
  new URL('./search.worker.js', import.meta.url),
  { type: 'module' }
);

let lastQuery = '';

searchWorker.onmessage = (e) => {
  if (e.data.type === 'results') {
    // 忽略过期的搜索结果（用户可能已经输入了新查询）
    if (e.data.query !== lastQuery) return;
    
    renderResults(e.data.results, e.data.total);
  }
};

// 防抖搜索
function debouncedSearch(query, delay = 150) {
  clearTimeout(debouncedSearch.timer);
  debouncedSearch.timer = setTimeout(() => {
    lastQuery = query;
    searchWorker.postMessage({ 
      type: 'search', 
      payload: { 
        query, 
        options: { limit: 20, fuzzy: true }
      } 
    });
  }, delay);
}

// 初始化搜索数据
async function initializeSearch() {
  const response = await fetch('/api/products.json');
  const products = await response.json();
  
  searchWorker.postMessage({
    type: 'init',
    payload: {
      documents: products,
      searchFields: ['name', 'description', 'category', 'brand']
    }
  });
}

function renderResults(results, total) {
  const container = document.getElementById('search-results');
  container.innerHTML = `
    <div class="search-summary">找到 ${total} 个结果</div>
    ${results.map(r => `
      <div class="search-item" data-id="${r._id}">
        <h4>${highlightMatch(r.name, lastQuery)}</h4>
        <p>${highlightMatch(r.description?.slice(0, 100), lastQuery)}</p>
        <span class="search-score">相关性: ${(r._score * 100 / tokens(lastQuery).length).toFixed(0)}%</span>
      </div>
    `).join('')}
  `;
}

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function tokens(q) { return (q.match(/[^\\s]+/g) || []).length; }
```

## 调试与性能分析

### Chrome DevTools 中的 Worker 调试

Chrome DevTools 为 Worker 提供了完善的调试支持，但需要知道在哪里找到它们。

**1. Sources 面板中的 Worker 线程**

在 Sources 面板左侧的文件树中，会有一个独立的 "Workers" 部分，列出所有活跃的 Worker 线程。点击 Worker 条目可以打开该线程的调试上下文，可以设置断点、查看调用栈和变量。

```
Sources 面板结构：
📁 Page
  📄 (index)
  📄 main.js
  ...
📁 Workers
  📄 DedicatedWorker #1 (worker.js)
  📄 DedicatedWorker #2 (search.worker.js)
  📄 SharedWorker #1 (shared-ws.js)
```

**2. Performance 面板分析 Worker 性能**

Performance 面板可以记录 Worker 线程的执行时间，帮助你分析性能瓶颈：

```javascript
// 在代码中标记性能测量点
// 主线程
performance.mark('worker-task-start');
worker.postMessage({ data: largeArray });
worker.onmessage = () => {
  performance.mark('worker-task-end');
  performance.measure('worker-task', 'worker-task-start', 'worker-task-end');
  
  const measure = performance.getEntriesByName('worker-task')[0];
  console.log(`Worker 任务耗时: ${measure.duration.toFixed(2)}ms`);
};
```

**3. console.log 的线程来源标识**

```javascript
// worker.js
console.log(`[Worker-${self.name || 'anonymous'}] 任务开始处理`);
// DevTools console 中会显示消息来自哪个 Worker 线程
```

### 性能指标与监控

要科学地评估 Worker 的效果，需要建立全面的监控体系：

```javascript
// perf-monitor.js - Worker 性能监控工具
class WorkerPerfMonitor {
  constructor(worker, label = 'worker') {
    this.worker = worker;
    this.label = label;
    this.metrics = [];
    
    // 包装 postMessage 以记录性能
    const originalPostMessage = worker.postMessage.bind(worker);
    worker.postMessage = (message, transfer) => {
      const taskId = `${label}-${Date.now()}`;
      const startTime = performance.now();
      
      // 拦截响应
      const originalHandler = worker.onmessage;
      worker.onmessage = (e) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        this.metrics.push({
          taskId,
          startTime,
          endTime,
          duration,
          messageSize: this._estimateSize(message),
          responseSize: this._estimateSize(e.data),
          timestamp: new Date()
        });
        
        // 保持指标数量在限制内
        if (this.metrics.length > 1000) {
          this.metrics.shift();
        }
        
        if (originalHandler) {
          originalHandler.call(worker, e);
        }
      };
      
      originalPostMessage(message, transfer);
    };
  }
  
  _estimateSize(obj) {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return 0;
    }
  }
  
  getStats() {
    if (this.metrics.length === 0) return null;
    
    const durations = this.metrics.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    
    // P50、P95、P99
    const sorted = [...durations].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    return {
      totalTasks: this.metrics.length,
      avgDuration: avg.toFixed(2),
      minDuration: min.toFixed(2),
      maxDuration: max.toFixed(2),
      p50: p50.toFixed(2),
      p95: p95.toFixed(2),
      p99: p99.toFixed(2),
      totalMsgSizeIn: this.metrics.reduce((s, m) => s + m.messageSize, 0),
      totalMsgSizeOut: this.metrics.reduce((s, m) => s + m.responseSize, 0)
    };
  }
  
  report() {
    const stats = this.getStats();
    if (!stats) return '暂无性能数据';
    
    return [
      `\n📊 Worker 性能报告 [${this.label}]`,
      `─────────────────────────────────`,
      `任务总数:     ${stats.totalTasks}`,
      `平均耗时:     ${stats.avgDuration}ms`,
      `最小耗时:     ${stats.minDuration}ms`,
      `最大耗时:     ${stats.maxDuration}ms`,
      `P50:          ${stats.p50}ms`,
      `P95:          ${stats.p95}ms`,
      `P99:          ${stats.p99}ms`,
      `入站数据:     ${(stats.totalMsgSizeIn / 1024).toFixed(1)}KB`,
      `出站数据:     ${(stats.totalMsgSizeOut / 1024).toFixed(1)}KB`,
    ].join('\n');
  }
}

// 使用示例
// const monitor = new WorkerPerfMonitor(worker, 'image-compress');
// ... 完成一批任务后 ...
// console.log(monitor.report());
```

### 常见陷阱与注意事项

在真实的项目中使用 Web Worker 时，有一些常见的陷阱需要特别注意：

**1. 避免频繁创建和销毁 Worker**

```javascript
// ❌ 错误做法：每次计算都创建新 Worker
async function badApproach(data) {
  const worker = new Worker('calc.js');
  return new Promise(resolve => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage(data);
  }).finally(() => worker.terminate());
}
// 每次调用都有线程创建开销（~50-100ms），严重浪费

// ✅ 正确做法：复用 Worker 或使用 Worker 池
const worker = new Worker('calc.js');
async function goodApproach(data) {
  return new Promise(resolve => {
    worker.onmessage = (e) => resolve(e.data);
    worker.postMessage(data);
  });
}
```

**2. 注意数据拷贝开销**

对于小数据，结构化克隆的开销可以忽略。但对于大数据，这种复制成本可能超过计算本身——花了 50ms 传数据，实际计算只用了 20ms，得不偿失。

```javascript
// 权衡何时用 Worker、何时不用
function shouldOffloadToWorker(dataSize, computationTime) {
  // 数据传输成本（粗略估算）
  const transferCost = dataSize / (100 * 1024 * 1024); // ~100MB/s 的序列化速度
  const estimatedTransferMs = transferCost * 1000;
  
  // 如果传输成本超过计算时间的一半，不值得
  if (estimatedTransferMs > computationTime * 0.5) {
    // 主线程自己算，或使用 Transferable 对象
    return { shouldOffload: false, useTransferable: true };
  }
  
  return { shouldOffload: true };
}
```

**3. 错误处理不能遗漏**

```javascript
// ❌ 遗漏了 onerror 处理
const worker = new Worker('task.js');
worker.onmessage = (e) => {
  // 只处理了成功情况
  processResult(e.data);
};

// ✅ 完善的错误处理
worker.onerror = (e) => {
  console.error('Worker 错误:', {
    message: e.message,
    filename: e.filename,
    lineno: e.lineno,
    colno: e.colno,
    error: e.error
  });
  
  // 用户友好的错误提示
  showToast('处理失败，请重试', 'error');
  
  // 记录到监控系统
  reportError('worker-error', {
    message: e.message,
    stack: e.error?.stack
  });
};

// 添加调试日志
worker.onmessageerror = (e) => {
  console.error('无法反序列化的消息:', e.data);
};
```

**4. Worker 中的异步操作**

Worker 完全支持 `fetch`、`setTimeout` 等异步 API，但要注意生命周期管理：

```javascript
// worker.js - 处理可取消的异步操作
let abortController = null;

self.onmessage = async (e) => {
  const { type, url } = e.data;
  
  if (type === 'fetch-data') {
    // 取消之前的请求
    if (abortController) {
      abortController.abort();
    }
    
    abortController = new AbortController();
    
    try {
      const response = await fetch(url, {
        signal: abortController.signal
      });
      
      const data = await response.json();
      self.postMessage({ success: true, data });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求已取消');
      } else {
        self.postMessage({ success: false, error: error.message });
      }
    }
  }
};
```

**5. importScripts 加载阻塞**

```javascript
// ❌ importScripts 是同步的，会阻塞 Worker 线程
importScripts('/heavy-lib.js', '/utils.js', '/helpers.js');
// 直到所有脚本加载完成，Worker 才能开始工作

// ✅ 使用 ES Module Worker（如果环境支持）
// const worker = new Worker('worker.js', { type: 'module' });
// 然后在 worker.js 中使用 import
// import { heavyFunction } from './heavy-lib.js';
```

## 总结与最佳实践

Web Worker 是前端性能优化中的重要工具，但并非所有场景都需要它。正确使用 Worker 需要遵循以下核心原则：

**何时使用 Worker：**

- ✅ 计算密集型任务（图像处理、加密、大量数学计算），且计算时间 > 50ms
- ✅ 大数据的解析和处理（JSON、CSV、二进制数据）
- ✅ 需要并行利用多核 CPU 的场景（Worker 池）
- ✅ 共享状态/连接跨多个标签页（Shared Worker）
- ✅ 离线缓存和推送通知（Service Worker）

**何时不用 Worker：**

- ❌ 简单、快速的计算（< 5ms），序列化开销可能更大
- ❌ 需要频繁访问 DOM 的任务
- ❌ 数据量小但需要频繁通信的场景
- ❌ 启动延迟敏感的任务（Worker 创建需要约 50-100ms）

**最佳实践清单：**

1. **复用 Worker**：使用 Worker 池管理生命周期，避免频繁创建/销毁
2. **大数据用 Transferable**：对于 >100KB 的 ArrayBuffer，始终考虑使用 Transferable 对象
3. **Comlink 提升开发体验**：在复杂 Worker 通信场景中，Comlink 能大幅简化代码
4. **做好错误处理**：`onerror` 和 `onmessageerror` 缺一不可
5. **监控性能指标**：建立 Worker 任务的耗时和成功率监控
6. **合理设置并行度**：Worker 池大小不超过 `navigator.hardwareConcurrency - 1`（给主线程留一个核心）
7. **考虑 Worker 启动成本**：首屏关键路径任务不建议交给 Worker（有约 50ms 的冷启动时间）
8. **TypeScript 保证类型安全**：定义共享接口文件，让主线程和 Worker 线程共用类型定义

Web Worker 把主线程从繁重计算中解放出来，让前端应用保持流畅的 60fps 体验。随着 WebAssembly 和 OffscreenCanvas 等 API 的成熟，Worker 的能力边界的不断扩展，未来在浏览器中处理更复杂的任务将越来越可行。

记住：好的用户体验不仅是功能完整，更是丝滑流畅——而这，正是 Web Worker 的用武之地。
