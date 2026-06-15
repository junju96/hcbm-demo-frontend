<template>
  <div class="apd-overlay" @click.self="onClose">
    <div class="apd-dialog">
      <div class="apd-header">
        <div class="apd-title">{{ action?.name || '行动参数' }}</div>
        <div class="apd-subtitle">{{ actionTypeLabel }} · {{ vehicleName }}</div>
        <button class="apd-close" type="button" @click="onClose">×</button>
      </div>

      <div class="apd-body">
        <!-- Auto-Move: 自主机动 -->
        <template v-if="normalizedActionType === 'auto-move'">
          <!-- 路线参数 -->
          <div class="apd-section">
            <div class="apd-section-title">路线参数</div>
            <label class="apd-field">
              <span>路线选择</span>
              <select v-model="editedParam.route_id" @change="onRouteChange">
                <option value="">-- 请选择路线 --</option>
                <option v-for="route in routeList" :key="route.resource_id" :value="route.resource_id">
                  {{ route.title || route.resource_id }}
                </option>
              </select>
            </label>

            <div class="apd-check-row">
              <label class="apd-check">
                <input v-model="editedParam.navigation" type="checkbox" />
                <span>导航</span>
              </label>
              <label class="apd-check">
                <input v-model="editedParam.circle" type="checkbox" />
                <span>绕圈</span>
              </label>
            </div>

            <div class="apd-section-title sub">路线参数列表</div>
            <div class="apd-route-table-head">
              <span>经度</span>
              <span>纬度</span>
              <span>高度</span>
              <span>属性</span>
            </div>
            <div
              v-for="(pt, idx) in editedParam.route_points"
              :key="idx"
              class="apd-route-table-row"
            >
              <span>{{ formatCoord(pt.lon) }}</span>
              <span>{{ formatCoord(pt.lat) }}</span>
              <span>{{ pt.alt ?? 0 }}</span>
              <span>{{ pt.attribute || '—' }}</span>
            </div>
            <div v-if="!editedParam.route_points.length" class="apd-empty small">未选择路线</div>
          </div>

          <!-- 车辆参数 -->
          <div class="apd-section">
            <div class="apd-section-title">车辆参数</div>
            <label class="apd-field">
              <span>限速 (0 - 80 km/h)</span>
              <div class="apd-slider-row">
                <input
                  v-model.number="editedParam.speed_limit"
                  type="range"
                  min="0"
                  max="80"
                  step="1"
                />
                <span class="apd-slider-value">{{ editedParam.speed_limit }} km/h</span>
              </div>
            </label>
            <label class="apd-field">
              <span>模式</span>
              <div class="apd-radio-row">
                <label class="apd-radio">
                  <input v-model="editedParam.drive_mode" type="radio" value="avoid_obstacle" />
                  <span>避障</span>
                </label>
                <label class="apd-radio">
                  <input v-model="editedParam.drive_mode" type="radio" value="assault" />
                  <span>突击</span>
                </label>
                <label class="apd-radio">
                  <input v-model="editedParam.drive_mode" type="radio" value="stop_obstacle" />
                  <span>停障</span>
                </label>
              </div>
            </label>
            <label class="apd-field">
              <span>绕圈 (-1 表示一直绕圈，0-99 km)</span>
              <input v-model.number="editedParam.circle_distance_km" type="number" min="-1" max="99" step="1" />
            </label>
          </div>

          <!-- 通用参数 -->
          <div class="apd-section">
            <div class="apd-section-title">通用参数</div>
            <label class="apd-field">
              <span>断连策略</span>
              <div class="apd-radio-row">
                <label class="apd-radio">
                  <input v-model="editedParam.disconnect_strategy" type="radio" value="continue" />
                  <span>继续</span>
                </label>
                <label class="apd-radio">
                  <input v-model="editedParam.disconnect_strategy" type="radio" value="stop" />
                  <span>停车</span>
                </label>
                <label class="apd-radio">
                  <input v-model="editedParam.disconnect_strategy" type="radio" value="return" />
                  <span>返航</span>
                </label>
              </div>
            </label>
            <label class="apd-field">
              <span>任务时长 (HH:MM:SS)</span>
              <input v-model="editedParam.mission_duration" type="text" placeholder="00:00:00" />
            </label>
            <label class="apd-field">
              <span class="apd-check">
                <input v-model="editedParam.enable_start_time" type="checkbox" />
                <span>设置开始时间</span>
              </span>
              <input
                v-model="editedParam.start_time"
                type="datetime-local"
                :disabled="!editedParam.enable_start_time"
              />
            </label>
          </div>
        </template>

        <!-- Lens-Recon: 光电侦察 -->
        <template v-else-if="normalizedActionType === 'lens-recon'">
          <label class="apd-field">
            <span>目标ID</span>
            <input v-model="editedParam.target_id" type="text" />
          </label>
          <label class="apd-field">
            <span>目标名称</span>
            <input v-model="editedParam.target_name" type="text" />
          </label>
          <label class="apd-field">
            <span>侦察模式</span>
            <select v-model.number="editedParam.type">
              <option :value="1">只识别</option>
              <option :value="2">识别+测距</option>
              <option :value="3">识别+跟踪</option>
            </select>
          </label>
          <div class="apd-section">
            <div class="apd-section-title">侦察点位</div>
            <div class="apd-point-row">
              <label class="apd-field compact">
                <span>经度</span>
                <input v-model.number="editedParam.recon_position.lon" type="number" step="0.0001" />
              </label>
              <label class="apd-field compact">
                <span>纬度</span>
                <input v-model.number="editedParam.recon_position.lat" type="number" step="0.0001" />
              </label>
              <label class="apd-field compact">
                <span>高度</span>
                <input v-model.number="editedParam.recon_position.alt" type="number" step="0.1" />
              </label>
            </div>
          </div>
          <label class="apd-field">
            <span>方位角 (°)</span>
            <input v-model.number="editedParam.azimuth_deg" type="number" step="0.1" />
          </label>
          <label class="apd-field">
            <span>视野角度 (°)</span>
            <input v-model.number="editedParam.fov_deg" type="number" step="0.1" />
          </label>
          <label class="apd-field">
            <span>移动时间 (s)</span>
            <input v-model.number="editedParam.move_time_s" type="number" step="0.1" />
          </label>
          <label class="apd-field">
            <span>扫描时间 (s)</span>
            <input v-model.number="editedParam.scan_time_s" type="number" step="0.1" />
          </label>
        </template>

        <!-- 40mm机炮打击 -->
        <template v-else-if="normalizedActionType === '40mm-gun-launch'">
          <!-- 打击参数：目标点列表 -->
          <div class="apd-section">
            <div class="apd-section-title">
              打击参数
              <div class="apd-btn-group">
                <button class="as-btn mini primary" type="button" @click="addTarget">+</button>
                <button
                  class="as-btn mini danger"
                  type="button"
                  :disabled="editedParam.targets.length <= 1"
                  @click="removeTarget(editedParam.targets.length - 1)"
                >
                  -
                </button>
              </div>
            </div>

            <div class="apd-target-table-head">
              <span>位置</span>
              <span>高程</span>
              <span>类型</span>
              <span></span>
            </div>
            <div
              v-for="(t, idx) in editedParam.targets"
              :key="idx"
              class="apd-target-table-row"
            >
              <select v-model="t.target_id" @change="onTargetChange(idx)">
                <option value="">-- 选择目标点 --</option>
                <option
                  v-for="target in targetList"
                  :key="target.resource_id"
                  :value="target.resource_id"
                >
                  {{ target.resource_name || target.title || target.target_name || target.resource_id }}
                </option>
              </select>
              <input v-model.number="t.altitude" type="number" step="0.1" placeholder="高程" />
              <select v-model="t.target_type">
                <option v-for="opt in TARGET_TYPE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
              </select>
              <button
                class="as-btn mini danger"
                type="button"
                :disabled="editedParam.targets.length <= 1"
                @click="removeTarget(idx)"
              >
                删除
              </button>
            </div>

            <label class="apd-check" style="margin-top: 0.4rem;">
              <input v-model="editedParam.sequential" type="checkbox" />
              <span>按顺序打击</span>
            </label>

            <div class="apd-strike-extra">
              <label class="apd-field compact">
                <span>发射时间 (s)</span>
                <input v-model.number="editedParam.fire_duration_s" type="number" min="0" />
              </label>
              <label class="apd-field compact">
                <span>发射模式</span>
                <select v-model.number="editedParam.fire_mode">
                  <option :value="1">单发</option>
                  <option :value="2">多发</option>
                </select>
              </label>
              <label class="apd-field compact">
                <span>毁伤模式</span>
                <select v-model.number="editedParam.damage_mode">
                  <option :value="0">未定义</option>
                  <option :value="1">饱和攻击</option>
                  <option :value="2">不饱和攻击</option>
                </select>
              </label>
              <label class="apd-field compact">
                <span>遮蔽顶</span>
                <select v-model.number="editedParam.blank">
                  <option :value="0">未定义</option>
                  <option :value="1">有遮蔽顶</option>
                  <option :value="2">无遮蔽顶</option>
                </select>
              </label>
              <label class="apd-field compact">
                <span>计划发射数量</span>
                <input v-model.number="editedParam.planned_ammo" type="number" min="0" />
              </label>
            </div>
          </div>

          <!-- 通用参数 -->
          <div class="apd-section">
            <div class="apd-section-title">通用参数</div>
            <label class="apd-field">
              <span>断连策略</span>
              <div class="apd-radio-row">
                <label class="apd-radio">
                  <input v-model="editedParam.disconnect_strategy" type="radio" value="continue" />
                  <span>继续</span>
                </label>
                <label class="apd-radio">
                  <input v-model="editedParam.disconnect_strategy" type="radio" value="stop" />
                  <span>停车</span>
                </label>
                <label class="apd-radio">
                  <input v-model="editedParam.disconnect_strategy" type="radio" value="return" />
                  <span>返航</span>
                </label>
              </div>
            </label>
            <label class="apd-field">
              <span>任务时长 (HH:MM:SS)</span>
              <input v-model="editedParam.mission_duration" type="text" placeholder="00:00:00" />
            </label>
            <label class="apd-field">
              <span class="apd-check">
                <input v-model="editedParam.enable_start_time" type="checkbox" />
                <span>设置开始时间</span>
              </span>
              <input
                v-model="editedParam.start_time"
                type="datetime-local"
                :disabled="!editedParam.enable_start_time"
              />
            </label>
          </div>
        </template>

        <!-- 打击类：7.62mm/AT导弹/火箭弹/巡飞弹 -->
        <template v-else-if="isStrikeAction">
          <label class="apd-field">
            <span>目标ID</span>
            <input v-model="editedParam.target_id" type="text" />
          </label>
          <label class="apd-field">
            <span>目标名称</span>
            <input v-model="editedParam.target_name" type="text" />
          </label>
          <label class="apd-field">
            <span>发射时间 (s)</span>
            <input v-model.number="editedParam.fire_duration_s" type="number" min="0" />
          </label>
          <div class="apd-section">
            <div class="apd-section-title">打击位置</div>
            <div class="apd-point-row">
              <label class="apd-field compact">
                <span>经度</span>
                <input v-model.number="editedParam.fire_position.lon" type="number" step="0.0001" />
              </label>
              <label class="apd-field compact">
                <span>纬度</span>
                <input v-model.number="editedParam.fire_position.lat" type="number" step="0.0001" />
              </label>
            </div>
          </div>
          <label class="apd-field">
            <span>发射模式</span>
            <select v-model.number="editedParam.fire_mode">
              <option :value="1">单发</option>
              <option :value="2">多发</option>
            </select>
          </label>
          <label class="apd-field">
            <span>毁伤模式</span>
            <select v-model.number="editedParam.damage_mode">
              <option :value="0">未定义</option>
              <option :value="1">饱和攻击</option>
              <option :value="2">不饱和攻击</option>
            </select>
          </label>
          <label class="apd-field">
            <span>遮蔽顶</span>
            <select v-model.number="editedParam.blank">
              <option :value="0">未定义</option>
              <option :value="1">有遮蔽顶</option>
              <option :value="2">无遮蔽顶</option>
            </select>
          </label>
          <label class="apd-field">
            <span>计划发射数量</span>
            <input v-model.number="editedParam.planned_ammo" type="number" min="0" />
          </label>
        </template>

        <!-- search-and-shoot: 侦察打击 -->
        <template v-else-if="normalizedActionType === 'search-and-shoot'">
          <label class="apd-field">
            <span>目标ID</span>
            <input v-model="editedParam.target_id" type="text" />
          </label>
          <label class="apd-field">
            <span>目标名称</span>
            <input v-model="editedParam.target_name" type="text" />
          </label>
          <label class="apd-field">
            <span>行动时间 (s)</span>
            <input v-model.number="editedParam.time" type="number" step="0.1" />
          </label>
        </template>

        <!-- 通信中继类 -->
        <template v-else-if="isRelayAction">
          <label class="apd-field">
            <span>通信时间 (s)</span>
            <input v-model.number="editedParam.duration_s" type="number" min="0" />
          </label>
          <label class="apd-field">
            <span>IP</span>
            <input v-model="editedParam.ip" type="text" />
          </label>
          <label class="apd-field">
            <span>通信类型</span>
            <input v-model.number="editedParam.type" type="number" />
          </label>
        </template>

        <template v-else>
          <div class="apd-empty">暂无该行动类型（{{ action?.action_type || '未知' }}）的参数定义</div>
        </template>
      </div>

      <div class="apd-footer">
        <button class="as-btn" type="button" @click="onClose">取消</button>
        <button class="as-btn primary" type="button" @click="onSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fetchResourcePoolByType } from '../../api/coordinationApi';

