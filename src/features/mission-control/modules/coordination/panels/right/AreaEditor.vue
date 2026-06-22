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
    <div class="apd-section-title sub">区域点列表</div>
    <div class="apd-route-table-head">
      <span>经度</span>
      <span>纬度</span>
      <span>高度</span>
      <span></span>
    </div>
    <div v-for="(pt, idx) in modelValue" :key="idx" class="apd-route-table-row" style="grid-template-columns: 1fr 1fr 1fr 0.6fr;">
      <input v-model.number="pt.lon" type="number" step="0.000001" placeholder="经度" />
      <input v-model.number="pt.lat" type="number" step="0.000001" placeholder="纬度" />
      <input v-model.number="pt.alt" type="number" step="0.1" placeholder="高度" />
      <button class="as-btn mini danger" type="button" :disabled="modelValue.length <= 1" @click="removePoint(idx)">删</button>
    </div>
    <button class="as-btn mini primary" type="button" @click="addPoint">+ 添加区域点</button>
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
  return { lon: 116.13, lat: 39.766, alt: 55 };
}

function applyAreaFromList(selectedId) {
  const area = props.areaList.find((a) => a.resource_id === selectedId);
  if (area && Array.isArray(area.polygon)) {
    emit(
      'update:modelValue',
      area.polygon.map((pt) => ({
        lon: pt?.lon ?? pt?.longitude ?? 0,
        lat: pt?.lat ?? pt?.latitude ?? 0,
        alt: pt?.alt ?? pt?.altitude ?? 0,
      }))
    );
  }
}

function onAreaChange(event) {
  const selectedId = event.target.value;
  emit('update:areaId', selectedId);
  applyAreaFromList(selectedId);
}

watch(
  () => [props.areaId, props.areaList.length],
  ([selectedId, listLength]) => {
    if (selectedId && listLength) {
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
  margin-bottom: 0.4rem;
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

.apd-section-title {
  font-size: 0.78rem;
  color: rgba(0, 222, 200, 0.8);
  margin-top: 0.3rem;
}

.apd-route-table-head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 0.6fr;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: rgba(226, 246, 248, 0.65);
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(0, 222, 200, 0.12);
}

.apd-route-table-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 0.6fr;
  gap: 0.3rem;
  align-items: center;
  padding: 0.2rem 0;
}

.apd-route-table-row input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 4px;
  padding: 0.25rem 0.3rem;
  color: #f1feff;
  font-size: 0.75rem;
}

.as-btn {
  background: rgba(0, 222, 200, 0.12);
  border: 1px solid rgba(0, 222, 200, 0.25);
  border-radius: 5px;
  color: #f1feff;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.as-btn.primary {
  background: rgba(0, 222, 200, 0.75);
  color: #001016;
}

.as-btn.danger {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.45);
}

.as-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
