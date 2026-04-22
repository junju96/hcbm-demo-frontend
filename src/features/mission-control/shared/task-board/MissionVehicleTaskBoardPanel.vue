<template>
  <div ref="boardRoot" class="task-board-shell" :class="displayMode">
    <div class="task-board-grid" :class="{ 'task-board-grid--focus': showFocusedLayout }">
      <article
        v-for="card in orderedCards"
        :key="card.taskKey"
        v-bind="buildCardTargetAttrs(card)"
        class="task-card"
        :class="{
          alert: card.alert,
          focused: isFocusedCard(card),
          'side-card': showFocusedLayout && !isFocusedCard(card),
          'focus-capable': canFocusVehicle,
          compact: resolveCardDensity(card) !== 'full',
          minimal: resolveCardDensity(card) === 'minimal',
        }"
        :role="canFocusVehicle ? 'button' : undefined"
        :tabindex="canFocusVehicle ? 0 : -1"
        @click="handleCardSelect(card.vehicleId)"
        @keydown.enter.prevent="handleCardSelect(card.vehicleId)"
      >
        <div class="task-card-header">
          <div class="task-card-head-copy">
            <div class="task-card-title">
              <span class="vehicle-id">{{ card.vehicleName }}</span>
              <span class="divider">|</span>
              <span class="mission-title">{{ card.missionTitle }}</span>
            </div>
            <div class="task-card-meta">
              <span class="task-card-meta-label">时间戳</span>
              <span class="task-card-meta-value">{{ formatMissionTime(card.missionLastUpdateTime) }}</span>
            </div>
          </div>
          <div class="task-card-status" :class="statusToneClass(card)">{{ card.executionStatus }}</div>
        </div>

        <div class="task-progress-row">
          <div class="task-progress-track">
            <div
              class="task-progress-value"
              :class="progressToneClass(card)"
              :style="{ width: `${card.progress}%` }"
            ></div>
          </div>
          <div class="task-progress-text">
            {{ card.taskReceived ? `当前节点：${card.currentNode}（${card.progress}%）` : '当前节点：等待任务接入' }}
          </div>
        </div>

        <div class="task-chain-panel" :class="`tone-${card.progressTone}`">
          <div class="task-chain-title">任务链流程</div>
          <div v-if="card.taskChain.length" class="task-chain-flow" :class="`density-${resolveCardDensity(card)}`">
            <template v-for="(node, index) in card.taskChain" :key="`${card.vehicleId}-${node.id}`">
              <div class="task-chain-node" :class="node.status">
                <span class="task-chain-node-label">{{ node.label }}</span>
                <span v-if="resolveCardDensity(card) === 'full'" class="task-chain-node-state">
                  {{ node.statusLabel }}
                </span>
                <span
                  v-if="resolveCardDensity(card) === 'full' && node.updateTime"
                  class="task-chain-node-time"
                >
                  {{ formatNodeTime(node.updateTime) }}
                </span>
              </div>
              <div
                v-if="index < card.taskChain.length - 1"
                class="task-chain-connector"
                :class="connectorToneClass(card.taskChain[index + 1]?.status)"
              ></div>
            </template>
          </div>
          <div v-else class="task-chain-empty">等待任务链接入。</div>
        </div>

        <div v-if="resolveCardDensity(card) === 'full' && card.taskReceived" class="task-action-row">
          <button
            v-bind="buildActionAttrs('task-board:view-details', '查看详情', card)"
            class="task-action-btn"
            type="button"
            @click.stop="viewDetails(card.taskKey)"
          >
            查看详情
          </button>
          <button
            v-bind="buildActionAttrs(resolveLifecycleActionId(card), resolveLifecycleAction(card).label, card)"
            class="task-action-btn"
            type="button"
            :disabled="resolveLifecycleAction(card).disabled"
            @click.stop="handleLifecycleAction(card)"
          >
            {{ resolveLifecycleAction(card).label }}
          </button>
          <button
            v-bind="buildActionAttrs('task-board:apply-adjustment', '调整方案', card)"
            class="task-action-btn"
            type="button"
            @click.stop="applyAdjustment(card.taskKey)"
          >
            调整方案
          </button>
          <button
            v-bind="buildActionAttrs('task-board:request-support', '申请保障', card)"
            class="task-action-btn"
            type="button"
            @click.stop="requestSupport(card.taskKey)"
          >
            申请保障
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  createInteractionActionAttrs,
  createInteractionTargetAttrs,
} from '../interaction/createInteractionTarget';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
});

