<template>
  <div class="fpd-overlay" @click.self="$emit('close')">
    <div class="fpd-dialog">
      <div class="fpd-header">
        <div class="fpd-title">新建编队机动</div>
        <button class="fpd-close" type="button" @click="$emit('close')">×</button>
      </div>

      <div class="fpd-body">
        <div class="fpd-section">
          <div class="fpd-section-title">方案名称</div>
          <input v-model="title" class="fpd-input" type="text" placeholder="请输入方案名称" />
        </div>

        <div class="fpd-section">
          <div class="fpd-section-title">头车（单选）</div>
          <select v-model="leaderVid" class="fpd-input">
            <option value="">-- 请选择头车 --</option>
            <option v-for="v in vehicles" :key="v.vid" :value="v.vid">{{ formatVehicle(v) }}</option>
          </select>
          <div v-if="!vehicles.length" class="fpd-empty">暂无在线车辆，请检查车辆在线状态或刷新后重试</div>
        </div>

        <div class="fpd-section">
          <div class="fpd-section-title">跟随车辆（多选）</div>
          <label v-for="v in followerOptions" :key="v.vid" class="fpd-vehicle-item">
            <input v-model="followerVids" type="checkbox" :value="v.vid" />
            <span>{{ formatVehicle(v) }}</span>
          </label>
          <div v-if="vehicles.length && !followerOptions.length" class="fpd-empty">除头车暂无其它在线车辆</div>
        </div>

        <div class="fpd-section">
          <div class="fpd-section-title">路线参数</div>
          <label class="fpd-field">
            <span>路线选择</span>
            <select v-model="routeId" class="fpd-input" @change="onRouteChange">
              <option value="">-- 请选择路线 --</option>
              <option v-for="route in routeList" :key="route.resource_id" :value="route.resource_id">
                {{ route.title || route.resource_id }}
              </option>
            </select>
          </label>
          <div class="fpd-section-title sub">路径点列表</div>
          <div class="fpd-route-table-head">
            <span>经度</span>
            <span>纬度</span>
            <span>高度</span>
            <span>横向偏移 (m)</span>
            <span>纵向偏移 (m)</span>
          </div>
          <div v-for="(pt, idx) in points" :key="idx" class="fpd-route-table-row">
            <input v-model.number="pt.lon" type="number" step="0.000001" placeholder="经度" />
            <input v-model.number="pt.lat" type="number" step="0.000001" placeholder="纬度" />
            <input v-model.number="pt.alt" type="number" step="0.1" placeholder="高度" />
            <input v-model.number="pt.offsetX" type="number" placeholder="左正右负" />
            <input v-model.number="pt.offsetY" type="number" placeholder="前正后负" />
            <button class="as-btn mini danger" type="button" :disabled="points.length <= 1" @click="removePoint(idx)">删除</button>
          </div>
          <button class="as-btn mini primary" type="button" @click="addPoint">+ 添加路径点</button>
        </div>

        <div class="fpd-section">
          <div class="fpd-section-title">车辆参数</div>
          <label class="fpd-field">
            <span>限速 (km/h)</span>
            <input v-model.number="limitedSpeed" class="fpd-input" type="number" min="0" max="80" />
          </label>
          <label class="fpd-field">
            <span>编队模式</span>
            <select v-model.number="formationMode" class="fpd-input">
              <option :value="0">跟头车模式</option>
              <option :value="1">引导路径模式</option>
              <option :value="2">队形变换</option>
            </select>
          </label>
          <label class="fpd-field">
            <span>安全模式</span>
            <div class="fpd-radio-row">
              <label class="fpd-radio"><input v-model.number="safeMode" type="radio" :value="0" /><span>避障</span></label>
              <label class="fpd-radio"><input v-model.number="safeMode" type="radio" :value="1" /><span>突击</span></label>
              <label class="fpd-radio"><input v-model.number="safeMode" type="radio" :value="2" /><span>停障</span></label>
            </div>
          </label>
        </div>
      </div>

      <div class="fpd-footer">
        <button class="as-btn" type="button" @click="$emit('close')">取消</button>
        <button class="as-btn primary" type="button" :disabled="!canConfirm" @click="onConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { fetchFusionedTargets } from '../../api/coordinationApi';

const props = defineProps({
  // 在线车辆列表（含 vid / resource_type / resource_name 等）
  vehicles: { type: Array, default: () => [] },
  // 车辆显示名格式化（复用面板的 getVehicleDisplayName）
  formatVehicle: { type: Function, default: (v) => v?.resource_name || v?.name || v?.vid || '' },
});

const emit = defineEmits(['close', 'confirm']);

const title = ref('');
const leaderVid = ref('');
const followerVids = ref([]);

// 头车变更后，跟随车辆中剔除头车
watch(leaderVid, (vid) => {
  followerVids.value = followerVids.value.filter((f) => f !== vid);
});

const followerOptions = computed(() =>
  props.vehicles.filter((v) => v.vid !== leaderVid.value)
);

/* ---------- 路线参数 ---------- */
const fusionedTargets = ref([]);
const routeId = ref('');
const points = ref([]);

const routeList = computed(() =>
  fusionedTargets.value.filter((t) => ['line', 'route'].includes(t.target_shape) && t.points.length > 0)
);

