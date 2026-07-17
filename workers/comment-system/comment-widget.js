/**
 * loczb 评论组件 v2
 * 自动注入到文章页面，提供评论/回复/编辑/删除功能
 * 
 * 用法: 在文章 HTML 的 </body> 前引入:
 *   <script src="/workers/comment-system/comment-widget.js"></script>
 * CSS 通过 JS 自动加载，无需手动引入
 */
(function () {
  'use strict';

  // ========== 配置 ==========
  // 部署后替换为实际 Workers URL
  const API_BASE = 'https://loczb-comments.709527.workers.dev';
  const API_URL = API_BASE + '/api/comments';
  // CSS 路径（相对于站点根目录，GitHub Pages 也能访问）
  const CSS_PATH = '/workers/comment-system/comment-widget.css';

  // ========== 工具函数 ==========

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Gravatar 头像 URL
  function getAvatarUrl(email, size) {
    if (!email) return null;
    // 使用 CryptoAPI 计算 SHA-256（Gravatar 支持 SHA-256）
    // 回退：如果不支持，返回 null 使用首字母头像
    return null; // 暂不使用 Gravatar，直接用首字母头像
  }

  // 首字母头像
  function getInitials(name) {
    if (!name) return '?';
    const first = name.trim()[0];
    return first.toUpperCase();
  }

  // 头像背景色
  function getAvatarColor(name) {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
      '#10b981', '#06b6d4', '#3b82f6', '#ef4444',
      '#a855f7', '#14b8a6', '#f97316', '#84cc16',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  // Markdown 渲染（延迟加载 marked + DOMPurify）
  let markedLoaded = false;
  function loadMarked(callback) {
    if (markedLoaded && window.marked && window.DOMPurify) {
      callback();
      return;
    }
    let loaded = 0;
    const need = 2;
    function check() {
      loaded++;
      if (loaded === need) {
        markedLoaded = true;
        if (window.marked) {
          window.marked.setOptions({ breaks: true, gfm: true });
        }
        callback();
      }
    }
    // 加载 marked
    const s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js';
    s1.onload = check;
    s1.onerror = check;
    document.head.appendChild(s1);
    // 加载 DOMPurify（XSS 防护）
    const s2 = document.createElement('script');
    s2.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js';
    s2.onload = check;
    s2.onerror = check;
    document.head.appendChild(s2);
  }

  function renderMarkdown(text) {
    if (window.marked && window.DOMPurify) {
      try {
        const raw = window.marked.parse(text);
        return window.DOMPurify.sanitize(raw, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote', 'del', 'ins', 'h1', 'h2', 'h3', 'h4', 'hr', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
          ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'class'],
        });
      } catch (e) {
        return escapeHtml(text);
      }
    }
    return escapeHtml(text).replace(/\n/g, '<br>');
  }

  // 从 URL 获取 slug
  function getPostSlug() {
    const path = window.location.pathname;
    const match = path.match(/\/blog\/posts\/(.+?)\.html?$/);
    if (match) return decodeURIComponent(match[1]);
    // 回退：从 canonical 或 og:url
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      const m = canonical.href.match(/\/blog\/posts\/(.+?)\.html?/);
      if (m) return decodeURIComponent(m[1]);
    }
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      const m = ogUrl.content.match(/\/blog\/posts\/(.+?)\.html?/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  }

  // Token 管理（localStorage）
  function getTokenKey(commentId) {
    return 'loczb_comment_token_' + commentId;
  }
  function saveToken(commentId, token) {
    try { localStorage.setItem(getTokenKey(commentId), token); } catch (e) {}
  }
  function getToken(commentId) {
    try { return localStorage.getItem(getTokenKey(commentId)); } catch (e) { return null; }
  }
  function removeToken(commentId) {
    try { localStorage.removeItem(getTokenKey(commentId)); } catch (e) {}
  }

  // 用户信息持久化
  function saveUserInfo(author, email) {
    try { localStorage.setItem('loczb_comment_user', JSON.stringify({ author, email })); } catch (e) {}
  }
  function getUserInfo() {
    try { return JSON.parse(localStorage.getItem('loczb_comment_user') || '{}'); } catch (e) { return {}; }
  }

  // 时间格式化
  function formatTime(dateStr) {
    // dateStr 是 +8 时区的字符串，如 "2026-07-17 14:24:00"
    // 转为 Date 对象
    const date = new Date(dateStr.replace(' ', 'T') + '+08:00');
    const now = new Date();
    const diff = (now - date) / 1000;

    if (diff < 0) return '刚刚';
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 2592000) return Math.floor(diff / 86400) + ' 天前';

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ========== 渲染 ==========

  function renderComment(comment, depth) {
    const token = getToken(comment.id);
    const isOwner = !!token;
    const initials = getInitials(comment.author);
    const avatarColor = getAvatarColor(comment.author);
    const isEdited = comment.updated_at && comment.created_at && comment.updated_at !== comment.created_at;

    let html = `
      <div class="comment-item" data-id="${comment.id}">
        <div class="comment-header">
          <div class="comment-avatar" style="background: ${avatarColor};">${escapeHtml(initials)}</div>
          <div class="comment-meta">
            <span class="comment-author">${escapeHtml(comment.author)}</span>
            <span class="comment-time" title="${escapeHtml(comment.created_at)}">${formatTime(comment.created_at)}</span>
            ${isEdited ? '<span class="comment-edited">(已编辑)</span>' : ''}
          </div>
        </div>
        <div class="comment-body" data-raw="${escapeHtml(comment.content)}">${renderMarkdown(comment.content)}</div>
        <div class="comment-actions">
          <button class="comment-action-btn" data-action="reply" data-id="${comment.id}" data-author="${escapeHtml(comment.author)}">回复</button>`;

    if (isOwner) {
      html += `
          <button class="comment-action-btn" data-action="edit" data-id="${comment.id}">编辑</button>
          <button class="comment-action-btn danger" data-action="delete" data-id="${comment.id}">删除</button>`;
    }

    html += `</div>`;

    // 子评论
    if (comment.children && comment.children.length > 0) {
      html += `<div class="comment-children">`;
      for (const child of comment.children) {
        html += renderComment(child, depth + 1);
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  // 绑定评论列表中的按钮事件（事件委托）
  function bindCommentListEvents(container) {
    const listEl = container.querySelector('#comment-list');
    if (!listEl) return;

    listEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.comment-action-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id);
      const author = btn.dataset.author;
      if (action === 'reply') CommentSystem.reply(id, author);
      else if (action === 'edit') CommentSystem.edit(id);
      else if (action === 'delete') CommentSystem.del(id);
    });
  }

  // ========== 评论系统主组件 ==========
  const CommentSystem = {
    slug: null,
    container: null,
    replyTo: null,
    editing: false,

    init(container) {
      this.slug = getPostSlug();
      if (!this.slug) {
        console.warn('[loczb-comments] 无法获取文章 slug');
        return;
      }
      this.container = container;
      this.render();
      this.loadComments();
      bindCommentListEvents(container);
    },

    render() {
      const userInfo = getUserInfo();
      this.container.innerHTML = `
        <div class="loczb-comments" id="loczb-comments-section">
          <h2 class="loczb-comments-title">
            💬 评论
            <span class="loczb-comments-count" id="comment-count">0</span>
          </h2>

          <div id="comment-message-area"></div>

          <div class="comment-form-wrapper">
            <form class="comment-form" id="comment-form" onsubmit="return false;">
              <div class="comment-form-row">
                <input type="text" class="comment-input" id="comment-author" placeholder="昵称 *" value="${escapeHtml(userInfo.author || '')}" required maxlength="50">
                <input type="email" class="comment-input" id="comment-email" placeholder="邮箱（可选，用于头像）" value="${escapeHtml(userInfo.email || '')}" maxlength="200">
              </div>
              <textarea class="comment-textarea" id="comment-content" placeholder="写下你的评论... 支持 Markdown" required maxlength="5000"></textarea>
              <div class="comment-md-hint">支持 Markdown 格式（**粗体**、*斜体*、<code>code</code>、> 引用等）</div>
              <div class="comment-form-actions">
                <span class="comment-form-hint">昵称即可评论，无需注册</span>
                <button type="submit" class="comment-submit" id="comment-submit">发表评论</button>
              </div>
            </form>
          </div>

          <div class="comment-list" id="comment-list">
            <div class="comment-loading">
              <span class="comment-loading-spinner"></span>
              加载评论中...
            </div>
          </div>
        </div>
      `;

      // 绑定表单提交
      const form = this.container.querySelector('#comment-form');
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitComment();
      });
    },

    async loadComments() {
      const listEl = this.container.querySelector('#comment-list');
      const countEl = this.container.querySelector('#comment-count');

      try {
        const res = await fetch(`${API_URL}?slug=${encodeURIComponent(this.slug)}`);
        const data = await res.json();

        if (!data.ok || !data.comments) {
          listEl.innerHTML = '<div class="comment-empty"><div class="comment-empty-icon">💬</div>评论加载失败，请稍后再试</div>';
          return;
        }

        countEl.textContent = data.total;

        if (data.comments.length === 0) {
          listEl.innerHTML = `
            <div class="comment-empty">
              <div class="comment-empty-icon">💬</div>
              <p>还没有评论，来说点什么吧～</p>
            </div>
          `;
          return;
        }

        loadMarked(() => {
          let html = '';
          for (const c of data.comments) {
            html += renderComment(c, 0);
          }
          listEl.innerHTML = html;
        });
      } catch (err) {
        listEl.innerHTML = '<div class="comment-empty"><div class="comment-empty-icon">💬</div>评论加载失败，请检查网络连接</div>';
      }
    },

    showMessage(text, type) {
      const area = this.container.querySelector('#comment-message-area');
      area.innerHTML = `<div class="comment-message ${type}">${escapeHtml(text)}</div>`;
      setTimeout(() => { area.innerHTML = ''; }, 5000);
    },

    async submitComment() {
      const author = this.container.querySelector('#comment-author').value.trim();
      const email = this.container.querySelector('#comment-email').value.trim();
      const content = this.container.querySelector('#comment-content').value.trim();

      if (!author) { this.showMessage('请输入昵称', 'error'); return; }
      if (!content) { this.showMessage('请输入评论内容', 'error'); return; }

      const submitBtn = this.container.querySelector('#comment-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = '提交中...';

      const body = { slug: this.slug, author, email, content };
      if (this.replyTo) body.parent_id = this.replyTo.id;

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (data.ok) {
          saveToken(data.id, data.edit_token);
          saveUserInfo(author, email);
          this.container.querySelector('#comment-content').value = '';
          this.cancelReply();
          this.showMessage('评论成功！', 'success');
          this.loadComments();
        } else {
          this.showMessage(data.error || '评论失败', 'error');
        }
      } catch (err) {
        this.showMessage('网络错误，请稍后再试', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '发表评论';
      }
    },

    reply(commentId, author) {
      this.replyTo = { id: commentId, author };
      this.cancelEdit();

      // 显示回复预览
      let preview = this.container.querySelector('#comment-reply-preview');
      if (preview) preview.remove();

      const formWrapper = this.container.querySelector('.comment-form-wrapper');
      preview = document.createElement('div');
      preview.id = 'comment-reply-preview';
      preview.className = 'comment-reply-preview';
      preview.innerHTML = `回复 <span class="reply-to">@${escapeHtml(author)}</span> <button class="comment-action-btn" data-action="cancel-reply" style="float:right;">取消</button>`;
      formWrapper.insertBefore(preview, formWrapper.firstChild);

      // 绑定取消按钮
      preview.querySelector('[data-action="cancel-reply"]').addEventListener('click', () => this.cancelReply());

      // 聚焦
      this.container.querySelector('#comment-content').focus();
      this.container.querySelector('#comment-content').scrollIntoView({ behavior: 'smooth', block: 'center' });
    },

    cancelReply() {
      this.replyTo = null;
      const preview = this.container.querySelector('#comment-reply-preview');
      if (preview) preview.remove();
    },

    edit(commentId) {
      this.cancelReply();
      this.editing = commentId;

      const item = this.container.querySelector(`.comment-item[data-id="${commentId}"]`);
      if (!item) return;
      const body = item.querySelector('.comment-body');
      const rawContent = body.getAttribute('data-raw') || body.textContent;

      body.innerHTML = `
        <div class="comment-edit-form">
          <textarea class="comment-textarea" id="edit-content-${commentId}">${escapeHtml(rawContent)}</textarea>
          <div class="comment-actions" style="margin-top:0.5rem;">
            <button class="comment-action-btn" data-action="save-edit" data-id="${commentId}">保存</button>
            <button class="comment-action-btn" data-action="cancel-edit" data-id="${commentId}">取消</button>
          </div>
        </div>
      `;

      // 绑定按钮
      body.querySelector('[data-action="save-edit"]').addEventListener('click', () => this.saveEdit(commentId));
      body.querySelector('[data-action="cancel-edit"]').addEventListener('click', () => this.cancelEdit());
      body.querySelector(`#edit-content-${commentId}`).focus();
    },

    async saveEdit(commentId) {
      const textarea = this.container.querySelector(`#edit-content-${commentId}`);
      const content = textarea.value.trim();
      const token = getToken(commentId);

      if (!content) { this.showMessage('内容不能为空', 'error'); return; }
      if (!token) { this.showMessage('无法验证身份，请刷新页面', 'error'); return; }

      try {
        const res = await fetch(`${API_URL}/${commentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, edit_token: token }),
        });
        const data = await res.json();

        if (data.ok) {
          this.showMessage('评论已更新', 'success');
          this.editing = false;
          this.loadComments();
        } else {
          this.showMessage(data.error || '更新失败', 'error');
        }
      } catch (err) {
        this.showMessage('网络错误', 'error');
      }
    },

    cancelEdit() {
      this.editing = false;
      this.loadComments();
    },

    async del(commentId) {
      if (!confirm('确定要删除这条评论吗？删除后无法恢复。')) return;

      const token = getToken(commentId);
      if (!token) { this.showMessage('无法验证身份', 'error'); return; }

      try {
        const res = await fetch(`${API_URL}/${commentId}?token=${encodeURIComponent(token)}`, {
          method: 'DELETE',
        });
        const data = await res.json();

        if (data.ok) {
          removeToken(commentId);
          this.showMessage('评论已删除', 'success');
          this.loadComments();
        } else {
          this.showMessage(data.error || '删除失败', 'error');
        }
      } catch (err) {
        this.showMessage('网络错误', 'error');
      }
    },
  };

  // 暴露到全局（调试用）
  window.__loczbComments = CommentSystem;

  // ========== 自动注入 ==========

  function loadCSS() {
    if (document.querySelector(`link[href="${CSS_PATH}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_PATH;
    document.head.appendChild(link);
  }

  function injectComments() {
    // 检查是否在文章页
    if (!getPostSlug()) return;
    // 检查是否已注入
    if (document.getElementById('loczb-comments-section')) return;

    // 找到文章 </article> 后的位置
    const article = document.querySelector('article.post-content');
    if (!article) return;

    // 加载 CSS
    loadCSS();

    // 创建容器
    const container = document.createElement('div');
    container.id = 'loczb-comments-container';
    container.className = 'container-narrow';

    // 插入到 article 后面的 container-narrow 内
    const parent = article.closest('.container-narrow') || article.parentElement;
    if (parent) {
      parent.appendChild(container);
    } else {
      article.after(container);
    }

    // 初始化
    CommentSystem.init(container);
  }

  // 等待 DOM 和文章内容加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(injectComments, 300);
    });
  } else {
    setTimeout(injectComments, 300);
  }

  // MutationObserver 作为后备
  let observerAttempts = 0;
  const observer = new MutationObserver(function () {
    if (document.getElementById('loczb-comments-section')) {
      observer.disconnect();
      return;
    }
    if (observerAttempts++ > 20) {
      observer.disconnect();
      return;
    }
    if (document.querySelector('article.post-content')) {
      injectComments();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

})();
