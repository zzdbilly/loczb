---
title: "Kotlin Scope Functions 实战选择：五个函数一个决策树"
description: "别再纠结 let 和 apply 的区别了——从 this/it 和返回值两个维度理清 Kotlin 的五个 Scope Functions，附反模式和团队规范"
date: 2026-07-05 14:09:50
category: Kotlin
tags: ["Kotlin", "Android", "最佳实践"]
read_time: 5
slug: kotlin-scope-functions-实战选择五个函数一个决策树
---

<p>Kotlin 的 Scope Functions（<code>let</code>、<code>run</code>、<code>with</code>、<code>apply</code>、<code>also</code>）是日常开发中使用最频繁的特性之一。但很多人用它们只是"别人这么写我也这么写"，不清楚它们之间的细微区别，结果写出了一把剪刀可以搞定却用了砍刀的例子。</p>
<p>这篇文章不是 Scope Functions 的入门教程——网上这类文章太多了。我想聊的是它们在实际项目中的<strong>选择逻辑</strong>和<strong>反模式</strong>，看完你至少不会再对着五个函数犹豫该用哪个。</p>
<h2>一看就懂的选函数对照表</h2>
<p>先把结论放前面。五个函数的核心区别只有两个维度：<strong>上下文对象引用方式</strong>（<code>this</code> vs <code>it</code>）和<strong>返回值</strong>（对象本身 vs lambda 最后一行）。</p>
<table>
<thead>
<tr>
<th>函数</th>
<th>上下文</th>
<th>返回值</th>
<th>最适合的场景</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>let</code></td>
<td><code>it</code></td>
<td>lambda 结果</td>
<td>非空检查后转换/处理</td>
</tr>
<tr>
<td><code>run</code></td>
<td><code>this</code></td>
<td>lambda 结果</td>
<td>对象配置 + 计算返回</td>
</tr>
<tr>
<td><code>with</code></td>
<td><code>this</code></td>
<td>lambda 结果</td>
<td>对非空对象批量操作</td>
</tr>
<tr>
<td><code>apply</code></td>
<td><code>this</code></td>
<td>对象本身</td>
<td>对象初始化/配置</td>
</tr>
<tr>
<td><code>also</code></td>
<td><code>it</code></td>
<td>对象本身</td>
<td>副作用操作（日志/校验）</td>
</tr>
</tbody>
</table>
<p>记住一句话就够了：</p>
<blockquote>
<p><strong>想看返回什么，就看你对 lambda 结果感不感兴趣。想让代码块像说话一样自然，就看用 <code>this</code> 还是 <code>it</code>。</strong></p>
</blockquote>
<h2>实操示例</h2>
<h3>apply — 配置对象的首选</h3>
<pre><code class="language-kotlin">// ❌ 糟糕的写法
val user = User()
user.name = &quot;张三&quot;
user.email = &quot;zhangsan@example.com&quot;
user.role = &quot;admin&quot;
user.avatar = &quot;default.png&quot;

// ✅ 用 apply
val user = User().apply {
    name = &quot;张三&quot;
    email = &quot;zhangsan@example.com&quot;
    role = &quot;admin&quot;
    avatar = &quot;default.png&quot;
}
</code></pre>
<p><code>apply</code> 返回对象本身，天然适合链式初始化。Builder 模式在 Kotlin 里基本不需要了，<code>apply</code> 就是最轻量的 Builder。</p>
<h3>let — 非空检查和转换</h3>
<pre><code class="language-kotlin">// ❌ 不好的写法
if (user != null) {
    sendEmail(user.email)
}

// ✅ 用 let
user?.let { sendEmail(it.email) }

// 或者更简洁
user?.email?.let { sendEmail(it) }
</code></pre>
<p><code>let</code> 用 <code>it</code> 引用对象，并且返回 lambda 结果，适合"如果非空则做某事并返回结果"的场景。</p>
<pre><code class="language-kotlin">// 转换链
val length = text?.let { 
    println(&quot;处理文本: $it&quot;)
    it.length  // let 返回这个值
} ?: 0
</code></pre>
<h3>run — 配置 + 计算一步到位</h3>
<pre><code class="language-kotlin">// 场景：创建一个 Dialog 并配置后 show，然后返回结果
val result = AlertDialog.Builder(context).apply {
    setTitle(&quot;确认&quot;)
    setMessage(&quot;确定删除吗？&quot;)
}.run {
    show()
    // 返回用户操作结果
    isShowing
}
</code></pre>
<p><code>run</code> 和 <code>apply</code> 的区别就是返回值：<code>apply</code> 返回对象，<code>run</code> 返回 lambda 结果。</p>
<h3>with — 对已有对象批量操作</h3>
<pre><code class="language-kotlin">// ❌ 重复写 binding.
binding.userName.text = userName
binding.userEmail.text = email
binding.userRole.text = role
binding.userAvatar.setImageResource(avatarRes)

