<template>
  <div class="asc-overlay" @click.self="$emit('close')">
    <div class="asc-panel">
      <!-- 步骤 1：选择车辆类型 -->
      <template v-if="step === 'select-vehicle'">
        <div class="asc-header">
          <span>新建行动序列方案</span>
          <button class="as-btn mini" type="button" @click="$emit('close')">取消</button>
        </div>
        <div class="asc-body centered">
          <div class="asc-title">选择车辆类型</div>
          <div class="asc-vehicle-grid">
            <div
              v-for="v in vehicleOptions"
              :key="v.vid || v.type"
              class="asc-vehicle-card"
              @click="selectVehicle(v)"
            >
              <div class="asc-vehicle-icon">
                <VehicleIcon :vehicle-type="v.type" />
              </div>
              <div class="asc-vehicle-name">{{ v.name }}</div>
              <div class="asc-vehicle-type">{{ v.type }}</div>
            </div>
          </div>
        </div>
      </template>

      <!-- 步骤 2：编辑方案 -->
      <template v-else-if="step === 'edit'">
        <div class="asc-header">
          <span>{{ headerTitle }}</span>
          <div class="asc-header-actions">
            <button class="as-btn mini ghost" type="button" title="按串/并行关系自动等距排列" @click="autoLayout">⊹ 自动对齐</button>
            <button class="as-btn mini primary" type="button" @click="savePlan">保存</button>
            <button class="as-btn mini" type="button" @click="$emit('close')">取消</button>
          </div>
        </div>
        <div class="asc-layout">
          <!-- 左侧元任务面板 -->
          <div class="asc-palette">
            <div class="asc-palette-title">可用元任务</div>
            <div class="asc-palette-hint">拖拽任务卡片到右侧画布</div>
            <div class="asc-palette-section">
              <div class="asc-palette-section-title">
                <span class="asc-section-dot chassis"></span>
                <span>单车机动</span>
                <span class="asc-section-count">{{ chassisTasks.length }}</span>
              </div>
              <div
                v-for="task in chassisTasks"
                :key="task.actionType"
                class="asc-task-card chassis"
                draggable="true"
                @dragstart="onDragStart($event, task, 'chassis')"
              >
                <span class="asc-task-grip" aria-hidden="true"></span>
                <span class="asc-task-name">{{ task.name }}</span>
              </div>
            </div>
            <div class="asc-palette-section" v-if="payloadTasks.length">
              <div class="asc-palette-section-title">
                <span class="asc-section-dot payload"></span>
                <span>载荷元任务</span>
                <span class="asc-section-count">{{ payloadTasks.length }}</span>
              </div>
              <div
                v-for="task in payloadTasks"
                :key="task.actionType"
                class="asc-task-card payload"
                draggable="true"
                @dragstart="onDragStart($event, task, 'payload')"
              >
                <span class="asc-task-grip" aria-hidden="true"></span>
                <span class="asc-task-name">{{ task.name }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧编辑画布 -->
          <div
            ref="canvasRef"
            class="asc-canvas"
            :class="{ 'is-connecting': drawingLine }"
            @drop="onDrop"
            @dragover.prevent
            @click="onCanvasClick"
          >
            <svg class="asc-lines">
              <defs>
                <marker
                  id="as-arrow"
                  viewBox="0 0 14 14"
                  refX="12"
                  refY="7"
                  markerWidth="13"
                  markerHeight="13"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M2 2 L12 7 L2 12 L5 7 Z" fill="#16e6cf" />
                </marker>
                <marker
                  id="as-arrow-hover"
                  viewBox="0 0 14 14"
                  refX="12"
                  refY="7"
                  markerWidth="13"
                  markerHeight="13"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M2 2 L12 7 L2 12 L5 7 Z" fill="#ff7676" />
                </marker>
              </defs>
              <path
                v-for="(line, idx) in lines"
                :key="idx"
                :d="line.path"
                class="asc-line"
                :class="{ active: drawingLine && drawingLine.to === line.to && drawingLine.from === line.from }"
                marker-end="url(#as-arrow)"
                @click.stop="removeLine(line)"
              />
              <path
                v-if="tempLine"
                :d="tempLine.path"
                class="asc-line temp"
              />
            </svg>

            <div
              v-for="node in nodes"
              :key="node.id"
              class="asc-node"
              :class="[{ selected: selectedNodeId === node.id }, `cat-${node.category || 'chassis'}`]"
              :style="{ left: node.x + 'px', top: node.y + 'px' }"
              @mousedown.stop="startDragNode($event, node)"
              @click.stop="onNodeClick(node)"
            >
              <div class="asc-node-port in" title="连接到此" @click.stop="finishConnect($event, node, 'in')" />
              <div class="asc-node-body">
                <div class="asc-node-name">{{ node.name }}</div>
                <div class="asc-node-type">{{ node.actionType }}</div>
              </div>
              <div class="asc-node-port out" :title="drawingLine ? '连接到此' : '点击开始连线'" @click.stop="onPortClick($event, node, 'out')" />
              <button class="asc-node-remove" type="button" title="删除节点" @click.stop="removeNode(node)">×</button>
            </div>

            <div v-if="nodes.length === 0" class="asc-canvas-empty">
              <div class="asc-canvas-empty-icon">⊹</div>
              <div>从左侧拖拽元任务到此处开始编排</div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue';
import VehicleIcon from './VehicleIcon.vue';
import { createOperatorPlan, patchOperatorPlan } from '../../api/coordinationApi.js';
import { normalizeActionParam } from './actionParamNormalizer';

const props = defineProps({
  editMode: { type: Boolean, default: false },
  editPlan: { type: Object, default: null },
  editVehicleVid: { type: String, default: '' },
  editVehicleType: { type: String, default: '' },
  presetVehicleType: { type: String, default: '' },
  // 追加模式：将新车辆行动序列追加到已有方案中，而不是创建新方案
  appendMode: { type: Boolean, default: false },
  appendPlan: { type: Object, default: null },
  // 当前可选的车辆列表（从资源池获取的实际已连接无人车）
  availableVehicles: { type: Array, default: () => [] },
  // 预选中车辆完整对象（含 vid），用于从“各车行动序列”新建时直接指定具体车辆
  presetVehicle: { type: Object, default: null },
});

const emit = defineEmits(['close', 'saved']);

const step = ref('select-vehicle');
const selectedVehicleType = ref('');
// 当前选中的完整车辆对象（含 vid），从 availableVehicles 中选择
const selectedVehicle = ref(null);
const canvasRef = ref(null);
const nodes = ref([]);
const lines = ref([]);
const selectedNodeId = ref(null);
const drawingLine = ref(null);
const tempLine = ref(null);
const draggingNode = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

// 默认车辆选项（资源池不可达时的兜底）
const defaultVehicleOptions = [
  { type: 'Fire-Support-UGV', name: '火力车' },
  { type: 'Recon-Strike-UGV', name: '侦打车' },
  { type: 'Patrol-UGV', name: '巡逻车' },
  { type: 'Electronic-UGV', name: '电磁车' },
  { type: 'Air-Ground-UAV', name: '空地车' },
];

const vehicleTypeNameMap = {
  'Fire-Support-UGV': '火力车',
  'Recon-Strike-UGV': '侦打车',
  'Patrol-UGV': '巡逻车',
  'Electronic-UGV': '电磁车',
  'Air-Ground-UAV': '空地车',
};

const vehicleOptions = computed(() => {
  if (props.availableVehicles && props.availableVehicles.length > 0) {
    return props.availableVehicles.map((v) => ({
      type: v.resource_type,
      name: v.display_name || v.name || v.resource_type,
      vid: v.vid,
      resource_name: v.resource_name,
      supported_action_types: v.supported_action_types || [],
    }));
  }
  return defaultVehicleOptions;
});

const selectedVehicleName = computed(() => {
  const v = vehicleOptions.value.find((item) => item.type === selectedVehicleType.value);
  return v ? v.name : (vehicleTypeNameMap[selectedVehicleType.value] || selectedVehicleType.value);
});

const headerTitle = computed(() => {
  if (props.editMode) return `编辑方案 - ${selectedVehicleName.value}`;
  if (props.appendMode) return `追加方案 - ${selectedVehicleName.value}`;
  return `新建方案 - ${selectedVehicleName.value}`;
});

const chassisTasks = [
  { actionType: 'Auto-Move', name: '自主机动', defaultParam: { points: [], limited_speed: 20, safe_mode: 0, loop_mode: 0 } },
  { actionType: 'Follow-Move', name: '跟随机动', defaultParam: { x: 960, y: 540, width: 1920, height: 1080, distance: 10, limited_speed: 15, safe_mode: 0, strategy: 0 } },
  { actionType: 'Silent-Guard', name: '静默值守', defaultParam: { time: 300 } },
  { actionType: 'Set-Return-Point', name: '设置返航点', defaultParam: {} },
  { actionType: 'Return-To-Base', name: '开启返航', defaultParam: {} },
  { actionType: 'Formation-Move', name: '编队机动', defaultParam: { points: [], limited_speed: 20, formation_mode: 0, safe_mode: 0 } },
  { actionType: 'Manual-Task', name: '人工任务', defaultParam: { type: 1 } },
  { actionType: 'Pose-Adjust', name: '姿态调整', defaultParam: { pose: [9000, 0, 0], pose_deviation: [36100, 9100, 9100], limited_speed: 10, safe_mode: 0 } },
];

function inferActionTypeFromId(actionId) {
  if (!actionId) return '';
  const aid = String(actionId).toLowerCase().replace(/_/g, '-');
  const mapping = {
    'auto-move': 'auto-move',
    'follow-move': 'follow-move',
    'silent-guard': 'silent-guard',
    'set-return-point': 'set-return-point',
    'return-to-base': 'return-to-base',
    'formation-move': 'formation-move',
    'manual-task': 'manual-task',
    'pose-adjust': 'pose-adjust',
    'air-recon': 'air-recon',
    'lens-recon': 'lens-recon',
    'search-and-shoot': 'search-and-shoot',
    'recon-strike': 'search-and-shoot',
    '40mm-gun-launch': '40mm-gun-launch',
    'at-missile-launch': 'at-missile-launch',
    'gun-shot': '7.62mm-gun-shot',
    '7.62mm-gun-shot': '7.62mm-gun-shot',
    'rocket-launch': 'rocket-launch',
    'loitering-munition-launch': 'loitering-munition-launch',
    'laser-illumination': 'laser-illumination',
    'sound-expel': 'sound-expel',
    'acoustic-deterrence': 'sound-expel',
    'light-expel': 'light-expel',
    'light-deterrence': 'light-expel',
    'em-recon': 'em-recon',
    'electronic-recon': 'em-recon',
    'em-interference': 'em-interference',
    'electronic-jamming': 'em-interference',
    'payload-silent': 'payload-silent',
  };
  return mapping[aid] || aid;
}

function getActionDisplayName(actionType, actionId = '') {
  if (!actionType) return '';
  const normalized = String(actionType).toLowerCase().replace(/_/g, '-');
  const allTasks = [...chassisTasks, ...Object.values(payloadTaskMap).flat()];
  let found = allTasks.find((t) => String(t.actionType).toLowerCase().replace(/_/g, '-') === normalized);
  if (!found && actionId) {
    const inferred = inferActionTypeFromId(actionId);
    found = allTasks.find((t) => String(t.actionType).toLowerCase().replace(/_/g, '-') === inferred);
  }
  return found?.name || actionType;
}

const payloadTaskMap = {
  'Fire-Support-UGV': [
    { actionType: 'Lens-Recon', name: '光电侦察', defaultParam: { type: 2, mode: 3, time: 120, area: [] } },
    { actionType: 'Search-And-Shoot', name: '侦察打击', defaultParam: { time: 180, area: [] } },
    { actionType: '7.62mm-Gun-Shot', name: '机枪打击', defaultParam: { time: 30, sort: 1, num: 1, points: [] } },
    { actionType: 'Rocket-Launch', name: '火箭弹打击', defaultParam: { type: 1, time: 60, sort: 1, num: 1, points: [] } },
    { actionType: 'Loitering-Munition-Launch', name: '巡飞弹打击', defaultParam: { time: 60, sort: 1, num: 1, points: [] } },
  ],
  'Recon-Strike-UGV': [
    { actionType: 'Lens-Recon', name: '光电侦察', defaultParam: { type: 2, mode: 3, time: 120, area: [] } },
    { actionType: 'Search-And-Shoot', name: '侦察打击', defaultParam: { time: 180, area: [] } },
    { actionType: '40mm-Gun-Launch', name: '40炮打击', defaultParam: { time: 45, sort: 1, num: 1, points: [] } },
    { actionType: 'AT-Missile-Launch', name: '红箭13导弹打击', defaultParam: { time: 60, sort: 1, num: 1, points: [] } },
    { actionType: '7.62mm-Gun-Shot', name: '机枪打击', defaultParam: { time: 30, sort: 1, num: 1, points: [] } },
  ],
  'Patrol-UGV': [
    { actionType: 'Lens-Recon', name: '光电侦察', defaultParam: { type: 2, mode: 3, time: 120, area: [] } },
    { actionType: 'Search-And-Shoot', name: '巡逻车侦察打击', defaultParam: { time: 180, tarty: 6, attr: 1, thr: 80, dam: 1, blk: 2, figt: 2, sug: 3, ammo: 10, strategy: 0, area: [] } },
    { actionType: '7.62mm-Gun-Shot', name: '机枪打击', defaultParam: { time: 30, sort: 1, num: 1, points: [] } },
    { actionType: 'Sound-Expel', name: '强声拒止', defaultParam: { time: 60, tarty: 1, attr: 2, thr: 50, dam: 0, blk: 0, figt: 0, sug: 0, ammo: 0, strategy: 0, area: [] } },
    { actionType: 'Light-Expel', name: '强光拒止', defaultParam: { time: 60, tarty: 1, attr: 2, thr: 50, dam: 0, blk: 0, figt: 0, sug: 0, ammo: 0, strategy: 0, area: [] } },
  ],
  'Electronic-UGV': [
    { actionType: 'EM-Recon', name: '电磁侦察', defaultParam: { mode: 3, time: 300, num: 1, freqtype: 62, frequency: [], area: [] } },
    { actionType: 'EM-Interference', name: '电磁干扰', defaultParam: { mode: 3, time: 300, sort: 1, num: 1, freqtype: 62, frequency: [], area: [], protect: {} } },
    { actionType: 'Payload-Silent', name: '载荷静默', defaultParam: { time: 300 } },
  ],
  'Air-Ground-UAV': [
    { actionType: 'Air-Recon', name: '空中侦察', defaultParam: { type: 2, mode: 1, time: 120, points1: [], points2: [], points3: [] } },
  ],
};

const payloadTasks = computed(() => payloadTaskMap[selectedVehicleType.value] || []);

function selectVehicle(vehicle) {
  selectedVehicle.value = vehicle;
  selectedVehicleType.value = vehicle.type || vehicle.resource_type || '';
  step.value = 'edit';
}

function inferVehicleTypeFromResourceType(rt) {
  const map = {
    'Fire-Support-UGV': 'Fire-Support-UGV',
    'Recon-Strike-UGV': 'Recon-Strike-UGV',
    'Patrol-UGV': 'Patrol-UGV',
    'Electronic-UGV': 'Electronic-UGV',
    'Air-Ground-UAV': 'Air-Ground-UAV',
  };
  return map[rt] || '';
}

function initEditMode() {
  if (!props.editMode || !props.editPlan || !props.editVehicleVid) return;
  const plan = props.editPlan;
  const vid = props.editVehicleVid;

  // 从 plan.teams 找 resource_type
  let resourceType = '';
  for (const team of plan.teams || []) {
    for (const v of team.vehicles || []) {
      if (v.vid === vid) resourceType = v.resource_type || resourceType;
    }
  }
  // 从 vehicle_summary 兜底
  if (!resourceType) {
    const vs = (plan.vehicle_summary || []).find((v) => v.vid === vid);
    resourceType = vs?.resource_type || '';
  }

  selectedVehicleType.value = inferVehicleTypeFromResourceType(props.editVehicleType || resourceType);
  // 无法识别车型时保持为空，底盘类元任务仍可拖拽使用
  selectedVehicle.value = {
    type: selectedVehicleType.value,
    resource_type: selectedVehicleType.value,
    vid,
  };

  // 收集该车辆所有 stages 中的 actions
  const allActions = [];
  for (const stage of plan.stages || []) {
    const ta = stage.team_actions || {};
    let vehicles = [];
    if (Array.isArray(ta)) {
      // 数据服务器标准格式：team_actions = [{ team_id, car_actions: [...] }]
      for (const entry of ta) {
        vehicles.push(...(entry.car_actions || []));
        vehicles.push(...(entry.team_actions || []));
      }
    } else {
      // 旧 mock 格式：team_actions = { [teamId]: [...] }
      vehicles = Object.values(ta).flat();
    }
    for (const v of vehicles) {
      if (v.vid !== vid) continue;
      for (const a of v.actions || []) {
        allActions.push({ ...a, _stage_id: stage.stage_id });
      }
    }
  }
  allActions.sort((a, b) => (a.action_seq || 0) - (b.action_seq || 0));

  // 建立 action_seq -> nodeId 映射，用于生成连线
  const seqToNodeId = {};
  nodes.value = allActions.map((a, idx) => {
    const id = `node_${a.action_id || a.action_seq || idx}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    seqToNodeId[String(a.action_seq)] = id;
    const rawActionType = a.action_type || '';
    const isUnknown = !rawActionType || rawActionType.toLowerCase().includes('unknown');
    const actionType = isUnknown ? inferActionTypeFromId(a.action_id) : rawActionType;
    const displayName = getActionDisplayName(actionType, a.action_id);
    return {
      id,
      actionType,
      name: displayName || a.name || '',
      category: actionType && chassisTasks.some((t) => t.actionType === actionType) ? 'chassis' : 'payload',
      param: JSON.parse(JSON.stringify(a.param || {})),
      // 先给个占位坐标，稍后交给 autoLayout 按依赖图重新排布
      x: PAD_X,
      y: PAD_Y,
    };
  });

  // 根据 dependencies 生成连线
  const depsLines = [];
  allActions.forEach((a) => {
    const toId = seqToNodeId[String(a.action_seq)];
    if (!toId) return;
    for (const dep of a.dependencies || []) {
      const fromId = seqToNodeId[String(dep)];
      if (fromId) depsLines.push({ from: fromId, to: toId });
    }
  });
  lines.value = depsLines;

  step.value = 'edit';
  // 进入编辑视图后，按串/并行关系自动等距排列，避免连线斜穿、错行
  nextTick(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => autoLayout()));
  });
}

const PAD_X = 40;
const PAD_Y = 40;

function onDragStart(event, task, category = 'chassis') {
  event.dataTransfer.setData('application/json', JSON.stringify({ ...task, category }));
  event.dataTransfer.effectAllowed = 'copy';
}

function onDrop(event) {
  event.preventDefault();
  const data = event.dataTransfer.getData('application/json');
  if (!data) return;
  const task = JSON.parse(data);
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left - 60;
  const y = event.clientY - rect.top - 25;
  const node = {
    id: `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    actionType: task.actionType,
    name: task.name,
    category: task.category || 'chassis',
    param: JSON.parse(JSON.stringify(task.defaultParam || {})),
    x: Math.max(10, x),
    y: Math.max(10, y),
  };
  nodes.value.push(node);
  selectedNodeId.value = node.id;
}

function onNodeClick(node) {
  // 正在连线时，点击目标节点主体即可连上（无需精确点到入口小圆点）
  if (drawingLine.value) {
    finishConnect(null, node, 'in');
    return;
  }
  selectedNodeId.value = node.id;
}

function onCanvasClick() {
  // 点击画布空白处：取消当前连线，或清除选中
  if (drawingLine.value) {
    cancelConnect();
    return;
  }
  selectedNodeId.value = null;
}

function removeNode(node) {
  nodes.value = nodes.value.filter((n) => n.id !== node.id);
  lines.value = lines.value.filter((l) => l.from !== node.id && l.to !== node.id);
}

function startDragNode(event, node) {
  if (event.target.classList.contains('asc-node-port') || event.target.classList.contains('asc-node-remove')) return;
  // 连线进行中，不启动拖拽（让 click 去完成连线）
  if (drawingLine.value) return;
  draggingNode.value = node;
  const rect = canvasRef.value.getBoundingClientRect();
  dragOffset.value = { x: event.clientX - rect.left - node.x, y: event.clientY - rect.top - node.y };
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
}

function onDragMove(event) {
  if (!draggingNode.value || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  draggingNode.value.x = Math.max(0, Math.min(rect.width - 140, event.clientX - rect.left - dragOffset.value.x));
  draggingNode.value.y = Math.max(0, Math.min(rect.height - 56, event.clientY - rect.top - dragOffset.value.y));
  updateLines();
}

function onDragEnd() {
  draggingNode.value = null;
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
}

function getPortPosition(node, portType) {
  const el = canvasRef.value;
  if (!el) return { x: 0, y: 0 };
  return {
    x: node.x + (portType === 'out' ? 140 : 0),
    y: node.y + 28,
  };
}

function buildCurvePath(fromPos, toPos) {
  const dx = Math.abs(toPos.x - fromPos.x);
  const offset = Math.max(50, dx * 0.4);
  return `M ${fromPos.x} ${fromPos.y} C ${fromPos.x + offset} ${fromPos.y}, ${toPos.x - offset} ${toPos.y}, ${toPos.x} ${toPos.y}`;
}

function onPortClick(event, node, portType) {
  if (event) event.stopPropagation();
  // 已在连线中：把出口/入口都当作“落点”，连到该节点
  if (drawingLine.value) {
    finishConnect(event, node, 'in');
    return;
  }
  // 未连线：从出口开始一次点击式连线
  if (portType === 'out') startConnect(event, node, 'out');
}

function startConnect(event, node, portType) {
  if (event) event.stopPropagation();
  if (portType !== 'out') return;
  // 如果已经在画线，先取消上一次的
  if (drawingLine.value) cancelConnect();
  drawingLine.value = { from: node.id };
  selectedNodeId.value = node.id;
  const pos = getPortPosition(node, 'out');
  tempLine.value = { path: buildCurvePath(pos, pos) };
  // 松开鼠标也不结束连线；改由移动跟随光标、点击落点结束
  window.addEventListener('mousemove', onDrawingMove);
}

function finishConnect(event, node, portType) {
  if (event) event.stopPropagation();
  if (!drawingLine.value) return;
  // 落点是起点自身则取消
  if (drawingLine.value.from === node.id) {
    cancelConnect();
    return;
  }
  const exists = lines.value.some((l) => l.from === drawingLine.value.from && l.to === node.id);
  if (!exists) {
    lines.value.push({ from: drawingLine.value.from, to: node.id });
    updateLines();
  }
  cancelConnect();
}

function cancelConnect() {
  drawingLine.value = null;
  tempLine.value = null;
  window.removeEventListener('mousemove', onDrawingMove);
}

function onDrawingMove(event) {
  if (!drawingLine.value || !canvasRef.value || !tempLine.value) return;
  const fromNode = nodes.value.find((n) => n.id === drawingLine.value.from);
  if (!fromNode) return;
  const fromPos = getPortPosition(fromNode, 'out');
  const rect = canvasRef.value.getBoundingClientRect();
  const toPos = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  tempLine.value.path = buildCurvePath(fromPos, toPos);
}

function updateLines() {
  lines.value = lines.value.map((line) => {
    const fromNode = nodes.value.find((n) => n.id === line.from);
    const toNode = nodes.value.find((n) => n.id === line.to);
    if (!fromNode || !toNode) return line;
    const fromPos = getPortPosition(fromNode, 'out');
    const toPos = getPortPosition(toNode, 'in');
    return { ...line, path: buildCurvePath(fromPos, toPos) };
  });
}

function removeLine(line) {
  lines.value = lines.value.filter((l) => l !== line);
}

/**
 * 传递性约简：删除冗余的“直连”边
 * 若 from→to 之间已存在经过其它节点的更长路径（长度≥2），
 * 则这条直连边是多余的（视觉上表现为穿过中间的空线），予以删除。
 */
function reduceTransitiveEdges() {
  const ids = nodes.value.map((n) => n.id);
  const idSet = new Set(ids);
  const valid = lines.value.filter((l) => idSet.has(l.from) && idSet.has(l.to) && l.from !== l.to);

  // 去重（同 from/to 只保留一条）
  const seen = new Set();
  const unique = [];
  valid.forEach((l) => {
    const key = `${l.from}->${l.to}`;
    if (!seen.has(key)) { seen.add(key); unique.push(l); }
  });

  const adj = {};
  ids.forEach((id) => { adj[id] = []; });
  unique.forEach((l) => adj[l.from].push(l.to));

  // 排除某条直连边后，from 是否仍能到达 to
  const reachableWithout = (from, to, skip) => {
    const stack = [from];
    const visited = new Set([from]);
    while (stack.length) {
      const cur = stack.pop();
      for (const next of adj[cur]) {
        if (cur === skip.from && next === skip.to) continue; // 跳过被检查的直连边
        if (next === to) return true;
        if (!visited.has(next)) { visited.add(next); stack.push(next); }
      }
    }
    return false;
  };

  const kept = unique.filter((l) => !reachableWithout(l.from, l.to, l));
  const removed = unique.length - kept.length;
  lines.value = kept;
  return removed;
}

/**
 * 自动对齐：按串/并行关系做分层布局
 * - 串行（有连线先后）→ 按最长路径深度分到不同列，水平等距
 * - 并行（同一深度）→ 同列垂直堆叠，等距且整体居中
 */
function autoLayout() {
  if (nodes.value.length === 0) return;

  // 先做传递性约简，去掉穿过中间的冗余直连边
  reduceTransitiveEdges();

  const NODE_W = 140;
  const NODE_H = 56;
  const COL_GAP = 90;   // 列间距（不含节点宽）
  const ROW_GAP = 30;   // 行间距（不含节点高）
  const PAD_X = 40;     // 画布左侧留白
  const COL_STEP = NODE_W + COL_GAP;
  const ROW_STEP = NODE_H + ROW_GAP;

  const ids = nodes.value.map((n) => n.id);
  const idSet = new Set(ids);
  const adj = {};       // from -> [to]
  const inDeg = {};
  ids.forEach((id) => { adj[id] = []; inDeg[id] = 0; });
  lines.value.forEach((l) => {
    if (idSet.has(l.from) && idSet.has(l.to)) {
      adj[l.from].push(l.to);
      inDeg[l.to] = (inDeg[l.to] || 0) + 1;
    }
  });

  // Kahn 拓扑排序 + 最长路径分层（含环保护）
  const depth = {};
  ids.forEach((id) => { depth[id] = 0; });
  const remaining = { ...inDeg };
  const queue = ids.filter((id) => remaining[id] === 0);
  const visited = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    adj[id].forEach((to) => {
      if (depth[to] < depth[id] + 1) depth[to] = depth[id] + 1;
      remaining[to]--;
      if (remaining[to] <= 0) queue.push(to);
    });
  }
  // 环中节点未访问：按已访问前驱推一层，保证有列归属
  ids.forEach((id) => {
    if (!visited.has(id)) {
      const preds = lines.value.filter((l) => l.to === id && idSet.has(l.from));
      depth[id] = preds.reduce((m, l) => Math.max(m, (depth[l.from] || 0) + 1), depth[id]);
    }
  });

  // 按列分组，保留节点原始顺序以稳定排列
  const columns = {};
  ids.forEach((id) => {
    const d = depth[id];
    (columns[d] = columns[d] || []).push(id);
  });
  const colKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);

  // 前驱表：用于把节点对齐到其上游的“重心”高度
  const preds = {};
  ids.forEach((id) => { preds[id] = []; });
  lines.value.forEach((l) => {
    if (idSet.has(l.from) && idSet.has(l.to)) preds[l.to].push(l.from);
  });

  const nodeMap = Object.fromEntries(nodes.value.map((n) => [n.id, n]));
  const yPos = {}; // id -> 顶部 y（临时，未归一化）
  const PAD_Y = 24; // 画布顶部留白

  // 从左到右逐列布局：
  // - 首列（无前驱的根）按原始顺序自上而下堆叠
  // - 其余列：每个节点的目标高度 = 其前驱的平均高度（串行链因此保持同一行），
  //   再自上而下消解重叠，保证同列节点间距不小于 ROW_STEP
  colKeys.forEach((d) => {
    const colNodes = columns[d];
    // 计算每个节点的期望 y（重心）
    const desired = colNodes.map((id, idx) => {
      const ps = preds[id].filter((p) => yPos[p] !== undefined);
      if (ps.length === 0) return { id, want: idx * ROW_STEP, idx };
      const avg = ps.reduce((s, p) => s + yPos[p], 0) / ps.length;
      return { id, want: avg, idx };
    });
    // 按期望高度排序（并列时保持原始顺序），再消解重叠
    desired.sort((a, b) => (a.want - b.want) || (a.idx - b.idx));
    let prevY = -Infinity;
    desired.forEach((item) => {
      let y = item.want;
      if (y < prevY + ROW_STEP) y = prevY + ROW_STEP;
      yPos[item.id] = y;
      prevY = y;
    });
  });

  // 归一化：整张图顶部对齐到 PAD_Y（不再整体居中）
  const minY = Math.min(...ids.map((id) => yPos[id]));
  const shift = PAD_Y - minY;
  colKeys.forEach((d, colIdx) => {
    columns[d].forEach((id) => {
      const node = nodeMap[id];
      node.x = PAD_X + colIdx * COL_STEP;
      node.y = yPos[id] + shift;
    });
  });

  updateLines();
}

function buildActionsForVid(vid, planBase = null) {
  // 按连线拓扑排序：从入度为 0 的节点开始
  const inDegree = {};
  nodes.value.forEach((n) => { inDegree[n.id] = 0; });
  lines.value.forEach((l) => { inDegree[l.to] = (inDegree[l.to] || 0) + 1; });

  const sorted = [];
  const queue = nodes.value.filter((n) => !inDegree[n.id]).map((n) => n.id);
  const adj = {};
  lines.value.forEach((l) => { (adj[l.from] = adj[l.from] || []).push(l.to); });

  const visited = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    sorted.push(id);
    (adj[id] || []).forEach((nextId) => {
      inDegree[nextId]--;
      if (inDegree[nextId] === 0) queue.push(nextId);
    });
  }

  // 如果存在环或孤立节点，按添加顺序补齐
  nodes.value.forEach((n) => {
    if (!visited.has(n.id)) sorted.push(n.id);
  });

  const nodeMap = Object.fromEntries(nodes.value.map((n) => [n.id, n]));
  const idToSeq = Object.fromEntries(sorted.map((id, idx) => [id, idx + 1]));
  const incoming = {};
  lines.value.forEach((l) => {
    incoming[l.to] = incoming[l.to] || [];
    incoming[l.to].push(l.from);
  });

  const basePlanId = planBase?.plan_id || (props.editMode ? props.editPlan?.plan_id : `PLAN_${Date.now()}`);
  const baseStageId = planBase?.stages?.[0]?.stage_id || (props.editMode ? (props.editPlan?.stages?.[0]?.stage_id || `STAGE_${Date.now()}`) : `STAGE_${Date.now()}`);
  const baseTeamId = planBase?.teams?.[0]?.team_id || (props.editMode ? (props.editPlan?.teams?.[0]?.team_id || 'TEAM_NEW') : 'TEAM_NEW');
  const vehicleType = selectedVehicle.value?.resource_type || selectedVehicleType.value || '';

  return sorted.map((id, idx) => {
    const n = nodeMap[id];
    const deps = (incoming[id] || [])
      .filter((fromId) => idToSeq[fromId] !== undefined)
      .map((fromId) => String(idToSeq[fromId]));
    return {
      // 新建时 action_id / resource_id 由数据服务器分配，前端不预置
      name: n.name,
      vid,
      action_seq: idx + 1,
      action_type: n.actionType,
      description: n.name,
      param: normalizeActionParam(n.param, n.actionType, vehicleType),
      dependencies: deps.length ? deps : undefined,
      state: 'SCHEDULED',
      task_type: 'ACTION',
      plan_id: basePlanId,
      stage_id: baseStageId,
      team_id: baseTeamId,
    };
  });
}

