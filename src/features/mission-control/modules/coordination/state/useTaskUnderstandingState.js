import { computed, ref, watch } from 'vue';
import {
  COORDINATION_API_URLS,
  buildUpdateRequest,
  buildUpdateResponse,
  commandRecords,
  createMockAnalysisByCommand,
} from '../data/commandDataModel';
import {
  loadTaskUnderstandingDb,
  saveTaskUnderstandingDb,
} from './taskUnderstandingLocalDb';

function useMissionEditor() {
  const editingMissionId = ref(null);
  const missionDraft = ref({
    mission_name: '',
    content: '',
    target: '',
    time: '',
    duration: '',
  });

  const isEditing = computed(() => editingMissionId.value !== null);

  const enterEdit = (mission) => {
    editingMissionId.value = mission.mission_id;
    missionDraft.value = {
      mission_name: mission.mission_name || '',
      content: mission.mission_detail?.content || '',
      target: mission.mission_detail?.target || '',
      time: mission.mission_detail?.time || '',
      duration: mission.mission_detail?.duration || '',
    };
  };

  const cancelEdit = () => {
    editingMissionId.value = null;
  };

  const commitEdit = (analysisResultMap, selectedCommandId) => {
    const commandId = selectedCommandId;
    const missionId = editingMissionId.value;
    const current = analysisResultMap.value[commandId];
    if (!commandId || !missionId || !current) {
      return false;
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

    editingMissionId.value = null;
    return true;
  };

  return {
    editingMissionId,
    missionDraft,
    isEditing,
    enterEdit,
    cancelEdit,
    commitEdit,
  };
}

export function useTaskUnderstandingState({ moduleApi }) {
  const initialDb = loadTaskUnderstandingDb({ mockCommands: commandRecords });
  const commands = ref(initialDb.commands);
  const mockAnalysisByCommandId = createMockAnalysisByCommand();

  const selectedCommandId = ref(initialDb.selectedCommandId || commands.value[0]?.commandId || '');
  const parsing = ref(false);
  const resultView = ref('missions');
  const detailsExpanded = ref(true);
  const analysisResultMap = ref(initialDb.analysisResultMap || {});

  const missionEditor = useMissionEditor();

  const selectedCommand = computed(() => commands.value.find((item) => item.commandId === selectedCommandId.value) || null);
  const selectedAnalysis = computed(() => analysisResultMap.value[selectedCommandId.value] || null);
  const hasAnalysisResult = computed(() => Boolean(selectedAnalysis.value));

  const hasDecomposeExecuted = (commandId) => Boolean(analysisResultMap.value?.[commandId]);
  const resolveCommandStatusText = (commandId) => (hasDecomposeExecuted(commandId) ? '已处理' : '待理解');
  const resolveCommandStatusTone = (commandId) => (hasDecomposeExecuted(commandId) ? 'done' : 'pending');

  if (selectedCommandId.value && !commands.value.some((item) => item.commandId === selectedCommandId.value)) {
    selectedCommandId.value = commands.value[0]?.commandId || '';
  }

  const formatDateTimeCn = (value) => {
    const text = String(value || '').trim();
    const matched = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{2}:\d{2}:\d{2}))?$/);
    if (!matched) {
      return text;
    }
    const [, year, month, day, time] = matched;
    const dateText = `${year}年${Number(month)}月${Number(day)}日`;
    return time ? `${dateText} ${time}` : dateText;
  };

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
    missionEditor.editingMissionId.value = null;
  });

  watch(resultView, (view) => {
    if (view !== 'missions') {
      missionEditor.editingMissionId.value = null;
    }
  });

  watch(
    [commands, analysisResultMap, selectedCommandId],
    () => {
      saveTaskUnderstandingDb({
        commands: commands.value,
        analysisResultMap: analysisResultMap.value,
        selectedCommandId: selectedCommandId.value,
      });
    },
    { deep: true }
  );

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

  const removeSelectedCommand = () => {
    const command = selectedCommand.value;
    if (!command) {
      return false;
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
    commands.value = commands.value.filter((item) => item.commandId !== command.commandId);
    const nextAnalysisMap = { ...analysisResultMap.value };
    delete nextAnalysisMap[command.commandId];
    analysisResultMap.value = nextAnalysisMap;
    selectedCommandId.value = commands.value[0]?.commandId || '';
    missionEditor.editingMissionId.value = null;
    resultView.value = 'missions';
    return true;
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

  const saveEditMission = () => {
    const updated = missionEditor.commitEdit(analysisResultMap, selectedCommandId.value);
    if (updated) {
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 任务 ${missionEditor.editingMissionId.value} 字段已更新（演示态，仅前端生效）。`
      );
    }
  };

  return {
    commands,
    selectedCommandId,
    parsing,
    resultView,
    detailsExpanded,
    analysisResultMap,
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
    editingMissionId: missionEditor.editingMissionId,
    missionDraft: missionEditor.missionDraft,
    isEditing: missionEditor.isEditing,
    startEditMission: missionEditor.enterEdit,
    cancelEditMission: missionEditor.cancelEdit,
    saveEditMission,
  };
}
