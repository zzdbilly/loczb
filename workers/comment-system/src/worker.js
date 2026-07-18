/**
 * loczb 评论系统 - Cloudflare Worker API
 * 
 * 端点:
 *   POST   /api/comments          - 创建评论
 *   GET    /api/comments?slug=xxx - 获取文章评论（嵌套结构）
 *   DELETE /api/comments/:id      - 删除评论（需 token）
 *   GET    /api/comments/:id      - 获取单条评论（编辑用）
 *   PUT    /api/comments/:id      - 编辑评论（需 token）
 *   GET    /api/health            - 健康检查
 *   
 * 管理后台路由:
 *   GET    /admin/login           - 登录页
 *   POST   /admin/login           - 登录 API
 *   POST   /admin/logout          - 登出
 *   GET    /admin/dashboard       - 控制台
 *   GET    /admin/api/comments    - 评论列表/统计（需认证）
 *   PUT    /admin/api/comments/:id - 编辑评论（需认证）
 *   DELETE /admin/api/comments/:id - 删除评论（需认证）
 */

import { handleAdminRoute } from './admin.js';

// CORS 配置
const ALLOWED_ORIGINS = [
  'https://709527.xyz',
  'https://zzdbilly.github.io',
  'http://localhost:3000',
  'http://localhost:8000',
  'http://127.0.0.1:5500',
];

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }
  return headers;
}

function json(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
    },
  });
}

// 生成随机 token
function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

// 基本垃圾过滤
function isSpam(content, author) {
  const urlCount = (content.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) return true;
  if (content.trim().length < 1) return true;
  if (content.length > 5000) return true;
  if (author.length > 50) return true;
  if (/(.)\1{20,}/.test(content)) return true;
  // 检查纯数字/乱码
  if (/^[\d\s\W]+$/.test(content) && content.length > 100) return true;
  return false;
}

// 验证 slug 格式
function isValidSlug(slug) {
  if (!slug || slug.length > 200) return false;
  return /^[\w\u4e00-\u9fff\-]+$/.test(slug);
}

