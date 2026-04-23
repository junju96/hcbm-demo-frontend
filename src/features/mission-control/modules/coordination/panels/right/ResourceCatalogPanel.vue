<template>
  <div class="coord-resource-shell">
    <div class="coord-resource-layout">
      <aside class="coord-panel coord-resource-left">
        <div class="coord-pane-title">资源列表</div>
        <div v-if="resources.length" class="coord-resource-list">
          <button
            v-for="resource in resources"
            :key="resource.resource_id"
            class="coord-resource-item"
            :class="{ active: selectedResourceId === resource.resource_id }"
            type="button"
            v-bind="buildResourceTargetAttrs(resource)"
            @click="selectedResourceId = resource.resource_id"
          >
            <div class="coord-resource-item-main">
              <span class="coord-resource-tag">资源 {{ resource.resource_id }}</span>
              <span class="coord-resource-name">{{ resource.resource_name }}</span>
            </div>
            <div class="coord-resource-sub">{{ resource.resource_type }}</div>
          </button>
        </div>
        <div v-else class="coord-resource-empty-state">
          当前没有可展示的资源，请先完成命令解析或检查本地数据。
        </div>
      </aside>

      <section class="coord-panel coord-resource-right" v-if="selectedResource">
        <header class="coord-resource-header">
          <div class="coord-pane-title">资源清单</div>
          <span class="coord-resource-chip">{{ selectedResource.resource_type }}</span>
        </header>

        <div class="coord-resource-meta-grid">
          <div class="coord-resource-meta">
            <span class="coord-resource-label">资源名称</span>
            <span class="coord-resource-value">{{ selectedResource.resource_name }}</span>
          </div>
          <div class="coord-resource-meta">
            <span class="coord-resource-label">区域属性</span>
            <span class="coord-resource-value">{{ selectedResource.resource_detail.type }}</span>
          </div>
          <div class="coord-resource-meta">
            <span class="coord-resource-label">坐标点数</span>
            <span class="coord-resource-value">{{ selectedResource.resource_detail.location.length }}</span>
          </div>
        </div>

        <div class="coord-resource-points-wrap">
          <div class="coord-section-title">坐标点位</div>
          <div class="coord-point-block">
            <div class="coord-point-head">
              <span>点位</span>
              <span>纬度</span>
              <span>经度</span>
              <span>高度</span>
            </div>
            <div
              v-for="point in selectedResource.resource_detail.location"
              :key="`${selectedResource.resource_id}-${point.point}`"
              class="coord-point-row"
            >
              <span>{{ point.point }}</span>
              <span>{{ point.latitude }}</span>
              <span>{{ point.longitude }}</span>
              <span>{{ point.altitude }}</span>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="coord-panel coord-resource-right coord-resource-empty-panel">
        <div class="coord-pane-title">资源清单</div>
        <div class="coord-resource-empty-copy">当前没有已解析的资源数据，右侧详情区已自动清空。</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { createInteractionTargetAttrs } from '../../../../shared/interaction/createInteractionTarget';
import { commandRecords, resourceRecords } from '../../data/commandDataModel';
import { loadTaskUnderstandingDb } from '../../state/taskUnderstandingLocalDb';

const taskDb = loadTaskUnderstandingDb({ mockCommands: commandRecords });
const resourceIdSet = new Set(
  Object.values(taskDb.analysisResultMap || {})
    .flatMap((item) => item?.resources || [])
    .map((item) => item?.resource_id)
    .filter((id) => id !== null && id !== undefined)
);

const resources = resourceRecords.filter((item) => resourceIdSet.has(item.resource_id));
const selectedResourceId = ref(resources[0]?.resource_id || null);
const selectedResource = computed(() => resources.find((item) => item.resource_id === selectedResourceId.value) || null);

watch(selectedResource, (value) => {
  if (!value) {
    selectedResourceId.value = resources[0]?.resource_id || null;
  }
}, { immediate: true });

const buildResourceTargetAttrs = (resource) => createInteractionTargetAttrs({
  targetId: `coordination:resource:${resource?.resource_id || ''}`,
  targetType: 'resource-item',
  label: resource?.resource_name || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'ResourceCatalogPanel',
  textPreview: resource?.resource_type || '',
});
</script>

