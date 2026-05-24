

# 快手前端研发实习生（用户体验方向）— 模拟面试 Q&A

---

## 一、自我介绍

**Q：请简单介绍一下你自己**

> 你好，我是XX，桂林电子科技大学软件工程大二学生。我做过三个前端项目：第一个是全栈博客平台，基于 Vue3 + Express，我重点做了性能优化，通过路由懒加载、Vite 分包等手段，核心页面 LCP 从 3.2s 优化到 2.5s，首屏资源体积下降 26%；第二个是 AI 简历分析应用，用 React + TypeScript + Serverless 架构，实现了 ATS 检测和 PDF 解析；第三个是 AI 对话平台，我负责前端的 SSE 流式渲染、Markdown 适配和虚拟列表优化。技术栈方面，我熟练掌握 Vue3 全家桶和 TypeScript，也有 React 项目经验，同时对 AI 在前端的落地应用比较关注。我对 B 端复杂应用和 AI 结合的场景很感兴趣，这也是我投递这个岗位的原因。

**要点**：量化数据 + 技术栈与岗位匹配 + 点题 AI 落地 + 呼应岗位方向

---

## 二、项目相关

### 2.1 性能优化

**Q：你博客项目做了性能优化，LCP 从 3.2s 优化到 2.5s，具体怎么做的？怎么发现瓶颈的？**

> 我先用 Chrome DevTools 的 Performance 面板和 Lighthouse 定位瓶颈，发现首屏加载了太多非必要资源。然后用 `rollup-plugin-visualizer` 分析包体积，发现 element-plus、@editorjs、three/vanta 等库占了很大比例。优化分三步：
>
> 1. **路由懒加载**：把路由对应的页面组件改为 `import()` 动态导入，非首屏页面不进入首包
> 2. **Vite 手动分包**：通过 `manualChunks` 函数按库名拆分，element-plus、@editorjs、three/vanta、lodash-es 各自独立 chunk，其余第三方归 vendor，利用浏览器缓存
> 3. **静态资源按需加载**：图片加 `loading="lazy"`，非必要资源延迟加载
>
> 其中路由懒加载效果最明显，首屏 JS 体积减少约 40%。

**Q：Vite 的 manualChunks 怎么配的？开发环境和生产环境的构建工具分别是什么？为什么？**

> manualChunks 用函数形式，根据模块路径判断：
>
> ```javascript
> manualChunks(id) {
>   if (id.includes('node_modules')) {
>     if (id.includes('element-plus')) return 'vendor-element-plus'
>     if (id.includes('@editorjs')) return 'vendor-editorjs'
>     if (id.includes('three') || id.includes('vanta')) return 'vendor-animation'
>     if (id.includes('lodash-es')) return 'vendor-lodash'
>     return 'vendor'
>   }
> }
> ```
>
> Vite 开发环境用 **esbuild**（Go 编写），编译速度极快，满足冷启动和 HMR 的即时响应；生产环境用 **Rollup**（JS 编写），Tree-shaking 更成熟，代码分割和 manualChunks 支持更完善，产出包体积更小。设计思路：**开发求快用 esbuild，生产求小用 Rollup**。

---

### 2.2 SSE 流式渲染

**Q：你的 AI 对话平台用了 SSE 流式渲染，具体怎么实现的？怎么中断？**

> 前端用 fetch 发起 POST 请求，携带消息数组，设置 `responseType` 为流式。后端以 SSE 格式（`data: xxx\n\n`）持续写入响应流。前端获取 ReadableStream 后用 TextDecoder 将字节流解码为字符串，按 `\n\n` 分割消息，再按 `data:` 前缀提取内容。我维护了两个缓冲区：SSE 缓冲区处理不完整的消息包，渲染缓冲区通过固定间隔（如 50ms）flush 到渲染层，避免逐字符渲染导致频繁 DOM 更新。
>
> 中断方面，用 AbortController 中断 fetch 请求，终止 ReadableStream 读取，并将当前消息标记为已中断。
>
> 选择 fetch + ReadableStream 而非原生 EventSource，是因为 EventSource 只支持 GET 请求且不能自定义 Header，无法携带 Token。

**Q：SSE 和 WebSocket 的区别？为什么选 SSE？**

> | | SSE | WebSocket |
> |---|---|---|
> | 方向 | 服务器单向推送 | 双向实时通信 |
> | 协议 | 基于 HTTP | 需要升级协议（101 Switching） |
> | 重连 | 内置自动重连（EventSource） | 需要手动心跳 + 重连 |
> | 数据格式 | 只能传文本（UTF-8） | 可传文本和二进制 |

**Q：Markdown 是闭合语法，流式渲染时收到不完整的 Markdown 怎么保证正确渲染？**

> 流式渲染的核心问题是：内容是逐字到达的，随时可能收到不完整的 Markdown 语法，比如 `**加粗` 没有闭合的 `**`，或者 ` ``` ` 代码块没有闭合，直接渲染会导致格式错乱。
>
> 我的解决方案分三层：
>
> **1. react-markdown 本身的容错能力**：react-markdown 底层基于 remark 解析器，对不完整的语法有一定的容错——未闭合的加粗/斜体标记会被当作普通文本渲染，不会崩溃。这是第一道防线。
>
> **2. 渲染缓冲区 + 延迟 flush**：我维护了一个渲染缓冲区，不是每收到一个字符就立刻渲染，而是通过固定间隔（如 50ms）批量 flush 到 react-markdown。这样可以在一个 flush 周期内积累更多内容，减少收到"半个语法"的概率。比如 `**加粗**` 可能在一次 flush 内就完整到达了。
>
> **3. 代码块特殊处理**：代码块（` ``` `）是最容易出问题的场景，因为未闭合的代码块会把后续所有内容都吞进去。我的做法是：在 flush 到 react-markdown 之前，检测当前内容中是否有未闭合的代码块（统计 ` ``` ` 出现次数，奇数说明未闭合），如果有，就在内容末尾临时补一个 ` ``` ` 让它闭合，渲染出正常的代码块样式；等后续真正的闭合标记到达后，再替换掉临时补的那个，重新渲染。
>
> **4. 流式结束后兜底**：流式输出完成后，做一次完整的 Markdown 渲染，确保最终结果是正确的。中间过程中的轻微闪烁是可以接受的，用户关注的是最终结果。
>
> **5. 长代码块的处理**：因为用了临时补闭合的方案，长代码块在流式过程中是作为正常的代码块渲染的，不会出现一大段普通文本的问题。但代码块会越来越长，可能撑开页面。我的做法是给代码块设置 `max-height` + `overflow-y: auto`，超出高度后出现滚动条，页面不会被撑爆。同时代码块底部有一个"生成中..."的动画提示，告诉用户内容还在输出。流式结束后滚动条会自动定位到最新内容。

