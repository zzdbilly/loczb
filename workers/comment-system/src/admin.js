/**
 * loczb 评论系统 - 管理后台
 * 
 * 路由:
 *   GET  /admin/login           - 登录页
 *   POST /admin/login           - 登录 API
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

// 生成认证 token
async function generateAuthToken(secret) {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_MAX_AGE });
  const payloadB64 = b64urlEncode(payload);
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

// 验证 token
async function verifyAuthToken(token, secret) {
  if (!token || !token.includes('.')) return false;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return false;
  
  const expectedSig = await hmacSign(payloadB64, secret);
  if (sig !== expectedSig) return false;
  
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64));
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

// 从请求中提取并验证 token
async function isAuthenticated(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return false;
  return verifyAuthToken(match[1], env.ADMIN_PASSWORD || 'admin123');
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

// === HTML 页面 ===

function loginPage() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>评论管理 - 登录</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e4e6eb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .login-card {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 12px;
      padding: 40px;
      width: 100%;
      max-width: 380px;
      margin: 20px;
    }
    .login-card h1 {
      font-size: 1.5rem;
      margin-bottom: 8px;
      color: #7c9eff;
    }
    .login-card p {
      font-size: 0.875rem;
      color: #8b8fa3;
      margin-bottom: 24px;
    }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      color: #8b8fa3;
      margin-bottom: 6px;
    }
    .form-group input {
      width: 100%;
      padding: 12px 14px;
      background: #0f1117;
      border: 1px solid #2a2d3a;
      border-radius: 8px;
      color: #e4e6eb;
      font-size: 0.95rem;
      transition: border-color 0.2s;
    }
    .form-group input:focus {
      outline: none;
      border-color: #7c9eff;
    }
    .btn {
      width: 100%;
      padding: 12px;
      background: #7c9eff;
      color: #0f1117;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #6b8eef; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error {
      color: #ff6b6b;
      font-size: 0.85rem;
      margin-top: 12px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>🔐 评论管理</h1>
    <p>请输入管理密码以登录</p>
    <form id="loginForm">
      <div class="form-group">
        <label for="password">管理密码</label>
        <input type="password" id="password" name="password" placeholder="输入密码" required autofocus>
      </div>
      <button type="submit" class="btn" id="submitBtn">登录</button>
      <div class="error" id="errorMsg"></div>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submitBtn');
      const errEl = document.getElementById('errorMsg');
      const password = document.getElementById('password').value;
      
      btn.disabled = true;
      btn.textContent = '登录中...';
      errEl.style.display = 'none';
      
      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (data.ok) {
          window.location.href = '/admin/dashboard';
        } else {
          errEl.textContent = data.error || '登录失败';
          errEl.style.display = 'block';
        }
      } catch (err) {
        errEl.textContent = '网络错误';
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
  <title>评论管理 - 控制台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f1117;
      color: #e4e6eb;
      min-height: 100vh;
    }
    /* 顶栏 */
    .topbar {
      background: #1a1d27;
      border-bottom: 1px solid #2a2d3a;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .topbar h1 { font-size: 1.1rem; color: #7c9eff; }
    .topbar .actions { display: flex; gap: 12px; align-items: center; }
    .logout-btn {
      background: none;
      border: 1px solid #2a2d3a;
      color: #8b8fa3;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .logout-btn:hover { color: #ff6b6b; border-color: #ff6b6b; }
    /* 统计栏 */
    .stats-bar {
      display: flex;
      gap: 16px;
      padding: 16px 24px;
      flex-wrap: wrap;
    }
    .stat-card {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 8px;
      padding: 16px 20px;
      min-width: 140px;
    }
    .stat-card .label { font-size: 0.75rem; color: #8b8fa3; margin-bottom: 4px; }
    .stat-card .value { font-size: 1.5rem; font-weight: 700; color: #7c9eff; }
    /* 工具栏 */
    .toolbar {
      padding: 0 24px 12px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .toolbar input, .toolbar select {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 8px;
      color: #e4e6eb;
      padding: 8px 12px;
      font-size: 0.85rem;
    }
    .toolbar input { flex: 1; min-width: 200px; }
    .toolbar input:focus, .toolbar select:focus {
      outline: none;
      border-color: #7c9eff;
    }
    /* 评论列表 */
    .comment-list { padding: 0 24px 24px; }
    .comment-item {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      transition: border-color 0.2s;
    }
    .comment-item:hover { border-color: #3a3d4a; }
    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
      gap: 12px;
    }
    .comment-meta { flex: 1; min-width: 0; }
    .comment-author { font-weight: 600; color: #e4e6eb; font-size: 0.9rem; }
    .comment-email { color: #8b8fa3; font-size: 0.8rem; margin-left: 6px; }
    .comment-slug {
      display: inline-block;
      background: #2a2d3a;
      color: #7c9eff;
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
      cursor: pointer;
    }
    .comment-time { color: #8b8fa3; font-size: 0.75rem; margin-top: 2px; }
    .comment-content {
      color: #c4c6d1;
      font-size: 0.9rem;
      line-height: 1.5;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .comment-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .action-btn {
      padding: 4px 10px;
      border: 1px solid #2a2d3a;
      border-radius: 6px;
      background: none;
      color: #8b8fa3;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    .action-btn:hover { color: #e4e6eb; border-color: #3a3d4a; }
    .action-btn.danger:hover { color: #ff6b6b; border-color: #ff6b6b; }
    .comment-id { color: #555; font-size: 0.7rem; }
    .parent-info { color: #8b8fa3; font-size: 0.75rem; margin-top: 4px; }
    .parent-info a { color: #7c9eff; text-decoration: none; }
    /* 分页 */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 20px 0;
    }
    .pagination button {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      color: #e4e6eb;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .pagination button:hover:not(:disabled) { border-color: #7c9eff; }
    .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
    .pagination .page-info { color: #8b8fa3; font-size: 0.85rem; }
    /* 模态框 */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: #1a1d27;
      border: 1px solid #2a2d3a;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
    }
    .modal h2 { font-size: 1.1rem; margin-bottom: 16px; color: #e4e6eb; }
    .modal textarea {
      width: 100%;
      min-height: 120px;
      background: #0f1117;
      border: 1px solid #2a2d3a;
      border-radius: 8px;
      color: #e4e6eb;
      padding: 12px;
      font-size: 0.9rem;
      resize: vertical;
      font-family: inherit;
    }
    .modal textarea:focus { outline: none; border-color: #7c9eff; }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .modal-actions button {
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      border: none;
    }
    .btn-cancel { background: #2a2d3a; color: #e4e6eb; }
    .btn-confirm { background: #7c9eff; color: #0f1117; font-weight: 600; }
    .btn-danger { background: #ff6b6b; color: #fff; font-weight: 600; }
    .modal p { color: #8b8fa3; font-size: 0.9rem; line-height: 1.5; }
    /* 空状态 */
    .empty {
      text-align: center;
      padding: 60px 20px;
      color: #555;
      font-size: 0.95rem;
    }
    /* Loading */
    .loading {
      text-align: center;
      padding: 40px;
      color: #555;
    }
    /* 响应式 */
    @media (max-width: 640px) {
      .topbar { padding: 10px 16px; }
      .stats-bar { padding: 12px 16px; gap: 8px; }
      .stat-card { flex: 1; min-width: 100px; padding: 12px; }
      .stat-card .value { font-size: 1.2rem; }
      .toolbar { padding: 0 16px 8px; }
      .comment-list { padding: 0 16px 16px; }
      .comment-header { flex-direction: column; }
      .comment-actions { align-self: flex-end; }
    }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>📋 评论管理后台</h1>
    <div class="actions">
      <button class="logout-btn" onclick="logout()">退出登录</button>
    </div>
  </div>

  <div class="stats-bar" id="statsBar">
    <div class="stat-card"><div class="label">总评论数</div><div class="value" id="statTotal">-</div></div>
    <div class="stat-card"><div class="label">文章数</div><div class="value" id="statSlugs">-</div></div>
    <div class="stat-card"><div class="label">今日新增</div><div class="value" id="statToday">-</div></div>
  </div>

  <div class="toolbar">
    <input type="text" id="searchInput" placeholder="搜索评论内容、昵称、邮箱..." oninput="debouncedSearch()">
    <select id="slugFilter" onchange="loadComments()">
      <option value="">全部文章</option>
    </select>
  </div>

  <div class="comment-list" id="commentList">
    <div class="loading">加载中...</div>
  </div>

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
      
      list.innerHTML = '<div class="loading">加载中...</div>';
      
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
            ? ' <span style="color:#555">(编辑于 ' + new Date(c.updated_at + 'Z').toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'}) + ')</span>' : '';
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
        el.style.borderColor = '#7c9eff';
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

  // === GET /admin/login - 登录页 ===
  if (path === '/admin/login' && method === 'GET') {
    return html(loginPage());
  }

  // === POST /admin/login - 登录 API ===
  if (path === '/admin/login' && method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: '无效的请求' }, { status: 400 });
    }

    const adminPassword = env.ADMIN_PASSWORD || 'admin123';
    if (body.password !== adminPassword) {
      return Response.json({ error: '密码错误' }, { status: 401 });
    }

    const token = await generateAuthToken(adminPassword);
    return new Response(JSON.stringify({ ok: true }), {
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
  const authed = await isAuthenticated(request, env);
  if (!authed) {
    // HTML 页面跳转登录
    if (path === '/admin/dashboard' || path === '/admin') {
      return Response.redirect(new URL('/admin/login', url).toString(), 302);
    }
    // API 返回 401
    return Response.json({ error: '未授权' }, { status: 401 });
  }

  // === GET /admin/dashboard - 控制台 ===
  if ((path === '/admin/dashboard' || path === '/admin') && method === 'GET') {
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
