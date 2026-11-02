---
title: "空安全在边界失效：反序列化不经过你的构造函数"
description: "非空类型保证的是编译期检查点，不是值本身。反序列化、反射与 Java 边界都能绕开这些检查点，所以外部数据必须在入口显式验一遍。"
date: 2026-11-02 17:20:00
category: Kotlin
tags: ["空安全", "序列化", "Android", "类型系统"]
read_time: 14
slug: nullable-claims-die-at-the-boundary
---

## 空安全在边界失效：反序列化不经过你的构造函数

`val name: String` 读起来像一句承诺：这个字段永远有值。写下去的时候我们默认它是运行时不变式，于是整条调用链都省掉了判空。

它不是不变式，是编译期约定。约定的执行者是编译器插进去的那几个检查点，而这些检查点只存在于「代码真的从这里走过」的位置。对象一旦不走构造函数诞生——反序列化、反射设值、Java 边界——约定就没有执行者了。字段声明还是非空，值还是 null，中间没有任何一步报错。

这篇文章不谈语法，谈一件事：这三条诞生路径分别把契约维护在哪，失效时失败发生在离现场多远的地方，以及边界校验应该放在哪一层。

## 先看清楚那行声明到底承诺了什么

### 契约的签约双方

非空类型是 Kotlin 类型系统里的一个约束，签约双方是「编译器」和「编译器看得见的代码」。它保证的是：在你写下的这些代码路径上，任何试图把 null 塞进非空位置的行为都会在编译期被拦下，或者在进入函数的第一条指令处被拦下。

它没有承诺的：运行时内存里的那个字段永远不是 null。类型擦除之后，`String` 和 `String?` 在字节码里是同一个 `Ljava/lang/String;`，JVM 不认识非空。所有的保证都来自编译器生成的检查代码。

### 检查点长什么样

把一段直白的 Kotlin 编译后再反编译，能看到编译器替你补的东西。左边是源码，右边（注释里）是它等价的样子——`Intrinsics` 调用是编译器插入的，命名细节随版本有差异：

```kotlin
// 源码：示意
data class UserProfile(
    val id: String,
    val name: String,
    val email: String?
)

fun render(profile: UserProfile, host: String): String =
    "$host:${profile.name}"

// 反编译视角：大致等价于下面这样，非逐字节还原
// public UserProfile(String id, String name, String email) {
//     Intrinsics.checkNotNullParameter(id, "id");
//     Intrinsics.checkNotNullParameter(name, "name");
//     // email 可空，不插检查
//     this.id = id;
//     this.name = name;
//     this.email = email;
// }
//
// public static final String render(UserProfile profile, String host) {
//     Intrinsics.checkNotNullParameter(profile, "profile");
//     Intrinsics.checkNotNullParameter(host, "host");
//     return host + ":" + profile.getName();
// }
```

三点值得记住：

- 检查发生在**构造器入口**和**公开函数入口**，参数按声明逐个检查。
- 字段赋值语句本身不检查。`this.name = name` 之前的那次 `checkNotNullParameter` 已经是全部保障。
- 只检查「进入这个函数时」，不检查「离开之后」。对象在堆上活了多久、被谁改过，编译器不再管。

### 检查点为什么不是全程保护

一个人容易产生的错觉是：构造函数检查过了，所以这个对象之后一直是合法的。实际成立的推论只有一条——构造器执行完的那一刻，字段是合法的。中间只要有任何一条路径能在不执行构造器的情况下写字段，或者能把 null 从编译器不检查的方向送进来，推论就断了。

`data class` 让这件事更贵。`equals`、`hashCode`、`toString`、`copy()` 全部由字段直接推导，它们默认字段非空成立。一个坏掉的实例流进集合、流进缓存 key、流进日志格式化，坏的是整片逻辑，不只是一处判空。

## 路径一：走构造函数

### 契约在这条路上是成立的

