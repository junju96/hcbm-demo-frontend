const STORAGE_KEY = 'missionDemoSystemSettings';

export const DEFAULT_ENDPOINTS = Object.freeze({
  health: '/health',
  notificationPublish: '/notifications/publish',
  notificationCenter: '/notifications/center',
  notificationCenterRespond: '/notifications/center/respond',
  notificationHistory: '/notifications/history',
  notificationStream: '/notifications/stream',
});

import { API_BASE_URL, NOTIFICATION_BASE_URL } from './serverConfig.js';

export const DEFAULT_SETTINGS = Object.freeze({
  apiBaseURL: API_BASE_URL,
  notificationBaseURL: NOTIFICATION_BASE_URL,
  endpoints: {
    ...DEFAULT_ENDPOINTS,
  },
});

const cloneSettings = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  endpoints: {
    ...DEFAULT_ENDPOINTS,
    ...(settings?.endpoints || {}),
  },
});

export const joinURL = (baseURL = '', path = '') => {
  const normalizedBase = String(baseURL || '').trim().replace(/\/+$/, '');
  const normalizedPath = String(path || '').trim();
  if (!normalizedBase) {
    return normalizedPath || '';
  }
  if (!normalizedPath) {
    return normalizedBase;
  }
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  return `${normalizedBase}/${normalizedPath.replace(/^\/+/, '')}`;
};

export const loadSystemSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneSettings();
    }
    return cloneSettings(JSON.parse(raw));
  } catch {
    return cloneSettings();
  }
};

export const saveSystemSettings = (nextSettings = {}) => {
  const merged = cloneSettings(nextSettings);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
};
