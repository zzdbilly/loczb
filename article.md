> 如果要说这一年里 AI 助手给我带来最大「日用价值」的功能，定时任务绝对排前三：每天早上准时把项目状态、服务器健康、待办提醒推到我手机上。但真正让这套体系从「能用」进化到「好用」，中间踩了不少坑。这篇文章把完整链路拆开讲清楚：从 LLM 生成内容的 Agent 模式，到纯脚本直投的 No-Agent 模式，再到如何让机器人在聊天软件里以「回复」样式投递，以及过程中所有值得记住的坑。

## 背景：定时任务为什么会「吵」

一切的起点是一个很朴素的需求：让 AI 助手每天早晨九点，自动把「项目状态日报」送到聊天软件里。项目有五个，需要汇总每个仓库的 git 状态、最近提交、线上地址，最好还能给出「哪个项目最久没动了」这种洞察。

听起来很简单，对吧？让机器人每天跑一次脚本，读数据，生成报告，发出来。但实际做起来，第一版就撞上了三个问题：

### 问题一：模型会「自言自语」

机器人确实每天九点准时发日报了，但消息开头经常带着这样一句：

```text
I have all the data needed. Let me compute days since last update...
```

然后才是正文。这句「自言自语」是模型在工具调用结束后、正式写报告之前，习惯性输出的过渡叙述。它不丑，但很烦——你每天早上收到的第一条消息，开头是英文废话。

### 问题二：中间过程会「漏」出来

工具调用之间有大量中间输出：「正在检查 git 状态…」「已获取数据…」「让我计算一下…」。在交互式对话里这些无伤大雅，但在「每日投递」场景里，它们让消息显得很脏。

### 问题三：内容不稳定

同样的任务，今天日报长这样，明天可能换一种结构。模型每次都在「自由发挥」，格式一致性全靠运气。

## 第一轮：试图用「约束」解决模型问题

面对模型的自言自语和中间输出，第一反应自然是加约束。

### 软约束：改提示词

在任务提示词里加一条：「最终回复必须以日报正文直接开头，禁止任何过渡性叙述」。效果如何？**时灵时不灵**。模型大部分时候遵守，但偶尔还是会犯。提示词是「软约束」——它靠模型自觉，而模型不是每次都会自觉。

### 硬约束：系统配置

我们用的助手框架（Hermes Agent）有一个配置项，可以在系统层面拦截「工具调用之间的中间消息」，只保留最终回复：

```yaml
display:
  interim_assistant_messages: false
```

这个配置是「硬拦截」——不是靠模型自觉，而是系统直接不发。实时对话里的中间消息确实被拦住了。

### 但配置拦不住「写进最终回复的废话」

关键发现来了：上面那句 `I have all the data needed...` **根本不是中间消息**——它是模型在写最终回复时，把过渡叙述和正文拼在了同一条消息里。系统拦截的是「独立中间消息」，拦不住「最终回复文本里自带的废话」。配置管机制，管不了内容。

```python
# 投递层只认 final_response，这条消息就是最终回复本身
# "I have all the data needed..." + 日报正文 = 被原样投递
deliver_content = final_response if success else failure_summary
```

结论：**想根治内容层面的废话，不能靠配置，要么靠更强的提示词约束，要么换一条不经过模型的链路。**

## 第二轮：No-Agent 脚本模式

与其和模型的不确定性搏斗，不如换思路：**内容固定、格式稳定的任务，根本不需要模型参与。**

### 两种模式对比

| 维度 | Agent 模式（LLM） | No-Agent 模式（脚本） |
|---|---|---|
| 执行方式 | 启动模型，读提示词、调工具、生成回复 | 直接跑脚本，stdout 即输出 |
| 成本 | 每次消耗 token | 零 token |
| 稳定性 | 模型可能发挥失常 | 输出 100% 确定 |
| 废话风险 | 存在（自言自语） | 物理不存在 |
| 适用场景 | 需要推理、总结、判断 | 固定格式：日报、监控、提醒 |

### 脚本的基本结构

一个「内容生成 + 投递一体」的脚本，核心就三部分：