对象从 `UserProfile(...)` 或 `copy(...)` 出来，构造器体的第一条指令就是参数检查。这条路是 Kotlin 世界里唯一被完整覆盖的诞生方式，其余所有方式都要单独论证。

`copy()` 也在这条路上：它调用合成构造器，同样带检查。所以「先构造一个合法对象，再 copy 改一个字段」是安全的；它不会帮你修好一个本来就坏的对象。

### 一个容易忽略的漏洞：默认值

构造器参数有默认值时，如果不传这个参数，走的是合成构造器的另一条分支，默认值表达式求值的结果同样会经过检查。这一点没问题。问题出在从 Java 调用时：默认参数在 Java 侧不存在，Java 调用方必须显式传全部参数，而它传 null 就会在 Kotlin 构造器里被检查拦住——这个方向反而安全，因为检查写在被调用方。

### 这条路的边界在哪

边界很清楚：只要对象是在 Kotlin 代码里被 `new` 出来的，契约成立。一旦构造动作交给别人——框架、反射、native、另一个语言——就要看对方调没调用你的构造器。

## 路径二：绕过构造函数

### 分配实例，不执行构造器

JVM 上有一条所有人都能用的通道：`sun.misc.Unsafe.allocateInstance(Class)`。它按类的大小在堆上分配内存，把字段置为默认值（引用类型是 null），**不执行任何构造器体**。基于反射的 JSON 库在没有可用无参构造时，走的就是这条通道。

流程大致是这样：

1. 反射拿到 `Class`，读所有字段（含 private final）。
2. 没有无参构造 → `allocateInstance` 拿一个字段全为默认值的实例。
3. `Field.setAccessible(true)`，逐个把 JSON 里的值写进去。
4. JSON 里缺的字段，就保持默认值——引用类型是 null。

第 4 步就是事故的起点。JSON 里没写 `name`，目标类声明的是 `val name: String`，Gson 这类库不会替你检查，它只做「有就写，没有就跳过」。

```kotlin
// 示意：反射绑定，不经过构造器
val json = """{"id":"u-1","email":null}"""   // 注意：没有 name
val profile: UserProfile = gson.fromJson(json, UserProfile::class.java)

// 赋值这一步不会抛异常，name 在内存里是 null
println(profile.id)      // "u-1"
println(profile.name)    // 编译期认为是 String，运行时是 null
```

### 赋值那一步为什么不报错

因为写入的路径是 `Field.set`，不是构造器。`Field.set` 只做类型兼容检查：`null` 对 `Ljava/lang/String;` 是合法值。没有任何一层会去问「这个字段在 Kotlin 里是非空的吗」——Kotlin 的非空标记在字节码里没有对应物（部分情况下会以 `@NotNull` 注解形式出现在元数据里，但那只是注解，不是运行时强制）。

结果是：`fromJson` 返回成功，对象看起来正常，坏值已经静默就位。

### 失败被推到了多远

这是最值得盯的一点。NPE 不会在 `fromJson` 那一行抛，也不会在赋值那一行抛。它会在第一次真正读这个字段的地方抛——可能是三层调用之后的 UI 绑定，可能是一个 `toString()`，可能是日志里拼接字符串，可能是 `equals` 哈希时。

栈大概长这样（文字示意，不是某次真实日志）：

> java.lang.NullPointerException: Parameter specified as non-null is null:
>     method kotlin.jvm.internal.Intrinsics.checkNotNullParameter, parameter name
>     at com.example.ui.ProfileHeader.render(ProfileHeader.kt)
>     at com.example.ui.ScreenKt.Profile(Screen.kt:41)

栈里从上到下找不到 JSON 入口。栈里出现的是渲染层，而真凶在网络层，中间隔着一个「成功返回」的解码调用。

这就是失败的距离：**从发生点到报错点，隔了 N 层与 M 分钟**。定位成本按距离涨，不按复杂度涨。判空加在报错的地方，等于在下游堵上游的漏水。

