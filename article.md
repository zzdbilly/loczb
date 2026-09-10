---
title: 别再从 Espresso 开始：Android 测试分层实战手册
description: 从 JUnit 5 + MockK 到 Compose 语义树断言，从 Robolectric 到 Firebase Test Lab——一个老 Android 开发对测试金字塔的分层打法、Flaky 治理与 CI 取舍，全是踩坑后留下的判断。
date: 2026-09-10 16:20:00
category: Android
tags: [Android, 测试, Kotlin, Jetpack Compose, CI]
read_time: 18
slug: android-testing-playbook
---

## 写在前面：测试决定的是你敢不敢点发布

### 发版前夜的味道

带了几年 Android 项目，我最记得的不是哪个需求多复杂，而是每次发版前夜的味道：构建产物躺在文件夹里，测试同学在回归，你嘴上说「稳住」，手却在刷新崩溃平台。有一年我们发一个支付页改版，本地一切正常，线上灰度十分钟后风控回调开始丢，回滚、查日志、修数据，一整套折腾下来，我痛定思痛——问题不在代码量，在于我们对「改了这个会不会坏那个」完全没有底气。

后来我把整个测试体系推倒重来，按金字塔重新分层。这篇文章就是那次重构沉淀下来的打法：每一层用什么工具、测什么、在 CI 里怎么排布，以及我在真实项目里踩过的坑。

### 我的三条测试立场

先把立场摆出来，后面所有的技术选择都是从这里推出来的：

- **UI 测试是最后手段，不是第一选择。** 它最贵、最慢、最容易坏，却经常被新手当成测试的起点。正确的顺序是：先问这段逻辑能不能不经过界面测。
- **覆盖率是副产品，不是目标。** 一旦把「覆盖率 80%」写进 KPI，你会收获一堆调用 `toString()` 凑数的垃圾测试。覆盖率用来找盲区，不用来交差。
- **测试的第一质量指标是「失败时的可信度」。** 一个经常误报的测试比没有测试更糟——团队学会忽略它之后，它吞掉的真 bug 再也找不回来。

## 测试金字塔在移动端到底怎么分层

### 四层各自回答什么问题

Google 官方推荐的移动端测试模型把测试按「离设备的距离」排成三层，我实际落地时拆成四层，每层只回答一类问题：

1. **纯 JVM 单元测试**：这个函数/这个类的逻辑对不对？不碰任何 Android API。
2. **Android 逻辑层测试（Robolectric）**：这段依赖 `Context`、`SharedPreferences`、资源系统的代码，在 JVM 上模拟出的 Android 环境里对不对？
3. **界面测试（Espresso / Compose Testing）**：用户点下去，屏幕上出现的东西对不对？
4. **截图测试（Paparazzi / Roborazzi）**：这个组件渲染出来的像素，是不是被谁改丑了？

### 为什么我把 Espresso 放在塔尖

View 时代的习惯是「写个 Activity 起 Espresso 测一切」，因为不这么做就没法测。现在不是了：只要业务逻辑从 Activity/Fragment 里剥出来（放 Presenter、ViewModel 或纯 Kotlin UseCase），它能待在塔基用毫秒级速度跑。剩下真正需要 UI 测试的，只有「这条用户路径端到端通不通」这一类问题——一个 App 挑五到十条黄金路径覆盖就够了。我的一个两百多模块的商用车机项目，Espresso 用例长期控制在 60 条以内，反而是塔基的 JVM 测试写了四千多条。

### 一张成本对照表

| 层级 | 单条用例耗时 | 维护成本 | 环境依赖 | 适合测什么 |
|------|------------|---------|---------|-----------|
| JVM 单元测试 | 毫秒 | 低 | 无 | 业务规则、状态机、纯逻辑 |
| Robolectric | 几十~几百毫秒 | 中 | 模拟 Android 环境 | Framework 交互、数据层 |
| Paparazzi 截图 | 几百毫秒 | 中 | 基线 PNG | 组件视觉回归 |
| Espresso / Compose UI | 秒级 | 高 | 模拟器或真机 | 黄金路径、交互反馈 |
| Firebase Test Lab | 分钟级排队 | 高 | 云端真机 | 机型兼容、厂商碎片化 |

## 塔基：纯 JVM 单元测试（JUnit 5 + MockK）

### 工程配置

统一用 Gradle Version Catalog 管版本。下面是我目前一个生产项目的测试相关版本，全文示例都基于它们：

