# Jetpack Compose 性能优化实战：从卡顿到丝滑的 12 个技巧

## 为什么 Compose 需要性能优化

Jetpack Compose 自 2021 年稳定版发布以来，已成为 Android UI 开发的主流选择。声明式 UI 范式让代码更简洁、状态管理更清晰，但也带来了新的性能挑战。很多团队在从 XML 迁移到 Compose 后，发现列表滑动偶现掉帧、复杂页面初始化慢、动画不够流畅——这些都是声明式框架特有的性能陷阱。

### 声明式 UI 的性能模型

在传统 View 系统中，性能优化聚焦于布局层级扁平化、过度绘制消除、View 复用等经典问题。Compose 的声明式模型完全不同：UI 是状态的函数，框架在状态变化时自动"重组"受影响的 Composable。这个"自动"既是强项也是弱项——框架不知道哪些部分真的需要更新，只能基于智能启发式算法来决定。

理解 Compose 性能的关键在于三个核心概念：

1. **组合（Composition）**：首次执行 Composable 函数构建 UI 树的过程
2. **重组（Recomposition）**：状态变化时重新执行受影响的 Composable
3. **测量与布局（Measure & Layout）**：确定 UI 元素的尺寸和位置

大多数性能问题来源于不必要的重组——框架认为需要更新，但实际上界面的视觉输出没有变化。

### 重组（Recomposition）的开销

来看一个简单的例子：

```kotlin
@Composable
fun UserProfile(user: User) {
    Column {
        Text("姓名：${user.name}")
        Text("邮箱：${user.email}")
        Text("积分：${user.points}")
        // 头像加载昂贵
        AsyncImage(
            model = user.avatarUrl,
            contentDescription = "头像",
            modifier = Modifier.size(48.dp)
        )
    }
}
```

当 `user` 对象引用变化时（比如从网络请求获取的新对象），即使 `name`、`email`、`points` 字段完全相同，整个 `UserProfile` 都会重组——包括重新加载头像。在一次帧内（16ms），如果能完成重组倒也无妨；但如果列表中有 50 个这样的 Composable 同时重组，丢帧几乎是必然的。

### Compose 编译器的优化边界

Compose Compiler 在编译期做了大量优化工作：

- **智能跳过（Smart Skipping）**：比较新旧参数，如果相等则跳过重组
- **位置记忆（Positional Memoization）**：自动为 `remember` 调用分配位置
- **内联与代码生成**：消除不必要的函数调用

但这些优化的前提是：**参数类型是稳定的（Stable）**。如果你的数据模型类型不稳定，编译器无能为力。

### 稳定类型的本质

什么叫"稳定类型"？Compose 编译器在编译时通过静态分析判断：

```kotlin
// Kotlin 基本类型和 String 都是稳定的
val name: String       // 稳定
val count: Int         // 稳定
val enabled: Boolean   // 稳定

// 不可变的数据类也是稳定的
data class User(
    val id: Long,
    val name: String,
    val email: String
) // 所有字段稳定 → User 也稳定

// 但包含了可变集合，就不稳定了
data class UserGroup(
    val users: List<User>  // OK
)

data class UserGroup(     // ❌ 不稳定
    val users: MutableList<User>  // MutableList 不稳定
)
```

### 快照状态系统（Snapshot State）与重组

Compose 的状态管理基于快照系统（Snapshot System），这是理解性能的关键：

```kotlin
val state = mutableStateOf(0)  // 初始快照

// 在一个事务中批量修改
Snapshot.withMutableSnapshot {
    state.value = 1
    state.value = 2
    state.value = 3
}
// 事务提交后只触发一次重组，value = 3
```

快照系统会自动合并同一事务内的多次修改，避免不必要的重组。但如果你在多个协程中分散修改状态，每次修改都会触发独立重组。

## 技巧 1-4：减少不必要的重组

### 1. 使用 remember 和 derivedStateOf

`remember` 是 Compose 中最基本的记忆化机制：

```kotlin
@Composable
fun ExpensiveCalculation(input: Int) {
    val result = remember(input) {
        // 只在 input 变化时重新计算
        performHeavyCalculation(input)
    }
    Text("结果：$result")
}
```

`derivedStateOf` 更进一步——当源状态频繁变化但派生值不变时，它能阻止重组：

```kotlin
@Composable
fun SearchList(query: String, allItems: List<Item>) {
    // 只有当过滤结果真正改变时才触发重组
    val filteredItems by remember {
        derivedStateOf {
            allItems.filter { it.name.contains(query, ignoreCase = true) }
        }
    }
    
    LazyColumn {
        items(filteredItems) { item ->
            SearchResultItem(item)
        }
    }
}
```

