import { ref } from 'vue';
import { joinURL, loadSystemSettings } from '../config/systemSettings';

export const notificationCenterVisible = ref(false);
export const notificationServiceOnline = ref(null);

let notificationCenterController = null;
let lastHealthCheckAt = 0;
let lastHealthCheckResult = null;
const HEALTH_CACHE_MS = 5000;
const issueCooldownMap = new Map();

const cloneObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return { ...value };
};

const normalizeNotificationPayload = (payload = {}) => ({
  type: payload.type || 'notify',
  title: payload.title || null,
  message: payload.message || '',
  source: payload.source || 'demo-frontend',
  method: payload.method || null,
  target_tab: payload.target_tab || null,
  target_route: payload.target_route || null,
  target_module: payload.target_module || null,
  target_panel: payload.target_panel || null,
  target_target_id: payload.target_target_id || null,
  command: cloneObject(payload.command),
});

const normalizeCenterNotificationPayload = (payload = {}) => ({
  type: payload.type || 'emergency',
  title: payload.title || null,
  message: payload.message || '',
  allowstr: payload.allowstr || '确认',
  denystr: payload.denystr || '拒绝',
  source: payload.source || null,
  displaytime: Number(payload.displaytime) > 0 ? Number(payload.displaytime) : 5,
});

const getNotificationSettings = () => loadSystemSettings();

import { API_BASE_URL, NOTIFICATION_BASE_URL } from '../config/serverConfig.js';

const getNotificationBaseURL = () => {
  const settings = getNotificationSettings();
  if (settings.notificationBaseURL) {
    return settings.notificationBaseURL;
  }
  try {
    const url = new URL(settings.apiBaseURL || API_BASE_URL);
    url.port = '28004';
    return url.origin;
  } catch {
    return NOTIFICATION_BASE_URL;
  }
};

const getNotificationURL = (endpointKey, fallback) => {
  const settings = getNotificationSettings();
  return joinURL(getNotificationBaseURL(), settings.endpoints?.[endpointKey] || fallback);
};

const showLocalNotification = (payload) => {
  const finalPayload = normalizeNotificationPayload(payload);
  if (!finalPayload.message) {
    return;
  }
  notificationCenterController?.showLocalNotification?.(finalPayload);
};

const showCenterNotification = (payload) => {
  const finalPayload = normalizeCenterNotificationPayload(payload);
  if (!finalPayload.message || !finalPayload.title) {
    return;
  }
  notificationCenterController?.showCenterNotification?.(finalPayload);
};

export const registerNotificationCenterController = (controller) => {
  notificationCenterController = controller || null;
};

export const syncNotificationCenterVisibility = (visible) => {
  notificationCenterVisible.value = !!visible;
};

export const checkNotificationServiceHealth = async (force = false) => {
  const now = Date.now();
  if (!force && lastHealthCheckResult !== null && now - lastHealthCheckAt < HEALTH_CACHE_MS) {
    return lastHealthCheckResult;
  }

  lastHealthCheckAt = now;
  try {
    const response = await fetch(getNotificationURL('health', '/health'), { method: 'GET' });
    const payload = await response.json().catch(() => ({}));
    const online = response.ok && (payload?.status === 'ok' || payload?.ok === true || response.ok);
    notificationServiceOnline.value = online;
    lastHealthCheckResult = online;
    return online;
  } catch {
    notificationServiceOnline.value = false;
    lastHealthCheckResult = false;
    return false;
  }
};

export const openNotificationCenter = async () => {
  const online = await checkNotificationServiceHealth(true);
  if (!online) {
    showLocalNotification({
      type: 'notify',
      title: '消息中心',
      message: '消息中心暂不可用',
      source: 'notification-center',
    });
    return false;
  }
  await notificationCenterController?.openHistory?.();
  return true;
};

export const closeNotificationCenter = async () => {
  await notificationCenterController?.closeHistory?.();
};

export const toggleNotificationCenter = async () => {
  if (notificationCenterVisible.value) {
    await closeNotificationCenter();
    return;
  }
  await openNotificationCenter();
};

export const publishNotification = async (payload, options = {}) => {
  const finalPayload = normalizeNotificationPayload(payload);
  if (!finalPayload.message) {
    return { ok: false, skipped: true };
  }

  const online = await checkNotificationServiceHealth(options.forceHealthCheck === true);
  if (!online) {
    if (options.localFallback !== false) {
      showLocalNotification(finalPayload);
    }
    return { ok: false, offline: true };
  }

  try {
    const response = await fetch(getNotificationURL('notificationPublish', '/notifications/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: finalPayload.type,
        title: finalPayload.title,
        message: finalPayload.message,
        source: finalPayload.source,
        method: finalPayload.method,
        target_tab: finalPayload.target_tab,
        target_route: finalPayload.target_route,
        target_module: finalPayload.target_module,
        target_panel: finalPayload.target_panel,
        target_target_id: finalPayload.target_target_id,
        command: finalPayload.command,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.detail || `HTTP ${response.status}`);
    }
    return result;
  } catch {
    notificationServiceOnline.value = false;
    lastHealthCheckResult = false;
    if (options.localFallback !== false) {
      showLocalNotification(finalPayload);
    }
    return { ok: false, offline: true };
  }
};

export const publishCenterNotification = async (payload, options = {}) => {
  const finalPayload = normalizeCenterNotificationPayload(payload);
  if (!finalPayload.message || !finalPayload.title) {
    return { ok: false, skipped: true };
  }

  const online = await checkNotificationServiceHealth(options.forceHealthCheck === true);
  if (!online) {
    if (options.localFallback !== false) {
      showCenterNotification(finalPayload);
    }
    return { ok: false, offline: true };
  }

  try {
    const response = await fetch(getNotificationURL('notificationCenter', '/notifications/center'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalPayload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result?.detail || `HTTP ${response.status}`);
    }
    return result;
  } catch {
    notificationServiceOnline.value = false;
    lastHealthCheckResult = false;
    if (options.localFallback !== false) {
      showCenterNotification(finalPayload);
    }
    return { ok: false, offline: true };
  }
};

export const reportInterfaceIssue = async ({
  title,
  message,
  source,
  type = 'notify',
  cooldownKey,
  cooldownMs = 60000,
}) => {
  const finalMessage = String(message || '').trim();
  if (!finalMessage) {
    return { ok: false, skipped: true };
  }

  const key = cooldownKey || `${source || 'frontend'}|${title || ''}|${finalMessage}`;
  const now = Date.now();
  const lastTime = issueCooldownMap.get(key) || 0;
  if (now - lastTime < cooldownMs) {
    return { ok: false, skipped: true };
  }
  issueCooldownMap.set(key, now);

  return publishNotification(
    {
      type,
      title,
      message: finalMessage,
      source,
      method: 'settings',
      target_route: '/system-settings',
    },
    { localFallback: true }
  );
};
