<template>
  <div class="planning-task-shell">
    <!-- ==================== 视图1：任务/方案 列表 ==================== -->
    <div v-if="viewMode === 'mission-list'" class="planning-layout">
      <!-- 左侧列表区 -->
      <aside class="coord-panel planning-left-pane">
        <!-- 方案规划子分类切换（仅 mode='plan'） -->
        <div v-if="mode === 'plan'" class="plan-list-sub-tabs">
          <button
            class="plan-list-sub-tab"
            :class="{ active: planListSubMode === 'plan' }"
            type="button"
            @click="planListSubMode = 'plan'"
          >
            行动方案
          </button>
          <button
            class="plan-list-sub-tab"
            :class="{ active: planListSubMode === 'kill-chain' }"
            type="button"
            @click="planListSubMode = 'kill-chain'"
          >
            杀伤链方案
          </button>
        </div>

        <!-- 任务列表 -->
        <div v-if="mode === 'task' && missions.length" class="planning-mission-list">
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
        <!-- 方案列表 -->
        <div v-else-if="mode === 'plan' && planListSubMode === 'plan' && plans.length" class="planning-mission-list">
          <button
            v-for="p in plans"
            :key="p.plan_id"
            class="planning-mission-item"
            :class="{ active: selectedPlanId === p.plan_id }"
            type="button"
            @click="selectedPlanId = p.plan_id"
          >
            <div class="planning-mission-top">
              <span class="planning-mission-name">{{ p.title }}</span>
              <span class="planning-mission-state" :class="`state-${STATE_TONE[p.state] || 'ready'}`">
                {{ STATE_LABELS[p.state] || p.state }}
              </span>
            </div>
            <div class="planning-mission-desc">{{ p.description }}</div>
            <div class="planning-mission-meta">
              <span>战术 {{ p.tactic_title || '未指定' }}</span>
              <span>编组 {{ p.teams_count }} / 阶段 {{ p.stages_count }}</span>
            </div>
          </button>
        </div>
        <!-- 杀伤链方案列表 -->
        <div v-else-if="mode === 'plan' && planListSubMode === 'kill-chain' && killChains.length" class="planning-mission-list">
          <button
            v-for="kc in killChains"
            :key="kc.kill_chain_id"
            class="planning-mission-item"
            :class="{ active: selectedKillChainId === kc.kill_chain_id }"
            type="button"
            @click="selectedKillChainId = kc.kill_chain_id"
          >
            <div class="planning-mission-top">
              <span class="planning-mission-name">{{ kc.title }}</span>
              <span class="planning-mission-state" :class="`state-${STATE_TONE[kc.state] || 'ready'}`">
                {{ STATE_LABELS[kc.state] || kc.state }}
              </span>
            </div>
            <div class="planning-mission-desc">{{ kc.description }}</div>
            <div class="planning-mission-meta">
              <span>目标 {{ kc.target_count }} 个</span>
              <span>条目 {{ kc.entry_count }} 条</span>
            </div>
          </button>
        </div>
        <div v-else-if="mode === 'task'" class="coord-empty-state">暂无任务数据</div>
        <div v-else-if="mode === 'plan' && planListSubMode === 'plan'" class="coord-empty-state">暂无方案数据</div>
        <div v-else-if="mode === 'plan' && planListSubMode === 'kill-chain'" class="coord-empty-state">暂无杀伤链方案</div>
      </aside>

      <!-- 右侧任务详情区 -->
      <section v-if="mode === 'task' && selectedMission" class="coord-panel planning-right-pane mission-detail-pane">
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

      <!-- 右侧方案详情区 -->
      <section v-else-if="mode === 'plan' && planListSubMode === 'plan' && selectedPlan" class="coord-panel planning-right-pane mission-detail-pane">
        <div class="mission-detail-header">
          <h2 class="mission-detail-title">{{ selectedPlan.title }}</h2>
          <div class="mission-detail-actions">
            <button class="planning-btn" type="button" @click="onForwardPlan">转发</button>
            <div class="mission-status-badge">
              <span class="mission-status-label">状态</span>
              <span class="mission-status-value">{{ STATE_LABELS[selectedPlan.state] || selectedPlan.state }}</span>
            </div>
          </div>
        </div>

        <div class="planning-section mission-content-section">
          <div class="planning-section-title">方案描述</div>
          <p class="mission-content-text">{{ selectedPlan.description }}</p>
          <div class="mission-content-meta">
            <div class="mission-meta-card">
              <span class="mission-meta-label">战术战法</span>
              <span class="mission-meta-value">{{ selectedPlan.tactic_title || '未指定' }}</span>
            </div>
            <div class="mission-meta-card">
              <span class="mission-meta-label">编组/阶段</span>
              <span class="mission-meta-value">{{ selectedPlan.teams_count }} 编组 / {{ selectedPlan.stages_count }} 阶段</span>
            </div>
          </div>
        </div>

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
            <div class="mission-relation-label">已关联任务</div>
            <div class="mission-relation-tags">
              <span class="mission-relation-tag mission">任务 1</span>
              <span class="mission-relation-tag plan-title">{{ missionsList[0]?.title || '区域侦察命令-机动任务' }}</span>
            </div>
          </div>
        </div>

        <div class="mission-footer-actions">
          <button class="planning-btn primary large" type="button" @click="enterPlanEditFromPlan">
            编辑方案
          </button>
        </div>
      </section>

      <!-- 右侧杀伤链详情区 -->
      <section v-else-if="mode === 'plan' && planListSubMode === 'kill-chain' && selectedKillChain" class="coord-panel planning-right-pane kill-chain-detail-pane">
        <!-- 头部 -->
        <div class="kill-chain-detail-header">
          <div class="kill-chain-title-wrap">
            <h2 class="mission-detail-title">{{ currentKillChainDetail.title }}</h2>
            <span class="kill-chain-state-badge" :class="`state-${STATE_TONE[currentKillChainDetail.state] || 'ready'}`">
              {{ STATE_LABELS[currentKillChainDetail.state] || currentKillChainDetail.state }}
            </span>
          </div>
          <p class="kill-chain-desc">{{ currentKillChainDetail.description }}</p>
        </div>

        <!-- 信息概览卡片 -->
        <div class="kill-chain-overview-cards">
          <div class="kill-chain-info-card">
            <div class="kill-chain-info-label">方案名称</div>
            <div class="kill-chain-info-value">{{ currentKillChainDetail.title }}</div>
            <div class="kill-chain-info-sub">{{ selectedKillChain.description }}</div>
          </div>
          <div class="kill-chain-info-card">
            <div class="kill-chain-info-label">覆盖目标</div>
            <div class="kill-chain-info-value">{{ currentKillChainDetail.targets.map(t => t.name).join('、') }}</div>
            <div class="kill-chain-info-sub">来自地图单选或框选结果</div>
          </div>
          <div class="kill-chain-info-card">
            <div class="kill-chain-info-label">杀伤链条目</div>
            <div class="kill-chain-info-value count">{{ currentKillChainDetail.entries.length }} 条</div>
            <div class="kill-chain-info-sub">多目标多装备支持手动与自动分配</div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="kill-chain-actions-bar">
          <button class="planning-btn primary" type="button" @click="onAutoAllocate">
            自动分配
          </button>
          <button class="planning-btn" type="button" @click="onEditKillChain">
            编辑
          </button>
          <button class="planning-btn" type="button" @click="onAddKillChainEntry">
            新增
          </button>
          <button class="planning-btn danger" type="button" @click="onDeleteKillChainEntry">
            删除
          </button>
        </div>

        <!-- 原始杀伤链表 -->
        <div class="kill-chain-table-section">
          <div class="kill-chain-table-header">
            <div class="kill-chain-table-title">原始杀伤链表</div>
            <div class="kill-chain-table-hint">单目标场景由地图直配；多目标多装备场景可在此手动分配，或批量自动分配。</div>
          </div>
          <div class="kill-chain-table-wrap">
            <table class="kill-chain-table">
              <thead>
                <tr>
                  <th class="col-checkbox">
                    <input
                      type="checkbox"
                      :checked="selectedEntryIds.length === currentKillChainDetail.entries.length && currentKillChainDetail.entries.length > 0"
                      :indeterminate="selectedEntryIds.length > 0 && selectedEntryIds.length < currentKillChainDetail.entries.length"
                      @change="toggleAllEntries"
                    />
                  </th>
                  <th class="col-target">目标</th>
                  <th class="col-operation">作战动作</th>
                  <th class="col-executor">执行装备</th>
                  <th class="col-source">校验来源</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in currentKillChainDetail.entries" :key="entry.entry_id" class="kill-chain-table-row">
                  <td class="col-checkbox">
                    <input
                      type="checkbox"
                      :checked="selectedEntryIds.includes(entry.entry_id)"
                      @change="toggleEntrySelection(entry.entry_id)"
                    />
                  </td>
                  <td class="col-target">{{ entry.target_names.join('、') }}</td>
                  <td class="col-operation">{{ entry.operation }}</td>
                  <td class="col-executor">
                    <div class="executor-assignments">
                      <span
                        v-for="(assign, idx) in entry.executor_assignments"
                        :key="idx"
                        class="executor-assign-tag"
                        :class="{ locked: assign.locked }"
                      >
                        {{ assign.executor_name }}{{ assign.target_name ? '→' + assign.target_name : '' }}
                        <span v-if="assign.locked" class="lock-icon">🔒</span>
                      </span>
                    </div>
                    <div class="entry-row-actions">
                      <button
                        v-for="(action, aidx) in getEntryActions(entry)"
                        :key="aidx"
                        class="entry-action-btn"
                        :class="action.type"
                        type="button"
                        @click="onEntryAction(entry, action)"
                      >
                        {{ action.label }}
                      </button>
                    </div>
                  </td>
                  <td class="col-source">{{ entry.source }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div v-else class="coord-panel planning-right-pane planning-empty">
        <div class="coord-pane-title">{{ mode === 'plan' ? (planListSubMode === 'kill-chain' ? '杀伤链详情' : '方案详情') : '任务详情' }}</div>
        <div class="coord-empty-state">请从左侧选择一个{{ mode === 'plan' ? (planListSubMode === 'kill-chain' ? '杀伤链方案' : '方案') : '任务' }}</div>
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
            <button class="planning-btn" type="button" @click="viewMode = 'mission-list'">{{ mode === 'plan' ? '返回方案列表' : '返回任务列表' }}</button>
          </template>
          <template v-else>
            <button class="planning-btn" type="button" @click="onSaveDraft">保存草稿</button>
            <button class="planning-btn primary" type="button" @click="onGeneratePlan">一键生成行动方案</button>
            <button class="planning-btn primary" type="button" @click="onPublishPlan">发布为正式行动方案</button>
            <button class="planning-btn" type="button" @click="viewMode = 'mission-list'">{{ mode === 'plan' ? '返回方案列表' : '返回任务列表' }}</button>
          </template>
        </div>
      </div>

      <!-- 编辑面板：分段控制器 + 内容区融为一体 -->
      <div class="plan-edit-panel">
        <div class="plan-edit-segmented">
          <div class="plan-edit-segment-tabs">
            <button
              v-for="step in planEditSteps"
              :key="step.id"
              class="plan-edit-segment"
              :class="{ active: planEditSubTab === step.id }"
              type="button"
              @click="planEditSubTab = step.id"
            >
              {{ step.label }}
            </button>
          </div>
          <button
            v-if="planEditSubTab === 'actions'"
            class="planning-btn small"
            type="button"
            @click="onGenerateActions"
          >
            生成行动序列
          </button>
          <button
            v-if="planEditSubTab === 'stages'"
            class="planning-btn small"
            type="button"
            @click="onAddStage"
          >
            新增阶段
          </button>
        </div>

        <!-- 基本信息 -->
        <div v-if="planEditSubTab === 'basic'" class="plan-section">
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
        <div v-else-if="planEditSubTab === 'teams'" class="plan-section">
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
        <div v-else-if="planEditSubTab === 'stages'" class="plan-section">
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

        <!-- 行动序列：泳道图 -->
        <div v-else-if="planEditSubTab === 'actions'" class="plan-section">
          <div v-if="planDraft?.stages?.length" class="action-swimlane-wrapper">
            <!-- 表头行 -->
            <div
              class="swimlane-header-row"
              :style="{ gridTemplateColumns: `56px ${planDraft.stages.map((_, i) => i < planDraft.stages.length - 1 ? 'minmax(180px, 1fr) 2px' : 'minmax(180px, 1fr)').join(' ')}` }"
            >
              <div class="swimlane-header-cell swimlane-corner"><div>编组</div><div>车辆</div></div>
              <template v-for="(stage, sIndex) in planDraft.stages" :key="stage.stage_id">
                <div class="swimlane-header-cell" :class="`swimlane-stage-col-${sIndex % 4}`">
                  <div class="swimlane-stage-title">阶段 {{ sIndex + 1 }}</div>
                  <div class="swimlane-stage-sub">{{ stage.title }}</div>
                </div>
                <div v-if="sIndex < planDraft.stages.length - 1" class="swimlane-col-divider-header"></div>
              </template>
            </div>

            <!-- 编组 panels -->
            <div
              v-for="(team, tIndex) in planDraft.teams"
              :key="team.team_id"
              class="swimlane-team-panel"
              :class="`swimlane-team-theme-${tIndex % 3}`"
            >
              <div class="swimlane-team-panel-header">
                <div class="swimlane-team-panel-title">
                  <span class="swimlane-team-panel-name">{{ team.name }}</span>
                  <span class="swimlane-team-panel-desc">{{ team.description }}</span>
                </div>
                <span class="swimlane-team-panel-badge">{{ team.equipment.length }} 辆装备</span>
              </div>
              <div
                class="swimlane-team-panel-body"
                :style="{ gridTemplateColumns: `56px ${planDraft.stages.map((_, i) => i < planDraft.stages.length - 1 ? 'minmax(180px, 1fr) 2px' : 'minmax(180px, 1fr)').join(' ')}` }"
              >
                <template v-for="vid in team.equipment" :key="vid">
                  <div class="swimlane-vehicle-cell"><span class="swimlane-vid">{{ vid }}</span></div>
                  <template v-for="(stage, sIndex) in planDraft.stages" :key="stage.stage_id">
                    <div class="swimlane-stage-cell" :class="`swimlane-stage-col-${sIndex % 4}`">
                      <div v-if="getVehicleStageActions(vid, stage).length" class="swimlane-action-list">
                        <div
                          v-for="action in getVehicleStageActions(vid, stage)"
                          :key="action.action_id"
                          class="swimlane-action-card"
                          @click="onActionClick(action, vid, stage)"
                        >
                          <div class="swimlane-action-header">
                            <span class="swimlane-action-seq">{{ action.action_seq }}</span>
                            <span class="swimlane-action-name">{{ action.name }}</span>
                          </div>
                          <div class="swimlane-action-state" :class="`state-${STATE_TONE[action.state] || 'ready'}`">
                            {{ STATE_LABELS[action.state] || action.state }}
                          </div>
                        </div>
                      </div>
                      <div v-else class="swimlane-empty-cell">—</div>
                    </div>
                    <div v-if="sIndex < planDraft.stages.length - 1" class="swimlane-col-divider"></div>
                  </template>
                </template>
              </div>
            </div>
          </div>
          <div v-else class="plan-team-empty">
            <span>暂无阶段数据，请先在"阶段划分"中添加阶段</span>
          </div>
        </div>

      </div>
    </div>

    <!-- 编辑关联弹窗 -->
    <EditAssociationDialog
      v-model:visible="editAssocVisible"
      @confirm="onAssocConfirm"
    />

    <!-- 杀伤链目标分配弹窗 -->
    <KillChainAllocationDialog
      v-model:visible="allocDialogVisible"
      :entry="allocDialogEntry"
      @confirm="onAllocConfirm"
    />

    <!-- 新建行动编组弹窗 -->
    <Transition name="dialog-scale">
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
  </Transition>

    <!-- 行动详情编辑弹窗 -->
  <Transition name="dialog-scale">
    <div v-if="actionDetailVisible" class="action-dialog-mask" @click.self="actionDetailVisible = false">
      <div class="action-dialog">
        <div class="action-dialog-header">
          <div class="action-dialog-title">编辑行动</div>
          <button class="planning-btn small" type="button" @click="actionDetailVisible = false">关闭</button>
        </div>
        <div class="action-dialog-body">
          <div class="plan-form-row">
            <span class="plan-form-label">行动名称</span>
            <input v-model="editingAction.name" class="plan-form-input" placeholder="输入行动名称" />
          </div>
          <div class="plan-form-row">
            <span class="plan-form-label">描述</span>
            <textarea v-model="editingAction.description" class="plan-form-input" rows="2" placeholder="输入行动描述" />
          </div>
          <div class="plan-form-row plan-form-row-2col">
            <div class="plan-form-col">
              <span class="plan-form-label">行动序号</span>
              <input v-model.number="editingAction.action_seq" class="plan-form-input" type="number" min="1" placeholder="1" />
            </div>
            <div class="plan-form-col">
              <span class="plan-form-label">状态</span>
              <select v-model="editingAction.state" class="plan-form-input">
                <option value="READY">就绪</option>
                <option value="ACTIVE">执行中</option>
                <option value="DONE">完成</option>
                <option value="SCHEDULED">计划中</option>
                <option value="PAUSED">已暂停</option>
              </select>
            </div>
          </div>
          <div class="plan-form-row plan-form-row-2col">
            <div class="plan-form-col">
              <span class="plan-form-label">计划开始时间 (s)</span>
              <input v-model.number="editingAction.time_attributes.schedule_start_time" class="plan-form-input" type="number" min="0" placeholder="0" />
            </div>
            <div class="plan-form-col">
              <span class="plan-form-label">计划持续时间 (s)</span>
              <input v-model.number="editingAction.time_attributes.schedule_duration" class="plan-form-input" type="number" min="0" placeholder="0" />
            </div>
          </div>
          <div class="plan-form-row">
            <span class="plan-form-label">参数 (JSON)</span>
            <textarea v-model="editingActionParamJson" class="plan-form-input" rows="2" placeholder='{"key": "value"}' />
          </div>
        </div>
        <div class="action-dialog-footer">
          <button class="planning-btn" type="button" @click="actionDetailVisible = false">取消</button>
          <button class="planning-btn primary" type="button" @click="onSaveActionDetail">保存</button>
        </div>
      </div>
    </div>
  </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  missionsList, planCards, planDetail, STATE_LABELS, STATE_TONE,
  killChainList, killChainDetailMap,
} from '../../../data/planningDataModel';
import { resourceRecords, RESOURCE_TAGS } from '../../../data/commandDataModel';
import EditAssociationDialog from './EditAssociationDialog.vue';
import KillChainAllocationDialog from './KillChainAllocationDialog.vue';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  mode: { type: String, default: 'task' }, // 'task' | 'plan' | 'ad-hoc'
});

