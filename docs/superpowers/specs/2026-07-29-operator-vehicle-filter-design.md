# 操控席行动序列车辆过滤设计

> 版本：v1.0  
> 日期：2026-07-29  
> 状态：已批准  
> 方案：方案 A（前端过滤）

---

## 1. 需求背景

操控行动序列软件部署在操控席席位计算机，每台操控席计算机通过 `/user/current` 接口获取当前登录用户及其 `connected_vehicle_id`，确认该操控席连接哪辆车。

基于 `connected_vehicle_id`，软件需要：

1. **任务列表过滤**：只显示有对应车辆类型行动序列的任务
2. **详情页过滤**：只显示对应车辆的行动序列，其他车辆隐藏
3. **操作权限控制**：编辑、删除、创建、指挥控制等操作只针对对应车辆类型

---

## 2. 核心概念

| 概念 | 说明 |
|------|------|
| `connected_vehicle_id` | 当前操控席连接的车辆 ID（如 `equipment:ZD01`），从 `/user/current` 接口获取 |
| 车辆类型 | 车辆资源类型（如 `Recon-Strike-UGV`、`Patrol-UGV`），从资源池或车辆控制服务获取 |
| 任务过滤 | 只显示包含对应车辆类型行动序列的任务 |
| 行动序列过滤 | 详情页只显示对应车辆的行动序列 |
| 操作权限 | 编辑/删除/创建/控制只针对对应车辆类型 |

---

## 3. 数据流

```text
启动软件
    ↓
GET /user/current → 获取 connected_vehicle_id
    ↓
查询资源池/车辆控制服务 → 获取对应车辆类型
    ↓
GET /action-sequences/operator/plans → 获取任务列表
    ↓
前端过滤：只显示有对应车辆类型行动序列的任务
    ↓
用户点击任务 → GET /action-sequences/operator/plans/{planId}
    ↓
前端过滤：只显示对应车辆的行动序列，其他车辆隐藏
    ↓
编辑/删除/创建/控制 → 只针对对应车辆类型
```

---

## 4. 实现方案（方案 A：前端过滤）

### 4.1 初始化流程

**文件**：`ActionSequencePanel.vue`

```javascript
// 新增状态
const connectedVehicleId = ref('');      // 当前连接的车辆 ID
const connectedVehicleType = ref('');    // 当前连接的车辆类型
const isVehicleConnected = ref(false);   // 是否已连接车辆

// 启动时初始化
onMounted(async () => {
  await initConnectedVehicle();
  loadOnlineVehicles();
  loadPlans();
  updateMarqueeStates();
  startPlanEventStream();
  ...
});

// 初始化连接车辆
const initConnectedVehicle = async () => {
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
    appendSystemMessage('初始化车辆连接失败：' + err.message);
  }
};
```

### 4.2 任务列表过滤

**文件**：`ActionSequencePanel.vue`

```javascript
// 修改 loadPlans，增加过滤逻辑
const loadPlans = async (silent = false) => {
  if (!silent) loadingPlans.value = true;
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

### 4.3 详情页过滤

**文件**：`ActionSequencePanel.vue`

```javascript
// 修改 vehicleActions computed，只显示对应车辆的行动序列
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

### 4.4 操作权限控制

**文件**：`ActionSequencePanel.vue`

```javascript
// 修改编辑/删除/创建/控制按钮的显示逻辑
const canOperateVehicle = (vehicle) => {
  if (!isControlMode.value || !isVehicleConnected.value) {
    return true; // 非操控席或未连接车辆时，允许所有操作
  }
  return vehicle.vid === connectedVehicleId.value;
};

// 编辑按钮
<button
  v-if="canOperateVehicle(vehicle)"
  class="as-btn mini"
  type="button"
  @click="openCreatorForEdit(vehicle)"
>
  编辑
</button>

// 删除按钮
<button
  v-if="canOperateVehicle(vehicle)"
  class="as-btn mini danger"
  type="button"
  @click="confirmDeleteVehicleActions(vehicle)"
>
  删除
</button>

// 控制按钮（开始/暂停/继续/停止）
<template v-if="canOperateVehicle(vehicle)">
  <template v-if="getVehicleRuntimeState(vehicle) === 'SCHEDULED'">
    <button class="as-btn mini primary" @click="executeControl('start', [vehicle.vid])">开始</button>
  </template>
  ...
</template>
```

---

## 5. 接口变更

### 5.1 新增前端接口

**文件**：`coordinationApi.js`

```javascript
/** 查询当前登录用户信息 */
export const fetchCurrentUser = async () => {
  const result = await getJson(joinApiUrl('/user/current'));
  if (!result.ok) return result;
  return { ok: true, data: result.data };
};

/** 查询车辆信息 */
export const fetchVehicleInfo = async (vehicleId) => {
  const result = await getJson(joinApiUrl(`/vehicle/info/${vehicleId}`));
  if (!result.ok) return result;
  return { ok: true, data: result.data };
};
```

### 5.2 后端接口（无需变更）

- `GET /user/current`：已存在，返回 `connected_vehicle_id`
- `GET /vehicle/info/{vehicleId}`：已存在，返回车辆类型
- `GET /action-sequences/operator/plans`：无需变更，返回全部任务
- `GET /action-sequences/operator/plans/{planId}`：无需变更，返回完整 plan

---

## 6. 异常处理

| 场景 | 处理 |
|------|------|
| `/user/current` 返回异常 | `isVehicleConnected = false`，显示空列表，提示"未连接车辆" |
| `connected_vehicle_id` 为空 | `isVehicleConnected = false`，显示空列表，提示"未连接车辆" |
| 无法获取车辆类型 | `isVehicleConnected = false`，显示空列表，提示"无法获取车辆类型" |
| 任务中没有对应车辆类型 | 显示空列表，提示"没有找到包含 X 类型车辆行动序列的任务" |
| 非操控席模式 | 不过滤，显示所有任务和行动序列 |

---

## 7. 测试要点

1. **正常流程**：
   - 连接 ZD01 车辆，只显示有 Recon-Strike-UGV 行动序列的任务
   - 详情页只显示 ZD01 的行动序列
   - 只能编辑/删除/控制 ZD01 的行动序列

2. **异常流程**：
   - 未连接车辆时显示空列表
   - 任务中没有对应车辆类型时显示空列表
   - 非操控席模式显示所有任务

3. **边界情况**：
   - 多辆相同类型车辆（如 ZD01 和 ZD02 都是 Recon-Strike-UGV）时，只显示 connected_vehicle_id 对应的车辆
   - 切换 connected_vehicle_id 后，任务列表和行动序列正确更新

---

## 8. 后续优化方向

1. **后端过滤**：如果数据量较大，可将任务列表过滤迁移到后端
2. **缓存车辆类型**：避免每次启动都查询车辆类型
3. **多车辆支持**：支持 connected_vehicle_id 为列表，显示多辆车的行动序列
