<template>
  <div class="mission-page">
    <div class="top-bar">
      <div class="top-title">任务管理系统 Demo</div>
      <div class="top-meta">
        <span>天气: {{ weatherText }}</span>
        <span>时间: {{ currentTime }}</span>
        <span>服务: {{ serverStatusText }}</span>
        <span v-if="currentUser">用户: {{ currentUser.username }}</span>
        <button
          v-if="showTopBarScreenSwitch && screenSwitchLabel"
          class="tab-btn mission-topbar-switch-btn"
          type="button"
          @click="onScreenSwitch"
        >
          {{ screenSwitchLabel }}
        </button>
        <button
          v-if="showTopBarModeSwitch && modeSwitchLabel"
          class="tab-btn mission-topbar-switch-btn"
          type="button"
          @click="onModeSwitch"
        >
          {{ modeSwitchLabel }}
        </button>
      </div>
    </div>

    <div v-if="showTabRow" class="mission-tab-row">
      <div class="mission-tab-group">
        <button
          v-for="module in modules"
          :key="module.id"
          class="tab-btn mission-tab-btn"
          :class="{ active: activeModuleId === module.id }"
          type="button"
          @click="onSelectModule(module.id)"
        >
          {{ module.label }}
        </button>
      </div>
      <div class="mission-tab-actions">
        <button
          v-if="screenSwitchLabel"
          class="tab-btn mission-top-action-btn"
          type="button"
          @click="onScreenSwitch"
        >
          {{ screenSwitchLabel }}
        </button>
        <button
          v-if="modeSwitchLabel"
          class="tab-btn mission-top-action-btn"
          type="button"
          @click="onModeSwitch"
        >
          {{ modeSwitchLabel }}
        </button>
        <button class="tab-btn mission-top-action-btn" type="button" @click="onOpenVehicleCatalog">车辆名录</button>
        <button class="tab-btn mission-top-action-btn" type="button" @click="onOpenSystemSettings">系统设置</button>
        <button class="tab-btn emergency-btn mission-top-action-btn" type="button" @click="onOpenVehicleControl">越级操控</button>
        <button class="tab-btn exit-btn mission-top-action-btn" type="button" @click="onExit">退出</button>
      </div>
    </div>

    <div
      class="main-area"
      :class="{ 'is-main-only': !showRightPanel && !showFarRightDock }"
      :style="mainAreaStyle"
    >
      <div class="chat-dock" :class="{ open: leftPanelVisible, resizing: leftPanelResizing }" :style="leftDockStyle">
        <div class="chat-rail">
          <div class="chat-rail-actions">
            <button
              v-for="panel in leftPanels"
              :key="`${activeModuleId}-${panel.id}`"
              class="chat-rail-btn"
              :class="{ active: isLeftPanelActive(panel.id), 'chat-rail-text-btn': panel.iconType !== 'image' }"
              type="button"
              :title="panel.label"
              @click="onOpenLeftPanel(panel.id, { toggle: true })"
            >
              <img v-if="panel.iconType === 'image'" :src="panel.icon" :alt="panel.label" class="chat-rail-icon" />
              <span v-else>{{ panel.shortLabel || panel.label }}</span>
            </button>
          </div>
          <div class="chat-rail-footer">
            <button
              v-if="showRightDrawer"
              class="chat-rail-btn chat-rail-text-btn"
              :class="{ active: rightDrawerVisible }"
              type="button"
              :title="rightDrawerTitle || '打开右侧模块'"
              @click="onToggleRightDrawer"
            >
              <span>{{ rightDrawerButtonLabel }}</span>
            </button>
            <button
              class="chat-rail-btn"
              :class="{ active: notificationCenterVisible }"
              type="button"
              title="通知中心"
              @click="onToggleNotificationCenter"
            >
              <img src="/notify.svg" alt="通知中心" class="chat-rail-icon" />
            </button>
          </div>
        </div>

        <div class="chat-sidebar" :class="{ visible: leftPanelVisible }">
          <div class="chat-sidebar-header">
            <div class="chat-sidebar-meta">
              <div class="chat-sidebar-title">{{ leftPanelTitle }}</div>
              <div v-if="leftPanelHint" class="chat-sidebar-hint">{{ leftPanelHint }}</div>
            </div>
            <button class="chat-sidebar-close" type="button" @click="onCloseLeftPanel">×</button>
          </div>

          <div class="sidebar-panel-host">
            <slot name="left-panel" />
          </div>

          <button
            v-if="leftPanelVisible"
            class="chat-resize-handle"
            type="button"
            aria-label="调整左侧栏宽度"
            @mousedown.prevent="onStartLeftPanelResize"
          ></button>
        </div>
      </div>

      <div class="panel center-panel">
        <slot name="workspace" />
      </div>

      <div
        v-if="showRightPanel"
        class="panel right-panel"
        :class="{ collapsed: rightPanelCollapsed, 'is-flush': rightPanelFlush }"
      >
        <div class="tab-content">
          <slot name="right-panel" />
        </div>
      </div>

      <div
        v-if="showFarRightDock"
        class="panel far-right-dock-panel"
        :class="{ collapsed: farRightDockCollapsed, 'is-flush': farRightDockFlush, resizing: farRightDockResizing }"
      >
        <button
          v-if="!farRightDockCollapsed && onStartFarRightDockResize"
          class="far-right-resize-handle"
          type="button"
          aria-label="调整 AI 面板宽度"
          @mousedown.prevent="onStartFarRightDockResize"
        ></button>
        <div class="tab-content">
          <slot name="far-right-dock" />
        </div>
      </div>
    </div>

    <transition name="mission-right-drawer-slide">
      <div v-if="showRightDrawer" v-show="rightDrawerVisible" class="mission-right-drawer-shell">
        <section class="mission-right-drawer">
          <div class="mission-right-drawer-header">
            <div class="mission-right-drawer-meta">
              <div class="mission-right-drawer-title">{{ rightDrawerTitle }}</div>
              <div v-if="rightDrawerSummary" class="mission-right-drawer-summary">{{ rightDrawerSummary }}</div>
            </div>
            <button
              class="chat-sidebar-close mission-right-drawer-close"
              type="button"
              aria-label="关闭右侧模块"
              @click="onCloseRightDrawer"
            >
              &times;
            </button>
          </div>

          <div class="mission-right-drawer-body">
            <slot name="right-panel" />
          </div>
        </section>
      </div>
    </transition>

    <slot name="overlay-right" />
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modules: {
    type: Array,
    default: () => [],
  },
  activeModuleId: {
    type: String,
    default: '',
  },
  leftPanels: {
    type: Array,
    default: () => [],
  },
  leftPanelVisible: {
    type: Boolean,
    default: false,
  },
  leftPanelResizing: {
    type: Boolean,
    default: false,
  },
  leftDockStyle: {
    type: Object,
    default: () => ({}),
  },
  leftPanelTitle: {
    type: String,
    default: '',
  },
  leftPanelHint: {
    type: String,
    default: '',
  },
  weatherText: {
    type: String,
    default: '',
  },
  currentTime: {
    type: String,
    default: '',
  },
  serverStatusText: {
    type: String,
    default: '',
  },
  currentUser: {
    type: Object,
    default: null,
  },
  notificationCenterVisible: {
    type: Boolean,
    default: false,
  },
  isLeftPanelActive: {
    type: Function,
    required: true,
  },
  onSelectModule: {
    type: Function,
    required: true,
  },
  onOpenLeftPanel: {
    type: Function,
    required: true,
  },
  onCloseLeftPanel: {
    type: Function,
    required: true,
  },
  onToggleNotificationCenter: {
    type: Function,
    required: true,
  },
  onStartLeftPanelResize: {
    type: Function,
    required: true,
  },
  onOpenSystemSettings: {
    type: Function,
    required: true,
  },
  onOpenVehicleCatalog: {
    type: Function,
    required: true,
  },
  onOpenVehicleControl: {
    type: Function,
    required: true,
  },
  onModeSwitch: {
    type: Function,
    default: null,
  },
  onScreenSwitch: {
    type: Function,
    default: null,
  },
  onExit: {
    type: Function,
    required: true,
  },
  modeSwitchLabel: {
    type: String,
    default: '',
  },
  showTabRow: {
    type: Boolean,
    default: true,
  },
  showRightPanel: {
    type: Boolean,
    default: true,
  },
  showFarRightDock: {
    type: Boolean,
    default: false,
  },
  rightPanelCollapsed: {
    type: Boolean,
    default: false,
  },
  rightPanelWidth: {
    type: Number,
    default: 340,
  },
  rightPanelCollapsedWidth: {
    type: Number,
    default: 44,
  },
  rightPanelFlush: {
    type: Boolean,
    default: false,
  },
  farRightDockCollapsed: {
    type: Boolean,
    default: false,
  },
  farRightDockWidth: {
    type: Number,
    default: 360,
  },
  farRightDockCollapsedWidth: {
    type: Number,
    default: 48,
  },
  farRightDockResizing: {
    type: Boolean,
    default: false,
  },
  farRightDockFlush: {
    type: Boolean,
    default: false,
  },
  showRightDrawer: {
    type: Boolean,
    default: false,
  },
  rightDrawerVisible: {
    type: Boolean,
    default: false,
  },
  rightDrawerTitle: {
    type: String,
    default: '',
  },
  rightDrawerSummary: {
    type: String,
    default: '',
  },
  rightDrawerButtonLabel: {
    type: String,
    default: '右',
  },
  showTopBarModeSwitch: {
    type: Boolean,
    default: false,
  },
  showTopBarScreenSwitch: {
    type: Boolean,
    default: false,
  },
  screenSwitchLabel: {
    type: String,
    default: '',
  },
  onToggleRightDrawer: {
    type: Function,
    default: null,
  },
  onCloseRightDrawer: {
    type: Function,
    default: null,
  },
  onStartFarRightDockResize: {
    type: Function,
    default: null,
  },
});

const mainAreaStyle = computed(() => ({
  gridTemplateColumns: [
    'auto',
    'minmax(0, 1fr)',
    props.showRightPanel
      ? (props.rightPanelCollapsed ? `${props.rightPanelCollapsedWidth}px` : `${props.rightPanelWidth}px`)
      : null,
    props.showFarRightDock
      ? (props.farRightDockCollapsed ? `${props.farRightDockCollapsedWidth}px` : `${props.farRightDockWidth}px`)
      : null,
  ].filter(Boolean).join(' '),
}));
</script>

<style scoped src="../MissionControlPage.css"></style>
