<template>
  <div class="plan-design-shell">
    <!-- 子面板内容（tabs 已提升到父组件 CoordinationRightPanel） -->
    <div class="plan-design-content">
      <TaskPlanningPanel
        v-if="activeTab === 'task-planning'"
        :module-api="moduleApi"
        @switch-tab="emit('update:activeTab', $event)"
      />
      <TaskPlanningPanel
        v-else-if="activeTab === 'ad-hoc-planning'"
        :module-api="moduleApi"
        mode="plan"
        @switch-tab="emit('update:activeTab', $event)"
      />
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
import TaskPlanningPanel from './planning/TaskPlanningPanel.vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
  activeTab: { type: String, default: 'task-planning' },
});

const emit = defineEmits(['update:activeTab']);
const moduleApi = props.moduleApi;
</script>

<style scoped>
.plan-design-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
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
