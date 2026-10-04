---
title: "Jetpack Compose 动画实战"
description: "Jetpack Compose 动画实战：掌握声明式 UI 动画的核心技巧，打造流畅的用户体验"
date: 2026-04-25 15:27:53
category: Android
tags: ["Jetpack Compose", "Android", "动画", "Kotlin", "UI"]
read_time: 15
slug: jetpack-compose-animation
---

<p>动画是提升用户体验的关键元素。Jetpack Compose 提供了一套强大的声明式动画 API，让动画实现变得简单直观。本文将深入探讨 Compose 动画的核心概念和实战技巧。</p>

      <div class="tip-box">
        <strong>核心优势</strong>：声明式 API、自动优化、与状态无缝集成、可测试性强
      </div>

      <h2>动画类型概览</h2>

      <p>Compose 动画分为三大类：</p>

      <table>
        <tr><th>类型</th><th>特点</th><th>适用场景</th></tr>
        <tr><td>简单动画</td><td>单一值变化，API 简洁</td><td>透明度、颜色、尺寸渐变</td></tr>
        <tr><td>状态动画</td><td>基于状态切换，自动过渡</td><td>展开/收起、选中/未选中</td></tr>
        <tr><td>高级动画</td><td>完全控制，可定制性强</td><td>复杂手势动画、物理动画</td></tr>
      </table>

      <h2>一、简单动画</h2>

      <h3>1. animate*AsState</h3>

      <p>最基础的动画 API，用于单一值的变化：</p>

      <pre><code>@Composable
fun FadeInBox(visible: Boolean) {
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "alpha"
    )
    
    Box(
        modifier = Modifier
            .size(100.dp)
            .alpha(alpha)
            .background(Color.Blue)
    )
}</code></pre>

      <h3>2. 常用 animate*AsState 函数</h3>

      <pre><code>// 颜色动画
val color by animateColorAsState(
    targetValue = if (selected) Color.Red else Color.Gray,
    animationSpec = spring(stiffness = Spring.StiffnessLow)
)

// 尺寸动画
val size by animateDpAsState(
    targetValue = if (expanded) 200.dp else 100.dp,
    animationSpec = tween(300, easing = FastOutSlowInEasing)
)

// 偏移动画
val offset by animateIntOffsetAsState(
    targetValue = if (moved) IntOffset(100, 100) else IntOffset.Zero
)

// 圆角动画
val corner by animateDpAsState(
    targetValue = if (rounded) 24.dp else 0.dp
)</code></pre>

      <h2>二、状态动画</h2>

      <h3>1. AnimatedVisibility</h3>

      <p>控制组件显示/隐藏的动画：</p>

      <pre><code>@Composable
fun ExpandableCard(expanded: Boolean) {
    AnimatedVisibility(
        visible = expanded,
        enter = fadeIn() + expandVertically(),
        exit = fadeOut() + shrinkVertically()
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                text = "这是一段可以展开/收起的内容",
                modifier = Modifier.padding(16.dp)
            )
        }
    }
}</code></pre>

      <div class="tip-box">
        <strong>组合动画</strong>：<code>fadeIn() + expandVertically()</code> 使用 <code>+</code> 组合多个动画效果，它们会同时执行。
      </div>

      <h3>2. AnimatedContent</h3>

      <p>内容切换时的过渡动画：</p>

      <pre><code>@Composable
fun TabContent(selectedTab: Int) {
    AnimatedContent(
        targetState = selectedTab,
        transitionSpec = {
            if (targetState > initialState) {
                slideInHorizontally { width -> width } + fadeIn() togetherWith
                    slideOutHorizontally { width -> -width } + fadeOut()
            } else {
                slideInHorizontally { width -> -width } + fadeIn() togetherWith
                    slideOutHorizontally { width -> width } + fadeOut()
            }
        },
        label = "tab-content"
    ) { targetTab ->
        when (targetTab) {
            0 -> HomeScreen()
            1 -> ProfileScreen()
            2 -> SettingsScreen()
        }
    }
}</code></pre>

      <h3>3. Crossfade</h3>

      <p>淡入淡出切换两个状态：</p>

      <pre><code>@Composable
fun LoadingContent(isLoading: Boolean) {
    Crossfade(
        targetState = isLoading,
        animationSpec = tween(500),
        label = "loading-crossfade"
    ) { loading ->
        if (loading) {
            CircularProgressIndicator()
        } else {
            ContentList()
        }
    }
}</code></pre>

      <h2>三、高级动画</h2>

      <h3>1. Animatable</h3>

      <p>手动控制动画，支持中断和反向：</p>

      <pre><code>@Composable
fun DraggableBall() {
    val animatable = remember { Animatable(0f) }
    val coroutineScope = rememberCoroutineScope()
    
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(200.dp)
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = { offset ->
                        // 动画到点击位置
                        coroutineScope.launch {
                            animatable.animateTo(
                                targetValue = offset.x,
                                animationSpec = spring(
                                    dampingRatio = Spring.DampingRatioMediumBouncy,
                                    stiffness = Spring.StiffnessLow
                                )
                            )
                        }
                    }
                )
            }
    ) {
        Box(
            modifier = Modifier
                .offset { IntOffset(animatable.value.roundToInt(), 0) }
                .size(50.dp)
                .background(Color.Red, CircleShape())
        )
    }
}</code></pre>

      <h3>2. Transition</h3>

      <p>管理多状态动画：</p>

      <pre><code>enum class ButtonState {
    Idle, Pressed, Loading, Success
}

