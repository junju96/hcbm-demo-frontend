<template>
  <div class="action-sequence-shell">
    <!-- 顶部栏 -->
    <div class="action-sequence-header">
      <div class="action-sequence-actions">
        <button class="as-btn primary" type="button" @click="onRefresh">
          刷新
        </button>
        <button class="as-btn" type="button" @click="openCreator">
          新建
        </button>
      </div>
    </div>

    <!-- 主内容：左侧方案列表 + 右侧详情 -->
    <div class="action-sequence-body">
      <!-- 左侧：方案列表 -->
      <div class="as-plan-list">
        <div class="as-plan-list-title">方案列表</div>
        <div v-if="loadingPlans" class="as-loading">加载中…</div>
        <div v-else-if="plans.length === 0" class="as-empty">暂无方案</div>
        <div v-else class="as-plan-items">
          <div
            v-for="plan in plans"
            :key="plan.plan_id"
            class="as-plan-item"
            :class="{ active: selectedPlanId === plan.plan_id }"
            @click="selectPlan(plan.plan_id)"
          >
            <div class="as-plan-name">{{ plan.title || plan.plan_id }}</div>
            <div class="as-plan-meta">
              <span class="as-plan-state" :class="`state-${plan.state || 'UNKNOWN'}`">{{ stateLabel(plan.state) }}</span>
              <span class="as-plan-count">{{ plan.stages_count || 0 }} 阶段</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：方案详情 + 控制 + 行动序列 -->
      <div class="as-detail-panel">
        <!-- 方案概览 + 控制按钮 -->
        <div v-if="selectedPlan" class="as-detail-header">
          <div class="as-detail-info">
            <div class="as-detail-title">{{ selectedPlan.title || selectedPlan.plan_id }}</div>
            <div class="as-detail-desc">{{ selectedPlan.description || '暂无描述' }}</div>
            <div class="as-detail-meta">
              <span>状态: <strong>{{ stateLabel(selectedPlan.state) }}</strong></span>
              <span>阶段: {{ (selectedPlan.stages || []).length }}</span>
              <span>编组: {{ (selectedPlan.teams || []).length }}</span>
            </div>
          </div>
          <div class="as-control-bar">
            <!-- 行动序列模块（协同席）：只保留下发按钮 -->
            <template v-if="!isControlMode">
              <button
                class="as-btn primary"
                type="button"
                :disabled="controlLoading"
                @click="onDispatch"
              >
                {{ controlLoading ? '处理中…' : '下发' }}
              </button>
            </template>

            <!-- 操控端行动序列模块：只保留下发按钮，单车控制按钮放在各车卡片上 -->
            <template v-if="isControlMode">
              <button
                class="as-btn primary"
                type="button"
                :disabled="controlLoading"
                @click="onDispatchActive"
              >
                {{ controlLoading ? '处理中…' : '发布为正式行动方案' }}
              </button>
            </template>
          </div>
        </div>

        <!-- 按车辆组织的行动序列 — 卡片串联式 -->
        <div v-if="vehicleActions.length > 0" class="as-vehicle-sequences">
          <div class="as-vehicle-seq-title">各车行动序列</div>
          <div class="as-vehicle-list">
            <div
              v-for="vehicle in vehicleActions"
              :key="vehicle.vid"
              class="as-vehicle-card"
            >
              <div class="as-vehicle-header">
                <span class="as-vehicle-name">{{ vehicle.vid?.replace('equipment:', '') || vehicle.vid }}</span>
                <div class="as-vehicle-controls" v-if="isControlMode">
                  <template v-if="getVehicleRuntimeState(vehicle) === 'SCHEDULED'">
                    <button class="as-btn mini primary" type="button" :disabled="controlLoading" @click="executeControl('start', [vehicle.vid])">开始</button>
                  </template>
                  <template v-if="getVehicleRuntimeState(vehicle) === 'ACTIVE'">
                    <button class="as-btn mini warn" type="button" :disabled="controlLoading" @click="executeControl('pause', [vehicle.vid])">暂停</button>
                  </template>
                  <template v-if="getVehicleRuntimeState(vehicle) === 'PAUSED'">
                    <button class="as-btn mini primary" type="button" :disabled="controlLoading" @click="executeControl('resume', [vehicle.vid])">继续</button>
                  </template>
                  <template v-if="getVehicleRuntimeState(vehicle) === 'DONE'">
                    <span class="as-state-badge done">已完成</span>
                  </template>
                  <template v-if="['ACTIVE', 'PAUSED'].includes(getVehicleRuntimeState(vehicle))">
                    <button class="as-btn mini danger" type="button" :disabled="controlLoading" @click="executeControl('stop', [vehicle.vid])">停止</button>
                  </template>
                </div>
                <span v-else class="as-vehicle-count">{{ vehicle.total_actions }} 个行动</span>
              </div>
              <div class="as-action-cards">
                <template v-for="(action, idx) in flattenActions(vehicle)" :key="action.action_id || `${action.stage_id}-${idx}`">
                  <!-- 连接线 -->
                  <div v-if="idx > 0" class="as-card-connector">
                    <div class="as-connector-line"></div>
                  </div>
                  <!-- 行动卡片 -->
                  <div
                    class="as-action-card"
                    :class="`state-${(action.state || 'SCHEDULED').toLowerCase()}`"
                    @dblclick="openParamDialog(action, vehicle)"
                  >
                    <div class="as-card-header" :title="action.name">
                      <span class="marquee-text">{{ action.name }}</span>
                    </div>
                    <div class="as-card-meta">
                      <span class="as-card-stage" :title="action.stage_title">
                        <span class="marquee-text">{{ action.stage_title }}</span>
                      </span>
                      <span class="as-card-state">{{ actionStateLabel(action.state) }}</span>
                    </div>
                    <div class="as-card-body">
                      <span class="as-card-seq">{{ idx + 1 }}</span>
                      <span v-if="action.param?.waypoints" class="as-card-waypoints" :title="`${action.param.waypoints.length} 个航路点`">
                        <span class="marquee-text">{{ action.param.waypoints.length }} 个航路点</span>
                      </span>
                      <span v-else-if="action.param?.points1?.length" class="as-card-waypoints" :title="`${action.param.points1.length} 个航路点`">
                        <span class="marquee-text">{{ action.param.points1.length }} 个航路点</span>
                      </span>
                      <span v-else-if="action.description" class="as-card-desc" :title="action.description">
                        <span class="marquee-text">{{ action.description }}</span>
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="selectedPlanId && !loadingDetail" class="as-empty-detail">
          暂无行动序列数据
        </div>
        <div v-if="loadingDetail" class="as-loading-detail">加载详情中…</div>
      </div>
    </div>

    <!-- 车辆选择弹窗（多车控制用：开始/暂停/继续/停止） -->
    <div v-if="showVehicleDialog" class="as-dialog-overlay" @click.self="showVehicleDialog = false">
      <div class="as-dialog">
        <div class="as-dialog-header">选择控制车辆</div>
        <div class="as-dialog-body">
          <label class="as-dialog-item">
            <input
              type="checkbox"
              :checked="selectedVehicleVids.length === getUgvVehicles().length && getUgvVehicles().length > 0"
              @change="toggleSelectAll"
            />
            <span>全部车辆</span>
          </label>
          <label v-for="v in getUgvVehicles()" :key="v.vid" class="as-dialog-item">
            <input type="checkbox" :value="v.vid" v-model="selectedVehicleVids" />
            <span>{{ v.vid?.replace('equipment:', '') || v.vid }} {{ v.resource_type ? '(' + v.resource_type + ')' : '' }}</span>
          </label>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="showVehicleDialog = false">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="selectedVehicleVids.length === 0"
            @click="confirmVehicleSelection"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 下发车辆选择弹窗（复选：支持批量下发多辆车） -->
    <div v-if="showDispatchVehicleDialog" class="as-dialog-overlay" @click.self="cancelDispatchVehicleSelection">
      <div class="as-dialog">
        <div class="as-dialog-header">选择要下发的车辆</div>
        <div class="as-dialog-body">
          <label class="as-dialog-item">
            <input
              type="checkbox"
              :checked="selectedDispatchVids.length === getAllVehicles().length && getAllVehicles().length > 0"
              @change="toggleDispatchSelectAll"
            />
            <span>全部车辆</span>
          </label>
          <label v-for="v in getAllVehicles()" :key="v.vid" class="as-dialog-item">
            <input type="checkbox" :value="v.vid" v-model="selectedDispatchVids" />
            <span>{{ v.vid?.replace('equipment:', '') || v.vid }} {{ v.resource_type ? '(' + v.resource_type + ')' : '' }} — {{ v.total_actions || 0 }} 个行动</span>
          </label>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="cancelDispatchVehicleSelection">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="selectedDispatchVids.length === 0"
            @click="confirmDispatchVehicleSelection"
          >
            确认下发
          </button>
        </div>
      </div>
    </div>

    <!-- 行动参数编辑弹窗：teleport 到 body，避免被右侧面板裁切 -->
    <Teleport to="body">
      <ActionParamDialog
        v-if="showParamDialog"
        :action="editingAction"
        :vehicle-vid="editingVehicleVid"
        :vehicle-type="editingVehicleType"
        @close="closeParamDialog"
        @save="saveActionParam"
      />
      <ActionSequenceCreator
        v-if="showCreator"
        @close="closeCreator"
        @saved="onCreatorSaved"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  fetchActionSequencePlans,
  fetchActionSequencePlanDetail,
  updateActionParam,
  startActionSequence,
  pauseActionSequence,
  resumeActionSequence,
  stopActionSequence,
  dispatchActionSequence,
  fetchOperatorPlans,
  fetchOperatorPlanDetail,
  startOperatorPlan,
  pauseOperatorPlan,
  resumeOperatorPlan,
  stopOperatorPlan,
  dispatchOperatorPlan,
  batchAddMapObjects,
  batchDeleteMapObjects,
  batchAddRouteDisplay,
  batchDeleteRouteDisplay,
  addPolygon,
} from '../../api/coordinationApi';
import ActionParamDialog from './ActionParamDialog.vue';
import ActionSequenceCreator from './ActionSequenceCreator.vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
});

