<template>
  <div class="action-sequence-shell">
    <!-- 顶部栏 -->
    <div class="action-sequence-header">
      <div class="action-sequence-actions">
        <button class="as-btn primary" type="button" @click="onRefresh">
          刷新
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
              <span>状态: <strong>{{ runtimeStateLabel }}</strong></span>
              <span>阶段: {{ (selectedPlan.stages || []).length }}</span>
              <span>编组: {{ (selectedPlan.teams || []).length }}</span>
            </div>
          </div>
          <div class="as-control-bar">
            <button
              v-if="runtimeState === 'SCHEDULED'"
              class="as-btn primary"
              type="button"
              :disabled="controlLoading"
              @click="onStart"
            >
              {{ controlLoading ? '处理中…' : '开始执行' }}
            </button>
            <button
              class="as-btn primary"
              type="button"
              :disabled="controlLoading"
              @click="onDispatch"
            >
              {{ controlLoading ? '处理中…' : '下发' }}
            </button>
            <button
              v-if="runtimeState === 'ACTIVE'"
              class="as-btn warn"
              type="button"
              :disabled="controlLoading"
              @click="onPause"
            >
              {{ controlLoading ? '处理中…' : '暂停' }}
            </button>
            <button
              v-if="runtimeState === 'PAUSED'"
              class="as-btn primary"
              type="button"
              :disabled="controlLoading"
              @click="onResume"
            >
              {{ controlLoading ? '处理中…' : '继续' }}
            </button>
            <button
              v-if="runtimeState !== 'SCHEDULED'"
              class="as-btn danger"
              type="button"
              :disabled="controlLoading"
              @click="onStop"
            >
              {{ controlLoading ? '处理中…' : '停止' }}
            </button>
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
                <span class="as-vehicle-name">{{ vehicle.vid }}</span>
                <span class="as-vehicle-count">{{ vehicle.total_actions }} 个行动</span>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import {
  fetchActionSequencePlans,
  fetchActionSequencePlanDetail,
  startActionSequence,
  pauseActionSequence,
  resumeActionSequence,
  stopActionSequence,
  dispatchActionSequence,
} from '../../api/coordinationApi';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
});

const appendSystemMessage = (text) => {
  props.moduleApi.chat?.appendSystemMessage?.(`[行动序列] ${text}`);
};

/* ---------- 状态 ---------- */
const plans = ref([]);
const selectedPlanId = ref('');
const selectedPlan = ref(null);
const runtimeState = ref('SCHEDULED');
const loadingPlans = ref(false);
const loadingDetail = ref(false);
const controlLoading = ref(false);

/* ---------- 计算属性 ---------- */
const runtimeStateLabel = computed(() => {
  const map = {
    SCHEDULED: '待执行',
    ACTIVE: '执行中',
    PAUSED: '已暂停',
    DONE: '已完成',
    DELETED: '已删除',
  };
  return map[runtimeState.value] || runtimeState.value;
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

const loadPlans = async () => {
  loadingPlans.value = true;
  const result = await fetchActionSequencePlans();
  loadingPlans.value = false;
  if (result.ok) {
    plans.value = result.data.items || [];
    // 默认优先选中有行动序列的方案，否则选第一个
    if (plans.value.length > 0 && !selectedPlanId.value) {
      const withActions = plans.value.find(p => (p.stages_count || 0) > 0);
      selectPlan((withActions || plans.value[0]).plan_id);
    }
  } else {
    appendSystemMessage('获取方案列表失败: ' + (result.error || '未知错误'));
  }
};

const selectPlan = async (planId) => {
  selectedPlanId.value = planId;
  loadingDetail.value = true;
  const result = await fetchActionSequencePlanDetail(planId);
  loadingDetail.value = false;
  if (result.ok) {
    selectedPlan.value = result.data;
    runtimeState.value = result.data.runtime_state?.state || 'SCHEDULED';
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

const onStart = async () => {
  controlLoading.value = true;
  const result = await startActionSequence(selectedPlanId.value);
  controlLoading.value = false;
  if (result.ok) {
    runtimeState.value = 'ACTIVE';
    appendSystemMessage('行动序列已开始执行');
  } else {
    appendSystemMessage('开始失败: ' + (result.data?.message || result.error || '未知错误'));
  }
};

const onPause = async () => {
  controlLoading.value = true;
  const result = await pauseActionSequence(selectedPlanId.value);
  controlLoading.value = false;
  if (result.ok) {
    runtimeState.value = 'PAUSED';
    appendSystemMessage('行动序列已暂停');
  } else {
    appendSystemMessage('暂停失败: ' + (result.data?.message || result.error || '未知错误'));
  }
};

const onResume = async () => {
  controlLoading.value = true;
  const result = await resumeActionSequence(selectedPlanId.value);
  controlLoading.value = false;
  if (result.ok) {
    runtimeState.value = 'ACTIVE';
    appendSystemMessage('行动序列已继续');
  } else {
    appendSystemMessage('继续失败: ' + (result.data?.message || result.error || '未知错误'));
  }
};

const onStop = async () => {
  controlLoading.value = true;
  const result = await stopActionSequence(selectedPlanId.value);
  controlLoading.value = false;
  if (result.ok) {
    runtimeState.value = 'SCHEDULED';
    appendSystemMessage('行动序列已停止并重置');
  } else {
    appendSystemMessage('停止失败: ' + (result.data?.message || result.error || '未知错误'));
  }
};

const onDispatch = async () => {
  controlLoading.value = true;
  const result = await dispatchActionSequence(selectedPlanId.value, {
    // 可在此扩展 vehicle_vmfs / vehicle_ips / tid / vehicle_topic
    vehicle_topic: 'ZD04',
  });
  controlLoading.value = false;
  if (result.ok) {
    const data = result.data?.data || {};
    appendSystemMessage(`行动序列已下发 | topic=${data.topic || ''} | tid=${data.mission_tid || ''}`);
  } else {
    appendSystemMessage('下发失败: ' + (result.data?.message || result.error || '未知错误'));
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

/* ---------- 生命周期 ---------- */
onMounted(() => {
  loadPlans();
  updateMarqueeStates();
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

.as-btn.danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.35), rgba(120, 20, 20, 0.9));
}

.as-btn.danger:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.5), rgba(140, 30, 30, 1));
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
  padding: 0.4rem 0.2rem;
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

.as-action-card.state-active {
  border-color: rgba(59, 130, 246, 0.45);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.03));
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.15);
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