function buildPlan() {
  const planId = `PLAN_${Date.now()}`;
  const stageId = `STAGE_${Date.now()}`;
  const teamId = 'TEAM_NEW';
  const vid = selectedVehicle.value?.vid || `equipment:new-${Date.now()}`;
  const actions = buildActionsForVid(vid);

  return {
    resource_id: `plan:${planId}`,
    task_type: 'PLAN',
    plan_id: planId,
    title: '新建行动序列方案',
    description: `由操控席新建，车辆类型：${selectedVehicleName.value}`,
    state: 'DRAFT',
    teams: [
      {
        team_id: teamId,
        name: '新建编组',
        description: '',
        state: 'READY',
        vehicles: [{ vid, resource_type: selectedVehicleType.value }],
      },
    ],
    targets: [],
    stages: [
      {
        stage_id: stageId,
        title: '新建阶段',
        stage_seq: 1,
        team_ids: [teamId],
        target_ids: [],
        state: 'SCHEDULED',
        team_actions: {
          [teamId]: [{ vid, state: 'SCHEDULED', action_type: '', actions }],
        },
      },
    ],
  };
}

function buildAppendedPlan() {
  const plan = JSON.parse(JSON.stringify(props.appendPlan));
  const now = Date.now();
  const vid = selectedVehicle.value?.vid || `equipment:${selectedVehicleType.value.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '')}-${now}`;
  const actions = buildActionsForVid(vid, plan);

  const teamId = plan.teams?.[0]?.team_id || 'TEAM_APPEND';
  const stageId = plan.stages?.[0]?.stage_id || `STAGE_${now}`;

  // 确保 teams 中包含该车辆
  let team = (plan.teams || []).find((t) => t.team_id === teamId);
  if (!team) {
    team = { team_id: teamId, name: '追加编组', description: '', state: 'READY', vehicles: [] };
    plan.teams = plan.teams || [];
    plan.teams.push(team);
  }
  if (!team.vehicles.some((v) => v.vid === vid)) {
    team.vehicles.push({ vid, resource_type: selectedVehicleType.value });
  }

  // 在 stages 中追加该车辆 actions
  let stage = (plan.stages || []).find((s) => s.stage_id === stageId);
  if (!stage) {
    stage = {
      stage_id: stageId,
      title: '追加阶段',
      stage_seq: 1,
      team_ids: [teamId],
      target_ids: [],
      state: 'SCHEDULED',
      team_actions: {},
    };
    plan.stages = plan.stages || [];
    plan.stages.push(stage);
  }
  const ta = stage.team_actions || {};
  if (Array.isArray(ta)) {
    // 数据服务器标准格式：team_actions 为 [{ team_id, car_actions: [...] }]
    const entry = ta.find((e) => e.team_id === teamId);
    if (entry) {
      entry.car_actions = entry.car_actions || [];
      entry.car_actions.push({ vid, state: 'SCHEDULED', action_type: '', actions });
    } else {
      ta.push({ team_id: teamId, car_actions: [{ vid, state: 'SCHEDULED', action_type: '', actions }] });
    }
  } else {
    // 旧 mock 格式：team_actions 为 { [teamId]: [...] }
    ta[teamId] = ta[teamId] || [];
    ta[teamId].push({ vid, state: 'SCHEDULED', action_type: '', actions });
  }
  stage.team_actions = ta;

  // 追加 car_actions
  plan.car_actions = plan.car_actions || [];
  plan.car_actions.push({ vid, state: 'SCHEDULED', action_type: '', actions });

  // 追加 vehicle_summary
  plan.vehicle_summary = plan.vehicle_summary || [];
  plan.vehicle_summary.push({
    vid,
    resource_type: selectedVehicleType.value,
    total_actions: actions.length,
    stages: [{ stage_id: stageId, stage_title: stage.title, actions }],
  });

  plan.updated_at = new Date().toISOString();
  return plan;
}

