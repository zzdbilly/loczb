/**
 * AI Assistant - 简洁清爽的 AI 助手对话框
 * 基于 Bailian Qwen API
 */

class AIAssistant {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.apiUrl = config.apiUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    this.model = config.model || 'qwen3.5-plus';
    this.isOpen = false;
    this.messages = [];
    this.isLoading = false;
    
    this.init();
  }

  init() {
    // 检查 API Key 是否有效
    if (!this.apiKey || this.apiKey.length < 10) {
      console.warn('AI Assistant: API Key not configured, feature disabled');
      return; // 不初始化 UI
    }
    this.createUI();
    this.bindEvents();
    this.loadHistory();
  }

  createUI() {
    const html = `
      <!-- AI Assistant Toggle Button -->
      <button id="ai-assistant-toggle" class="ai-assistant-toggle" aria-label="打开 AI 助手" title="AI 助手">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>
        </svg>
        <span class="ai-assistant-badge">AI</span>
      </button>

      <!-- AI Assistant Panel -->
      <div id="ai-assistant-panel" class="ai-assistant-panel" aria-hidden="true">
        <div class="ai-assistant-header">
          <div class="ai-assistant-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
              <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>
            </svg>
            <span>AI 助手</span>
          </div>
          <button class="ai-assistant-close" aria-label="关闭 AI 助手">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="ai-assistant-messages" id="ai-assistant-messages">
          <div class="ai-message ai-message-welcome">
            <div class="ai-message-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>
              </svg>
            </div>
            <div class="ai-message-content">
              <p>你好！我是 loczb 的 AI 助手，可以帮你了解：</p>
              <ul>
                <li>张小猛的技术背景和项目</li>
                <li>网站上的博客内容</li>
                <li>技术栈和开发经验</li>
              </ul>
              <p>有什么想问的吗？😊</p>
            </div>
          </div>
        </div>

        <div class="ai-assistant-input">
          <input 
            type="text" 
            id="ai-assistant-input" 
            placeholder="输入问题..." 
            autocomplete="off"
            aria-label="输入问题"
          />
          <button id="ai-assistant-send" class="ai-assistant-send" aria-label="发送消息">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
  }

  bindEvents() {
    const toggle = document.getElementById('ai-assistant-toggle');
    const close = document.querySelector('.ai-assistant-close');
    const panel = document.getElementById('ai-assistant-panel');
    const send = document.getElementById('ai-assistant-send');
    const input = document.getElementById('ai-assistant-input');

    toggle.addEventListener('click', () => this.toggle());
    close.addEventListener('click', () => this.close());
    send.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (this.isOpen && !panel.contains(e.target) && !toggle.contains(e.target)) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    const panel = document.getElementById('ai-assistant-panel');
    const toggle = document.getElementById('ai-assistant-toggle');
    
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    this.isOpen = true;
    
    setTimeout(() => {
      document.getElementById('ai-assistant-input').focus();
    }, 300);
  }

  close() {
    const panel = document.getElementById('ai-assistant-panel');
    const toggle = document.getElementById('ai-assistant-toggle');
    
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    this.isOpen = false;
  }

  async sendMessage() {
    const input = document.getElementById('ai-assistant-input');
    const message = input.value.trim();
    
    if (!message || this.isLoading) return;

    // 添加用户消息
    this.addMessage(message, 'user');
    input.value = '';

    // 添加加载状态
    this.addLoadingMessage();

    this.isLoading = true;

    try {
      const response = await this.callAPI(message);
      this.removeLoadingMessage();
      this.addMessage(response, 'assistant');
      this.saveHistory(message, response);
    } catch (error) {
      this.removeLoadingMessage();
      // 显示详细错误信息（开发环境）
      const errorMsg = error.message.includes('HTTP 4') || error.message.includes('HTTP 5')
        ? `API 错误：${error.message}`
        : '抱歉，出现了一些问题，请稍后再试。';
      this.addMessage(errorMsg, 'assistant');
      console.error('AI Assistant Error:', error);
    }

    this.isLoading = false;
  }

  addMessage(content, role) {
    const messagesContainer = document.getElementById('ai-assistant-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ai-message-${role}`;
    
    const avatar = role === 'user' 
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="20" cy="21" r="1"/><circle cx="4" cy="21" r="1"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M2 21v-2a4 4 0 0 1 3-3.87"/><path d="M8 3.13a4 4 0 0 0 0 7.75"/></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/></svg>`;

    messageDiv.innerHTML = `
      <div class="ai-message-avatar">${avatar}</div>
      <div class="ai-message-content">
        <p>${this.escapeHtml(content)}</p>
      </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  addLoadingMessage() {
    const messagesContainer = document.getElementById('ai-assistant-messages');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-message ai-message-assistant ai-message-loading';
    loadingDiv.id = 'ai-loading-message';
    
    loadingDiv.innerHTML = `
      <div class="ai-message-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          <path d="M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"/>
        </svg>
      </div>
      <div class="ai-message-content">
        <div class="ai-typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  removeLoadingMessage() {
    const loading = document.getElementById('ai-loading-message');
    if (loading) loading.remove();
  }

  async callAPI(message) {
    // 系统提示词
    const systemPrompt = `你是 loczb 个人网站的 AI 助手，网站主人是张小猛。

**关于张小猛**：
- 职业：安卓开发工程师，5+ 年经验
- 技术栈：Android(Kotlin/Jetpack Compose), AI/LLM, 前端 (React/Vue), 后端 (Node.js/Python/Go)
- 兴趣：AI Agent、端侧 AI、自动化工具
- 项目：loczb 个人主页、No Fap Tracker、OpenClaw 实践
- 特点：注重效率，喜欢探索新技术

**你的任务**：
- 回答关于张小猛的技术背景、项目经验的问题
- 介绍网站上的博客内容和技术栈
- 保持友好、简洁、专业的语气
- 不知道的问题诚实回答，不要编造

**限制**：
- 只回答与张小猛、他的项目、技术相关的问题
- 不涉及政治、色情、暴力等敏感话题
- 回答控制在 200 字以内`;

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...this.messages.slice(-10), // 保留最近 10 条消息
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    };

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    // 读取响应文本（即使失败）
    const responseText = await response.text();
    
    if (!response.ok) {
      const errorDetails = `HTTP ${response.status}: ${responseText.substring(0, 200)}`;
      console.error('AI API Error:', errorDetails);
      throw new Error(errorDetails);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      const errorDetails = 'API 响应不是有效 JSON: ' + responseText.substring(0, 100);
      console.error('AI API Error:', errorDetails);
      throw new Error(errorDetails);
    }
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      const errorDetails = 'API 响应格式错误：' + responseText.substring(0, 100);
      console.error('AI API Error:', errorDetails);
      throw new Error(errorDetails);
    }
    
    const reply = data.choices[0].message.content;
    
    // 保存消息历史
    this.messages.push({ role: 'user', content: message });
    this.messages.push({ role: 'assistant', content: reply });

    return reply;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  saveHistory(userMessage, assistantMessage) {
    try {
      const history = JSON.parse(localStorage.getItem('ai-assistant-history') || '[]');
      history.push({
        user: userMessage,
        assistant: assistantMessage,
        timestamp: Date.now()
      });
      // 只保留最近 20 条
      if (history.length > 20) history.shift();
      localStorage.setItem('ai-assistant-history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  loadHistory() {
    try {
      const history = JSON.parse(localStorage.getItem('ai-assistant-history') || '[]');
      if (history.length > 0) {
        // 可以选择加载历史，或者保持干净的欢迎消息
        console.log('AI Assistant: Loaded', history.length, 'history messages');
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }
}

// 初始化 AI 助手（API Key 从 ai-config.js 加载）
document.addEventListener('DOMContentLoaded', () => {
  const config = window.AI_ASSISTANT_CONFIG || {
    apiKey: '',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen3.5-plus'
  };
  
  window.aiAssistant = new AIAssistant(config);
});
