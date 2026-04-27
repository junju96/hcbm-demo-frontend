<template>
  <div class="res-detail-shell">
    <!-- 通用头部 -->
    <header class="res-detail-header">
      <div class="res-detail-title-group">
        <span class="res-detail-name">{{ resource.resource_name }}</span>
        <span class="res-detail-chip" :class="`tag-${resource.resource_tag}`">
          {{ tagLabel }}
        </span>
      </div>
      <span class="res-detail-type">{{ resource.resource_type }}</span>
    </header>

    <!-- 通用元信息 -->
    <div class="res-detail-meta-grid">
      <div class="res-detail-meta">
        <span class="res-detail-meta-label">资源编号</span>
        <span class="res-detail-meta-value">{{ resource.resource_id }}</span>
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

    <!-- TS_TARGET 态势目标 -->
    <template v-if="resource.resource_tag === 'TS_TARGET'">
      <div class="res-detail-section">
        <div class="res-detail-section-title">态势属性</div>
        <div class="res-detail-kv-grid">
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">敌我类型</span>
            <span class="res-detail-kv-val">{{ detail.type }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">威胁等级</span>
            <span class="res-detail-kv-val" :class="`threat-${detail.threat_level}`">{{ detail.threat_level }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">威胁值</span>
            <span class="res-detail-kv-val">{{ detail.value }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">运动状态</span>
            <span class="res-detail-kv-val">{{ detail.motion }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">意图</span>
            <span class="res-detail-kv-val">{{ detail.intent }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">处理等级</span>
            <span class="res-detail-kv-val">{{ detail.handle_tier }}</span>
          </div>
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">建议处置</span>
            <span class="res-detail-kv-val">{{ detail.suggestion }}</span>
          </div>
        </div>
      </div>

      <div class="res-detail-section">
        <div class="res-detail-section-title">区域坐标</div>
        <div class="res-detail-table">
          <div class="res-detail-table-head">
            <span>点位</span>
            <span>纬度</span>
            <span>经度</span>
            <span>高度</span>
          </div>
          <div
            v-for="point in detail.location"
            :key="point.point"
            class="res-detail-table-row"
          >
            <span>{{ point.point }}</span>
            <span>{{ point.latitude }}</span>
            <span>{{ point.longitude }}</span>
            <span>{{ point.altitude }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- EQUIPMENT 装备 -->
    <template v-if="resource.resource_tag === 'EQUIPMENT'">
      <div class="res-detail-section">
        <div class="res-detail-section-title">平台信息</div>
        <div class="res-detail-kv-grid cols-3">
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">平台类型</span>
            <span class="res-detail-kv-val">{{ detail.platform_type }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">运行状态</span>
            <span class="res-detail-kv-val" :class="`status-${detail.running_status}`">{{ detail.running_status }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">当前任务</span>
            <span class="res-detail-kv-val">{{ detail.current_task }}</span>
          </div>
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
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">最大航程</span>
            <span class="res-detail-kv-val">{{ detail.mobility?.max_range_km }} km</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">最大速度</span>
            <span class="res-detail-kv-val">{{ detail.mobility?.max_speed_kmh }} km/h</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">地形适应</span>
            <span class="res-detail-kv-val">{{ detail.mobility?.terrain_adaptability }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">打击射程</span>
            <span class="res-detail-kv-val">{{ detail.strike_capability?.max_range_km }} km</span>
          </div>
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">武器类型</span>
            <span class="res-detail-kv-val">{{ (detail.strike_capability?.weapon_types || []).join('、') || '无' }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">侦察射程</span>
            <span class="res-detail-kv-val">{{ detail.recon_capability?.max_range_km }} km</span>
          </div>
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">侦察方式</span>
            <span class="res-detail-kv-val">{{ (detail.recon_capability?.methods || []).join('、') || '无' }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- FIREPOWER 火力 -->
    <template v-if="resource.resource_tag === 'FIREPOWER'">
      <div class="res-detail-section">
        <div class="res-detail-section-title">火力参数</div>
        <div class="res-detail-kv-grid cols-3">
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">数量</span>
            <span class="res-detail-kv-val">{{ detail.quantity }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">武器类型</span>
            <span class="res-detail-kv-val">{{ detail.weapon_type }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">弹药状态</span>
            <span class="res-detail-kv-val" :class="`status-${detail.ammo_status}`">{{ detail.ammo_status }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">打击范围</span>
            <span class="res-detail-kv-val">{{ detail.strike_range_km }} km</span>
          </div>
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">所属装备</span>
            <span class="res-detail-kv-val">{{ detail.belonging_equipment?.resource_name }} (#{{ detail.belonging_equipment?.resource_id }})</span>
          </div>
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">杀伤效能</span>
            <span class="res-detail-kv-val">{{ detail.lethality?.effect_type }} — {{ detail.lethality?.effect_value }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- RECON 侦察 -->
    <template v-if="resource.resource_tag === 'RECON'">
      <div class="res-detail-section">
        <div class="res-detail-section-title">侦察参数</div>
        <div class="res-detail-kv-grid cols-2">
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">侦察方式</span>
            <span class="res-detail-kv-val">{{ (detail.recon_methods || []).join('、') }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">侦察范围</span>
            <span class="res-detail-kv-val">{{ detail.recon_range_km ?? '—' }} km</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">在线状态</span>
            <span class="res-detail-kv-val" :class="`status-${detail.online_status}`">{{ detail.online_status }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">所属平台</span>
            <span class="res-detail-kv-val">{{ detail.resource_platform?.resource_name }} (#{{ detail.resource_platform?.resource_id }})</span>
          </div>
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">覆盖范围</span>
            <span class="res-detail-kv-val">{{ detail.coverage_focus }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- SUPPORT 保障 -->
    <template v-if="resource.resource_tag === 'SUPPORT'">
      <div class="res-detail-section">
        <div class="res-detail-section-title">保障参数</div>
        <div class="res-detail-kv-grid cols-2">
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">保障单位</span>
            <span class="res-detail-kv-val">{{ detail.support_unit }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">保障能力</span>
            <span class="res-detail-kv-val">{{ detail.support_capability }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">机动能力</span>
            <span class="res-detail-kv-val">{{ detail.mobility_capability }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">当前状态</span>
            <span class="res-detail-kv-val" :class="`status-${detail.current_status}`">{{ detail.current_status }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">保障类别</span>
            <span class="res-detail-kv-val">{{ detail.support_category }}</span>
          </div>
        </div>
      </div>

      <div class="res-detail-section">
        <div class="res-detail-section-title">部署位置</div>
        <div class="res-detail-kv-grid cols-2">
          <div class="res-detail-kv wide">
            <span class="res-detail-kv-key">位置名称</span>
            <span class="res-detail-kv-val">{{ detail.deployment_location?.location_name || '—' }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">纬度</span>
            <span class="res-detail-kv-val">{{ detail.deployment_location?.latitude }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">经度</span>
            <span class="res-detail-kv-val">{{ detail.deployment_location?.longitude }}</span>
          </div>
          <div class="res-detail-kv">
            <span class="res-detail-kv-key">高度</span>
            <span class="res-detail-kv-val">{{ detail.deployment_location?.altitude }} m</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RESOURCE_TAG_LABELS } from '../../data/commandDataModel';

const props = defineProps({
  resource: { type: Object, required: true },
});

const detail = computed(() => props.resource?.resource_detail || {});
const tagLabel = computed(() => RESOURCE_TAG_LABELS[props.resource?.resource_tag] || props.resource?.resource_tag);

const connectedCommandsText = computed(() => {
  const ids = props.resource?.connections?.connected_commands || [];
  return ids.length ? ids.map((id) => `命令${id}`).join('、') : '无';
});

const connectedPlansText = computed(() => {
  const ids = props.resource?.connections?.connected_plans || [];
  return ids.length ? ids.map((id) => `方案${id}`).join('、') : '无';
});
</script>

<style scoped>
.res-detail-shell {
  --coord-border: rgba(0, 208, 188, 0.4);
  --coord-border-soft: rgba(0, 208, 188, 0.26);
  --coord-text: #f1feff;
}

.res-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.res-detail-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.res-detail-name {
  color: var(--coord-text);
  font-size: 1.12rem;
  font-weight: 800;
}

.res-detail-chip {
  border-radius: 999px;
  padding: 0.12rem 0.52rem;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid;
}

.res-detail-chip.tag-TS_TARGET {
  background: rgba(255, 183, 77, 0.14);
  color: #ffd180;
  border-color: rgba(255, 183, 77, 0.4);
}
.res-detail-chip.tag-EQUIPMENT {
  background: rgba(77, 182, 255, 0.14);
  color: #a8d8ff;
  border-color: rgba(77, 182, 255, 0.4);
}
.res-detail-chip.tag-FIREPOWER {
  background: rgba(255, 82, 82, 0.14);
  color: #ffadad;
  border-color: rgba(255, 82, 82, 0.4);
}
.res-detail-chip.tag-RECON {
  background: rgba(156, 77, 255, 0.14);
  color: #d4b3ff;
  border-color: rgba(156, 77, 255, 0.4);
}
.res-detail-chip.tag-SUPPORT {
  background: rgba(77, 255, 136, 0.14);
  color: #b3ffcc;
  border-color: rgba(77, 255, 136, 0.4);
}

.res-detail-type {
  color: rgba(214, 237, 242, 0.82);
  font-size: 0.82rem;
  font-weight: 600;
}

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

.res-detail-meta-label {
  color: rgba(196, 243, 248, 0.92);
  font-size: 0.82rem;
  font-weight: 700;
}

.res-detail-meta-value {
  display: block;
  margin-top: 0.22rem;
  color: #ecfbff;
  font-size: 0.92rem;
  font-weight: 700;
}

.res-detail-section {
  margin-top: 0.82rem;
  padding-top: 0.72rem;
  border-top: 1px solid rgba(0, 222, 200, 0.16);
}

.res-detail-section-title {
  color: #eefcff;
  font-size: 1rem;
  font-weight: 800;
}

.res-detail-kv-grid {
  margin-top: 0.44rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.44rem;
}

.res-detail-kv-grid.cols-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.res-detail-kv {
  border-radius: 10px;
  border: 1px solid var(--coord-border-soft);
  background: rgba(0, 16, 22, 0.66);
  padding: 0.5rem 0.58rem;
}

.res-detail-kv.wide {
  grid-column: 1 / -1;
}

.res-detail-kv-key {
  color: rgba(196, 243, 248, 0.92);
  font-size: 0.82rem;
  font-weight: 700;
}

.res-detail-kv-val {
  display: block;
  margin-top: 0.22rem;
  color: #ecfbff;
  font-size: 0.9rem;
  font-weight: 700;
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

.res-detail-tags {
  margin-top: 0.44rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
}

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

.res-detail-table-head,
.res-detail-table-row {
  display: grid;
  grid-template-columns: 1.15fr 1fr 1fr 0.8fr;
  gap: 0.5rem;
  align-items: center;
  padding: 0.46rem 0.56rem;
}

.res-detail-table-head {
  background: rgba(0, 222, 200, 0.1);
  color: #b9fffa;
  font-size: 0.78rem;
  font-weight: 700;
}

.res-detail-table-row {
  border-top: 1px solid rgba(0, 222, 200, 0.12);
  color: rgba(227, 248, 251, 0.92);
  font-size: 0.84rem;
}

@media (max-width: 980px) {
  .res-detail-meta-grid,
  .res-detail-kv-grid,
  .res-detail-kv-grid.cols-3 {
    grid-template-columns: 1fr;
  }
}
</style>
