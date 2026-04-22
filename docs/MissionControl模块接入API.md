# MissionControl 模块接入 API

这份文档面向在 `demo/frontend` 中开发模块、插件、共享面板、通知跳转和语义动作的开发者。

重点只讲当前代码已经存在、并且建议继续复用的稳定接口。

## 1. 你要开发一个“插件”时，实际要交付什么

在当前 demo 里，“插件”就是一个 Mission Control 模块。

一个模块最少需要交付：

1. 一个 `manifest.js`
2. 一个左侧面板
3. 一个右侧主面板
4. 可选的模块状态文件 `state/useXxxState.js`
5. 可选的语义目标 `target_id`
6. 可选的语义动作 `action_id`
7. 可选的通知跳转信息

建议目录：

```text
src/features/mission-control/modules/<plugin-name>/
  manifest.js
  panels/
    <PluginName>LeftPanel.vue
    <PluginName>RightPanel.vue
  state/
    use<PluginName>State.js
```

## 2. 注册入口

### 2.1 模块注册

文件：

- `src/features/mission-control/registry/moduleRegistry.js`

规则：

- 所有模块都必须在这里注册。
- 页面壳不会主动扫描目录。

### 2.2 共享左侧面板工厂

文件：

- `src/features/mission-control/registry/sharedPanels.js`

当前可直接复用：

- `createTextPanel()`
- `createMapOperationsPanel()`
- `createVehiclePanel()`
- `createChatPanel()`

当前补充：

- 共享地图操作入口已经收口到 `src/features/mission-control/shared/apps/MissionMapOperationsSidebarPanel.vue`

### 2.3 异步组件 helper

文件：

- `src/features/mission-control/registry/createAsyncMissionComponent.js`

规则：

- 模块自己的左/右面板组件都应该优先用这个 helper 包装。
- 不建议在 manifest 里直接同步 import 大组件。

## 3. `manifest.js` 结构

推荐写法：

```js
import { createAsyncMissionComponent } from '../../registry/createAsyncMissionComponent';
import {
  createChatPanel,
  createMapOperationsPanel,
  createTextPanel,
  createVehiclePanel,
} from '../../registry/sharedPanels';

const PluginLeftPanel = createAsyncMissionComponent(() => import('./panels/PluginLeftPanel.vue'));
const PluginRightPanel = createAsyncMissionComponent(() => import('./panels/PluginRightPanel.vue'));

export const pluginManifest = {
  id: 'plugin-id',
  label: '插件名称',
  order: 30,
  defaultLeftPanelId: 'plugin-overview',
  leftPanels: [
    createTextPanel({
      id: 'plugin-overview',
      label: '概览',
      shortLabel: '概',
      title: '插件概览',
      hint: '左侧面板摘要',
      component: PluginLeftPanel,
    }),
    createMapOperationsPanel(),
    createVehiclePanel(),
    createChatPanel(),
  ],
  rightPanel: {
    component: PluginRightPanel,
    title: '插件主面板',
    summary: '右侧主工作区摘要',
  },
};

export default pluginManifest;
```

字段说明：

- `id`
  - 模块稳定标识。
  - 不要和展示文案混用。
  - 一旦被通知、命令、配置使用，就不要随便改。
  - 当前 demo 内置模块的正式 ID 是 `example` 和 `coordination`
- `label`
  - tab 展示文案。
- `order`
  - tab 排序。
- `defaultLeftPanelId`
  - 默认左侧面板。
- `leftPanels`
  - 当前模块左侧面板列表。
- `rightPanel`
  - 当前模块主工作区。

## 4. 面板 props 契约

当前左/右面板统一使用这 3 个 props：

```js
defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  panelDefinition: {
    type: Object,
    default: () => ({}),
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});
```

含义：

- `moduleApi`
  - 模块和页面壳通信的正式接口。
- `panelDefinition`
  - 当前面板自己的定义。
- `moduleManifest`
  - 当前模块 manifest 信息。

规则：

- 插件只通过 `moduleApi` 和壳层交互。
- 不要直接改父组件的内部状态。

## 4.1 右侧组件如何同时适配“单屏右栏”和“模块详细信息”区

这一点必须单独说明。