const boardRoot = ref(null);
const boardHeight = ref(0);
const focusedVehicleId = ref('');

const cards = computed(() => props.moduleApi?.taskBoard?.cards || []);
const detailPanelVisible = computed(() => Boolean(props.moduleApi?.taskBoard?.detailPanelVisible?.value ?? props.moduleApi?.taskBoard?.detailPanelVisible));

const displayMode = computed(() => {
  if (boardHeight.value <= 210) {
    return 'minimal';
  }
  if (boardHeight.value <= 320) {
    return 'compact';
  }
  return 'full';
});

const canFocusVehicle = computed(() => detailPanelVisible.value && cards.value.length > 1);
const showFocusedLayout = computed(
  () => canFocusVehicle.value && cards.value.some((item) => item.vehicleId === focusedVehicleId.value)
);
const orderedCards = computed(() => {
  if (!showFocusedLayout.value) {
    return cards.value;
  }

  const focusedCard = cards.value.find((item) => item.vehicleId === focusedVehicleId.value);
  if (!focusedCard) {
    return cards.value;
  }

  return [focusedCard, ...cards.value.filter((item) => item.vehicleId !== focusedVehicleId.value)];
});
const focusedDensity = computed(() => (boardHeight.value <= 260 ? 'compact' : 'full'));

const isFocusedCard = (card) => showFocusedLayout.value && card.vehicleId === focusedVehicleId.value;
const resolveCardDensity = (card) => {
  if (showFocusedLayout.value) {
    return isFocusedCard(card) ? focusedDensity.value : 'compact';
  }
  return displayMode.value;
};

const buildTaskTargetId = (card) =>
  `task-board:${String(card?.taskKey || card?.vehicleId || '').trim()}`;

const progressToneClass = (card) => `is-${card.progressTone || 'normal'}`;
const statusToneClass = (card) => `is-${card.progressTone || 'normal'}`;
const connectorToneClass = (status) => {
  if (['error', 'blocked', 'pending_confirm'].includes(status)) {
    return 'is-danger';
  }
  if (status === 'paused') {
    return 'is-warning';
  }
  if (status === 'completed') {
    return 'is-completed';
  }
  return 'is-pending';
};

const handleCardSelect = (vehicleId) => {
  if (!canFocusVehicle.value) {
    return;
  }
  focusedVehicleId.value = vehicleId;
  props.moduleApi?.taskBoard?.requestDetailLayoutBalance?.();
};

const viewDetails = (taskKey) => {
  props.moduleApi?.taskBoard?.viewDetails?.(taskKey);
};

const pauseTask = (taskKey) => {
  props.moduleApi?.taskBoard?.pauseTask?.(taskKey);
};

const startTask = (taskKey) => {
  props.moduleApi?.taskBoard?.startTask?.(taskKey);
};

const releaseTask = (taskKey) => {
  props.moduleApi?.taskBoard?.releaseTask?.(taskKey);
};

const retryTask = (taskKey) => {
  props.moduleApi?.taskBoard?.retryTask?.(taskKey);
};

const applyAdjustment = (taskKey) => {
  props.moduleApi?.taskBoard?.applyAdjustment?.(taskKey, {
    objective: '保持当前演示任务',
    priority: '优先',
    cadence: '加快',
  });
};

