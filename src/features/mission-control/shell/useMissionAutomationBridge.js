import { nextTick, onMounted, onUnmounted, ref } from 'vue';
import { emitMissionCommand, subscribeMissionCommands } from './missionCommandBus';

const normalizeText = (value) => String(value ?? '').trim();

const PANEL_FIELD_KEYS = ['id', 'label', 'title', 'shortLabel'];
const MODULE_FIELD_KEYS = ['id', 'label'];

const wait = (timeoutMs) => new Promise((resolve) => window.setTimeout(resolve, timeoutMs));

const matchesSpecifier = (value, specifier) =>
  normalizeText(value).toLowerCase() === normalizeText(specifier).toLowerCase();

const ROUTE_ROLE_BY_PATH = {
  '/mission-control': 'single',
  '/mission-control/main': 'main',
  '/mission-control/aux': 'aux',
};

export function useMissionAutomationBridge({
  missionModuleManifests,
  activeModuleId,
  setRouteRoleByPath,
  openModuleById,
  openLeftPanel,
  actionRegistry,
  interactionRegistry,
  chatApi,
}) {
  const lastCommandResult = ref(null);

  const resolveModuleManifest = (moduleSpecifier) => {
    const normalized = normalizeText(moduleSpecifier);
    if (!normalized) {
      return missionModuleManifests.find((item) => item.id === activeModuleId.value) || missionModuleManifests[0] || null;
    }

    return missionModuleManifests.find((manifest) =>
      MODULE_FIELD_KEYS.some((key) => matchesSpecifier(manifest?.[key], normalized))
    ) || null;
  };

  const resolvePanelLocation = (panelSpecifier, preferredModuleId = '') => {
    const normalized = normalizeText(panelSpecifier);
    if (!normalized) {
      return {
        moduleId: normalizeText(preferredModuleId) || normalizeText(activeModuleId.value),
        panelId: '',
      };
    }

    const candidateModules = [];
    const preferredModule = resolveModuleManifest(preferredModuleId || activeModuleId.value);
    if (preferredModule) {
      candidateModules.push(preferredModule);
    }

    missionModuleManifests.forEach((manifest) => {
      if (!candidateModules.some((item) => item.id === manifest.id)) {
        candidateModules.push(manifest);
      }
    });

    for (const manifest of candidateModules) {
      const panel = (manifest.leftPanels || []).find((item) =>
        PANEL_FIELD_KEYS.some((key) => matchesSpecifier(item?.[key], normalized))
      );
      if (panel) {
        return {
          moduleId: manifest.id,
          panelId: panel.id,
        };
      }
    }

    return {
      moduleId: normalizeText(preferredModuleId) || normalizeText(activeModuleId.value),
      panelId: normalized,
    };
  };

  const ensureRoute = async (route) => {
    const normalized = normalizeText(route);
    if (!normalized) {
      return;
    }
    const routeRole = ROUTE_ROLE_BY_PATH[normalized];
    if (routeRole) {
      setRouteRoleByPath?.(normalized);
      await nextTick();
    }
  };

  const ensureModuleAndPanel = async ({ moduleId, panelId }) => {
    const resolvedModule = resolveModuleManifest(moduleId);
    const panelSpecifier = panelId || (!resolvedModule ? moduleId : '');
    const resolvedPanel = resolvePanelLocation(panelSpecifier, resolvedModule?.id || moduleId);
    const nextModuleId = resolvedModule?.id || resolvedPanel.moduleId || normalizeText(moduleId);
    const nextPanelId = resolvedPanel.panelId;

    if (nextModuleId) {
      openModuleById(nextModuleId);
      await nextTick();
    }

    if (nextPanelId) {
      openLeftPanel(nextPanelId);
      await nextTick();
    }

    return {
      moduleId: nextModuleId,
      panelId: nextPanelId,
    };
  };

  const waitForTargetFocus = async (targetId) => {
    const normalized = normalizeText(targetId);
    if (!normalized) {
      return false;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await nextTick();
      if (await interactionRegistry.focusTarget(normalized, { behavior: attempt === 0 ? 'auto' : 'smooth' })) {
        return true;
      }
      await wait(120);
    }

    return false;
  };

  const executeCommand = async (command = {}) => {
    const normalized = {
      ...command,
      route: normalizeText(command.route),
      moduleId: normalizeText(command.moduleId),
      panelId: normalizeText(command.panelId),
      targetId: normalizeText(command.targetId),
      actionId: normalizeText(command.actionId),
      draft: normalizeText(command.draft),
    };

    const registeredAction = normalized.actionId ? actionRegistry.getAction(normalized.actionId) : null;
    const resolvedTarget = interactionRegistry.resolveTarget(
      normalized.targetId || normalized.params?.targetId || {}
    );

    await ensureRoute(normalized.route || registeredAction?.route || resolvedTarget?.route);

    let navigation = {
      moduleId: normalized.moduleId,
      panelId: normalized.panelId,
    };

    if (registeredAction) {
      navigation = await ensureModuleAndPanel({
        moduleId: normalized.moduleId || registeredAction.moduleId || resolvedTarget?.moduleId,
        panelId: normalized.panelId || registeredAction.panelId || resolvedTarget?.panelId,
      });
    } else if (normalized.moduleId || normalized.panelId || resolvedTarget?.moduleId || resolvedTarget?.panelId) {
      navigation = await ensureModuleAndPanel({
        moduleId: normalized.moduleId || resolvedTarget?.moduleId,
        panelId: normalized.panelId || resolvedTarget?.panelId,
      });
    }

    if (normalized.draft) {
      chatApi?.setDraft?.(normalized.draft);
      chatApi?.open?.();
    }

    let targetFocused = false;
    if (normalized.targetId) {
      targetFocused = await waitForTargetFocus(normalized.targetId);
      if (!targetFocused && resolvedTarget) {
        interactionRegistry.setCurrentTarget(resolvedTarget);
      }
    }

    let result = {
      status: 'executed',
      commandId: normalized.commandId,
      commandType: normalized.type,
      ...navigation,
      targetId: normalized.targetId,
      targetFocused,
    };

    if (normalized.targetId && !targetFocused && normalized.focus !== false) {
      result = {
        ...result,
        status: 'target_not_found',
      };
    }

    if (registeredAction) {
      const actionResult = await actionRegistry.invokeAction(registeredAction.id, normalized.params, {
        command: normalized,
        target: resolvedTarget,
      });
      result = {
        ...result,
        ...actionResult,
      };
    } else if (normalized.actionId) {
      result = {
        ...result,
        status: 'action_not_supported',
        actionId: normalized.actionId,
      };
    }

    if (normalized.appendToChat) {
      result = {
        ...result,
        appendedToChat: interactionRegistry.insertCurrentTargetToChat(),
      };
    }

    lastCommandResult.value = result;
    return result;
  };

  let unsubscribe = null;

  onMounted(() => {
    unsubscribe = subscribeMissionCommands((command) => executeCommand(command));
  });

  onUnmounted(() => {
    unsubscribe?.();
    unsubscribe = null;
  });

  return {
    lastCommandResult,
    executeCommand,
    emitCommand: emitMissionCommand,
  };
}