这里的关键区别：`query` 每次输入一个字符都会变化，但 `derivedStateOf` 只在过滤结果的列表引用变化时才通知重组。如果新增字符没有改变过滤结果，就不会触发 `LazyColumn` 的重组。

### 2. 稳定类型与 @Stable/@Immutable 注解

Compose Compiler 在编译期通过稳定性推断决定是否跳过重组。一个类型被视为"稳定"需要满足：

- `equals` 的结果对同一实例始终一致
- 当公开属性变化时，Compose 能收到通知（State 类型）
- 所有公开属性本身也是稳定的

看一个典型的不稳定类型：

```kotlin
// ❌ 不稳定：MutableList 可变 + 没有状态通知
data class UserList(
    val users: MutableList<User>  // MutableList 被视为不稳定
)

// ✅ 稳定：不可变列表
data class UserList(
    val users: List<User>  // List 被视为稳定
)
```

当你使用外部库的数据类时，手动添加注解：

```kotlin
@Immutable
data class User(
    val id: Long,
    val name: String,
    val avatarUrl: String
)
```

`@Immutable` 向编译器承诺：该类型的值一旦创建就永不改变。`@Stable` 更灵活——允许值变化，但承诺 Compose 能收到通知。

### 3. 合理使用 key 参数

在列表中使用 `key` 是性能优化的基础：

```kotlin
LazyColumn {
    items(
        items = userList,
        key = { user -> user.id }  // 使用稳定的唯一标识
    ) { user ->
        UserItem(user)
    }
}
```

没有 key 时，Compose 只能用位置（index）来匹配 item。如果列表头部插入一条新数据，所有 item 都会重组。有了 key，Compose 能精确识别哪些 item 发生了变化。

### 4. 避免在 Composable 中直接读取可变状态

一个常见的性能陷阱：

```kotlin
// ❌ 每次 DrawerState 改变都重组整个 Screen
@Composable
fun MainScreen(drawerState: DrawerState) {
    ModalDrawerSheet(
        drawerState = drawerState,
        content = {
            NavigationContent()
        }
    )
}

// ✅ 将状态读取推迟到真正需要的地方
@Composable
fun MainScreen(drawerState: DrawerState) {
    ModalDrawerSheet(
        drawerState = drawerState,
        content = {
            val isOpen by remember { derivedStateOf { drawerState.isOpen } }
            // 现在重组范围缩小了
        }
    )
}
```

原则是：**尽可能在状态使用的最深层读取状态**，而不是在顶层传递整个 State 对象。

## 技巧 5-8：延迟布局优化

### 5. LazyColumn key 与 contentType

`contentType` 允许 Compose 按类型复用 Composition：

```kotlin
LazyColumn {
    items(
        items = feedItems,
        key = { it.id },
        contentType = { it.type }  // "header" / "post" / "ad" / "footer"
    ) { item ->
        when (item.type) {
            "header" -> FeedHeader(item)
            "post" -> FeedPost(item)
            "ad" -> FeedAd(item)
            else -> FeedFooter(item)
        }
    }
}
```

`contentType` 让 Compose 按类别复用 Composition 槽位，避免不同类型之间适配带来的测量开销。

### 6. 避免 0 尺寸的 item

当过滤条件导致某些 item 不需要显示时，不要返回 0 尺寸的空布局：

```kotlin
// ❌ 仍然占用 LazyColumn 的 item 槽位
LazyColumn {
    items(allItems) { item ->
        if (item.isVisible) {
            ItemContent(item)
        } else {
            Box(modifier = Modifier.size(0.dp))  // 浪费
        }
    }
}

// ✅ 在传参前就过滤掉
val visibleItems = remember(allItems) {
    allItems.filter { it.isVisible }
}
LazyColumn {
    items(visibleItems) { item ->
        ItemContent(item)
    }
}
```

### 7. 预取策略与 beyondBoundsItemCount

LazyColumn 默认在可视区域外预加载一些 item，可以通过 `beyondBoundsItemCount` 调节：

```kotlin
LazyColumn {
    items(
        items = largeList,
        key = { it.id }
    ) { item ->
        ComplicatedItem(item)
    }
}

// 增加预取范围，减少滑动时的白屏
// 但也要权衡——每次预取更多 item 意味着更高的内存和重组开销
LazyColumn {
    items(
        items = largeList,
        key = { it.id },
        contentType = { it.type }
    ) { item ->
        ComplicatedItem(item)
    }
}
```

### 8. 使用 LazyLayout 自定义布局

