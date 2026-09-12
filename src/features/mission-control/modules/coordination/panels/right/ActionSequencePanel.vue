<template>
  <div class="action-sequence-shell">
    <!-- 顶部栏 -->
    <div class="action-sequence-header">
      <div class="action-sequence-actions">
        <button class="as-btn primary" type="button" @click="onRefresh">
          刷新
        </button>
        <!-- 操控席：新建空方案（关联当前操控车辆，其它字段为空；未连接车辆时禁用） -->
        <button
          v-if="isControlMode"
          class="as-btn"
          type="button"
          :disabled="!isVehicleConnected"
          :title="isVehicleConnected ? '' : '请先连接操控车辆'"
          @click="openCreatePlanDialog"
        >
          新建
        </button>
        <!-- 协同席：新建空方案（仅标题，不带行动序列数据） -->
        <button
          v-else
          class="as-btn"
          type="button"
          @click="openCreatePlanDialog"
        >
          新建
        </button>
        <!-- 协同席：新建编队机动方案（头车 + 跟随车辆 + 路线参数，自动生成各车编队机动态作） -->
        <button
          v-if="!isControlMode"
          class="as-btn"
          type="button"
          @click="openFormationPlanDialog"
        >
          新建编队机动
        </button>
        <!-- 操控席：协同任务授权（默认"下发授权"，授权成功后变为"解除授权"） -->
        <button
          v-if="isControlMode"
          class="as-btn as-coop-btn"
          type="button"
          :disabled="!isVehicleConnected || controlLoading"
          :title="isVehicleConnected ? '' : '请先连接操控车辆'"
          @click="onCoopButtonClick"
        >
          {{ coopAuthorized ? '解除授权' : '下发授权' }}
        </button>
      </div>
    </div>

    <!-- 主内容：左侧方案列表 + 右侧详情 -->
    <div class="action-sequence-body">
      <!-- 左侧：方案列表 -->
      <div class="as-plan-list">
        <div class="as-plan-list-title">方案列表</div>
        <div v-if="loadingPlans" class="as-loading">加载中…</div>
        <div v-else-if="plans.length === 0" class="as-empty">暂无方案</div>
        <div v-else class="as-plan-items">
          <div
            v-for="plan in plans"
            :key="plan.plan_id"
            class="as-plan-item"
            :class="{ active: selectedPlanId === plan.plan_id }"
            @click="handlePlanItemClick(plan.plan_id)"
          >
            <div class="as-plan-name">{{ plan.title || plan.plan_id }}</div>
            <div class="as-plan-meta">
              <span class="as-plan-state" :class="`state-${plan.state || 'UNKNOWN'}`">{{ stateLabel(plan.state) }}</span>
              <span class="as-plan-count">{{ plan.stages_count || 0 }} 阶段</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：方案详情 + 控制 + 行动序列 -->
      <div class="as-detail-panel">
        <!-- 方案概览 + 控制按钮 -->
        <div v-if="selectedPlan" class="as-detail-header">
          <div class="as-detail-info">
            <div class="as-detail-title">{{ selectedPlan.title || selectedPlan.plan_id }}</div>
            <div class="as-detail-desc">{{ selectedPlan.description || '暂无描述' }}</div>
            <div class="as-detail-meta">
              <span>状态: <strong>{{ stateLabel(selectedPlan.state) }}</strong></span>
              <span>阶段: {{ (selectedPlan.stages || []).length }}</span>
              <span>编组: {{ (selectedPlan.teams || []).length }}</span>
            </div>
          </div>
          <div class="as-control-bar">
            <!-- 行动序列模块（协同席）：只保留下发按钮 -->
            <template v-if="!isControlMode">
              <button
                class="as-btn primary"
                type="button"
                :disabled="controlLoading || planHasNoActions"
                :title="planHasNoActions ? '暂无行动序列数据，不可下发' : ''"
                @click="openDispatchSeatDialog"
              >
                {{ controlLoading ? '处理中…' : '下发' }}
              </button>
            </template>

            <!-- 操控端行动序列模块：只保留下发按钮，单车控制按钮放在各车卡片上 -->
            <template v-if="isControlMode">
              <button
                class="as-btn primary"
                type="button"
                :disabled="controlLoading || planHasNoActions"
                :title="planHasNoActions ? '暂无行动序列数据，不可发布' : ''"
                @click="onDispatchActive"
              >
                {{ controlLoading ? '处理中…' : (anyVehicleExecuting ? '重新发布行动方案' : '发布为正式行动方案') }}
              </button>
            </template>
          </div>
          <!-- 发布状态提示（操控席）：发布后经 zenoh task_received_status 确认显示，任务结束后隐藏 -->
          <div v-if="isControlMode && publishAckReceived" class="as-publish-ack">方案已收到</div>
        </div>

        <!-- 按车辆组织的行动序列 — 卡片串联式 -->
        <div v-if="vehicleActions.length > 0" class="as-vehicle-sequences">
          <div class="as-vehicle-seq-title">
            <span>车辆行动序列</span>
            <button
              class="as-btn mini primary"
              type="button"
              :disabled="(isControlMode ? missingVehicleTypes : appendableVehicleTypes).length === 0"
              :title="(isControlMode ? missingVehicleTypes : appendableVehicleTypes).length === 0 ? '暂无可新建的车型（车辆可能未上线或已存在）' : ''"
              @click="openMissingVehicleSelector"
            >
              + 新建
            </button>
          </div>
          <div class="as-vehicle-list">
            <div
              v-for="vehicle in vehicleActions"
              :key="vehicle.vid"
              class="as-vehicle-card"
            >
              <div class="as-vehicle-header">
                <span class="as-vehicle-name">{{ getVehicleDisplayName(vehicle) }}</span>
                <div class="as-vehicle-controls">
                  <template v-if="isControlMode">
                    <template v-if="canOperateVehicle(vehicle)">
                      <template v-if="getVehicleRuntimeState(vehicle) === 'SCHEDULED'">
                        <button v-if="hasVehicleActions(vehicle)" class="as-btn mini primary" type="button" :disabled="controlLoading" @click="executeControl('start', [vehicle.vid])">开始</button>
                      </template>
                      <template v-if="getVehicleRuntimeState(vehicle) === 'ACTIVE'">
                        <button class="as-btn mini warn" type="button" :disabled="controlLoading" @click="executeControl('pause', [vehicle.vid])">暂停</button>
                      </template>
                      <template v-if="getVehicleRuntimeState(vehicle) === 'PAUSED'">
                        <button class="as-btn mini primary" type="button" :disabled="controlLoading" @click="executeControl('resume', [vehicle.vid])">继续</button>
                      </template>
                      <template v-if="getVehicleRuntimeState(vehicle) === 'DONE'">
                        <span class="as-state-badge done">已完成</span>
                      </template>
                      <template v-if="['ACTIVE', 'PAUSED'].includes(getVehicleRuntimeState(vehicle))">
                        <button class="as-btn mini danger" type="button" :disabled="controlLoading" @click="executeControl('stop', [vehicle.vid])">停止</button>
                      </template>
                    </template>
                  </template>
                  <button v-if="canOperateVehicle(vehicle)" class="as-btn mini" type="button" :disabled="isVehicleExecuting(vehicle)" :title="isVehicleExecuting(vehicle) ? '任务执行中，暂不可编辑' : ''" @click="openCreatorForEdit(vehicle)">编辑</button>
                  <button v-if="canOperateVehicle(vehicle)" class="as-btn mini danger" type="button" :disabled="isVehicleExecuting(vehicle)" :title="isVehicleExecuting(vehicle) ? '任务执行中，暂不可删除' : ''" @click="confirmDeleteVehicleActions(vehicle)">删除</button>
                </div>
              </div>
              <div class="as-action-cards" :class="{ 'as-action-cards-empty': !hasVehicleActions(vehicle) }" :data-vid="vehicle.vid">
                <!-- 空行动序列（如新建空方案只关联了车辆骨架）：给出引导提示 -->
                <div v-if="!hasVehicleActions(vehicle)" class="as-empty-actions">暂无行动，点击「编辑」添加</div>
                <!-- 跨层依赖连线（按真实卡片位置绘制平滑曲线） -->
                <svg class="as-action-lines" v-if="getActionLines(vehicle).length">
                  <defs>
                    <marker
                      :id="`action-arrow-${sanitizeId(vehicle.vid)}`"
                      viewBox="0 0 14 14"
                      refX="11"
                      refY="7"
                      markerWidth="11"
                      markerHeight="11"
                      markerUnits="userSpaceOnUse"
                      orient="auto"
                    >
                      <path d="M2 2 L11 7 L2 12 L4.5 7 Z" fill="#16e6cf" />
                    </marker>
                  </defs>
                  <path
                    v-for="line in getActionLines(vehicle)"
                    :key="`${line.from}-${line.to}`"
                    :d="getLinePath(line, vehicle)"
                    class="as-action-line"
                    :marker-end="`url(#action-arrow-${sanitizeId(vehicle.vid)})`"
                  />
                </svg>

                <!-- 按 dependencies 分列后的行动卡片 -->
                <div
                  v-for="(column, colIdx) in getActionColumns(vehicle)"
                  :key="colIdx"
                  class="as-action-column"
                  :style="columnStyle(vehicle, column)"
                  :class="{ 'single-row': isSingleRow(vehicle) }"
                >
                  <!-- key 必须全局唯一：DS 脏数据可能返回重复 action_id，仅靠 action_id 会导致渲染错乱 -->
                  <template v-for="(action, rowIdx) in column" :key="`${action.stage_id}-${action.action_id || 'noid'}-${colIdx}-${rowIdx}`">
                    <!-- 行动卡片 -->
                    <div
                      class="as-action-card"
                      :class="`state-${(action.state || 'SCHEDULED').toLowerCase()}`"
                      :data-action-id="action.action_id"
                      :style="isSingleRow(vehicle) ? singleRowCardStyle(vehicle, action, colIdx) : cardStyle(vehicle, action)"
                      @dblclick="openParamDialog(action, vehicle)"
                    >
                      <div class="as-card-header" :title="getActionDisplayName(action)">
                        <span class="marquee-text">{{ getActionDisplayName(action) }}</span>
                      </div>
                      <div class="as-card-meta">
                        <span class="as-card-stage" :title="action.stage_title">
                          <span class="marquee-text">{{ action.stage_title }}</span>
                        </span>
                        <span class="as-card-state">{{ actionStateLabel(action.state) }}</span>
                      </div>
                      <div class="as-card-body">
                        <span class="as-card-seq">{{ action.action_seq }}</span>
                        <span v-if="action.param?.waypoints" class="as-card-waypoints" :title="`${action.param.waypoints.length} 个航路点`">
                          <span class="marquee-text">{{ action.param.waypoints.length }} 个航路点</span>
                        </span>
                        <span v-else-if="action.param?.points?.length" class="as-card-waypoints" :title="`${action.param.points.length} 个航路点`">
                          <span class="marquee-text">{{ action.param.points.length }} 个航路点</span>
                        </span>
                        <!-- 空中侦察：航点在 param.service.points1/2/3（三组无人机），不在顶层 points -->
                        <span v-else-if="resolveDispatchActionType(action) === 'air-recon'" class="as-card-waypoints" :title="airReconCardLabel(action)">
                          <span class="marquee-text">{{ airReconCardLabel(action) }}</span>
                        </span>
                        <span v-else-if="action.description" class="as-card-desc" :title="action.description">
                          <span class="marquee-text">{{ action.description }}</span>
                        </span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="selectedPlanId && !loadingDetail" class="as-empty-detail">
          <div>暂无行动序列数据</div>
          <button
            v-if="missingVehicleTypes.length > 0"
            class="as-btn mini primary as-empty-new-btn"
            type="button"
            :disabled="missingVehicleTypes.length === 0"
            :title="missingVehicleTypes.length === 0 ? '暂无可新建的车型（车辆可能未上线或已存在）' : ''"
            @click="openMissingVehicleSelector"
          >
            + 新建行动序列
          </button>
        </div>
        <div v-if="loadingDetail" class="as-loading-detail">加载详情中…</div>
      </div>
    </div>

    <!-- 车辆选择弹窗（多车控制用：开始/暂停/继续/停止） -->
    <!-- 新建空方案弹窗（操控席/协同席共用）：仅输入方案名称，其它字段为空 -->
    <div v-if="showCreatePlanDialog" class="as-dialog-overlay" @click.self="cancelCreatePlan">
      <div class="as-dialog">
        <div class="as-dialog-header">新建行动方案</div>
        <div class="as-dialog-body">
          <input
            v-model="newPlanTitle"
            class="as-dialog-input"
            type="text"
            placeholder="请输入方案名称"
            @keyup.enter="confirmCreatePlan"
          />
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="cancelCreatePlan">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="!newPlanTitle.trim() || creatingPlan"
            @click="confirmCreatePlan"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 协同任务授权弹窗（操控席）：首要监视目标单选 + 重点目标类型复选 + 协同车辆复选 -->
    <div v-if="showCoopDialog" class="as-dialog-overlay" @click.self="cancelCoopDialog">
      <div class="as-dialog as-coop-dialog">
        <div class="as-dialog-header">任务协同指令</div>
        <div class="as-dialog-body">
          <div class="as-coop-section">
            <div class="as-coop-label">首要监视目标</div>
            <select v-model="coopTargetType" class="as-coop-select">
              <option :value="null" disabled>请选择</option>
              <option
                v-for="t in COOP_TARGET_TYPES"
                :key="t.value"
                :value="t.value"
              >
                {{ t.label }}
              </option>
            </select>
          </div>
          <div class="as-coop-section">
            <div class="as-coop-label">重点目标类型</div>
            <div class="as-coop-options">
              <label
                v-for="t in COOP_TARGET_TYPES"
                :key="t.value"
                class="as-dialog-item as-coop-option"
              >
                <input v-model="coopPriorities" type="checkbox" :value="t.value" />
                <span>{{ t.label }}</span>
              </label>
            </div>
          </div>
          <div class="as-coop-section">
            <div class="as-coop-label">协同车辆（除本车外的在线车辆，仅限侦打/火力/空地车）</div>
            <div v-if="coopVehicleOptions.length === 0" class="as-dialog-empty">
              没有可协同的侦打车/火力车/空地车在线
            </div>
            <label
              v-for="v in coopVehicleOptions"
              :key="v.vid"
              class="as-dialog-item"
              :class="{ offline: v.vmf == null }"
              :title="v.vmf == null ? '该车辆缺少 VMF 编号，无法授权' : ''"
            >
              <input
                v-model="coopSelectedVmfs"
                type="checkbox"
                :value="v.vmf"
                :disabled="v.vmf == null"
              />
              <span>{{ v.display_name || v.resource_name || v.vid }}（{{ String(v.vid).replace('equipment:', '') }}）</span>
            </label>
          </div>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="cancelCoopDialog">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="!canConfirmCoop || coopSending"
            @click="confirmCoopGrant"
          >
            {{ coopSending ? '下发中…' : '下发' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 多车控制选择弹窗 -->
    <div v-if="showVehicleDialog" class="as-dialog-overlay" @click.self="showVehicleDialog = false">
      <div class="as-dialog">
        <div class="as-dialog-header">选择控制车辆</div>
        <div class="as-dialog-body">
          <label class="as-dialog-item">
            <input
              type="checkbox"
              :checked="selectedVehicleVids.length === getUgvVehicles().length && getUgvVehicles().length > 0"
              @change="toggleSelectAll"
            />
            <span>全部车辆</span>
          </label>
          <label v-for="v in getUgvVehicles()" :key="v.vid" class="as-dialog-item">
            <input type="checkbox" :value="v.vid" v-model="selectedVehicleVids" />
            <span>{{ getVehicleDisplayName(v) }} {{ v.resource_type ? '(' + v.resource_type + ')' : '' }}</span>
          </label>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="showVehicleDialog = false">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="selectedVehicleVids.length === 0"
            @click="confirmVehicleSelection"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 下发车辆选择弹窗（复选：支持批量下发多辆车） -->
    <div v-if="showDispatchVehicleDialog" class="as-dialog-overlay" @click.self="cancelDispatchVehicleSelection">
      <div class="as-dialog">
        <div class="as-dialog-header">选择要下发的车辆</div>
        <div class="as-dialog-body">
          <label class="as-dialog-item">
            <input
              type="checkbox"
              :checked="selectedDispatchVids.length === getAllVehicles().length && getAllVehicles().length > 0"
              @change="toggleDispatchSelectAll"
            />
            <span>全部车辆</span>
          </label>
          <label v-for="v in getAllVehicles()" :key="v.vid" class="as-dialog-item">
            <input type="checkbox" :value="v.vid" v-model="selectedDispatchVids" />
            <span>{{ getVehicleDisplayName(v) }} {{ v.resource_type ? '(' + v.resource_type + ')' : '' }} — {{ v.total_actions || 0 }} 个行动</span>
          </label>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="cancelDispatchVehicleSelection">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="selectedDispatchVids.length === 0"
            @click="confirmDispatchVehicleSelection"
          >
            确认下发
          </button>
        </div>
      </div>
    </div>

    <!-- 协同席：新建编队机动方案弹窗（teleport 到 body，避免被右侧面板裁切） -->
    <Teleport to="body">
      <FormationPlanDialog
        v-if="showFormationPlanDialog"
        :vehicles="formationDialogVehicles"
        :format-vehicle="getVehicleDisplayName"
        @close="showFormationPlanDialog = false"
        @confirm="confirmFormationPlan"
      />
    </Teleport>

    <!-- 缺失/追加车型选择弹窗 -->
    <div v-if="showMissingVehicleDialog" class="as-dialog-overlay" @click.self="showMissingVehicleDialog = false">
      <div class="as-dialog">
        <div class="as-dialog-header">{{ isControlMode ? '选择要新建行动序列的车型' : '选择要追加行动序列的车型' }}</div>
        <div class="as-dialog-body">
          <label v-for="v in missingVehicleTypes" :key="v.vid" class="as-dialog-item">
            <input type="radio" :value="v" v-model="selectedMissingVehicle" />
            <span>{{ v.resource_name || v.name }} {{ v.type ? '(' + v.type + ')' : '' }}</span>
          </label>
          <div v-if="missingVehicleTypes.length === 0" class="as-dialog-empty">
            暂无可新建的车型，请检查车辆在线状态或刷新后重试。
          </div>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="showMissingVehicleDialog = false">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="!selectedMissingVehicle"
            @click="confirmMissingVehicleSelection"
          >
            确认
          </button>
        </div>
      </div>
    </div>

    <!-- 删除确认弹窗 -->
    <div v-if="showDeleteConfirmDialog" class="as-dialog-overlay" @click.self="cancelDeleteVehicleActions">
      <div class="as-dialog">
        <div class="as-dialog-header">确认删除</div>
        <div class="as-dialog-body">
          确定要删除 <strong>{{ vehicleToDelete ? getVehicleDisplayName(vehicleToDelete) : '' }}</strong> 的行动序列吗？此操作仅本地生效，删除后可在下发前重新编辑。
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="cancelDeleteVehicleActions">取消</button>
          <button class="as-btn danger" type="button" @click="executeDeleteVehicleActions">删除</button>
        </div>
      </div>
    </div>

    <!-- 协同席下发席位选择弹窗 -->
    <div v-if="showDispatchSeatDialog" class="as-dialog-overlay" @click.self="cancelDispatchSeatSelection">
      <div class="as-dialog">
        <div class="as-dialog-header">选择要下发的席位</div>
        <div class="as-dialog-body">
          <label class="as-dialog-item">
            <input
              type="checkbox"
              :checked="selectedDispatchSeats.length === SEAT_OPTIONS.length && SEAT_OPTIONS.length > 0"
              @change="toggleDispatchSeatSelectAll"
            />
            <span>全部席位</span>
          </label>
          <label v-for="s in SEAT_OPTIONS" :key="s.id" class="as-dialog-item">
            <input type="checkbox" :value="s.id" v-model="selectedDispatchSeats" />
            <span>{{ s.label }}</span>
          </label>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" @click="cancelDispatchSeatSelection">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="selectedDispatchSeats.length === 0"
            @click="confirmDispatchSeatSelection"
          >
            确认下发
          </button>
        </div>
      </div>
    </div>

    <!-- 操控端车辆选择弹窗 -->
    <div v-if="showVehicleSelectDialog" class="as-dialog-overlay" @click.self="onCancelSelectVehicle">
      <div class="as-dialog">
        <div class="as-dialog-header">选择操控车辆</div>
        <div class="as-dialog-body">
          <p style="margin: 0 0 0.8rem; color: rgba(241,254,255,0.85);">请选择一辆用于接收 MissionService 反馈（绿色为在线，灰色为离线）：</p>
          <label
            v-for="v in connectedVehicles"
            :key="v.vid"
            class="as-dialog-item"
            :class="{ active: selectedConnectedVehicleId === v.vid, offline: v.online_status !== 'ONLINE' }"
          >
            <input v-model="selectedConnectedVehicleId" type="radio" :value="v.vid" />
            <span style="font-weight: 600;">{{ v.name || v.resource_name || v.vid }}</span>
            <span
              style="margin-left: 8px; font-size: 11px; padding: 1px 6px; border-radius: 4px;"
              :style="v.online_status === 'ONLINE'
                ? 'background: rgba(0,222,200,0.2); color: #00dec8;'
                : 'background: rgba(255,100,100,0.2); color: #ff6464;'"
            >
              {{ v.online_status === 'ONLINE' ? '在线' : '离线' }}
            </span>
            <span style="margin-left: auto; color: rgba(241,254,255,0.65); font-size: 12px;">{{ v.vmf ? `VMF: ${v.vmf}` : '' }} {{ v.ip ? `IP: ${v.ip}` : '' }}</span>
          </label>
        </div>
        <div class="as-dialog-footer">
          <button class="as-btn" type="button" :disabled="selectingVehicle" @click="onCancelSelectVehicle">取消</button>
          <button
            class="as-btn primary"
            type="button"
            :disabled="!selectedConnectedVehicleId || selectingVehicle"
            @click="onConfirmSelectVehicle"
          >
            {{ selectingVehicle ? '处理中…' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 行动参数编辑弹窗：teleport 到 body，避免被右侧面板裁切 -->
    <Teleport to="body">
      <ActionParamDialog
        v-if="showParamDialog"
        :action="editingAction"
        :vehicle-vid="editingVehicleVid"
        :vehicle-type="editingVehicleType"
        @close="closeParamDialog"
        @save="saveActionParam"
        @cancel="closeParamDialog"
      />
      <ActionSequenceCreator
        v-if="showCreator"
        :edit-mode="creatorEditMode"
        :edit-plan="creatorEditPlan"
        :edit-vehicle-vid="creatorEditVehicleVid"
        :edit-vehicle-type="creatorEditVehicleType"
        :preset-vehicle-type="creatorPresetVehicleType"
        :preset-vehicle="creatorPresetVehicle"
        :append-mode="creatorAppendMode"
        :append-plan="creatorAppendPlan"
        :available-vehicles="supportedVehicleTypes"
        :is-control-mode="isControlMode"
        @close="closeCreator"
        @saved="onCreatorSaved"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import {
  fetchActionSequencePlans,
  fetchActionSequencePlanDetail,
  fetchActionSequenceVehicles,
  updateActionParam,
  updateOperatorActionParam,
  startActionSequence,
  pauseActionSequence,
  resumeActionSequence,
  stopActionSequence,
  dispatchActionSequence,
  dispatchForwardPlan,
  patchPlan,
  deleteVehicle,
  fetchOperatorPlans,
  fetchOperatorPlanDetail,
  fetchOperatorVehicles,
  fetchOperatorConnectedVehicles,
  selectOperatorVehicle,
  startOperatorPlan,
  pauseOperatorPlan,
  resumeOperatorPlan,
  stopOperatorPlan,
  dispatchOperatorPlan,
  patchOperatorPlan,
  syncOperatorPlanToDataServer,
  createOperatorPlan,
  createPlan,
  setCooperativeAuthorization,
  nextSequentialPlanId,
  deleteOperatorVehicle,
  notifyPlanMapClicked,
  notifyOperatorPlanMapClicked,
  fetchCurrentUser,

} from '../../api/coordinationApi';
import ActionParamDialog from './ActionParamDialog.vue';
import ActionSequenceCreator from './ActionSequenceCreator.vue';
import FormationPlanDialog from './FormationPlanDialog.vue';
import { AIR_RECON_UAV_GROUPS } from './actionParamNormalizer';

const props = defineProps({
  moduleApi: { type: Object, required: true },
  moduleManifest: { type: Object, default: () => ({}) },
  panelDefinition: { type: Object, default: () => ({}) },
});

const appendSystemMessage = (text) => {
  props.moduleApi.chat?.appendSystemMessage?.(`[行动序列] ${text}`);
};

/* ---------- 模式判断 ---------- */
const subviewId = computed(() => props.moduleApi?.coordination?.activeSubviewId || '');
const isControlMode = computed(() => subviewId.value === 'action-sequence-control');

/* ---------- 状态 ---------- */
const plans = ref([]);
const selectedPlanId = ref('');
const selectedPlan = ref(null);
// 每辆车独立的运行时状态 { [vid]: 'SCHEDULED' | 'ACTIVE' | 'PAUSED' }
const vehicleRuntimeStates = ref({});
const loadingPlans = ref(false);
const loadingDetail = ref(false);
const controlLoading = ref(false);
// 当前已连接（online）的无人车列表，从资源池接口获取
const onlineVehicles = ref([]);

/* ---------- 新建空方案弹窗（操控席） ---------- */
const showCreatePlanDialog = ref(false);
const newPlanTitle = ref('');
const creatingPlan = ref(false);


/* ---------- 多车控制弹窗 ---------- */
const showVehicleDialog = ref(false);
const pendingControlAction = ref('');
const selectedVehicleVids = ref([]);

/* ---------- 操控端下发弹窗（复选） ---------- */
const showDispatchVehicleDialog = ref(false);
const selectedDispatchVids = ref([]);

/* ---------- 协同席下发席位选择弹窗 ---------- */
// 席位 id 由后端 config.SEAT_TARGET_IPS 映射为目标数据服务器 IP（调期间 1/2/3 → 操控席 .56）
// 数据服务器当前注册席位只有 1/2/3，传入未注册 id（如 4）会整批 400；
// "ck"（车长席）是前端/后端约定 id，后端映射为操控车 DS 裸 IP（25.11.1.3），不会原样发给 DS
const SEAT_OPTIONS = [
  { id: '1', label: '席位1' },
  { id: '2', label: '席位2（操控席）' },
  { id: '3', label: '席位3' },
  { id: 'ck', label: '车长席' },
];
const showDispatchSeatDialog = ref(false);
const selectedDispatchSeats = ref([]);

/* ---------- 操控端车辆选择弹窗 ---------- */
const showVehicleSelectDialog = ref(false);
const connectedVehicles = ref([]);
const selectedConnectedVehicleId = ref('');
const selectingVehicle = ref(false);
// 车辆连接状态（启动时初始化）
const connectedVehicleId = ref('');
const connectedVehicleType = ref('');
const isVehicleConnected = ref(false);

/* ---------- 协同任务授权（操控席）：set_cooperative_authorization ---------- */
// 目标类型选项（协议编号不连续，保持文档给定顺序）
const COOP_TARGET_TYPES = [
  { value: 1, label: '人员' },
  { value: 2, label: '汽车' },
  { value: 4, label: '装甲车' },
  { value: 8, label: '工事' },
  { value: 15, label: '武装人员' },
  { value: 16, label: '工事火力点' },
  { value: 17, label: '敌指挥节点' },
  { value: 18, label: '通信枢纽' },
  { value: 7, label: '炮兵阵地' },
  { value: 19, label: '地下空间' },
  { value: 13, label: '火力阵地' },
  { value: 14, label: '导弹发射基地' },
  { value: 20, label: '其他' },
];
const showCoopDialog = ref(false);
const coopAuthorized = ref(false);
const coopSending = ref(false);
const coopTargetType = ref(null);
const coopPriorities = ref([]);
const coopSelectedVmfs = ref([]);
// 最近一次下发授权成功的参数；解除授权需原样回传（缺字段会被 MissionService 丢弃）
const coopGrantedArgs = ref(null);
// 除本车外的在线车辆；vmf 缺失的车辆不可选（授权参数要 VMF 编号）
// 协同车辆仅限三类车型：侦打车 / 火力车 / 空地车
const COOP_ALLOWED_VEHICLE_TYPES = ['Recon-Strike-UGV', 'Fire-Support-UGV', 'Air-Ground-UAV'];
const coopVehicleOptions = computed(() => {
  const self = String(connectedVehicleId.value || '').replace('equipment:', '');
  return onlineVehicles.value.filter(
    (v) => String(v.vid || '').replace('equipment:', '') !== self
      && COOP_ALLOWED_VEHICLE_TYPES.includes(v.resource_type)
  );
});
const canConfirmCoop = computed(() => (
  coopTargetType.value != null && coopSelectedVmfs.value.length > 0
));

const onCoopButtonClick = async () => {
  if (coopAuthorized.value) {
    // 解除授权：不弹窗，只携带 source=1、command=2
    await sendCoopRelease();
    return;
  }
  coopTargetType.value = null;
  coopPriorities.value = [];
  coopSelectedVmfs.value = [];
  showCoopDialog.value = true;
  // 弹窗打开时确保车辆列表是最新的
  if (onlineVehicles.value.length === 0) {
    await loadOnlineVehicles();
  }
};

const cancelCoopDialog = () => {
  showCoopDialog.value = false;
};

const confirmCoopGrant = async () => {
  if (!canConfirmCoop.value || coopSending.value) return;
  coopSending.value = true;
  try {
    // 协议格式：vehicles 为 [{vmf, vip}]，vip 取资源池车辆信息里的 ip
    const vehicles = coopSelectedVmfs.value.map((vmf) => {
      const vehicle = coopVehicleOptions.value.find((v) => v.vmf === vmf);
      return { vmf, vip: vehicle?.ip || '' };
    });
    const result = await setCooperativeAuthorization({
      vehicle_vid: connectedVehicleId.value,
      source: 1,
      command: 1,
      vehicles,
      target_type: coopTargetType.value,
      priorities: coopPriorities.value,
    });
    const envelope = result.data || {};
    if (result.ok && (envelope.code ?? 200) === 200) {
      coopAuthorized.value = true;
      coopGrantedArgs.value = {
        vehicles,
        target_type: coopTargetType.value,
        priorities: [...coopPriorities.value],
      };
      showCoopDialog.value = false;
      appendSystemMessage(`协同授权已下发 | 车辆数=${coopSelectedVmfs.value.length} | target_type=${coopTargetType.value}`);
    } else {
      appendSystemMessage('协同授权下发失败: ' + (envelope.message || result.error || '未知错误'));
    }
  } catch (err) {
    appendSystemMessage('协同授权下发异常: ' + (err?.message || '未知错误'));
  } finally {
    coopSending.value = false;
  }
};

const sendCoopRelease = async () => {
  if (coopSending.value) return;
  coopSending.value = true;
  try {
    // 解除授权需回传下发时的同一组参数（MissionService 对缺字段的报文不响应）
    const granted = coopGrantedArgs.value || {};
    const result = await setCooperativeAuthorization({
      vehicle_vid: connectedVehicleId.value,
      source: 1,
      command: 2,
      vehicles: granted.vehicles || [],
      target_type: granted.target_type ?? 0,
      priorities: granted.priorities || [],
    });
    const envelope = result.data || {};
    if (result.ok && (envelope.code ?? 200) === 200) {
      coopAuthorized.value = false;
      coopGrantedArgs.value = null;
      appendSystemMessage('协同授权已解除');
    } else {
      appendSystemMessage('解除授权失败: ' + (envelope.message || result.error || '未知错误'));
    }
  } catch (err) {
    appendSystemMessage('解除授权异常: ' + (err?.message || '未知错误'));
  } finally {
    coopSending.value = false;
  }
};

// 切换操控车辆后授权状态不可信，重置为未授权
watch(connectedVehicleId, () => {
  coopAuthorized.value = false;
  coopGrantedArgs.value = null;
});


/* ---------- 行动参数弹窗 ---------- */
const showParamDialog = ref(false);
const editingAction = ref(null);
const editingVehicleVid = ref('');
const editingVehicleType = ref('');
const savingParam = ref(false);

/* ---------- 新建/编辑方案弹窗 ---------- */
const showCreator = ref(false);
const creatorEditMode = ref(false);
const creatorEditPlan = ref(null);
const creatorEditVehicleVid = ref('');
const creatorPresetVehicleType = ref('');
const creatorPresetVehicle = ref(null);
const creatorEditVehicleType = ref('');
const creatorAppendMode = ref(false);
const creatorAppendPlan = ref(null);

/* ---------- 缺失车型选择弹窗 ---------- */
const showMissingVehicleDialog = ref(false);
const selectedMissingVehicle = ref(null);

/* ---------- 删除车型行动序列确认弹窗 ---------- */
const showDeleteConfirmDialog = ref(false);
const vehicleToDelete = ref(null);

// SVG 箭头 marker id 消毒（模板 action-arrow-${sanitizeId(vehicle.vid)} 使用）
const sanitizeId = (s) => String(s || '').replace(/[:\/\s#%&?]+/g, '-');

/* ---------- 计算属性 ---------- */
const runtimeStateLabel = computed(() => {
  const map = {
    SCHEDULED: '待执行',
    ACTIVE: '执行中',
    PAUSED: '已暂停',
    DONE: '已完成',
    DELETED: '已删除',
  };
  // 取第一辆车的实际状态作为整体显示
  const vs = selectedPlan.value?.vehicle_summary || [];
  const state = vs[0] ? getVehicleRuntimeState(vs[0]) : 'SCHEDULED';
  return map[state] || state;
});

const vehicleActions = computed(() => {
  if (!selectedPlan.value) return [];
  let summary = selectedPlan.value.vehicle_summary || [];

  // 操控席但未连接车辆时，不显示任何行动序列
  if (isControlMode.value && !isVehicleConnected.value) {
    return [];
  }

  // 如果已连接车辆，只显示对应车辆的行动序列
  if (isControlMode.value && isVehicleConnected.value && connectedVehicleId.value) {
    const connectedVid = String(connectedVehicleId.value).replace('equipment:', '');
    summary = summary.filter(
      (v) => String(v.vid || '').replace('equipment:', '') === connectedVid
    );
  }

  // 按去掉 equipment: 前缀后的 vid 合并相同车辆，避免同一辆车显示两次
  const merged = [];
  const seen = new Map();
  for (const vehicle of summary) {
    const cleanVid = String(vehicle.vid || '').replace('equipment:', '');
    if (!seen.has(cleanVid)) {
      seen.set(cleanVid, {
        ...vehicle,
        vid: cleanVid, // 统一使用不带前缀的 vid
      });
    } else {
      // 合并 stages 和 total_actions
      const existing = seen.get(cleanVid);
      existing.total_actions = (existing.total_actions || 0) + (vehicle.total_actions || 0);
      existing.stages = [...(existing.stages || []), ...(vehicle.stages || [])];
    }
  }
  merged.push(...seen.values());

  return merged;
});

const canOperateVehicle = (vehicle) => {
  if (!isControlMode.value) {
    return true; // 非操控席时，允许所有操作
  }
  if (!isVehicleConnected.value) {
    return false; // 操控席但未连接车辆时，禁用所有操作
  }
  const vid = String(vehicle.vid || '').replace('equipment:', '');
  const connectedVid = String(connectedVehicleId.value || '').replace('equipment:', '');
  return vid === connectedVid;
};

const supportedVehicleTypes = computed(() =>
  onlineVehicles.value.map((v) => ({
    type: v.resource_type,
    name: v.display_name || vehicleTypeNameMap[v.resource_type] || v.resource_type,
    vid: v.vid,
    resource_name: v.resource_name,
    supported_action_types: v.supported_action_types || [],
  }))
);

// 操控车（CK车）写死选项：资源池默认过滤 CK车（需 include_ckc=true 才返回，
// 见 resource_pool_CK车查询接口说明），且其上线状态不走接口判断，直接提供。
// 仅协同席（非操控席）新建/追加车型列表里出现；支持 Auto-Move / Formation-Move（装备行动序列知识 第 7 节）
const CONTROL_CAR_OPTION = {
  type: 'Remote-Control-Car',
  name: '操控车',
  vid: 'CK01',
  resource_name: '装备-操控01',
  supported_action_types: ['Auto-Move', 'Formation-Move'],
};

const missingVehicleTypes = computed(() => {
  const existingVids = new Set((vehicleActions.value || []).map((v) => v.vid).filter(Boolean));
  const list = supportedVehicleTypes.value.filter((v) => !existingVids.has(v.vid));
  if (!isControlMode.value && !existingVids.has(CONTROL_CAR_OPTION.vid)) {
    list.push(CONTROL_CAR_OPTION);
  }
  return list;
});

// 新建编队机动弹窗：写死追加操控车选项（不经资源池在线判断），
// vid 带 equipment: 前缀，与在线车辆条目格式一致
const formationDialogVehicles = computed(() => {
  const exists = onlineVehicles.value.some(
    (v) => String(v.vid || '').replace('equipment:', '') === CONTROL_CAR_OPTION.vid
  );
  if (exists) return onlineVehicles.value;
  return [
    ...onlineVehicles.value,
    {
      vid: 'equipment:CK01',
      resource_type: 'Remote-Control-Car',
      resource_name: '装备-操控01',
      display_name: '操控车',
    },
  ];
});

// 非操控席模式：详情页新增行动序列时可用的车型（允许已存在的车型再次追加）
const appendableVehicleTypes = computed(() => {
  if (isControlMode.value) return supportedVehicleTypes.value;
  return supportedVehicleTypes.value.some((v) => v.vid === CONTROL_CAR_OPTION.vid)
    ? supportedVehicleTypes.value
    : [...supportedVehicleTypes.value, CONTROL_CAR_OPTION];
});

const vehicleTypeNameMap = {
  'Fire-Support-UGV': '火力车',
  'Recon-Strike-UGV': '侦打车',
  'Patrol-UGV': '巡逻车',
  'Electronic-UGV': '电磁车',
  'Air-Ground-UAV': '空地车',
  // 操控车（CK车）：resource_type 规范值 Remote-Control-Car，历史数据兼容 Control-UGV
  'Remote-Control-Car': '操控车',
  'Control-UGV': '操控车',
};

const getVehicleDisplayName = (vehicle) => {
  if (!vehicle) return '';
  const rawVid = (vehicle.vid || '').replace('equipment:', '');
  const resourceType = vehicle.resource_type || '';
  const cnType = vehicleTypeNameMap[resourceType] || resourceType || '无人车';
  const suffixMatch = rawVid.match(/(\d+)$/);
  const suffix = suffixMatch ? suffixMatch[1] : rawVid;
  return `${cnType}-${suffix}`;
};

// 旧 action_type 命名别名（装备行动序列知识-0912 MIGRATION）：
// shoot/launch 统一为 strike，旧 key 仅作为读取别名归一到新规范名
const LEGACY_ACTION_TYPE_ALIASES = {
  'search-and-shoot': 'recon-and-strike',
  'recon-strike': 'recon-and-strike',
  '30mm-gun-launch': '30mm-gun-strike',
  '40mm-gun-launch': '30mm-gun-strike',
  'at-missile-launch': 'at-missile-strike',
  'gun-shot': 'machine-gun-strike',
  '7.62mm-gun-shot': 'machine-gun-strike',
  'rocket-launch': 'rocket-strike',
  'loitering-munition-launch': 'loitering-munition-strike',
  'em-assault': 'recon-and-interfere',
  'electronic-assault': 'recon-and-interfere',
};

const actionTypeDisplayMap = {
  'auto-move': '自主机动',
  'follow-move': '跟随机动',
  'silent-guard': '静默值守',
  'set-return-point': '设置返航点',
  'return-to-base': '开启返航',
  'manual-task': '人工任务',
  'pose-adjust': '姿态调整',
  'formation-move': '编队机动',
  'air-recon': '空中侦察',
  // DS 侧空中侦察的 action_type 为 UAV-Air-Recon
  'uav-air-recon': '空中侦察',
  'lens-recon': '光电侦察',
  'recon-and-strike': '侦察打击',
  '30mm-gun-strike': '30炮打击',
  'at-missile-strike': '红箭13导弹打击',
  'machine-gun-strike': '机枪打击',
  'rocket-strike': '火箭弹打击',
  'loitering-munition-strike': '巡飞弹打击',
  'laser-illumination': '激光照射',
  'sound-expel': '强声拒止',
  'acoustic-deterrence': '强声拒止',
  'light-expel': '强光拒止',
  'light-deterrence': '强光拒止',
  'em-recon': '电磁侦察',
  'electronic-recon': '电磁侦察',
  'recon-and-interfere': '侦察干扰',
  'em-interference': '电磁干扰',
  'electronic-jamming': '电磁干扰',
};

// 通用参数字段集合，推断 action_type 时应排除，避免误判
const COMMON_PARAM_FIELDS = new Set(['disconnect_strategy', 'mission_duration', 'enable_start_time', 'start_time']);

const isGenericActionId = (actionId) => {
  if (!actionId) return true;
  const aid = String(actionId).toLowerCase();
  // 语义化 action_id（如 action:return-to-base:plan-1017:5）不算通用编号
  if (/^action:[a-z0-9\.\-]+:/.test(aid)) return false;
  return /^action-\d+$/.test(aid);
};

const inferActionTypeFromParam = (param) => {
  if (!param || typeof param !== 'object') return '';
  const p = param;
  const businessKeys = Object.keys(p).filter((k) => !COMMON_PARAM_FIELDS.has(k));
  const has = (k) => k in p;
  const businessHas = (k) => businessKeys.includes(k);

  if (businessHas('ene') || businessHas('freq') || businessHas('meat')) return 'laser-illumination';
  if (businessHas('points') && Array.isArray(p.points) && p.points.length > 0) {
    const first = p.points[0];
    if (first && typeof first === 'object' && ('camera' in first || 'speed' in first || 'gimpitch' in first)) {
      return 'air-recon';
    }
  }
  if (businessHas('area') && businessHas('direct')) return 'lens-recon';
  // 强声/强光拒止：area + attr + thr + dam===0（巡逻车特有）
  if (businessHas('area') && businessHas('attr') && businessHas('thr') && p.dam === 0) {
    return p.ammo === 0 ? 'sound-expel' : 'light-expel';
  }
  if (businessHas('area')) return 'recon-and-strike';
  if (businessHas('points') && Array.isArray(p.points) && p.points.length > 0) {
    const first = p.points[0];
    if (first && typeof first === 'object') {
      if (first.ammo_type === 2) return '30mm-gun-strike';
      if (first.ammo_type === 1) return 'machine-gun-strike';
      if ('ammo_type' in first) return 'at-missile-strike';
      if ('r' in first || p.type === 2) return 'rocket-strike';
      if ('loiter' in p || p.type === 3) return 'loitering-munition-strike';
    }
    // 编队机动：points + formation_mode，或路径点带 offsetX/offsetY
    if (businessHas('formation_mode')) return 'formation-move';
    if (first && typeof first === 'object' && ('offsetX' in first || 'offsetY' in first)) {
      return 'formation-move';
    }
    // 自主机动：points + limited_speed（且不含 formation_mode，避免与编队机动混淆）
    if (businessHas('limited_speed')) return 'auto-move';
  }
  if (businessHas('distance') && businessHas('x') && businessHas('y')) return 'follow-move';
  if (businessHas('pose')) return 'pose-adjust';

  // 兜底：仅含业务字段为空 / 仅 time / 仅 type 时
  if (businessKeys.length === 0) return '';
  if (businessKeys.length === 1 && businessHas('time')) return 'silent-guard';
  if (businessKeys.length === 1 && businessHas('type')) return 'manual-task';
  return '';
};

const getActionDisplayName = (action) => {
  if (!action) return '';
  // name 是中文业务名称，最可靠；优先按 name 推断 action_type
  const nameInferred = inferActionTypeFromName(action.name);
  let raw = nameInferred || String(action.action_type || '').toLowerCase().replace(/_/g, '-');
  // 旧命名别名（shoot/launch）归一到新规范名
  raw = LEGACY_ACTION_TYPE_ALIASES[raw] || raw;
  if (!raw || raw === 'unknown' || raw === 'unknown-action') {
    const inferred = inferActionTypeFromId(action.action_id)
      || inferActionTypeFromParam(action.param);
    if (inferred) raw = inferred;
  }
  // 兼容 PascalCase 命名（如 Follow-Move / Recon-And-Strike）：去掉连字符后再查一次
  let display = actionTypeDisplayMap[raw];
  if (!display) {
    display = actionTypeDisplayMap[raw.replace(/-/g, '')];
  }
  return display || action.name || action.action_id || '未知行动';
};

// 根据 action_type 推断 action.name，用于 name 为空时的兜底
const inferActionName = (actionType) => {
  let raw = String(actionType || '').toLowerCase().replace(/_/g, '-');
  raw = LEGACY_ACTION_TYPE_ALIASES[raw] || raw;
  return actionTypeDisplayMap[raw] || actionTypeDisplayMap[raw.replace(/-/g, '')] || actionType;
};

const inferActionTypeFromId = (actionId) => {
  if (!actionId) return '';
  const aid = String(actionId).toLowerCase().replace(/_/g, '-');
  // 针对语义化 action_id（如 action:return-to-base:plan-1017:5）先提取动作类型部分
  const semanticMatch = aid.match(/^action:([a-z0-9\.\-]+):/);
  if (semanticMatch) {
    const semanticType = semanticMatch[1];
    const mapping = {
      'auto-move': 'auto-move',
      'follow-move': 'follow-move',
      'silent-guard': 'silent-guard',
      'set-return-point': 'set-return-point',
      'return-to-base': 'return-to-base',
      'manual-task': 'manual-task',
      'pose-adjust': 'pose-adjust',
      'formation-move': 'formation-move',
      'air-recon': 'air-recon',
      'lens-recon': 'lens-recon',
      // 旧命名别名（0912 MIGRATION 前）指向新规范名
      'search-and-shoot': 'recon-and-strike',
      'recon-strike': 'recon-and-strike',
      'recon-and-strike': 'recon-and-strike',
      '30mm-gun-launch': '30mm-gun-strike',
      '30mm-gun-strike': '30mm-gun-strike',
      'at-missile-launch': 'at-missile-strike',
      'at-missile-strike': 'at-missile-strike',
      'gun-shot': 'machine-gun-strike',
      '7.62mm-gun-shot': 'machine-gun-strike',
      'machine-gun-strike': 'machine-gun-strike',
      'rocket-launch': 'rocket-strike',
      'rocket-strike': 'rocket-strike',
      'loitering-munition-launch': 'loitering-munition-strike',
      'loitering-munition-strike': 'loitering-munition-strike',
      'laser-illumination': 'laser-illumination',
      'sound-expel': 'sound-expel',
      'acoustic-deterrence': 'sound-expel',
      'light-expel': 'light-expel',
      'light-deterrence': 'light-expel',
      'em-recon': 'em-recon',
      'electronic-recon': 'em-recon',
      'em-assault': 'recon-and-interfere',
      'electronic-assault': 'recon-and-interfere',
      'recon-and-interfere': 'recon-and-interfere',
      'em-interference': 'em-interference',
      'electronic-jamming': 'em-interference',
    };
    if (semanticType in mapping) return mapping[semanticType];
  }
  // 项目实际数据服务器 action_id 前缀（如 CH_RETURN / FS_LENS / RS_40MM）
  const projectMapping = {
    // 底盘类
    'ch-move': 'auto-move',
    'ch-follow': 'follow-move',
    'ch-silent': 'silent-guard',
    'ch-set-return': 'set-return-point',
    'ch-return': 'return-to-base',
    'ch-manual': 'manual-task',
    'ch-pose': 'pose-adjust',
    'ch-formation': 'formation-move',
    // 火力车
    'fs-lens': 'lens-recon',
    'fs-recon-strike': 'recon-and-strike',
    'fs-gun': 'machine-gun-strike',
    'fs-rocket': 'rocket-strike',
    'fs-loiter': 'loitering-munition-strike',
    // 侦打车
    'rs-lens': 'lens-recon',
    'rs-recon-strike': 'recon-and-strike',
    'rs-30mm': '30mm-gun-strike',
    'rs-40mm': '30mm-gun-strike',
    'rs-at': 'at-missile-strike',
    'rs-gun': 'machine-gun-strike',
    'rs-laser': 'laser-illumination',
    // 巡逻车
    'pt-lens': 'lens-recon',
    'pt-recon-strike': 'recon-and-strike',
    'pt-gun': 'machine-gun-strike',
    'pt-acoustic': 'sound-expel',
    'pt-light': 'light-expel',
    // 空地车 / 电磁车
    'ag-air-recon': 'air-recon',
    'el-recon': 'em-recon',
    'el-assault': 'recon-and-interfere',
    'el-jam': 'em-interference',
  };
  if (aid in projectMapping) return projectMapping[aid];
  return '';
};

const inferActionTypeFromName = (name) => {
  if (!name) return '';
  const n = String(name).trim();
  const map = {
    '自主机动': 'auto-move',
    '跟随机动': 'follow-move',
    '静默值守': 'silent-guard',
    '设置返航点': 'set-return-point',
    '开启返航': 'return-to-base',
    '人工任务': 'manual-task',
    '姿态调整': 'pose-adjust',
    '编队机动': 'formation-move',
    '空中侦察': 'air-recon',
    '光电侦察': 'lens-recon',
    '侦察打击': 'recon-and-strike',
    '巡逻车侦察打击': 'recon-and-strike',
    '机枪打击': 'machine-gun-strike',
    '火箭弹打击': 'rocket-strike',
    '巡飞弹打击': 'loitering-munition-strike',
    '30炮打击': '30mm-gun-strike',
    '40炮打击': '30mm-gun-strike',
    '红箭13导弹打击': 'at-missile-strike',
    '激光照射': 'laser-illumination',
    '强声拒止': 'sound-expel',
    '强光拒止': 'light-expel',
    '电磁侦察': 'em-recon',
    '电磁突击': 'recon-and-interfere',
    '侦察干扰': 'recon-and-interfere',
    '电磁干扰': 'em-interference',
  };
  if (n in map) return map[n];
  // 英文 / PascalCase / 无连字符兜底
  const norm = n.toLowerCase().replace(/[-_.]/g, '');
  const enMap = {
    'automove': 'auto-move',
    'followmove': 'follow-move',
    'silentguard': 'silent-guard',
    'setreturnpoint': 'set-return-point',
    'setreturn': 'set-return-point',
    'returntobase': 'return-to-base',
    'return': 'return-to-base',
    'manualtask': 'manual-task',
    'manual': 'manual-task',
    'poseadjust': 'pose-adjust',
    'formationmove': 'formation-move',
    'formation': 'formation-move',
    'airrecon': 'air-recon',
    'lensrecon': 'lens-recon',
    'searchandshoot': 'recon-and-strike',
    'reconstrike': 'recon-and-strike',
    'reconandstrike': 'recon-and-strike',
    '30mmgunlaunch': '30mm-gun-strike',
    '30mmgunstrike': '30mm-gun-strike',
    '30mmgun': '30mm-gun-strike',
    '40mmgunlaunch': '30mm-gun-strike',
    '40mmgun': '30mm-gun-strike',
    'atmissilelaunch': 'at-missile-strike',
    'atmissilestrike': 'at-missile-strike',
    'atmissile': 'at-missile-strike',
    'gunshot': 'machine-gun-strike',
    '762mmgunshot': 'machine-gun-strike',
    '762mmgun': 'machine-gun-strike',
    'machinegunstrike': 'machine-gun-strike',
    'rocketlaunch': 'rocket-strike',
    'rocketstrike': 'rocket-strike',
    'loiteringmunitionlaunch': 'loitering-munition-strike',
    'loiteringmunitionstrike': 'loitering-munition-strike',
    'loiteringmunition': 'loitering-munition-strike',
    'laserillumination': 'laser-illumination',
    'laser': 'laser-illumination',
    'soundexpel': 'sound-expel',
    'acousticdeterrence': 'sound-expel',
    'lightexpel': 'light-expel',
    'lightdeterrence': 'light-expel',
    'emrecon': 'em-recon',
    'electronicrecon': 'em-recon',
    'emassault': 'recon-and-interfere',
    'electronicassault': 'recon-and-interfere',
    'reconandinterfere': 'recon-and-interfere',
    'eminterference': 'em-interference',
    'electronicjamming': 'em-interference',
  };
  return enMap[norm] || '';
};

/* ---------- 方法 ---------- */
const stateLabel = (state) => {
  const map = {
    DRAFT: '草稿',
    DRAFT_EDITING: '编辑中',
    READY: '就绪',
    ACTIVE: '执行中',
    DONE: '已完成',
    DELETED: '已删除',
    INIT: '初始化',
  };
  return map[state] || state || '未知';
};

const actionStateLabel = (state) => {
  const map = {
    SCHEDULED: '待执行',
    ACTIVE: '执行中',
    PAUSED: '已暂停',
    DONE: '已完成',
    DELETED: '已删除',
    READY: '就绪',
    INIT: '初始化',
    null: '待执行',
  };
  return map[state] || state || '待执行';
};

const flattenActions = (vehicle) => {
  if (!vehicle || !vehicle.stages) return [];
  return vehicle.stages
    .flatMap((stage) =>
      (stage.actions || []).map((action) => ({
        ...action,
        stage_id: stage.stage_id,
        stage_title: stage.stage_title,
        stage_seq: stage.stage_seq,
      }))
    )
    .sort((a, b) => (a.stage_seq - b.stage_seq) || ((a.action_seq || 0) - (b.action_seq || 0)));
};

// 根据 action.dependencies 将 actions 按列排列，无 dependencies 的放在第 0 列
const getActionColumns = (vehicle) => {
  const actions = flattenActions(vehicle);
  if (actions.length === 0) return [];

  const actionMapById = Object.fromEntries(actions.map((a) => [a.action_id, a]));
  const actionMapBySeq = Object.fromEntries(actions.map((a) => [String(a.action_seq || ''), a]));

  // 解析依赖：dependencies 中的元素可能是 action_id 或 action_seq，统一解析为 action 对象
  actions.forEach((a) => {
    const rawDeps = a.dependencies;
    let deps = [];
    if (Array.isArray(rawDeps)) {
      deps = rawDeps
        .map((d) => {
          if (typeof d !== 'string') return null;
          return actionMapById[d] || actionMapBySeq[d] || null;
        })
        .filter(Boolean);
    }
    a._deps = deps.map((depAction) => depAction.action_id);
  });

  // 计算每个 action 所在的列号：无依赖 = 0，有依赖 = max(依赖列号) + 1
  const computing = new Set();
  const colMap = {};
  const getCol = (id) => {
    if (colMap[id] !== undefined) return colMap[id];
    if (computing.has(id)) {
      // 出现环，按无依赖处理
      colMap[id] = 0;
      return 0;
    }
    computing.add(id);
    const a = actionMapById[id];
    let col = 0;
    if (a && a._deps.length > 0) {
      col = Math.max(...a._deps.map(getCol)) + 1;
    }
    computing.delete(id);
    colMap[id] = col;
    return col;
  };

  actions.forEach((a) => getCol(a.action_id));

  const maxCol = Math.max(...Object.values(colMap), 0);
  const columns = [];
  for (let c = 0; c <= maxCol; c++) {
    const col = actions
      .filter((a) => colMap[a.action_id] === c)
      .sort((a, b) => (a.action_seq || 0) - (b.action_seq || 0));
    columns.push(col);
  }

  // 把剩余未分配的（有环或异常）全部放到最后一列
  const assignedIds = new Set(columns.flat().map((a) => a.action_id));
  const remaining = actions
    .filter((a) => !assignedIds.has(a.action_id))
    .sort((a, b) => (a.action_seq || 0) - (b.action_seq || 0));
  if (remaining.length) {
    columns.push(remaining);
  }

  return columns;
};

// 计算跨列依赖连线：从 dependency action 到当前 action
const getActionLines = (vehicle) => {
  const columns = getActionColumns(vehicle);
  const actions = columns.flat();
  const lines = [];
  actions.forEach((a) => {
    const deps = a._deps || [];
    deps.forEach((depId) => {
      lines.push({ from: depId, to: a.action_id });
    });
  });
  return lines;
};

// 卡片按上游连线的重心定位（与编辑界面一致）：
// - 首列（无前驱）按 action_seq 自上而下排列
// - 其余每列每个卡片的目标中心 = 其所有前驱卡片中心的平均值
//   使串行链保持同一水平，汇聚节点落在多个前驱之间
// - 同列内若重心导致重叠，则自上而下按最小行距顺次下推
// - 整张图顶部对齐画布上方
// 卡片高度从真实 DOM 读取（依赖 layoutTick 触发重算），无法读取时用估算值兜底
const ROW_GAP = 16; // 同列卡片最小间距，与 .as-action-column gap 保持一致
const CARD_FALLBACK_H = 96; // 卡片高度兜底估算值
const getCardOffsets = (vehicle) => {
  void layoutTick.value; // 数据/尺寸变化后触发重算
  const columns = getActionColumns(vehicle);
  if (!columns.length) return {};

  const container = document.querySelector(`.as-action-cards[data-vid="${cssEscape(vehicle.vid)}"]`);
  const heightOf = (action) => {
    if (container) {
      const el = container.querySelector(`.as-action-card[data-action-id="${cssEscape(action.action_id)}"]`);
      if (el) return el.offsetHeight;
    }
    return CARD_FALLBACK_H;
  };

  // center[action_id] = 卡片中心的 Y 坐标（相对列内 0 基准）
  const center = {};

  columns.forEach((column, colIdx) => {
    if (colIdx === 0) {
      // 首列：自上而下顺次堆叠
      let cursor = 0;
      column.forEach((action) => {
        const h = heightOf(action);
        center[action.action_id] = cursor + h / 2;
        cursor += h + ROW_GAP;
      });
      return;
    }

    // 其余列：先按前驱重心算理想中心，再消除重叠
    const items = column.map((action) => {
      const deps = (action._deps || []).filter((id) => center[id] !== undefined);
      const ideal = deps.length
        ? deps.reduce((sum, id) => sum + center[id], 0) / deps.length
        : null;
      return { action, h: heightOf(action), ideal };
    });

    // 没有可用前驱重心的（异常/根节点混入）保持原顺序，给一个递增基准
    let fallbackCursor = 0;
    items.forEach((it) => {
      if (it.ideal === null) {
        it.ideal = fallbackCursor + it.h / 2;
      }
      fallbackCursor = Math.max(fallbackCursor, it.ideal + it.h / 2) + ROW_GAP;
    });

    // 按理想中心排序后，自上而下顺次下推消除重叠
    items.sort((a, b) => a.ideal - b.ideal);
    let minTop = 0;
    items.forEach((it) => {
      let top = it.ideal - it.h / 2;
      if (top < minTop) top = minTop;
      center[it.action.action_id] = top + it.h / 2;
      minTop = top + it.h + ROW_GAP;
    });
  });

  // 整体顶部对齐：把所有卡片的最小 top 归零
  const offsets = {};
  let minTop = Infinity;
  columns.flat().forEach((action) => {
    const h = heightOf(action);
    const top = center[action.action_id] - h / 2;
    offsets[action.action_id] = { top, h };
    if (top < minTop) minTop = top;
  });
  if (!isFinite(minTop)) minTop = 0;
  Object.keys(offsets).forEach((id) => {
    offsets[id].top -= minTop;
  });
  // 防御性兜底：若所有卡片 top 都为 0 且高度相同，说明 DOM 高度还没准备好，
  // 此时用 action_seq 给出一个顺次堆叠的临时位置，避免卡片全部重叠在左上角。
  const allSameTop = Object.values(offsets).every((o) => o.top === 0);
  const hasNonTrivialHeight = Object.values(offsets).some((o) => o.h > CARD_FALLBACK_H);
  if (allSameTop && hasNonTrivialHeight) {
    let cursor = 0;
    columns.flat().forEach((action) => {
      const h = offsets[action.action_id].h;
      offsets[action.action_id].top = cursor;
      cursor += h + ROW_GAP;
    });
  }
  return offsets;
};

// 单个卡片的定位样式
const cardStyle = (vehicle, action) => {
  const offsets = getCardOffsets(vehicle);
  const o = offsets[action.action_id];
  if (!o) return {};
  return { position: 'absolute', top: `${o.top}px`, left: '0', width: '100%' };
};

// 单列（只有一行 action）时横向顺排，避免卡片垂直错行
const isSingleRow = (vehicle) => {
  const columns = getActionColumns(vehicle);
  return columns.length > 1 && columns.every((col) => col.length <= 1);
};

const singleRowCardStyle = (vehicle, action, colIdx) => {
  return { position: 'relative', top: '0', left: '0', width: '100%' };
};

// 每列容器高度（取列内最靠下卡片的底部）
const columnStyle = (vehicle, column) => {
  if (isSingleRow(vehicle)) {
    return { position: 'relative', height: undefined };
  }
  const offsets = getCardOffsets(vehicle);
  let maxBottom = 0;
  column.forEach((action) => {
    const o = offsets[action.action_id];
    if (o) maxBottom = Math.max(maxBottom, o.top + o.h);
  });
  return { position: 'relative', height: maxBottom ? `${maxBottom}px` : undefined };
};

// 根据真实渲染的卡片位置计算依赖连线
// 采用「圆角折线」路由：水平段沿 from 行，竖直段走在 to 列左侧的列间空隙里，
// 从而避免连线斜穿中间列的卡片造成覆盖。
const getLinePath = (line, vehicle) => {
  // 依赖 layoutTick 触发重算（数据变化 / 滚动 / 尺寸变化后 bump）
  void layoutTick.value;

  const container = document.querySelector(`.as-action-cards[data-vid="${cssEscape(vehicle.vid)}"]`);
  if (!container) return '';
  const fromEl = container.querySelector(`.as-action-card[data-action-id="${cssEscape(line.from)}"]`);
  const toEl = container.querySelector(`.as-action-card[data-action-id="${cssEscape(line.to)}"]`);
  if (!fromEl || !toEl) return '';

  const base = container.getBoundingClientRect();
  const fr = fromEl.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();

  // 起点离开卡片右边缘留一点空隙，避免与方框重合
  const START_GAP = 4;
  // 终点（箭头尖）距离目标卡片左边缘留出空隙，避免箭头贴住方框
  const END_GAP = 6;
  const fromX = fr.right - base.left + START_GAP;
  const fromY = fr.top - base.top + fr.height / 2;
  const toX = tr.left - base.left - END_GAP;
  const toY = tr.top - base.top + tr.height / 2;

  // 竖直拐弯点落在 to 卡片左侧的列间空隙里（默认列间距 44px，取一半作为缓冲）
  const GUTTER = 22;
  let turnX = toX - GUTTER;
  // 保证拐点在 from 出口右侧，避免折回
  turnX = Math.max(fromX + 16, Math.min(turnX, toX - 6));

  // 同一水平线（同行）直接连直线
  if (Math.abs(toY - fromY) < 1.5) {
    return `M ${fromX} ${fromY} L ${toX} ${toY}`;
  }

  const dirY = toY > fromY ? 1 : -1;
  // 圆角半径，受可用水平/垂直距离限制
  const r = Math.max(2, Math.min(9, Math.abs(toY - fromY) / 2, turnX - fromX, toX - turnX));

  return [
    `M ${fromX} ${fromY}`,
    `L ${turnX - r} ${fromY}`,
    `Q ${turnX} ${fromY} ${turnX} ${fromY + r * dirY}`,
    `L ${turnX} ${toY - r * dirY}`,
    `Q ${turnX} ${toY} ${turnX + r} ${toY}`,
    `L ${toX} ${toY}`,
  ].join(' ');
};

// 根据车辆 actions 的实际状态计算控制按钮应显示的状态
// 每辆车独立判断，不受 plan 级别 runtime_state 影响
const getVehicleRuntimeState = (vehicle) => {
  const actions = flattenActions(vehicle);
  // 所有 action 都 DONE → DONE（最高优先级）
  if (actions.length > 0 && actions.every((a) => a.state === 'DONE')) {
    return 'DONE';
  }
  // 根据该车自身的 action 状态推断
  if (actions.some((a) => a.state === 'ACTIVE')) return 'ACTIVE';
  if (actions.some((a) => a.state === 'PAUSED')) return 'PAUSED';
  return 'SCHEDULED';
};

// 车辆是否已有行动（新建空方案只关联了车辆骨架，stages 为空）
const hasVehicleActions = (vehicle) => flattenActions(vehicle).length > 0;

// 车辆是否处于执行中（已开始且行动未结束：ACTIVE/PAUSED）。执行中禁用编辑/删除，
// 避免任务执行期间修改内容后又被"重新发布"推到车上。
// 注意：必须用 action 状态推断（车辆反馈推进 DS 行动状态），不能用方案的
// runtime_state——后者是后端内存态，点开始接口成功即翻转，不代表车辆真正开始执行
// （2026-09-09 踩坑：车未真正启动时按钮文案/置灰被误触发）
const isVehicleExecuting = (vehicle) => ['ACTIVE', 'PAUSED'].includes(getVehicleRuntimeState(vehicle));

// 任一车辆执行中 → 发布按钮文案变为"重新发布行动方案"
const anyVehicleExecuting = computed(() => vehicleActions.value.some((v) => isVehicleExecuting(v)));

// 方案没有任何行动序列数据（无车辆或所有车辆都是空序列）→ 发布/下发按钮置灰
const planHasNoActions = computed(() => !vehicleActions.value.some((v) => hasVehicleActions(v)));

/* ---------- 发布状态提示（操控席）：发布后经 zenoh task_received_status 确认 ---------- */
const publishAckTid = ref(null);       // 最近一次发布（send_mission）的 tid
const publishAckReceived = ref(false); // 是否已收到该 tid 的任务接收确认
let taskExecutedSinceAck = false;      // 收到确认后任务是否真正进入过执行态（用于"任务结束后隐藏"）

// 任务真正结束（真实执行态从有到无）→ 隐藏发布状态
watch(anyVehicleExecuting, (executing) => {
  if (executing) {
    taskExecutedSinceAck = true;
  } else if (taskExecutedSinceAck && publishAckReceived.value) {
    publishAckReceived.value = false;
    publishAckTid.value = null;
    taskExecutedSinceAck = false;
  }
});

// 切换方案时重置发布状态提示
watch(selectedPlanId, () => {
  publishAckTid.value = null;
  publishAckReceived.value = false;
  taskExecutedSinceAck = false;
});

/* ---------- 行动参数弹窗 ---------- */
const openParamDialog = (action, vehicle) => {
  if (!action || !action.action_id) return;
  stopAutoRefresh(); // 编辑参数期间暂停轮询，避免旧数据覆盖
  editingAction.value = action;
  editingVehicleVid.value = vehicle?.vid || action.vid || '';
  editingVehicleType.value = vehicle?.resource_type || '';
  showParamDialog.value = true;
};

const closeParamDialog = () => {
  showParamDialog.value = false;
  editingAction.value = null;
  editingVehicleVid.value = '';
  editingVehicleType.value = '';
  startAutoRefresh(); // 关闭弹窗后恢复轮询
};

const saveActionParam = async (newParam) => {
  const action = editingAction.value;
  if (!action || !selectedPlanId.value) return;

  savingParam.value = true;
  try {
    const planId = selectedPlanId.value;
    const actionId = action.action_id;

    // 先调用后端保存（操控端/协同席使用不同数据服务）
    const result = isControlMode.value
      ? await updateOperatorActionParam(planId, actionId, newParam)
      : await updateActionParam(planId, actionId, newParam);
    if (!result.ok) {
      appendSystemMessage('参数保存失败: ' + (result.error || '未知错误'));
      return;
    }

    // 更新本地 selectedPlan 中对应 action 的 param
    const vehicles = selectedPlan.value?.vehicle_summary || [];
    for (const vehicle of vehicles) {
      for (const stage of vehicle.stages || []) {
        const target = (stage.actions || []).find((a) => a.action_id === actionId);
        if (target) {
          target.param = newParam;
          break;
        }
      }
    }

    appendSystemMessage(`行动参数已保存 | ${action.name}`);
    closeParamDialog();

    // 操控端模式下：把本地 plan 同步到数据服务器，避免后端服务重启或页面刷新后丢失
    if (isControlMode.value) {
      const syncResult = await syncOperatorPlanToDataServer(planId);
      if (!syncResult.ok) {
        appendSystemMessage(`参数已本地保存，但同步到数据服务器失败：${syncResult.data?.message || syncResult.error || '未知错误'}`);
      } else {
        appendSystemMessage('参数已同步到数据服务器');
      }
    }

    // 重新拉取后端最新 plan（本地 local_dirty 会优先使用本地缓存），
    // 确保 selectedPlan 与本地持久化数据一致，避免 points 等嵌套字段显示旧值
    await refreshDetail(planId);
  } finally {
    savingParam.value = false;
  }
};

/* ---------- 新建/编辑方案弹窗 ---------- */
const openCreator = () => {
  stopAutoRefresh();
  creatorEditMode.value = false;
  creatorEditPlan.value = null;
  creatorEditVehicleVid.value = '';
  creatorPresetVehicleType.value = '';
  creatorPresetVehicle.value = null;
  creatorAppendMode.value = false;
  creatorAppendPlan.value = null;
  showCreator.value = true;
};

const openCreatorForEdit = (vehicle) => {
  if (!selectedPlan.value) return;
  stopAutoRefresh();
  creatorEditMode.value = true;
  creatorEditPlan.value = selectedPlan.value;
  creatorEditVehicleVid.value = vehicle.vid;
  creatorEditVehicleType.value = vehicle.resource_type || '';
  creatorPresetVehicleType.value = '';
  creatorPresetVehicle.value = null;
  creatorAppendMode.value = false;
  creatorAppendPlan.value = null;
  showCreator.value = true;
};

const openCreatorForVehicle = (vehicle) => {
  stopAutoRefresh();
  creatorEditMode.value = false;
  creatorEditPlan.value = null;
  creatorEditVehicleVid.value = '';
  creatorPresetVehicleType.value = vehicle?.type || '';
  creatorPresetVehicle.value = vehicle || null;
  creatorAppendMode.value = false;
  creatorAppendPlan.value = null;
  showCreator.value = true;
};

const openCreatorAppendToPlan = (vehicle) => {
  if (!selectedPlan.value) return;
  stopAutoRefresh();
  creatorEditMode.value = false;
  creatorEditPlan.value = null;
  creatorEditVehicleVid.value = '';
  creatorPresetVehicleType.value = vehicle?.type || '';
  creatorPresetVehicle.value = vehicle || null;
  creatorAppendMode.value = true;
  creatorAppendPlan.value = selectedPlan.value;
  showCreator.value = true;
};

const openMissingVehicleSelector = () => {
  selectedMissingVehicle.value = missingVehicleTypes.value[0] || null;
  showMissingVehicleDialog.value = true;
};

const confirmMissingVehicleSelection = () => {
  if (!selectedMissingVehicle.value) return;
  const vehicle = selectedMissingVehicle.value;
  showMissingVehicleDialog.value = false;
  openCreatorAppendToPlan(vehicle);
  selectedMissingVehicle.value = null;
};

const confirmDeleteVehicleActions = (vehicle) => {
  stopAutoRefresh();
  vehicleToDelete.value = vehicle;
  showDeleteConfirmDialog.value = true;
};

const cancelDeleteVehicleActions = () => {
  showDeleteConfirmDialog.value = false;
  vehicleToDelete.value = null;
  startAutoRefresh();
};

const executeDeleteVehicleActions = async () => {
  if (!vehicleToDelete.value || !selectedPlan.value) return;
  const vid = vehicleToDelete.value.vid;
  const planId = selectedPlan.value.plan_id;

  try {
    // 走后端新接口：由后端把数据服务器上该车辆的 action/car_action 置 DELETED，
    // 再更新本地 plan 并同步到数据服务器。
    const deleteFn = isControlMode.value ? deleteOperatorVehicle : deleteVehicle;
    const fetchDetailFn = isControlMode.value ? fetchOperatorPlanDetail : fetchActionSequencePlanDetail;
    const result = await deleteFn(planId, vid);
    if (!result.ok) {
      appendSystemMessage(`删除车辆行动序列失败：${result.data?.message || result.error || '未知错误'}`);
      return;
    }

    const detail = result.data?.data || result.data || {};
    // 删除成功后，用后端返回的最新 plan 刷新视图；若后端未返回 plan，则本地构造
    const refreshed = await fetchDetailFn(planId);
    if (refreshed.ok && refreshed.data) {
      selectedPlan.value = refreshed.data;
    } else {
      // 兜底：本地过滤掉该车辆
      const updatedPlan = JSON.parse(JSON.stringify(selectedPlan.value));
      for (const stage of updatedPlan.stages || []) {
        const ta = stage.team_actions || {};
        if (Array.isArray(ta)) {
          for (const v of ta) {
            const cars = v.car_actions || v.team_actions || [];
            const filtered = cars.filter((c) => c.vid !== vid);
            if (v.car_actions) v.car_actions = filtered;
            else v.team_actions = filtered;
          }
        } else {
          for (const key of Object.keys(ta)) {
            ta[key] = (ta[key] || []).filter((v) => v.vid !== vid);
          }
        }
      }
      updatedPlan.car_actions = (updatedPlan.car_actions || []).filter((v) => v.vid !== vid);
      updatedPlan.vehicle_summary = (updatedPlan.vehicle_summary || []).filter((v) => v.vid !== vid);
      selectedPlan.value = updatedPlan;
    }

    appendSystemMessage(
      `已删除该车辆行动序列并同步到数据服务器（actions: ${(detail.deleted_actions || []).length}, car_actions: ${(detail.deleted_car_actions || []).length}）`
    );
  } catch (err) {
    appendSystemMessage(`删除车辆行动序列失败：${err.message || err}`);
  } finally {
    showDeleteConfirmDialog.value = false;
    vehicleToDelete.value = null;
    startAutoRefresh(); // 删除完成或失败后均恢复轮询
  }
};

const closeCreator = () => {
  showCreator.value = false;
  creatorEditMode.value = false;
  creatorEditPlan.value = null;
  creatorEditVehicleVid.value = '';
  creatorEditVehicleType.value = '';
  creatorPresetVehicleType.value = '';
  creatorPresetVehicle.value = null;
  creatorAppendMode.value = false;
  creatorAppendPlan.value = null;
  startAutoRefresh(); // 关闭 Creator 弹窗后恢复轮询
};

const onCreatorSaved = async (plan) => {
  if (creatorEditMode.value) {
    // 编辑模式：PATCH 已在后端直接 import 落盘到数据服务器，无需再调 /sync
    // （历史上 PATCH 只写本地缓存才需要 sync 补偿；重复 import 会因 action 无 id 而新建出重复 ACTION）
    selectedPlan.value = plan;
    appendSystemMessage('已编辑车辆行动序列并保存到数据服务器');
    await refreshDetail(plan.plan_id);
    closeCreator();
    return;
  }

  if (creatorAppendMode.value) {
    // 追加模式：PATCH 已落盘，同样不需要再 sync；刷新当前方案详情，不新增方案条目
    selectedPlan.value = plan;
    appendSystemMessage('已追加车辆行动序列到当前方案并保存到数据服务器');
    await refreshDetail(plan.plan_id);
    closeCreator();
    return;
  }

  // 新建模式：将其插入方案列表并选中，便于用户查看效果
  const item = {
    plan_id: plan.plan_id,
    resource_id: plan.resource_id,
    title: plan.title,
    description: plan.description,
    state: plan.state,
    stages_count: plan.stages?.length || 0,
    teams_count: plan.teams?.length || 0,
  };
  plans.value.unshift(item);
  selectedPlan.value = plan;
  selectedPlanId.value = plan.plan_id;
  closeCreator();
  appendSystemMessage('已新建本地预览方案，可继续编辑参数');
};

const loadOnlineVehicles = async () => {
  const result = isControlMode.value
    ? await fetchOperatorVehicles()
    : await fetchActionSequenceVehicles();
  if (result.ok) {
    onlineVehicles.value = result.data.items || [];
  } else {
    console.warn('[ActionSequencePanel] loadOnlineVehicles failed:', result.error);
    onlineVehicles.value = [];
  }
};

const loadPlans = async (silent = false) => {
  if (!silent) loadingPlans.value = true;
  // 协同席从协同席数据服务查，操控端从操控席数据服务查
  const result = isControlMode.value
    ? await fetchOperatorPlans()
    : await fetchActionSequencePlans();
  if (!silent) loadingPlans.value = false;
  if (result.ok) {
    const prevId = selectedPlanId.value;
    let allPlans = result.data.items || [];

    // 如果已连接车辆，只显示有对应车辆类型行动序列的任务
    // 注意：列表接口不返回 vehicle_summary，需要通过详情接口获取车辆类型
    if (isControlMode.value && !isVehicleConnected.value) {
      // 操控席但未连接车辆时，显示空列表
      plans.value = [];
      selectedPlanId.value = '';
      selectedPlan.value = null;
      if (!silent) {
        appendSystemMessage('未连接车辆，无法显示行动序列');
      }
      return;
    }
    if (isControlMode.value && isVehicleConnected.value && connectedVehicleType.value) {
      // 列表接口已返回轻量 vehicle_summary（vid + resource_type），直接按车型过滤，
      // 不再对每个 plan 拉详情（原 N+1 查询已移除）
      allPlans = allPlans.filter((plan) => {
        const vs = plan.vehicle_summary || [];
        // vehicle_summary 为空 = 尚未分配车辆的方案（如新建的空方案），不参与车型过滤
        return vs.length === 0 || vs.some((v) => v.resource_type === connectedVehicleType.value);
      });
    }

    plans.value = allPlans;

    if (plans.value.length === 0) {
      selectedPlanId.value = '';
      selectedPlan.value = null;
      if (isControlMode.value && isVehicleConnected.value && !silent) {
        appendSystemMessage(`没有找到包含 ${connectedVehicleType.value} 类型车辆行动序列的任务`);
      }
      return;
    }

    // 如果之前有选中项，检查是否还存在；不存在则自动选中第一项
    // 重新读取最新的 selectedPlanId，避免覆盖用户在过滤期间的选择
    const currentSelectedId = selectedPlanId.value;
    const exists = plans.value.some((p) => p.plan_id === currentSelectedId);
    if (exists && currentSelectedId) {
      refreshDetail(currentSelectedId);
    } else {
      const withActions = plans.value.find((p) => (p.stages_count || 0) > 0);
      selectPlan((withActions || plans.value[0]).plan_id);
    }
  } else {
    appendSystemMessage('获取方案列表失败: ' + (result.error || '未知错误'));
  }
};

const refreshDetail = async (planId) => {
  if (!planId) return;
  try {
    const result = isControlMode.value
      ? await fetchOperatorPlanDetail(planId)
      : await fetchActionSequencePlanDetail(planId);
    if (!result.ok) {
      console.warn('[ActionSequencePanel] refreshDetail failed:', result.error);
      return;
    }
    selectedPlan.value = result.data;
  } catch (e) {
    console.error('[ActionSequencePanel] refreshDetail error:', e);
  }
};

/* ---------- 方案点击：通知数据服务器上图（上图处理由服务器负责） ---------- */
// map-notify 回弹去抖：自己点击触发的 last_click 写回会经 Zenoh/SSE 原样推回，
// 而 selectPlan 已拉过最新详情，短窗口内跳过该 SSE 事件，避免重复请求
let lastMapNotify = { planId: '', at: 0 };

const handlePlanItemClick = async (planId) => {
  const notifyFn = isControlMode.value ? notifyOperatorPlanMapClicked : notifyPlanMapClicked;
  lastMapNotify = { planId, at: Date.now() };
  try {
    const result = await notifyFn(planId);
    if (!result.ok || ((result.data?.code) ?? 200) !== 200) {
      appendSystemMessage('通知服务器上图失败: ' + (result.data?.message || result.error || '未知错误'));
    }
  } catch (e) {
    console.warn('[MapNotify] notify failed:', e);
  }
  await selectPlan(planId);
};

const selectPlan = async (planId) => {
  selectedPlanId.value = planId;
  loadingDetail.value = true;
  try {
    // 协同席从协同席数据服务查详情，操控端从操控席数据服务查详情
    const result = isControlMode.value
      ? await fetchOperatorPlanDetail(planId)
      : await fetchActionSequencePlanDetail(planId);
    if (result.ok) {
      selectedPlan.value = result.data;
    } else {
      selectedPlan.value = null;
      appendSystemMessage('获取方案详情失败: ' + (result.error || '未知错误'));
    }
  } catch (e) {
    console.error('[ActionSequencePanel] selectPlan error:', e);
    selectedPlan.value = null;
    appendSystemMessage('获取方案详情异常: ' + (e?.message || '未知错误'));
  } finally {
    loadingDetail.value = false;
  }
};

const onRefresh = () => {
  loadOnlineVehicles();
  // loadPlans 会刷新列表并对选中 plan 补一次详情刷新，无需再单独 selectPlan
  loadPlans();
  appendSystemMessage('已刷新');
};

/* ---------- 新建空方案：仅名称，其它字段为空；操控席由后端补默认值并写入操控席数据服务器，协同席仅标题不带行动序列 ---------- */
const openCreatePlanDialog = () => {
  newPlanTitle.value = '';
  showCreatePlanDialog.value = true;
};

const cancelCreatePlan = () => {
  showCreatePlanDialog.value = false;
  newPlanTitle.value = '';
};

const confirmCreatePlan = async () => {
  const title = newPlanTitle.value.trim();
  if (!title || creatingPlan.value) return;
  creatingPlan.value = true;
  try {
    if (!isControlMode.value) {
      // 协同席：仅标题创建空方案，不带任何行动序列数据（详情区显示"暂无行动序列数据"）
      const planId = nextSequentialPlanId(plans.value);
      const result = await createPlan({ plan_id: planId, title });
      if (result.ok && ((result.data?.code) ?? 200) === 200) {
        const newPlanId = result.data?.data?.plan_id || planId;
        appendSystemMessage(`空方案「${title}」已创建`);
        cancelCreatePlan();
        await loadPlans();
        if (newPlanId) selectPlan(newPlanId);
      } else {
        appendSystemMessage('新建方案失败: ' + (result.data?.message || result.error || '未知错误'));
      }
      return;
    }
    // 关联当前操控车辆：带上该车的空行动序列骨架（结构对齐 ActionSequenceCreator/DS 标准格式）
    // plan id 用顺序号 plan-六位数字（现有数字后缀最大值 +1）；team/stage id 仍带时间戳命名空间，
    // 避免与 DS 中已有资源（team/stage/car_actions）撞名后被吸附出幻影行动
    const rawVid = String(connectedVehicleId.value || '');
    const vid = rawVid.startsWith('equipment:') ? rawVid : `equipment:${rawVid}`;
    const ts = Date.now();
    const planId = nextSequentialPlanId(plans.value);
    const teamId = `TEAM_${ts}`;
    const stageId = `STAGE_${ts}`;
    const payload = {
      plan_id: planId,
      title,
      teams: [
        {
          team_id: teamId,
          name: '新建编组',
          state: 'READY',
          vehicles: [{ vid, resource_type: connectedVehicleType.value }],
        },
      ],
      stages: [
        {
          stage_id: stageId,
          title: '新建阶段',
          stage_seq: 1,
          team_ids: [teamId],
          target_ids: [],
          state: 'SCHEDULED',
          team_actions: [
            {
              team_id: teamId,
              car_actions: [
                // car_actions_id 与后端合成规则（ca:{plan_id}:{stage_id}:{vid}）一致，
                // 显式唯一 id 防止 DS 把匿名项匹配到已有 CAR_ACTIONS 资源
                { car_actions_id: `ca:${planId}:${stageId}:${vid}`, vid, state: 'SCHEDULED', actions: [] },
              ],
            },
          ],
        },
      ],
    };
    const result = await createOperatorPlan(payload);
    if (result.ok && ((result.data?.code) ?? 200) === 200) {
      const newPlanId = result.data?.data?.plan_id || planId;
      appendSystemMessage(`空方案「${title}」已创建`);
      cancelCreatePlan();
      await loadPlans();
      if (newPlanId) selectPlan(newPlanId);
    } else {
      appendSystemMessage('新建方案失败: ' + (result.data?.message || result.error || '未知错误'));
    }
  } catch (err) {
    appendSystemMessage('新建方案异常: ' + (err?.message || '未知错误'));
  } finally {
    creatingPlan.value = false;
  }
};

/* ---------- 协同席：新建编队机动方案（头车 + 跟随车辆，共用同一套编队机动参数） ---------- */
const showFormationPlanDialog = ref(false);

const openFormationPlanDialog = async () => {
  showFormationPlanDialog.value = true;
  // 弹窗打开时确保在线车辆列表是最新的
  if (onlineVehicles.value.length === 0) {
    await loadOnlineVehicles();
  }
};

const confirmFormationPlan = async ({ title, leaderVid, followerVids, param }) => {
  // 头车排在第一行：car_actions 与 teams.vehicles 均按 头车 -> 跟随车辆 顺序
  const orderedVids = [leaderVid, ...followerVids];
  // 查找范围与弹窗列表一致（含写死追加的操控车选项）
  const vehicles = orderedVids
    .map((vid) => formationDialogVehicles.value.find((v) => v.vid === vid))
    .filter(Boolean);
  if (!vehicles.length) {
    appendSystemMessage('新建编队机动失败：未找到所选车辆');
    return;
  }
  const ts = Date.now();
  const planId = nextSequentialPlanId(plans.value);
  const teamId = `TEAM_${ts}`;
  const stageId = `STAGE_${ts}`;
  // 通用参数默认值：任务时长 60 秒，默认勾选“设置开始时间”并取当前系统时间
  // （start_time 用 datetime-local 输入框要求的本地格式 YYYY-MM-DDTHH:MM，与拖拽建卡一致）
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, '0');
  const nowLocal = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}T${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const commonParamDefaults = {
    mission_duration: '00:01:00',
    enable_start_time: true,
    start_time: nowLocal,
  };
  const payload = {
    plan_id: planId,
    title,
    description: `编队机动：头车 ${getVehicleDisplayName(vehicles[0])}`,
    state: 'DRAFT',
    teams: [
      {
        team_id: teamId,
        name: '编队编组',
        state: 'READY',
        vehicles: vehicles.map((v) => ({ vid: v.vid, resource_type: v.resource_type || '' })),
      },
    ],
    stages: [
      {
        stage_id: stageId,
        title: '编队机动',
        stage_seq: 1,
        team_ids: [teamId],
        target_ids: [],
        state: 'SCHEDULED',
        team_actions: [
          {
            team_id: teamId,
            car_actions: vehicles.map((v, idx) => ({
              // car_actions_id 与后端合成规则（ca:{plan_id}:{stage_id}:{vid}）一致，
              // 显式唯一 id 防止 DS 把匿名项匹配到已有 CAR_ACTIONS 资源
              car_actions_id: `ca:${planId}:${stageId}:${v.vid}`,
              vid: v.vid,
              state: 'SCHEDULED',
              actions: [
                {
                  name: '编队机动',
                  action_name: '编队机动',
                  action_description: '编队机动',
                  vid: v.vid,
                  action_seq: 1,
                  action_type: 'formation-move',
                  description: '编队机动',
                  // 头车带 is_leader 标记：DS 投影会按资源 id 重排 car_actions，
                  // 头车第一行的顺序信息只能靠业务字段携带
                  param: {
                    ...JSON.parse(JSON.stringify(param)),
                    ...commonParamDefaults,
                    ...(idx === 0 ? { is_leader: true } : {}),
                  },
                  state: 'SCHEDULED',
                  task_type: 'ACTION',
                  plan_id: planId,
                  stage_id: stageId,
                  team_id: teamId,
                },
              ],
            })),
          },
        ],
      },
    ],
  };
  try {
    const result = await createPlan(payload);
    if (result.ok && ((result.data?.code) ?? 200) === 200) {
      const newPlanId = result.data?.data?.plan_id || planId;
      appendSystemMessage(`编队机动方案「${title}」已创建（${vehicles.length} 车）`);
      showFormationPlanDialog.value = false;
      await loadPlans();
      if (newPlanId) selectPlan(newPlanId);
    } else {
      appendSystemMessage('新建编队机动失败: ' + (result.data?.message || result.error || '未知错误'));
    }
  } catch (err) {
    appendSystemMessage('新建编队机动异常: ' + (err?.message || '未知错误'));
  }
};

const onStart = async () => { handleControlAction('start'); };
const onPause = async () => { handleControlAction('pause'); };
const onResume = async () => { handleControlAction('resume'); };
const onStop = async () => { handleControlAction('stop'); };

const getUgvVehicles = () => {
  const all = selectedPlan.value?.vehicle_summary || [];
  // 过滤 resource_type 为 UGV 的；若无 resource_type 字段则全部视为 UGV（兼容旧数据）
  const ugvs = all.filter((v) => !v.resource_type || v.resource_type === 'UGV');
  return ugvs;
};

const getAllVehicles = () => {
  // 下发时列出所有车辆，不限于 UGV
  return selectedPlan.value?.vehicle_summary || [];
};

const handleControlAction = (actionType) => {
  const ugvs = getUgvVehicles();
  if (ugvs.length <= 1) {
    // 单车直接执行（也覆盖 0 辆车时的空操作）
    executeControl(actionType, ugvs.map((v) => v.vid));
    return;
  }
  // 多车打开弹窗
  pendingControlAction.value = actionType;
  selectedVehicleVids.value = ugvs.map((v) => v.vid); // 默认全选
  showVehicleDialog.value = true;
};

const executeControl = async (actionType, vids) => {
  if (!vids || vids.length === 0) return;
  controlLoading.value = true;
  try {
    const planId = selectedPlanId.value;
    let apiFn;
    let successState;
    let successMsg;
    switch (actionType) {
      case 'start':
        apiFn = isControlMode.value ? startOperatorPlan : startActionSequence;
        successState = 'ACTIVE';
        successMsg = '行动序列已开始执行';
        break;
      case 'pause':
        apiFn = isControlMode.value ? pauseOperatorPlan : pauseActionSequence;
        successState = 'PAUSED';
        successMsg = '行动序列已暂停';
        break;
      case 'resume':
        apiFn = isControlMode.value ? resumeOperatorPlan : resumeActionSequence;
        successState = 'ACTIVE';
        successMsg = '行动序列已继续';
        break;
      case 'stop':
        apiFn = isControlMode.value ? stopOperatorPlan : stopActionSequence;
        successState = 'SCHEDULED';
        successMsg = '行动序列已停止并重置';
        break;
    }
    // 多车并行调用，单车直接调用（去掉 equipment: 前缀）
    const results = await Promise.all(vids.map((vid) => apiFn(planId, vid?.replace('equipment:', '') || vid)));
    // result.data 是后端 ApiResponse 信封：HTTP 200 也可能业务失败（code !== 200）
    const isBizOk = (r) => r.ok && ((r.data?.code) ?? 200) === 200;
    const allOk = results.every(isBizOk);
    if (allOk) {
      const cleanVids = vids.map((v) => v?.replace('equipment:', '') || v);
      appendSystemMessage(
        `${successMsg} (${cleanVids.length > 1 ? cleanVids.length + '辆车' : cleanVids[0]})`
      );
      // 控制指令执行后等待 2 秒，待后端/数据服务器状态稳定后再刷新列表和详情
      setTimeout(() => {
        loadPlans(true);
        if (selectedPlanId.value) selectPlan(selectedPlanId.value);
      }, 2000);
    } else {
      const errs = results
        .filter((r) => !isBizOk(r))
        .map((r) => r.data?.message || r.error)
        .join(', ');
      appendSystemMessage(`${successMsg}失败: ${errs}`);
    }
  } finally {
    controlLoading.value = false;
  }
};

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedVehicleVids.value = getUgvVehicles().map((v) => v.vid);
  } else {
    selectedVehicleVids.value = [];
  }
};

const confirmVehicleSelection = () => {
  showVehicleDialog.value = false;
  executeControl(pendingControlAction.value, selectedVehicleVids.value);
};

const onDispatch = async () => {
  // 协同席 — 将方案下发到操控席数据服务端
  // 保留旧逻辑作为兜底，新逻辑通过 openDispatchSeatDialog 触发
  controlLoading.value = true;
  const result = await dispatchActionSequence(selectedPlanId.value, {});
  controlLoading.value = false;
  if (result.ok) {
    appendSystemMessage('行动方案已下发到操控席');
  } else {
    appendSystemMessage('下发到操控席失败: ' + (result.data?.message || result.error || '未知错误'));
  }
};

const openDispatchSeatDialog = () => {
  selectedDispatchSeats.value = [];
  showDispatchSeatDialog.value = true;
};

const cancelDispatchSeatSelection = () => {
  showDispatchSeatDialog.value = false;
  selectedDispatchSeats.value = [];
};

const toggleDispatchSeatSelectAll = (e) => {
  if (e.target.checked) {
    selectedDispatchSeats.value = SEAT_OPTIONS.map((s) => s.id);
  } else {
    selectedDispatchSeats.value = [];
  }
};

const confirmDispatchSeatSelection = async () => {
  if (!selectedPlanId.value || selectedDispatchSeats.value.length === 0) return;
  showDispatchSeatDialog.value = false;
  controlLoading.value = true;
  try {
    const result = await dispatchForwardPlan(selectedPlanId.value, selectedDispatchSeats.value, 30);
    // result.data 是后端 ApiResponse 包装：HTTP 200 也可能业务失败（code !== 200），需看信封
    const envelope = result.data || {};
    if (result.ok && (envelope.code ?? 200) === 200) {
      appendSystemMessage(`行动方案已下发到席位 ${selectedDispatchSeats.value.join('、')}`);
      // 方案含编队机动元任务时，后端会附加 POST /formation/mission/send，这里提示其结果
      const fm = envelope.data?.formation_mission;
      if (fm?.sent) {
        appendSystemMessage(
          fm.ok
            ? `编队机动任务已下发（/formation/mission/send，共 ${fm.vehicle_count} 车，头车 ${fm.leader_vid || '未知'} 排在首位）`
            : `编队机动任务下发失败: ${fm.error || ('HTTP ' + (fm.status_code || '未知'))}`
        );
      }
    } else {
      appendSystemMessage('下发到席位失败: ' + (envelope.message || result.error || '未知错误'));
    }
  } catch (err) {
    appendSystemMessage('下发到席位失败: ' + (err.message || err));
  } finally {
    controlLoading.value = false;
    selectedDispatchSeats.value = [];
  }
};

const onDispatchActive = async () => {
  // 操控端行动序列模块：走 zenoh send_mission（操控端接口）
  const vehicles = getAllVehicles();
  if (vehicles.length > 1) {
    // 多车时弹出复选框，支持批量下发
    selectedDispatchVids.value = [];
    showDispatchVehicleDialog.value = true;
    return;
  }
  // 单车直接下发
  const vid = vehicles[0]?.vid || '';
  await doDispatchActive(vid);
};

// 下发前元任务有效性校验：机动类需有有效航路点，打击类需有有效目标点或目标区域
const MANEUVER_ACTION_TYPES = ['auto-move', 'formation-move'];
const STRIKE_ACTION_TYPES = ['30mm-gun-strike', 'at-missile-strike', 'rocket-strike', 'loitering-munition-strike', 'machine-gun-strike'];

const hasValidCoords = (list) =>
  Array.isArray(list) && list.some((pt) =>
    pt && typeof pt === 'object' &&
    (Number(pt.lon ?? pt.longitude ?? 0) !== 0 || Number(pt.lat ?? pt.latitude ?? 0) !== 0)
  );

// 与 getActionDisplayName 同一套类型解析（name 优先，其次 action_type / action_id / param 推断）
const resolveDispatchActionType = (action) => {
  if (!action) return '';
  const nameInferred = inferActionTypeFromName(action.name);
  let raw = nameInferred || String(action.action_type || '').toLowerCase().replace(/_/g, '-');
  // DS 侧空中侦察的 action_type 为 UAV-Air-Recon，统一归一到 air-recon
  if (raw === 'uav-air-recon') raw = 'air-recon';
  // 旧命名别名（shoot/launch）归一到新规范名
  raw = LEGACY_ACTION_TYPE_ALIASES[raw] || raw;
  if (!raw || raw === 'unknown' || raw === 'unknown-action') {
    raw = inferActionTypeFromId(action.action_id) || inferActionTypeFromParam(action.param) || raw;
  }
  return raw;
};

// 空中侦察卡片摘要：统计三组无人机航路点（service.points1/2/3）总数
const airReconCardLabel = (action) => {
  const svc = action?.param?.service || {};
  const total = AIR_RECON_UAV_GROUPS.reduce(
    (sum, k) => sum + (Array.isArray(svc[k]) ? svc[k].length : 0),
    0
  );
  return total > 0 ? `${total} 个无人机航路点` : '暂无无人机航路点';
};

// 从当前方案 vehicle_summary 取该车的全部行动（同名车辆合并，与 vehicleActions 口径一致）
const findVehicleActionsByVid = (vehicleVid) => {
  const cleanVid = String(vehicleVid || '').replace('equipment:', '');
  return (selectedPlan.value?.vehicle_summary || [])
    .filter((v) => String(v.vid || '').replace('equipment:', '') === cleanVid)
    .flatMap((v) => flattenActions(v));
};

// 返回空串表示校验通过，否则为提示文案
const validateDispatchParams = (vehicleVid) => {
  for (const action of findVehicleActionsByVid(vehicleVid)) {
    const type = resolveDispatchActionType(action);
    const param = action.param || {};
    const name = getActionDisplayName(action);
    if (MANEUVER_ACTION_TYPES.includes(type) && !hasValidCoords(param.points)) {
      return `机动类任务「${name}」缺少有效航路点信息，请补充后再下发`;
    }
    // 空中侦察：三架无人机航迹点数组（service.points1/2/3）至少一组有效
    if (type === 'air-recon') {
      const svc = param.service || {};
      const hasDronePoints = AIR_RECON_UAV_GROUPS.some((k) => hasValidCoords(svc[k]));
      if (!hasDronePoints) {
        return `空中侦察任务「${name}」无人机航路点为空，请在参数弹窗点击「获取航路点」补充后再下发`;
      }
    }
    if (STRIKE_ACTION_TYPES.includes(type) &&
        !hasValidCoords(param.points) &&
        !hasValidCoords(param.target?.location) &&
        !hasValidCoords(param.area)) {
      return `打击类任务「${name}」缺少有效目标点或目标区域信息，请补充后再下发`;
    }
  }
  return '';
};

// 核心下发逻辑（不管理 loading，供单发/批量复用）
const _dispatchVehicle = async (vehicleVid) => {
  if (!vehicleVid) {
    appendSystemMessage('下发失败: 未指定车辆');
    return { ok: false };
  }
  // 去掉 equipment: 前缀（如 equipment:XL01 → XL01）
  const cleanVid = String(vehicleVid).replace('equipment:', '');
  const invalidMsg = validateDispatchParams(cleanVid);
  if (invalidMsg) {
    appendSystemMessage(`下发中止 | vehicle=${cleanVid} | ${invalidMsg}`);
    return { ok: false };
  }
  const payload = { vehicle_vid: cleanVid };
  const result = await dispatchOperatorPlan(selectedPlanId.value, payload);
  if (result.ok) {
    const data = result.data?.data || {};
    appendSystemMessage(`行动序列已下发 | vehicle=${data.vehicle_vid || vehicleVid} | topic=${data.topic || ''} | tid=${data.mission_tid || ''}`);
    // 记录本次发布 tid，等待车辆 task_received_status 确认后显示"方案已收到"
    if (data.mission_tid) {
      publishAckTid.value = data.mission_tid;
      publishAckReceived.value = false;
      taskExecutedSinceAck = false;
    }
  } else {
    appendSystemMessage('下发失败: ' + (result.data?.message || result.error || '未知错误'));
  }
  return result;
};

const doDispatchActive = async (vehicleVid) => {
  controlLoading.value = true;
  try {
    await _dispatchVehicle(vehicleVid);
  } finally {
    controlLoading.value = false;
  }
};

const confirmDispatchVehicleSelection = async () => {
  showDispatchVehicleDialog.value = false;
  const vids = selectedDispatchVids.value;
  if (vids.length === 0) return;
  controlLoading.value = true;
  try {
    await Promise.all(vids.map((vid) => _dispatchVehicle(vid)));
  } finally {
    controlLoading.value = false;
    selectedDispatchVids.value = [];
  }
};

const cancelDispatchVehicleSelection = () => {
  showDispatchVehicleDialog.value = false;
  selectedDispatchVids.value = [];
};

const toggleDispatchSelectAll = (e) => {
  if (e.target.checked) {
    selectedDispatchVids.value = getAllVehicles().map((v) => v.vid);
  } else {
    selectedDispatchVids.value = [];
  }
};

/* ---------- 依赖连线重算 ---------- */
// bump 此值即触发所有 getLinePath 重新读取真实 DOM 位置
const layoutTick = ref(0);
// CSS 选择器转义（vid / action_id 可能含特殊字符）
const cssEscape = (s) => {
  const str = String(s ?? '');
  return window.CSS && CSS.escape ? CSS.escape(str) : str.replace(/["\\\]\[#.:]/g, '\\$&');
};
const recomputeLines = () => {
  nextTick(() => {
    // 双 rAF：确保卡片布局、字体、跑马灯测量都已落定再读位置
    requestAnimationFrame(() => requestAnimationFrame(() => { layoutTick.value++; }));
  });
};

/* ---------- 卡片尺寸观察：内容变高时让外框自适应 ---------- */
// 卡片是绝对定位，内容变高（航路点/状态徽标出现、字体加载）不会撑开列容器，
// 导致卡片超出车辆卡片边框。观察每个卡片的尺寸变化，触发偏移重算即可让外框适配。
let cardsResizeObserver = null;
const setupCardsResizeObserver = () => {
  if (cardsResizeObserver) cardsResizeObserver.disconnect();
  if (typeof ResizeObserver === 'undefined') return;
  cardsResizeObserver = new ResizeObserver(() => { layoutTick.value++; });
  document.querySelectorAll('.as-action-card').forEach((el) => cardsResizeObserver.observe(el));
};

/* ---------- 跑马灯溢出检测 ---------- */
const updateMarqueeStates = () => {
  nextTick(() => {
    document.querySelectorAll('.as-action-card .marquee-text').forEach((el) => {
      const track = el.parentElement;
      if (!track) return;
      const overflow = el.scrollWidth > track.clientWidth;
      if (overflow) {
        el.classList.add('marquee-active');
        track.style.setProperty('--track-width', `${track.clientWidth}px`);
      } else {
        el.classList.remove('marquee-active');
        track.style.removeProperty('--track-width');
      }
    });
    // 跑马灯测量会影响卡片宽度，测完后重算连线
    recomputeLines();
    // 卡片重渲染后重新挂尺寸观察，外框随内容自适应
    setupCardsResizeObserver();
  });
};

watch(selectedPlan, () => {
  updateMarqueeStates();
});

// 全部行动完成后，自动重置控制按钮状态
watch(
  selectedPlan,
  (newPlan) => {
    if (!newPlan) return;
    const vehicles = newPlan.vehicle_summary || [];
    vehicles.forEach((v) => {
      if (getVehicleRuntimeState(v) !== 'ACTIVE') return;
      const actions = (v.stages || []).flatMap((s) => s.actions || []);
      if (actions.length > 0 && actions.every((a) => a.state === 'DONE')) {
        appendSystemMessage(`${v.vid?.replace('equipment:', '') || v.vid} 全部行动已完成`);
      }
    });
  },
  { deep: true }
);

// 切换到操控端行动序列视图时，重新加载可用车辆列表，并强制弹出车辆选择弹窗
watch(isControlMode, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    loadOnlineVehicles();
    selectedConnectedVehicleId.value = '';
    ensureVehicleSelected(true);
  }
});

// 在操控端选中方案且车辆列表为空时，也重新加载可用车辆，避免空状态漏掉新建按钮
watch([isControlMode, selectedPlanId], ([control, planId]) => {
  if (control && planId && onlineVehicles.value.length === 0) {
    loadOnlineVehicles();
  }
});

/* ---------- SSE 实时刷新（替代轮询） ---------- */
let eventSource = null;
// 一次 DS 导入/转发会触发多条 zenoh plan 变更通知（每个子资源一条），
// 逐条刷新会放大成 N 次列表+详情请求，这里按尾沿防抖合并为一次
let planRefreshDebounceTimer = null;
const schedulePlanRefresh = () => {
  if (planRefreshDebounceTimer) clearTimeout(planRefreshDebounceTimer);
  planRefreshDebounceTimer = setTimeout(() => {
    planRefreshDebounceTimer = null;
    loadPlans(true);
  }, 300);
};
const startPlanEventStream = () => {
  if (eventSource) return;
  eventSource = new EventSource('/api/v1/action-sequences/events');

  eventSource.addEventListener('action_sequence.plan.updated', (e) => {
    try {
      const data = JSON.parse(e.data);
      const planId = data.plan_id;
      // 自己点击 map-notify 引发的回弹：仅 last_click 字段变化，selectPlan 已拉过详情，跳过
      if (planId && planId === lastMapNotify.planId && Date.now() - lastMapNotify.at < 3000) {
        return;
      }
      console.log('[ActionSequencePanel] plan updated via SSE:', planId);
      // loadPlans 刷新列表后会对选中 plan 补一次详情刷新，这里不再重复 refreshDetail
      schedulePlanRefresh();
    } catch (err) {
      console.warn('[ActionSequencePanel] parse SSE plan.updated failed:', err);
    }
  });

  eventSource.addEventListener('action_sequence.plan.count_changed', (e) => {
    try {
      const data = JSON.parse(e.data);
      console.log('[ActionSequencePanel] plan count changed via SSE:', data);
      // 新增/删除 plan 时刷新列表；如果删除的是当前选中 plan，清空选中
      schedulePlanRefresh();
      if (data.operation === 'delete' && selectedPlanId.value === data.plan_id) {
        selectedPlanId.value = null;
        selectedPlan.value = null;
      }
    } catch (err) {
      console.warn('[ActionSequencePanel] parse SSE plan.count_changed failed:', err);
    }
  });

  // 车辆任务接收确认（zenoh task_received_status）：与最近发布的 tid 匹配则显示"方案已收到"
  eventSource.addEventListener('action_sequence.task_received', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (publishAckTid.value != null && Number(data.tid) === Number(publishAckTid.value)) {
        publishAckReceived.value = true;
        taskExecutedSinceAck = false;
        appendSystemMessage(`车辆已接收任务 | tid=${data.tid} | vehicle=${data.vehicle_id || ''}`);
      }
    } catch (err) {
      console.warn('[ActionSequencePanel] parse SSE task_received failed:', err);
    }
  });

  eventSource.onerror = (err) => {
    console.warn('[ActionSequencePanel] SSE connection error:', err);
    // EventSource 会自动重连，无需手动处理
  };
};

const stopPlanEventStream = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (planRefreshDebounceTimer) {
    clearTimeout(planRefreshDebounceTimer);
    planRefreshDebounceTimer = null;
  }
};

