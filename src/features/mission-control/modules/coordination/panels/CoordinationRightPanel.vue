<template>
  <MissionRightPanelShell class="coord-right-shell">
    <div class="coord-placeholder">
      <div class="coord-placeholder-copy">
        当前右侧工作区先保留为空白界面，后续可以在这里接入对应子面板的表单、推演结果或资源明细。
      </div>
    </div>
  </MissionRightPanelShell>
</template>

<script setup>
import MissionRightPanelShell from '../../../shared/layout/MissionRightPanelShell.vue';

defineProps({
  moduleApi: {
    type: Object,
    required: true,
  },
  moduleManifest: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<style scoped>
.coord-right-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
}

.coord-placeholder {
  flex: 1 1 auto;
  min-height: 0;
  min-height: 420px;
  border-radius: 14px;
  border: 1px solid rgba(0, 222, 200, 0.24);
  background:
    linear-gradient(180deg, rgba(0, 173, 181, 0.08) 0%, rgba(4, 16, 20, 0.98) 100%),
    rgba(7, 19, 25, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.coord-placeholder-copy {
  max-width: 480px;
  text-align: center;
  color: rgba(226, 232, 240, 0.74);
  line-height: 1.8;
}
</style>
