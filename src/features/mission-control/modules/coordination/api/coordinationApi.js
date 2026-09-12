// coordinationApi.js — 协同指控模块后端 API 封装
// 职责：统一 HTTP 请求 + 后端数据 → 前端数据模型适配

import { COORDINATION_BASE_URL } from '../../../../../config/serverConfig.js';

const joinApiUrl = (path) => {
  // 开发环境通过 Vite proxy 走相对路径，避免跨域
  if (import.meta.env.DEV) {
    return path;
  }
  const base = COORDINATION_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
};

export const safeFetch = async (url, options) => {
  // 默认 8 秒超时，避免地图服务等不可达时界面一直等待
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options?.timeout || 8000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, data: null };
    }
    const data = await response.json();
    return { ok: true, error: null, data };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      return { ok: false, error: '请求超时', data: null };
    }
    return { ok: false, error: error?.message || 'Network error', data: null };
  }
};

/* ==================== 通用工具 ==================== */

const postJson = (url, body) =>
  safeFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const getJson = (url) =>
  safeFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

const deleteJson = (url) =>
  safeFetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

const patchJson = (url, body) =>
  safeFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/* ==================== Task Pool 资源查询 ==================== */

/**
 * 查询资源列表（通用）
 * @param {{task_type?: string, limit?: number, keyword?: string, state?: string}} query
 */
export const fetchTaskPoolResources = async (query = {}) => {
  const result = await postJson(joinApiUrl('/api/v1/task_pool/resources/query'), {
    limit: 50,
    ...query,
  });
  if (!result.ok) return result;
  const items = (result.data?.data?.items || []).map(adaptBackendResource);
  return { ok: true, data: { items, total: result.data?.data?.total || 0 } };
};

/**
 * 按标签查询资源
 * @param {string} tag - 如 'EQUIPMENT', 'TARGET', 'KILL_CHAIN', 'PLAN'
 */
export const fetchResourcesByTag = async (tag) =>
  fetchTaskPoolResources({ task_type: tag });

/* ==================== 杀伤链 API ==================== */

/** 获取杀伤链详情 */
export const fetchKillChainDetail = async (killChainId) => {
  const result = await getJson(joinApiUrl(`/api/v1/kill-chains/${killChainId}`));
  if (!result.ok) return result;
  const raw = result.data?.data || {};
  // 适配为前端杀伤链详情格式
  const detail = {
    kill_chain_id: raw.kill_chain_id,
    title: raw.title,
    state: raw.state,
    description: raw.description,
    targets: (raw.target_ids || []).map((tid) => ({
      target_id: tid.replace('target:', ''),
      name: tid.replace('target_', '目标').replace('target-', '目标'),
      source: '地图单选或框选结果',
    })),
    // entries 合并 raw_entries 和 assigned_entries，assigned 覆盖 raw（保留原始 entry_id）
    entries: (() => {
      const rawMap = new Map((raw.raw_entries || []).map((e) => [e.entry_id, adaptKillChainEntry(e, raw)]));
      (raw.assigned_entries || []).forEach((a) => {
        const adapted = adaptKillChainEntry(a, raw);
        rawMap.set(a.entry_id, adapted);
      });
      return Array.from(rawMap.values()).sort((a, b) => (a.entry_seq || 0) - (b.entry_seq || 0));
    })(),
    network: raw.network,
    mapping_summary: raw.mapping_summary,
    // 保留原始字段供调试
    _raw: raw,
  };
  return { ok: true, data: detail };
};

/** 更新杀伤链（title / description / state 等通用字段） */
export const updateKillChain = async (killChainId, payload) => {
  const result = await patchJson(joinApiUrl(`/api/v1/kill-chains/${killChainId}`), payload);
  if (!result.ok) return result;
  return { ok: true, data: result.data?.data || {} };
};