function buildUpdatedPlan() {
  const plan = JSON.parse(JSON.stringify(props.editPlan));
  const vid = props.editVehicleVid;
  const actions = buildActionsForVid(vid);

  // 更新 stages 中对应车辆的 actions
  for (const stage of plan.stages || []) {
    const ta = stage.team_actions || {};
    if (Array.isArray(ta)) {
      // 数据服务器标准格式：team_actions 为 [{ team_id, car_actions: [...] }]
      for (const entry of ta) {
        const cars = entry.car_actions || [];
        for (const v of cars) {
          if (v.vid === vid) v.actions = actions;
        }
      }
    } else {
      // 旧 mock 格式：team_actions 为 { [teamId]: [...] }
      for (const key of Object.keys(ta)) {
        for (const v of ta[key]) {
          if (v.vid === vid) v.actions = actions;
        }
      }
    }
  }

  // 更新 car_actions（如果存在）
  if (plan.car_actions) {
    for (const ca of plan.car_actions) {
      if (ca.vid === vid) ca.actions = actions;
    }
  }

  // 更新 vehicle_summary
  if (plan.vehicle_summary) {
    for (const vs of plan.vehicle_summary) {
      if (vs.vid === vid) {
        vs.total_actions = actions.length;
        for (const st of vs.stages || []) {
          st.actions = actions;
        }
      }
    }
  }

  plan.updated_at = new Date().toISOString();
  return plan;
}

