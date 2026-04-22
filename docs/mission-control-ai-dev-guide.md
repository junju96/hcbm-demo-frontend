# MissionControl Demo 开发指南

这份文档给两类人看：

- 新同事
- 用 AI 辅助写插件的人

目标不是解释所有代码，而是告诉你“应该怎么改，别怎么改”。

## 1. 当前技术边界

当前 demo 使用：

- Vue 3
- JavaScript
- Vite
- Vue SFC

当前 demo 不提供：

- TypeScript
- React / JSX
- 第三方 UI 框架
- 真实地图
- 真实业务后端

## 2. 先读哪几份文档

1. `docs/mission-control-plugin-spec.md`
2. `docs/MissionControl模块接入API.md`
3. `docs/test-checklist.md`

如果你跳过这三份文档，直接改页面壳，最后大概率会把结构改乱。

## 3. 先看哪几个代码入口

1. `src/App.vue`
2. `src/router/index.js`
3. `src/views/MissionControl.vue`
4. `src/views/MissionControlMain.vue`
5. `src/views/MissionControlAux.vue`
6. `src/features/mission-control/page/MissionControlDemoPage.vue`
7. `src/features/mission-control/shell/useMissionControlDemoShell.js`
8. `src/features/mission-control/registry/moduleRegistry.js`
9. 目标模块自己的 `manifest.js`

## 4. 正确的开发姿势

### 4.1 如果你要加一个新插件

只改这些位置：

- `src/features/mission-control/modules/<plugin-name>/`
- `src/features/mission-control/registry/moduleRegistry.js`
- 必要时 `src/features/mission-control/registry/sharedPanels.js`
- 必要时 `src/config/systemSettings.js`
- 必要时 `src/utils/notificationCenter.js`

### 4.2 如果你要给插件加通知跳转

只改这些位置：

- 你的模块代码
- `src/utils/notificationCenter.js` 的调用处
- 必要时扩展 `src/config/systemSettings.js`

不要改：

- 通知中心组件内部的展示逻辑，除非你是在改共享通知能力本身。

### 4.3 如果你要给插件加“后台控制”能力

必须补两样东西：

- `target_id`
- `action_id`

只做按钮点击，不做稳定标识，后面后台和 AI 都没法复用。

## 5. 不应该怎么做

不要这样写：

- 直接在 `page/` 里塞业务逻辑
- 直接在 `shell/` 里写某个插件的具体表单逻辑
- 在组件里写死接口 URL
- 用按钮文案当动作标识
- 用 DOM selector 当目标标识
- 用固定像素高度赌布局刚好能塞下

## 6. 屏幕适配最低要求

你的插件至少要在下面这几种位置看起来可用：

- 单屏右侧主面板
- 辅屏中间下方详情区

你至少要检查下面两组分辨率：

- `1920 x 1080`
- `1366 x 768`

最低要求：

- 页面不纵向溢出
- 面板内部滚动正常
- 表单和按钮仍可操作
- 不出现大片空白区或内容被裁掉

补充一条硬规则：

- 右侧组件必须同时适配
  - 单屏最右侧主面板
  - 辅屏中间下半区“模块详细信息”面板

所以右侧组件根节点必须默认写成：

```css
.plugin-right-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}
```

## 7. AI 辅助开发时的提示词建议

如果你要让 AI 帮你生成一个模块，至少把这些条件明确给它：

```text
请在 demo/frontend 里为 Mission Control 新增一个模块。

要求：
1. 使用 Vue 3 + JavaScript + Vite。
2. 不要引入 TypeScript、React、第三方 UI 框架。
3. 模块目录必须放在 src/features/mission-control/modules/<module-name>/。
4. 必须提供 manifest.js、LeftPanel.vue、RightPanel.vue。
5. 必须通过 moduleRegistry.js 注册。
6. 左右面板统一通过 moduleApi 与壳层交互。
7. 如果有关键按钮或卡片，请补 target_id / action_id。
8. 如果有通知跳转，请复用 notificationCenter.js 的接口。
9. 组件必须支持单屏右侧面板和辅屏详情区两种布局。
10. 所有面板根节点必须 height:100%、min-height:0、overflow:auto。
```

## 8. 开发完成后的最小自检

至少确认这些：

1. 模块能出现在 tab 里。
2. 左侧面板能正常打开。
3. 右侧主面板在单屏可见。
4. 右侧主面板在辅屏详情区可见。
5. 关键交互节点带有 `target_id`。
6. 关键动作带有 `action_id`。
7. `npm run build` 通过。