/** 增加杀伤链条目 */
export const addKillChainEntry = async (killChainId, payload) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/entries`),
    payload
  );
  return result;
};

/** 删除杀伤链条目 */
export const deleteKillChainEntry = async (killChainId, entryId) => {
  const result = await deleteJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/entries/${entryId}`)
  );
  return result;
};

/** 自动分配（单条） */
export const autoAllocateKillChainEntry = async (killChainId, entryId, payload) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/entries/${entryId}/auto-allocate`),
    payload
  );
  return result;
};

/** 批量自动分配 — 调用 sichen 火力规划 */
export const batchAutoAllocateKillChain = async (killChainId, entryIds = []) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/batch-auto-allocate`),
    { entry_ids: entryIds }
  );
  return result;
};

/** 人工分配 */
export const manualAllocateKillChainEntry = async (killChainId, entryId, payload) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/entries/${entryId}/allocate`),
    payload
  );
  return result;
};

/** 生成行动方案 */
export const generatePlanFromKillChain = async (killChainId, payload) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/generate-plan`),
    payload
  );
  return result;
};

/** 下发杀伤链分配方案（把本地修改提交到后端并发送给无人车） */
export const dispatchKillChain = async (killChainId, payload) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/dispatch`),
    payload
  );
  return result;
};

/** 激活杀伤链 */
export const activateKillChain = async (killChainId) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/activate`),
    {}
  );
  return result;
};

/** 静默杀伤链 */
export const deactivateKillChain = async (killChainId) => {
  const result = await postJson(
    joinApiUrl(`/api/v1/kill-chains/${killChainId}/deactivate`),
    {}
  );
  return result;
};

/** 批量导入资源到 task_pool */
export const importResources = async (resources, ignoreErrors = false) => {
  const result = await postJson(
    joinApiUrl('/api/v1/task_pool/ingestion/import'),
    { resources, ignore_errors: ignoreErrors }
  );
  return result;
};

/** 提交 pending 资源 */
export const commitResources = async (cacheKeys = []) => {
  const result = await postJson(
    joinApiUrl('/api/v1/task_pool/ingestion/commit'),
    { cache_keys: cacheKeys }
  );
  return result;
};

/* ==================== 数据适配 ==================== */

function adaptKillChainEntry(entry, parentRaw) {
  const targetDisplay = parentRaw?.attributes?.target_display || {};
  const targetNames = (entry.target_ids || []).map((tid) => {
    return targetDisplay[tid] || tid.replace('target:', '');
  });

  return {
    entry_id: entry.entry_id,
    target_ids: entry.target_ids || [],
    target_names: targetNames,
    operation: entry.operation,
    source: entry.phase === 'ASSIGNED' ? 'assigned-model' : 'raw-model',
    valid: entry.is_valid !== false,
    executor_assignments: (entry.executor_options || []).map((opt) => ({
      executor_name: opt.executor_id?.replace('equipment:', '') || opt.executor_id,
      target_name: targetNames[0] || '',
      locked: opt.locked || false,
      note: opt.note,
      allocation_count: opt.allocation_count,
    })),
    selected_executor: entry.selected_executor,
    locked: entry.locked,
    notes: entry.notes,
    _raw: entry,
  };
}

/**
 * 将后端资源对象适配为前端 ResourceCatalogPanel 期望的格式
 */
export function adaptBackendResource(backendItem) {
  if (!backendItem || typeof backendItem !== 'object') return backendItem;

  const taskType = backendItem.task_type;

  // 通用字段
  const base = {
    resource_id: backendItem.resource_id,
    resource_name:
      backendItem.resource_name ||
      backendItem.target_name ||
      backendItem.title ||
      backendItem.name ||
      '',
    resource_tag: backendItem.resource_tag || mapTaskTypeToTag(taskType),
    resource_type: backendItem.resource_type || taskType || 'UNKNOWN',
    connections: {
      connected_commands: [],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [],
    },
  };

  switch (taskType) {
    case 'TARGET':
      base.resource_detail = adaptTargetDetail(backendItem);
      break;
    case 'EQUIPMENT':
      base.resource_detail = adaptEquipmentDetail(backendItem);
      break;
    case 'KILL_CHAIN':
      base.resource_detail = { ...backendItem };
      break;
    case 'PLAN':
      base.resource_detail = { ...backendItem };
      break;
    default:
      base.resource_detail = { ...backendItem };
  }

  return base;
}

