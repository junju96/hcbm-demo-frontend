<template>
  <div class="plan-design-shell">
    <!-- 子选项卡导航 -->
    <div class="plan-design-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="plan-design-tab"
        :class="{ active: activeTab === tab.id }"
        type="button"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 子面板内容 -->
    <div class="plan-design-content">
      <TaskPlanningPanel
        v-if="activeTab === 'task-planning'"
        :module-api="moduleApi"
        @switch-tab="activeTab = $event"
      />
      <div v-else-if="activeTab === 'ad-hoc-planning'" class="plan-design-placeholder">
        <div class="coord-pane-title">临机规划</div>
        <div class="coord-pane-subtitle">当前子面板暂未接入详细界面。</div>
      </div>
      <div v-else-if="activeTab === 'plan-library'" class="plan-design-placeholder">
        <div class="coord-pane-title">预案库</div>
        <div class="coord-pane-subtitle">当前子面板暂未接入详细界面。</div>
      </div>
      <div v-else-if="activeTab === 'knowledge-base'" class="plan-design-placeholder">
        <div class="coord-pane-title">知识库</div>
        <div class="coord-pane-subtitle">当前子面板暂未接入详细界面。</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import TaskPlanningPanel from './planning/TaskPlanningPanel.vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
});

const tabs = [
  { id: 'task-planning', label: '任务规划' },
  { id: 'ad-hoc-planning', label: '临机规划' },
  { id: 'plan-library', label: '预案库' },
  { id: 'knowledge-base', label: '知识库' },
];

const activeTab = ref('task-planning');
const moduleApi = props.moduleApi;
</script>

<style scoped>
.plan-design-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.plan-design-tabs {
  display: flex;
  gap: 0.3rem;
  padding: 0.5rem 0.6rem 0;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  flex-shrink: 0;
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.04), rgba(0, 49, 72, 0.01)),
    rgba(1, 16, 22, 0.6);
}

.plan-design-tab {
  position: relative;
  padding: 0.5rem 0.9rem;
  border: none;
  background: transparent;
  color: rgba(226, 246, 248, 0.7);
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 160ms ease;
  border-radius: 8px 8px 0 0;
}

.plan-design-tab:hover {
  color: rgba(226, 246, 248, 0.95);
  background: rgba(0, 222, 200, 0.06);
}

.plan-design-tab.active {
  color: #00dec8;
  background: rgba(0, 222, 200, 0.1);
}

.plan-design-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 10%;
  width: 80%;
  height: 2px;
  background: #00dec8;
  border-radius: 2px 2px 0 0;
}

.plan-design-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.6rem;
}

.plan-design-placeholder {
  border-radius: 16px;
  border: 1px solid rgba(0, 208, 188, 0.4);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    rgba(1, 16, 22, 0.84);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05);
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  padding: 1rem;
}

.coord-pane-title {
  color: #f1feff;
  font-size: 1.24rem;
  font-weight: 800;
}

.coord-pane-subtitle {
  margin-top: 0.38rem;
  color: rgba(226, 246, 248, 0.86);
  font-size: 0.98rem;
  line-height: 1.7;
}
</style>
