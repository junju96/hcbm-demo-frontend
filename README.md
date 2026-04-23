# MissionControl Demo

这个 demo 不是“另一个独立前端”，而是给插件开发者、模块开发者和联调开发者看的最小接入工程。

它的目标有两个：

- 尽量保留根目录真实 `frontend` 的 Mission Control 页面壳、模块接入方式、通知中心和语义控制接口。
- 去掉真实地图、真实业务接口、复杂状态同步，只留下开发插件最需要的稳定边界。

## 快速结论

当前 `demo/frontend` 与根目录真实 `frontend` 的关系是：

- `Mission Control` 内核结构基本同构。
  - 都有 `page / shell / registry / modules / shared / workspace` 这套分层。
  - 都有 `single / main / aux` 三种屏幕模式。
  - 都保留了通知中心、语义目标、语义动作、结构化命令这套插件接入边界。
- 整个前端工程不是 1:1 完全一致。
  - 根目录真实 `frontend` 用的是 `vue-router + axios + 完整 systemSettings + 真实地图 + 更多 shell/composables`。
  - `demo/frontend` 用的是轻量路径路由、精简版 `systemSettings`、本地占位工作区和最小模块集合。

一句话判断：

- 如果你要开发 `Mission Control` 插件、面板、通知跳转、语义动作，`demo/frontend` 的结构已经足够接近真实工程。
- 如果你要接真实地图、真实接口、真实多服务配置，最终仍然要回到根目录的 `frontend` 做集成。

## 运行

```bash
cd demo/frontend
npm install
npm run dev
```

前端启动后，终端会输出本地访问地址，通常是：

- `http://localhost:5173/`
- 如果端口被占用，Vite 会自动顺延到 `5174 / 5175 / 5176 ...`

### 页面重启

如果只是想重启页面开发服务：

1. 在当前运行 `vite` 的终端里按 `Ctrl + C`
2. 重新执行：

```bash
cd demo/frontend
npm run dev
```

如果想固定端口启动：

```bash
cd demo/frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

### 端口占用排查

如果提示端口已被占用，可以先查看占用进程：

```bash
lsof -i :5173
```

然后结束该进程：

```bash
kill -9 <PID>
```

构建校验：

```bash
cd demo/frontend
npm run build
```

## 路由与屏幕模式

- `/mission-control`
  - 单屏模式
  - 左侧工作区 + 中间工作区占位 + 右侧模块主面板
- `/mission-control/main`
  - 双屏主屏
  - 左侧工作区 + 中间工作区占位 + 右侧视频 Dock
- `/mission-control/aux`
  - 双屏辅屏
  - 左侧工作区 + 中间上方任务看板 + 中间下方模块详情区 + 右侧 AI Dock

## 先看哪几份文档

- [docs/mission-control-plugin-spec.md](./docs/mission-control-plugin-spec.md)
  - 先看这份。它说明 demo 的目录结构、文件职责、和真实 `frontend` 的差异。
- [docs/MissionControl模块接入API.md](./docs/MissionControl模块接入API.md)
  - 写模块、写插件、接通知、接语义控制时看这份。
- [docs/mission-control-ai-dev-guide.md](./docs/mission-control-ai-dev-guide.md)
  - 给 AI 辅助开发或新同事的快速开发约束。
- [docs/test-checklist.md](./docs/test-checklist.md)
  - 做自测和回归时按这份清单走。
- [UI_DEV_GUIDELINE.md](./UI_DEV_GUIDELINE.md)
  - 协同指控模块 UI 开发规范（布局、风格、交互、文档同步要求）。
- [协同指控模块_接口与数据结构总结.md](./协同指控模块_接口与数据结构总结.md)
  - 接口定义、数据结构定义、界面使用点的完整说明。
- [协同指控模块_后端联调精简版.md](./协同指控模块_后端联调精简版.md)
  - 面向联调的一页版接口与调用链说明。
- [工作日志_2026-04-22.md](./工作日志_2026-04-22.md)
  - 2026-04-22 当日改动回溯日志（模块、文件、提交时间线）。

## 当前 demo 已保留的能力

- `manifest.js` 模块注册
- 模块稳定 `id` 与显示 `label` 分离
- `moduleApi` 统一对外接口
- 左侧共享面板工厂
- `MissionRightPanelShell.vue` 右侧统一布局壳
- `MissionMapOperationsSidebarPanel.vue` 共享地图操作入口
- 通知中心前端接入
- 语义目标 `target_id`
- 语义动作 `action_id`
- 结构化控制命令 `command`
- 任务看板、AI Dock、视频 Dock 的共享壳层位置
- 地图工作区位置和 `moduleApi.map` 接口

## 当前 demo 刻意简化的能力

- 不加载真实地图
- 不接入真实业务后端
- 不提供真实算法流和真实任务链
- 不包含真实 `frontend` 里的全部业务模块
- 不包含真实 `frontend` 里的 `composables/`、`shared/data/`、`shared/state/`、跨屏同步 shell

## 建议的开发路径

1. 先在 `demo/frontend` 做插件和面板结构开发。
2. 把 `target_id / action_id / command / notification payload` 这四类稳定标识先定下来。
3. 在 demo 中把布局、滚动、屏幕适配跑通。
4. 最后再迁回根目录真实 `frontend` 接真实接口和真实地图。
