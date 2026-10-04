---
title: "Gradle 构建加速全攻略：从 5 分钟到 30 秒"
description: "从 Profile 找到瓶颈到 Configuration Cache，一步步把 Android 项目构建从 5 分钟优化到 30 秒的完整方案"
date: 2026-07-05 14:41:32
category: Android
tags: ["Gradle", "Android", "构建优化", "性能优化"]
read_time: 5
slug: gradle-构建加速全攻略从-5-分钟到-30-秒
---

<p>Android 项目里 Gradle 构建慢是一个老生常谈的话题。很多人以为加几行 <code>org.gradle.parallel=true</code> 就完事了，但实际优化起来比想象中要复杂得多。</p>
<p>这篇文章从 Gradle 构建的生命周期出发，分析每一步可以做什么优化。不是教你抄配置，而是让你知道<strong>为什么</strong>要这么配。</p>
<h2>先看看你的构建到底卡在哪</h2>
<p>开始优化之前，先要搞清楚瓶颈在哪。盲猜"编译慢"然后随机调参数，跟修 bug 不先复现一样不靠谱。</p>
<h3>用 Profile 找出瓶颈</h3>
<pre><code class="language-bash">./gradlew assembleDebug --profile
</code></pre>
<p>跑完后在 <code>build/reports/profile/</code> 下生成一个 HTML 报告，里面会显示每个 Task 的执行时间。你大概率会发现：</p>
<ul>
<li><strong>Configuration 阶段</strong> 占了几十秒甚至更多</li>
<li><strong>Task execution</strong> 里最慢的是 <code>kaptGenerateStubs</code>、<code>lint</code>、<code>transformClassesAndResourcesWithProguard</code></li>
<li><strong>增量编译</strong> 没有生效，每次都是全量</li>
</ul>
<h3>开启 Gradle Build Scan</h3>
<p>如果 Profile 还不够详细，直接用 Build Scan：</p>
<pre><code class="language-bash">./gradlew assembleDebug --scan
</code></pre>
<p>这个会生成一个在线报告，包含依赖解析时间、缓存命中率、Task 执行顺序等非常详细的信息。免费版的够用了。</p>
<h2>控制依赖版本的管理策略</h2>
<p>很多人没注意到，依赖版本的管理方式直接影响构建速度。</p>
<h3>统一版本管理（Version Catalog）</h3>
<pre><code class="language-toml"># gradle/libs.versions.toml
[versions]
kotlin = &quot;2.0.21&quot;
compose-bom = &quot;2024.12.01&quot;
room = &quot;2.6.1&quot;
hilt = &quot;2.51.1&quot;
agp = &quot;8.7.3&quot;

[libraries]
kotlin-stdlib = { module = &quot;org.jetbrains.kotlin:kotlin-stdlib&quot;, version.ref = &quot;kotlin&quot; }
compose-bom = { module = &quot;androidx.compose:compose-bom&quot;, version.ref = &quot;compose-bom&quot; }
room-runtime = { module = &quot;androidx.room:room-runtime&quot;, version.ref = &quot;room&quot; }
room-ktx = { module = &quot;androidx.room:room-ktx&quot;, version.ref = &quot;room&quot; }
room-compiler = { module = &quot;androidx.room:room-compiler&quot;, version.ref = &quot;room&quot; }
hilt-android = { module = &quot;com.google.dagger:hilt-android&quot;, version.ref = &quot;hilt&quot; }
hilt-compiler = { module = &quot;com.google.dagger:hilt-compiler&quot;, version.ref = &quot;hilt&quot; }

[plugins]
android-application = { id = &quot;com.android.application&quot;, version.ref = &quot;agp&quot; }
kotlin-android = { id = &quot;org.jetbrains.kotlin.android&quot;, version.ref = &quot;kotlin&quot; }
hilt = { id = &quot;com.google.dagger.hilt.android&quot;, version.ref = &quot;hilt&quot; }
kapt = { id = &quot;org.jetbrains.kotlin.kapt&quot; }
</code></pre>
<p>然后直接在 <code>build.gradle.kts</code> 里引用：</p>
<pre><code class="language-kotlin">plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
    alias(libs.plugins.kapt)
}

android {
    // ...
}

