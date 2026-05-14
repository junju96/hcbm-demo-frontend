<template>
  <div class="planning-task-shell">
    <!-- ==================== 视图1：任务/方案 列表 ==================== -->
    <div v-if="viewMode === 'mission-list'" class="planning-layout">
      <!-- 左侧列表区 -->
      <aside class="coord-panel planning-left-pane">
        <!-- Tab 切换（任务规划模式显示，临机规划模式隐藏） -->
        <div v-if="mode !== 'ad-hoc'" class="left-tab-bar">
          <button
            v-for="t in leftTabs"
            :key="t.id"
            class="left-tab-btn"
            :class="{ active: leftTab === t.id }"
            type="button"
            @click="leftTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- 任务列表 -->
        <div v-if="leftTab === 'missions'">
          <div v-if="missions.length" class="planning-mission-list">
            <button
              v-for="m in missions"
              :key="m.mission_id"
              class="planning-mission-item"
              :class="{ active: selectedMissionId === m.mission_id }"
              type="button"
              @click="selectedMissionId = m.mission_id"
            >
              <div class="planning-mission-top">
                <span class="planning-mission-name">{{ m.title }}</span>
                <span class="planning-mission-state" :class="`state-${STATE_TONE[m.state] || 'ready'}`">
                  {{ STATE_LABELS[m.state] || m.state }}
                </span>
              </div>
              <div class="planning-mission-desc">{{ m.description }}</div>
              <div class="planning-mission-meta">
                <span>目标 {{ m.target }}</span>
                <span>命令 {{ m.command_id }}</span>
              </div>
            </button>
          </div>
          <div v-else class="coord-empty-state">暂无任务数据</div>
        </div>

        <!-- 方案列表 -->
        <div v-else>
          <div v-if="planCards.length" class="planning-mission-list">
            <button
              v-for="card in planCards"
              :key="card.plan_id"
              class="planning-mission-item"
              :class="{ active: selectedPlanId === card.plan_id }"
              type="button"
              @click="selectedPlanId = card.plan_id"
            >
              <div class="planning-mission-top">
                <span class="planning-mission-name">{{ card.title }}</span>
                <span class="planning-mission-state" :class="`state-${STATE_TONE[card.state] || 'draft'}`">
                  {{ STATE_LABELS[card.state] || card.state }}
                </span>
              </div>
              <div class="planning-mission-desc">{{ card.description }}</div>
              <div class="planning-mission-meta">
                <span>编组 {{ card.teams_count }}</span>
                <span>阶段 {{ card.stages_count }}</span>
                <span>战法 {{ card.tactic_title }}</span>
              </div>
            </button>
          </div>
          <div v-else class="coord-empty-state">暂无方案数据</div>
        </div>
      </aside>

      <!-- 右侧详情区 -->
      <section v-if="leftTab === 'missions' && selectedMission" class="coord-panel planning-right-pane mission-detail-pane">
        <!-- 头部 -->
        <div class="mission-detail-header">
          <h2 class="mission-detail-title">{{ selectedMission.title }}</h2>
          <div class="mission-detail-actions">
            <button class="planning-btn" type="button" @click="onForwardMission">转发</button>
            <div class="mission-status-badge">
              <span class="mission-status-label">状态设置</span>
              <span class="mission-status-value">规划中</span>
            </div>
          </div>
        </div>

        <!-- 任务内容 -->
        <div class="planning-section mission-content-section">
          <div class="planning-section-title">任务内容</div>
          <p class="mission-content-text">{{ selectedMission.description }}</p>
          <div class="mission-content-meta">
            <div class="mission-meta-card">
              <span class="mission-meta-label">执行重点</span>
              <span class="mission-meta-value">{{ selectedMission.target }}</span>
            </div>
            <div class="mission-meta-card">
              <span class="mission-meta-label">命令来源</span>
              <span class="mission-meta-value">{{ selectedMission.command_id }}</span>
            </div>
          </div>
        </div>

        <!-- 关联关系 -->
        <div class="planning-section mission-relation-section">
          <div class="planning-section-header">
            <div class="planning-section-title">关联关系</div>
            <div class="mission-relation-actions">
              <button class="planning-btn small" type="button" @click="onAddRelation">新增</button>
              <button class="planning-btn small" type="button" @click="onRemoveRelation">删除</button>
            </div>
          </div>
          <div class="mission-relation-block">
            <div class="mission-relation-label">已关联命令</div>
            <div class="mission-relation-tags">
              <span class="mission-relation-tag command">命令 1</span>
            </div>
          </div>
          <div class="mission-relation-block">
            <div class="mission-relation-label">已关联方案</div>
            <div class="mission-relation-tags">
              <span class="mission-relation-tag plan">方案 1</span>
              <span class="mission-relation-tag plan-title">{{ planCards[0]?.title || '侦察任务 行动方案' }}</span>
            </div>
          </div>
        </div>

        <!-- 底部操作 -->
        <div class="mission-footer-actions">
          <button class="planning-btn primary large" type="button" @click="enterPlanEdit">
            开始任务规划
          </button>
        </div>
      </section>

      <!-- 右侧：方案详情 -->
      <section v-else-if="leftTab === 'plans' && selectedPlan" class="coord-panel planning-right-pane">
        <!-- 方案概览 -->
        <div class="planning-section">
          <div class="planning-section-title">方案概览</div>
          <div class="planning-overview">
            <div class="planning-overview-row">
              <span class="planning-label">方案标题</span>
              <span class="planning-value">{{ selectedPlan.title }}</span>
            </div>
            <div class="planning-overview-row">
              <span class="planning-label">方案说明</span>
              <span class="planning-value">{{ selectedPlan.description }}</span>
            </div>
            <div class="planning-overview-row">
              <span class="planning-label">战术战法</span>
              <span class="planning-value">
                <strong>{{ selectedPlan.tactic?.title }}</strong>
                <span v-if="selectedPlan.tactic?.content"> — {{ selectedPlan.tactic.content }}</span>
              </span>
            </div>
            <div class="planning-overview-row">
              <span class="planning-label">方案目标</span>
              <div class="planning-targets">
                <div v-for="t in selectedPlan.targets" :key="t.target_id" class="planning-target-chip">
                  {{ t.name }}（{{ t.target_type }}）
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 编组编成 -->
        <div class="planning-section">
          <div class="planning-section-title">编组编成</div>
          <div class="planning-teams">
            <div v-for="team in selectedPlan.teams" :key="team.team_id" class="planning-team-card">
              <div class="planning-team-header">
                <span class="planning-team-name">{{ team.name }}</span>
                <span class="planning-team-state" :class="`state-${STATE_TONE[team.state] || 'ready'}`">
                  {{ STATE_LABELS[team.state] || team.state }}
                </span>
              </div>
              <div class="planning-team-desc">{{ team.description }}</div>
              <div class="planning-team-equip">
                <span class="planning-label">装备：</span>
                <span v-for="(eq, i) in team.equipment" :key="i" class="planning-equip-chip">{{ eq }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 阶段划分 -->
        <div class="planning-section">
          <div class="planning-section-title">阶段划分</div>
          <div class="planning-stages">
            <div
              v-for="stage in selectedPlan.stages"
              :key="stage.stage_id"
              class="planning-stage-card"
              :class="{ expanded: expandedStageIds.includes(stage.stage_id) }"
            >
              <button class="planning-stage-header" type="button" @click="toggleStage(stage.stage_id)">
                <span class="planning-stage-seq">P{{ stage.stage_seq }}</span>
                <span class="planning-stage-title">{{ stage.title }}</span>
                <span class="planning-stage-state" :class="`state-${STATE_TONE[stage.state] || 'ready'}`">
                  {{ STATE_LABELS[stage.state] || stage.state }}
                </span>
                <span class="planning-stage-chevron">{{ expandedStageIds.includes(stage.stage_id) ? '▾' : '▸' }}</span>
              </button>
              <div v-if="expandedStageIds.includes(stage.stage_id)" class="planning-stage-body">
                <div class="planning-stage-desc">{{ stage.description }}</div>
                <div class="planning-stage-teams">
                  <span class="planning-label">参与编组：</span>
                  <span v-for="tid in stage.team_ids" :key="tid" class="planning-tag-chip">{{ resolveTeamName(tid) }}</span>
                </div>
                <div v-if="stage.target_ids?.length" class="planning-stage-targets">
                  <span class="planning-label">关联目标：</span>
                  <span v-for="tid in stage.target_ids" :key="tid" class="planning-tag-chip target">{{ resolveTargetName(tid) }}</span>
                </div>

                <!-- 行动序列（已移除） -->
              </div>
            </div>
          </div>
        </div>

        <!-- 底部操作 -->
        <div class="mission-footer-actions">
          <button class="planning-btn primary large" type="button" @click="onAdHocAdjust">
            临机调整
          </button>
          <button class="planning-btn primary large" type="button" @click="onDispatchExecute">
            下发执行
          </button>
        </div>
      </section>

      <div v-else class="coord-panel planning-right-pane planning-empty">
        <div class="coord-pane-title">{{ (mode !== 'ad-hoc' && leftTab === 'missions') ? '任务详情' : '方案详情' }}</div>
        <div class="coord-empty-state">请从左侧选择一个{{ (mode !== 'ad-hoc' && leftTab === 'missions') ? '任务' : '方案' }}</div>
      </div>
    </div>

    <!-- ==================== 视图2：方案规划编辑 ==================== -->
    <div v-else class="plan-edit-shell">
      <!-- 顶部栏 -->
      <div class="plan-edit-header">
        <div class="plan-edit-tags">
          <span v-if="planEditMode === 'ad-hoc'" class="plan-edit-tag draft">临机调整</span>
          <template v-else>
            <span class="plan-edit-tag draft">行动方案草稿</span>
            <span class="plan-edit-tag status">编辑中</span>
          </template>
        </div>
        <div class="plan-edit-actions">
          <template v-if="planEditMode === 'ad-hoc'">
            <button class="planning-btn primary" type="button" @click="onSaveDraft">保存</button>
            <button class="planning-btn" type="button" @click="onCancelAdHocEdit">取消</button>
          </template>
          <template v-else>
            <button class="planning-btn" type="button" @click="onSaveDraft">保存草稿</button>
            <button class="planning-btn primary" type="button" @click="onGeneratePlan">一键生成行动方案</button>
            <button class="planning-btn primary" type="button" @click="onPublishPlan">发布为正式行动方案</button>
          </template>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="plan-section">
        <div class="plan-section-title">基本信息</div>
        <div class="plan-form-row">
          <span class="plan-form-label">方案标题</span>
          <input v-model="planDraft.title" class="plan-form-input" placeholder="输入方案标题" />
        </div>

        <!-- 建立关联 -->
        <div class="plan-association-block">
          <div class="plan-section-subheader">
            <span class="plan-section-subtitle">建立关联</span>
            <button class="planning-btn small" type="button" @click="onEditAssociation">编辑关联</button>
          </div>
          <div class="plan-association-row">
            <span class="plan-association-label">关联命令：</span>
            <span class="plan-association-tag command">命令 1</span>
          </div>
          <div class="plan-association-row">
            <span class="plan-association-label">关联任务：</span>
            <span class="plan-association-tag mission">侦察任务</span>
          </div>
          <div class="plan-association-row">
            <span class="plan-association-label">关联资源：</span>
            <span class="plan-association-tag empty">暂无关联资源</span>
          </div>
        </div>

        <!-- 战术战法 -->
        <div class="plan-tactic-block">
          <div class="plan-form-label">战术战法选择</div>

          <!-- 当前选中条 -->
          <div class="plan-tactic-select" @click="tacticsExpanded = !tacticsExpanded">
            <div class="plan-tactic-option active">
              <div class="plan-tactic-name">{{ selectedTactic.title }}</div>
              <div class="plan-tactic-desc">{{ selectedTactic.content }}</div>
              <span class="plan-tactic-chevron">{{ tacticsExpanded ? '▲' : '▼' }}</span>
            </div>
          </div>

          <!-- 战法卡片网格 -->
          <div v-if="tacticsExpanded" class="plan-tactic-grid">
            <div
              v-for="t in tactics"
              :key="t.id"
              class="plan-tactic-card"
              :class="{ active: selectedTacticId === t.id }"
              @click="selectTactic(t.id)"
            >
              <div class="plan-tactic-card-name">{{ t.title }}</div>
              <div class="plan-tactic-card-desc">{{ t.content }}</div>
              <div class="plan-tactic-card-scenario">{{ t.scenario }}</div>
            </div>

            <div class="plan-tactic-card add" @click="onAddTactic">
              <div class="plan-tactic-card-name">新增战术战法</div>
              <div class="plan-tactic-card-desc">补充新的战法卡片并自动加入候选列表</div>
              <div class="plan-tactic-card-scenario">点击后打开新建弹窗</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 编组编成 -->
      <div class="plan-section">
        <div class="plan-section-title">编组编成</div>
        <div class="plan-resource-header">
          <span class="plan-form-label">行动资源</span>
          <button
            class="planning-btn small"
            type="button"
            @click="onAddResource"
          >
            {{ resourcePickerVisible ? '收起' : '增加' }}
          </button>
        </div>

        <!-- 未展开时显示占位 -->
        <template v-if="!resourcePickerVisible">
          <div v-if="!selectedResourceIds.length" class="plan-resource-empty">
            <span class="plan-resource-empty-text">暂无已选资源，可点击"增加"选择</span>
          </div>
          <div class="plan-resource-selected">
            <span class="plan-form-label">已选资源：</span>
            <span class="plan-resource-selected-value">{{ selectedResourceNames }}</span>
          </div>
        </template>

        <!-- 展开后显示资源选择面板 -->
        <div v-else class="resource-picker">
          <div class="resource-picker-header">
            <span class="resource-picker-title">选择新增资源</span>
          </div>
          <div class="resource-picker-list">
            <label
              v-for="res in equipmentResources"
              :key="res.resource_id"
              class="resource-picker-card"
              :class="{ selected: selectedResourceIds.includes(res.resource_id) }"
            >
              <input
                type="checkbox"
                :value="res.resource_id"
                v-model="selectedResourceIds"
              />
              <div class="resource-picker-info">
                <div class="resource-picker-name">{{ res.resource_name }}</div>
                <div class="resource-picker-type">{{ getResourceTypeLabel(res) }}</div>
                <div class="resource-picker-desc">{{ getResourceDesc(res) }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 行动编组 -->
        <div class="plan-team-block">
          <div class="plan-section-subheader">
            <div class="plan-team-header-left">
              <span class="plan-section-subtitle">行动编组</span>
              <div v-if="teamEditMode" class="plan-team-edit-actions">
                <button class="planning-btn small" type="button" @click="openCreateTeamDialog">新建</button>
                <button class="planning-btn small" type="button" :disabled="selectedTeamIds.length < 2" @click="onMergeTeams">合并</button>
                <button class="planning-btn small danger" type="button" @click="onRemoveTeams">移除</button>
              </div>
            </div>
            <button class="planning-btn small" type="button" @click="toggleTeamEdit">
              {{ teamEditMode ? '收起' : '编辑' }}
            </button>
          </div>
          <div v-if="!teamEditMode" class="plan-team-hint">点击编组卡片可选中，编辑面板支持新建、合并、移除</div>
          <div class="plan-team-table-header">
            <span>编组名称</span>
            <span>编组说明</span>
            <span>编组资源</span>
          </div>
          <div v-if="teams.length" class="plan-team-list">
            <div
              v-for="team in teams"
              :key="team.team_id"
              class="plan-team-row"
              :class="{ selected: selectedTeamIds.includes(team.team_id) }"
              @click="toggleTeamSelection(team.team_id)"
            >
              <span class="plan-team-cell">{{ team.name }}</span>
              <span class="plan-team-cell">{{ team.description }}</span>
              <span class="plan-team-cell">{{ team.resource_names }}</span>
            </div>
          </div>
          <div v-else class="plan-team-empty">
            <span>暂无编组，可点击"编辑"后新建编组</span>
          </div>
        </div>
      </div>

      <!-- 阶段划分 -->
      <div class="plan-section">
        <div class="plan-section-header">
          <div class="plan-section-title">阶段划分</div>
          <button class="planning-btn small" type="button" @click="onAddStage">新增阶段</button>
        </div>
        <div v-if="stages.length" class="stage-list">
          <div v-for="(stage, index) in stages" :key="stage.stage_id" class="stage-card">
            <div class="stage-card-header">
              <span class="stage-seq">阶段 {{ index + 1 }}</span>
              <input v-model="stage.title" class="stage-title-input" placeholder="请输入阶段名称" />
              <div class="stage-card-actions">
                <button class="planning-btn small" type="button" @click="stage.expanded = !stage.expanded">
                  {{ stage.expanded ? '收起' : '展开' }}
                </button>
                <button class="planning-btn small danger" type="button" @click="onRemoveStage(stage.stage_id)">删除</button>
              </div>
            </div>
            <div v-if="stage.expanded" class="stage-card-body">
              <div class="plan-form-label">阶段说明</div>
              <textarea v-model="stage.description" class="plan-form-input stage-desc-input" rows="4" placeholder="请输入该阶段行动安排" />
            </div>
          </div>
        </div>
        <div v-else class="plan-team-empty">
          <span>暂无阶段，可点击"新增阶段"添加</span>
        </div>
      </div>

      <!-- 返回按钮 -->
      <div class="plan-edit-footer">
        <button class="planning-btn" type="button" @click="viewMode = 'mission-list'">返回任务列表</button>
      </div>
    </div>

    <!-- 编辑关联弹窗 -->
    <EditAssociationDialog
      v-model:visible="editAssocVisible"
      @confirm="onAssocConfirm"
    />

    <!-- 新建行动编组弹窗 -->
    <div v-if="newTeamDialogVisible" class="team-dialog-mask" @click.self="newTeamDialogVisible = false">
      <div class="team-dialog">
        <div class="team-dialog-header">
          <div class="team-dialog-title">新建行动编组</div>
          <button class="planning-btn small" type="button" @click="newTeamDialogVisible = false">关闭</button>
        </div>
        <div class="team-dialog-body">
          <div class="plan-form-row">
            <span class="plan-form-label">编组名称</span>
            <input v-model="newTeamName" class="plan-form-input" placeholder="请输入编组名称" />
          </div>
          <div class="plan-form-row">
            <span class="plan-form-label">选择行动资源</span>
            <div v-if="!selectedResourceIds.length" class="plan-resource-empty">
              <span class="plan-resource-empty-text">请先在上方行动资源中选择资源，再建立编组</span>
            </div>
            <div v-else class="team-resource-select-list">
              <label
                v-for="res in selectedEquipmentResources"
                :key="res.resource_id"
                class="team-resource-select-item"
              >
                <input type="checkbox" :value="res.resource_id" v-model="newTeamResourceIds" />
                <span>{{ res.resource_name }}（{{ getResourceTypeLabel(res) }}）</span>
              </label>
            </div>
          </div>
          <div class="plan-form-row">
            <span class="plan-form-label">编组说明</span>
            <textarea v-model="newTeamDesc" class="plan-form-input" rows="3" placeholder="请输入编组说明" />
          </div>
        </div>
        <div class="team-dialog-footer">
          <button class="planning-btn" type="button" @click="newTeamDialogVisible = false">取消</button>
          <button class="planning-btn primary" type="button" @click="onCreateTeam">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  missionsList, planCards, planDetail, STATE_LABELS, STATE_TONE,
} from '../../../data/planningDataModel';
import { resourceRecords, RESOURCE_TAGS } from '../../../data/commandDataModel';
import EditAssociationDialog from './EditAssociationDialog.vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  mode: { type: String, default: 'task' }, // 'task' | 'ad-hoc'
});

