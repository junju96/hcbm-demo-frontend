<template>
  <div class="action-sequence-shell">
    <!-- 顶部栏 -->
    <div class="action-sequence-header">
      <h2 class="action-sequence-title">行动序列</h2>
      <div class="action-sequence-actions">
        <button class="as-btn primary" type="button" @click="onGenerateSequence">
          生成序列
        </button>
        <button class="as-btn" type="button" @click="onEditSequence">
          编辑
        </button>
        <button class="as-btn" type="button" @click="onExportSequence">
          导出
        </button>
      </div>
    </div>

    <!-- 序列概览卡片 -->
    <div class="action-sequence-overview">
      <div class="as-info-card">
        <div class="as-info-label">当前方案</div>
        <div class="as-info-value">进攻战斗命令-行动方案</div>
        <div class="as-info-sub">阶段 4 / 编组 2</div>
      </div>
      <div class="as-info-card">
        <div class="as-info-label">行动总数</div>
        <div class="as-info-value count">{{ sequenceItems.length }}</div>
        <div class="as-info-sub">已就绪 {{ readyCount }} / 执行中 {{ activeCount }}</div>
      </div>
      <div class="as-info-card">
        <div class="as-info-label">预计时长</div>
        <div class="as-info-value">45 分钟</div>
        <div class="as-info-sub">基于各阶段动作估算</div>
      </div>
    </div>

    <!-- 阶段时间轴 -->
    <div class="action-sequence-timeline">
      <div class="as-timeline-title">阶段时间轴</div>
      <div class="as-timeline-list">
        <div
          v-for="(stage, index) in stages"
          :key="stage.id"
          class="as-timeline-item"
          :class="{ active: activeStageId === stage.id, expanded: stage.expanded }"
          @click="toggleStage(stage.id)"
        >
          <div class="as-timeline-marker" :class="`stage-tone-${index % 4}`">
            <span class="as-timeline-num">{{ index + 1 }}</span>
          </div>
          <div class="as-timeline-content">
            <div class="as-timeline-header">
              <span class="as-timeline-stage-name">{{ stage.name }}</span>
              <span class="as-timeline-duration">{{ stage.duration }}</span>
              <span class="as-timeline-status" :class="`status-${stage.status}`">{{ statusLabel(stage.status) }}</span>
            </div>
            <div v-if="stage.expanded" class="as-timeline-body">
              <div class="as-timeline-desc">{{ stage.description }}</div>
              <div class="as-action-list">
                <div
                  v-for="action in stage.actions"
                  :key="action.id"
                  class="as-action-item"
                  :class="`action-tone-${action.status}`"
                >
                  <span class="as-action-seq">{{ action.seq }}</span>
                  <span class="as-action-name">{{ action.name }}</span>
                  <span class="as-action-executor">{{ action.executor }}</span>
                  <span class="as-action-state" :class="`state-${action.status}`">{{ statusLabel(action.status) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="action-sequence-footer">
      <span class="as-footer-hint">点击阶段可展开/收起，查看该阶段下的具体行动。</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
});

const appendSystemMessage = (text) => {
  props.moduleApi.chat?.appendSystemMessage?.(`[行动序列] ${text}`);
};

const stages = ref([
  {
    id: 'stage-1',
    name: '集结阶段',
    duration: '10 min',
    status: 'ready',
    description: '侦察组与通信组机动到集结区域1，完成战前准备。',
    expanded: true,
    actions: [
      { id: 'a-101', seq: 1, name: '机动到集结区域1', executor: '无人车A', status: 'ready' },
      { id: 'a-102', seq: 2, name: '机动到集结区域1', executor: '无人车B', status: 'ready' },
      { id: 'a-103', seq: 3, name: '通信保障启动', executor: '通信无人车', status: 'ready' },
    ],
  },
  {
    id: 'stage-2',
    name: '机动阶段',
    duration: '15 min',
    status: 'ready',
    description: '侦察组隐蔽机动到区域B；通信组协同机动到区域2，提供中继保障。',
    expanded: false,
    actions: [
      { id: 'a-201', seq: 1, name: '隐蔽机动到区域B', executor: '无人车A', status: 'ready' },
      { id: 'a-202', seq: 2, name: '自主机动到区域2', executor: '无人车B', status: 'ready' },
      { id: 'a-203', seq: 3, name: '地面通信中继', executor: '通信无人车', status: 'ready' },
    ],
  },
  {
    id: 'stage-3',
    name: '侦查阶段',
    duration: '12 min',
    status: 'pending',
    description: '侦察组对区域A进行侦察；通信组继续提供中继保障。',
    expanded: false,
    actions: [
      { id: 'a-301', seq: 1, name: '白光侦察与放飞无人机', executor: '无人车A', status: 'pending' },
      { id: 'a-302', seq: 2, name: '空中热像侦察', executor: '巡逻无人机', status: 'pending' },
      { id: 'a-303', seq: 3, name: '收回无人机', executor: '巡逻无人机', status: 'pending' },
    ],
  },
  {
    id: 'stage-4',
    name: '返回阶段',
    duration: '8 min',
    status: 'pending',
    description: '侦察组机动到区域2再返回基地；通信组接应后共同返回。',
    expanded: false,
    actions: [
      { id: 'a-401', seq: 1, name: '机动到区域2', executor: '无人车A', status: 'pending' },
      { id: 'a-402', seq: 2, name: '返回基地', executor: '无人车A', status: 'pending' },
      { id: 'a-403', seq: 3, name: '静默值守并接应', executor: '无人车B', status: 'pending' },
      { id: 'a-404', seq: 4, name: '返回基地', executor: '无人车B', status: 'pending' },
    ],
  },
]);

const activeStageId = ref('stage-1');

