<template>
  <div class="workspace-shell">
    <div class="workspace-eyebrow">{{ screenLabel }}</div>
    <div class="workspace-title">{{ titleText }}</div>
    <div class="workspace-text">{{ bodyText }}</div>
  </div>
</template>

<script setup>
import { computed, unref } from 'vue';

const props = defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});

const routeRole = computed(() => unref(props.moduleApi.workspace.routeRole));

const screenLabel = computed(() =>
  routeRole.value === 'main' ? 'Map Workspace' : 'Mission Workspace'
);

const titleText = computed(() =>
  routeRole.value === 'main' ? '地图工作区' : '任务工作区'
);

const bodyText = computed(() => {
  if (routeRole.value === 'main') {
    return '这里是主屏地图工作区占位，用来验证视频 Dock、左侧工作区和主屏布局是否协同正常。';
  }

  return `当前模块为“${props.moduleManifest?.label || '未命名模块'}”，这里保留任务工作区插槽位置，便于在接入真实地图或业务工作区前先验证整体壳层联动。`;
});

</script>

<style scoped>
.workspace-shell {
  height: 100%;
  min-height: 0;
  overflow: auto;
  border-radius: 16px;
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: linear-gradient(180deg, rgba(7, 20, 25, 0.94) 0%, rgba(4, 13, 17, 0.94) 100%);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.workspace-eyebrow {
  color: #00dec8;
  font-size: 0.76rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workspace-title,
.workspace-card-title {
  color: #f8fafc;
  font-weight: 700;
}

.workspace-title {
  font-size: 1.25rem;
}

.workspace-text {
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
}

.workspace-card {
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.18);
  background: rgba(10, 18, 22, 0.72);
  padding: 0.9rem;
}

.workspace-card-value {
  margin-top: 0.4rem;
  color: #00dec8;
  font-size: 1.1rem;
  font-weight: 800;
}
</style>
