# loczb 开发工作交接文档

**创建时间**: 2026-04-24 13:45  
**创建者**: 小团 (main agent)  
**接收者**: 小马 (xiaoma agent)

---

## ✅ 已完成工作（小团完成）

### 1. AI 助手对话框

**文件位置**：
- `assets/js/ai-assistant.js` - 主逻辑（11KB）
- `assets/css/ai-assistant.css` - 样式（7KB）
- `assets/js/ai-config.js` - API 配置（已加入.gitignore）
- `scripts/setup-ai-assistant.js` - 配置生成脚本

**功能**：
- 基于 Bailian Qwen3.5-plus 的对话助手
- 右下角浮动按钮，点击打开对话框
- 支持消息历史、打字动画、主题切换
- 系统提示词已配置（关于张小猛的背景信息）

**集成状态**：
- ✅ 已添加到 `index.html`
- ✅ 已提交并推送到 GitHub
- ✅ 配置脚本可从 secrets.json 读取 API Key

**使用方法**：
```bash
# 更新 API 配置
node scripts/setup-ai-assistant.js
```

### 2. 背景图片生成

**文件**：
- `assets/images/qwen_20260424_122926_1.png` (1920x1080, 3.5M) - Hero 背景
- `assets/images/qwen_20260424_122938_1.png` (1200x800, 895K) - 项目卡片背景

**生成工具**：
- 阿里百炼 Qwen-Image 2.0 Pro
- 提示词已优化（简洁科技感、极简主义）

**状态**：
- ✅ 已提交并推送到 GitHub
- ✅ 本地保存，不受 URL 过期影响

### 3. 系统清理

- 清理临时记忆文件 4 个
- 清理 2 月旧记忆文件 23 个（约 200K）
- 清理 yum 缓存（33 个文件）
- 清理系统日志（3.5M）

---

## 📝 待办事项（交给小马）

### 1. 个人介绍页面完善 ⭐⭐⭐

**位置**: `/about/index.html`

**当前状态**: 页面已存在，需充实内容

**建议内容**:
- [ ] 个人经历时间线（教育、工作）
- [ ] 技能详情展示（按熟练度分组）
- [ ] 工作经历/项目经验
- [ ] 联系方式/社交媒体链接
- [ ] 个人照片/头像（可选 AI 生成）

**技术建议**:
- 保持现有设计风格（深色主题、简洁卡片）
- 使用时间线组件展示经历
- 添加简单的进入动画

### 2. 项目展示区优化 ⭐⭐⭐

**位置**: `/projects/index.html`

**当前状态**: 基础结构已存在

**建议改进**:
- [ ] 添加更多项目卡片（至少 5 个）
- [ ] 集成 AI 生成的背景图（已生成 2 张）
- [ ] 添加项目筛选功能（按技术栈）
- [ ] 添加项目详情页面
- [ ] 添加 GitHub 统计信息（Stars、Forks）

**可添加的项目**:
1. loczb 个人主页（当前项目）
2. No Fap Tracker Web（React + Go）
3. OpenClaw 实践（AI Agent 工作流）
4. ONNX 移动端侧模型实践
5. 其他个人项目

### 3. AI 助手优化 ⭐⭐

**位置**: `assets/js/ai-assistant.js`

**当前状态**: 基础对话功能已完成

**建议改进**:
- [ ] 添加 RAG 功能（基于博客内容向量检索）
- [ ] 添加常见问题预设（点击快速提问）
- [ ] 优化回答格式（支持 Markdown 渲染）
- [ ] 添加对话导出功能
- [ ] 添加用户反馈机制

**技术实现**:
- RAG: 使用 Supabase pgvector（免费）
- Markdown: marked.js 或 markdown-it
- 向量库：博客内容预先嵌入

### 4. 端侧 AI 演示页面 ⭐

**位置**: 新建 `/lab/` 目录

**建议内容**:
- [ ] ONNX 模型浏览器演示
- [ ] 手写数字识别（MNIST）
- [ ] 文本分类体验
- [ ] 图片分类演示

**技术栈**:
- ONNX Runtime Web
- TensorFlow.js
- 简单的 HTML/CSS/JS

---

## 🔧 技术细节

### AI 助手配置

```javascript
// assets/js/ai-config.js (自动生成，不要手动修改)
window.AI_ASSISTANT_CONFIG = {
  apiKey: 'sk-sp-b42f205b0e5a4ae6b38ecb86ac997fea',
  apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  model: 'qwen3.5-plus'
};
```

### API 信息

- **Provider**: Bailian (阿里百炼)
- **Model**: qwen3.5-plus
- **API Key 到期**: 2026-04-26（2 天后）
- **图片生成**: qwen-image-2.0-pro

### 代码提交记录

```
dbf6b16 - chore: 添加 AI 生成的背景图片
1de274a - feat: 添加 AI 助手对话框功能
00cf8d1 - fix: 整合筛选和分页逻辑，修复筛选后分页错误
```

### 项目结构

```
loczb/
├── index.html              # 首页（已集成 AI 助手）
├── about/
│   └── index.html          # 关于页面（待完善）
├── projects/
│   └── index.html          # 项目页面（待优化）
├── blog/
│   ├── index.html          # 博客列表
│   └── posts/              # 博客文章
├── assets/
│   ├── css/
│   │   ├── style.css       # 主样式
│   │   └── ai-assistant.css # AI 助手样式
│   ├── js/
│   │   ├── main.js         # 主逻辑
│   │   ├── ai-assistant.js # AI 助手逻辑
│   │   └── ai-config.js    # AI 配置（.gitignore）
│   └── images/             # 图片资源
└── scripts/
    └── setup-ai-assistant.js # 配置生成脚本
```

---

## ⚠️ 注意事项

### 1. 百炼 API Key 即将到期

**到期时间**: 2026-04-26（2 天后）

**影响**:
- AI 助手对话框将无法调用 API
- 图片生成功能无法使用

**解决方案**:
- 方案 A: 续费百炼订阅
- 方案 B: 切换到其他提供商（astron 已配置）
- 方案 C: 移除 AI 功能，保持静态网站

**建议**: 如果用户没有明确续费，建议切换到 astron 或移除 AI 功能

### 2. 图片 URL 有效期

- 百炼生成的图片 URL 有效期 24 小时
- 已保存到本地 `assets/images/`，无需担心
- GitHub Pages 会自动托管

### 3. AI 助手样式

- 已适配深色/浅色主题
- 响应式设计（移动端已优化）
- 浮动按钮位置：右下角 2rem
- 面板尺寸：380x550px（移动端自适应）

### 4. 性能考虑

- AI 助手 JS 文件大小：12KB（未压缩）
- CSS 文件大小：7KB（未压缩）
- 建议：生产环境使用 Terser 压缩

---

## 📞 联系方式

如有疑问，请联系小团（main agent）：
- Discord: 通过 OpenClaw 发送消息
- 会话：`agent:main:main`

---

**最后更新**: 2026-04-24 13:45
