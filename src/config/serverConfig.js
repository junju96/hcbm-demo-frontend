/**
 * 服务地址集中配置
 *
 * 所有外部服务地址统一定义在此文件中，便于查找和修改。
 * 修改后需重启前端开发服务器生效。
 */

// ========== 后端服务 ==========
// 本地后端服务（开发环境）
export const BACKEND_BASE_URL = 'http://localhost:28600';

// 协同席数据服务（生产环境）
export const COORDINATION_BASE_URL = 'http://25.11.1.222:28600';

// ========== 数据服务器 ==========
// 态势池服务
export const SITUATION_POOL_BASE_URL = 'http://25.11.1.178:28802';

// 空地车空中侦察规划服务（/air-recon/plan）
// 按《空地车空中侦察规划接口说明》：部署在 25.11.1.178
export const AIR_RECON_PLAN_BASE_URL = 'http://25.11.1.178:28505';

// ========== 地图服务 ==========
// 地图服务
export const MAP_SERVICE_BASE_URL = 'http://25.11.1.178:28001';

// ========== 通知服务 ==========
// 通知中心服务
export const NOTIFICATION_BASE_URL = 'http://25.11.1.178:28004';

// ========== 系统设置 ==========
// API 基础地址（兼容旧配置）
export const API_BASE_URL = 'http://25.11.1.178:28600';

export default {
  BACKEND_BASE_URL,
  COORDINATION_BASE_URL,
  SITUATION_POOL_BASE_URL,
  MAP_SERVICE_BASE_URL,
  NOTIFICATION_BASE_URL,
  AIR_RECON_PLAN_BASE_URL,
  API_BASE_URL,
};
