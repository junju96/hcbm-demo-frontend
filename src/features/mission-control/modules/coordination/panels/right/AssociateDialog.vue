<template>
  <div v-if="visible" class="coord-dialog-mask" @click.self="close">
    <div class="coord-dialog associate-dialog">
      <div class="coord-dialog-title">关联任务和资源</div>

      <!-- 当前命令信息 -->
      <div class="associate-command-info">
        <span class="associate-label">当前命令</span>
        <span class="associate-value">{{ selectedCommand?.name || '—' }}</span>
        <span class="associate-badge">{{ selectedCommand?.commandId }}</span>
      </div>

      <!-- 任务选择 -->
      <div class="associate-section">
        <div class="associate-section-title">
          <span>选择任务</span>
          <span class="associate-count">已选 {{ selectedMissionIds.length }} / {{ missions.length }}</span>
        </div>
        <div class="associate-check-list">
          <label
            v-for="mission in missions"
            :key="mission.mission_id"
            class="associate-check-item"
            :class="{ checked: selectedMissionIds.includes(mission.mission_id) }"
          >
            <input
              type="checkbox"
              :value="mission.mission_id"
              v-model="selectedMissionIds"
            />
            <span class="associate-check-box"></span>
            <span class="associate-check-text">
              <span class="associate-check-name">{{ mission.mission_name }}</span>
              <span class="associate-check-meta">{{ mission.mission_type }}</span>
            </span>
          </label>
        </div>
      </div>

      <!-- 资源选择 -->
      <div class="associate-section">
        <div class="associate-section-title">
          <span>选择资源</span>
          <span class="associate-count">已选 {{ selectedResourceIds.length }} / {{ resources.length }}</span>
        </div>
        <div class="associate-check-list">
          <div
            v-for="group in resourceGroups"
            :key="group.tag"
            class="associate-resource-group"
          >
            <div class="associate-group-label" :class="`tag-${group.tag}`">
              {{ group.label }}
            </div>
            <label
              v-for="resource in group.items"
              :key="resource.resource_id"
              class="associate-check-item"
              :class="{ checked: selectedResourceIds.includes(resource.resource_id) }"
            >
              <input
                type="checkbox"
                :value="resource.resource_id"
                v-model="selectedResourceIds"
              />
              <span class="associate-check-box"></span>
              <span class="associate-check-text">
                <span class="associate-check-name">{{ resource.resource_name }}</span>
                <span class="associate-check-meta">{{ resource.resource_type }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="coord-dialog-actions">
        <button class="coord-btn coord-mini-btn" type="button" @click="close">取消</button>
        <button
          class="coord-btn primary coord-mini-btn"
          type="button"
          :disabled="!hasSelection"
          @click="confirm"
        >
          确认关联
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { RESOURCE_TAG_LABELS } from '../../data/commandDataModel';

const props = defineProps({
  visible: { type: Boolean, default: false },
  selectedCommand: { type: Object, default: null },
  missions: { type: Array, default: () => [] },
  resources: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'confirm']);

const selectedMissionIds = ref([]);
const selectedResourceIds = ref([]);

const resourceGroups = computed(() => {
  const groups = {};
  props.resources.forEach((r) => {
    if (!groups[r.resource_tag]) {
      groups[r.resource_tag] = {
        tag: r.resource_tag,
        label: RESOURCE_TAG_LABELS[r.resource_tag] || r.resource_tag,
        items: [],
      };
    }
    groups[r.resource_tag].items.push(r);
  });
  return Object.values(groups);
});

const hasSelection = computed(() =>
  selectedMissionIds.value.length > 0 || selectedResourceIds.value.length > 0
);

// 弹窗打开时初始化选中状态
watch(
  () => props.visible,
  (visible) => {
    if (visible && props.selectedCommand) {
      const conn = props.selectedCommand.connections || {};
      selectedMissionIds.value = Array.isArray(conn.connected_missions)
        ? [...conn.connected_missions]
        : [];
      selectedResourceIds.value = Array.isArray(conn.connected_resources)
        ? [...conn.connected_resources]
        : [];
    }
  }
);

const close = () => {
  emit('update:visible', false);
};

const confirm = () => {
  emit('confirm', {
    missionIds: selectedMissionIds.value,
    resourceIds: selectedResourceIds.value,
  });
  close();
};
</script>

<style scoped>
.associate-dialog {
  width: min(720px, calc(100vw - 32px));
  margin: auto;
  padding: 1.1rem;
  box-sizing: border-box;
}

.associate-command-info {
  margin-top: 0.55rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  padding: 0.48rem 0.58rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(0, 16, 22, 0.72);
}

.associate-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(153, 218, 227, 0.9);
}

