---
title: "Kotlin Coroutine 异常处理机制全面解析"
description: "全面解析 Kotlin 协程异常处理机制，涵盖 launch/async 异常传播差异、SupervisorJob、结构化并发、CoroutineExceptionHandler、Android 最佳实践等核心内容"
date: 2026-07-01 17:43:07
category: Kotlin
tags: ["Kotlin", "协程", "异常处理", "Android"]
read_time: 5
slug: kotlin-coroutine-exception-handling
---

<h2>引言</h2>
<p>Kotlin Coroutines 已经成为 Android 和 Kotlin 后端开发中处理异步操作的标准方案。然而，异常处理机制是协程中最容易让人困惑的部分之一——<code>launch</code> 和 <code>async</code> 的异常传播行为不同，<code>SupervisorJob</code> 和普通 <code>Job</code> 的表现也不同，结构化并发的取消和异常传播更是让很多开发者踩坑。</p>
<p>本文从协程异常处理的底层原理出发，覆盖所有常见场景和最佳实践，帮助你彻底理解协程的异常处理机制。</p>
<h2>协程异常处理基础</h2>
<p>在传统编程中，<code>try-catch</code> 是异常处理的唯一方式。但在协程的世界里，异常处理的方式取决于你使用的是 <code>launch</code> 还是 <code>async</code>，以及协程的层次结构。</p>
<h3>try-catch 在协程中的局限性</h3>
<p>考虑以下代码：</p>
<pre><code>fun main() = runBlocking {
    try {
        launch {
            throw RuntimeException(&quot;协程异常&quot;)
        }
    } catch (e: Exception) {
        println(&quot;捕获到异常: $e&quot;)
    }
}
</code></pre>

<p>这段代码能捕获异常吗？<strong>不能。</strong> 抛出异常的协程在 <code>launch</code> 内部，而 <code>try-catch</code> 包裹的是 <code>launch</code> 本身（它是非阻塞的）。异常在协程体内部抛出时，<code>launch</code> 已经返回了。</p>
<p>正确的方式是将 <code>try-catch</code> 放在协程体内部：</p>
<pre><code>fun main() = runBlocking {
    launch {
        try {
            throw RuntimeException(&quot;协程异常&quot;)
        } catch (e: Exception) {
            println(&quot;捕获到异常: $e&quot;)
        }
    }
}
</code></pre>

<p>这是最简单的异常处理方式，但在复杂场景下不够用。</p>
<h2>Launch 与 Async 的异常传播差异</h2>
<p>这是协程异常处理的核心知识点。<code>launch</code> 和 <code>async</code> 对异常的处理方式完全不同。</p>
<h3>Launch：主动传播异常</h3>
<p><code>launch</code> 创建的协程遇到未捕获异常时，会立即将异常传播给父协程，并取消父协程及其所有子协程。</p>
<pre><code>fun main() = runBlocking {
    val scope = CoroutineScope(Job())

    scope.launch {
        println(&quot;子协程 1 开始&quot;)
        delay(100)
        throw RuntimeException(&quot;子协程 1 异常&quot;)
    }

    scope.launch {
        println(&quot;子协程 2 开始&quot;)
        try {
            delay(500)
        } catch (e: CancellationException) {
            println(&quot;子协程 2 被取消了&quot;)
        }
    }

    delay(1000)
    println(&quot;主协程结束&quot;)
}
// 输出：
// 子协程 1 开始
// 子协程 2 开始
// 子协程 2 被取消了
// 子协程 1 异常 -&gt; 未捕获异常，程序崩溃
</code></pre>