const emit = defineEmits(['switch-tab']);

// ========== 视图模式 ==========
const viewMode = ref('mission-list'); // 'mission-list' | 'plan-edit'
const planEditMode = ref('normal'); // 'normal' | 'ad-hoc'

// ========== 左侧 Tab ==========
const leftTabs = [
  { id: 'missions', label: '任务列表' },
  { id: 'plans', label: '方案列表' },
];
const leftTab = ref(props.mode === 'ad-hoc' ? 'plans' : 'missions');

// ========== 任务列表 ==========
const missions = missionsList;
const selectedMissionId = ref(missions[0]?.mission_id || '');
const selectedMission = computed(() =>
  missions.find((m) => m.mission_id === selectedMissionId.value) || null
);

// ========== 方案列表 ==========
const selectedPlanId = ref(planCards[0]?.plan_id || '');
const selectedPlan = computed(() => {
  if (!selectedPlanId.value) return null;
  // 目前仅一条 mock 数据，直接返回 planDetail
  return planDetail.plan_id === selectedPlanId.value ? planDetail : null;
});

const expandedStageIds = ref([]);
const toggleStage = (stageId) => {
  if (expandedStageIds.value.includes(stageId)) {
    expandedStageIds.value = expandedStageIds.value.filter((id) => id !== stageId);
  } else {
    expandedStageIds.value.push(stageId);
  }
};

