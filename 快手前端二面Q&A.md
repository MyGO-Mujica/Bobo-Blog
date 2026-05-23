# 快手前端研发实习生（用户体验方向）— 二面 Q&A

---

## 一、项目深入追问

### 1.1 双缓冲区机制深入

**Q：为什么要设计双缓冲区？直接收到数据就渲染不行吗？**

> 双缓冲区有两个：**SSE 缓冲区**和**渲染缓冲区**，解决不同的问题。
>
> **SSE 缓冲区**：解决消息包不完整的问题。SSE 格式是 `data: xxx\n\n`，网络波动可能导致一个消息包被截断成两段，所以先放到 SSE 缓冲区，等凑成完整的 `data:` 消息再提取内容。
>
> **渲染缓冲区**：解决输出节奏问题。网络波动导致数据到达不均匀，有时迟迟不来，有时一来一大段，体验很差。所以把解析后的内容放入渲染缓冲区，用 `setInterval` 固定间隔（如 50ms）取一批数据 flush 到渲染层，制造出均匀的打字机效果。
>
> 直接收到就渲染会导致：1) 不完整的 SSE 消息解析出错；2) 输出节奏忽快忽慢，用户体验差。

**Q：如果 AI 生成速度很快，缓冲区积压了大量内容，用户会不会等很久？**

> 我设置了一个基础的渲染频率，50ms 渲染约 8 个字符。但如果 AI 生成速度很快，缓冲区积压了大量内容，我会做一个**追赶策略**：当缓冲区中的待渲染内容超过一定阈值时，动态增加每次 flush 的字符数，比如从 8 个增加到 16 个甚至 32 个，加快追赶速度；当缓冲区内容减少到正常水平时，再恢复到基础速度。这样既保证了正常情况下的打字机体验，又不会在 AI 生成快时让用户等太久。

---

### 1.2 虚拟列表滚动冲突

**Q：流式输出时，用户上滑查看历史消息，新消息还在生成，怎么处理冲突？**

> 我用 react-virtuoso 的 `followOutput` 属性来监听当前是否处于滚动底部。如果在底部，开启自动滚动跟随，新消息出来就自动滚到底部；如果用户向上滑动查看历史消息，位置不在底部，自动跟随就会关闭，新消息不会强制滚动。直到用户重新滑回底部，或者发送一条新消息时，才会重新开启自动跟随。
>
> 另外，用户上滑时新消息不断生成，我会在底部显示一个"有 N 条新消息"的提示按钮，点击后跳到底部并恢复跟随，提升用户体验。

---

### 1.3 项目最难技术点

**Q：你项目里遇到最难的点是什么？怎么解决的？**

