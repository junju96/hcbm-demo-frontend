<template>
  <div class="area-editor">
    <label class="apd-field">
      <span>区域选择</span>
      <select :value="areaId" @change="onAreaChange">
        <option value="">-- 请选择区域 --</option>
        <option v-for="area in areaList" :key="area.resource_id" :value="area.resource_id">
          {{ area.title || area.resource_name || area.resource_id }}
        </option>
      </select>
    </label>

    <div class="ae-list-head">
      <span class="apd-section-title sub">区域点列表</span>
      <span class="ae-count">{{ modelValue.length }} 个点</span>
    </div>

    <div class="ae-table">
      <div class="ae-row ae-row-head">
        <span class="ae-idx">#</span>
        <span>经度</span>
        <span>纬度</span>
        <span>高度</span>
        <span class="ae-op"></span>
      </div>
      <div v-for="(pt, idx) in modelValue" :key="idx" class="ae-row">
        <span class="ae-idx">{{ idx + 1 }}</span>
        <input v-model.number="pt.lon" type="number" step="0.000001" placeholder="经度" />
        <input v-model.number="pt.lat" type="number" step="0.000001" placeholder="纬度" />
        <input v-model.number="pt.alt" type="number" step="0.1" placeholder="高度" />
        <button
          class="ae-del"
          type="button"
          title="删除该点"
          :disabled="modelValue.length <= 1"
          @click="removePoint(idx)"
        >
          ×
        </button>
      </div>
    </div>

    <button class="as-btn mini primary ae-add" type="button" @click="addPoint">+ 添加区域点</button>
  </div>
</template>

<script setup>
import { watch } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  areaId: { type: String, default: '' },
  areaList: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:modelValue', 'update:areaId']);

function defaultPoint() {
  return { lon: 0, lat: 0, alt: 0 };
}

function applyAreaFromList(selectedId) {
  const area = props.areaList.find((a) => a.resource_id === selectedId);
  if (area && Array.isArray(area.points)) {
    emit(
      'update:modelValue',
      area.points.map((pt) => ({
        lon: pt?.lon ?? 0,
        lat: pt?.lat ?? 0,
        alt: pt?.alt ?? 0,
      }))
    );
  }
}

function onAreaChange(event) {
  const selectedId = event.target.value;
  emit('update:areaId', selectedId);
  applyAreaFromList(selectedId);
}

function isZeroPoint(pt) {
  return !pt || (Number(pt.lon ?? 0) === 0 && Number(pt.lat ?? 0) === 0 && Number(pt.alt ?? 0) === 0);
}

watch(
  () => [props.areaId, props.areaList.length, props.modelValue.length],
  ([selectedId, listLength, modelLength], [prevSelectedId, prevListLength] = []) => {
    if (!listLength) return;
    const modelEmpty = !modelLength || props.modelValue.every(isZeroPoint);
    // 区域列表刚加载完成、或当前点列表为空/全 0 时，必须回填坐标
    if (modelEmpty || (selectedId && (!prevListLength || prevListLength === 0))) {
      const id = selectedId || props.areaList[0]?.resource_id || '';
      if (id) {
        emit('update:areaId', id);
        applyAreaFromList(id);
      }
      return;
    }
    // 仅当切换区域时才触发回填，避免每次 props 更新都覆盖用户手动输入
    if (selectedId && selectedId !== prevSelectedId) {
      applyAreaFromList(selectedId);
    }
  },
  { immediate: true }
);

function addPoint() {
  emit('update:modelValue', [...props.modelValue, defaultPoint()]);
}

function removePoint(idx) {
  if (props.modelValue.length > 1) {
    const next = [...props.modelValue];
    next.splice(idx, 1);
    emit('update:modelValue', next);
  }
}
</script>

<style scoped>
.area-editor {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.apd-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.2rem;
}

.apd-field > span:first-child {
  font-size: 0.75rem;
  color: rgba(226, 246, 248, 0.8);
}

.apd-field select {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 5px;
  padding: 0.35rem 0.5rem;
  color: #f1feff;
  font-size: 0.82rem;
}

.ae-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.3rem;
}

.apd-section-title {
  font-size: 0.78rem;
  color: rgba(0, 222, 200, 0.8);
}

.ae-count {
  font-size: 0.7rem;
  color: rgba(226, 246, 248, 0.5);
}

.ae-table {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 222, 200, 0.12);
  border-radius: 6px;
  overflow: hidden;
}

.ae-row {
  display: grid;
  grid-template-columns: 1.6rem 1fr 1fr 0.8fr 1.6rem;
  gap: 0.3rem;
  align-items: center;
  padding: 0.25rem 0.4rem;
}

.ae-row + .ae-row {
  border-top: 1px solid rgba(0, 222, 200, 0.08);
}

.ae-row-head {
  background: rgba(0, 222, 200, 0.06);
  font-size: 0.7rem;
  color: rgba(226, 246, 248, 0.6);
}

.ae-row-head span {
  padding: 0.1rem 0;
}

.ae-idx {
  text-align: center;
  font-size: 0.72rem;
  color: rgba(226, 246, 248, 0.55);
}

.ae-row input {
  min-width: 0;
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.25rem 0.3rem;
  color: #f1feff;
  font-size: 0.75rem;
}

.ae-row input:focus {
  outline: none;
  border-color: rgba(0, 222, 200, 0.55);
}

.ae-del {
  width: 1.4rem;
  height: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 4px;
  border: 1px solid rgba(239, 68, 68, 0.4);
  background: rgba(239, 68, 68, 0.18);
  color: #ffd9d9;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.ae-del:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.4);
}

.ae-del:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ae-add {
  align-self: flex-start;
}

.as-btn {
  background: rgba(0, 222, 200, 0.12);
  border: 1px solid rgba(0, 222, 200, 0.25);
  border-radius: 5px;
  color: #f1feff;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.as-btn.primary {
  background: rgba(0, 222, 200, 0.75);
  color: #001016;
}
</style>
