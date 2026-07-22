## 引言：Chatbot 还不够

2022 年底 ChatGPT 横空出世，全世界都在惊叹"AI 终于能正常聊天了"。但很快人们发现，纯对话模型有两个硬伤：

**知识截止** — 模型训练完后，世界继续运转，它不知道今天发生了什么。  
**无法行动** — 你让 AI 帮你订机票、查天气、发邮件，它只能告诉你"我帮你写了个模板，你自己去操作"。

这种"只说不做"的 AI 能解决的问题很有限。于是行业开始思考：怎么让 AI 不只 talk，还能 act？

## 第一阶段：Function Calling — 给 AI 装上手

### 什么是 Function Calling

2023 年 6 月，OpenAI 发布了 GPT-4 的 `function_call` 能力。这不是说 AI 能直接执行代码，而是它学会了：

1. 听懂用户的意图
2. 从一堆预定义的 API 描述里选出合适的工具
3. 生成结构化的参数，交给外部系统执行

```
用户: "帮我查一下北京到上海的机票"

AI 判断: 需要调用 search_flights API
→ 返回 { "function": "search_flights", "params": { "from": "北京", "to": "上海" } }

系统执行 API, 返回结果给 AI
AI 用结果组织成自然语言回复用户
```

### 实际效果

Function Calling 是第一个真正让 AI 对接现实世界的方案。它的核心价值在于：

- **确定性** — API 调用由外部系统执行，结果可靠，解决了模型"胡编乱造"的问题
- **可审计** — 每次工具调用都有完整日志，用户可以追溯
- **可扩展** — 加一个接口就是加一个能力，不需要重新训练模型

我自己的项目里就用这个模式做过一个简单的 AI 助手（loczb 博客的 AI 助手），本质上就是 Function Calling + 知识库检索。

```python
# 一个简化的 Function Calling 实现
class FunctionCallingAgent:
    def __init__(self, model, tools):
        self.model = model
        self.tools = {t["name"]: t["handler"] for t in tools}
        self.tool_defs = [{k: v for k, v in t.items() if k != "handler"} for t in tools]

    def chat(self, user_message):
        response = self.model.chat(
            messages=[{"role": "user", "content": user_message}],
            tools=self.tool_defs
        )
        if response.tool_calls:
            for call in response.tool_calls:
                fn = self.tools[call.function.name]
                result = fn(**json.loads(call.function.arguments))
                response = self.model.chat(
                    messages=[...] + [{"role": "tool", "content": result}]
                )
        return response.content
```

### 局限

Function Calling 本质上还是一个**一问一答**的模式。每个请求都是独立的，AI 没有"记忆"，不会主动规划。你问它"北京的天气怎么样？顺便帮我推荐适合的穿搭"，它得分成两步走，但当前的框架设计上就没有"先查天气再推荐穿搭"这种串联逻辑。

## 第二阶段：Tool Use & MCP — 标准化工具协议

### 百花齐放的 Tool Use

Function Calling 发布后，各大模型厂商纷纷跟进。Claude 推出了 Tool Use API，Google 的 Gemini 也支持了 Function Calling。但问题来了：每家定义工具的方式不一样。

| 平台 | 工具定义方式 | 请求格式 |
|------|------------|---------|
| OpenAI | JSON Schema function definition | Chat Completion API |
| Anthropic | Tool Use block | Messages API |
| Google | FunctionDeclaration | Generative AI API |

这意味着开发者每适配一个模型商，就要重写一套工具调用逻辑。

### MCP 的诞生

2025 年初，Anthropic 推出了 **MCP（Model Context Protocol）**，试图解决这个碎片化问题。MCP 的思路很聪明：

1. **定义一套标准协议** — 工具的描述格式、调用方式、结果返回都统一了
2. **Server-Client 架构** — AI 应用作为 Client，通过 MCP 连接各种工具 Server
3. **动态发现** — Server 可以广播自己有哪些工具，Client 动态加载

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  AI 应用     │────▶│  MCP Client  │────▶│  MCP Server  │
│  (Claude)    │     │              │     │  (日历/邮件)  │
└─────────────┘     └──────────────┘     └──────────────┘
                          │
                    ┌─────┴──────┐
                    │ MCP Server │
                    │ (文件系统)  │
                    └────────────┘