当前 `rightPanel` 会被复用到两个位置：

- 单屏 `/mission-control`
  - 作为页面最右侧主面板
- 辅屏 `/mission-control/aux`
  - 作为中间下半区“模块详细信息”面板

所以右侧组件不能按“固定大右栏”来写。

推荐组件根节点模板：

```vue
<template>
  <MissionRightPanelShell class="plugin-right-shell">
    <section class="plugin-panel">头部摘要</section>
    <section class="plugin-panel plugin-panel-main">主内容区</section>
  </MissionRightPanelShell>
</template>
```

推荐直接复用：

- `src/features/mission-control/shared/layout/MissionRightPanelShell.vue`

推荐根节点样式：

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

.plugin-panel-main {
  flex: 1 1 auto;
  min-height: 0;
}
```

如果主内容区内部还需要独立滚动，继续写：

```css
.plugin-panel-main {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}
```

你必须保证：

- 根节点不写死高度
- 根节点支持在窄宽度下工作
- 内容多时组件内部滚动
- 收起“模块详细信息”再展开后，布局仍然正常
- 任务看板高度变化时，右侧组件不会把中间区撑坏

不要这样写：

- `height: 100vh`
- `position: fixed`
- 大量固定 `px` 宽高
- 默认把所有折叠区都展开

当前 demo 中可参考的右侧组件：

- `src/features/mission-control/modules/example/panels/ExampleRightPanel.vue`
- `src/features/mission-control/modules/coordination/panels/CoordinationRightPanel.vue`

## 5. `moduleApi` 当前可用能力

当前 demo 对插件暴露的主要能力如下。

### 5.1 `moduleApi.navigation`

```js
moduleApi.navigation.moduleIds
moduleApi.navigation.activeModuleId
moduleApi.navigation.openModule(moduleId)
```

用途：

- 获取当前模块
- 主动切换模块

### 5.2 `moduleApi.module`

```js
moduleApi.module.activeManifest
moduleApi.module.activeLeftPanels
moduleApi.module.activeLeftPanel
```

用途：

- 读取当前模块上下文

### 5.3 `moduleApi.layout`

```js
moduleApi.layout.visible
moduleApi.layout.resizing
moduleApi.layout.width
moduleApi.layout.activePanelId
moduleApi.layout.rightPanelVisible
moduleApi.layout.hasRightPanel
moduleApi.layout.openLeftPanel(panelId, options?)
moduleApi.layout.closeLeftPanel()
moduleApi.layout.showVehicleOverview()
moduleApi.layout.startLeftPanelResize(event)
moduleApi.layout.syncWorkspaceLayout()
moduleApi.layout.isLeftPanelActive(panelId)
```

用途：

- 打开/关闭左侧面板
- 查询当前左侧面板状态
- 请求页面壳刷新布局

### 5.4 `moduleApi.chat`

```js
moduleApi.chat.selectedTool
moduleApi.chat.tools
moduleApi.chat.draft
moduleApi.chat.records
moduleApi.chat.open()
moduleApi.chat.close()
moduleApi.chat.toggle()
moduleApi.chat.send(text?)
moduleApi.chat.sendPreset(text)
moduleApi.chat.appendRecord(role, text)
moduleApi.chat.appendSystemMessage(text)
moduleApi.chat.setDraft(text)
```

建议：

- 只追加系统提示时，用 `appendSystemMessage`
- 想带预填内容打开聊天时，用 `setDraft + open`

### 5.5 `moduleApi.workspace`

```js
moduleApi.workspace.screenMode
moduleApi.workspace.routeRole
moduleApi.workspace.layoutTick
moduleApi.workspace.bump()
```

用途：

- 获取当前屏幕模式
- 请求中间工作区刷新占位布局

### 5.6 `moduleApi.map`

```js
moduleApi.map.zoom
moduleApi.map.layer
moduleApi.map.resetView()
```

说明：

- demo 里这是占位接口。
- 真正接真实地图时，最终要回到根目录真实 `frontend` 对接。

### 5.7 `moduleApi.taskBoard`

```js
moduleApi.taskBoard.cards
moduleApi.taskBoard.detailPanelVisible
moduleApi.taskBoard.detailLayoutBalanceKey
moduleApi.taskBoard.openDetailPanel()
moduleApi.taskBoard.closeDetailPanel()
moduleApi.taskBoard.toggleDetailPanel()
moduleApi.taskBoard.requestDetailLayoutBalance()
moduleApi.taskBoard.viewDetails(taskKey)
moduleApi.taskBoard.requestSupport(taskKey)
moduleApi.taskBoard.pauseTask(taskKey)
moduleApi.taskBoard.startTask(taskKey)
moduleApi.taskBoard.releaseTask(taskKey)
moduleApi.taskBoard.retryTask(taskKey)
moduleApi.taskBoard.applyAdjustment(taskKey, payload)
```

说明：

- 这是共享壳层能力，不属于某个插件。
- 辅屏右侧详情区通常会和任务看板联动。

### 5.8 `moduleApi.notifications`

```js
moduleApi.notifications.visible
moduleApi.notifications.toggle()
```

### 5.9 `moduleApi.interaction`

```js
moduleApi.interaction.currentTarget
moduleApi.interaction.setCurrentTarget(target)
moduleApi.interaction.clearCurrentTarget()
moduleApi.interaction.registerTarget(target)
moduleApi.interaction.focusTarget(targetId)
moduleApi.interaction.insertCurrentTargetToChat()
moduleApi.interaction.formatCurrentTargetForChat()
```

用途：

- 识别“用户刚刚点了哪里”
- 让上下文一键写入聊天输入框

### 5.10 `moduleApi.control`

```js
moduleApi.control.executeCommand(command)
moduleApi.control.emitCommand(command)
moduleApi.control.registerAction(actionDefinition)
moduleApi.control.lastCommandResult
```

用途：

- 注册插件自己的稳定动作
- 接受后台或通知中心发来的结构化命令

## 6. 语义目标 `target_id`

文件：

- `src/features/mission-control/shared/interaction/createInteractionTarget.js`

模板里建议这样写：

```js
import { createInteractionTargetAttrs } from '../../shared/interaction/createInteractionTarget';

