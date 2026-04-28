<template>
  <article v-if="selectedCommand" class="coord-panel coord-command-panel">
    <header class="coord-command-header">
      <div class="coord-command-title-group">
        <div class="coord-command-title-main">{{ selectedCommand.name }}</div>
      </div>
      <div class="coord-command-head-side">
        <span
          class="coord-command-badge coord-command-badge-head"
          :class="resolveCommandStatusTone(selectedCommand.commandId)"
          :title="resolveCommandStatusText(selectedCommand.commandId) === '已处理' ? '该命令已完成任务理解并提取结构化数据' : '该命令尚未执行任务理解'"
        >
          {{ resolveCommandStatusText(selectedCommand.commandId) }}
        </span>
      </div>
    </header>

    <section class="coord-overview-wrap">
      <div class="coord-overview-grid">
        <div class="coord-meta-cell coord-meta-cell-subject">
          <span class="coord-meta-label">命令主题</span>
          <span class="coord-meta-value">{{ selectedCommand.title }}</span>
        </div>
      </div>

      <div class="coord-meta-grid">
        <div class="coord-meta-cell">
          <span class="coord-meta-label">发令单位</span>
          <span class="coord-meta-value">{{ selectedCommand.sender }}</span>
        </div>
        <div class="coord-meta-cell">
          <span class="coord-meta-label">接收时间</span>
          <span class="coord-meta-value">{{ formatDateTimeCn(selectedCommand.receivedAt) }}</span>
        </div>
        <div class="coord-meta-cell">
          <span class="coord-meta-label">优先级</span>
          <span class="coord-meta-value high">{{ selectedCommand.priority }}</span>
        </div>
        <div class="coord-meta-cell">
          <span class="coord-meta-label">命令编号</span>
          <span class="coord-meta-value" :title="selectedCommand.commandId">{{ selectedCommand.commandId }}</span>
        </div>
      </div>
    </section>

    <div class="coord-command-content-wrap">
      <div class="coord-section-title">命令详情</div>
      <div class="coord-command-content">{{ selectedCommand.content }}</div>
    </div>

    <footer class="coord-command-actions">
      <div class="coord-command-actions-group">
        <button
          class="coord-btn"
          type="button"
          v-bind="buildCommandActionAttrs('coordination:forward-command', '转发命令')"
          @click="handleForward"
        >
          转发
        </button>
        <button
          class="coord-btn"
          type="button"
          v-bind="buildCommandActionAttrs('coordination:associate-command', '关联命令')"
          @click="emit('open-associate-dialog')"
        >
          关联
        </button>
        <button
          class="coord-btn danger"
          type="button"
          v-bind="buildCommandActionAttrs('coordination:delete-command', '删除命令')"
          @click="openDeleteDialog"
        >
          删除
        </button>
      </div>
      <button
        class="coord-btn primary coord-command-primary"
        type="button"
        :disabled="parsing"
        v-bind="buildCommandActionAttrs('coordination:decompose-command', '执行任务理解')"
        @click="parseSelectedCommand"
      >
        {{ parsing ? '解析中...' : hasAnalysisResult ? '重新任务理解' : '任务理解' }}
      </button>
    </footer>

    <div v-if="deleteDialogVisible" class="coord-dialog-mask" @click.self="closeDeleteDialog">
      <div class="coord-dialog">
        <div class="coord-dialog-title">删除确认</div>
        <div class="coord-dialog-text">
          是否删除当前命令"{{ selectedCommand?.name || '' }}"？删除后会同步清理本地数据库中的该命令及其解析结果。
        </div>
        <div class="coord-dialog-actions">
          <button class="coord-btn coord-mini-btn" type="button" @click="closeDeleteDialog">取消</button>
          <button class="coord-btn danger coord-mini-btn" type="button" @click="confirmDeleteCommand">确定</button>
        </div>
      </div>
    </div>

    <AssociateDialog
      v-model:visible="associateDialogVisible"
      :selected-command="selectedCommand"
      :missions="allMissions"
      :resources="allResources"
      @confirm="({ missionIds, resourceIds }) => handleAssociate(missionIds, resourceIds)"
    />
  </article>

  <article v-else class="coord-panel coord-command-panel coord-command-empty-panel">
    <div class="coord-pane-title">任务理解</div>
    <div class="coord-pane-subtitle">当前没有命令数据，命令概要、命令详情和操作区已自动清空。</div>
  </article>
</template>

<script setup>
import { ref } from 'vue';
import {
  createInteractionActionAttrs,
  createInteractionTargetAttrs,
} from '../../../../shared/interaction/createInteractionTarget';
import AssociateDialog from './AssociateDialog.vue';

const props = defineProps({
  selectedCommand: { type: Object, default: null },
  parsing: { type: Boolean, default: false },
  hasAnalysisResult: { type: Boolean, default: false },
  resolveCommandStatusText: { type: Function, required: true },
  resolveCommandStatusTone: { type: Function, required: true },
  formatDateTimeCn: { type: Function, required: true },
  handleForward: { type: Function, required: true },
  handleAssociate: { type: Function, required: true },
  removeSelectedCommand: { type: Function, required: true },
  parseSelectedCommand: { type: Function, required: true },
  allMissions: { type: Array, default: () => [] },
  allResources: { type: Array, default: () => [] },
});

const emit = defineEmits(['open-associate-dialog']);

const deleteDialogVisible = ref(false);
const associateDialogVisible = ref(false);

const openDeleteDialog = () => {
  if (!props.selectedCommand) return;
  deleteDialogVisible.value = true;
};

const closeDeleteDialog = () => {
  deleteDialogVisible.value = false;
};

const confirmDeleteCommand = () => {
  const deleted = props.removeSelectedCommand();
  if (deleted) {
    closeDeleteDialog();
  }
};