const appendSystemMessage = (text) => {
  props.moduleApi.chat?.appendSystemMessage?.(`[行动序列] ${text}`);
};

/* ---------- 模式判断 ---------- */
const subviewId = computed(() => props.moduleApi?.coordination?.activeSubviewId || '');
const isControlMode = computed(() => subviewId.value === 'action-sequence-control');

/* ---------- 状态 ---------- */
const plans = ref([]);
const selectedPlanId = ref('');
const selectedPlan = ref(null);
// 每辆车独立的运行时状态 { [vid]: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' }
const vehicleRuntimeStates = ref({});
const loadingPlans = ref(false);
const loadingDetail = ref(false);
const controlLoading = ref(false);

/* ---------- 多车控制弹窗 ---------- */
const showVehicleDialog = ref(false);
const pendingControlAction = ref('');
const selectedVehicleVids = ref([]);

/* ---------- 操控端下发弹窗（复选） ---------- */
const showDispatchVehicleDialog = ref(false);
const selectedDispatchVids = ref([]);

/* ---------- 行动参数弹窗 ---------- */
const showParamDialog = ref(false);
const editingAction = ref(null);
const editingVehicleVid = ref('');
const editingVehicleType = ref('');
const savingParam = ref(false);

/* ---------- 新建方案弹窗 ---------- */
const showCreator = ref(false);

/* ---------- 地图上图 ---------- */
const currentMapObjectIds = ref([]);   // area / circle 对象 id
const currentRouteIds = ref([]);        // 路线临时显示 id

// 色轮均匀分布，确保相邻车辆颜色差异足够大
const VEHICLE_COLORS = [
  '#ff3333', // 红
  '#00e5ff', // 青  ← 与红相隔180°，对比最强
  '#ff8800', // 橙
  '#2979ff', // 蓝
  '#ffea00', // 黄
  '#aa00ff', // 紫
  '#00e676', // 绿
  '#ff4081', // 粉
];

const getVehicleColor = (vid, vehicleList) => {
  const idx = vehicleList.findIndex((v) => v.vid === vid);
  return VEHICLE_COLORS[idx % VEHICLE_COLORS.length];
};

const isValidWaypoints = (wps) => {
  if (!Array.isArray(wps) || wps.length === 0) return false;
  return wps.every((wp) => {
    const lat = Number(wp?.latitude ?? wp?.lat);
    const lon = Number(wp?.longitude ?? wp?.lon);
    return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
  });
};