> 最难的技术点是 SSE 流式渲染下的 Markdown 适配。核心问题是 Markdown 的闭合语法（如 `**加粗**`、代码块 ` ``` `）在流式场景下随时可能收到不完整的片段，直接渲染会格式错乱。
>
> 我评估了三个库：marked 和 markdown-it 本质是将 Markdown 转为 HTML 字符串，上手快但在流式场景下有两个问题：1) 未闭合语法会生成错误的 HTML；2) 输出的是字符串不是 React 组件，无法对代码块、图片等节点做细粒度定制。react-markdown 基于 AST 解析，支持将 Markdown 节点渲染成 React 组件，可以对 code、img 等做自定义渲染，比如代码块加复制按钮和语言标签。
>
> 选定 react-markdown 后，我的解决方案是：1) 维护渲染缓冲区控制输出节奏；2) 检测未闭合的代码块，临时补闭合标记；3) 流式结束后兜底完整渲染。最终实现了流畅的打字机效果 + 正确的 Markdown 格式。

---

### 1.4 项目改进

**Q：如果让你重做 AI 对话平台，你会怎么改进？**

> 三个方面：
>
> **1. 状态管理升级**：现在用的 useContext 管理会话状态，但 context 值变化时所有消费组件都会重渲染，会话多了性能会有问题。我会换成 Zustand，它支持选择式订阅，只有用到的数据变化时才重渲染，更适合多会话场景。
>
> **2. 会话持久化**：现在历史上下文存在前端内存里，刷新就没了。我会加一层持久化——当前会话放内存保证性能，历史会话用 LocalStorage 或 IndexedDB 存储，页面刷新后可以从本地恢复。长期考虑应该把完整会话存到服务端数据库，前端只做缓存层。
>
> **3. SSE 封装优化**：现在的流式解析逻辑和业务组件耦合在一起，如果重做我会把 SSE 的连接、解析、缓冲区、中断等逻辑封装成一个自定义 Hook（如 `useSSE`），业务层只关心数据，不关心流式细节，复用性更好。

---

## 二、Vue3 生态（JD 直接要求）

### 2.1 Vite 插件体系

**Q：unplugin-vue-router 和 unplugin-auto-import 有什么用？为什么用？**

> **unplugin-auto-import**：自动导入 API，不需要手动写 import 语句。比如 Vue 的 `ref`、`reactive`、`computed`、`watch`，Vue Router 的 `useRouter`、`useRoute`，Pinia 的 `defineStore` 等，配置后直接在代码中使用，插件会自动在编译时注入 import 语句。
>
> 没有它：每个组件都要写 `import { ref, reactive, computed } from 'vue'`
>
> 有了它：直接用 `ref`、`reactive`，不用写 import
>
> **好处**：1) 减少重复代码，提升开发效率；2) 避免忘记 import 导致报错；3) 统一管理导入来源
>
> **unplugin-vue-router**：基于文件系统自动生成路由。按照约定在 `src/pages/` 目录下创建 Vue 文件，插件会自动根据文件结构生成路由配置，不需要手动写 `router.ts` 里的路由表。
>
> 比如目录结构：
> ```
> src/pages/
>   index.vue        → /
>   about.vue        → /about
>   user/
>     [id].vue       → /user/:id
> ```
>
> 插件自动生成对应的路由，支持动态路由参数。
>
> **好处**：1) 约定优于配置，新增页面只需创建文件；2) 避免路由表和文件不同步；3) 支持动态路由参数
>
> **unplugin-vue-components**：自动按需导入组件，模板里直接写 `<el-button>`，插件自动注入 import 和注册，不需要手动 import Element Plus 组件。配合 Element Plus 的 Resolver，实现真正的按需引入。
>
> **三个插件配合使用的效果**：API 不用 import、组件不用 import、路由不用手写，开发体验大幅提升，代码更简洁。

---

### 2.2 Vue Router：hash vs history

**Q：hash 模式和 history 模式有什么区别？你项目用的哪个？**

> **hash 模式**：URL 中带 `#`，如 `http://xxx.com/#/home`。`#` 后面的内容变化不会触发页面刷新，通过 `hashchange` 事件监听路由变化。优点是部署简单，不需要服务端配置；缺点是 URL 不美观，且 `#` 后面的内容不会发送给服务器，对 SEO 不友好。
>
> **history 模式**：URL 正常，如 `http://xxx.com/home`。用 HTML5 的 `pushState` / `replaceState` 修改 URL 但不刷新页面，通过 `popstate` 事件监听路由变化。优点是 URL 美观，对 SEO 友好；缺点是**部署时需要服务端配置**——所有路由都要指向 index.html，否则刷新页面会 404，因为服务器会去查找 `/home` 对应的文件，但实际不存在。
>
> **我的项目用 history 模式**，因为 URL 更美观。部署时在 Nginx 配置了 `try_files $uri $uri/ /index.html`，所有未匹配的路径都回退到 index.html，交给前端路由处理。

---

### 2.3 组件通信方式

**Q：Vue 的组件通信方式有哪些？B 端复杂应用怎么选？**

> | 方式 | 适用场景 | 特点 |
> |---|---|---|
> | props / emit | 父子组件 | 最基础，单向数据流 |
> | 状态提升 | 兄弟组件 | 提升到共同父组件，简单但层级深时麻烦 |
> | provide / inject | 跨层级 | 祖先→后代，适合配置型数据（主题、权限） |
> | Pinia | 全局共享 | 任意组件，可调试、可追踪、可持久化 |
> | EventBus | 任意组件 | Vue3 不推荐，用mitt替代，但难维护 |
>
> **B 端选型**：父子用 props/emit，配置型数据（主题、权限、国际化）用 provide/inject，业务型数据（用户信息、工单数据）用 Pinia。大部分跨组件通信走 Pinia，因为状态可追踪、DevTools 可调试。

