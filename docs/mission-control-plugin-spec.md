# MissionControl Demo 架构与插件规范

这份文档回答 4 个问题：

1. `demo/frontend` 现在的目录结构是什么。
2. 每个文件夹和关键文件分别负责什么。
3. 它和根目录真实 `frontend` 是否相同。
4. 开发一个 Mission Control 插件时，应该把代码放在哪里。

## 1. 当前定位

`demo/frontend` 是“插件开发沙盒”，不是生产前端副本。

它保留了真实 `frontend` 里最重要的 Mission Control 接入边界：

- 三种屏幕模式：`single / main / aux`
- `manifest.js` 模块注册
- `moduleApi` 统一对外接口
- 左侧共享面板工厂
- 通知中心
- 语义目标 `target_id`
- 语义动作 `action_id`
- 结构化命令 `command`

它删掉了真实工程里最重、最复杂、最不利于插件开发的部分：

- 真实地图与 Leaflet/Geoman
- 多服务真实接口
- 复杂业务状态源
- 完整跨屏同步
- 全量业务模块

## 2. 与真实 `frontend` 是否相同

结论：`Mission Control` 插件开发结构大体相同，但整个前端工程不是完全相同。

### 2.1 相同的部分

- `src/features/mission-control/page`
  - 页面壳分层一致，都是单屏 / 主屏 / 辅屏的页面编排。
- `src/features/mission-control/registry`
  - 都通过 `moduleRegistry.js` 注册模块。
  - 都通过 `sharedPanels.js` 提供共享左侧面板。
  - 都通过 `createAsyncMissionComponent.js` 做异步组件包装。
- `src/features/mission-control/modules`
  - 都按“一个模块一个目录”的方式组织。
  - 都以 `manifest.js + panels/ + 可选 state/` 为基本单位。
- `src/features/mission-control/shared`
  - 都有共享聊天、通知、任务看板、视频 Dock、交互语义辅助。
- `target_id / action_id / command / notification`
  - 这几套插件开发时最重要的稳定语义接口，在 demo 和真实工程中是对齐的。

### 2.2 不同的部分

- 根目录真实 `frontend` 使用 `vue-router`。
  - demo 用的是轻量路径路由 `src/router/index.js`，只模拟路径切换，不引入 `vue-router` 依赖。
- 根目录真实 `frontend` 有 `src/api.js`、`src/config/`、完整 `src/config/systemSettings.js`。
  - demo 只保留了最小 `systemSettings` 和通知工具。
- 根目录真实 `frontend` 有 `composables/`、`shared/data/`、`shared/state/`、`useMissionPanelHost.js`、`useMissionModuleApi.js`、`useMissionRoutingSync.js`、`useMissionControlScreenSync.js`、`useMissionTaskBoard.js` 等完整运行时层。
  - demo 把大部分壳层逻辑压缩到了 `useMissionControlDemoShell.js`。
- 根目录真实 `frontend` 有真实业务模块。
  - demo 只有 `example` 和 `coordination` 两个演示模块。
- 根目录真实 `frontend` 的地图工作区是真地图。
  - demo 的工作区只保留布局位置和 `moduleApi.map` 接口。

## 3. 顶层目录职责

`demo/frontend/` 当前主要目录职责如下：

### 3.1 `public/`

- 放页面壳直接依赖的静态资源。
- 当前包括：
  - `background.png`
  - `notify.svg`
  - `interface/drag.svg`

规则：

- 页面壳、通知中心、分隔拖拽把手等公用资源放这里。
- 插件自己的业务图标，优先放模块目录；只有全局公用资源才放 `public/`。

### 3.2 `src/`

- 所有源代码入口。

### 3.3 `docs/`

- 给插件开发者和接入开发者看的说明文档。
- 不写产品方案，不写历史讨论，尽量只写“当前代码如何工作”。

### 3.4 `dist/`

- 构建产物。
- 不要手改。

## 4. `src/` 目录职责

### 4.1 `src/App.vue`

- 全局壳入口。
- 根据当前路径决定渲染哪个 Mission Control 视图。
- 挂载通知中心。
- 把通知中心里的结构化命令转发给 Mission Control 命令总线。

### 4.2 `src/main.js`

- Vue 应用启动入口。

### 4.3 `src/style.css`

- 全局主题变量和基础样式。
- 这里定义的是 demo 的全局皮肤，不应该写模块业务样式。

### 4.4 `src/router/`

- demo 的轻量路由层。
- 当前只有 `index.js`。
- 作用：
  - 维护当前路径
  - 归一化到 `/mission-control`、`/mission-control/main`、`/mission-control/aux`
  - 提供 `navigateToDemoPath()`

说明：

- 真实 `frontend` 用 `vue-router`。
- demo 这里只模拟“路径 = 屏幕模式”，方便开发者看清结构。

### 4.5 `src/views/`

