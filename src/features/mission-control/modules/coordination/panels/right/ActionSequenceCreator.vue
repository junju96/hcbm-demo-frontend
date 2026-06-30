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
              :key="v.type"
              class="asc-vehicle-card"
              @click="selectVehicle(v.type)"
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
          <span>新建方案 - {{ selectedVehicleName }}</span>
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
            @drop="onDrop"
            @dragover.prevent
            @click="onCanvasClick"
            @mouseup="onCanvasMouseUp"
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
              <div class="asc-node-port in" title="连接入口" @mouseup.stop="finishConnect($event, node, 'in')" />
              <div class="asc-node-body">
                <div class="asc-node-name">{{ node.name }}</div>
                <div class="asc-node-type">{{ node.actionType }}</div>
              </div>
              <div class="asc-node-port out" title="连接出口" @mousedown.stop="startConnect($event, node, 'out')" />
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
import { ref, computed, nextTick } from 'vue';
import VehicleIcon from './VehicleIcon.vue';
import { createOperatorPlan } from '../../api/coordinationApi.js';

const emit = defineEmits(['close', 'saved']);

const step = ref('select-vehicle');
const selectedVehicleType = ref('');
const canvasRef = ref(null);
const nodes = ref([]);
const lines = ref([]);
const selectedNodeId = ref(null);
const drawingLine = ref(null);
const tempLine = ref(null);
const draggingNode = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

const vehicleOptions = [
  { type: 'Fire-Support-UGV', name: '火力车' },
  { type: 'Recon-Strike-UGV', name: '侦打车' },
  { type: 'Patrol-UGV', name: '巡逻车' },
  { type: 'Electronic-UGV', name: '电磁车' },
  { type: 'Air-Ground-UAV', name: '空地车' },
];

const selectedVehicleName = computed(() => {
  const v = vehicleOptions.find((item) => item.type === selectedVehicleType.value);
  return v ? v.name : selectedVehicleType.value;
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
    { actionType: 'Laser-Illumination', name: '激光照射', defaultParam: { time: 120, act: 1, param1: 0, param2: 0, ene: 80, freq: 1000, meat: 30, delay: 5, max: 10, type: 1, strategy: 0, lon: 116.407, lat: 39.904, alt: 2100 } },
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

function selectVehicle(type) {
  selectedVehicleType.value = type;
  step.value = 'edit';
}

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
  selectedNodeId.value = node.id;
}

function onCanvasClick() {
  selectedNodeId.value = null;
  if (drawingLine.value) {
    drawingLine.value = null;
    tempLine.value = null;
    window.removeEventListener('mousemove', onDrawingMove);
  }
}

function onCanvasMouseUp() {
  if (drawingLine.value) {
    drawingLine.value = null;
    tempLine.value = null;
    window.removeEventListener('mousemove', onDrawingMove);
  }
}

function removeNode(node) {
  nodes.value = nodes.value.filter((n) => n.id !== node.id);
  lines.value = lines.value.filter((l) => l.from !== node.id && l.to !== node.id);
}

function startDragNode(event, node) {
  if (event.target.classList.contains('asc-node-port') || event.target.classList.contains('asc-node-remove')) return;
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

function startConnect(event, node, portType) {
  event.stopPropagation();
  if (portType !== 'out') return;
  // 如果已经在画线，先取消上一次的
  if (drawingLine.value) {
    drawingLine.value = null;
    tempLine.value = null;
    window.removeEventListener('mousemove', onDrawingMove);
  }
  drawingLine.value = { from: node.id };
  const pos = getPortPosition(node, 'out');
  tempLine.value = { path: buildCurvePath(pos, pos) };
  window.addEventListener('mousemove', onDrawingMove);
}

function finishConnect(event, node, portType) {
  event.stopPropagation();
  if (portType !== 'in') return;
  if (!drawingLine.value) return;
  if (drawingLine.value.from === node.id) return;
  const exists = lines.value.some((l) => l.from === drawingLine.value.from && l.to === node.id);
  if (!exists) {
    lines.value.push({ from: drawingLine.value.from, to: node.id });
    updateLines();
  }
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

  // 整体垂直居中：以最高的一列为基准
  const maxRows = Math.max(...colKeys.map((k) => columns[k].length));
  const blockHeight = maxRows * NODE_H + (maxRows - 1) * ROW_GAP;
  const canvasH = canvasRef.value?.clientHeight || 600;
  const baseTop = Math.max(20, (canvasH - blockHeight) / 2);

  const nodeMap = Object.fromEntries(nodes.value.map((n) => [n.id, n]));
  colKeys.forEach((d, colIdx) => {
    const colNodes = columns[d];
    const colH = colNodes.length * NODE_H + (colNodes.length - 1) * ROW_GAP;
    const colTop = baseTop + (blockHeight - colH) / 2; // 每列在整体块内再次居中
    colNodes.forEach((id, rowIdx) => {
      const node = nodeMap[id];
      node.x = PAD_X + colIdx * COL_STEP;
      node.y = colTop + rowIdx * ROW_STEP;
    });
  });

  updateLines();
}

function buildPlan() {
  const planId = `PLAN_${Date.now()}`;
  const stageId = `STAGE_${Date.now()}`;
  const teamId = 'TEAM_NEW';
  const vid = `equipment:new-${Date.now()}`;

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

  const actions = sorted.map((id, idx) => {
    const n = nodeMap[id];
    const deps = (incoming[id] || [])
      .filter((fromId) => idToSeq[fromId] !== undefined)
      .map((fromId) => String(idToSeq[fromId]));
    return {
      resource_id: `action:${n.id}`,
      action_id: n.actionType.toUpperCase().replace(/-/g, '_'),
      name: n.name,
      vid,
      action_seq: idx + 1,
      action_type: n.actionType,
      description: n.name,
      param: n.param,
      dependencies: deps.length ? deps : undefined,
      state: 'SCHEDULED',
      task_type: 'ACTION',
      plan_id: planId,
      stage_id: stageId,
      team_id: teamId,
    };
  });

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

async function savePlan() {
  if (nodes.value.length === 0) {
    alert('请至少添加一个元任务');
    return;
  }
  const plan = buildPlan();
  try {
    const result = await createOperatorPlan(plan);
    if (!result.ok) {
      alert(`保存失败：${result.data?.message || result.statusText || '未知错误'}`);
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
