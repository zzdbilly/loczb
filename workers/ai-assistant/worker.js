/**
 * AI Assistant API Proxy - Cloudflare Workers
 * 代理阿里云百炼 API，保护 API Key 不暴露在前端
 */

const API_KEY = ''; // 在 Cloudflare Workers 环境变量中设置 DASHSCOPE_API_KEY
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen3.5-plus';

// CORS 允许的来源
const ALLOWED_ORIGINS = [
  'https://709527.xyz',
  'https://www.709527.xyz',
];

function getCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

// 站点信息，用于 RAG 上下文
const SITE_CONTEXT = `
你是张小猛（loczb）的个人网站 AI 助手。
张小猛的身份：
- Android 开发工程师，也在探索端侧 + AI 接入
- 技术栈：Kotlin, Jetpack Compose, Coroutines, Room, Hilt
- 熟悉大前端（React, Vue.js, TypeScript），了解后端和数据库
- 注重效率，实用主义优先

当前重点方向：
1. AI Agent 开发 - 基于 OpenClaw / Hermes 搭建个人 AI 工作流
2. Android + AI 接入 - 关注端侧体验与模型能力结合（Gemini Nano、模型量化）
3. 技术写作 - 持续输出 Android、AI Agent、端侧 AI 和工具实践

主要项目：
1. loczb 个人网站 - https://709527.xyz
2. PasteBin - 轻量文本分享工具（Cloudflare Workers + KV）
3. OpenClaw / Hermes 实践 - AI Agent 工作流与技能开发

博客分类（共 98 篇）：
- Android：Gradle 构建、Jetpack Compose、Hilt 依赖注入、Gemini Nano 集成、性能优化等
- AI：AI 编程工具横评、Agent 工作流、RAG、MCP 协议、端侧大模型等
- 前端：React、TypeScript、CSS Container Queries、PWA、WebAssembly、Web Worker 等
- 思考：技术写作、高效工作、生活方式、软技能与认知迭代等
- DevOps：Docker Compose、GitHub Actions CI/CD、SSH 加固、Tailscale、Nginx 调优等
- Kotlin：Kotlin 2.4、Coroutines 实战、Flow 进阶、Scope Functions 等
- 安全：App 加固、HTTPS/TLS 1.3、SSH 加固等
- 其他：数据库（PostgreSQL/SQLite）、系统编程（eBPF/Inode）、Rust/Zig/Go 等

可以问的问题：
- 张小猛擅长什么？
- 有哪些 Android + AI 实践？
- 推荐几篇 AI Agent 相关文章
- OpenClaw / Hermes 实践内容是什么？
- 技术栈是什么？
- 有关于 Android / Jetpack Compose 的文章吗？
- 最新的文章有哪些？
`;

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');

    // 处理 CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(origin),
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { messages, context } = await request.json();
      
      // 构建系统消息，注入站点上下文
      const systemMessage = {
        role: 'system',
        content: SITE_CONTEXT + '\n\n用户当前页面上下文：' + (context || '首页')
      };

      // 构建请求体
      const body = {
        model: MODEL,
        messages: [systemMessage, ...messages],
        temperature: 0.7,
        max_tokens: 2000,
      };

      // 调用百炼 API
      const apiKey = env.DASHSCOPE_API_KEY || API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'API key not configured'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(origin),
          },
        });
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      // 返回结果
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(origin),
        },
      });
    }
  },
};