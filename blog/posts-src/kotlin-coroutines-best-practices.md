---
title: "Kotlin Coroutines 最佳实践"
description: "Kotlin Coroutines 最佳实践：从入门到精通，掌握异步编程的核心技巧与常见陷阱"
date: 2026-04-08 21:12:09
category: Kotlin
tags: ["Kotlin", "Coroutines", "异步编程", "Android", "最佳实践"]
read_time: 18
slug: kotlin-coroutines-best-practices
---

<p>协程（Coroutines）是 Kotlin 最强大的特性之一，它让异步编程变得像同步代码一样简洁。但在实际使用中，很多开发者容易踩坑：<strong>内存泄漏、异常丢失、线程阻塞</strong>等问题频发。</p>

      <p>本文基于实际项目经验，总结 Kotlin 协程的核心概念、最佳实践和常见陷阱。</p>

      <div class="tip-box">
        <strong>核心优势</strong>：代码简洁、性能优秀、异常安全、易于测试
      </div>

      <h2>为什么需要协程</h2>

      <p>传统异步编程的痛点：</p>

      <ul>
        <li><strong>回调地狱</strong>：多层嵌套，代码难以维护</li>
        <li><strong>线程管理复杂</strong>：手动创建和管理线程池</li>
        <li><strong>异常处理困难</strong>：回调链中异常容易丢失</li>
        <li><strong>资源泄漏</strong>：忘记取消任务导致内存泄漏</li>
      </ul>

      <p>协程通过<strong>挂起函数</strong>和<strong>结构化并发</strong>解决了这些问题。</p>

      <h2>核心概念</h2>

      <h3>1. 挂起函数（suspend function）</h3>

      <pre><code>// 普通函数
fun fetchData(): String {
    // 阻塞线程
    return api.getData()
}

// 挂起函数
suspend fun fetchData(): String {
    // 挂起而不阻塞线程
    return withContext(Dispatchers.IO) {
        api.getData()
    }
}</code></pre>

      <div class="tip-box">
        <strong>关键区别</strong>：挂起函数可以在协程中暂停执行而不阻塞线程，普通函数会阻塞调用线程。
      </div>

      <h3>2. CoroutineScope</h3>

      <p>协程作用域，用于管理协程的生命周期：</p>

      <table>
        <tr><th>作用域</th><th>使用场景</th><th>生命周期</th></tr>
        <tr><td>viewModelScope</td><td>Android ViewModel</td><td>ViewModel 销毁时自动取消</td></tr>
        <tr><td>lifecycleScope</td><td>Activity/Fragment</td><td>生命周期结束时取消</td></tr>
        <tr><td>CoroutineScope()</td><td>自定义作用域</td><td>需要手动取消</td></tr>
      </table>

      <h3>3. Dispatcher</h3>

      <pre><code>// Main：主线程，用于 UI 操作
withContext(Dispatchers.Main) {
    textView.text = result
}

// IO：磁盘/网络 IO
withContext(Dispatchers.IO) {
    val data = database.query()
}

// Default：CPU 密集型计算
withContext(Dispatchers.Default) {
    val result = heavyComputation()
}</code></pre>

      <h2>最佳实践</h2>

      <h3>1. 优先使用挂起函数</h3>

      <pre><code>// ❌ 不推荐：返回 Deferred
fun loadData(): Deferred&lt;Data> = async { repo.getData() }

// ✅ 推荐：直接返回挂起函数
suspend fun loadData(): Data = repo.getData()</code></pre>

      <div class="tip-box">
        <strong>原则</strong>：挂起函数是协程的"一等公民"，Deferred 只用于需要组合多个异步操作的场景。
      </div>

      <h3>2. 结构化并发</h3>

      <pre><code>// ❌ 不推荐：手动管理 Job
val job = Job()
val scope = CoroutineScope(job + Dispatchers.IO)
scope.launch { ... }
// 容易忘记取消

// ✅ 推荐：使用结构化并发
viewModelScope.launch {
    // 自动取消，无需手动管理
    val data = repo.getData()
}</code></pre>

      <h3>3. 异常处理</h3>

      <pre><code>// ✅ 推荐：在作用域边界处理异常
viewModelScope.launch {
    try {
        val data = repo.getData()
        _uiState.value = UiState.Success(data)
    } catch (e: Exception) {
        _uiState.value = UiState.Error(e.message)
    }
}

