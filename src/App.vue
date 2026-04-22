<template>
  <component :is="currentMissionView" />
  <MissionNotificationCenter
    ref="notificationCenterRef"
    @navigate-target="handleNotificationNavigate"
    @history-visibility-change="syncNotificationCenterVisibility"
  />
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { currentDemoRoute } from './router';
import { emitMissionCommand } from './features/mission-control/shell/missionCommandBus';
import MissionControlView from './views/MissionControl.vue';
import MissionControlMainView from './views/MissionControlMain.vue';
import MissionControlAuxView from './views/MissionControlAux.vue';
import MissionNotificationCenter from './features/mission-control/shared/notifications/MissionNotificationCenter.vue';
import {
  checkNotificationServiceHealth,
  registerNotificationCenterController,
  syncNotificationCenterVisibility,
  toggleNotificationCenter,
} from './utils/notificationCenter';

const notificationCenterRef = ref(null);

const currentMissionView = computed(() => {
  if (currentDemoRoute.value.routeRole === 'main') {
    return MissionControlMainView;
  }
  if (currentDemoRoute.value.routeRole === 'aux') {
    return MissionControlAuxView;
  }
  return MissionControlView;
});

const handleNotificationNavigate = (target) => {
  if (!target) {
    return;
  }

  emitMissionCommand({
    ...(target.command || {}),
    route: target.target_route || target.command?.route || '/mission-control',
    moduleId: target.target_module || target.target_tab || target.command?.moduleId,
    panelId: target.target_panel || target.command?.panelId,
    targetId: target.target_target_id || target.command?.targetId,
    actionId: target.command?.actionId,
    params: target.command?.params,
    appendToChat: target.command?.appendToChat,
    source: 'notification-center',
  });
};

const handleGlobalNotificationShortcut = async (event) => {
  const key = String(event.key || '').toLowerCase();
  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === '.') {
    event.preventDefault();
    await toggleNotificationCenter();
  }
};

onMounted(async () => {
  await nextTick();
  registerNotificationCenterController(notificationCenterRef.value);
  await checkNotificationServiceHealth();
  window.addEventListener('keydown', handleGlobalNotificationShortcut);
});

onUnmounted(() => {
  registerNotificationCenterController(null);
  window.removeEventListener('keydown', handleGlobalNotificationShortcut);
});
</script>