const resolveTeamName = (teamId) => {
  const team = planDetail.teams?.find((t) => t.team_id === teamId);
  return team?.name || teamId;
};

const resolveTargetName = (targetId) => {
  const target = planDetail.targets?.find((t) => t.target_id === targetId);
  return target?.name || targetId;
};

const appendSystemMessage = (text) => {
  props.moduleApi.chat?.appendSystemMessage?.(`[任务规划] ${text}`);
};

// ========== 任务详情操作 ==========
const onForwardMission = () => {
  appendSystemMessage(`转发任务：${selectedMission.value?.title}`);
};

const onAddRelation = () => {
  appendSystemMessage('新增关联关系（演示模式）');
};

const onRemoveRelation = () => {
  appendSystemMessage('删除关联关系（演示模式）');
};

const enterPlanEdit = () => {
  planDraft.value = JSON.parse(JSON.stringify(planDetail));
  planEditMode.value = 'normal';
  viewMode.value = 'plan-edit';
  appendSystemMessage(`开始任务规划：${selectedMission.value?.title}`);
};

// ========== 方案详情操作 ==========
const onAdHocAdjust = () => {
  planDraft.value = JSON.parse(JSON.stringify(planDetail));
  planEditMode.value = 'ad-hoc';
  viewMode.value = 'plan-edit';
  appendSystemMessage('临机调整：已请求调整当前方案');
};