const isValidPoint = (pt) => {
  if (!pt || typeof pt !== 'object') return false;
  const lat = Number(pt?.latitude ?? pt?.lat);
  const lon = Number(pt?.longitude ?? pt?.lon);
  return !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
};

/**
 * 从 action.param 中提取坐标点列表
 * 兼容 waypoints(列表) / target.location(列表, Lens-Recon 多边形) /
 * recon_position / fire_position / target_position / position(单点)
 */
const extractCoordinates = (param) => {
  if (!param || typeof param !== 'object') return [];
  // 1) 优先 waypoints 列表
  const wps = param.waypoints;
  if (Array.isArray(wps) && wps.length > 0) {
    return wps.filter(isValidPoint).map((wp) => ({
      lon: Number(wp.longitude ?? wp.lon),
      lat: Number(wp.latitude ?? wp.lat),
      alt: Number(wp.altitude ?? wp.alt ?? 0),
    }));
  }
  // 2) 尝试 target.location 列表（Lens-Recon 类型的多边形点）
  const targetLocation = param.target?.location;
  if (Array.isArray(targetLocation) && targetLocation.length > 0) {
    return targetLocation.filter(isValidPoint).map((pt) => ({
      lon: Number(pt.longitude ?? pt.lon),
      lat: Number(pt.latitude ?? pt.lat),
      alt: Number(pt.altitude ?? pt.alt ?? 0),
    }));
  }
  // 3) 尝试单点坐标字段
  const keys = ['recon_position', 'fire_position', 'target_position', 'position'];
  for (const key of keys) {
    const pt = param[key];
    if (isValidPoint(pt)) {
      return [{
        lon: Number(pt.longitude ?? pt.lon),
        lat: Number(pt.latitude ?? pt.lat),
        alt: Number(pt.altitude ?? pt.alt ?? 0),
      }];
    }
  }
  return [];
};

/**
 * 从整个 plan 中提取所有可绘制的坐标信息（用于比较是否变化）
 */
const extractPlanCoordinates = (plan) => {
  if (!plan) return [];
  const vehicleList = plan.vehicle_summary || [];
  const list = [];
  for (const vehicle of vehicleList) {
    const actions = (vehicle.stages || []).flatMap((s) => s.actions || []);
    for (const action of actions) {
      const coords = extractCoordinates(action.param);
      if (coords.length > 0) {
        list.push({
          vid: vehicle.vid,
          action_id: action.action_id || action.action_seq,
          action_type: action.action_type,
          points: coords.map((p) => ({ lon: p.lon, lat: p.lat, alt: p.alt })),
        });
      }
    }
  }
  return list;
};

const coordinatesEqual = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].vid !== b[i].vid) return false;
    if (a[i].action_id !== b[i].action_id) return false;
    if (a[i].action_type !== b[i].action_type) return false;
    if (a[i].points.length !== b[i].points.length) return false;
    for (let j = 0; j < a[i].points.length; j++) {
      const pa = a[i].points[j];
      const pb = b[i].points[j];
      if (pa.lon !== pb.lon || pa.lat !== pb.lat || pa.alt !== pb.alt) return false;
    }
  }
  return true;
};