const emit = defineEmits(['switch-tab']);

// ========== 杀伤链目标分配弹窗 ==========
const allocDialogVisible = ref(false);
const allocDialogEntry = ref(null);

const openAllocDialog = (entry) => {
  allocDialogEntry.value = entry;
  allocDialogVisible.value = true;
};

const onAllocConfirm = ({ entry_id, executor_assignments }) => {
  // 更新当前杀伤链详情中的对应条目
  const detail = currentKillChainDetail.value;
  if (!detail || !detail.entries) return;
  const entry = detail.entries.find((e) => e.entry_id === entry_id);
  if (entry) {
    entry.executor_assignments = executor_assignments;
    appendSystemMessage(`已更新【${entry.operation}】的目标分配`);
  }
};

// ========== 视图模式 ==========
const viewMode = ref('mission-list'); // 'mission-list' | 'plan-edit'
const planEditMode = ref('normal'); // 'normal' | 'ad-hoc'

// ========== 方案列表子分类（仅 mode='plan'） ==========
const planListSubMode = ref('plan'); // 'plan' | 'kill-chain'

// ========== 杀伤链列表 ==========
const killChains = killChainList;
const selectedKillChainId = ref(killChains[0]?.kill_chain_id || '');
const selectedKillChain = computed(() =>
  killChains.find((kc) => kc.kill_chain_id === selectedKillChainId.value) || null
);

