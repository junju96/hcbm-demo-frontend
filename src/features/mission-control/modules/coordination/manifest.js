import { createAsyncMissionComponent } from '../../registry/createAsyncMissionComponent';
import {
  createChatPanel,
  createMapOperationsPanel,
  createTextPanel,
  createVehiclePanel,
} from '../../registry/sharedPanels';

const CoordinationLeftPanel = createAsyncMissionComponent(() => import('./panels/CoordinationLeftPanel.vue'));
const CoordinationRightPanel = createAsyncMissionComponent(() => import('./panels/CoordinationRightPanel.vue'));

export const coordinationManifest = {
  id: 'coordination',
  label: '协同模块',
  order: 20,
  defaultLeftPanelId: 'coord-brief',
  leftPanels: [
    createTextPanel({
      id: 'coord-brief',
      label: '简报',
      shortLabel: '简',
      title: '简报',
      hint: '',
      component: CoordinationLeftPanel,
    }),
    createMapOperationsPanel(),
    createVehiclePanel(),
    createChatPanel(),
  ],
  rightPanel: {
    component: CoordinationRightPanel,
    title: '协同右侧插件',
    summary: '用于测试切模块后公共插件保留与右侧面板切换。',
  },
};

export default coordinationManifest;
