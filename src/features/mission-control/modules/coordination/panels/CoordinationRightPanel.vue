<template>
  <MissionRightPanelShell class="coord-right-shell">
    <TaskUnderstandingPanel
      v-if="activeSubviewId === 'task-understanding'"
      :module-api="moduleApi"
      :module-manifest="moduleManifest"
      :panel-definition="panelDefinition"
    />

    <PlanDesignPanel
      v-else-if="activeSubviewId === 'plan-design'"
      :module-api="moduleApi"
      :module-manifest="moduleManifest"
      :panel-definition="panelDefinition"
    />

    <ResourceCatalogPanel
      v-else-if="activeSubviewId === 'resource-list'"
      :module-api="moduleApi"
      :module-manifest="moduleManifest"
      :panel-definition="panelDefinition"
    />

    <div v-else class="coord-placeholder">
      <div class="coord-pane-title">{{ activeSubviewTitle }}</div>
      <div class="coord-pane-subtitle">当前子面板暂未接入详细界面。</div>
    </div>
  </MissionRightPanelShell>
</template>

<script setup>
import { computed } from 'vue';
import MissionRightPanelShell from '../../../shared/layout/MissionRightPanelShell.vue';
import TaskUnderstandingPanel from './right/TaskUnderstandingPanel.vue';
import PlanDesignPanel from './right/PlanDesignPanel.vue';
import ResourceCatalogPanel from './right/ResourceCatalogPanel.vue';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
  panelDefinition: {
    type: Object,
    default: () => ({}),
  },
});

const activeSubviewId = computed(() => props.moduleApi.coordination?.activeSubviewId || 'task-understanding');
const activeSubviewTitle = computed(() => props.moduleApi.coordination?.activeSubviewTitle || '任务理解');

const moduleApi = props.moduleApi;
const moduleManifest = props.moduleManifest;
const panelDefinition = props.panelDefinition;
</script>

<style scoped>
.coord-right-shell {
  display: flex;
  width: 100%;
  min-height: 100%;
}

.coord-placeholder {
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
