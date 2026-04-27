const nowId = () => String(Date.now()).slice(-8);

export const COORDINATION_API_URLS = Object.freeze({
  decompose: '/commandAndControl/command_decompose',
  update: '/commandAndControl/command_update',
});

/**
 * @typedef {{
 *  commands: number[],
 *  missions: number[],
 *  plans: number[],
 *  instant_plans: number[],
 *  resources: number[]
 * }} DependencyRefs
 */

/**
 * @typedef {{
 *  content: string,
 *  description: string,
 *  target: string,
 *  time: string,
 *  duration: string
 * }} MissionDetail
 */

/**
 * @typedef {{
 *  mission_id: number,
 *  mission_name: string,
 *  mission_type: string,
 *  mission_detail: MissionDetail,
 *  dependencies: DependencyRefs,
 *  connections: {
 *    connected_commands: number[],
 *    connected_plans: number[],
 *    connected_instant_plans: number[],
 *    connected_resources: number[]
 *  }
 * }} MissionRecord
 */

/**
 * @typedef {{
 *  RequestType: 'DECOMPOSE',
 *  RequestID: string,
 *  RequestData: { CommandID: string }
 * }} DecomposeRequest
 */

/**
 * @typedef {{
 *  RequestType: 'UPDATE',
 *  RequestID: string,
 *  RequestData: {
 *    UpdateDetail: {
 *      operation: 'associate'|'delete',
 *      master_type: 'command',
 *      command_id: number[],
 *      mission_id: number[],
 *      resource_id: number[]
 *    }
 *  }
 * }} UpdateRequest
 */

/**
 * @typedef {{
 *  code: number,
 *  responseID: string,
 *  data: {
 *    commandId: string,
 *    Analys_results: {
 *      mission_info: number[],
 *      resource_info: number[]
 *    }
 *  }
 * }} DecomposeResponse
 */

/**
 * @typedef {{
 *  code: number,
 *  responseID: string,
 *  data: {
 *    operation: 'associate'|'delete',
 *    result: 'success'|'failed'
 *  }
 * }} UpdateResponse
 */

export const commandRecords = Object.freeze([
  {
    commandId: 'CMD-20260401-001',
    cmd_id: 1,
    name: '命令 1',
    title: '进攻战斗命令',
    sender: '上级指挥中心',
    receivedAt: '2026-03-29 08:30:00',
    priority: '高',
    statusText: '已处理',
    statusTone: 'done',
    content:
      'D方在东部10km外设立了一个重要J事目标，请立即对该目标进行ZC确认，于2026年4月1日18:00查明该区域。主要任务为：1. 立即集结，进行战前准备。2. 根据Q报部门提供的坐标，J事目标所在区域为A。3. 利用隐蔽手段接近目标，在区域B实施ZC。4. ZC结束后，迅速撤离战场，返回基地。',
    connections: {
      connected_missions: [1, 2, 3],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [1, 2],
    },
  },
  {
    commandId: 'CMD-20260401-002',
    cmd_id: 2,
    name: '命令 2',
    title: '目标打击指令',
    sender: '联合火力中心',
    receivedAt: '2026-03-29 09:15:00',
    priority: '高',
    statusText: '待理解',
    statusTone: 'pending',
    content:
      '对重点目标进行持续侦察与打击窗口准备。完成区域A态势确认后，组织前出至区域B隐蔽集结，做好打击引导与撤收准备。',
    connections: {
      connected_missions: [1, 2],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [1],
    },
  },
  {
    commandId: 'CMD-20260401-003',
    cmd_id: 3,
    name: '命令 3',
    title: '区域封控命令',
    sender: '战区联控组',
    receivedAt: '2026-03-29 10:00:00',
    priority: '中',
    statusText: '待理解',
    statusTone: 'pending',
    content:
      '组织分队对区域C执行阶段性封控，建立巡检点位，保持通信回传，配合主任务保障行动。',
    connections: {
      connected_missions: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [3],
    },
  },
]);