---

### 2.4 provide/inject vs Pinia

**Q：provide/inject 和 Pinia 在跨组件通信上有什么区别？**

> **provide/inject**：层级式通信，祖先组件 provide 数据，后代组件 inject 接收，只能在有层级关系的组件间使用。数据流是**单向的**，适合"配置型"数据——比如主题配置、国际化语言、权限信息，这些数据深层组件都需要但很少变化，不需要 DevTools 调试。
>
> **Pinia**：全局式通信，任何组件都能访问，不受层级限制。状态可追踪、DevTools 可调试、支持持久化，适合"业务型"数据——比如用户信息、工单列表、会话数据，这些数据频繁变化且需要在 DevTools 中调试。
>
> **选型标准**：配置型、只读的、深层嵌套共享 → provide/inject；业务型、可变的、全局共享 → Pinia。比如客服系统中，主题和权限用 provide/inject，工单和用户数据用 Pinia。

---

### 2.5 v-if vs v-show

**Q：v-if 和 v-show 有什么区别？什么场景用哪个？**

> **v-if**：条件为 false 时，DOM 元素完全不渲染（销毁/重建），切换开销大。适合条件不经常变化的场景。
>
> **v-show**：条件为 false 时，DOM 元素渲染但通过 `display: none` 隐藏，切换开销小。适合频繁切换的场景（如 Tab、弹窗）。
>
> **记忆口诀**：v-if 是"真删"，v-show 是"藏起来"；不常切换用 v-if，频繁切换用 v-show

---

### 2.6 NextTick

**Q：nextTick 的作用是什么？原理是怎样的？**

> **作用**：nextTick 是在 DOM 更新完成后执行回调，确保能拿到更新后的 DOM。
>
> **为什么需要**：Vue 的响应式更新是**异步**的。当数据变化时，Vue 不会立刻更新 DOM，而是把更新任务放入一个队列，在"下一个事件循环的微任务"中批量执行。所以修改数据后立刻访问 DOM，拿到的还是旧值，必须用 nextTick 等待 DOM 更新完。
>
> ```javascript
> const count = ref(0)
> count.value++
> console.log(document.getElementById('num').textContent) // 还是 0（旧值）
>
> nextTick(() => {
>   console.log(document.getElementById('num').textContent) // 1（新值）
> })
> ```
>
> **原理**：Vue3 内部维护一个回调队列，nextTick 调用时将回调 push 进去，然后通过 `Promise.resolve().then(flushJobs)` 在微任务中依次执行。如果环境不支持 Promise，则降级为 `MutationObserver` → `setImmediate` → `setTimeout`。
>
> **常见使用场景**：1) 修改数据后需要操作更新后的 DOM（如获取元素高度、聚焦输入框）；2) 在 `created` 生命周期中访问 DOM（此时 DOM 还没挂载）
>
> **记忆口诀**：Vue 更新是异步的，nextTick 是等 DOM 更新完再执行；原理是微任务队列排队，排在 Vue 更新任务后面

---

### 2.7 Keep-alive

**Q：Keep-alive 的作用是什么？B 端使用场景？**

> **作用**：Keep-alive 是 Vue 的内置组件，用于缓存不活动的组件实例，而不是销毁它们。被 Keep-alive 包裹的组件切换时不会被卸载，状态（表单数据、滚动位置等）会被保留，再次切换回来时直接复用缓存的实例。
>
> **属性**：
> - `include`：匹配的组件名会被缓存
> - `exclude`：匹配的组件名不会被缓存
> - `max`：最大缓存实例数，超过时用 LRU 策略淘汰最久没访问的
>
> **生命周期**：被缓存的组件不会触发 unmounted（卸载），而是触发 deactivated（停用）；从缓存激活时触发 activated（激活），而不是 mounted。
>
> **原理**：Keep-alive 内部维护一个缓存对象（Map）和一个 key 数组。组件切换时，如果是离开，将组件的 VNode 存入缓存；如果是进入，先查缓存中有没有，有则直接复用 VNode，没有才创建新实例。`max` 属性通过 LRU（最近最少使用）策略淘汰缓存。
>
> **B 端使用场景**：1) 多页签切换，保留表单填写状态；2) 列表→详情→返回列表，保留筛选条件和滚动位置；3) 复杂表单填到一半切走再回来数据还在