// 保留原轮询接口用于兼容（编辑弹窗等场景临时停止/恢复）
const startAutoRefresh = () => {
  startPlanEventStream();
};
const stopAutoRefresh = () => {
  stopPlanEventStream();
};

/* ---------- 生命周期 ---------- */
const onWindowResize = () => recomputeLines();

/* ---------- 车辆连接初始化 ---------- */
const initConnectedVehicle = async () => {
  if (!isControlMode.value) return;

  try {
    // 1. 查询当前登录用户
    const userResult = await fetchCurrentUser();
    if (!userResult.ok || !userResult.data?.connected_vehicle_id) {
      isVehicleConnected.value = false;
      appendSystemMessage('未连接车辆，无法显示行动序列');
      return;
    }

    connectedVehicleId.value = userResult.data.connected_vehicle_id;

    // 2. 从操控席已连接车辆列表中查询车辆类型
    const vehiclesResult = await fetchOperatorConnectedVehicles();
    if (vehiclesResult.ok && vehiclesResult.data?.items) {
      const vehicle = vehiclesResult.data.items.find(
        (v) => String(v.vid || '').replace('equipment:', '') === String(connectedVehicleId.value).replace('equipment:', '')
      );
      if (vehicle && vehicle.resource_type) {
        connectedVehicleType.value = vehicle.resource_type;
        isVehicleConnected.value = true;
        appendSystemMessage(`已连接车辆：${connectedVehicleId.value} (${connectedVehicleType.value})`);
      } else {
        isVehicleConnected.value = false;
        appendSystemMessage('无法获取车辆类型，无法显示行动序列');
      }
    } else {
      isVehicleConnected.value = false;
      appendSystemMessage('无法获取车辆列表，无法显示行动序列');
    }
  } catch (err) {
    isVehicleConnected.value = false;
    appendSystemMessage('初始化车辆连接失败：' + (err.message || err));
  }
};

