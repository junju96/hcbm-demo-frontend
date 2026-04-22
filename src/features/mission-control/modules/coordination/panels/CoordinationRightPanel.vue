<template>
  <MissionRightPanelShell class="coord-right-shell">
    <template v-if="activeSubviewId === 'task-understanding'">
      <div class="coord-layout">
        <aside class="coord-panel coord-left-pane">
          <div class="coord-pane-title">命令列表</div>
          <div class="coord-command-list">
            <button
              v-for="command in commands"
              :key="command.commandId"
              class="coord-command-item"
              :class="{ active: selectedCommandId === command.commandId }"
              type="button"
              @click="selectedCommandId = command.commandId"
            >
              <div class="coord-command-item-top">
                <span class="coord-command-name">{{ command.name }}</span>
                <span class="coord-command-badge" :class="command.statusTone">{{ command.statusText }}</span>
              </div>
              <div class="coord-command-title">{{ command.title }}</div>
            </button>
          </div>
        </aside>

        <section class="coord-right-pane">
          <article v-if="selectedCommand" class="coord-panel coord-command-panel">
            <header class="coord-command-header">
              <div>
                <div class="coord-pane-title">{{ selectedCommand.name }}</div>
                <div class="coord-pane-subtitle">{{ selectedCommand.title }}</div>
              </div>
            </header>

            <div class="coord-meta-grid">
              <div class="coord-meta-cell">
                <span class="coord-meta-label">发令单位</span>
                <span class="coord-meta-value">{{ selectedCommand.sender }}</span>
              </div>
              <div class="coord-meta-cell">
                <span class="coord-meta-label">接收时间</span>
                <span class="coord-meta-value">{{ selectedCommand.receivedAt }}</span>
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

            <div class="coord-command-content-wrap">
              <div class="coord-meta-label">命令详情</div>
              <div class="coord-command-content">{{ selectedCommand.content }}</div>
            </div>

            <footer class="coord-command-actions">
              <button class="coord-btn" type="button" @click="handleForward">转发</button>
              <button class="coord-btn" type="button" @click="handleAssociate">关联</button>
              <button class="coord-btn danger" type="button" @click="handleDelete">删除</button>
              <button
                class="coord-btn primary"
                type="button"
                :disabled="parsing"
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
                <button
                  class="coord-tab coord-detail-toggle"
                  type="button"
                  :disabled="!hasAnalysisResult"
                  @click="detailsExpanded = !detailsExpanded"
                >
                  {{ detailsExpanded ? '收起详细条目' : '展开详细条目' }}
                </button>
              </div>
            </header>

            <div v-if="!hasAnalysisResult" class="coord-empty-state">
              点击上方“任务理解”后，在这里展示结构化任务与资源列表。
            </div>

            <div v-else class="coord-result-body">
              <div class="coord-result-summary">
                <span>RequestID: {{ selectedAnalysis.response_body.responseID }}</span>
                <span>任务: {{ selectedAnalysis.missions.length }}</span>
                <span>资源: {{ selectedAnalysis.resources.length }}</span>
              </div>

              <div v-if="resultView === 'missions'" class="coord-list">
                <div v-for="mission in selectedAnalysis.missions" :key="mission.mission_id" class="coord-list-row">
                  <div class="coord-list-main">
                    <span class="coord-list-tag">任务 {{ mission.mission_id }}</span>
                    <span class="coord-list-title">{{ mission.mission_name }}</span>
                  </div>
                  <div v-if="detailsExpanded" class="coord-list-detail">{{ mission.mission_detail.content }}</div>
                  <div v-if="detailsExpanded" class="coord-list-sub">区域：{{ mission.mission_detail.target }} ｜ 时间：{{ mission.mission_detail.time }}</div>
                  <div v-if="detailsExpanded" class="coord-list-sub">依赖：{{ formatMissionDependencies(mission.dependencies) }}</div>
                </div>
              </div>

              <div v-else class="coord-list">
                <div v-for="resource in selectedAnalysis.resources" :key="resource.resource_id" class="coord-list-row">
                  <div class="coord-list-main">
                    <span class="coord-list-tag resource">资源 {{ resource.resource_id }}</span>
                    <span class="coord-list-title">{{ resource.resource_name }}</span>
                  </div>
                  <div v-if="detailsExpanded" class="coord-list-detail">类型：{{ resource.resource_type }} ｜ 属性：{{ resource.resource_detail.type }}</div>
                  <div v-if="detailsExpanded" class="coord-list-sub">坐标点：{{ resource.resource_detail.location.length }}</div>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>
    </template>

    <div v-else class="coord-placeholder">
      <div class="coord-pane-title">{{ activeSubviewTitle }}</div>
      <div class="coord-pane-subtitle">当前子面板暂未接入详细界面。</div>
    </div>
  </MissionRightPanelShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import MissionRightPanelShell from '../../../shared/layout/MissionRightPanelShell.vue';
