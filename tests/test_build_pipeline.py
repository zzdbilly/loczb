#!/usr/bin/env python3
"""
Unit tests for the post-source build pipeline (scripts/build-posts.py).

覆盖：
  ① parse_args 参数白名单（未知参数报错退出，--slug / --dry-run 正常解析）
  ② check_dependencies 在「有纯 MD 源 + markdown 库不可用」时 fail-fast
  ③ 原子写盘 + 下游失败自动回滚（posts / meta 还原到构建前内容）
  ④ 纯 Markdown 误判硬校验（命中 / 不命中）

不依赖网络。与 tests/test_pipeline.py 一样用 unittest。
"""

import unittest
import os
import sys
import io
import tempfile
import shutil
import importlib.util
from contextlib import redirect_stdout
from unittest import mock

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

spec_bp = importlib.util.spec_from_file_location(
    "build_posts", os.path.join(ROOT_DIR, 'scripts', 'build-posts.py'))
build_posts = importlib.util.module_from_spec(spec_bp)
spec_bp.loader.exec_module(build_posts)

# generate-post.py 的加载路径保持真实路径：generate_article() 内部 load_template()
REAL_TEMPLATE = os.path.join(ROOT_DIR, 'templates', 'blog-post-template.html')


class TestParseArgs(unittest.TestCase):
    """① 参数白名单（单一真相源，refresh-posts.py 复用）。"""

    def test_unknown_arg_exits_and_lists_supported(self):
        with self.assertRaises(SystemExit) as ctx:
            with redirect_stdout(io.StringIO()) as out:
                build_posts.parse_args(['--post', 'x'])
        self.assertEqual(ctx.exception.code, 1)
        self.assertIn('--slug', out.getvalue())
        self.assertIn('--dry-run', out.getvalue())

    def test_slug_parsed(self):
        dry, slug = build_posts.parse_args(['--slug', 'my-post'])
        self.assertFalse(dry)
        self.assertEqual(slug, 'my-post')

    def test_dry_run_parsed(self):
        dry, slug = build_posts.parse_args(['--dry-run'])
        self.assertTrue(dry)
        self.assertIsNone(slug)

    def test_dry_run_and_slug_combined(self):
        dry, slug = build_posts.parse_args(['--dry-run', '--slug', 'abc'])
        self.assertTrue(dry)
        self.assertEqual(slug, 'abc')

    def test_slug_without_value_exits(self):
        with self.assertRaises(SystemExit) as ctx:
            with redirect_stdout(io.StringIO()):
                build_posts.parse_args(['--slug'])
        self.assertEqual(ctx.exception.code, 1)


class TestDependencyFailFast(unittest.TestCase):
    """② 纯 Markdown 源 + markdown 库不可用 → fail-fast（一篇都不写）。"""

    def _write_src(self, body):
        temp = tempfile.mkdtemp()
        src = os.path.join(temp, 'post.md')
        with open(src, 'w', encoding='utf-8') as f:
            f.write("---\ntitle: T\ndate: 2026-10-05\ncategory: 开发\n---\n" + body)
        return temp, src

    def test_pure_md_without_markdown_lib_exits(self):
        temp, src = self._write_src("## 标题\n\n正文")
        try:
            # 把 import markdown 变成 ImportError
            with mock.patch.dict(sys.modules, {'markdown': None}):
                with self.assertRaises(SystemExit) as ctx:
                    with redirect_stdout(io.StringIO()) as out:
                        build_posts.check_dependencies([src])
            self.assertEqual(ctx.exception.code, 1)
            self.assertIn('markdown', out.getvalue())
        finally:
            shutil.rmtree(temp)

    def test_html_body_without_markdown_lib_ok(self):
        # HTML 壳型正文走零依赖渲染器，缺库不应 fail-fast
        temp, src = self._write_src("<p>hello</p>")
        try:
            with mock.patch.dict(sys.modules, {'markdown': None}):
                build_posts.check_dependencies([src])  # 不应抛异常
        finally:
            shutil.rmtree(temp)


