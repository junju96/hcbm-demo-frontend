import MissionChatSidebarPanel from '../shared/apps/MissionChatSidebarPanel.vue';
import MissionMapOperationsSidebarPanel from '../shared/apps/MissionMapOperationsSidebarPanel.vue';
import DemoVehicleInfoSidebarPanel from '../shared/apps/DemoVehicleInfoSidebarPanel.vue';

export const createTextPanel = ({
  id,
  label,
  shortLabel,
  title = label,
  hint = '',
  component,
}) => ({
  id,
  label,
  shortLabel,
  iconType: 'text',
  title,
  hint,
  component,
});

export const createMapOperationsPanel = () => ({
  id: 'shared-map-ops',
  label: '地图操作',
  shortLabel: '图',
  iconType: 'text',
  title: '地图操作',
  hint: '',
  component: MissionMapOperationsSidebarPanel,
});

export const createChatPanel = (hint = '') => ({
  id: 'chat',
  label: '任务对话',
  shortLabel: 'AI',
  iconType: 'text',
  title: '任务对话',
  hint,
  component: MissionChatSidebarPanel,
});

export const createVehiclePanel = () => ({
  id: 'vehicle',
  label: '单车基础信息',
  shortLabel: '车',
  iconType: 'text',
  title: '单车基础信息',
  hint: '',
  component: DemoVehicleInfoSidebarPanel,
});
