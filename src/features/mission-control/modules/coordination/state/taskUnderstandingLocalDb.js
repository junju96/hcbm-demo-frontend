const TASK_DB_STORAGE_KEY = 'coordination.task-understanding.db.v1';
const TASK_DB_SESSION_BOOT_KEY = 'coordination.task-understanding.session.booted.v1';
const TASK_DB_DATA_VERSION = 2;

const clone = (value) => JSON.parse(JSON.stringify(value));

const safeParseJson = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const normalizeDbRecord = (value, fallbackCommandId = '') => {
  const record = value && typeof value === 'object' ? value : {};
  return {
    commands: Array.isArray(record.commands) ? record.commands : [],
    analysisResultMap:
      record.analysisResultMap && typeof record.analysisResultMap === 'object'
        ? record.analysisResultMap
        : {},
    selectedCommandId: typeof record.selectedCommandId === 'string' ? record.selectedCommandId : fallbackCommandId,
    updatedAt: record.updatedAt || '',
    dataVersion: typeof record.dataVersion === 'number' ? record.dataVersion : 1,
  };
};

const buildSeedRecord = ({ mockCommands = [], selectedCommandId = '' }) => ({
  commands: clone(mockCommands),
  analysisResultMap: {},
  selectedCommandId: selectedCommandId || mockCommands[0]?.commandId || '',
  updatedAt: new Date().toISOString(),
  dataVersion: TASK_DB_DATA_VERSION,
});

export const loadTaskUnderstandingDb = ({ mockCommands = [] } = {}) => {
  const fallbackCommandId = mockCommands[0]?.commandId || '';
  if (typeof window === 'undefined') {
    return buildSeedRecord({ mockCommands, selectedCommandId: fallbackCommandId });
  }

  const hasBootedInSession = window.sessionStorage.getItem(TASK_DB_SESSION_BOOT_KEY) === '1';

  if (!hasBootedInSession) {
    const seed = buildSeedRecord({ mockCommands, selectedCommandId: fallbackCommandId });
    window.localStorage.setItem(TASK_DB_STORAGE_KEY, JSON.stringify(seed));
    window.sessionStorage.setItem(TASK_DB_SESSION_BOOT_KEY, '1');
    return seed;
  }

  const raw = window.localStorage.getItem(TASK_DB_STORAGE_KEY);
  if (!raw) {
    const seed = buildSeedRecord({ mockCommands, selectedCommandId: fallbackCommandId });
    window.localStorage.setItem(TASK_DB_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  const record = normalizeDbRecord(safeParseJson(raw, {}), fallbackCommandId);

  // 数据模型版本不匹配时自动重置为种子数据
  if (record.dataVersion !== TASK_DB_DATA_VERSION) {
    const seed = buildSeedRecord({ mockCommands, selectedCommandId: fallbackCommandId });
    window.localStorage.setItem(TASK_DB_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  return record;
};

export const saveTaskUnderstandingDb = (record) => {
  if (typeof window === 'undefined') {
    return;
  }
  const safeRecord = normalizeDbRecord(record);
  safeRecord.updatedAt = new Date().toISOString();
  safeRecord.dataVersion = TASK_DB_DATA_VERSION;
  window.localStorage.setItem(TASK_DB_STORAGE_KEY, JSON.stringify(safeRecord));
};