当 LazyColumn/LazyRow 无法满足需求时，可以用 `LazyLayout` 实现完全自定义的惰性布局：

```kotlin
@Composable
fun CustomLazyGrid(
    items: List<GridItem>,
    columns: Int
) {
    LazyLayout(
        modifier = Modifier.fillMaxSize()
    ) {
        items(
            count = items.size,
            key = { items[it].id }
        ) { index ->
            val item = items[index]
            GridCell(
                item = item,
                measurePolicy = rememberGridMeasurePolicy(columns)
            )
        }
    }
}
```

`LazyLayout` 暴露了测量和放置的底层 API，适合瀑布流、交错网格等场景。

## 技巧 9-11：资源与渲染优化

### 9. 图片加载最佳实践

Compose 中图片加载的首选库是 Coil，基于 Kotlin 协程设计，天然适配 Compose：

```kotlin
// ✅ 好的实践
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(url)
        .crossfade(true)
        .size(300, 300)            // 明确请求尺寸，避免解码完整大图
        .memoryCachePolicy(CachePolicy.ENABLED)
        .diskCachePolicy(CachePolicy.ENABLED)
        .build(),
    contentDescription = null,
    contentScale = ContentScale.Crop,
    modifier = Modifier.fillMaxWidth()
)

// ❌ 坏的实践
AsyncImage(
    model = "https://example.com/4000x3000.jpg",  // 原始大图
    contentDescription = null
)
```

关键优化点：

- **明确指定 `size()`**：避免加载原始大图到内存
- **启用 `crossfade()`**：平滑过渡，改善感知性能
- **合理缓存策略**：memoryCachePolicy 减少重复解码，diskCachePolicy 减少网络请求
- **内容缩放**：`ContentScale.Crop` 配合固定尺寸避免额外的布局测量

### 10. Modifier 顺序与布局测量成本

Modifier 链的顺序直接影响性能：

```kotlin
// ❌ 坏的顺序：padding 在前，clip 在后
// 每次重组都重新计算 padding 后的尺寸，然后裁剪
Modifier
    .padding(16.dp)
    .clip(RoundedCornerShape(8.dp))
    .background(Color.Gray)

// ✅ 好的顺序：background → padding → clip
// background 在 padding 之前，减少测量开销
Modifier
    .background(Color.Gray)
    .padding(16.dp)
    .clip(RoundedCornerShape(8.dp))
```

通用规则：

1. `size` / `fillMaxSize` 最外层
2. `background` 在 `padding` 之前
3. `clip` / `shadow` 在末尾
4. `clickable` 等交互 Modifier 放在合适位置以控制点击区域

### 11. 使用 GraphicsLayer 做属性动画

对于 alpha、scale、rotation、translation 等属性动画，使用 `graphicsLayer` 而不是重组：

```kotlin
// ❌ 通过重组改变 alpha（每次值变化都重组整个内容）
var alpha by remember { mutableFloatStateOf(0f) }
LaunchedEffect(Unit) {
    animate(0f, 1f, animationSpec = tween(1000)) { value, _ ->
        alpha = value  // 触发重组
    }
}
Box(modifier = Modifier.alpha(alpha)) {
    HeavyContent()  // 每次 alpha 改变都重组
}

// ✅ 通过 GraphicsLayer 改变 alpha（不重组）
val alpha = remember { Animatable(0f) }
LaunchedEffect(Unit) {
    alpha.animateTo(1f, animationSpec = tween(1000))
}
Box(
    modifier = Modifier.graphicsLayer {
        alpha = this@...  // 在渲染层处理，不触发重组
    }
) {
    HeavyContent()  // 只组合一次
}
```

`graphicsLayer` 是渲染层的变换，不经过测量/布局/重组流程，性能极高。

## 技巧 12：编译期优化

### Baseline Profile 与 R8 配置

Baseline Profile 能让 ART 在安装时就预编译关键代码路径，避免 JIT 编译带来的启动延迟和运行时性能开销：

```kotlin
// baselines-prof.txt
HSPLandroidx/compose/runtime/ComposerImpl;->startRestartGroup
HSPLandroidx/compose/runtime/RecomposeScopeImpl;->invalidate
HSPLandroidx/compose/foundation/lazy/LazyListState$scrollPosition$1
```

配合 R8 优化：

```kotlin
# proguard-rules.pro
# 保留 Compose 运行时必要的类
-keep class androidx.compose.runtime.** { *; }
-dontwarn androidx.compose.**

# 启用 Compose 特定的 R8 优化
-optimizations *otheroptimizations*,class/merging/*
```

### Compose Compiler Metrics 分析

启用 Compose Compiler Metrics 生成可跳过的 Composable 报告：