```python
#!/usr/bin/env python3
import sys

def build_content() -> str:
    """生成要投递的正文（模板化，无废话）"""
    lines = ["**项目状态日报 · 今日**", ""]
    for project in collect_git_status():
        lines.append(f"**{project['name']}**")
        lines.append(f"- 最近提交：{project['last_commit']}")
        lines.append(f"- 线上：{project['url']}")
    return "\n".join(lines)

def main():
    content = build_content()
    if "--print" in sys.argv:
        print(content)          # 调试模式：只打印
        return
    result = send(content)      # 默认：发送模式（cron 调用时无参数）
    if not result.get("ok"):
        print(f"发送失败: {result['error']}", file=sys.stderr)
        sys.exit(1)             # 非零退出 → 调度器会告警
    print("")                   # 空 stdout → 调度器静默，不重复投递

if __name__ == "__main__":
    main()
```

注意一个关键约定：**stdout 空 = 静默，stdout 非空 = 会被投递**。所以脚本自己完成发送后，必须输出空字符串，否则会出现「脚本发了一条，调度器又投递一条」的双重消息。

### 任务配置

定时任务本身也切换成「纯脚本」模式：

```python
cronjob(
    schedule="0 9 * * *",   # 每天早上 9 点
    script="daily_report.py",  # 注意：相对路径，只写文件名
    no_agent=True,             # 纯脚本模式
)
```

`no_agent=True` 意味着调度器不再启动模型，到点直接执行脚本。**零 token、零废话、输出稳定**——三个问题一次性解决。

### 完整示例：git 状态日报脚本

下面是一个真实可用的完整脚本（脱敏后），它做的事情是：遍历五个 git 仓库，采集分支、最近提交、未提交变更，生成日报正文，然后以「回复用户最近消息」的样式发到 Discord：

```python
#!/usr/bin/env python3
"""项目状态日报：git 采集 + 内容生成 + Discord 回复样式投递"""
import datetime
import json
import os
import re
import subprocess
import sys
import urllib.request

NOOK = "/path/to/projects"            # 各仓库的父目录
CHANNEL_ID = "<discord_channel_id>"   # 目标频道
USER_ID = "<discord_user_id>"         # 引用锚点：用户
ENV_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")

PROJECTS = ["loczb", "pastebin", "zest", "sansi-sanxing", "baobaogu"]


def git_info(proj_dir):
    """返回 {branch, hash, date, subject, dirty_count}"""
    def run(args):
        try:
            r = subprocess.run(args, capture_output=True, text=True,
                               cwd=proj_dir, timeout=15)
            return r.stdout.strip()
        except Exception:
            return ""
    branch = run(["git", "rev-parse", "--abbrev-ref", "HEAD"])
    last = run(["git", "log", "-1", "--format=%h|%ci|%s"])
    dirty = run(["git", "status", "--porcelain"])
    hash_, date_str, subject = "", "", ""
    if last and "|" in last:
        hash_, date_str, subject = last.split("|", 2)
    return {
        "branch": branch,
        "hash": hash_,
        "date": date_str,
        "subject": subject,
        "dirty_count": len([l for l in dirty.splitlines() if l.strip()]),
    }


def build_report():
    today = datetime.date.today().isoformat()
    lines = [f"**项目状态日报 · {today}**", ""]
    for p in PROJECTS:
        info = git_info(os.path.join(NOOK, p))
        clean = "仓库干净" if info["dirty_count"] == 0 \
            else f"⚠️ {info['dirty_count']} 个未提交变更"
        lines.append(f"**{p}**")
        lines.append(f"- 状态：{clean}")
        if info["hash"]:
            lines.append(f"- 最近提交：`{info['hash']}` {info['subject'][:50]}")
        lines.append("")
    return "\n".join(lines)


def send_discord_reply(content):
    """绕过代理 + 带 UA + 回复用户最近消息（踩坑全处理）"""
    token = load_token(ENV_FILE)
    headers = {
        "Authorization": f"Bot {token}",
        "Content-Type": "application/json",
        "User-Agent": "curl/8.5.0",   # 坑一：非 urllib UA
    }
    opener = urllib.request.build_opener(  # 坑二：绕过代理
        urllib.request.ProxyHandler({}))
    anchor = find_user_anchor(opener, headers)  # 坑三：锚点=用户消息
    payload = {"content": content,
               "message_reference": {"message_id": anchor}}
    req = urllib.request.Request(
        f"https://discord.com/api/v10/channels/{CHANNEL_ID}/messages",
        data=json.dumps(payload).encode(), headers=headers, method="POST")
    with opener.open(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def main():
    content = build_report()
    if "--print" in sys.argv:
        print(content)
        return
    result = send_discord_reply(content)   # 默认：发送模式
    if "id" not in result:
        print(f"发送失败: {result}", file=sys.stderr)
        sys.exit(1)
    print("")                              # 静默协议


if __name__ == "__main__":
    main()
```