const props = defineProps({
  action: { type: Object, default: null },
  vehicleVid: { type: String, default: '' },
});

const emit = defineEmits(['close', 'save']);

const editedParam = ref({});
const routeList = ref([]);
const loadingRoutes = ref(false);
const targetList = ref([]);
const loadingTargets = ref(false);

const normalizedActionType = computed(() =>
  String(props.action?.action_type || '').toLowerCase()
);

const actionTypeLabel = computed(() => {
  const map = {
    'auto-move': '自主机动',
    'lens-recon': '光电侦察',
    '40mm-gun-launch': '40mm机炮打击',
    '7.62mm-gun-shot': '机枪打击',
    'at-missile-launch': '反坦克导弹打击',
    'rocket-launch': '火箭弹打击',
    'loitering-munition-launch': '巡飞弹打击',
    'search-and-shoot': '侦察打击',
    'land-communication-relay': '地面通信中继',
    'air-communication-relay': '空中通信中继',
  };
  return map[normalizedActionType.value] || props.action?.action_type || '未知类型';
});

const vehicleName = computed(() =>
  String(props.vehicleVid || props.action?.vid || '').replace('equipment:', '')
);

const isStrikeAction = computed(() =>
  [
    '7.62mm-gun-shot',
    'at-missile-launch',
    'rocket-launch',
    'loitering-munition-launch',
  ].includes(normalizedActionType.value)
);