> **记忆口诀**：react-markdown 自带容错 + 缓冲区减少半语法 + 代码块临时补闭合 + 结束后兜底重渲染 + 长代码块 max-height 限高
>
> 我的项目是 AI 模型生成内容推送给前端，数据流是单向的，不需要客户端反向发消息。SSE 基于普通 HTTP，不需要维护连接状态，兼容现有网关和代理，在这个场景下最轻量最简单，不需要引入 WebSocket 的复杂性。

---

### 2.3 虚拟列表

**Q：虚拟列表的原理是什么？为什么长列表不用虚拟列表会卡？**

> 虚拟列表只渲染可视区域内的 DOM 元素，核心实现有三点：
>
> 1. **外层容器**：设固定高度 + `overflow-y: auto`，形成可视窗口
> 2. **占位元素**：内部放一个高度等于全部列表总高度的空 div，撑出正确的滚动条
> 3. **偏移计算**：监听滚动事件，根据 `scrollTop` 和列表项高度，计算可视区域的起始和结束索引，只渲染这个范围内的元素，用 `transform: translateY()` 定位
>
> 不用虚拟列表，长列表会一次性创建大量 DOM 节点，导致首屏渲染慢、内存占用高、滚动时频繁重排重绘。
>
> 我的 AI 对话项目中，消息高度不固定，react-virtuoso 支持动态高度测量，所以选了它。同时需要处理流式输出时自动滚动到底部和用户上滑查看历史的冲突，通过底部跟随策略解决。

---

### 2.4 Axios 封装

**Q：你 Axios 封装了哪些能力？拦截器和 fetch 的区别？**

> 封装了三层能力：
>
> 1. **请求拦截器**：统一注入 Token（从 LocalStorage 取 JWT 放到 `Authorization: Bearer <token>`），无 Token 则跳转登录页
> 2. **响应拦截器**：统一错误处理，401 跳转登录、403 提示无权限、500 提示服务器错误；同时提取 `response.data`，业务层不需要再 `.data`
> 3. **重试机制**：对网络错误或 5xx 响应自动重试，最多 2 次，间隔递增
>
> Axios 拦截器本质是**责任链模式**，请求发出前和响应回来后自动执行，开箱即用。fetch 是浏览器原生 API，没有拦截器概念，需要自己封装或重写 `window.fetch`。Axios 还自带请求取消、超时控制、自动 JSON 转换，fetch 都需要手动实现。

---

### 2.5 Docker 部署

**Q：Docker 是什么？你的项目怎么用 Docker 部署的？**

> Docker 是容器化工具，把应用和所有依赖（运行时、库、配置）打包成**镜像（Image）**，镜像运行起来就是**容器（Container）**。核心解决环境一致性问题——构建一次，到处运行。容器比虚拟机轻量，共享宿主机 OS 内核。
>
> 部署流程：
>
> 1. **写 Dockerfile**：前端用多阶段构建，第一阶段 `node:18-alpine` 执行 `npm run build`，第二阶段 `nginx:alpine` 拷贝 dist 到 nginx 静态目录
> 2. **构建镜像**：`docker build -t blog-frontend .`
> 3. **运行容器**：`docker run -d -p 80:80 blog-frontend`
> 4. **docker-compose 编排**：前后端和 MySQL 三个容器，一条 `docker-compose up -d` 全部启动
>
> ```dockerfile
> FROM node:18-alpine AS build
> WORKDIR /app
> COPY package*.json ./
> RUN npm install
> COPY . .
> RUN npm run build
>
> FROM nginx:alpine
> COPY --from=build /app/dist /usr/share/nginx/html
> EXPOSE 80
> ```

---

### 2.6 JWT 鉴权

**Q：JWT 的原理？和 Session/Cookie 的区别？安全风险？**

> JWT 由三部分组成，用 `.` 分隔：
>
> 1. **Header**：算法类型和令牌类型，Base64 编码
> 2. **Payload**：用户信息（userId、role、exp），Base64 编码（不是加密，不能存敏感信息）
> 3. **Signature**：Header + Payload + 密钥通过算法计算，保证 Token 未被篡改
>
> 流程：用户登录 → 服务端生成 JWT → 前端存 LocalStorage → 后续请求带 `Authorization: Bearer <token>` → 服务端验证签名和过期时间
>
> | | Session/Cookie | JWT |
> |---|---|---|
> | 存储 | 服务端存 Session，客户端存 Session ID | 客户端存完整 Token，服务端不存储 |
> | 扩展性 | 多服务器需共享 Session，扩展难 | 无状态，天然支持分布式 |
> | 跨域 | Cookie 有跨域限制 | Token 放 Header，天然跨域 |
> | 安全性 | 服务端可主动销毁 | Token 签发后无法主动失效 |
>
> 安全风险：1) Token 泄露无法主动失效 → 短过期时间 + HTTPS；2) 无法主动失效 → Redis 黑名单 + 双 Token 机制；3) Payload 可解码 → 不存敏感信息；4) XSS 可读取 LocalStorage → 输入转义 + CSP 策略

---

### 2.7 AI 工具使用

**Q：你平时开发怎么用 AI 工具的？对 AI 在前端的应用怎么看？**

> 我把 AI 融入开发全流程，形成 AI 辅助工作流：
>
> 1. **编码阶段**：用 Cursor / Copilot 做代码补全和生成，但不直接复制，先理解逻辑再按项目规范调整
> 2. **提示词工程**：设计结构化提示词——明确角色、提供上下文、指定输出格式，把模糊需求转化为精确指令
> 3. **AI 工作流**：在 AI 对话平台项目中实践了完整工作流——用户提问 → Embedding 向量化 → 向量检索匹配知识库 → 拼接上下文 → 大模型生成回答
> 4. **自动化 CI/CD**：AI 做代码 Review、自动生成 Commit Message、检测潜在 Bug，在 CI 流水线中集成 AI 分析
>
> AI 不会取代前端，但会改变前端的工作方式。低价值重复工作会被自动化，前端的价值更多在架构设计、用户体验优化和 AI 应用落地上。我的规划是既扎实前端基础，又持续关注 AI 和前端的结合，比如大模型在客服场景落地、代码质量分析，和咱们团队方向很契合。

---

## 三、八股文

### 3.1 JS 数据类型

**Q：JS 数据类型有哪些？存储方式有什么区别？**

> 分两类：
>
> **基本类型（7 种）**：String、Number、Boolean、undefined、null、Symbol、BigInt。存在**栈内存**，直接存储值，赋值时值拷贝。
>
> **引用类型**：Object、Array、Function、Date、RegExp 等。存在**堆内存**，变量保存的是堆地址的引用，赋值时引用拷贝，修改一个会影响另一个。
>
> null 和 undefined 的区别：null 是有意赋值的空值，typeof 返回 object（历史遗留 bug）；undefined 是声明了但未赋值的默认值。

---

### 3.2 类型判断

**Q：怎么判断变量类型？typeof 有什么坑？**