这个脚本基本就是日报任务的完整实现。`find_user_anchor` 和 `load_token` 两个辅助函数在上一节和踩坑部分有说明，这里不再重复贴。

### 日报正文的 markdown 细节

Discord 的 markdown 支持和网页 markdown 有差异，生成内容时要注意：

```markdown
# ❌ 不渲染 / 不推荐
• 列表符号（Discord 不认）
| 表格（Discord 不渲染表格）
# ✅ 正常渲染
**加粗**       # 标题分组
`code`         # 提交 hash、命令
- 列表         # 项目明细
> 引用         # 备注、AI 点评
```

一个实用技巧：**标题用加粗而非 heading**。Discord 不支持 `##` 标题，但 `**粗体**` 单独成行时视觉上就是标题。日报的每个项目组，都用一行 `**项目名**` 开头，下面跟 `- ` 明细，段落间空一行——渲染出来就是干净的分组列表。

## 第三轮：Discord 回复样式投递

脚本模式解决的是「内容」，下一个需求是关于「形式」的：希望日报在聊天软件里以「回复消息」的样式展示——消息下方带着引用条，看起来就像机器人正在回复你的上一条消息，而不是一条从天而降的广播。

### 系统投递的限制

助手框架的定时任务投递层，默认只支持三种形态：独立消息、带 header/footer 的包装消息、进专属线程。**不支持「引用某条消息」的回复样式**——架构上没有这个能力。

### 绕行：直接调用平台 API

既然系统投递不支持，就让脚本自己发。Discord 的 REST API 支持通过 `message_reference` 参数指定「这条消息回复谁」：

```python
import urllib.request, json

def send_discord_reply(content, channel_id, anchor_message_id, token):
    payload = {
        "content": content,
        "message_reference": {"message_id": anchor_message_id},
    }
    req = urllib.request.Request(
        f"https://discord.com/api/v10/channels/{channel_id}/messages",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bot {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())
```

发送成功后，消息在 Discord 里长这样：

```text
┌─────────────────────────────────────┐
│ billyzl  昨天 22:32                 │
│ 明天 9 点别忘了看日报效果            │
└─────────────────────────────────────┘
  ⤷ 小马 APP  今天 09:00
     **项目状态日报 · 今日**
     - loczb：线上 709527.xyz，96+ 篇
     ...
```

### 引用锚点：回复谁？

定时任务没有「触发消息」，那回复谁？这里有一个反直觉的坑：

**不要回复机器人自己的上一条消息。** 如果日报回复的是上一条日报，Discord 的引用条会显示「回复 小马 APP」——看起来像机器人在自说自话，非常奇怪。

正确做法是：**回复「用户最近的一条消息」**。取频道最近 100 条消息，找到作者是用户的那条，作为引用锚点：

```python
def find_user_anchor(messages, user_id):
    for m in messages:
        if str(m.get("author", {}).get("id", "")) == user_id:
            return m["id"]
    return None  # 兜底：没有用户消息就取最近一条
```

这样引用条显示的是「回复 billyzl」，看起来就像机器人正常回你的消息——自然、有对话感。

## 实战踩坑清单

这一段是全文的精华。所有坑都是真实踩过的，按「症状 → 原因 → 解法」记录。

### 坑一：urllib 请求 Discord 返回 403

**症状**：同样的 token、同样的接口，用 `curl` 请求一切正常，换成 Python `urllib` 就 403 Forbidden。

**原因**：Discord API 拒绝 `urllib` 的默认 User-Agent（`Python-urllib/3.x`）。这不是权限问题，是 UA 识别。

**解法**：显式带上合法的 User-Agent：

```python
headers = {
    "Authorization": f"Bot {token}",
    "User-Agent": "curl/8.5.0",  # 任意非 urllib 的 UA 都行
}
```

### 坑二：环境代理导致 403

**症状**：脚本在本地手动跑正常，但在服务器上跑就 403。curl 也是好的。

**原因**：服务器有全局代理环境变量（`HTTPS_PROXY=http://127.0.0.1:7890`，很多翻墙机器都这样），Python 的 `urllib` 默认读取环境变量走代理，而代理对 Discord API 的请求被拒绝。

**解法**：绕过代理直连：

```python
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
# 之后所有请求都用 opener.open()，不再用 urlopen()
```

### 坑三：cron 脚本路径必须是相对路径

**症状**：给任务配置脚本时传了绝对路径 `/root/xxx/scripts/daily_report.py`，直接被拒绝。

