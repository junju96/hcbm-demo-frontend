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
                  <div class="coord-list-detail">{{ mission.mission_detail.content }}</div>
                  <div class="coord-list-sub">区域：{{ mission.mission_detail.target }} ｜ 时间：{{ mission.mission_detail.time }}</div>
                </div>
              </div>

              <div v-else class="coord-list">
                <div v-for="resource in selectedAnalysis.resources" :key="resource.resource_id" class="coord-list-row">
                  <div class="coord-list-main">
                    <span class="coord-list-tag resource">资源 {{ resource.resource_id }}</span>
                    <span class="coord-list-title">{{ resource.resource_name }}</span>
                  </div>
                  <div class="coord-list-detail">类型：{{ resource.resource_type }} ｜ 属性：{{ resource.resource_detail.type }}</div>
                  <div class="coord-list-sub">坐标点：{{ resource.resource_detail.location.length }}</div>
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

const commands = [
  {
    commandId: 'CMD-20260401-001',
    name: '命令 1',
    title: '进攻战斗命令',
    sender: '上级指挥中心',
    receivedAt: '2026-03-29 08:30:00',
    priority: '高',
    statusText: '已处理',
    statusTone: 'done',
    content: 'D方在东部10km外设立了一个重要J事目标，请立即对该目标进行ZC确认，于2026年4月1日18:00查明该区域。主要任务为：1. 立即集结，进行战前准备。2. 根据Q报部门提供的坐标，J事目标所在区域为A。3. 利用隐蔽手段接近目标，在区域B实施ZC。4. ZC结束后，迅速撤离战场，返回基地。',
  },
  {
    commandId: 'CMD-20260401-002',
    name: '命令 2',
    title: '目标打击指令',
    sender: '联合火力中心',
    receivedAt: '2026-03-29 09:15:00',
    priority: '高',
    statusText: '待理解',
    statusTone: 'pending',
    content: '对重点目标进行持续侦察与打击窗口准备。完成区域A态势确认后，组织前出至区域B隐蔽集结，做好打击引导与撤收准备。',
  },
  {
    commandId: 'CMD-20260401-003',
    name: '命令 3',
    title: '区域封控命令',
    sender: '战区联控组',
    receivedAt: '2026-03-29 10:00:00',
    priority: '中',
    statusText: '待理解',
    statusTone: 'pending',
    content: '组织分队对区域C执行阶段性封控，建立巡检点位，保持通信回传，配合主任务保障行动。',
  },
];

const mockAnalysisByCommandId = {
  'CMD-20260401-001': {
    request_body: {
      RequestType: 'DECOMPOSE',
      RequestID: '87654321',
      RequestData: { CommandID: 'CMD-20260401-001' },
    },
    response_body: {
      code: 200,
      responseID: '87654321',
      data: {
        commandId: 'CMD-20260401-001',
        Analys_results: {
          mission_info: [1, 2, 3],
          resource_info: [1, 2],
        },
      },
    },
    missions: [
      {
        mission_id: 1,
        mission_name: '区域侦察命令-机动任务',
        mission_type: 'MANEUVER_TASK',
        mission_detail: {
          content: '利用隐蔽手段，机动到B区域',
          description: '利用隐蔽手段，机动到B区域，确认目标事J事目标',
          target: '区域B',
          time: '2026-03-30 18:00:00',
          duration: '待定',
        },
      },
      {
        mission_id: 2,
        mission_name: '区域侦察命令-侦查任务',
        mission_type: 'RECON_TASK',
        mission_detail: {
          content: '侦查区域B',
          description: '侦查区域B，确认目标事J事目标',
          target: '区域B',
          time: '2026-03-30 18:00:00',
          duration: '待定',
        },
      },
      {
        mission_id: 3,
        mission_name: '区域侦察命令-撤离任务',
        mission_type: 'MANEUVER_TASK',
        mission_detail: {
          content: '迅速撤离战场，返回基地',
          description: 'ZC结束后，迅速撤离战场，返回基地',
          target: '基地',
          time: '2026-03-30 18:00:00',
          duration: '待定',
        },
      },
    ],
    resources: [
      {
        resource_id: 1,
        resource_name: '区域A',
        resource_type: 'REGION',
        resource_detail: {
          type: 'neutral',
          location: [
            { point: 'region_point_1', latitude: '115.704931', longitude: '40.281571', altitude: '2.123' },
            { point: 'region_point_2', latitude: '114.704931', longitude: '41.281571', altitude: '3.123' },
          ],
        },
      },
      {
        resource_id: 2,
        resource_name: '区域B',
        resource_type: 'REGION',
        resource_detail: {
          type: 'neutral',
          location: [
            { point: 'region_point_1', latitude: '115.708035', longitude: '40.287294', altitude: '3.427' },
            { point: 'region_point_2', latitude: '114.708925', longitude: '41.287294', altitude: '3.427' },
          ],
        },
      },
    ],
  },
  'CMD-20260401-002': {
    request_body: {
      RequestType: 'DECOMPOSE',
      RequestID: '87654322',
      RequestData: { CommandID: 'CMD-20260401-002' },
    },
    response_body: {
      code: 200,
      responseID: '87654322',
      data: {
        commandId: 'CMD-20260401-002',
        Analys_results: {
          mission_info: [1, 2],
          resource_info: [1],
        },
      },
    },
    missions: [
      {
        mission_id: 1,
        mission_name: '目标打击指令-侦察确认任务',
        mission_type: 'RECON_TASK',
        mission_detail: {
          content: '完成区域A态势确认',
          description: '对重点目标进行持续侦察，确认区域A目标态势',
          target: '区域A',
          time: '2026-03-29 10:00:00',
          duration: '00:30:00',
        },
      },
      {
        mission_id: 2,
        mission_name: '目标打击指令-隐蔽集结任务',
        mission_type: 'MANEUVER_TASK',
        mission_detail: {
          content: '前出至区域B隐蔽集结',
          description: '组织力量前出至区域B，做好打击引导与撤收准备',
          target: '区域B',
          time: '2026-03-29 11:00:00',
          duration: '待定',
        },
      },
    ],
    resources: [
      {
        resource_id: 1,
        resource_name: '区域A',
        resource_type: 'REGION',
        resource_detail: {
          type: 'enemy',
          location: [
            { point: 'region_point_1', latitude: '115.800001', longitude: '40.300001', altitude: '5.100' },
            { point: 'region_point_2', latitude: '115.820001', longitude: '40.310001', altitude: '5.120' },
          ],
        },
      },
    ],
  },
  'CMD-20260401-003': {
    request_body: {
      RequestType: 'DECOMPOSE',
      RequestID: '87654323',
      RequestData: { CommandID: 'CMD-20260401-003' },
    },
    response_body: {
      code: 200,
      responseID: '87654323',
      data: {
        commandId: 'CMD-20260401-003',
        Analys_results: {
          mission_info: [1],
          resource_info: [1],
        },
      },
    },
    missions: [
      {
        mission_id: 1,
        mission_name: '区域封控命令-巡检任务',
        mission_type: 'PATROL_TASK',
        mission_detail: {
          content: '建立巡检点位并执行阶段巡检',
          description: '组织分队对区域C执行阶段封控并巡检',
          target: '区域C',
          time: '2026-03-29 12:00:00',
          duration: '02:00:00',
        },
      },
    ],
    resources: [
      {
        resource_id: 1,
        resource_name: '区域C',
        resource_type: 'REGION',
        resource_detail: {
          type: 'neutral',
          location: [{ point: 'region_point_1', latitude: '115.910001', longitude: '40.110001', altitude: '2.200' }],
        },
      },
    ],
  },
};

