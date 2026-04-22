<template>
  <div class="aux-dock-shell">
    <div class="aux-dock-rail">
      <div class="aux-dock-rail-actions">
        <button
          v-for="panel in panels"
          :key="`${activeModuleId}-${panel.id}`"
          class="aux-rail-btn"
          :class="{ active: resolvedActivePanelId === panel.id, 'aux-rail-text-btn': panel.iconType !== 'image' }"
          type="button"
          :title="panel.label"
          @click="onSelectPanel(panel.id)"
        >
          <img v-if="panel.iconType === 'image'" :src="panel.icon" :alt="panel.label" class="aux-rail-icon" />
          <span v-else>{{ panel.shortLabel || panel.label }}</span>
        </button>
      </div>

      <div v-if="showInsightToggle" class="aux-dock-rail-footer">
        <button
          class="aux-rail-btn aux-rail-text-btn"
          :class="{ active: insightVisible }"
          type="button"
          :title="insightButtonLabel"
          @click="onToggleInsight"
        >
          <span>{{ insightButtonLabel }}</span>
        </button>
      </div>
    </div>

    <div class="aux-dock-panel">
      <div class="aux-dock-head">
        <div class="aux-dock-title">{{ activePanelTitle }}</div>
        <div v-if="activePanelHint" class="aux-dock-hint">{{ activePanelHint }}</div>
      </div>

      <div class="aux-dock-body">
        <div class="aux-dock-content">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  panels: {
    type: Array,
    default: () => [],
  },
  activeModuleId: {
    type: String,
    default: '',
  },
  resolvedActivePanelId: {
    type: String,
    default: '',
  },
  activePanelTitle: {
    type: String,
    default: '',
  },
  activePanelHint: {
    type: String,
    default: '',
  },
  showInsightToggle: {
    type: Boolean,
    default: false,
  },
  insightVisible: {
    type: Boolean,
    default: false,
  },
  insightButtonLabel: {
    type: String,
    default: '洞察',
  },
  onToggleInsight: {
    type: Function,
    default: null,
  },
  onSelectPanel: {
    type: Function,
    required: true,
  },
});
</script>

<style scoped>
.aux-dock-shell {
  min-height: 0;
  height: 100%;
  width: 100%;
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 0.85rem;
}

.aux-dock-rail {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.35rem 0.3rem;
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: linear-gradient(180deg, rgba(0, 86, 91, 0.34) 0%, rgba(4, 18, 23, 0.98) 100%);
}

.aux-dock-rail-actions,
.aux-dock-rail-footer {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.aux-rail-btn {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}

.aux-rail-btn.active {
  border-color: rgba(0, 222, 200, 0.5);
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.34) 0%, rgba(4, 34, 39, 0.96) 100%);
}

.aux-rail-text-btn {
  font-size: 0.72rem;
}

.aux-rail-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(92%) sepia(64%) saturate(403%) hue-rotate(96deg) brightness(103%) contrast(102%);
}

.aux-dock-panel {
  min-height: 0;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.16);
  background: rgba(4, 18, 23, 0.92);
  overflow: hidden;
}

.aux-dock-head {
  padding: 0.85rem 0.95rem 0.7rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.aux-dock-title {
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 700;
}

.aux-dock-hint {
  margin-top: 0.3rem;
  color: rgba(226, 232, 240, 0.66);
  font-size: 0.76rem;
  line-height: 1.5;
}

.aux-dock-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  overflow: hidden;
  padding: 0.9rem 0.95rem 0.95rem;
}

.aux-dock-content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
}

.aux-dock-content > :deep(*) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
}
</style>