```gradle
// app/build.gradle.kts
composeCompiler {
    reportsDestination = layout.buildDirectory.dir("compose_compiler")
    metricsDestination = layout.buildDirectory.dir("compose_compiler")
}

kotlinOptions {
    freeCompilerArgs += listOf(
        "-P",
        "plugin:androidx.compose.compiler.plugins.kotlin:reportsDestination=" +
                layout.buildDirectory.dir("compose_compiler").get().asFile.absolutePath
    )
}
```

生成的报告中可以查看每个 Composable 的稳定性状态，找出哪些函数因为不稳定参数而无法跳过重组。

### Compose Compiler 1.5.0+ 的新优化

Compose Compiler 从 Kotlin 2.0 起合并为 Kotlin 编译器插件，带来了新的优化：

```kotlin
// 强跳过模式（Strong Skipping Mode）默认启用
// 现在连"参数没变但内部 State 变了"的场景也能跳过

@Composable
fun Counter(name: String) {
    var count by remember { mutableIntStateOf(0) }
    Text("$name: $count")
    Button(onClick = { count++ }) {
        Text("+1")
    }
    // 在强跳过模式下，name 不变时点击按钮不会引起上层重组
}
```

## 性能测量与调试工具

### Compose Layout Inspector

Android Studio 的 Layout Inspector 专门为 Compose 做了适配：

1. **重组计数**：每个 Composable 上显示重组次数，一眼找到频繁重组的热点
2. **跳过统计**：显示被跳过的重组次数
3. **参数比较**：高亮显示触发重组的参数

使用方法：Run → Layout Inspector → 选择进程，在 Component Tree 中勾选 "Show Recomposition Counts"。

### Macrobenchmark 与 Tracing

精确量化性能改进需要 Macrobenchmark：

```kotlin
@RunWith(AndroidJUnit4::class)
class ComposeBenchmark {
    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun scrollList() = benchmarkRule.measureRepeated(
        packageName = "com.example.app",
        metrics = listOf(FrameTimingMetric()),
        iterations = 10,
        setupBlock = {
            pressHome()
            startActivityAndWait()
        }
    ) {
        val list = device.findObject(By.res("itemList"))
        list.setGestureMargin(device.displayMetrics.widthPixels / 5)
        list.fling(Direction.DOWN)
        device.waitForIdle()
    }
}
```

关键关注 P50、P90、P99 帧耗时。16ms 是 60fps 的底线，如果 P90 超过 16ms，说明 10% 的帧在掉帧。

### Android Studio System Trace

System Trace 可以深入分析帧耗时：

```bash
# 使用 Perfetto 抓取 trace
adb shell perfetto \
  -c - --txt \
  -o /data/misc/perfetto-traces/trace \
  <<EOF
buffers: {
  size_kb: 65536
  fill_policy: DISCARD
}
duration_ms: 10000
EOF

# 拉取 trace 文件
adb pull /data/misc/perfetto-traces/trace
```

在 Perfetto UI 中可以看到每个帧的测量、布局、绘制耗时，定位瓶颈在哪一环节。

### 常见性能陷阱总结

| 陷阱 | 症状 | 解决方案 |
|------|------|----------|
| 不稳定的数据类 | 列表全部 item 随每次更新而重组 | 添加 `@Immutable` 或 `@Stable` |
| 缺少 key | 插入/删除/重排序时大面积重组 | 提供稳定的 `key` |
| 在顶层读取 State | 整个页面随微小状态变化重组 | 推迟状态读取到最深层 |
| 在 Composable 中创建对象 | 每次重组都创建新实例 | 使用 `remember` + lambda |
| Modifier 顺序不当 | 不必要的测量和布局 | 遵循 background → padding → clip 顺序 |
| 大图无尺寸限制 | 内存暴涨 + GPU 压力 | `ImageRequest.Builder.size()` |
| 属性动画触发重组 | 动画帧率低 | `graphicsLayer` |
| 子 Composable 频繁传递 lambda | 每次重组创建新 lambda，绕过跳过机制 | 使用 `remember` 包装 lambda |
| 使用 var 而不是 val | 可变状态捕获不明确 | 尽量用 `val` + State |
| 忘记 LazyColumn 的 key | 滚动时列表闪烁 + 重组风暴 | 所有的 items() 都加 key |

## 实际案例分析

### 案例一：列表页从 200ms 到 16ms

一个社交 App 的好友列表，每页 20 个 item，每个 item 含头像、姓名、状态标签、最后在线时间。

**优化前（P90 帧耗时 200ms）**：