> 四种方式：
>
> 1. **typeof**：返回字符串，能区分基本类型和函数。坑：`typeof null === 'object'`（初版 JS 用二进制前缀判断，null 全零被误判）；对所有引用类型（数组、日期等）都返回 `'object'`
> 2. **instanceof**：检测原型链，只能判断引用类型，基本类型不行。坑：跨 iframe / 跨 Realm 会失效
> 3. **`Object.prototype.toString.call()`**：最准确，返回 `[object Type]` 格式，如 `[object Array]`、`[object Null]`
> 4. **`Array.isArray()`**：判断数组最推荐，比 instanceof 更可靠

---

### 3.3 闭包

**Q：什么是闭包？应用场景？会导致什么问题？**

> 闭包是指一个函数能够访问其词法作用域外的变量，即使外部函数已经执行完毕，内部函数仍然持有对外部变量的引用，这些变量不会被垃圾回收。
>
> 应用场景：1) 数据私有化（模块模式）；2) 防抖节流（保存上次时间戳/定时器 ID）；3) 函数柯里化；4) 缓存/Memoization
>
> 问题：闭包持有外部变量引用，导致无法被 GC 回收，造成内存泄漏。解决：将不需要的引用置为 `null`，事件监听器在组件销毁时 `removeEventListener`，定时器不用时 `clearTimeout`。

**经典题：循环中的闭包**

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 输出：3 3 3（var 是函数作用域，循环结束后 i = 3）

// 解决1：用 let（块级作用域）
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0)
}
// 输出：0 1 2