```

MCP 的最大贡献是让工具生态变得可插拔。以前你要给 AI 加个日历功能，得自己写代码对接 API；现在只需要找个 MCP Server 连上就行，就跟装个 VS Code 插件一样简单。

```typescript
// MCP Client 连接示例（简化版）
import { Client } from "@modelcontextprotocol/sdk";
const client = new Client({ name: "my-ai-app", version: "1.0.0" });
await client.connect(new StdioServerProcess({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-calendar"],
}));
const tools = await client.listTools();
// → [{ name: "create_event", schema: {...} }, { name: "list_events", ... }]
const result = await client.callTool({
  name: "list_events",
  arguments: { date: "2026-07-22" },
});
```

```bash
# 安装一个 MCP Server 就像装 npm 包
npx @modelcontextprotocol/server-filesystem ./my-data
npx @modelcontextprotocol/server-github
npx @modelcontextprotocol/server-browser
# VS Code 里直接用 MCP 配置 (.vscode/mcp.json)
{
  "servers": {
    "git": { "command": "npx", "args": ["mcp-git"] },
    "db": { "command": "node", "args": ["./mcp-db.mjs"] }
  }
}
```

## 第三阶段：Agentic Workflow — 让 AI 学会规划

### ReAct 模式

有了工具，还需要工具调度策略。2023 年的一篇论文 **ReAct（Reasoning + Acting）** 提出了一个关键 idea：让模型交替进行"思考"和"行动"。

传统做法：思考 → 行动 → 结束  
ReAct 模式：思考 → 行动 → 观察结果 → 再思考 → 再行动 → ... → 达成目标

```
用户: "帮我订一张下周三北京到上海的高铁票"

AI 思考: "我需要先查询下周三北京到上海的高铁班次"
AI 行动: query_trains("北京", "上海", "2026-07-29")
AI 观察: 返回了 20 个车次，G15 次 08:00-12:23 是最早的

AI 思考: "用户没说要几点，先推荐最合适的时间段"
AI 行动: search("G15 次座位信息")
AI 观察: 商务座 1200 元，一等座 650 元，二等座 420 元

AI 思考: "信息收集完毕，展示给用户选择"
AI 回复: "下周三北京到上海推荐 G15 次..."
```

这种"思考-行动-观察"的循环，让 AI 从一个被动回答者变成了主动信息收集者。

### Agent 的循环结构

一个典型的 Agent 架构包含以下组件：

```
┌─────────────────────────────────────────┐
│                Agent                     │
│  ┌─────────┐   ┌──────────┐             │
│  │  LLM     │   │ Memory   │             │
│  │ (大脑)   │   │ (记忆)   │             │
│  └────┬────┘   └──────────┘             │
│       │                                  │
│  ┌────▼──────────────────────────────┐  │
│  │         Planner (规划器)           │  │
│  │   ReAct / Plan-and-Execute / ...  │  │
│  └───────────────────────────────────┘  │
│       │                                  │
│  ┌────▼──────────────────────────────┐  │
│  │      Tool Executor (工具执行器)    │  │
│  │   ┌─────┐ ┌─────┐ ┌─────┐        │  │
│  │   │ API │ │ DB  │ │ MCP │        │  │
│  │   └─────┘ └─────┘ └─────┘        │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 实际应用

2025 年，Agent 已经开始进入生产环境：

```python
# 一个简单的 ReAct Agent 实现
class ReActAgent:
    def __init__(self, llm, tools: list[Tool]):
        self.llm = llm
        self.tools = {t.name: t for t in tools}

    def run(self, task: str, max_steps=10):
        messages = [{"role": "user", "content": task}]
        for step in range(max_steps):
            response = self.llm.chat(messages)
            action = self._parse_action(response)
            if action is None:
                return response.content
            result = self.tools[action.name].execute(**action.args)
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "tool", "content": json.dumps(result)})
        return "已达最大步数"
```

- **代码开发 Agent** — Claude Code / Cursor Agent 可以在代码库中自主导航、阅读文件、编辑代码、运行测试
- **数据分析 Agent** — 自动连接数据库、写 SQL、分析结果、画图表
- **浏览器 Agent** — 可以自主浏览网页、填写表单、提取信息

## 第四阶段：Multi-Agent — 让 AI 协作

### 为什么需要多个 Agent

一个 Agent 的能力终究有限。想想一个真实的软件开发团队：

- 产品经理负责理解需求
- 架构师负责设计方案
- 前端开发者写 UI
- 后端开发者写 API
- QA 测试

如果你用一个超级 Agent 做所有事，它会变得笨重、上下文窗口爆破、出错成本极高。把不同职责拆给不同的 Agent，每个 Agent 专注一个领域，效果往往更好。