import {
  COORDINATION_API_URLS,
  buildUpdateRequest,
  buildUpdateResponse,
  commandRecords,
  createMockAnalysisByCommand,
} from '../data/commandDataModel';

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

const activeSubviewId = computed(() => props.moduleApi.coordination?.activeSubviewId || 'task-understanding');
const activeSubviewTitle = computed(() => props.moduleApi.coordination?.activeSubviewTitle || '任务理解');
const commands = commandRecords;
const mockAnalysisByCommandId = createMockAnalysisByCommand();

const selectedCommandId = ref(commands[0]?.commandId || '');
const parsing = ref(false);
const resultView = ref('missions');
const detailsExpanded = ref(true);
const analysisResultMap = ref({});

const selectedCommand = computed(() => commands.find((item) => item.commandId === selectedCommandId.value) || null);
const selectedAnalysis = computed(() => analysisResultMap.value[selectedCommandId.value] || null);
const hasAnalysisResult = computed(() => Boolean(selectedAnalysis.value));

const summarizeDependencyGroup = (label, ids = []) => (
  Array.isArray(ids) && ids.length ? `${label}${ids.join(',')}` : ''
);

const formatMissionDependencies = (dependencies = {}) => {
  const parts = [
    summarizeDependencyGroup('命令:', dependencies.commands),
    summarizeDependencyGroup('任务:', dependencies.missions),
    summarizeDependencyGroup('资源:', dependencies.resources),
  ].filter(Boolean);
  return parts.length ? parts.join(' / ') : '无';
};

watch(selectedCommandId, () => {
  resultView.value = 'missions';
});

const handleForward = () => {
  props.moduleApi.chat.appendSystemMessage(`[任务理解] 已转发命令：${selectedCommand.value?.name || ''}`);
  props.moduleApi.chat.open();
};

const handleAssociate = () => {
  const command = selectedCommand.value;
  if (!command) {
    return;
  }
  const selected = selectedAnalysis.value;
  const request = buildUpdateRequest({
    operation: 'associate',
    commandIds: [command.cmd_id],
    missionIds: selected?.missions?.map((item) => item.mission_id) || [],
    resourceIds: selected?.resources?.map((item) => item.resource_id) || [],
  });
  const response = buildUpdateResponse({
    operation: 'associate',
    requestId: request.RequestID,
  });
  props.moduleApi.chat.appendSystemMessage(
    `[任务理解] 已调用 ${COORDINATION_API_URLS.update} 关联命令（RequestID=${request.RequestID}，result=${response.data.result}）。`
  );
  props.moduleApi.chat.open();
};

const handleDelete = () => {
  const command = selectedCommand.value;
  if (!command) {
    return;
  }
  const request = buildUpdateRequest({
    operation: 'delete',
    commandIds: [command.cmd_id],
  });
  const response = buildUpdateResponse({
    operation: 'delete',
    requestId: request.RequestID,
  });
  props.moduleApi.chat.appendSystemMessage(
    `[任务理解] 已调用 ${COORDINATION_API_URLS.update} 删除命令（RequestID=${request.RequestID}，result=${response.data.result}），当前仍为演示模式未真实删除。`
  );
  props.moduleApi.chat.open();
};

const parseSelectedCommand = async () => {
  const command = selectedCommand.value;
  if (!command || parsing.value) {
    return;
  }

  parsing.value = true;
  props.moduleApi.chat.appendSystemMessage(
    `[任务理解] 已发送命令 ${command.commandId} 到 ${COORDINATION_API_URLS.decompose}（当前为假数据模拟）。`
  );

  await new Promise((resolve) => window.setTimeout(resolve, 800));

  analysisResultMap.value = {
    ...analysisResultMap.value,
    [command.commandId]: mockAnalysisByCommandId[command.commandId],
  };

  parsing.value = false;
  resultView.value = 'missions';
  props.moduleApi.chat.appendSystemMessage(
    `[任务理解] 命令 ${command.commandId} 解析完成，共提取 ${mockAnalysisByCommandId[command.commandId].missions.length} 个任务、${mockAnalysisByCommandId[command.commandId].resources.length} 个资源。`
  );
};
</script>

