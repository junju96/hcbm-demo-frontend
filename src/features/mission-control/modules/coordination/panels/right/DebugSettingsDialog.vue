<template>
  <!-- Teleport 到 body，避免祖先容器的 transform/overflow 影响 fixed 定位与高度计算 -->
  <Teleport to="body">
    <div class="as-dialog-overlay" @click.self="emit('close')">
      <div class="as-dialog as-debug-dialog">
      <div class="as-dialog-header">调试设置</div>
      <div class="as-dialog-body as-debug-body">
        <!-- ==================== 日志 ==================== -->
        <section class="as-debug-section">
          <div class="as-debug-section-title">日志（最近 {{ logPreview.length }} 条，倒序）</div>
          <div class="as-debug-log-view">
            <div v-if="logPreview.length === 0" class="as-dialog-empty">暂无日志</div>
            <div
              v-for="(entry, idx) in logPreview"
              :key="idx"
              class="as-debug-log-line"
              :class="`level-${entry.level}`"
            >
              {{ formatLogEntry(entry) }}
            </div>
          </div>
          <div class="as-debug-btn-row">
            <button class="as-btn" type="button" @click="refreshLogPreview">刷新预览</button>
            <button class="as-btn primary" type="button" @click="onExportLogs">导出日志</button>
            <button class="as-btn" type="button" @click="onClearLogs">清空日志</button>
          </div>
        </section>

        <!-- ==================== 前端服务地址 ==================== -->
        <section class="as-debug-section">
          <div class="as-debug-section-title">前端服务地址（修改后刷新页面生效）</div>
          <div
            v-for="row in frontendRows"
            :key="row.key"
            class="as-debug-config-row"
            :class="{ overridden: row.overridden }"
          >
            <span class="as-debug-config-label" :title="row.key">
              {{ row.label }}<span v-if="row.overridden" class="as-debug-overridden-tag">已覆盖</span>
            </span>
            <input v-model="frontendDraft[row.key]" class="as-dialog-input" type="text" />
          </div>
          <div class="as-debug-btn-row">
            <button class="as-btn primary" type="button" @click="onSaveFrontend">保存</button>
            <button class="as-btn" type="button" @click="onResetFrontend">恢复默认</button>
            <button class="as-btn" type="button" @click="onReloadPage">刷新页面</button>
          </div>
        </section>

        <!-- ==================== 后端服务地址 ==================== -->
        <section class="as-debug-section">
          <div class="as-debug-section-title">后端服务地址</div>
          <div v-if="backendStatus === 'loading'" class="as-dialog-empty">加载中…</div>
          <div v-else-if="backendStatus === 'unreachable'" class="as-dialog-empty">
            后端不可达（{{ backendError }}）
            <button class="as-btn" type="button" style="margin-top: 0.4rem;" @click="loadBackendConfig">重试</button>
          </div>
          <template v-else>
            <div
              v-for="row in backendRows"
              :key="row.key"
              class="as-debug-config-row"
              :class="{ overridden: row.overridden }"
            >
              <span class="as-debug-config-label" :title="row.key">
                {{ row.label }}<span v-if="row.overridden" class="as-debug-overridden-tag">已覆盖</span>
              </span>
              <input v-model="backendDraft[row.key]" class="as-dialog-input" type="text" />
            </div>
            <div class="as-debug-btn-row">
              <button class="as-btn primary" type="button" :disabled="backendSaving" @click="onSaveBackend">
                {{ backendSaving ? '保存中…' : '保存' }}
              </button>
              <button class="as-btn" type="button" @click="loadBackendConfig">重新拉取</button>
              <button class="as-btn as-debug-danger" type="button" @click="onRestartBackend">重启后端</button>
            </div>
            <div class="as-debug-btn-row">
              <button class="as-btn" type="button" @click="onExportBackendLog('backend')">导出后端日志</button>
              <button class="as-btn" type="button" @click="onExportBackendLog('zenoh')">导出 Zenoh 日志</button>
            </div>
          </template>
        </section>

        <div v-if="statusMessage" class="as-debug-status">{{ statusMessage }}</div>
      </div>
      <div class="as-dialog-footer">
        <button class="as-btn primary" type="button" @click="emit('close')">关闭</button>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getLogs, exportLogs, clearLogs, formatLogEntry } from '../../../../../../utils/debugLogger.js';
import {
  getEffectiveServerConfig,
  saveServerOverrides,
  clearServerOverrides,
} from '../../../../../../config/serverConfig.js';
import { fetchDebugConfig, saveDebugConfig, restartBackend, joinApiUrl } from '../../api/coordinationApi.js';