```python
# Multi-Agent Supervisor 模式示例
class Supervisor:
    def __init__(self):
        self.agents = {
            "planner": Agent(system_prompt="你负责拆解任务"),
            "coder": Agent(system_prompt="你负责编码"),
            "reviewer": Agent(system_prompt="你负责代码审查"),
        }

    async def execute(self, task: str):
        plan = await self.agents["planner"].run(task)
        code = await self.agents["coder"].run(plan)
        review = await self.agents["reviewer"].run(code)
        if "需要修改" in review:
            code = await self.agents["coder"].run(review)
        return code
```

### 协作模式

#### 模式一：Supervisor（主管模式）

一个主管 Agent 负责拆分任务、分配给子 Agent、汇总结果。这是目前最成熟的模式。

```
         ┌────────────┐
         │ Supervisor │
         └─────┬──────┘
     ┌─────────┼─────────┐
     │         │         │
  ┌──▼──┐  ┌──▼──┐  ┌──▼──┐
  │Agent│  │Agent│  │Agent│
  │  A  │  │  B  │  │  C  │
  └─────┘  └─────┘  └─────┘
```

#### 模式二：Debate（辩论模式）

多个 Agent 对同一个问题进行辩论，互相质疑、补充。用于提高决策质量。

典型场景：代码审查。一个 Agent 写代码，另一个 Agent 审查，审查意见反馈给写代码的 Agent 修改。

#### 模式三：Pipeline（流水线模式）

任务按顺序经过多个 Agent，每个 Agent 只处理自己擅长的环节。

```
用户请求 → 理解需求 Agent → 设计方案 Agent → 编码 Agent → 测试 Agent → 部署 Agent
```

### 现实案例

我现在的工作流本质上就是 Multi-Agent 的一种形式：主 Agent 负责统筹，需要编码时派 subagent 去执行。subagent 跑在独立上下文中，完成后汇报结果。这比让一个 Agent 从需求做到部署要稳定得多。

#### 模式四：Orchestrator（编排模式）

一个 Orchestrator 负责编排多个 Agent 的协作流程。与 Supervisor 不同的是，Orchestrator 不直接干预 Agent 的输出内容，而是定义工作流、管理状态、处理错误。

```
┌──────────────┐
│ Orchestrator  │── 定义工作流 + 管理状态
└──────┬───────┘
       │
  ┌────┴───────────────────┐
  │ State Machine / DAG    │
  │ step1 → step2 → step3  │
  └────┬───────────────────┘
       │
  ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
  │ Agent A │  │ Agent B │  │ Agent C │
  │ 翻译任务 │  │ 审查任务 │  │ 润色任务 │
  └─────────┘  └─────────┘  └─────────┘
```

## 第五阶段：MCP 驱动的 Agent 生态

### MCP 的进化

MCP 协议一直在演进。最新版本（MCP v2.x）支持了：

- **Tool Discovery** — 服务端可以动态注册和注销工具
- **Resource Access** — Agent 可以直接读取远程文件、数据库表
- **Prompt Templates** — 预定义的提示模板，减少重复构造
- **Streaming** — 支持长耗时任务的实时进度反馈

### 生态现状

截至 2026 年中，MCP 生态已经相当丰富：

- **官方 SDK** — Python、TypeScript、Java、Go
- **社区 MCP Servers** — 超过 500 个，覆盖浏览器、文件系统、GitHub、数据库、Slack、邮件等
- **企业支持** — 多家公司的产品原生支持 MCP：Cursor、VS Code、JetBrains 等

### Agent Market

一个有意思的趋势是 **Agent Market**（Agent 市场）的出现。与 App Store 类似但架构不同：

- App Store：用户下载的是固定功能的 App
- Agent Market：用户下载的是 Agent 的**能力组合**（skills + tools + prompts）

你下载一个"旅行规划 Agent"，它可能包含：
- 航班查询工具（搜索 MCP Server）
- 酒店比价工具
- 天气查询工具
- 行程规划的工作流定义

这种模式让 Agent 不再是 monolithic 的黑盒，而是可组合、可重用的能力单元。

## 当前的挑战与局限

### 可靠性问题

Agent 的可信赖度还不够。目前最头疼的问题：

- **幻觉依旧存在** — Agent 在规划时可能编造不存在的环境信息
- **错误累积** — 多步 Agent 中，前面一步的误差会在后续步骤中被放大
- **回滚困难** — 一旦 Agent 执行的副作用不可逆转（比如发了邮件、改了数据库），恢复成本很高

### 成本问题

Agent 的成本比单纯的 Chat Completion 高很多：

