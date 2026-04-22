<template>
  <MissionRightPanelShell class="coord-right-shell">
    <div class="coord-panel">
      <div class="coord-title">{{ moduleManifest.rightPanel?.title || '协同右侧插件' }}</div>
      <div class="coord-grid">
        <div class="coord-metric">
          <span>当前模块</span>
          <strong>{{ moduleManifest.label }}</strong>
        </div>
        <div class="coord-metric">
          <span>当前左栏</span>
          <strong>{{ moduleApi.layout.activePanelId || '-' }}</strong>
        </div>
      </div>
    </div>

    <div class="coord-panel">
      <div class="coord-title">动作</div>
      <div class="coord-actions">
        <button class="coord-btn" type="button" @click="moduleApi.navigation.openModule('example')">
          切回示例模块
        </button>
        <button class="coord-btn" type="button" @click="moduleApi.workspace.bump()">
          刷新工作区
        </button>
      </div>
    </div>
  </MissionRightPanelShell>
</template>

<script setup>
import MissionRightPanelShell from '../../../shared/layout/MissionRightPanelShell.vue';

defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<style scoped>
.coord-right-shell {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.coord-panel {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(7, 19, 25, 0.88);
  padding: 1rem;
}

.coord-panel:last-child {
  flex: 1 1 auto;
  min-height: 0;
}

.coord-title {
  color: #f8fafc;
  font-weight: 700;
}

.coord-grid {
  margin-top: 0.75rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.coord-metric {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(10, 18, 22, 0.72);
  padding: 0.8rem;
  color: rgba(226, 232, 240, 0.78);
}

.coord-metric strong {
  display: block;
  margin-top: 0.4rem;
  color: #00dec8;
  font-size: 1.05rem;
}

.coord-actions {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.coord-btn {
  min-height: 38px;
  padding: 0 0.95rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
}
</style>
