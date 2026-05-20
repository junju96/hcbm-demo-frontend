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
        <div class="res-detail-header">
          <div class="res-detail-title-group">
            <span class="res-detail-name">{{ selectedResource.resource_name }}</span>
            <span class="res-detail-chip" :class="`tag-${selectedResource.resource_tag}`">
              {{ tagLabel(selectedResource.resource_tag) }}
            </span>
          </div>
          <span class="res-detail-type">{{ RESOURCE_TYPE_LABELS[selectedResource.resource_type] || selectedResource.resource_type }}</span>
        </div>

        <div class="res-detail-meta-grid">
          <div class="res-detail-meta">
            <span class="res-detail-meta-label">资源编号</span>
            <span class="res-detail-meta-value">{{ selectedResource.resource_id }}</span>
          </div>
          <div class="res-detail-meta">
            <span class="res-detail-meta-label">关联命令</span>
            <span class="res-detail-meta-value">{{ connectedCommandsText }}</span>
          </div>
          <div class="res-detail-meta">
            <span class="res-detail-meta-label">关联计划</span>
            <span class="res-detail-meta-value">{{ connectedPlansText }}</span>
          </div>
        </div>

        <div v-if="selectedResource.resource_tag === 'TS_TARGET'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">态势属性</div>
            <div class="res-detail-kv-grid">
              <div class="res-detail-kv"><span class="res-detail-kv-key">敌我类型</span><span class="res-detail-kv-val">{{ t(detail.type) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">威胁等级</span><span class="res-detail-kv-val" :class="`threat-${detail.threat_level}`">{{ t(detail.threat_level) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">威胁值</span><span class="res-detail-kv-val">{{ t(detail.value) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">运动状态</span><span class="res-detail-kv-val">{{ t(detail.motion) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">意图</span><span class="res-detail-kv-val">{{ t(detail.intent) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">处理等级</span><span class="res-detail-kv-val">{{ t(detail.handle_tier) }}</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">建议处置</span><span class="res-detail-kv-val">{{ detail.suggestion }}</span></div>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">区域坐标</div>
            <div class="res-detail-table">
              <div class="res-detail-table-head"><span>点位</span><span>纬度</span><span>经度</span><span>高度</span></div>
              <div v-for="point in detail.location" :key="point.point" class="res-detail-table-row">
                <span>{{ point.point }}</span><span>{{ point.latitude }}</span><span>{{ point.longitude }}</span><span>{{ point.altitude }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedResource.resource_tag === 'EQUIPMENT'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">平台信息</div>
            <div class="res-detail-kv-grid cols-3">
              <div class="res-detail-kv"><span class="res-detail-kv-key">平台类型</span><span class="res-detail-kv-val">{{ t(detail.platform_type) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">运行状态</span><span class="res-detail-kv-val" :class="`status-${detail.running_status}`">{{ t(detail.running_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">当前任务</span><span class="res-detail-kv-val">{{ detail.current_task }}</span></div>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">载荷模块</div>
            <div class="res-detail-tags">
              <span v-for="mod in detail.payload_modules" :key="mod" class="res-detail-tag">{{ mod }}</span>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">能力参数</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv"><span class="res-detail-kv-key">最大航程</span><span class="res-detail-kv-val">{{ detail.mobility?.max_range_km }} km</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">最大速度</span><span class="res-detail-kv-val">{{ detail.mobility?.max_speed_kmh }} km/h</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">地形适应</span><span class="res-detail-kv-val">{{ t(detail.mobility?.terrain_adaptability) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">打击射程</span><span class="res-detail-kv-val">{{ detail.strike_capability?.max_range_km }} km</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">武器类型</span><span class="res-detail-kv-val">{{ (detail.strike_capability?.weapon_types || []).map(t).join('、') || '无' }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">侦察射程</span><span class="res-detail-kv-val">{{ detail.recon_capability?.max_range_km }} km</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">侦察方式</span><span class="res-detail-kv-val">{{ (detail.recon_capability?.methods || []).map(t).join('、') || '无' }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="selectedResource.resource_tag === 'FIREPOWER'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">火力参数</div>
            <div class="res-detail-kv-grid cols-3">
              <div class="res-detail-kv"><span class="res-detail-kv-key">数量</span><span class="res-detail-kv-val">{{ detail.quantity }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">武器类型</span><span class="res-detail-kv-val">{{ t(detail.weapon_type) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">弹药状态</span><span class="res-detail-kv-val" :class="`status-${detail.ammo_status}`">{{ t(detail.ammo_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">打击范围</span><span class="res-detail-kv-val">{{ detail.strike_range_km }} km</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">所属装备</span><span class="res-detail-kv-val">{{ detail.belonging_equipment?.resource_name }} (#{{ detail.belonging_equipment?.resource_id }})</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">杀伤效能</span><span class="res-detail-kv-val">{{ t(detail.lethality?.effect_type) }} — {{ detail.lethality?.effect_value }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="selectedResource.resource_tag === 'RECON'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">侦察参数</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv"><span class="res-detail-kv-key">侦察方式</span><span class="res-detail-kv-val">{{ (detail.recon_methods || []).map(t).join('、') }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">侦察范围</span><span class="res-detail-kv-val">{{ detail.recon_range_km ?? '—' }} km</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">在线状态</span><span class="res-detail-kv-val" :class="`status-${detail.online_status}`">{{ t(detail.online_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">所属平台</span><span class="res-detail-kv-val">{{ detail.resource_platform?.resource_name }} (#{{ detail.resource_platform?.resource_id }})</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">覆盖范围</span><span class="res-detail-kv-val">{{ detail.coverage_focus }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="selectedResource.resource_tag === 'SUPPORT'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">保障参数</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv"><span class="res-detail-kv-key">保障单位</span><span class="res-detail-kv-val">{{ detail.support_unit }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">保障能力</span><span class="res-detail-kv-val">{{ detail.support_capability }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">机动能力</span><span class="res-detail-kv-val">{{ detail.mobility_capability }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">当前状态</span><span class="res-detail-kv-val" :class="`status-${detail.current_status}`">{{ t(detail.current_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">保障类别</span><span class="res-detail-kv-val">{{ t(detail.support_category) }}</span></div>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">部署位置</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">位置名称</span><span class="res-detail-kv-val">{{ detail.deployment_location?.location_name || '—' }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">纬度</span><span class="res-detail-kv-val">{{ detail.deployment_location?.latitude }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">经度</span><span class="res-detail-kv-val">{{ detail.deployment_location?.longitude }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">高度</span><span class="res-detail-kv-val">{{ detail.deployment_location?.altitude }} m</span></div>
            </div>
          </div>
        </div>
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
  translateResourceField,
} from '../../data/commandDataModel';
import { loadTaskUnderstandingDb } from '../../state/taskUnderstandingLocalDb';

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

/* ---------- 详情辅助 ---------- */
const tagLabel = (tag) => RESOURCE_TAG_LABELS[tag] || tag;
const t = translateResourceField;

const detail = computed(() => selectedResource.value?.resource_detail || {});
const connectedCommandsText = computed(() => {
  const ids = selectedResource.value?.connections?.connected_commands || [];
  return ids.length ? ids.map((id) => `命令${id}`).join('、') : '无';
});
const connectedPlansText = computed(() => {
  const ids = selectedResource.value?.connections?.connected_plans || [];
  return ids.length ? ids.map((id) => `方案${id}`).join('、') : '无';
});

const resourceSubtitle = (resource) => {
  const detail = resource.resource_detail;
  switch (resource.resource_tag) {
    case 'TS_TARGET':
      return detail?.type ? `敌我: ${t(detail.type)}` : '';
    case 'EQUIPMENT':
      return detail?.running_status ? `状态: ${t(detail.running_status)}` : '';
    case 'FIREPOWER':
      return detail?.quantity !== undefined ? `数量: ${detail.quantity}` : '';
    case 'RECON':
      return detail?.online_status ? `状态: ${t(detail.online_status)}` : '';
    case 'SUPPORT':
      return detail?.current_status ? `状态: ${t(detail.current_status)}` : '';
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
  flex-wrap: nowrap;
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.2rem;
  scrollbar-width: none;
}
.coord-resource-filters::-webkit-scrollbar {
  display: none;
}

.coord-resource-filter-btn {
  border-radius: 8px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(1, 12, 18, 0.9);
  color: rgba(214, 237, 242, 0.86);
  padding: 0.35rem 0.65rem;
  font-size: 0.82rem;
  white-space: nowrap;
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

/* 资源详情内联样式 */
.res-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.res-detail-title-group { display: flex; align-items: center; gap: 0.5rem; }
.res-detail-name { color: var(--coord-text); font-size: 1.12rem; font-weight: 800; }
.res-detail-chip {
  border-radius: 999px;
  padding: 0.12rem 0.52rem;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid;
}
.res-detail-chip.tag-TS_TARGET { background: rgba(255, 183, 77, 0.14); color: #ffd180; border-color: rgba(255, 183, 77, 0.4); }
.res-detail-chip.tag-EQUIPMENT { background: rgba(77, 182, 255, 0.14); color: #a8d8ff; border-color: rgba(77, 182, 255, 0.4); }
.res-detail-chip.tag-FIREPOWER { background: rgba(255, 82, 82, 0.14); color: #ffadad; border-color: rgba(255, 82, 82, 0.4); }
.res-detail-chip.tag-RECON { background: rgba(156, 77, 255, 0.14); color: #d4b3ff; border-color: rgba(156, 77, 255, 0.4); }
.res-detail-chip.tag-SUPPORT { background: rgba(77, 255, 136, 0.14); color: #b3ffcc; border-color: rgba(77, 255, 136, 0.4); }
.res-detail-type { color: rgba(214, 237, 242, 0.82); font-size: 0.82rem; font-weight: 600; }

.res-detail-meta-grid {
  margin-top: 0.7rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.52rem;
}
.res-detail-meta {
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.66);
  padding: 0.5rem 0.58rem;
}
.res-detail-meta-label { color: rgba(196, 243, 248, 0.92); font-size: 0.82rem; font-weight: 700; }
.res-detail-meta-value { display: block; margin-top: 0.22rem; color: #ecfbff; font-size: 0.92rem; font-weight: 700; }

.res-detail-section { margin-top: 0.82rem; padding-top: 0.72rem; border-top: 1px solid rgba(0, 222, 200, 0.16); }
.res-detail-section-title { color: #eefcff; font-size: 1rem; font-weight: 800; }

.res-detail-kv-grid {
  margin-top: 0.44rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.44rem;
}
.res-detail-kv-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.res-detail-kv {
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.66);
  padding: 0.5rem 0.58rem;
}
.res-detail-kv.wide { grid-column: 1 / -1; }
.res-detail-kv-key { color: rgba(196, 243, 248, 0.92); font-size: 0.82rem; font-weight: 700; }
.res-detail-kv-val {
  display: block;
  margin-top: 0.22rem;
  color: #ecfbff;
  font-size: 0.9rem;
  font-weight: 700;
  overflow-wrap: break-word;
  word-break: break-word;
}
.res-detail-kv-val.threat-low { color: #a8ff8a; }
.res-detail-kv-val.threat-medium { color: #ffe08a; }
.res-detail-kv-val.threat-high { color: #ff8a8a; }
.res-detail-kv-val.threat-unknown { color: rgba(214, 237, 242, 0.7); }
.res-detail-kv-val.status-online { color: #a8ff8a; }
.res-detail-kv-val.status-offline { color: #ff8a8a; }
.res-detail-kv-val.status-maintenance { color: #ffe08a; }
.res-detail-kv-val.status-ready { color: #a8ff8a; }
.res-detail-kv-val.status-standby { color: #ffe08a; }

.res-detail-tags { margin-top: 0.44rem; display: flex; flex-wrap: wrap; gap: 0.38rem; }
.res-detail-tag {
  border-radius: 8px;
  padding: 0.3rem 0.56rem;
  background: rgba(0, 222, 200, 0.1);
  border: 1px solid rgba(0, 222, 200, 0.3);
  color: #b4fff8;
  font-size: 0.82rem;
  font-weight: 600;
}

.res-detail-table {
  margin-top: 0.44rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.24);
  background: rgba(2, 18, 26, 0.62);
  overflow: hidden;
}
.res-detail-table-head, .res-detail-table-row {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr 0.8fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.46rem 0.56rem;
}
.res-detail-table-head { background: rgba(0, 222, 200, 0.1); color: #b9fffa; font-size: 0.78rem; font-weight: 700; }
.res-detail-table-row { border-top: 1px solid rgba(0, 222, 200, 0.12); color: rgba(227, 248, 251, 0.92); font-size: 0.84rem; }

@media (max-width: 980px) {
  .coord-resource-layout {
    grid-template-columns: 1fr;
  }
}
</style>