onMounted(async () => {
  await initConnectedVehicle();
  loadOnlineVehicles();
  loadPlans();
  updateMarqueeStates();
  startPlanEventStream();
  window.addEventListener('resize', onWindowResize);
  // 操控端行动序列视图：进入时强制弹出车辆选择框
  if (isControlMode.value) {
    selectedConnectedVehicleId.value = '';
    ensureVehicleSelected(true);
  }
});

/* ---------- 操控端车辆选择 ---------- */
const ensureVehicleSelected = async (force = false) => {
  if (!isControlMode.value) return;
  const result = await fetchOperatorConnectedVehicles();
  if (!result.ok) {
    console.warn('[ActionSequencePanel] fetch connected vehicles failed:', result.error);
    return;
  }
  connectedVehicles.value = result.data.items || [];
  // 默认行为：跟随后端已选状态；force=true 时忽略后端已选状态，强制弹窗
  if (!force) {
    selectedConnectedVehicleId.value = result.data.selected || '';
  }
  // 未选中车辆时弹出选择框
  if (!selectedConnectedVehicleId.value && connectedVehicles.value.length > 0) {
    showVehicleSelectDialog.value = true;
  }
};

const onConfirmSelectVehicle = async () => {
  if (!selectedConnectedVehicleId.value) return;
  selectingVehicle.value = true;
  const result = await selectOperatorVehicle(selectedConnectedVehicleId.value);
  selectingVehicle.value = false;
  if (result.ok) {
    showVehicleSelectDialog.value = false;
    
    // 更新 connectedVehicleId 和 connectedVehicleType，触发任务列表过滤
    connectedVehicleId.value = selectedConnectedVehicleId.value;
    const selectedVehicle = connectedVehicles.value.find(
      (v) => v.vid === selectedConnectedVehicleId.value
    );
    if (selectedVehicle && selectedVehicle.resource_type) {
      connectedVehicleType.value = selectedVehicle.resource_type;
      isVehicleConnected.value = true;
      appendSystemMessage(`已选择车辆 ${selectedConnectedVehicleId.value} 并订阅反馈`);
      // 重新加载任务列表，应用过滤
      loadPlans();
    } else {
      isVehicleConnected.value = false;
      appendSystemMessage('无法获取车辆类型，无法显示行动序列');
    }
  } else {
    console.warn('[ActionSequencePanel] select vehicle failed:', result.error);
    alert(`选择车辆失败: ${result.error || '未知错误'}`);
  }
};

