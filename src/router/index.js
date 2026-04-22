import { computed, ref } from 'vue';

const DEFAULT_PATH = '/mission-control';

const ROUTE_META = {
  '/mission-control': {
    screenMode: 'single',
    routeRole: 'single',
    label: 'MissionControl',
  },
  '/mission-control/main': {
    screenMode: 'main',
    routeRole: 'main',
    label: 'MissionControlMain',
  },
  '/mission-control/aux': {
    screenMode: 'aux',
    routeRole: 'aux',
    label: 'MissionControlAux',
  },
};

const normalizeDemoPath = (path) => {
  const normalized = String(path || '').trim() || '/';
  if (normalized === '/' || normalized === '') {
    return DEFAULT_PATH;
  }
  return ROUTE_META[normalized] ? normalized : DEFAULT_PATH;
};

const resolveBrowserPath = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_PATH;
  }
  return normalizeDemoPath(window.location.pathname);
};

const currentPath = ref(resolveBrowserPath());

const syncPathFromLocation = ({ replace = false } = {}) => {
  if (typeof window === 'undefined') {
    currentPath.value = DEFAULT_PATH;
    return currentPath.value;
  }

  const nextPath = resolveBrowserPath();
  const method = replace ? 'replaceState' : 'pushState';

  if (window.location.pathname !== nextPath) {
    window.history[method]({}, '', nextPath);
  }

  currentPath.value = nextPath;
  return nextPath;
};

if (typeof window !== 'undefined') {
  syncPathFromLocation({ replace: true });
  window.addEventListener('popstate', () => {
    syncPathFromLocation({ replace: true });
  });
}

export const currentDemoPath = computed(() => currentPath.value);

export const currentDemoRoute = computed(() => (
  ROUTE_META[currentPath.value] || ROUTE_META[DEFAULT_PATH]
));

export const navigateToDemoPath = (path, { replace = false } = {}) => {
  if (typeof window === 'undefined') {
    currentPath.value = normalizeDemoPath(path);
    return currentPath.value;
  }

  const nextPath = normalizeDemoPath(path);
  if (window.location.pathname !== nextPath) {
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method]({}, '', nextPath);
  }
  currentPath.value = nextPath;
  return nextPath;
};

export const getDemoRouteMeta = (path) => ROUTE_META[normalizeDemoPath(path)] || ROUTE_META[DEFAULT_PATH];