---

## 三、微前端 + 技术选型

### 3.1 微前端架构

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

**🎤 口述版（1-2 分钟）**

> 微前端就是把一个大应用拆成多个小应用，每个可以独立开发、独立部署。主要解决的是巨石应用的问题——代码多了构建慢、多人协作冲突、改一个模块整个应用都要重新部署。
>
> 常用的方案有几种：最主流的是 qiankun，基于 single-spa，用 Proxy 代理 window 做 JS 沙箱，Shadow DOM 或 scoped CSS 做样式隔离，子应用需要导出 bootstrap、mount、unmount 三个生命周期，改造成本中等；第二种是 wujie，用 iframe 做 JS 隔离，天然沙箱比 Proxy 更彻底，WebComponent 做渲染，子应用几乎不用改造；最简单的就是直接用 iframe，隔离最彻底但用户体验差，弹窗、刷新、前进后退都有问题。
>
> 虽然我没有微前端的实战经验，但我理解它的价值。像咱们客服系统这种 B 端复杂应用，工单管理、在线聊天、数据看板这些模块完全可以拆成子应用独立开发部署。如果用 qiankun，每个模块就是一个 Vue3 子应用；如果需要接入老技术栈，wujie 改造成本更低。

---

### 3.2 React vs Vue3 + 客服系统选型

**Q：React 和 Vue3 的核心区别是什么？客服系统你选哪个？**

> **核心区别**：
>
> 1. **响应式原理**：Vue3 用 Proxy 实现数据劫持，数据变了自动触发更新；React 是不可变数据，状态变化必须调用 setState，通过对比新旧虚拟 DOM 决定是否更新。Vue 是"数据驱动，自动更新"，React 是"手动触发，对比更新"
> 2. **组件写法**：Vue3 用 SFC（template + script + style）+ Composition API，模板语法接近 HTML，上手快；React 用 JSX，JS 和 UI 写在一起，更灵活但学习曲线陡
> 3. **更新策略**：Vue3 是组件级精确更新，依赖收集后只更新变化的组件；React 是从触发 setState 的组件开始整棵子树重新渲染，需要手动用 memo、useMemo、useCallback 优化
> 4. **状态管理**：Vue3 官方推荐 Pinia，轻量开箱即用；React 生态选择多（Redux、Zustand、Jotai），需要自己选型
> 5. **生态风格**：Vue 是"官方全家桶"，统一规范；React 是"社区自由组合"，灵活但选择多容易混乱
>
> **客服系统选 Vue3**：1) JD 明确要求 Vue3 生态；2) B 端复杂应用，Vue3 组件级精确更新在复杂表单场景下性能更好；3) 模板语法直观，开发效率高；4) 官方全家桶统一规范，团队协作方便；5) qiankun 对 Vue3 子应用支持成熟。当然 React 也能做，只是在这个场景下 Vue3 更合适。

---

## 四、AI 方向深入

### 4.1 AI Coding 三阶段

**Q：AI 辅助开发可以分成几个阶段？你现在处于哪个阶段？**

> 三个阶段：
>
> **第一阶段：AI 辅助编程** — 利用 AI 做代码补全，或者在网页版 AI 中复制粘贴代码让 AI 帮忙解决问题，属于最基础的使用方式。
>
> **第二阶段：提示词工程** — 通过编写结构化提示词，明确 AI 的角色、提供上下文和目标，用精确的指令让 AI 完成编程任务。比如我在 AI 对话平台项目中，用结构化提示词让 AI 生成 SSE 解析代码，明确角色（前端工程师）、上下文（React + Vite）、输出格式（完整函数 + 原理解释），生成质量比直接问高很多。**我目前处于这个阶段**。
>
> **第三阶段：AI 工作流** — 搭建完整的 AI 工作流，AI 自己生成代码、完成任务、Review 代码、检查 Bug、提交 PR，人只负责维护框架和优化性能。这是我努力的目标。