// 当前显示的杀伤链详情（根据选中ID动态切换，后续接入API）
const currentKillChainDetail = computed(() => {
  const detail = killChainDetailMap[selectedKillChainId.value];
  if (detail) return detail;
  // fallback：返回第一个
  const firstId = killChains[0]?.kill_chain_id;
  return firstId ? killChainDetailMap[firstId] : null;
});

// 杀伤链条目选择状态
const selectedEntryIds = ref([]);
const toggleEntrySelection = (entryId) => {
  if (selectedEntryIds.value.includes(entryId)) {
    selectedEntryIds.value = selectedEntryIds.value.filter((id) => id !== entryId);
  } else {
    selectedEntryIds.value.push(entryId);
  }
};

// 切换杀伤链时清空条目选择
watch(selectedKillChainId, () => {
  selectedEntryIds.value = [];
});

// ========== 方案编辑二级分段控制器 ==========
const planEditSteps = [
  { id: 'basic', label: '基本信息' },
  { id: 'teams', label: '编组编成' },
  { id: 'stages', label: '阶段划分' },
  { id: 'actions', label: '行动序列' },
];
const planEditSubTab = ref('basic');

// ========== 任务列表 ==========
const missions = missionsList;
const selectedMissionId = ref(missions[0]?.mission_id || '');
const selectedMission = computed(() =>
  missions.find((m) => m.mission_id === selectedMissionId.value) || null
);

