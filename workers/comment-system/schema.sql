-- 评论系统 D1 数据库 Schema
-- 创建命令: wrangler d1 execute loczb-comments --file=schema.sql

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug TEXT NOT NULL,          -- 文章 URL slug（如 "rust-ai-infra"）
  author TEXT NOT NULL,             -- 昵称
  email TEXT DEFAULT '',            -- 邮箱（可选，Gravatar 头像）
  content TEXT NOT NULL,            -- 评论内容（支持 Markdown）
  parent_id INTEGER DEFAULT 0,     -- 父评论 ID（0=根评论）
  edit_token TEXT NOT NULL,        -- 编辑/删除令牌（localStorage 存储）
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_slug);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(post_slug, created_at DESC);