const sanitizeId = (s) => String(s || '').replace(/[:\/\s#%&?]+/g, '-');

const buildLineObject = (action, planId, vid, color) => {
  const points = extractCoordinates(action.param);
  if (points.length < 2) return null;
  const coordinates = points.map((p) => [p.lon, p.lat, p.alt]);
  const uid = `as-${sanitizeId(planId)}-${sanitizeId(vid)}-${sanitizeId(action.action_id || action.action_seq)}-line`;
  return {
    unique_id: uid,
    object_type: 'line',
    object_subtype: 'standard_line',
    name: `${vid} - ${action.name || ''}`,
    color,
    geometry: {
      type: 'LineString',
      coordinates,
    },
  };
};

// 构建路线临时显示 item（用于 /map/route/display/batch/add）
const buildRouteDisplayItem = (action, planId, vid, color) => {
  const points = extractCoordinates(action.param);
  if (points.length < 2) return null;
  const uid = `as-${sanitizeId(planId)}-${sanitizeId(vid)}-${sanitizeId(action.action_id || action.action_seq)}-route`;
  return {
    unique_id: uid,
    points: points.map((p) => ({ lat: p.lat, lng: p.lon, alt: p.alt })),
    color,
  };
};

const buildAreaObject = (action, planId, vid, color) => {
  const points = extractCoordinates(action.param);
  if (points.length < 3) return null;
  const coordinates = points.map((p) => [p.lon, p.lat, p.alt]);
  // Polygon 要求首尾闭合
  if (
    coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
    coordinates[0][1] !== coordinates[coordinates.length - 1][1]
  ) {
    coordinates.push([...coordinates[0]]);
  }
  const uid = `as-${sanitizeId(planId)}-${sanitizeId(vid)}-${sanitizeId(action.action_id || action.action_seq)}-area`;
  return {
    unique_id: uid,
    object_type: 'area',
    object_subtype: 'polygon_area',
    name: `${vid} - ${action.name || ''}`,
    color,
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
};

// 构建 /map/add/polygon 接口需要的 payload
const buildPolygonPayload = (action, vid) => {
  const points = extractCoordinates(action.param);
  if (points.length < 3) return null;
  return {
    label: `${vid} - ${action.name || ''}`,
    points: points.map((p) => ({ lat: p.lat, lng: p.lon, alt: p.alt })),
  };
};

const buildCircleObject = (action, planId, vid, color) => {
  const points = extractCoordinates(action.param);
  if (points.length !== 1) return null;
  const p = points[0];
  const uid = `as-${sanitizeId(planId)}-${sanitizeId(vid)}-${sanitizeId(action.action_id || action.action_seq)}-circle`;
  // 从 param 中尝试读取半径，默认 100m
  const radius = action.param?.radius_m || action.param?.radius || 100;
  return {
    unique_id: uid,
    object_type: 'area',
    object_subtype: 'circle_area',
    name: `${vid} - ${action.name || ''}`,
    color,
    geometry: {
      type: 'Point',
      coordinates: [p.lon, p.lat, p.alt],
    },
    meta: {
      radius_m: radius,
    },
  };
};

const drawPlanOnMap = async (plan) => {
  if (!plan) {
    console.log('[MapDraw] drawPlanOnMap skipped: plan is null');
    return;
  }
  const vehicleList = plan.vehicle_summary || [];
  const routeItems = [];
  const routeIds = [];
  const objectItems = [];
  const objectIds = [];
  const polygonPayloads = []; // Lens-Recon 多边形 → /map/add/polygon

  console.log(`[MapDraw] start drawPlanOnMap, plan_id=${plan.plan_id}, vehicles=${vehicleList.length}`);

  for (const vehicle of vehicleList) {
    const color = getVehicleColor(vehicle.vid, vehicleList);
    const actions = (vehicle.stages || []).flatMap((s) => s.actions || []);
    console.log(`[MapDraw] vehicle=${vehicle.vid}, actions=${actions.length}`);

    for (const action of actions) {
      const atype = (action.action_type || '').toLowerCase();
      const points = extractCoordinates(action.param);
      console.log(`[MapDraw]   action=${action.name}, action_type=${action.action_type}, points=${points.length}`);

      if (points.length >= 2 && atype === 'auto-move') {
        // 路线 → /map/route/display/batch/add
        const routeItem = buildRouteDisplayItem(action, plan.plan_id, vehicle.vid, color);
        if (routeItem) {
          routeItems.push(routeItem);
          routeIds.push(routeItem.unique_id);
          console.log(`[MapDraw]   -> route built, uid=${routeItem.unique_id}, points=${routeItem.points.length}`);
        } else {
          console.log(`[MapDraw]   -> route skipped (invalid waypoints)`);
        }
      } else if (points.length >= 3 && atype === 'lens-recon') {
        // Lens-Recon 多边形 → /map/add/polygon
        const payload = buildPolygonPayload(action, vehicle.vid);
        if (payload) {
          polygonPayloads.push(payload);
          console.log(`[MapDraw]   -> polygon payload built, label=${payload.label}, points=${payload.points.length}`);
        } else {
          console.log(`[MapDraw]   -> polygon payload skipped (invalid waypoints, need >=3)`);
        }
      } else if (points.length >= 3) {
        // 其他多边形区域 → /map/object/batch/add
        const obj = buildAreaObject(action, plan.plan_id, vehicle.vid, color);
        if (obj) {
          objectItems.push(obj);
          objectIds.push(obj.unique_id);
          console.log(`[MapDraw]   -> polygon built, uid=${obj.unique_id}, coords=${obj.geometry.coordinates[0].length}`);
        } else {
          console.log(`[MapDraw]   -> polygon skipped (invalid waypoints, need >=3)`);
        }
      } else if (points.length === 1) {
        // 圆形区域 → /map/object/batch/add
        const obj = buildCircleObject(action, plan.plan_id, vehicle.vid, color);
        if (obj) {
          objectItems.push(obj);
          objectIds.push(obj.unique_id);
          console.log(`[MapDraw]   -> circle built, uid=${obj.unique_id}, radius=${obj.meta.radius_m}m`);
        }
      } else {
        console.log(`[MapDraw]   -> ignored action_type=${atype}, points=${points.length}`);
      }
    }
  }

  let totalAdded = 0;
  const mapObjectIds = []; // 统一收集所有成功上图的对象 id

  // 1. 批量添加路线临时显示
  if (routeItems.length > 0) {
    console.log(`[MapDraw] calling batchAddRouteDisplay, routes=${routeItems.length}`);
    const routeResult = await batchAddRouteDisplay(routeItems);
    console.log('[MapDraw] batchAddRouteDisplay result:', routeResult);
    if (routeResult.ok) {
      currentRouteIds.value = routeIds;
      totalAdded += routeItems.length;
      console.log('[MapDraw] route success, stored ids:', routeIds);
    } else {
      appendSystemMessage('路线上图失败: ' + (routeResult.error || '未知错误'));
      console.log('[MapDraw] route failed:', routeResult.error);
    }
  }

  // 2. Lens-Recon 多边形逐个调用 /map/add/polygon
  if (polygonPayloads.length > 0) {
    console.log(`[MapDraw] calling addPolygon, count=${polygonPayloads.length}`);
    for (const payload of polygonPayloads) {
      const result = await addPolygon(payload);
      if (result.ok) {
        const uid = result.data?.data?.unique_id || result.data?.unique_id;
        if (uid) {
          mapObjectIds.push(uid);
          totalAdded += 1;
          console.log(`[MapDraw] polygon added, uid=${uid}`);
        } else {
          console.log('[MapDraw] polygon added but no unique_id returned');
        }
      } else {
        appendSystemMessage('多边形上图失败: ' + (result.error || '未知错误'));
        console.log('[MapDraw] addPolygon failed:', result.error);
      }
    }
  }

  // 3. 批量添加其他正式地图对象（area / circle）
  if (objectItems.length > 0) {
    console.log(`[MapDraw] calling batchAddMapObjects, objects=${objectItems.length}`);
    const objResult = await batchAddMapObjects(objectItems);
    console.log('[MapDraw] batchAddMapObjects result:', objResult);
    if (objResult.ok) {
      mapObjectIds.push(...objectIds);
      totalAdded += objectItems.length;
      console.log('[MapDraw] object success, stored ids:', objectIds);
    } else {
      appendSystemMessage('区域上图失败: ' + (objResult.error || '未知错误'));
      console.log('[MapDraw] object failed:', objResult.error);
    }
  }

  currentMapObjectIds.value = mapObjectIds;

  if (totalAdded > 0) {
    appendSystemMessage(`地图上图成功: ${totalAdded} 个对象`);
  } else if (routeItems.length === 0 && polygonPayloads.length === 0 && objectItems.length === 0) {
    console.log('[MapDraw] no drawable objects, skip batchAdd');
  }
};

const clearPlanOnMap = async () => {
  // 1. 清除路线临时显示
  const routeIds = currentRouteIds.value;
  if (routeIds.length > 0) {
    console.log(`[MapDraw] clear routes, count=${routeIds.length}`, routeIds);
    try {
      const r = await batchDeleteRouteDisplay(routeIds);
      console.log('[MapDraw] batchDeleteRouteDisplay result:', r);
    } catch (e) {
      console.log('[MapDraw] batchDeleteRouteDisplay error:', e);
    }
    currentRouteIds.value = [];
  }

  // 2. 批量清除正式地图对象（polygon / circle / area）
  const objIds = currentMapObjectIds.value;
  if (objIds.length > 0) {
    console.log(`[MapDraw] clear objects, count=${objIds.length}`, objIds);
    try {
      const r = await batchDeleteMapObjects(objIds);
      console.log('[MapDraw] batchDeleteMapObjects result:', r);
    } catch (e) {
      console.log('[MapDraw] batchDeleteMapObjects error:', e);
    }
    currentMapObjectIds.value = [];
  }
};

/* ---------- 计算属性 ---------- */
const runtimeStateLabel = computed(() => {
  const map = {
    SCHEDULED: '待执行',
    ACTIVE: '执行中',
    PAUSED: '已暂停',
    DONE: '已完成',
    DELETED: '已删除',
  };
  // 取第一辆车的实际状态作为整体显示
  const vs = selectedPlan.value?.vehicle_summary || [];
  const state = vs[0] ? getVehicleRuntimeState(vs[0]) : 'SCHEDULED';
  return map[state] || state;
});

const vehicleActions = computed(() => {
  if (!selectedPlan.value) return [];
  return selectedPlan.value.vehicle_summary || [];
});

/* ---------- 方法 ---------- */
const stateLabel = (state) => {
  const map = {
    DRAFT: '草稿',
    DRAFT_EDITING: '编辑中',
    READY: '就绪',
    ACTIVE: '执行中',
    DONE: '已完成',
    DELETED: '已删除',
    INIT: '初始化',
  };
  return map[state] || state || '未知';
};

const actionStateLabel = (state) => {
  const map = {
    SCHEDULED: '待执行',
    ACTIVE: '执行中',
    PAUSED: '已暂停',
    DONE: '已完成',
    DELETED: '已删除',
    READY: '就绪',
    INIT: '初始化',
    null: '待执行',
  };
  return map[state] || state || '待执行';
};

const flattenActions = (vehicle) => {
  if (!vehicle || !vehicle.stages) return [];
  return vehicle.stages
    .flatMap((stage) =>
      (stage.actions || []).map((action) => ({
        ...action,
        stage_id: stage.stage_id,
        stage_title: stage.stage_title,
        stage_seq: stage.stage_seq,
      }))
    )
    .sort((a, b) => (a.stage_seq - b.stage_seq) || ((a.action_seq || 0) - (b.action_seq || 0)));
};

// 根据车辆 actions 的实际状态计算控制按钮应显示的状态
// 每辆车独立判断，不受 plan 级别 runtime_state 影响
const getVehicleRuntimeState = (vehicle) => {
  const actions = flattenActions(vehicle);
  // 所有 action 都 DONE → DONE（最高优先级）
  if (actions.length > 0 && actions.every((a) => a.state === 'DONE')) {
    return 'DONE';
  }
  // 根据该车自身的 action 状态推断
  if (actions.some((a) => a.state === 'ACTIVE')) return 'ACTIVE';
  if (actions.some((a) => a.state === 'PAUSED')) return 'PAUSED';
  return 'SCHEDULED';
};

/* ---------- 行动参数弹窗 ---------- */
const openParamDialog = (action, vehicle) => {
  if (!action || !action.action_id) return;
  editingAction.value = action;
  editingVehicleVid.value = vehicle?.vid || action.vid || '';
  editingVehicleType.value = vehicle?.resource_type || '';
  showParamDialog.value = true;
};

const closeParamDialog = () => {
  showParamDialog.value = false;
  editingAction.value = null;
  editingVehicleVid.value = '';
  editingVehicleType.value = '';
};

const saveActionParam = async (newParam) => {
  const action = editingAction.value;
  if (!action || !selectedPlanId.value) return;

  savingParam.value = true;
  try {
    const planId = selectedPlanId.value;
    const actionId = action.action_id;

    // 先调用后端保存
    const result = await updateActionParam(planId, actionId, newParam);
    if (!result.ok) {
      appendSystemMessage('参数保存失败: ' + (result.error || '未知错误'));
      return;
    }

    // 更新本地 selectedPlan 中对应 action 的 param
    const vehicles = selectedPlan.value?.vehicle_summary || [];
    for (const vehicle of vehicles) {
      for (const stage of vehicle.stages || []) {
        const target = (stage.actions || []).find((a) => a.action_id === actionId);
        if (target) {
          target.param = newParam;
          break;
        }
      }
    }

    appendSystemMessage(`行动参数已保存 | ${action.name}`);
    closeParamDialog();

    // 参数变更可能影响地图显示，重新上图
    await clearPlanOnMap();
    await drawPlanOnMap(selectedPlan.value);
  } finally {
    savingParam.value = false;
  }
};

/* ---------- 新建方案弹窗 ---------- */
const openCreator = () => {
  showCreator.value = true;
};

const closeCreator = () => {
  showCreator.value = false;
};

const onCreatorSaved = (plan) => {
  // 当前后端暂无 create plan 接口，新建方案仅本地展示
  // 将其插入方案列表并选中，便于用户查看效果
  const item = {
    plan_id: plan.plan_id,
    resource_id: plan.resource_id,
    title: plan.title,
    description: plan.description,
    state: plan.state,
    stages_count: plan.stages?.length || 0,
    teams_count: plan.teams?.length || 0,
  };
  plans.value.unshift(item);
  selectedPlan.value = plan;
  selectedPlanId.value = plan.plan_id;
  closeCreator();
  appendSystemMessage('已新建本地预览方案，可继续编辑参数');
};

const loadPlans = async (silent = false) => {
  if (!silent) loadingPlans.value = true;
  // 协同席从协同席数据服务查，操控端从操控席数据服务查
  const result = isControlMode.value
    ? await fetchOperatorPlans()
    : await fetchActionSequencePlans();
  if (!silent) loadingPlans.value = false;
  if (result.ok) {
    const prevId = selectedPlanId.value;
    plans.value = result.data.items || [];

    if (plans.value.length === 0) {
      selectedPlanId.value = '';
      selectedPlan.value = null;
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

const refreshDetail = async (planId) => {
  if (!planId) return;
  const oldCoords = extractPlanCoordinates(selectedPlan.value);
  // 协同席 / 操控端区分数据源
  const result = isControlMode.value
    ? await fetchOperatorPlanDetail(planId)
    : await fetchActionSequencePlanDetail(planId);
  if (result.ok) {
    const newPlan = result.data;
    const newCoords = extractPlanCoordinates(newPlan);
    // 坐标未变化则跳过清空重绘，只更新数据
    if (coordinatesEqual(oldCoords, newCoords)) {
      selectedPlan.value = newPlan;
      console.log('[MapDraw] coordinates unchanged, skip redraw');
      return;
    }
    // 有变化时先清空，再根据新坐标决定是否重画
    await clearPlanOnMap();
    selectedPlan.value = newPlan;
    if (newCoords.length > 0) {
      await drawPlanOnMap(selectedPlan.value);
    } else {
      console.log('[MapDraw] no coordinates in refreshed data, cleared only');
    }
  }
};

const selectPlan = async (planId) => {
  console.log(`[MapDraw] selectPlan called, planId=${planId}, isControlMode=${isControlMode.value}`);
  // 切换 plan 时先清除旧地图对象
  await clearPlanOnMap();
  selectedPlanId.value = planId;
  loadingDetail.value = true;
  // 协同席从协同席数据服务查详情，操控端从操控席数据服务查详情
  const result = isControlMode.value
    ? await fetchOperatorPlanDetail(planId)
    : await fetchActionSequencePlanDetail(planId);
  loadingDetail.value = false;
  console.log(`[MapDraw] selectPlan result.ok=${result.ok}, error=${result.error || 'none'}`);
  if (result.ok) {
    selectedPlan.value = result.data;
    const vs = result.data.vehicle_summary || [];
    const firstAction = (vs[0]?.stages || [{}])[0]?.actions?.[0];
    console.log('[MapDraw] selectPlan firstAction keys:', firstAction ? Object.keys(firstAction) : 'no actions');
    console.log('[MapDraw] selectPlan firstAction action_type:', firstAction?.action_type);
    // 新 plan 加载成功后自动上图
    await drawPlanOnMap(selectedPlan.value);
  } else {
    selectedPlan.value = null;
    appendSystemMessage('获取方案详情失败: ' + (result.error || '未知错误'));
  }
};

const onRefresh = () => {
  loadPlans();
  if (selectedPlanId.value) selectPlan(selectedPlanId.value);
  appendSystemMessage('已刷新');
};

const onStart = async () => { handleControlAction('start'); };
const onPause = async () => { handleControlAction('pause'); };
const onResume = async () => { handleControlAction('resume'); };
const onStop = async () => { handleControlAction('stop'); };

const getUgvVehicles = () => {
  const all = selectedPlan.value?.vehicle_summary || [];
  // 过滤 resource_type 为 UGV 的；若无 resource_type 字段则全部视为 UGV（兼容旧数据）
  const ugvs = all.filter((v) => !v.resource_type || v.resource_type === 'UGV');
  return ugvs;
};

const getAllVehicles = () => {
  // 下发时列出所有车辆，不限于 UGV
  return selectedPlan.value?.vehicle_summary || [];
};

const handleControlAction = (actionType) => {
  const ugvs = getUgvVehicles();
  if (ugvs.length <= 1) {
    // 单车直接执行（也覆盖 0 辆车时的空操作）
    executeControl(actionType, ugvs.map((v) => v.vid));
    return;
  }
  // 多车打开弹窗
  pendingControlAction.value = actionType;
  selectedVehicleVids.value = ugvs.map((v) => v.vid); // 默认全选
  showVehicleDialog.value = true;
};

const executeControl = async (actionType, vids) => {
  if (!vids || vids.length === 0) return;
  controlLoading.value = true;
  try {
    const planId = selectedPlanId.value;
    let apiFn;
    let successState;
    let successMsg;
    switch (actionType) {
      case 'start':
        apiFn = isControlMode.value ? startOperatorPlan : startActionSequence;
        successState = 'ACTIVE';
        successMsg = '行动序列已开始执行';
        break;
      case 'pause':
        apiFn = isControlMode.value ? pauseOperatorPlan : pauseActionSequence;
        successState = 'PAUSED';
        successMsg = '行动序列已暂停';
        break;
      case 'resume':
        apiFn = isControlMode.value ? resumeOperatorPlan : resumeActionSequence;
        successState = 'ACTIVE';
        successMsg = '行动序列已继续';
        break;
      case 'stop':
        apiFn = isControlMode.value ? stopOperatorPlan : stopActionSequence;
        successState = 'SCHEDULED';
        successMsg = '行动序列已停止并重置';
        break;
    }
    // 多车并行调用，单车直接调用（去掉 equipment: 前缀）
    const results = await Promise.all(vids.map((vid) => apiFn(planId, vid?.replace('equipment:', '') || vid)));
    const allOk = results.every((r) => r.ok);
    if (allOk) {
      const cleanVids = vids.map((v) => v?.replace('equipment:', '') || v);
      appendSystemMessage(
        `${successMsg} (${cleanVids.length > 1 ? cleanVids.length + '辆车' : cleanVids[0]})`
      );
      // 操作成功后立即刷新 plan 详情，同步后端 runtime_state
      await selectPlan(planId);
    } else {
      const errs = results
        .filter((r) => !r.ok)
        .map((r) => r.data?.message || r.error)
        .join(', ');
      appendSystemMessage(`${successMsg}失败: ${errs}`);
    }
  } finally {
    controlLoading.value = false;
  }
};

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedVehicleVids.value = getUgvVehicles().map((v) => v.vid);
  } else {
    selectedVehicleVids.value = [];
  }
};

const confirmVehicleSelection = () => {
  showVehicleDialog.value = false;
  executeControl(pendingControlAction.value, selectedVehicleVids.value);
};

const onDispatch = async () => {
  // 协同席 — 将方案下发到操控席数据服务端
  controlLoading.value = true;
  const result = await dispatchActionSequence(selectedPlanId.value, {});
  controlLoading.value = false;
  if (result.ok) {
    appendSystemMessage('行动方案已下发到操控席');
  } else {
    appendSystemMessage('下发到操控席失败: ' + (result.data?.message || result.error || '未知错误'));
  }
};

const onDispatchActive = async () => {
  // 操控端行动序列模块：走 zenoh send_mission（操控端接口）
  const vehicles = getAllVehicles();
  if (vehicles.length > 1) {
    // 多车时弹出复选框，支持批量下发
    selectedDispatchVids.value = [];
    showDispatchVehicleDialog.value = true;
    return;
  }
  // 单车直接下发
  const vid = vehicles[0]?.vid || '';
  await doDispatchActive(vid);
};

// 核心下发逻辑（不管理 loading，供单发/批量复用）
const _dispatchVehicle = async (vehicleVid) => {
  if (!vehicleVid) {
    appendSystemMessage('下发失败: 未指定车辆');
    return { ok: false };
  }
  // 去掉 equipment: 前缀（如 equipment:XL01 → XL01）
  const cleanVid = String(vehicleVid).replace('equipment:', '');
  const payload = { vehicle_vid: cleanVid };
  const result = await dispatchOperatorPlan(selectedPlanId.value, payload);
  if (result.ok) {
    const data = result.data?.data || {};
    appendSystemMessage(`行动序列已下发 | vehicle=${data.vehicle_vid || vehicleVid} | topic=${data.topic || ''} | tid=${data.mission_tid || ''}`);
  } else {
    appendSystemMessage('下发失败: ' + (result.data?.message || result.error || '未知错误'));
  }
  return result;
};

const doDispatchActive = async (vehicleVid) => {
  controlLoading.value = true;
  try {
    await _dispatchVehicle(vehicleVid);
  } finally {
    controlLoading.value = false;
  }
};

const confirmDispatchVehicleSelection = async () => {
  showDispatchVehicleDialog.value = false;
  const vids = selectedDispatchVids.value;
  if (vids.length === 0) return;
  controlLoading.value = true;
  try {
    await Promise.all(vids.map((vid) => _dispatchVehicle(vid)));
  } finally {
    controlLoading.value = false;
    selectedDispatchVids.value = [];
  }
};

const cancelDispatchVehicleSelection = () => {
  showDispatchVehicleDialog.value = false;
  selectedDispatchVids.value = [];
};

const toggleDispatchSelectAll = (e) => {
  if (e.target.checked) {
    selectedDispatchVids.value = getAllVehicles().map((v) => v.vid);
  } else {
    selectedDispatchVids.value = [];
  }
};

/* ---------- 跑马灯溢出检测 ---------- */
const updateMarqueeStates = () => {
  nextTick(() => {
    document.querySelectorAll('.as-action-card .marquee-text').forEach((el) => {
      const track = el.parentElement;
      if (!track) return;
      const overflow = el.scrollWidth > track.clientWidth;
      if (overflow) {
        el.classList.add('marquee-active');
        track.style.setProperty('--track-width', `${track.clientWidth}px`);
      } else {
        el.classList.remove('marquee-active');
        track.style.removeProperty('--track-width');
      }
    });
  });
};

watch(selectedPlan, () => {
  updateMarqueeStates();
});

// 当无选中方案时，清空地图对象
watch(selectedPlanId, async (newId) => {
  if (!newId) {
    await clearPlanOnMap();
  }
});

// 全部行动完成后，自动重置控制按钮状态
watch(
  selectedPlan,
  (newPlan) => {
    if (!newPlan) return;
    const vehicles = newPlan.vehicle_summary || [];
    vehicles.forEach((v) => {
      if (getVehicleRuntimeState(v) !== 'ACTIVE') return;
      const actions = (v.stages || []).flatMap((s) => s.actions || []);
      if (actions.length > 0 && actions.every((a) => a.state === 'DONE')) {
        appendSystemMessage(`${v.vid?.replace('equipment:', '') || v.vid} 全部行动已完成`);
      }
    });
  },
  { deep: true }
);

/* ---------- 自动刷新 ---------- */
let autoRefreshTimer = null;
const startAutoRefresh = () => {
  autoRefreshTimer = setInterval(() => {
    loadPlans(true); // silent: 自动刷新不显示 loading，避免闪烁
  }, 5000);
};
const stopAutoRefresh = () => {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
};

/* ---------- 生命周期 ---------- */
onMounted(() => {
  loadPlans();
  updateMarqueeStates();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
  clearPlanOnMap();
});
</script>

<style scoped>
.action-sequence-shell {
  --as-border: rgba(0, 208, 188, 0.35);
  --as-border-soft: rgba(0, 208, 188, 0.22);
  --as-bg: rgba(1, 16, 22, 0.84);
  --as-text: #f1feff;
  --as-accent: #00dec8;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 0.8rem;
  font-size: 14px;
  line-height: 1.6;
  color: var(--as-text);
  overflow: hidden;
}

/* 头部 */
.action-sequence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-shrink: 0;
  padding: 0.2rem 0.1rem;
}

.action-sequence-title {
  font-size: 1.22rem;
  font-weight: 800;
  color: #f7fdff;
  margin: 0;
  letter-spacing: 0.01em;
}

.action-sequence-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

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

.as-btn.warn {
  border-color: rgba(229, 168, 11, 0.4);
  background: linear-gradient(180deg, rgba(229, 168, 11, 0.35), rgba(120, 80, 0, 0.9));
}

.as-btn.warn:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(229, 168, 11, 0.5), rgba(140, 95, 0, 1));
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

/* 状态标签（如已完成） */
.as-state-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.08rem 0.5rem;
  font-weight: 700;
  font-size: 0.72rem;
  min-height: 26px;
}
.as-state-badge.done {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

/* 主内容布局 */
.action-sequence-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0.8rem;
  overflow: hidden;
}

/* 左侧方案列表 */
.as-plan-list {
  width: 240px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid var(--as-border-soft);
  background: rgba(0, 16, 22, 0.68);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.as-plan-list-title {
  font-size: 1rem;
  font-weight: 800;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
  color: #eefcff;
}

.as-plan-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.as-plan-item {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.1);
  background: rgba(6, 20, 26, 0.6);
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease;
}

.as-plan-item:hover {
  border-color: rgba(0, 222, 200, 0.3);
  background: rgba(6, 24, 30, 0.8);
}

.as-plan-item.active {
  border-color: rgba(0, 222, 200, 0.45);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.08), rgba(0, 49, 72, 0.05));
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.1);
}