const plans = planCards;
const selectedPlanId = ref(plans[0]?.plan_id || '');
const selectedPlan = computed(() =>
  plans.find((p) => p.plan_id === selectedPlanId.value) || null
);

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
  // 同步编组数据
  teams.value = (planDraft.value.teams || []).map((t) => ({
    team_id: t.team_id,
    name: t.name,
    description: t.description,
    resource_ids: t.equipment || [],
    resource_names: (t.equipment || []).join('、') || '无',
  }));
  // 同步阶段数据
  stages.value = (planDraft.value.stages || []).map((s) => ({
    stage_id: s.stage_id,
    title: s.title,
    description: s.description,
    expanded: true,
  }));
  appendSystemMessage(`开始任务规划：${selectedMission.value?.title}`);
};

const enterPlanEditFromPlan = () => {
  planDraft.value = JSON.parse(JSON.stringify(planDetail));
  planEditMode.value = 'normal';
  viewMode.value = 'plan-edit';
  // 同步编组数据
  teams.value = (planDraft.value.teams || []).map((t) => ({
    team_id: t.team_id,
    name: t.name,
    description: t.description,
    resource_ids: t.equipment || [],
    resource_names: (t.equipment || []).join('、') || '无',
  }));
  // 同步阶段数据
  stages.value = (planDraft.value.stages || []).map((s) => ({
    stage_id: s.stage_id,
    title: s.title,
    description: s.description,
    expanded: true,
  }));
  appendSystemMessage(`开始编辑方案：${selectedPlan.value?.title}`);
};

const onForwardPlan = () => {
  appendSystemMessage(`转发方案：${selectedPlan.value?.title}`);
};

// ========== 杀伤链操作 ==========
const toggleAllEntries = (e) => {
  if (e.target.checked) {
    selectedEntryIds.value = currentKillChainDetail.value.entries.map((e) => e.entry_id);
  } else {
    selectedEntryIds.value = [];
  }
};

const getEntryActions = (entry) => {
  // 判断条目是否已有目标分配（任一装备的 target_name 非空）
  const hasAllocation = (entry.executor_assignments || []).some(
    (a) => a.target_name && a.target_name.trim() !== ''
  );

  if (hasAllocation) {
    // 已分配目标：显示地图直配 + 调整分配
    return [
      { label: '地图直配', type: 'default' },
      { label: '调整分配', type: 'primary' },
    ];
  }

  // 未分配目标：显示待目标分配 + 配置装备
  return [
    { label: '待目标分配', type: 'warning' },
    { label: '配置装备', type: 'primary' },
  ];
};

// 判断按钮是否打开目标分配弹窗
const isAllocAction = (label) => {
  return label === '调整分配' || label === '配置装备';
};

const onEntryAction = (entry, action) => {
  if (isAllocAction(action.label)) {
    openAllocDialog(entry);
    return;
  }
  appendSystemMessage(`杀伤链条目【${entry.operation}】执行操作：${action.label}`);
};

const onAutoAllocate = () => {
  appendSystemMessage('正在自动分配杀伤链资源…');
  setTimeout(() => {
    appendSystemMessage('自动分配完成');
  }, 600);
};

const onEditKillChain = () => {
  appendSystemMessage('编辑杀伤链方案（演示模式）');
};

const onAddKillChainEntry = () => {
  appendSystemMessage('新增杀伤链条目（演示模式）');
};

const onDeleteKillChainEntry = () => {
  if (selectedEntryIds.value.length === 0) {
    appendSystemMessage('请先选择要删除的条目');
    return;
  }
  appendSystemMessage(`删除 ${selectedEntryIds.value.length} 个杀伤链条目（演示模式）`);
  selectedEntryIds.value = [];
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

const onGenerateActions = () => {
  appendSystemMessage('正在生成行动序列…');
  setTimeout(() => {
    appendSystemMessage('行动序列生成完成');
  }, 800);
};

// ========== 行动序列详情编辑 ==========
const actionDetailVisible = ref(false);
const editingAction = ref(null);

const editingActionParamJson = computed({
  get() {
    try {
      return JSON.stringify(editingAction.value?.param || {}, null, 2);
    } catch {
      return '{}';
    }
  },
  set(val) {
    try {
      editingAction.value.param = JSON.parse(val);
    } catch {
      // ignore invalid JSON
    }
  },
});

const onActionClick = (action, vehicle, stage) => {
  const cloned = JSON.parse(JSON.stringify(action));
  if (!cloned.time_attributes) {
    cloned.time_attributes = { schedule_start_time: 0, schedule_duration: 0 };
  }
  editingAction.value = cloned;
  actionDetailVisible.value = true;
};

const onSaveActionDetail = () => {
  if (!editingAction.value || !planDraft.value) return;
  // 找到原数据并更新
  for (const stage of planDraft.value.stages || []) {
    for (const teamActions of Object.values(stage.team_actions || {})) {
      for (const vehicle of teamActions) {
        const idx = vehicle.actions.findIndex((a) => a.action_id === editingAction.value.action_id);
        if (idx !== -1) {
          vehicle.actions[idx] = { ...editingAction.value };
          appendSystemMessage(`已更新行动：${editingAction.value.name}`);
          actionDetailVisible.value = false;
          return;
        }
      }
    }
  }
};

const getVehicleStageActions = (vid, stage) => {
  for (const teamActions of Object.values(stage.team_actions || {})) {
    for (const vehicle of teamActions) {
      if (vehicle.vid === vid) {
        return vehicle.actions || [];
      }
    }
  }
  return [];
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
  font-size: 14px;
  line-height: 1.6;
  color: var(--planning-text);
}

/* ===== 通用按钮 ===== */
.planning-btn {
  min-height: 36px;
  padding: 0 0.92rem;
  border-radius: 9px;
  border: 1px solid rgba(0, 208, 188, 0.28);
  background: rgba(255, 255, 255, 0.08);
  color: #f1feff;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
  white-space: nowrap;
}
.planning-btn:hover {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 222, 200, 0.12), 0 4px 14px rgba(0, 222, 200, 0.08);
  transform: translateY(-1px);
}
.planning-btn.primary {
  border-color: rgba(0, 208, 188, 0.4);
  background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96));
}
.planning-btn.primary:hover {
  background: linear-gradient(180deg, rgba(0, 130, 136, 0.54), rgba(0, 66, 68, 1));
}
.planning-btn.danger {
  border-color: rgba(243, 98, 98, 0.52);
  background: linear-gradient(180deg, rgba(143, 54, 54, 0.78), rgba(111, 38, 38, 0.84));
}
.planning-btn.danger:hover {
  border-color: rgba(243, 98, 98, 0.7);
  box-shadow: 0 0 0 2px rgba(243, 98, 98, 0.15);
}
.planning-btn.small {
  min-height: 32px;
  padding: 0 0.7rem;
  font-size: 0.85rem;
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
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.coord-panel:hover {
  border-color: rgba(0, 222, 200, 0.55);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.09), rgba(0, 49, 72, 0.03)),
    var(--planning-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.1), 0 8px 24px rgba(0, 0, 0, 0.22);
  transform: translateY(-1px);
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
  padding-top: 1.1rem;
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
  border: 1px dashed rgba(0, 222, 200, 0.25);
  color: rgba(196, 243, 248, 0.65);
  padding: 1rem;
  font-size: 0.92rem;
}