### 为什么这条路径最贵

三个原因叠加：

- **静默**：解码成功、字段就位、类型正确，没有任何一步发出信号。
- **延迟**：报错点和写入点之间隔着任意多层，栈信息误导排查方向。
- **扩散**：坏实例可能先进了缓存、进了集合、进了 `hashCode` 的桶，一份坏数据污染多处。

相比之下，构造器抛 NPE 是好事——它把失败压在了诞生那一刻，栈顶就是根因。

## 路径三：从 Java 边界进来

### 平台类型的那把感叹号

Kotlin 调 Java 方法时，返回值的类型叫**平台类型**，写法是 `String!`：它既可以被当成 `String`，也可以被当成 `String?`，编译器两边都放行。这不是编译器偷懒，是因为 Java 侧没有非空信息，它不能替你担保。

它放行的代价是：**这个方向上不插检查**。

```kotlin
// 示意：Java 侧的方法没有 @NonNull 注解
val token: String = legacyAuth.currentToken()   // 返回 String!，赋给非空类型
// 上一行没有检查。currentToken() 返回 null 时，token 里就是 null
```

注意区分两个方向，这决定了检查在谁身上：

| 方向 | 检查在哪 | 结果 |
|:-----|:---------|:-----|
| Java 调 Kotlin，传 null 进非空参数 | Kotlin 被调方入口 | 立刻 NPE，栈指向被调方 |
| Kotlin 调 Java，拿到 null 赋给非空类型 | 没有检查 | null 静默进入 Kotlin 世界 |
| Kotlin 内部互相调用 | 被调方入口 | 立刻 NPE |

第一行是安全的：检查写在被调用方，跑不掉。第二行是危险的：检查本该在赋值处，而那里什么都没有。Java 边界进来的 null，本质和反射写入的 null 是同一类东西——都是从编译器不插检查的缝隙里渗进来的。

### 平台类型还会传染

`legacyAuth.currentToken()` 的返回值一路往下传，只要每一站都声明成非空（编译器允许，因为源头是平台类型），null 就被包在非空类型里穿过了整个调用链。中途没有任何一站会触发检查——检查只在函数入口对**参数**做，而这一路上没人把 null 当参数往外传，它只是存在字段里或者当返回值。

这种「穿着非空外衣的 null」比裸 null 危险，因为类型系统从此不再提示你判空。

## 同一个 JSON，换一个会调构造器的解析器

下面这段是**推演**，不是我在哪个项目里跑过的实验。设定一个固定的坏输入：`{"id":"u-1","email":null}`，目标类还是前面那个 `UserProfile`，三条解析路径分别会怎样。为了聚焦，只关心 `name` 缺失这一件事。

### 推演 A：反射绑定 + Unsafe 分配

按路径二的机制走：`allocateInstance` 造实例，`name` 保持 null，`fromJson` 正常返回。坏值进入业务代码，报错点未知。这一路是「失败后移」。

### 推演 B：kotlinx.serialization

编译器插件为 `UserProfile` 生成 `serializer()`。反序列化时它不是「读字段 → 塞字段」，而是「读完所有字段 → 调用真正的（合成）构造器」。缺 `name` 就调用不成立即失败：

```kotlin
// 示意：失败发生在边界
val profile = runCatching {
    Json.decodeFromString<UserProfile>(json)
}.getOrElse { e ->
    when (e) {
        is MissingFieldException -> log.warn("字段缺失: ${e.missingFields}")
        is JsonDecodingException -> log.warn("解码失败: ${e.message}")
        else -> throw e
    }
    null
}
```

`MissingFieldException` 是 `SerializationException` 的子类，`missingFields` 会列出缺哪些。这样 treat 失败的位置就在解码调用这一行，栈顶是解码器，不是一个不相干的 UI 函数。这一路是「失败前移」。