.as-plan-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #f7fdff;
  margin-bottom: 0.25rem;
}

.as-plan-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
}

.as-plan-state {
  border-radius: 999px;
  padding: 0.08rem 0.4rem;
  font-weight: 700;
  font-size: 0.72rem;
}

.state-DRAFT { background: rgba(148, 163, 184, 0.18); color: #cbd5e1; }
.state-DRAFT_EDITING { background: rgba(59, 130, 246, 0.18); color: #93c5fd; }
.state-READY { background: rgba(0, 222, 200, 0.18); color: #b4fff8; }
.state-ACTIVE { background: rgba(34, 197, 94, 0.18); color: #86efac; }
.state-DONE { background: rgba(100, 116, 139, 0.18); color: #94a3b8; }
.state-null { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
.state-UNKNOWN { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }

.as-plan-count {
  color: rgba(226, 246, 248, 0.6);
}

/* 右侧详情面板 */
.as-detail-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  overflow-y: auto;
}

.as-detail-header {
  border-radius: 12px;
  border: 1px solid var(--as-border-soft);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68);
  padding: 0.85rem 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.as-detail-info {
  flex: 1;
  min-width: 0;
}

.as-detail-title {
  font-size: 1.08rem;
  font-weight: 800;
  color: #f7fdff;
  margin-bottom: 0.25rem;
}

.as-detail-desc {
  font-size: 0.88rem;
  color: rgba(226, 246, 248, 0.75);
  margin-bottom: 0.4rem;
  line-height: 1.5;
}

.as-detail-meta {
  display: flex;
  gap: 0.9rem;
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.65);
}

.as-detail-meta strong {
  color: var(--as-accent);
}

.as-control-bar {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* 车辆行动序列 — 卡片串联式 */
.as-vehicle-sequences {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.as-vehicle-seq-title {
  font-size: 1.02rem;
  font-weight: 800;
  color: #eefcff;
  padding: 0.1rem 0.1rem 0.2rem;
}

.as-vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.as-vehicle-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.7rem 0.85rem;
}

.as-vehicle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.as-vehicle-controls {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.as-vehicle-name {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
}

.as-vehicle-count {
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.65);
  background: rgba(0, 222, 200, 0.1);
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
}

/* 卡片容器 — 水平排列 */
.as-action-cards {
  display: flex;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  padding: 0.4rem 0.8rem;
  min-height: 120px;
}

/* 连接线 */
.as-card-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  flex-shrink: 0;
  position: relative;
}

.as-connector-line {
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, rgba(0, 222, 200, 0.4), rgba(0, 222, 200, 0.7), rgba(0, 222, 200, 0.4));
  position: relative;
}

.as-connector-line::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid rgba(0, 222, 200, 0.7);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

/* 行动卡片 */
.as-action-card {
  flex-shrink: 0;
  width: 160px;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.08), rgba(0, 222, 200, 0.02));
  padding: 0.55rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
  cursor: default;
}

.as-action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 222, 200, 0.12);
  border-color: rgba(0, 222, 200, 0.4);
}

