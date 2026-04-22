const normalizeText = (value) => String(value ?? '').trim();

const cloneParams = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...value };
};

const normalizeActionDefinition = (definition = {}) => ({
  id: normalizeText(definition.id || definition.actionId),
  label: normalizeText(definition.label) || normalizeText(definition.id || definition.actionId),
  description: normalizeText(definition.description),
  route: normalizeText(definition.route),
  moduleId: normalizeText(definition.moduleId || definition.module_id),
  panelId: normalizeText(definition.panelId || definition.panel_id),
  targetType: normalizeText(definition.targetType || definition.target_type),
  requiresConfirmation: definition.requiresConfirmation === true,
  execute: typeof definition.execute === 'function' ? definition.execute : null,
});

export function useMissionActionRegistry() {
  const actionMap = new Map();

  const registerAction = (definition = {}) => {
    const action = normalizeActionDefinition(definition);
    if (!action.id || typeof action.execute !== 'function') {
      return () => {};
    }

    actionMap.set(action.id, action);

    return () => {
      if (actionMap.get(action.id) === action) {
        actionMap.delete(action.id);
      }
    };
  };

  const getAction = (actionId) => actionMap.get(normalizeText(actionId)) || null;

  const invokeAction = async (actionId, params = {}, context = {}) => {
    const action = getAction(actionId);
    if (!action) {
      return {
        status: 'action_not_supported',
        actionId: normalizeText(actionId),
      };
    }

    try {
      const result = await action.execute({
        action,
        params: cloneParams(params),
        ...context,
      });
      return {
        status: 'executed',
        actionId: action.id,
        label: action.label,
        result,
      };
    } catch (error) {
      return {
        status: 'failed',
        actionId: action.id,
        label: action.label,
        error: error instanceof Error ? error.message : String(error || 'unknown error'),
      };
    }
  };

  return {
    registerAction,
    getAction,
    invokeAction,
  };
}
