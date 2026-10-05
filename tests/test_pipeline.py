#!/usr/bin/env python3
"""
Unit and regression tests for loczb build & markdown pipeline.
"""

import unittest
import os
import sys
import tempfile
import json
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT_DIR, 'scripts'))

import importlib.util

spec_gp = importlib.util.spec_from_file_location("generate_post", os.path.join(ROOT_DIR, 'scripts', 'generate-post.py'))
generate_post = importlib.util.module_from_spec(spec_gp)
spec_gp.loader.exec_module(generate_post)

spec_bp = importlib.util.spec_from_file_location("build_posts", os.path.join(ROOT_DIR, 'scripts', 'build-posts.py'))
build_posts = importlib.util.module_from_spec(spec_bp)
spec_bp.loader.exec_module(build_posts)


class TestMarkdownPipeline(unittest.TestCase):

    def test_code_block_placeholder_safety(self):
        """Ensure code block placeholders don't collide with __bold__ markdown syntax."""
        md = "Here is __bold text__ and a code block:\n```python\nprint('__magic__')\n```\nAnd another __strong__ word."
        html = generate_post.pure_python_markdown_to_html(md)
        self.assertIn("<strong>bold text</strong>", html)
        self.assertIn("<strong>strong</strong>", html)
        self.assertIn("<pre><code", html)
        self.assertIn("__magic__", html)
        # Placeholders like \x00CB0\x00 must not leak
        self.assertNotIn("\x00CB", html)
        self.assertNotIn("CODEBLOCK", html)

    def test_pre_block_does_not_wrap_lines_in_paragraphs(self):
        """Historical multi-line <pre><code> must not have <p> injected inside."""
        html_input = (
            "<p>Intro text</p>\n"
            "<pre><code>line 1\n"
            "line 2\n"
            "line 3</code></pre>\n"
            "<p>Outro text</p>"
        )
        out = generate_post.pure_python_markdown_to_html(html_input)
        self.assertNotIn("<pre><code><p>", out)
        self.assertNotIn("line 2</p>", out)
        self.assertIn("line 1\nline 2\nline 3", out)

    def test_normalize_src_indent(self):
        """normalize_src_indent should strip leading spaces only for HTML tags outside <pre>."""
        raw = (
            "    <div class=\"container\">\n"
            "        <p>Text</p>\n"
            "    </div>\n"
            "<pre><code>\n"
            "    def indented_code():\n"
            "        pass\n"
            "</code></pre>\n"
            "    * Indented list item (markdown)"
        )
        res = build_posts.normalize_src_indent(raw)
        lines = res.split('\n')
        self.assertTrue(lines[0].startswith('<div'))
        self.assertTrue(lines[1].startswith('<p>'))
        self.assertTrue(lines[2].startswith('</div>'))
        # Inside <pre>, indent must be preserved
        self.assertEqual(lines[4], "    def indented_code():")
        # Non-HTML line indent must be preserved for markdown lists
        self.assertTrue(lines[7].startswith("    *"))

    def test_looks_like_html_body_detection(self):
        """Dual-renderer detector properly categorizes HTML bodies vs Markdown."""
        html_body = "\n\n<section class=\"hero\">\n<h1>Hello</h1>\n</section>"
        md_body = "\n\n# Hello World\n\nThis is a pure markdown post with a [link](https://example.com)."
        self.assertTrue(generate_post._looks_like_html_body(html_body))
        self.assertFalse(generate_post._looks_like_html_body(md_body))

    def test_frontmatter_validation_missing_date(self):
        """Frontmatter without date must raise ValueError to ensure build determinism."""
        temp_dir = tempfile.mkdtemp()
        try:
            fake_src = os.path.join(temp_dir, 'no-date.md')
            with open(fake_src, 'w', encoding='utf-8') as f:
                f.write("---\ntitle: Missing Date\ncategory: Tech\n---\nBody")
            with self.assertRaises(ValueError) as ctx:
                build_posts.render_post(fake_src, "<html>{{CONTENT}}</html>")
            self.assertIn("缺少 frontmatter `date` 字段", str(ctx.exception))
        finally:
            shutil.rmtree(temp_dir)

    def test_frontmatter_validation_mismatched_slug(self):
        """Frontmatter with a slug differing from filename must raise ValueError."""
        temp_dir = tempfile.mkdtemp()
        try:
            fake_src = os.path.join(temp_dir, 'real-slug.md')
            with open(fake_src, 'w', encoding='utf-8') as f:
                f.write("---\ntitle: Title\ndate: 2026-10-05\nslug: wrong-slug\n---\nBody")
            with self.assertRaises(ValueError) as ctx:
                build_posts.render_post(fake_src, "<html>{{CONTENT}}</html>")
            self.assertIn("与文件名 ('real-slug.md') 不一致", str(ctx.exception))
        finally:
            shutil.rmtree(temp_dir)


if __name__ == '__main__':
    unittest.main()
