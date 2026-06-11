<template>
  <div class="notification-layer">
    <transition-group name="toast-slide" tag="div" class="notification-stack">
      <article
        v-for="item in visibleNotifications"
        :key="item.id"
        class="notification-toast"
        :class="severityClass(item.type)"
        role="button"
        tabindex="0"
        @click="openHistory"
        @keydown.enter.prevent="openHistory"
      >
        <button class="notification-toast-close" type="button" aria-label="关闭通知" @click.stop="dismissToast(item.id)">
          &times;
        </button>
        <div class="notification-toast-head">
          <div class="notification-head-main">
            <span class="notification-tag">{{ typeLabel(item.type) }}</span>
            <span v-if="item.title" class="notification-title">{{ item.title }}</span>
          </div>
          <span class="notification-time">{{ formatTime(item.created_at) }}</span>
        </div>
        <div class="notification-message">{{ item.message }}</div>
        <div v-if="item.source" class="notification-source">来源：{{ item.source }}</div>
        <button
          v-if="canJump(item)"
          class="notification-jump-btn"
          type="button"
          @click.stop="jumpToTarget(item)"
        >
          跳转到“{{ resolveJumpLabel(item) }}”
        </button>
      </article>
    </transition-group>

    <transition name="center-prompt-fade">
      <div v-if="centerPrompt" class="center-prompt-backdrop">
        <section class="center-prompt" :class="severityClass(centerPrompt.type)" role="dialog" aria-modal="true" @click.stop>
          <div class="center-prompt-head">
            <div class="notification-head-main">
              <span class="notification-tag">{{ typeLabel(centerPrompt.type) }}</span>
              <span class="center-prompt-title">{{ centerPrompt.title }}</span>
            </div>
            <span class="notification-time">{{ formatTime(centerPrompt.created_at) }}</span>
          </div>
          <div class="center-prompt-message">{{ centerPrompt.message }}</div>
          <div v-if="centerPrompt.source" class="notification-source">来源：{{ centerPrompt.source }}</div>
          <div class="center-prompt-actions">
            <button class="center-prompt-btn primary" type="button" @click="respondCenterPrompt('ok')">
              {{ centerPrompt.allowstr }}
            </button>
            <button class="center-prompt-btn" type="button" @click="respondCenterPrompt('bad')">
              {{ centerPrompt.denystr }}
            </button>
          </div>
        </section>
      </div>
    </transition>

    <transition name="drawer-backdrop">
      <div v-if="historyOpen" class="notification-backdrop" @click="closeHistory"></div>
    </transition>

    <transition name="drawer-slide">
      <aside v-if="historyOpen" class="notification-drawer">
        <div class="notification-drawer-header">
          <div>
            <div class="notification-drawer-title">通知中心</div>
            <div class="notification-drawer-subtitle">{{ drawerSubtitle }}</div>
          </div>
          <div class="notification-drawer-actions">
            <button class="drawer-action-btn" type="button" @click="refreshHistory">刷新</button>
            <button class="drawer-action-btn" type="button" @click="clearHistory">清空</button>
            <button class="drawer-close-btn" type="button" aria-label="关闭通知中心" @click="closeHistory">&times;</button>
          </div>
        </div>

        <div class="notification-status-row">
          <span class="notification-status-dot" :class="{ online: streamOnline, offline: !streamOnline }"></span>
          <span>{{ streamOnline ? '消息服务在线' : '消息服务未连接' }}</span>
        </div>

        <div class="notification-history-list">
          <div v-if="historyList.length === 0" class="notification-empty">暂无通知消息</div>
          <article
            v-for="item in historyList"
            :key="`history-${item.id}`"
            class="notification-history-item"
            :class="severityClass(item.type)"
          >
            <div class="notification-history-head">
              <div class="notification-head-main">
                <span class="notification-tag">{{ typeLabel(item.type) }}</span>
                <span v-if="item.title" class="notification-title">{{ item.title }}</span>
              </div>
              <span class="notification-time">{{ formatTime(item.created_at) }}</span>
            </div>
            <div class="notification-message">{{ item.message }}</div>
            <div v-if="item.source" class="notification-source">来源：{{ item.source }}</div>
            <button
              v-if="canJump(item)"
              class="notification-jump-btn"
              type="button"
              @click.stop="jumpToTarget(item)"
            >
              跳转到“{{ resolveJumpLabel(item) }}”
            </button>
          </article>
        </div>
      </aside>
    </transition>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { joinURL, loadSystemSettings } from '../../../../config/systemSettings';

