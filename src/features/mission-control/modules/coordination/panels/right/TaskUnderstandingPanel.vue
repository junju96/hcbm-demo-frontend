<template>
  <div class="coord-task-shell">
    <div class="coord-layout">
      <aside class="coord-panel coord-left-pane">
        <div class="coord-pane-title">命令列表</div>
        <TransitionGroup
          v-if="commands.length"
          name="command-list"
          tag="div"
          class="coord-command-list"
        >
          <button
            v-for="(command, index) in commands"
            :key="command.commandId"
            class="coord-command-item"
            :class="{ active: selectedCommandId === command.commandId }"
            :style="{ '--stagger-index': index }"
            v-bind="buildCommandTargetAttrs(command)"
            type="button"
            @click="selectedCommandId = command.commandId"
          >
            <div class="coord-command-item-top">
              <span class="coord-command-name">{{ command.name }}</span>
              <span
                class="coord-command-badge"
                :class="resolveCommandStatusTone(command.commandId)"
                :title="resolveCommandStatusText(command.commandId) === '已处理' ? '该命令已完成任务理解并提取结构化数据' : '该命令尚未执行任务理解'"
              >
                {{ resolveCommandStatusText(command.commandId) }}
              </span>
            </div>
            <div class="coord-command-title">{{ command.title }}</div>
          </button>
        </TransitionGroup>
        <div v-else class="coord-empty-state coord-left-empty-state">
          当前没有可展示的命令，请等待新命令下发或重新初始化数据。
        </div>
      </aside>

      <section class="coord-right-pane">
        <CommandDetailSection
          :selected-command="selectedCommand"
          :parsing="parsing"
          :has-analysis-result="hasAnalysisResult"
          :resolve-command-status-text="resolveCommandStatusText"
          :resolve-command-status-tone="resolveCommandStatusTone"
          :format-date-time-cn="formatDateTimeCn"
          :handle-forward="handleForward"
          :handle-associate="handleAssociate"
          :remove-selected-command="removeSelectedCommand"
          :parse-selected-command="parseSelectedCommand"
          :all-missions="allMissions"
          :all-resources="allResources"
          @open-associate-dialog="associateDialogVisible = true"
        />

        <AssociateDialog
          v-model:visible="associateDialogVisible"
          :selected-command="selectedCommand"
          :missions="allMissions"
          :resources="allResources"
          @confirm="({ missionIds, resourceIds }) => handleAssociate(missionIds, resourceIds)"
        />

        <AnalysisResultPanel
          :commands="commands"
          :result-view="resultView"
          :details-expanded="detailsExpanded"
          :has-analysis-result="hasAnalysisResult"
          :selected-analysis="selectedAnalysis"
          :editing-mission-id="editingMissionId"
          :mission-draft="missionDraft"
          :format-date-time-cn="formatDateTimeCn"
          :format-mission-dependencies="formatMissionDependencies"
          :start-edit-mission="startEditMission"
          :cancel-edit-mission="cancelEditMission"
          :save-edit-mission="saveEditMission"
          @update:result-view="resultView = $event"
          @update:details-expanded="detailsExpanded = $event"
        />
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import {
  createInteractionTargetAttrs,
} from '../../../../shared/interaction/createInteractionTarget';
import { useTaskUnderstandingState } from '../../state/useTaskUnderstandingState';
import CommandDetailSection from './CommandDetailSection.vue';
import AnalysisResultPanel from './AnalysisResultPanel.vue';
import AssociateDialog from './AssociateDialog.vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
});

const {
  commands,
  selectedCommandId,
  parsing,
  resultView,
  detailsExpanded,
  editingMissionId,
  missionDraft,
  selectedCommand,
  selectedAnalysis,
  hasAnalysisResult,
  resolveCommandStatusText,
  resolveCommandStatusTone,
  formatDateTimeCn,
  formatMissionDependencies,
  handleForward,
  handleAssociate,
  removeSelectedCommand,
  parseSelectedCommand,
  allMissions,
  allResources,
  startEditMission,
  cancelEditMission,
  saveEditMission,
} = useTaskUnderstandingState({ moduleApi: props.moduleApi });