const emit = defineEmits(['close']);

const statusMessage = ref('');

/* ---------- 日志区块 ---------- */
const logPreview = ref([]);

const refreshLogPreview = () => {
  logPreview.value = getLogs().slice(-100).reverse();
};

const onExportLogs = () => {
  exportLogs();
  statusMessage.value = '日志已导出';
};

const onClearLogs = () => {
  if (!window.confirm('确认清空全部调试日志？')) return;
  clearLogs();
  refreshLogPreview();
  statusMessage.value = '日志已清空';
};

/* ---------- 前端服务地址区块 ---------- */
const frontendRows = ref(getEffectiveServerConfig());
const frontendDraft = ref(
  Object.fromEntries(frontendRows.value.map((row) => [row.key, row.effectiveValue]))
);

const refreshFrontendRows = () => {
  frontendRows.value = getEffectiveServerConfig();
};

const onSaveFrontend = () => {
  // 与默认值相同的输入视为不覆盖；空串视为恢复默认
  const patch = {};
  for (const row of frontendRows.value) {
    const value = String(frontendDraft.value[row.key] ?? '').trim();
    patch[row.key] = value === row.defaultValue ? '' : value;
  }
  saveServerOverrides(patch);
  refreshFrontendRows();
  statusMessage.value = '前端服务地址已保存，刷新页面后生效';
};

const onResetFrontend = () => {
  if (!window.confirm('确认恢复全部前端服务地址为默认值？')) return;
  clearServerOverrides();
  refreshFrontendRows();
  frontendDraft.value = Object.fromEntries(
    frontendRows.value.map((row) => [row.key, row.effectiveValue])
  );
  statusMessage.value = '已恢复默认，刷新页面后生效';
};

const onReloadPage = () => {
  window.location.reload();
};

/* ---------- 后端服务地址区块 ---------- */
const backendStatus = ref('loading'); // loading | ok | unreachable
const backendError = ref('');
const backendRows = ref([]);
const backendDraft = ref({});
const backendSaving = ref(false);

const loadBackendConfig = async () => {
  backendStatus.value = 'loading';
  backendError.value = '';
  const result = await fetchDebugConfig();
  if (!result.ok) {
    backendStatus.value = 'unreachable';
    backendError.value = result.error || '未知错误';
    return;
  }
  const payload = result.data?.data ?? result.data ?? {};
  const items = payload.items || payload.configs || [];
  // 对象类型的值（如 SEAT_TARGET_IPS 席位映射）以 JSON 文本展示，避免 input 里显示 [object Object]
  const toText = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''));
  backendRows.value = items.map((item) => {
    const effective = item.effective ?? item.effective_value ?? item.value ?? '';
    const defVal = item.default ?? item.default_value ?? '';
    return {
      key: item.key,
      label: item.label || item.key,
      defaultValue: toText(defVal),
      effectiveValue: toText(effective),
      isObject: Boolean(effective && typeof effective === 'object'),
      overridden: Boolean(item.overridden ?? item.is_overridden),
      restartRequired: Boolean(item.restart_required),
    };
  });
  backendDraft.value = Object.fromEntries(
    backendRows.value.map((row) => [row.key, row.effectiveValue])
  );
  backendStatus.value = 'ok';
};

const onSaveBackend = async () => {
  // 与默认值相同的输入不写入覆盖（由后端兜底），空串表示恢复默认
  const overrides = {};
  for (const row of backendRows.value) {
    const raw = String(backendDraft.value[row.key] ?? '').trim();
    if (row.isObject) {
      // 对象类型（如席位映射）：输入是 JSON 文本，解析回对象再提交
      if (!raw || raw === row.defaultValue) {
        overrides[row.key] = '';
        continue;
      }
      try {
        overrides[row.key] = JSON.parse(raw);
      } catch {
        statusMessage.value = `「${row.label}」的输入不是合法 JSON（示例：{"1": "25.11.1.56"}）`;
        return;
      }
      continue;
    }
    overrides[row.key] = raw === row.defaultValue ? '' : raw;
  }
  backendSaving.value = true;
  const result = await saveDebugConfig(overrides);
  backendSaving.value = false;
  if (!result.ok) {
    statusMessage.value = `后端配置保存失败：${result.data?.message || result.error || '未知错误'}`;
    return;
  }
  const payload = result.data?.data ?? result.data ?? {};
  const restartRequired = payload.restart_required || [];
  statusMessage.value = restartRequired.length > 0
    ? `后端配置已保存，以下项需重启后端生效：${restartRequired.join('、')}`
    : '后端配置已保存';
  await loadBackendConfig();
};

