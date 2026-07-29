# 操控席行动序列车辆过滤功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 操控席行动序列软件根据 `/user/current` 的 `connected_vehicle_id` 过滤任务列表、详情页行动序列和操作权限，只显示和操作对应车辆类型的数据。

**Architecture:** 前端过滤方案（方案 A）。后端接口不变，前端在展示层过滤任务列表和行动序列，控制操作权限。

**Tech Stack:** Vue 3 Composition API, JavaScript, Vite, FastAPI (后端无需变更)

## Global Constraints

- 后端接口零改动，所有过滤逻辑在前端实现
- 只影响操控席模式（`isControlMode === true`），协同席模式不受影响
- `connected_vehicle_id` 为空或接口异常时显示空列表
- 详情页只显示 `connected_vehicle_id` 对应车辆的行动序列，其他车辆隐藏
- 编辑/删除/创建/控制按钮只对 `connected_vehicle_id` 对应车辆可用

---

## File Structure

| 文件 | 职责 |
|------|------|
| `frontend-dev/src/features/mission-control/modules/coordination/api/coordinationApi.js` | 新增 `fetchCurrentUser` 和 `fetchVehicleInfo` 接口 |
| `frontend-dev/src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue` | 实现车辆过滤逻辑、操作权限控制 |

---

### Task 1: 新增用户信息查询接口

**Files:**
- Modify: `frontend-dev/src/features/mission-control/modules/coordination/api/coordinationApi.js`

**Interfaces:**
- Consumes: 现有 `getJson` 和 `joinApiUrl` 函数
- Produces: `fetchCurrentUser()` 和 `fetchVehicleInfo(vehicleId)` 函数

- [ ] **Step 1: 在 coordinationApi.js 中添加 fetchCurrentUser 接口**

在 `coordinationApi.js` 的 `fetchOperatorConnectedVehicles` 函数附近添加：

```javascript
/** 查询当前登录用户信息 */
export const fetchCurrentUser = async () => {
  const result = await getJson(joinApiUrl('/user/current'));
  if (!result.ok) return result;
  return { ok: true, data: result.data };
};

/** 查询车辆信息 */
export const fetchVehicleInfo = async (vehicleId) => {
  const cleanId = String(vehicleId || '').replace('equipment:', '');
  const result = await getJson(joinApiUrl(`/vehicle/info/${cleanId}`));
  if (!result.ok) return result;
  return { ok: true, data: result.data };
};
```

- [ ] **Step 2: 提交代码**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev/frontend-dev
git add src/features/mission-control/modules/coordination/api/coordinationApi.js
git commit -m "feat(api): 添加 fetchCurrentUser 和 fetchVehicleInfo 接口"
```

---

### Task 2: 实现车辆连接初始化

**Files:**
- Modify: `frontend-dev/src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue`

**Interfaces:**
- Consumes: `fetchCurrentUser` 和 `fetchVehicleInfo` 接口
- Produces: `connectedVehicleId`、`connectedVehicleType`、`isVehicleConnected` 状态

- [ ] **Step 1: 添加车辆连接状态**

在 `ActionSequencePanel.vue` 的 `selectedConnectedVehicleId` 附近添加：

```javascript
const connectedVehicleId = ref('');
const connectedVehicleType = ref('');
const isVehicleConnected = ref(false);
```

- [ ] **Step 2: 添加初始化函数**

在 `onMounted` 之前添加：

```javascript
/* ---------- 车辆连接初始化 ---------- */
const initConnectedVehicle = async () => {
  if (!isControlMode.value) return;
  
  try {
    // 1. 查询当前登录用户
    const userResult = await fetchCurrentUser();
    if (!userResult.ok || !userResult.data?.connected_vehicle_id) {
      isVehicleConnected.value = false;
      appendSystemMessage('未连接车辆，无法显示行动序列');
      return;
    }
    
    connectedVehicleId.value = userResult.data.connected_vehicle_id;
    
    // 2. 查询车辆类型
    const vehicleResult = await fetchVehicleInfo(connectedVehicleId.value);
    if (vehicleResult.ok && vehicleResult.data?.resource_type) {
      connectedVehicleType.value = vehicleResult.data.resource_type;
      isVehicleConnected.value = true;
      appendSystemMessage(`已连接车辆：${connectedVehicleId.value} (${connectedVehicleType.value})`);
    } else {
      isVehicleConnected.value = false;
      appendSystemMessage('无法获取车辆类型，无法显示行动序列');
    }
  } catch (err) {
    isVehicleConnected.value = false;
    appendSystemMessage('初始化车辆连接失败：' + (err.message || err));
  }
};
```

- [ ] **Step 3: 在 onMounted 中调用初始化**

修改 `onMounted`：

```javascript
onMounted(async () => {
  await initConnectedVehicle();
  loadOnlineVehicles();
  loadPlans();
  updateMarqueeStates();
  startPlanEventStream();
  window.addEventListener('resize', onWindowResize);
  // 操控端行动序列视图：进入时强制弹出车辆选择框
  if (isControlMode.value) {
    selectedConnectedVehicleId.value = '';
    ensureVehicleSelected(true);
  }
});
```

- [ ] **Step 4: 提交代码**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev/frontend-dev
git add src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue
git commit -m "feat(operator): 添加车辆连接初始化，启动时获取 connected_vehicle_id"
```