/* 列表项（任务列表） */
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
  padding: 0.72rem 0.85rem;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.planning-mission-item.active {
  border-color: var(--planning-border);
  border-left-color: var(--planning-accent);
  background: linear-gradient(180deg, var(--planning-accent-soft), rgba(0, 49, 72, 0.03)), var(--planning-bg-strong);
}
.planning-mission-item:hover {
  border-color: rgba(0, 222, 200, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 222, 200, 0.1);
}

.planning-mission-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.planning-mission-name {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
}
.planning-mission-state {
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
  font-size: 0.76rem;
  font-weight: 700;
  flex-shrink: 0;
}
.planning-mission-desc {
  margin-top: 0.38rem;
  color: rgba(236, 252, 255, 0.92);
  font-size: 0.92rem;
  line-height: 1.55;
}
.planning-mission-meta {
  margin-top: 0.38rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: rgba(196, 243, 248, 0.9);
}
.planning-mission-meta > span {
  background: rgba(0, 222, 200, 0.1);
  border-radius: 8px;
  padding: 0.15rem 0.5rem;
  font-weight: 700;
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
  font-size: 1.22rem;
  font-weight: 800;
  color: #f7fdff;
  margin: 0;
  line-height: 1.25;
  letter-spacing: 0.01em;
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
  border-radius: 999px;
  border: 1px solid rgba(0, 222, 200, 0.3);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.22rem 0.62rem;
  font-size: 0.8rem;
  font-weight: 700;
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
  border-radius: 10px;
  border: 1px solid rgba(0, 208, 188, 0.26);
  background: rgba(0, 16, 22, 0.62);
  padding: 0.7rem;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease;
}
.mission-content-section:hover {
  border-color: rgba(0, 222, 200, 0.42);
  background: rgba(0, 18, 24, 0.72);
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.08);
}

.mission-content-text {
  margin: 0.45rem 0 0;
  color: #f1feff;
  font-size: 0.96rem;
  line-height: 1.65;
  text-indent: 1.5em;
}

.mission-content-meta {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.mission-meta-card {
  border-radius: 10px;
  border: 1px solid rgba(0, 206, 186, 0.32);
  background: rgba(0, 16, 22, 0.7);
  padding: 0.52rem 0.58rem;
  min-height: 72px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mission-meta-label {
  color: rgba(196, 243, 248, 0.96);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.mission-meta-value {
  display: block;
  margin-top: 0.26rem;
  color: #ecfbff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 关联关系 */
.mission-relation-section {
  border-radius: 12px;
  border: 1px solid var(--planning-border-soft);
  background: var(--planning-card-bg);
  padding: 0.8rem 0.9rem;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.mission-relation-section:hover {
  border-color: rgba(0, 222, 200, 0.42);
  background: rgba(6, 24, 30, 0.92);
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.08), 0 4px 14px rgba(0, 0, 0, 0.16);
  transform: translateY(-1px);
}

.planning-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.planning-section-title {
  color: #eefcff;
  font-weight: 800;
  font-size: 1.02rem;
  letter-spacing: 0.01em;
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
  color: rgba(196, 243, 248, 0.6);
  font-size: 0.9rem;
  padding: 0.35rem 0;
}

/* ===== 视图2：方案编辑 ===== */
.plan-edit-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
  gap: 0.7rem;
}

/* ===== 编辑面板容器：分段控制器 + 内容区融为一体 ===== */
.plan-edit-panel {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid var(--planning-border-soft);
  background: var(--planning-card-bg);
  flex: 1;
  min-height: 0;
}

.plan-edit-panel .plan-section {
  border: none;
  border-radius: 0;
  background: transparent;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 2rem;
}

.plan-edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.3rem;
}

.plan-edit-tags {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.plan-edit-tag {
  border-radius: 999px;
  padding: 0.32rem 0.72rem;
  font-size: 0.9rem;
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

/* ===== 二级分段控制器（编辑步骤切换） ===== */
.plan-edit-segmented {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.5rem 0.9rem;
  background: linear-gradient(180deg, rgba(0, 213, 192, 0.04), rgba(0, 49, 72, 0.01)), rgba(1, 16, 22, 0.5);
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.plan-edit-segment-tabs {
  display: flex;
  gap: 0.25rem;
}

.plan-edit-segment {
  padding: 0.45rem 0.95rem;
  border-radius: 9px;
  border: none;
  background: transparent;
  color: rgba(196, 243, 248, 0.65);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
  white-space: nowrap;
}

.plan-edit-segment:hover {
  color: rgba(196, 243, 248, 0.9);
}

.plan-edit-segment.active {
  background: rgba(0, 222, 200, 0.18);
  color: #00e5ca;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.plan-section {
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}



.plan-form-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.plan-form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.plan-form-col {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.plan-form-label {
  color: rgba(196, 243, 248, 0.9);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.plan-form-input {
  width: 100%;
  min-height: 40px;
  padding: 0.45rem 0.75rem;
  border-radius: 9px;
  border: 1px solid rgba(0, 222, 200, 0.25);
  background: rgba(10, 18, 22, 0.88);
  color: #f1feff;
  font-size: 0.96rem;
  font-weight: 500;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.plan-form-input:focus {
  border-color: rgba(0, 222, 200, 0.45);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.1);
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
  color: #eefcff;
  font-weight: 800;
  font-size: 1.02rem;
  letter-spacing: 0.01em;
}

.plan-association-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 16, 22, 0.55);
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
  color: rgba(196, 243, 248, 0.55);
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
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(0, 16, 22, 0.55);
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.plan-tactic-option:hover {
  border-color: rgba(0, 222, 200, 0.4);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.08);
}

.plan-tactic-option.active {
  border-color: rgba(0, 222, 200, 0.4);
  background: rgba(0, 222, 200, 0.1);
}

.plan-tactic-name {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
}

.plan-tactic-desc {
  margin-top: 0.25rem;
  font-size: 0.88rem;
  color: rgba(196, 243, 248, 0.85);
  line-height: 1.5;
}

.plan-tactic-chevron {
  position: absolute;
  right: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  color: #00e5ca;
  font-size: 0.82rem;
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
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(6, 20, 26, 0.75);
  padding: 0.8rem 0.95rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.plan-tactic-card:hover {
  border-color: rgba(0, 222, 200, 0.4);
  transform: translateY(-1px);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.08);
}

.plan-tactic-card.active {
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(59, 130, 246, 0.12);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.12);
}

.plan-tactic-card.add {
  border-style: dashed;
  border-color: rgba(0, 222, 200, 0.28);
  background: rgba(0, 222, 200, 0.04);
}

.plan-tactic-card.add:hover {
  border-color: rgba(0, 222, 200, 0.45);
  background: rgba(0, 222, 200, 0.08);
}

.plan-tactic-card-name {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
}

.plan-tactic-card-desc {
  font-size: 0.9rem;
  color: rgba(196, 243, 248, 0.85);
  line-height: 1.55;
}

.plan-tactic-card-scenario {
  font-size: 0.86rem;
  color: rgba(196, 243, 248, 0.65);
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
  color: rgba(196, 243, 248, 0.6);
  font-size: 0.92rem;
}

.plan-resource-selected {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin-top: 0.35rem;
  padding: 0.55rem 0.75rem;
  border-radius: 9px;
  background: rgba(0, 222, 200, 0.06);
  border: 1px solid rgba(0, 222, 200, 0.18);
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
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.75rem 0.9rem;
}

.resource-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.resource-picker-title {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
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
  gap: 0.65rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.16);
  background: rgba(0, 222, 200, 0.05);
  padding: 0.65rem 0.8rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.resource-picker-card:hover {
  border-color: rgba(0, 222, 200, 0.35);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.08);
}

.resource-picker-card.selected {
  border-color: rgba(59, 130, 246, 0.55);
  background: rgba(59, 130, 246, 0.1);
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
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
}

.resource-picker-type {
  font-size: 0.88rem;
  color: #93c5fd;
  font-weight: 700;
}

.resource-picker-desc {
  font-size: 0.88rem;
  color: rgba(196, 243, 248, 0.75);
  line-height: 1.5;
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
  gap: 0.55rem;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(0, 222, 200, 0.04);
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
  font-size: 0.9rem;
  color: rgba(236, 252, 255, 0.85);
}

.plan-team-row:hover {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.07);
}

.plan-team-row.selected {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.1);
}

.plan-team-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan-team-empty {
  border-radius: 10px;
  border: 1px dashed rgba(0, 222, 200, 0.2);
  padding: 1rem;
  text-align: center;
  margin-top: 0.3rem;
  color: rgba(196, 243, 248, 0.55);
  font-size: 0.9rem;
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
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 16, 22, 0.55);
  padding: 0.7rem 0.85rem;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
}
.stage-card:hover {
  border-color: rgba(0, 222, 200, 0.4);
  background: rgba(0, 18, 24, 0.65);
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.08), 0 6px 16px rgba(0, 0, 0, 0.18);
  transform: translateY(-1px);
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
  min-height: 38px;
  padding: 0.4rem 0.7rem;
  border-radius: 9px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(10, 18, 22, 0.7);
  color: #f1feff;
  font-size: 0.95rem;
  font-weight: 700;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.stage-title-input:focus {
  border-color: rgba(0, 222, 200, 0.45);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.1);
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
  margin-top: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
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
  padding: 1rem 1.1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.18);
}

