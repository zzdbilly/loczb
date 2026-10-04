---
title: "Jetpack Compose Navigation 进阶指南：从路由设计到深层链接"
description: "Jetpack Compose Navigation 进阶指南 - 路由设计、参数传递、深层链接、类型安全导航、动画过渡等实战技巧"
date: 2026-06-22 14:24:10
category: Android
tags: ["Jetpack Compose", "Android", "Navigation", "Kotlin", "DeepLink"]
read_time: 16
slug: compose-navigation-guide
---

<p>Navigation Compose 是 Jetpack Compose 的官方导航解决方案。从 2.8 版本开始引入了类型安全导航 (Type-Safe Navigation)，彻底改变了传统字符串路由的写法。本文从项目实战的角度，系统讲解 Compose Navigation 的核心概念和进阶用法。</p>

      <div class="info-box">
        <strong>📌 前置要求</strong>：本文假设你熟悉 Jetpack Compose 基础，会使用基本的 NavHost 和 composable() 注册。版本基于 Navigation 2.8+（Compose BOM 2026.04.01+）。
      </div>

      <h2>一、路由设计：项目级方案</h2>

      <p>导航方案的设计直接影响项目的可维护性。Str ine 拼接路由的方式在项目变大后难以管理。推荐使用 <strong>密封类 + 导航图对象</strong> 组织路由。</p>

      <h3>1.1 类型安全路由 (Navigation 2.8+)</h3>

      <p>Navigation 2.8 引入了基于 Kotlin Serialization 的类型安全导航，告别字符串路由的脆弱性。</p>

      <pre><code>// 定义路由
@Serializable
sealed class Screen {
    // 无参数路由
    @Serializable data object Home : Screen()
    @Serializable data object Settings : Screen()
    
    // 带参数路由
    @Serializable data class Article(val id: String) : Screen()
    @Serializable data class Profile(val userId: String, val tab: String = "posts") : Screen()
}

// NavHost 注册
@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    NavHost(
        navController = navController,
        startDestination = Screen.Home
    ) {
        composable&lt;Screen.Home&gt; { HomeScreen(navController) }
        composable&lt;Screen.Settings&gt; { SettingsScreen(navController) }
        composable&lt;Screen.Article&gt; { backStackEntry -&gt;
            val article: Screen.Article = backStackEntry.toRoute()
            ArticleScreen(articleId = article.id)
        }
        composable&lt;Screen.Profile&gt; { backStackEntry -&gt;
            val profile: Screen.Profile = backStackEntry.toRoute()
            ProfileScreen(userId = profile.userId, tab = profile.tab)
        }
    }
}

// 导航调用 - 编译期安全
navController.navigate(Screen.Article(id = "article_123"))
navController.navigate(Screen.Profile(userId = "user_456", tab = "repos"))</code></pre>

      <div class="tip-box">
        <strong>💡 为什么更好</strong>：编译时检查路由是否存在、参数类型是否正确，重构时 IDE 可以自动追踪所有引用，再也不用担心「拼串拼错导致运行时崩溃」。
      </div>

      <h3>1.2 多模块路由方案</h3>

      <p>在大型项目中，多模块架构下如何组织导航是常见挑战。推荐使用<strong>导航图接口</strong>解耦：</p>

      <pre><code>// feature-home 模块
interface HomeNavigation {
    fun navigateToSettings()
    fun navigateToArticle(articleId: String)
}

// app 模块 - 统一实现
class AppHomeNavigation(private val navController: NavController) : HomeNavigation {
    override fun navigateToSettings() {
        navController.navigate(Screen.Settings)
    }
    override fun navigateToArticle(articleId: String) {
        navController.navigate(Screen.Article(id = articleId))
    }
}

