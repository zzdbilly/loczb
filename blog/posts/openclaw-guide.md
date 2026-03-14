# OpenClaw 深度使用指南：从 0 到 1 构建个人 AI Agent

> 一名安卓开发者的 AI Agent 实战记录

## 引言：为什么选择 OpenClaw？

作为一个安卓开发者，我一直在寻找能够真正融入工作流的 AI 工具。试过各种方案：

- **ChatGPT/Claude 网页版**：每次都要打开浏览器，复制粘贴，体验割裂
- **各种 AI 客户端**：功能单一，无法自定义工作流
- **自建 Agent**：学习成本高，维护麻烦

直到遇见 **OpenClaw**——一个真正为开发者设计的 AI Agent 框架。

### 它打动我的几点：

1. **多模型支持**：可以切换不同的 LLM（Qwen、Claude、GPT 等），不再被单一供应商绑定
2. **技能系统**：可以扩展能力，比如我需要的微信文章抓取、GitHub 操作、定时任务
3. **记忆系统**：有长期记忆，不需要每次重复说明背景
4. **多渠道接入**：Discord、Webchat 都能用，随时随地调用
5. **开源可控**：代码在自己手里，想怎么改就怎么改

---

## 快速开始

### 安装

```bash
# 全局安装
npm install -g openclaw

# 或使用 pnpm
pnpm install -g openclaw
```

### 核心概念

OpenClaw 的架构很清晰：

- **Gateway**：核心服务，处理消息路由和模型调用
- **Models**：模型配置，支持多提供商
- **Skills**：技能系统，扩展 Agent 能力
- **Memory**：记忆系统，包括长期记忆和每日日志
- **Channels**：接入渠道（Discord、Webchat 等）

### 配置文件结构

```
~/.openclaw/
├── openclaw.json          # 主配置
├── workspace/
│   ├── AGENTS.md         # 工作空间规则
│   ├── SOUL.md           # AI 人格设定
│   ├── USER.md           # 用户信息
│   ├── MEMORY.md         # 长期记忆
│   └── memory/           # 每日日志
│       └── YYYY-MM-DD.md
└── skills/               # 技能目录
    └── your-skill/
        └── SKILL.md
```

---

## 核心功能实战

### 1. 定时任务（Cron Jobs）

我设置了每天早上的 AI 新闻简报：

```json
{
  "cron": {
    "jobs": [
      {
        "id": "morning-news",
        "schedule": "30 8 * * *",
        "channel": "discord",
        "target": "your-channel-id",
        "prompt": "执行晨间简报，抓取 Hacker News 和 GitHub Trending"
      }
    ]
  }
}
```

每天 8:30 自动推送，不用手动刷新各个网站。

### 2. 子 Agent（Subagent）

复杂任务我会 spawn 子 Agent 处理，主 Agent 只负责协调：

```
用户：帮我优化这个项目的 README
我：好的，让小马来处理（spawn subagent）
小马：分析项目 → 生成 README → 完成
我：README 已优化完成
```

这样可以：
- 用不同的模型处理不同任务（代码用 glm-5，对话用 qwen3.5）
- 隔离上下文，避免主会话混乱
- 并行处理多个任务

### 3. 技能系统（Skills）

技能是 OpenClaw 的杀手锏。我创建的几个常用技能：

**微信文章抓取**
```bash
# 抓取公众号文章
python3 scrapling_fetch.py "https://mp.weixin.qq.com/..."
```

**新闻聚合**
```bash
# 综合早报（HN + GitHub + 36Kr）
python3 daily_briefing.py --profile general
```

**项目分析**
```bash
# GitHub 项目深度分析
gh-explorer owner/repo
```

### 4. 记忆管理

OpenClaw 的记忆系统让我印象深刻：

- **MEMORY.md**：长期记忆，存重要决策和偏好
- **memory/YYYY-MM-DD.md**：每日日志，记录当天发生的事
- **自动归纳**：每天 18:00 整理记忆，发送用户复核

这样 Agent 真正"认识"我了，不用每次重复说明背景。

---

## 高级技巧

### 配置优化