class TestAtomicWriteRollback(unittest.TestCase):
    """③ 原子写盘 + 下游（generate-index / verify）失败自动回滚。"""

    def _make_env(self):
        base = tempfile.mkdtemp()
        src = os.path.join(base, 'src')
        posts = os.path.join(base, 'posts')
        meta = os.path.join(base, 'meta')
        os.makedirs(src)
        os.makedirs(posts)
        os.makedirs(meta)
        return base, src, posts, meta

    def _write_md(self, src_dir, slug, body="<p>hello</p>"):
        md = (f"---\ntitle: {slug}\ndescription: d\ndate: 2026-10-05\n"
              f"category: 开发\ntags: [a]\nslug: {slug}\n---\n{body}\n")
        with open(os.path.join(src_dir, slug + '.md'), 'w', encoding='utf-8') as f:
            f.write(md)

    def _run_main(self, src, posts, meta):
        fake = mock.Mock(returncode=1)  # 下游一律返回非 0
        with mock.patch.object(build_posts, 'SRC_DIR', src), \
             mock.patch.object(build_posts, 'POSTS_DIR', posts), \
             mock.patch.object(build_posts, 'META_DIR', meta), \
             mock.patch.object(build_posts, 'TEMPLATE_PATH', REAL_TEMPLATE), \
             mock.patch.object(build_posts.subprocess, 'run', return_value=fake), \
             mock.patch.object(sys, 'argv', ['build-posts.py']):
            with self.assertRaises(SystemExit) as ctx:
                with redirect_stdout(io.StringIO()):
                    build_posts.main()
        return ctx.exception.code

    def test_downstream_failure_rolls_back_existing_files(self):
        base, src, posts, meta = self._make_env()
        try:
            slug = 'sample-post'
            self._write_md(src, slug)
            post_path = os.path.join(posts, slug + '.html')
            meta_path = os.path.join(meta, slug + '.json')
            # 预置构建前内容（哨兵），验证被写坏后能逐字还原
            with open(post_path, 'w', encoding='utf-8') as f:
                f.write('PRE-EXISTING-POST')
            with open(meta_path, 'w', encoding='utf-8') as f:
                f.write('PRE-EXISTING-META')

            code = self._run_main(src, posts, meta)
            self.assertEqual(code, 1)

            with open(post_path, encoding='utf-8') as f:
                self.assertEqual(f.read(), 'PRE-EXISTING-POST')
            with open(meta_path, encoding='utf-8') as f:
                self.assertEqual(f.read(), 'PRE-EXISTING-META')
        finally:
            shutil.rmtree(base)

    def test_downstream_failure_deletes_new_files(self):
        base, src, posts, meta = self._make_env()
        try:
            slug = 'brand-new'
            self._write_md(src, slug)
            code = self._run_main(src, posts, meta)
            self.assertEqual(code, 1)
            # 原先不存在 → 回滚时删除，不留半成品
            self.assertFalse(os.path.exists(os.path.join(posts, slug + '.html')))
            self.assertFalse(os.path.exists(os.path.join(meta, slug + '.json')))
        finally:
            shutil.rmtree(base)


class TestMisclassifiedMdBody(unittest.TestCase):
    """④ 纯 Markdown 误判硬校验（正文以 < 起头却含强 Markdown 信号）。"""

    def test_hit_two_heading_lines(self):
        body = "<p>intro</p>\n## 标题一\n正文\n## 标题二\n更多"
        hit, why = build_posts.detect_misclassified_md_body(body)
        self.assertTrue(hit)
        self.assertIn('#', why)

    def test_hit_pipe_table_rows(self):
        body = "<p>intro</p>\n| a | b |\n| --- | --- |\n| 1 | 2 |"
        hit, why = build_posts.detect_misclassified_md_body(body)
        self.assertTrue(hit)

    def test_no_hit_html_body(self):
        body = "<section class=\"hero\">\n<h1>Hi</h1>\n<p>text</p>\n</section>"
        hit, _ = build_posts.detect_misclassified_md_body(body)
        self.assertFalse(hit)

    def test_no_hit_signals_inside_pre(self):
        # <pre> 内的 # 与 | 是代码字面量，不算正文信号
        body = ("<p>intro</p>\n<pre><code># 注释一\n# 注释二\n"
                "| a | b |\n| - | - |</code></pre>")
        hit, _ = build_posts.detect_misclassified_md_body(body)
        self.assertFalse(hit)

    def test_no_hit_single_heading_line(self):
        # 仅 1 行 # 不命中（对齐存量 ssh-security-hardening 的零误报）
        body = "<p>intro</p>\n# 单行注释式文本"
        hit, _ = build_posts.detect_misclassified_md_body(body)
        self.assertFalse(hit)

    def test_pure_md_body_not_flagged(self):
        # 纯 Markdown 正文（非 HTML 壳型）不走这条校验
        body = "## 标题\n正文\n## 标题2"
        hit, _ = build_posts.detect_misclassified_md_body(body)
        self.assertFalse(hit)

    def test_render_post_rejects_misclassified_body(self):
        temp = tempfile.mkdtemp()
        try:
            src = os.path.join(temp, 'bad.md')
            with open(src, 'w', encoding='utf-8') as f:
                f.write("---\ntitle: Bad\ndate: 2026-10-05\ncategory: 开发\n---\n"
                        "<p>intro</p>\n## 标题一\n正文\n## 标题二\n更多")
            with self.assertRaises(ValueError) as ctx:
                build_posts.render_post(src, "<html>{{ARTICLE_CONTENT}}</html>")
            self.assertIn("疑似纯 Markdown", str(ctx.exception))
        finally:
            shutil.rmtree(temp)


if __name__ == '__main__':
    unittest.main()
