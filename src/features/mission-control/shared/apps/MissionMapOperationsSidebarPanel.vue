<template>
  <div class="map-ops-shell">
    <div
      class="map-ops-card"
      v-bind="buildTargetAttrs('map-operations:controls', '地图操作 / 公共控件', 'Demo 保留地图操作接口，但不初始化真实地图', [
        'map:reset-view',
        'workspace:bump',
      ])"
    >
      <div class="map-ops-title">公共地图插件</div>
      <div class="map-ops-grid">
        <label class="map-ops-field">
          <span>缩放</span>
          <input
            :value="moduleApi.map.zoom"
            class="map-ops-range"
            type="range"
            min="3"
            max="18"
            @input="moduleApi.map.zoom = Number($event.target.value)"
          />
        </label>
        <label class="map-ops-field">
          <span>图层</span>
          <select v-model="moduleApi.map.layer" class="map-ops-select">
            <option value="卫星图">卫星图</option>
            <option value="道路图">道路图</option>
            <option value="地形图">地形图</option>
          </select>
        </label>
      </div>
    </div>

    <div
      class="map-ops-card"
      v-bind="buildTargetAttrs('map-operations:actions', '地图操作 / 测试动作', '用来验证 moduleApi.map 和控制命令', [
        'map:reset-view',
        'workspace:bump',
      ])"
    >
      <div class="map-ops-title">测试动作</div>
      <div class="map-ops-actions">
        <button
          v-bind="buildActionAttrs('map:reset-view', '重置视图', 'map-operations:actions')"
          class="map-ops-btn"
          type="button"
          @click="moduleApi.map.resetView()"
        >
          重置视图
        </button>
        <button
          v-bind="buildActionAttrs('workspace:bump', '刷新工作区', 'map-operations:actions')"
          class="map-ops-btn"
          type="button"
          @click="moduleApi.workspace.bump()"
        >
          刷新工作区
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  createInteractionActionAttrs,
  createInteractionTargetAttrs,
} from '../interaction/createInteractionTarget';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  panelDefinition: {
    type: Object,
    default: () => ({}),
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});

const buildTargetAttrs = (targetId, label, textPreview = '', actions = []) => createInteractionTargetAttrs({
  targetId,
  targetType: 'control_section',
  label,
  moduleId: props.moduleApi?.navigation?.activeModuleId,
  panelId: 'shared-map-ops',
  sourceComponent: 'MissionMapOperationsSidebarPanel',
  textPreview,
  actions,
});

const buildActionAttrs = (actionId, label, targetId) => createInteractionActionAttrs({
  actionId,
  label,
  targetId,
});
</script>

<style scoped>
.map-ops-shell {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  gap: 0.9rem;
}

.map-ops-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(7, 19, 25, 0.88);
  padding: 1rem;
}

.map-ops-title {
  color: #f8fafc;
  font-weight: 700;
}

.map-ops-grid {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.map-ops-field {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.88rem;
}

.map-ops-range,
.map-ops-select {
  width: 100%;
}

.map-ops-select {
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  padding: 0 0.8rem;
}

.map-ops-actions {
  margin-top: 0.8rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.map-ops-btn {
  min-height: 38px;
  padding: 0 0.95rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
}
</style>
