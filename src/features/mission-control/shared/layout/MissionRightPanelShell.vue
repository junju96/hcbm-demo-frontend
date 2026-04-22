<template>
  <div class="mission-right-panel-shell">
    <slot />
  </div>
</template>

<style scoped>
.mission-right-panel-shell {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  gap: var(--mission-right-panel-gap, 0.85rem);
}
</style>