<p>因为两个子协程共享同一个父 Job，子协程 1 的异常会传播给父 Job，父 Job 取消自己并取消所有子协程。</p>
<h3>Async：等待时才暴露异常</h3>
<p><code>async</code> 将异常延迟到调用 <code>.await()</code> 时才抛出。这与 <code>Future.get()</code> 的行为类似——异常被存储起来，等待获取结果时才暴露。</p>
<pre><code>fun main() = runBlocking {
    val deferred = async {
        throw RuntimeException(&quot;async 异常&quot;)
    }

    delay(100) // async 已经执行完毕，异常被存储
    println(&quot;这里还能执行&quot;)

    try {
        deferred.await() // 异常在这里抛出
    } catch (e: Exception) {
        println(&quot;在 await() 时捕获: $e&quot;)
    }
}
</code></pre>

<p>这个特性非常关键：<strong>如果 <code>async</code> 的结果被忽略（从不调用 <code>await()</code>），异常也不会被抛出——但协程框架仍然会记录它，并在未处理时触发全局异常处理器。</strong></p>
<pre><code>fun main() = runBlocking {
    val scope = CoroutineScope(Job())

    val deferred = scope.async {
        throw RuntimeException(&quot;被忽略的异常&quot;)
    }

    // 从不调用 deferred.await()
    delay(500)
    // 程序退出时，异常由 CoroutineExceptionHandler 处理
}
</code></pre>

<p>这会导致异常在协程被垃圾回收时由未捕获异常处理器处理，通常意味着程序崩溃。</p>
<h3>核心对比</h3>
<table>
<thead>
<tr>
<th>特性</th>
<th>launch</th>
<th>async</th>
</tr>
</thead>
<tbody>
<tr>
<td>异常传播时机</td>
<td>立即传播</td>
<td>await() 调用时传播</td>
</tr>
<tr>
<td>向上传播</td>
<td>立即传递给父协程</td>
<td>等待 await()</td>
</tr>
<tr>
<td>try-catch 位置</td>
<td>协程体内部</td>
<td>包裹 await()</td>
</tr>
<tr>
<td>未处理后果</td>
<td>全局异常处理器</td>
<td>全局异常处理器（仅在 await 被调用时）</td>
</tr>
</tbody>
</table>
<h2>结构化并发下的异常传播</h2>
<p>结构化并发是协程的核心设计原则：子协程中的异常会取消父协程，并级联取消所有兄弟协程。</p>
<h3>默认行为：异常会向上取消整个作用域</h3>
<pre><code>fun main() = runBlocking {
    val job = launch {
        launch {
            delay(100)
            throw RuntimeException(&quot;子协程 A 异常&quot;)
        }

        launch {
            delay(200)
            println(&quot;子协程 B 完成&quot;)
        }
    }

    job.join()
    println(&quot;父协程完成&quot;)
}
// 输出：
// 子协程 A 异常 -&gt; 子协程 B 被取消
// 父协程被取消
</code></pre>

<p>这个模型保证了：<strong>任何一个子协程失败，整个作用域内的所有协程都停止工作。</strong> 这在很多场景下是合理的——如果一个子任务失败了，整体结果也就无意义了。</p>
<h3>捕获父协程的异常</h3>
<p>既然异常会传播到父协程，我们可以通过捕获父协程的异常来统一处理：</p>
<pre><code>fun main() = runBlocking {
    val job = launch {
        try {
            launch {
                delay(100)
                throw RuntimeException(&quot;子协程异常&quot;)
            }
        } catch (e: Exception) {
            // 这能捕获到吗？
            println(&quot;在父协程中捕获: $e&quot;)
        }
    }
}
</code></pre>

<p><strong>不能。</strong> 因为 <code>try-catch</code> 包裹的是 <code>launch</code> 调用本身（也是非阻塞的），而不是子协程的执行。</p>
<p>正确的方式是在父协程体中使用 <code>try-catch</code> 包裹子协程的调用：</p>
<pre><code>fun main() = runBlocking {
    launch {
        launch {
            try {
                delay(100)
                throw RuntimeException(&quot;子协程异常&quot;)
            } catch (e: Exception) {
                println(&quot;在子协程中捕获: $e&quot;)
            }
        }
    }
}
</code></pre>