dependencies {
    implementation(libs.kotlin.stdlib)
    implementation(platform(libs.compose.bom))
    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    kapt(libs.room.compiler)
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)
}
</code></pre>
<p>Version Catalog 的好处不仅仅是统一版本号——它能让你清晰地看到依赖图谱，避免重复下载同一依赖的不同版本。</p>
<h2>AGP 版本与 Gradle 版本的匹配关系</h2>
<p>很多人直接复制了网上的 Gradle 配置，但 AGP 和 Gradle 的版本不匹配会导致一些隐性问题。官方兼容性指南建议：</p>
<pre><code class="language-kotlin">// gradle.properties — 关键参数
org.gradle.jvmargs = -Xmx4096m -XX:MaxMetaspaceSize=1024m
org.gradle.parallel = true
org.gradle.caching = true
org.gradle.configuration-cache = true
</code></pre>
<h3>JVM 参数优化</h3>
<p><code>-Xmx</code> 的值需要根据你的机器内存来调。一个参考：</p>
<table>
<thead>
<tr>
<th>机器内存</th>
<th>-Xmx 建议值</th>
</tr>
</thead>
<tbody>
<tr>
<td>8GB</td>
<td>2048m</td>
</tr>
<tr>
<td>16GB</td>
<td>4096m</td>
</tr>
<tr>
<td>32GB</td>
<td>8192m</td>
</tr>
</tbody>
</table>
<p><code>MaxMetaspaceSize</code> 控制的是元空间（类定义等），对于 KSP/KAPT 较多的项目，设置 512m-1024m 能避免频繁 GC。</p>
<h2>替换 KAPT 为 KSP</h2>
<p>如果你还在用 KAPT，这可能是当前最简单的构建加速方法之一。</p>
<p>KAPT（Kotlin Annotation Processing Tool）的工作方式是：先解析 Kotlin 代码生成 Java stub（这是全量编译），然后给 APT 处理器用。这个 stub 生成过程非常慢。</p>
<p>KSP（Kotlin Symbol Processing）直接在 Kotlin 语法树层面处理注解，不需要生成 stub。对比下来：</p>
<table>
<thead>
<tr>
<th>处理器</th>
<th>构建时间</th>
</tr>
</thead>
<tbody>
<tr>
<td>Room + KAPT</td>
<td>~45s</td>
</tr>
<tr>
<td>Room + KSP</td>
<td>~18s</td>
</tr>
</tbody>
</table>
<p>迁移示例（以 Room 为例）：</p>
<pre><code class="language-kotlin">// build.gradle.kts — 替换前
plugins {
    id(&quot;org.jetbrains.kotlin.kapt&quot;)
}
dependencies {
    kapt(libs.room.compiler)
}

