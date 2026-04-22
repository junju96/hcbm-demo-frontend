<template>
  <MissionControlDemoAuxLayout
    v-if="screenMode === 'aux'"
    :active-module-label="activeModuleManifest?.label || activeModuleId"
    :active-module-summary="''"
    :active-module-title="resolvedAuxModuleTitle"
    :show-task-board="showAuxTaskBoard"
    :detail-panel-visible="taskBoardDetailPanelVisible"
    :detail-panel-balance-key="taskBoardDetailPanelBalanceKey"
    :on-expand-detail-panel="openTaskBoardDetailPanel"
    :on-collapse-detail-panel="closeTaskBoardDetailPanel"
    :weather-text="weatherText"
    :current-time="currentTime"
    :server-status-text="serverStatusText"
    :current-user="currentUser"
    :show-ai-dock="showAuxAiDock"
    :ai-dock-collapsed="chatDockCollapsed"
    :ai-dock-width="aiDockWidth"
    :ai-dock-collapsed-width="56"
    :ai-dock-resizing="aiDockResizing"
    :on-start-ai-dock-resize="startAiDockResize"
  >
    <template #toolbar>
      <MissionControlDemoLayout
        :modules="modules"
        :active-module-id="activeModuleId"
        :module-button-active-id="coordinationCommandActive ? '' : activeModuleId"
        :left-panels="[]"
        :left-panel-visible="false"
        :left-panel-resizing="false"
        :left-dock-style="{}"
        :left-panel-title="''"
        :left-panel-hint="''"
        :weather-text="weatherText"
        :current-time="currentTime"
        :server-status-text="serverStatusText"
        :current-user="currentUser"
        :notification-center-visible="false"
        :is-left-panel-active="() => false"
        :on-select-module="handleAuxSelectModule"
        :on-open-left-panel="() => {}"
        :on-close-left-panel="() => {}"
        :on-toggle-notification-center="() => {}"
        :on-start-left-panel-resize="() => {}"
        :on-open-system-settings="handleSystemSettings"
        :on-open-vehicle-catalog="handleVehicleCatalog"
        :on-open-vehicle-control="handleEmergency"
        :on-open-coordination-command="handleOpenCoordinationCommand"
        :coordination-command-active="coordinationCommandActive"
        :on-mode-switch="handleSwitchScreenMode"
        :mode-switch-label="modeSwitchLabel"
        :on-screen-switch="handleSwitchScreen"
        :screen-switch-label="screenSwitchLabel"
        :on-exit="handleExit"
        :show-right-panel="false"
        :show-top-bar-mode-switch="false"
        :show-top-bar-screen-switch="false"
        class="aux-toolbar-proxy"
      />
    </template>

    <template #sidebar>
      <MissionControlDemoAuxSidebarDock
        :panels="auxSidebarPanels"
        :active-module-id="activeModuleId"
        :resolved-active-panel-id="auxSidebarResolvedPanel?.id || ''"
        :active-panel-title="auxSidebarResolvedPanel?.title || '工作区'"
        :active-panel-hint="''"
        :on-select-panel="handleAuxSidebarSelect"
      >
        <div v-if="auxSidebarResolvedPanelComponent" class="aux-slot-fill">
          <component
            :is="auxSidebarResolvedPanelComponent"
            class="aux-fill-panel"
            :key="`aux-sidebar-${activeModuleId}-${auxSidebarResolvedPanel?.id || 'empty'}`"
            :module-api="moduleApi"
            :panel-definition="auxSidebarResolvedPanel"
            :module-manifest="activeModuleManifest"
          />
        </div>
        <div v-else class="aux-summary-fallback">
          <div class="aux-summary-text">当前模块没有额外左侧内容，保留任务对话和右侧工作区。</div>
        </div>
      </MissionControlDemoAuxSidebarDock>
    </template>

    <template v-if="showAuxAiDock" #ai-dock>
      <section class="mission-ai-dock" :class="{ collapsed: chatDockCollapsed }">
        <button
          v-if="chatDockCollapsed"
          class="mission-ai-dock-peek"
          type="button"
          @click="openChatPanel"
        >
          <span class="mission-ai-dock-peek-copy">
            <span class="mission-ai-dock-peek-title">AI</span>
            <span class="mission-ai-dock-peek-subtitle">任务对话</span>
          </span>
        </button>

        <div v-else class="mission-ai-dock-shell">
          <button class="mission-ai-dock-toggle" type="button" @click="closeChatPanel">
            收起
          </button>
          <MissionChatSidebarPanel class="mission-ai-dock-panel" :module-api="moduleApi" />
        </div>
      </section>
    </template>

    <template #progress-board>
      <MissionVehicleTaskBoardPanel :module-api="moduleApi" />
    </template>

    <template #insight>
      <div v-if="activeRightPanelComponent" class="aux-insight-fill">
        <component
          :is="activeRightPanelComponent"
          class="aux-insight-panel"
          :key="`aux-right-${activeModuleId}-${coordinationRefreshToken}`"
          :module-api="moduleApi"
          :panel-definition="rightPanelDefinition"
          :module-manifest="activeModuleManifest"
        />
      </div>
      <div v-else class="aux-summary-fallback">
        <div class="aux-summary-text">当前模块没有右工作区内容。</div>
      </div>
    </template>
  </MissionControlDemoAuxLayout>

  <MissionControlDemoLayout
    v-else
    :class="{ 'mission-main-mode': screenMode === 'main' }"
    :modules="modules"
    :active-module-id="activeModuleId"
    :module-button-active-id="coordinationCommandActive ? '' : activeModuleId"
    :left-panels="visibleLeftPanels"
    :left-panel-visible="leftPanelVisible"
    :left-panel-resizing="leftPanelResizing"
    :left-dock-style="leftDockStyle"
    :left-panel-title="visibleLeftPanelTitle"
    :left-panel-hint="visibleLeftPanelHint"
    :weather-text="weatherText"
    :current-time="currentTime"
    :server-status-text="serverStatusText"
    :current-user="currentUser"
    :notification-center-visible="notificationCenterVisible"
    :is-left-panel-active="visibleIsLeftPanelActive"
    :on-select-module="openModuleById"
    :on-open-left-panel="openLeftPanel"
    :on-close-left-panel="closeLeftPanel"
    :on-toggle-notification-center="toggleNotificationCenter"
    :on-start-left-panel-resize="startLeftPanelResize"
    :on-open-system-settings="handleSystemSettings"
    :on-open-vehicle-catalog="handleVehicleCatalog"
    :on-open-vehicle-control="handleEmergency"
    :on-open-coordination-command="handleOpenCoordinationCommand"
    :coordination-command-active="coordinationCommandActive"
    :on-mode-switch="handleSwitchScreenMode"
    :mode-switch-label="modeSwitchLabel"
    :on-screen-switch="handleSwitchScreen"
    :screen-switch-label="screenSwitchLabel"
    :on-exit="handleExit"
    :show-right-panel="showMainRightPanel || showMainVideoDock"
    :right-panel-collapsed="showMainVideoDock ? !mainVideoDockOpen : false"
    :right-panel-width="showMainVideoDock ? 360 : 340"
    :right-panel-collapsed-width="44"
    :right-panel-flush="showMainVideoDock"
    :show-far-right-dock="showMainAiDock"
    :far-right-dock-collapsed="chatDockCollapsed"
    :far-right-dock-width="aiDockWidth"
    :far-right-dock-collapsed-width="56"
    :far-right-dock-resizing="aiDockResizing"
    :far-right-dock-flush="true"
    :on-start-far-right-dock-resize="startAiDockResize"
    :show-tab-row="screenMode !== 'main'"
    :show-top-bar-mode-switch="screenMode === 'main'"
    :show-top-bar-screen-switch="screenMode === 'main'"
  >
    <template #left-panel>
      <component
        :is="visibleLeftPanelComponent"
        class="main-fill-panel"
        v-if="visibleLeftPanelComponent"
        :key="`${activeModuleId}-${visibleLeftPanel?.id || 'empty'}`"
        :module-api="moduleApi"
        :panel-definition="visibleLeftPanel"
        :module-manifest="activeModuleManifest"
      />
    </template>

    <template #workspace>
      <DemoWorkspace :module-api="moduleApi" :module-manifest="activeModuleManifest" />
    </template>

    <template v-if="showMainRightPanel || showMainVideoDock" #right-panel>
      <MissionVideoDock
        v-if="showMainVideoDock"
        :open="mainVideoDockOpen"
        :on-open="openMainVideoDock"
        :on-close="closeMainVideoDock"
      />
      <component
        :is="activeRightPanelComponent"
        v-else-if="activeRightPanelComponent"
        :key="`${screenMode}-${activeModuleId}-${coordinationRefreshToken}`"
        :module-api="moduleApi"
        :panel-definition="rightPanelDefinition"
        :module-manifest="activeModuleManifest"
      />
    </template>

    <template v-if="showMainAiDock" #far-right-dock>
      <section class="mission-ai-dock" :class="{ collapsed: chatDockCollapsed }">
        <button
          v-if="chatDockCollapsed"
          class="mission-ai-dock-peek"
          type="button"
          @click="openChatPanel"
        >
          <span class="mission-ai-dock-peek-copy">
            <span class="mission-ai-dock-peek-title">AI</span>
            <span class="mission-ai-dock-peek-subtitle">任务对话</span>
          </span>
        </button>

        <div v-else class="mission-ai-dock-shell">
          <button class="mission-ai-dock-toggle" type="button" @click="closeChatPanel">
            收起
          </button>
          <MissionChatSidebarPanel class="mission-ai-dock-panel" :module-api="moduleApi" />
        </div>
      </section>
    </template>
  </MissionControlDemoLayout>
