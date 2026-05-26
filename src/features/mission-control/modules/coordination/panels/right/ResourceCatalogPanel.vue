<template>
  <div class="coord-resource-shell">
    <!-- 顶部标题 + 筛选（全宽） -->
    <div class="coord-resource-top-bar">
      <div class="coord-pane-title">
        <template v-if="viewMode === 'detail' && detailResource">资源详情</template>
        <template v-else>资源池</template>
      </div>
      <div v-if="viewMode === 'list'" class="coord-resource-filters">
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
      <button
        v-if="viewMode === 'detail' && detailResource"
        class="coord-resource-back-btn"
        type="button"
        @click="goBack"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        返回
      </button>
    </div>

    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="coord-resource-list-view">
      <div v-if="filteredResources.length" class="coord-resource-list">
        <div
          v-for="resource in filteredResources"
          :key="resource.resource_id"
          class="coord-resource-card"
          v-bind="buildResourceTargetAttrs(resource)"
        >
          <div class="coord-resource-card-main">
            <div class="coord-resource-card-header">
              <div class="coord-resource-card-title-row">
                <span
                  class="coord-resource-tag"
                  :class="`tag-${resource.resource_tag}`"
                >
                  {{ tagLabel(resource.resource_tag) }}
                </span>
                <span class="coord-resource-type">{{ RESOURCE_TYPE_LABELS[resource.resource_type] || resource.resource_type }}</span>
                <span class="coord-resource-name">{{ resource.resource_name }}</span>
              </div>
              <button
                class="coord-resource-detail-btn"
                type="button"
                @click="openDetail(resource)"
              >
                详情
              </button>
            </div>
            <div class="coord-resource-card-params">
              <div
                v-for="(param, idx) in getResourceMainParams(resource)"
                :key="idx"
                class="coord-resource-param-cell"
              >
                <div class="coord-resource-param-label">{{ param.label }}</div>
                <div class="coord-resource-param-value" :class="param.class">{{ param.value }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="coord-resource-empty-state">
        当前没有可展示的资源，请先完成命令解析或检查本地数据。
      </div>
    </div>

    <!-- 详情视图 -->
    <div v-else-if="viewMode === 'detail' && detailResource" class="coord-resource-detail-view">
      <section class="coord-panel coord-resource-detail-panel">
        <div class="res-detail-header">
          <div class="res-detail-title-group">
            <span class="res-detail-name">{{ detailResource.resource_name }}</span>
            <span class="res-detail-chip" :class="`tag-${detailResource.resource_tag}`">
              {{ tagLabel(detailResource.resource_tag) }}
            </span>
          </div>
          <span class="res-detail-type">{{ RESOURCE_TYPE_LABELS[detailResource.resource_type] || detailResource.resource_type }}</span>
        </div>

        <div class="res-detail-meta-grid">
          <div class="res-detail-meta">
            <span class="res-detail-meta-label">资源编号</span>
            <span class="res-detail-meta-value">{{ detailResource.resource_id }}</span>
          </div>
          <div class="res-detail-meta">
            <span class="res-detail-meta-label">关联命令</span>
            <span class="res-detail-meta-value">{{ connectedCommandsTextDetail }}</span>
          </div>
          <div class="res-detail-meta">
            <span class="res-detail-meta-label">关联计划</span>
            <span class="res-detail-meta-value">{{ connectedPlansTextDetail }}</span>
          </div>
        </div>

        <div v-if="detailResource.resource_tag === 'TS_TARGET'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">态势属性</div>
            <div class="res-detail-kv-grid">
              <div class="res-detail-kv"><span class="res-detail-kv-key">敌我类型</span><span class="res-detail-kv-val">{{ t(detailViewData.type) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">威胁等级</span><span class="res-detail-kv-val" :class="`threat-${detailViewData.threat_level}`">{{ t(detailViewData.threat_level) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">威胁值</span><span class="res-detail-kv-val">{{ t(detailViewData.value) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">运动状态</span><span class="res-detail-kv-val">{{ t(detailViewData.motion) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">意图</span><span class="res-detail-kv-val">{{ t(detailViewData.intent) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">处理等级</span><span class="res-detail-kv-val">{{ t(detailViewData.handle_tier) }}</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">建议处置</span><span class="res-detail-kv-val">{{ detailViewData.suggestion }}</span></div>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">区域坐标</div>
            <div class="res-detail-table">
              <div class="res-detail-table-head"><span>点位</span><span>纬度</span><span>经度</span><span>高度</span></div>
              <div v-for="point in detailViewData.location" :key="point.point" class="res-detail-table-row">
                <span>{{ point.point }}</span><span>{{ point.latitude }}</span><span>{{ point.longitude }}</span><span>{{ point.altitude }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="detailResource.resource_tag === 'EQUIPMENT'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">平台信息</div>
            <div class="res-detail-kv-grid cols-3">
              <div class="res-detail-kv"><span class="res-detail-kv-key">平台类型</span><span class="res-detail-kv-val">{{ t(detailViewData.platform_type) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">运行状态</span><span class="res-detail-kv-val" :class="`status-${detailViewData.running_status}`">{{ t(detailViewData.running_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">当前任务</span><span class="res-detail-kv-val">{{ detailViewData.current_task }}</span></div>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">载荷模块</div>
            <div class="res-detail-tags">
              <span v-for="mod in detailViewData.payload_modules" :key="mod" class="res-detail-tag">{{ mod }}</span>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">能力参数</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv"><span class="res-detail-kv-key">最大航程</span><span class="res-detail-kv-val">{{ detailViewData.mobility?.max_range_km }} km</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">最大速度</span><span class="res-detail-kv-val">{{ detailViewData.mobility?.max_speed_kmh }} km/h</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">地形适应</span><span class="res-detail-kv-val">{{ t(detailViewData.mobility?.terrain_adaptability) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">打击射程</span><span class="res-detail-kv-val">{{ detailViewData.strike_capability?.max_range_km }} km</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">武器类型</span><span class="res-detail-kv-val">{{ (detailViewData.strike_capability?.weapon_types || []).map(t).join('、') || '无' }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">侦察射程</span><span class="res-detail-kv-val">{{ detailViewData.recon_capability?.max_range_km }} km</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">侦察方式</span><span class="res-detail-kv-val">{{ (detailViewData.recon_capability?.methods || []).map(t).join('、') || '无' }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="detailResource.resource_tag === 'FIREPOWER'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">火力参数</div>
            <div class="res-detail-kv-grid cols-3">
              <div class="res-detail-kv"><span class="res-detail-kv-key">数量</span><span class="res-detail-kv-val">{{ detailViewData.quantity }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">武器类型</span><span class="res-detail-kv-val">{{ t(detailViewData.weapon_type) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">弹药状态</span><span class="res-detail-kv-val" :class="`status-${detailViewData.ammo_status}`">{{ t(detailViewData.ammo_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">打击范围</span><span class="res-detail-kv-val">{{ detailViewData.strike_range_km }} km</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">所属装备</span><span class="res-detail-kv-val">{{ detailViewData.belonging_equipment?.resource_name }} (#{{ detailViewData.belonging_equipment?.resource_id }})</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">杀伤效能</span><span class="res-detail-kv-val">{{ t(detailViewData.lethality?.effect_type) }} — {{ detailViewData.lethality?.effect_value }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="detailResource.resource_tag === 'RECON'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">侦察参数</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv"><span class="res-detail-kv-key">侦察方式</span><span class="res-detail-kv-val">{{ (detailViewData.recon_methods || []).map(t).join('、') }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">侦察范围</span><span class="res-detail-kv-val">{{ detailViewData.recon_range_km ?? '—' }} km</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">在线状态</span><span class="res-detail-kv-val" :class="`status-${detailViewData.online_status}`">{{ t(detailViewData.online_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">所属平台</span><span class="res-detail-kv-val">{{ detailViewData.resource_platform?.resource_name }} (#{{ detailViewData.resource_platform?.resource_id }})</span></div>
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">覆盖范围</span><span class="res-detail-kv-val">{{ detailViewData.coverage_focus }}</span></div>
            </div>
          </div>
        </div>

        <div v-if="detailResource.resource_tag === 'SUPPORT'" class="res-detail-type-section">
          <div class="res-detail-section">
            <div class="res-detail-section-title">保障参数</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv"><span class="res-detail-kv-key">保障单位</span><span class="res-detail-kv-val">{{ detailViewData.support_unit }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">保障能力</span><span class="res-detail-kv-val">{{ detailViewData.support_capability }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">机动能力</span><span class="res-detail-kv-val">{{ detailViewData.mobility_capability }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">当前状态</span><span class="res-detail-kv-val" :class="`status-${detailViewData.current_status}`">{{ t(detailViewData.current_status) }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">保障类别</span><span class="res-detail-kv-val">{{ t(detailViewData.support_category) }}</span></div>
            </div>
          </div>
          <div class="res-detail-section">
            <div class="res-detail-section-title">部署位置</div>
            <div class="res-detail-kv-grid cols-2">
              <div class="res-detail-kv wide"><span class="res-detail-kv-key">位置名称</span><span class="res-detail-kv-val">{{ detailViewData.deployment_location?.location_name || '—' }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">纬度</span><span class="res-detail-kv-val">{{ detailViewData.deployment_location?.latitude }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">经度</span><span class="res-detail-kv-val">{{ detailViewData.deployment_location?.longitude }}</span></div>
              <div class="res-detail-kv"><span class="res-detail-kv-key">高度</span><span class="res-detail-kv-val">{{ detailViewData.deployment_location?.altitude }} m</span></div>
            </div>
          </div>
        </div>
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
const viewMode = ref('list'); // 'list' | 'detail'
const detailResource = ref(null);

const filteredResources = computed(() => {
  if (activeFilterTag.value === 'ALL') {
    return resources;
  }
  return resources.filter((r) => r.resource_tag === activeFilterTag.value);
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

const detailViewData = computed(() => detailResource.value?.resource_detail || {});
const connectedCommandsTextDetail = computed(() => {
  const ids = detailResource.value?.connections?.connected_commands || [];
  return ids.length ? ids.map((id) => `命令${id}`).join('、') : '无';
});
const connectedPlansTextDetail = computed(() => {
  const ids = detailResource.value?.connections?.connected_plans || [];
  return ids.length ? ids.map((id) => `方案${id}`).join('、') : '无';
});

/* ---------- 主要参数提取 ---------- */
const getResourceMainParams = (resource) => {
  const detail = resource.resource_detail;
  const params = [];
  switch (resource.resource_tag) {
    case 'TS_TARGET':
      params.push(
        { label: '敌我类型', value: t(detail?.type), class: '' },
        { label: '威胁等级', value: t(detail?.threat_level), class: `threat-${detail?.threat_level}` },
        { label: '运动状态', value: t(detail?.motion), class: '' }
      );
      break;
    case 'EQUIPMENT':
      params.push(
        { label: '平台类型', value: t(detail?.platform_type), class: '' },
        { label: '运行状态', value: t(detail?.running_status), class: `status-${detail?.running_status}` },
        { label: '当前任务', value: detail?.current_task || '—', class: '' }
      );
      break;
    case 'FIREPOWER':
      params.push(
        { label: '数量', value: detail?.quantity !== undefined ? detail.quantity : '—', class: '' },
        { label: '武器类型', value: t(detail?.weapon_type), class: '' },
        { label: '弹药状态', value: t(detail?.ammo_status), class: `status-${detail?.ammo_status}` }
      );
      break;
    case 'RECON':
      params.push(
        { label: '侦察方式', value: (detail?.recon_methods || []).map(t).join('、') || '—', class: '' },
        { label: '在线状态', value: t(detail?.online_status), class: `status-${detail?.online_status}` },
        { label: '覆盖范围', value: detail?.coverage_focus || '—', class: '' }
      );
      break;
    case 'SUPPORT':
      params.push(
        { label: '保障能力', value: detail?.support_capability || '—', class: '' },
        { label: '当前状态', value: t(detail?.current_status), class: `status-${detail?.current_status}` },
        { label: '保障类别', value: t(detail?.support_category), class: '' }
      );
      break;
  }
  return params;
};

/* ---------- 视图切换 ---------- */
const openDetail = (resource) => {
  detailResource.value = resource;
  viewMode.value = 'detail';
};

const goBack = () => {
  viewMode.value = 'list';
  detailResource.value = null;
};

/* ---------- 监听 ---------- */
watch(filteredResources, () => {
  if (viewMode.value === 'detail') {
    goBack();
  }
}, { flush: 'post' });

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
  flex-direction: column;
  width: 100%;
  min-height: 100%;
  gap: 0.7rem;
}

.coord-resource-top-bar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.2rem 0.5rem;
  flex-wrap: nowrap;
  border-bottom: 1px solid rgba(0, 208, 188, 0.2);
  margin-bottom: 0.6rem;
}

.coord-pane-title {
  color: var(--coord-text);
  font-size: 1.14rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* 返回按钮 */
.coord-resource-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: none;
  background: rgba(0, 222, 200, 0.12);
  color: #b4fff8;
  padding: 0.32rem 0.64rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 180ms ease, color 180ms ease;
  margin-left: auto;
}
.coord-resource-back-btn:hover {
  background: rgba(0, 222, 200, 0.24);
  color: #e2fffc;
}

/* 筛选标签 */
.coord-resource-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  overflow-x: auto;
  padding-bottom: 0;
  scrollbar-width: none;
  flex: 1;
}
.coord-resource-filters::-webkit-scrollbar {
  display: none;
}

.coord-resource-filter-btn {
  position: relative;
  border: none;
  background: transparent;
  color: rgba(196, 243, 248, 0.6);
  padding: 0.38rem 0.72rem 0.52rem;
  font-size: 0.9rem;
  white-space: nowrap;
  font-weight: 600;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 10px 10px 0 0;
}

.coord-resource-filter-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  width: 80%;
  height: 3px;
  border-radius: 999px;
  background: var(--coord-accent, #00dec8);
  opacity: 0;
  transform: scaleX(0.6);
  transition: opacity 180ms ease, transform 180ms ease;
}

.coord-resource-filter-btn:hover {
  color: rgba(196, 243, 248, 0.9);
}

.coord-resource-filter-btn.active {
  color: var(--coord-accent, #00dec8);
  background: rgba(0, 222, 200, 0.1);
  border-radius: 10px 10px 0 0;
}

.coord-resource-filter-btn.active::after {
  opacity: 1;
  transform: scaleX(1);
}

.coord-resource-filter-count {
  border-radius: 999px;
  padding: 0.04rem 0.34rem;
  background: rgba(0, 222, 200, 0.18);
  color: #b4fff8;
  font-size: 0.7rem;
  font-weight: 700;
}

/* 列表视图 */
.coord-resource-list-view {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 0.2rem;
}

.coord-resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.coord-resource-empty-state {
  border-radius: 12px;
  border: 1px dashed var(--coord-border-soft);
  color: rgba(226, 246, 248, 0.86);
  padding: 0.86rem 0.9rem;
  line-height: 1.7;
}

/* 资源卡片 */
.coord-resource-card {
  position: relative;
  border-radius: 12px;
  border: 1px solid rgba(0, 208, 188, 0.28);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68);
  padding: 0.7rem 0.8rem;
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 6px 14px rgba(0, 0, 0, 0.16);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.coord-resource-card:hover {
  border-color: rgba(0, 222, 200, 0.5);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.07), rgba(0, 222, 200, 0.025)), rgba(0, 18, 24, 0.75);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.08), 0 8px 22px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
}

.coord-resource-card-main {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.coord-resource-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.coord-resource-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  color: var(--coord-text);
  font-size: 0.95rem;
  font-weight: 700;
}

.coord-resource-type {
  color: rgba(214, 237, 242, 0.82);
  font-size: 0.78rem;
}

/* 参数区域 — 网格块 */
.coord-resource-card-params {
  margin-top: 0.3rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.46rem;
}

.coord-resource-param-cell {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(2, 20, 27, 0.6);
  padding: 0.44rem 0.52rem;
  min-width: 0;
}

.coord-resource-param-label {
  color: rgba(153, 218, 227, 0.85);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.coord-resource-param-value {
  margin-top: 0.18rem;
  color: rgba(241, 254, 255, 0.96);
  font-size: 0.88rem;
  font-weight: 700;
  line-height: 1.4;
  word-break: break-word;
}
.coord-resource-param-value.threat-low { color: #a8ff8a; }
.coord-resource-param-value.threat-medium { color: #ffe08a; }
.coord-resource-param-value.threat-high { color: #ff8a8a; }
.coord-resource-param-value.threat-unknown { color: rgba(214, 237, 242, 0.7); }
.coord-resource-param-value.status-online { color: #a8ff8a; }
.coord-resource-param-value.status-offline { color: #ff8a8a; }
.coord-resource-param-value.status-maintenance { color: #ffe08a; }
.coord-resource-param-value.status-ready { color: #a8ff8a; }
.coord-resource-param-value.status-standby { color: #ffe08a; }

/* 详情按钮 */
.coord-resource-detail-btn {
  border: 1px solid rgba(0, 222, 200, 0.32);
  background: rgba(0, 222, 200, 0.08);
  color: #b4fff8;
  padding: 0.36rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 180ms ease, border-color 180ms ease, color 180ms ease, box-shadow 180ms ease;
  white-space: nowrap;
  flex-shrink: 0;
}
.coord-resource-detail-btn:hover {
  background: rgba(0, 222, 200, 0.18);
  border-color: rgba(0, 222, 200, 0.5);
  color: #e2fffc;
  box-shadow: 0 0 8px rgba(0, 222, 200, 0.12);
}

/* 详情视图 */
.coord-resource-detail-view {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.coord-panel {
  border-radius: 16px;
  border: 1px solid var(--coord-border);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    var(--coord-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05);
  padding: 0.9rem;
}

/* 资源详情样式 */
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

@media (max-width: 720px) {
  .coord-resource-card {
    flex-direction: column;
    gap: 0.6rem;
  }
  .coord-resource-card-actions {
    align-self: flex-end;
  }
  .res-detail-meta-grid {
    grid-template-columns: 1fr;
  }
}
</style>