const resolveLifecycleAction = (card) => {
  const statusCode = String(card?.executionStatusCode || '').trim();
  if (statusCode === 'completed') {
    return { label: '任务完成', handler: null, disabled: true };
  }
  if (statusCode === 'paused') {
    return { label: '解除暂停', handler: releaseTask, disabled: false };
  }
  if (['error', 'failed'].includes(statusCode)) {
    return { label: '重试任务', handler: retryTask, disabled: false };
  }
  if (['pending', 'pending_receive'].includes(statusCode)) {
    return { label: '开始任务', handler: startTask, disabled: false };
  }
  return { label: '暂停任务', handler: pauseTask, disabled: false };
};

const resolveLifecycleActionId = (card) => {
  const statusCode = String(card?.executionStatusCode || '').trim();
  if (statusCode === 'paused') {
    return 'task-board:release-task';
  }
  if (['error', 'failed'].includes(statusCode)) {
    return 'task-board:retry-task';
  }
  if (['pending', 'pending_receive'].includes(statusCode)) {
    return 'task-board:start-task';
  }
  return 'task-board:pause-task';
};

const buildCardTargetAttrs = (card) => createInteractionTargetAttrs({
  targetId: buildTaskTargetId(card),
  targetType: 'task_card',
  label: `${card?.vehicleName || card?.vehicleId || '未知车辆'} / ${card?.missionTitle || '未命名任务'}`,
  moduleId: props.moduleApi?.navigation?.activeModuleId,
  panelId: 'task-board',
  sourceComponent: 'MissionVehicleTaskBoardPanel',
  textPreview: `当前节点：${card?.currentNode || '待接入'}，状态：${card?.executionStatus || '待接收'}`,
  actions: [
    'task-board:view-details',
    resolveLifecycleActionId(card),
    'task-board:apply-adjustment',
    'task-board:request-support',
  ],
  meta: {
    taskKey: card?.taskKey || '',
    vehicleId: card?.vehicleId || '',
    vehicleName: card?.vehicleName || '',
    missionTitle: card?.missionTitle || '',
    executionStatusCode: card?.executionStatusCode || '',
    currentNode: card?.currentNode || '',
  },
});

const buildActionAttrs = (actionId, label, card) => createInteractionActionAttrs({
  actionId,
  label,
  targetId: buildTaskTargetId(card),
});

const handleLifecycleAction = (card) => {
  const action = resolveLifecycleAction(card);
  if (!action?.handler || action.disabled) {
    return;
  }
  action.handler(card.taskKey);
};

const requestSupport = (taskKey) => {
  props.moduleApi?.taskBoard?.requestSupport?.(taskKey);
};

const missionTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const nodeTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const formatTimestamp = (value, formatter) => {
  const text = String(value || '').trim();
  if (!text) {
    return '待接收';
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return text;
  }

  return formatter.format(parsed).replace(/\//g, '-');
};

const formatMissionTime = (value) => formatTimestamp(value, missionTimeFormatter);
const formatNodeTime = (value) => formatTimestamp(value, nodeTimeFormatter);

watch(
  cards,
  (nextCards) => {
    if (!nextCards.some((item) => item.vehicleId === focusedVehicleId.value)) {
      focusedVehicleId.value = '';
    }
  },
  { immediate: true }
);

watch(detailPanelVisible, (visible) => {
  if (!visible) {
    focusedVehicleId.value = '';
  }
});

let resizeObserver = null;

const syncBoardHeight = () => {
  boardHeight.value = boardRoot.value?.clientHeight || 0;
};

onMounted(() => {
  syncBoardHeight();
  if (typeof ResizeObserver !== 'undefined' && boardRoot.value) {
    resizeObserver = new ResizeObserver(() => {
      syncBoardHeight();
    });
    resizeObserver.observe(boardRoot.value);
  } else if (typeof window !== 'undefined') {
    window.addEventListener('resize', syncBoardHeight);
  }
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  } else if (typeof window !== 'undefined') {
    window.removeEventListener('resize', syncBoardHeight);
  }
});
</script>

