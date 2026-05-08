/**
 * AI Assistant API Proxy - Cloudflare Workers
 * 代理阿里云百炼 API，保护 API Key 不暴露在前端
 */

const API_KEY = ''; // 在 Cloudflare Workers 环境变量中设置 DASHSCOPE_API_KEY
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen3.5-plus';

// 站点信息，用于 RAG 上下文
const SITE_CONTEXT = `
你是张小猛（loczb）的个人网站 AI 助手。
张小猛的身份：
- Android 开发工程师，也在探索端侧 + AI 接入
- 技术栈：Kotlin, Jetpack Compose, Coroutines, Room, Hilt
- 熟悉大前端（React, Vue.js），了解后端和数据库
- 注重效率，实用主义优先

当前重点方向：
1. AI Agent 开发 - 基于 OpenClaw 搭建个人 AI 工作流
2. Android + AI 接入 - 关注端侧体验与模型能力结合
3. 技术写作 - 持续输出 Android、AI Agent、端侧 AI 和工具实践

主要项目：
1. loczb 个人网站 - https://709527.xyz
2. NoFap Tracker Web - 一个帮助追踪习惯的 Web 应用
3. OpenClaw 实践 - 基于 OpenClaw 的自动化工作流

博客分类：
- AI (8篇)：AI 编程、Prompt 设计、Agent 工作流
- Android (3篇)：Gemini Nano 集成、Kotlin、Jetpack Compose
- 前端 (5篇)：React、TypeScript、CSS、PWA
- DevOps (4篇)：Docker、SSH 安全、Tailscale
- 其他：数据库、系統编程、Kotlin、安全

可以问的问题：
- 张小猛擅长什么？
- 有哪些 Android + AI 项目？
- 推荐几篇 AI Agent 相关文章
- OpenClaw 实践内容是什么？
- 技术栈是什么？
`;

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
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
            'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};