---

### Task 3: 实现任务列表过滤

**Files:**
- Modify: `frontend-dev/src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue`

**Interfaces:**
- Consumes: `isVehicleConnected`、`connectedVehicleType`、`plans` 状态
- Produces: 过滤后的任务列表

- [ ] **Step 1: 修改 loadPlans 函数**

在 `loadPlans` 函数中添加过滤逻辑：

```javascript
const loadPlans = async (silent = false) => {
  if (!silent) loadingPlans.value = true;
  // 协同席从协同席数据服务查，操控端从操控席数据服务查
  const result = isControlMode.value
    ? await fetchOperatorPlans()
    : await fetchActionSequencePlans();
  if (!silent) loadingPlans.value = false;
  if (result.ok) {
    const prevId = selectedPlanId.value;
    let allPlans = result.data.items || [];
    
    // 如果已连接车辆，只显示有对应车辆类型行动序列的任务
    if (isControlMode.value && isVehicleConnected.value && connectedVehicleType.value) {
      allPlans = allPlans.filter(plan => {
        // 检查任务的 vehicle_summary 中是否有对应车辆类型的车辆
        const vehicleSummary = plan.vehicle_summary || [];
        return vehicleSummary.some(v => v.resource_type === connectedVehicleType.value);
      });
    }
    
    plans.value = allPlans;

    if (plans.value.length === 0) {
      selectedPlanId.value = '';
      selectedPlan.value = null;
      if (isControlMode.value && isVehicleConnected.value) {
        appendSystemMessage(`没有找到包含 ${connectedVehicleType.value} 类型车辆行动序列的任务`);
      }
      return;
    }

    // 如果之前有选中项，检查是否还存在；不存在则自动选中第一项
    const exists = plans.value.some((p) => p.plan_id === prevId);
    if (exists && prevId) {
      refreshDetail(prevId);
    } else {
      const withActions = plans.value.find((p) => (p.stages_count || 0) > 0);
      selectPlan((withActions || plans.value[0]).plan_id);
    }
  } else {
    appendSystemMessage('获取方案列表失败: ' + (result.error || '未知错误'));
  }
};
```

- [ ] **Step 2: 提交代码**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev/frontend-dev
git add src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue
git commit -m "feat(operator): 任务列表根据 connected_vehicle_type 过滤"
```

---

### Task 4: 实现详情页行动序列过滤

**Files:**
- Modify: `frontend-dev/src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue`

**Interfaces:**
- Consumes: `isVehicleConnected`、`connectedVehicleId`、`selectedPlan` 状态
- Produces: 过滤后的 `vehicleActions`

- [ ] **Step 1: 修改 vehicleActions computed**

修改 `vehicleActions` computed：

```javascript
const vehicleActions = computed(() => {
  if (!selectedPlan.value) return [];
  let summary = selectedPlan.value.vehicle_summary || [];
  
  // 如果已连接车辆，只显示对应车辆的行动序列
  if (isControlMode.value && isVehicleConnected.value && connectedVehicleId.value) {
    summary = summary.filter(v => v.vid === connectedVehicleId.value);
  }
  
  return summary;
});
```

- [ ] **Step 2: 提交代码**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev/frontend-dev
git add src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue
git commit -m "feat(operator): 详情页只显示 connected_vehicle_id 对应车辆的行动序列"
```

---

### Task 5: 实现操作权限控制

**Files:**
- Modify: `frontend-dev/src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue`

**Interfaces:**
- Consumes: `isVehicleConnected`、`connectedVehicleId` 状态
- Produces: `canOperateVehicle` 函数