**模型选择**：我主用 Qwen3.5-Plus（性价比高），复杂推理用 Claude。

```json
{
  "models": {
    "defaultModel": "bailian/qwen3.5-plus",
    "providers": [
      {
        "name": "bailian",
        "models": [
          { "name": "qwen3.5-plus", "type": "chat" },
          { "name": "glm-5", "type": "chat" }
        ]
      }
    ]
  }
}
```

**会话管理**：设置会话数上限，避免 token 爆炸。

```json
{
  "gateway": {
    "session": {
      "maxSessions": 50,
      "maxAge": 86400000
    }
  }
}
```

### 安全配置

**命令白名单**：低风险放开，高风险锁死。

```json
{
  "tools": {
    "exec": {
      "security": "allowlist",
      "allowlist": ["read", "cat", "ls", "grep", "git status"]
    }
  }
}
```

这样 Agent 可以自由读取文件，但执行删除、推送等操作需要确认。

### Discord 集成

Discord 是我主要的交互渠道：

```json
{
  "messages": {
    "discord": {
      "token": "your-bot-token",
      "channels": {
        "your-channel-id": {
          "permissions": ["chat", "tts"]
        }
      }
    }
  }
}
```

配合语音功能，开车时也能和 Agent 对话。

---

## 我的配置分享

### 模型策略

| 场景 | 模型 | 原因 |
|------|------|------|
| 日常对话 | Qwen3.5-Plus | 中文好，便宜 |
| 代码开发 | GLM-5 | 编程能力强 |
| 复杂推理 | Claude | 思考深度够 |
| 快速响应 | Qwen-Turbo | 延迟低 |

### Discord 频道分工

- **#小团-main**：日常对话，杂事处理
- **#小马-dev**：开发任务，代码生成
- **#系统监控**：定时任务结果、错误通知

### 语音功能

```json
{
  "messages": {
    "tts": {
      "mode": "inbound",
      "provider": "edge",
      "voice": "zh-CN-XiaoxiaoNeural"
    }
  }
}
```

收到语音消息时才语音回复，平时打字即可。

---

## 踩坑记录

### 1. GitHub 推送失败

**问题**：SSH 方式推送被 GitHub 拒绝

**解决**：改用 HTTPS + Token
```bash
git remote set-url origin https://github.com/user/repo.git
git config --global credential.helper store
```

### 2. 会话数超标

**问题**：Gateway 报错 "max sessions exceeded"

**解决**：调整配置 + 定期清理
```json
{
  "gateway": {
    "session": {
      "maxSessions": 100
    }
  }
}
```

### 3. 配置改错导致 Gateway 疯狂重启

**问题**：`providers` 写错位置，Gateway 重启了 36 次

**教训**：
1. 改配置前先备份
2. 用 `config.patch` 而不是直接编辑
3. 改完后运行 `openclaw config.validate`

---

## 总结

### OpenClaw 适合谁？

- **开发者**：想深度定制 AI 工作流
- **技术爱好者**：喜欢折腾，想要完全控制
- **效率追求者**：需要自动化日常任务
- **隐私敏感者**：不想数据被第三方控制

### 学习路径建议

1. **第一周**：熟悉基本概念，跑通 Hello World
2. **第二周**：配置自己喜欢的模型，接入常用渠道
3. **第三周**：创建第一个 Skill，解决具体问题
4. **第四周**：设置定时任务，实现自动化

### 最后的话

OpenClaw 不是开箱即用的产品，而是一个需要"调教"的工具。但正是这种可定制性，让我真正拥有了一个理解我、能配合我工作方式的 AI 助手。

如果你也想构建自己的 AI Agent，不妨试试 OpenClaw。有问题欢迎交流！

---

## 参考资源

- [OpenClaw 官方文档](https://github.com/zzdbilly/openclaw)
- [我的 OpenClaw 配置](https://github.com/zzdbilly/loczb)
- [Qwen 模型文档](https://help.aliyun.com/zh/dashscope/)
- [Discord Bot 开发指南](https://discord.com/developers/docs)

---

*本文写于 2026 年 3 月，记录了我使用 OpenClaw 两个月的真实体验。*