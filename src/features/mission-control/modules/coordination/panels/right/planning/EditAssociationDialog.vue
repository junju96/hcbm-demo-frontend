<template>
  <div v-if="visible" class="assoc-dialog-mask" @click.self="onClose">
    <div class="assoc-dialog">
      <!-- 标题栏 -->
      <div class="assoc-dialog-header">
        <div class="assoc-dialog-title">编辑关联关系</div>
        <button class="assoc-dialog-close" type="button" @click="onClose">关闭</button>
      </div>

      <!-- 主体：命令 + 任务 双栏 -->
      <div class="assoc-dialog-body">
        <!-- 关联命令 -->
        <div class="assoc-dialog-col">
          <div class="assoc-col-title">关联命令</div>
          <div class="assoc-card-list">
            <div
              v-for="cmd in commandList"
              :key="cmd.id"
              class="assoc-card"
              :class="{ selected: cmd.selected }"
              @click="toggleCommand(cmd.id)"
            >
              <div class="assoc-card-header">
                <span class="assoc-card-name">{{ cmd.name }}</span>
                <span class="assoc-card-badge" :class="cmd.selected ? 'selected' : 'selectable'">
                  {{ cmd.selected ? '已选择' : '可关联' }}
                </span>
              </div>
              <div class="assoc-card-title">{{ cmd.title }}</div>
              <div class="assoc-card-desc">{{ cmd.desc }}</div>
            </div>
          </div>
        </div>

        <!-- 关联任务 -->
        <div class="assoc-dialog-col">
          <div class="assoc-col-title">关联任务</div>
          <div class="assoc-card-list">
            <div
              v-for="task in taskList"
              :key="task.id"
              class="assoc-card"
              :class="{ selected: task.selected }"
              @click="toggleTask(task.id)"
            >
              <div class="assoc-card-header">
                <span class="assoc-card-name">{{ task.name }}</span>
                <span class="assoc-card-badge" :class="task.selected ? 'selected' : 'selectable'">
                  {{ task.selected ? '已选择' : task.status }}
                </span>
              </div>
              <div class="assoc-card-desc">{{ task.desc }}</div>
              <div class="assoc-card-source">来源命令：{{ task.source }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 关联资源 -->
      <div class="assoc-dialog-resources">
        <template v-if="resourceViewMode === 'pools'">
          <div class="assoc-col-title">关联资源</div>
          <div class="assoc-resources-hint">请选择资源表</div>
          <div class="assoc-resource-pool-list">
            <div
              v-for="pool in resourcePools"
              :key="pool.name"
              class="assoc-resource-pool"
              @click="onSelectPool(pool)"
            >
              <div class="assoc-pool-header">
                <span class="assoc-pool-name">{{ pool.name }}</span>
                <span class="assoc-pool-count">{{ pool.count }}项</span>
              </div>
              <div class="assoc-pool-desc">{{ pool.desc }}</div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="assoc-resource-list-header">
            <button class="planning-btn small" type="button" @click="onBackToPools">← 返回资源表</button>
            <div class="assoc-col-title">{{ currentPoolName }}</div>
            <span class="assoc-resource-selected-count">已选 {{ selectedResourceIds.length }} 项</span>
          </div>
          <div class="assoc-resource-list">
            <label
              v-for="res in currentPoolResources"
              :key="res.resource_id"
              class="assoc-resource-item"
              :class="{ selected: selectedResourceIds.includes(res.resource_id) }"
            >
              <input
                type="checkbox"
                :value="res.resource_id"
                :checked="selectedResourceIds.includes(res.resource_id)"
                @change="toggleResource(res.resource_id)"
              />
              <div class="assoc-resource-info">
                <span class="assoc-resource-name">{{ res.resource_name }}</span>
                <span class="assoc-resource-type">{{ res.resource_type }}</span>
              </div>
            </label>
          </div>
          <div class="assoc-resource-list-actions">
            <button class="planning-btn" type="button" @click="onBackToPools">取消</button>
            <button class="planning-btn primary" type="button" @click="onConfirmResources">确定</button>
          </div>
        </template>
      </div>

      <!-- 底部按钮（仅在资源池列表视图显示） -->
      <div v-if="resourceViewMode === 'pools'" class="assoc-dialog-footer">
        <button class="planning-btn" type="button" @click="onClose">取消</button>
        <button class="planning-btn primary" type="button" @click="onConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { resourceRecords, RESOURCE_TAGS } from '../../../data/commandDataModel';

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['update:visible', 'confirm']);