```toml
# gradle/libs.versions.toml
[versions]
kotlin = "2.1.21"
junit5 = "5.11.4"
mockk = "1.13.13"
robolectric = "4.14.1"
androidJunit5 = "1.11.0.1"

[libraries]
junit-jupiter = { module = "org.junit.jupiter:junit-jupiter", version.ref = "junit5" }
junit-jupiter-params = { module = "org.junit.jupiter:junit-jupiter-params", version.ref = "junit5" }
mockk = { module = "io.mockk:mockk", version.ref = "mockk" }
robolectric = { module = "org.robolectric:robolectric", version.ref = "robolectric" }

[plugins]
android-junit5 = { id = "de.mannodermaus.android-junit5", version.ref = "androidJunit5" }
```

模块的 `build.gradle.kts` 里两件事必须做：应用 android-junit5 插件，并显式声明用 JUnit Platform 跑测试：

```kotlin
// module/build.gradle.kts
plugins {
    id("com.android.library")
    alias(libs.plugins.android.junit5)
    kotlin("android")
}

android {
    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
        }
        // Robolectric 需要资源时打开这两行
        unitTests.isIncludeAndroidResources = true
        unitTests.isReturnDefaultValues = true
    }
}

dependencies {
    testImplementation(libs.junit.jupiter)
    testImplementation(libs.junit.jupiter.params)
    testImplementation(libs.mockk)
}
```

### AAA 结构与测试命名

我强制团队遵守 Arrange-Act-Assert 三段式：准备数据、执行动作、断言结果，段间空行，一个测试方法只有一个 Act。命名用「被测对象 + 场景 + 期望结果」的完整句子，让测试报告本身就是需求文档。

```kotlin
class PriceCalculatorTest {

    @Test
    fun `calculateFinalPrice 会员且订单满300 应叠加9折与满减优惠`() {
        // Arrange
        val calculator = PriceCalculator(membershipDiscount = 0.9f)
        val order = Order(items = listOf(Item(price = 180f), Item(price = 150f)))

        // Act
        val result = calculator.calculateFinalPrice(order, isMember = true)

        // Assert
        assertEquals(297f, result, 0.01f) // 330 * 0.9 = 297
    }
}
```

反例我也见过：`test1()`、`checkPrice()`、`priceShouldBeRight()`。三个月后没人知道这些名字底下埋的是哪个 bug 的回归用例。

### MockK：什么时候 mock，什么时候别 mock

MockK 是 Kotlin 生态里对 DSL 支持最完整的 mock 框架，接口、final 类、单例、扩展函数都能处理。但我的原则是：**纯逻辑不 mock，边界才 mock。** 金额计算、日期推算这类函数直接构造真实对象测；Repository、网络客户端、`TimeProvider` 这类跨边界的依赖才上 fake 或 mock。

```kotlin
class CouponViewModelTest {

    private val repo = mockk<CouponRepository>()
    private val viewModel = CouponViewModel(repo)

    @Test
    fun `loadCoupons 接口失败时 state 应为 Error 且携带原始信息`() {
        // Arrange：mock 一个失败分支
        coEvery { repo.fetchCoupons() } throws IOException("网络走丢了")

        // Act
        viewModel.loadCoupons()
        val state = viewModel.state.first() // Flow 取第一个值需要 coroutines-test

        // Assert
        assertIs<CouponState.Error>(state)
        assertEquals("网络走丢了", state.message)
    }
}
```

协程测试记得配 `kotlinx-coroutines-test`，用 `runTest` 拿到 `TestScope`，别拿 `Thread.sleep` 等异步——那正是 flaky 的第一批种子。

`verify` 用来断言交互（「点了退款按钮必须调一次 `analytics.track`」），但一条测试里断言交互超过三次，通常说明你在测实现细节而不是行为——重构时它会哭。

### JUnit 5 在 Android 上的真实边界

有个坑我得提前说透：**JUnit 5 只覆盖 instrumented tests 之外的世界。** `androidTest/` 目录下跑在设备上的用例由 AndroidX Test 的 Runner 驱动，至今仍是 JUnit 4。我见过有团队在 instrumented 包里混进 `@Test` 来自 `org.junit.jupiter.api` 的注解，测试「全部通过」——因为 JUnit4 Runner 根本不认识它，一条都没跑。这类静默失效我在 code review 里抓到过三次，防它的手段是在 CI 里开 Android Lint 的自定义规则或至少检查用例总数是否与本地一致。