// feature-home 中使用
@Composable
fun HomeScreen(navigation: HomeNavigation) {
    Column {
        Button(onClick = { navigation.navigateToSettings() }) {
            Text("设置")
        }
    }
}</code></pre>

      <p>这样 feature 模块完全不依赖其他模块的具体路由，只依赖接口。导航的依赖方向始终指向 app 模块。</p>

      <h2>二、参数传递：不仅仅是基本类型</h2>

      <h3>2.1 支持的参数类型</h3>

      <p>类型安全导航支持以下参数类型：</p>

      <table>
        <thead>
          <tr>
            <th>类型</th>
            <th>说明</th>
            <th>默认值支持</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>String</td>
            <td>字符串</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Int</td>
            <td>整型</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Long</td>
            <td>长整型</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Boolean</td>
            <td>布尔值</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Float</td>
            <td>浮点数</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Double</td>
            <td>双精度浮点数</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Parcelable / Serializable</td>
            <td>使用 @Parcelize 注解</td>
            <td>❌</td>
          </tr>
        </tbody>
      </table>

      <div class="warning-box">
        <strong>⚠️ 不要传递大对象</strong>：导航参数序列化后存储在 Bundle 中，有 1MB 的大小限制。传大对象请使用共享 ViewModel 或数据仓库。
      </div>

      <h3>2.2 传递复杂数据</h3>

      <p>当需要传递的数据超出基本类型时，<strong>推荐传递 ID 而不是数据本身</strong>：</p>

      <pre><code>// ❌ 错误做法：直接传递大对象
@Serializable data class ArticleScreen(val article: Article) // 太大！

// ✅ 正确做法：只传 ID，目标页面自己加载
@Serializable data class ArticleScreen(val articleId: String)

// 目标页面
@Composable
fun ArticleView(articleId: String) {
    val article by viewModel.articleById(articleId).collectAsStateWithLifecycle()
    // ...
}</code></pre>

      <h2>三、深层链接 (DeepLink)：外部跳转</h2>

      <p>DeepLink 是从外部（通知、网页、其他 App）跳转到 App 指定页面的机制。</p>

      <h3>3.1 配置 DeepLink</h3>

      <pre><code>@Composable
fun AppNavHost() {
    NavHost(navController = navController, startDestination = Screen.Home) {
        composable&lt;Screen.Article&gt;(
            deepLinks = listOf(
                navDeepLink {
                    uriPattern = "https://example.com/article/{id}"
                    action = Intent.ACTION_VIEW
                }
            )
        ) { backStackEntry -&gt;
            val article: Screen.Article = backStackEntry.toRoute()
            ArticleScreen(article.id)
        }
    }
}</code></pre>

      <p>对应的 AndroidManifest.xml 配置：</p>

      <pre><code>&lt;activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"&gt;
    
    &lt;!-- DeepLink Activity 配置 --&gt;
    &lt;intent-filter android:autoVerify="true"&gt;
        &lt;action android:name="android.intent.action.VIEW" /&gt;
        &lt;category android:name="android.intent.category.DEFAULT" /&gt;
        &lt;category android:name="android.intent.category.BROWSABLE" /&gt;
        &lt;data
            android:scheme="https"
            android:host="example.com"
            android:pathPrefix="/article" /&gt;
    &lt;/intent-filter&gt;
&lt;/activity&gt;</code></pre>

      <h3>3.2 通知跳转 DeepLink</h3>

      <pre><code>// 创建 PendingIntent
