#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""privacy-scan.py — 提交前隐私/凭据扫描（只读，不改任何文件）

用途：在 push 之前，把「即将公开」的内容扫一遍，挡住三类东西：
  1. 凭据（API key / token / JWT / 私钥块）—— 命中即失败（exit 1）
  2. 非示例邮箱（真实邮箱）—— 命中即失败（exit 1）
  3. 绝对 home 路径 —— 只告警（信息暴露，非凭据），不阻断

设计原则
  - 只读：绝不修改文件
  - 不回显敏感值：凭据与邮箱一律打码，只给 文件:行号 + 规则 + 打码片段
  - 默认只扫「相对基线有改动」的文件（提交前最常用），--all 扫全库
  - 占位写法（/home/<user>、/home/user、you@example.com）不算命中

用法
  python3 scripts/privacy-scan.py                 # 扫相对 origin/main 的改动
  python3 scripts/privacy-scan.py --all            # 扫全部受控文件
  python3 scripts/privacy-scan.py --baseline HEAD~1
  python3 scripts/privacy-scan.py --selftest       # 自检规则（不需要仓库数据）
"""

import argparse
import os
import re
import subprocess
import sys

# ---------------------------------------------------------------- 规则表
# (severity, rule_name, compiled_regex)
RULES = [
    ("error", "sk- 形态密钥",        re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}")),
    ("error", "sk-ant- 密钥",        re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{16,}")),
    ("error", "GitHub token",        re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}")),
    ("error", "AWS access key",      re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("error", "Google API key",      re.compile(r"\bAIza[0-9A-Za-z_\-]{35}\b")),
    ("error", "Slack token",         re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}")),
    ("error", "HuggingFace token",   re.compile(r"\bhf_[A-Za-z0-9]{30,}\b")),
    ("error", "Replicate token",     re.compile(r"\br8_[A-Za-z0-9]{30,}\b")),
    ("error", "JWT",                 re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{5,}")),
    ("error", "Bearer 明文",         re.compile(r"Authorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]{25,}", re.I)),
    ("error", "私钥块",              re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")),
    ("error", "非示例邮箱",          re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")),
    ("warn",  "绝对 home 路径",      re.compile(r"/(?:home|root|Users)/([A-Za-z0-9_.\-]+)")),
]

# 邮箱白名单：RFC 2606 保留域、GitHub 隐私别名、SSH 算法名、文档里的服务账号占位
EMAIL_OK_DOMAINS = ("example.com", "example.org", "example.net", "example.edu")
EMAIL_OK_SUFFIX = (
    "users.noreply.github.com",     # GitHub 隐私邮箱
    "openssh.com", "libssh.org",    # SSH 算法标识，含 @ 但不是邮箱
    "my-project.iam.gserviceaccount.com",  # 文档里的 GCP 服务账号占位
)
EMAIL_OK_EXACT = ("git@github.com",)

# 绝对路径里的「占位用户名」——这些是文档示例，不是真实账号
PATH_OK_SEGMENTS = {
    "user", "username", "yourname", "your_name", "your-user", "youruser",
    "name", "deploy", "example", "xxx", "...", "user_dir_link", "path",
}

SKIP_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", ".next", "dist", "build"}
MAX_BYTES = 2_000_000


def mask(value):
    """凭据/邮箱打码：只留首尾少量字符。"""
    v = value.strip()
    if "@" in v and " " not in v:
        local, _, domain = v.partition("@")
        return "%s***@%s" % (local[:2], domain)
    if len(v) <= 8:
        return v[:2] + "***"
    return v[:6] + "***" + v[-4:]


def email_allowed(value):
    if any(value.endswith("@" + d) for d in EMAIL_OK_DOMAINS):
        return True
    if any(value.endswith(s) for s in EMAIL_OK_SUFFIX):
        return True
    return value in EMAIL_OK_EXACT


def path_is_placeholder(segment):
    """占位用户名 / 代码里的类名（如 HomeViewModel）都不算真实路径。"""
    if segment in PATH_OK_SEGMENTS:
        return True
    if segment[:1].isupper():       # Navigation 路由、类名等
        return True
    return False


def look_like_binary(path):
    try:
        with open(path, "rb") as fh:
            return b"\x00" in fh.read(8192)
    except OSError:
        return True


def git(args, cwd):
    return subprocess.run(["git"] + args, cwd=cwd, capture_output=True, text=True)


def repo_root():
    r = git(["rev-parse", "--show-toplevel"], os.getcwd())
    if r.returncode != 0:
        sys.exit("privacy-scan: 当前目录不是 git 仓库")
    return r.stdout.strip()


def tracked_files(root):
    return [f for f in git(["ls-files"], root).stdout.split("\n") if f]


def changed_files(root, baseline):
    out = set()
    r = git(["diff", "--name-only", baseline], root)
    if r.returncode != 0:
        # 基线不存在（浅克隆等）→ 退回未提交改动 + 暂存区 + 未跟踪
        for extra in (["diff", "--name-only"], ["diff", "--cached", "--name-only"]):
            out.update(f for f in git(extra, root).stdout.split("\n") if f)
    else:
        out.update(f for f in r.stdout.split("\n") if f)
    out.update(f for f in git(["ls-files", "--others", "--exclude-standard"], root).stdout.split("\n") if f)
    return sorted(out)


def scan_file(root, rel):
    hits = []
    abs_path = os.path.join(root, rel)
    if any(part in SKIP_DIRS for part in rel.split("/")):
        return hits
    if not os.path.isfile(abs_path):
        return hits
    try:
        if os.path.getsize(abs_path) > MAX_BYTES or look_like_binary(abs_path):
            return hits
        text = open(abs_path, encoding="utf-8", errors="ignore").read()
    except OSError:
        return hits

    for lineno, line in enumerate(text.split("\n"), 1):
        for severity, name, rx in RULES:
            for m in rx.finditer(line):
                val = m.group(0)
                shown = val
                if name == "非示例邮箱":
                    if email_allowed(val):
                        continue
                    shown = mask(val)
                elif name == "绝对 home 路径":
                    if path_is_placeholder(m.group(1)):
                        continue
                    shown = (m.group(0) + "…")[:48]
                else:
                    shown = mask(val)
                hits.append((severity, name, rel, lineno, shown))
                break  # 同一行同一条规则只报一次
    return hits


def selftest():
    """规则自检：该抓的抓得到、不该抓的不误报。"""
    must_hit = [
        ("sk- 形态密钥", "key = 'sk-" + "a1B2c3D4e5F6g7H8i9J0k1L2'"),
        ("GitHub token", "tok ghp_" + "A" * 36),
        ("AWS access key", "id AKIA" + "ABCDEFGHIJKLMNOP"),
        ("私钥块", "-----BEGIN " + "RSA PRIVATE KEY-----"),
        ("非示例邮箱", "mail: zhang.san@" + "realcorp.cn"),
        ("绝对 home 路径", "path /root/" + "ssh-backups/id_rsa"),
    ]
    must_miss = [
        ("非示例邮箱", "you@example.com"),
        ("非示例邮箱", "zzdbilly@users.noreply.github.com"),
        ("非示例邮箱", "aes256-gcm@openssh.com"),
        ("非示例邮箱", "git@github.com"),
        ("绝对 home 路径", "/home/<user>/project"),
        ("绝对 home 路径", "/home/user/project"),
        ("绝对 home 路径", "/home/HomeViewModel"),
    ]
    fails = []
    for rule, sample in must_hit:
        rx = next(r for s, n, r in RULES if n == rule)
        found = list(rx.finditer(sample))
        ok = False
        for m in found:
            if rule == "非示例邮箱" and email_allowed(m.group(0)):
                continue
            if rule == "绝对 home 路径" and path_is_placeholder(m.group(1)):
                continue
            ok = True
        if not ok:
            fails.append("应命中却未命中: %s" % rule)
    for rule, sample in must_miss:
        rx = next(r for s, n, r in RULES if n == rule)
        for m in rx.finditer(sample):
            if rule == "非示例邮箱" and email_allowed(m.group(0)):
                continue
            if rule == "绝对 home 路径" and path_is_placeholder(m.group(1)):
                continue
            fails.append("误报: %s | %s" % (rule, sample))
            break
    for f in fails:
        print("  ✗ " + f)
    print("自检: %d 条应命中 + %d 条不应命中 → %s"
          % (len(must_hit), len(must_miss), "全部通过" if not fails else "有失败"))
    return 0 if not fails else 1


def main():
    ap = argparse.ArgumentParser(description="提交前隐私/凭据扫描（只读）")
    ap.add_argument("--all", action="store_true", help="扫描全部受控文件")
    ap.add_argument("--baseline", default="origin/main", help="改动比较基线（默认 origin/main）")
    ap.add_argument("--selftest", action="store_true", help="只跑规则自检")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    root = repo_root()
    files = tracked_files(root) if args.all else changed_files(root, args.baseline)

    hits = []
    for rel in files:
        hits.extend(scan_file(root, rel))

    errors = [h for h in hits if h[0] == "error"]
    warns = [h for h in hits if h[0] == "warn"]

    if not hits:
        print("✅ privacy-scan: 扫描 %d 个文件，未发现凭据 / 真实邮箱 / 绝对路径" % len(files))
        return 0

    for severity, name, rel, lineno, shown in hits:
        print("[%s] %-14s %s:%d  %s"
              % ("ERROR" if severity == "error" else "WARN ", name, rel, lineno, shown))
    print("-" * 60)
    print("扫描 %d 个文件 → 错误 %d 条，告警 %d 条" % (len(files), len(errors), len(warns)))
    if errors:
        print("❌ 有错误：先处理再提交（凭据必须先轮换，再清理文件/历史）")
        return 1
    print("⚠️  只有告警（绝对路径），不阻断提交")
    return 0


if __name__ == "__main__":
    sys.exit(main())
