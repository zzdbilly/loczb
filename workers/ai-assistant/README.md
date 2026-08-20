# loczb AI 助手

> 基于 Cloudflare Workers + 通义千问的博客 AI 问答助手，知识库覆盖全站 100+ 篇文章。

## 功能

- 🤖 **博客问答** - 用户可通过对话界面提问，AI 基于博客文章内容回答
- 📚 **知识库** - 索引全部 100+ 篇博客文章，涵盖 AI、Android、Kotlin、前端、DevOps 等
- 💬 **对话交互** - 文章页右下角悬浮入口，支持多轮对话

## 技术栈

- **运行时**：Cloudflare Workers
- **AI 模型**：通义千问（DashScope API）
- **前端**：纯 JS + CSS（`assets/js/` + `assets/css/ai-assistant.css`）

## 部署

### 前置条件

- 安装 Node.js 18+
- 安装 Wrangler：`pnpm add -g wrangler`
- 登录 Cloudflare：`wrangler login`

### 步骤

```bash
cd workers/ai-assistant

# 安装依赖
pnpm install

# 设置 DashScope API Key（Secret）
wrangler secret put DASHSCOPE_API_KEY
# 按提示输入 API Key

# 部署
pnpm deploy
# 或 npx wrangler deploy
```

部署成功后得到 Worker URL，将其配置到前端 `ai-assistant.js` 中。

## 环境变量

| 变量 | 类型 | 说明 |
|------|------|------|
| `DASHSCOPE_API_KEY` | Secret | 通义千问 API Key，在 [DashScope 控制台](https://dashscope.console.aliyun.com/) 获取 |

## 本地开发

```bash
cd workers/ai-assistant
pnpm dev    # wrangler dev
```

本地默认运行在 `http://localhost:8787`。

## 文件结构

```
workers/ai-assistant/
├── worker.js          # AI 问答逻辑（知识库、对话路由）
├── wrangler.toml      # Wrangler 部署配置
├── package.json       # 项目依赖和脚本
└── README.md          # 本文件
```