fun createDeepLinkIntent(context: Context, articleId: String): PendingIntent {
    val deepLink = "https://example.com/article/$articleId"
    val intent = Intent(Intent.ACTION_VIEW, deepLink.toUri())
    return TaskStackBuilder.create(context).run {
        addNextIntentWithParentStack(intent)
        getPendingIntent(0, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
}</code></pre>

      <h2>四、导航动画</h2>

      <p>Navigation Compose 2.8 强化了动画支持，可以在导航时自定义进出动画。</p>

      <pre><code>composable&lt;Screen.Article&gt;(
    enterTransition = {
        slideInHorizontally(
            initialOffsetX = { fullWidth -&gt; fullWidth },
            animationSpec = tween(300, easing = FastOutSlowInEasing)
        ) + fadeIn(animationSpec = tween(300))
    },
    exitTransition = {
        slideOutHorizontally(
            targetOffsetX = { -fullWidth / 3 },
            animationSpec = tween(300)
        ) + fadeOut(animationSpec = tween(300))
    },
    popEnterTransition = {
        slideInHorizontally(
            initialOffsetX = { -fullWidth / 3 },
            animationSpec = tween(300)
        ) + fadeIn(animationSpec = tween(300))
    },
    popExitTransition = {
        slideOutHorizontally(
            targetOffsetX = { fullWidth },
            animationSpec = tween(300)
        ) + fadeOut(animationSpec = tween(300))
    }
)</code></pre>

      <h2>五、常见陷阱与最佳实践</h2>

      <h3>5.1 回到上一页的正确方式</h3>

      <p>使用 <code>navController.popBackStack()</code> 而不是 simulate 返回键。如果配合 DeepLink，使用 <code>navigateUp()</code> 更安全：</p>

      <pre><code>// 安全的返回
fun NavController.safePopBackStack(): Boolean {
    return if (previousBackStackEntry != null) {
        popBackStack()
    } else {
        // 没有上一页时退出 App
        finish()
    }
}

// navigateUp 自动处理 BackStack
fun NavController.safeNavigateUp(): Boolean {
    return navigateUp()
}</code></pre>

      <h3>5.2 避免重复导航</h3>

      <p>用户在快速点击按钮时，可能会触发多次导航，导致同一页面被多次压入栈：</p>

      <pre><code>// 在 NavController 中防止重复导航
fun NavController.navigateOnce(destination: Any) {
    val currentRoute = currentDestination?.route
    val targetRoute = destination.toString() // 简化示意
    if (currentRoute != targetRoute) {
        navigate(destination)
    }
}

// 或者更可靠的方案：基于 NavBackStackEntry ID
fun NavController.navigateSafe(destination: Any) {
    currentBackStackEntry?.lifecycle?.let { lifecycle -&gt;
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) {
            navigate(destination)
        }
    }
}</code></pre>

      <div class="warning-box">
        <strong>⚠️ 注意</strong>：不要在 LaunchedEffect 或 onClick 中直接调用 navigate 而不做防护。推荐使用 Compose 的 <strong>NavigationResultCallback</strong> 管理导航活跃状态。
      </div>

      <h3>5.3 导航结果回调</h3>

      <p>在目标页面操作完成后，将结果回传前一个页面：</p>

      <pre><code>// 当前页面
@Composable
fun EditorScreen(onResult: (String) -&gt; Unit) {
    Button(onClick = {
        // 保存成功后回传结果
        val savedResult = viewModel.save()
        savedResult?.let { onResult(it) }
    }) {
        Text("保存")
    }
}

// NavHost 中注册
composable&lt;Screen.Editor&gt; { backStackEntry -&gt;
    val savedStateHandle = backStackEntry.savedStateHandle
    EditorScreen(
        onResult = { result -&gt;
            savedStateHandle["result"] = result
            navController.previousBackStackEntry?.savedStateHandle?.set("result", result)
            navController.popBackStack()
        }
    )
}

// 返回时读取
composable&lt;Screen.Home&gt; {
    val savedStateHandle = it.savedStateHandle
    val result = savedStateHandle.get&lt;String&gt;("result")
    
    LaunchedEffect(result) {
        result?.let {
            println("Editor returned: $it")
            savedStateHandle.remove&lt;String&gt;("result")
        }
    }
}</code></pre>

      <h2>六、总结</h2>

      <p>Compose Navigation 核心要点：</p>

      <ol>
        <li><strong>类型安全导航</strong>：用 @Serializable 密封类替代字符串路由，编译期保证安全</li>
        <li><strong>多模块解耦</strong>：通过接口定义导航依赖，保持模块间的单向依赖</li>
        <li><strong>DeepLink</strong>：统一处理外部跳转和通知推送，加深用户触达</li>
        <li><strong>动画</strong>：合理的转场动画提升用户体验，但不要过度</li>
        <li><strong>安全防护</strong>：防止重复导航、处理空 BackStack</li>
      </ol>

      <p>Navigation Compose 2.8+ 的类型安全导航是一个里程碑式的更新，强烈建议新项目直接使用。它不仅让代码更安全，也大幅提升了开发体验和工程可维护性。</p>
