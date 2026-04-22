<template>
  <div class="mission-aux-page">
    <header class="aux-top-bar">
      <div class="aux-title">任务管理系统 Demo</div>
      <div class="aux-meta">
        <span>天气: {{ weatherText }}</span>
        <span>时间: {{ currentTime }}</span>
        <span>服务: {{ serverStatusText }}</span>
        <span v-if="currentUser">用户: {{ currentUser.username }}</span>
      </div>
    </header>

    <section class="aux-toolbar-shell">
      <slot name="toolbar" />
    </section>

    <main class="aux-workspace-shell">
      <section class="aux-stage aux-sidebar-stage aux-primary-stage" :style="leftStageStyle">
        <div class="aux-stage-head">
          <div class="aux-stage-title">工作区</div>
        </div>
        <div class="aux-stage-body">
          <div class="aux-stage-content">
            <slot name="sidebar" />
          </div>
        </div>
      </section>

      <button
        class="aux-splitter aux-column-splitter"
        type="button"
        aria-label="调整左侧工作区与中间区域宽度"
        @mousedown.prevent="startColumnResize"
      ></button>

      <section ref="secondaryShellRef" class="aux-secondary-shell">
        <section
          v-if="showTaskBoard"
          class="aux-stage aux-board-stage"
          :style="taskBoardStyle"
        >
          <div class="aux-stage-head aux-stage-head-with-actions">
            <div class="aux-stage-head-copy">
              <div class="aux-stage-title">多车任务看板</div>
            </div>
          </div>
          <div class="aux-stage-body">
            <div class="aux-stage-content aux-board-content">
              <slot name="progress-board" />
            </div>
          </div>
        </section>

        <button
          v-if="showTaskBoard && detailPanelVisible"
          class="aux-splitter aux-row-splitter"
          type="button"
          aria-label="调整多车任务看板高度"
          @mousedown.prevent="startRowResize"
        ></button>

        <section v-if="detailPanelVisible" class="aux-stage aux-insight-stage aux-insight-stage-main">
          <div class="aux-stage-head aux-stage-head-with-actions">
            <div class="aux-stage-head-copy">
              <div class="aux-stage-title">{{ activeModuleTitle }}</div>
              <div v-if="activeModuleSummary" class="aux-stage-hint">{{ activeModuleSummary }}</div>
            </div>
            <div class="aux-stage-head-actions">
              <button class="aux-pane-toggle" type="button" @click="onCollapseDetailPanel">收起面板</button>
            </div>
          </div>
          <div class="aux-stage-body">
            <div class="aux-stage-content aux-insight-stage-content">
              <slot name="insight" />
            </div>
          </div>
        </section>

        <button
          v-else
          class="aux-detail-trigger"
          type="button"
          @click="onExpandDetailPanel"
        >
          模块详细信息
        </button>
      </section>

      <button
        v-if="showAiDock"
        class="aux-splitter aux-column-splitter"
        type="button"
        aria-label="调整中间区域与右侧 AI 面板宽度"
        @mousedown.prevent="onStartAiDockResize"
      ></button>

      <section
        v-if="showAiDock"
        class="aux-stage aux-ai-stage"
        :class="{ collapsed: aiDockCollapsed, resizing: aiDockResizing }"
        :style="aiDockStageStyle"
      >
        <div class="aux-stage-content aux-ai-stage-content">
          <slot name="ai-dock" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  activeModuleLabel: {
    type: String,
    default: '任务管理系统',
  },
  activeModuleSummary: {
    type: String,
    default: '',
  },
  activeModuleTitle: {
    type: String,
    default: '',
  },
  showTaskBoard: {
    type: Boolean,
    default: true,
  },
  detailPanelVisible: {
    type: Boolean,
    default: true,
  },
  detailPanelBalanceKey: {
    type: Number,
    default: 0,
  },
  onExpandDetailPanel: {
    type: Function,
    default: null,
  },
  onCollapseDetailPanel: {
    type: Function,
    default: null,
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
  showAiDock: {
    type: Boolean,
    default: false,
  },
  aiDockCollapsed: {
    type: Boolean,
    default: false,
  },
  aiDockWidth: {
    type: Number,
    default: 396,
  },
  aiDockCollapsedWidth: {
    type: Number,
    default: 56,
  },
  aiDockResizing: {
    type: Boolean,
    default: false,
  },
  onStartAiDockResize: {
    type: Function,
    default: null,
  },
});

