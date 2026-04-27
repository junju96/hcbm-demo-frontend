<template>
  <div class="coord-resource-shell">
    <div class="coord-resource-layout">
      <!-- 左侧资源列表 -->
      <aside class="coord-panel coord-resource-left">
        <div class="coord-pane-title">资源池</div>

        <!-- 类型筛选 -->
        <div class="coord-resource-filters">
          <button
            v-for="tab in filterTabs"
            :key="tab.tag"
            class="coord-resource-filter-btn"
            :class="{ active: activeFilterTag === tab.tag }"
            type="button"
            @click="activeFilterTag = tab.tag"
          >
            {{ tab.label }}
            <span v-if="tab.count > 0" class="coord-resource-filter-count">{{ tab.count }}</span>
          </button>
        </div>

        <!-- 资源列表 -->
        <div v-if="filteredResources.length" class="coord-resource-list">
          <button
            v-for="resource in filteredResources"
            :key="resource.resource_id"
            class="coord-resource-item"
            :class="{ active: selectedResourceId === resource.resource_id }"
            type="button"
            v-bind="buildResourceTargetAttrs(resource)"
            @click="selectedResourceId = resource.resource_id"
          >
            <div class="coord-resource-item-top">
              <span
                class="coord-resource-tag"
                :class="`tag-${resource.resource_tag}`"
              >
                {{ tagLabel(resource.resource_tag) }}
              </span>
              <span class="coord-resource-name">{{ resource.resource_name }}</span>
            </div>
            <div class="coord-resource-sub">
              <span class="coord-resource-type">{{ RESOURCE_TYPE_LABELS[resource.resource_type] || resource.resource_type }}</span>
              <span v-if="resourceSubtitle(resource)" class="coord-resource-extra">
                {{ resourceSubtitle(resource) }}
              </span>
            </div>
          </button>
        </div>
        <div v-else class="coord-resource-empty-state">
          当前没有可展示的资源，请先完成命令解析或检查本地数据。
        </div>
      </aside>

      <!-- 右侧详情 -->
      <section class="coord-panel coord-resource-right" v-if="selectedResource">
        <ResourceDetailPanel :resource="selectedResource" />
      </section>

      <section v-else class="coord-panel coord-resource-right coord-resource-empty-panel">
        <div class="coord-pane-title">资源详情</div>
        <div class="coord-resource-empty-copy">当前没有已解析的资源数据，右侧详情区已自动清空。</div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { createInteractionTargetAttrs } from '../../../../shared/interaction/createInteractionTarget';
import {
  commandRecords,
  resourceRecords,
  RESOURCE_TAGS,
  RESOURCE_TAG_LABELS,
  RESOURCE_TYPE_LABELS,
} from '../../data/commandDataModel';
import { loadTaskUnderstandingDb } from '../../state/taskUnderstandingLocalDb';
import ResourceDetailPanel from './ResourceDetailPanel.vue';

/* ---------- 数据加载 ---------- */
const taskDb = loadTaskUnderstandingDb({ mockCommands: commandRecords });

const parsedResourceIds = new Set(
  Object.values(taskDb.analysisResultMap || {})
    .flatMap((item) => item?.resources || [])
    .map((item) => item?.resource_id)
    .filter((id) => id !== null && id !== undefined)
);

const resources = resourceRecords.filter((item) => parsedResourceIds.has(item.resource_id));

/* ---------- 状态 ---------- */
const activeFilterTag = ref('ALL');
const selectedResourceId = ref(resources[0]?.resource_id || null);

const filteredResources = computed(() => {
  if (activeFilterTag.value === 'ALL') {
    return resources;
  }
  return resources.filter((r) => r.resource_tag === activeFilterTag.value);
});

const selectedResource = computed(() => {
  return resources.find((item) => item.resource_id === selectedResourceId.value) || null;
});

/* ---------- 筛选标签 ---------- */
const filterTabs = computed(() => {
  const allCount = resources.length;
  const tabs = [
    { tag: 'ALL', label: '全部', count: allCount },
    ...Object.values(RESOURCE_TAGS).map((tag) => ({
      tag,
      label: RESOURCE_TAG_LABELS[tag],
      count: resources.filter((r) => r.resource_tag === tag).length,
    })),
  ];
  return tabs;
});

