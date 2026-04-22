<template>
  <div class="example-left-shell">
    <div class="example-card">
      <div class="example-eyebrow">Left Example</div>
      <div class="example-title">{{ panelDefinition.title || '示例左侧应用' }}</div>
      <div class="example-text">左侧面板只负责辅助输入、筛选和摘要，不直接承载主流程。</div>
    </div>

    <div class="example-card">
      <div class="example-section-title">本地状态</div>
      <input v-model="keyword" class="example-input" placeholder="输入筛选词，例如：高优先级目标" />
      <div class="example-tip">当前输入：{{ keyword || '未填写' }}</div>
    </div>

    <div class="example-card">
      <div class="example-section-title">调用示例</div>
      <div class="example-actions">
        <button class="example-btn" type="button" @click="moduleApi.chat.open()">打开 AI</button>
        <button class="example-btn" type="button" @click="pushSummary">发送摘要</button>
      </div>
      <div class="example-tip">左侧如需联动壳层，请统一通过 `moduleApi` 调用。</div>
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
  panelDefinition: {
    type: Object,
    default: () => ({}),
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});

const keyword = ref('');

const pushSummary = () => {
  props.moduleApi.chat.appendSystemMessage(
    `[${props.moduleManifest.label}] 当前筛选词：${keyword.value || '未填写'}`
  );
  props.moduleApi.chat.open();
};
</script>

<style scoped>
.example-left-shell {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.example-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(6, 20, 26, 0.86);
  padding: 1rem;
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

.example-input {
  width: 100%;
  min-height: 40px;
  margin-top: 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  padding: 0 0.8rem;
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