<p>或者，使用 <code>SupervisorJob</code> 阻止异常向上传播。</p>
<h2>SupervisorJob：隔离异常传播</h2>
<p><code>SupervisorJob</code> 是解决子协程异常影响兄弟协程的关键工具。</p>
<h3>基本用法</h3>
<pre><code>fun main() = runBlocking {
    val scope = CoroutineScope(SupervisorJob())

    scope.launch {
        delay(100)
        throw RuntimeException(&quot;子协程 1 异常&quot;)
    }

    scope.launch {
        delay(200)
        println(&quot;子协程 2 完成&quot;)
    }

    delay(500)
    println(&quot;作用域完成&quot;)
}
// 输出：
// Exception in thread &quot;...&quot; RuntimeException: 子协程 1 异常
// 子协程 2 完成
// 作用域完成
</code></pre>

<p>可以看到，子协程 1 的异常没有影响子协程 2 的执行，也没有取消作用域。</p>
<h3>SupervisorJob 的工作原理</h3>
<p>普通 <code>Job</code> 和 <code>SupervisorJob</code> 的区别在于如何处理子协程的异常：</p>
<pre><code>// Job 的行为：子协程异常 -&gt; 通知父 Job -&gt; 父 Job 取消所有子协程
// fun Job(): Job = JobImpl(true) // true 表示会处理子协程异常

// SupervisorJob 的行为：子协程异常 -&gt; 忽略，不通知父 Job
// fun SupervisorJob(): Job = JobImpl(false) // false 表示不处理子协程异常
</code></pre>

<p>关键区别就在 <code>JobImpl</code> 的 <code>handleChildCompletion</code> 参数。普通 Job 在子协程失败时调用 <code>childCancelled()</code> 方法，而 <code>SupervisorJob</code> 不调用。</p>
<h3>supervisorScope</h3>
<p><code>supervisorScope</code> 提供了在现有作用域内容器化使用 SupervisorJob 的能力：</p>
<pre><code>fun main() = runBlocking {
    supervisorScope {
        launch {
            delay(100)
            throw RuntimeException(&quot;子协程异常&quot;)
        }

        launch {
            delay(200)
            println(&quot;兄弟协程正常运行&quot;)
        }
    }
    println(&quot;supervisorScope 结束&quot;)
}
// 输出：
// 兄弟协程正常运行
// supervisorScope 结束
</code></pre>

<p><code>supervisorScope</code> 的典型用途：多个不相关的并发任务，其中一个失败不应该影响其他的。</p>
<h3>实际场景：批量网络请求</h3>
<pre><code>suspend fun fetchUserData(userIds: List&lt;String&gt;): List&lt;UserData?&gt; {
    return supervisorScope {
        userIds.map { userId -&gt;
            async {
                try {
                    api.fetchUser(userId)
                } catch (e: Exception) {
                    Log.e(&quot;TAG&quot;, &quot;获取用户 $userId 失败&quot;, e)
                    null // 单个失败不影响其他的
                }
            }
        }.awaitAll()
    }
}
</code></pre>

<p>这里使用 <code>supervisorScope</code> 确保某个用户的数据请求失败不会取消其他请求。</p>
<h2>CoroutineExceptionHandler</h2>
<p><code>CoroutineExceptionHandler</code> 是协程的全局异常处理器，用于处理未捕获的异常。</p>
<h3>基本用法</h3>
<pre><code>val handler = CoroutineExceptionHandler { _, exception -&gt;
    println(&quot;全局异常处理器捕获: $exception&quot;)
}

fun main() = runBlocking {
    val scope = CoroutineScope(Job() + handler)

    scope.launch {
        throw RuntimeException(&quot;未捕获异常&quot;)
    }

    delay(500)
}
// 输出：
// 全局异常处理器捕获: RuntimeException: 未捕获异常
</code></pre>