const onCancelSelectVehicle = () => {
  showVehicleSelectDialog.value = false;
};

onUnmounted(() => {
  stopAutoRefresh();
  window.removeEventListener('resize', onWindowResize);
  if (cardsResizeObserver) cardsResizeObserver.disconnect();
});
</script>

<style scoped>
.action-sequence-shell {
  --as-border: rgba(0, 208, 188, 0.35);
  --as-border-soft: rgba(0, 208, 188, 0.22);
  --as-bg: rgba(1, 16, 22, 0.84);
  --as-text: #f1feff;
  --as-accent: #00dec8;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 0.8rem;
  font-size: 14px;
  line-height: 1.6;
  color: var(--as-text);
  overflow: hidden;
}

/* 头部 */
.action-sequence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-shrink: 0;
  padding: 0.2rem 0.1rem;
}

.action-sequence-title {
  font-size: 1.22rem;
  font-weight: 800;
  color: #f7fdff;
  margin: 0;
  letter-spacing: 0.01em;
}

.action-sequence-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.as-btn {
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

.as-btn:hover:not(:disabled) {
  border-color: rgba(0, 222, 200, 0.55);
  box-shadow: 0 0 0 3px rgba(0, 222, 200, 0.12), 0 4px 14px rgba(0, 222, 200, 0.08);
  transform: translateY(-1px);
}

.as-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.as-btn.primary {
  border-color: rgba(0, 208, 188, 0.4);
  background: linear-gradient(180deg, rgba(0, 110, 116, 0.44), rgba(0, 56, 58, 0.96));
}

.as-btn.primary:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(0, 130, 136, 0.54), rgba(0, 66, 68, 1));
}