---

### 4.2 Skill 划分设计

**Q：如果让你给客服系统的开发设计 Skill，你会怎么划分？**

> 按开发流程划分四个 Skill：
>
> **1. 需求澄清 Skill**：输入是产品经理的需求描述，AI 分析需求中的模糊点，生成澄清问题列表，输出结构化的需求文档。比如客服系统要加"工单转接"功能，AI 会问：转接规则是什么？转接后原客服还能看到吗？需要通知用户吗？
>
> **2. 组件生成 Skill**：输入是需求文档 + 项目技术栈（Vue3 + TypeScript + Element Plus），AI 生成组件代码 + 类型定义 + API 接口定义。比如生成一个工单列表组件，包含筛选、分页、状态标签。
>
> **3. 代码 Review Skill**：输入是新代码 + 旧代码上下文，AI 检查是否有 Bug、是否符合项目规范（ESLint 规则）、是否和现有代码冲突，输出 Review 意见和修改建议。
>
> **4. 测试生成 Skill**：输入是组件代码，AI 生成单元测试 + 边界用例，比如工单列表的空数据、加载失败、超长文本等场景。
>
> 每个 Skill 的核心是**输入 → AI 做什么 → 输出**的完整链路。

---

## 五、前端安全

### 5.1 XSS 和 CSRF

**Q：XSS 和 CSRF 分别是什么？怎么防范？**

> **XSS（跨站脚本攻击）**：攻击者将恶意脚本注入到页面中，当其他用户访问时脚本自动执行，可以窃取 Cookie、Token、篡改页面内容。
>
> 三种类型：
> - **存储型**：恶意脚本存入数据库，所有访问该页面的用户都会执行（危害最大）
> - **反射型**：恶意脚本在 URL 参数中，用户点击链接时触发
> - **DOM 型**：前端 JS 不当操作 DOM 导致脚本执行
>
> **防范**：1) 对用户输入做**转义**，将 `<` `>` `"` 等特殊字符转为 HTML 实体；2) 设置 **CSP（Content-Security-Policy）** 响应头，限制只加载指定来源的脚本；3) Cookie 设置 **HttpOnly**，JS 无法读取，防止 XSS 窃取 Cookie；4) 使用框架自带的转义（Vue 的模板语法、React 的 JSX 默认转义）
>
> ---
>
> **CSRF（跨站请求伪造）**：攻击者诱导用户在已登录的网站上执行非本意的操作。比如用户已登录银行网站，访问恶意页面后，恶意页面自动发转账请求，浏览器会自动带上 Cookie，服务器以为是用户本人操作。
>
> **核心区别**：XSS 是注入脚本执行代码，CSRF 是借用用户的身份发请求，不需要注入代码。
>
> **防范**：1) **Token 验证**：请求携带服务端生成的 Token（不放在 Cookie 里），服务端验证 Token 是否合法；2) **Referer/Origin 检查**：服务端验证请求来源是否合法；3) **SameSite Cookie**：设置 Cookie 的 `SameSite=Strict` 或 `Lax`，阻止跨站请求携带 Cookie；4) **验证码**：重要操作加验证码，防止自动提交
>
> **我的项目**：用 JWT Token 放在 Header 里而不是 Cookie，天然防 CSRF（因为 CSRF 只能自动带 Cookie，不能自动带自定义 Header）；同时对用户输入做转义防 XSS。
>
> **记忆口诀**：XSS 是"注入代码执行"，防转义 + CSP + HttpOnly；CSRF 是"借身份发请求"，防 Token + SameSite + Referer 检查

---

### 5.2 跨域

**Q：什么是跨域？怎么解决？你项目怎么处理的？**

