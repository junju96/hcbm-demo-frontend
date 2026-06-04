import { computed, nextTick, onMounted, onUnmounted, reactive, ref, unref, watch } from 'vue';
import {
  notificationCenterVisible,
  toggleNotificationCenter,
} from '../../../utils/notificationCenter';
import { navigateToDemoPath } from '../../../router';
import { missionModuleManifests, resolveMissionModuleId, resolveMissionModuleManifest } from '../registry/moduleRegistry';
import { useMissionActionRegistry } from './useMissionActionRegistry';
import { useMissionAutomationBridge } from './useMissionAutomationBridge';
import { useMissionInteractionRegistry } from './useMissionInteractionRegistry';

const SHARED_MAP_PANEL_ID = 'shared-map-ops';
const COORDINATION_BRIEF_PANEL_ID = 'coord-brief';

const COORDINATION_SUBVIEWS = Object.freeze([
  { id: 'task-understanding', title: '任务理解' },
  { id: 'plan-design', title: '方案规划' },
  { id: 'resource-list', title: '资源清单' },
  { id: 'action-sequence', title: '行动序列' },
  { id: 'action-sequence-control', title: '操控席行动序列' },
]);

const ROUTE_ROLE_BY_PATH = {
  '/mission-control': 'single',
  '/mission-control/main': 'main',
  '/mission-control/aux': 'aux',
};

const normalizeRouteRole = (value, fallback = 'single') => {
  const normalized = String(value || '').trim();
  return ['single', 'main', 'aux'].includes(normalized) ? normalized : fallback;
};

const formatTimeText = () =>
  new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());

const createTaskChain = (currentStep, states = {}) => {
  const nodes = [
    { id: 'receive', label: '任务接收' },
    { id: 'plan', label: '路径规划' },
    { id: 'execute', label: '执行调度' },
    { id: 'confirm', label: '结果确认' },
  ];
  const currentIndex = Math.max(0, nodes.findIndex((node) => node.id === currentStep));
  const now = new Date();

  return nodes.map((node, index) => {
    const explicitStatus = states[node.id];
    const status = explicitStatus
      || (index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'pending');
    const statusLabelMap = {
      completed: '已完成',
      current: '进行中',
      pending: '待执行',
      paused: '已暂停',
      error: '异常',
      blocked: '阻塞',
    };

    return {
      id: node.id,
      label: node.label,
      status,
      statusLabel: statusLabelMap[status] || '待执行',
      updateTime: index <= currentIndex ? new Date(now.getTime() - (currentIndex - index) * 180000).toISOString() : '',
    };
  });
};

const buildDemoTaskCard = ({
  taskKey,
  vehicleId,
  vehicleName,
  missionTitle,
  currentNode,
  executionStatus,
  executionStatusCode,
  currentStep,
  progress,
  progressTone = 'normal',
  alert = false,
}) => ({
  taskKey,
  vehicleId,
  vehicleName,
  missionTitle,
  currentNode,
  executionStatus,
  executionStatusCode,
  currentStep,
  progress,
  progressTone,
  alert,
  taskReceived: true,
  missionLastUpdateTime: new Date().toISOString(),
  parameters: {
    objective: missionTitle,
    priority: '标准',
    cadence: '常规',
  },
  taskChain: createTaskChain(currentStep),
});