</template>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import DemoWorkspace from '../workspace/DemoWorkspace.vue';
import MissionChatSidebarPanel from '../shared/apps/MissionChatSidebarPanel.vue';
import MissionVehicleTaskBoardPanel from '../shared/task-board/MissionVehicleTaskBoardPanel.vue';
import MissionVideoDock from '../shared/video/MissionVideoDock.vue';
import MissionControlDemoAuxSidebarDock from './MissionControlDemoAuxSidebarDock.vue';
import MissionControlDemoAuxLayout from './MissionControlDemoAuxLayout.vue';
import MissionControlDemoLayout from './MissionControlDemoLayout.vue';
import { useMissionControlDemoShell } from '../shell/useMissionControlDemoShell';

const SHARED_MAP_PANEL_ID = 'shared-map-ops';

const props = defineProps({
  screenMode: {
    type: String,
    default: 'single',
  },
  routeRole: {
    type: String,
    default: '',
  },
});

const {
  modules,
  activeModuleId,
  activeModuleManifest,
  activeLeftPanels,
  activeLeftPanel,
  activeRightPanelComponent,
  chatDockCollapsed,
  leftPanelTitle,
  leftPanelHint,
  leftPanelVisible,
  leftPanelResizing,
  leftDockStyle,
  weatherText,
  currentTime,
  currentUser,
  serverStatusText,
  notificationCenterVisible,
  openModuleById,
  openLeftPanel,
  closeLeftPanel,
  openChatPanel,
  closeChatPanel,
  toggleNotificationCenter,
  startLeftPanelResize,
  handleSystemSettings,
  handleVehicleCatalog,
  handleEmergency,
  handleSwitchScreenMode,
  handleSwitchScreen,
  handleExit,
  openCoordinationCommand,
  coordinationCommandActive,
  coordinationRefreshToken,
  modeSwitchLabel,
  screenSwitchLabel,
  taskBoardDetailPanelVisible,
  taskBoardDetailPanelBalanceKey,
  openTaskBoardDetailPanel,
  closeTaskBoardDetailPanel,
  moduleApi,
} = useMissionControlDemoShell({
  screenMode: computed(() => props.screenMode),
  routeRole: computed(() => props.routeRole || props.screenMode),
});