const leftStageWidth = ref(340);
const expandedBoardHeight = ref(360);
const secondaryShellRef = ref(null);
const columnResizing = ref(false);
const rowResizing = ref(false);

let columnStartX = 0;
let columnStartWidth = 340;
let rowStartY = 0;
let rowStartHeight = 360;
let secondaryShellResizeObserver = null;

const clampLeftStageWidth = (value) => {
  if (typeof window === 'undefined') {
    return Math.min(500, Math.max(300, Number(value) || 340));
  }

  const viewportWidth = window.innerWidth || 1600;
  const maxWidth = Math.max(340, Math.floor(viewportWidth * 0.36));
  return Math.min(maxWidth, Math.max(300, Number(value) || 340));
};

const clampBoardHeight = (value) => {
  if (typeof window === 'undefined') {
    return Math.min(520, Math.max(280, Number(value) || 380));
  }

  const viewportHeight = window.innerHeight || 900;
  const maxHeight = Math.max(340, Math.floor((viewportHeight - 220) * 0.66));
  return Math.min(maxHeight, Math.max(260, Number(value) || 380));
};

const getBalancedBoardHeight = () => {
  const secondaryHeight = secondaryShellRef.value?.clientHeight;
  if (secondaryHeight) {
    const gapCompensation = props.showTaskBoard && props.detailPanelVisible ? 12 : 0;
    return clampBoardHeight(Math.floor((secondaryHeight - gapCompensation) * 0.4));
  }

  if (typeof window === 'undefined') {
    return clampBoardHeight(360);
  }

  const viewportHeight = window.innerHeight || 900;
  return clampBoardHeight(Math.floor((viewportHeight - 220) * 0.3));
};

const normalizeLayout = () => {
  leftStageWidth.value = clampLeftStageWidth(leftStageWidth.value);
  if (props.showTaskBoard && props.detailPanelVisible) {
    expandedBoardHeight.value = getBalancedBoardHeight();
    return;
  }
  expandedBoardHeight.value = clampBoardHeight(expandedBoardHeight.value);
};

const setResizeCursor = (cursor) => {
  document.body.style.userSelect = cursor ? 'none' : '';
  document.body.style.cursor = cursor || '';
};

const handleColumnResize = (event) => {
  if (!columnResizing.value) {
    return;
  }
  leftStageWidth.value = clampLeftStageWidth(columnStartWidth + event.clientX - columnStartX);
};

const handleRowResize = (event) => {
  if (!rowResizing.value) {
    return;
  }
  expandedBoardHeight.value = clampBoardHeight(rowStartHeight + event.clientY - rowStartY);
};

const stopColumnResize = () => {
  if (!columnResizing.value) {
    window.removeEventListener('mousemove', handleColumnResize);
    window.removeEventListener('mouseup', stopColumnResize);
    return;
  }

  columnResizing.value = false;
  setResizeCursor('');
  window.removeEventListener('mousemove', handleColumnResize);
  window.removeEventListener('mouseup', stopColumnResize);
};

const stopRowResize = () => {
  if (!rowResizing.value) {
    window.removeEventListener('mousemove', handleRowResize);
    window.removeEventListener('mouseup', stopRowResize);
    return;
  }

  rowResizing.value = false;
  setResizeCursor('');
  window.removeEventListener('mousemove', handleRowResize);
  window.removeEventListener('mouseup', stopRowResize);
};

const startColumnResize = (event) => {
  columnResizing.value = true;
  columnStartX = event.clientX;
  columnStartWidth = leftStageWidth.value;
  setResizeCursor('col-resize');
  window.addEventListener('mousemove', handleColumnResize);
  window.addEventListener('mouseup', stopColumnResize);
};

const startRowResize = (event) => {
  if (!props.showTaskBoard) {
    return;
  }

  rowResizing.value = true;
  rowStartY = event.clientY;
  rowStartHeight = expandedBoardHeight.value;
  setResizeCursor('row-resize');
  window.addEventListener('mousemove', handleRowResize);
  window.addEventListener('mouseup', stopRowResize);
};

