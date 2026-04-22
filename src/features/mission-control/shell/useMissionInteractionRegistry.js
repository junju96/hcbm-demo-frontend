import { ref } from 'vue';
import {
  createInteractionTarget,
  mergeInteractionTargets,
} from '../shared/interaction/createInteractionTarget';

const TARGET_SELECTOR = '[data-mission-target-id]';
const HIGHLIGHT_CLASS = 'mission-demo-interaction-highlight';
const normalizeText = (value) => String(value ?? '').trim();

const decodeMeta = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return {};
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const parseTargetFromDataset = (dataset = {}) =>
  createInteractionTarget({
    targetId: dataset.missionTargetId,
    targetType: dataset.missionTargetType,
    label: dataset.missionTargetLabel,
    route: dataset.missionTargetRoute,
    moduleId: dataset.missionTargetModule,
    panelId: dataset.missionTargetPanel,
    sourceComponent: dataset.missionTargetSource,
    textPreview: dataset.missionTargetPreview,
    actions: dataset.missionTargetActions,
    meta: decodeMeta(dataset.missionTargetMeta),
  });

const buildContextText = (target = {}) => {
  const label = normalizeText(target.label) || normalizeText(target.targetId) || '未命名目标';
  const preview = normalizeText(target.textPreview);
  const moduleId = normalizeText(target.moduleId) || '-';
  const panelId = normalizeText(target.panelId) || '-';
  const targetType = normalizeText(target.targetType) || '-';
  const actions = Array.isArray(target.actions) ? target.actions.filter(Boolean) : [];

  return [
    '[页面上下文]',
    `对象: ${label}`,
    `类型: ${targetType}`,
    `模块: ${moduleId}`,
    `面板: ${panelId}`,
    preview ? `说明: ${preview}` : '',
    actions.length ? `可用动作: ${actions.join('、')}` : '',
  ].filter(Boolean).join('\n');
};

const buildTargetSelector = (targetId) => {
  const normalized = normalizeText(targetId);
  if (!normalized) {
    return '';
  }
  const escaped = normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `[data-mission-target-id="${escaped}"]`;
};

export function useMissionInteractionRegistry({
  getChatDraft,
  setChatDraft,
  openChatPanel,
} = {}) {
  const currentTarget = ref(null);
  const targetMap = new Map();
  let highlightTimer = 0;

  const resolveTarget = (input = {}) => {
    const normalized = createInteractionTarget(typeof input === 'string' ? { targetId: input } : input);
    const registered = targetMap.get(normalized.targetId) || null;
    const merged = mergeInteractionTargets(
      registered || {},
      normalized,
      {
        route: normalized.route || '/mission-control',
      }
    );

    if (!merged.targetId && !merged.label) {
      return null;
    }

    return {
      ...merged,
      capturedAt: new Date().toISOString(),
    };
  };

  const registerTarget = (definition = {}) => {
    const target = createInteractionTarget(definition);
    if (!target.targetId) {
      return () => {};
    }

    targetMap.set(target.targetId, target);
    return () => {
      if (targetMap.get(target.targetId) === target) {
        targetMap.delete(target.targetId);
      }
    };
  };

  const setCurrentTarget = (input = {}) => {
    const target = resolveTarget(input);
    if (!target) {
      return null;
    }
    currentTarget.value = target;
    return target;
  };

  const clearCurrentTarget = () => {
    currentTarget.value = null;
  };

  const findTargetElement = (targetId) => {
    const selector = buildTargetSelector(targetId);
    if (!selector || typeof document === 'undefined') {
      return null;
    }
    return document.querySelector(selector);
  };

  const captureTargetFromElement = (element) => {
    const targetElement = element?.closest?.(TARGET_SELECTOR);
    if (!targetElement) {
      return null;
    }
    return setCurrentTarget(parseTargetFromDataset(targetElement.dataset));
  };

  const captureTargetFromEvent = (event) => captureTargetFromElement(event?.target);

  const focusTarget = async (targetId, options = {}) => {
    const element = findTargetElement(targetId);
    if (!element) {
      return false;
    }

    element.scrollIntoView({
      behavior: options.behavior || 'smooth',
      block: options.block || 'center',
      inline: options.inline || 'nearest',
    });

    element.classList.add(HIGHLIGHT_CLASS);
    window.clearTimeout(highlightTimer);
    highlightTimer = window.setTimeout(() => {
      element.classList.remove(HIGHLIGHT_CLASS);
    }, 1800);

    captureTargetFromElement(element);
    return true;
  };

  const insertCurrentTargetToChat = () => {
    if (!currentTarget.value || typeof setChatDraft !== 'function') {
      return false;
    }

    const nextText = buildContextText(currentTarget.value);
    const previousDraft = typeof getChatDraft === 'function' ? normalizeText(getChatDraft()) : '';
    setChatDraft(previousDraft ? `${previousDraft}\n${nextText}` : nextText);
    openChatPanel?.();
    return true;
  };

  return {
    currentTarget,
    registerTarget,
    resolveTarget,
    setCurrentTarget,
    clearCurrentTarget,
    captureTargetFromEvent,
    captureTargetFromElement,
    focusTarget,
    insertCurrentTargetToChat,
    formatCurrentTargetForChat: () => buildContextText(currentTarget.value || {}),
  };
}