- 路由视图壳。
- 当前已经对齐成真实前端的三层入口：
  - `MissionControl.vue`
  - `MissionControlMain.vue`
  - `MissionControlAux.vue`

规则：

- `views/` 只负责把路径映射到具体页面壳，不放业务状态。

### 4.6 `src/utils/`

- 全局工具层。
- 当前最重要的是：
  - `notificationCenter.js`
    - 对业务代码暴露统一的通知 API。

### 4.7 `src/config/`

- 配置层。
- 当前包括：
  - `systemSettings.js`
    - 管理 demo 的系统设置、通知服务 baseURL 和 endpoint 映射。

### 4.8 `src/components/`

- 预留目录。
- 当前为空。
- 如果以后有和 `Mission Control` 无关的通用基础组件，可以放这里。

## 5. `src/features/mission-control/` 目录职责

这是插件开发最重要的目录。

### 5.1 `page/`

- 页面编排层。
- 负责把“左侧工作区、中间工作区、任务看板、详情区、AI Dock、视频 Dock”放到正确位置。

当前核心文件：

- `MissionControlDemoPage.vue`
  - Mission Control 主页面壳，负责根据 `screenMode` 切单屏 / 主屏 / 辅屏。
- `MissionControlDemoLayout.vue`
  - 单屏与主屏共用外层布局。
- `MissionControlDemoAuxLayout.vue`
  - 辅屏外层布局。
- `MissionControlDemoAuxSidebarDock.vue`
  - 辅屏左侧工作区专用 dock。

规则：

- `page/` 只做布局编排。
- 不把模块自己的业务状态写进这里。

### 5.2 `shell/`

- 运行时壳层。
- 负责把模块注册、通知、语义动作、上下文捕获、模块 API 装配在一起。

当前核心文件：

- `useMissionControlDemoShell.js`
  - demo 的总装配层。
  - 当前 demo 的大部分页面状态和 `moduleApi` 都从这里出来。
- `missionCommandBus.js`
  - 结构化命令总线。
- `useMissionActionRegistry.js`
  - 维护稳定 `action_id`。
- `useMissionInteractionRegistry.js`
  - 维护当前点击上下文，支持“一键加入对话”。
- `useMissionAutomationBridge.js`
  - 执行结构化命令。

规则：

- 插件不要直接改页面壳状态。
- 插件和壳层交互，优先走 `moduleApi`、`registerAction()`、`target_id`。

### 5.3 `registry/`

- 模块注册层。

当前文件：

- `moduleRegistry.js`
  - 集中注册所有模块 manifest。
- `sharedPanels.js`
  - 左侧共享面板工厂。
- `createAsyncMissionComponent.js`
  - 异步组件 helper。

当前补充：

- `moduleRegistry.js` 里的模块 `id` 现在使用稳定机器标识，内置示例为 `example`、`coordination`
- `sharedPanels.js` 里的共享地图操作入口已经收口到 `shared/apps/MissionMapOperationsSidebarPanel.vue`

规则：

- 新模块一定要进 `moduleRegistry.js`。
- 不要直接在页面壳里手写模块面板切换。

### 5.4 `modules/`

- 插件和业务模块目录。
- 每个模块一个目录。

当前示例：

- `example/`
- `coordination/`

每个模块通常包含：

- `manifest.js`
  - 模块元信息和左右面板声明。
- `panels/`
  - 具体左侧/右侧面板组件。
- `state/`
  - 可选。
  - 如果模块有自己的后端接口或本地状态，应放这里。

规则：

- 插件开发主要就在这里完成。

### 5.5 `shared/`

- 跨模块共享能力。

当前子目录：

- `apps/`
  - 共享左侧应用面板。
  - 例如聊天、地图操作、车辆信息。
- `interaction/`
  - 语义目标和语义动作的属性 helper。
- `notifications/`
  - 通知中心组件。
- `task-board/`
  - 辅屏任务看板共享组件。
- `video/`
  - 主屏视频 Dock 共享组件。

规则：

- 只有多个模块都会用到的东西，才放进 `shared/`。

### 5.6 `workspace/`

- 中间工作区。
- 当前是 `DemoWorkspace.vue`。
- 这里只保留工作区位置和 `moduleApi.map` 接口，不加载真实地图。

### 5.7 `config/`

- demo 的配置目录。
- 当前已使用 `systemSettings.js` 统一通知服务与基础地址配置。
- 如果以后需要给 demo 插件定义本地常量或 mock 配置，也继续放这里。

### 5.8 `MissionControlPage.css`

- 页面壳公用 CSS。
- 作用类似真实 `frontend` 里的同名文件。
- 插件不要把模块自己的业务样式堆到这里。

## 6. 当前运行链路

当前 demo 的运行链路是：

```text
App.vue
  -> router/index.js
  -> views/MissionControl*.vue
  -> page/MissionControlDemoPage.vue
  -> shell/useMissionControlDemoShell.js
  -> registry/moduleRegistry.js
  -> modules/<module>/manifest.js
  -> panels / shared / workspace
```

