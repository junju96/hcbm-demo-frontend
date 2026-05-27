<template>
  <div class="resource-pool-shell">
    <!-- 顶部标题 + 筛选 -->
    <div class="resource-pool-header">
      <span class="resource-pool-title">资源池</span>
      <div class="resource-pool-filters">
        <button
          v-for="tab in filterTabs"
          :key="tab.tag"
          class="resource-pool-filter-btn"
          :class="{ active: activeFilterTag === tab.tag }"
          type="button"
          @click="activeFilterTag = tab.tag"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="resource-pool-filter-count">{{ tab.count }}</span>
        </button>
      </div>
      <span class="resource-pool-total">共 {{ resources.length }} 条</span>
    </div>

    <!-- 分类区域 -->
    <div class="resource-pool-body">
      <div
        v-for="group in groupedResources"
        :key="group.tag"
        class="resource-category"
      >
        <!-- 分类标题栏 -->
        <div class="resource-category-header">
          <div class="resource-category-title">
            <span
              class="resource-category-dot"
              :class="`dot-${group.tag}`"
            />
            <span class="resource-category-name">{{ group.label }}</span>
            <span class="resource-category-count">{{ group.items.length }}</span>
          </div>
        </div>

        <!-- 横向排列的卡片行 -->
        <div class="resource-category-row">
          <div
            v-for="resource in group.items"
            :key="resource.resource_id"
            class="resource-full-card"
            v-bind="buildResourceTargetAttrs(resource)"
          >
            <!-- 卡片头部 -->
            <div class="rfc-header">
              <span
                class="rfc-tag"
                :class="`tag-${resource.resource_tag}`"
              >
                {{ tagLabel(resource.resource_tag) }}
              </span>
              <span class="rfc-type">{{ RESOURCE_TYPE_LABELS[resource.resource_type] || resource.resource_type }}</span>
              <span class="rfc-name">{{ resource.resource_name }}</span>
            </div>

            <!-- 卡片内容：完整详情 -->
            <div class="rfc-body">
              <!-- 通用元信息 -->
              <div class="rfc-meta">
                <div class="rfc-meta-item">
                  <span class="rfc-meta-label">编号</span>
                  <span class="rfc-meta-value">{{ resource.resource_id }}</span>
                </div>
                <div class="rfc-meta-item">
                  <span class="rfc-meta-label">关联命令</span>
                  <span class="rfc-meta-value">{{ connectedCommandsText(resource) }}</span>
                </div>
                <div class="rfc-meta-item">
                  <span class="rfc-meta-label">关联计划</span>
                  <span class="rfc-meta-value">{{ connectedPlansText(resource) }}</span>
                </div>
              </div>

              <!-- 态势目标详情 -->
              <template v-if="resource.resource_tag === 'TS_TARGET'">
                <div class="rfc-section">
                  <div class="rfc-section-title">态势属性</div>
                  <div class="rfc-kv-grid">
                    <div class="rfc-kv"><span class="rfc-kv-key">敌我类型</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.type) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">威胁等级</span><span class="rfc-kv-val" :class="`threat-${resource.resource_detail?.threat_level}`">{{ t(resource.resource_detail?.threat_level) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">威胁值</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.value) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">运动状态</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.motion) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">意图</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.intent) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">处理等级</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.handle_tier) }}</span></div>
                    <div class="rfc-kv wide"><span class="rfc-kv-key">建议处置</span><span class="rfc-kv-val">{{ resource.resource_detail?.suggestion }}</span></div>
                  </div>
                </div>
                <div class="rfc-section">
                  <div class="rfc-section-title">区域坐标</div>
                  <div class="rfc-table">
                    <div class="rfc-table-head"><span>点位</span><span>纬度</span><span>经度</span><span>高度</span></div>
                    <div v-for="point in resource.resource_detail?.location" :key="point.point" class="rfc-table-row">
                      <span>{{ point.point }}</span><span>{{ point.latitude }}</span><span>{{ point.longitude }}</span><span>{{ point.altitude }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 装备详情 -->
              <template v-if="resource.resource_tag === 'EQUIPMENT'">
                <div class="rfc-section">
                  <div class="rfc-section-title">平台信息</div>
                  <div class="rfc-kv-grid cols-3">
                    <div class="rfc-kv"><span class="rfc-kv-key">平台类型</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.platform_type) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">运行状态</span><span class="rfc-kv-val" :class="`status-${resource.resource_detail?.running_status}`">{{ t(resource.resource_detail?.running_status) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">当前任务</span><span class="rfc-kv-val">{{ resource.resource_detail?.current_task }}</span></div>
                  </div>
                </div>
                <div class="rfc-section">
                  <div class="rfc-section-title">载荷模块</div>
                  <div class="rfc-tags">
                    <span v-for="mod in resource.resource_detail?.payload_modules" :key="mod" class="rfc-tag-chip">{{ mod }}</span>
                  </div>
                </div>
                <div class="rfc-section">
                  <div class="rfc-section-title">能力参数</div>
                  <div class="rfc-kv-grid cols-2">
                    <div class="rfc-kv"><span class="rfc-kv-key">最大航程</span><span class="rfc-kv-val">{{ resource.resource_detail?.mobility?.max_range_km }} km</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">最大速度</span><span class="rfc-kv-val">{{ resource.resource_detail?.mobility?.max_speed_kmh }} km/h</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">地形适应</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.mobility?.terrain_adaptability) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">打击射程</span><span class="rfc-kv-val">{{ resource.resource_detail?.strike_capability?.max_range_km }} km</span></div>
                    <div class="rfc-kv wide"><span class="rfc-kv-key">武器类型</span><span class="rfc-kv-val">{{ (resource.resource_detail?.strike_capability?.weapon_types || []).map(t).join('、') || '无' }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">侦察射程</span><span class="rfc-kv-val">{{ resource.resource_detail?.recon_capability?.max_range_km }} km</span></div>
                    <div class="rfc-kv wide"><span class="rfc-kv-key">侦察方式</span><span class="rfc-kv-val">{{ (resource.resource_detail?.recon_capability?.methods || []).map(t).join('、') || '无' }}</span></div>
                  </div>
                </div>
              </template>

              <!-- 火力详情 -->
              <template v-if="resource.resource_tag === 'FIREPOWER'">
                <div class="rfc-section">
                  <div class="rfc-section-title">火力参数</div>
                  <div class="rfc-kv-grid cols-3">
                    <div class="rfc-kv"><span class="rfc-kv-key">数量</span><span class="rfc-kv-val">{{ resource.resource_detail?.quantity }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">武器类型</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.weapon_type) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">弹药状态</span><span class="rfc-kv-val" :class="`status-${resource.resource_detail?.ammo_status}`">{{ t(resource.resource_detail?.ammo_status) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">打击范围</span><span class="rfc-kv-val">{{ resource.resource_detail?.strike_range_km }} km</span></div>
                    <div class="rfc-kv wide"><span class="rfc-kv-key">所属装备</span><span class="rfc-kv-val">{{ resource.resource_detail?.belonging_equipment?.resource_name }} (#{{ resource.resource_detail?.belonging_equipment?.resource_id }})</span></div>
                    <div class="rfc-kv wide"><span class="rfc-kv-key">杀伤效能</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.lethality?.effect_type) }} — {{ resource.resource_detail?.lethality?.effect_value }}</span></div>
                  </div>
                </div>
              </template>

              <!-- 侦察详情 -->
              <template v-if="resource.resource_tag === 'RECON'">
                <div class="rfc-section">
                  <div class="rfc-section-title">侦察参数</div>
                  <div class="rfc-kv-grid cols-2">
                    <div class="rfc-kv"><span class="rfc-kv-key">侦察方式</span><span class="rfc-kv-val">{{ (resource.resource_detail?.recon_methods || []).map(t).join('、') }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">侦察范围</span><span class="rfc-kv-val">{{ resource.resource_detail?.recon_range_km ?? '—' }} km</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">在线状态</span><span class="rfc-kv-val" :class="`status-${resource.resource_detail?.online_status}`">{{ t(resource.resource_detail?.online_status) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">所属平台</span><span class="rfc-kv-val">{{ resource.resource_detail?.resource_platform?.resource_name }} (#{{ resource.resource_detail?.resource_platform?.resource_id }})</span></div>
                    <div class="rfc-kv wide"><span class="rfc-kv-key">覆盖范围</span><span class="rfc-kv-val">{{ resource.resource_detail?.coverage_focus }}</span></div>
                  </div>
                </div>
              </template>

              <!-- 保障详情 -->
              <template v-if="resource.resource_tag === 'SUPPORT'">
                <div class="rfc-section">
                  <div class="rfc-section-title">保障参数</div>
                  <div class="rfc-kv-grid cols-2">
                    <div class="rfc-kv"><span class="rfc-kv-key">保障单位</span><span class="rfc-kv-val">{{ resource.resource_detail?.support_unit }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">保障能力</span><span class="rfc-kv-val">{{ resource.resource_detail?.support_capability }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">机动能力</span><span class="rfc-kv-val">{{ resource.resource_detail?.mobility_capability }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">当前状态</span><span class="rfc-kv-val" :class="`status-${resource.resource_detail?.current_status}`">{{ t(resource.resource_detail?.current_status) }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">保障类别</span><span class="rfc-kv-val">{{ t(resource.resource_detail?.support_category) }}</span></div>
                  </div>
                </div>
                <div class="rfc-section">
                  <div class="rfc-section-title">部署位置</div>
                  <div class="rfc-kv-grid cols-2">
                    <div class="rfc-kv wide"><span class="rfc-kv-key">位置名称</span><span class="rfc-kv-val">{{ resource.resource_detail?.deployment_location?.location_name || '—' }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">纬度</span><span class="rfc-kv-val">{{ resource.resource_detail?.deployment_location?.latitude }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">经度</span><span class="rfc-kv-val">{{ resource.resource_detail?.deployment_location?.longitude }}</span></div>
                    <div class="rfc-kv"><span class="rfc-kv-key">高度</span><span class="rfc-kv-val">{{ resource.resource_detail?.deployment_location?.altitude }} m</span></div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!groupedResources.length" class="resource-empty-state">
        当前没有可展示的资源，请先完成命令解析或检查本地数据。
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
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

/* ---------- 筛选状态 ---------- */
const activeFilterTag = ref('ALL');

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

/* ---------- 按分类分组 ---------- */
const tagOrder = ['TS_TARGET', 'EQUIPMENT', 'FIREPOWER', 'RECON', 'SUPPORT'];

const groupedResources = computed(() => {
  const groups = [];
  for (const tag of tagOrder) {
    // 如果激活了筛选标签，只显示匹配的分类
    if (activeFilterTag.value !== 'ALL' && activeFilterTag.value !== tag) {
      continue;
    }
    const items = resources.filter((r) => r.resource_tag === tag);
    if (items.length > 0) {
      groups.push({
        tag,
        label: RESOURCE_TAG_LABELS[tag] || tag,
        items,
      });
    }
  }
  return groups;
});

/* ---------- 辅助函数 ---------- */
const tagLabel = (tag) => RESOURCE_TAG_LABELS[tag] || tag;
const t = translateResourceField;

const connectedCommandsText = (resource) => {
  const ids = resource.connections?.connected_commands || [];
  return ids.length ? ids.map((id) => `命令${id}`).join('、') : '无';
};
const connectedPlansText = (resource) => {
  const ids = resource.connections?.connected_plans || [];
  return ids.length ? ids.map((id) => `方案${id}`).join('、') : '无';
};

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
/* ========== 整体外壳 ========== */
.resource-pool-shell {
  --rp-border: rgba(0, 208, 188, 0.35);
  --rp-border-soft: rgba(0, 208, 188, 0.22);
  --rp-bg: rgba(1, 16, 22, 0.84);
  --rp-text: #f1feff;
  --rp-accent: #00dec8;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 0.6rem;
  overflow: hidden;
}

/* ========== 顶部标题 ========== */
.resource-pool-header {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.2rem 0.4rem;
  border-bottom: 1px solid rgba(0, 208, 188, 0.2);
  flex-shrink: 0;
}

.resource-pool-title {
  color: var(--rp-text);
  font-size: 1.14rem;
  font-weight: 800;
  flex-shrink: 0;
}

.resource-pool-filters {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.3rem;
  overflow-x: auto;
  flex: 1;
  scrollbar-width: none;
}
.resource-pool-filters::-webkit-scrollbar {
  display: none;
}

.resource-pool-filter-btn {
  position: relative;
  border: none;
  background: transparent;
  color: rgba(196, 243, 248, 0.6);
  padding: 0.38rem 0.72rem 0.52rem;
  font-size: 0.88rem;
  white-space: nowrap;
  font-weight: 600;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 10px 10px 0 0;
}

.resource-pool-filter-btn::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 10%;
  width: 80%;
  height: 3px;
  border-radius: 999px;
  background: var(--rp-accent);
  opacity: 0;
  transform: scaleX(0.6);
  transition: opacity 180ms ease, transform 180ms ease;
}

.resource-pool-filter-btn:hover {
  color: rgba(196, 243, 248, 0.9);
}

.resource-pool-filter-btn.active {
  color: var(--rp-accent);
  background: rgba(0, 222, 200, 0.1);
}

.resource-pool-filter-btn.active::after {
  opacity: 1;
  transform: scaleX(1);
}

.resource-pool-filter-count {
  border-radius: 999px;
  padding: 0.04rem 0.34rem;
  background: rgba(0, 222, 200, 0.18);
  color: #b4fff8;
  font-size: 0.7rem;
  font-weight: 700;
}

.resource-pool-total {
  color: rgba(196, 243, 248, 0.65);
  font-size: 0.82rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-left: auto;
}

/* ========== 主体滚动区 ========== */
.resource-pool-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding-right: 0.3rem;
}

/* 自定义滚动条 */
.resource-pool-body::-webkit-scrollbar {
  width: 5px;
}
.resource-pool-body::-webkit-scrollbar-track {
  background: transparent;
}
.resource-pool-body::-webkit-scrollbar-thumb {
  background: rgba(0, 222, 200, 0.25);
  border-radius: 999px;
}
.resource-pool-body::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 222, 200, 0.45);
}

/* ========== 分类区块 ========== */
.resource-category {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resource-category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.1rem;
}

.resource-category-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.resource-category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.resource-category-dot.dot-TS_TARGET { background: #ffd180; box-shadow: 0 0 6px rgba(255, 183, 77, 0.5); }
.resource-category-dot.dot-EQUIPMENT { background: #a8d8ff; box-shadow: 0 0 6px rgba(77, 182, 255, 0.5); }
.resource-category-dot.dot-FIREPOWER { background: #ffadad; box-shadow: 0 0 6px rgba(255, 82, 82, 0.5); }
.resource-category-dot.dot-RECON     { background: #d4b3ff; box-shadow: 0 0 6px rgba(156, 77, 255, 0.5); }
.resource-category-dot.dot-SUPPORT   { background: #b3ffcc; box-shadow: 0 0 6px rgba(77, 255, 136, 0.5); }

.resource-category-name {
  color: var(--rp-text);
  font-size: 0.96rem;
  font-weight: 700;
}

.resource-category-count {
  border-radius: 999px;
  padding: 0.06rem 0.38rem;
  background: rgba(0, 222, 200, 0.15);
  color: #b4fff8;
  font-size: 0.72rem;
  font-weight: 700;
}

/* ========== 横向卡片行 ========== */
.resource-category-row {
  display: flex;
  flex-direction: row;
  gap: 0.8rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.2rem 0.1rem 0.6rem;
  scroll-behavior: smooth;
}

/* 横向滚动条 */
.resource-category-row::-webkit-scrollbar {
  height: 5px;
}
.resource-category-row::-webkit-scrollbar-track {
  background: transparent;
}
.resource-category-row::-webkit-scrollbar-thumb {
  background: rgba(0, 222, 200, 0.25);
  border-radius: 999px;
}
.resource-category-row::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 222, 200, 0.45);
}

/* ========== 完整详情卡片 ========== */
.resource-full-card {
  flex: 0 0 340px;
  max-width: 340px;
  min-width: 340px;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid rgba(0, 208, 188, 0.28);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 6px 14px rgba(0, 0, 0, 0.16);
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
  overflow: hidden;
}

.resource-full-card:hover {
  border-color: rgba(0, 222, 200, 0.5);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.07), rgba(0, 222, 200, 0.025)), rgba(0, 18, 24, 0.75);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.08), 0 8px 22px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
}

/* 卡片头部 */
.rfc-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.7rem 0.5rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
  flex-wrap: wrap;
}

.rfc-tag {
  border-radius: 999px;
  padding: 0.08rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}
.rfc-tag.tag-TS_TARGET { background: rgba(255, 183, 77, 0.16); color: #ffd180; }
.rfc-tag.tag-EQUIPMENT { background: rgba(77, 182, 255, 0.16); color: #a8d8ff; }
.rfc-tag.tag-FIREPOWER { background: rgba(255, 82, 82, 0.16); color: #ffadad; }
.rfc-tag.tag-RECON     { background: rgba(156, 77, 255, 0.16); color: #d4b3ff; }
.rfc-tag.tag-SUPPORT   { background: rgba(77, 255, 136, 0.16); color: #b3ffcc; }

.rfc-type {
  color: rgba(214, 237, 242, 0.82);
  font-size: 0.76rem;
}

.rfc-name {
  color: var(--rp-text);
  font-size: 0.92rem;
  font-weight: 700;
}

/* 卡片内容区 */
.rfc-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 0.6rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* 卡片内滚动条 */
.rfc-body::-webkit-scrollbar {
  width: 4px;
}
.rfc-body::-webkit-scrollbar-track {
  background: transparent;
}
.rfc-body::-webkit-scrollbar-thumb {
  background: rgba(0, 222, 200, 0.2);
  border-radius: 999px;
}

/* 通用元信息 */
.rfc-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.1);
}

.rfc-meta-item {
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(0, 16, 22, 0.5);
  padding: 0.38rem 0.46rem;
}

.rfc-meta-label {
  color: rgba(196, 243, 248, 0.85);
  font-size: 0.72rem;
  font-weight: 700;
  display: block;
}

.rfc-meta-value {
  display: block;
  margin-top: 0.14rem;
  color: #ecfbff;
  font-size: 0.82rem;
  font-weight: 700;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* 详情区块 */
.rfc-section {
  padding-top: 0.4rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}
.rfc-section:first-of-type {
  border-top: none;
  padding-top: 0.2rem;
}

.rfc-section-title {
  color: #eefcff;
  font-size: 0.86rem;
  font-weight: 800;
  margin-bottom: 0.3rem;
}

/* KV 网格 */
.rfc-kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.36rem;
}
.rfc-kv-grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.rfc-kv-grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.rfc-kv {
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.14);
  background: rgba(0, 16, 22, 0.55);
  padding: 0.4rem 0.48rem;
}
.rfc-kv.wide { grid-column: 1 / -1; }

.rfc-kv-key {
  color: rgba(196, 243, 248, 0.88);
  font-size: 0.74rem;
  font-weight: 700;
  display: block;
}

.rfc-kv-val {
  display: block;
  margin-top: 0.14rem;
  color: #ecfbff;
  font-size: 0.84rem;
  font-weight: 700;
  overflow-wrap: break-word;
  word-break: break-word;
}

.rfc-kv-val.threat-low { color: #a8ff8a; }
.rfc-kv-val.threat-medium { color: #ffe08a; }
.rfc-kv-val.threat-high { color: #ff8a8a; }
.rfc-kv-val.threat-unknown { color: rgba(214, 237, 242, 0.7); }
.rfc-kv-val.status-online { color: #a8ff8a; }
.rfc-kv-val.status-offline { color: #ff8a8a; }
.rfc-kv-val.status-maintenance { color: #ffe08a; }
.rfc-kv-val.status-ready { color: #a8ff8a; }
.rfc-kv-val.status-standby { color: #ffe08a; }

/* 标签组 */
.rfc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.32rem;
}

.rfc-tag-chip {
  border-radius: 7px;
  padding: 0.26rem 0.48rem;
  background: rgba(0, 222, 200, 0.1);
  border: 1px solid rgba(0, 222, 200, 0.28);
  color: #b4fff8;
  font-size: 0.78rem;
  font-weight: 600;
}

/* 表格 */
.rfc-table {
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(2, 18, 26, 0.55);
  overflow: hidden;
}

.rfc-table-head,
.rfc-table-row {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr 0.8fr;
  gap: 0.4rem;
  align-items: center;
  padding: 0.4rem 0.48rem;
}

.rfc-table-head {
  background: rgba(0, 222, 200, 0.1);
  color: #b9fffa;
  font-size: 0.74rem;
  font-weight: 700;
}

.rfc-table-row {
  border-top: 1px solid rgba(0, 222, 200, 0.1);
  color: rgba(227, 248, 251, 0.92);
  font-size: 0.8rem;
}

/* 空状态 */
.resource-empty-state {
  border-radius: 12px;
  border: 1px dashed rgba(0, 208, 188, 0.25);
  color: rgba(226, 246, 248, 0.86);
  padding: 1.2rem 1rem;
  line-height: 1.7;
  text-align: center;
}
</style>
