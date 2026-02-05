# loczb 个人主页

一个简洁现代的个人主页网站，使用纯 HTML 和 CSS 构建，无 JavaScript。

## 🌟 特性

- ✅ **纯 HTML/CSS** - 零 JavaScript，轻量快速
- ✅ **响应式设计** - 完美适配手机、平板、电脑
- ✅ **深色/浅色主题** - 自动跟随系统偏好
- ✅ **现代 UI 风格** - 简洁优雅的视觉效果
- ✅ **CSS 动画** - 流畅的交互体验
- ✅ **GitHub Pages** - 免费部署，全球访问

## 📁 项目结构

```
loczb/
├── index.html    # 主页面
├── style.css     # 样式文件
└── README.md     # 项目说明
```

## 🎨 设计特点

### CSS Variables
使用 CSS 变量管理主题色彩，支持深浅色模式自动切换：
```css
:root {
    --bg-primary: #ffffff;
    --accent-primary: #6366f1;
    --accent-gradient: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    /* ... */
}
```

### 布局技术
- **Flexbox** - 导航栏、按钮组、统计数据
- **CSS Grid** - 技能卡片网格、项目展示网格
- **Media Queries** - 响应式断点适配

### 动画效果
- 头像浮动动画
- 技能进度条加载动画
- 卡片悬停效果
- 滚动指示器动画
- 心跳动画（页脚）

### 页面结构
1. **首页/关于我** - 个人介绍、头像、统计数据
2. **技能展示** - 6个技能卡片，带进度条
3. **项目作品** - 4个项目展示卡片
4. **联系方式** - 邮箱、GitHub、微信

## 🚀 本地预览

```bash
# 克隆项目
git clone https://github.com/zzdbilly/loczb.git

# 进入目录
cd loczb

# 使用任意静态服务器预览
# Python 3
python -m http.server 8080

# Node.js
npx serve .

# 然后访问 http://localhost:8080
```

或者直接双击 `index.html` 在浏览器中打开。

## 🌐 在线访问

**GitHub Pages**: https://zzdbilly.github.io/loczb

## 📝 自定义修改

### 修改个人信息
编辑 `index.html` 文件：
- 姓名：搜索 "loczb" 替换
- 邮箱：修改 `mailto:loczb@example.com`
- GitHub：修改 `github.com/zzdbilly`
- 微信：修改 `loczb_dev`

### 修改主题色
编辑 `style.css` 文件中的 CSS 变量：
```css
:root {
    --accent-primary: #6366f1;    /* 主色调 */
    --accent-secondary: #8b5cf6;  /* 辅助色 */
}
```

### 添加/修改技能卡片
在 `index.html` 的 skills 部分，复制 skill-card 结构并修改内容。

### 添加/修改项目
在 `index.html` 的 projects 部分，复制 project-card 结构并修改内容。

## 📱 响应式断点

| 断点 | 宽度 | 布局变化 |
|------|------|----------|
| 桌面 | > 1023px | 3列技能，2列项目 |
| 平板 | 768-1023px | 2列技能，2列项目 |
| 手机 | < 768px | 1列布局 |
| 超小屏 | < 480px | 紧凑布局 |

## ♿ 无障碍支持

- 支持 `prefers-reduced-motion` 媒体查询
- 语义化 HTML 标签
- 足够的颜色对比度
- 键盘可访问的导航

## 📄 许可证

MIT License - 可自由使用和修改

## 👤 关于

Created by **loczb** - 全栈开发者 / 技术爱好者

---

⭐ 如果这个项目对你有帮助，欢迎 Star！