const onCancelAdHocEdit = () => {
  viewMode.value = 'mission-list';
  planEditMode.value = 'normal';
  planDraft.value = null;
  appendSystemMessage('已取消临机调整');
};

const onDispatchExecute = () => {
  appendSystemMessage(`下发执行：${selectedPlan.value?.title}`);
};

// ========== 战术战法 ==========
const tactics = [
  {
    id: 'TACTIC_001',
    title: '隐蔽侦察',
    content: '以隐蔽接近与快速确认为主',
    scenario: '适合目标区域侦察确认',
  },
  {
    id: 'TACTIC_002',
    title: '协同机动',
    content: '以多单元协同机动接近目标',
    scenario: '适合伴随通信与多车协同',
  },
  {
    id: 'TACTIC_003',
    title: '分组推进',
    content: '按编组分段推进并逐步控制区域',
    scenario: '适合阶段式推进和分组执行',
  },
  {
    id: 'TACTIC_004',
    title: '通信保障伴随',
    content: '将通信保障编入行动主流程',
    scenario: '适合链路稳定要求较高的任务',
  },
];

const selectedTacticId = ref('TACTIC_001');
const tacticsExpanded = ref(false);

const selectedTactic = computed(() =>
  tactics.find((t) => t.id === selectedTacticId.value) || tactics[0]
);

const selectTactic = (id) => {
  selectedTacticId.value = id;
  if (planDraft.value) {
    planDraft.value.tactic = {
      tactic_id: id,
      title: selectedTactic.value.title,
      content: selectedTactic.value.content,
    };
  }
};

// ========== 方案编辑视图 ==========
const planDraft = ref(null);

const onSaveDraft = () => {
  appendSystemMessage('方案草稿已保存');
};

const onGeneratePlan = () => {
  appendSystemMessage('正在一键生成行动方案…');
  setTimeout(() => {
    appendSystemMessage('行动方案生成完成');
  }, 800);
};

const onPublishPlan = () => {
  appendSystemMessage('方案已发布为正式行动方案');
};

const editAssocVisible = ref(false);

const onEditAssociation = () => {
  editAssocVisible.value = true;
};

const onAssocConfirm = ({ commandIds, taskIds }) => {
  appendSystemMessage(`关联已更新：命令 ${commandIds.length} 条，任务 ${taskIds.length} 条`);
};

// ========== 行动资源选择 ==========
const resourcePickerVisible = ref(false);
const selectedResourceIds = ref([]);

const equipmentResources = computed(() =>
  resourceRecords.filter((r) => r.resource_tag === RESOURCE_TAGS.EQUIPMENT)
);

const equipmentDescMap = {
  101: { typeLabel: '中型履带平台', desc: '承担侦察确认与近距打击支援' },
  102: { typeLabel: '中型履带平台', desc: '承担协同机动与巡飞弹打击任务' },
  103: { typeLabel: '空中平台', desc: '承担空中侦察与态势回传' },
  104: { typeLabel: '轻型轮式平台', desc: '承担机动伴随与前沿巡逻保障' },
};

const getResourceTypeLabel = (res) => equipmentDescMap[res.resource_id]?.typeLabel || res.resource_type;
const getResourceDesc = (res) => equipmentDescMap[res.resource_id]?.desc || '';

