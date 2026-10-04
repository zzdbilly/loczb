---
title: "从 TDD 到 TDD²：测试驱动开发的进阶实践"
description: "打破红-绿-重构的刻板印象，聊聊三角测量、转换优先级、测试替身的正确用法，以及那些让你能在实战中用好 TDD 的经验"
date: 2026-07-12 19:20:07
category: 开发
tags: ["TDD", "测试", "开发实践", "重构"]
read_time: 5
slug: 从-tdd-到-tdd²测试驱动开发的进阶实践
---

<p>从 TDD 到 TDD²：测试驱动开发的进阶实践</p>
<p>很多人知道 TDD（Test-Driven Development），但大部分停留在"红-绿-重构"的表面理解上。真正用 TDD 写过几个项目后，你会发现它远不止三个步骤那么简单。</p>
<p>这篇博客不是 TDD 入门教程，而是一份实战进阶指南。我会聊聊在实际项目中遇到的坑、总结出来的模式，以及如何让 TDD 真正为你所用，而不是成为负担。</p>
<h2>为什么大多数 TDD 实践会失败</h2>
<p>先直面一个现实：很多团队和个人尝试 TDD 后，最终都放弃了。原因不是 TDD 本身不好，而是没有掌握正确的节奏。</p>
<h3>测试粒度过细</h3>
<p>最经典的问题：把每一个内部方法都写成测试。</p>
<pre><code class="language-java">// ❌ 坏的例子：测试私有方法
public class OrderService {
    private BigDecimal calculateTax(Order order) { ... }
    private boolean validateStock(Order order) { ... }
    private String generateOrderNumber() { ... }
}
</code></pre>
<p>每个私有方法写一个测试类，重构时全得改。正确的做法是测试<strong>公开行为</strong>，不是测试<strong>内部实现</strong>。</p>
<h3>在错误层级做断言</h3>
<pre><code class="language-python"># ❌ 太细，绑定实现
def test_calculate():
    result = calculator.add(1, 2)
    assert result == 3
    assert calculator.history == [3]  # 绑定内部状态
</code></pre>
<p>测试应该断言行为的输出，而不是实现细节。改一下：</p>
<pre><code class="language-python"># ✅ 关注行为
def test_calculate():
    result = calculator.add(1, 2)
    assert result == 3
</code></pre>
<h3>一步走太大</h3>
<p>TDD 的精髓是小步快跑。但很多人在"红"阶段写了太多代码，然后发现测试怎么都过不了。</p>
<pre><code class="language-python"># ❌ 一步到位，red 阶段写了整个模块
def test_checkout():
    cart = Cart()
    cart.add_item(&quot;book&quot;, 2, 29.9)
    result = checkout(cart, coupon=&quot;NEW50&quot;, address=&quot;...&quot;)
    assert result.total == 29.9
    assert result.tracking_number is not None
</code></pre>
<p>这样如果测试失败，你完全不知道是哪一步出错了。应该拆成更小的步骤。</p>
<h2>第二个 T：三角测量法</h2>
<p>TDD² 中的第二个 T 来自 <strong>Transformation Priority</strong>（转换优先级）和 <strong>Triangulation</strong>（三角测量）。这是很多 TDD 实践者忽略的精华。</p>
<h3>三角测量的本质</h3>
<p>三角测量是通过<strong>多个测试案例</strong>来推导出通用实现，而不是实现完再写第二个用例。</p>
<pre><code class="language-python">import pytest

# 第一步：最简单的案例
def test_sum_empty():
    assert sum_list([]) == 0

# 第二步：单元素列表
def test_sum_single():
    assert sum_list([5]) == 5

# 第三步：多元素列表——三角测量点
def test_sum_multiple():
    assert sum_list([1, 2, 3]) == 6
</code></pre>
<p>实现过程：</p>
<pre><code class="language-python"># 第一版：硬编码
def sum_list(nums):
    return 0