const queueNormalizeLayout = () => {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    normalizeLayout();
    return;
  }

  window.requestAnimationFrame(() => {
    normalizeLayout();
  });
};

const leftStageStyle = computed(() => ({
  flex: `0 0 ${leftStageWidth.value}px`,
  width: `${leftStageWidth.value}px`,
}));

const aiDockStageStyle = computed(() => {
  const width = props.aiDockCollapsed ? props.aiDockCollapsedWidth : props.aiDockWidth;
  return {
    flex: `0 0 ${width}px`,
    width: `${width}px`,
  };
});

const taskBoardStyle = computed(() => {
  if (!props.detailPanelVisible) {
    return {
      flex: '1 1 auto',
      height: 'auto',
      minHeight: '0',
    };
  }

  return {
    flex: `0 0 ${expandedBoardHeight.value}px`,
    height: `${expandedBoardHeight.value}px`,
  };
});

watch(
  () => [props.showTaskBoard, props.detailPanelVisible],
  () => {
    queueNormalizeLayout();
  },
  { immediate: true }
);

watch(
  () => props.detailPanelBalanceKey,
  () => {
    if (!props.showTaskBoard || !props.detailPanelVisible) {
      return;
    }
    expandedBoardHeight.value = getBalancedBoardHeight();
  }
);

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', queueNormalizeLayout);
  }

  queueNormalizeLayout();
  nextTick(() => {
    queueNormalizeLayout();

    if (typeof ResizeObserver !== 'undefined' && secondaryShellRef.value) {
      secondaryShellResizeObserver = new ResizeObserver(() => {
        if (props.showTaskBoard && props.detailPanelVisible) {
          expandedBoardHeight.value = getBalancedBoardHeight();
          return;
        }
        normalizeLayout();
      });
      secondaryShellResizeObserver.observe(secondaryShellRef.value);
    }
  });
});

onUnmounted(() => {
  stopColumnResize();
  stopRowResize();
  if (secondaryShellResizeObserver) {
    secondaryShellResizeObserver.disconnect();
    secondaryShellResizeObserver = null;
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', queueNormalizeLayout);
  }
});
</script>

<style scoped>
.mission-aux-page {
  --mc-primary-grad: var(--theme-title-bg);
  --mc-accent-border: var(--theme-border);
  --mc-text-primary: var(--theme-text);
  --mc-text-secondary: var(--theme-text-secondary);
  --mc-shadow: var(--theme-shadow);
  min-height: 100vh;
  height: 100vh;
  width: 100vw;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--mc-text-primary);
  background-image:
    radial-gradient(circle at top left, rgba(0, 222, 200, 0.12), transparent 34%),
    radial-gradient(circle at bottom right, rgba(0, 173, 181, 0.14), transparent 30%),
    var(--theme-backdrop);
  background-size: cover;
  background-position: center;
}

.aux-top-bar {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--mc-accent-border);
  background: var(--mc-primary-grad);
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: var(--mc-shadow);
  backdrop-filter: blur(24px);
}

.aux-top-bar::before {
  content: '';
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, rgba(0, 213, 192, 0.72) 0%, rgba(0, 213, 192, 0.24) 50%, transparent 100%);
}

.aux-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--mc-text-primary);
  text-shadow: 0 0 18px rgba(0, 222, 200, 0.24);
  line-height: 1.1;
}

.aux-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 1.2rem;
  color: var(--mc-text-secondary);
  font-size: 0.9rem;
}

.aux-toolbar-shell {
  flex: 0 0 auto;
}

.aux-workspace-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: 0.35rem;
}

.aux-primary-stage {
  min-width: 320px;
  max-width: 42vw;
}

.aux-secondary-shell {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.aux-stage {
  min-height: 0;
  border-radius: 18px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0)),
    rgba(3, 16, 20, 0.9);
  box-shadow: 0 26px 48px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aux-stage-head {
  padding: 0.8rem 0.9rem 0.65rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
  background: linear-gradient(180deg, rgba(0, 86, 91, 0.2) 0%, rgba(3, 16, 20, 0) 100%);
}

.aux-stage-head-with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.aux-stage-head-copy {
  min-width: 0;
}

.aux-stage-head-actions {
  flex: 0 0 auto;
}

.aux-stage-title {
  color: var(--mc-text-primary);
  font-size: 1rem;
  font-weight: 700;
}