const showMainRightPanel = computed(() => props.screenMode === 'single');
const showMainVideoDock = computed(() => props.screenMode === 'main');
const showAuxTaskBoard = computed(() => props.screenMode === 'aux');
const showMainAiDock = computed(() => false);
const showAuxAiDock = computed(() => props.screenMode === 'aux');
const rightPanelDefinition = computed(() => activeModuleManifest.value?.rightPanel || null);
const resolvedAuxModuleTitle = computed(() => {
  if (coordinationCommandActive.value) {
    return moduleApi.coordination?.activeSubviewTitle || '任务理解';
  }
  return activeModuleManifest.value?.rightPanel?.title || activeModuleManifest.value?.label || activeModuleId.value;
});
const mainVideoDockOpen = ref(false);
const aiDockWidth = ref(340);
const aiDockResizing = ref(false);

let aiDockResizeStartX = 0;
let aiDockResizeStartWidth = 340;

const openMainVideoDock = () => {
  if (props.screenMode === 'main') {
    mainVideoDockOpen.value = true;
  }
};

const closeMainVideoDock = () => {
  mainVideoDockOpen.value = false;
};

const clampAiDockWidth = (value) => Math.min(480, Math.max(280, Number(value) || 340));

const handleAiDockResize = (event) => {
  if (!aiDockResizing.value) {
    return;
  }

  const nextWidth = clampAiDockWidth(
    aiDockResizeStartWidth - (event.clientX - aiDockResizeStartX)
  );
  aiDockWidth.value = nextWidth;
};