.as-btn.warn {
  border-color: rgba(229, 168, 11, 0.4);
  background: linear-gradient(180deg, rgba(229, 168, 11, 0.35), rgba(120, 80, 0, 0.9));
}

.as-btn.warn:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(229, 168, 11, 0.5), rgba(140, 95, 0, 1));
}

.as-btn.mini {
  min-height: 26px;
  padding: 0 0.6rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
}

.as-btn.danger {
  border-color: rgba(239, 68, 68, 0.4);
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.35), rgba(120, 20, 20, 0.9));
}

.as-btn.danger:hover:not(:disabled) {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.5), rgba(140, 30, 30, 1));
}

/* 状态标签（如已完成） */
.as-state-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.08rem 0.5rem;
  font-weight: 700;
  font-size: 0.72rem;
  min-height: 26px;
}
.as-state-badge.done {
  background: rgba(34, 197, 94, 0.18);
  color: #86efac;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

/* 主内容布局 */
.action-sequence-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 0.8rem;
  overflow: hidden;
}

/* 左侧方案列表 */
.as-plan-list {
  width: 240px;
  flex-shrink: 0;
  border-radius: 12px;
  border: 1px solid var(--as-border-soft);
  background: rgba(0, 16, 22, 0.68);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.as-plan-list-title {
  font-size: 1rem;
  font-weight: 800;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
  color: #eefcff;
}

.as-plan-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.as-plan-item {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.1);
  background: rgba(6, 20, 26, 0.6);
  padding: 0.6rem 0.75rem;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease;
}