const onAddResource = () => {
  resourcePickerVisible.value = !resourcePickerVisible.value;
};

const selectedResourceNames = computed(() => {
  const names = equipmentResources.value
    .filter((r) => selectedResourceIds.value.includes(r.resource_id))
    .map((r) => r.resource_name);
  return names.length ? names.join('、') : '暂无选择';
});

// ========== 行动编组 ==========
const teamEditMode = ref(false);
const teams = ref([]);
const selectedTeamIds = ref([]);
const newTeamDialogVisible = ref(false);
const newTeamName = ref('');
const newTeamDesc = ref('');
const newTeamResourceIds = ref([]);

const selectedEquipmentResources = computed(() =>
  equipmentResources.value.filter((r) => selectedResourceIds.value.includes(r.resource_id))
);

const toggleTeamEdit = () => {
  teamEditMode.value = !teamEditMode.value;
  if (!teamEditMode.value) selectedTeamIds.value = [];
};

const openCreateTeamDialog = () => {
  newTeamName.value = '';
  newTeamDesc.value = '';
  newTeamResourceIds.value = [];
  newTeamDialogVisible.value = true;
};

const onCreateTeam = () => {
  const name = newTeamName.value.trim();
  if (!name) {
    appendSystemMessage('请输入编组名称');
    return;
  }
  const selectedResources = equipmentResources.value.filter((r) => newTeamResourceIds.value.includes(r.resource_id));
  teams.value.push({
    team_id: `TEAM_${Date.now()}`,
    name,
    description: newTeamDesc.value.trim(),
    resource_ids: [...newTeamResourceIds.value],
    resource_names: selectedResources.map((r) => r.resource_name).join('、') || '无',
  });
  newTeamDialogVisible.value = false;
  appendSystemMessage(`新建编组：${name}`);
};

const toggleTeamSelection = (teamId) => {
  if (selectedTeamIds.value.includes(teamId)) {
    selectedTeamIds.value = selectedTeamIds.value.filter((id) => id !== teamId);
  } else {
    selectedTeamIds.value.push(teamId);
  }
};

const onRemoveTeams = () => {
  if (selectedTeamIds.value.length === 0) {
    appendSystemMessage('请先点击选中要移除的编组');
    return;
  }
  const count = selectedTeamIds.value.length;
  teams.value = teams.value.filter((t) => !selectedTeamIds.value.includes(t.team_id));
  selectedTeamIds.value = [];
  appendSystemMessage(`已移除 ${count} 个编组`);
};

const onMergeTeams = () => {
  if (selectedTeamIds.value.length < 2) return;
  const selectedTeams = teams.value.filter((t) => selectedTeamIds.value.includes(t.team_id));
  const mergedName = `${selectedTeams[0].name}合并组`;
  const mergedDesc = selectedTeams.map((t) => t.description).filter(Boolean).join('；');
  const allResourceIds = [...new Set(selectedTeams.flatMap((t) => t.resource_ids))];
  const allResourceNames = equipmentResources.value
    .filter((r) => allResourceIds.includes(r.resource_id))
    .map((r) => r.resource_name)
    .join('、');
  teams.value = teams.value.filter((t) => !selectedTeamIds.value.includes(t.team_id));
  teams.value.push({
    team_id: `TEAM_${Date.now()}`,
    name: mergedName,
    description: mergedDesc,
    resource_ids: allResourceIds,
    resource_names: allResourceNames || '无',
  });
  selectedTeamIds.value = [];
  appendSystemMessage(`合并编组：${mergedName}`);
};

const onEditTeam = () => {
  appendSystemMessage('编辑行动编组（演示模式）');
};

// ========== 阶段划分 ==========
const stages = ref([]);

const onAddStage = () => {
  stages.value.push({
    stage_id: `STAGE_${Date.now()}`,
    title: '',
    description: '',
    expanded: true,
  });
};

const onRemoveStage = (stageId) => {
  stages.value = stages.value.filter((s) => s.stage_id !== stageId);
};

const onAddTactic = () => {
  appendSystemMessage('新增战术战法（演示模式）');
};
</script>

<style>
.planning-task-shell {
  --planning-border: rgba(0, 208, 188, 0.4);
  --planning-border-soft: rgba(0, 208, 188, 0.26);
  --planning-bg: rgba(1, 16, 22, 0.84);
  --planning-bg-strong: rgba(1, 12, 18, 0.92);
  --planning-text: #f1feff;
  --planning-text-soft: rgba(226, 246, 248, 0.86);
  --planning-accent: #00dec8;
  --planning-accent-soft: rgba(0, 222, 200, 0.12);
  --planning-card-bg: rgba(6, 20, 26, 0.86);
  --planning-btn-bg: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  --planning-btn-primary: linear-gradient(180deg, rgba(0, 173, 181, 0.55) 0%, rgba(0, 130, 140, 0.55) 100%);
}
</style>

<style scoped>
.planning-task-shell {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.6;
  color: var(--planning-text);
}

/* ===== 通用按钮 ===== */
.planning-btn {
  min-height: 34px;
  padding: 0 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: var(--planning-btn-bg);
  color: #f8fafc;
  cursor: pointer;
  font-size: 0.88rem;
  transition: border-color 160ms ease, background 160ms ease;
  white-space: nowrap;
}
.planning-btn:hover {
  border-color: rgba(0, 222, 200, 0.45);
}
.planning-btn.primary {
  border-color: rgba(0, 222, 200, 0.35);
  background: var(--planning-btn-primary);
}
.planning-btn.primary:hover {
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.7) 0%, rgba(0, 130, 140, 0.7) 100%);
}
.planning-btn.small {
  min-height: 28px;
  padding: 0 0.65rem;
  font-size: 0.82rem;
  border-radius: 8px;
}
.planning-btn.large {
  min-height: 44px;
  padding: 0 1.4rem;
  font-size: 0.98rem;
}

/* ===== 视图1：列表布局 ===== */
.planning-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 0.8rem;
  width: 100%;
  min-height: fit-content;
  align-items: start;
}

.coord-panel {
  border-radius: 16px;
  border: 1px solid var(--planning-border);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    var(--planning-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05);
}

.planning-left-pane {
  display: flex;
  flex-direction: column;
  padding: 0.9rem;
  max-height: 100%;
  overflow-y: auto;
}

.planning-right-pane {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.9rem;
  min-width: 0;
  min-height: fit-content;
}

.planning-empty {
  align-items: center;
  justify-content: center;
  text-align: center;
}