@Composable
fun AnimatedButton() {
    var buttonState by remember { mutableStateOf(ButtonState.Idle) }
    
    val transition = updateTransition(buttonState, label = "button-state")
    
    val bgColor by transition.animateColor(label = "bg-color") { state ->
        when (state) {
            ButtonState.Idle -> Color.Blue
            ButtonState.Pressed -> Color.DarkGray
            ButtonState.Loading -> Color.Gray
            ButtonState.Success -> Color.Green
        }
    }
    
    val elevation by transition.animateDp(label = "elevation") { state ->
        if (state == ButtonState.Pressed) 2.dp else 8.dp
    }
    
    Button(
        onClick = { /* 处理点击 */ },
        colors = ButtonDefaults.buttonColors(containerColor = bgColor),
        modifier = Modifier.shadow(elevation)
    ) {
        AnimatedContent(buttonState, label = "button-content") { state ->
            when (state) {
                ButtonState.Idle -> Text("提交")
                ButtonState.Pressed -> Text("按下")
                ButtonState.Loading -> CircularProgressIndicator()
                ButtonState.Success -> Text("完成")
            }
        }
    }
}</code></pre>

      <h2>AnimationSpec 详解</h2>

      <p>AnimationSpec 定义动画的执行方式：</p>

      <pre><code>// 1. tween - 时间插值动画
tween&lt;Float>(
    durationMillis = 300,
    delayMillis = 100,
    easing = FastOutSlowInEasing
)

// 2. spring - 弹簧动画（物理模拟）
spring&lt;Float>(
    dampingRatio = Spring.DampingRatioNoBouncy,
    stiffness = Spring.StiffnessMedium
)

// 3. keyframes - 关键帧动画
keyframes&lt;Float> {
    durationMillis = 500
    0f at 0 with LinearEasing
    0.5f at 200 with FastOutLinearInEasing
    1f at 500
}

// 4. repeatable - 重复动画
repeatable&lt;Float>(
    iterations = 3,
    animation = tween(300),
    repeatMode = RepeatMode.Reverse
)

// 5. infiniteRepeatable - 无限循环
infiniteRepeatable&lt;Float>(
    animation = tween(300),
    repeatMode = RepeatMode.Restart
)</code></pre>

      <div class="warning-box">
        <strong>性能提示</strong>：<code>spring</code> 动画基于物理模拟，可能触发多次重组，在复杂 UI 中注意性能。
      </div>

      <h2>实战案例：点赞动画</h2>

      <pre><code>@Composable
fun LikeButton(
    isLiked: Boolean,
    onLike: () -> Unit
) {
    val scale by animateFloatAsState(
        targetValue = if (isLiked) 1.2f else 1f,
        animationSpec = spring(
            stiffness = Spring.StiffnessMedium,
            dampingRatio = Spring.DampingRatioMediumBouncy
        ),
        label = "like-scale"
    )
    
    val color by animateColorAsState(
        targetValue = if (isLiked) Color.Red else Color.Gray,
        label = "like-color"
    )
    
    Icon(
        imageVector = if (isLiked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
        contentDescription = "点赞",
        tint = color,
        modifier = Modifier
            .scale(scale)
            .clickable { onLike() }
            .size(32.dp)
    )
}</code></pre>

      <h2>最佳实践</h2>

      <ul>
        <li><strong>优先使用声明式 API</strong>：<code>animate*AsState</code> 和 <code>AnimatedVisibility</code> 覆盖大部分场景</li>
        <li><strong>合理选择 AnimationSpec</strong>：UI 反馈用 <code>spring</code>，时间精确控制用 <code>tween</code></li>
        <li><strong>避免过度动画</strong>：动画时间建议 200-500ms，过长会感觉卡顿</li>
        <li><strong>使用 label 参数</strong>：Compose 编译器要求所有动画都有 label，便于调试</li>
        <li><strong>测试动画</strong>：使用 Compose Testing 框架验证动画状态</li>
      </ul>

      <h2>总结</h2>

      <p>Jetpack Compose 动画 API 设计精良，核心要点：</p>

      <ul>
        <li>✅ 简单动画：<code>animate*AsState</code></li>
        <li>✅ 状态切换：<code>AnimatedVisibility</code>、<code>AnimatedContent</code></li>
        <li>✅ 高级控制：<code>Animatable</code>、<code>Transition</code></li>
        <li>✅ 动画规格：<code>tween</code>、<code>spring</code>、<code>keyframes</code></li>
        <li>✅ 性能优化：避免过度动画，合理选择 AnimationSpec</li>
      </ul>

      <div class="tip-box">
        <strong>参考资源</strong>：<br>
        Compose Animation 文档：<a href="https://developer.android.com/jetpack/compose/animation" target="_blank">developer.android.com/jetpack/compose/animation</a><br>
        Compose Animation Codelab：<a href="https://codelabs.developers.google.com/codelabs/jetpack-compose-animation" target="_blank">codelabs.developers.google.com</a>
      </div>