.as-plan-item:hover {
  border-color: rgba(0, 222, 200, 0.3);
  background: rgba(6, 24, 30, 0.8);
}

.as-plan-item.active {
  border-color: rgba(0, 222, 200, 0.45);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.08), rgba(0, 49, 72, 0.05));
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.1);
}

.as-plan-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: #f7fdff;
  margin-bottom: 0.25rem;
}

.as-plan-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
}

.as-plan-state {
  border-radius: 999px;
  padding: 0.08rem 0.4rem;
  font-weight: 700;
  font-size: 0.72rem;
}

.state-DRAFT { background: rgba(148, 163, 184, 0.18); color: #cbd5e1; }
.state-DRAFT_EDITING { background: rgba(59, 130, 246, 0.18); color: #93c5fd; }
.state-READY { background: rgba(0, 222, 200, 0.18); color: #b4fff8; }
.state-ACTIVE { background: rgba(34, 197, 94, 0.18); color: #86efac; }
.state-DONE { background: rgba(100, 116, 139, 0.18); color: #94a3b8; }
.state-null { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
.state-UNKNOWN { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }

.as-plan-count {
  color: rgba(226, 246, 248, 0.6);
}

/* 右侧详情面板 */
.as-detail-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  overflow-y: auto;
}

.as-detail-header {
  position: relative;
  border-radius: 12px;
  border: 1px solid var(--as-border-soft);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.05), rgba(0, 222, 200, 0.015)), rgba(0, 16, 22, 0.68);
  padding: 0.85rem 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

/* 发布状态提示（右下角）：收到车辆 task_received_status 确认后显示 */
.as-publish-ack {
  position: absolute;
  right: 1rem;
  bottom: 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #2ee6a8;
  border: 1px solid rgba(46, 230, 168, 0.45);
  background: rgba(46, 230, 168, 0.12);
  border-radius: 6px;
  padding: 0.15rem 0.55rem;
  pointer-events: none;
}

.as-detail-info {
  flex: 1;
  min-width: 0;
}

.as-detail-title {
  font-size: 1.08rem;
  font-weight: 800;
  color: #f7fdff;
  margin-bottom: 0.25rem;
}

.as-detail-desc {
  font-size: 0.88rem;
  color: rgba(226, 246, 248, 0.75);
  margin-bottom: 0.4rem;
  line-height: 1.5;
}

.as-detail-meta {
  display: flex;
  gap: 0.9rem;
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.65);
}

.as-detail-meta strong {
  color: var(--as-accent);
}

.as-control-bar {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* 车辆行动序列 — 卡片串联式 */
.as-vehicle-sequences {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.as-vehicle-sequences::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.as-vehicle-sequences::-webkit-scrollbar-track {
  background: rgba(0, 222, 200, 0.05);
  border-radius: 3px;
}

.as-vehicle-sequences::-webkit-scrollbar-thumb {
  background: rgba(0, 222, 200, 0.25);
  border-radius: 3px;
}

.as-vehicle-seq-title {
  font-size: 1.02rem;
  font-weight: 800;
  color: #eefcff;
  padding: 0.1rem 0.1rem 0.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.as-vehicle-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.as-vehicle-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.7rem 0.85rem;
}

.as-vehicle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.6rem;
}

.as-vehicle-controls {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.as-vehicle-name {
  font-weight: 800;
  font-size: 1rem;
  color: #f7fdff;
}

.as-vehicle-count {
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.65);
  background: rgba(0, 222, 200, 0.1);
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
}

/* 卡片容器 — 水平排列 */
.as-action-cards {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 44px;
  padding: 0.8rem;
  min-height: 120px;
  width: max-content;
}

/* 空行动序列：容器撑满卡片宽度，引导提示水平垂直居中 */
.as-action-cards-empty {
  width: 100%;
  align-items: center;
  justify-content: center;
}

/* 空行动序列占位提示（新建空方案只关联了车辆、尚无行动时） */
.as-empty-actions {
  color: rgba(180, 200, 200, 0.55);
  font-size: 0.85rem;
  padding: 0 0.4rem;
  white-space: nowrap;
}

.as-action-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}

.as-action-line {
  fill: none;
  stroke: #16e6cf;
  stroke-width: 1.5;
  stroke-linecap: round;
  opacity: 0.8;
}

.as-action-column {
  position: relative;
  width: 166px; /* 卡片 160 + margin 3*2 */
  flex-shrink: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.as-action-column.single-row {
  height: auto !important;
}

.as-action-column.single-row .as-action-card {
  position: relative !important;
  top: 0 !important;
  margin-bottom: 0;
}

/* 同列内垂直连接线 */
.as-card-connector-vertical {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  flex-shrink: 0;
  position: relative;
}

.as-connector-line-vertical {
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.4), rgba(0, 222, 200, 0.7), rgba(0, 222, 200, 0.4));
  position: relative;
}

.as-connector-line-vertical::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-top: 6px solid rgba(0, 222, 200, 0.7);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

/* 跨列水平连接线（依赖线已用 SVG，此处保留旧类名避免误删影响其它地方） */
.as-card-connector {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  flex-shrink: 0;
  position: relative;
}

.as-connector-line {
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, rgba(0, 222, 200, 0.4), rgba(0, 222, 200, 0.7), rgba(0, 222, 200, 0.4));
  position: relative;
}

.as-connector-line::after {
  content: '';
  position: absolute;
  right: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid rgba(0, 222, 200, 0.7);
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
}

/* 行动卡片 */
.as-action-card {
  flex-shrink: 0;
  width: 160px;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: linear-gradient(180deg, rgba(0, 222, 200, 0.08), rgba(0, 222, 200, 0.02));
  padding: 0.55rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  transition: box-shadow 180ms ease, border-color 180ms ease;
  cursor: default;
  margin: 3px; /* 给阴影留出溢出空间 */
  box-sizing: border-box;
}

.as-action-card:hover {
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.25), 0 6px 18px rgba(0, 222, 200, 0.15);
  border-color: rgba(0, 222, 200, 0.5);
}