const stopAiDockResize = () => {
  if (!aiDockResizing.value) {
    window.removeEventListener('mousemove', handleAiDockResize);
    window.removeEventListener('mouseup', stopAiDockResize);
    return;
  }

  aiDockResizing.value = false;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  window.removeEventListener('mousemove', handleAiDockResize);
  window.removeEventListener('mouseup', stopAiDockResize);
};

const startAiDockResize = (event) => {
  if (chatDockCollapsed.value) {
    return;
  }

  aiDockResizing.value = true;
  aiDockResizeStartX = event.clientX;
  aiDockResizeStartWidth = aiDockWidth.value;
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
  window.addEventListener('mousemove', handleAiDockResize);
  window.addEventListener('mouseup', stopAiDockResize);
};

const resolvePreferredPanel = (panels, preferredPanelId) => {
  if (!panels.length) {
    return null;
  }

  return (
    panels.find((panel) => panel.id === preferredPanelId)
    || panels.find((panel) => panel.id === SHARED_MAP_PANEL_ID)
    || panels[0]
  );
};

const visibleLeftPanels = computed(() => {
  if (props.screenMode === 'main') {
    return activeLeftPanels.value.filter((panel) => panel.id !== 'chat');
  }
  return activeLeftPanels.value;
});

const visibleLeftPanel = computed(() => {
  const panels = visibleLeftPanels.value;
  return resolvePreferredPanel(panels, activeLeftPanel.value?.id);
});

const visibleLeftPanelComponent = computed(() => visibleLeftPanel.value?.component || null);
const visibleLeftPanelTitle = computed(
  () => visibleLeftPanel.value?.title || leftPanelTitle.value || '工作区'
);
const visibleLeftPanelHint = computed(() => '');

const visibleIsLeftPanelActive = (panelId) => {
  if (!visibleLeftPanels.value.some((panel) => panel.id === panelId)) {
    return false;
  }
  return leftPanelVisible.value && visibleLeftPanel.value?.id === panelId;
};

const auxSidebarPanels = computed(() => activeLeftPanels.value.filter((panel) => panel.id !== 'chat'));
const auxSidebarResolvedPanel = computed(() => {
  const panels = auxSidebarPanels.value;
  return resolvePreferredPanel(panels, activeLeftPanel.value?.id || SHARED_MAP_PANEL_ID);
});
const auxSidebarResolvedPanelComponent = computed(() => auxSidebarResolvedPanel.value?.component || null);