<style scoped>
.task-board-shell {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
}

.task-board-grid {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  overflow: auto;
  overscroll-behavior: contain;
  padding-right: 0.15rem;
}

.task-board-grid--focus {
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.92fr);
  grid-template-rows: repeat(3, minmax(0, 1fr));
}

.task-board-shell.compact .task-board-grid,
.task-board-shell.minimal .task-board-grid {
  gap: 0.5rem;
}

.task-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.72rem;
  border-radius: 16px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background:
    linear-gradient(180deg, rgba(0, 86, 91, 0.08) 0%, rgba(7, 19, 25, 0.92) 18%),
    rgba(7, 19, 25, 0.92);
  padding: 0.9rem 1rem;
  overflow: auto;
}

.task-card.focus-capable {
  cursor: pointer;
}

.task-card.focused {
  grid-column: 1;
  grid-row: 1 / span 3;
  border-color: rgba(0, 222, 200, 0.34);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.12);
}

.task-card.side-card {
  grid-column: 2;
}

.task-card.compact {
  gap: 0.5rem;
  padding: 0.72rem 0.88rem;
  overflow: hidden;
}

.task-card.minimal {
  gap: 0.36rem;
  padding: 0.62rem 0.76rem;
  overflow: hidden;
}

.task-card.alert {
  border-color: rgba(248, 113, 113, 0.9);
  animation: task-card-alert 1.1s ease-in-out infinite;
}

.task-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.8rem;
}

.task-card-head-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.task-card-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #f8fafc;
  font-weight: 700;
  flex-wrap: wrap;
}

.vehicle-id {
  color: var(--theme-highlight);
  font-size: 1rem;
}

.divider {
  color: rgba(226, 232, 240, 0.38);
}

.mission-title {
  font-size: 0.96rem;
}

.task-card-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: rgba(226, 232, 240, 0.7);
  font-size: 0.72rem;
}

.task-card-meta-label {
  color: rgba(148, 163, 184, 0.82);
}

.task-card-meta-value {
  color: rgba(226, 232, 240, 0.82);
}

.task-card-status {
  flex: 0 0 auto;
  min-height: 28px;
  padding: 0 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 86, 91, 0.22);
  color: #f8fafc;
  display: inline-flex;
  align-items: center;
  font-size: 0.76rem;
  font-weight: 700;
}

.task-card-status.is-warning {
  border-color: rgba(245, 205, 85, 0.42);
  background: rgba(245, 205, 85, 0.18);
  color: #fff1b0;
}

.task-card-status.is-success {
  border-color: rgba(74, 222, 128, 0.42);
  background: rgba(34, 197, 94, 0.18);
  color: #dcfce7;
}

.task-card-status.is-danger {
  border-color: rgba(248, 113, 113, 0.42);
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
}

.task-progress-row {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
}