/** @type {MissionRecord[]} */
export const missionRecords = Object.freeze([
  {
    mission_id: 1,
    mission_name: '区域侦察命令-机动任务',
    mission_type: 'MANEUVER_TASK',
    mission_detail: {
      content: '利用隐蔽手段，机动到B区域',
      description: '利用隐蔽手段，机动到B区域，确认目标事J事目标',
      target: '区域B',
      time: '2026-03-30 18:00:00',
      duration: '待定',
    },
    dependencies: {
      commands: [1],
      missions: [],
      plans: [],
      instant_plans: [],
      resources: [],
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [2],
    },
  },
  {
    mission_id: 2,
    mission_name: '区域侦察命令-侦查任务',
    mission_type: 'RECON_TASK',
    mission_detail: {
      content: '侦查区域A',
      description: 'D方在东部10km外设立了一个重要J事目标，请立即对该目标进行ZC确认。根据Q报部门提供的坐标，J事目标所在区域为A。',
      target: '区域A',
      time: '2026-03-30 18:00:00',
      duration: '待定',
    },
    dependencies: {
      commands: [],
      missions: [1],
      plans: [],
      instant_plans: [],
      resources: [1],
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [1],
    },
  },
  {
    mission_id: 3,
    mission_name: '区域侦察命令-撤离任务',
    mission_type: 'MANEUVER_TASK',
    mission_detail: {
      content: '迅速撤离战场，返回基地',
      description: 'ZC结束后，迅速撤离战场，返回基地',
      target: '基地',
      time: '2026-03-30 18:00:00',
      duration: '待定',
    },
    dependencies: {
      commands: [],
      missions: [1, 2],
      plans: [],
      instant_plans: [],
      resources: [],
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [],
    },
  },
]);

export const RESOURCE_TAGS = Object.freeze({
  TS_TARGET: 'TS_TARGET',
  EQUIPMENT: 'EQUIPMENT',
  FIREPOWER: 'FIREPOWER',
  RECON: 'RECON',
  SUPPORT: 'SUPPORT',
});

export const RESOURCE_TAG_LABELS = Object.freeze({
  [RESOURCE_TAGS.TS_TARGET]: '态势目标',
  [RESOURCE_TAGS.EQUIPMENT]: '装备',
  [RESOURCE_TAGS.FIREPOWER]: '火力',
  [RESOURCE_TAGS.RECON]: '侦察',
  [RESOURCE_TAGS.SUPPORT]: '保障',
});

export const RESOURCE_TYPE_LABELS = Object.freeze({
  REGION: '区域',
  UGV: '无人车',
  UAV: '无人机',
  RELAY_UGV: '通信无人车',
  AMMUNITION: '弹药',
  LOITERING_MUNITION: '巡飞弹',
  FPV_DRONE: 'FPV无人机',
  LAND_SENSOR: '地面传感器',
  AIRBORNE_SENSOR: '机载传感器',
  SATELLITE: '卫星',
  SUPPLY_POINT: '补给点',
  MOBILE_SUPPORT_PLATFORM: '机动支援平台',
  AIR_SUPPORT_PLATFORM: '空中支援平台',
  MOBILE_COMMUNICATION_PLATFORM: '机动通信平台',
});