<h3>处理器的生效条件</h3>
<p><code>CoroutineExceptionHandler</code> 只在以下情况下生效：</p>
<ol>
<li>异常是<strong>未捕获</strong>的（没有被 <code>try-catch</code> 捕获）</li>
<li>协程是 <code>launch</code> 启动的（<code>async</code> 的异常由 <code>await()</code> 抛出）</li>
<li>异常传播到了顶级协程（没有父协程可以传递）</li>
</ol>
<pre><code>fun main() = runBlocking {
    val handler = CoroutineExceptionHandler { _, exception -&gt;
        println(&quot;处理器被调用: $exception&quot;)
    }

    launch(handler) {
        launch {
            throw RuntimeException(&quot;子协程异常&quot;)
        }
    }
}
// 输出：（不会打印处理器消息）
// 子协程异常传播到了父 launch，但父 launch 有父协程（runBlocking）
// 异常最终由 runBlocking 处理
</code></pre>

<p>只有在顶级协程（直接由 <code>CoroutineScope</code> 创建的协程）中的异常才会由 <code>CoroutineExceptionHandler</code> 处理：</p>
<pre><code>fun main() {
    val handler = CoroutineExceptionHandler { _, exception -&gt;
        println(&quot;处理器被调用: $exception&quot;)
    }

    val scope = CoroutineScope(Job() + handler)

    scope.launch {
        launch {
            throw RuntimeException(&quot;子协程异常&quot;)
        }
    }

    Thread.sleep(500)
}
// 输出：
// 处理器被调用: RuntimeException: 子协程异常
// 因为 scope.launch 是顶级协程，异常会传播到这里，由 handler 处理
</code></pre>

<h3>Handler 与 SupervisorJob 搭配使用</h3>
<p>当 <code>SupervisorJob</code> 阻止了异常向上传播时，<code>CoroutineExceptionHandler</code> 也帮不上忙了：</p>
<pre><code>fun main() {
    val handler = CoroutineExceptionHandler { _, exception -&gt;
        println(&quot;处理器: $exception&quot;)
    }

    val scope = CoroutineScope(SupervisorJob() + handler)

    scope.launch {
        throw RuntimeException(&quot;异常&quot;)
    }

    Thread.sleep(500)
}
// 输出：
// 处理器: RuntimeException: 异常
// ✅ SupervisorJob 没有取消父协程，异常由子协程的 handler 处理
</code></pre>

<h3>设置全局默认处理器</h3>
<p>可以通过设置 JVM 级全局处理器来兜底：</p>
<pre><code>// 全局未捕获异常处理器
Thread.setDefaultUncaughtExceptionHandler { thread, exception -&gt;
    Log.e(&quot;APP&quot;, &quot;全局未捕获异常: $exception&quot;, exception)
}

// 协程框架也会使用这个处理器
</code></pre>

<p>或者在 Android 中设置 <code>CoroutineExceptionHandler</code> 作为全局默认处理器（较新版本的 Kotlin 协程支持）：</p>
<pre><code>// 在 Application 类中设置
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()

        // Kotlin 协程提供的全局异常处理器
        CoroutineExceptionHandler { _, throwable -&gt;
            Log.e(&quot;APP&quot;, &quot;未处理的协程异常&quot;, throwable)
            // 上报到 Crash 统计
        }
    }
}
</code></pre>

<h2>Async 的异常处理：应该在哪里 try-catch</h2>
<p><code>async</code> 的异常处理有两种方式，效果不同。</p>
<h3>在 async 内部捕获</h3>
<pre><code>fun main() = runBlocking {
    val deferred = async {
        try {
            riskyOperation()
        } catch (e: Exception) {
            null // 返回默认值
        }
    }

    val result = deferred.await() // 不会抛出异常
}
</code></pre>

<h3>在 await() 时捕获</h3>
<pre><code>fun main() = runBlocking {
    val deferred = async {
        riskyOperation() // 异常存储在这里
    }

    try {
        val result = deferred.await() // 异常在这里抛出
    } catch (e: Exception) {
        println(&quot;捕获 async 异常: $e&quot;)
        // 降级处理
    }
}
</code></pre>