function onKeydown(e) {
  if (e.key === 'Escape' && drawingLine.value) {
    cancelConnect();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  initFromProps();
});

watch(
  () => [props.editMode, props.editVehicleVid, props.editPlan],
  ([editMode, editVehicleVid, editPlan]) => {
    if (editMode && editPlan && editVehicleVid) {
      initEditMode();
    }
  },
  { immediate: true }
);

function initFromProps() {
  if (props.editMode) {
    initEditMode();
  } else if (props.presetVehicle) {
    // 从某车“新建”进入时，跳过车辆选择，直接进编辑界面
    selectedVehicle.value = props.presetVehicle;
    selectedVehicleType.value = props.presetVehicle.resource_type || props.presetVehicle.type || '';
    step.value = 'edit';
  } else if (props.presetVehicleType) {
    // 兼容旧逻辑：只传入类型时，构造一个简化车辆对象
    selectedVehicle.value = { type: props.presetVehicleType, resource_type: props.presetVehicleType };
    selectedVehicleType.value = props.presetVehicleType;
    step.value = 'edit';
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('mousemove', onDrawingMove);
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
});

const ALLOWED_PATCH_KEYS = new Set([
  'title', 'description', 'state', 'teams', 'targets',
  'stages', 'search_text', 'car_actions', 'vehicle_summary',
]);