export const RESOURCE_FIELD_LABELS = Object.freeze({
  // 平台类型
  MEDIUM_TRACKED_PLATFORM: '中型履带平台',
  AIR_PLATFORM: '空中平台',
  WHEELED_SUPPORT_PLATFORM: '轮式支援平台',
  // 运行状态
  online: '在线',
  maintenance: '维护中',
  offline: '离线',
  // 地形适应
  complex_ground: '复杂地面',
  airborne: '空中',
  road_and_field: '公路野外',
  // 敌我类型
  neutral: '中立',
  enemy: '敌方',
  friendly: '友方',
  unknown: '未知',
  // 威胁等级
  low: '低',
  medium: '中',
  high: '高',
  // 运动状态
  static: '静止',
  moving: '移动',
  // 意图
  none: '无',
  // 处理等级
  // low/medium/high/unknown 与威胁等级共用
  // 武器类型
  MACHINE_GUN: '机枪',
  AUTOCANNON_40MM: '40mm自动炮',
  LOITERING_MUNITION: '巡飞弹',
  FPV: 'FPV',
  // 弹药状态
  ready: '就绪',
  standby: '待命',
  // 杀伤效能类型
  armor_penetration: '穿甲',
  fragment_and_penetration: '破片穿甲',
  fragmentation: '破片',
  // 保障类别
  supply: '补给',
  maintenance_and_supply: '维修补给',
  air_delivery: '空中投送',
  communication_relay: '通信中继',
  // 侦察方式中的英文
  link_status_monitoring: '链路监测',
  // 在线状态（侦察）
  'offline-十分钟前在线': '离线(10分钟前)',
  // 机动能力 / 当前状态的英文片段
  '固定点': '固定点',
});

export const translateResourceField = (value) => {
  if (value === null || value === undefined) return '—';
  const str = String(value);
  if (str === '') return '—';
  return RESOURCE_FIELD_LABELS[str] ?? str;
};