.task-progress-track {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.task-progress-value {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #00dec8 0%, #00aeb4 100%);
}

.task-progress-value.is-warning {
  background: linear-gradient(90deg, #f5cd55 0%, #f59e0b 100%);
}

.task-progress-value.is-success {
  background: linear-gradient(90deg, #4ade80 0%, #16a34a 100%);
}

.task-progress-value.is-danger {
  background: linear-gradient(90deg, #f87171 0%, #dc2626 100%);
}

.task-progress-text {
  color: rgba(226, 232, 240, 0.8);
  font-size: 0.8rem;
}

.task-card.minimal .task-progress-track {
  height: 10px;
}

.task-card.minimal .task-progress-text {
  font-size: 0.76rem;
}

.task-chain-panel {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-height: 0;
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.14);
  background: rgba(4, 18, 23, 0.82);
  padding: 0.78rem 0.82rem;
}

.task-chain-panel.tone-warning {
  border-color: rgba(245, 205, 85, 0.28);
}

.task-chain-panel.tone-success {
  border-color: rgba(74, 222, 128, 0.28);
}

.task-chain-panel.tone-danger {
  border-color: rgba(248, 113, 113, 0.28);
}

.task-chain-title {
  color: #f8fafc;
  font-size: 0.82rem;
  font-weight: 700;
}

.task-chain-flow {
  display: flex;
  align-items: stretch;
  gap: 0.42rem;
  min-height: 0;
  overflow: auto hidden;
  padding-bottom: 0.15rem;
}

.task-chain-flow.density-compact,
.task-chain-flow.density-minimal {
  gap: 0.34rem;
}

.task-chain-node {
  flex: 0 0 122px;
  min-height: 62px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 31, 0.92);
  padding: 0.48rem 0.56rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.24rem;
}

.task-chain-flow.density-compact .task-chain-node,
.task-chain-flow.density-minimal .task-chain-node {
  flex-basis: 96px;
  min-height: 46px;
  padding: 0.38rem 0.44rem;
}

.task-chain-node.completed {
  border-color: rgba(0, 222, 200, 0.32);
  background: rgba(0, 86, 91, 0.3);
}

.task-chain-node.current {
  border-color: rgba(0, 222, 200, 0.52);
  background: rgba(0, 86, 91, 0.4);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.14);
}

.task-chain-node.paused {
  border-color: rgba(245, 205, 85, 0.4);
  background: rgba(245, 205, 85, 0.16);
}

.task-chain-node.pending_confirm,
.task-chain-node.error,
.task-chain-node.blocked {
  border-color: rgba(248, 113, 113, 0.52);
  background: rgba(248, 113, 113, 0.16);
}

.task-chain-node-label {
  color: #f8fafc;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.3;
}

.task-chain-node-state {
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.7rem;
}

.task-chain-node-time {
  color: rgba(148, 163, 184, 0.72);
  font-size: 0.66rem;
}

.task-chain-connector {
  flex: 0 0 16px;
  align-self: center;
  height: 2px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.32);
  position: relative;
}

.task-chain-connector::after {
  content: '';
  position: absolute;
  right: -1px;
  top: -3px;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid currentColor;
  color: inherit;
}

.task-chain-connector.is-completed {
  background: rgba(0, 222, 200, 0.54);
  color: rgba(0, 222, 200, 0.8);
}

.task-chain-connector.is-warning {
  background: rgba(245, 205, 85, 0.58);
  color: rgba(245, 205, 85, 0.82);
}

.task-chain-connector.is-danger {
  background: rgba(248, 113, 113, 0.58);
  color: rgba(248, 113, 113, 0.82);
}

.task-chain-connector.is-pending {
  background: rgba(148, 163, 184, 0.32);
  color: rgba(148, 163, 184, 0.54);
}

.task-chain-empty {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px dashed rgba(148, 163, 184, 0.24);
  color: rgba(226, 232, 240, 0.62);
  font-size: 0.76rem;
  line-height: 1.6;
  text-align: center;
  padding: 0.85rem 0.7rem;
}

.task-action-row {
  margin-top: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.task-action-btn {
  min-height: 34px;
  padding: 0.38rem 0.55rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
  box-shadow: var(--theme-control-shadow);
  font-size: 0.76rem;
  font-weight: 700;
}

.task-action-btn:disabled {
  cursor: default;
  opacity: 0.65;
}

@keyframes task-card-alert {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.05);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(248, 113, 113, 0.18);
  }
}

@media (max-width: 1400px) {
  .task-board-grid,
  .task-board-grid--focus {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .task-card.focused,
  .task-card.side-card {
    grid-column: auto;
    grid-row: auto;
  }
}

@media (max-width: 1320px) {
  .task-board-grid--focus {
    grid-template-columns: minmax(0, 1.25fr) minmax(220px, 0.95fr);
  }

  .task-action-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