.associate-value {
  font-size: 0.94rem;
  font-weight: 700;
  color: #f1feff;
}

.associate-badge {
  font-size: 0.74rem;
  font-weight: 700;
  color: rgba(196, 243, 248, 0.75);
  font-family: var(--font-mono, monospace);
}

.associate-section {
  margin-top: 0.72rem;
  display: flex;
  flex-direction: column;
}

.associate-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.88rem;
  font-weight: 800;
  color: #f1feff;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.associate-count {
  font-size: 0.76rem;
  font-weight: 700;
  color: rgba(153, 218, 227, 0.72);
}

.associate-check-list {
  margin-top: 0.42rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  padding-right: 0.2rem;
}

.associate-resource-group {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin-bottom: 0.32rem;
}

.associate-group-label {
  font-size: 0.76rem;
  font-weight: 700;
  padding: 0.24rem 0.44rem;
  border-radius: 6px;
  display: inline-flex;
  align-self: flex-start;
}

.associate-group-label.tag-TS_TARGET { background: rgba(255, 183, 77, 0.14); color: #ffd180; }
.associate-group-label.tag-EQUIPMENT { background: rgba(77, 182, 255, 0.14); color: #a8d8ff; }
.associate-group-label.tag-FIREPOWER { background: rgba(255, 82, 82, 0.14); color: #ffadad; }
.associate-group-label.tag-RECON { background: rgba(156, 77, 255, 0.14); color: #d4b3ff; }
.associate-group-label.tag-SUPPORT { background: rgba(77, 255, 136, 0.14); color: #b3ffcc; }

.associate-check-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.38rem 0.48rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.14);
  background: rgba(0, 16, 22, 0.52);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.associate-check-item:hover {
  border-color: rgba(0, 222, 200, 0.32);
  background: rgba(0, 222, 200, 0.06);
}

.associate-check-item.checked {
  border-color: rgba(0, 222, 200, 0.42);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.1), rgba(0, 222, 200, 0.04)), rgba(0, 16, 22, 0.62);
}

.associate-check-item input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.associate-check-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid rgba(0, 222, 200, 0.38);
  background: rgba(0, 10, 14, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 160ms ease;
}

.associate-check-item.checked .associate-check-box {
  border-color: #00dec8;
  background: rgba(0, 222, 200, 0.22);
}

.associate-check-item.checked .associate-check-box::after {
  content: '✓';
  color: #00dec8;
  font-size: 0.72rem;
  font-weight: 800;
}

.associate-check-text {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  min-width: 0;
  flex: 1;
}

.associate-check-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: #f1feff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.associate-check-meta {
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(153, 218, 227, 0.65);
  flex-shrink: 0;
}

/* 复用 CommandDetailSection.vue 中的弹窗基础样式 */
.coord-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(2, 10, 14, 0.58);
  backdrop-filter: blur(4px);
  overflow-y: auto;
  padding: 16px;
}

.coord-dialog {
  border-radius: 16px;
  border: 1px solid rgba(0, 208, 188, 0.42);
  background: linear-gradient(180deg, rgba(0, 213, 192, 0.08), rgba(0, 49, 72, 0.02)), rgba(5, 18, 24, 0.96);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.06), 0 18px 40px rgba(0, 0, 0, 0.36);
}

.coord-dialog-title {
  color: #f1feff;
  font-size: 1.04rem;
  font-weight: 800;
  flex-shrink: 0;
}

.coord-dialog-actions {
  margin-top: 0.9rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.52rem;
  flex-shrink: 0;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(0, 222, 200, 0.14);
}

.coord-btn {
  min-height: 36px;
  padding: 0 0.92rem;
  border-radius: 9px;
  border: 1px solid rgba(0, 208, 188, 0.26);
  background: rgba(255, 255, 255, 0.08);
  color: #f1feff;
  cursor: pointer;
  font-size: 0.97rem;
  font-weight: 700;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.coord-btn:hover {
  border-color: rgba(0, 222, 200, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.12);
}

.coord-btn.primary {
  border-color: rgba(0, 208, 188, 0.4);
  background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96));
}

.coord-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.coord-mini-btn {
  min-height: 32px;
  min-width: 72px;
  padding: 0 0.66rem;
  font-size: 0.82rem;
  font-weight: 600;
}
</style>