.team-dialog-title {
  color: #f7fdff;
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.team-dialog-body {
  padding: 0.9rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.team-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.8rem 1.1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.14);
}

.team-resource-select-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.team-resource-select-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  border-radius: 9px;
  border: 1px solid rgba(0, 222, 200, 0.16);
  background: rgba(0, 222, 200, 0.04);
  padding: 0.5rem 0.7rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  color: #f1feff;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.team-resource-select-item:hover {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.07);
  box-shadow: 0 0 0 2px rgba(0, 222, 200, 0.08);
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
  border: 1px dashed rgba(0, 222, 200, 0.25);
  padding: 1.2rem;
  text-align: center;
  color: rgba(196, 243, 248, 0.65);
  font-size: 0.92rem;
}

.plan-edit-footer {
  display: flex;
  justify-content: flex-start;
  padding: 0.4rem 0.3rem 0.6rem;
}

@media (max-width: 1200px) {
  .planning-layout { grid-template-columns: 240px minmax(0, 1fr); }
}

@media (max-width: 900px) {
  .planning-layout { grid-template-columns: 1fr; }
  .mission-content-meta { grid-template-columns: 1fr; }
  .plan-edit-header { flex-direction: column; align-items: flex-start; }
}

/* ===== 行动序列 ===== */
.action-sequence-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.stage-action-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(0, 16, 22, 0.6);
  overflow: hidden;
}

.stage-action-header {
  padding: 0.65rem 0.85rem;
  background: rgba(0, 222, 200, 0.08);
  border-bottom: 1px solid rgba(0, 222, 200, 0.18);
}

.stage-action-title {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
}

.stage-action-body {
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.team-action-block {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.16);
  background: rgba(0, 222, 200, 0.04);
  padding: 0.6rem 0.75rem;
}

.team-action-name {
  font-weight: 800;
  font-size: 0.95rem;
  color: #00e5ca;
  letter-spacing: 0.01em;
  margin-bottom: 0.5rem;
}

.vehicle-action-row {
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 1px dashed rgba(0, 222, 200, 0.14);
}

.vehicle-action-row:first-of-type {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
}

.vehicle-action-label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.4rem;
}

.vehicle-vid {
  font-weight: 700;
  font-size: 0.9rem;
  color: #f1feff;
}

.vehicle-state {
  border-radius: 999px;
  padding: 0.12rem 0.48rem;
  font-size: 0.74rem;
  font-weight: 700;
}

.vehicle-action-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding-left: 0.3rem;
}

.action-node {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 222, 200, 0.05);
  padding: 0.5rem 0.65rem;
  min-width: 160px;
  flex: 1 1 200px;
}

.action-node-header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.action-node-seq {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(0, 222, 200, 0.14);
  color: #00e5ca;
  font-size: 0.76rem;
  font-weight: 800;
}

.action-node-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #f1feff;
}

.action-node-state {
  border-radius: 999px;
  padding: 0.1rem 0.42rem;
  font-size: 0.72rem;
  font-weight: 700;
  margin-left: auto;
}

.action-node-desc {
  margin-top: 0.28rem;
  font-size: 0.86rem;
  color: rgba(196, 243, 248, 0.8);
  line-height: 1.55;
}

.action-node-param {
  margin-top: 0.28rem;
  font-size: 0.82rem;
  color: rgba(196, 243, 248, 0.6);
  font-family: monospace;
  background: rgba(0, 222, 200, 0.06);
  border-radius: 6px;
  padding: 0.22rem 0.45rem;
  word-break: break-all;
}

/* ===== 行动序列泳道图 ===== */
.action-swimlane-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  overflow-x: auto;
  padding-bottom: 0.3rem;
}

/* 表头行 */
.swimlane-header-row {
  display: grid;
  gap: 0.35rem;
  min-width: fit-content;
}

.swimlane-header-cell {
  padding: 0.35rem 0.5rem;
  background: transparent;
  border-radius: 7px;
  text-align: center;
  font-weight: 700;
  font-size: 0.82rem;
  color: rgba(0, 229, 202, 0.85);
  border: 1px solid rgba(0, 222, 200, 0.18);
  letter-spacing: 0.02em;
}

