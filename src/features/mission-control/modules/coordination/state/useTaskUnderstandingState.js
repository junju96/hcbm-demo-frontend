import { computed, ref, watch } from 'vue';
import {
  COORDINATION_API_URLS,
  buildUpdateRequest,
  buildUpdateResponse,
  commandRecords,
  createMockAnalysisByCommand,
} from '../data/commandDataModel';

export function useTaskUnderstandingState({ moduleApi }) {
  const commands = commandRecords;
  const mockAnalysisByCommandId = createMockAnalysisByCommand();

  const selectedCommandId = ref(commands[0]?.commandId || '');
  const parsing = ref(false);
  const resultView = ref('missions');
  const detailsExpanded = ref(true);
  const analysisResultMap = ref({});
  const editingMissionId = ref(null);
  const missionDraft = ref({
    mission_name: '',
    content: '',
    target: '',
    time: '',
    duration: '',
  });

  const selectedCommand = computed(() => commands.find((item) => item.commandId === selectedCommandId.value) || null);
  const selectedAnalysis = computed(() => analysisResultMap.value[selectedCommandId.value] || null);
  const hasAnalysisResult = computed(() => Boolean(selectedAnalysis.value));

  const hasDecomposeExecuted = (commandId) => Boolean(analysisResultMap.value?.[commandId]);
  const resolveCommandStatusText = (commandId) => (hasDecomposeExecuted(commandId) ? '已处理' : '待理解');
  const resolveCommandStatusTone = (commandId) => (hasDecomposeExecuted(commandId) ? 'done' : 'pending');

  const formatMissionDependencies = (dependencies = {}) => {
    const mapGroup = (label, ids = []) => (
      Array.isArray(ids) ? ids.filter((id) => id !== null && id !== undefined).map((id) => `${label}${id}`) : []
    );

    const items = [
      ...mapGroup('命令', dependencies.commands),
      ...mapGroup('任务', dependencies.missions),
      ...mapGroup('资源', dependencies.resources),
      ...mapGroup('方案', dependencies.plans),
      ...mapGroup('临机方案', dependencies.instant_plans),
    ];

    return items.length ? items.join('，') : '无';
  };

  watch(selectedCommandId, () => {
    resultView.value = 'missions';
    editingMissionId.value = null;
  });

  watch(resultView, (view) => {
    if (view !== 'missions') {
      editingMissionId.value = null;
    }
  });

  const handleForward = () => {
    moduleApi.chat.appendSystemMessage(`[任务理解] 已转发命令：${selectedCommand.value?.name || ''}`);
    moduleApi.chat.open();
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
    moduleApi.chat.appendSystemMessage(
      `[任务理解] 已调用 ${COORDINATION_API_URLS.update} 关联命令（RequestID=${request.RequestID}，result=${response.data.result}）。`
    );
    moduleApi.chat.open();
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
    moduleApi.chat.appendSystemMessage(
      `[任务理解] 已调用 ${COORDINATION_API_URLS.update} 删除命令（RequestID=${request.RequestID}，result=${response.data.result}），当前仍为演示模式未真实删除。`
    );
    moduleApi.chat.open();
  };

  const parseSelectedCommand = async () => {
    const command = selectedCommand.value;
    if (!command || parsing.value) {
      return;
    }

    parsing.value = true;
    moduleApi.chat.appendSystemMessage(
      `[任务理解] 已发送命令 ${command.commandId} 到 ${COORDINATION_API_URLS.decompose}（当前为假数据模拟）。`
    );

    await new Promise((resolve) => window.setTimeout(resolve, 800));

    analysisResultMap.value = {
      ...analysisResultMap.value,
      [command.commandId]: mockAnalysisByCommandId[command.commandId],
    };

    parsing.value = false;
    resultView.value = 'missions';
    moduleApi.chat.appendSystemMessage(
      `[任务理解] 命令 ${command.commandId} 解析完成，共提取 ${mockAnalysisByCommandId[command.commandId].missions.length} 个任务、${mockAnalysisByCommandId[command.commandId].resources.length} 个资源。`
    );
  };

  const startEditMission = (mission) => {
    editingMissionId.value = mission.mission_id;
    missionDraft.value = {
      mission_name: mission.mission_name || '',
      content: mission.mission_detail?.content || '',
      target: mission.mission_detail?.target || '',
      time: mission.mission_detail?.time || '',
      duration: mission.mission_detail?.duration || '',
    };
  };

  const cancelEditMission = () => {
    editingMissionId.value = null;
  };

  const saveEditMission = () => {
    const commandId = selectedCommandId.value;
    const missionId = editingMissionId.value;
    const current = analysisResultMap.value[commandId];
    if (!commandId || !missionId || !current) {
      return;
    }

    const nextMissions = (current.missions || []).map((mission) => {
      if (mission.mission_id !== missionId) {
        return mission;
      }
      return {
        ...mission,
        mission_name: missionDraft.value.mission_name,
        mission_detail: {
          ...mission.mission_detail,
          content: missionDraft.value.content,
          target: missionDraft.value.target,
          time: missionDraft.value.time,
          duration: missionDraft.value.duration,
        },
      };
    });

    analysisResultMap.value = {
      ...analysisResultMap.value,
      [commandId]: {
        ...current,
        missions: nextMissions,
      },
    };

    moduleApi.chat.appendSystemMessage(
      `[任务理解] 任务 ${missionId} 字段已更新（演示态，仅前端生效）。`
    );
    editingMissionId.value = null;
  };

  return {
    commands,
    selectedCommandId,
    parsing,
    resultView,
    detailsExpanded,
    analysisResultMap,
    editingMissionId,
    missionDraft,
    selectedCommand,
    selectedAnalysis,
    hasAnalysisResult,
    resolveCommandStatusText,
    resolveCommandStatusTone,
    formatMissionDependencies,
    handleForward,
    handleAssociate,
    handleDelete,
    parseSelectedCommand,
    startEditMission,
    cancelEditMission,
    saveEditMission,
  };
}