一个必须说清的点：构造器被调用了，所以**非空参数检查在构造器入口会生效**，缺字段在到达构造器之前就已经被插件的生成代码拦下。两层都拦。

### 推演 C：Moshi，取决于有没有 Kotlin 支持

这条要写得准确，不能一概而论。Moshi 的行为取决于适配器是怎么来的：

| 配置 | 非空属性的缺失/为 null | 失败时机 |
|:-----|:----------------------|:---------|
| 启用 `KotlinJsonAdapterFactory`（反射） | 校验非空与必填，抛 `JsonDataException` | 解码时，边界 |
| 用 moshi-kotlin-codegen 生成适配器 | 生成代码调用构造器并校验 | 解码时，边界 |
| 只注册普通反射适配器，不带 Kotlin 支持 | 走无参构造 + 字段直写，非空不被校验 | 可能静默产生 null |

第三行是真正的坑：同一个库，加不加那一行 `add(KotlinJsonAdapterFactory())`，行为是两套。这类「配置决定契约」的库比「永远不校验」的库更危险，因为你以为自己在安全的那一档。

### 三路对照

| 维度 | 反射 + Unsafe | kotlinx.serialization | Moshi + Kotlin 支持 |
|:-----|:--------------|:----------------------|:--------------------|
| 是否执行构造器 | 否 | 是 | 是 |
| 缺字段的后果 | 字段为 null，静默 | `MissingFieldException` | `JsonDataException` |
| 失败位置 | 首次读取处，距离未知 | 解码调用处 | 解码调用处 |
| 栈是否指向根因 | 否 | 是 | 是 |
| 是否依赖配置正确 | 不依赖（永远不校验） | 不依赖 | 依赖，配错就退化成 A |

推演的结论只有一句：**把「谁负责构造」这件事从框架手里拿回来，失败就会自己前移**。换一个会调构造器的解码器，后面那层手写校验就可以省掉。

## 边界校验应该放在哪

### 入口一次性验证，不要沿途补

正确的位置是数据进入系统的第一站：HTTP 响应体解析完、文件读完、SharedPreferences 读出来的那一刻。在这个点做一次完整校验，通过之后的对象就可以当非空用，沿途不再判空。

沿途补判空的坏处不是啰嗦，是**它把「这里可能有 null」变成了常态**。每一处 `?.` 都在告诉后来的读者：这个字段的来源不可信。当所有字段都不可信，类型系统就退化成注释。

### 选会调构造器的序列化方案

这是成本最低的一步，也是收益最直接的一步：

- 新代码优先 kotlinx.serialization：编译期生成 serializer，失败在边界，错误信息带字段名。
- 存量 Gson 代码如果要保留，至少给关键模型加显式校验入口，别直接 `fromJson` 就往下发。
- Moshi 用的话，确认 `KotlinJsonAdapterFactory` 真的注册了，别只在文档里注册。

代价要说清楚：kotlinx.serialization 需要编译器插件，对构建链有侵入；它要求类在编译期可见（动态代理生成的类不行）；对多态和自定义格式的支持需要额外写 `SerializersModule`。这些是真实成本，不是可以忽略的细节。

### 把「未验证」和「已验证」在类型上分开

比「记得校验」更可靠的做法，是让类型系统替你记住。核心思路：**未验证的原始数据用一个独立类型装，验证通过的才允许构造成领域对象，而领域对象的构造器是私有的。**

```kotlin
// 示意：用私有构造器 + 工厂把「已验证」变成一种类型事实
@JvmInline
value class RawJson(val text: String)

data class UserProfile private constructor(
    val id: String,
    val name: String
) {
    companion object {
        fun from(raw: RawJson): Result<UserProfile> {
            val obj = runCatching { jsonParser.parseObject(raw.text) }.getOrNull()
                ?: return Result.failure(IllegalArgumentException("malformed json"))
            val id = obj["id"] ?: return Result.failure(IllegalArgumentException("missing id"))
            val name = obj["name"] ?: return Result.failure(IllegalArgumentException("missing name"))
            return Result.success(UserProfile(id, name))
        }
    }
}
```

