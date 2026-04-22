import { createAsyncMissionComponent } from '../../registry/createAsyncMissionComponent';
import {
  createChatPanel,
  createMapOperationsPanel,
  createTextPanel,
  createVehiclePanel,
} from '../../registry/sharedPanels';

const ExampleLeftPanel = createAsyncMissionComponent(() => import('./panels/ExampleLeftPanel.vue'));
const ExampleRightPanel = createAsyncMissionComponent(() => import('./panels/ExampleRightPanel.vue'));

export const exampleManifest = {
  id: 'example',
  label: '示例模块',
  order: 10,
  defaultLeftPanelId: 'example-overview',
  leftPanels: [
    createTextPanel({
      id: 'example-overview',
      label: '概览',
      shortLabel: '概',
      title: '概览',
      hint: '',
      component: ExampleLeftPanel,
    }),
    createMapOperationsPanel(),
    createVehiclePanel(),
    createChatPanel(),
  ],
  rightPanel: {
    component: ExampleRightPanel,
    title: '示例右侧插件',
    summary: '用于测试标准模块的右工作区接入。',
  },
};

export default exampleManifest;