const commandList = ref([
  {
    id: 'CMD-20260401-001',
    name: '命令 1',
    title: '进攻战斗命令',
    desc: '要求在指定区域完成侦察确认',
    selected: true,
  },
  {
    id: 'CMD-20260401-002',
    name: '命令 2',
    title: '目标打击指令',
    desc: '要求围绕目标开展协同打击',
    selected: false,
  },
]);

const taskList = ref([
  {
    id: 'MISSION_20260511_001',
    name: '机动任务',
    desc: '利用隐蔽手段机动到B区域',
    source: '命令 1',
    status: '规划完成',
    selected: false,
  },
  {
    id: 'MISSION_20260511_002',
    name: '侦察任务',
    desc: '于18:00前查明A区域',
    source: '命令 1',
    status: '已选择',
    selected: true,
  },
  {
    id: 'MISSION_20260511_003',
    name: '返回基地',
    desc: '撤离战场并返回基地',
    source: '命令 1',
    status: '规划完成',
    selected: false,
  },
  {
    id: 'MISSION_20260511_004',
    name: '任务 4',
    desc: '引导打击',
    source: '命令 2',
    status: '规划中',
    selected: false,
  },
]);

const POOL_TAG_MAP = {
  '态势目标池': RESOURCE_TAGS.TS_TARGET,
  '装备资源池': RESOURCE_TAGS.EQUIPMENT,
  '火力资源池': RESOURCE_TAGS.FIREPOWER,
  '侦查资源池': RESOURCE_TAGS.RECON,
  '保障资源池': RESOURCE_TAGS.SUPPORT,
};

const POOL_NAME_MAP = Object.fromEntries(
  Object.entries(POOL_TAG_MAP).map(([name, tag]) => [tag, name])
);

const resourcePools = ref([
  { name: '态势目标池', count: 3, desc: '点击进入该资源表选择资源' },
  { name: '装备资源池', count: 4, desc: '点击进入该资源表选择资源' },
  { name: '火力资源池', count: 4, desc: '点击进入该资源表选择资源' },
  { name: '侦查资源池', count: 4, desc: '点击进入该资源表选择资源' },
  { name: '保障资源池', count: 4, desc: '点击进入该资源表选择资源' },
]);

// 资源选择视图
const resourceViewMode = ref('pools'); // 'pools' | 'resources'
const selectedPoolTag = ref('');
const selectedResourceIds = ref([]);

const currentPoolResources = computed(() => {
  if (!selectedPoolTag.value) return [];
  return resourceRecords.filter((r) => r.resource_tag === selectedPoolTag.value);
});

const currentPoolName = computed(() => POOL_NAME_MAP[selectedPoolTag.value] || '');

const toggleCommand = (id) => {
  const item = commandList.value.find((c) => c.id === id);
  if (item) item.selected = !item.selected;
};

const toggleTask = (id) => {
  const item = taskList.value.find((t) => t.id === id);
  if (item) item.selected = !item.selected;
};

const onSelectPool = (pool) => {
  selectedPoolTag.value = POOL_TAG_MAP[pool.name] || '';
  resourceViewMode.value = 'resources';
};

const onBackToPools = () => {
  resourceViewMode.value = 'pools';
  selectedPoolTag.value = '';
};

const toggleResource = (resourceId) => {
  if (selectedResourceIds.value.includes(resourceId)) {
    selectedResourceIds.value = selectedResourceIds.value.filter((id) => id !== resourceId);
  } else {
    selectedResourceIds.value.push(resourceId);
  }
};

const onConfirmResources = () => {
  resourceViewMode.value = 'pools';
};

const onClose = () => {
  emit('update:visible', false);
};

const onConfirm = () => {
  const selectedCommands = commandList.value.filter((c) => c.selected).map((c) => c.id);
  const selectedTasks = taskList.value.filter((t) => t.selected).map((t) => t.id);
  emit('confirm', { commandIds: selectedCommands, taskIds: selectedTasks });
  emit('update:visible', false);
};
</script>