插件开发时最应该理解的是这条链路。

## 7. 插件开发时应该把代码放哪

一个新插件建议按下面目录放置：

```text
src/features/mission-control/modules/<your-plugin>/
  manifest.js
  panels/
    <YourPlugin>LeftPanel.vue
    <YourPlugin>RightPanel.vue
  state/
    use<YourPlugin>State.js
```

不要把插件代码放到：

- `page/`
- `shell/`
- `workspace/`

除非你明确是在扩展共享壳层能力，而不是开发插件。

如果你开发的是共享壳层能力，而不是普通插件，当前最常见的落点是：

- `src/features/mission-control/shared/apps/`
- `src/features/mission-control/shared/layout/`
- `src/features/mission-control/registry/sharedPanels.js`

## 8. 布局适配要求

插件开发时必须同时考虑 3 种屏幕布局。

### 8.1 单屏 `/mission-control`

- 左侧是模块工作区。
- 中间是工作区占位。
- 右侧是模块主面板。

要求：

- 右侧主面板不能假设自己有无限高度。
- 内容必须内部滚动。

### 8.2 主屏 `/mission-control/main`

- 左侧工作区仍然存在，但不带左侧聊天。
- 中间是工作区占位。
- 右侧是视频 Dock。

要求：

- 不要假设主屏一定会显示模块右面板。
- 如果你的模块依赖右侧主面板，只能在单屏和辅屏详情区里展示。

### 8.3 辅屏 `/mission-control/aux`

- 左侧是工作区。
- 中间上方是任务看板。
- 中间下方是模块详情区。
- 右侧是 AI Dock。

要求：

- 你的右侧插件面板实际上会被渲染到“辅屏中间下半区”。
- 所以必须支持窄宽度和有限高度。

### 8.4 右侧组件的双场景复用要求

当前 demo 和真实 `frontend` 一样，模块的 `rightPanel` 不是“只在一个地方显示”：

- 在单屏 `/mission-control`
  - 它显示在页面最右侧主面板中。
- 在辅屏 `/mission-control/aux`
  - 它显示在中间下半区的“模块详细信息”区域中。
  - 这个区域还会被任务看板挤压，可展开、可收起。

所以你开发 `rightPanel` 时，必须假设它同时运行在这两种容器中。

推荐写法：

```css
.plugin-right-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  gap: 0.8rem;
}

.plugin-section:last-child {
  flex: 1 1 auto;
  min-height: 0;
}
```

当前 demo 和真实前端都已经提供统一壳组件：

- `src/features/mission-control/shared/layout/MissionRightPanelShell.vue`

建议优先直接复用这个组件，而不是每个插件重新手写根节点滚动契约。

必须满足：

- 根节点 `height: 100%`
- 根节点 `min-height: 0`
- 根节点 `overflow: auto`
- 内容多时组件内部滚动，而不是把父容器撑高
- 不依赖固定高度
- 不假设自己一定有右侧完整大栏宽度

不要这样做：

- 在根节点写死 `height: 900px`
- 用 `position: fixed`
- 假设所有内容都能一次性完全展开
- 把滚动交给页面外层，而不是组件自己

如果你的右侧组件包含表单、表格、时间轴、任务列表，建议进一步拆成：

- 头部摘要区
  - 固定高度，内容少
- 中间主内容区
  - `flex: 1 1 auto; min-height: 0; overflow: auto`
- 底部动作区
  - 固定高度，按钮不被滚走

### 8.5 16:9 屏幕要求

开发时至少人工检查这两个尺寸：

- `1920 x 1080`
- `1366 x 768`

必须满足：

- 不出现整页纵向溢出。
- 不依赖固定像素高度。
- 容器内部滚动，不把整页撑长。
- 表单、表格、列表、按钮区在窄高布局下仍然能操作。

建议：

- 面板根节点统一使用 `height: 100%`、`min-height: 0`、`overflow: auto`。
- 少写 `position: fixed`。
- 少写大面积固定 `px` 宽高。

## 9. 这份 demo 现在能否代表真实前端的插件开发结构

可以代表，但范围要说清楚。

可以代表的部分：

- 模块目录组织方式
- manifest 注册方式
- 页面壳挂载位置
- 共享左侧面板接入方式
- 通知中心前端接入方式
- 语义目标、语义动作、结构化命令接口
- 单屏 / 主屏 / 辅屏布局约束

不能替代的部分：

- 真实后端 endpoint 组织
- 真实地图能力
- 真实跨屏同步
- 真实业务模块状态流
- 真实 `vue-router` 和 `axios` 接入方式

所以最终结论是：

- `demo/frontend` 的“插件开发结构”已经对齐到足够接近真实 `frontend`。
- `demo/frontend` 不是完整生产结构副本，不能拿来替代真实工程做最终集成。