const emit = defineEmits(['navigate-target', 'history-visibility-change']);

const settings = loadSystemSettings();
const endpoints = settings.endpoints || {};
const historyList = ref([]);
const visibleNotifications = ref([]);
const historyOpen = ref(false);
const streamOnline = ref(false);
const localSequence = ref(0);
const centerPrompt = ref(null);

let eventSource = null;
let centerDismissTimer = null;
const dismissTimers = new Map();

const drawerSubtitle = computed(() => (streamOnline.value ? '' : '消息中心暂不可用，可查看当前本地提示'));

const getNotificationBaseURL = () => {
  if (settings.notificationBaseURL) {
    return settings.notificationBaseURL;
  }
  try {
    const url = new URL(settings.apiBaseURL || 'http://25.11.1.178:28600');
    url.port = '28004';
    return url.origin;
  } catch {
    return 'http://25.11.1.178:28004';
  }
};

const historyURL = computed(() => joinURL(getNotificationBaseURL(), endpoints.notificationHistory || '/notifications/history'));
const streamURL = computed(() => joinURL(getNotificationBaseURL(), endpoints.notificationStream || '/notifications/stream'));
const centerRespondURL = computed(() => joinURL(getNotificationBaseURL(), endpoints.notificationCenterRespond || '/notifications/center/respond'));

const severityClass = (type) => ({
  'is-message': type === 'message',
  'is-notify': type === 'notify',
  'is-emergency': type === 'emergency',
});

const typeLabel = (type) => {
  if (type === 'emergency') return '警告';
  if (type === 'notify') return '提醒';
  return '通知';
};

const formatTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
};

const resolveJumpLabel = (item) => {
  if (item?.target_route === '/system-settings') {
    return '系统设置';
  }
  if (item?.target_module || item?.target_panel) {
    return [item.target_module || item.target_tab, item.target_panel].filter(Boolean).join(' / ');
  }
  if (item?.target_target_id) {
    return item.target_target_id;
  }
  if (item?.command?.actionId) {
    return item.command.actionId;
  }
  return item?.target_tab || '目标页面';
};

const canJump = (item) => Boolean(
  item?.target_route
  || item?.target_tab
  || item?.target_module
  || item?.target_panel
  || item?.target_target_id
  || item?.command
);

const dismissToast = (id) => {
  visibleNotifications.value = visibleNotifications.value.filter((item) => item.id !== id);
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
};

const scheduleDismiss = (item) => {
  const timer = setTimeout(() => dismissToast(item.id), item.type === 'emergency' ? 12000 : 8000);
  dismissTimers.set(item.id, timer);
};

const pushNotification = (item) => {
  if (!item?.id || !item?.message) {
    return;
  }
  historyList.value = [item, ...historyList.value.filter((entry) => entry.id !== item.id)];
  visibleNotifications.value = [item, ...visibleNotifications.value.filter((entry) => entry.id !== item.id)].slice(0, 4);
  scheduleDismiss(item);
};

