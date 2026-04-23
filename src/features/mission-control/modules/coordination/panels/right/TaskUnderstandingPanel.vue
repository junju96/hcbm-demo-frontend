<template>
  <div class="coord-task-shell">
    <div class="coord-layout">
      <aside class="coord-panel coord-left-pane">
        <div class="coord-pane-title">命令列表</div>
        <div class="coord-command-list">
          <button
            v-for="command in commands"
            :key="command.commandId"
            class="coord-command-item"
            :class="{ active: selectedCommandId === command.commandId }"
            v-bind="buildCommandTargetAttrs(command)"
            type="button"
            @click="selectedCommandId = command.commandId"
          >
            <div class="coord-command-item-top">
              <span class="coord-command-name">{{ command.name }}</span>
              <span class="coord-command-badge" :class="resolveCommandStatusTone(command.commandId)">
                {{ resolveCommandStatusText(command.commandId) }}
              </span>
            </div>
            <div class="coord-command-title">{{ command.title }}</div>
          </button>
        </div>
      </aside>

      <section class="coord-right-pane">
        <article v-if="selectedCommand" class="coord-panel coord-command-panel">
          <header class="coord-command-header">
            <div class="coord-command-title-group">
              <div class="coord-command-title-main">{{ selectedCommand.name }}</div>
            </div>
            <div class="coord-command-head-side">
              <span class="coord-command-badge coord-command-badge-head" :class="resolveCommandStatusTone(selectedCommand.commandId)">
                {{ resolveCommandStatusText(selectedCommand.commandId) }}
              </span>
            </div>
          </header>

          <section class="coord-overview-wrap">
            <div class="coord-section-title">命令概要</div>

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
                <span class="coord-meta-value">{{ selectedCommand.commandId }}</span>
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
                @click="handleAssociate"
              >
                关联
              </button>
              <button
                class="coord-btn danger"
                type="button"
                v-bind="buildCommandActionAttrs('coordination:delete-command', '删除命令')"
                @click="handleDelete"
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
        </article>

        <article class="coord-panel coord-result-panel">
          <header class="coord-result-header">
            <div class="coord-pane-title">标准化结果</div>
            <div class="coord-tabs">
              <div class="coord-tabs-group">
                <button
                  class="coord-tab"
                  :class="{ active: resultView === 'missions' }"
                  type="button"
                  :disabled="!hasAnalysisResult"
                  @click="resultView = 'missions'"
                >
                  任务列表
                </button>
                <button
                  class="coord-tab"
                  :class="{ active: resultView === 'resources' }"
                  type="button"
                  :disabled="!hasAnalysisResult"
                  @click="resultView = 'resources'"
                >
                  资源列表
                </button>
              </div>
              <button
                class="coord-tab coord-detail-toggle"
                type="button"
                :disabled="!hasAnalysisResult"
                @click="detailsExpanded = !detailsExpanded"
              >
                {{ detailsExpanded ? '收起面板' : '展开面板' }}
              </button>
            </div>
          </header>

          <div v-if="!hasAnalysisResult" class="coord-empty-state">
            点击上方“任务理解”后，在这里展示结构化任务与资源列表。
          </div>

          <div v-else class="coord-result-body">
            <div class="coord-result-summary">
              <span>请求序号: {{ selectedAnalysis.response_body.responseID }}</span>
              <span>任务: {{ selectedAnalysis.missions.length }}</span>
              <span>资源: {{ selectedAnalysis.resources.length }}</span>
            </div>

            <div v-if="resultView === 'missions'" class="coord-list">
              <div
                v-for="mission in selectedAnalysis.missions"
                :key="mission.mission_id"
                class="coord-list-row"
                :class="{ editing: editingMissionId === mission.mission_id }"
                v-bind="buildMissionTargetAttrs(mission)"
              >
                <div class="coord-mission-row-head">
                  <div class="coord-list-main">
                    <span class="coord-list-tag">任务 {{ mission.mission_id }}</span>
                    <span v-if="editingMissionId !== mission.mission_id" class="coord-list-title">{{ mission.mission_name }}</span>
                  </div>

                  <div class="coord-mission-row-actions">
                    <button
                      v-if="editingMissionId !== mission.mission_id"
                      class="coord-btn coord-mini-btn"
                      type="button"
                      v-bind="buildMissionActionAttrs('coordination:edit-mission', '修改任务', mission)"
                      @click="startEditMission(mission)"
                    >
                      修改
                    </button>
                    <template v-else>
                      <button
                        class="coord-btn primary coord-mini-btn"
                        type="button"
                        v-bind="buildMissionActionAttrs('coordination:save-mission', '保存任务修改', mission)"
                        @click="saveEditMission"
                      >
                        保存
                      </button>
                      <button
                        class="coord-btn coord-mini-btn"
                        type="button"
                        v-bind="buildMissionActionAttrs('coordination:cancel-edit-mission', '取消任务修改', mission)"
                        @click="cancelEditMission"
                      >
                        取消
                      </button>
                    </template>
                  </div>
                </div>

                <template v-if="detailsExpanded || editingMissionId === mission.mission_id">
                  <template v-if="editingMissionId === mission.mission_id">
                    <div class="coord-edit-grid">
                      <label class="coord-edit-row">
                        <span class="coord-edit-label">任务名称</span>
                        <input v-model="missionDraft.mission_name" class="coord-edit-input" type="text" />
                      </label>
                      <label class="coord-edit-row">
                        <span class="coord-edit-label">内容</span>
                        <input v-model="missionDraft.content" class="coord-edit-input" type="text" />
                      </label>
                      <label class="coord-edit-row">
                        <span class="coord-edit-label">任务区域</span>
                        <input v-model="missionDraft.target" class="coord-edit-input" type="text" />
                      </label>
                      <label class="coord-edit-row">
                        <span class="coord-edit-label">开始时间</span>
                        <input v-model="missionDraft.time" class="coord-edit-input" type="text" />
                      </label>
                      <label class="coord-edit-row">
                        <span class="coord-edit-label">结束时间</span>
                        <input v-model="missionDraft.duration" class="coord-edit-input" type="text" />
                      </label>
                    </div>
                  </template>
                  <template v-else>
                    <div class="coord-detail-grid">
                      <div class="coord-detail-item full">
                        <div class="coord-detail-key">内容</div>
                        <div class="coord-detail-text">{{ mission.mission_detail.content }}</div>
                      </div>
                      <div class="coord-detail-item">
                        <div class="coord-detail-key">任务区域</div>
                        <div class="coord-detail-text">{{ mission.mission_detail.target }}</div>
                      </div>
                      <div class="coord-detail-item">
                        <div class="coord-detail-key">开始时间</div>
                        <div class="coord-detail-text">{{ formatDateTimeCn(mission.mission_detail.time) }}</div>
                      </div>
                      <div class="coord-detail-item">
                        <div class="coord-detail-key">结束时间</div>
                        <div class="coord-detail-text">{{ mission.mission_detail.duration }}</div>
                      </div>
                      <div class="coord-detail-item">
                        <div class="coord-detail-key">依赖</div>
                        <div class="coord-detail-text">{{ formatMissionDependencies(mission.dependencies) }}</div>
                      </div>
                    </div>
                  </template>
                </template>
              </div>
            </div>

            <div v-else class="coord-list">
              <div
                v-for="resource in selectedAnalysis.resources"
                :key="resource.resource_id"
                class="coord-list-row"
                v-bind="buildResourceTargetAttrs(resource)"
              >
                <div class="coord-list-main">
                  <span class="coord-list-tag resource">资源 {{ resource.resource_id }}</span>
                  <span class="coord-list-title">{{ resource.resource_name }}</span>
                </div>
                <div v-if="detailsExpanded" class="coord-detail-grid">
                  <div class="coord-detail-item">
                    <div class="coord-detail-key">资源类型</div>
                    <div class="coord-detail-text">{{ resource.resource_type }}</div>
                  </div>
                  <div class="coord-detail-item">
                    <div class="coord-detail-key">区域属性</div>
                    <div class="coord-detail-text">{{ resource.resource_detail.type }}</div>
                  </div>
                  <div class="coord-detail-item">
                    <div class="coord-detail-key">坐标点数</div>
                    <div class="coord-detail-text">{{ resource.resource_detail.location.length }}</div>
                  </div>

                  <div class="coord-point-block">
                    <div class="coord-point-head">
                      <span>点位</span>
                      <span>纬度</span>
                      <span>经度</span>
                      <span>高度</span>
                    </div>
                    <div
                      v-for="point in resource.resource_detail.location"
                      :key="`${resource.resource_id}-${point.point}`"
                      class="coord-point-row"
                    >
                      <span>{{ point.point }}</span>
                      <span>{{ point.latitude }}</span>
                      <span>{{ point.longitude }}</span>
                      <span>{{ point.altitude }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script setup>
import {
  createInteractionActionAttrs,
  createInteractionTargetAttrs,
} from '../../../../shared/interaction/createInteractionTarget';
import { useTaskUnderstandingState } from '../../state/useTaskUnderstandingState';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
  panelDefinition: {
    type: Object,
    default: () => ({}),
  },
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
  handleDelete,
  parseSelectedCommand,
  startEditMission,
  cancelEditMission,
  saveEditMission,
} = useTaskUnderstandingState({ moduleApi: props.moduleApi });