<h3>推荐的 Async 异常处理模式</h3>
<pre><code>sealed class AsyncResult&lt;out T&gt; {
    data class Success&lt;T&gt;(val data: T) : AsyncResult&lt;T&gt;()
    data class Error(val exception: Throwable) : AsyncResult&lt;Nothing&gt;()
}

suspend fun &lt;T&gt; CoroutineScope.safeAsync(
    block: suspend CoroutineScope.() -&gt; T
): AsyncResult&lt;T&gt; {
    return try {
        AsyncResult.Success(async { block() }.await())
    } catch (e: Exception) {
        AsyncResult.Error(e)
    }
}

// 使用
fun main() = runBlocking {
    val result = safeAsync {
        fetchUserData()
    }

    when (result) {
        is AsyncResult.Success -&gt; showData(result.data)
        is AsyncResult.Error -&gt; showError(result.exception)
    }
}
</code></pre>

<h2>取消引发的 CancellationException</h2>
<p><code>CancellationException</code> 是协程框架中的一个特殊异常，它的处理方式和普通异常不同。</p>
<h3>特殊性</h3>
<pre><code>fun main() = runBlocking {
    val job = launch {
        try {
            delay(1000)
        } finally {
            // 即使协程被取消，finally 块也会执行
            println(&quot;清理资源&quot;)
        }
    }

    delay(100)
    job.cancel()
    job.join()
}
</code></pre>

<h3>在 finally 块中调用挂起函数</h3>
<p>当协程被取消后，在 <code>finally</code> 块中调用挂起函数需要特殊处理：</p>
<pre><code>fun main() = runBlocking {
    val job = launch {
        try {
            delay(1000)
        } finally {
            // ❌ 协程已取消，这里调用挂起函数会再次抛出 CancellationException
            delay(100) // 这里会抛出 CancellationException
            println(&quot;清理完成&quot;)
        }
    }

    delay(100)
    job.cancel()
    job.join()
}
</code></pre>

<p>正确的做法是使用 <code>withContext(NonCancellable)</code>：</p>
<pre><code>fun main() = runBlocking {
    val job = launch {
        try {
            delay(1000)
        } finally {
            // ✅ 使用 NonCancellable 上下文执行挂起函数
            withContext(NonCancellable) {
                delay(100)
                println(&quot;资源清理完成&quot;)
            }
        }
    }

    delay(100)
    job.cancel()
    job.join()
}
</code></pre>

<h3>CancellationException 不会被传播</h3>
<pre><code>fun main() = runBlocking {
    val handler = CoroutineExceptionHandler { _, exception -&gt;
        println(&quot;处理器不会收到 CancellationException: $exception&quot;)
    }

    val scope = CoroutineScope(Job() + handler)

    val job = scope.launch {
        launch {
            delay(1000)
        }
        launch {
            delay(500)
        }
    }

    delay(100)
    job.cancel() // 取消会传递 CancellationException，但不会被异常处理器捕获
    job.join()
}
</code></pre>

<p><code>CancellationException</code> 不会被任何异常处理器捕获，也不会导致程序崩溃。</p>
<h2>异常聚合</h2>
<p>当一个父协程有多个子协程同时失败时，异常会被聚合到一个 <code>CancellationException</code> 中。</p>
<pre><code>fun main() = runBlocking {
    val handler = CoroutineExceptionHandler { _, exception -&gt;
        println(&quot;聚合异常: $exception&quot;)
        exception.suppressed.forEach {
            println(&quot;  包含: $it&quot;)
        }
    }

    val scope = CoroutineScope(Job() + handler)

    val job = scope.launch {
        launch {
            try {
                delay(Long.MAX_VALUE)
            } finally {
                throw RuntimeException(&quot;清理异常 1&quot;)
            }
        }
        launch {
            try {
                delay(Long.MAX_VALUE)
            } finally {
                throw RuntimeException(&quot;清理异常 2&quot;)
            }
        }
    }

    delay(100)
    job.cancelAndJoin()
}
// 输出：
// 聚合异常: kotlinx.coroutines.JobCancellationException: Job was cancelled
//   包含: RuntimeException: 清理异常 1
//   包含: RuntimeException: 清理异常 2
</code></pre>

