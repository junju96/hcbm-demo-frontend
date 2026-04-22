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

export const resourceRecords = Object.freeze([
  {
    resource_id: 1,
    resource_name: '区域A',
    resource_type: 'REGION',
    resource_detail: {
      type: 'neutral',
      location: [
        { point: 'region_point_1', latitude: '115.704931', longitude: '40.281571', altitude: '2.123' },
        { point: 'region_point_2', latitude: '114.704931', longitude: '41.281571', altitude: '3.123' },
      ],
    },
  },
  {
    resource_id: 2,
    resource_name: '区域B',
    resource_type: 'REGION',
    resource_detail: {
      type: 'neutral',
      location: [
        { point: 'region_point_1', latitude: '115.708035', longitude: '40.287294', altitude: '3.427' },
        { point: 'region_point_2', latitude: '114.708925', longitude: '41.287294', altitude: '3.427' },
      ],
    },
  },
  {
    resource_id: 3,
    resource_name: '区域C',
    resource_type: 'REGION',
    resource_detail: {
      type: 'neutral',
      location: [{ point: 'region_point_1', latitude: '115.910001', longitude: '40.110001', altitude: '2.200' }],
    },
  },
]);

const analysisIndexByCommandId = Object.freeze({
  'CMD-20260401-001': { missionIds: [1, 2, 3], resourceIds: [1, 2] },
  'CMD-20260401-002': { missionIds: [1, 2], resourceIds: [1] },
  'CMD-20260401-003': { missionIds: [1], resourceIds: [3] },
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