// 解决2：用 IIFE 创建闭包
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 0)
  })(i)
}
// 输出：0 1 2
```

---

### 3.4 事件循环

**Q：事件循环是什么？宏任务和微任务的区别？**

> JS 是单线程的，通过事件循环处理异步任务。执行顺序：先执行同步代码（宏任务）→ 清空所有微任务 → 取一个宏任务 → 清空微任务 → 循环。
>
> **微任务**：`Promise.then/catch/finally`、`MutationObserver`、`queueMicrotask()`、`process.nextTick`（Node，优先级最高）
>
> **宏任务**：`setTimeout`、`setInterval`、`setImmediate`（Node）、I/O 操作、UI 渲染
>
> 关键：每次宏任务执行完后，都会清空**所有**微任务。微任务优先级高于宏任务，因为在当前宏任务结束前执行。

**经典输出题**

```javascript
console.log('1')
setTimeout(() => console.log('2'), 0)
Promise.resolve().then(() => console.log('3'))
console.log('4')
// 输出：1 4 3 2
```

---

### 3.5 Vue3 响应式原理

**Q：Vue3 的响应式原理？和 Vue2 的区别？**

> Vue3 用 **Proxy** 代理整个对象，Vue2 用 **Object.defineProperty** 对每个属性设置 getter/setter。getter 触发依赖收集，setter 触发派发更新。
>
> Proxy 的优势：1) 能检测属性增删（defineProperty 不能）；2) 能检测数组索引变化；3) 能拦截 has、deleteProperty、ownKeys 等多种操作；4) 不需要 $set / $delete API
>
> Vue2 数组监听：重写了 7 个变异方法（push、pop、shift、unshift、splice、sort、reverse），内部先执行原生操作再手动触发依赖通知。但直接索引修改 `arr[0] = x` 或修改 length 检测不到。
>
> Vue3 Proxy 深层响应：Proxy 只代理第一层，嵌套属性在 getter 中被访问时才递归创建 Proxy（惰性代理），性能更好，不需要像 Vue2 初始化时递归遍历所有属性。

---

### 3.6 computed 原理

**Q：computed 的实现原理？和 watch 的区别？**

> Vue3 的 computed 内部维护 `_dirty` 脏标记，初始为 true。首次读取时执行计算函数，缓存结果，dirty 置为 false；之后读取直接返回缓存值；依赖变化时将 dirty 重新置为 true，下次读取才重新计算。这是惰性求值策略，避免不必要重复计算。
>
> **computed vs watch**：computed 是计算属性，有缓存，依赖不变不重算，适合派生数据；watch 是侦听器，依赖变化时执行副作用，适合异步操作如发请求。computed 默认只读，watch 默认惰性执行。

---

### 3.7 ref vs reactive

**Q：ref() 和 reactive() 有什么区别？**

> | | ref | reactive |
> |---|---|---|
> | 适用类型 | 任意类型（基本类型 + 引用类型） | 只能用于对象类型（Object、Array） |
> | 访问方式 | 模板中自动解包，JS 中需要 `.value` | 直接访问属性，不需要 `.value` |
> | 重新赋值 | 可以整个替换 `count.value = 5` | 不能整个替换，会丢失响应式 |
> | 解构 | 解构后仍保持响应式 | 直接解构会丢失响应式，需要 `toRefs()` |
>
> **核心区别**：
>
> 1. **基本类型**：`reactive(0)` 会报错，只能用 `ref(0)`。ref 对基本类型通过 `.value` 的 getter/setter 实现响应式
> 2. **重新赋值**：`reactive` 返回的是 Proxy 对象，如果整个替换 `state = newObj`，变量指向了新对象，原来的 Proxy 代理就断了，响应式丢失。ref 替换 `obj.value = newObj` 没问题，因为替换的是 `.value` 的值，ref 本身的 getter/setter 还在
> 3. **解构问题**：`reactive` 对象直接解构 `const { name } = state`，得到的是普通变量，不再是响应式。需要用 `toRefs()` 转换：`const { name } = toRefs(state)`，这样解构出来的每个属性都是 ref
>
> **实际选择**：简单值用 ref，复杂对象也可以用 ref（`ref({ ... })`），内部会自动调用 reactive；需要频繁访问属性不想写 `.value` 时用 reactive。项目中最常见的是 ref 为主，reactive 为辅。

---

### 3.8 Pinia vs Vuex

**Q：Pinia 和 Vuex 的区别？为什么 Vue3 推荐用 Pinia？**

> 1. **去掉了 mutations**：Vuex 的状态修改流程是 `组件 dispatch action → action commit mutation → mutation 修改 state`，必须通过 mutations 同步修改状态，actions 只能做异步操作再 commit mutations。这样设计是为了状态变更可追踪（DevTools 可以记录每次 mutation），但代码很啰嗦——改个简单的 count 都要写 mutation + action。Pinia 去掉了 mutations，直接在 actions 里修改 state，同步异步都能做，代码量减少一半
> 2. **独立 store**：Vuex 是全局大 store + modules 嵌套，子模块要通过 `namespaced: true` 避免命名冲突，访问时写 `store.dispatch('user/login')`，嵌套深了路径很长。Pinia 是多个独立 store，每个 store 用 `defineStore('user', ...)` 定义，按需引入 `const userStore = useUserStore()`，没有嵌套，天然 tree-shakable
> 3. **TypeScript 支持**：Pinia 天然支持 TS，state/getters/actions 都有完整类型推导；Vuex 的 state 和 getters 需要手动声明类型，dispatch/commit 的字符串参数没有类型提示，容易写错
> 4. **更轻量**：Pinia 约 1KB，Vuex 约 6KB
> 5. **支持 Composition API 风格**：defineStore 支持 Options API（state/getters/actions）和 Setup API（用 ref 定义 state、computed 定义 getters、普通函数定义 actions）两种写法，Setup 写法和 Vue3 的 `<script setup>` 风格一致
> 6. **开发者体验**：自带 DevTools 支持，可以查看 store 状态和时间旅行调试；支持 HMR（Hot Module Replacement）热更新——修改 store 代码后页面不刷新，store 状态自动更新，开发时不用重新填写表单、重新登录，体验更流畅

---

### 3.8 interface vs type

**Q：TypeScript 里 interface 和 type 的区别？**

> 1. **声明合并**：interface 可重复声明自动合并，type 重复声明报错
> 2. **继承方式**：interface 用 `extends` 继承，支持多继承 `interface A extends B, C {}`；type 用交叉类型 `type A = B & C`
> 3. **联合类型**：type 可定义 `type A = B | C`，interface 不行
> 4. **基本类型别名**：type 可以 `type ID = string | number`，interface 只能描述对象结构
> 5. **高级类型**：type 支持映射类型、条件类型，interface 不支持
>
> 选型：对象结构用 interface（可扩展），联合类型/工具类型/别名用 type

**追问：对象 key 和 value 都有类型要求？**

> 索引签名：`interface Obj { [key: string]: number }`，表示 key 是 string，value 是 number

---

## 四、算法

### 4.1 并发请求池

**Q：实现并发请求池，每次最多并发 N 个请求**

```javascript
function limitRequest(urls, limit) {
  const result = []
  const queue = [...urls]
  let running = 0

  return new Promise((resolve) => {
    function run() {
      if (queue.length === 0 && running === 0) {
        resolve(result)
        return
      }

      while (queue.length > 0 && running < limit) {
        const url = queue.shift()
        const index = urls.indexOf(url)
        running++

        fetch(url)
          .then((res) => res.json())
          .then((data) => {
            result[index] = data
          })
          .catch((err) => {
            result[index] = err
          })
          .finally(() => {
            running--
            run()
          })
      }
    }
    run()
  })
}
```

要点：`running` 必须 `let`；while 条件 `running < limit`；`res.json()` 别忘括号；`finally` 里递归 `run()` 是关键

---

## 五、反问环节

**推荐问题**：

1. "岗位描述里提到大模型在客服场景的落地，能具体说说团队在探索什么方向吗？实习生能参与吗？"（直接呼应 JD）
2. "客服系统作为 B 端复杂应用，微前端架构是怎么设计的？模块之间怎么通信和隔离？"（展示技术视野）
3. "团队的技术栈和工程化体系是怎样的？实习生主要负责哪类需求？"（务实）
4. "团队对新人有什么培养机制？比如 Code Review、技术分享"（展示学习态度）

---

## 六、快手高频考点速查

| 考点 | 出现频次 | 掌握程度 |
|---|---|---|
| Vue3 响应式原理 | ⭐⭐⭐⭐⭐ | ✅ |
| SSE / WebSocket 区别 | ⭐⭐⭐⭐ | ✅ |
| 事件循环（宏任务/微任务） | ⭐⭐⭐⭐ | ⚠️ 需练输出题 |
| 类型判断（typeof 坑） | ⭐⭐⭐⭐ | ⚠️ 需背诵 |
| interface vs type | ⭐⭐⭐ | ⚠️ 需背诵 |
| 闭包 | ⭐⭐⭐ | ✅ |
| computed 原理 | ⭐⭐⭐ | ✅ |
| Vue2 数组监听 | ⭐⭐⭐ | ⚠️ 需补 |
| 并发请求池 | ⭐⭐⭐ | ⚠️ 代码细节 |
| JWT 鉴权 | ⭐⭐ | ⚠️ 需背诵 |
| Docker 部署 | ⭐⭐ | ⚠️ 需背诵 |
| Pinia vs Vuex | ⭐⭐ | ⚠️ 需背诵 |
| AI 工具使用 | ⭐⭐⭐⭐ | ⚠️ 需背诵 |
| RAG 原理 | ⭐⭐⭐ | ⚠️ 需背诵 |

---

## 七、第二轮模拟面试新增题目

### 7.1 Tree-shaking 与按需引入

**Q：如果 element-plus 整个库都分包了，但只用了几个组件，打包体积会不会很大？怎么处理？**

> 确实会很大。解决方案有两个层面：
>
> 1. **Tree-shaking**：Vite 底层用 Rollup，天然支持 Tree-shaking。只要用 ES Module 的 `import { Button, Input } from 'element-plus'` 方式导入，Rollup 会自动把未使用的组件摇掉，只打包用到的部分
> 2. **自动按需导入插件**：用 `unplugin-vue-components` + `unplugin-auto-import`，配置后在模板里直接写 `<el-button>` 就行，不需要手动 import，插件会自动按需导入对应的组件和样式
>
> 所以实际上，只要项目用了 ES Module 导入 + Vite 的 Tree-shaking，manualChunks 分出来的 element-plus chunk 里只包含用到的组件，不会是整个库。

---

### 7.2 虚拟 DOM

**Q：Vue 的虚拟 DOM 是什么？解决什么问题？Vue3 有什么改进？**

> 虚拟 DOM 是用 JS 对象描述真实 DOM 结构（VNode），核心作用是减少 DOM 操作——每次 diff 只比较新旧 VNode，算出差异后按需更新真实 DOM。虚拟 DOM 还实现了跨平台渲染（Vue3 的 `createRenderer` 可以自定义渲染器）。
>
> Vue3 的虚拟 DOM 改进：
>
> 1. **静态提升**：静态节点只创建一次，后续更新时直接复用，不参与 diff
> 2. **PatchFlags**：编译时标记动态节点，运行时只检查有标记的部分，静态内容直接跳过
> 3. **Block Tree**：每个 Block 只跟踪内部的动态节点，diff 时按 Block 粒度比较，进一步缩小范围
>
> 虚拟 DOM 不是比原生操作更快，而是提供了一个合理的性能平衡点：比手动操作 DOM 更省心，比重渲染整个组件更高效。

---

### 7.3 RAG 检索增强生成

**Q：RAG 是什么？你的项目里 RAG 是怎么设计的？知识库更新了怎么同步？**

> RAG（Retrieval-Augmented Generation）是检索增强生成，核心思路是在大模型生成回答前，先从知识库中检索相关内容，把检索结果作为上下文拼接到 Prompt 中，让模型的回答基于真实数据，减少幻觉。
>
> **RAG 的流程**：
>
> 1. **离线阶段**：将知识库文档分块（Chunk），对每个块做 Embedding 向量化，存入向量数据库
> 2. **在线阶段**：用户提问 → 对问题做 Embedding → 在向量数据库中检索最相似的文档块 → 将检索结果拼接为上下文 → 连同问题一起送入大模型生成回答
>
> **知识库更新**：当知识库文件变更时，需要对变更的文档重新分块和 Embedding，更新向量数据库中对应的向量。可以采用增量更新策略——只处理变更的部分，而不是全量重建。
>
> **降级策略**：如果 Embedding 服务异常，可以用本地哈希向量检索做降级，虽然精度不如语义检索，但能保证基本可用。

---

### 7.4 EventEmitter 发布订阅

**Q：手写 EventEmitter，支持 on、emit、off**

```javascript
class EventEmitter {
  constructor() {
    this.events = {}
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  emit(event, ...args) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(...args))
    }
  }

  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    }
  }
}
```

核心思路：对象存事件名 → 回调数组的映射。on 注册，emit 遍历执行，off 过滤移除

---

### 7.5 HTTP vs HTTPS

**Q：HTTP 和 HTTPS 的区别？HTTPS 怎么加密的？**

> | | HTTP | HTTPS |
> |---|---|---|
> | 传输 | 明文 | 加密 |
> | 端口 | 80 | 443 |
> | 证书 | 不需要 | 需要 CA 证书 |
>
> **HTTPS 加密流程（TLS 握手）**：
>
> 1. 客户端发送支持的加密算法列表 + 随机数 A
> 2. 服务端返回选定的加密算法 + 证书 + 随机数 B
> 3. 客户端验证证书是否可信（CA 签名），生成预主密钥，用证书里的公钥加密后发给服务端
> 4. 服务端用私钥解密得到预主密钥
> 5. 双方用随机数 A + 随机数 B + 预主密钥，计算出对称密钥
> 6. 后续通信用对称密钥加密
>
> 核心思路：**非对称加密协商密钥保证安全，对称加密通信保证效率**。CA 证书用于验证服务器身份，防止中间人攻击。

---

### 7.6 浏览器缓存

**Q：强缓存和协商缓存分别是什么？304 代表什么？**

> ⚠️ 注意区分：localStorage / sessionStorage / Cookie 是**本地存储**（JS API），强缓存/协商缓存是 **HTTP 缓存**（浏览器和服务器之间的缓存协商），两者完全不同！
>
> **强缓存**：浏览器直接使用本地缓存，不发送请求。通过响应头控制：
> - `Cache-Control: max-age=3600`（优先级更高，单位秒）
> - `Expires: Wed, 21 Oct 2026 07:28:00 GMT`（HTTP/1.0，绝对时间）
>
> 强缓存命中时，状态码是 **200（from cache）**，不产生网络请求。
>
> **协商缓存**：强缓存过期后，浏览器向服务器询问资源是否变化。通过请求头/响应头配对控制：
> - `Last-Modified` / `If-Modified-Since`：基于修改时间
> - `ETag` / `If-None-Match`：基于内容哈希（优先级更高，更精确）
>
> 协商缓存命中时，服务器返回 **304 Not Modified**，不带响应体，浏览器使用本地缓存。没命中则返回 **200** + 新资源。
>
> **流程**：请求资源 → 检查强缓存是否过期 → 未过期直接用（200 from cache）→ 过期则发协商缓存请求 → 服务器判断是否变化 → 304 用本地 / 200 返回新资源
>
> **记忆口诀**：强缓存不问服务器，协商缓存问了再用；Cache-Control 优先于 Expires，ETag 优先于 Last-Modified

---

### 7.7 key 的作用

**Q：Vue 中 key 的作用？为什么不能用 index 作为 key？**

> key 的作用是在 Vue 的 diff 算法中作为节点的**唯一标识**，帮助判断新旧 VNode 是否是同一个节点，决定是复用还是销毁重建。
>
> **为什么不能用 index**：当列表发生插入、删除、排序时，index 会变化，但 key 变了 Vue 就认为是不同节点，会导致两个问题：
>
> 1. **状态错乱**：比如待办列表每项有输入框，用 index 作 key，删除第一项后，第二项的 index 变成 0，Vue 会把原来第一项的输入框状态复用到第二项上，内容错乱
> 2. **性能浪费**：本来可以复用的节点，因为 key 变了被销毁重建，产生不必要的 DOM 操作
>
> **正确做法**：用数据的唯一标识（如 `item.id`）作为 key。特殊情况：纯静态列表不会增删排序、也没有组件状态，用 index 也没问题。

---

### 7.8 LocalStorage 超出容量

**Q：会话数据不断增长，LocalStorage 超出容量上限怎么办？**

> LocalStorage 一般只有 **5MB** 限制，超出会抛出异常。解决方案：
>
> 1. **只存必要数据**：LocalStorage 只存最近 N 条消息或摘要，完整历史放服务端
> 2. **LRU 策略淘汰旧数据**：设定上限（如 3MB），接近上限时删除最旧的会话
> 3. **数据压缩**：用 `lz-string` 库压缩 JSON 字符串，压缩率 50%-70%，但只是延缓超限
> 4. **分级存储策略**：当前会话 → 内存（Pinia store）；最近会话 → LocalStorage；历史归档 → 服务端数据库
> 5. **IndexedDB 替代方案**：容量远大于 LocalStorage（通常几百 MB），支持结构化数据和索引查询

---

### 7.9 Git 分支管理与撤回

**Q：多人协作时 Git 分支怎么管理？提交了有 bug 的代码怎么撤回？**

> **分支管理（Git Flow）**：
> - `main/master`：生产分支，只接受合并
> - `develop`：开发分支，日常集成
> - `feature/xxx`：功能分支，从 develop 拉出，完成后提 PR 合并回 develop
> - `hotfix/xxx`：紧急修复分支，从 main 拉出，修复后合并回 main 和 develop
>
> **撤回代码分两种情况**：
>
> **1. 还没 push（只在本地）**：用 `git reset`
> - `git reset --soft HEAD~1`：回退提交，保留修改在暂存区
> - `git reset --hard HEAD~1`：回退提交，丢弃所有修改（慎用）
>
> **2. 已经 push 到公共分支**：用 `git revert`
> - `git revert <commit-hash>`：生成新提交来撤销指定提交的修改，不改变历史
> - 公共分支**绝对不能用 reset**，会改变提交历史，其他人本地会冲突
>
> **记忆口诀**：没 push 用 reset，已 push 用 revert；公共分支永远不要 reset

---

### 7.10 CSS 盒模型

**Q：标准盒模型和怪异盒模型有什么区别？怎么切换？**

> **标准盒模型（content-box）**：`width` 只包含内容区域。实际总宽度 = width + padding + border + margin。设置 `width: 100px; padding: 10px; border: 5px`，实际宽度 = 100 + 10×2 + 5×2 = **130px**
>
> **怪异盒模型（border-box）**：`width` 包含内容 + padding + border。设置同样的值，实际宽度就是 **100px**，内容区域自动缩小
>
> 切换：`box-sizing: content-box`（默认）/ `box-sizing: border-box`
>
> 实际开发推荐用 border-box，设置 width 后不用担心 padding 和 border 撑大元素。全局设置：
> ```css
> *, *::before, *::after {
>   box-sizing: border-box;
> }
> ```
>
> **记忆口诀**：content-box 的 width 只是内容，border-box 的 width 包一切

---

### 7.11 从输入 URL 到页面渲染

**Q：从输入 URL 到页面渲染出来，中间发生了什么？**

> 1. **URL 解析**：浏览器解析 URL 的协议、域名、端口、路径，检查合法性，补全默认值
> 2. **缓存判断**：先检查浏览器是否有强缓存（Cache-Control / Expires），命中则直接用本地资源，不发请求
> 3. **DNS 解析**：将域名解析为 IP 地址。查找顺序：浏览器缓存 → 系统缓存 → 路由器缓存 → ISP DNS → 递归查询
> 4. **TCP 三次握手**：客户端发 SYN → 服务端回 SYN+ACK → 客户端发 ACK
> 5. **TLS 握手**（HTTPS）：协商加密算法、验证证书、交换密钥，建立安全连接
> 6. **发送 HTTP 请求**：构建请求报文（方法、URL、Headers、Cookie 等），发送到服务器
> 7. **服务器处理并响应**：服务器处理请求，返回状态码 + 响应头 + 响应体。协商缓存命中返回 304
> 8. **浏览器解析渲染**：
>    - 解析 HTML → 构建 DOM 树
>    - 解析 CSS → 构建 CSSOM 树
>    - DOM + CSSOM → 合成渲染树（Render Tree）
>    - 布局（Layout）：计算每个节点的位置和大小
>    - 绘制（Paint）：将渲染树转换为像素绘制到屏幕
>    - 合成（Composite）：将不同图层合成最终画面
> 9. **执行 JS**：遇到 `<script>` 会阻塞 HTML 解析，执行完 JS 后再继续（除非 async/defer）
>
> **记忆口诀**：解析 URL → 查缓存 → DNS → TCP 三次握手 → TLS 握手 → 发请求 → 收响应 → 构建 DOM/CSSOM → 渲染树 → 布局 → 绘制 → 合成

---

### 7.12 原型与原型链

**Q：原型和原型链是什么？原型链的顶端是什么？**

> 每个函数都有一个 `prototype` 属性（显式原型），指向函数的原型对象。每个对象都有一个 `__proto__` 属性（隐式原型），指向其构造函数的 `prototype`。
>
> 当访问对象的属性时，先在对象自身找，找不到就沿 `__proto__` 向上查找，直到找到或到达链的末端，这种逐级查找的机制就是**原型链**。
>
> 链路示例：`实例.__proto__` → `构造函数.prototype` → `Object.prototype` → `null`
>
> 原型链的顶端是 `Object.prototype`，它的 `__proto__` 指向 `null`，`null` 是原型链的终点，查找到这里停止。

---

## 八、第二轮面试新增重点复习

| 考点 | 优先级 | 备注 |
|---|---|---|
| URL 到页面渲染 | ⭐⭐⭐⭐⭐ | 必背，快手高频 |
| 浏览器缓存（强缓存/协商缓存） | ⭐⭐⭐⭐⭐ | 和本地存储区分开 |
| 盒模型 | ⭐⭐⭐ | content-box vs border-box 的 width 区别 |
| RAG 流程 | ⭐⭐⭐⭐ | 即使后端做的也要理解 |
| Tree-shaking + 按需导入 | ⭐⭐⭐ | 和性能优化强相关 |
| Git 撤回 | ⭐⭐⭐ | 没 push 用 reset，已 push 用 revert |
| EventEmitter | ⭐⭐⭐ | 快手手撕高频题 |
| LocalStorage 超限 | ⭐⭐⭐ | 分级存储 + LRU |
| 原型链 | ⭐⭐⭐ | 链路要能画出来 |
| 虚拟 DOM | ⭐⭐⭐ | 静态提升 + PatchFlags |

---

## 九、JD 遗漏知识点补充

### 9.1 TypeScript 类型系统深入

**Q：TypeScript 的泛型是什么？怎么用？举几个常用的工具类型？**

> 泛型是类型的参数化，让函数、接口或类不预先指定具体类型，而在使用时再确定，提高代码的复用性和类型安全性。
>
> ```typescript
> function identity<T>(value: T): T {
>   return value
> }
> identity<string>('hello')
> identity<number>(123)
> ```
>
> **常用工具类型**：
>
> - `Partial<T>`：将 T 的所有属性变为可选
> - `Required<T>`：将 T 的所有属性变为必选
> - `Readonly<T>`：将 T 的所有属性变为只读
> - `Pick<T, K>`：从 T 中选取部分属性
> - `Omit<T, K>`：从 T 中排除部分属性
> - `Record<K, V>`：构造 key 为 K、value 为 V 的对象类型
>
> ```typescript
> interface User {
>   id: number
>   name: string
>   age: number
> }
>
> type UserPartial = Partial<User>
> type UserName = Pick<User, 'id' | 'name'>
> type UserWithoutAge = Omit<User, 'age'>
> type UserMap = Record<string, User>
> ```

**Q：any、unknown、never 的区别？**

> - **any**：放弃类型检查，任何操作都可以，相当于回到 JS，不安全
> - **unknown**：类型安全的 any，可以接收任何值，但使用前必须做类型缩小（如 `typeof`、`instanceof`），否则不允许操作
> - **never**：表示永远不会有值的类型，比如抛出异常的函数、不可能进入的分支
>
> ```typescript
> let a: any = 'hello'
> a.toFixed() // 不报错，但运行时可能出错
>
> let b: unknown = 'hello'
> b.toFixed() // 报错，unknown 类型不能直接操作
> if (typeof b === 'number') {
>   b.toFixed() // OK，类型缩小后可以操作
> }
>
> function throwError(msg: string): never {
>   throw new Error(msg)
> }
> ```

---

### 9.2 微前端架构

**Q：谈谈微前端架构，为什么需要它？常用的方案有哪些？**

> **为什么需要微前端**：
>
> 随着业务发展，前端应用会变成"巨石应用"——代码量巨大、构建慢、多人协作冲突多、一个小改动就要整个应用重新部署。微前端的核心价值就是解决这些问题：
>
> 1. **独立开发部署**：不同团队各自负责自己的子应用，互不阻塞，一个模块出问题不影响其他模块
> 2. **技术栈无关**：子应用可以用不同框架（Vue2、Vue3、React），老项目不用重写就能接入
> 3. **增量升级**：老系统不需要一次性重构，可以逐个模块迁移到新架构
> 4. **独立运行时**：子应用之间 JS/CSS 隔离，不会互相污染
>
> **常用方案对比**：
>
> | 方案 | JS 隔离方式 | CSS 隔离方式 | 子应用改造成本 | 特点 |
> |---|---|---|---|---|
> | **qiankun** | Proxy 代理 window（JS 沙箱） | Shadow DOM / scoped CSS | 中等，需导出生命周期 | 最主流，社区成熟 |
> | **wujie** | iframe（天然沙箱） | WebComponent + iframe | 低，几乎不用改造 | 隔离最彻底，但 iframe 有通信限制 |
> | **Module Federation** | 无沙箱，共享模块 | 无隔离 | 低，Webpack 5 原生支持 | 适合模块共享，不适合强隔离场景 |
> | **iframe** | iframe 天然隔离 | iframe 天然隔离 | 极低 | 最简单，但体验差（刷新/前进后退/弹窗问题） |
>
> **qiankun 核心机制**：
> - 基于 single-spa 封装，主应用作为容器，子应用通过注册路由挂载
> - 子应用必须导出三个生命周期：`bootstrap`（初始化）、`mount`（挂载）、`unmount`（卸载）
> - JS 沙箱：通过 Proxy 代理 window，子应用对 window 的操作被拦截，卸载时恢复原状
> - CSS 隔离：Shadow DOM（最彻底但有限制）或运行时 scope 前缀
>
> **wujie 核心机制**：
> - 用 iframe 做 JS 隔离，天然沙箱，比 Proxy 更彻底
> - 用 WebComponent（custom element）做 CSS 隔离和渲染容器
> - 子应用几乎不需要改造，降低了接入成本
> - 通过 `postMessage` 做主子应用通信
>
> **我的理解**：虽然我没有微前端的实战经验，但我理解它的核心价值——客服系统作为 B 端复杂应用，不同业务模块（工单管理、在线聊天、知识库、数据看板）可以拆成子应用独立开发部署，降低耦合度。如果用 qiankun，每个模块就是一个 Vue3 子应用；如果用 wujie，甚至可以接入老的技术栈。这也是我对这个岗位感兴趣的原因之一。
-------
> 微前端就是把一个大应用拆成多个小应用，每个可以独立开发、独立部署。主要解决的是巨石应用的问题——代码多了构建慢、多人协作冲突、改一个模块整个应用都要重新部署。
>
>常用的方案有几种：最主流的是 qiankun，基于 single-spa，用 Proxy 代理 window 做 JS 沙箱，Shadow DOM 或 scoped CSS 做样式隔离，子应用需要导出 bootstrap、mount、unmount 三个生命周期，改造成本中等；第二种是 wujie，用 iframe 做 JS 隔离，天然沙箱比 Proxy 更彻底，WebComponent 做渲染，子应用几乎不用改造；最简单的就是直接用 iframe，隔离最彻底但用户体验差，弹窗、刷新、前进后退都有问题。
>
>虽然我没有微前端的实战经验，但我理解它的价值。像咱们客服系统这种 B 端复杂应用，工单管理、在线聊天、数据看板这些模块完全可以拆成子应用独立开发部署。如果用 qiankun，每个模块就是一个 Vue3 子应用；如果需要接入老技术栈，wujie 改造成本更低。



---

### 9.3 数据可视化基本概念

**Q：ECharts 和 D3 的区别？什么场景选哪个？**

> **ECharts**：配置驱动的图表库，开箱即用，通过 option 配置就能生成常见图表（折线图、柱状图、饼图等），上手快，适合标准化的业务报表和数据看板。
>
> **D3**：数据驱动的 DOM 操作库，更底层，需要手动绑定数据到 SVG/Canvas 元素，灵活度极高，适合定制化、交互复杂的可视化场景（如力导向图、地理信息可视化）。
>
> **选型**：标准图表用 ECharts（开发效率高），定制化需求用 D3（灵活度高）。
>
> 在客服系统场景中，业务数据可视化（如工单统计、客服绩效）用 ECharts 就够了；如果需要复杂的交互式图表再考虑 D3。

---

### 9.4 浏览器渲染机制深入

**Q：什么是重排（Reflow）和重绘（Repaint）？怎么优化？**

> **重排（Reflow）**：当 DOM 的几何属性（位置、大小）变化时，浏览器需要重新计算布局，这个过程叫重排。触发重排的操作：添加/删除 DOM 元素、修改 width/height/margin/padding、修改字体大小、读取 offsetWidth/scrollTop 等属性（强制同步布局）。
>
> **重绘（Repaint）**：当 DOM 的外观样式（颜色、背景、阴影等）变化但不影响布局时，浏览器只需要重新绘制该元素，这个过程叫重绘。触发重绘：修改 color/background/visibility/box-shadow 等。
>
> **关系**：重排一定会触发重绘，重绘不一定触发重排。重排的代价远大于重绘。
>
> **优化策略**：
>
> 1. **批量修改 DOM**：用 `documentFragment` 或 `display: none` 隐藏后批量修改，再显示
> 2. **避免频繁读取布局属性**：读取 offsetWidth 等会强制同步布局，应缓存结果
> 3. **使用 CSS transform**：`transform` 和 `opacity` 由合成层处理，不触发重排重绘
> 4. **使用 requestAnimationFrame**：将 DOM 操作集中在一帧内完成
> 5. **CSS 层面优化**：避免使用 table 布局，减少嵌套层级

---

### 9.5 Webpack vs Vite 对比

**Q：Webpack 和 Vite 的核心区别是什么？**

> | | Webpack | Vite |
> |---|---|---|
> | 开发启动 | 全量打包后启动，项目越大越慢 | 不打包，利用浏览器原生 ESM 按需加载，秒启动 |
> | HMR | 全量打包后热更新 | 基于 ESM 的精确 HMR，只更新修改的模块 |
> | 构建工具 | 自身完成所有工作（JS 编写） | 开发用 esbuild（Go，极快），生产用 Rollup |
> | 配置复杂度 | 配置繁琐，需要各种 loader/plugin | 开箱即用，配置简洁 |
> | 生态成熟度 | 生态非常成熟，插件丰富 | 生态在快速成长，部分 Webpack 插件不兼容 |
>
> **Vite 为什么快**：开发模式下不打包，浏览器直接通过 ESM import 模块，Vite 只在请求时按需编译，所以冷启动极快。而 Webpack 需要先打包整个应用再启动。
>
> **Webpack 的优势**：生态成熟、loader/plugin 丰富、对特殊场景（如微前端 qiankun）支持更好、Code Splitting 和持久化缓存更灵活。

**Q：Webpack 的构建流程是怎样的？你做过哪些打包优化？**

> ⚠️ 回答策略：我的项目用的是 Vite，没有 Webpack 实战经验，但我理解它的构建流程和优化思路，和我做过的 Vite 优化思路是相通的。
>
> **Webpack 构建流程**：
>
> 1. **初始化**：读取 `webpack.config.js`，合并命令行参数，创建 Compiler 对象
> 2. **编译**：从入口（entry）出发，调用 loader 对不同类型文件做转换（如 babel-loader 转 JS、css-loader 处理 CSS），递归解析依赖关系，构建模块依赖图（Module Graph）
> 3. **输出**：根据依赖图将模块组装成 Chunk，再通过插件（Plugin）做优化处理，最终输出到 dist 目录
>
> 核心概念：**Entry → Loader 转换 → 依赖图 → Chunk → Plugin 优化 → Output**
>
> **打包优化思路**（和 Vite 优化思路对应）：
>
> | 优化方向 | Webpack 方案 | Vite 对应方案 |
> |---|---|---|
> | 代码分割 | SplitChunksPlugin | manualChunks |
> | 按需加载 | 动态 import() | 动态 import() |
> | Tree-shaking | mode: production 自动开启 | Rollup 天然支持 |
> | 缩小构建范围 | loader 的 include/exclude | 不需要（按需编译） |
> | 缓存 | cache: { type: 'filesystem' } | 天然快（不打包） |
> | 压缩 | TerserPlugin / CssMinimizerPlugin | esbuild 压缩 |
> | 持久化缓存 | contenthash 文件名 | 同样用 hash 文件名 |
>
> **我实际做过的优化**（Vite 项目）：路由懒加载、manualChunks 手动分包、图片懒加载、LCP 从 3.5s 优化到 2.5s。这些优化的核心思路——减少首屏加载体积、利用缓存、按需加载——在 Webpack 里是一样的，只是配置方式不同。

> **记忆口诀**：Webpack 流程 = 初始化 → 编译（Loader 转换 + 依赖图）→ 输出（Chunk + Plugin）；优化思路和 Vite 相通，只是配置不同

---

## 十、JD 全覆盖知识点速查

| JD 关键词 | 对应题目 | 掌握程度 |
|---|---|---|
| Vue3 生态 | 3.5 响应式、3.6 computed、3.7 Pinia、7.2 虚拟DOM、7.7 key | ✅ |
| TypeScript | 3.8 interface vs type、9.1 泛型/工具类型/any/unknown/never | ⚠️ 需背诵 9.1 |
| 微前端 | 9.2 微前端概念（qiankun/wujie） | ⚠️ 需背诵概念 |
| 数据可视化 | 9.3 ECharts vs D3 | ⚠️ 需背诵概念 |
| 浏览器渲染机制 | 7.11 URL→渲染、9.4 重排重绘 | ⚠️ 需背诵 9.4 |
| Webpack/Vite | 2.1 manualChunks/esbuild/Rollup、9.5 Webpack vs Vite | ⚠️ 需背诵 9.5 |
| 性能优化 | 2.1 LCP 优化、7.1 Tree-shaking | ✅ |
| 前端工程化 | 2.5 Docker、2.4 Axios、7.9 Git | ✅ |
| AI Coding | 2.7 AI 工具使用、7.3 RAG | ⚠️ 需背诵 RAG |
| 数据结构与算法 | 4.1 并发池、7.4 EventEmitter | ⚠️ 需练习手撕 |
| B 端复杂应用 | 2.1-2.4 项目经验 | ✅ |

---

### 9.6 Vite 常用配置

**Q：你 Vite 常用哪些配置？**

> 我项目中常用的 Vite 配置主要有以下几类：
>
> **1. 路径别名**：简化 import 路径
>
> ```typescript
> resolve: {
>   alias: {
>     '@': path.resolve(__dirname, 'src')
>   }
> }
> ```
>
> **2. 开发服务器代理**：解决开发环境跨域
>
> ```typescript
> server: {
>   proxy: {
>     '/api': {
>       target: 'http://localhost:3000',
>       changeOrigin: true,
>       rewrite: (path) => path.replace(/^\/api/, '')
>     }
>   }
> }
> ```
>
> **3. 构建分包（manualChunks）**：前面讲过的手动分包策略
>
> ```typescript
> build: {
>   rollupOptions: {
>     output: {
>       manualChunks(id) {
>         if (id.includes('node_modules')) {
>           if (id.includes('element-plus')) return 'vendor-element-plus'
>           if (id.includes('@editorjs')) return 'vendor-editorjs'
>           if (id.includes('three') || id.includes('vanta')) return 'vendor-animation'
>           if (id.includes('lodash-es')) return 'vendor-lodash'
>           return 'vendor'
>         }
>       }
>     }
>   }
> }
> ```
>
> **4. CSS 预处理器**：支持 SCSS/Less
>
> ```typescript
> css: {
>   preprocessorOptions: {
>     scss: {
>       additionalData: `@import "@/styles/variables.scss";`
>     }
>   }
> }
> ```
>
> **5. 插件配置**：Vue 插件、自动导入等
>
> ```typescript
> plugins: [
>   vue(),
>   AutoImport({ resolvers: [ElementPlusResolver()] }),
>   Components({ resolvers: [ElementPlusResolver()] })
> ]
> ```
>
> **6. 环境变量**：通过 `.env` 文件 + `import.meta.env` 管理
>
> ```typescript
> // .env.development
> VITE_API_BASE_URL=http://localhost:3000
>
> // 代码中使用
> const baseURL = import.meta.env.VITE_API_BASE_URL
> ```

---

### 9.7 Webpack 实现类似 Vite 的按需加载

**Q：Webpack 要实现 Vite 一样的按需加载怎么实现？**

> Vite 开发模式的核心优势是**不打包，利用浏览器原生 ESM 按需加载**。Webpack 要实现类似效果，主要有以下方案：
>
> **1. Code Splitting + 动态 import**：Webpack 原生支持
>
> ```javascript
> const Home = () => import('./views/Home.vue')
> const About = () => import('./views/About.vue')
> ```
>
> Webpack 会将动态 import 的模块拆分成独立 chunk，按需加载。这是最基础的按需加载方式，Vite 的路由懒加载也是同样的原理。
>
> **2. SplitChunksPlugin**：Webpack 的自动分包
>
> ```javascript
> optimization: {
>   splitChunks: {
>     chunks: 'all',
>     cacheGroups: {
>       vendor: {
>         test: /node_modules/,
>         name: 'vendor',
>         chunks: 'all'
>       }
>     }
>   }
> }
> ```
>
> 类似 Vite 的 manualChunks，将第三方依赖拆成独立 chunk 利用缓存。
>
> **3. Module Federation（模块联邦）**：Webpack 5 的特性，可以实现跨应用的模块共享和按需加载，类似微前端的效果。一个应用可以动态加载另一个应用暴露的模块，不需要打包到一起。
>
> **4. 开发模式优化**：Webpack 5 也做了改进
> - **持久化缓存**（`cache: { type: 'filesystem' }`）：二次启动速度大幅提升
> - **lazy compilation**：只编译当前访问的页面，类似 Vite 的按需编译
>
> ```javascript
> experiments: {
>   lazyCompilation: true
> }
> ```
>
> **核心区别**：Vite 开发模式是真正的"不打包"，浏览器直接请求 ESM 模块；Webpack 即使有 lazy compilation，本质上还是要经过编译打包流程，只是范围缩小了。所以 Vite 的冷启动速度优势是架构层面的，Webpack 无法完全复制。
