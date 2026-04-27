<template>
  <article class="coord-panel coord-result-panel">
    <header class="coord-result-header">
      <div class="coord-result-header-left">
        <div class="coord-pane-title">标准化结果</div>
        <div class="coord-result-meta">
          <span>任务: {{ selectedAnalysis?.missions?.length ?? 0 }}</span>
          <span>资源: {{ selectedAnalysis?.resources?.length ?? 0 }}</span>
        </div>
      </div>
      <div class="coord-result-header-right">
        <div class="coord-tabs-group">
          <button
            class="coord-tab"
            :class="{ active: resultView === 'missions' }"
            type="button"
            :disabled="!hasAnalysisResult"
            @click="resultView = 'missions'"
          >
            任务列表
          </button>
          <button
            class="coord-tab"
            :class="{ active: resultView === 'resources' }"
            type="button"
            :disabled="!hasAnalysisResult"
            @click="resultView = 'resources'"
          >
            资源列表
          </button>
        </div>
        <button
          class="coord-detail-toggle"
          type="button"
          :disabled="!hasAnalysisResult"
          @click="detailsExpanded = !detailsExpanded"
        >
          {{ detailsExpanded ? '收起' : '展开' }}
        </button>
      </div>
    </header>

    <div v-if="!commands.length" class="coord-empty-state">
      当前无命令数据，标准化结果面板暂不显示任务列表和资源列表。
    </div>

    <div v-else-if="!hasAnalysisResult" class="coord-empty-state">
      点击上方"任务理解"后，在这里展示结构化任务与资源列表。
    </div>

    <div v-else class="coord-result-body">
      <div class="coord-result-summary">
        <span class="coord-result-summary-trace">
          请求序号: {{ selectedAnalysis.response_body.responseID }}
        </span>
      </div>

      <div v-if="resultView === 'missions'" class="coord-list">
        <div
          v-for="mission in selectedAnalysis.missions"
          :key="mission.mission_id"
          class="coord-list-row"
          :class="{ editing: editingMissionId === mission.mission_id }"
          v-bind="buildMissionTargetAttrs(mission)"
        >
          <div class="coord-mission-row-head">
            <div class="coord-list-main">
              <span class="coord-list-tag">任务 {{ mission.mission_id }}</span>
              <span v-if="editingMissionId !== mission.mission_id" class="coord-list-title">{{ mission.mission_name }}</span>
            </div>

            <div class="coord-mission-row-actions">
              <button
                v-if="editingMissionId !== mission.mission_id"
                class="coord-btn coord-mini-btn"
                type="button"
                v-bind="buildMissionActionAttrs('coordination:edit-mission', '修改任务', mission)"
                @click="startEditMission(mission)"
              >
                修改
              </button>
              <template v-else>
                <button
                  class="coord-btn primary coord-mini-btn"
                  type="button"
                  v-bind="buildMissionActionAttrs('coordination:save-mission', '保存任务修改', mission)"
                  @click="saveEditMission"
                >
                  保存
                </button>
                <button
                  class="coord-btn coord-mini-btn"
                  type="button"
                  v-bind="buildMissionActionAttrs('coordination:cancel-edit-mission', '取消任务修改', mission)"
                  @click="cancelEditMission"
                >
                  取消
                </button>
              </template>
            </div>
          </div>

          <template v-if="detailsExpanded || editingMissionId === mission.mission_id">
            <template v-if="editingMissionId === mission.mission_id">
              <div class="coord-edit-grid">
                <label class="coord-edit-row">
                  <span class="coord-edit-label">任务名称</span>
                  <input v-model="missionDraft.mission_name" class="coord-edit-input" type="text" />
                </label>
                <label class="coord-edit-row">
                  <span class="coord-edit-label">内容</span>
                  <input v-model="missionDraft.content" class="coord-edit-input" type="text" />
                </label>
                <label class="coord-edit-row">
                  <span class="coord-edit-label">任务区域</span>
                  <input v-model="missionDraft.target" class="coord-edit-input" type="text" />
                </label>
                <label class="coord-edit-row">
                  <span class="coord-edit-label">开始时间</span>
                  <input v-model="missionDraft.time" class="coord-edit-input" type="text" />
                </label>
                <label class="coord-edit-row">
                  <span class="coord-edit-label">结束时间</span>
                  <input v-model="missionDraft.duration" class="coord-edit-input" type="text" />
                </label>
              </div>
            </template>
            <template v-else>
              <div class="coord-detail-grid">
                <div class="coord-detail-item full">
                  <div class="coord-detail-key">内容</div>
                  <div class="coord-detail-text">{{ mission.mission_detail.content }}</div>
                </div>
                <div class="coord-detail-item">
                  <div class="coord-detail-key">任务区域</div>
                  <div class="coord-detail-text">{{ mission.mission_detail.target }}</div>
                </div>
                <div class="coord-detail-item">
                  <div class="coord-detail-key">开始时间</div>
                  <div class="coord-detail-text">{{ formatDateTimeCn(mission.mission_detail.time) }}</div>
                </div>
                <div class="coord-detail-item">
                  <div class="coord-detail-key">结束时间</div>
                  <div class="coord-detail-text">{{ mission.mission_detail.duration }}</div>
                </div>
                <div class="coord-detail-item">
                  <div class="coord-detail-key">依赖</div>
                  <div class="coord-detail-text">{{ formatMissionDependencies(mission.dependencies) }}</div>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>

      <div v-else class="coord-list">
        <div
          v-for="resource in selectedAnalysis.resources"
          :key="resource.resource_id"
          class="coord-list-row"
          v-bind="buildResourceTargetAttrs(resource)"
        >
          <div class="coord-list-main">
            <span class="coord-list-tag resource">资源 {{ resource.resource_id }}</span>
            <span class="coord-list-title">{{ resource.resource_name }}</span>
            <span class="coord-resource-chip-mini" :class="`tag-${resource.resource_tag}`">
              {{ tagLabel(resource.resource_tag) }}
            </span>
          </div>
          <div v-if="detailsExpanded" class="coord-detail-grid">
            <div class="coord-detail-item">
              <div class="coord-detail-key">资源类型</div>
              <div class="coord-detail-text">{{ RESOURCE_TYPE_LABELS[resource.resource_type] || resource.resource_type }}</div>
            </div>
            <div class="coord-detail-item">
              <div class="coord-detail-key">资源标签</div>
              <div class="coord-detail-text">{{ resource.resource_tag }}</div>
            </div>
            <div class="coord-detail-item">
              <div class="coord-detail-key">关键信息</div>
              <div class="coord-detail-text">{{ resourceSummary(resource) }}</div>
            </div>

            <!-- 坐标点位（仅态势目标展示） -->
            <div v-if="resource.resource_detail?.location?.length" class="coord-point-block">
              <div class="coord-point-head">
                <span>点位</span>
                <span>纬度</span>
                <span>经度</span>
                <span>高度</span>
              </div>
              <div
                v-for="point in resource.resource_detail.location"
                :key="`${resource.resource_id}-${point.point}`"
                class="coord-point-row"
              >
                <span>{{ point.point }}</span>
                <span>{{ point.latitude }}</span>
                <span>{{ point.longitude }}</span>
                <span>{{ point.altitude }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue';
import {
  createInteractionActionAttrs,
  createInteractionTargetAttrs,
} from '../../../../shared/interaction/createInteractionTarget';
import { RESOURCE_TAG_LABELS, RESOURCE_TYPE_LABELS } from '../../data/commandDataModel';

const props = defineProps({
  commands: { type: Array, required: true },
  resultView: { type: String, default: 'missions' },
  detailsExpanded: { type: Boolean, default: true },
  hasAnalysisResult: { type: Boolean, default: false },
  selectedAnalysis: { type: Object, default: null },
  editingMissionId: { type: Number, default: null },
  missionDraft: { type: Object, default: () => ({}) },
  formatDateTimeCn: { type: Function, required: true },
  formatMissionDependencies: { type: Function, required: true },
  startEditMission: { type: Function, required: true },
  cancelEditMission: { type: Function, required: true },
  saveEditMission: { type: Function, required: true },
});

const emit = defineEmits(['update:resultView', 'update:detailsExpanded']);

const resultView = computed({
  get: () => props.resultView,
  set: (v) => emit('update:resultView', v),
});

const detailsExpanded = computed({
  get: () => props.detailsExpanded,
  set: (v) => emit('update:detailsExpanded', v),
});

const resolveMissionTargetId = (mission) => `coordination:mission:${mission?.mission_id || ''}`;
const resolveResourceTargetId = (resource) => `coordination:resource:${resource?.resource_id || ''}`;

const buildMissionTargetAttrs = (mission) => createInteractionTargetAttrs({
  targetId: resolveMissionTargetId(mission),
  targetType: 'mission-item',
  label: mission?.mission_name || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'AnalysisResultPanel',
  textPreview: mission?.mission_detail?.content || '',
  actions: ['coordination:edit-mission', 'coordination:save-mission', 'coordination:cancel-edit-mission'],
});

const buildMissionActionAttrs = (actionId, label, mission) => createInteractionActionAttrs({
  actionId,
  label,
  targetId: resolveMissionTargetId(mission),
});

const buildResourceTargetAttrs = (resource) => createInteractionTargetAttrs({
  targetId: resolveResourceTargetId(resource),
  targetType: 'resource-item',
  label: resource?.resource_name || '',
  route: '/mission-control/aux',
  moduleId: 'coordination',
  panelId: 'coord-brief',
  sourceComponent: 'AnalysisResultPanel',
  textPreview: resource?.resource_type || '',
});

const tagLabel = (tag) => RESOURCE_TAG_LABELS[tag] || tag;

const resourceSummary = (resource) => {
  const detail = resource?.resource_detail;
  switch (resource?.resource_tag) {
    case 'TS_TARGET':
      return `敌我: ${detail?.type || '—'} / 威胁: ${detail?.threat_level || '—'}`;
    case 'EQUIPMENT':
      return `状态: ${detail?.running_status || '—'} / 任务: ${detail?.current_task || '—'}`;
    case 'FIREPOWER':
      return `数量: ${detail?.quantity ?? '—'} / 状态: ${detail?.ammo_status || '—'}`;
    case 'RECON':
      return `状态: ${detail?.online_status || '—'} / 覆盖: ${detail?.coverage_focus || '—'}`;
    case 'SUPPORT':
      return `状态: ${detail?.current_status || '—'} / 能力: ${detail?.support_capability || '—'}`;
    default:
      return '';
  }
};
</script>

<style scoped>
.coord-result-panel { padding: 0.95rem; min-width: 0; }
.coord-pane-title { color: var(--coord-text); font-size: 1.24rem; font-weight: 800; letter-spacing: 0.01em; text-shadow: 0 0 14px rgba(0, 222, 200, 0.16); }

.coord-result-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
.coord-result-header-left { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.coord-result-header-right { display: flex; align-items: center; gap: 0.55rem; flex-wrap: wrap; }

.coord-result-meta { display: flex; align-items: center; gap: 0.45rem; }
.coord-result-meta span { border-radius: 999px; border: 1px solid rgba(0, 222, 200, 0.28); background: rgba(0, 222, 200, 0.09); color: #c8fffa; padding: 0.16rem 0.58rem; font-size: 0.82rem; font-weight: 700; }

.coord-tabs-group { display: inline-flex; align-items: center; gap: 0.42rem; }
.coord-tab { min-height: 34px; padding: 0 0.82rem; border-radius: 9px; border: 1px solid var(--coord-border-soft); background: rgba(255, 255, 255, 0.08); color: var(--coord-text); cursor: pointer; font-size: 0.88rem; font-weight: 700; transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease; }
.coord-tab:hover { border-color: rgba(0, 222, 200, 0.5); box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.12); }
.coord-tab.active { border-color: rgba(0, 236, 212, 0.9); background: linear-gradient(180deg, rgba(0, 236, 212, 0.28), rgba(0, 130, 149, 0.34)); color: #fff; box-shadow: inset 0 0 0 1px rgba(170, 255, 247, 0.42), 0 0 0 2px rgba(0, 236, 212, 0.18), 0 8px 18px rgba(0, 186, 173, 0.18); transform: translateY(-1px); }
.coord-tab:disabled { opacity: 0.5; cursor: not-allowed; }

.coord-detail-toggle { min-height: 34px; padding: 0.4rem 0.72rem; border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.22); background: rgba(10, 18, 22, 0.88); color: #f8fafc; font-size: 0.78rem; font-weight: 700; line-height: 1.2; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18); cursor: pointer; transition: all 0.2s; }
.coord-detail-toggle:hover { border-color: rgba(0, 222, 200, 0.34); background: rgba(12, 24, 30, 0.9); box-shadow: 0 10px 22px rgba(0, 0, 0, 0.2); }
.coord-detail-toggle:disabled { opacity: 0.5; cursor: not-allowed; }

.coord-empty-state { margin-top: 0.7rem; border-radius: 10px; border: 1px dashed var(--coord-border-soft); color: var(--coord-text-soft); padding: 0.9rem; }
.coord-result-body { margin-top: 0.7rem; min-height: fit-content; }
.coord-result-summary { display: flex; justify-content: flex-end; }
.coord-result-summary-trace { font-size: 0.78rem; color: rgba(153, 218, 227, 0.65); font-family: var(--font-mono, monospace); }

.coord-list { margin-top: 0.62rem; display: flex; flex-direction: column; gap: 0.72rem; min-height: fit-content; }
.coord-list-row { position: relative; border-radius: 10px; border: 1px solid rgba(0, 208, 188, 0.32); background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68); padding: 0.54rem 0.64rem; box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 6px 14px rgba(0, 0, 0, 0.16); }
.coord-list-row:nth-child(even) { background: linear-gradient(180deg, rgba(0, 222, 200, 0.03), rgba(0, 222, 200, 0.01)), rgba(1, 14, 20, 0.72); }
.coord-list-row + .coord-list-row::before { content: ''; position: absolute; top: -0.42rem; left: 0.62rem; right: 0.62rem; height: 1px; background: linear-gradient(90deg, rgba(0, 222, 200, 0), rgba(0, 222, 200, 0.34) 18%, rgba(0, 222, 200, 0.34) 82%, rgba(0, 222, 200, 0)); }
.coord-list-row.editing { border-color: rgba(0, 222, 200, 0.42); background: linear-gradient(180deg, rgba(0, 222, 200, 0.12), rgba(0, 222, 200, 0.05)), rgba(6, 24, 28, 0.86); box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.14); }

.coord-list-main { display: flex; align-items: center; gap: 0.34rem; min-width: 0; }
.coord-list-tag { display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; padding: 0.1rem 0.46rem; font-size: 0.8rem; min-height: 25px; line-height: 1.2; font-weight: 700; background: rgba(0, 222, 200, 0.16); color: #95fff5; }
.coord-list-tag.resource { background: rgba(116, 219, 74, 0.16); color: #c1ffab; }
.coord-list-title { color: var(--coord-text); font-weight: 700; font-size: 0.92rem; line-height: 1.4; }

.coord-resource-chip-mini { border-radius: 999px; padding: 0.06rem 0.38rem; font-size: 0.7rem; font-weight: 700; margin-left: 0.2rem; }
.coord-resource-chip-mini.tag-TS_TARGET { background: rgba(255, 183, 77, 0.16); color: #ffd180; }
.coord-resource-chip-mini.tag-EQUIPMENT { background: rgba(77, 182, 255, 0.16); color: #a8d8ff; }
.coord-resource-chip-mini.tag-FIREPOWER { background: rgba(255, 82, 82, 0.16); color: #ffadad; }
.coord-resource-chip-mini.tag-RECON { background: rgba(156, 77, 255, 0.16); color: #d4b3ff; }
.coord-resource-chip-mini.tag-SUPPORT { background: rgba(77, 255, 136, 0.16); color: #b3ffcc; }

.coord-detail-grid { margin-top: 0.42rem; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.46rem; }
.coord-detail-item { border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.22); background: rgba(2, 20, 27, 0.68); padding: 0.44rem 0.52rem; }
.coord-detail-item.full { grid-column: 1 / -1; }
.coord-detail-key { color: rgba(153, 218, 227, 0.92); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em; }
.coord-detail-text { margin-top: 0.2rem; color: rgba(241, 254, 255, 0.98); font-size: 0.9rem; line-height: 1.5; word-break: break-word; font-weight: 650; }

.coord-point-block { margin-top: 0.1rem; grid-column: 1 / -1; border-radius: 10px; border: 1px solid rgba(0, 222, 200, 0.24); background: rgba(2, 18, 26, 0.62); overflow: hidden; }
.coord-point-head, .coord-point-row { display: grid; grid-template-columns: 1.15fr 1fr 1fr 0.8fr; gap: 0.5rem; align-items: center; padding: 0.46rem 0.56rem; }
.coord-point-head { background: rgba(0, 222, 200, 0.1); color: #b9fffa; font-size: 0.78rem; font-weight: 700; }
.coord-point-row { border-top: 1px solid rgba(0, 222, 200, 0.12); color: rgba(227, 248, 251, 0.92); font-size: 0.84rem; }

.coord-mission-row-head { display: flex; align-items: center; justify-content: space-between; gap: 0.65rem; }
.coord-mission-row-actions { display: inline-flex; align-items: center; gap: 0.45rem; flex: 0 0 auto; }
.coord-btn { min-height: 36px; padding: 0 0.92rem; border-radius: 9px; border: 1px solid var(--coord-border-soft); background: rgba(255, 255, 255, 0.08); color: var(--coord-text); cursor: pointer; font-size: 0.97rem; font-weight: 700; transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease; }
.coord-btn:hover { border-color: rgba(0, 222, 200, 0.5); box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.12); }
.coord-btn.primary { border-color: var(--coord-border); background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96)); }
.coord-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.coord-mini-btn { min-height: 32px; min-width: 72px; padding: 0 0.66rem; font-size: 0.82rem; font-weight: 600; }
.coord-edit-grid { margin-top: 0.38rem; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.48rem; }
.coord-edit-row { display: grid; grid-template-columns: 88px minmax(0, 1fr); align-items: center; gap: 0.5rem; }
.coord-edit-label { color: rgba(182, 255, 252, 0.88); font-size: 0.82rem; font-weight: 600; }
.coord-edit-input { width: 100%; min-height: 36px; border-radius: 8px; border: 1px solid rgba(0, 222, 200, 0.34); background: rgba(7, 30, 34, 0.52); color: var(--coord-text); padding: 0 0.66rem; font-size: 0.9rem; font-weight: 600; }
.coord-edit-input:focus { outline: none; border-color: rgba(0, 222, 200, 0.68); box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.18); }

@media (max-width: 900px) {
  .coord-detail-grid { grid-template-columns: 1fr; }
  .coord-result-header { flex-direction: column; align-items: flex-start; }
}
</style>
