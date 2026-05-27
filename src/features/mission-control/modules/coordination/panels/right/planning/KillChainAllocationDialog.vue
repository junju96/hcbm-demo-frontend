<template>
  <div v-if="visible" class="kc-alloc-mask" @click.self="onClose">
    <div class="kc-alloc-dialog">
      <!-- 标题栏 -->
      <div class="kc-alloc-header">
        <div class="kc-alloc-title-wrap">
          <div class="kc-alloc-title">目标分配</div>
          <div class="kc-alloc-subtitle">{{ entry?.operation }}·{{ entry?.target_names?.join('、') }}</div>
        </div>
        <button class="kc-alloc-close" type="button" @click="onClose">关闭</button>
      </div>

      <!-- 目标筛选标签 -->
      <div class="kc-alloc-filter-bar">
        <button
          v-for="tag in filterTags"
          :key="tag.key"
          class="kc-alloc-filter-tag"
          :class="{ active: activeFilter === tag.key }"
          type="button"
          @click="activeFilter = tag.key"
        >
          {{ tag.label }}
        </button>
      </div>

      <!-- 装备分配列表 -->
      <div class="kc-alloc-body">
        <div class="kc-alloc-equip-list">
          <div
            v-for="equip in displayedEquips"
            :key="equip.name"
            class="kc-alloc-equip-row"
          >
            <div class="kc-alloc-equip-name">{{ equip.name }}</div>
            <div class="kc-alloc-target-checks">
              <label
                v-for="target in entry?.target_names || []"
                :key="target"
                class="kc-alloc-check-label"
                :class="{ checked: isTargetChecked(equip.name, target) }"
              >
                <input
                  type="checkbox"
                  :checked="isTargetChecked(equip.name, target)"
                  @change="toggleTarget(equip.name, target)"
                />
                <span class="kc-alloc-check-text">{{ target }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="kc-alloc-footer">
        <button class="planning-btn" type="button" @click="onClose">取消</button>
        <button class="planning-btn primary" type="button" @click="onConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  entry: { type: Object, default: () => null },
});

const emit = defineEmits(['update:visible', 'confirm']);

// 目标筛选
const filterTags = computed(() => {
  const tags = [{ key: 'all', label: '全部' }];
  (props.entry?.target_names || []).forEach((t) => {
    tags.push({ key: t, label: t });
  });
  // 添加具体装备名称作为筛选标签
  const equipNames = new Set((props.entry?.executor_assignments || []).map((a) => a.executor_name));
  equipNames.forEach((name) => {
    tags.push({ key: `equip-${name}`, label: name });
  });
  return tags;
});

const activeFilter = ref('all');

// 从 entry 提取所有装备名称
const allEquipNames = computed(() => {
  const names = new Set();
  (props.entry?.executor_assignments || []).forEach((a) => {
    names.add(a.executor_name);
  });
  return Array.from(names);
});

// 根据筛选条件显示的装备
const displayedEquips = computed(() => {
  let equips = allEquipNames.value.map((name) => ({ name }));
  if (activeFilter.value !== 'all' && activeFilter.value !== 'equip') {
    // 筛选目标时，显示所有装备（只是高亮相关目标）
  }
  return equips;
});

// 分配状态：{ 装备名: Set(目标名) }
const allocationMap = ref(new Map());

// 初始化分配状态
const initAllocation = () => {
  const map = new Map();
  (props.entry?.executor_assignments || []).forEach((a) => {
    if (!map.has(a.executor_name)) {
      map.set(a.executor_name, new Set());
    }
    if (a.target_name) {
      // 将数字索引转换回目标名称
      const targetNames = props.entry?.target_names || [];
      const idx = parseInt(a.target_name, 10);
      if (idx >= 1 && idx <= targetNames.length) {
        map.get(a.executor_name).add(targetNames[idx - 1]);
      } else {
        map.get(a.executor_name).add(a.target_name);
      }
    }
  });
  allocationMap.value = map;
};

watch(() => props.entry, initAllocation, { immediate: true });
watch(() => props.visible, (v) => {
  if (v) initAllocation();
});

const isTargetChecked = (equipName, targetName) => {
  return allocationMap.value.get(equipName)?.has(targetName) || false;
};

const toggleTarget = (equipName, targetName) => {
  const set = allocationMap.value.get(equipName);
  if (!set) {
    const newSet = new Set([targetName]);
    allocationMap.value.set(equipName, newSet);
    return;
  }
  if (set.has(targetName)) {
    set.delete(targetName);
  } else {
    set.add(targetName);
  }
};

const onClose = () => {
  emit('update:visible', false);
};