<p>异常聚合通过 Kotlin 的 <code>Throwable.addSuppressed()</code> 机制实现，可以用 <code>exception.suppressed</code> 访问所有被抑制的异常。</p>
<h2>Android 中的协程异常处理最佳实践</h2>
<p>在 Android 开发中，协程异常处理需要特别注意 UI 层和业务层的分离。</p>
<h3>ViewModel 中的异常处理</h3>
<pre><code>class UserViewModel(
    private val userRepository: UserRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow&lt;UiState&lt;List&lt;User&gt;&gt;&gt;(UiState.Loading)
    val uiState: StateFlow&lt;UiState&lt;List&lt;User&gt;&gt;&gt; = _uiState.asStateFlow()

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            try {
                val users = userRepository.fetchUsers()
                _uiState.value = UiState.Success(users)
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e.message ?: &quot;未知错误&quot;)
                Log.e(&quot;UserViewModel&quot;, &quot;加载用户失败&quot;, e)
            }
        }
    }
}

sealed class UiState&lt;out T&gt; {
    object Loading : UiState&lt;Nothing&gt;()
    data class Success&lt;T&gt;(val data: T) : UiState&lt;T&gt;()
    data class Error(val message: String) : UiState&lt;Nothing&gt;()
}
</code></pre>

<h3>Repository 层的异常处理</h3>
<pre><code>class UserRepository(
    private val api: UserApi,
    private val cache: UserCache
) {
    suspend fun fetchUsers(): List&lt;User&gt; = withContext(Dispatchers.IO) {
        try {
            val response = api.getUsers()
            cache.saveUsers(response)
            response
        } catch (e: IOException) {
            // 网络错误，尝试从缓存读取
            val cached = cache.getUsers()
            if (cached.isNotEmpty()) {
                cached
            } else {
                throw e // 缓存也没有，继续抛出
            }
        } catch (e: HttpException) {
            // HTTP 错误，返回缓存的过期数据（如果存在）
            cache.getUsers().also { users -&gt;
                if (users.isEmpty()) {
                    throw e
                }
            }
        }
    }
}
</code></pre>

<h3>使用 Result 类型</h3>
<p>Kotlin 标准库提供了 <code>Result</code> 类型，适合在 Repository 层包装可能失败的操作：</p>
<pre><code>class UserRepository(private val api: UserApi) {

    suspend fun fetchUsers(): Result&lt;List&lt;User&gt;&gt; = runCatching {
        api.getUsers()
    }

    suspend fun fetchUser(id: String): Result&lt;User&gt; = runCatching {
        api.getUser(id)
    }
}

// ViewModel 中使用
class UserViewModel(
    private val repository: UserRepository
) : ViewModel() {

    fun loadUsers() {
        viewModelScope.launch {
            repository.fetchUsers()
                .onSuccess { users -&gt;
                    _uiState.value = UiState.Success(users)
                }
                .onFailure { exception -&gt;
                    _uiState.value = UiState.Error(exception.message ?: &quot;加载失败&quot;)
                }
        }
    }
}
</code></pre>

<h3>Flow 中的异常处理</h3>
<pre><code>class UserRepository(private val api: UserApi) {

    fun usersFlow(): Flow&lt;List&lt;User&gt;&gt; = flow {
        while (true) {
            val users = api.getUsers()
            emit(users)
            delay(30_000) // 每 30 秒轮询
        }
    }.retry(3) { cause -&gt;
        // 网络错误时重试，最多 3 次
        cause is IOException
    }.catch { exception -&gt;
        // 所有重试都失败后，发射空列表
        emit(emptyList())
        Log.e(&quot;UserRepository&quot;, &quot;获取用户列表失败&quot;, exception)
    }
}
</code></pre>