.coord-pane-title {
  color: var(--planning-text);
  font-size: 1.24rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 0 14px rgba(0, 222, 200, 0.16);
}

.coord-empty-state {
  margin-top: 0.7rem;
  border-radius: 10px;
  border: 1px dashed var(--planning-border-soft);
  color: var(--planning-text-soft);
  padding: 0.9rem;
}

/* 左侧 Tab */
.left-tab-bar {
  display: flex;
  gap: 0.2rem;
  margin-bottom: 0.7rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.left-tab-btn {
  flex: 1;
  padding: 0.45rem 0.3rem;
  border: none;
  background: transparent;
  color: rgba(226, 246, 248, 0.6);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  transition: color 160ms ease, background 160ms ease;
}

.left-tab-btn:hover {
  color: rgba(226, 246, 248, 0.9);
  background: rgba(0, 222, 200, 0.05);
}

.left-tab-btn.active {
  color: var(--planning-accent);
  background: rgba(0, 222, 200, 0.08);
}

/* 列表项（复用于任务和方案） */
.planning-mission-list {
  margin-top: 0.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.62rem;
}

.planning-mission-item {
  border-radius: 12px;
  border: 1px solid var(--planning-border-soft);
  border-left: 3px solid rgba(0, 222, 200, 0.36);
  background: var(--planning-bg-strong);
  color: var(--planning-text);
  text-align: left;
  padding: 0.66rem 0.72rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}
.planning-mission-item.active {
  border-color: var(--planning-border);
  border-left-color: var(--planning-accent);
  background: linear-gradient(180deg, var(--planning-accent-soft), rgba(0, 49, 72, 0.03)), var(--planning-bg-strong);
}
.planning-mission-item:hover {
  border-color: rgba(0, 222, 200, 0.42);
  transform: translateY(-1px);
}

.planning-mission-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.planning-mission-name {
  font-weight: 700;
  font-size: 0.96rem;
}
.planning-mission-state {
  border-radius: 999px;
  padding: 0.16rem 0.56rem;
  font-size: 0.74rem;
  font-weight: 700;
  flex-shrink: 0;
}
.planning-mission-desc {
  margin-top: 0.38rem;
  color: rgba(236, 252, 255, 0.92);
  font-size: 0.9rem;
  line-height: 1.45;
}
.planning-mission-meta {
  margin-top: 0.38rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: rgba(226, 246, 248, 0.7);
}
.planning-mission-meta > span {
  background: rgba(0, 222, 200, 0.08);
  border-radius: 6px;
  padding: 0.12rem 0.4rem;
}

/* 状态颜色 */
.state-draft { background: rgba(229, 168, 11, 0.2); color: #ffe28c; }
.state-ready { background: rgba(0, 222, 200, 0.2); color: #b4fff8; }
.state-active { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
.state-completed { background: rgba(34, 197, 94, 0.2); color: #86efac; }
.state-pending { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; }

/* ===== 任务详情右侧 ===== */
.mission-detail-pane {
  gap: 0.7rem;
}

.mission-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.mission-detail-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--planning-text);
  margin: 0;
  line-height: 1.3;
}

.mission-detail-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.mission-status-badge {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.35rem 0.7rem;
  font-size: 0.88rem;
}

.mission-status-label {
  color: rgba(226, 246, 248, 0.6);
}

.mission-status-value {
  color: var(--planning-accent);
  font-weight: 700;
}

/* 任务内容区 */
.mission-content-section {
  border-radius: 12px;
  border: 1px solid var(--planning-border-soft);
  background: var(--planning-card-bg);
  padding: 0.8rem 0.9rem;
}

.mission-content-text {
  margin: 0.5rem 0 0;
  color: var(--planning-text-soft);
  font-size: 0.92rem;
  line-height: 1.7;
}

.mission-content-meta {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.mission-meta-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(0, 222, 200, 0.04);
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mission-meta-label {
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.6);
}

.mission-meta-value {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--planning-text);
}

/* 关联关系 */
.mission-relation-section {
  border-radius: 12px;
  border: 1px solid var(--planning-border-soft);
  background: var(--planning-card-bg);
  padding: 0.8rem 0.9rem;
}

.planning-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.planning-section-title {
  color: var(--planning-text);
  font-weight: 700;
  font-size: 1.05rem;
}

.mission-relation-actions {
  display: flex;
  gap: 0.4rem;
}

.mission-relation-block {
  margin-top: 0.6rem;
}

.mission-relation-label {
  font-size: 0.85rem;
  color: rgba(226, 246, 248, 0.6);
  margin-bottom: 0.35rem;
}

.mission-relation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
}

.mission-relation-tag {
  border-radius: 8px;
  padding: 0.25rem 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.mission-relation-tag.command {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.mission-relation-tag.plan {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.mission-relation-tag.plan-title {
  background: rgba(59, 130, 246, 0.08);
  color: #93c5fd;
  font-weight: 500;
}

.mission-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding-top: 0.3rem;
}

/* ===== 方案详情（查看模式） ===== */
.planning-overview {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.planning-overview-row {
  display: flex;
  gap: 0.6rem;
  padding: 0.35rem 0;
  align-items: flex-start;
}

.planning-label {
  color: rgba(226, 246, 248, 0.65);
  font-size: 0.84rem;
  flex-shrink: 0;
  min-width: 72px;
}

.planning-value {
  color: var(--planning-text-soft);
  font-size: 0.9rem;
  word-break: break-word;
}

.planning-targets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.planning-target-chip {
  background: rgba(0, 222, 200, 0.1);
  border: 1px solid rgba(0, 222, 200, 0.25);
  border-radius: 8px;
  padding: 0.2rem 0.55rem;
  font-size: 0.85rem;
  color: var(--planning-text);
}

/* 编组卡片 */
.planning-teams {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.planning-team-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(0, 222, 200, 0.04);
  padding: 0.65rem 0.75rem;
}

.planning-team-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.planning-team-name {
  font-weight: 700;
  font-size: 0.96rem;
}

.planning-team-state {
  border-radius: 999px;
  padding: 0.14rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.planning-team-desc {
  margin-top: 0.35rem;
  color: var(--planning-text-soft);
  font-size: 0.88rem;
}

.planning-team-equip {
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.planning-equip-chip {
  background: rgba(0, 222, 200, 0.1);
  border-radius: 6px;
  padding: 0.12rem 0.45rem;
  font-size: 0.82rem;
  color: var(--planning-accent);
}

/* 阶段卡片 */
.planning-stages {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.planning-stage-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(0, 222, 200, 0.04);
  overflow: hidden;
}

.planning-stage-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.6rem 0.75rem;
  width: 100%;
  background: transparent;
  border: none;
  color: var(--planning-text);
  cursor: pointer;
  text-align: left;
  transition: background 160ms ease;
}
.planning-stage-header:hover {
  background: rgba(0, 222, 200, 0.06);
}

.planning-stage-seq {
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--planning-accent);
  min-width: 28px;
}

.planning-stage-title {
  flex: 1;
  font-weight: 700;
  font-size: 0.95rem;
}

.planning-stage-state {
  border-radius: 999px;
  padding: 0.14rem 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
}

.planning-stage-chevron {
  font-size: 0.85rem;
  color: rgba(226, 246, 248, 0.6);
  width: 18px;
  text-align: center;
}

.planning-stage-body {
  padding: 0.5rem 0.75rem 0.75rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}

.planning-stage-desc {
  color: var(--planning-text-soft);
  font-size: 0.88rem;
  margin-bottom: 0.5rem;
}

.planning-stage-teams,
.planning-stage-targets {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.3rem;
}

.planning-tag-chip {
  background: rgba(0, 222, 200, 0.08);
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
  font-size: 0.82rem;
  color: var(--planning-text-soft);
}

.planning-tag-chip.target {
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
}

/* 行动序列 */
.planning-actions-section {
  margin-top: 0.7rem;
  padding-top: 0.6rem;
  border-top: 1px dashed rgba(0, 222, 200, 0.15);
}

.planning-actions-title {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--planning-accent);
  margin-bottom: 0.5rem;
}

.planning-action-group {
  margin-bottom: 0.6rem;
}

.planning-action-group-title {
  font-weight: 700;
  font-size: 0.88rem;
  color: var(--planning-text);
  margin-bottom: 0.35rem;
}

.planning-action-vehicles {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.planning-vehicle-card {
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 222, 200, 0.03);
  padding: 0.5rem 0.6rem;
}

.planning-vehicle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.planning-vehicle-name {
  font-weight: 700;
  font-size: 0.88rem;
}

.planning-vehicle-state {
  border-radius: 999px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.planning-action-list {
  margin-top: 0.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.planning-action-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  background: rgba(0, 222, 200, 0.04);
  font-size: 0.86rem;
}

.planning-action-seq {
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 222, 200, 0.15);
  color: var(--planning-accent);
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.planning-action-name {
  font-weight: 700;
  color: var(--planning-text);
  flex-shrink: 0;
}

.planning-action-desc {
  color: rgba(226, 246, 248, 0.7);
  font-size: 0.82rem;
}

.planning-action-empty {
  color: rgba(226, 246, 248, 0.5);
  font-size: 0.84rem;
  padding: 0.3rem 0;
}

/* ===== 视图2：方案编辑 ===== */
.plan-edit-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: fit-content;
  gap: 0.7rem;
  padding: 0.2rem 0.1rem;
}

.plan-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
  padding: 0.4rem 0.2rem;
}

.plan-edit-tags {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.plan-edit-tag {
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-size: 0.88rem;
  font-weight: 700;
}

.plan-edit-tag.draft {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.plan-edit-tag.status {
  background: rgba(0, 222, 200, 0.1);
  color: var(--planning-accent);
  border: 1px solid rgba(0, 222, 200, 0.2);
}

.plan-edit-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.plan-section {
  border-radius: 12px;
  border: 1px solid var(--planning-border-soft);
  background: var(--planning-card-bg);
  padding: 0.8rem 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.plan-form-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.plan-form-label {
  color: rgba(226, 246, 248, 0.65);
  font-size: 0.85rem;
}

.plan-form-input {
  width: 100%;
  min-height: 40px;
  padding: 0.45rem 0.7rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.88);
  color: #f8fafc;
  font-size: 0.92rem;
  outline: none;
  transition: border-color 160ms ease;
}

.plan-form-input:focus {
  border-color: rgba(0, 222, 200, 0.5);
}

.plan-association-block {
  margin-top: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.plan-section-subheader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.plan-section-subtitle {
  color: var(--planning-text);
  font-weight: 700;
  font-size: 1rem;
}

.plan-association-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 222, 200, 0.03);
}

.plan-association-label {
  color: rgba(226, 246, 248, 0.65);
  font-size: 0.86rem;
  min-width: 72px;
}

.plan-association-tag {
  border-radius: 8px;
  padding: 0.2rem 0.55rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.plan-association-tag.command {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.plan-association-tag.mission {
  background: rgba(59, 130, 246, 0.15);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.25);
}

.plan-association-tag.empty {
  color: rgba(226, 246, 248, 0.45);
  font-weight: 500;
}

.plan-tactic-block {
  margin-top: 0.3rem;
}

.plan-tactic-select {
  margin-top: 0.4rem;
}

.plan-tactic-option {
  position: relative;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(0, 222, 200, 0.05);
  padding: 0.65rem 0.85rem;
  cursor: pointer;
  transition: border-color 160ms ease;
}

.plan-tactic-option:hover {
  border-color: rgba(0, 222, 200, 0.35);
}

.plan-tactic-option.active {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.08);
}

.plan-tactic-name {
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--planning-text);
}

.plan-tactic-desc {
  margin-top: 0.2rem;
  font-size: 0.85rem;
  color: var(--planning-text-soft);
}

.plan-tactic-chevron {
  position: absolute;
  right: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--planning-accent);
  font-size: 0.8rem;
}

/* 战法卡片网格 */
.plan-tactic-grid {
  margin-top: 0.6rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.plan-tactic-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.75rem 0.9rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.plan-tactic-card:hover {
  border-color: rgba(0, 222, 200, 0.3);
  transform: translateY(-1px);
}

.plan-tactic-card.active {
  border-color: rgba(59, 130, 246, 0.55);
  background: rgba(59, 130, 246, 0.1);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
}

.plan-tactic-card.add {
  border-style: dashed;
  border-color: rgba(0, 222, 200, 0.22);
  background: rgba(0, 222, 200, 0.03);
}

.plan-tactic-card.add:hover {
  border-color: rgba(0, 222, 200, 0.4);
  background: rgba(0, 222, 200, 0.06);
}

.plan-tactic-card-name {
  font-weight: 700;
  font-size: 0.96rem;
  color: var(--planning-text);
}

.plan-tactic-card-desc {
  font-size: 0.86rem;
  color: var(--planning-text-soft);
  line-height: 1.5;
}

.plan-tactic-card-scenario {
  font-size: 0.84rem;
  color: rgba(226, 246, 248, 0.6);
  margin-top: 0.1rem;
}

@media (max-width: 768px) {
  .plan-tactic-grid {
    grid-template-columns: 1fr;
  }
}

.plan-resource-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.plan-resource-empty {
  border-radius: 10px;
  border: 1px dashed rgba(0, 222, 200, 0.18);
  padding: 0.9rem;
  text-align: center;
}

.plan-resource-empty-text {
  color: rgba(226, 246, 248, 0.5);
  font-size: 0.88rem;
}

.plan-resource-selected {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.35rem;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  background: rgba(0, 222, 200, 0.05);
  border: 1px solid rgba(0, 222, 200, 0.12);
}

.plan-resource-selected .plan-form-label {
  color: rgba(226, 246, 248, 0.55);
  font-size: 0.82rem;
  flex-shrink: 0;
  padding-top: 0.08rem;
}

.plan-resource-selected-value {
  color: var(--planning-accent);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.5;
}

/* 资源选择面板 */
.resource-picker {
  margin-top: 0.4rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.6);
  padding: 0.7rem 0.8rem;
}

.resource-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.resource-picker-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--planning-text);
}