const normalizeCenterNotification = (payload = {}) => ({
  id: payload.id || `center-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  type: payload.type || 'emergency',
  title: payload.title || '提示',
  message: payload.message || '',
  allowstr: payload.allowstr || '确认',
  denystr: payload.denystr || '拒绝',
  source: payload.source || null,
  displaytime: Number(payload.displaytime) > 0 ? Number(payload.displaytime) : 5,
  created_at: payload.created_at || new Date().toISOString(),
});

const submitCenterPromptResponse = async (notificationId, result, user = 'demo-user') => {
  if (!notificationId) {
    return;
  }
  try {
    await fetch(centerRespondURL.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notificationId, result, user }),
    });
  } catch {
    // Ignore response submission failures in demo mode.
  }
};

const clearCenterTimer = () => {
  if (centerDismissTimer) {
    clearTimeout(centerDismissTimer);
    centerDismissTimer = null;
  }
};

const respondCenterPrompt = async (result) => {
  const currentPrompt = centerPrompt.value;
  clearCenterTimer();
  centerPrompt.value = null;
  await submitCenterPromptResponse(currentPrompt?.id, result);
};

const showCenterNotification = (payload = {}) => {
  const nextPrompt = normalizeCenterNotification(payload);
  if (!nextPrompt.message) {
    return;
  }
  clearCenterTimer();
  centerPrompt.value = nextPrompt;
  centerDismissTimer = setTimeout(() => {
    centerDismissTimer = null;
    void respondCenterPrompt('timeout');
  }, nextPrompt.displaytime * 1000);
};

const showLocalNotification = (payload = {}) => {
  localSequence.value += 1;
  pushNotification({
    id: `local-${Date.now()}-${localSequence.value}`,
    type: payload.type || 'notify',
    title: payload.title || null,
    message: payload.message || '',
    source: payload.source || 'demo-frontend',
    target_tab: payload.target_tab || null,
    target_route: payload.target_route || null,
    target_module: payload.target_module || null,
    target_panel: payload.target_panel || null,
    target_target_id: payload.target_target_id || null,
    command: payload.command || null,
    created_at: new Date().toISOString(),
  });
};

const refreshHistory = async () => {
  try {
    const response = await fetch(`${historyURL.value}?limit=80`);
    if (!response.ok) {
      streamOnline.value = false;
      return;
    }
    const payload = await response.json();
    streamOnline.value = true;
    historyList.value = Array.isArray(payload?.items) ? payload.items : [];
  } catch {
    streamOnline.value = false;
  }
};

const clearHistory = async () => {
  try {
    const response = await fetch(historyURL.value, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    historyList.value = [];
    visibleNotifications.value = [];
  } catch {
    showLocalNotification({
      type: 'emergency',
      title: '通知中心',
      message: '清空通知历史失败',
      source: 'notification-center',
    });
  }
};

const openHistory = async () => {
  historyOpen.value = true;
  await refreshHistory();
};

const closeHistory = () => {
  historyOpen.value = false;
};

const jumpToTarget = (item) => {
  emit('navigate-target', {
    target_tab: item.target_tab || null,
    target_route: item.target_route || null,
    target_module: item.target_module || null,
    target_panel: item.target_panel || null,
    target_target_id: item.target_target_id || null,
    command: item.command || null,
  });
};

const connectStream = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  eventSource = new EventSource(streamURL.value);
  eventSource.onopen = () => {
    streamOnline.value = true;
  };
  eventSource.onerror = () => {
    streamOnline.value = false;
  };
  eventSource.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data || '{}');
      if (!payload?.item) {
        return;
      }
      if (payload.event === 'notification') {
        pushNotification(payload.item);
        return;
      }
      if (payload.event === 'notification_center') {
        showCenterNotification(payload.item);
      }
    } catch {
      streamOnline.value = false;
    }
  };
};

watch(historyOpen, (value) => {
  emit('history-visibility-change', value);
});

defineExpose({
  openHistory,
  closeHistory,
  toggleHistory: async () => {
    if (historyOpen.value) {
      closeHistory();
      return;
    }
    await openHistory();
  },
  showLocalNotification,
  showCenterNotification,
});

onMounted(() => {
  void refreshHistory();
  connectStream();
});

onUnmounted(() => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  clearCenterTimer();
  dismissTimers.forEach((timer) => clearTimeout(timer));
  dismissTimers.clear();
});
</script>

<style scoped>
.notification-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 90;
}

.notification-stack {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  width: min(360px, calc(100vw - 2rem));
  pointer-events: none;
}

.notification-toast,
.notification-history-item,
.center-prompt,
.notification-drawer {
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: linear-gradient(180deg, rgba(7, 20, 25, 0.96) 0%, rgba(4, 13, 17, 0.96) 100%);
  color: #f8fafc;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

.notification-toast {
  position: relative;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  pointer-events: auto;
  cursor: pointer;
}

.notification-toast.is-notify,
.notification-history-item.is-notify,
.center-prompt.is-notify {
  border-color: rgba(245, 158, 11, 0.38);
}

.notification-toast.is-emergency,
.notification-history-item.is-emergency,
.center-prompt.is-emergency {
  border-color: rgba(248, 113, 113, 0.42);
}

.notification-toast-close,
.drawer-close-btn,
.drawer-action-btn,
.notification-jump-btn,
.center-prompt-btn {
  border: 1px solid rgba(0, 222, 200, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  cursor: pointer;
}

.notification-toast-close {
  position: absolute;
  top: 0.55rem;
  right: 0.6rem;
  width: 30px;
  height: 30px;
  border-radius: 999px;
}

.notification-toast-head,
.notification-history-head,
.center-prompt-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.notification-head-main {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
}

.notification-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 46px;
  min-height: 24px;
  padding: 0 0.45rem;
  border-radius: 999px;
  background: rgba(0, 222, 200, 0.14);
  font-size: 0.68rem;
  font-weight: 800;
}

.notification-title,
.center-prompt-title,
.notification-drawer-title {
  font-weight: 800;
}

.notification-time,
.notification-source,
.notification-drawer-subtitle,
.notification-status-row {
  color: rgba(226, 232, 240, 0.72);
  font-size: 0.74rem;
}

.notification-message,
.center-prompt-message {
  margin-top: 0.75rem;
  line-height: 1.6;
}

.notification-source {
  margin-top: 0.55rem;
}

.notification-jump-btn {
  margin-top: 0.8rem;
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 10px;
}

.center-prompt-backdrop,
.notification-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.38);
  pointer-events: auto;
}

.center-prompt-backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.center-prompt {
  width: min(460px, calc(100vw - 2rem));
  border-radius: 20px;
  padding: 1.15rem 1.2rem;
  pointer-events: auto;
}

.center-prompt-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.7rem;
}

.center-prompt-btn {
  min-width: 108px;
  min-height: 38px;
  padding: 0 0.9rem;
  border-radius: 12px;
}

.center-prompt-btn.primary {
  background: linear-gradient(135deg, rgba(0, 173, 181, 0.28) 0%, rgba(4, 34, 39, 0.96) 100%);
}

.notification-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(420px, calc(100vw - 1rem));
  height: 100%;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  pointer-events: auto;
}

.notification-drawer-header {
  display: flex;
  justify-content: space-between;
  gap: 0.9rem;
}

.notification-drawer-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.drawer-action-btn,
.drawer-close-btn {
  min-height: 34px;
  padding: 0 0.8rem;
  border-radius: 10px;
}

.drawer-close-btn {
  width: 34px;
  padding: 0;
}

.notification-status-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.notification-status-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #f87171;
}

.notification-status-dot.online {
  background: #34d399;
}

.notification-history-list {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.notification-history-item {
  border-radius: 16px;
  padding: 0.95rem 1rem;
}

.notification-empty {
  padding: 1rem;
  border-radius: 16px;
  color: rgba(226, 232, 240, 0.72);
  border: 1px dashed rgba(148, 163, 184, 0.24);
}

.toast-slide-enter-active,
.toast-slide-leave-active,
.drawer-slide-enter-active,
.drawer-slide-leave-active,
.drawer-backdrop-enter-active,
.drawer-backdrop-leave-active,
.center-prompt-fade-enter-active,
.center-prompt-fade-leave-active {
  transition: all 180ms ease;
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

.drawer-backdrop-enter-from,
.drawer-backdrop-leave-to,
.center-prompt-fade-enter-from,
.center-prompt-fade-leave-to {
  opacity: 0;
}
</style>