.swimlane-header-cell.swimlane-stage-col-0 { background: rgba(0, 222, 200, 0.06); border-color: rgba(0, 222, 200, 0.22); }
.swimlane-header-cell.swimlane-stage-col-1 { background: rgba(59, 130, 246, 0.07); color: rgba(147, 197, 253, 0.85); border-color: rgba(59, 130, 246, 0.22); }
.swimlane-header-cell.swimlane-stage-col-2 { background: rgba(139, 92, 246, 0.07); color: rgba(196, 181, 253, 0.85); border-color: rgba(139, 92, 246, 0.22); }
.swimlane-header-cell.swimlane-stage-col-3 { background: rgba(245, 158, 11, 0.07); color: rgba(252, 211, 77, 0.85); border-color: rgba(245, 158, 11, 0.22); }

.swimlane-corner {
  background: transparent;
  color: rgba(196, 243, 248, 0.45);
  padding: 0.3rem 0.1rem;
  font-size: 0.72rem;
  line-height: 1.35;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.05rem;
  border-radius: 7px;
  border: 1px solid rgba(0, 222, 200, 0.12);
}

.swimlane-col-divider-header {
  background: rgba(0, 222, 200, 0.4);
  border-radius: 999px;
  width: 2px;
  height: 100%;
  margin: 0 auto;
}

.swimlane-stage-title {
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.swimlane-stage-sub {
  font-size: 0.8rem;
  color: rgba(196, 243, 248, 0.75);
  font-weight: 700;
  margin-top: 0.12rem;
}

/* 编组大框 panel */
.swimlane-team-panel {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(4, 16, 22, 0.55);
  min-width: fit-content;
}

.swimlane-team-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.55rem 1rem;
  background: transparent;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.swimlane-team-panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.swimlane-team-panel-name {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
  letter-spacing: 0.01em;
}

.swimlane-team-panel-desc {
  font-size: 0.85rem;
  color: rgba(196, 243, 248, 0.85);
}

.swimlane-team-panel-badge {
  border-radius: 999px;
  padding: 0.22rem 0.62rem;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(0, 222, 200, 0.1);
  color: #b4fff8;
  white-space: nowrap;
}

/* 编组内部 grid */
.swimlane-team-panel-body {
  display: grid;
  gap: 0.35rem;
  padding: 0.7rem 0.6rem 0.9rem;
  min-width: fit-content;
}

.swimlane-vehicle-cell {
  padding: 0.35rem 0.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 222, 200, 0.03);
  border-radius: 6px;
  border: none;
}

.swimlane-vid {
  font-weight: 700;
  font-size: 0.78rem;
  color: #f7fdff;
  text-align: center;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0.06em;
  line-height: 1.2;
}

.swimlane-stage-cell {
  padding: 0.45rem;
  background: rgba(0, 222, 200, 0.025);
  border-radius: 6px;
  border: none;
  min-height: 48px;
  display: flex;
  flex-direction: column;
}

.swimlane-stage-cell.swimlane-stage-col-0 { background: rgba(0, 222, 200, 0.03); }
.swimlane-stage-cell.swimlane-stage-col-1 { background: rgba(59, 130, 246, 0.04); }
.swimlane-stage-cell.swimlane-stage-col-2 { background: rgba(139, 92, 246, 0.04); }
.swimlane-stage-cell.swimlane-stage-col-3 { background: rgba(245, 158, 11, 0.04); }

.swimlane-empty-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: rgba(196, 243, 248, 0.25);
  font-size: 0.82rem;
}

.swimlane-action-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.swimlane-action-card {
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(0, 222, 200, 0.08);
  padding: 0.45rem 0.6rem;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.swimlane-action-card:hover {
  border-color: rgba(0, 222, 200, 0.55);
  background: rgba(0, 222, 200, 0.14);
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 222, 200, 0.12);
}

.swimlane-stage-col-0 .swimlane-action-card {
  border-color: rgba(0, 222, 200, 0.24);
  background: rgba(0, 222, 200, 0.09);
}
.swimlane-stage-col-0 .swimlane-action-card:hover {
  border-color: rgba(0, 222, 200, 0.5);
  background: rgba(0, 222, 200, 0.15);
}

.swimlane-stage-col-1 .swimlane-action-card {
  border-color: rgba(59, 130, 246, 0.24);
  background: rgba(59, 130, 246, 0.1);
}
.swimlane-stage-col-1 .swimlane-action-card:hover {
  border-color: rgba(59, 130, 246, 0.5);
  background: rgba(59, 130, 246, 0.16);
}

.swimlane-stage-col-2 .swimlane-action-card {
  border-color: rgba(139, 92, 246, 0.24);
  background: rgba(139, 92, 246, 0.1);
}
.swimlane-stage-col-2 .swimlane-action-card:hover {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.16);
}

.swimlane-stage-col-3 .swimlane-action-card {
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(245, 158, 11, 0.1);
}
.swimlane-stage-col-3 .swimlane-action-card:hover {
  border-color: rgba(245, 158, 11, 0.5);
  background: rgba(245, 158, 11, 0.16);
}

.swimlane-action-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.swimlane-action-seq {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: rgba(0, 222, 200, 0.14);
  color: #00e5ca;
  font-size: 0.72rem;
  font-weight: 800;
  flex-shrink: 0;
}

.swimlane-action-name {
  font-weight: 700;
  font-size: 0.85rem;
  color: #f1feff;
}

.swimlane-action-state {
  display: inline-block;
  margin-top: 0.28rem;
  border-radius: 999px;
  padding: 0.1rem 0.38rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.swimlane-col-divider {
  background: rgba(0, 222, 200, 0.4);
  border-radius: 999px;
  width: 2px;
  height: 100%;
  margin: 0 auto;
}

/* 编组主题色 */
.swimlane-team-theme-0 {
  border-color: rgba(0, 222, 200, 0.3);
}
.swimlane-team-theme-0 .swimlane-team-panel-header {
  background: rgba(0, 222, 200, 0.08);
  border-bottom-color: rgba(0, 222, 200, 0.2);
}
.swimlane-team-theme-0 .swimlane-team-panel-badge {
  background: rgba(0, 222, 200, 0.14);
  color: #b4fff8;
  border-color: rgba(0, 222, 200, 0.25);
}

.swimlane-team-theme-1 {
  border-color: rgba(59, 130, 246, 0.35);
}
.swimlane-team-theme-1 .swimlane-team-panel-header {
  background: rgba(59, 130, 246, 0.08);
  border-bottom-color: rgba(59, 130, 246, 0.2);
}
.swimlane-team-theme-1 .swimlane-team-panel-badge {
  background: rgba(59, 130, 246, 0.14);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.25);
}

.swimlane-team-theme-2 {
  border-color: rgba(245, 158, 11, 0.35);
}
.swimlane-team-theme-2 .swimlane-team-panel-header {
  background: rgba(245, 158, 11, 0.08);
  border-bottom-color: rgba(245, 158, 11, 0.2);
}
.swimlane-team-theme-2 .swimlane-team-panel-badge {
  background: rgba(245, 158, 11, 0.14);
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.25);
}