.resource-picker-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
}

.resource-picker-card {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 222, 200, 0.04);
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.resource-picker-card:hover {
  border-color: rgba(0, 222, 200, 0.28);
}

.resource-picker-card.selected {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.08);
}

.resource-picker-card input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 2px solid rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.06);
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
  margin-top: 0.1rem;
  transition: border-color 160ms ease, background 160ms ease;
}

.resource-picker-card input[type="checkbox"]:checked {
  border-color: var(--planning-accent);
  background: var(--planning-accent);
}

.resource-picker-card input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid rgba(1, 16, 22, 0.96);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.resource-picker-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  flex: 1;
  min-width: 0;
}

.resource-picker-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--planning-text);
}

.resource-picker-type {
  font-size: 0.84rem;
  color: #93c5fd;
  font-weight: 600;
}

.resource-picker-desc {
  font-size: 0.84rem;
  color: rgba(226, 246, 248, 0.65);
}

.plan-team-block {
  margin-top: 0.3rem;
}

.plan-team-header-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  flex: 1;
}

.plan-team-edit-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.plan-team-hint {
  font-size: 0.8rem;
  color: rgba(226, 246, 248, 0.45);
  margin-bottom: 0.3rem;
}

.plan-team-table-header {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(226, 246, 248, 0.55);
  border-bottom: 1px solid rgba(0, 222, 200, 0.1);
}

