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

const COORDINATION_BASE_URL = 'http://localhost:28600';

const joinApiUrl = (path) => {
  const base = COORDINATION_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = String(path || '').replace(/^\/+/, '');
  return `${base}/${normalizedPath}`;
};

const safeFetch = async (url, options) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, data: null };
    }
    const data = await response.json();
    return { ok: true, error: null, data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Network error', data: null };
  }
};

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

  // ========== 远程 API 调用 ==========

  const fetchCommandDecompose = async (commandId) => {
    const requestBody = {
      RequestType: 'DECOMPOSE',
      RequestID: String(Date.now()).slice(-8),
      RequestData: { CommandID: commandId },
    };

    const result = await safeFetch(joinApiUrl(COORDINATION_API_URLS.decompose), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!result.ok) {
      return { ok: false, error: result.error, data: null };
    }

    const responseData = result.data;
    const missions = responseData?.data?.missions || [];
    const resources = responseData?.data?.resources || [];

    return {
      ok: true,
      data: {
        endpoint: COORDINATION_API_URLS.decompose,
        request_body: requestBody,
        response_body: responseData,
        missions,
        resources,
      },
    };
  };

  const fetchCommandUpdate = async (operation, commandIds, missionIds, resourceIds) => {
    const requestBody = buildUpdateRequest({
      operation,
      commandIds,
      missionIds,
      resourceIds,
    });

    const result = await safeFetch(joinApiUrl(COORDINATION_API_URLS.update), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!result.ok) {
      return { ok: false, error: result.error, data: null };
    }

    return { ok: true, data: result.data };
  };

  // ========== 业务操作 ==========

  const handleForward = () => {
    moduleApi.chat.appendSystemMessage(`[任务理解] 已转发命令：${selectedCommand.value?.name || ''}`);
    moduleApi.chat.open();
  };

  const handleAssociate = async () => {
    const command = selectedCommand.value;
    if (!command) {
      return;
    }
    const selected = selectedAnalysis.value;
    const missionIds = selected?.missions?.map((item) => item.mission_id) || [];
    const resourceIds = selected?.resources?.map((item) => item.resource_id) || [];

    const remoteResult = await fetchCommandUpdate(
      'associate',
      [command.cmd_id],
      missionIds,
      resourceIds
    );

    if (remoteResult.ok) {
      const response = remoteResult.data;
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 已调用 ${COORDINATION_API_URLS.update} 关联命令（RequestID=${response?.responseID}，result=${response?.data?.result}）。`
      );
    } else {
      // Fallback: 本地模拟
      const request = buildUpdateRequest({
        operation: 'associate',
        commandIds: [command.cmd_id],
        missionIds,
        resourceIds,
      });
      const response = buildUpdateResponse({
        operation: 'associate',
        requestId: request.RequestID,
      });
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 后端服务不可用，已 fallback 到本地模拟：调用 ${COORDINATION_API_URLS.update} 关联命令（RequestID=${request.RequestID}，result=${response.data.result}）。`
      );
    }
    moduleApi.chat.open();
  };

  const removeSelectedCommand = async () => {
    const command = selectedCommand.value;
    if (!command) {
      return false;
    }

    const remoteResult = await fetchCommandUpdate('delete', [command.cmd_id]);

    if (remoteResult.ok) {
      const response = remoteResult.data;
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 已调用 ${COORDINATION_API_URLS.update} 删除命令（RequestID=${response?.responseID}，result=${response?.data?.result}）。`
      );
    } else {
      // Fallback: 本地模拟
      const request = buildUpdateRequest({
        operation: 'delete',
        commandIds: [command.cmd_id],
      });
      const response = buildUpdateResponse({
        operation: 'delete',
        requestId: request.RequestID,
      });
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 后端服务不可用，已 fallback 到本地模拟：调用 ${COORDINATION_API_URLS.update} 删除命令（RequestID=${request.RequestID}，result=${response.data.result}）。`
      );
    }
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

    const remoteResult = await fetchCommandDecompose(command.commandId);

    if (remoteResult.ok) {
      // 使用后端返回的真实数据
      analysisResultMap.value = {
        ...analysisResultMap.value,
        [command.commandId]: remoteResult.data,
      };
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 命令 ${command.commandId} 已通过后端服务解析完成，共提取 ${remoteResult.data.missions.length} 个任务、${remoteResult.data.resources.length} 个资源。`
      );
    } else {
      // Fallback: 本地假数据模拟
      moduleApi.chat.appendSystemMessage(
        `[任务理解] 后端服务不可用（${remoteResult.error}），已 fallback 到本地假数据模拟。`
      );

      await new Promise((resolve) => window.setTimeout(resolve, 800));

      analysisResultMap.value = {
        ...analysisResultMap.value,
        [command.commandId]: mockAnalysisByCommandId[command.commandId],
      };

      moduleApi.chat.appendSystemMessage(
        `[任务理解] 命令 ${command.commandId} 本地模拟解析完成，共提取 ${mockAnalysisByCommandId[command.commandId].missions.length} 个任务、${mockAnalysisByCommandId[command.commandId].resources.length} 个资源。`
      );
    }

    parsing.value = false;
    resultView.value = 'missions';
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