**原因**：调度器的脚本参数约定是「相对路径，相对于脚本目录」，只接受文件名。

**解法**：脚本放在约定的 scripts 目录下，配置里只写文件名：

```python
script="daily_report.py"   # ✅
script="/root/.../daily_report.py"  # ❌ 报错
```

### 坑四：双重投递

**症状**：频道里每天出现两条日报——一条带引用样式，一条裸消息。

**原因**：脚本自己调 API 发了一条，然后 stdout 又打印了日报内容，调度器把 stdout 当投递内容又发了一条。

**解法**：发送成功后 stdout 输出空字符串，让调度器静默。失败则输出到 stderr 并 `sys.exit(1)`，让调度器发告警：

```python
if not result.get("ok"):
    print(f"发送失败: {result['error']}", file=sys.stderr)
    sys.exit(1)
print("")  # 静默
```

### 坑五：手动触发测试时任务「没反应」

**症状**：手动触发一次任务，结果什么都没收到。

**原因**：Agent 模式的任务在「没有新内容」时会返回 `[SILENT]` 标记，调度器据此**抑制投递**——这是防骚扰设计，但调试时很困惑。

**解法**：触发时注入临时提示词强制输出：

```python
cronjob(action="run", job_id="xxx", prompt="【测试】本次必须输出完整日报，禁止 [SILENT]")
```

### 坑六：Discord 不渲染 `•` 列表

**症状**：生成的日报用了 `•` 做列表符号，在 Discord 里显示为纯文本，没有渲染成列表。

**原因**：Discord 的 markdown 只认 `-` 或 `1.` 做列表，`•` 是普通字符。

**解法**：生成内容时用 `- ` 前缀：

```markdown
- 最近提交：2 天前（8-18）`b83027b`
- 线上：https://sansi-sanxing.vercel.app
```

## 模式选择：什么时候用哪个

沉淀下来一个简单的决策规则：

### 用 No-Agent（脚本）的场景

- 输出格式固定（日报、周报、监控告警、价格提醒）
- 数据来源是确定的（git、API、数据库查询）
- 内容不需要「智能解读」，规则能表达
- 每天都要跑，token 成本敏感

### 用 Agent（模型）的场景

- 需要总结、提炼、判断（「今天有什么值得关注的」）
- 数据是结构化的但结论需要推理
- 输出质量比成本重要
- 任务逻辑会频繁变化，脚本维护成本高

一个实用的混合策略：**脚本负责采集和投递，模型负责点评**。日报正文由脚本生成（稳定、零成本），最后一行可以额外调用一次模型生成一句「AI 观察」——这样既有稳定性，又有智能感。

```python
# 混合模式示例：脚本生成主体，模型补一句点评
content = build_report_body()          # 脚本生成，100% 稳定
if args.include_ai_note:
    content += "\n\n> 💡 " + call_llm(summarize(content))
```

## 验证与上线流程

一个定时任务从写好到放心交给它「天天跑」，至少要经过四步验证。

### 第一步：本地调试

先看内容对不对：

```bash
python3 scripts/daily_report.py --print
```

确认格式、数据、渲染效果都对了，再进入下一步。`--print` 模式不发送任何消息，可以反复跑。

### 第二步：真实发送测试

直接跑一次发送模式，在频道里看真实效果——markdown 渲染、引用样式、锚点选择，全部以实际结果为准：

```bash
python3 scripts/daily_report.py
```

发完立刻查一下 API，确认 `message_reference` 指向了正确的消息：

```bash
curl -H "Authorization: Bot $TOKEN" \
  "https://discord.com/api/v10/channels/$CHANNEL/messages?limit=1" \
  | jq '.[0].message_reference'
```

### 第三步：调度器预演

配置好 cron 后，手动触发一次，确认整条链路（调度器 → 脚本 → 发送 → 静默）通畅：

```text
Cron job finished.
Mode: no_agent (script)
Status: silent (empty output)
```

`silent` 正是预期结果——脚本自己发完了，调度器没有重复投递。

### 第四步：真实定时验证

最后一步很关键：**临时把调度时间改到几分钟后**，等它真实触发一次，让用户亲眼看到「定时路径」的效果（而不是手动触发）：

```python
cronjob(action="update", job_id="xxx", schedule="49 12 * * *")  # 临时 12:49
```

用户确认效果 OK 后，立刻改回正式时间：

```python
cronjob(action="update", job_id="xxx", schedule="0 9 * * *")    # 正式 9:00
```