/* 执行中 — 呼吸灯效果（box-shadow 限制在卡片 margin 内，避免被父容器 overflow 裁切） */
@keyframes breathe-active {
  0%, 100% {
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 14px rgba(59, 130, 246, 0.55), 0 0 28px rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.75);
  }
}

.as-action-card {
  margin: 3px; /* 给阴影留出溢出空间 */
}

.as-action-card.state-active {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04));
  animation: breathe-active 2s ease-in-out infinite;
}

.as-action-card.state-done {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02));
}

.as-action-card.state-paused {
  border-color: rgba(229, 168, 11, 0.4);
  background: linear-gradient(180deg, rgba(229, 168, 11, 0.08), rgba(229, 168, 11, 0.02));
}

.as-card-header {
  font-size: 0.92rem;
  font-weight: 800;
  color: #f7fdff;
  line-height: 1.35;
  min-height: 2.4em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 跑马灯 */
.marquee-text {
  display: inline-block;
  white-space: nowrap;
}

.as-action-card:hover .marquee-text.marquee-active {
  animation: marquee-scroll 5s linear infinite alternate;
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-100% + var(--track-width, 130px)));
  }
}

.as-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
  font-size: 0.72rem;
}

.as-card-stage {
  color: var(--as-accent);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  max-width: 84px;
}