/* 执行中 — 呼吸灯效果（box-shadow 限制在卡片 margin 内，避免被父容器 overflow 裁切） */
@keyframes breathe-active {
  0%, 100% {
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 14px rgba(59, 130, 246, 0.55), 0 0 28px rgba(59, 130, 246, 0.25);
    border-color: rgba(59, 130, 246, 0.75);
  }
}

.as-action-card.state-active {
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.04));
  animation: breathe-active 2s ease-in-out infinite;
}

.as-action-card.state-done {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(180deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02));
}

.as-action-card.state-paused {
  border-color: rgba(229, 168, 11, 0.4);
  background: linear-gradient(180deg, rgba(229, 168, 11, 0.08), rgba(229, 168, 11, 0.02));
}

.as-card-header {
  font-size: 0.92rem;
  font-weight: 800;
  color: #f7fdff;
  line-height: 1.35;
  min-height: 2.4em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 跑马灯 */
.marquee-text {
  display: inline-block;
  white-space: nowrap;
}

.as-action-card:hover .marquee-text.marquee-active {
  animation: marquee-scroll 5s linear infinite alternate;
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-100% + var(--track-width, 130px)));
  }
}

.as-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
  font-size: 0.72rem;
}

.as-card-stage {
  color: var(--as-accent);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  max-width: 84px;
}

