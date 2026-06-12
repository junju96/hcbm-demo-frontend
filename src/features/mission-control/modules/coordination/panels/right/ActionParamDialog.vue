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
          <div class="apd-section">
            <div class="apd-section-title">航路点</div>
            <div
              v-for="(wp, idx) in editedParam.waypoints"
              :key="idx"
              class="apd-waypoint-row"
            >
              <label class="apd-field compact">
                <span>经度</span>
                <input v-model.number="wp.lon" type="number" step="0.0001" />
              </label>
              <label class="apd-field compact">
                <span>纬度</span>
                <input v-model.number="wp.lat" type="number" step="0.0001" />
              </label>
              <label class="apd-field compact">
                <span>高度</span>
                <input v-model.number="wp.alt" type="number" step="0.1" />
              </label>
              <button
                class="as-btn mini danger"
                type="button"
                :disabled="editedParam.waypoints.length <= 1"
                @click="removeWaypoint(idx)"
              >
                删除
              </button>
            </div>
            <button class="as-btn mini primary" type="button" @click="addWaypoint">
              + 添加航路点
            </button>
          </div>
          <label class="apd-field">
            <span>速度 (km/h)</span>
            <input v-model.number="editedParam.speed" type="number" min="0" />
          </label>
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

        <!-- 打击类：40mm/7.62mm/AT导弹/火箭弹/巡飞弹 -->
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
import { ref, computed, watch } from 'vue';

const props = defineProps({
  action: { type: Object, default: null },
  vehicleVid: { type: String, default: '' },
});

const emit = defineEmits(['close', 'save']);

const editedParam = ref({});

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
    '40mm-gun-launch',
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
</style>
