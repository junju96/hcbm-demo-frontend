<template>
  <div class="coord-left-shell">
    <template v-if="commandActive">
      <button
        v-for="item in coordinationSubviews"
        :key="item.id"
        class="coord-card coord-subview-panel"
        :class="{ active: activeSubviewId === item.id }"
        v-bind="buildSubviewTargetAttrs(item)"
        type="button"
        @click="selectSubview(item.id)"
      >
        <div class="coord-title">{{ item.title }}</div>
        <div class="coord-panel-copy">
          {{ activeSubviewId === item.id ? '当前已选中，右侧区域会显示对应标题。' : '点击后刷新右侧“协同右侧插件”区域。' }}
        </div>
      </button>
    </template>

    <template v-else>
      <div class="coord-card">
        <div class="coord-title">协同简报</div>
        <textarea
          v-model="brief"
          class="coord-textarea"
          placeholder="输入协同简报内容"
        ></textarea>
      </div>

      <div class="coord-card">
        <div class="coord-title">快速测试</div>
        <div class="coord-actions">
          <button class="coord-btn" type="button" @click="sendBrief">发送到对话</button>
          <button class="coord-btn" type="button" @click="moduleApi.layout.openLeftPanel('shared-map-ops')">
            切到公共地图插件
          </button>
        </div>
      </div>

      <div class="coord-card">
        <div class="coord-title">操控行动序列</div>
        <div class="coord-panel-copy">
          查看已生成的行动方案列表，支持下发到无人车执行。
        </div>
        <div class="coord-actions">
          <button class="coord-btn" type="button" @click="selectSubview('action-sequence')">
            {{ activeSubviewId === 'action-sequence' ? '当前已打开' : '打开行动序列' }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  createInteractionTargetAttrs,
} from '../../../shared/interaction/createInteractionTarget';

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

const coordinationSubviews = computed(() => props.moduleApi.coordination?.subviews || []);
const commandActive = computed(() => Boolean(props.moduleApi.coordination?.commandActive));
const activeSubviewId = computed(() => props.moduleApi.coordination?.activeSubviewId || '');
const brief = ref('协同模块用于测试切换模块时公共插件是否保持选中。');

const buildSubviewTargetAttrs = (item) => createInteractionTargetAttrs({
  targetId: `coordination:subview:${item?.id || ''}`,
  targetType: 'subview-entry',
  label: item?.title || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'CoordinationLeftPanel',
  actions: ['coordination:switch-subview'],
});

const selectSubview = (subviewId) => {
  props.moduleApi.coordination?.selectSubview?.(subviewId);
};

const sendBrief = () => {
  props.moduleApi.chat.appendSystemMessage(`[${props.moduleManifest.label}] ${brief.value}`);
  props.moduleApi.chat.open();
};
</script>

<style scoped>
.coord-left-shell {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.9rem;
}

.coord-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(6, 20, 26, 0.86);
  padding: 1rem;
}

.coord-title {
  color: #f8fafc;
  font-weight: 700;
}

.coord-textarea {
  width: 100%;
  min-height: 120px;
  margin-top: 0.75rem;
  resize: vertical;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  padding: 0.75rem 0.8rem;
}

.coord-subview-panel {
  width: 100%;
  min-height: 120px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.coord-subview-panel.active {
  border-color: rgba(0, 222, 200, 0.56);
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.28) 0%, rgba(4, 34, 39, 0.96) 100%);
  transform: translateY(-1px);
}

.coord-panel-copy {
  margin-top: 0.75rem;
  margin-top: 0.75rem;
  color: rgba(226, 232, 240, 0.74);
  line-height: 1.7;
}

.coord-actions {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.coord-btn {
  min-height: 38px;
  padding: 0 0.95rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
}
</style>