<h2>常见陷阱与最佳实践</h2>
<h3>陷阱 1：错误的 try-catch 位置</h3>
<pre><code>// ❌ 错误：try-catch 包裹的是 launch，不是协程体
try {
    launch { throw Exception() }
} catch (e: Exception) {
    // 永远不会执行
}

// ✅ 正确：try-catch 在协程体内部
launch {
    try {
        throw Exception()
    } catch (e: Exception) {
        // 在这里处理
    }
}
</code></pre>

<h3>陷阱 2：忽略 async 的异常</h3>
<pre><code>// ❌ 错误：async 的异常被忽略
scope.async {
    throw RuntimeException(&quot;异常&quot;)
}

// ✅ 正确：必须 await()
scope.async {
    throw RuntimeException(&quot;异常&quot;)
}.let { deferred -&gt;
    try {
        deferred.await()
    } catch (e: Exception) {
        // 处理异常
    }
}

// ✅ 或者如果不需要结果，使用 launch 代替 async
scope.launch {
    throw RuntimeException(&quot;异常&quot;)
}
</code></pre>

<h3>陷阱 3：在 CancellationException 中调用挂起函数</h3>
<pre><code>// ❌ 错误：在 finally 块中调用挂起函数
job = launch {
    try {
        delay(1000)
    } finally {
        delay(100) // 协程取消后，这里抛出 CancellationException
        cleanup()
    }
}

// ✅ 正确：使用 withContext(NonCancellable)
job = launch {
    try {
        delay(1000)
    } finally {
        withContext(NonCancellable) {
            delay(100)
            cleanup()
        }
    }
}
</code></pre>

<h3>陷阱 4：在 CoroutineScope 中使用 try-catch 捕获子协程异常</h3>
<pre><code>// ❌ 错误：try-catch 不能跨协程边界
scope.launch {
    try {
        launch { throw Exception() }  // 异常发生在这里
    } catch (e: Exception) {
        // 捕获不到
    }
}

// ✅ 正确：在子协程内部捕获
scope.launch {
    launch {
        try {
            throw Exception()
        } catch (e: Exception) {
            // 在这里处理
        }
    }
}
</code></pre>

<h3>陷阱 5：ViewModelScope 中使用 async 不 await</h3>
<p>在 Android 的 ViewModel 中，<code>viewModelScope</code> 使用 <code>SupervisorJob</code>，这意味着子协程的异常不会相互影响。但如果你使用 <code>async</code> 而不 <code>await()</code>：</p>
<pre><code>class MyViewModel : ViewModel() {
    fun load() {
        viewModelScope.async { // ❌ 不 await 的 async
            throw RuntimeException(&quot;异常&quot;)
        }
        // 异常不会崩溃，但会丢失
    }
}
</code></pre>

<p>虽然不会崩溃，但异常信息会丢失。要么使用 <code>launch</code>，要么确保 <code>await()</code>。</p>
<h2>实战：构建健壮的协程异常处理框架</h2>
<h3>统一错误处理基类</h3>
<pre><code>abstract class BaseRepository {

    protected suspend fun &lt;T&gt; safeApiCall(
        call: suspend () -&gt; T,
        errorMessage: String = &quot;请求失败&quot;
    ): Result&lt;T&gt; = runCatching {
        call()
    }.recover { exception -&gt;
        val wrappedException = when (exception) {
            is IOException -&gt; NetworkException(errorMessage, exception)
            is HttpException -&gt; HttpException(exception.code(), errorMessage)
            else -&gt; UnknownException(errorMessage, exception)
        }
        throw wrappedException
    }

    protected suspend fun &lt;T&gt; safeDbCall(
        call: suspend () -&gt; T
    ): Result&lt;T&gt; = runCatching {
        call()
    }.recover { exception -&gt;
        throw DatabaseException(&quot;数据库操作失败&quot;, exception)
    }
}
</code></pre>

<h3>全局异常监控</h3>
<pre><code>// 在 Application 中初始化
class MyApplication : Application() {