const isRelayAction = computed(() =>
  ['land-communication-relay', 'air-communication-relay'].includes(normalizedActionType.value)
);

function cloneParam(param) {
  return JSON.parse(JSON.stringify(param || {}));
}

const TARGET_TYPE_OPTIONS = [
  '无定义',
  '人员',
  '汽车',
  '装甲车',
  '坦克',
  '工事',
  '建筑',
  '地下空间',
  '其他',
];

function buildEmptyTarget() {
  return {
    target_id: '',
    target_name: '',
    altitude: 0,
    target_type: '无定义',
  };
}

function ensureShape() {
  const type = normalizedActionType.value;
  const p = cloneParam(props.action?.param);

  if (type === 'auto-move') {
    if (!Array.isArray(p.waypoints) || p.waypoints.length === 0) {
      p.waypoints = [{ lon: 0, lat: 0, alt: 0 }];
    }
    p.waypoints = p.waypoints.map((wp) => ({
      lon: wp?.lon ?? wp?.longitude ?? 0,
      lat: wp?.lat ?? wp?.latitude ?? 0,
      alt: wp?.alt ?? wp?.altitude ?? 0,
    }));
    p.speed = p.speed ?? 20;
    // 路线/车辆/通用参数
    p.route_id = p.route_id ?? '';
    p.route_points = Array.isArray(p.route_points)
      ? p.route_points.map((pt) => ({
          lon: pt?.lon ?? pt?.longitude ?? 0,
          lat: pt?.lat ?? pt?.latitude ?? 0,
          alt: pt?.alt ?? pt?.altitude ?? 0,
          attribute: pt?.attribute ?? '路网点',
        }))
      : [];
    p.navigation = p.navigation ?? false;
    p.circle = p.circle ?? false;
    p.speed_limit = p.speed_limit ?? 40;
    p.drive_mode = p.drive_mode ?? 'avoid_obstacle';
    p.circle_distance_km = p.circle_distance_km ?? -1;
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (type === 'lens-recon') {
    p.target_id = p.target_id ?? '';
    p.target_name = p.target_name ?? '';
    p.type = p.type ?? 2;
    p.recon_position = {
      lon: p.recon_position?.lon ?? p.recon_position?.longitude ?? 0,
      lat: p.recon_position?.lat ?? p.recon_position?.latitude ?? 0,
      alt: p.recon_position?.alt ?? p.recon_position?.altitude ?? 0,
    };
    p.azimuth_deg = p.azimuth_deg ?? 0;
    p.fov_deg = p.fov_deg ?? 0;
    p.move_time_s = p.move_time_s ?? 0;
    p.scan_time_s = p.scan_time_s ?? 0;
  } else if (type === '40mm-gun-launch') {
    // 目标点列表
    if (!Array.isArray(p.targets) || p.targets.length === 0) {
      p.targets = [buildEmptyTarget()];
    } else {
      p.targets = p.targets.map((t) => ({
        target_id: t?.target_id ?? '',
        target_name: t?.target_name ?? '',
        altitude: t?.altitude ?? 0,
        target_type: t?.target_type ?? '无定义',
      }));
    }
    p.sequential = p.sequential ?? false;
    // 保留已有打击字段
    p.fire_duration_s = p.fire_duration_s ?? 6;
    p.fire_mode = p.fire_mode ?? 1;
    p.damage_mode = p.damage_mode ?? 0;
    p.blank = p.blank ?? 0;
    p.planned_ammo = p.planned_ammo ?? 0;
    // 通用参数
    p.disconnect_strategy = p.disconnect_strategy ?? 'continue';
    p.mission_duration = p.mission_duration ?? '00:00:00';
    p.enable_start_time = p.enable_start_time ?? false;
    p.start_time = p.start_time ?? '';
  } else if (isStrikeAction.value) {
    p.target_id = p.target_id ?? '';
    p.target_name = p.target_name ?? '';
    p.fire_duration_s = p.fire_duration_s ?? 6;
    p.fire_position = {
      lon: p.fire_position?.lon ?? p.fire_position?.longitude ?? 0,
      lat: p.fire_position?.lat ?? p.fire_position?.latitude ?? 0,
    };
    p.fire_mode = p.fire_mode ?? 1;
    p.damage_mode = p.damage_mode ?? 0;
    p.blank = p.blank ?? 0;
    p.planned_ammo = p.planned_ammo ?? 0;
  } else if (type === 'search-and-shoot') {
    p.target_id = p.target_id ?? '';
    p.target_name = p.target_name ?? '';
    p.time = p.time ?? 10;
  } else if (isRelayAction.value) {
    p.duration_s = p.duration_s ?? 900;
    p.ip = p.ip ?? '192.168.168.100';
    p.type = p.type ?? 1;
  }

  editedParam.value = p;
}

watch(
  () => props.action,
  () => ensureShape(),
  { immediate: true }
);

onMounted(() => {
  loadRoutes();
  loadTargets();
});

async function loadRoutes() {
  loadingRoutes.value = true;
  try {
    const result = await fetchResourcePoolByType('ROUTE', 50);
    if (result.ok) {
      routeList.value = result.data?.items || [];
    }
  } finally {
    loadingRoutes.value = false;
  }
}

async function loadTargets() {
  loadingTargets.value = true;
  try {
    const result = await fetchResourcePoolByType('TARGET', 50);
    if (result.ok) {
      targetList.value = result.data?.items || [];
    }
  } finally {
    loadingTargets.value = false;
  }
}

function onRouteChange() {
  const route = routeList.value.find((r) => r.resource_id === editedParam.value.route_id);
  if (route && Array.isArray(route.points)) {
    editedParam.value.route_points = route.points.map((pt) => ({
      lon: pt?.lon ?? pt?.longitude ?? 0,
      lat: pt?.lat ?? pt?.latitude ?? 0,
      alt: pt?.alt ?? pt?.altitude ?? 0,
      attribute: pt?.attribute ?? '路网点',
    }));
    // 同步 waypoints，保证地图绘制使用最新路径
    editedParam.value.waypoints = editedParam.value.route_points.map((pt) => ({
      lon: pt.lon,
      lat: pt.lat,
      alt: pt.alt,
    }));
  } else {
    editedParam.value.route_points = [];
  }
}

function formatCoord(val) {
  const num = Number(val);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(7);
}

function onTargetChange(idx) {
  const t = editedParam.value.targets[idx];
  const target = targetList.value.find((item) => item.resource_id === t.target_id);
  if (target) {
    t.target_name = target.resource_name || target.title || target.target_name || '';
    const loc = target.location || {};
    t.altitude = loc.altitude ?? loc.alt ?? 0;
  }
}

function addTarget() {
  editedParam.value.targets.push(buildEmptyTarget());
}

function removeTarget(idx) {
  if (editedParam.value.targets.length > 1) {
    editedParam.value.targets.splice(idx, 1);
  }
}

function addWaypoint() {
  editedParam.value.waypoints.push({ lon: 0, lat: 0, alt: 0 });
}

function removeWaypoint(idx) {
  if (editedParam.value.waypoints.length > 1) {
    editedParam.value.waypoints.splice(idx, 1);
  }
}

function onClose() {
  emit('close');
}

function onSave() {
  // 提交前移除 undefined，保持数据干净
  const cleaned = JSON.parse(JSON.stringify(editedParam.value));
  emit('save', cleaned);
}
</script>

<style scoped>
.apd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.apd-dialog {
  background: linear-gradient(180deg, rgba(0, 40, 48, 0.98), rgba(0, 16, 22, 0.99));
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 12px;
  width: 560px;
  max-width: 92vw;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  color: #f1feff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.apd-header {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  flex-direction: column;
  position: relative;
}

.apd-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #f7fdff;
}