.as-card-state {
  border-radius: 999px;
  padding: 0.06rem 0.35rem;
  font-weight: 700;
  font-size: 0.7rem;
  flex-shrink: 0;
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

.as-action-card.state-active .as-card-state {
  background: rgba(59, 130, 246, 0.25);
  color: #93c5fd;
}

.as-action-card.state-done .as-card-state {
  background: rgba(34, 197, 94, 0.25);
  color: #86efac;
}

.as-action-card.state-paused .as-card-state {
  background: rgba(229, 168, 11, 0.25);
  color: #ffe28c;
}

.as-action-card.state-ready .as-card-state {
  background: rgba(0, 222, 200, 0.25);
  color: #b4fff8;
}

.as-card-body {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.15rem;
  font-size: 0.76rem;
  color: rgba(226, 246, 248, 0.7);
}

.as-card-seq {
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 222, 200, 0.15);
  color: var(--as-accent);
  font-weight: 700;
  font-size: 0.65rem;
  flex-shrink: 0;
}

.as-card-waypoints,
.as-card-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 空状态 / 加载 */
.as-loading, .as-empty, .as-empty-detail, .as-loading-detail {
  padding: 1rem;
  text-align: center;
  color: rgba(226, 246, 248, 0.6);
  font-size: 0.9rem;
}

/* 车辆选择弹窗 */
.as-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-dialog {
  background: linear-gradient(180deg, rgba(0, 32, 40, 0.96), rgba(0, 16, 22, 0.98));
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 12px;
  min-width: 280px;
  max-width: 400px;
  color: var(--as-text);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.as-dialog-header {
  padding: 0.85rem 1rem;
  font-weight: 800;
  font-size: 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  color: #f7fdff;
}

.as-dialog-body {
  padding: 0.7rem 1rem;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.as-dialog-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: color 120ms ease;
}

.as-dialog-item:hover {
  color: #fff;
}

.as-dialog-item input[type='checkbox'],
.as-dialog-item input[type='radio'] {
  accent-color: var(--as-accent);
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.as-dialog-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

@media (max-width: 900px) {
  .action-sequence-body {
    flex-direction: column;
  }
  .as-plan-list {
    width: 100%;
    max-height: 200px;
  }
}
</style>