<style scoped>
.assoc-dialog-mask {
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

.assoc-dialog {
  width: 100%;
  max-width: 900px;
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

/* 头部 */
.assoc-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
}

.assoc-dialog-title {
  color: #f1feff;
  font-size: 1.15rem;
  font-weight: 800;
}

.assoc-dialog-close {
  min-height: 32px;
  padding: 0 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
  font-size: 0.86rem;
}

/* 主体双栏 */
.assoc-dialog-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
}

.assoc-dialog-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.assoc-col-title {
  color: #f1feff;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.2rem;
}

.assoc-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.assoc-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.65rem 0.8rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.assoc-card:hover {
  border-color: rgba(0, 222, 200, 0.3);
  transform: translateY(-1px);
}

.assoc-card.selected {
  border-color: rgba(0, 222, 200, 0.45);
  background: rgba(0, 222, 200, 0.08);
  box-shadow: 0 0 0 1px rgba(0, 222, 200, 0.1);
}

.assoc-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.assoc-card-name {
  font-weight: 700;
  font-size: 0.98rem;
  color: #f1feff;
}

.assoc-card-badge {
  border-radius: 999px;
  padding: 0.14rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.assoc-card-badge.selected {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.assoc-card-badge.selectable {
  background: rgba(148, 163, 184, 0.15);
  color: rgba(226, 246, 248, 0.7);
}

.assoc-card-title {
  margin-top: 0.3rem;
  font-size: 0.88rem;
  color: rgba(226, 246, 248, 0.85);
}

.assoc-card-desc {
  margin-top: 0.2rem;
  font-size: 0.85rem;
  color: rgba(226, 246, 248, 0.65);
  line-height: 1.5;
}

.assoc-card-source {
  margin-top: 0.25rem;
  font-size: 0.84rem;
  color: rgba(226, 246, 248, 0.55);
}

/* 关联资源区 */
.assoc-dialog-resources {
  padding: 0.4rem 1rem 0.8rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}

.assoc-resources-hint {
  font-size: 0.9rem;
  color: rgba(226, 246, 248, 0.55);
  margin: 0.3rem 0 0.5rem;
}

.assoc-resource-pool-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.6rem;
}

/* 资源列表视图 */
.assoc-resource-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
  flex-wrap: wrap;
}

.assoc-resource-selected-count {
  font-size: 0.85rem;
  color: var(--planning-accent);
  font-weight: 700;
}

.assoc-resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.3rem;
}

.assoc-resource-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.assoc-resource-item:hover {
  border-color: rgba(0, 222, 200, 0.3);
}

.assoc-resource-item.selected {
  border-color: rgba(0, 222, 200, 0.4);
  background: rgba(0, 222, 200, 0.08);
}

.assoc-resource-item input[type="checkbox"] {
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
  transition: border-color 160ms ease, background 160ms ease;
}

.assoc-resource-item input[type="checkbox"]:checked {
  border-color: var(--planning-accent);
  background: var(--planning-accent);
}

.assoc-resource-item input[type="checkbox"]:checked::after {
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

.assoc-resource-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.assoc-resource-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #f1feff;
}

.assoc-resource-type {
  font-size: 0.8rem;
  color: rgba(226, 246, 248, 0.55);
}

.assoc-resource-list-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.7rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}

.assoc-resource-pool {
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.15);
  background: rgba(6, 20, 26, 0.7);
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease;
}

.assoc-resource-pool:hover {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.06);
}

.assoc-pool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.assoc-pool-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #f1feff;
}

.assoc-pool-count {
  font-size: 0.84rem;
  color: rgba(226, 246, 248, 0.7);
}

.assoc-pool-desc {
  margin-top: 0.25rem;
  font-size: 0.82rem;
  color: rgba(226, 246, 248, 0.55);
}

/* 底部按钮 */
.assoc-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.1);
}

.planning-btn {
  min-height: 38px;
  padding: 0 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
  font-size: 0.92rem;
  transition: border-color 160ms ease, background 160ms ease;
}

.planning-btn.primary {
  border-color: rgba(0, 222, 200, 0.35);
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.55) 0%, rgba(0, 130, 140, 0.55) 100%);
}

.planning-btn.primary:hover {
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.7) 0%, rgba(0, 130, 140, 0.7) 100%);
}

@media (max-width: 768px) {
  .assoc-dialog-body {
    grid-template-columns: 1fr;
  }
  .assoc-resource-pool-list {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