.apd-subtitle {
  font-size: 0.78rem;
  color: rgba(226, 246, 248, 0.65);
  margin-top: 0.15rem;
}

.apd-close {
  position: absolute;
  right: 0.6rem;
  top: 0.55rem;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: #f1feff;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.apd-close:hover {
  background: rgba(239, 68, 68, 0.35);
}

.apd-body {
  padding: 1rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.apd-section {
  border: 1px solid rgba(0, 222, 200, 0.12);
  border-radius: 8px;
  padding: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.apd-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--as-accent, #00dec8);
}

.apd-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.apd-field span {
  font-size: 0.78rem;
  color: rgba(226, 246, 248, 0.75);
}

.apd-field input,
.apd-field select {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  color: #f1feff;
  font-size: 0.9rem;
  outline: none;
}

.apd-field input:focus,
.apd-field select:focus {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.1);
}

.apd-field.compact input,
.apd-field.compact select {
  padding: 0.35rem 0.45rem;
  font-size: 0.85rem;
}

.apd-point-row,
.apd-waypoint-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

.apd-point-row .apd-field,
.apd-waypoint-row .apd-field {
  flex: 1;
  min-width: 0;
}

.apd-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.apd-empty {
  text-align: center;
  color: rgba(226, 246, 248, 0.6);
  padding: 1.5rem 0;
  font-size: 0.9rem;
}