### 覆盖率：仪表盘不是 KPI

接 Kover 或 JaCoCo，把总覆盖率贴在 PR 评论里当参考，团队约定「新增代码要有测试」，但没人因为 79% 被扣绩效。覆盖率对我唯一的用法是打开按包视图找那 0% 的角落——它们要么是死代码该删，要么是真正的雷区。

## Android 逻辑层：Robolectric 不用真机的 Android 测试

### 什么场景值得上 Robolectric

当代码绕不开 `Context`、资源读取、`SharedPreferences`、`Settings.Global` 这类 framework 调用，纯 JVM 测试会撞上一堆 `Method ... not mocked` 异常（这正是上文 `isReturnDefaultValues = true` 存在的原因）。Robolectric 在 JVM 上反射组装了一套 Android 框架实现，让这类代码在毫秒级跑完，还能按需控制生命周期。

我的判断标准：一个类的行为依赖 framework API，但不依赖「真实渲染与真实触控」，就放 Robolectric。

### 配置与基本用法

```kotlin
// build.gradle.kts
android {
    testOptions {
        unitTests.isIncludeAndroidResources = true
    }
}

dependencies {
    testImplementation(libs.robolectric)
    testImplementation("androidx.test:core-ktx:1.6.1")
}
```

```kotlin
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class TokenStoreTest {

    private val context = ApplicationProvider.getApplicationContext<Context>()

    @Test
    fun `clearAll 后本地不应残留任何 token`() {
        // Arrange
        val store = TokenStore(context)
        store.save(accessToken = "a-123", refreshToken = "r-456")

        // Act
        store.clearAll()

        // Assert
        assertNull(store.accessToken)
        assertNull(store.refreshToken)
    }
}
```

### 踩过的三个坑

**其一，SDK 对齐。** `@Config(sdk = [34])` 指定模拟的 Android 版本，Robolectric 首次运行会去下载对应 android-all jar。CI 上如果没缓存 `~/.m2/repository/org/robolectric`，每次冷跑多花几十秒，务必加 Actions 缓存。

**其二，生命周期黑盒。** Robolectric 下 `Activity` 的 `onCreate` 到 `onResume` 需要手动 `ActivityController` 推进，忘了推进的测试会拿到半初始化的对象，报出莫名其妙的 NPE。

**其三，shadow 不是万能的。** 冷门 framework API 在 Robolectric 里没有实现（或行为与真机偏差），撞到 `ShadowNotWritableException` 之类的异常时，先查官方 shadow 清单；确实模拟不了的逻辑，认输，下沉一层重构成纯函数，或者升级到 instrumented test。

## View 体系的 UI：Espresso

### 三件套心智模型

Espresso 的所有 API 归成三类：**onView** 定位元素、**perform** 执行动作、**check/matches** 断言状态。它内置了等待机制（IdlingResource 体系），主线程空闲前不会乱动，这是它比早年 Robotium 稳的根本原因。

```kotlin
@Test
fun login_withWrongPassword_showsInlineError() {
    // Arrange：用 test tag 而非 id 定位，重命名 id 不应弄断测试
    onView(withId(R.id.et_account)).perform(typeText("zhangmeng@demo.com"), closeSoftKeyboard())
    onView(withId(R.id.et_password)).perform(typeText("wrong-pass"), closeSoftKeyboard())

    // Act
    onView(withId(R.id.btn_login)).perform(click())

    // Assert
    onView(withText("账号或密码不正确"))
        .check(matches(isDisplayed()))
}
```

### RecyclerView 的滚动断言

长列表里找元素要用 `RecyclerViewActions`，它替你完成滚动—绑定—再点击的状态机：

```kotlin
onView(withId(R.id.rv_history))
    .perform(
        RecyclerViewActions.actionOnItemAtPosition<HistoryViewHolder>(
            12,
            click()
        )
    )
```

配套一个坑：列表项内容来自分页网络时，Espresso 等不到网络（RxFlow 场景 IdlingResource 经常漏注册）。我们的做法是测试环境注入假数据源，一次灌满一页，绝不让 UI 测试承担网络时序。

### 自定义 Matcher 让失败信息说人话

Espresso 断言失败默认打印整棵 View 树，可读性一般。写一个带 `describeTo` 的自定义 Matcher，PR 里的失败日志会感激你：