const resolveCommandTargetId = () => `coordination:command:${props.selectedCommand?.commandId || ''}`;

const buildCommandActionAttrs = (actionId, label) => createInteractionActionAttrs({
  actionId,
  label,
  targetId: resolveCommandTargetId(),
});
</script>

<style scoped>
.coord-command-panel, .coord-command-empty-panel { padding: 0.95rem; min-width: 0; }
.coord-command-empty-panel { min-height: 220px; justify-content: center; display: flex; flex-direction: column; }

.coord-command-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.8rem; }
.coord-command-title-main { color: #f7fdff; font-size: 1.22rem; font-weight: 800; line-height: 1.25; letter-spacing: 0.01em; }
.coord-command-head-side { display: inline-flex; align-items: center; flex: 0 0 auto; }
.coord-command-badge-head { padding: 0.22rem 0.62rem; font-size: 0.76rem; border: 1px solid transparent; border-radius: 999px; font-weight: 700; }
.coord-command-badge-head.pending { border-color: rgba(229, 168, 11, 0.36); background: rgba(229, 168, 11, 0.2); color: #ffe28c; }
.coord-command-badge-head.done { border-color: rgba(0, 222, 200, 0.36); background: rgba(0, 222, 200, 0.2); color: #b4fff8; }

.coord-section-title { color: #eefcff; font-size: 1.02rem; font-weight: 800; letter-spacing: 0.01em; }
.coord-overview-wrap { margin-top: 0.72rem; }
.coord-overview-grid { margin-top: 0.4rem; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.5rem; }
.coord-meta-grid { margin-top: 0.5rem; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.55rem; }
.coord-meta-cell { border-radius: 10px; border: 1px solid rgba(0, 206, 186, 0.32); background: rgba(0, 16, 22, 0.7); padding: 0.52rem 0.58rem; min-height: 72px; }
.coord-meta-cell-subject { min-height: 0; padding: 0.5rem 0.58rem; background: rgba(0, 20, 28, 0.72); }
.coord-meta-label { color: rgba(196, 243, 248, 0.96); font-size: 0.86rem; font-weight: 700; letter-spacing: 0.01em; }
.coord-meta-value { display: block; margin-top: 0.26rem; color: #ecfbff; font-size: 0.9rem; font-weight: 700; line-height: 1.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.coord-meta-cell-subject .coord-meta-value { font-size: 1.18rem; color: #00dec8; }
.coord-meta-value.high { color: #ff8f8f; }

.coord-command-content-wrap { margin-top: 0.9rem; padding-top: 0.78rem; border-top: 1px solid rgba(0, 222, 200, 0.16); }
.coord-command-content { margin-top: 0.45rem; border-radius: 10px; border: 1px solid rgba(0, 208, 188, 0.26); background: rgba(0, 16, 22, 0.62); color: #f1feff; line-height: 1.65; padding: 0.7rem; min-height: 120px; white-space: pre-wrap; word-break: break-word; text-indent: 1.5em; font-size: 0.96rem; }

.coord-command-actions { margin-top: 0.78rem; display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; flex-wrap: wrap; padding-top: 0.52rem; border-top: 1px solid rgba(0, 222, 200, 0.16); }
.coord-command-actions-group { display: inline-flex; align-items: center; gap: 0.52rem; flex-wrap: wrap; }
.coord-command-primary { min-width: 132px; }

.coord-btn { min-height: 36px; padding: 0 0.92rem; border-radius: 9px; border: 1px solid rgba(0, 208, 188, 0.26); background: rgba(255, 255, 255, 0.08); color: #f1feff; cursor: pointer; font-size: 0.97rem; font-weight: 700; transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease; }
.coord-btn:hover { border-color: rgba(0, 222, 200, 0.5); box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.12); }
.coord-btn.primary { border-color: rgba(0, 208, 188, 0.4); background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96)); }
.coord-btn.danger { border-color: rgba(243, 98, 98, 0.52); background: linear-gradient(180deg, rgba(143, 54, 54, 0.78), rgba(111, 38, 38, 0.84)); }
.coord-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.coord-mini-btn { min-height: 32px; min-width: 72px; padding: 0 0.66rem; font-size: 0.82rem; font-weight: 600; }

.coord-pane-title { color: #f1feff; font-size: 1.24rem; font-weight: 800; letter-spacing: 0.01em; text-shadow: 0 0 14px rgba(0, 222, 200, 0.16); }
.coord-pane-subtitle { margin-top: 0.38rem; color: rgba(226, 246, 248, 0.86); font-size: 0.98rem; line-height: 1.7; }

.coord-dialog-mask { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: rgba(2, 10, 14, 0.58); backdrop-filter: blur(4px); }
.coord-dialog { width: min(420px, calc(100vw - 32px)); border-radius: 16px; border: 1px solid rgba(0, 208, 188, 0.42); background: linear-gradient(180deg, rgba(0, 213, 192, 0.08), rgba(0, 49, 72, 0.02)), rgba(5, 18, 24, 0.96); box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.06), 0 18px 40px rgba(0, 0, 0, 0.36); padding: 1rem; }
.coord-dialog-title { color: #f1feff; font-size: 1rem; font-weight: 800; }
.coord-dialog-text { margin-top: 0.58rem; color: rgba(226, 246, 248, 0.88); font-size: 0.9rem; line-height: 1.65; }
.coord-dialog-actions { margin-top: 0.82rem; display: flex; justify-content: flex-end; gap: 0.52rem; }

@media (max-width: 1200px) {
  .coord-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .coord-command-header { flex-direction: column; align-items: flex-start; }
  .coord-command-actions { justify-content: flex-start; }
  .coord-meta-grid { grid-template-columns: 1fr; }
}
</style>
