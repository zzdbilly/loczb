---
title: "Markdown 发文链路测试（实验用）"
description: "用纯 Markdown 撰写一篇测试文章，验证 md → html 编译链路对各类 Markdown 语法的处理结果（实验记录）"
date: 2026-10-05 08:25:15
category: 开发
tags: ["实验记录"]
read_time: 3
slug: md-pipeline-test
---

## 1. 标题层级

### 1.1 三级标题

## 2. 行内元素

这里是**加粗**、*斜体*、`行内代码`，以及一个[链接](https://709527.xyz)。

## 3. 无序列表

- 第一项
- 第二项
- 第三项

## 4. 有序列表

1. 步骤一
2. 步骤二
3. 步骤三

## 5. 代码块

```bash
python3 scripts/build-posts.py
node scripts/verify.js
```

```python
def hello(name: str) -> str:
    return f"hello {name}"
```

## 6. 引用

> 这是一段引用。

## 7. 表格

| 项目 | 状态 | 备注 |
| --- | --- | --- |
| md 编译 | 通过 | 本次实验 |
| 门禁 | 通过 | verify.js |

## 8. 分隔线

---

结尾段落。