# 第二版：还是硬编码
def sum_list(nums):
    return 5 if nums == [5] else 0  # ❌ 这是反面例子，但真实开发中要注意它

# 更好的路径
def sum_list(nums):
    if not nums:
        return 0
    return nums[0]  # 稍微通用一点

# 最终版：经过三角测量推导出
def sum_list(nums):
    return sum(nums)
</code></pre>
<p>关键点：三角测量让你<strong>避免过度工程化</strong>。只写刚好能让所有测试通过的代码。</p>
<h3>转换优先级原则</h3>
<p>Uncle Bob 提出了一个转换优先级列表，告诉你从"特殊到通用"的转换路径：</p>
<ol>
<li><code>nil → constant</code>（空→常量）</li>
<li><code>constant → constant+</code>（常量→更通用的常量）</li>
<li><code>constant → scalar</code>（常量→变量）</li>
<li><code>statement → statements</code>（单语句→多语句）</li>
<li><code>unconditional → conditional</code>（无条件→条件）</li>
<li><code>scalar → array</code>（标量→数组）</li>
<li><code>array → container</code>（数组→容器）</li>
<li><code>statement → recursion</code>（语句→递归）</li>
<li><code>conditional → loop</code>（条件→循环）</li>
<li><code>expression → function</code>（表达式→函数）</li>
<li><code>variable → assignment</code>（变量→赋值）</li>
<li><code>case → if/else</code> or <code>case → polymorphism</code>（case→分支/多态）</li>
</ol>
<pre><code class="language-python"># 实际例子：猜数字游戏
def guess_number(secret: int, guess: int) -&gt; str:

# 测试1：猜中
def test_guess_correct():
    assert guess_number(5, 5) == &quot;correct&quot;

# 按转换优先级，应该先走 constant → scalar
def guess_number(secret: int, guess: int) -&gt; str:
    return &quot;correct&quot;  # nil → constant

# 测试2：猜大了
def test_guess_too_high():
    assert guess_number(5, 7) == &quot;too high&quot;
    assert guess_number(5, 6) == &quot;too high&quot;

# 现在需要 conditional 了（优先级5）
def guess_number(secret: int, guess: int) -&gt; str:
    if guess &gt; secret:
        return &quot;too high&quot;
    return &quot;correct&quot;

# 测试3：猜小了
def test_guess_too_low():
    assert guess_number(5, 3) == &quot;too low&quot;

# 最终
def guess_number(secret: int, guess: int) -&gt; str:
    if guess &gt; secret:
        return &quot;too high&quot;
    if guess &lt; secret:
        return &quot;too low&quot;
    return &quot;correct&quot;
</code></pre>
<p>每一步都是最小幅度的转换，让代码自然生长。</p>
<h2>测试替身的正确用法</h2>
<p>测试替身（Mock/Stub/Fake）用得好是利器，用不好是累赘。很多人的误区是"只要测试就 mock 数据库"。</p>
<h3>Stub vs Mock vs Fake</h3>
<p>先说清楚区别：</p>
<ul>
<li><strong>Stub</strong>：提供预设的返回值，不验证交互</li>
<li><strong>Mock</strong>：验证交互方式（比如有没有调用某个方法）</li>
<li><strong>Fake</strong>：轻量级实现替代（比如用内存数据库代替真实数据库）</li>
</ul>
<pre><code class="language-python">from unittest.mock import Mock, patch
from dataclasses import dataclass

# Stub：返回固定数据
class UserServiceStub:
    def get_user(self, user_id: int):
        return {&quot;id&quot;: user_id, &quot;name&quot;: &quot;Alice&quot;}

# Fake：真正的替代实现
class InMemoryUserRepository:
    def __init__(self):
        self._users = {}

    def save(self, user):
        self._users[user.id] = user

    def find_by_id(self, user_id):
        return self._users.get(user_id)