.aux-stage-hint {
  margin-top: 0.3rem;
  color: rgba(226, 232, 240, 0.66);
  line-height: 1.5;
  font-size: 0.78rem;
}

.aux-stage-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
  padding: 0.75rem 0.9rem 0.85rem;
}

.aux-stage-content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
}

.aux-ai-stage-content {
  padding: 0;
}

.aux-stage-content > :deep(*) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
}

.aux-board-content {
  display: block;
}

.aux-insight-stage-main {
  flex: 1 1 auto;
}

.aux-insight-stage-content {
  display: block;
  overflow: auto;
  overscroll-behavior: contain;
}

.aux-insight-stage-content > :deep(*) {
  width: 100%;
  min-width: 0;
}

.aux-sidebar-stage {
  background:
    linear-gradient(180deg, rgba(0, 222, 200, 0.08) 0%, rgba(3, 16, 20, 0.96) 30%),
    rgba(3, 16, 20, 0.92);
}

.aux-board-stage {
  background:
    linear-gradient(135deg, rgba(0, 86, 91, 0.12) 0%, rgba(3, 16, 20, 0.96) 34%),
    rgba(3, 16, 20, 0.92);
}

.aux-insight-stage {
  background:
    linear-gradient(180deg, rgba(0, 222, 200, 0.06) 0%, rgba(3, 16, 20, 0.95) 28%),
    rgba(3, 16, 20, 0.92);
}

.aux-ai-stage {
  min-width: 56px;
  max-width: 42vw;
  padding: 0.75rem;
  background:
    linear-gradient(180deg, rgba(0, 173, 181, 0.08) 0%, rgba(3, 16, 20, 0.96) 34%),
    rgba(3, 16, 20, 0.92);
}

.aux-ai-stage.collapsed {
  padding: 0.5rem;
}

.aux-pane-toggle,
.aux-detail-trigger {
  min-height: 34px;
  padding: 0.4rem 0.72rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
}

.aux-detail-trigger {
  flex: 0 0 auto;
  width: 100%;
  min-height: 42px;
}

.aux-splitter {
  position: relative;
  border: none;
  padding: 0;
  background: transparent;
}

.aux-column-splitter {
  flex: 0 0 6px;
  width: 6px;
  cursor: col-resize;
}

.aux-row-splitter {
  flex: 0 0 6px;
  height: 6px;
  width: 100%;
  cursor: row-resize;
}

.aux-column-splitter::before,
.aux-row-splitter::before {
  content: '';
  position: absolute;
  background: rgba(0, 222, 200, 0.26);
  border-radius: 999px;
}

.aux-column-splitter::before {
  top: 50%;
  left: 50%;
  width: 1px;
  height: 42px;
  transform: translate(-50%, -50%);
}

.aux-row-splitter::before {
  top: 50%;
  left: 50%;
  width: 42px;
  height: 1px;
  transform: translate(-50%, -50%);
}

.aux-column-splitter::after,
.aux-row-splitter::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  background: url('/interface/drag.svg') center / contain no-repeat;
  opacity: 0.82;
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.28));
}

.aux-column-splitter::after {
  transform: translate(-50%, -50%);
}

.aux-row-splitter::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

@media (max-width: 1320px) {
  .mission-aux-page {
    padding: 0.85rem;
  }

  .aux-workspace-shell {
    flex-direction: column;
  }

  .aux-primary-stage {
    width: auto !important;
    max-width: none;
  }

  .aux-column-splitter {
    display: none;
  }
}

@media (min-width: 1366px) and (max-height: 1100px) {
  .mission-aux-page {
    padding: 0.85rem;
    gap: 0.6rem;
  }

  .aux-top-bar {
    padding: 0.8rem 1.2rem;
  }

  .aux-title {
    font-size: 1.3rem;
  }

  .aux-meta {
    gap: 0.9rem;
    font-size: 0.82rem;
  }

  .aux-workspace-shell,
  .aux-secondary-shell {
    gap: 0.28rem;
  }

  .aux-stage-head {
    padding: 0.65rem 0.75rem 0.55rem;
  }

  .aux-stage-body {
    padding: 0.65rem 0.75rem 0.75rem;
  }

  .aux-ai-stage {
    padding: 0.55rem;
  }
}
</style>