```kotlin
// 问题代码
@Composable
fun FriendList(viewModel: FriendListViewModel) {
    val friends by viewModel.friends.collectAsState()
    
    LazyColumn {
        items(friends) { friend ->  // 无 key，无 contentType
            FriendItem(friend)
        }
    }
}

@Composable
fun FriendItem(friend: Friend) {  // Friend 类型不稳定！
    Row(modifier = Modifier.padding(12.dp)) {
        AsyncImage(model = friend.avatarUrl)  // 无尺寸限制
        Text(friend.name)
        Text(friend.status)
        Text(friend.lastOnline)
    }
}
```

**优化后（P90 帧耗时 16ms）**：

```kotlin
@Immutable
data class Friend(
    val id: Long,
    val name: String,
    val avatarUrl: String,
    val status: String,
    val lastOnline: String
)

@Composable
fun FriendList(viewModel: FriendListViewModel) {
    val friends by viewModel.friends.collectAsState()
    
    LazyColumn {
        items(
            items = friends,
            key = { it.id },
            contentType = { "friend" }
        ) { friend ->
            FriendItem(friend)
        }
    }
}

@Composable
fun FriendItem(friend: Friend) {
    Row(modifier = Modifier.padding(12.dp)) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(friend.avatarUrl)
                .size(48, 48)
                .crossfade(true)
                .build(),
            contentDescription = null,
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
        )
        Text(friend.name)
        Text(friend.status)
        Text(friend.lastOnline)
    }
}
```

三项改动：`@Immutable` 数据类、LazyColumn key + contentType、图片尺寸限制。P90 从 200ms 降到 16ms。

### 案例二：动画帧率从 45fps 到 60fps

一个轮播 Banner，半径 300dp 的圆形图片自动旋转。使用 `animateFloatAsState` 改变 `rotation` 值导致持续重组。

**优化前**：

```kotlin
var rotation by remember { mutableFloatStateOf(0f) }
LaunchedEffect(Unit) {
    while (true) {
        animate(0f, 360f, infiniteRepeatable(tween(3000))) { value, _ ->
            rotation = value
        }
    }
}
Box(modifier = Modifier.rotate(rotation)) {
    AsyncImage(model = bannerUrl)
}
```

**优化后**：

```kotlin
val rotation = remember { Animatable(0f) }
LaunchedEffect(Unit) {
    rotation.animateTo(
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000),
            repeatMode = RepeatMode.Restart
        )
    )
}
Box(
    modifier = Modifier.graphicsLayer {
        rotationZ = rotation.value
    }
) {
    AsyncImage(model = bannerUrl)
}
```

帧率从 45fps 稳定到 60fps。`graphicsLayer.rotationZ` 在 GPU 渲染层处理，不经过 Compose 的测量/布局/重组管线。

## Jetpack Compose 性能优化检查清单

在发布前，过一遍这个清单：

1. ☐ 所有数据类添加了 `@Immutable` 或 `@Stable`
2. ☐ LazyColumn/LazyRow 使用了 `key` 和 `contentType`
3. ☐ 状态读取推迟到了最深层的 Composable
4. ☐ 属性动画使用了 `graphicsLayer`
5. ☐ 图片加载指定了 `size()`
6. ☐ 启用了 Compose Compiler Metrics 并审查了报告
7. ☐ 配置了 Baseline Profile
8. ☐ 运行了 Macrobenchmark 并确认 P90 < 16ms
9. ☐ Layout Inspector 中重组计数合理
10. ☐ 大列表的 `beyondBoundsItemCount` 未过大

## 总结

Compose 性能优化的核心思路：**让 Compose Compiler 知道哪些东西不会变，让 Compose Runtime 少做无用功**。具体来说：

1. **稳定类型是第一防线**：标注 `@Immutable`，使用不可变集合
2. **key 和 contentType 是列表必备**：让 Compose 精确识别 item 变化
3. **derivedStateOf 控制重组范围**：只在派生结果真正变化时才重组
4. **graphicsLayer 是动画的银弹**：GPU 渲染层变换，零重组开销
5. **测量先于优化**：用 Layout Inspector + Macrobenchmark 量化问题，再动手

Compose 的性能模型更接近 React/Vue 而非传统的 Android View，理解"声明式 UI 的性能心智模型"比记住具体 API 更重要。当你掌握了这些技巧，Compose 的 UI 从"能用"变成"丝滑"，用户的感知是直观的——页面"不卡了"、"流畅多了"。

这些优化不仅适用于 Compose，Compose Multiplatform 在多平台场景下更需要这些实践——因为桌面端用户对卡顿比移动端更敏感。一次优化，全平台受益。
