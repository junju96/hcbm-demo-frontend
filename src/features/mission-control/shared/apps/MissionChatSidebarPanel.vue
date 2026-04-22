<template>
  <div class="mission-chat-sidebar">
    <div v-if="currentInteractionTarget" class="chat-context-bar">
      <div class="chat-context-copy">
        <div class="chat-context-caption">当前上下文</div>
        <div class="chat-context-title">{{ currentInteractionTarget.label || currentInteractionTarget.targetId }}</div>
        <div v-if="currentInteractionTarget.textPreview" class="chat-context-preview">
          {{ currentInteractionTarget.textPreview }}
        </div>
      </div>
      <div class="chat-context-actions">
        <button class="chat-context-btn primary" type="button" @click="moduleApi.interaction.insertCurrentTargetToChat()">
          加入对话
        </button>
        <button class="chat-context-btn" type="button" @click="moduleApi.interaction.clearCurrentTarget()">
          清空
        </button>
      </div>
    </div>

    <div :ref="moduleApi.chat.setMessagesElement" class="chat-messages">
      <div v-for="(record, index) in moduleApi.chat.records || []" :key="index" class="chat-message" :class="record.role">
        {{ record.text }}
      </div>
    </div>

    <div class="chat-input-row">
      <select v-model="moduleApi.chat.selectedTool" class="chat-select">
        <option value="知识库">知识库</option>
        <option value="问 AI">问 AI</option>
        <option value="闲聊">闲聊</option>
      </select>
      <input
        v-model="moduleApi.chat.draft"
        class="chat-input"
        placeholder="输入内容"
        @keydown.enter.prevent="handleSend"
      />
      <button class="chat-btn" type="button" @click="handleSend">发送</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true
  }
});

const handleSend = () => {
  props.moduleApi.chat.send();
};

const currentInteractionTarget = computed(() => props.moduleApi.interaction?.currentTarget || null);
</script>

<style scoped>
.mission-chat-sidebar {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 0.8rem;
}

.chat-context-bar {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.8rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.14) 0%, rgba(7, 18, 22, 0.96) 100%);
}

.chat-context-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.chat-context-caption {
  color: rgba(148, 163, 184, 0.74);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.chat-context-title {
  margin-top: 0.2rem;
  color: #f8fafc;
  font-size: 0.9rem;
  font-weight: 700;
}

.chat-context-preview {
  margin-top: 0.28rem;
  color: rgba(226, 232, 240, 0.76);
  font-size: 0.76rem;
  line-height: 1.5;
}

.chat-context-actions {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.chat-context-btn {
  min-height: 32px;
  padding: 0 0.8rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  cursor: pointer;
}

.chat-context-btn.primary {
  border-color: rgba(0, 222, 200, 0.34);
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.26) 0%, rgba(4, 34, 39, 0.96) 100%);
}

.chat-messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
}

.chat-message {
  max-width: 88%;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  line-height: 1.55;
  font-size: 0.92rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-message.user {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.28) 0%, rgba(4, 34, 39, 0.92) 100%);
  border: 1px solid rgba(0, 222, 200, 0.32);
}

.chat-message.system {
  align-self: flex-start;
  background: rgba(18, 25, 30, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: rgba(226, 232, 240, 0.78);
}

.chat-input-row {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr) 72px;
  gap: 0.6rem;
}

.chat-select,
.chat-input {
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  padding: 0 0.8rem;
  outline: none;
}

.chat-btn {
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.4);
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.36) 0%, rgba(4, 34, 39, 0.98) 100%);
  color: #f8fafc;
  font-weight: 700;
  cursor: pointer;
}
</style>