function mapTaskTypeToTag(taskType) {
  const map = {
    TARGET: 'TS_TARGET',
    EQUIPMENT: 'EQUIPMENT',
    FIREPOWER: 'FIREPOWER',
    RECON: 'RECON',
    SUPPORT: 'SUPPORT',
    KILL_CHAIN: 'KILL_CHAIN',
    PLAN: 'PLAN',
    MISSION: 'MISSION',
  };
  return map[taskType] || taskType || 'UNKNOWN';
}

function adaptTargetDetail(item) {
  const loc = item.location || {};
  const locationArr =
    loc.latitude !== undefined
      ? [
          {
            point: 'point-1',
            latitude: String(loc.latitude),
            longitude: String(loc.longitude),
            altitude: String(loc.altitude ?? 0),
          },
        ]
      : [];

  return {
    type: (item.foe || 'unknown').toLowerCase(),
    threat_level: (item.threat_level || 'unknown').toLowerCase(),
    value: 'unknown',
    motion: 'static',
    intent: 'unknown',
    handle_tier: (item.threat_level || 'unknown').toLowerCase(),
    suggestion: '无',
    location: locationArr,
  };
}

function adaptEquipmentDetail(item) {
  const cap = item.capacity || {};
  return {
    platform_type: item.resource_type || 'UNKNOWN',
    running_status: (item.online_status || 'unknown').toLowerCase(),
    payload_modules: [],
    mobility: {
      max_range_km: cap.max_range_km ?? '—',
      max_speed_kmh: cap.max_speed_kmh ?? '—',
      terrain_adaptability: 'complex_ground',
    },
    strike_capability: {
      max_range_km: cap.strike_range_km ?? 0,
      weapon_types: cap.strike_range_km ? ['打击武器'] : [],
    },
    recon_capability: {
      max_range_km: cap.recon_range_km ?? 0,
      methods: cap.recon_range_km ? ['侦察'] : [],
    },
    current_task: item.online_status === 'ONLINE' ? '在线待命' : '离线',
  };
}

/* ==================== 行动序列 API ==================== */

/** 获取行动方案列表 */
export const fetchActionSequencePlans = async () => {
  const result = await getJson(joinApiUrl('/api/v1/action-sequences/plans'));
  if (!result.ok) return result;
  const items = result.data?.data?.items || [];
  return { ok: true, data: { items, total: result.data?.data?.total || 0 } };
};

/** 获取方案详情（含行动序列） */
export const fetchActionSequencePlanDetail = async (planId) => {
  const result = await getJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}`));
  if (!result.ok) return result;
  const raw = result.data?.data || {};
  return { ok: true, data: raw };
};

/** 开始执行 */
export const startActionSequence = async (planId) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/start`), {});
  return result;
};

/** 暂停执行 */
export const pauseActionSequence = async (planId) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/pause`), {});
  return result;
};

/** 继续执行 */
export const resumeActionSequence = async (planId) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/resume`), {});
  return result;
};

/** 停止/重置 */
export const stopActionSequence = async (planId) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/stop`), {});
  return result;
};

/** 下发行动序列到无人车（通过 Zenoh MissionService/send_mission） */
export const dispatchActionSequence = async (planId, payload = {}) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/dispatch`), payload);
  return result;
};

/** 更新行动中指定 action 的 param */
export const updateActionParam = async (planId, actionId, param) => {
  const result = await patchJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/actions/${actionId}`), {
    param,
  });
  return result;
};

/** 操控端 — 更新行动中指定 action 的 param */
export const updateOperatorActionParam = async (planId, actionId, param) => {
  const result = await patchJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/actions/${actionId}`), {
    param,
  });
  return result;
};