const selectedCommandId = ref(commands[0]?.commandId || '');
const parsing = ref(false);
const resultView = ref('missions');
const analysisResultMap = ref({});

const selectedCommand = computed(() => commands.find((item) => item.commandId === selectedCommandId.value) || null);
const selectedAnalysis = computed(() => analysisResultMap.value[selectedCommandId.value] || null);
const hasAnalysisResult = computed(() => Boolean(selectedAnalysis.value));

watch(selectedCommandId, () => {
  resultView.value = 'missions';
});

const handleForward = () => {
  props.moduleApi.chat.appendSystemMessage(`[任务理解] 已转发命令：${selectedCommand.value?.name || ''}`);
  props.moduleApi.chat.open();
};

const handleAssociate = () => {
  props.moduleApi.chat.appendSystemMessage(`[任务理解] 已关联命令：${selectedCommand.value?.name || ''}`);
  props.moduleApi.chat.open();
};

const handleDelete = () => {
  props.moduleApi.chat.appendSystemMessage(`[任务理解] 删除操作仅做演示，未真正删除：${selectedCommand.value?.name || ''}`);
  props.moduleApi.chat.open();
};

const parseSelectedCommand = async () => {
  const command = selectedCommand.value;
  if (!command || parsing.value) {
    return;
  }

  parsing.value = true;
  props.moduleApi.chat.appendSystemMessage(`[任务理解] 已发送命令 ${command.commandId} 到后端解析（当前为假数据模拟）。`);

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
  font-size: 1.05rem;
  font-weight: 700;
}

.coord-pane-subtitle {
  margin-top: 0.38rem;
  color: var(--coord-text-soft);
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
  padding: 0.72rem 0.76rem;
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
}

.coord-command-title {
  margin-top: 0.45rem;
  color: rgba(232, 252, 255, 0.84);
  font-size: 0.9rem;
}

.coord-command-badge {
  border-radius: 999px;
  padding: 0.16rem 0.54rem;
  font-size: 0.72rem;
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
  font-size: 0.76rem;
}

.coord-meta-value {
  display: block;
  margin-top: 0.26rem;
  color: var(--coord-text);
  font-size: 0.87rem;
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
}

.coord-tabs {
  display: flex;
  gap: 0.4rem;
}

.coord-tab.active {
  border-color: var(--coord-border);
  background: linear-gradient(180deg, var(--coord-accent-soft), rgba(0, 49, 72, 0.03));
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
  font-size: 0.82rem;
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
  padding: 0.58rem 0.68rem;
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
}

.coord-list-detail,
.coord-list-sub {
  margin-top: 0.3rem;
  color: rgba(223, 246, 248, 0.82);
  line-height: 1.55;
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