/* ---------- 辅助 ---------- */
const tagLabel = (tag) => RESOURCE_TAG_LABELS[tag] || tag;

const resourceSubtitle = (resource) => {
  const detail = resource.resource_detail;
  switch (resource.resource_tag) {
    case 'TS_TARGET':
      return detail?.type ? `敌我: ${detail.type}` : '';
    case 'EQUIPMENT':
      return detail?.running_status ? `状态: ${detail.running_status}` : '';
    case 'FIREPOWER':
      return detail?.quantity !== undefined ? `数量: ${detail.quantity}` : '';
    case 'RECON':
      return detail?.online_status ? `状态: ${detail.online_status}` : '';
    case 'SUPPORT':
      return detail?.current_status ? `状态: ${detail.current_status}` : '';
    default:
      return '';
  }
};

/* ---------- 监听 ---------- */
watch(filteredResources, (list) => {
  if (!list.some((r) => r.resource_id === selectedResourceId.value)) {
    selectedResourceId.value = list[0]?.resource_id || null;
  }
}, { immediate: true });

watch(selectedResource, (value) => {
  if (!value) {
    selectedResourceId.value = filteredResources.value[0]?.resource_id || null;
  }
}, { immediate: true });

/* ---------- 语义目标 ---------- */
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
  overflow-y: auto;
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

/* 筛选标签 */
.coord-resource-filters {
  margin-top: 0.6rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.coord-resource-filter-btn {
  border-radius: 8px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(1, 12, 18, 0.9);
  color: rgba(214, 237, 242, 0.86);
  padding: 0.32rem 0.52rem;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.coord-resource-filter-btn:hover {
  border-color: rgba(0, 222, 200, 0.5);
}

.coord-resource-filter-btn.active {
  border-color: rgba(0, 222, 200, 0.54);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.12), rgba(0, 49, 72, 0.03)), rgba(1, 12, 18, 0.9);
  color: #f1feff;
}

.coord-resource-filter-count {
  border-radius: 999px;
  padding: 0.04rem 0.34rem;
  background: rgba(0, 222, 200, 0.18);
  color: #b4fff8;
  font-size: 0.7rem;
  font-weight: 700;
}

/* 资源列表 */
.coord-resource-list {
  margin-top: 0.52rem;
  display: flex;
  flex-direction: column;
  gap: 0.44rem;
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
  padding: 0.58rem 0.64rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.coord-resource-item:hover {
  border-color: rgba(0, 222, 200, 0.4);
}

.coord-resource-item.active {
  border-color: rgba(0, 222, 200, 0.54);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.1), rgba(0, 49, 72, 0.03)), rgba(1, 12, 18, 0.9);
}

.coord-resource-item-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.coord-resource-tag {
  border-radius: 999px;
  padding: 0.08rem 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.coord-resource-tag.tag-TS_TARGET {
  background: rgba(255, 183, 77, 0.16);
  color: #ffd180;
}
.coord-resource-tag.tag-EQUIPMENT {
  background: rgba(77, 182, 255, 0.16);
  color: #a8d8ff;
}
.coord-resource-tag.tag-FIREPOWER {
  background: rgba(255, 82, 82, 0.16);
  color: #ffadad;
}
.coord-resource-tag.tag-RECON {
  background: rgba(156, 77, 255, 0.16);
  color: #d4b3ff;
}
.coord-resource-tag.tag-SUPPORT {
  background: rgba(77, 255, 136, 0.16);
  color: #b3ffcc;
}

.coord-resource-name {
  font-size: 0.9rem;
  font-weight: 700;
}

.coord-resource-sub {
  margin-top: 0.28rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.coord-resource-type {
  color: rgba(214, 237, 242, 0.82);
  font-size: 0.78rem;
}

.coord-resource-extra {
  color: rgba(196, 243, 248, 0.7);
  font-size: 0.76rem;
}

@media (max-width: 980px) {
  .coord-resource-layout {
    grid-template-columns: 1fr;
  }
}
</style>