function toPatchBody(plan) {
  // 后端 PATCH 只接受白名单字段，过滤掉 runtime_state 等非必要字段，减小 body 体积
  const body = {};
  for (const key of ALLOWED_PATCH_KEYS) {
    if (plan[key] !== undefined) {
      body[key] = plan[key];
    }
  }
  body.updated_at = new Date().toISOString();
  return body;
}

async function savePlan() {
  if (nodes.value.length === 0) {
    alert('请至少添加一个元任务');
    return;
  }

  if (props.editMode && props.editPlan && props.editVehicleVid) {
    // 编辑模式：只更新本地 task_pool，不同步数据服务器
    const updatedPlan = buildUpdatedPlan();
    try {
      const result = await patchOperatorPlan(props.editPlan.plan_id, toPatchBody(updatedPlan));
      if (!result.ok) {
        alert(`保存失败：${result.data?.message || result.error || result.statusText || '未知错误'}`);
        return;
      }
      emit('saved', result.data?.data || updatedPlan);
    } catch (err) {
      alert(`保存失败：${err.message || err}`);
    }
    return;
  }

  if (props.appendMode && props.appendPlan) {
    // 追加模式：把新车辆行动序列追加到已有方案
    const updatedPlan = buildAppendedPlan();
    try {
      const result = await patchOperatorPlan(props.appendPlan.plan_id, toPatchBody(updatedPlan));
      if (!result.ok) {
        alert(`保存失败：${result.data?.message || result.error || result.statusText || '未知错误'}`);
        return;
      }
      emit('saved', result.data?.data || updatedPlan);
    } catch (err) {
      alert(`保存失败：${err.message || err}`);
    }
    return;
  }

  const plan = buildPlan();
  try {
    const result = await createOperatorPlan(plan);
    if (!result.ok) {
      alert(`保存失败：${result.data?.message || result.error || result.statusText || '未知错误'}`);
      return;
    }
    emit('saved', result.data?.data || plan);
  } catch (err) {
    alert(`保存失败：${err.message || err}`);
  }
}
</script>