// ✅ 使用 supervisorScope 隔离异常
supervisorScope {
    launch {
        // 这个协程失败不会影响其他协程
        api.getUser()
    }
    launch {
        // 这个协程仍然可以正常执行
        api.getPosts()
    }
}</code></pre>

      <h3>4. 并发操作</h3>

      <pre><code>// ✅ 并行执行多个独立操作
val (user, posts) = coroutineScope {
    awaitAll(
        async { api.getUser() },
        async { api.getPosts() }
    )
}

// ✅ 使用 zip 组合两个结果
val result = coroutineScope {
    async { api.getUser() }
        .zip(async { api.getPosts() }) { user, posts ->
            UserWithPosts(user, posts)
        }
}</code></pre>

      <h3>5. 超时和重试</h3>

      <pre><code>// ✅ 超时处理
withTimeout(5000) {
    api.slowOperation()
}

// ✅ 超时返回 null
val result = withTimeoutOrNull(5000) {
    api.slowOperation()
}

// ✅ 重试机制
suspend fun &lt;T> retry(
    times: Int,
    initialDelay: Long = 100,
    maxDelay: Long = 1000,
    factor: Double = 2.0,
    block: suspend () -> T
): T {
    var currentDelay = initialDelay
    repeat(times - 1) {
        try {
            return block()
        } catch (e: Exception) {
            delay(currentDelay)
            currentDelay = (currentDelay * factor).toLong().coerceAtMost(maxDelay)
        }
    }
    return block() // 最后一次尝试
}</code></pre>

      <h2>常见陷阱</h2>

      <div class="warning-box">
        <strong>陷阱 1：在挂起函数中阻塞线程</strong><br>
        <code>Thread.sleep()</code> 会阻塞线程，应该使用 <code>delay()</code>
      </div>

      <div class="warning-box">
        <strong>陷阱 2：忘记处理异常</strong><br>
        <code>launch</code> 中的异常会被吞掉，需要用 <code>try-catch</code> 或 <code>CoroutineExceptionHandler</code>
      </div>

      <div class="warning-box">
        <strong>陷阱 3：滥用 GlobalScope</strong><br>
        <code>GlobalScope</code> 没有生命周期管理，容易导致内存泄漏，应该使用 <code>viewModelScope</code> 或自定义作用域
      </div>

      <div class="warning-box">
        <strong>陷阱 4：在主线程执行 IO 操作</strong><br>
        即使使用协程，也要用 <code>withContext(Dispatchers.IO)</code> 切换线程
      </div>

      <h2>实战案例</h2>

      <h3>Android ViewModel 中的协程</h3>

      <pre><code>class UserViewModel(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow&lt;UiState&lt;User>>(UiState.Loading)
    val uiState: StateFlow&lt;UiState&lt;User>> = _uiState.asStateFlow()

    init {
        loadUser()
    }

    private fun loadUser() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            
            try {
                // 并行加载用户数据和头像
                val (user, avatar) = coroutineScope {
                    awaitAll(
                        async { userRepository.getUser() },
                        async { userRepository.getAvatar() }
                    )
                }
                
                _uiState.value = UiState.Success(user.copy(avatar = avatar))
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}</code></pre>

      <h2>性能优化</h2>

      <ul>
        <li><strong>避免过度使用 async</strong>：只有需要并行执行时才用 async，否则用 launch</li>
        <li><strong>合理选择 Dispatcher</strong>：IO 操作别在 Main 线程，CPU 计算别在 IO 线程</li>
        <li><strong>使用 Flow 替代回调</strong>：响应式数据流更适合协程</li>
        <li><strong>避免协程嵌套</strong>：不要在协程中再启动协程</li>
      </ul>

      <h2>总结</h2>

      <p>Kotlin 协程是强大的异步编程工具，但需要正确使用：</p>

      <ul>
        <li>✅ 优先使用挂起函数而非 Deferred</li>
        <li>✅ 使用结构化并发管理生命周期</li>
        <li>✅ 在作用域边界处理异常</li>
        <li>✅ 合理选择 Dispatcher</li>
        <li>✅ 避免 GlobalScope 和线程阻塞</li>
      </ul>

      <div class="tip-box">
        <strong>参考资源</strong>：<br>
        Kotlin 官方文档：<a href="https://kotlinlang.org/docs/coroutines-overview.html" target="_blank">kotlinlang.org/docs/coroutines</a><br>
        Kotlin Coroutines 指南：<a href="https://github.com/Kotlin/kotlinx.coroutines" target="_blank">github.com/Kotlin/kotlinx.coroutines</a>
      </div>