    lateinit var coroutineExceptionHandler: CoroutineExceptionHandler
        private set

    override fun onCreate() {
        super.onCreate()

        coroutineExceptionHandler = CoroutineExceptionHandler { _, throwable -&gt;
            when (throwable) {
                is NetworkException -&gt; {
                    Log.w(&quot;APP&quot;, &quot;网络异常: ${throwable.message}&quot;)
                }
                is CancellationException -&gt; {
                    // 忽略正常取消
                }
                else -&gt; {
                    Log.e(&quot;APP&quot;, &quot;未处理的协程异常&quot;, throwable)
                    // 上报到 Crashlytics 等分析平台
                    Crashlytics.logException(throwable)
                }
            }
        }

        // 设置全局默认处理器
        Thread.setDefaultUncaughtExceptionHandler { thread, exception -&gt;
            Log.e(&quot;APP&quot;, &quot;全局未捕获异常&quot;, exception)
            Crashlytics.logException(exception)
        }
    }
}
</code></pre>

<h3>完整的 ViewModel 异常处理模板</h3>
<pre><code>abstract class BaseViewModel : ViewModel() {

    protected fun &lt;T&gt; launchCatching(
        block: suspend CoroutineScope.() -&gt; T,
        onError: ((Throwable) -&gt; Unit)? = null
    ): Job {
        return viewModelScope.launch {
            try {
                block()
            } catch (e: CancellationException) {
                // 正常取消，不处理
                throw e
            } catch (e: Exception) {
                Log.e(TAG, &quot;协程执行异常&quot;, e)
                onError?.invoke(e) ?: handleDefaultError(e)
            }
        }
    }

    private fun handleDefaultError(exception: Exception) {
        val message = when (exception) {
            is NetworkException -&gt; &quot;网络连接失败，请检查网络&quot;
            is TimeoutException -&gt; &quot;请求超时，请稍后重试&quot;
            else -&gt; &quot;操作失败: ${exception.message}&quot;
        }
        // 通过 SharedFlow 发送给 UI 层
        _errorEvent.emit(ErrorEvent(message))
    }

    private val _errorEvent = MutableSharedFlow&lt;ErrorEvent&gt;()
    val errorEvent: SharedFlow&lt;ErrorEvent&gt; = _errorEvent.asSharedFlow()

    data class ErrorEvent(val message: String)
}

// 使用
class ProfileViewModel : BaseViewModel() {

    fun loadProfile(userId: String) {
        launchCatching(
            block = {
                val profile = repository.getProfile(userId)
                _profile.value = profile
            },
            onError = { exception -&gt;
                // 自定义错误处理
                _profile.value = Profile.default()
            }
        )
    }
}
</code></pre>

<h2>总结</h2>
<p>Kotlin Coroutine 的异常处理需要理解三个核心概念：</p>
<ol>
<li><strong>传播机制</strong>：<code>launch</code> 立即传播异常，<code>async</code> 延迟到 <code>await()</code> 时传播</li>
<li><strong>结构化并发</strong>：默认子协程异常会取消父协程和兄弟协程，<code>SupervisorJob</code> 可以隔离异常</li>
<li><strong>异常处理工具</strong>：<code>try-catch</code> 处理'局部'异常，<code>CoroutineExceptionHandler</code> 处理'全局'未捕获异常</li>
</ol>
<p>关键原则：
- 尽量在协程体内部捕获异常，而不是外部
- 兄弟任务互不依赖时使用 <code>supervisorScope</code>
- <code>async</code> 必须搭配 <code>await()</code> 否则异常丢失
- <code>CancellationException</code> 只应在 <code>finally</code> 块中特殊处理
- 在 Android 中使用 <code>viewModelScope</code> + <code>launch</code> + <code>try-catch</code> 处理 UI 层异常</p>
<p>掌握这些机制，你就能写出健壮、可维护的协程代码，再也不会被协程的异常处理问题困扰。</p>