const onRestartBackend = async () => {
  if (!window.confirm('确认重启后端服务？重启期间页面请求会失败。')) return;
  const result = await restartBackend();
  if (!result.ok) {
    statusMessage.value = `重启请求失败：${result.error || '未知错误'}`;
    return;
  }
  statusMessage.value = '后端重启中，请稍后刷新页面';
};

// 导出后端日志：fetch 拉取后按 Content-Disposition 文件名下载，失败在弹窗内提示
const onExportBackendLog = async (source) => {
  const label = source === 'zenoh' ? 'Zenoh 日志' : '后端日志';
  try {
    const resp = await fetch(joinApiUrl(`/api/v1/debug/logs?source=${source}`));
    if (!resp.ok) {
      statusMessage.value = `${label}导出失败：HTTP ${resp.status}`;
      return;
    }
    const blob = await resp.blob();
    const cd = resp.headers.get('content-disposition') || '';
    const m = cd.match(/filename="?([^";]+)"?/);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = m ? m[1] : `${source}-logs.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    statusMessage.value = `${label}已导出`;
  } catch (e) {
    statusMessage.value = `${label}导出失败：${e?.message || e}`;
  }
};

onMounted(() => {
  refreshLogPreview();
  loadBackendConfig();
});
</script>

<style scoped>
/* 弹窗样式复用 ActionSequencePanel 的 as-dialog 模式 */
.as-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.as-dialog {
  background: linear-gradient(180deg, rgba(0, 32, 40, 0.96), rgba(0, 16, 22, 0.98));
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 12px;
  min-width: 280px;
  max-width: 400px;
  color: #d7f9f5;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.as-debug-dialog {
  max-width: 720px;
  width: 720px;
  /* 整个弹窗（含头尾）不超过视口高度，body 内部滚动 */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.as-dialog-header {
  padding: 0.85rem 1rem;
  font-weight: 800;
  font-size: 1rem;
  border-bottom: 1px solid rgba(0, 222, 200, 0.15);
  color: #f7fdff;
}

.as-dialog-body {
  padding: 0.7rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.as-debug-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  gap: 1rem;
}

.as-debug-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.as-debug-section-title {
  font-weight: 700;
  font-size: 0.92rem;
  color: #f7fdff;
}

.as-debug-log-view {
  max-height: 200px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 222, 200, 0.2);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.78rem;
  line-height: 1.5;
}

.as-debug-log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.as-debug-log-line.level-warn {
  color: #ffd37a;
}

.as-debug-log-line.level-error {
  color: #ff8a8a;
}

.as-debug-config-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.as-debug-config-row.overridden .as-debug-config-label {
  color: #ffd37a;
}

.as-debug-config-label {
  width: 10rem;
  flex-shrink: 0;
  font-size: 0.86rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.as-debug-overridden-tag {
  font-size: 11px;
  padding: 0 6px;
  border-radius: 4px;
  background: rgba(255, 211, 122, 0.18);
  color: #ffd37a;
}

.as-debug-btn-row {
  display: flex;
  gap: 0.6rem;
}

.as-debug-status {
  color: #ffd37a;
  font-size: 0.86rem;
}

.as-debug-danger {
  border-color: rgba(255, 100, 100, 0.5);
  color: #ff8a8a;
}

.as-dialog-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(0, 222, 200, 0.15);
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.as-dialog-empty {
  color: rgba(241, 254, 255, 0.6);
  font-size: 0.9rem;
  padding: 0.6rem 0;
  text-align: center;
}

.as-dialog-input {
  width: 100%;
  padding: 8px 10px;
  background: rgba(0, 222, 200, 0.06);
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 4px;
  color: #d7f9f5;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}

.as-dialog-input:focus {
  border-color: rgba(0, 222, 200, 0.7);
}

.as-btn {
  padding: 6px 14px;
  background: rgba(0, 222, 200, 0.08);
  border: 1px solid rgba(0, 222, 200, 0.35);
  border-radius: 4px;
  color: #d7f9f5;
  font-size: 0.86rem;
  cursor: pointer;
}

.as-btn:hover {
  background: rgba(0, 222, 200, 0.18);
}

.as-btn.primary {
  background: rgba(0, 222, 200, 0.25);
  border-color: rgba(0, 222, 200, 0.6);
}

.as-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