// ✅ 用 with
with(binding) {
    userName.text = userName
    userEmail.text = email
    userRole.text = role
    userAvatar.setImageResource(avatarRes)
}
</code></pre>
<p><code>with</code> 的特殊之处在于它不是扩展函数而是顶层函数，参数是对象本身。适合"我有一个对象，要对它做点事"的场景。</p>
<h3>also — 插一脚的副作用</h3>
<pre><code class="language-kotlin">// 日志/调试
val user = User().apply {
    name = &quot;张三&quot;
    email = &quot;zhangsan@example.com&quot;
}.also {
    Log.d(&quot;User&quot;, &quot;创建用户: ${it.name}&quot;)
}
</code></pre>
<p><code>also</code> 和 <code>apply</code> 共用同样的场景，区别是用 <code>it</code> 而不是 <code>this</code>，适合"做完了，顺便打个日志/校验/发个事件"。</p>
<h2>三个常见的反模式</h2>
<h3>反模式 1：把 apply 当 run 用</h3>
<pre><code class="language-kotlin">// ❌ 反模式：apply 不应负责返回计算结果
val config = Configuration().apply {
    loadFromFile(&quot;config.json&quot;)
    validate()  // validate 返回一个 Boolean
    // 这里用 apply 但希望返回 validate 结果——结果它返回了 config 对象本身
}

// ✅ 正确做法：用 run
val isValid = Configuration().run {
    loadFromFile(&quot;config.json&quot;)
    validate()
}
</code></pre>
<h3>反模式 2：不必要的嵌套</h3>
<pre><code class="language-kotlin">// ❌ 反模式：嵌套作用域函数
user?.let { u -&gt; 
    u.address?.let { addr -&gt;
        println(&quot;${u.name} 住在 ${addr.city}&quot;)
    }
}

// ✅ 更好：用 if 或链式调用
if (user != null &amp;&amp; user.address != null) {
    println(&quot;${user.name} 住在 ${user.address.city}&quot;)
}

// 或者用 takeIf
user?.takeIf { it.address != null }?.let {
    println(&quot;${it.name} 住在 ${it.address.city}&quot;)
}
</code></pre>
<h3>反模式 3：链式滥用</h3>
<pre><code class="language-kotlin">// ❌ 反模式：一切皆链式
data class Result(val code: Int, val message: String)

fun process() = getData()
    ?.let { transform(it) }
    ?.also { log(it) }
    ?.let { validate(it) }
    ?.run { saveToDatabase(this) }
    ?: Result(500, &quot;failed&quot;)

// ✅ 更好的可读性：命名变量
fun process(): Result {
    val data = getData() ?: return Result(500, &quot;failed&quot;)
    val transformed = transform(data)
    log(transformed)
    val valid = validate(transformed)
    return saveToDatabase(valid)
}
</code></pre>
<p>链式看起来很酷，但调试的时候每一行都塞进 lambda 里，你没办法在中间加断点和日志。</p>
<h2><code>this</code> 和 <code>it</code> 的选择逻辑</h2>
<p>一个更重要的决定：<strong>什么时候用 <code>this</code>，什么时候用 <code>it</code></strong>。</p>
<p>用 <code>this</code> 的优点是可以直接访问接收者的成员，代码像在对象内部写一样自然：</p>
<pre><code class="language-kotlin">// this → 像说话一样自然
binding.apply {
    userName.visibility = View.VISIBLE
    userEmail.isEnabled = true
    userAvatar.setImageResource(R.drawable.default)
}
</code></pre>
<p>但 <code>this</code> 也有一个缺陷：如果对象和外部作用域有重名的成员，编译器会优先用接收者的，导致混淆：</p>
<pre><code class="language-kotlin">class MyFragment : Fragment() {
    private var userName: String = &quot;&quot;  // 成员变量

    fun setup(binding: MyBinding) {
        binding.apply {
            // 这里的 userName 是 Fragment 的成员变量
            // 还是 binding.userName？
            userName.text = &quot;Hello&quot;  // 编译器：binding 的
        }
    }
}

