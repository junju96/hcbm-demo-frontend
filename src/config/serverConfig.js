/**
 * 服务地址集中配置
 *
 * 所有外部服务地址统一定义在此文件中，便于查找和修改。
 * 支持运行时覆盖：localStorage key `missionDemoServerOverrides`（JSON 对象，{导出常量名: 覆盖地址}），
 * 在调试弹窗（行动序列面板「调试」按钮）中修改，刷新页面后生效；无覆盖时使用下方默认值。
 */

const OVERRIDES_STORAGE_KEY = 'missionDemoServerOverrides';

const loadServerOverrides = () => {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const serverOverrides = loadServerOverrides();

// ========== 后端服务 ==========
// 后端服务（生产环境；协同席/操控席/调试接口共用）
const DEFAULT_COORDINATION_BASE_URL = 'http://25.11.1.222:28600';
export const COORDINATION_BASE_URL = serverOverrides.COORDINATION_BASE_URL || DEFAULT_COORDINATION_BASE_URL;

// ========== 数据服务器 ==========
// 态势池服务
const DEFAULT_SITUATION_POOL_BASE_URL = 'http://25.11.1.178:28802';
export const SITUATION_POOL_BASE_URL = serverOverrides.SITUATION_POOL_BASE_URL || DEFAULT_SITUATION_POOL_BASE_URL;

// 空地车空中侦察规划服务（/air-recon/plan）
// 按《空地车空中侦察规划接口说明》：部署在 25.11.1.178
const DEFAULT_AIR_RECON_PLAN_BASE_URL = 'http://25.11.1.178:28505';
export const AIR_RECON_PLAN_BASE_URL = serverOverrides.AIR_RECON_PLAN_BASE_URL || DEFAULT_AIR_RECON_PLAN_BASE_URL;

// ========== 地图服务 ==========
// 地图服务
const DEFAULT_MAP_SERVICE_BASE_URL = 'http://25.11.1.178:28001';
export const MAP_SERVICE_BASE_URL = serverOverrides.MAP_SERVICE_BASE_URL || DEFAULT_MAP_SERVICE_BASE_URL;

// ========== 通知服务 ==========
// 通知中心服务
const DEFAULT_NOTIFICATION_BASE_URL = 'http://25.11.1.178:28004';
export const NOTIFICATION_BASE_URL = serverOverrides.NOTIFICATION_BASE_URL || DEFAULT_NOTIFICATION_BASE_URL;

// ========== 系统设置 ==========
// API 基础地址（兼容旧配置）
const DEFAULT_API_BASE_URL = 'http://25.11.1.178:28600';
export const API_BASE_URL = serverOverrides.API_BASE_URL || DEFAULT_API_BASE_URL;

const DEFAULT_VALUES = Object.freeze({
  COORDINATION_BASE_URL: DEFAULT_COORDINATION_BASE_URL,
  SITUATION_POOL_BASE_URL: DEFAULT_SITUATION_POOL_BASE_URL,
  AIR_RECON_PLAN_BASE_URL: DEFAULT_AIR_RECON_PLAN_BASE_URL,
  MAP_SERVICE_BASE_URL: DEFAULT_MAP_SERVICE_BASE_URL,
  NOTIFICATION_BASE_URL: DEFAULT_NOTIFICATION_BASE_URL,
  API_BASE_URL: DEFAULT_API_BASE_URL,
});

const EFFECTIVE_VALUES = {
  COORDINATION_BASE_URL,
  SITUATION_POOL_BASE_URL,
  AIR_RECON_PLAN_BASE_URL,
  MAP_SERVICE_BASE_URL,
  NOTIFICATION_BASE_URL,
  API_BASE_URL,
};

/** 调试弹窗可编辑的前端服务地址表 */
export const SERVER_CONFIG_SCHEMA = Object.freeze([
  // COORDINATION_BASE_URL 实际是全业务后端服务地址（协同席/操控席/调试接口共用），标签保持中性
  { key: 'COORDINATION_BASE_URL', label: '后端服务 API' },
  { key: 'NOTIFICATION_BASE_URL', label: '通知中心' },
  { key: 'SITUATION_POOL_BASE_URL', label: '态势池' },
  { key: 'AIR_RECON_PLAN_BASE_URL', label: '空中侦察规划' },
  { key: 'MAP_SERVICE_BASE_URL', label: '地图服务' },
]);

/**
 * 返回每项配置的 {key, label, defaultValue, effectiveValue, overridden} 列表，
 * 供调试弹窗展示/编辑。
 */
export const getEffectiveServerConfig = () =>
  SERVER_CONFIG_SCHEMA.map(({ key, label }) => ({
    key,
    label,
    defaultValue: DEFAULT_VALUES[key],
    effectiveValue: EFFECTIVE_VALUES[key],
    overridden: Boolean(serverOverrides[key]),
  }));

/**
 * 合并写入覆盖表到 localStorage；值为空串/null/undefined 时删除该键（恢复默认）。
 * 刷新页面后生效。
 */
export const saveServerOverrides = (patch = {}) => {
  let current = {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') current = parsed;
    }
  } catch {
    current = {};
  }
  for (const [key, value] of Object.entries(patch)) {
    const normalized = String(value ?? '').trim();
    if (normalized) {
      current[key] = normalized;
    } else {
      delete current[key];
    }
  }
  try {
    if (Object.keys(current).length === 0) {
      localStorage.removeItem(OVERRIDES_STORAGE_KEY);
    } else {
      localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // ignore
  }
};

/** 清空全部覆盖（恢复默认），刷新页面后生效 */
export const clearServerOverrides = () => {
  try {
    localStorage.removeItem(OVERRIDES_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export default {
  COORDINATION_BASE_URL,
  SITUATION_POOL_BASE_URL,
  MAP_SERVICE_BASE_URL,
  NOTIFICATION_BASE_URL,
  AIR_RECON_PLAN_BASE_URL,
  API_BASE_URL,
};