<style scoped>
.coord-right-shell {
  --coord-border: rgba(0, 208, 188, 0.34);
  --coord-border-soft: rgba(0, 208, 188, 0.2);
  --coord-bg: rgba(1, 16, 22, 0.84);
  --coord-bg-strong: rgba(1, 12, 18, 0.92);
  --coord-text: #e8fcff;
  --coord-text-soft: rgba(214, 244, 248, 0.7);
  --coord-accent: #00dec8;
  --coord-accent-soft: rgba(0, 222, 200, 0.12);
  display: flex;
  width: 100%;
  height: auto;
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

.coord-panel,
.coord-placeholder {
  border-radius: 16px;
  border: 1px solid var(--coord-border);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    var(--coord-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05);
}

.coord-left-pane {
  display: flex;
  flex-direction: column;
  padding: 0.9rem;
}

.coord-pane-title {
  color: var(--coord-text);
  font-size: 1.02rem;
  font-weight: 700;
}

.coord-pane-subtitle {
  margin-top: 0.38rem;
  color: var(--coord-text-soft);
  font-size: 0.9rem;
  line-height: 1.65;
}

.coord-command-list {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
  min-height: fit-content;
}

.coord-command-item {
  border-radius: 12px;
  border: 1px solid var(--coord-border-soft);
  border-left: 3px solid rgba(0, 222, 200, 0.36);
  background: var(--coord-bg-strong);
  color: var(--coord-text);
  text-align: left;
  padding: 0.56rem 0.62rem;
  cursor: pointer;
}

.coord-command-item.active {
  border-color: var(--coord-border);
  border-left-color: var(--coord-accent);
  background: linear-gradient(180deg, var(--coord-accent-soft), rgba(0, 49, 72, 0.03)), var(--coord-bg-strong);
}

.coord-command-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.coord-command-name {
  font-weight: 700;
  font-size: 0.86rem;
}

.coord-command-title {
  margin-top: 0.3rem;
  color: rgba(232, 252, 255, 0.8);
  font-size: 0.82rem;
}

.coord-command-badge {
  border-radius: 999px;
  padding: 0.08rem 0.44rem;
  font-size: 0.66rem;
  font-weight: 700;
}

.coord-command-badge.pending {
  background: rgba(229, 168, 11, 0.14);
  color: #ffd56a;
}

.coord-command-badge.done {
  background: rgba(0, 222, 200, 0.16);
  color: #95fff5;
}

.coord-right-pane {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 0;
  min-height: fit-content;
}

.coord-command-panel,
.coord-result-panel {
  padding: 0.95rem;
  min-width: 0;
}

.coord-command-header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
}

.coord-meta-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

.coord-meta-cell {
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.62);
  padding: 0.52rem 0.62rem;
}

.coord-meta-label {
  color: rgba(185, 235, 241, 0.7);
  font-size: 0.74rem;
}

.coord-meta-value {
  display: block;
  margin-top: 0.26rem;
  color: var(--coord-text);
  font-size: 0.84rem;
  font-weight: 600;
}

.coord-meta-value.high {
  color: #ff8f8f;
}

.coord-command-content-wrap {
  margin-top: 0.78rem;
}

.coord-command-content {
  margin-top: 0.45rem;
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.62);
  color: var(--coord-text);
  line-height: 1.65;
  padding: 0.7rem;
  min-height: 120px;
  white-space: pre-wrap;
  word-break: break-word;
  text-indent: 2em;
  font-size: 0.92rem;
}

.coord-command-actions {
  margin-top: 0.74rem;
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.coord-btn,
.coord-tab {
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 9px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(255, 255, 255, 0.05);
  color: var(--coord-text);
  cursor: pointer;
}

.coord-btn.primary {
  border-color: var(--coord-border);
  background: linear-gradient(180deg, rgba(0, 86, 91, 0.36), rgba(0, 42, 43, 0.92));
}

.coord-btn.danger {
  border-color: rgba(216, 27, 27, 0.34);
  background: rgba(109, 46, 46, 0.56);
}

.coord-btn:disabled,
.coord-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.coord-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.coord-tabs {
  display: flex;
  gap: 0.4rem;
}

.coord-tab.active {
  border-color: var(--coord-border);
  background: linear-gradient(180deg, var(--coord-accent-soft), rgba(0, 49, 72, 0.03));
}

.coord-detail-toggle {
  margin-left: 0.15rem;
}

.coord-empty-state {
  margin-top: 0.7rem;
  border-radius: 10px;
  border: 1px dashed var(--coord-border-soft);
  color: var(--coord-text-soft);
  padding: 0.9rem;
}

.coord-result-body {
  margin-top: 0.7rem;
  min-height: fit-content;
}

.coord-result-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  color: rgba(204, 247, 243, 0.85);
  font-size: 0.84rem;
}

.coord-list {
  margin-top: 0.62rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: fit-content;
}

.coord-list-row {
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.62);
  padding: 0.54rem 0.64rem;
}

.coord-list-main {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.coord-list-tag {
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(0, 222, 200, 0.16);
  color: #95fff5;
}

.coord-list-tag.resource {
  background: rgba(116, 219, 74, 0.16);
  color: #c1ffab;
}

.coord-list-title {
  color: var(--coord-text);
  font-weight: 700;
  font-size: 0.95rem;
}

.coord-list-detail,
.coord-list-sub {
  margin-top: 0.3rem;
  color: rgba(223, 246, 248, 0.82);
  line-height: 1.55;
  text-indent: 1.6em;
  font-size: 0.9rem;
}

.coord-list-sub {
  color: var(--coord-text-soft);
}

.coord-placeholder {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
  padding: 1rem;
}

@media (max-width: 1200px) {
  .coord-layout {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .coord-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .coord-layout {
    grid-template-columns: 1fr;
  }

  .coord-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
