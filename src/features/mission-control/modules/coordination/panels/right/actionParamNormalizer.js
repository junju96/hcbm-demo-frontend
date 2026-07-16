/**
 * Action 参数归一化工具
 *
 * 统一处理 ActionSequenceCreator 新增节点 和 ActionParamDialog 打开编辑时
 * 的参数缺省值，确保保存到后端前每个 action.param 都包含后续执行所需的完整字段。
 */

function clone(obj) {
  return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
}

function defaultPoint() {
  return { lon: 0, lat: 0, alt: 0, radius: -1, type: 1 };
}

function defaultAreaPoint() {
  return { lon: 0, lat: 0, alt: 0 };
}

function defaultAirReconPoint() {
  return {
    lon: 0,
    lat: 0,
    alt: 0,
    type: 0,
    speed: 0,
    camera: 1,
    gimpitch: 36100,
    gimyaw: 36100,
    action: 1,
    playaw: 36100,
    zoom: 0,
    loiter: 0,
  };
}

function defaultStrikePoint() {
  return {
    lon: 0,
    lat: 0,
    alt: 0,
    tart: 0,
    attr: 0,
    thr: 0,
    dam: 0,
    blk: 0,
    figt: 0,
    sug: 0,
    target_ref: '',
  };
}

function defaultGunShotPoint() {
  return {
    lon: 0,
    lat: 0,
    alt: 0,
    tart: 0,
  };
}

function defaultDirect() {
  return { type: 1, cent: 36100, sear: 36100, up: 9999, down: 9999, dist: 9999, sens: 0 };
}

function defaultFrequency() {
  return [{ start: 30000000, end: 18000000000 }];
}

function defaultProtect() {
  return {
    ckl_dp: '30.0,100.0',
    ckl_tp: '100.0,200.0',
    zzw_dp: '400.0,500.0',
    zzw_tp: '500.0,600.0',
    xtl_tp: '700.0,800.0',
    xtl_dp: '800.0,900.0',
  };
}

function addCommonFields(p) {
  // 兼容协调卡协议中的数字格式：0-停车；1-一键返航；2-继续任务
  const numericStrategy = { 0: 'stop', 1: 'return', 2: 'continue' };
  const rawStrategy = p.disconnect_strategy;
  if (typeof rawStrategy === 'number' && rawStrategy in numericStrategy) {
    p.disconnect_strategy = numericStrategy[rawStrategy];
  } else if (!['continue', 'stop', 'return'].includes(rawStrategy)) {
    p.disconnect_strategy = 'continue';
  }

  // 旧数据可能保存为空字符串，用 || 兜底确保有合法默认值
  p.mission_duration = p.mission_duration || '00:00:00';
  p.enable_start_time = p.enable_start_time ?? false;
  p.start_time = p.start_time ?? '';
}

/**
 * 保存前序列化：把 UI 友好的字符串/布尔值转换为后端协议需要的格式。
 * 目前主要处理断连策略：UI 用字符串 'continue'/'stop'/'return'，
 * 协调卡协议要求数字 2/0/1。
 */
export function serializeActionParam(param) {
  const p = clone(param) || {};
  const strategyMap = { continue: 2, stop: 0, return: 1 };
  const raw = p.disconnect_strategy;
  if (typeof raw === 'string' && raw in strategyMap) {
    p.disconnect_strategy = strategyMap[raw];
  } else if (typeof raw === 'number' && [0, 1, 2].includes(raw)) {
    // 已是合法数字，保持原样
  } else {
    p.disconnect_strategy = 2;
  }

  // 确保通用参数字段始终存在，避免后端因字段缺失而使用旧值
  p.mission_duration = p.mission_duration || '00:00:00';
  p.enable_start_time = p.enable_start_time ?? false;
  p.start_time = p.start_time ?? '';

  return p;
}

function isPatrolVehicle(vehicleType) {
  const vt = String(vehicleType || '').toLowerCase().replace(/-/g, '_');
  return vt === 'patrol_ugv' || vt === 'patrol';
}