一个任务验证通过后，再推广到其他任务——**先单点验证，再批量复制**，避免一次引入多个变量。

## 常见问题 FAQ

### 为什么不直接用现有的 cron 投递系统，要自己写脚本？

现有的投递系统只支持三种形态：独立消息、带 header/footer 的包装消息、进专属线程。**不支持「回复某条消息」的引用样式**，这是架构上的限制——投递层没有 `message_reference` 参数。如果这个限制对你不重要，用系统投递就够了，省心。

### 脚本模式会不会丢了「智能总结」能力？

会，但这是设计取舍。日报的「智能总结」本质上是模型把已经有的数据重述一遍——「最久未动的是 pastebin，6 天没更新了」——这个规则脚本也能算出来，只不过写死逻辑而不是靠模型推理。如果确实需要 AI 点评，可以用混合模式：脚本生成主体，调一次模型补一句「AI 观察」，成本可控。

### 如果我想在其他平台（Telegram、Slack）也实现回复样式？

原理是一样的：找该平台的消息 API 文档，看是否有 `reply_to` 或 `message_reference` 或 `thread_ts` 之类的参数。Telegram 用 `reply_to_message_id`，Slack 用 `thread_ts`。核心逻辑不变——脚本采集数据 → 生成内容 → 调 API 带引用参数发送。踩坑可能不同，但思路通用。

### 每天九点跑，万一那会儿服务器网络波动怎么办？

脚本模式的任务如果失败（网络超时、API 错误），`sys.exit(1)` 会让调度器记录为一次失败，并发送告警消息。调度器不会自动重试当次运行（定时任务错过就错过了），但下一轮（明天九点）会正常执行。如果担心错过，可以加一个「失败后 5 分钟重试」的机制——不过对我们来说，每天一次的日报，偶发失败远没有「每天收到废话」烦人，所以选择了简单模式。

### 怎么验证消息确实以「回复」样式发出去了？

用 API 查最新消息的 `message_reference`：

```bash
curl -s -H "Authorization: Bot $TOKEN" \
  "https://discord.com/api/v10/channels/$CHANNEL_ID/messages?limit=1" \
  | jq '.[0].message_reference'
```

输出应该是 `{"message_id": "xxx"}`，其中 `message_id` 指向用户的消息 ID。如果指向 bot 自己的消息，就是引用错了。

### 我只有一个脚本，但想做多个定时任务怎么办？

模板脚本已经设计为可复用：`send_discord_reply` 函数是通用的，`build_content` 函数替换成你自己的内容生成逻辑就行。每个定时任务对应一个脚本文件，各自的 `build_content` 不同，但发送函数可以共享。我甚至把发送函数放在了一个单独的模块里，所有脚本 `import` 它——改一次 UA、代理处理，所有任务都受益。

## 沉淀：把经验变成可复用资产

这套流程最终沉淀成了两个资产，下次再做定时任务直接复用：

### 资产一：模板脚本

一个「内容生成 + Discord 回复样式发送」一体的模板，改几个变量就能用：

```python
# 需要改的只有三个常量
CHANNEL_ID = "<频道ID>"
USER_ID = "<用户ID>"        # 引用锚点：该用户最近一条消息
ENV_FILE = ".../.env"       # 放 DISCORD_BOT_TOKEN 的文件
```

模板自带所有踩坑处理：UA 头、代理绕过、锚点选择、静默协议。

### 资产二：技能文档

把完整流程（写脚本 → 本地调试 → 配 cron → 预演 → 正式上线）和九条踩坑清单写成了团队的技能文档，加载即用。以后不管是加监控任务、周报任务、还是提醒任务，都按同一套流程走。

## 总结

回顾整个演进过程，本质是三个认知的升级：

1. **约束模型不如换掉模型**：内容固定、格式稳定的任务，不该让 LLM 参与。No-Agent 脚本模式零成本、零废话、零波动——它不是「退步」，而是把模型用在它该用的地方。
2. **系统能力不够就绕行**：框架不支持「回复样式投递」，那就让脚本直接调用平台 API。架构限制不等于业务限制，绕过一层往往更灵活。
3. **经验要沉淀**：六个坑、四条验证步骤、两个资产——这些东西一次踩过，就要让它变成下次的「默认正确」。

如果你也在给 AI 助手配置定时任务，希望这份实战经验能让你少踩一半的坑。最核心的一句话送给你：**定时任务里，模型不是必需品，稳定的输出才是。**