// 构建嵌套评论结构
function buildNestedTree(comments) {
  const map = {};
  const roots = [];

  for (const c of comments) {
    map[c.id] = { ...c, children: [] };
  }

  for (const c of comments) {
    const node = map[c.id];
    if (c.parent_id && c.parent_id !== 0 && map[c.parent_id]) {
      map[c.parent_id].children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// 简易速率限制（基于内存，每个 Worker 实例独立）
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 分钟
const RATE_LIMIT_MAX = 5; // 每分钟最多 5 条评论

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip || 'unknown';
  const entries = rateLimitMap.get(key) || [];
  const recent = entries.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitMap.set(key, recent);
  return true;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get('Origin');
    const clientIP = request.headers.get('CF-Connecting-IP') || '';

    // OPTIONS 预检
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // === 管理后台路由 ===
    if (path.startsWith('/admin')) {
      return handleAdminRoute(request, env, url, method);
    }

    // 健康检查
    if (path === '/api/health') {
      return json({ ok: true, timestamp: Date.now() }, 200, origin);
    }

    // === POST /api/comments - 创建评论 ===
    if (path === '/api/comments' && method === 'POST') {
      // 速率限制
      if (!checkRateLimit(clientIP)) {
        return json({ error: '评论过于频繁，请稍后再试' }, 429, origin);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: '无效的 JSON' }, 400, origin);
      }

      const { slug, author, email, content, parent_id } = body;

      if (!slug || !isValidSlug(slug)) {
        return json({ error: '无效的文章 slug' }, 400, origin);
      }
      if (!author || !author.trim()) {
        return json({ error: '昵称不能为空' }, 400, origin);
      }
      if (!content || !content.trim()) {
        return json({ error: '评论内容不能为空' }, 400, origin);
      }
      if (isSpam(content, author)) {
        return json({ error: '评论被标记为垃圾内容' }, 400, origin);
      }

      const editToken = generateToken();
      const safeAuthor = author.trim().slice(0, 50);
      const safeEmail = (email || '').trim().slice(0, 200);
      const safeContent = content.trim().slice(0, 5000);
      const safeParentId = parent_id && Number.isInteger(parent_id) ? parent_id : 0;

      try {
        const result = await env.DB.prepare(
          'INSERT INTO comments (post_slug, author, email, content, parent_id, edit_token) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(slug, safeAuthor, safeEmail, safeContent, safeParentId, editToken).run();

        return json({
          ok: true,
          id: result.meta.last_row_id,
          edit_token: editToken,
          message: '评论成功',
        }, 201, origin);
      } catch (err) {
        return json({ error: '数据库错误: ' + err.message }, 500, origin);
      }
    }

    // === GET /api/comments?slug=xxx - 获取评论 ===
    if (path === '/api/comments' && method === 'GET') {
      const slug = url.searchParams.get('slug');
      if (!slug || !isValidSlug(slug)) {
        return json({ error: '无效的 slug' }, 400, origin);
      }

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);

      try {
        const result = await env.DB.prepare(
          'SELECT id, post_slug, author, email, content, parent_id, created_at, updated_at FROM comments WHERE post_slug = ? ORDER BY created_at ASC LIMIT ? OFFSET ?'
        ).bind(slug, limit, offset).all();

        const nested = buildNestedTree(result.results || []);

        const countResult = await env.DB.prepare(
          'SELECT COUNT(*) as count FROM comments WHERE post_slug = ?'
        ).bind(slug).first();

        return json({
          ok: true,
          comments: nested,
          total: countResult?.count || 0,
          slug,
        }, 200, origin);
      } catch (err) {
        return json({ error: '数据库错误: ' + err.message }, 500, origin);
      }
    }

    // === /api/comments/:id 路由 ===
    const singleMatch = path.match(/^\/api\/comments\/(\d+)$/);

    // GET 单条评论
    if (singleMatch && method === 'GET') {
      const id = parseInt(singleMatch[1]);
      try {
        const row = await env.DB.prepare(
          'SELECT id, post_slug, author, email, content, parent_id, created_at, updated_at FROM comments WHERE id = ?'
        ).bind(id).first();
        if (!row) return json({ error: '评论不存在' }, 404, origin);
        return json({ ok: true, comment: row }, 200, origin);
      } catch (err) {
        return json({ error: '数据库错误' }, 500, origin);
      }
    }

    // PUT 编辑评论
    if (singleMatch && method === 'PUT') {
      const id = parseInt(singleMatch[1]);
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: '无效的 JSON' }, 400, origin);
      }

      const { content, edit_token } = body;
      if (!content || !content.trim()) {
        return json({ error: '内容不能为空' }, 400, origin);
      }
      if (!edit_token) {
        return json({ error: '缺少编辑令牌' }, 403, origin);
      }
      if (content.length > 5000) {
        return json({ error: '内容过长' }, 400, origin);
      }

      try {
        const row = await env.DB.prepare(
          'SELECT edit_token FROM comments WHERE id = ?'
        ).bind(id).first();

        if (!row) return json({ error: '评论不存在' }, 404, origin);
        if (row.edit_token !== edit_token) {
          return json({ error: '无权编辑此评论' }, 403, origin);
        }

        await env.DB.prepare(
          "UPDATE comments SET content = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?"
        ).bind(content.trim(), id).run();

        return json({ ok: true, message: '评论已更新' }, 200, origin);
      } catch (err) {
        return json({ error: '数据库错误' }, 500, origin);
      }
    }

    // DELETE 删除评论
    if (singleMatch && method === 'DELETE') {
      const id = parseInt(singleMatch[1]);

      let edit_token;
      const ct = request.headers.get('Content-Type') || '';
      if (ct.includes('json')) {
        const body = await request.json().catch(() => ({}));
        edit_token = body.edit_token;
      }
      if (!edit_token) {
        edit_token = url.searchParams.get('token');
      }

      if (!edit_token) {
        return json({ error: '缺少删除令牌' }, 403, origin);
      }

      try {
        const row = await env.DB.prepare(
          'SELECT edit_token FROM comments WHERE id = ?'
        ).bind(id).first();

        if (!row) return json({ error: '评论不存在' }, 404, origin);
        if (row.edit_token !== edit_token) {
          return json({ error: '无权删除此评论' }, 403, origin);
        }

        // 删除评论及其子评论
        await env.DB.prepare(
          'DELETE FROM comments WHERE id = ? OR parent_id = ?'
        ).bind(id, id).run();

        return json({ ok: true, message: '评论已删除' }, 200, origin);
      } catch (err) {
        return json({ error: '数据库错误' }, 500, origin);
      }
    }

    // 404
    return json({ error: 'Not Found' }, 404, origin);
  },
};