要点在 `private constructor`：外部代码拿不到构造入口，只能走 `from`。这样「这个对象一定被校验过」不再依赖人的自觉，而是依赖可见性。代价是失去了 `copy()` 的便利（私有构造器下 `copy` 也受限），以及和序列化框架的兼容会变麻烦——框架要能调私有构造器，得额外配置。

这是权衡，不是教条。小项目里一个 `require(...)` 就够；模型多、边界多的项目值得上类型隔离。

### 校验失败怎么处理

三种处理方式，选哪种取决于数据性质：

- **整个响应判失败**：适用于一致性要求高的场景。一个字段缺失说明服务端契约变了，继续用半成品数据只会把问题拖远。
- **字段降级 + 上报**：适用于展示型数据。`name` 缺失就显示占位，同时打点。前提是降级值在类型上显式（`String?` 或者 `Unknown` 分支），不要偷偷塞空串——空串会一路通过所有非空检查。
- **直接崩**：适用开发期和内部工具。生产环境里「崩在边界」好过「坏数据流进下游」，但要有崩溃聚合，否则等于没有信号。

不推荐的做法是 `catch (e: Exception) { return null }` 一把梭。它把「字段缺失」和「网络断了」混成同一个 null，上游无法区分该重试还是该报错。

## 判断自己的代码处在哪条路径上

### 五个问题

拿现有代码过一遍，命中任何一个都说明边界上有缺口：

1. 这个类的实例，有没有可能不是我 new 出来的？（反射、ORM、mock、缓存反序列化）
2. 解码用的库，会不会调用我的构造器？不确定就去查文档，别猜。
3. 有没有字段是从 Java 方法直接赋给非空类型的？有的话，那个赋值处没有检查。
4. `data class` 的 `equals` / `hashCode` 有没有可能作用在坏实例上？如果坏实例进过集合，答案是「可能」。
5. 判空是集中在入口，还是散在各处？散着就是没有边界。

### 代价对照

| 做法 | 一次性成本 | 长期成本 | 失败位置 |
|:-----|:----------|:---------|:---------|
| 手写 `require` 校验 | 低 | 每个新字段都要记得加 | 入口 |
| 换 kotlinx.serialization | 中，要动构建链 | 低，生成代码自动校验 | 入口 |
| Moshi + Kotlin 工厂 | 低 | 低，但要防配置退化 | 入口 |
| 私有构造器 + 工厂 | 中高，要改调用点 | 低，编译期强制 | 入口 |
| 沿途判空 | 零 | 高，且随代码量线性涨 | 不确定 |

这张表的读法是：所有「一次性成本」都不会消失，只是从入口挪到了别处。选哪一行取决于你能接受成本出现在哪个时间点，而不是能不能省掉。

## 收束：类型声明是承诺，不是守门人

回到开头那句 `val name: String`。它承诺的东西比我们以为的少：它承诺「经过编译器的代码路径会检查」，不承诺「这个值永远有值」。这个区别在对象走构造器时看不出来，在对象不走构造器时就是全部。

三条诞生路径的差别，本质是「谁执行了契约」的差别：

- 走构造器：编译器在入口执行，失败立刻、定位精准。
- 绕过构造器：没人执行，失败后移到离现场很远的地方。
- 从 Java 边界进来：编译器主动放弃执行，null 穿着非空外衣往下走。

所以边界校验不是「防御性编程」的多余动作，它是把契约从编译器手里接过来、在运行时补一次执行。补的位置只有一个正确答案：数据第一次进入系统的那个点。补完之后，往后每一层都可以坦然地不判空——那才是类型声明应有的样子。

真正需要警惕的不是「有人传了 null」，而是「代码里到处都在防 null」。后者说明边界的执行者一直缺席，只是还没轮到那次报错。