const onConfirm = () => {
  // 构建新的 executor_assignments 数组
  const assignments = [];
  const targetNames = props.entry?.target_names || [];
  allocationMap.value.forEach((targets, equipName) => {
    if (targets.size === 0) {
      // 保留装备但未分配目标
      assignments.push({
        executor_name: equipName,
        target_name: '',
        locked: false,
      });
    } else {
      targets.forEach((targetName) => {
        const idx = targetNames.indexOf(targetName);
        assignments.push({
          executor_name: equipName,
          target_name: idx >= 0 ? String(idx + 1) : targetName,
          locked: false,
        });
      });
    }
  });
  emit('confirm', {
    entry_id: props.entry?.entry_id,
    executor_assignments: assignments,
  });
  emit('update:visible', false);
};
</script>

<style scoped>
.kc-alloc-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  padding: 1rem;
}

.kc-alloc-dialog {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  border-radius: 16px;
  border: 1px solid rgba(0, 208, 188, 0.4);
  background:
    linear-gradient(180deg, rgba(0, 213, 192, 0.06), rgba(0, 49, 72, 0.01)),
    rgba(1, 16, 22, 0.96);
  box-shadow: inset 0 0 0 1px rgba(0, 222, 200, 0.05), 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.kc-alloc-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.9rem 1rem 0.6rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
}

.kc-alloc-title-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.kc-alloc-title {
  color: #f1feff;
  font-size: 1.15rem;
  font-weight: 800;
}

.kc-alloc-subtitle {
  color: rgba(196, 243, 248, 0.75);
  font-size: 0.88rem;
}

.kc-alloc-close {
  min-height: 32px;
  padding: 0 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.22);
  background: linear-gradient(180deg, rgba(90, 99, 103, 0.88) 0%, rgba(74, 82, 87, 0.88) 100%);
  color: #f8fafc;
  cursor: pointer;
  font-size: 0.86rem;
  flex-shrink: 0;
}

/* 筛选标签 */
.kc-alloc-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.6rem 1rem 0.3rem;
}

.kc-alloc-filter-tag {
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(0, 16, 22, 0.5);
  color: rgba(196, 243, 248, 0.75);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 160ms ease;
}

.kc-alloc-filter-tag:hover {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.08);
}

.kc-alloc-filter-tag.active {
  border-color: rgba(0, 222, 200, 0.45);
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.3), rgba(0, 100, 108, 0.2));
  color: #00e5ca;
}

/* 主体 */
.kc-alloc-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}

.kc-alloc-equip-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.kc-alloc-equip-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(0, 222, 200, 0.12);
  background: rgba(6, 20, 26, 0.6);
  transition: border-color 160ms ease, background 160ms ease;
}

.kc-alloc-equip-row:hover {
  border-color: rgba(0, 222, 200, 0.25);
  background: rgba(6, 24, 30, 0.75);
}

.kc-alloc-equip-name {
  min-width: 70px;
  font-weight: 800;
  font-size: 0.95rem;
  color: #f7fdff;
}

.kc-alloc-target-checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  flex: 1;
}

.kc-alloc-check-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(0, 16, 22, 0.4);
  color: rgba(196, 243, 248, 0.7);
  font-size: 0.86rem;
  cursor: pointer;
  transition: all 160ms ease;
}

.kc-alloc-check-label:hover {
  border-color: rgba(0, 222, 200, 0.35);
  background: rgba(0, 222, 200, 0.06);
}

.kc-alloc-check-label.checked {
  border-color: rgba(0, 222, 200, 0.45);
  background: rgba(0, 222, 200, 0.12);
  color: #00e5ca;
}

.kc-alloc-check-label input[type="checkbox"] {
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
  transition: border-color 160ms ease, background 160ms ease;
}

.kc-alloc-check-label input[type="checkbox"]:checked {
  border-color: var(--planning-accent);
  background: var(--planning-accent);
}

.kc-alloc-check-label input[type="checkbox"]:checked::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 0px;
  width: 5px;
  height: 10px;
  border: solid rgba(1, 16, 22, 0.96);
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.kc-alloc-check-text {
  font-weight: 600;
}

/* 底部 */
.kc-alloc-footer {
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
  font-weight: 600;
  transition: border-color 160ms ease, background 160ms ease;
}

.planning-btn:hover {
  border-color: rgba(0, 222, 200, 0.4);
}

.planning-btn.primary {
  border-color: rgba(0, 222, 200, 0.35);
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.55) 0%, rgba(0, 130, 140, 0.55) 100%);
}

.planning-btn.primary:hover {
  background: linear-gradient(180deg, rgba(0, 173, 181, 0.7) 0%, rgba(0, 130, 140, 0.7) 100%);
}
</style>