// 用 it 显式区分
binding.also { b -&gt;
    b.userName.text = &quot;Hello&quot;
    this@MyFragment.userName = b.userName.text.toString()
}
</code></pre>
<p>一个简单的经验法则：</p>
<blockquote>
<p><strong>如果你只需要访问接收者的成员而不需要引用它本身，用 <code>this</code>（apply/run/with）。如果你需要引用接收者本身（比如区分内外作用域或作为参数传递），用 <code>it</code>（let/also）。</strong></p>
</blockquote>
<h2>团队风格统一比选择"最优雅"更重要</h2>
<p>在团队项目中，最致命的不是选错了 scope function，而是<strong>每个人选的不一样</strong>。</p>
<p>举个例子，三个开发者给同一个 View 做初始化：</p>
<pre><code class="language-kotlin">// 开发者 A
view.apply { alpha = 0.5f; isVisible = true }

// 开发者 B
with(view) { alpha = 0.5f; isVisible = true }

// 开发者 C
view.also { it.alpha = 0.5f; it.isVisible = true }
</code></pre>
<p>三行代码功能一模一样。每次 code review 都要争论哪种"更 Kotlin"，纯属内耗。</p>
<p><strong>推荐的团队规范：</strong>
- 对象配置初始化 → 一律用 <code>apply</code>
- 非空检查后的操作 → 一律用 <code>let</code>
- 副作用日志/校验 → 一律用 <code>also</code>
- 配置 + 计算 → 用 <code>run</code>
- 对已有对象批量操作 → 用 <code>with</code></p>
<p>然后把这条规范写进项目的 <code>.editorconfig</code> 或者 lint 规则里。工具化，不要人格化。</p>
<h2>工具辅助：Detekt 和 lint 规则</h2>
<p>如果你在 Android 项目里用 Detekt（Gradle 插件），可以加一条规则来强制团队统一风格：</p>
<pre><code class="language-kotlin">// detekt.yml
style:
  UnnecessaryApply:
    active: true

  ScopeFunctions:
    active: true
    excludes: ['**/test/**', '**/androidTest/**']
</code></pre>
<p>Detekt 的 ScopeFunctions 检测器默认是关的，但把它开了以后，它会提示"合适的场景函数"——至少在多人协作时能让代码风格收敛。</p>
<p>也可以写自定义 lint rule，拒绝 <code>also</code> 在非日志场景下的使用，或者限制 <code>apply</code> 的 lambda 行数。</p>
<h2>为什么不要过度使用 it</h2>
<p>Kotlin 中 <code>it</code> 是单参数的隐式名称。在嵌套 scope function 中：</p>
<pre><code class="language-kotlin">// 你还能分清三个 it 分别是谁吗？
list?.let {
    it.filter {
        it.isActive  // 是 list 的 it 还是 filter 的 it？
    }?.let {
        it.firstOrNull()  // 同上
    }
}
</code></pre>
<p><code>it</code> 的隐式特性在嵌套超过一层时会让可读性断崖式下降。一个简单的规则：</p>
<blockquote>
<p><strong>作用域函数嵌套超过两层时，给所有的 <code>it</code> 显式命名。</strong></p>
</blockquote>
<h2>总结</h2>
<p>Scope Functions 是 Kotlin 中最容易被低估的工具：入门简单，但用好需要想清楚选择逻辑。</p>
<p>最后给你一个快速决策树，贴到你的 Android 项目 README 里，省得每次 code review 都吵：</p>
<pre><code>要配置对象？                           → apply
要检查非空并做转换？                    → let
要配置 + 计算返回值？                   → run
要对已有对象批量操作？                   → with
要打个日志或做前置/后置校验？             → also
对象和外部作用域有重名成员？              → let/also（用 it 显式引用）
嵌套超过两层？                          → 给 it 显式命名
不确定选哪个？                          → 先写传统方式，回头重构成函数提取
</code></pre>
<p>记得加一条：<strong>不要嵌套 scope functions</strong>。超过两层嵌套说明你的逻辑应该提取成独立函数了。</p>