/* 复用 ActionSequencePanel 的按钮基础样式 */
.as-btn {
  min-height: 32px;
  padding: 0 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 208, 188, 0.28);
  background: rgba(255, 255, 255, 0.08);
  color: #f1feff;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
  white-space: nowrap;
}

.as-btn:hover:not(:disabled) {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 222, 200, 0.12);
}

.as-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.as-btn.primary {
  border-color: rgba(0, 208, 188, 0.4);
  background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96));
}

.as-btn.primary:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(0, 130, 136, 0.54), rgba(0, 66, 68, 1));
}

.as-btn.danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.35), rgba(120, 20, 20, 0.9));
}

.as-btn.mini {
  min-height: 26px;
  padding: 0 0.55rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
}

/* Auto-Move 扩展样式 */
.apd-section-title.sub {
  font-size: 0.78rem;
  color: rgba(226, 246, 248, 0.8);
  margin-top: 0.4rem;
}

.apd-check-row {
  display: flex;
  gap: 1.2rem;
  padding: 0.2rem 0;
}

.apd-check {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #f1feff;
  cursor: pointer;
}

.apd-check input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: #00dec8;
  cursor: pointer;
}

.apd-radio-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.apd-radio {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: #f1feff;
  cursor: pointer;
}

.apd-radio input[type='radio'] {
  width: 16px;
  height: 16px;
  accent-color: #00dec8;
  cursor: pointer;
}