/** 查询本地资源池资源（ROUTE / AREA / TARGET 等） */
export const fetchResourcePoolByType = async (taskType, limit = 50) => {
  const result = await getJson(joinApiUrl(`/api/v1/resources/by_type/${taskType}?limit=${limit}`));
  if (!result.ok) return result;
  const items = result.data?.data?.items || [];
  return { ok: true, data: { items, total: result.data?.data?.total || 0 } };
};

/** 获取当前已连接的无人车列表（协同席） */
export const fetchActionSequenceVehicles = async () => {
  const result = await getJson(joinApiUrl('/api/v1/action-sequences/vehicles'));
  if (!result.ok) return result;
  const items = result.data?.data?.items || [];
  return { ok: true, data: { items, total: result.data?.data?.total || 0 } };
};

/** 协同席 — 新建空行动方案（仅标题，无行动序列数据） */
export const createPlan = async (payload = {}) => {
  const result = await postJson(joinApiUrl('/api/v1/action-sequences/plans'), payload);
  return result;
};

/** 协同席 — 仅本地更新行动序列方案（不同步数据服务器） */
export const patchPlan = async (planId, payload = {}) => {
  const result = await patchJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}`), payload);
  return result;
};

/** 协同席 — 删除方案中指定车辆的行动序列（会同步把数据服务器上 action/car_action 置 DELETED） */
export const deleteVehicle = async (planId, vid) => {
  const encodedVid = encodeURIComponent(String(vid));
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/vehicles/${encodedVid}/delete`), {});
  return result;
};

/** 协同席 — 将行动方案通过数据服务器 /ingestion/forward 下发到指定席位 */
export const dispatchForwardPlan = async (planId, targetIps = [], timeoutSeconds = 30) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/plans/${planId}/dispatch-forward`), {
    target_ips: targetIps,
    timeout_seconds: timeoutSeconds,
  });
  return result;
};

/* ==================== 操控端行动序列 API ==================== */

/** 操控端 — 获取车辆控制服务当前已连接车辆列表（用于选择实车） */
export const fetchOperatorConnectedVehicles = async () => {
  const result = await getJson(joinApiUrl('/api/v1/action-sequences/operator/connected-vehicles'));
  if (!result.ok) return result;
  return { ok: true, data: result.data?.data || { items: [], selected: null, total: 0 } };
};

/** 查询当前登录用户信息 */
export const fetchCurrentUser = async () => {
  const result = await getJson(joinApiUrl('/user/current'));
  if (!result.ok) return result;
  return { ok: true, data: result.data };
};



/** 操控端 — 选中一辆车并订阅 zenoh 反馈 */
export const selectOperatorVehicle = async (vehicleId) => {
  const result = await postJson(joinApiUrl('/api/v1/action-sequences/operator/select-vehicle'), { vehicle_id: vehicleId });
  return result;
};

/** 操控端 — 获取当前已连接的无人车列表 */
export const fetchOperatorVehicles = async () => {
  const result = await getJson(joinApiUrl('/api/v1/action-sequences/operator/vehicles'));
  if (!result.ok) return result;
  const items = result.data?.data?.items || [];
  return { ok: true, data: { items, total: result.data?.data?.total || 0 } };
};

/** 操控端 — 获取行动方案列表 */
export const fetchOperatorPlans = async () => {
  const result = await getJson(joinApiUrl('/api/v1/action-sequences/operator/plans'));
  if (!result.ok) return result;
  const items = result.data?.data?.items || [];
  return { ok: true, data: { items, total: result.data?.data?.total || 0 } };
};

/** 操控端 — 获取方案详情 */
export const fetchOperatorPlanDetail = async (planId) => {
  const result = await getJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}`));
  if (!result.ok) return result;
  const raw = result.data?.data || {};
  return { ok: true, data: raw };
};