const attrs = createInteractionTargetAttrs({
  targetId: 'plugin:card:001',
  targetType: 'plugin_card',
  label: '示例卡片',
  moduleId: 'plugin-id',
  panelId: 'plugin-overview',
  sourceComponent: 'PluginLeftPanel',
  textPreview: '这里是这张卡片的摘要',
  actions: ['plugin:open-detail', 'plugin:sync-chat'],
  meta: {
    cardId: '001',
  },
});
```

模板里挂载：

```vue
<article v-bind="attrs">...</article>
```

规则：

- `targetId` 必须稳定，不要临时拼中文文案。
- 不要依赖 DOM selector。
- 不要把按钮文案当唯一标识。

## 7. 语义动作 `action_id`

### 7.1 在模板上声明动作

```js
import { createInteractionActionAttrs } from '../../shared/interaction/createInteractionTarget';

const actionAttrs = createInteractionActionAttrs({
  actionId: 'plugin:open-detail',
  label: '打开详情',
  targetId: 'plugin:card:001',
});
```

### 7.2 在运行时注册动作

插件如果要支持后台控制、通知跳转或 AI 执行动作，必须注册稳定动作。

推荐在插件自己的 `state/` 或面板组件中注册：

```js
const unregister = moduleApi.control.registerAction({
  id: 'plugin:open-detail',
  label: '插件 / 打开详情',
  route: '/mission-control/aux',
  moduleId: 'plugin-id',
  panelId: 'plugin-overview',
  execute: ({ params, target }) => {
    // 执行动作
  },
});
```

规则：

- `id` 必须稳定。
- 后台系统、通知中心和 AI 都应该依赖这个 `action_id`，不要依赖按钮文案。

## 8. 结构化命令 `command`

文件：

- `src/features/mission-control/shell/missionCommandBus.js`
- `src/features/mission-control/shell/useMissionAutomationBridge.js`

当前命令结构：

```js
{
  commandId: 'cmd-001',
  type: 'invoke-action',
  route: '/mission-control/aux',
  moduleId: 'plugin-id',
  panelId: 'plugin-overview',
  targetId: 'plugin:card:001',
  actionId: 'plugin:open-detail',
  draft: '请分析当前对象',
  source: 'notification-center',
  focus: true,
  appendToChat: true,
  params: {}
}
```

字段用途：

- `route`
  - 先切到目标屏幕模式
- `moduleId`
  - 打开目标模块
- `panelId`
  - 打开目标左侧面板
- `targetId`
  - 聚焦到某个语义目标
- `actionId`
  - 执行稳定动作
- `draft`
  - 把文本预填进聊天框
- `appendToChat`
  - 把当前目标上下文写入聊天

## 9. 通知中心接入 API

文件：

- `src/utils/notificationCenter.js`
- `src/features/mission-control/shared/notifications/MissionNotificationCenter.vue`

当前建议插件只调用这些函数，不直接操作 SSE 或通知组件内部状态：

```js
publishNotification(payload, options?)
publishCenterNotification(payload, options?)
reportInterfaceIssue(payload)
openNotificationCenter()
closeNotificationCenter()
toggleNotificationCenter()
checkNotificationServiceHealth(force?)
```

### 9.1 普通通知 payload

```js
{
  type: 'notify',
  title: '规划完成',
  message: '任务方案已生成',
  source: 'plugin-id',
  method: 'planning',
  target_route: '/mission-control/aux',
  target_module: 'plugin-id',
  target_panel: 'plugin-overview',
  target_target_id: 'plugin:card:001',
  command: {
    actionId: 'plugin:open-detail',
    params: {
      cardId: '001',
    },
    appendToChat: true,
  },
}
```

### 9.2 中屏确认通知 payload

```js
{
  type: 'emergency',
  title: '是否切换到保障流程',
  message: '当前目标需要人工确认',
  allowstr: '确认',
  denystr: '取消',
  source: 'plugin-id',
  displaytime: 10,
}
```

## 10. 开发者必须提供的 API 信息

如果你要让插件能被“通知跳转”“后台控制”“AI 上下文识别”这三类功能稳定调用，你至少要提供下面这些信息。

### 10.1 模块级稳定标识

- `manifest.id`
- `manifest.label`
- `leftPanels[].id`
- `rightPanel.title`

约束：

- `manifest.id` 必须是稳定机器 ID，不要直接写中文标题
- demo 现有示例是 `example`、`coordination`

### 10.2 语义目标信息

- `target_id`
- `target_type`
- `label`
- `moduleId`
- `panelId`
- `meta`

### 10.3 语义动作信息

- `action_id`
- `label`
- `route`
- `moduleId`
- `panelId`
- `execute()`

### 10.4 通知跳转信息

- `target_route`
- `target_module`
- `target_panel`
- `target_target_id`
- `command`

约束：

- `target_module` 推荐直接传稳定模块 ID
- 共享地图操作面板固定传 `target_panel: 'shared-map-ops'`

### 10.5 如果插件要接真实后端

你还需要提供：

- baseURL
- endpoint path
- 返回结构
- 错误处理方式

当前 demo 中，这些信息建议统一通过 `src/config/systemSettings.js` 扩展，不要把 URL 写死在组件里。

## 11. 布局适配要求

写插件时必须同时考虑：

- 单屏右侧主面板
- 辅屏中间下方详情区

必须遵守：

- 面板根节点使用 `height: 100%`
- 面板根节点使用 `min-height: 0`
- 面板内部自己滚动，不要撑开页面
- 不要依赖固定高度
- 不要假设自己永远处在宽屏

至少要人工检查：

- `1920 x 1080`
- `1366 x 768`

## 12. 推荐开发流程

1. 在 `modules/<plugin-name>/` 下创建 `manifest.js` 和 `panels/`
2. 用 `createAsyncMissionComponent()` 包装左右面板
3. 在 `moduleRegistry.js` 注册模块
4. 如果有共享左侧能力，优先复用 `sharedPanels.js`
5. 给关键交互节点补 `target_id`
6. 给关键动作补 `action_id`
7. 如果要支持后台控制，注册 `moduleApi.control.registerAction()`
8. 如果要支持通知跳转，走 `publishNotification()` 的结构化 payload
9. 在三种屏幕模式下做自测
10. 跑 `npm run build`