.apd-slider-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.apd-slider-row input[type='range'] {
  flex: 1;
  min-width: 0;
  accent-color: #00dec8;
}

.apd-slider-value {
  font-size: 0.85rem;
  color: #00dec8;
  min-width: 4.5rem;
  text-align: right;
}

.apd-route-table-head,
.apd-route-table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1.2fr;
  gap: 0.4rem;
  font-size: 0.78rem;
  padding: 0.35rem 0.45rem;
  border-radius: 4px;
}

.apd-route-table-head {
  font-weight: 700;
  color: rgba(226, 246, 248, 0.7);
  background: rgba(0, 222, 200, 0.08);
}

.apd-route-table-row {
  color: #f1feff;
  border-bottom: 1px solid rgba(0, 222, 200, 0.08);
}

.apd-route-table-row:last-child {
  border-bottom: none;
}

.apd-empty.small {
  padding: 0.8rem 0;
  font-size: 0.82rem;
}

.apd-field .apd-check {
  margin-bottom: 0.35rem;
}

.apd-field input[type='datetime-local']:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 40mm 目标点列表样式 */
.apd-btn-group {
  display: inline-flex;
  gap: 0.35rem;
  margin-left: auto;
}

.apd-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.apd-target-table-head,
.apd-target-table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1.2fr 0.8fr;
  gap: 0.4rem;
  align-items: center;
  font-size: 0.78rem;
}

.apd-target-table-head {
  font-weight: 700;
  color: rgba(226, 246, 248, 0.7);
  background: rgba(0, 222, 200, 0.08);
  padding: 0.35rem 0.45rem;
  border-radius: 4px;
}

.apd-target-table-row {
  padding: 0.3rem 0.2rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.06);
}

.apd-target-table-row:last-child {
  border-bottom: none;
}

.apd-target-table-row select,
.apd-target-table-row input {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 5px;
  padding: 0.35rem 0.4rem;
  color: #f1feff;
  font-size: 0.8rem;
  outline: none;
  width: 100%;
}

.apd-strike-extra {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.55rem;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}

.apd-strike-extra .apd-field.compact span {
  font-size: 0.72rem;
}

.apd-strike-extra .apd-field.compact input,
.apd-strike-extra .apd-field.compact select {
  padding: 0.35rem 0.45rem;
  font-size: 0.82rem;
}
</style>
