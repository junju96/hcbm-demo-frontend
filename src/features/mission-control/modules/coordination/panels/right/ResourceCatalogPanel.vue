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

    <!-- 分类表格区域 -->
    <div class="resource-pool-body">
      <div
        v-for="group in groupedResources"
        :key="group.tag"
        class="resource-category"
      >
        <!-- 分类标题栏 -->
        <div class="resource-category-header">
          <div class="resource-category-title">
            <span class="resource-category-dot" :class="`dot-${group.tag}`" />
            <span class="resource-category-name">{{ group.label }}</span>
            <span class="resource-category-count">{{ group.items.length }} 条</span>
          </div>
        </div>

        <!-- Excel 表格 -->
        <div class="resource-table-wrap">
          <table class="resource-table">
            <thead>
              <tr>
                <th
                  v-for="col in getColumns(group.tag)"
                  :key="col.key"
                  :class="{ 'col-center': col.key === 'seq' }"
                  :style="col.width ? { width: col.width } : {}"
                >
                  {{ col.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in group.items"
                :key="item.resource_id"
                v-bind="buildResourceTargetAttrs(item)"
              >
                <td
                  v-for="col in getColumns(group.tag)"
                  :key="col.key"
                  :class="[col.class, col.key === 'seq' ? 'col-center' : '']"
                >
                  <span
                    v-if="col.badge"
                    class="cell-badge"
                    :class="`badge-${getCellValue(item, col.key, idx, group.tag)}`"
                  >
                    {{ getCellValue(item, col.key, idx, group.tag) }}
                  </span>
                  <span v-else>{{ getCellValue(item, col.key, idx, group.tag) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
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
import { computed, ref, onMounted } from 'vue';
import { createInteractionTargetAttrs } from '../../../../shared/interaction/createInteractionTarget';
import {
  RESOURCE_TAGS,
  RESOURCE_TAG_LABELS,
  RESOURCE_TYPE_LABELS,
  translateResourceField,
  resourceRecords,
} from '../../data/commandDataModel';
import { fetchTaskPoolResources } from '../../api/coordinationApi';

/* ---------- 数据加载（从后端 API 获取） ---------- */
const resources = ref([]);
const resourcesLoading = ref(false);

const loadResources = async () => {
  resourcesLoading.value = true;
  const result = await fetchTaskPoolResources({ limit: 100 });
  let apiItems = [];
  if (result.ok) {
    // 资源池只显示真正的资源类型，过滤掉杀伤链、方案等非资源条目
    apiItems = (result.data.items || []).filter((r) =>
      tagOrder.includes(r.resource_tag)
    );
  }

  // 数据服务器暂不支持火力/侦察/保障，用本地 mock 数据补充
  const localMockItems = (resourceRecords || []).filter((r) =>
    ['FIREPOWER', 'RECON', 'SUPPORT'].includes(r.resource_tag)
  );

  resources.value = [...apiItems, ...localMockItems];
  resourcesLoading.value = false;
};

onMounted(() => {
  loadResources();
});

/* ---------- 筛选状态 ---------- */
const activeFilterTag = ref('ALL');

const filterTabs = computed(() => {
  const allCount = resources.value.length;
  const tabs = [
    { tag: 'ALL', label: '全部', count: allCount },
    ...Object.values(RESOURCE_TAGS).map((tag) => ({
      tag,
      label: RESOURCE_TAG_LABELS[tag],
      count: resources.value.filter((r) => r.resource_tag === tag).length,
    })),
  ];
  return tabs;
});

/* ---------- 按分类分组 ---------- */
const tagOrder = ['TS_TARGET', 'EQUIPMENT', 'FIREPOWER', 'RECON', 'SUPPORT'];

const groupedResources = computed(() => {
  const groups = [];
  for (const tag of tagOrder) {
    if (activeFilterTag.value !== 'ALL' && activeFilterTag.value !== tag) {
      continue;
    }
    const items = resources.value.filter((r) => r.resource_tag === tag);
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

/* ---------- 表格列配置 ---------- */
const COLUMN_CONFIG = {
  TS_TARGET: [
    { key: 'seq', label: '序号', width: '50px' },
    { key: 'resource_name', label: '目标名称' },
    { key: 'resource_id', label: '目标编号' },
    { key: 'type', label: '敌我类型' },
    { key: 'threat_level', label: '威胁等级', badge: true },
    { key: 'longitude', label: '经度' },
    { key: 'latitude', label: '纬度' },
    { key: 'altitude', label: '高度(m)' },
    { key: 'motion', label: '运动状态' },
    { key: 'handle_tier', label: '处理等级' },
  ],
  EQUIPMENT: [
    { key: 'seq', label: '序号', width: '50px' },
    { key: 'resource_name', label: '装备名称' },
    { key: 'resource_id', label: '装备编号' },
    { key: 'platform_type', label: '平台类型' },
    { key: 'running_status', label: '运行状态', badge: true },
    { key: 'current_task', label: '当前任务' },
    { key: 'max_range_km', label: '最大航程(km)' },
    { key: 'max_speed_kmh', label: '最大速度(km/h)' },
    { key: 'strike_range_km', label: '打击射程(km)' },
    { key: 'recon_range_km', label: '侦察射程(km)' },
  ],
  FIREPOWER: [
    { key: 'seq', label: '序号', width: '50px' },
    { key: 'resource_name', label: '火力名称' },
    { key: 'resource_id', label: '火力编号' },
    { key: 'weapon_type', label: '武器类型' },
    { key: 'quantity', label: '数量' },
    { key: 'ammo_status', label: '弹药状态', badge: true },
    { key: 'strike_range_km', label: '打击范围(km)' },
  ],
  RECON: [
    { key: 'seq', label: '序号', width: '50px' },
    { key: 'resource_name', label: '侦察名称' },
    { key: 'resource_id', label: '侦察编号' },
    { key: 'recon_methods', label: '侦察方式' },
    { key: 'recon_range_km', label: '侦察范围(km)' },
    { key: 'online_status', label: '在线状态', badge: true },
  ],
  SUPPORT: [
    { key: 'seq', label: '序号', width: '50px' },
    { key: 'resource_name', label: '保障名称' },
    { key: 'resource_id', label: '保障编号' },
    { key: 'support_unit', label: '保障单位' },
    { key: 'support_capability', label: '保障能力' },
    { key: 'current_status', label: '当前状态', badge: true },
  ],
};

const getColumns = (tag) => COLUMN_CONFIG[tag] || [];

const getCellValue = (item, key, idx, tag) => {
  if (key === 'seq') return idx + 1;

  const detail = item.resource_detail || {};

  const mapping = {
    // 通用
    resource_name: item.resource_name || '—',
    resource_id: item.resource_id || '—',
    resource_type: RESOURCE_TYPE_LABELS[item.resource_type] || item.resource_type || '—',

    // 态势目标
    type: translateResourceField(detail.type),
    threat_level: translateResourceField(detail.threat_level),
    motion: translateResourceField(detail.motion),
    handle_tier: translateResourceField(detail.handle_tier),
    longitude: detail.location?.[0]?.longitude ?? '—',
    latitude: detail.location?.[0]?.latitude ?? '—',
    altitude: detail.location?.[0]?.altitude ?? '—',

    // 装备
    platform_type: translateResourceField(detail.platform_type),
    running_status: translateResourceField(detail.running_status),
    current_task: detail.current_task || '—',
    max_range_km: detail.mobility?.max_range_km ?? '—',
    max_speed_kmh: detail.mobility?.max_speed_kmh ?? '—',
    // 支持 API 嵌套格式 或 本地 mock 平铺格式
    strike_range_km: detail.strike_capability?.max_range_km ?? detail.strike_range_km ?? '—',
    recon_range_km: detail.recon_capability?.max_range_km ?? detail.recon_range_km ?? '—',

    // 火力
    weapon_type: translateResourceField(detail.weapon_type),
    quantity: detail.quantity ?? '—',
    ammo_status: translateResourceField(detail.ammo_status),

    // 侦察
    recon_methods: (detail.recon_methods || []).map(translateResourceField).join('、') || '—',
    online_status: translateResourceField(detail.online_status),

    // 保障
    support_unit: detail.support_unit || '—',
    support_capability: detail.support_capability || '—',
    current_status: translateResourceField(detail.current_status),
  };

  return mapping[key] ?? '—';
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
.resource-pool-filters::-webkit-scrollbar { display: none; }

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
  gap: 0.4rem;
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

/* ========== Excel 表格 ========== */
.resource-table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid rgba(0, 208, 188, 0.25);
  background: rgba(0, 16, 22, 0.55);
}

.resource-table-wrap::-webkit-scrollbar {
  height: 6px;
}
.resource-table-wrap::-webkit-scrollbar-track {
  background: transparent;
}
.resource-table-wrap::-webkit-scrollbar-thumb {
  background: rgba(0, 222, 200, 0.25);
  border-radius: 999px;
}
.resource-table-wrap::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 222, 200, 0.45);
}

.resource-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 0.84rem;
  color: rgba(227, 248, 251, 0.92);
  table-layout: fixed;
}

.resource-table thead {
  position: sticky;
  top: 0;
  z-index: 2;
}

.resource-table th {
  background: rgba(0, 222, 200, 0.12);
  color: #b9fffa;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 0.5rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid rgba(0, 208, 188, 0.3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid rgba(0, 208, 188, 0.1);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.resource-table .col-center {
  text-align: center;
}

.resource-table tbody tr:hover {
  background: rgba(0, 222, 200, 0.06);
}

.resource-table tbody tr:last-child td {
  border-bottom: none;
}

/* 单元格徽章 */
.cell-badge {
  display: inline-block;
  border-radius: 6px;
  padding: 0.15rem 0.45rem;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

/* 威胁等级颜色 */
.cell-badge.badge-低,
.cell-badge.badge-low {
  background: rgba(120, 220, 100, 0.15);
  color: #a8ff8a;
}
.cell-badge.badge-中,
.cell-badge.badge-medium {
  background: rgba(255, 200, 80, 0.15);
  color: #ffe08a;
}
.cell-badge.badge-高,
.cell-badge.badge-high {
  background: rgba(255, 100, 100, 0.15);
  color: #ff8a8a;
}
.cell-badge.badge-未知,
.cell-badge.badge-unknown {
  background: rgba(160, 180, 200, 0.15);
  color: #cbd5e1;
}

/* 状态颜色 */
.cell-badge.badge-在线,
.cell-badge.badge-online,
.cell-badge.badge-ready {
  background: rgba(120, 220, 100, 0.15);
  color: #a8ff8a;
}
.cell-badge.badge-离线,
.cell-badge.badge-offline {
  background: rgba(255, 100, 100, 0.15);
  color: #ff8a8a;
}
.cell-badge.badge-维护中,
.cell-badge.badge-maintenance {
  background: rgba(255, 200, 80, 0.15);
  color: #ffe08a;
}
.cell-badge.badge-待命,
.cell-badge.badge-standby {
  background: rgba(160, 180, 200, 0.15);
  color: #cbd5e1;
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