watch(
  () => ({
    screenMode: props.screenMode,
    activePanelId: activeLeftPanel.value?.id || '',
    visiblePanelIds: visibleLeftPanels.value.map((panel) => panel.id).join('|'),
  }),
  ({ screenMode, activePanelId }) => {
    if (screenMode !== 'main') {
      return;
    }

    const fallbackPanel = visibleLeftPanels.value[0];
    if (!fallbackPanel) {
      return;
    }

    if (activePanelId === 'chat' || !visibleLeftPanels.value.some((panel) => panel.id === activePanelId)) {
      openLeftPanel(resolvePreferredPanel(visibleLeftPanels.value, SHARED_MAP_PANEL_ID)?.id || fallbackPanel.id);
    }
  },
  { immediate: true }
);

watch(
  () => ({
    screenMode: props.screenMode,
    activePanelId: activeLeftPanel.value?.id || '',
    panelIds: auxSidebarPanels.value.map((panel) => panel.id).join('|'),
  }),
  ({ screenMode, activePanelId }) => {
    if (screenMode !== 'aux') {
      return;
    }

    if (!auxSidebarPanels.value.length) {
      return;
    }

    if (!auxSidebarPanels.value.some((panel) => panel.id === activePanelId)) {
      openLeftPanel(resolvePreferredPanel(auxSidebarPanels.value, 'chat')?.id || auxSidebarPanels.value[0].id);
    }
  },
  { immediate: true }
);

const handleAuxSidebarSelect = (panelId) => {
  openLeftPanel(panelId);
};

const handleAuxSelectModule = (moduleId) => {
  openModuleById(moduleId);
  if (props.screenMode === 'aux') {
    nextTick(() => {
      openTaskBoardDetailPanel();
    });
  }
};

const handleOpenCoordinationCommand = () => {
  openCoordinationCommand();
  if (props.screenMode === 'aux') {
    nextTick(() => {
      openTaskBoardDetailPanel();
    });
  }
};

watch(chatDockCollapsed, (collapsed) => {
  if (collapsed) {
    stopAiDockResize();
  }
});

onUnmounted(() => {
  stopAiDockResize();
});
</script>

<style scoped>
.aux-toolbar-proxy {
  display: contents;
}

.aux-toolbar-proxy :deep(.top-bar),
.aux-toolbar-proxy :deep(.main-area) {
  display: none;
}

.aux-toolbar-proxy :deep(.mission-page) {
  min-height: auto;
  width: auto;
  padding: 0;
  background: transparent;
}

.aux-summary-fallback {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  width: 100%;
  height: 100%;
}

.aux-slot-fill {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
}

.aux-slot-fill > :deep(*) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.aux-insight-fill {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: block;
  overflow: auto;
}

.aux-insight-fill > :deep(*) {
  min-width: 0;
  width: 100%;
  min-height: 0;
}

.aux-insight-panel {
  display: block;
  min-width: 0;
  width: 100%;
  min-height: 0;
}

.aux-fill-panel,
.main-fill-panel {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.aux-summary-text {
  color: rgba(226, 232, 240, 0.74);
  line-height: 1.7;
  font-size: 0.82rem;
}

.mission-ai-dock {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.mission-ai-dock-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.mission-ai-dock-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
}

.mission-ai-dock-toggle {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  z-index: 3;
  min-height: 30px;
  padding: 0 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(8, 15, 18, 0.92);
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
}

.mission-ai-dock-peek {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: none;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(0, 173, 181, 0.18) 0%, rgba(4, 16, 20, 0.98) 100%),
    rgba(6, 12, 15, 0.98);
  color: var(--mc-text-primary, #f8fafc);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.mission-ai-dock-peek-copy {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
}

.mission-ai-dock-peek-title {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  white-space: nowrap;
}

.mission-ai-dock-peek-subtitle {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 0.68rem;
  line-height: 1;
}
</style>