function normalizeActionType(actionType) {
  return String(actionType || '').toLowerCase().replace(/_/g, '-');
}

function normalizeVehicleType(vehicleType) {
  const vt = String(vehicleType || '').toLowerCase().replace(/-/g, '_');
  const map = {
    fire_support_ugv: 'fire_support',
    recon_strike_ugv: 'recon_strike',
    patrol_ugv: 'patrol',
    electronic_ugv: 'electronic',
    air_ground_uav: 'air_ground',
    air_ground_ugv: 'air_ground',
  };
  return map[vt] || '';
}

/**
 * 归一化单个 action 的参数
 * @param {Object} param - 原始 param
 * @param {string} actionType - action_type（支持大小写、下划线/中划线）
 * @param {string} vehicleType - 车辆 resource_type（可选）
 * @returns {Object} 归一化后的 param
 */
export function normalizeActionParam(param, actionType, vehicleType = '') {
  const type = normalizeActionType(actionType);
  const vt = normalizeVehicleType(vehicleType);
  const p = clone(param) || {};

  if (type === 'auto-move') {
    p.points = Array.isArray(p.points) && p.points.length ? p.points : [defaultPoint(), defaultPoint()];
    p.limited_speed = p.limited_speed ?? 20;
    p.safe_mode = p.safe_mode ?? 0;
    p.loop_mode = p.loop_mode ?? 0;
    p.route_id = p.route_id ?? '';
    addCommonFields(p);
  } else if (type === 'follow-move') {
    p.x = p.x ?? 960;
    p.y = p.y ?? 540;
    p.width = p.width ?? 1920;
    p.height = p.height ?? 1080;
    p.distance = p.distance ?? 10;
    p.limited_speed = p.limited_speed ?? 15;
    p.safe_mode = p.safe_mode ?? 0;
    p.strategy = p.strategy ?? 0;
    addCommonFields(p);
  } else if (type === 'silent-guard') {
    p.time = p.time ?? 300;
    addCommonFields(p);
  } else if (type === 'set-return-point' || type === 'return-to-base') {
    addCommonFields(p);
  } else if (type === 'manual-task') {
    p.type = p.type ?? 1;
    addCommonFields(p);
  } else if (type === 'pose-adjust') {
    p.pose = Array.isArray(p.pose) ? p.pose : [0, 0, 0];
    p.pose_deviation = Array.isArray(p.pose_deviation) ? p.pose_deviation : [0, 0, 0];
    p.limited_speed = p.limited_speed ?? 10;
    p.safe_mode = p.safe_mode ?? 0;
    addCommonFields(p);
  } else if (type === 'air-recon') {
    p.type = p.type ?? 2;
    p.mode = p.mode ?? 1;
    p.time = p.time ?? 120;
    p.points = Array.isArray(p.points) && p.points.length ? p.points : [defaultAirReconPoint()];
    delete p.points1;
    delete p.points2;
    delete p.points3;
    addCommonFields(p);
  } else if (type === 'lens-recon') {
    p.type = p.type ?? 2;
    p.mode = p.mode ?? 3;
    p.time = p.time ?? 120;
    p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    p.direct = p.direct && typeof p.direct === 'object' ? p.direct : defaultDirect();
    addCommonFields(p);
  } else if (type === 'search-and-shoot' || type === 'recon-strike') {
    if (vt === 'patrol') {
      // 巡逻车侦察打击与光电侦察数据格式保持一致
      p.type = p.type ?? 2;
      p.mode = p.mode ?? 3;
      p.time = p.time ?? 120;
      p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
      p.area_id = p.area_id ?? '';
      p.direct = p.direct && typeof p.direct === 'object' ? p.direct : defaultDirect();
    } else {
      p.time = p.time ?? 180;
      // 侦察打击区域点默认给两个占位点；如果 action 自身已保存区域点则保留原数量
      p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint(), defaultAreaPoint()];
      p.area_id = p.area_id ?? '';
    }
    addCommonFields(p);
  } else if (type === 'rocket-launch' || type === 'loitering-munition-launch' || type === '40mm-gun-launch' || type === 'at-missile-launch') {
    p.points = Array.isArray(p.points) && p.points.length ? p.points.map((pt) => ({ ...pt, target_ref: pt.target_ref || '' })) : [defaultStrikePoint()];
    p.time = p.time ?? 60;
    p.sort = p.sort ?? 0;
    p.num = p.points.length;
    if (type === 'rocket-launch') p.type = p.type ?? 1;
    addCommonFields(p);
  } else if (type === 'gun-shot' || type === '7.62mm-gun-shot') {
    p.points = Array.isArray(p.points) && p.points.length ? p.points : [defaultGunShotPoint()];
    p.time = p.time ?? 60;
    p.sort = p.sort ?? 0;
    p.num = p.points.length;
    addCommonFields(p);
  } else if (type === 'laser-illumination') {
    p.time = p.time ?? 120;
    p.act = p.act ?? 1;
    p.param1 = p.param1 ?? 0;
    p.param2 = p.param2 ?? 0;
    p.ene = p.ene ?? 80;
    p.freq = p.freq ?? 1000;
    p.meat = p.meat ?? 30;
    p.delay = p.delay ?? 5;
    p.max = p.max ?? 10;
    p.type = p.type ?? 1;
    p.strategy = p.strategy ?? 0;
    p.lon = p.lon ?? 116.407;
    p.lat = p.lat ?? 39.904;
    p.alt = p.alt ?? 2100;
    addCommonFields(p);
  } else if (type === 'sound-expel' || type === 'acoustic-deterrence' || type === 'light-expel' || type === 'light-deterrence') {
    if (vt === 'patrol') {
      // 巡逻车强声/强光拒止与光电侦察数据格式保持一致
      p.type = p.type ?? 2;
      p.mode = p.mode ?? 3;
      p.time = p.time ?? 120;
      p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
      p.area_id = p.area_id ?? '';
      p.direct = p.direct && typeof p.direct === 'object' ? p.direct : defaultDirect();
    } else {
      p.time = p.time ?? 60;
      p.tarty = p.tarty ?? 1;
      p.attr = p.attr ?? 2;
      p.thr = p.thr ?? 50;
      p.dam = p.dam ?? 0;
      p.blk = p.blk ?? 0;
      p.figt = p.figt ?? 0;
      p.sug = p.sug ?? 0;
      p.ammo = p.ammo ?? 0;
      p.strategy = p.strategy ?? 0;
      p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint()];
      p.area_id = p.area_id ?? '';
    }
    addCommonFields(p);
  } else if (type === 'em-recon' || type === 'electronic-recon') {
    p.mode = 4;
    p.time = p.time ?? 300;
    p.num = 1;
    p.freqtype = p.freqtype ?? 62;
    p.frequency = Array.isArray(p.frequency) && p.frequency.length ? p.frequency : defaultFrequency();
    p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    addCommonFields(p);
  } else if (type === 'em-interference' || type === 'electronic-jamming' || type === 'em-assault' || type === 'electronic-assault') {
    p.mode = 4;
    p.time = p.time ?? 300;
    if (type === 'em-interference' || type === 'electronic-jamming') {
      p.sort = p.sort ?? 1;
    } else {
      p.sort = p.sort ?? 0;
    }
    p.num = 1;
    p.freqtype = p.freqtype ?? 62;
    p.frequency = Array.isArray(p.frequency) && p.frequency.length ? p.frequency : defaultFrequency();
    p.area = Array.isArray(p.area) && p.area.length ? p.area : [defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint(), defaultAreaPoint()];
    p.area_id = p.area_id ?? '';
    p.protect = p.protect && typeof p.protect === 'object' ? p.protect : defaultProtect();
    addCommonFields(p);
  }

  return p;
}

export default normalizeActionParam;