```kotlin
fun isEnabledWithText(expected: String): Matcher<View> =
    object : TypeSafeMatcher<View>() {
        override fun describeTo(description: Description) {
            description.appendText("按钮应可用且文案为「$expected」")
        }

        override fun matchesSafely(view: View): Boolean =
            view is Button && view.isEnabled && view.text.toString() == expected
    }
```

## Compose 时代：语义树才是测试面

### createComposeRule 与基本断言

Compose 没有 id，测试框架从 View 树切换成**语义树（SemanticsTree）**：渲染时每个可交互节点带着 `Modifier.semantics` 暴露的属性，测试用这些属性定位。写法比 Espresso 更直白：

```kotlin
class CheckoutScreenTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun `勾选运费险后应付金额应从39变为42`() {
        // Arrange
        composeRule.setContent {
            CheckoutScreen(order = OrderDemo.withShipping())
        }

        // Act
        composeRule.onAllNodesWithText("运费险")[0]
            .performClick()

        // Assert
        composeRule.onNodeWithText("¥42.00").assertIsDisplayed()
    }
}
```

`createComposeRule`（instrumented）与 `createAndroidComposeRule<ComponentActivity>`（Robolectric 里跑 Compose，配合前文的 android-junit5 桥接）是两个入口，逻辑一致的组件我优先放 Robolectric 跑，快一个数量级。

### testTag 是测试的接口契约

按文案定位在中文项目里很脆——文案会改、会做 A/B、会国际化。稳定做法是给关键节点打 `testTag`，并把它当成公开接口对待：改 tag 要走和改 API 一样的 review：

```kotlin
Button(
    onClick = onSubmit,
    modifier = Modifier.testTag("checkout.submit")
) { Text("提交订单") }

// 测试侧
composeRule.onNodeWithTag("checkout.submit")
    .performClick()
    .assertAny(hasClickAction())
```

命名规范我们用「模块.场景.元素」三段点分制，全局唯一，搜索即定位。

### 滚动 LazyColumn 断言不可见项

```kotlin
composeRule.onNodeWithTag("settings.row.darkmode")
    .performScrollTo()   // 先滚进视口
    .performClick()

composeRule.onNode(hasSetTextAction())
    .assertIsDisplayed()
```

`performScrollTo` 只处理列表内滚动；涉及 `Scaffold` 嵌套滚动容器时它偶尔找不到锚点，我们的兜底是把 `isScrollable()` 的父节点单独 `performGesture { swipeUp() }`。

## 截图测试：Paparazzi 与 Roborazzi

### 它们防的是哪类 bug

UI 断言查的是「对不对」，查不了「好不好看」。改一个 `MaterialTheme` 的 spacing，语义测试全线绿灯，视觉却碎了一地——这类回归交给截图测试：把组件渲染成 PNG 与基线比对，像素差异超阈值即失败。

### Paparazzi：JVM 上出图，不需要模拟器

Cash App 开源的 Paparazzi 用 LayoutLib（就是 Android Studio 预览用的那套）在 JVM 渲染，速度快到可以每条 PR 全量跑：

```kotlin
plugins {
    id("app.cash.paparazzi") version "1.3.5"
}
```

```kotlin
class PriceTagSnapshotTest {

    @get:Rule
    val paparazzi = Paparazzi(
        deviceConfig = DeviceConfig.PIXEL_6,
        theme = "android:Theme.Material.Light.NoActionBar",
    )

    @Test
    fun `priceTag - 会员价态`() {
        paparazzi.snapshot {
            AppTheme {
                PriceTag(origin = 39.0f, member = 29.9f, isMember = true)
            }
        }
    }
}
```

`./gradlew recordPaparazziDebug` 生成基线，`verifyPaparazziDebug` 比对。基线 PNG 提交进仓库，PR diff 里直接能看图。

### Roborazzi：接管 instrumented 与 Compose 的截图

Roborazzi 挂在 Robolectric 或普通 instrumented 流程上，胜在能截**真实运行时**的屏（含第三方 SDK 的渲染），失败时输出 diff 图。我们用它覆盖那些 Paparazzi 渲染不了的 WebView 混合页面：

```kotlin
plugins {
    id("io.github.takahirom.roborazzi") version "1.33.0"
}
```

