<template>
  <div class="coord-left-shell">
    <div class="coord-card">
      <div class="coord-title">协同简报</div>
      <textarea
        v-model="brief"
        class="coord-textarea"
        placeholder="输入协同简报内容"
      ></textarea>
    </div>

    <div class="coord-card">
      <div class="coord-title">快速测试</div>
      <div class="coord-actions">
        <button class="coord-btn" type="button" @click="sendBrief">发送到对话</button>
        <button class="coord-btn" type="button" @click="moduleApi.layout.openLeftPanel('shared-map-ops')">
          切到公共地图插件
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});

const brief = ref('协同模块用于测试切换模块时公共插件是否保持选中。');

const sendBrief = () => {
  props.moduleApi.chat.appendSystemMessage(`[${props.moduleManifest.label}] ${brief.value}`);
  props.moduleApi.chat.open();
};
</script>

<style scoped>
.coord-left-shell {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.9rem;
}

.coord-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(6, 20, 26, 0.86);
  padding: 1rem;
}

.coord-title {
  color: #f8fafc;
  font-weight: 700;
}

.coord-textarea {
  width: 100%;
  min-height: 120px;
  margin-top: 0.75rem;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  padding: 0.75rem 0.8rem;
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