// build.gradle.kts — 替换后
plugins {
    id(&quot;com.google.devtools.ksp&quot;)
}
dependencies {
    ksp(libs.room.compiler)
}
</code></pre>
<p>不是所有库都支持 KSP，目前主流的 Room、Glide、Moshi 都支持了。Hilt 暂时还不支持，但已经在开发中了。</p>
<h2>模块化架构对构建速度的影响</h2>
<p>模块化不是为了"代码组织更清晰"——它的直接好处是<strong>增量构建</strong>。</p>
<h3>模块化正确的打开方式</h3>
<pre><code class="language-css">app/
├── :app                        // 主模块（包含依赖集成、Navigation）
├── :core:ui                    // UI 公共组件
├── :core:network               // 网络层
├── :core:database              // 数据库
├── :feature:home               // 首页
├── :feature:profile            // 个人中心
├── :feature:settings           // 设置
└── :feature:search             // 搜索
</code></pre>
<p>关键原则：<strong>高频改动的模块和低频改动的模块分开</strong>。<code>:core:ui</code> 和 <code>:core:network</code> 可能几周才改一次，它们的字节码缓存基本不会失效。<code>:feature:home</code> 可能一天改很多次，但它只会重新编译它自己和依赖的基础模块。</p>
<h3>数据流对比</h3>
<ul>
<li><strong>单模块项目</strong>：改一行代码 → 全部重新编译 → 3 分钟</li>
<li><strong>多模块项目</strong>：改一个 Feature 模块 → 只编译该模块 → 30 秒</li>
</ul>
<h3>模块化过度的问题</h3>
<p>当然，模块化不是越细越好。如果你有 30 个模块但每个模块只有几个文件，你会发现：</p>
<ol>
<li>Gradle 的配置阶段变长了（要解析 30 个 build.gradle.kts）</li>
<li>IDE 索引变慢了</li>
<li>跨模块的 API 变更需要修改多个地方</li>
</ol>
<p>经验法则：<strong>一个模块的代码能在 30 分钟内读完</strong>。如果太小就合并，如果太大就拆分。</p>
<h2>缓存策略：本地缓存、远程缓存、Build Cache</h2>
<h3>本地构建缓存</h3>
<pre><code class="language-kotlin">// settings.gradle.kts
buildCache {
    local {
        isEnabled = true
        directory = File(rootDir, &quot;.build-cache&quot;)
        removeUnusedEntriesAfterDays = 30
    }
}
</code></pre>
<p>默认的 <code>~/.gradle/caches/</code> 交给 Gradle 自己管理。但显式指定缓存目录可以让你在 <code>git clean -fdx</code> 后保留缓存。</p>
<h3>Remote Build Cache（团队构建加速）</h3>
<p>如果团队有多人，或者有 CI，远程构建缓存的价值就体现出来了：</p>
<pre><code class="language-kotlin">// settings.gradle.kts
buildCache {
    local {
        isEnabled = true
    }
    remote(HttpBuildCache::class.java) {
        url = uri(&quot;https://build-cache.your-team.com/cache/&quot;)
        isPush = true
        credentials {
            username = System.getenv(&quot;BUILD_CACHE_USER&quot;) ?: &quot;&quot;
            password = System.getenv(&quot;BUILD_CACHE_PASSWORD&quot;) ?: &quot;&quot;
        }
    }
}
</code></pre>
<p>CI 构建一次后，开发者拉下来就能直接命中缓存，不用重新编译。对于有 30+ 人的 Android 团队，这个配置每个月能省下几个小时的构建等待时间。</p>
<h2>禁用不必要的 Task 和 Plugin</h2>
<p>很多 Android 项目默认启用了一些你完全不需要的 Task：</p>
<pre><code class="language-kotlin">// build.gradle.kts — 禁用不必要的 Task
android {
    lint {
        // 如果只需要 lint 的 error 级别检查
        checkReleaseBuilds = false
        abortOnError = false
    }
    buildTypes {
        release {
            // 如果不需要 ProGuard 混淆（比如 debug 版）
            isMinifyEnabled = false
            proguardFiles(...)
        }
    }
}
// 禁用特定的 Lint 检查
lintOptions {
    disable += setOf(
        &quot;MissingTranslation&quot;,
        &quot;ExtraTranslation&quot;,
        &quot;TypographyFractions&quot;
    )
}
</code></pre>
<h3>为什么 lint 这么慢</h3>
<p>Gradle Plugin 默认的 lint 检查非常多——它会在每个变体（debug/release）上跑一次完整的 lint 检查。如果你的项目有 5 个 flavor × 2 个 buildType = 10 个变体，lint 每 run 一次就是 10 倍的时间。</p>
<p>建议在本地开发时只保留 <code>checkDebug</code>，对 release 变体只做 critical 级别检查：</p>
<pre><code class="language-kotlin">// build.gradle.kts
android {
    lint {
        checkReleaseBuilds = false
        checkGeneratedSources = false
        checkDependencies = false
        abortOnError = false
    }
}
</code></pre>
<h2>开启 Gradle Configuration Cache</h2>
<p>Gradle 8 以后最重要的特性就是 Configuration Cache。它把配置阶段的结果缓存下来，后续构建跳过配置阶段。</p>
<pre><code class="language-properties"># gradle.properties
org.gradle.configuration-cache = true
</code></pre>
<h3>兼容性检查</h3>
<p>开启后，Gradle 会检查你的脚本是否兼容。常见的不兼容情况：</p>
<ul>
<li>在 <code>build.gradle.kts</code> 顶部直接读取系统属性</li>
<li>在配置阶段访问文件内容</li>
<li>使用动态版本号（如 <code>2.+</code>）</li>
</ul>
<p>第一次开启时，Gradle 会跑一次完整的构建并记录不兼容的地方。修完之后，后续构建的配置阶段时间从 10-30 秒降到 1 秒以内。</p>
<h3>一些需要注意的事项</h3>
<p>Configuration Cache 在 CI 上也会生效，但需要确保缓存目录不被清理。在 GitHub Actions 上可以用 <code>actions/cache</code> 来保存：</p>
<pre><code class="language-yaml">- name: Cache Gradle configuration
  uses: actions/cache@v4
  with:
    path: ~/.gradle/configuration-cache
    key: ${{ runner.os }}-gradle-config-${{ hashFiles('**/*.gradle*') }}
</code></pre>
<h2>CI 上的构建加速</h2>
<p>CI 上的 Gradle 构建和本地有很多不同。</p>
<h3>Task 输出缓存保持</h3>
<pre><code class="language-yaml">- uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches/
      ~/.gradle/wrapper/
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
    restore-keys: |
      ${{ runner.os }}-gradle-
</code></pre>
<h3>按模块拆分 CI 任务</h3>
<pre><code class="language-yaml">jobs:
  test-core-network:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./gradlew :core:network:test

  test-core-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: ./gradlew :core:database:test
</code></pre>
<p>如果 CI 机器资源充裕，并行跑模块测试能大幅缩短总耗时。</p>
<h3>使用 Remote Build Cache</h3>
<p>CI 上开启 Remote Build Cache 然后 push 到远端，开发者本地也能获益。之前已经写过配置了，这里不再重复。</p>
<h2>其他细节优化</h2>
<h3>zipflinger 替代默认压缩</h3>
<pre><code class="language-kotlin">// gradle.properties
android.useNewApkCreator = true
</code></pre>
<p>这个会在打包 apk 时使用 zipflinger 替代旧的压缩算法，速度能快 30-40%。</p>
<h3>减少 APK 构建变体</h3>
<pre><code class="language-kotlin">// build.gradle.kts
android {
    variantFilter {
        // 只保留 debug 和 release
        if (buildType.name == &quot;staging&quot; || buildType.name == &quot;benchmark&quot;) {
            ignore = true
        }
    }
}
</code></pre>
<p>每多一个变体，Gradle 就要多编译一套。对于开发不需要的变体，直接过滤掉。</p>
<h2>一个完整的优化 checklist</h2>
<p>把上面的内容做成一个 checklist，方便你对着改：</p>
<h3>基础</h3>
<ul>
<li>[ ] <code>org.gradle.jvmargs = -Xmx4096m</code>（根据内存调整）</li>
<li>[ ] <code>org.gradle.parallel = true</code></li>
<li>[ ] <code>org.gradle.caching = true</code></li>
<li>[ ] <code>android.useNewApkCreator = true</code></li>
</ul>
<h3>进阶</h3>
<ul>
<li>[ ] 替换 KAPT → KSP（如果兼容）</li>
<li>[ ] 开启 Configuration Cache</li>
<li>[ ] Version Catalog 替代 ext 变量</li>
<li>[ ] 模块化项目</li>
<li>[ ] 禁用不必要的 lint 检查</li>
<li>[ ] 过滤不必要的构建变体</li>
</ul>
<h3>团队级</h3>
<ul>
<li>[ ] Remote Build Cache</li>
<li>[ ] CI 上的 Gradle 缓存</li>
<li>[ ] 按模块拆分 CI 任务</li>
</ul>
<h2>实测对比</h2>
<p>以一个中等规模的 Android 项目（20 万行 Kotlin，12 个模块）为例：</p>
<table>
<thead>
<tr>
<th>阶段</th>
<th>优化前</th>
<th>优化后</th>
<th>提升</th>
</tr>
</thead>
<tbody>
<tr>
<td>冷启动完整构建</td>
<td>5m 12s</td>
<td>1m 45s</td>
<td>66%</td>
</tr>
<tr>
<td>增量构建（改一个文件）</td>
<td>2m 30s</td>
<td>28s</td>
<td>81%</td>
</tr>
<tr>
<td>CI 完整构建</td>
<td>7m 20s</td>
<td>3m 10s</td>
<td>57%</td>
</tr>
<tr>
<td>配置阶段</td>
<td>32s</td>
<td>1.2s</td>
<td>96%</td>
</tr>
</tbody>
</table>
<p>最夸张的是开启 Configuration Cache 后，配置阶段从 32 秒降到 1.2 秒——这个几乎是零成本的操作，效果却最明显。</p>
<h2>总结一下</h2>
<p>Gradle 构建优化不是什么黑科技，核心就是几个方向：</p>
<ol>
<li><strong>找到瓶颈</strong>：先用 <code>--profile</code> 和 <code>--scan</code> 看清楚</li>
<li><strong>减少重复工作</strong>：Configuration Cache、Build Cache、Remote Cache</li>
<li><strong>减少不必要的工作</strong>：禁用无用的 Task、过滤变体</li>
<li><strong>并行化</strong>：并行构建、模块化增量编译</li>
<li><strong>选择合适的工具</strong>：KSP 替代 KAPT、zipflinger 替代旧压缩</li>
</ol>
<p>不要一开始就上全部优化。先跑一次 <code>--scan</code>，找到最慢的那一项，针对性地优化，再跑一次对比。每一步都要有数据支撑，而不是"感觉快了"。</p>
<p>构建时间不是玄学，是可以量化和优化的工程问题。</p>