```kotlin
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(sdk = [34])
class HomeCardRoborazziTest(private val state: FeedState) {

    @get:Rule
    val composeRule = createAndroidComposeRule<ComponentActivity>()

    @Test
    @WithRoborazziOptions(options = RoborazziOptions(
        captureOptions = CaptureOptions(changeThreshold = 0.01f)
    ))
    fun snapshot() {
        composeRule.setContent { HomeFeedCard(state) }
        composeRule.onRoot().captureRoboImage(
            "src/test/screenshots/home_card_${state.name.lowercase()}.png"
        )
    }

    companion object {
        @ParameterizedRobolectricTestRunner.Parameters
        @JvmStatic
        fun states() = listOf(
            FeedState.NORMAL, FeedState.VIDEO, FeedState.PROMO, FeedState.OFFLINE
        )
    }
}
```

`changeThreshold = 0.01f` 是关键：不同字体 hinting 会产生 1~2% 的像素噪声，零容忍的截图测试一周内就会被团队关掉。

### 基线 review 的工程办法

截图测试最大的阻力是「肉眼审不过来的 PNG」。我们在 CI 里把失败截图与基线截图、diff 图三张打包成一条 PR 评论，约定两条规则：视觉改动必须带「为什么改」的说明才能重新录制基线；一次 PR 里基线变更超过 10 张，拆 PR。

## Flaky 治理：测试说谎比测试缺席更致命

### 抖动从哪里来

回看我们治理前的 47 条 flaky 用例，根因分布如下：

| 根因 | 占比 | 典型形态 |
|------|------|---------|
| 时间依赖 | ~30% | 断言「显示 2 分钟前」，CI 慢机器变 3 分钟 |
| 协程/线程时序 | ~25% | 用 delay 等异步结果，机器负载一高就超时 |
| 动画未关 | ~20% | Compose 默认动画让断言抢跑 |
| 测试间共享状态 | ~15% | 单例、磁盘文件、静态变量被上一个用例污染 |
| 模拟器抖动 | ~10% | 图形渲染、输入法弹出层时序 |

### 治理手段一：把时间变成注入参数

所有「当前时间」从 `Clock` 来，测试给固定值：

```kotlin
interface AppClock { fun now(): Instant }
data class SystemClock : AppClock { override fun now() = Instant.now() }

class OrderExpiryChecker(private val clock: AppClock) {
    fun isExpired(order: Order): Boolean =
        order.createdAt.plus(30, ChronoUnit.MINUTES) < clock.now()
}

@Test
fun `第31分钟的订单应判为过期`() {
    val fixed = AppClockFixed(Instant.parse("2026-09-10T08:00:00Z"))
    val checker = OrderExpiryChecker(fixed)
    val order = OrderDemo.createdMinutesAgo(31)
    assertIsTrue(checker.isExpired(order))
}
```

Compose UI 测试统一关动画：`composeRule.mainClock.autoAdvance = false` 后手动 `advanceTimeBy`，让动画在测试里变成可控的逐帧播放。

### 治理手段二：重试是麻醉剂，要付利息

我的规矩：允许 CI 对「隔离清单之外」的失败自动重试一次，但每个被重试救活的用例必须当天建卡片、进隔离清单——这是「利息」。**quarantine 标签机制**让它不阻塞主干：

```kotlin
android {
    testOptions {
        unitTests.all {
            it.useJUnitPlatform()
            // 主 pipeline 排除隔离用例，单独的 quarantine job 天天跑它们观察
            it.excludeTags("quarantine")
        }
    }
}
```

```kotlin
@Tag("quarantine")
@Test
fun `支付结果页偶发拿不到订单号`() { /* 修复完成后删掉 @Tag */ }
```

隔离区用例连续两周不再抖动就毕业回主干；隔离超过六周还没人修，删掉——没人修的测试是负资产。

### 治理手段三：用例之间必须老死不相往来

共享的 `object` 单例、写死同一个文件的 IO、上一个用例留下的数据库状态，是测试随机通过组合里最常见的暗雷。我们在基类里强制 `@BeforeEach` 重建全部依赖，数据库测试用 `@Transactional` 回滚。判据很硬：**任意用例单独跑必须通过，任意两个用例随机顺序必须通过。** 做不到就是架构问题。

## CI 接入：GitHub Actions 与 Firebase Test Lab 的取舍

### 流水线分两档：PR 跑便宜的，merge 跑贵的