const resolveCommandTargetId = (command) => `coordination:command:${command?.commandId || ''}`;
const resolveMissionTargetId = (mission) => `coordination:mission:${mission?.mission_id || ''}`;
const resolveResourceTargetId = (resource) => `coordination:resource:${resource?.resource_id || ''}`;

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

const buildCommandActionAttrs = (actionId, label) => createInteractionActionAttrs({
  actionId,
  label,
  targetId: resolveCommandTargetId(selectedCommand.value),
});

const buildMissionTargetAttrs = (mission) => createInteractionTargetAttrs({
  targetId: resolveMissionTargetId(mission),
  targetType: 'mission-item',
  label: mission?.mission_name || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'TaskUnderstandingPanel',
  textPreview: mission?.mission_detail?.content || '',
  actions: ['coordination:edit-mission', 'coordination:save-mission', 'coordination:cancel-edit-mission'],
});

const buildMissionActionAttrs = (actionId, label, mission) => createInteractionActionAttrs({
  actionId,
  label,
  targetId: resolveMissionTargetId(mission),
});

const buildResourceTargetAttrs = (resource) => createInteractionTargetAttrs({
  targetId: resolveResourceTargetId(resource),
  targetType: 'resource-item',
  label: resource?.resource_name || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'TaskUnderstandingPanel',
  textPreview: resource?.resource_type || '',
});
</script>