<style scoped>
.asc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.asc-panel {
  width: 90vw;
  height: 85vh;
  background: linear-gradient(180deg, #0a1c1f, #06141a);
  border: 1px solid rgba(0, 222, 200, 0.28);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.asc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.06), transparent);
  color: #f1feff;
  font-size: 1rem;
  font-weight: 600;
}

.asc-header-actions {
  display: flex;
  gap: 0.5rem;
}

.asc-body.centered {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.asc-title {
  font-size: 1.1rem;
  color: #00dec8;
  margin-bottom: 1.5rem;
}

.asc-vehicle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.asc-vehicle-card {
  width: 150px;
  padding: 1.2rem;
  background: linear-gradient(135deg, rgba(0, 222, 200, 0.08), rgba(0, 222, 200, 0.03));
  border: 2px solid rgba(0, 222, 200, 0.25);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.asc-vehicle-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 222, 200, 0.2), transparent);
  transition: left 0.5s ease;
}

.asc-vehicle-card:hover {
  background: linear-gradient(135deg, rgba(0, 222, 200, 0.18), rgba(0, 222, 200, 0.08));
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 20px rgba(0, 222, 200, 0.3), inset 0 0 20px rgba(0, 222, 200, 0.05);
  transform: translateY(-4px);
}

.asc-vehicle-card:hover::before {
  left: 100%;
}