export const resourceRecords = Object.freeze([
  // === TS_TARGET 态势目标 ===
  {
    resource_id: 1,
    resource_name: '区域A',
    resource_tag: RESOURCE_TAGS.TS_TARGET,
    resource_type: 'REGION',
    resource_detail: {
      type: 'neutral',
      threat_level: 'low',
      value: 100,
      motion: 'static',
      intent: 'none',
      handle_tier: 'low',
      suggestion: '无',
      location: [
        { point: 'region_point_1', latitude: '115.704931', longitude: '40.281571', altitude: '2.123' },
        { point: 'region_point_2', latitude: '114.704931', longitude: '41.281571', altitude: '3.123' },
        { point: 'region_point_3', latitude: '116.704931', longitude: '42.281571', altitude: '4.123' },
        { point: 'region_point_4', latitude: '117.704931', longitude: '44.281571', altitude: '6.123' },
      ],
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [],
    },
  },
  {
    resource_id: 2,
    resource_name: '区域B',
    resource_tag: RESOURCE_TAGS.TS_TARGET,
    resource_type: 'REGION',
    resource_detail: {
      type: 'neutral',
      threat_level: 'medium',
      value: 60,
      motion: 'static',
      intent: 'none',
      handle_tier: 'medium',
      suggestion: '建议前出侦察确认',
      location: [
        { point: 'region_point_1', latitude: '115.708035', longitude: '40.287294', altitude: '3.427' },
        { point: 'region_point_2', latitude: '114.708925', longitude: '41.287294', altitude: '3.427' },
        { point: 'region_point_3', latitude: '116.704931', longitude: '42.281571', altitude: '4.123' },
        { point: 'region_point_4', latitude: '117.704931', longitude: '44.281571', altitude: '6.123' },
      ],
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [],
    },
  },
  {
    resource_id: 3,
    resource_name: '区域C',
    resource_tag: RESOURCE_TAGS.TS_TARGET,
    resource_type: 'REGION',
    resource_detail: {
      type: 'neutral',
      threat_level: 'unknown',
      value: 'unknown',
      motion: 'unknown',
      intent: 'unknown',
      handle_tier: 'unknown',
      suggestion: '无',
      location: [{ point: 'region_point_1', latitude: '115.910001', longitude: '40.110001', altitude: '2.200' }],
    },
    connections: {
      connected_commands: [3],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [],
    },
  },

  // === EQUIPMENT 装备资源 ===
  {
    resource_id: 101,
    resource_name: '无人车A',
    resource_tag: RESOURCE_TAGS.EQUIPMENT,
    resource_type: 'UGV',
    resource_detail: {
      platform_type: 'MEDIUM_TRACKED_PLATFORM',
      running_status: 'online',
      payload_modules: ['40mm自动炮', '光电侦察组件', '导航定位模块'],
      mobility: { max_range_km: 12, max_speed_kmh: 45, terrain_adaptability: 'complex_ground' },
      strike_capability: { max_range_km: 2.5, weapon_types: ['40mm穿甲弹', '40mm高爆弹'] },
      recon_capability: { max_range_km: 3, methods: ['白光', '红外'] },
      current_task: '执行中-北侧通道侦察',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [1],
      connected_instant_plans: [],
      connected_resources: [201, 301, 401],
    },
  },
  {
    resource_id: 102,
    resource_name: '无人车B',
    resource_tag: RESOURCE_TAGS.EQUIPMENT,
    resource_type: 'UGV',
    resource_detail: {
      platform_type: 'MEDIUM_TRACKED_PLATFORM',
      running_status: 'online',
      payload_modules: ['巡飞弹发射模块', '白光侦察组件', '任务计算单元'],
      mobility: { max_range_km: 12, max_speed_kmh: 42, terrain_adaptability: 'complex_ground' },
      strike_capability: { max_range_km: 4, weapon_types: ['巡飞弹'] },
      recon_capability: { max_range_km: 1.5, methods: ['热像', '白光'] },
      current_task: '空闲',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [2],
      connected_instant_plans: [],
      connected_resources: [203, 302, 404],
    },
  },
  {
    resource_id: 103,
    resource_name: '巡逻无人机',
    resource_tag: RESOURCE_TAGS.EQUIPMENT,
    resource_type: 'UAV',
    resource_detail: {
      platform_type: 'AIR_PLATFORM',
      running_status: 'maintenance',
      payload_modules: ['白光吊舱', '热像吊舱', '数据回传模块'],
      mobility: { max_range_km: 3, max_speed_kmh: 80, terrain_adaptability: 'airborne' },
      strike_capability: { max_range_km: 0, weapon_types: [] },
      recon_capability: { max_range_km: 4, methods: ['热像', '白光'] },
      current_task: '机务检查中-19分钟',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [302, 403],
    },
  },
  {
    resource_id: 104,
    resource_name: '通信无人车',
    resource_tag: RESOURCE_TAGS.EQUIPMENT,
    resource_type: 'RELAY_UGV',
    resource_detail: {
      platform_type: 'WHEELED_SUPPORT_PLATFORM',
      running_status: 'online',
      payload_modules: ['通信中继模块', '北斗授时模块', '链路管理模块'],
      mobility: { max_range_km: 12, max_speed_kmh: 38, terrain_adaptability: 'road_and_field' },
      strike_capability: { max_range_km: 0, weapon_types: [] },
      recon_capability: { max_range_km: 1, methods: ['link_status_monitoring'] },
      current_task: '执行中-区域B通信中继',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [3],
      connected_instant_plans: ['adjust-plan-1'],
      connected_resources: [401, 404],
    },
  },

  // === FIREPOWER 火力资源 ===
  {
    resource_id: 201,
    resource_name: '7.62x54mm穿甲弹',
    resource_tag: RESOURCE_TAGS.FIREPOWER,
    resource_type: 'AMMUNITION',
    resource_detail: {
      quantity: 120,
      weapon_type: 'MACHINE_GUN',
      belonging_equipment: { resource_id: 101, resource_name: '无人车A' },
      lethality: { effect_type: 'armor_penetration', effect_value: '8mm' },
      strike_range_km: 1.5,
      ammo_status: 'ready',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [101],
    },
  },
  {
    resource_id: 202,
    resource_name: '40mm穿甲弹',
    resource_tag: RESOURCE_TAGS.FIREPOWER,
    resource_type: 'AMMUNITION',
    resource_detail: {
      quantity: 80,
      weapon_type: 'AUTOCANNON_40MM',
      belonging_equipment: { resource_id: 101, resource_name: '无人车A' },
      lethality: { effect_type: 'armor_penetration', effect_value: '120mm' },
      strike_range_km: 2.5,
      ammo_status: 'ready',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [1],
      connected_instant_plans: [],
      connected_resources: [101],
    },
  },
  {
    resource_id: 203,
    resource_name: '巡飞弹',
    resource_tag: RESOURCE_TAGS.FIREPOWER,
    resource_type: 'LOITERING_MUNITION',
    resource_detail: {
      quantity: 4,
      weapon_type: 'LOITERING_MUNITION',
      belonging_equipment: { resource_id: 102, resource_name: '无人车B' },
      lethality: { effect_type: 'fragment_and_penetration', effect_value: '300m；破片10m；穿甲' },
      strike_range_km: 4,
      ammo_status: 'ready',
    },
    connections: {
      connected_commands: [2],
      connected_plans: [3],
      connected_instant_plans: [],
      connected_resources: [102, 301],
    },
  },
  {
    resource_id: 204,
    resource_name: 'FPV',
    resource_tag: RESOURCE_TAGS.FIREPOWER,
    resource_type: 'FPV_DRONE',
    resource_detail: {
      quantity: 6,
      weapon_type: 'FPV',
      belonging_equipment: { resource_id: 'ally-uav-group-1', resource_name: '友邻-无人机群' },
      lethality: { effect_type: 'fragmentation', effect_value: '300m；破片10m' },
      strike_range_km: 20,
      ammo_status: 'standby',
    },
    connections: {
      connected_commands: [2],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: ['ally-uav-group-1'],
    },
  },

  // === RECON 侦察资源 ===
  {
    resource_id: 301,
    resource_name: '周视镜A',
    resource_tag: RESOURCE_TAGS.RECON,
    resource_type: 'LAND_SENSOR',
    resource_detail: {
      recon_methods: ['热像', '白光'],
      resource_platform: { resource_id: 101, resource_name: '无人车A' },
      recon_range_km: 2.5,
      online_status: 'online',
      coverage_focus: '区域A南缘',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [1],
      connected_instant_plans: [],
      connected_resources: [101, 202],
    },
  },
  {
    resource_id: 302,
    resource_name: '周视镜B',
    resource_tag: RESOURCE_TAGS.RECON,
    resource_type: 'LAND_SENSOR',
    resource_detail: {
      recon_methods: ['热像', '白光'],
      resource_platform: { resource_id: 102, resource_name: '无人车B' },
      recon_range_km: 2.5,
      online_status: 'online',
      coverage_focus: '无',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [2],
      connected_instant_plans: [],
      connected_resources: [102, 203],
    },
  },
  {
    resource_id: 303,
    resource_name: '无人机侦察载荷',
    resource_tag: RESOURCE_TAGS.RECON,
    resource_type: 'AIRBORNE_SENSOR',
    resource_detail: {
      recon_methods: ['热像', '白光'],
      resource_platform: { resource_id: 103, resource_name: '巡逻无人机' },
      recon_range_km: 4,
      online_status: 'online',
      coverage_focus: '区域B上空',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [103],
    },
  },
  {
    resource_id: 304,
    resource_name: '卫星',
    resource_tag: RESOURCE_TAGS.RECON,
    resource_type: 'SATELLITE',
    resource_detail: {
      recon_methods: ['白光'],
      resource_platform: { resource_id: 'ally-satellite-1', resource_name: '友邻-侦查卫星' },
      recon_range_km: null,
      online_status: 'offline-十分钟前在线',
      coverage_focus: '任务区域广域复核',
    },
    connections: {
      connected_commands: [1, 2],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: ['ally-satellite-1'],
    },
  },

  // === SUPPORT 保障资源 ===
  {
    resource_id: 401,
    resource_name: '补给点A',
    resource_tag: RESOURCE_TAGS.SUPPORT,
    resource_type: 'SUPPLY_POINT',
    resource_detail: {
      support_unit: '补给点A',
      support_capability: '连级',
      deployment_location: { location_name: '前沿补给区1', latitude: '39.864200', longitude: '118.208500', altitude: '95.000' },
      mobility_capability: '固定点',
      current_status: 'online',
      support_category: 'supply',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [1],
      connected_instant_plans: [],
      connected_resources: [1, 104],
    },
  },
  {
    resource_id: 402,
    resource_name: '保障车A',
    resource_tag: RESOURCE_TAGS.SUPPORT,
    resource_type: 'MOBILE_SUPPORT_PLATFORM',
    resource_detail: {
      support_unit: '保障车A',
      support_capability: '4t',
      deployment_location: { location_name: '机动保障线A', latitude: '39.870100', longitude: '118.226400', altitude: '106.000' },
      mobility_capability: '200km',
      current_status: '保障对象-无人车A',
      support_category: 'maintenance_and_supply',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [1],
      connected_instant_plans: [],
      connected_resources: [101, 202],
    },
  },
  {
    resource_id: 403,
    resource_name: '8旋翼无人机D',
    resource_tag: RESOURCE_TAGS.SUPPORT,
    resource_type: 'AIR_SUPPORT_PLATFORM',
    resource_detail: {
      support_unit: '8旋翼无人机D',
      support_capability: '500kg',
      deployment_location: { location_name: '后方起降点D', latitude: '39.851600', longitude: '118.194300', altitude: '88.000' },
      mobility_capability: '4km',
      current_status: 'online',
      support_category: 'air_delivery',
    },
    connections: {
      connected_commands: [1],
      connected_plans: [],
      connected_instant_plans: [],
      connected_resources: [103],
    },
  },
  {
    resource_id: 404,
    resource_name: '通信中继站',
    resource_tag: RESOURCE_TAGS.SUPPORT,
    resource_type: 'MOBILE_COMMUNICATION_PLATFORM',
    resource_detail: {
      support_unit: '通信中继站',
      support_capability: '通讯中继12km',
      deployment_location: { latitude: '39.879500', longitude: '118.241800', altitude: '132.000' },
      mobility_capability: '12km',
      current_status: 'online',
      support_category: 'communication_relay',
    },
    connections: {
      connected_commands: [1, 2],
      connected_plans: [3],
      connected_instant_plans: [],
      connected_resources: [101, 102, 104],
    },
  },
]);