<style scoped>
.coord-resource-shell {
  --coord-border: rgba(0, 208, 188, 0.4);
  --coord-border-soft: rgba(0, 208, 188, 0.26);
  --coord-bg: rgba(1, 16, 22, 0.84);
  --coord-text: #f1feff;
  display: flex;
  width: 100%;
  min-height: 100%;
}

.coord-resource-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 0.8rem;
  width: 100%;
}

.coord-panel {
  border-radius: 16px;
  border: 1px solid var(--coord-border);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    var(--coord-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05);
}

.coord-resource-left,
.coord-resource-right {
  padding: 0.9rem;
}

.coord-resource-empty-panel {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 240px;
}

.coord-pane-title {
  color: var(--coord-text);
  font-size: 1.14rem;
  font-weight: 800;
}

.coord-resource-list {
  margin-top: 0.72rem;
  display: flex;
  flex-direction: column;
  gap: 0.52rem;
}

.coord-resource-empty-state,
.coord-resource-empty-copy {
  margin-top: 0.72rem;
  border-radius: 12px;
  border: 1px dashed var(--coord-border-soft);
  color: rgba(226, 246, 248, 0.86);
  padding: 0.86rem 0.9rem;
  line-height: 1.7;
}

.coord-resource-item {
  border-radius: 12px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(1, 12, 18, 0.9);
  color: var(--coord-text);
  text-align: left;
  padding: 0.62rem 0.7rem;
  cursor: pointer;
}

.coord-resource-item.active {
  border-color: rgba(0, 222, 200, 0.54);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.1), rgba(0, 49, 72, 0.03)), rgba(1, 12, 18, 0.9);
}

.coord-resource-item-main { display: flex; align-items: center; gap: 0.35rem; }
.coord-resource-tag {
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  background: rgba(116, 219, 74, 0.16);
  color: #c1ffab;
  font-size: 0.8rem;
  font-weight: 700;
}
.coord-resource-name { font-size: 0.9rem; font-weight: 700; }
.coord-resource-sub { margin-top: 0.25rem; color: rgba(214, 237, 242, 0.82); font-size: 0.82rem; }

.coord-resource-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.coord-resource-chip {
  border-radius: 999px;
  padding: 0.16rem 0.6rem;
  border: 1px solid rgba(0, 222, 200, 0.36);
  color: #b4fff8;
  font-size: 0.76rem;
  font-weight: 700;
}

.coord-resource-meta-grid {
  margin-top: 0.7rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.52rem;
}

.coord-resource-meta {
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.66);
  padding: 0.5rem 0.58rem;
}

.coord-resource-label { color: rgba(196, 243, 248, 0.92); font-size: 0.82rem; font-weight: 700; }
.coord-resource-value { display: block; margin-top: 0.22rem; color: #ecfbff; font-size: 0.92rem; font-weight: 700; }

.coord-resource-points-wrap {
  margin-top: 0.82rem;
  padding-top: 0.72rem;
  border-top: 1px solid rgba(0, 222, 200, 0.16);
}

.coord-section-title { color: #eefcff; font-size: 1rem; font-weight: 800; }
.coord-point-block { margin-top: 0.44rem; border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.24); background: rgba(2, 18, 26, 0.62); overflow: hidden; }
.coord-point-head, .coord-point-row { display: grid; grid-template-columns: 1.15fr 1fr 1fr 0.8fr; gap: 0.5rem; align-items: center; padding: 0.46rem 0.56rem; }
.coord-point-head { background: rgba(0, 222, 200, 0.1); color: #b9fffa; font-size: 0.78rem; font-weight: 700; }
.coord-point-row { border-top: 1px solid rgba(0, 222, 200, 0.12); color: rgba(227, 248, 251, 0.92); font-size: 0.84rem; }

@media (max-width: 980px) {
  .coord-resource-layout { grid-template-columns: 1fr; }
  .coord-resource-meta-grid { grid-template-columns: 1fr; }
}
</style>