# 测试时
def test_create_user():
    repo = InMemoryUserRepository()
    service = UserService(repo)
    user = service.create_user(&quot;Alice&quot;)
    assert repo.find_by_id(user.id).name == &quot;Alice&quot;
</code></pre>
<h3>什么时候用 Mock</h3>
<p>可以用，但有节制。Mock 应该在以下场景使用：</p>
<pre><code class="language-python"># ✅ 合理的 Mock：外部系统边界的确认
@patch(&quot;myapp.services.email_sender&quot;)
def test_send_welcome_email(mock_sender):
    service = UserService(email_sender=mock_sender)
    service.register(&quot;alice@example.com&quot;)

    # 确认调用了外部服务
    mock_sender.send.assert_called_once_with(
        to=&quot;alice@example.com&quot;,
        template=&quot;welcome&quot;
    )
</code></pre>
<pre><code class="language-python"># ❌ 过度 Mock：把内部实现细节全部 Mock
@patch(&quot;myapp.services.UserService._validate_email&quot;)
@patch(&quot;myapp.services.UserService._check_username&quot;)
@patch(&quot;myapp.services.UserService._hash_password&quot;)
def test_create_user(mock_hash, mock_check, mock_validate):
    # 把自己内部逻辑全 mock 了还测什么？
    pass
</code></pre>
<h3>一个值得用的模式：Contract Test</h3>
<p>接口定义好之后，用 Contract Test 保证实现一致性：</p>
<pre><code class="language-python">from abc import ABC, abstractmethod

class UserRepository(ABC):
    @abstractmethod
    def save(self, user): ...
    @abstractmethod
    def find_by_id(self, user_id): ...

# Contract Test
class UserRepositoryContract:
    def test_save_and_find(self):
        repo = self.create_repository()
        user = User(id=1, name=&quot;Alice&quot;)
        repo.save(user)
        found = repo.find_by_id(1)
        assert found.name == &quot;Alice&quot;

    def test_find_nonexistent(self):
        repo = self.create_repository()
        assert repo.find_by_id(999) is None

    # 子类实现这个方法来提供不同的实现
    def create_repository(self) -&gt; UserRepository:
        raise NotImplementedError

