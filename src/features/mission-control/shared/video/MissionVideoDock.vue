<template>
  <div class="video-dock" :class="{ open }">
    <button
      v-if="!open"
      class="video-dock-handle"
      type="button"
      aria-label="打开视频窗格"
      @click="onOpen"
    >
      视频
    </button>

    <section v-else class="video-dock-panel">
      <div class="video-dock-status-row">
        <div class="video-dock-status-spacer"></div>
        <div class="video-dock-actions">
          <button class="video-dock-close" type="button" aria-label="收起视频窗格" @click="onClose">
            &times;
          </button>
        </div>
      </div>

      <div class="video-dock-grid">
        <article v-for="slot in slotItems" :key="slot.id" class="video-card">
          <div class="video-card-controls">
            <div class="video-chip">{{ slot.vehicle }}</div>
            <div class="video-chip compact">{{ slot.stream }}</div>
            <div class="video-chip action">显示</div>
          </div>

          <div class="video-frame">
            <div class="video-frame-label">
              <span>{{ slot.vehicle }}</span>
              <span>{{ slot.stream }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  onOpen: {
    type: Function,
    default: null,
  },
  onClose: {
    type: Function,
    default: null,
  },
});

const slotItems = [
  { id: 'video-1', vehicle: 'UGV-001', stream: '底盘' },
  { id: 'video-2', vehicle: 'UGV-002', stream: '底盘' },
  { id: 'video-3', vehicle: 'UGV-003', stream: '载荷' },
  { id: 'video-4', vehicle: 'UGV-004', stream: '载荷' },
];
</script>

<style scoped>
.video-dock {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
}

.video-dock-handle {
  width: 100%;
  height: 100%;
  border: none;
  border-left: 1px solid var(--theme-border);
  background: linear-gradient(180deg, rgba(0, 86, 91, 0.92) 0%, rgba(3, 18, 21, 0.96) 100%);
  color: var(--theme-text);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  writing-mode: vertical-rl;
  text-orientation: upright;
  cursor: pointer;
}

.video-dock-panel {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: rgba(3, 16, 20, 0.95);
  overflow: hidden;
}

.video-dock-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.7rem 0.75rem 0.55rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.1);
}

.video-dock-status-spacer {
  flex: 1 1 auto;
  min-width: 0;
}

.video-dock-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.video-dock-close {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(10, 18, 22, 0.88);
  color: var(--theme-text);
  box-shadow: var(--theme-control-shadow);
}

.video-dock-grid {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.55rem 0.75rem 0.7rem;
}

.video-card {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.14);
  background: rgba(7, 19, 25, 0.88);
  padding: 0.55rem;
}

.video-card-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px 64px;
  gap: 0.38rem;
  align-items: center;
}

.video-chip {
  min-height: 32px;
  padding: 0 0.5rem;
  font-size: 0.76rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(10, 18, 22, 0.88);
  color: var(--theme-text);
  box-shadow: var(--theme-control-shadow);
  display: inline-flex;
  align-items: center;
}

.video-chip.compact,
.video-chip.action {
  justify-content: center;
}

.video-frame {
  flex: 0 0 auto;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  background: rgba(9, 14, 17, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0.45rem 0.55rem;
  box-sizing: border-box;
}

.video-frame-label {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  color: rgba(255, 255, 255, 0.96);
  font-size: 0.72rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
}
</style>