> 跨域是浏览器的**同源策略**限制，协议、域名、端口三者任一不同就是跨域，浏览器会拦截跨域请求。注意这是浏览器的限制，不是服务器的。
>
> 解决方案：
>
> 1. **CORS**：服务端在响应头中设置 `Access-Control-Allow-Origin` 等字段，告诉浏览器允许跨域。分两种：简单请求直接发送；非简单请求（如带自定义 Header、PUT/DELETE 方法）会先发 OPTIONS 预检请求，通过后才发正式请求
> 2. **JSONP**：利用 `<script>` 标签不受同源策略限制的特点，只支持 GET，现在基本不用了
> 3. **Nginx 反向代理**：前端请求同源的 Nginx 服务器，Nginx 转发到不同源的后端，浏览器以为是同源请求所以不拦截。生产环境用这个
>
> **我的项目**：开发环境用 Vite 的 `server.proxy` 配置代理，生产环境用 Nginx 反向代理，配置 `proxy_pass` 将 `/api` 路径转发到后端服务。

---

## 六、手撕题

### 6.1 防抖

```javascript
function debounce(fn, delay) {
  let timer = null

  return function(...args) {
    if (timer) clearTimeout(timer)

    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}
```

### 6.2 节流

```javascript
function throttle(fn, delay) {
  let last = 0

  return function(...args) {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn.apply(this, args)
    }
  }
}
```

**记忆口诀**：防抖 = 等你停了再执行（搜索框输入），节流 = 固定频率执行（滚动事件）

---

### 6.3 红绿灯循环函数

```javascript
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function traffic() {
  while (true) {
    console.log('红灯')
    await sleep(3000)

    console.log('黄灯')
    await sleep(1000)

    console.log('绿灯')
    await sleep(3000)
  }
}

traffic()
```

**追问：如何停止红绿灯？**

```javascript
let running = true

async function traffic() {
  while (running) {
    console.log('红灯')
    await sleep(3000)
    if (!running) break

    console.log('黄灯')
    await sleep(1000)
    if (!running) break

    console.log('绿灯')
    await sleep(3000)
  }
}

running = false
```

---

### 6.4 手写 Promise.race

```javascript
Promise.myRace = function (promises) {
  return new Promise((resolve, reject) => {
    promises.forEach(p => {
      Promise.resolve(p).then(resolve, reject)
    })
  })
}
```

---

### 6.5 用 reduce 实现数组拍平

```javascript
function flat(arr, depth = 1) {
  return depth > 0
    ? arr.reduce((acc, cur) => {
        return acc.concat(Array.isArray(cur) ? flat(cur, depth - 1) : cur)
      }, [])
    : [...arr]
}
```

---

### 6.6 扁平数组转树

```javascript
function arrayToTree(items) {
  const map = {}
  const result = []

  items.forEach(item => {
    map[item.id] = { ...item, children: [] }
  })

  items.forEach(item => {
    const node = map[item.id]
    if (item.pid === 0) {
      result.push(node)
    } else if (map[item.pid]) {
      map[item.pid].children.push(node)
    }
  })

  return result
}
```

---

## 七、八股深入

### 7.1 前端性能指标

**Q：LCP 怎么计算的？还了解哪些性能指标？**

> | 指标 | 全称 | 含义 | 良好标准 |
> |---|---|---|---|
> | LCP | Largest Contentful Paint | 视口内最大内容元素渲染时间 | ≤ 2.5s |
> | FCP | First Contentful Paint | 首次内容绘制时间 | ≤ 1.8s |
> | FID | First Input Delay | 首次输入延迟 | ≤ 100ms |
> | CLS | Cumulative Layout Shift | 累积布局偏移 | ≤ 0.1 |
> | TTFB | Time to First Byte | 首字节时间 | — |
> | TTI | Time to Interactive | 可交互时间 | — |
>
> LCP、FID、CLS 是 Google Core Web Vitals 三个核心指标。我的项目重点优化了 LCP，因为它直接影响用户对页面加载速度的感知。
>
> **记忆口诀**：LCP 最大内容、FCP 首次内容、FID 首次交互延迟、CLS 布局偏移、TTFB 首字节

---

## 八、场景题

### 8.1 后端传 10w 条数据

**Q：后端传给你 10w 条数据，前端怎么处理？**

