<template>
  <MissionRightPanelShell class="coord-right-shell">
    <!-- 子视图标题栏（仅方案规划显示子选项卡，不重复显示标题） -->
    <div v-if="activeSubviewId === 'plan-design'" class="coord-subview-header">
      <div class="plan-design-tabs">
        <button
          v-for="tab in planDesignTabs"
          :key="tab.id"
          class="plan-design-tab"
          :class="{ active: planDesignActiveTab === tab.id }"
          type="button"
          @click="planDesignActiveTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <Transition name="coord-subview-switch" mode="out-in">
      <TaskUnderstandingPanel
        v-if="activeSubviewId === 'task-understanding'"
        key="task-understanding"
        :module-api="moduleApi"
        :module-manifest="moduleManifest"
        :panel-definition="panelDefinition"
      />

      <PlanDesignPanel
        v-else-if="activeSubviewId === 'plan-design'"
        key="plan-design"
        :module-api="moduleApi"
        :module-manifest="moduleManifest"
        :panel-definition="panelDefinition"
        :active-tab="planDesignActiveTab"
        @update:active-tab="planDesignActiveTab = $event"
      />

      <ResourceCatalogPanel
        v-else-if="activeSubviewId === 'resource-list'"
        key="resource-list"
        :module-api="moduleApi"
        :module-manifest="moduleManifest"
        :panel-definition="panelDefinition"
      />

      <ActionSequencePanel
        v-else-if="activeSubviewId === 'action-sequence'"
        key="action-sequence"
        :module-api="moduleApi"
        :module-manifest="moduleManifest"
        :panel-definition="panelDefinition"
      />

      <div v-else key="placeholder" class="coord-placeholder">
        <div class="coord-pane-title">{{ activeSubviewTitle }}</div>
        <div class="coord-pane-subtitle">当前子面板暂未接入详细界面。</div>
      </div>
    </Transition>
  </MissionRightPanelShell>
</template>

<script setup>
import { computed, ref } from 'vue';
import MissionRightPanelShell from '../../../shared/layout/MissionRightPanelShell.vue';
import TaskUnderstandingPanel from './right/TaskUnderstandingPanel.vue';
import PlanDesignPanel from './right/PlanDesignPanel.vue';
import ResourceCatalogPanel from './right/ResourceCatalogPanel.vue';
import ActionSequencePanel from './right/ActionSequencePanel.vue';

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

const planDesignTabs = [
  { id: 'task-planning', label: '任务规划' },
  { id: 'ad-hoc-planning', label: '方案规划' },
  { id: 'plan-library', label: '预案库' },
  { id: 'knowledge-base', label: '知识库' },
];
const planDesignActiveTab = ref('task-planning');

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

/* ===== 子视图标题栏 ===== */
.coord-subview-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  padding: 0.5rem 0.9rem 0;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  flex-shrink: 0;
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.04), rgba(0, 49, 72, 0.01)),
    rgba(1, 16, 22, 0.6);
}

/* ===== 方案规划子选项卡（已提升到标题栏） ===== */
.plan-design-tabs {
  display: flex;
  gap: 0.3rem;
}

.plan-design-tab {
  position: relative;
  padding: 0.4rem 0.85rem;
  border: none;
  background: transparent;
  color: rgba(226, 246, 248, 0.7);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
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

/* ===== 子视图切换动画 ===== */
.coord-subview-switch-enter-active,
.coord-subview-switch-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}
.coord-subview-switch-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.coord-subview-switch-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