export function useMissionControlDemoShell({ screenMode = 'single', routeRole = screenMode } = {}) {
  const screenModeRef = computed(() => normalizeRouteRole(unref(screenMode), 'single'));
  const routeRoleRef = computed(() => normalizeRouteRole(unref(routeRole), screenModeRef.value));

  const activeModuleId = ref(missionModuleManifests[0]?.id || 'example');
  const selectedTool = ref('知识库');
  const chatDraft = ref('');
  const chatRecords = ref([
    { role: 'system', text: '这是 Demo 任务对话面板，已接入通知中心和语义命令接口。' },
  ]);
  const chatMessagesRef = ref(null);
  const chatDockCollapsed = ref(false);
  const layoutTick = ref(0);
  const mapZoom = ref(12);
  const mapLayer = ref('卫星图');
  const leftPanelWidth = ref(320);
  const leftPanelResizing = ref(false);
  const weatherText = ref('多云 23°C');
  const currentTime = ref(formatTimeText());
  const currentUser = ref({ username: 'demo-user' });
  const serverStatusText = ref('演示环境');
  const vehicleInfos = ref([
    { id: 'UGV-001', name: 'UGV-001', status: '在线', fuel: '78%', battery: '86%' },
    { id: 'UGV-002', name: 'UGV-002', status: '待命', fuel: '64%', battery: '91%' },
  ]);
  const taskCards = ref([
    buildDemoTaskCard({
      taskKey: 'TASK-001',
      vehicleId: 'UGV-001',
      vehicleName: 'UGV-001',
      missionTitle: '道路侦察',
      currentNode: '路径规划',
      executionStatus: '执行中',
      executionStatusCode: 'running',
      currentStep: 'plan',
      progress: 42,
    }),
    buildDemoTaskCard({
      taskKey: 'TASK-002',
      vehicleId: 'UGV-002',
      vehicleName: 'UGV-002',
      missionTitle: '区域监视',
      currentNode: '执行调度',
      executionStatus: '待确认',
      executionStatusCode: 'pending_confirm',
      currentStep: 'execute',
      progress: 78,
      progressTone: 'warning',
      alert: true,
    }),
    buildDemoTaskCard({
      taskKey: 'TASK-003',
      vehicleId: 'UGV-003',
      vehicleName: 'UGV-003',
      missionTitle: '伴随保障',
      currentNode: '任务接收',
      executionStatus: '待开始',
      executionStatusCode: 'pending',
      currentStep: 'receive',
      progress: 12,
    }),
    buildDemoTaskCard({
      taskKey: 'TASK-004',
      vehicleId: 'UGV-004',
      vehicleName: 'UGV-004',
      missionTitle: '异常复核',
      currentNode: '结果确认',
      executionStatus: '已暂停',
      executionStatusCode: 'paused',
      currentStep: 'confirm',
      progress: 91,
      progressTone: 'danger',
    }),
  ]);
  const activeCoordinationSubviewId = ref(COORDINATION_SUBVIEWS[0].id);
  const coordinationRefreshToken = ref(0);
  const coordinationCommandActive = ref(false);

  const panelVisibility = reactive({
    single: true,
    main: true,
    aux: true,
  });

  const panelSelections = reactive({
    single: Object.fromEntries(
      missionModuleManifests.map((manifest) => [
        manifest.id,
        manifest.defaultLeftPanelId || manifest.leftPanels?.[0]?.id || '',
      ])
    ),
    main: Object.fromEntries(
      missionModuleManifests.map((manifest) => [
        manifest.id,
        manifest.defaultLeftPanelId || manifest.leftPanels?.[0]?.id || '',
      ])
    ),
    aux: Object.fromEntries(
      missionModuleManifests.map((manifest) => [
        manifest.id,
        manifest.defaultLeftPanelId || manifest.leftPanels?.[0]?.id || '',
      ])
    ),
  });

  const moduleIds = missionModuleManifests.map((manifest) => manifest.id);
  const currentScreenKey = computed(() => routeRoleRef.value);
  const leftDockStyle = computed(() => ({
    '--chat-sidebar-width': `${panelVisibility[currentScreenKey.value] ? leftPanelWidth.value : 0}px`,
  }));

  let clockTimer = null;
  let leftPanelResizeStartX = 0;
  let leftPanelResizeStartWidth = 320;

  const clampLeftPanelWidth = (value) => Math.min(420, Math.max(280, Number(value) || 320));
  const includeChatInRail = (screenKey) => screenKey === 'single';

  const getLeftPanelsForModule = (moduleId, screenKey = currentScreenKey.value) => {
    const panels = resolveMissionModuleManifest(moduleId)?.leftPanels || [];
    return includeChatInRail(screenKey)
      ? panels
      : panels.filter((panel) => panel.id !== 'chat');
  };

  const resolveLeftPanel = (moduleId, panelId, screenKey = currentScreenKey.value) => {
    const panels = getLeftPanelsForModule(moduleId, screenKey);
    return (
      panels.find((item) => item.id === panelId)
      || panels.find((item) => item.id === SHARED_MAP_PANEL_ID)
      || panels[0]
      || null
    );
  };

  const syncLeftPanelSelection = (moduleId, screenKey = currentScreenKey.value) => {
    const currentPanelId = panelSelections[screenKey][moduleId] || '';
    const nextPanel = resolveLeftPanel(moduleId, currentPanelId, screenKey);
    if (!nextPanel) {
      return null;
    }

    panelSelections[screenKey] = {
      ...panelSelections[screenKey],
      [moduleId]: nextPanel.id,
    };
    return nextPanel;
  };

  const activeModuleManifest = computed(() => resolveMissionModuleManifest(activeModuleId.value));
  const activeLeftPanels = computed(() => getLeftPanelsForModule(activeModuleId.value));
  const activeLeftPanel = computed(() => (
    resolveLeftPanel(
      activeModuleId.value,
      panelSelections[currentScreenKey.value][activeModuleId.value],
      currentScreenKey.value
    )
  ));
  const activeLeftPanelComponent = computed(() => activeLeftPanel.value?.component || null);
  const activeRightPanelComponent = computed(() => activeModuleManifest.value?.rightPanel?.component || null);
  const leftPanelVisible = computed(() => panelVisibility[currentScreenKey.value]);
  const leftPanelTitle = computed(() => activeLeftPanel.value?.title || '工作区');
  const leftPanelHint = computed(() => activeLeftPanel.value?.hint || '');
  const activeCoordinationSubview = computed(() => (
    COORDINATION_SUBVIEWS.find((item) => item.id === activeCoordinationSubviewId.value)
    || COORDINATION_SUBVIEWS[0]
  ));

  const scrollToBottom = () => {
    const element = chatMessagesRef.value;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  const setMessagesElement = (element) => {
    chatMessagesRef.value = element;
  };

  const stopLeftPanelResize = () => {
    if (!leftPanelResizing.value) {
      window.removeEventListener('mousemove', handleLeftPanelResize);
      window.removeEventListener('mouseup', stopLeftPanelResize);
      return;
    }

    leftPanelResizing.value = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', handleLeftPanelResize);
    window.removeEventListener('mouseup', stopLeftPanelResize);
  };

  const handleLeftPanelResize = (event) => {
    if (!leftPanelResizing.value) {
      return;
    }

    leftPanelWidth.value = clampLeftPanelWidth(
      leftPanelResizeStartWidth + event.clientX - leftPanelResizeStartX
    );
  };

  const startLeftPanelResize = (event) => {
    if (currentScreenKey.value === 'aux' || !panelVisibility[currentScreenKey.value]) {
      return;
    }

    leftPanelResizing.value = true;
    leftPanelResizeStartX = event.clientX;
    leftPanelResizeStartWidth = leftPanelWidth.value;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleLeftPanelResize);
    window.addEventListener('mouseup', stopLeftPanelResize);
  };

  const openLeftPanel = (panelId, options = {}) => {
    const nextPanel = resolveLeftPanel(activeModuleId.value, panelId, currentScreenKey.value);
    if (!nextPanel) {
      return;
    }

    if (
      currentScreenKey.value === 'single'
      && options.toggle
      && panelVisibility[currentScreenKey.value]
      && activeLeftPanel.value?.id === nextPanel.id
    ) {
      panelVisibility[currentScreenKey.value] = false;
      return;
    }

    panelSelections[currentScreenKey.value] = {
      ...panelSelections[currentScreenKey.value],
      [activeModuleId.value]: nextPanel.id,
    };
    panelVisibility[currentScreenKey.value] = true;

    nextTick(() => {
      if (nextPanel.id === 'chat') {
        scrollToBottom();
      }
    });
  };

  const closeLeftPanel = () => {
    if (currentScreenKey.value === 'aux') {
      return;
    }
    panelVisibility[currentScreenKey.value] = false;
  };

  const appendRecord = (role, text) => {
    const message = String(text ?? '').trim();
    if (!message) {
      return;
    }
    chatRecords.value.push({ role, text: message });
  };

  const appendSystemMessage = (text) => {
    appendRecord('system', text);
  };

  const sendChatMessage = async (textOverride) => {
    const text = String(textOverride ?? chatDraft.value).trim();
    if (!text) {
      return false;
    }

    appendRecord('user', text);
    chatDraft.value = '';
    await nextTick();
    scrollToBottom();
    appendSystemMessage(`Demo 已收到：${text}`);
    await nextTick();
    scrollToBottom();
    return true;
  };

  const openChatPanel = () => {
    if (routeRoleRef.value === 'aux') {
      chatDockCollapsed.value = false;
      return;
    }
    openLeftPanel('chat');
  };

  const closeChatPanel = () => {
    if (routeRoleRef.value === 'aux') {
      chatDockCollapsed.value = true;
      return;
    }
    if (activeLeftPanel.value?.id === 'chat') {
      closeLeftPanel();
    }
  };

  const toggleChatPanel = () => {
    if (routeRoleRef.value === 'aux') {
      chatDockCollapsed.value = !chatDockCollapsed.value;
      return;
    }
    openLeftPanel('chat', { toggle: true });
  };

  const openModuleById = (moduleId) => {
    const nextModuleId = resolveMissionModuleId(moduleId);
    if (!nextModuleId || !moduleIds.includes(nextModuleId)) {
      return;
    }
    coordinationCommandActive.value = false;
    activeModuleId.value = nextModuleId;
  };

  const selectCoordinationSubview = (subviewId) => {
    const nextSubview = COORDINATION_SUBVIEWS.find((item) => item.id === String(subviewId || '').trim())
      || COORDINATION_SUBVIEWS[0];
    activeCoordinationSubviewId.value = nextSubview.id;
    coordinationRefreshToken.value += 1;
  };

  const openCoordinationCommand = () => {
    openModuleById('coordination');
    coordinationCommandActive.value = true;
    panelVisibility[currentScreenKey.value] = true;

    nextTick(() => {
      openLeftPanel(COORDINATION_BRIEF_PANEL_ID);
      selectCoordinationSubview(activeCoordinationSubviewId.value);
    });
  };

  const bumpWorkspace = () => {
    layoutTick.value += 1;
  };

  const resetMapView = () => {
    mapZoom.value = 12;
    mapLayer.value = '卫星图';
  };

  const showVehicleOverview = () => {
    openLeftPanel('vehicle');
  };

  const setRouteRoleByPath = (path) => {
    if (ROUTE_ROLE_BY_PATH[path]) {
      navigateToDemoPath(path);
    }
  };

  const handleSwitchScreenMode = () => {
    navigateToDemoPath(routeRoleRef.value === 'single' ? '/mission-control/main' : '/mission-control');
  };

  const handleSwitchScreen = () => {
    if (routeRoleRef.value === 'main') {
      navigateToDemoPath('/mission-control/aux');
      return;
    }
    if (routeRoleRef.value === 'aux') {
      navigateToDemoPath('/mission-control/main');
    }
  };

  const modeSwitchLabel = computed(() => (
    routeRoleRef.value === 'single' ? '双屏主屏' : '单屏模式'
  ));
  const screenSwitchLabel = computed(() => (
    routeRoleRef.value === 'single' ? '' : '切换屏幕'
  ));
  const statusTitle = computed(() => {
    if (routeRoleRef.value === 'single') {
      return '单屏模式';
    }
    if (routeRoleRef.value === 'main') {
      return '双屏主屏';
    }
    return '双屏辅屏';
  });
  const statusSubtitle = computed(() => {
    if (routeRoleRef.value === 'single') {
      return '左侧工作区 + 中间地图占位 + 右侧模块面板';
    }
    if (routeRoleRef.value === 'main') {
      return '地图主导 + 视频 Dock';
    }
    return '左侧工作区 + 任务看板 + 模块详情区 + AI Dock';
  });

  const handleSystemSettings = () => {
    appendSystemMessage('[Demo] 系统设置页面未接入，保留了入口位置和调用方式。');
  };

  const handleVehicleCatalog = () => {
    appendSystemMessage('[Demo] 车辆名录页面未接入，保留了入口位置和调用方式。');
  };

  const handleEmergency = () => {
    appendSystemMessage('[Demo] 越级操控入口已保留，但未接入真实后台控制链路。');
  };

  const handleExit = () => {
    appendSystemMessage('[Demo] 已返回 Mission Control 单屏模式。');
    navigateToDemoPath('/mission-control');
  };

  const isLeftPanelActive = (panelId) => (
    panelVisibility[currentScreenKey.value] && activeLeftPanel.value?.id === panelId
  );

  const taskBoard = {
    cards: taskCards,
    detailPanelVisible: ref(true),
    detailLayoutBalanceKey: ref(0),
    openDetailPanel: () => {
      taskBoard.detailPanelVisible.value = true;
    },
    closeDetailPanel: () => {
      taskBoard.detailPanelVisible.value = false;
    },
    toggleDetailPanel: () => {
      taskBoard.detailPanelVisible.value = !taskBoard.detailPanelVisible.value;
    },
    requestDetailLayoutBalance: () => {
      taskBoard.detailLayoutBalanceKey.value += 1;
    },
    viewDetails: (taskKey) => {
      appendSystemMessage(`[任务看板] 查看详情：${taskKey}`);
      taskBoard.openDetailPanel();
    },
    requestSupport: (taskKey) => {
      appendSystemMessage(`[任务看板] 已发起保障申请：${taskKey}`);
      openChatPanel();
    },
    pauseTask: (taskKey) => {
      taskCards.value = taskCards.value.map((card) => (
        card.taskKey === taskKey
          ? {
              ...card,
              executionStatus: '已暂停',
              executionStatusCode: 'paused',
              progressTone: 'warning',
              missionLastUpdateTime: new Date().toISOString(),
            }
          : card
      ));
      appendSystemMessage(`[任务看板] 已暂停任务：${taskKey}`);
    },
    startTask: (taskKey) => {
      taskCards.value = taskCards.value.map((card) => (
        card.taskKey === taskKey
          ? {
              ...card,
              executionStatus: '执行中',
              executionStatusCode: 'running',
              progressTone: 'normal',
              missionLastUpdateTime: new Date().toISOString(),
            }
          : card
      ));
      appendSystemMessage(`[任务看板] 已开始任务：${taskKey}`);
    },
    releaseTask: (taskKey) => {
      taskCards.value = taskCards.value.map((card) => (
        card.taskKey === taskKey
          ? {
              ...card,
              executionStatus: '执行中',
              executionStatusCode: 'running',
              progressTone: 'normal',
              missionLastUpdateTime: new Date().toISOString(),
            }
          : card
      ));
      appendSystemMessage(`[任务看板] 已解除暂停：${taskKey}`);
    },
    retryTask: (taskKey) => {
      taskCards.value = taskCards.value.map((card) => (
        card.taskKey === taskKey
          ? {
              ...card,
              executionStatus: '重试中',
              executionStatusCode: 'running',
              progressTone: 'normal',
              alert: false,
              missionLastUpdateTime: new Date().toISOString(),
            }
          : card
      ));
      appendSystemMessage(`[任务看板] 已重试任务：${taskKey}`);
    },
    applyAdjustment: (taskKey, adjustment) => {
      taskCards.value = taskCards.value.map((card) => (
        card.taskKey === taskKey
          ? {
              ...card,
              parameters: {
                ...card.parameters,
                ...adjustment,
              },
              missionLastUpdateTime: new Date().toISOString(),
            }
          : card
      ));
      appendSystemMessage(`[任务看板] 已应用调整：${taskKey}`);
    },
  };

  const actionRegistry = useMissionActionRegistry();
  const interactionRegistry = useMissionInteractionRegistry({
    getChatDraft: () => chatDraft.value,
    setChatDraft: (text) => {
      chatDraft.value = String(text ?? '');
    },
    openChatPanel,
  });

  const resolveTaskBoardKey = (context = {}) => {
    const params = context?.params || {};
    const target = context?.target || {};
    const rawValue = String(
      params.taskKey
      || target?.meta?.taskKey
      || target?.targetId
      || ''
    ).trim();
    return rawValue.startsWith('task-board:')
      ? rawValue.slice('task-board:'.length).trim()
      : rawValue;
  };

  [
    {
      id: 'map:reset-view',
      label: '地图操作 / 重置视图',
      route: '/mission-control',
      panelId: 'shared-map-ops',
      execute: () => resetMapView(),
    },
    {
      id: 'workspace:bump',
      label: '工作区 / 刷新占位',
      route: '/mission-control',
      panelId: 'shared-map-ops',
      execute: () => bumpWorkspace(),
    },
    {
      id: 'task-board:view-details',
      label: '任务看板 / 查看详情',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.viewDetails(resolveTaskBoardKey({ params, target })),
    },
    {
      id: 'task-board:request-support',
      label: '任务看板 / 申请保障',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.requestSupport(resolveTaskBoardKey({ params, target })),
    },
    {
      id: 'task-board:pause-task',
      label: '任务看板 / 暂停任务',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.pauseTask(resolveTaskBoardKey({ params, target })),
    },
    {
      id: 'task-board:start-task',
      label: '任务看板 / 开始任务',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.startTask(resolveTaskBoardKey({ params, target })),
    },
    {
      id: 'task-board:release-task',
      label: '任务看板 / 解除暂停',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.releaseTask(resolveTaskBoardKey({ params, target })),
    },
    {
      id: 'task-board:retry-task',
      label: '任务看板 / 重试任务',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.retryTask(resolveTaskBoardKey({ params, target })),
    },
    {
      id: 'task-board:apply-adjustment',
      label: '任务看板 / 调整方案',
      route: '/mission-control/aux',
      execute: ({ params, target }) => taskBoard.applyAdjustment(resolveTaskBoardKey({ params, target }), params || {}),
    },
  ].forEach((definition) => {
    actionRegistry.registerAction(definition);
  });

  const automationBridge = useMissionAutomationBridge({
    missionModuleManifests,
    activeModuleId,
    setRouteRoleByPath,
    openModuleById,
    openLeftPanel,
    actionRegistry,
    interactionRegistry,
    chatApi: {
      setDraft: (text) => {
        chatDraft.value = String(text ?? '');
      },
      open: openChatPanel,
    },
  });

  const handleInteractionCapture = (event) => {
    interactionRegistry.captureTargetFromEvent(event);
  };

  watch(activeModuleId, (moduleId) => {
    syncLeftPanelSelection(moduleId, 'single');
    syncLeftPanelSelection(moduleId, 'main');
    syncLeftPanelSelection(moduleId, 'aux');
  }, { immediate: true });

  watch(routeRoleRef, (screenKey) => {
    syncLeftPanelSelection(activeModuleId.value, screenKey);
    panelVisibility[screenKey] = true;
    if (screenKey !== 'aux') {
      chatDockCollapsed.value = false;
    }
  }, { immediate: true });

  onMounted(() => {
    window.addEventListener('pointerdown', handleInteractionCapture, true);
    clockTimer = window.setInterval(() => {
      currentTime.value = formatTimeText();
    }, 1000);
  });

  onUnmounted(() => {
    window.removeEventListener('pointerdown', handleInteractionCapture, true);
    stopLeftPanelResize();
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  });

  const moduleApi = reactive({
    navigation: {
      moduleIds,
      activeModuleId,
      openModule: openModuleById,
    },
    module: {
      activeManifest: activeModuleManifest,
      activeLeftPanels,
      activeLeftPanel,
    },
    layout: {
      visible: leftPanelVisible,
      resizing: leftPanelResizing,
      width: leftPanelWidth,
      activePanelId: computed(() => activeLeftPanel.value?.id || ''),
      rightPanelVisible: computed(() => routeRoleRef.value !== 'single'),
      hasRightPanel: computed(() => Boolean(activeRightPanelComponent.value)),
      openLeftPanel,
      closeLeftPanel,
      openRightPanel: () => {},
      closeRightPanel: () => {},
      toggleRightPanel: () => {},
      showVehicleOverview,
      startLeftPanelResize,
      syncWorkspaceLayout: bumpWorkspace,
      isLeftPanelActive,
    },
    chat: {
      selectedTool,
      tools: [{ name: '知识库' }, { name: '问 AI' }, { name: '闲聊' }],
      draft: chatDraft,
      records: chatRecords,
      setMessagesElement,
      open: openChatPanel,
      close: closeChatPanel,
      toggle: toggleChatPanel,
      send: sendChatMessage,
      sendPreset: sendChatMessage,
      appendRecord,
      appendSystemMessage,
      setDraft: (text) => {
        chatDraft.value = String(text ?? '');
      },
    },
    workspace: {
      screenMode: screenModeRef,
      routeRole: routeRoleRef,
      layoutTick,
      bump: bumpWorkspace,
    },
    map: {
      zoom: mapZoom,
      layer: mapLayer,
      resetView: resetMapView,
    },
    vehicle: {
      infos: vehicleInfos,
      openOverview: showVehicleOverview,
    },
    taskBoard,
    session: {
      currentUser,
    },
    status: {
      title: statusTitle,
      subtitle: statusSubtitle,
      weatherText,
      currentTime,
      serverStatusText,
    },
    notifications: {
      visible: notificationCenterVisible,
      toggle: toggleNotificationCenter,
    },
    interaction: {
      currentTarget: interactionRegistry.currentTarget,
      setCurrentTarget: interactionRegistry.setCurrentTarget,
      clearCurrentTarget: interactionRegistry.clearCurrentTarget,
      registerTarget: interactionRegistry.registerTarget,
      focusTarget: interactionRegistry.focusTarget,
      insertCurrentTargetToChat: interactionRegistry.insertCurrentTargetToChat,
      formatCurrentTargetForChat: interactionRegistry.formatCurrentTargetForChat,
    },
    control: {
      executeCommand: automationBridge.executeCommand,
      emitCommand: automationBridge.emitCommand,
      registerAction: actionRegistry.registerAction,
      lastCommandResult: automationBridge.lastCommandResult,
    },
    coordination: {
      subviews: COORDINATION_SUBVIEWS,
      commandActive: coordinationCommandActive,
      activeSubviewId: activeCoordinationSubviewId,
      activeSubview: activeCoordinationSubview,
      activeSubviewTitle: computed(() => activeCoordinationSubview.value.title),
      refreshToken: coordinationRefreshToken,
      openCommandCenter: openCoordinationCommand,
      selectSubview: selectCoordinationSubview,
    },
  });

  return {
    screenMode: screenModeRef,
    routeRole: routeRoleRef,
    modeSwitchLabel,
    screenSwitchLabel,
    modules: missionModuleManifests,
    activeModuleId,
    activeModuleManifest,
    activeLeftPanels,
    activeLeftPanel,
    activeLeftPanelComponent,
    activeRightPanelComponent,
    leftPanelVisible,
    leftPanelResizing,
    leftDockStyle,
    leftPanelTitle,
    leftPanelHint,
    chatDockCollapsed,
    weatherText,
    currentTime,
    currentUser,
    serverStatusText,
    notificationCenterVisible,
    isLeftPanelActive,
    openModuleById,
    openModule: openModuleById,
    openLeftPanel,
    closeLeftPanel,
    openChatPanel,
    closeChatPanel,
    toggleNotificationCenter,
    startLeftPanelResize,
    handleSystemSettings,
    handleVehicleCatalog,
    handleEmergency,
    handleExit,
    handleSwitchScreenMode,
    handleSwitchScreen,
    openCoordinationCommand,
    coordinationCommandActive,
    coordinationRefreshToken,
    taskBoardDetailPanelVisible: taskBoard.detailPanelVisible,
    taskBoardDetailPanelBalanceKey: taskBoard.detailLayoutBalanceKey,
    openTaskBoardDetailPanel: taskBoard.openDetailPanel,
    closeTaskBoardDetailPanel: taskBoard.closeDetailPanel,
    moduleApi,
  };
}