> 1. **虚拟列表**：只渲染可视区域的 DOM，react-virtuoso / react-window
> 2. **分页加载**：前后端配合，每次请求一页数据
> 3. **Web Worker**：将大数据的排序、过滤等计算放到 Worker 线程，不阻塞 UI
> 4. **requestAnimationFrame 分片渲染**：将数据分成小批次，每帧渲染一批，避免长时间阻塞主线程
> 5. **IntersectionObserver 滚动加载**：滚到底部时加载下一批

---

### 8.2 前端异常捕获与白屏监控

**Q：前端如何捕获异常？白屏怎么监控？**

> | 异常类型 | 捕获方式 |
> |---|---|
> | JS 运行时错误 | `window.onerror` / `window.addEventListener('error')` |
> | Promise 未捕获 | `window.addEventListener('unhandledrejection')` |
> | 资源加载错误 | `window.addEventListener('error')` 判断 `e.target` 是 IMG/SCRIPT |
> | 接口异常 | Axios 响应拦截器捕获 4xx/5xx |
>
> **白屏监控**：
> 1. 关键位置埋点，定时检测关键 DOM 节点是否存在
> 2. 检测 `document.body.innerHTML` 是否为空或过短
> 3. MutationObserver 监听 DOM 变化，长时间无变化且页面高度为 0 则判定白屏
> 4. PerformanceObserver 监控 FCP，超时未触发则可能白屏

---

## 九、综合素质

### 9.1 职业规划

**Q：为什么选择前端？职业规划是什么？**

> 我选择前端是因为前端是离用户最近的一层，每一次优化、每一个组件都能直接在页面上看到效果，这种及时反馈带来的成就感是我坚持的动力。
>
> 短期规划，在实习期间我想深入 B 端复杂应用的开发，学习微前端架构和组件化设计，同时把 AI Coding 的能力从提示词阶段往工作流阶段推进。中期我希望能在前端工程化和 AI 落地的交叉点上建立自己的优势，比如用 AI 辅助做代码质量分析、自动化测试这些方向，和咱们团队的业务方向很契合。长期的话，我会往架构师方向努力，但现阶段最重要的是把基础打扎实，在实际项目中积累经验。

---

## 十、二面重点复习清单

### 🔴 必背（JD 直接命中）

| 考点 | JD 对应 | 备注 |
|---|---|---|
| 项目最难 + 项目改进 | 综合素质 | 二面必问 |
| 微前端架构 | 微前端技术栈（qiankun、wujie等） | JD 明确要求 |
| Vite 插件体系 | Vue3 生态 + Vite 配置优化 | 快手面经原题 |
| Vue Router hash/history | Vue3 生态（Vue-Router） | JD 直接写了 |
| 组件通信 + provide/inject vs Pinia | 组件化开发基础 | B 端核心 |
| NextTick | 浏览器渲染机制 | 连接 Vue 和渲染 |
| Keep-alive | 性能优化 | B 端多页签场景 |
| AI Coding 三阶段 + Skill 设计 | AI Coding 实战经验 | 你的优势 |
| 性能指标 | 性能优化 | 必背 |

### 🟡 高频（JD 间接相关）

| 考点 | 备注 |
|---|---|
| 跨域 + CORS | 你项目前后端分离 |
| XSS / CSRF | B 端安全 |
| 防抖节流手写 | 快手高频手撕 |
| 红绿灯 + Promise.race | 手撕高频 |
| v-if vs v-show | 基础但快手考过 |

### ⚪ 了解即可

| 考点 | 备注 |
|---|---|
| 10w 条数据 + 白屏监控 | 场景题 |
| 职业规划 | 短期 + 中期 + 和岗位绑定 |
| 缓冲区追赶策略 | 动态调整 flush 速度 |

---

## 十一、反问环节

> **Q1：我注意到JD技术栈是Vue3，想了解一下团队的微前端方案是qiankun还是其他方案？不同子应用之间技术栈是统一的吗？**

> **Q2：团队对实习生在这个周期内的成长期望是什么样的？比如希望能独立负责一个模块，还是先从组件开发入手？**