function defaultPoint() {
  return { lon: 0, lat: 0, alt: 0, offsetX: 0, offsetY: 0 };
}

function onRouteChange() {
  const route = routeList.value.find((r) => r.resource_id === routeId.value);
  if (!route || !Array.isArray(route.points)) return;
  // 选路线后按路线点填充经纬高，横/纵向偏移尽量保留用户已编辑值
  points.value = route.points.map((pt, idx) => {
    const prev = points.value[idx] || {};
    return {
      lon: Number(pt?.lon ?? pt?.longitude ?? 0),
      lat: Number(pt?.lat ?? pt?.latitude ?? 0),
      alt: Number(pt?.alt ?? pt?.altitude ?? 0),
      offsetX: Number(prev.offsetX ?? 0),
      offsetY: Number(prev.offsetY ?? 0),
    };
  });
}

function addPoint() {
  points.value.push(defaultPoint());
}

function removePoint(idx) {
  if (points.value.length > 1) points.value.splice(idx, 1);
}

onMounted(async () => {
  points.value = [defaultPoint(), defaultPoint()];
  const result = await fetchFusionedTargets(200);
  if (result.ok) {
    fusionedTargets.value = result.data?.items || [];
    // 默认选中第一条路线并回填路径点
    if (routeList.value.length) {
      routeId.value = routeList.value[0].resource_id;
      onRouteChange();
    }
  }
});

/* ---------- 车辆参数 ---------- */
const limitedSpeed = ref(20);
const formationMode = ref(0);
const safeMode = ref(0);

const canConfirm = computed(() =>
  title.value.trim() && leaderVid.value && followerVids.value.length > 0 && points.value.length > 0
);

function onConfirm() {
  if (!canConfirm.value) return;
  emit('confirm', {
    title: title.value.trim(),
    leaderVid: leaderVid.value,
    followerVids: [...followerVids.value],
    param: {
      route_id: routeId.value,
      points: JSON.parse(JSON.stringify(points.value)),
      limited_speed: limitedSpeed.value,
      formation_mode: formationMode.value,
      safe_mode: safeMode.value,
    },
  });
}
</script>

<style scoped>
.fpd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fpd-dialog {
  background: linear-gradient(180deg, rgba(0, 40, 48, 0.98), rgba(0, 16, 22, 0.99));
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 12px;
  width: 620px;
  max-width: 94vw;
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  color: #f1feff;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.fpd-header {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  align-items: center;
  position: relative;
}

.fpd-title {
  font-size: 1.05rem;
  font-weight: 800;
  color: #f7fdff;
}

.fpd-close {
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

.fpd-close:hover {
  background: rgba(239, 68, 68, 0.35);
}

.fpd-body {
  padding: 0.75rem 1rem;
  overflow-y: auto;
  flex: 1;
}

.fpd-section {
  border: 1px solid rgba(0, 222, 200, 0.14);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  margin-bottom: 0.7rem;
  background: rgba(0, 0, 0, 0.18);
}

.fpd-section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: #2ee6d6;
  margin-bottom: 0.5rem;
}

.fpd-section-title.sub {
  margin-top: 0.55rem;
  color: rgba(46, 230, 214, 0.85);
}

.fpd-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  color: rgba(226, 246, 248, 0.8);
}

.fpd-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.35rem 0.45rem;
  color: #f1feff;
  font-size: 0.82rem;
}

.fpd-vehicle-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.2rem;
  font-size: 0.84rem;
  cursor: pointer;
}

.fpd-vehicle-item input {
  accent-color: #00dec8;
}

.fpd-empty {
  font-size: 0.78rem;
  color: rgba(255, 200, 120, 0.85);
  padding: 0.25rem 0;
}

.fpd-route-table-head,
.fpd-route-table-row {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.9fr 0.9fr 0.9fr auto;
  gap: 0.3rem;
  align-items: center;
}

.fpd-route-table-head {
  font-size: 0.72rem;
  color: rgba(226, 246, 248, 0.65);
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.fpd-route-table-row {
  padding: 0.25rem 0;
}

.fpd-route-table-row input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.25rem 0.3rem;
  color: #f1feff;
  font-size: 0.75rem;
}

.fpd-radio-row {
  display: flex;
  gap: 0.9rem;
}

.fpd-radio {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.fpd-radio input {
  accent-color: #00dec8;
}

.fpd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.15);
}

/* 按钮样式：与 ActionSequencePanel 的 as-btn 系列一致（scoped 不共享，需自带） */
.as-btn {
  min-height: 36px;
  padding: 0 0.92rem;
  border-radius: 9px;
  border: 1px solid rgba(0, 208, 188, 0.28);
  background: rgba(255, 255, 255, 0.08);
  color: #f1feff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  white-space: nowrap;
}

.as-btn:hover:not(:disabled) {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 222, 200, 0.12), 0 4px 14px rgba(0, 222, 200, 0.08);
  transform: translateY(-1px);
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

.as-btn.mini {
  min-height: 26px;
  padding: 0 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
}

.as-btn.danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.35), rgba(120, 20, 20, 0.9));
}

.as-btn.danger:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.5), rgba(140, 30, 30, 1));
}
</style>