<style scoped>
.coord-task-shell {
  --coord-border: rgba(0, 208, 188, 0.4);
  --coord-border-soft: rgba(0, 208, 188, 0.26);
  --coord-bg: rgba(1, 16, 22, 0.84);
  --coord-bg-strong: rgba(1, 12, 18, 0.92);
  --coord-text: #f1feff;
  --coord-text-soft: rgba(226, 246, 248, 0.86);
  --coord-accent: #00dec8;
  --coord-accent-soft: rgba(0, 222, 200, 0.12);
  display: flex;
  width: 100%;
  min-height: 100%;
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
.coord-command-item { border-radius: 12px; border: 1px solid var(--coord-border-soft); border-left: 3px solid rgba(0, 222, 200, 0.36); background: var(--coord-bg-strong); color: var(--coord-text); text-align: left; padding: 0.66rem 0.72rem; cursor: pointer; transition: border-color 160ms ease, background 160ms ease, transform 160ms ease; }
.coord-command-item.active { border-color: var(--coord-border); border-left-color: var(--coord-accent); background: linear-gradient(180deg, var(--coord-accent-soft), rgba(0, 49, 72, 0.03)), var(--coord-bg-strong); }
.coord-command-item:hover { border-color: rgba(0, 222, 200, 0.42); transform: translateY(-1px); }
.coord-command-item-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.coord-command-name { font-weight: 700; font-size: 0.96rem; }
.coord-command-title { margin-top: 0.38rem; color: rgba(236, 252, 255, 0.92); font-size: 0.9rem; line-height: 1.45; }
.coord-command-badge { border-radius: 999px; padding: 0.16rem 0.56rem; font-size: 0.74rem; font-weight: 700; }
.coord-command-badge.pending { background: rgba(229, 168, 11, 0.2); color: #ffe28c; }
.coord-command-badge.done { background: rgba(0, 222, 200, 0.2); color: #b4fff8; }

.coord-right-pane { display: flex; flex-direction: column; gap: 0.8rem; min-width: 0; min-height: fit-content; }
.coord-command-panel, .coord-result-panel { padding: 0.95rem; min-width: 0; }

.coord-command-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.8rem; }
.coord-command-title-main { color: #f7fdff; font-size: 1.22rem; font-weight: 800; line-height: 1.25; letter-spacing: 0.01em; }
.coord-command-head-side { display: inline-flex; align-items: center; flex: 0 0 auto; }
.coord-command-badge-head { padding: 0.22rem 0.62rem; font-size: 0.76rem; border: 1px solid transparent; }
.coord-command-badge-head.pending { border-color: rgba(229, 168, 11, 0.36); }
.coord-command-badge-head.done { border-color: rgba(0, 222, 200, 0.36); }

.coord-section-title { color: #eefcff; font-size: 1.02rem; font-weight: 800; letter-spacing: 0.01em; }
.coord-overview-wrap { margin-top: 0.72rem; }
.coord-overview-grid { margin-top: 0.4rem; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.5rem; }
.coord-meta-grid { margin-top: 0.5rem; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.55rem; }
.coord-meta-cell { border-radius: 10px; border: 1px solid rgba(0, 206, 186, 0.32); background: rgba(0, 16, 22, 0.7); padding: 0.52rem 0.58rem; min-height: 92px; }
.coord-meta-cell-subject { min-height: 0; padding: 0.5rem 0.58rem; background: rgba(0, 20, 28, 0.72); }
.coord-meta-label { color: rgba(196, 243, 248, 0.96); font-size: 0.86rem; font-weight: 700; letter-spacing: 0.01em; }
.coord-meta-value { display: block; margin-top: 0.26rem; color: #ecfbff; font-size: 0.9rem; font-weight: 700; line-height: 1.45; }
.coord-meta-cell-subject .coord-meta-value { font-size: 1rem; }
.coord-meta-value.high { color: #ff8f8f; }

.coord-command-content-wrap { margin-top: 0.9rem; padding-top: 0.78rem; border-top: 1px solid rgba(0, 222, 200, 0.16); }
.coord-command-content { margin-top: 0.45rem; border-radius: 10px; border: 1px solid var(--coord-border-soft); background: rgba(0, 16, 22, 0.62); color: var(--coord-text); line-height: 1.65; padding: 0.7rem; min-height: 120px; white-space: pre-wrap; word-break: break-word; text-indent: 1.5em; font-size: 0.96rem; }

.coord-command-actions { margin-top: 0.78rem; display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; flex-wrap: wrap; padding-top: 0.52rem; border-top: 1px solid rgba(0, 222, 200, 0.16); }
.coord-command-actions-group { display: inline-flex; align-items: center; gap: 0.52rem; flex-wrap: wrap; }
.coord-command-primary { min-width: 132px; }

.coord-btn, .coord-tab { min-height: 36px; padding: 0 0.92rem; border-radius: 9px; border: 1px solid var(--coord-border-soft); background: rgba(255, 255, 255, 0.08); color: var(--coord-text); cursor: pointer; font-size: 0.97rem; font-weight: 700; transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease; }
.coord-btn:hover, .coord-tab:hover { border-color: rgba(0, 222, 200, 0.5); box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.12); }
.coord-btn.primary { border-color: var(--coord-border); background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96)); }
.coord-btn.danger { border-color: rgba(243, 98, 98, 0.52); background: linear-gradient(180deg, rgba(143, 54, 54, 0.78), rgba(111, 38, 38, 0.84)); }
.coord-btn:disabled, .coord-tab:disabled { opacity: 0.5; cursor: not-allowed; }

.coord-result-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
.coord-tabs { display: flex; gap: 0; align-items: center; flex-wrap: wrap; }
.coord-tabs-group { display: inline-flex; align-items: center; gap: 0.42rem; }
.coord-tab.active { border-color: rgba(0, 236, 212, 0.9); background: linear-gradient(180deg, rgba(0, 236, 212, 0.28), rgba(0, 130, 149, 0.34)); color: #fff; box-shadow: inset 0 0 0 1px rgba(170, 255, 247, 0.42), 0 0 0 2px rgba(0, 236, 212, 0.18), 0 8px 18px rgba(0, 186, 173, 0.18); transform: translateY(-1px); }
.coord-detail-toggle { margin-left: 1.5rem; min-height: 34px; padding: 0.4rem 0.72rem; border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.22); background: rgba(10, 18, 22, 0.88); color: #f8fafc; font-size: 0.78rem; font-weight: 700; line-height: 1.2; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18); }
.coord-detail-toggle:hover { border-color: rgba(0, 222, 200, 0.34); background: rgba(12, 24, 30, 0.9); box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2); }

.coord-empty-state { margin-top: 0.7rem; border-radius: 10px; border: 1px dashed var(--coord-border-soft); color: var(--coord-text-soft); padding: 0.9rem; }
.coord-result-body { margin-top: 0.7rem; min-height: fit-content; }
.coord-result-summary { display: flex; flex-wrap: wrap; gap: 0.65rem; color: rgba(204, 247, 243, 0.85); font-size: 0.86rem; }
.coord-result-summary span { border-radius: 999px; border: 1px solid rgba(0, 222, 200, 0.28); background: rgba(0, 222, 200, 0.09); color: #c8fffa; padding: 0.16rem 0.58rem; font-weight: 700; }

.coord-list { margin-top: 0.62rem; display: flex; flex-direction: column; gap: 0.72rem; min-height: fit-content; }
.coord-list-row { position: relative; border-radius: 10px; border: 1px solid rgba(0, 208, 188, 0.32); background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68); padding: 0.54rem 0.64rem; box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 6px 14px rgba(0, 0, 0, 0.16); }
.coord-list-row:nth-child(even) { background: linear-gradient(180deg, rgba(0, 222, 200, 0.03), rgba(0, 222, 200, 0.01)), rgba(1, 14, 20, 0.72); }
.coord-list-row + .coord-list-row::before { content: ''; position: absolute; top: -0.42rem; left: 0.62rem; right: 0.62rem; height: 1px; background: linear-gradient(90deg, rgba(0, 222, 200, 0), rgba(0, 222, 200, 0.34) 18%, rgba(0, 222, 200, 0.34) 82%, rgba(0, 222, 200, 0)); }
.coord-list-row.editing { border-color: rgba(0, 222, 200, 0.42); background: linear-gradient(180deg, rgba(0, 222, 200, 0.12), rgba(0, 222, 200, 0.05)), rgba(6, 24, 28, 0.86); box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.14); }

.coord-list-main { display: flex; align-items: center; gap: 0.34rem; min-width: 0; }
.coord-list-tag { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 0.1rem 0.46rem; font-size: 0.8rem; min-height: 25px; line-height: 1.2; font-weight: 700; background: rgba(0, 222, 200, 0.16); color: #95fff5; }
.coord-list-tag.resource { background: rgba(116, 219, 74, 0.16); color: #c1ffab; }
.coord-list-title { color: var(--coord-text); font-weight: 700; font-size: 0.92rem; line-height: 1.4; }

.coord-detail-grid { margin-top: 0.42rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.46rem; }
.coord-detail-item { border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.22); background: rgba(2, 20, 27, 0.68); padding: 0.44rem 0.52rem; }
.coord-detail-item.full { grid-column: 1 / -1; }
.coord-detail-key { color: rgba(153, 218, 227, 0.92); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em; }
.coord-detail-text { margin-top: 0.2rem; color: rgba(241, 254, 255, 0.98); font-size: 0.9rem; line-height: 1.5; word-break: break-word; font-weight: 650; }

.coord-point-block { margin-top: 0.1rem; grid-column: 1 / -1; border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.24); background: rgba(2, 18, 26, 0.62); overflow: hidden; }
.coord-point-head, .coord-point-row { display: grid; grid-template-columns: 1.15fr 1fr 1fr 0.8fr; gap: 0.5rem; align-items: center; padding: 0.46rem 0.56rem; }
.coord-point-head { background: rgba(0, 222, 200, 0.1); color: #b9fffa; font-size: 0.78rem; font-weight: 700; }
.coord-point-row { border-top: 1px solid rgba(0, 222, 200, 0.12); color: rgba(227, 248, 251, 0.92); font-size: 0.84rem; }

.coord-mission-row-head { display: flex; align-items: center; justify-content: space-between; gap: 0.65rem; }
.coord-mission-row-actions { display: inline-flex; align-items: center; gap: 0.45rem; flex: 0 0 auto; }
.coord-mini-btn { min-height: 32px; min-width: 72px; padding: 0 0.66rem; font-size: 0.82rem; font-weight: 600; }
.coord-edit-grid { margin-top: 0.38rem; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.48rem; }
.coord-edit-row { display: grid; grid-template-columns: 88px minmax(0, 1fr); align-items: center; gap: 0.5rem; }
.coord-edit-label { color: rgba(182, 255, 252, 0.88); font-size: 0.82rem; font-weight: 600; }
.coord-edit-input { width: 100%; min-height: 36px; border-radius: 8px; border: 1px solid rgba(0, 222, 200, 0.34); background: rgba(7, 30, 34, 0.52); color: var(--coord-text); padding: 0 0.66rem; font-size: 0.9rem; font-weight: 600; }
.coord-edit-input:focus { outline: none; border-color: rgba(0, 222, 200, 0.68); box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.18); }

.coord-result-panel .coord-tab { min-height: 34px; font-size: 0.88rem; font-weight: 700; padding: 0 0.82rem; }
.coord-result-panel .coord-detail-toggle { min-height: 34px; font-size: 0.78rem; }

@media (max-width: 1200px) {
  .coord-layout { grid-template-columns: 220px minmax(0, 1fr); }
  .coord-command-title-main { font-size: 1.18rem; }
  .coord-meta-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 900px) {
  .coord-layout { grid-template-columns: 1fr; }
  .coord-detail-grid { grid-template-columns: 1fr; }
  .coord-command-header { flex-direction: column; align-items: flex-start; }
  .coord-command-actions { justify-content: flex-start; }
  .coord-meta-grid { grid-template-columns: 1fr; }
}
</style>