const analysisIndexByCommandId = Object.freeze({
  'CMD-20260401-001': {
    missionIds: [1, 2, 3],
    resourceIds: [1, 2, 101, 102, 103, 104, 201, 202, 301, 302, 303, 304, 401, 402, 403, 404],
  },
  'CMD-20260401-002': {
    missionIds: [1, 2],
    resourceIds: [203, 204, 304, 404],
  },
  'CMD-20260401-003': {
    missionIds: [1],
    resourceIds: [3],
  },
});

export const buildDecomposeRequest = (commandId, requestId = nowId()) => ({
  RequestType: 'DECOMPOSE',
  RequestID: requestId,
  RequestData: {
    CommandID: commandId,
  },
});

export const buildDecomposeResponse = ({ commandId, missionIds = [], resourceIds = [], requestId = nowId() }) => ({
  code: 200,
  responseID: requestId,
  data: {
    commandId,
    Analys_results: {
      mission_info: missionIds,
      resource_info: resourceIds,
    },
  },
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
  data: {
    operation,
    result,
  },
});

const pickByIds = (list, key, ids) => {
  const targetIds = new Set(ids);
  return list.filter((item) => targetIds.has(item[key]));
};

export const createMockAnalysisByCommand = () => {
  const entries = Object.entries(analysisIndexByCommandId).map(([commandId, index]) => {
    const request_body = buildDecomposeRequest(commandId);
    const response_body = buildDecomposeResponse({
      commandId,
      missionIds: index.missionIds,
      resourceIds: index.resourceIds,
      requestId: request_body.RequestID,
    });

    return [
      commandId,
      {
        endpoint: COORDINATION_API_URLS.decompose,
        request_body,
        response_body,
        missions: pickByIds(missionRecords, 'mission_id', index.missionIds),
        resources: pickByIds(resourceRecords, 'resource_id', index.resourceIds),
      },
    ];
  });

  return Object.fromEntries(entries);
};