/**
 * 生成下一个顺序 plan id：plan-六位数字
 * 取现有 plan 中 `plan-<数字>` 形式 id 的数字后缀最大值 +1，不足 6 位补零（超出 6 位继续递增）。
 * 旧格式 PLAN_<时间戳> 不参与编号。
 */
export const nextSequentialPlanId = (plans = []) => {
  let max = 0;
  for (const p of plans || []) {
    const m = /^plan-(\d+)$/i.exec(String(p?.plan_id || ''));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `plan-${String(max + 1).padStart(6, '0')}`;
};

/** 操控端 — 开始执行 */
export const startOperatorPlan = async (planId, vehicleVid = null) => {
  const qs = vehicleVid ? `?vehicle_vid=${encodeURIComponent(vehicleVid)}` : '';
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/start${qs}`), {});
  return result;
};

/** 操控端 — 暂停执行 */
export const pauseOperatorPlan = async (planId, vehicleVid = null) => {
  const qs = vehicleVid ? `?vehicle_vid=${encodeURIComponent(vehicleVid)}` : '';
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/pause${qs}`), {});
  return result;
};

/** 操控端 — 继续执行 */
export const resumeOperatorPlan = async (planId, vehicleVid = null) => {
  const qs = vehicleVid ? `?vehicle_vid=${encodeURIComponent(vehicleVid)}` : '';
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/resume${qs}`), {});
  return result;
};

/** 操控端 — 停止/重置 */
export const stopOperatorPlan = async (planId, vehicleVid = null) => {
  const qs = vehicleVid ? `?vehicle_vid=${encodeURIComponent(vehicleVid)}` : '';
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/stop${qs}`), {});
  return result;
};

/** 操控端 — 下发到无人车（Zenoh send_mission） */
export const dispatchOperatorPlan = async (planId, payload = {}) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/dispatch`), payload);
  return result;
};

/** 操控端 — 协同任务授权下发/解除（MissionService set_cooperative_authorization） */
export const setCooperativeAuthorization = async (payload = {}) => {
  const result = await postJson(joinApiUrl('/api/v1/action-sequences/operator/cooperative-authorization'), payload);
  return result;
};

/** 操控端 — 新建行动序列方案 */
export const createOperatorPlan = async (payload = {}) => {
  const result = await postJson(joinApiUrl('/api/v1/action-sequences/operator/plans'), payload);
  return result;
};

/** 操控端 — 仅本地更新行动序列方案（不同步数据服务器） */
export const patchOperatorPlan = async (planId, payload = {}) => {
  const result = await patchJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}`), payload);
  return result;
};

/** 操控端 — 把本地 plan 同步到数据服务器 */
export const syncOperatorPlanToDataServer = async (planId) => {
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/sync`), {});
  return result;
};

/** 操控端 — 删除方案中指定车辆的行动序列（会同步把数据服务器上 action/car_action 置 DELETED） */
export const deleteOperatorVehicle = async (planId, vid) => {
  // 保留完整 vid（如 equipment:ZD02），后端按完整 vid 匹配 car_action
  const encodedVid = encodeURIComponent(String(vid));
  const result = await postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${planId}/vehicles/${encodedVid}/delete`), {});
  return result;
};

/* ==================== 态势池 API ==================== */

import { SITUATION_POOL_BASE_URL } from '../../../../../config/serverConfig.js';

const joinSituationUrl = (path) => {
  if (import.meta.env.DEV) {
    return path;
  }
  const base = SITUATION_POOL_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
};

/**
 * 从态势池获取 FUSIONED_TARGET 列表
 * 按 target_shape 区分：region / line / route / point
 */