.plan-team-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.plan-team-row {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 0.5rem;
  padding: 0.45rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.1);
  background: rgba(0, 222, 200, 0.03);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
  font-size: 0.86rem;
  color: var(--planning-text-soft);
}

.plan-team-row:hover {
  border-color: rgba(0, 222, 200, 0.25);
}

.plan-team-row.selected {
  border-color: rgba(59, 130, 246, 0.45);
  background: rgba(59, 130, 246, 0.08);
}

.plan-team-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-team-empty {
  border-radius: 8px;
  border: 1px dashed rgba(0, 222, 200, 0.15);
  padding: 0.8rem;
  text-align: center;
  margin-top: 0.25rem;
  color: rgba(226, 246, 248, 0.45);
  font-size: 0.84rem;
}

/* danger 按钮 */
.planning-btn.danger {
  border-color: rgba(239, 68, 68, 0.35);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.45) 0%, rgba(185, 28, 28, 0.45) 100%);
}

.planning-btn.danger:hover {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.6) 0%, rgba(185, 28, 28, 0.6) 100%);
}

.planning-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* 新建编组弹窗 */
/* 阶段划分 */
.stage-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.5rem;
}

.stage-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 222, 200, 0.03);
  padding: 0.6rem 0.75rem;
}

.stage-card-header {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.stage-seq {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--planning-text);
  flex-shrink: 0;
  min-width: 48px;
}

.stage-title-input {
  flex: 1;
  min-height: 36px;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(10, 18, 22, 0.7);
  color: #f8fafc;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 160ms ease;
}

.stage-title-input:focus {
  border-color: rgba(0, 222, 200, 0.4);
}

.stage-title-input::placeholder {
  color: rgba(226, 246, 248, 0.4);
}

.stage-card-actions {
  display: flex;
  gap: 0.35rem;
  flex-shrink: 0;
}

.stage-card-body {
  margin-top: 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stage-desc-input {
  resize: vertical;
}

.team-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  padding: 1.5rem 1rem;
  overflow-y: auto;
}

.team-dialog {
  width: 100%;
  max-width: 560px;
  border-radius: 16px;
  border: 1px solid rgba(0, 208, 188, 0.4);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    rgba(1, 16, 22, 0.96);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  margin: auto;
}

.team-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
}

.team-dialog-title {
  color: #f1feff;
  font-size: 1.15rem;
  font-weight: 800;
}

.team-dialog-body {
  padding: 0.8rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.team-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}

.team-resource-select-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.team-resource-select-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 222, 200, 0.03);
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  font-size: 0.88rem;
  color: var(--planning-text);
  transition: border-color 160ms ease, background 160ms ease;
}

.team-resource-select-item:hover {
  border-color: rgba(0, 222, 200, 0.28);
}

.team-resource-select-item input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 2px solid rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.06);
  flex-shrink: 0;
  cursor: pointer;
  position: relative;
}

.team-resource-select-item input[type="checkbox"]:checked {
  border-color: var(--planning-accent);
  background: var(--planning-accent);
}

.team-resource-select-item input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 9px;
  border: solid rgba(1, 16, 22, 0.96);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

@media (max-width: 768px) {
  .plan-tactic-grid {
    grid-template-columns: 1fr;
  }
}

.plan-action-btns {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.plan-action-empty {
  border-radius: 10px;
  border: 1px dashed rgba(0, 222, 200, 0.18);
  padding: 1.2rem;
  text-align: center;
  color: rgba(226, 246, 248, 0.5);
  font-size: 0.88rem;
}

.plan-edit-footer {
  display: flex;
  justify-content: flex-start;
  padding: 0.3rem 0.2rem 0.5rem;
}

@media (max-width: 1200px) {
  .planning-layout { grid-template-columns: 240px minmax(0, 1fr); }
}

@media (max-width: 900px) {
  .planning-layout { grid-template-columns: 1fr; }
  .mission-content-meta { grid-template-columns: 1fr; }
  .plan-edit-header { flex-direction: column; align-items: flex-start; }
}
</style>