# PostgreSQL 实现
class TestPostgresUserRepository(UserRepositoryContract):
    def create_repository(self):
        return PostgresUserRepository(db_url=&quot;postgresql://test:test@localhost:5432/test&quot;)

# 内存实现
class TestInMemoryUserRepository(UserRepositoryContract):
    def create_repository(self):
        return InMemoryUserRepository()
</code></pre>
<p>这样切换实现时，测试也复用。</p>
<h2>重构的艺术</h2>
<p>TDD 的第三步"重构"是最容易被跳过的。很多人写完通过后就跑了，留下了大量坏味道。</p>
<h3>测试本身也需要重构</h3>
<pre><code class="language-python"># ❌ 测试中有大量重复
def test_discount_no_coupon():
    cart = Cart()
    cart.add_item(&quot;book&quot;, 1, 29.9)
    result = checkout(cart, coupon=None)
    assert result.total == 29.9

def test_discount_with_10_percent():
    cart = Cart()
    cart.add_item(&quot;book&quot;, 1, 29.9)
    result = checkout(cart, coupon=&quot;DISCOUNT10&quot;)
    assert result.total == 26.91

def test_discount_with_20_percent():
    cart = Cart()
    cart.add_item(&quot;book&quot;, 1, 29.9)
    result = checkout(cart, coupon=&quot;DISCOUNT20&quot;)
    assert result.total == 23.92
</code></pre>
<p>提取公共逻辑：</p>
<pre><code class="language-python">import pytest

@pytest.fixture
def cart_with_book():
    cart = Cart()
    cart.add_item(&quot;book&quot;, 1, 29.9)
    return cart

def test_discount_no_coupon(cart_with_book):
    result = checkout(cart_with_book, coupon=None)
    assert result.total == 29.9

@pytest.mark.parametrize(&quot;coupon,expected&quot;, [
    (&quot;DISCOUNT10&quot;, 26.91),
    (&quot;DISCOUNT20&quot;, 23.92),
    (&quot;DISCOUNT50&quot;, 14.95),
])
def test_discount_with_coupon(cart_with_book, coupon, expected):
    result = checkout(cart_with_book, coupon=coupon)
    assert result.total == expected
</code></pre>
<h3>生产代码重构的保险</h3>
<p>TDD 的测试集就是重构的安全网。但要让它真正发挥作用：</p>
<pre><code class="language-python"># ✅ 重构前：先确认测试全部通过
import subprocess

def run_tests():
    result = subprocess.run([&quot;pytest&quot;, &quot;-x&quot;, &quot;--tb=short&quot;], capture_output=True, text=True)
    assert result.returncode == 0, f&quot;Tests failed before refactoring:\n{result.stdout}&quot;

# 然后放心重构
def calculate_discount(total: float, coupon: str | None) -&gt; float:
    &quot;&quot;&quot;把分散在各个地方的优惠计算集中到一处&quot;&quot;&quot;
    if coupon is None:
        return total

    discounts = {
        &quot;DISCOUNT10&quot;: 0.9,
        &quot;DISCOUNT20&quot;: 0.8,
        &quot;DISCOUNT50&quot;: 0.5,
    }

    return total * discounts.get(coupon, 1.0)
</code></pre>
<p>重构后跑测试，如果全绿，说明重构成功。</p>
<h2>边界测试：容易被忽略的角落</h2>
<p>大部分测试覆盖的是"快乐路径"，边界值往往被忽略。但生产环境的 bug 大多出在边界上。</p>
<h3>数值边界</h3>
<pre><code class="language-python">import pytest

def test_discount_boundaries():
    # 零金额
    assert checkout(Cart(), coupon=&quot;DISCOUNT10&quot;).total == 0

    # 超大金额
    big_cart = Cart()
    big_cart.add_item(&quot;expensive_stuff&quot;, 1, 1_000_000)
    result = checkout(big_cart, coupon=&quot;DISCOUNT50&quot;)
    assert result.total == 500_000  # 不会溢出

    # 负数金额（异常情况）
    with pytest.raises(InvalidPriceError):
        Cart().add_item(&quot;bad&quot;, 1, -100)
</code></pre>
<h3>字符串边界</h3>
<pre><code class="language-python">@pytest.mark.parametrize(&quot;username,expected&quot;, [
    (&quot;a&quot;, True),          # 最小有效
    (&quot;a&quot; * 50, True),     # 最大有效
    (&quot;&quot;, False),          # 空字符串
    (&quot;a&quot; * 51, False),    # 超长
    (&quot;user@name&quot;, False), # 特殊字符
    (None, False),        # None
])
def test_username_validation(username, expected):
    assert validate_username(username) == expected
</code></pre>
<h3>并发边界</h3>
<pre><code class="language-python">import threading
import time

def test_concurrent_checkout():
    cart = Cart()
    cart.add_item(&quot;limited_item&quot;, 1, 99.9)

    # 库存只有1件
    results = []
    errors = []

    def try_checkout(user_id):
        try:
            result = checkout(cart, user_id=user_id)
            results.append(result)
        except OutOfStockError:
            errors.append(user_id)

    threads = [
        threading.Thread(target=try_checkout, args=(i,))
        for i in range(10)
    ]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(results) == 1  # 只有一个人成功
    assert len(errors) == 9   # 其他人获取&quot;已售罄&quot;
</code></pre>
<h2>测试驱动设计：TDD 的真正价值</h2>
<p>TDD 最大的好处不是"更少的 bug"，而是<strong>更好的设计</strong>。</p>
<h3>可测试性 = 可维护性</h3>
<p>如果一个函数很难写测试，往往意味着它的设计有问题。</p>
<pre><code class="language-python"># ❌ 难以测试：硬编码依赖
def process_order(order_id):
    db = Database(&quot;mysql://...&quot;)
    order = db.query(f&quot;SELECT * FROM orders WHERE id = {order_id}&quot;)
    email_client = EmailClient(&quot;smtp://...&quot;)
    email_client.send(order.user_email, &quot;Order processed&quot;)
    return &quot;OK&quot;
</code></pre>
<p>改为依赖注入后，不仅可测试，还更灵活：</p>
<pre><code class="language-python"># ✅ 可测试设计：依赖注入
def process_order(
    order_id: int,
    db: Database | None = None,
    email: EmailClient | None = None
):
    db = db or Database()
    email = email or EmailClient()

    order = db.find_order(order_id)
    email.send(order.user_email, &quot;Order processed&quot;)
    return &quot;OK&quot;

# 测试中传递 mock
def test_process_order():
    mock_db = Mock()
    mock_db.find_order.return_value = Order(user_email=&quot;test@test.com&quot;)
    mock_email = Mock()

    result = process_order(1, db=mock_db, email=mock_email)

    assert result == &quot;OK&quot;
    mock_email.send.assert_called_once()
</code></pre>
<h3>测试驱动的 API 设计</h3>
<p>写客户端代码之前先写测试，逼你从使用者角度思考 API：</p>
<pre><code class="language-python"># 先写使用场景
from mylib import DataProcessor
import pytest

def test_data_processor_pipeline():
    data = [1, 2, 3, 4, 5]
    pipeline = DataProcessor()

    result = (
        pipeline
        .load(data)
        .filter(lambda x: x &gt; 2)
        .map(lambda x: x * 2)
        .reduce(lambda a, b: a + b)
    )

    assert result == 28  # (3+4+5) * 2 还是 3*2 + 4*2 + 5*2?
</code></pre>
<p>写成这样你才清楚 API 到底要怎样设计才自然。</p>
<h2>常见误区一览</h2>
<table>
<thead>
<tr>
<th>误区</th>
<th>正确做法</th>
</tr>
</thead>
<tbody>
<tr>
<td>测试私有方法</td>
<td>只测试公开行为</td>
</tr>
<tr>
<td>一个测试走完整流程</td>
<td>拆成小步，每个测试只验证一件事</td>
</tr>
<tr>
<td>过度 Mock 一切</td>
<td>只在外部系统边界用 Mock，内部用 Fake</td>
</tr>
<tr>
<td>测试通过后跳过重构</td>
<td>红-绿-重构缺一不可</td>
</tr>
<tr>
<td>不测边界值</td>
<td>边界值是高发 bug 区，必须覆盖</td>
</tr>
<tr>
<td>写代码前不写测试</td>
<td>TDD 的核心是测试先行，先设计再实现</td>
</tr>
</tbody>
</table>
<p>上面这些坑我自己都踩过。<strong>TDD 不是死板的流程，而是一套反馈循环</strong>——写测试让你先想清楚要什么，实现让它变绿，重构让代码保持整洁。三者缺一不可。</p>
<h2>写在最后</h2>
<p>TDD 不容易，它需要练习和耐心。但一旦掌握了正确的节奏，你会发现：</p>
<ol>
<li><strong>编写测试让你先思考设计，而不是一头扎进实现</strong></li>
<li><strong>三角测量和转换优先级帮你写出刚好够用的代码</strong></li>
<li><strong>测试替身让你隔离关注点，但不滥用</strong></li>
<li><strong>重构不是可选项，它是 TDD 的核心环节</strong></li>
<li><strong>边界测试保护你不在小角落里翻车</strong></li>
</ol>
<p>TDD 是一种技能，不是看来的。动手写吧。</p>
<hr />
<p>如果你对某一部分特别感兴趣，或者在实际项目中遇到过 TDD 的坑，欢迎留言讨论。</p>