.asc-vehicle-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 30%, rgba(0, 222, 200, 0.15), rgba(0, 222, 200, 0.02));
  border: 1.5px solid rgba(0, 222, 200, 0.3);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.asc-vehicle-name {
  color: #f1feff;
  font-size: 0.95rem;
}

.asc-vehicle-type {
  color: rgba(226, 246, 248, 0.55);
  font-size: 0.72rem;
  margin-top: 0.25rem;
}

.asc-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.asc-palette {
  width: 264px;
  flex-shrink: 0;
  border-right: 1px solid rgba(0, 222, 200, 0.18);
  padding: 1rem 0.9rem;
  overflow-y: auto;
  background: linear-gradient(180deg, rgba(0, 26, 32, 0.55), rgba(0, 12, 16, 0.35));
}

.asc-palette-title {
  color: #eafffb;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.asc-palette-hint {
  color: rgba(226, 246, 248, 0.45);
  font-size: 0.74rem;
  margin: 0.3rem 0 1rem;
  padding-bottom: 0.7rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.16);
}

.asc-palette-section {
  margin-bottom: 1.3rem;
}

.asc-palette-section-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: rgba(226, 246, 248, 0.8);
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.7rem;
  letter-spacing: 0.3px;
}

.asc-section-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.asc-section-dot.chassis {
  background: #00dec8;
  box-shadow: 0 0 6px rgba(0, 222, 200, 0.7);
}

.asc-section-dot.payload {
  background: #ffb454;
  box-shadow: 0 0 6px rgba(255, 180, 84, 0.7);
}

.asc-section-count {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(226, 246, 248, 0.55);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  min-width: 20px;
  text-align: center;
}