```
一次 Chat Completion: 1 次调用 ≈ $0.01
一次 Agent 任务: 5-20 次调用 + 工具执行 ≈ $0.05-$0.5
Multi-Agent 任务: 几十到上百次调用 ≈ $1-$10
```

对于生产级的 Agent 应用，成本控制是一个绕不开的话题。

### 安全与治理

当 Agent 有了"行动能力"，安全问题就凸显了：

- **Prompt Injection** — 恶意用户可以通过工具输出注入指令，操控 Agent
- **权限越界** — Agent 可能访问未授权的数据或执行危险操作
- **审计困难** — 复杂的 Agent 调用链使得问题溯源变得困难

好消息是行业已经在制定对应的安全规范，比如 **OWASP Top 10 for LLM Agents** 和 **Anthropic 的安全评估框架**。

## 未来展望

### 从 Agent 到 Agentic OS

一个值得关注的方向是 Agent 操作系统化。就像操作系统管理进程和资源一样，未来可能会出现专门的 Agent 运行时：

- **Agent Scheduler** — 管理 Agent 的生命周期、优先级、资源分配
- **Shared Memory** — 多个 Agent 共享上下文状态
- **Events & Webhooks** — Agent 之间的消息通知机制

### 端侧 Agent

端侧大模型的进步使得 Agent 可以本地运行。高通、联发科、Apple 都在推端侧 Agent：

```kotlin
// Android 端侧 Agent 思路示例
class OnDeviceAgent(context: Context) {
    private val llm = NanoLLM(context)  // 端侧小模型
    private val toolRegistry = ToolRegistry()

    init {
        toolRegistry.register(CalendarTool(context))
        toolRegistry.register(LocationTool(context))
        toolRegistry.register(NotificationTool(context))
    }

    suspend fun process(context: UserContext): Action? {
        val intent = llm.analyze(context.sensors, context.schedule)
        return when (intent) {
            Intent.GO_TO_METRO -> Actions.openMetroCard()
            Intent.MEETING_SOON -> Actions.silencePhone()
            else -> null
        }
    }
}
```

```bash
# 端侧模型部署工具链
# MediaPipe 部署 LLM 到 Android
bazel build -c opt mediapipe/examples/android/llm_inference
# Qualcomm SNPE 量化模型
snpe-net-run --container model.dlc --input_raw input.raw
```

- 隐私 — 敏感数据不上云
- 离线 — 无网络也能工作
- 实时 — 低延迟响应

作为一个 Android 开发者，我对这个方向特别感兴趣。可以想象一个手机的 Agent 能：

1. 读取你的日程安排
2. 了解你的出行习惯
3. 在你到地铁站时自动打开乘车码
4. 在会议前 5 分钟提醒并自动静音手机
5. 检测到你有未读消息时，根据上下文决定是否通知你

这些功能靠传统的 App + Rule Based 能实现一部分，但 Agent 的泛化能力和上下文理解让体验提升了一个维度。

```javascript
// 端侧 Agent 的实时响应示例
// 检测用户到达地铁站时自动弹出乘车码
const metroAgent = new OnDeviceAgent({
  location: { lat: 39.9042, lng: 116.4074 },
  schedule: ["10:00 会议", "12:00 午餐"],
  lastAction: "正在通勤",
});

metroAgent.on("arrived_at_metro", async (ctx) => {
  if (ctx.isCommuteTime && ctx.nfcEnabled) {
    await ctx.showQuickAction("打开乘车码", {
      icon: "metro",
      dismissAfter: 30000,
    });
  }
});
```

## 写代码的 Agent 已经来了

回到开头的问题：为什么我写这些文章、做这些项目，很多时候是通过 subagent 完成的？

因为 Agentic 工作流已经从实验室走进了生产环境。对我来说，subagent 不是玩具，是每天使用的工具。我给它一个任务，它去读文件、分析代码、写实现、跑测试。我在主对话里统筹规划和审阅结果。

这种模式刚用的时候可能觉得多此一举，但用习惯后回不去了。就像从手写代码到用版本控制，从手动部署到 CI/CD 一样。

Agentic AI 还在快速演进中，从 Function Calling 到 MCP 到 Multi-Agent 再到 Agent 市场，这条路远没到终点。但有一点是确定的：**AI 不能只 talk，还得能 act。** 能行动、能执行、能交付价值的 AI 才是有意义的。

你有开始用 Agent 做实际工作了吗？如果还没有，动手写一个简单的 Tool Use 应用试试，感受一下那种"AI 真的在帮你做事"的体验。