export const fetchFusionedTargets = async (limit = 200) => {
  const result = await getJson(
    joinSituationUrl(`/api/v1/situation_pool/resources/simple/by_type/FUSIONED_TARGET?limit=${limit}`)
  );
  if (!result.ok) return result;
  const items = (result.data || []).map(adaptFusionedTarget);
  return { ok: true, data: { items, total: items.length } };
};

/* ==================== 空地车空中侦察规划 API ==================== */

import { AIR_RECON_PLAN_BASE_URL } from '../../../../../config/serverConfig.js';

const joinAirReconUrl = (path) => {
  if (import.meta.env.DEV) {
    return path;
  }
  const base = AIR_RECON_PLAN_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
};

/**
 * 空地车空中侦察规划（POST /air-recon/plan）：
 * 入参 { vehicles: [{ vehicle_id, position:{lon,lat,alt}, target_area:{target_id,target_name,location[]} }] }
 * （position 为无人机起飞位置 recon_position）
 * 返回 { action_sequence: [{ vehicle_id, actions: [{ param: { service: { points1: [...], points2: [...], points3: [...] } } }] }] }
 * （points1/2/3 为三架无人机各自的航迹点数组）
 */
export const fetchAirReconPlan = async (payload = {}) => {
  const result = await postJson(joinAirReconUrl('/air-recon/plan'), payload);
  if (!result.ok) return result;
  return { ok: true, data: result.data || {} };
};

function adaptFusionedTarget(raw) {
  const locArr = Array.isArray(raw?.target_location) ? raw.target_location : [];
  const points = locArr
    .filter((pt) => pt && typeof pt === 'object')
    .map((pt) => ({
      lon: Number(pt.lng ?? pt.longitude ?? 0),
      lat: Number(pt.lat ?? pt.latitude ?? 0),
      alt: Number(pt.alt ?? pt.altitude ?? 0),
    }));

  return {
    resource_id: raw.resource_id,
    resource_name: raw.target_name || raw.target_id || raw.resource_id,
    title: raw.target_name || raw.target_id || raw.resource_id,
    target_shape: raw.target_shape,
    target_type: raw.target_type,
    target_description: raw.target_description || '',
    state: raw.state,
    points,
    // 保留原始数据供调试
    _raw: raw,
  };
}

/* ==================== 地图上图通知（由数据服务器负责实际上图） ==================== */

/** 协同席 — 方案条目被点击，通知协同席数据服务器（PATCH last_click） */
export const notifyPlanMapClicked = async (planId) =>
  postJson(joinApiUrl(`/api/v1/action-sequences/plans/${encodeURIComponent(planId)}/map-notify`), {});

/** 操控席 — 方案条目被点击，通知操控席数据服务器（PATCH last_click） */
export const notifyOperatorPlanMapClicked = async (planId) =>
  postJson(joinApiUrl(`/api/v1/action-sequences/operator/plans/${encodeURIComponent(planId)}/map-notify`), {});

/* ==================== 命令分解 / 更新（已有逻辑迁移至此） ==================== */

export const COORDINATION_API_URLS = Object.freeze({
  decompose: '/commandAndControl/command_decompose',
  update: '/commandAndControl/command_update',
});

const nowId = () => String(Date.now()).slice(-8);

export const buildDecomposeRequest = (commandId, requestId = nowId()) => ({
  RequestType: 'DECOMPOSE',
  RequestID: requestId,
  RequestData: { CommandID: commandId },
});

export const buildUpdateRequest = ({
  operation,
  commandIds = [],
  missionIds = [],
  resourceIds = [],
  requestId = nowId(),
}) => ({
  RequestType: 'UPDATE',
  RequestID: requestId,
  RequestData: {
    UpdateDetail: {
      operation,
      master_type: 'command',
      command_id: commandIds,
      mission_id: missionIds,
      resource_id: resourceIds,
    },
  },
});

export const buildUpdateResponse = ({ operation, requestId = nowId(), result = 'success' }) => ({
  code: 200,
  responseID: requestId,
  data: { operation, result },
});