```yaml
# .github/workflows/ci.yml（节选）
on:
  pull_request:
  push:
    branches: [main]

jobs:
  unit:                       # 每个 PR 都跑，5 分钟内出结果
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 17 }
      - uses: gradle/actions/setup-gradle@v4
      - name: 缓存 Robolectric android-all
        uses: actions/cache@v4
        with:
          path: ~/.m2/repository/org/robolectric
          key: robolectric-${{ hashFiles('gradle/libs.versions.toml') }}
      - run: ./gradlew testDebugUnitTest verifyPaparazziDebug

  instrumented:               # 只跑合并后的 main，控制设备成本
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        api: [28, 34]
    steps:
      - uses: actions/checkout@v4
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: ${{ matrix.api }}
          arch: x86_64
          script: ./gradlew connectedDebugAndroidTest
```

矩阵里 `api: [28, 34]` 取的是用户占比的两端，不是设备商店的型号数——真机长尾交给 Test Lab，模拟器矩阵只守最低支持版本和当前 target。

### Actions 里跑模拟器的成本真相

GitHub 的 Linux runner 带 KVM，x86_64 模拟器能硬件加速，冷启动加跑完 60 条用例大约 12~18 分钟；图形相关用例偶发渲染失败，所以我把 instrumented 从 PR 门禁里摘出来，作为 merge 后的「准入门禁」——红了就 revert 排查，不阻塞别人的 PR。

### Firebase Test Lab：碎片化外包

真机长尾不值得自己养。gcloud 一条命令提交，按机型矩阵分发，结果带视频和 logcat：

```bash
gcloud firebase test android run \
  --type instrumentation \
  --app app/build/outputs/apk/release/app-release.apk \
  --test app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk \
  --device model=oriole,version=34 \
  --device model=redfin,version=30 \
  --use-orchestrator \
  --num-flaky-test-attempts=1 \
  --results-bucket=gs://my-app-flank-results
```

参数里的三个决定：`--use-orchestrator` 让每条用例独立进程跑，专治测试间污染；`--num-flaky-test-attempts=1` 只在这里允许一次重试，因为云端模拟器/真机本身的底座抖动确实存在；`--results-bucket` 把产物落到自己的 GCS，方便留存视频。

### 三套执行环境的取舍表

| 维度 | Actions 模拟器 | Paparazzi(Robolectric) JVM | Firebase Test Lab |
|------|---------------|---------------------------|-------------------|
| 单轮耗时 | 10~20 分钟 | 秒~分钟 | 排队 5~30 分钟 + 执行 |
| 成本 | runner 分钟数 | ≈0 | 按设备·分钟计费 |
| 可信度 | 中（模拟器≠真机） | 中 | 高（真实 SoC/ROM） |
| 触发时机 | merge 后 | 每条 PR | 发版前 + 每周巡检 |

发布周的节奏：每条 PR 跑 unit + 截图；合并进 main 跑模拟器矩阵；封版那天凌晨跑一轮 Test Lab，覆盖 8 台重点机型，视频归档。

## 落地路径：从第一周到第一季度

### 第一周：把地基打平

接上 JUnit 5 + MockK + Kover，挑一个改动最频繁的纯逻辑类补 3~5 条 AAA 结构的单测，把「测试命名 + 三段式」写进团队的 review checklist。先让「跑测试」这件事在 CI 里存在，比跑多少条重要。

### 第一个月：拆依赖 + 建隔离区

重构两三个 god ViewModel，把时间、网络、数据库访问改成注入；搭 Robolectric 环境收编那些「必须 Context」的测试；同步启动 flaky 隔离区机制，第一次全量跑挂的偶发用例全部打 tag，每天看隔离区报表。

### 第一季度：UI 契约与视觉回归

给核心页面补五条黄金路径的 Compose/Espresso 测试，同时把 testTag 命名规范推广到设计协作里（设计师标注可交互态 → 开发落 tag）；Paparazzi 接管设计组件库的视觉回归；最后把 instrumented 上云，Test Lab 接入发版流程。

## 收尾：测试是工程判断，不是仪式

写完这套体系回头看，工具的更迭比我预想的快——ViewBinding 淘汰了 findViewById，Compose 又淘汰了 Espresso 的一半用例，截图测试两年前还被认为是玩具。但有三件事始终没过时：把逻辑从界面里剥出来的架构决策决定了测试上限；flaky 必须治理否则一切归零；以及测试体系的价值要在发版前夜才能见真章。

如果你现在只有一周时间，别去写 UI 测试。把最常被改坏的那个业务函数，用纯 Kotlin 测起来。
