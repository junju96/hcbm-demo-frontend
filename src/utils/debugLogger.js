// debugLogger.js — 前端调试日志采集
// 内存环形缓冲 1000 条，同步写穿透到 localStorage（刷新/崩溃不丢），
// 模块加载即安装 window error / unhandledrejection 捕获。
// 所有 API 内部均有 try/catch，日志模块自身异常绝不影响业务。

const MAX_LOGS = 1000;
const STORAGE_KEY = 'missionDemoDebugLogs';

const LEVELS = new Set(['info', 'warn', 'error']);

let logs = [];

// 模块加载时从 localStorage 恢复
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      logs = parsed.slice(-MAX_LOGS);
    }
  }
} catch {
  logs = [];
}

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(-MAX_LOGS)));
  } catch {
    // localStorage 满/不可用时静默丢弃
  }
};

/**
 * 统一按北京时间（UTC+8）格式化，与设备本地时区无关
 * （现场席位计算机时区设置不可控，日志时间必须固定口径）。
 * 输入 ISO 串/Date/时间戳，输出 "YYYY-MM-DD HH:mm:ss.SSS"；非法输入原样返回字符串。
 */
export const formatBeijingTime = (input) => {
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return String(input ?? '');
    return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    return String(input ?? '');
  }
};

/**
 * 写入一条日志
 * @param {string} source 来源（api / system / error 等）
 * @param {string} message 内容
 * @param {'info'|'warn'|'error'} level 级别
 */
export const logEvent = (source, message, level = 'info') => {
  try {
    logs.push({
      time: new Date().toISOString(),
      level: LEVELS.has(level) ? level : 'info',
      source: String(source ?? ''),
      message: String(message ?? ''),
    });
    if (logs.length > MAX_LOGS) {
      logs.splice(0, logs.length - MAX_LOGS);
    }
    persist();
  } catch {
    // 绝不抛出
  }
};

/** 返回当前日志数组副本（元素：{time, level, source, message}） */
export const getLogs = () => logs.slice();

/** 清空内存与 localStorage 中的日志 */
export const clearLogs = () => {
  logs = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

/** 格式化为单行文本（时间固定为北京时间）：[YYYY-MM-DD HH:mm:ss.SSS] [级别] [来源] 内容 */
export const formatLogEntry = (entry) =>
  `[${formatBeijingTime(entry.time)}] [${entry.level}] [${entry.source}] ${entry.message}`;

/** 导出全部日志为 .log 文件下载（含文件头：导出时间、userAgent、location.href；时间均为北京时间 UTC+8） */
export const exportLogs = () => {
  try {
    const nowText = formatBeijingTime(new Date().toISOString());
    const stamp = nowText.replace(/[-:]/g, '').replace(' ', '-').replace(/\..*$/, '').replace(/\//g, '');
    const header = [
      '# 前端调试日志导出（时间均为北京时间 UTC+8）',
      `# 导出时间: ${nowText}`,
      `# userAgent: ${navigator.userAgent}`,
      `# location: ${location.href}`,
      `# 日志条数: ${logs.length}`,
      '',
    ].join('\n');
    const body = logs.length > 0
      ? logs.map(formatLogEntry).join('\n')
      : '（暂无日志）';
    const blob = new Blob([header + body + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${stamp}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    // 导出失败静默
  }
};

// 模块加载即安装全局错误捕获（error 级）
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const where = event.filename ? ` @ ${event.filename}:${event.lineno || 0}:${event.colno || 0}` : '';
    logEvent('error', `${event.message || '未知错误'}${where}`, 'error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    logEvent('error', `未处理的 Promise 拒绝: ${reason?.stack || reason?.message || String(reason)}`, 'error');
  });
}