.swimlane-action-state {
  display: inline-block;
  margin-top: 0.25rem;
  border-radius: 999px;
  padding: 0.08rem 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
}

/* ===== 行动详情编辑弹窗 ===== */
.action-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(1, 10, 14, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.action-dialog {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 16px;
  border: 1px solid var(--planning-border);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    var(--planning-bg);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 24px 64px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
}

.action-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.18);
}

.action-dialog-title {
  font-size: 1.18rem;
  font-weight: 800;
  color: #f7fdff;
  letter-spacing: 0.01em;
}

.action-dialog-body {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.8rem 1.1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.14);
}

.action-dialog-body select.plan-form-input {
  appearance: auto;
  background: var(--planning-bg-strong);
  color: var(--planning-text);
  padding: 0.5rem 0.7rem;
}

/* ===== 弹窗缩放动画 ===== */
.dialog-scale-enter-active,
.dialog-scale-leave-active {
  transition: opacity 220ms ease;
}
.dialog-scale-enter-active .team-dialog,
.dialog-scale-enter-active .action-dialog,
.dialog-scale-leave-active .team-dialog,
.dialog-scale-leave-active .action-dialog {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
}
.dialog-scale-enter-from {
  opacity: 0;
}
.dialog-scale-enter-from .team-dialog,
.dialog-scale-enter-from .action-dialog {
  opacity: 0;
  transform: scale(0.94) translateY(8px);
}
.dialog-scale-leave-to {
  opacity: 0;
}
.dialog-scale-leave-to .team-dialog,
.dialog-scale-leave-to .action-dialog {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}

/* ===== 方案列表子分类切换 ===== */
.plan-list-sub-tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.7rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
}

.plan-list-sub-tab {
  flex: 1;
  padding: 0.42rem 0.6rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 16, 22, 0.5);
  color: rgba(196, 243, 248, 0.75);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 180ms ease;
  text-align: center;
}

.plan-list-sub-tab:hover {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.08);
  color: rgba(226, 246, 248, 0.95);
}

.plan-list-sub-tab.active {
  border-color: rgba(0, 222, 200, 0.45);
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.28), rgba(0, 100, 108, 0.18));
  color: #00e5ca;
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.1);
}

/* ===== 杀伤链详情面板 ===== */
.kill-chain-detail-pane {
  gap: 0.8rem;
  padding: 0.9rem;
}

.kill-chain-detail-header {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.kill-chain-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.kill-chain-state-badge {
  border-radius: 999px;
  padding: 0.22rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 700;
  flex-shrink: 0;
}

.kill-chain-desc {
  margin: 0;
  color: rgba(226, 246, 248, 0.8);
  font-size: 0.9rem;
  line-height: 1.6;
}

/* 信息概览卡片 */
.kill-chain-overview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.7rem;
}

@media (max-width: 900px) {
  .kill-chain-overview-cards {
    grid-template-columns: 1fr;
  }
}

.kill-chain-info-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.75rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 200ms ease, transform 200ms ease;
}

.kill-chain-info-card:hover {
  border-color: rgba(0, 222, 200, 0.4);
  background: rgba(6, 24, 30, 0.85);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 222, 200, 0.08);
  transform: translateY(-1px);
}

.kill-chain-info-label {
  color: rgba(196, 243, 248, 0.65);
  font-size: 0.82rem;
  font-weight: 700;
}

.kill-chain-info-value {
  color: #f7fdff;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
}

.kill-chain-info-value.count {
  color: #00e5ca;
  font-size: 1.3rem;
}

.kill-chain-info-sub {
  color: rgba(196, 243, 248, 0.6);
  font-size: 0.8rem;
}

/* 操作按钮栏 */
.kill-chain-actions-bar {
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
  padding: 0.2rem 0;
}

/* 杀伤链表格区域 */
.kill-chain-table-section {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.kill-chain-table-header {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(0, 16, 22, 0.5);
}

.kill-chain-table-title {
  color: #f7fdff;
  font-size: 1rem;
  font-weight: 800;
}

.kill-chain-table-hint {
  color: rgba(196, 243, 248, 0.65);
  font-size: 0.82rem;
  margin-top: 0.2rem;
}

.kill-chain-table-wrap {
  overflow-x: auto;
  flex: 1;
}

.kill-chain-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.kill-chain-table th {
  text-align: left;
  padding: 0.6rem 0.7rem;
  color: rgba(196, 243, 248, 0.85);
  font-weight: 700;
  font-size: 0.84rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 16, 22, 0.4);
  white-space: nowrap;
}

.kill-chain-table td {
  padding: 0.7rem 0.7rem;
  color: var(--planning-text-soft);
  border-bottom: 1px solid rgba(0, 222, 200, 0.08);
  vertical-align: top;
}

.kill-chain-table-row:hover td {
  background: rgba(0, 222, 200, 0.04);
}

.kill-chain-table-row:last-child td {
  border-bottom: none;
}

.col-checkbox {
  width: 36px;
  text-align: center;
}

.col-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #00dec8;
  cursor: pointer;
}

.col-target {
  min-width: 90px;
  white-space: nowrap;
}

.col-operation {
  min-width: 70px;
  white-space: nowrap;
  font-weight: 700;
  color: #f1feff;
}

.col-executor {
  min-width: 180px;
}

.col-source {
  min-width: 90px;
  white-space: nowrap;
  color: rgba(196, 243, 248, 0.7);
  font-size: 0.84rem;
}

/* 执行装备分配标签 */
.executor-assignments {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.4rem;
}

.executor-assign-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border-radius: 6px;
  padding: 0.2rem 0.5rem;
  font-size: 0.84rem;
  font-weight: 700;
  background: rgba(0, 222, 200, 0.1);
  border: 1px solid rgba(0, 222, 200, 0.2);
  color: var(--planning-accent);
}

.executor-assign-tag.locked {
  background: rgba(234, 179, 8, 0.1);
  border-color: rgba(234, 179, 8, 0.25);
  color: #fbbf24;
}

.lock-icon {
  font-size: 0.72rem;
}

/* 条目行内操作按钮 */
.entry-row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.entry-action-btn {
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: rgba(0, 16, 22, 0.5);
  color: rgba(226, 246, 248, 0.85);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 160ms ease;
}

.entry-action-btn:hover {
  border-color: rgba(0, 222, 200, 0.45);
  background: rgba(0, 222, 200, 0.1);
}

.entry-action-btn.primary {
  border-color: rgba(0, 173, 181, 0.4);
  background: linear-gradient(180deg, rgba(0, 110, 116, 0.35), rgba(0, 56, 58, 0.55));
  color: #b4fff8;
}

.entry-action-btn.primary:hover {
  background: linear-gradient(180deg, rgba(0, 130, 136, 0.45), rgba(0, 66, 68, 0.65));
}

.entry-action-btn.warning {
  border-color: rgba(234, 179, 8, 0.35);
  background: rgba(234, 179, 8, 0.1);
  color: #fde68a;
}

.entry-action-btn.warning:hover {
  background: rgba(234, 179, 8, 0.18);
}
</style>
