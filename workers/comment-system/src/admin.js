/**
 * loczb 评论系统 - 管理后台
 * 
 * 路由:
 *   GET  /admin/login           - 登录页
 *   POST /admin/login           - 登录 API（用户名+密码）
 *   POST /admin/logout          - 登出
 *   GET  /admin/dashboard       - 控制台（需认证）
 *   GET  /admin/api/comments    - 评论列表（需认证，支持分页/搜索/筛选）
 *   PUT  /admin/api/comments/:id - 编辑评论（需认证）
 *   DELETE /admin/api/comments/:id - 删除评论（需认证）
 */

// === 认证工具 ===

const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000; // 24 小时（毫秒）

// Base64URL 编码
function b64urlEncode(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Base64URL 解码
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

// HMAC-SHA256 签名
async function hmacSign(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 生成认证 token（包含用户名）
async function generateAuthToken(secret, username) {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_MAX_AGE, u: username });
  const payloadB64 = b64urlEncode(payload);
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

// 验证 token
async function verifyAuthToken(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  
  const expectedSig = await hmacSign(payloadB64, secret);
  if (sig !== expectedSig) return null;
  
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64));
    if (Date.now() > payload.exp) return null;
    return payload.u || null; // 返回用户名
  } catch {
    return null;
  }
}

// 从请求中提取并验证 token，返回用户名或 null
async function getAuthUser(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return null;
  const secret = env.ADMIN_PASSWORD || 'admin123';
  return verifyAuthToken(match[1], secret);
}

// 旧接口兼容
async function isAuthenticated(request, env) {
  return (await getAuthUser(request, env)) !== null;
}

// 返回 HTML 页面
function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

// === SVG Logo ===
function logoSVG(size = 36) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c9eff"/>
        <stop offset="100%" stop-color="#5b7cf5"/>
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#logoGrad)"/>
    <path d="M12 16C12 14.8954 12.8954 14 14 14H34C35.1046 14 36 14.8954 36 16V28C36 29.1046 35.1046 30 34 30H22L16 35V30H14C12.8954 30 12 29.1046 12 28V16Z" fill="white" fill-opacity="0.95"/>
    <circle cx="20" cy="22" r="2" fill="#5b7cf5"/>
    <circle cx="27" cy="22" r="2" fill="#5b7cf5"/>
    <circle cx="24" cy="13" r="1.5" fill="white" fill-opacity="0.6"/>
  </svg>`;
}

// === HTML 页面 ===

function loginPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loczb 评论管理 - 登录</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: #0a0c12;
      background-image: 
        radial-gradient(ellipse at 20% 0%, rgba(124, 158, 255, 0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(91, 124, 245, 0.06) 0%, transparent 50%);
      color: #e4e6eb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .login-wrapper {
      width: 100%;
      max-width: 420px;
      margin: 20px;
      animation: fadeInUp 0.6s ease;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .login-card {
      background: rgba(22, 25, 35, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(124, 158, 255, 0.12);
      border-radius: 16px;
      padding: 44px 40px;
      box-shadow: 
        0 24px 48px rgba(0, 0, 0, 0.4),
        0 0 0 1px rgba(255, 255, 255, 0.03) inset;
    }
    .logo-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }
    .logo-area .logo-icon {
      margin-bottom: 16px;
      filter: drop-shadow(0 4px 12px rgba(124, 158, 255, 0.3));
    }
    .logo-area h1 {
      font-size: 1.4rem;
      font-weight: 700;
      background: linear-gradient(135deg, #7c9eff 0%, #5b7cf5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 0.5px;
    }
    .logo-area p {
      font-size: 0.82rem;
      color: #6b7080;
      margin-top: 6px;
    }
    .form-group { margin-bottom: 18px; }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      color: #8b8fa3;
      margin-bottom: 8px;
      font-weight: 500;
      letter-spacing: 0.3px;
    }
    .input-wrapper {
      position: relative;
    }
    .input-wrapper svg {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0.4;
      pointer-events: none;
    }
    .form-group input {
      width: 100%;
      padding: 13px 14px 13px 44px;
      background: rgba(10, 12, 18, 0.6);
      border: 1px solid rgba(124, 158, 255, 0.1);
      border-radius: 10px;
      color: #e4e6eb;
      font-size: 0.92rem;
      transition: all 0.25s ease;
    }
    .form-group input::placeholder { color: #4a4d5a; }
    .form-group input:focus {
      outline: none;
      border-color: rgba(124, 158, 255, 0.5);
      background: rgba(10, 12, 18, 0.8);
      box-shadow: 0 0 0 3px rgba(124, 158, 255, 0.1);
    }
    .btn {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, #7c9eff 0%, #5b7cf5 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px rgba(124, 158, 255, 0.25);
      letter-spacing: 0.5px;
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(124, 158, 255, 0.35);
    }
    .btn:active { transform: translateY(0); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .error {
      color: #ff6b6b;
      font-size: 0.83rem;
      margin-top: 14px;
      display: none;
      text-align: center;
      padding: 8px;
      background: rgba(255, 107, 107, 0.08);
      border-radius: 8px;
      border: 1px solid rgba(255, 107, 107, 0.15);
    }
    .login-footer {
      text-align: center;
      margin-top: 28px;
      font-size: 0.75rem;
      color: #3a3d4a;
    }
  </style>
</head>
<body>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="logo-area">
        <div class="logo-icon">${logoSVG(52)}</div>
        <h1>Loczb Comments</h1>
        <p>评论管理后台</p>
      </div>
      <form id="loginForm">
        <div class="form-group">
          <label for="username">用户名</label>
          <div class="input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <input type="text" id="username" name="username" placeholder="输入用户名" required autofocus>
          </div>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <div class="input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input type="password" id="password" name="password" placeholder="输入密码" required>
          </div>
        </div>
        <button type="submit" class="btn" id="submitBtn">登录</button>
        <div class="error" id="errorMsg"></div>
      </form>
    </div>
    <div class="login-footer">Powered by Cloudflare Workers</div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const errEl = document.getElementById('errorMsg');
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      btn.disabled = true;
      btn.textContent = '登录中...';
      errEl.style.display = 'none';
      
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (data.ok) {
          window.location.href = '/admin/dashboard';
        } else {
          errEl.textContent = data.error || '登录失败';
          errEl.style.display = 'block';
        }
      } catch (err) {
        errEl.textContent = '网络错误，请重试';
        errEl.style.display = 'block';
      }
      btn.disabled = false;
      btn.textContent = '登录';
    });
  </script>
</body>
</html>`;
}

function dashboardPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loczb 评论管理 - 控制台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0a0c12;
      --surface: #14161f;
      --surface-hover: #1a1d27;
      --border: rgba(124, 158, 255, 0.08);
      --border-hover: rgba(124, 158, 255, 0.2);
      --accent: #7c9eff;
      --accent-dim: #5b7cf5;
      --text: #e4e6eb;
      --text-dim: #8b8fa3;
      --text-muted: #555a6e;
      --danger: #ff6b6b;
      --success: #4ec9b0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: var(--bg);
      background-image: radial-gradient(ellipse at 80% -10%, rgba(124, 158, 255, 0.04) 0%, transparent 60%);
      color: var(--text);
      min-height: 100vh;
    }
    /* === 导航栏 === */
    .navbar {
      background: rgba(14, 16, 24, 0.8);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nav-logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .nav-logo .brand {
      font-size: 1.05rem;
      font-weight: 700;
      background: linear-gradient(135deg, #7c9eff 0%, #5b7cf5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: 0.3px;
    }
    .nav-logo .badge {
      font-size: 0.65rem;
      color: var(--text-dim);
      background: rgba(124, 158, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
    }
    .nav-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .nav-user {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      color: var(--text-dim);
    }
    .nav-user .avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7c9eff 0%, #5b7cf5 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .logout-btn {
      background: none;
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 7px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.82rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .logout-btn:hover {
      color: var(--danger);
      border-color: rgba(255, 107, 107, 0.3);
      background: rgba(255, 107, 107, 0.05);
    }
    /* === 统计栏 === */
    .stats-bar {
      display: flex;
      gap: 16px;
      padding: 20px 24px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 22px;
      min-width: 150px;
      transition: all 0.25s ease;
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--accent), transparent);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .stat-card:hover {
      border-color: var(--border-hover);
      transform: translateY(-2px);
    }
    .stat-card:hover::before { opacity: 1; }
    .stat-card .label {
      font-size: 0.72rem;
      color: var(--text-dim);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card .value {
      font-size: 1.6rem;
      font-weight: 700;
      background: linear-gradient(135deg, #7c9eff 0%, #5b7cf5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    /* === 工具栏 === */
    .toolbar {
      padding: 0 24px 16px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .toolbar input, .toolbar select {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      padding: 9px 14px;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .toolbar input { flex: 1; min-width: 220px; }
    .toolbar input:focus, .toolbar select:focus {
      outline: none;
      border-color: rgba(124, 158, 255, 0.4);
      box-shadow: 0 0 0 3px rgba(124, 158, 255, 0.08);
    }
    .toolbar input::placeholder { color: var(--text-muted); }
    /* === 评论列表 === */
    .comment-list { padding: 0 24px 24px; }
    .comment-item {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 10px;
      transition: all 0.2s ease;
    }
    .comment-item:hover {
      border-color: var(--border-hover);
      background: var(--surface-hover);
    }
    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      gap: 12px;
    }
    .comment-meta { flex: 1; min-width: 0; }
    .comment-author {
      font-weight: 600;
      color: var(--text);
      font-size: 0.9rem;
    }
    .comment-email { color: var(--text-dim); font-size: 0.8rem; margin-left: 6px; }
    .comment-slug {
      display: inline-block;
      background: rgba(124, 158, 255, 0.08);
      color: var(--accent);
      font-size: 0.72rem;
      padding: 3px 10px;
      border-radius: 6px;
      margin-top: 5px;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid var(--border);
    }
    .comment-slug:hover {
      background: rgba(124, 158, 255, 0.15);
      border-color: var(--border-hover);
    }
    .comment-time { color: var(--text-dim); font-size: 0.75rem; margin-top: 4px; }
    .comment-content {
      color: #c4c6d1;
      font-size: 0.9rem;
      line-height: 1.6;
      word-break: break-word;
      white-space: pre-wrap;
      padding-top: 4px;
    }
    .comment-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .action-btn {
      padding: 5px 12px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: none;
      color: var(--text-dim);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .action-btn:hover {
      color: var(--text);
      border-color: var(--border-hover);
      background: rgba(124, 158, 255, 0.05);
    }
    .action-btn.danger:hover {
      color: var(--danger);
      border-color: rgba(255, 107, 107, 0.3);
      background: rgba(255, 107, 107, 0.05);
    }
    .comment-id { color: var(--text-muted); font-size: 0.7rem; }
    .parent-info { color: var(--text-dim); font-size: 0.75rem; margin-top: 4px; }
    .parent-info a { color: var(--accent); text-decoration: none; }
    .parent-info a:hover { text-decoration: underline; }
    /* === 分页 === */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      padding: 20px 0;
    }
    .pagination button {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 9px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.84rem;
      transition: all 0.2s;
    }
    .pagination button:hover:not(:disabled) {
      border-color: var(--border-hover);
      background: var(--surface-hover);
    }
    .pagination button:disabled { opacity: 0.35; cursor: not-allowed; }
    .pagination .page-info {
      color: var(--text-dim);
      font-size: 0.84rem;
      padding: 0 8px;
    }
    /* === 模态框 === */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-overlay.active { display: flex; }
    .modal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 28px;
      width: 90%;
      max-width: 520px;
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.5);
      animation: scaleIn 0.25s ease;
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .modal h2 {
      font-size: 1.1rem;
      margin-bottom: 18px;
      color: var(--text);
      font-weight: 600;
    }
    .modal textarea {
      width: 100%;
      min-height: 130px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: var(--text);
      padding: 14px;
      font-size: 0.9rem;
      resize: vertical;
      font-family: inherit;
      transition: border-color 0.2s;
    }
    .modal textarea:focus {
      outline: none;
      border-color: rgba(124, 158, 255, 0.4);
      box-shadow: 0 0 0 3px rgba(124, 158, 255, 0.08);
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 18px;
    }
    .modal-actions button {
      padding: 9px 22px;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      font-weight: 500;
    }
    .btn-cancel { background: rgba(255, 255, 255, 0.06); color: var(--text); }
    .btn-cancel:hover { background: rgba(255, 255, 255, 0.1); }
    .btn-confirm {
      background: linear-gradient(135deg, #7c9eff 0%, #5b7cf5 100%);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(124, 158, 255, 0.2);
    }
    .btn-confirm:hover { box-shadow: 0 4px 16px rgba(124, 158, 255, 0.3); }
    .btn-danger {
      background: linear-gradient(135deg, #ff6b6b 0%, #e85555 100%);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 2px 10px rgba(255, 107, 107, 0.2);
    }
    .btn-danger:hover { box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3); }
    .modal p { color: var(--text-dim); font-size: 0.9rem; line-height: 1.6; }
    /* === 空状态 === */
    .empty {
      text-align: center;
      padding: 80px 20px;
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    .empty svg { margin-bottom: 16px; opacity: 0.3; }
    /* === Loading === */
    .loading {
      text-align: center;
      padding: 60px;
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .loading::after {
      content: '';
      display: inline-block;
      width: 18px;
      height: 18px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-left: 8px;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    /* === 响应式 === */
    @media (max-width: 640px) {
      .navbar { padding: 0 16px; }
      .nav-logo .brand { font-size: 0.95rem; }
      .nav-logo .badge { display: none; }
      .stats-bar { padding: 14px 16px; gap: 10px; }
      .stat-card { flex: 1; min-width: 100px; padding: 14px; }
      .stat-card .value { font-size: 1.3rem; }
      .toolbar { padding: 0 16px 10px; }
      .comment-list { padding: 0 16px 16px; }
      .comment-header { flex-direction: column; }
      .comment-actions { align-self: flex-end; }
    }
  </style>
</head>
<body>
  <!-- 导航栏 -->
  <nav class="navbar">
    <div class="nav-left">
      <div class="nav-logo">
        ${logoSVG(32)}
        <span class="brand">Loczb Comments</span>
        <span class="badge">Admin</span>
      </div>
    </div>
    <div class="nav-right">
      <div class="nav-user">
        <div class="avatar" id="navAvatar">A</div>
        <span id="navUsername">admin</span>
      </div>
      <button class="logout-btn" onclick="logout()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        退出
      </button>
    </div>
  </nav>

  <!-- 统计栏 -->
  <div class="stats-bar" id="statsBar">
    <div class="stat-card">
      <div class="label">总评论数</div>
      <div class="value" id="statTotal">-</div>
    </div>
    <div class="stat-card">
      <div class="label">文章数</div>
      <div class="value" id="statSlugs">-</div>
    </div>
    <div class="stat-card">
      <div class="label">今日新增</div>
      <div class="value" id="statToday">-</div>
    </div>
  </div>

  <!-- 工具栏 -->
  <div class="toolbar">
    <input type="text" id="searchInput" placeholder="搜索评论内容、昵称、邮箱..." oninput="debouncedSearch()">
    <select id="slugFilter" onchange="loadComments()">
      <option value="">全部文章</option>
    </select>
  </div>

  <!-- 评论列表 -->
  <div class="comment-list" id="commentList">
    <div class="loading">加载中</div>
  </div>

  <!-- 分页 -->
  <div class="pagination" id="pagination" style="display:none;">
    <button id="prevBtn" onclick="changePage(-1)">上一页</button>
    <span class="page-info" id="pageInfo"></span>
    <button id="nextBtn" onclick="changePage(1)">下一页</button>
  </div>

  <!-- 编辑模态框 -->
  <div class="modal-overlay" id="editModal">
    <div class="modal">
      <h2>编辑评论</h2>
      <textarea id="editContent"></textarea>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeModal('editModal')">取消</button>
        <button class="btn-confirm" onclick="submitEdit()">保存</button>
      </div>
    </div>
  </div>

  <!-- 删除确认模态框 -->
  <div class="modal-overlay" id="deleteModal">
    <div class="modal">
      <h2>确认删除</h2>
      <p id="deleteConfirmText">确定要删除这条评论吗？如果是父评论，其所有子评论也会被删除。此操作不可撤销。</p>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeModal('deleteModal')">取消</button>
        <button class="btn-danger" onclick="confirmDelete()">删除</button>
      </div>
    </div>
  </div>

  <script>
    let currentPage = 1;
    let totalPages = 1;
    const PAGE_SIZE = 20;
    let editingId = null;
    let deletingId = null;
    let searchTimer = null;
    let currentUsername = 'admin';

    // 从 cookie 提取用户名（token payload 里的 u 字段）
    try {
      const mc = document.cookie.match(/admin_token=([^;]+)/);
      if (mc) {
        const payload = JSON.parse(atob(mc[1].split('.')[0].replace(/-/g,'+').replace(/_/g,'/')));
        if (payload.u) currentUsername = payload.u;
      }
    } catch {}
    document.getElementById('navUsername').textContent = currentUsername;
    document.getElementById('navAvatar').textContent = currentUsername.charAt(0).toUpperCase();

    // 初始化
    loadSlugs();
    loadComments();
    loadStats();

    async function loadSlugs() {
      try {
        const res = await fetch('/admin/api/comments?all_slugs=1');
        const data = await res.json();
        if (data.ok && data.slugs) {
          const select = document.getElementById('slugFilter');
          data.slugs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.slug;
            opt.textContent = s.slug + ' (' + s.count + ')';
            select.appendChild(opt);
          });
        }
      } catch(e) {}
    }

    async function loadStats() {
      try {
        const res = await fetch('/admin/api/comments?stats=1');
        const data = await res.json();
        if (data.ok) {
          document.getElementById('statTotal').textContent = data.total || 0;
          document.getElementById('statSlugs').textContent = data.slugCount || 0;
          document.getElementById('statToday').textContent = data.todayCount || 0;
        }
      } catch(e) {}
    }

    async function loadComments() {
      const list = document.getElementById('commentList');
      const search = document.getElementById('searchInput').value.trim();
      const slug = document.getElementById('slugFilter').value;
      
      list.innerHTML = '<div class="loading">加载中</div>';
      
      const params = new URLSearchParams({
        page: currentPage,
        per_page: PAGE_SIZE,
      });
      if (search) params.set('q', search);
      if (slug) params.set('slug', slug);

      try {
        const res = await fetch('/admin/api/comments?' + params);
        const data = await res.json();
        
        if (!data.ok) {
          list.innerHTML = '<div class="empty">加载失败: ' + (data.error || '未知错误') + '</div>';
          return;
        }

        const comments = data.comments || [];
        totalPages = data.totalPages || 1;

        if (comments.length === 0) {
          list.innerHTML = '<div class="empty">暂无评论</div>';
          document.getElementById('pagination').style.display = 'none';
          return;
        }

        list.innerHTML = comments.map(c => {
          const date = new Date(c.created_at + 'Z').toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
          const updated = c.updated_at && c.updated_at !== c.created_at 
            ? ' <span style="color:var(--text-muted)">(编辑于 ' + new Date(c.updated_at + 'Z').toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'}) + ')</span>' : '';
          let parentHtml = '';
          if (c.parent_id && c.parent_id !== 0) {
            parentHtml = '<div class="parent-info">回复 #<a href="#" onclick="jumpToComment(' + c.parent_id + ');return false;">' + c.parent_id + '</a></div>';
          }
          return '<div class="comment-item" id="comment-' + c.id + '">' +
            '<div class="comment-header">' +
              '<div class="comment-meta">' +
                '<span class="comment-author">' + escapeHtml(c.author) + '</span>' +
                (c.email ? '<span class="comment-email">' + escapeHtml(c.email) + '</span>' : '') +
                ' <span class="comment-id">#' + c.id + '</span>' +
                '<br>' +
                '<span class="comment-slug" onclick="filterBySlug(\\''+ escapeHtml(c.post_slug) +'\\')">' + escapeHtml(c.post_slug) + '</span>' +
                '<div class="comment-time">' + date + updated + '</div>' +
                parentHtml +
              '</div>' +
              '<div class="comment-actions">' +
                '<button class="action-btn" onclick="openEdit(' + c.id + ', ' + JSON.stringify(escapeHtml(c.content)).replace(/"/g, '&quot;') + ')">编辑</button>' +
                '<button class="action-btn danger" onclick="openDelete(' + c.id + ')">删除</button>' +
              '</div>' +
            '</div>' +
            '<div class="comment-content">' + escapeHtml(c.content) + '</div>' +
          '</div>';
        }).join('');

        // 分页
        const pagination = document.getElementById('pagination');
        if (totalPages > 1) {
          pagination.style.display = 'flex';
          document.getElementById('prevBtn').disabled = currentPage <= 1;
          document.getElementById('nextBtn').disabled = currentPage >= totalPages;
          document.getElementById('pageInfo').textContent = currentPage + ' / ' + totalPages;
        } else {
          pagination.style.display = 'none';
        }
      } catch(e) {
        list.innerHTML = '<div class="empty">网络错误</div>';
      }
    }

    function loadCommentsDebounced() {
      currentPage = 1;
      loadComments();
    }

    function debouncedSearch() {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(loadCommentsDebounced, 300);
    }

    function changePage(delta) {
      const newPage = currentPage + delta;
      if (newPage < 1 || newPage > totalPages) return;
      currentPage = newPage;
      loadComments();
    }

    function filterBySlug(slug) {
      document.getElementById('slugFilter').value = slug;
      currentPage = 1;
      loadComments();
    }

    function jumpToComment(id) {
      const el = document.getElementById('comment-' + id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.borderColor = 'rgba(124, 158, 255, 0.5)';
        setTimeout(() => { el.style.borderColor = ''; }, 2000);
      }
    }

    function openEdit(id, content) {
      editingId = id;
      document.getElementById('editContent').value = content;
      document.getElementById('editModal').classList.add('active');
    }

    function openDelete(id) {
      deletingId = id;
      document.getElementById('deleteModal').classList.add('active');
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove('active');
      editingId = null;
      deletingId = null;
    }

    async function submitEdit() {
      if (!editingId) return;
      const content = document.getElementById('editContent').value.trim();
      if (!content) { alert('内容不能为空'); return; }

      try {
        const res = await fetch('/admin/api/comments/' + editingId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const data = await res.json();
        if (data.ok) {
          closeModal('editModal');
          loadComments();
        } else {
          alert(data.error || '编辑失败');
        }
      } catch(e) {
        alert('网络错误');
      }
    }

    async function confirmDelete() {
      if (!deletingId) return;
      try {
        const res = await fetch('/admin/api/comments/' + deletingId, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.ok) {
          closeModal('deleteModal');
          loadComments();
          loadStats();
        } else {
          alert(data.error || '删除失败');
        }
      } catch(e) {
        alert('网络错误');
      }
    }

    async function logout() {
      await fetch('/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    // ESC 关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal('editModal');
        closeModal('deleteModal');
      }
    });

    // 点击遮罩关闭
    document.querySelectorAll('.modal-overlay').forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('active');
      });
    });
  </script>
</body>
</html>`;
}

// === 管理路由处理 ===

export async function handleAdminRoute(request, env, url, method) {
  const path = url.pathname;

  // === /admin 和 /admin/ 重定向到 /admin/login ===
  if ((path === '/admin' || path === '/admin/') && method === 'GET') {
    return Response.redirect(new URL('/admin/login', url).toString(), 302);
  }

  // === GET /admin/login - 登录页 ===
  if (path === '/admin/login' && method === 'GET') {
    return html(loginPage());
  }

  // === POST /admin/login - 登录 API（用户名+密码） ===
  if (path === '/admin/login' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: '无效的请求' }, { status: 400 });
    }

    const adminUsername = env.ADMIN_USERNAME || 'admin';
    const adminPassword = env.ADMIN_PASSWORD || 'admin123';

    if (body.username !== adminUsername || body.password !== adminPassword) {
      return Response.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const token = await generateAuthToken(adminPassword, adminUsername);
    return new Response(JSON.stringify({ ok: true, username: adminUsername }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
      },
    });
  }

  // === POST /admin/logout - 登出 ===
  if (path === '/admin/logout' && method === 'POST') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'admin_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    });
  }

  // === 以下路由需要认证 ===
  const authUser = await getAuthUser(request, env);
  if (!authUser) {
    // HTML 页面跳转登录
    if (path === '/admin/dashboard' || path === '/admin') {
      return Response.redirect(new URL('/admin/login', url).toString(), 302);
    }
    // API 返回 401
    return Response.json({ error: '未授权' }, { status: 401 });
  }

  // === GET /admin/dashboard - 控制台 ===
  if (path === '/admin/dashboard' && method === 'GET') {
    return html(dashboardPage());
  }

  // === GET /admin/api/comments - 评论列表 / 统计 / slug 列表 ===
  if (path === '/admin/api/comments' && method === 'GET') {
    // 获取所有 slug 列表
    if (url.searchParams.get('all_slugs') === '1') {
      try {
        const result = await env.DB.prepare(
          'SELECT post_slug, COUNT(*) as count FROM comments GROUP BY post_slug ORDER BY count DESC'
        ).all();
        return Response.json({ ok: true, slugs: result.results || [] });
      } catch (err) {
        return Response.json({ error: '数据库错误' }, { status: 500 });
      }
    }

    // 获取统计信息
    if (url.searchParams.get('stats') === '1') {
      try {
        const totalResult = await env.DB.prepare('SELECT COUNT(*) as count FROM comments').first();
        const slugResult = await env.DB.prepare(
          'SELECT COUNT(DISTINCT post_slug) as count FROM comments'
        ).first();
        // 今天的评论（基于 +8 时区）
        const todayResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM comments WHERE created_at >= datetime('now', '+8 hours', 'start of day')"
        ).first();
        return Response.json({
          ok: true,
          total: totalResult?.count || 0,
          slugCount: slugResult?.count || 0,
          todayCount: todayResult?.count || 0,
        });
      } catch (err) {
        return Response.json({ error: '数据库错误' }, { status: 500 });
      }
    }

    // 分页评论列表
    const page = Math.max(parseInt(url.searchParams.get('page') || '1'), 1);
    const perPage = Math.min(Math.max(parseInt(url.searchParams.get('per_page') || '20'), 1), 100);
    const search = url.searchParams.get('q') || '';
    const slug = url.searchParams.get('slug') || '';
    const offset = (page - 1) * perPage;

    let query = 'SELECT id, post_slug, author, email, content, parent_id, created_at, updated_at FROM comments';
    let countQuery = 'SELECT COUNT(*) as count FROM comments';
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(content LIKE ? OR author LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (slug) {
      conditions.push('post_slug = ?');
      params.push(slug);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      query += where;
      countQuery += where;
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    try {
      const result = await env.DB.prepare(query).bind(...params, perPage, offset).all();
      const countResult = await env.DB.prepare(countQuery).bind(...params).first();
      const total = countResult?.count || 0;
      const totalPages = Math.ceil(total / perPage) || 1;

      return Response.json({
        ok: true,
        comments: result.results || [],
        page,
        perPage,
        total,
        totalPages,
      });
    } catch (err) {
      return Response.json({ error: '数据库错误: ' + err.message }, { status: 500 });
    }
  }

  // === /admin/api/comments/:id 路由 ===
  const adminSingleMatch = path.match(/^\/admin\/api\/comments\/(\d+)$/);

  // PUT 编辑评论
  if (adminSingleMatch && method === 'PUT') {
    const id = parseInt(adminSingleMatch[1]);
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: '无效的 JSON' }, { status: 400 });
    }

    const { content } = body;
    if (!content || !content.trim()) {
      return Response.json({ error: '内容不能为空' }, { status: 400 });
    }
    if (content.length > 5000) {
      return Response.json({ error: '内容过长' }, { status: 400 });
    }

    try {
      const row = await env.DB.prepare('SELECT id FROM comments WHERE id = ?').bind(id).first();
      if (!row) return Response.json({ error: '评论不存在' }, { status: 404 });

      await env.DB.prepare(
        "UPDATE comments SET content = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?"
      ).bind(content.trim(), id).run();

      return Response.json({ ok: true, message: '评论已更新' });
    } catch (err) {
      return Response.json({ error: '数据库错误' }, { status: 500 });
    }
  }

  // DELETE 删除评论（管理员强制删除，不需要 edit_token）
  if (adminSingleMatch && method === 'DELETE') {
    const id = parseInt(adminSingleMatch[1]);

    try {
      const row = await env.DB.prepare('SELECT id FROM comments WHERE id = ?').bind(id).first();
      if (!row) return Response.json({ error: '评论不存在' }, { status: 404 });

      // 删除评论及其子评论
      await env.DB.prepare(
        'DELETE FROM comments WHERE id = ? OR parent_id = ?'
      ).bind(id, id).run();

      return Response.json({ ok: true, message: '评论已删除' });
    } catch (err) {
      return Response.json({ error: '数据库错误' }, { status: 500 });
    }
  }

  // 404
  return Response.json({ error: 'Not Found' }, { status: 404 });
}