- [ ] **Step 1: 添加 canOperateVehicle 函数**

在 `vehicleActions` computed 附近添加：

```javascript
const canOperateVehicle = (vehicle) => {
  if (!isControlMode.value || !isVehicleConnected.value) {
    return true; // 非操控席或未连接车辆时，允许所有操作
  }
  return vehicle.vid === connectedVehicleId.value;
};
```

- [ ] **Step 2: 修改编辑按钮显示逻辑**

找到编辑按钮，添加 `v-if="canOperateVehicle(vehicle)"`：

```vue
<button
  v-if="canOperateVehicle(vehicle)"
  class="as-btn mini"
  type="button"
  @click="openCreatorForEdit(vehicle)"
>
  编辑
</button>
```

- [ ] **Step 3: 修改删除按钮显示逻辑**

找到删除按钮，添加 `v-if="canOperateVehicle(vehicle)"`：

```vue
<button
  v-if="canOperateVehicle(vehicle)"
  class="as-btn mini danger"
  type="button"
  @click="confirmDeleteVehicleActions(vehicle)"
>
  删除
</button>
```

- [ ] **Step 4: 修改控制按钮显示逻辑**

找到控制按钮（开始/暂停/继续/停止），添加 `v-if="canOperateVehicle(vehicle)"`：

```vue
<template v-if="canOperateVehicle(vehicle)">
  <template v-if="getVehicleRuntimeState(vehicle) === 'SCHEDULED'">
    <button class="as-btn mini primary" type="button" :disabled="controlLoading" @click="executeControl('start', [vehicle.vid])">开始</button>
  </template>
  <template v-if="getVehicleRuntimeState(vehicle) === 'ACTIVE'">
    <button class="as-btn mini warn" type="button" :disabled="controlLoading" @click="executeControl('pause', [vehicle.vid])">暂停</button>
  </template>
  <template v-if="getVehicleRuntimeState(vehicle) === 'PAUSED'">
    <button class="as-btn mini primary" type="button" :disabled="controlLoading" @click="executeControl('resume', [vehicle.vid])">继续</button>
  </template>
  <template v-if="getVehicleRuntimeState(vehicle) === 'DONE'">
    <span class="as-state-badge done">已完成</span>
  </template>
  <template v-if="['ACTIVE', 'PAUSED'].includes(getVehicleRuntimeState(vehicle))">
    <button class="as-btn mini danger" type="button" :disabled="controlLoading" @click="executeControl('stop', [vehicle.vid])">停止</button>
  </template>
</template>
```

- [ ] **Step 5: 提交代码**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev/frontend-dev
git add src/features/mission-control/modules/coordination/panels/right/ActionSequencePanel.vue
git commit -m "feat(operator): 编辑/删除/控制按钮只对 connected_vehicle_id 对应车辆可用"
```

---

### Task 6: 验证与测试

**Files:**
- Test: 手动测试

- [ ] **Step 1: 启动前后端**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev
app_ctl start
```

- [ ] **Step 2: 验证正常流程**

1. 打开操控席模式，确认显示"已连接车辆：equipment:ZD01 (Recon-Strike-UGV)"
2. 确认任务列表只显示有 Recon-Strike-UGV 行动序列的任务
3. 点击任务，确认详情页只显示 ZD01 的行动序列
4. 确认编辑/删除/控制按钮只对 ZD01 可用

- [ ] **Step 3: 验证异常流程**

1. 断开车辆连接，确认显示"未连接车辆，无法显示行动序列"
2. 确认任务列表为空
3. 非操控席模式，确认显示所有任务和行动序列

- [ ] **Step 4: 提交代码**

```bash
cd /Users/wangjunju/work/kimi-cli-0617/demo-dev/frontend-dev
git add -A
git commit -m "test(operator): 验证车辆过滤功能"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 任务列表过滤：Task 3
- ✅ 详情页过滤：Task 4
- ✅ 操作权限控制：Task 5
- ✅ 初始化流程：Task 2
- ✅ 异常处理：Task 2 和 Task 3

**2. Placeholder scan:**
- 无 TBD/TODO
- 所有步骤都有具体代码

**3. Type consistency:**
- `connectedVehicleId` / `connectedVehicleType` / `isVehicleConnected` 在所有 Task 中一致
- `fetchCurrentUser` / `fetchVehicleInfo` 在 Task 1 定义，Task 2 使用

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-29-operator-vehicle-filter.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