const toggleStage = (stageId) => {
  const stage = stages.value.find((s) => s.id === stageId);
  if (stage) {
    stage.expanded = !stage.expanded;
    activeStageId.value = stageId;
  }
};

const sequenceItems = computed(() => stages.value.flatMap((s) => s.actions));
const readyCount = computed(() => sequenceItems.value.filter((a) => a.status === 'ready').length);
const activeCount = computed(() => sequenceItems.value.filter((a) => a.status === 'active').length);

const statusLabel = (status) => {
  const map = { ready: '就绪', active: '执行中', pending: '待执行', done: '已完成' };
  return map[status] || status;
};

const onGenerateSequence = () => {
  appendSystemMessage('正在生成行动序列…');
  setTimeout(() => {
    appendSystemMessage('行动序列生成完成');
  }, 600);
};

const onEditSequence = () => {
  appendSystemMessage('进入行动序列编辑模式');
};

const onExportSequence = () => {
  appendSystemMessage('行动序列已导出');
};
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
  overflow-y: auto;
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

.as-btn:hover {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 222, 200, 0.12), 0 4px 14px rgba(0, 222, 200, 0.08);
  transform: translateY(-1px);
}

.as-btn.primary {
  border-color: rgba(0, 208, 188, 0.4);
  background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96));
}

.as-btn.primary:hover {
  background: linear-gradient(180deg, rgba(0, 130, 136, 0.54), rgba(0, 66, 68, 1));
}

/* 概览卡片 */
.action-sequence-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.7rem;
  flex-shrink: 0;
}

.as-info-card {
  border-radius: 12px;
  border: 1px solid var(--as-border-soft);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68);
  padding: 0.75rem 0.85rem;
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 6px 14px rgba(0, 0, 0, 0.16);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
}

.as-info-card:hover {
  border-color: rgba(0, 222, 200, 0.5);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.07), rgba(0, 222, 200, 0.025)), rgba(0, 18, 24, 0.75);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.08), 0 8px 22px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
}

.as-info-label {
  color: rgba(226, 246, 248, 0.65);
  font-size: 0.82rem;
  font-weight: 700;
}

.as-info-value {
  margin-top: 0.3rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #f7fdff;
}

.as-info-value.count {
  color: var(--as-accent);
  font-size: 1.35rem;
}

.as-info-sub {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.65);
}

/* 时间轴 */
.action-sequence-timeline {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.as-timeline-title {
  font-size: 1.02rem;
  font-weight: 800;
  color: #eefcff;
  letter-spacing: 0.01em;
  padding: 0.1rem 0.1rem 0.3rem;
}

.as-timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.as-timeline-item {
  display: flex;
  gap: 0.7rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.65rem 0.8rem;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;
}

.as-timeline-item:hover {
  border-color: rgba(0, 222, 200, 0.35);
}

.as-timeline-item.active {
  border-color: rgba(0, 222, 200, 0.45);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.06), rgba(0, 49, 72, 0.03)), rgba(6, 20, 26, 0.8);
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.1);
}

.as-timeline-marker {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.stage-tone-0 { background: rgba(0, 222, 200, 0.18); color: #b4fff8; box-shadow: 0 0 8px rgba(0, 222, 200, 0.25); }
.stage-tone-1 { background: rgba(59, 130, 246, 0.18); color: #93c5fd; box-shadow: 0 0 8px rgba(59, 130, 246, 0.25); }
.stage-tone-2 { background: rgba(34, 197, 94, 0.18); color: #86efac; box-shadow: 0 0 8px rgba(34, 197, 94, 0.25); }
.stage-tone-3 { background: rgba(229, 168, 11, 0.18); color: #ffe28c; box-shadow: 0 0 8px rgba(229, 168, 11, 0.25); }

.as-timeline-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.as-timeline-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.as-timeline-stage-name {
  font-weight: 800;
  font-size: 0.98rem;
  color: #f7fdff;
}

.as-timeline-duration {
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.7);
  background: rgba(0, 222, 200, 0.1);
  border-radius: 6px;
  padding: 0.12rem 0.4rem;
}

.as-timeline-status {
  font-size: 0.76rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  margin-left: auto;
}

.status-ready { background: rgba(0, 222, 200, 0.18); color: #b4fff8; }
.status-active { background: rgba(59, 130, 246, 0.18); color: #93c5fd; }
.status-pending { background: rgba(148, 163, 184, 0.18); color: #cbd5e1; }
.status-done { background: rgba(34, 197, 94, 0.18); color: #86efac; }

.as-timeline-desc {
  font-size: 0.9rem;
  color: rgba(236, 252, 255, 0.92);
  line-height: 1.55;
}

/* 行动列表 */
.as-action-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.3rem;
}

.as-action-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 222, 200, 0.03);
  padding: 0.45rem 0.6rem;
  transition: background 160ms ease;
}

.as-action-item:hover {
  background: rgba(0, 222, 200, 0.06);
}

.as-action-seq {
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 222, 200, 0.15);
  color: var(--as-accent);
  font-weight: 700;
  font-size: 0.72rem;
  flex-shrink: 0;
}

.as-action-name {
  flex: 1;
  font-weight: 700;
  font-size: 0.9rem;
  color: #f1feff;
}

.as-action-executor {
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.75);
  background: rgba(0, 222, 200, 0.08);
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
}

.as-action-state {
  font-size: 0.74rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
  flex-shrink: 0;
}

/* 底部 */
.action-sequence-footer {
  flex-shrink: 0;
  padding: 0.3rem 0.1rem 0.1rem;
}

.as-footer-hint {
  font-size: 0.85rem;
  color: rgba(226, 246, 248, 0.55);
}

@media (max-width: 900px) {
  .action-sequence-overview {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .action-sequence-overview {
    grid-template-columns: 1fr;
  }
  .action-sequence-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