.as-card-state {
  border-radius: 999px;
  padding: 0.06rem 0.35rem;
  font-weight: 700;
  font-size: 0.7rem;
  flex-shrink: 0;
  background: rgba(148, 163, 184, 0.18);
  color: #cbd5e1;
}

.as-action-card.state-active .as-card-state {
  background: rgba(59, 130, 246, 0.25);
  color: #93c5fd;
}

.as-action-card.state-done .as-card-state {
  background: rgba(34, 197, 94, 0.25);
  color: #86efac;
}

.as-action-card.state-paused .as-card-state {
  background: rgba(229, 168, 11, 0.25);
  color: #ffe28c;
}

.as-action-card.state-ready .as-card-state {
  background: rgba(0, 222, 200, 0.25);
  color: #b4fff8;
}

.as-card-body {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.15rem;
  font-size: 0.76rem;
  color: rgba(226, 246, 248, 0.7);
}

.as-card-seq {
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(0, 222, 200, 0.15);
  color: var(--as-accent);
  font-weight: 700;
  font-size: 0.65rem;
  flex-shrink: 0;
}

.as-card-waypoints,
.as-card-desc {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 空状态 / 加载 */
.as-loading, .as-empty, .as-empty-detail, .as-loading-detail {
  padding: 1rem;
  text-align: center;
  color: rgba(226, 246, 248, 0.6);
  font-size: 0.9rem;
}

.as-empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}

.as-empty-new-btn {
  margin-top: 0.2rem;
}

/* 车辆选择弹窗 */
.as-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-dialog {
  background: linear-gradient(180deg, rgba(0, 32, 40, 0.96), rgba(0, 16, 22, 0.98));
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 12px;
  min-width: 280px;
  max-width: 400px;
  color: var(--as-text);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.as-dialog-header {
  padding: 0.85rem 1rem;
  font-weight: 800;
  font-size: 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  color: #f7fdff;
}

.as-dialog-body {
  padding: 0.7rem 1rem;
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.as-dialog-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0;
  cursor: pointer;
  font-size: 0.9rem;
  transition: color 120ms ease;
}

.as-dialog-item:hover {
  color: #fff;
}

.as-dialog-item.offline {
  opacity: 0.6;
}

.as-dialog-item input[type='checkbox'],
.as-dialog-item input[type='radio'] {
  accent-color: var(--as-accent);
  width: 16px;
  height: 16px;
  cursor: pointer;
  flex-shrink: 0;
}

.as-dialog-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.as-dialog-empty {
  color: rgba(241, 254, 255, 0.6);
  font-size: 0.9rem;
  padding: 0.6rem 0;
  text-align: center;
}

.as-dialog-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(0, 222, 200, 0.06);
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 4px;
  color: var(--as-text);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}

.as-dialog-input:focus {
  border-color: rgba(0, 222, 200, 0.7);
}

/* 协同授权按钮：与刷新/新建同行，靠右 */
.as-coop-btn {
  margin-left: auto;
}

/* 协同授权弹窗：加宽容纳选项网格 */
.as-coop-dialog {
  max-width: 560px;
  width: 560px;
}

.as-coop-dialog .as-dialog-body {
  max-height: 420px;
  gap: 0.8rem;
}

.as-coop-label {
  font-weight: 700;
  font-size: 0.92rem;
  color: #f7fdff;
  margin-bottom: 0.3rem;
}

.as-coop-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 0.8rem;
}

.as-coop-option {
  padding: 0.25rem 0;
  font-size: 0.86rem;
}

.as-coop-select {
  width: 100%;
  padding: 8px 10px;
  background: rgba(0, 222, 200, 0.06);
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 4px;
  color: var(--as-text);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  cursor: pointer;
}

.as-coop-select:focus {
  border-color: rgba(0, 222, 200, 0.7);
}

.as-coop-select option {
  background: #02161c;
  color: var(--as-text);
}

@media (max-width: 900px) {
  .action-sequence-body {
    flex-direction: column;
  }
  .as-plan-list {
    width: 100%;
    max-height: 200px;
  }
}
</style>
