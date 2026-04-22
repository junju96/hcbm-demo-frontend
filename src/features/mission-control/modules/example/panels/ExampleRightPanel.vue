<template>
  <MissionRightPanelShell class="example-right-shell">
    <div class="example-panel">
      <div class="example-eyebrow">Right Example</div>
      <div class="example-title">{{ moduleManifest.rightPanel?.title || '示例右侧插件' }}</div>
      <div class="example-text">右侧面板承载主表单、主流程和主结果展示。</div>
    </div>

    <div class="example-panel">
      <div class="example-section-title">主表单</div>
      <input v-model="draftName" class="example-input" placeholder="例如：临机方案 A" />
      <textarea
        v-model="draftDesc"
        class="example-textarea"
        placeholder="这里写右侧主面板的核心说明或方案内容"
      ></textarea>
    </div>

    <div class="example-panel">
      <div class="example-section-title">联动示例</div>
      <div class="example-actions">
        <button class="example-btn" type="button" @click="moduleApi.chat.open()">打开任务对话</button>
        <button class="example-btn" type="button" @click="syncWorkspace">触发工作区刷新</button>
      </div>
      <div class="example-tip">右侧如需联动左侧或中间区域，统一走 `moduleApi`。</div>
    </div>
  </MissionRightPanelShell>
</template>

<script setup>
import { ref } from 'vue';
import MissionRightPanelShell from '../../../shared/layout/MissionRightPanelShell.vue';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  panelDefinition: {
    type: Object,
    default: () => ({}),
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});

const draftName = ref('');
const draftDesc = ref('');

const syncWorkspace = () => {
  props.moduleApi.workspace.bump();
  props.moduleApi.chat.appendSystemMessage(
    `[${props.moduleManifest.label}] 已触发工作区刷新（tick=${props.moduleApi.workspace.layoutTick}）`
  );
};
</script>

<style scoped>
.example-right-shell {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.example-panel {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(7, 19, 25, 0.88);
  padding: 1rem;
}

.example-panel:last-child {
  flex: 1 1 auto;
  min-height: 0;
}

.example-eyebrow {
  color: #00dec8;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.example-title,
.example-section-title {
  color: #f8fafc;
  font-weight: 700;
}

.example-title {
  margin-top: 0.35rem;
  font-size: 1rem;
}

.example-text,
.example-tip {
  margin-top: 0.65rem;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
}

.example-input,
.example-textarea {
  width: 100%;
  margin-top: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  padding: 0.75rem 0.8rem;
}

.example-input {
  min-height: 40px;
}

.example-textarea {
  min-height: 120px;
  resize: vertical;
}

.example-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.example-btn {
  min-height: 38px;
  padding: 0 0.95rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
}
</style>