.asc-task-card {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.7rem;
  margin-bottom: 0.5rem;
  background: rgba(0, 222, 200, 0.08);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-left: 3px solid rgba(0, 222, 200, 0.55);
  border-radius: 8px;
  color: #f1feff;
  font-size: 0.86rem;
  cursor: grab;
  user-select: none;
  transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.asc-task-card.payload {
  background: rgba(255, 180, 84, 0.08);
  border-color: rgba(255, 180, 84, 0.22);
  border-left-color: rgba(255, 180, 84, 0.6);
}

.asc-task-card:hover {
  background: rgba(0, 222, 200, 0.16);
  border-color: rgba(0, 222, 200, 0.4);
  transform: translateX(3px);
  box-shadow: -2px 0 10px rgba(0, 222, 200, 0.12);
}

.asc-task-card.payload:hover {
  background: rgba(255, 180, 84, 0.16);
  border-color: rgba(255, 180, 84, 0.45);
  box-shadow: -2px 0 10px rgba(255, 180, 84, 0.12);
}

.asc-task-card:active {
  cursor: grabbing;
}

.asc-task-grip {
  width: 8px;
  height: 14px;
  flex-shrink: 0;
  background-image: radial-gradient(currentColor 1px, transparent 1px);
  background-size: 4px 4px;
  color: rgba(226, 246, 248, 0.35);
  opacity: 0.8;
}

.asc-task-name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asc-canvas {
  flex: 1;
  position: relative;
  background:
    radial-gradient(circle at 1px 1px, rgba(0, 222, 200, 0.08) 1px, transparent 0),
    radial-gradient(120% 120% at 50% 0%, rgba(0, 60, 66, 0.25), transparent 60%);
  background-size: 24px 24px, 100% 100%;
  overflow: hidden;
}

.asc-canvas-empty {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(226, 246, 248, 0.35);
  font-size: 0.95rem;
  text-align: center;
  pointer-events: none;
}

.asc-canvas-empty-icon {
  font-size: 2.4rem;
  color: rgba(0, 222, 200, 0.3);
  margin-bottom: 0.5rem;
}

.asc-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.asc-line {
  fill: none;
  stroke: #16e6cf;
  stroke-width: 2.5;
  stroke-linecap: butt;
  pointer-events: stroke;
  cursor: pointer;
  transition: stroke 0.15s, stroke-width 0.15s;
}

.asc-line.temp {
  stroke: rgba(0, 222, 200, 0.5);
  stroke-width: 2;
  stroke-dasharray: 6 5;
  pointer-events: none;
  animation: asc-dash-flow 0.6s linear infinite;
}

@keyframes asc-dash-flow {
  to { stroke-dashoffset: -11; }
}

.asc-line:hover {
  stroke: #ff7676;
  stroke-width: 3;
  marker-end: url(#as-arrow-hover);
}

.asc-node {
  position: absolute;
  width: 140px;
  background: linear-gradient(180deg, rgba(0, 40, 46, 0.92), rgba(0, 22, 28, 0.92));
  border: 1px solid rgba(0, 222, 200, 0.32);
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.1s;
}

.asc-node::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #00dec8;
  box-shadow: 0 0 8px rgba(0, 222, 200, 0.6);
}

.asc-node.cat-payload {
  border-color: rgba(255, 180, 84, 0.32);
}

.asc-node.cat-payload::before {
  background: #ffb454;
  box-shadow: 0 0 8px rgba(255, 180, 84, 0.6);
}

.asc-node:hover {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
}

.asc-node.cat-payload:hover {
  border-color: rgba(255, 180, 84, 0.55);
}

.asc-node.selected {
  border-color: #00dec8;
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.4), 0 0 16px rgba(0, 222, 200, 0.3);
}

.asc-node.cat-payload.selected {
  border-color: #ffb454;
  box-shadow: 0 0 0 1px rgba(255, 180, 84, 0.4), 0 0 16px rgba(255, 180, 84, 0.3);
}

.asc-node-body {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.asc-node-name {
  color: #f1feff;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asc-node-type {
  color: rgba(226, 246, 248, 0.5);
  font-size: 0.68rem;
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asc-node-port {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: rgba(2, 22, 26, 0.9);
  border: 2px solid rgba(0, 222, 200, 0.85);
  cursor: crosshair;
  flex-shrink: 0;
  transition: all 0.15s;
}

.asc-node.cat-payload .asc-node-port {
  border-color: rgba(255, 180, 84, 0.85);
}

.asc-node-port:hover {
  background: #00dec8;
  box-shadow: 0 0 8px rgba(0, 222, 200, 0.8);
  transform: scale(1.25);
}

.asc-node.cat-payload .asc-node-port:hover {
  background: #ffb454;
  box-shadow: 0 0 8px rgba(255, 180, 84, 0.8);
}

/* 连线进行中：画布提示可落点，所有节点入口高亮呼吸 */
.asc-canvas.is-connecting {
  cursor: crosshair;
}

.asc-canvas.is-connecting .asc-node-port {
  animation: asc-port-pulse 1.1s ease-in-out infinite;
}

.asc-canvas.is-connecting .asc-node {
  cursor: crosshair;
}

@keyframes asc-port-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 222, 200, 0); }
  50% { box-shadow: 0 0 8px 2px rgba(0, 222, 200, 0.55); }
}

.asc-node-remove {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 18px;
  height: 18px;
  line-height: 15px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 80, 80, 0.9);
  color: #fff;
  font-size: 0.78rem;
  cursor: pointer;
  display: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.asc-node-remove:hover {
  background: #ff5050;
}

.asc-node:hover .asc-node-remove {
  display: block;
}

.as-btn {
  background: rgba(0, 222, 200, 0.12);
  border: 1px solid rgba(0, 222, 200, 0.25);
  border-radius: 5px;
  color: #f1feff;
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
  cursor: pointer;
}

.as-btn.primary {
  background: rgba(0, 222, 200, 0.25);
  border-color: rgba(0, 222, 200, 0.45);
}

.as-btn.ghost {
  background: transparent;
  border-color: rgba(0, 222, 200, 0.4);
  color: #9ff5ec;
}

.as-btn.ghost:hover {
  background: rgba(0, 222, 200, 0.14);
  border-color: rgba(0, 222, 200, 0.6);
}

.as-btn.mini {
  padding: 0.25rem 0.6rem;
  font-size: 0.78rem;
}
</style>
