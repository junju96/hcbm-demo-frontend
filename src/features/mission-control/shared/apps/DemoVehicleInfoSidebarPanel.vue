<template>
  <div class="vehicle-sidebar-body">
    <section
      v-for="vehicle in vehicles"
      :key="vehicle.id"
      class="vehicle-card"
    >
      <div class="vehicle-title">{{ vehicle.name }}</div>
      <div class="vehicle-row"><span>状态</span><span>{{ vehicle.status }}</span></div>
      <div class="vehicle-row"><span>油量</span><span>{{ vehicle.fuel }}</span></div>
      <div class="vehicle-row"><span>电量</span><span>{{ vehicle.battery }}</span></div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
});

const vehicles = computed(() => props.moduleApi.vehicle?.infos || []);
</script>

<style scoped>
.vehicle-sidebar-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  overflow-y: auto;
}

.vehicle-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(7, 19, 25, 0.88);
  padding: 0.95rem;
}

.vehicle-title {
  color: #00dec8;
  font-weight: 800;
}

.vehicle-row {
  margin-top: 0.55rem;
  display: flex;
  justify-content: space-between;
  gap: 0.6rem;
  color: rgba(226, 232, 240, 0.78);
}
</style>
