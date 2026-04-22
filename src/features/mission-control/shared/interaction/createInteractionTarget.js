const normalizeText = (value) => String(value ?? '').trim();

const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }
  return normalizeText(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const cloneMeta = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...value };
};

export function createInteractionTarget(definition = {}) {
  const targetId = normalizeText(definition.targetId || definition.id);
  const targetType = normalizeText(definition.targetType || definition.type);
  const label = normalizeText(definition.label || definition.targetLabel);
  const route = normalizeText(definition.route);
  const moduleId = normalizeText(definition.moduleId || definition.module_id);
  const panelId = normalizeText(definition.panelId || definition.panel_id);
  const sourceComponent = normalizeText(definition.sourceComponent || definition.source_component);
  const textPreview = normalizeText(definition.textPreview || definition.text_preview);
  const actions = normalizeStringList(definition.actions || definition.actionIds || definition.action_ids);
  const meta = cloneMeta(definition.meta);

  return {
    targetId,
    targetType,
    label,
    route,
    moduleId,
    panelId,
    sourceComponent,
    textPreview,
    actions,
    meta,
  };
}

const encodeMeta = (meta = {}) => {
  try {
    return JSON.stringify(meta);
  } catch {
    return '{}';
  }
};

export function createInteractionTargetAttrs(definition = {}) {
  const target = createInteractionTarget(definition);
  if (!target.targetId) {
    return {};
  }

  return {
    'data-mission-target-id': target.targetId,
    'data-mission-target-type': target.targetType || undefined,
    'data-mission-target-label': target.label || undefined,
    'data-mission-target-route': target.route || undefined,
    'data-mission-target-module': target.moduleId || undefined,
    'data-mission-target-panel': target.panelId || undefined,
    'data-mission-target-source': target.sourceComponent || undefined,
    'data-mission-target-preview': target.textPreview || undefined,
    'data-mission-target-actions': target.actions.join(',') || undefined,
    'data-mission-target-meta': Object.keys(target.meta).length ? encodeMeta(target.meta) : undefined,
  };
}

export function createInteractionActionAttrs(definition = {}) {
  const actionId = normalizeText(definition.actionId || definition.id);
  if (!actionId) {
    return {};
  }

  return {
    'data-mission-action-id': actionId,
    'data-mission-action-label': normalizeText(definition.label) || undefined,
    'data-mission-action-target-id': normalizeText(definition.targetId || definition.target_id) || undefined,
  };
}

export function mergeInteractionTargets(...targets) {
  return createInteractionTarget(
    targets.reduce(
      (merged, target) => ({
        ...merged,
        ...(target || {}),
        meta: {
          ...(merged?.meta || {}),
          ...(target?.meta || {}),
        },
      }),
      {}
    )
  );
}