const associateDialogVisible = ref(false);

const resolveCommandTargetId = (command) => `coordination:command:${command?.commandId || ''}`;

const buildCommandTargetAttrs = (command) => createInteractionTargetAttrs({
  targetId: resolveCommandTargetId(command),
  targetType: 'command-item',
  label: command?.name || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'TaskUnderstandingPanel',
  textPreview: command?.title || '',
  actions: [
    'coordination:forward-command',
    'coordination:associate-command',
    'coordination:delete-command',
    'coordination:decompose-command',
  ],
});
</script>

<style>
.coord-task-shell {
  --coord-border: rgba(0, 208, 188, 0.4);
  --coord-border-soft: rgba(0, 208, 188, 0.26);
  --coord-bg: rgba(1, 16, 22, 0.84);
  --coord-bg-strong: rgba(1, 12, 18, 0.92);
  --coord-text: #f1feff;
  --coord-text-soft: rgba(226, 246, 248, 0.86);
  --coord-accent: #00dec8;
  --coord-accent-soft: rgba(0, 222, 200, 0.12);
}
</style>

<style scoped>
.coord-task-shell {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  color: var(--coord-text);
}

.coord-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 0.8rem;
  width: 100%;
  min-height: fit-content;
  align-items: start;
}

.coord-panel {
  border-radius: 16px;
  border: 1px solid var(--coord-border);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    var(--coord-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05);
}

.coord-left-pane { display: flex; flex-direction: column; padding: 0.9rem; }
.coord-pane-title { color: var(--coord-text); font-size: 1.24rem; font-weight: 800; letter-spacing: 0.01em; text-shadow: 0 0 14px rgba(0, 222, 200, 0.16); }
.coord-command-list { margin-top: 0.8rem; display: flex; flex-direction: column; gap: 0.62rem; min-height: fit-content; }
.coord-left-empty-state { margin-top: 0.8rem; }
.coord-command-item { border-radius: 12px; border: 1px solid var(--coord-border-soft); border-left: 3px solid rgba(0, 222, 200, 0.36); background: var(--coord-bg-strong); color: var(--coord-text); text-align: left; padding: 0.66rem 0.72rem; cursor: pointer; transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.coord-command-item.active { border-color: var(--coord-border); border-left-color: var(--coord-accent); background: linear-gradient(180deg, var(--coord-accent-soft), rgba(0, 49, 72, 0.03)), var(--coord-bg-strong); }
.coord-command-item:hover { border-color: rgba(0, 222, 200, 0.5); transform: translateY(-2px); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 222, 200, 0.1); }

/* 命令列表 stagger 动画 */
.command-list-enter-active {
  transition: opacity 220ms ease, transform 220ms ease;
  transition-delay: calc(min(var(--stagger-index, 0), 12) * 35ms);
}
.command-list-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.command-list-leave-active {
  transition: opacity 160ms ease;
}
.command-list-leave-to {
  opacity: 0;
}
.coord-command-item-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.coord-command-name { font-weight: 700; font-size: 0.96rem; }
.coord-command-title { margin-top: 0.38rem; color: rgba(236, 252, 255, 0.92); font-size: 0.9rem; line-height: 1.45; }
.coord-command-badge { border-radius: 999px; padding: 0.16rem 0.56rem; font-size: 0.74rem; font-weight: 700; }
.coord-command-badge.pending { background: rgba(229, 168, 11, 0.2); color: #ffe28c; }
.coord-command-badge.done { background: rgba(0, 222, 200, 0.2); color: #b4fff8; }

.coord-right-pane { display: flex; flex-direction: column; gap: 0.8rem; min-width: 0; min-height: fit-content; }

.coord-empty-state { margin-top: 0.7rem; border-radius: 10px; border: 1px dashed var(--coord-border-soft); color: var(--coord-text-soft); padding: 0.9rem; }

@media (max-width: 1200px) {
  .coord-layout { grid-template-columns: 220px minmax(0, 1fr); }
}
@media (max-width: 900px) {
  .coord-layout { grid-template-columns: 1fr; }
}
</style>
