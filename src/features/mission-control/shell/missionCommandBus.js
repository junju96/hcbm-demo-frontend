const COMMAND_EVENT_NAME = 'mission-demo:command';
const pendingCommands = [];
let listenerCount = 0;

const normalizeText = (value) => String(value ?? '').trim();

const clonePayload = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...value };
};

export const normalizeMissionCommand = (input = {}) => {
  const sourceCommand = input?.command && typeof input.command === 'object'
    ? { ...input.command, ...input }
    : input;

  const commandId = normalizeText(sourceCommand.commandId || sourceCommand.command_id)
    || `cmd-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const type = normalizeText(sourceCommand.type || sourceCommand.commandType || sourceCommand.command_type)
    || (normalizeText(sourceCommand.actionId || sourceCommand.action_id) ? 'invoke-action' : 'navigate');

  return {
    commandId,
    type,
    route: normalizeText(sourceCommand.route || sourceCommand.target_route),
    moduleId: normalizeText(sourceCommand.moduleId || sourceCommand.module_id || sourceCommand.target_module || sourceCommand.target_tab),
    panelId: normalizeText(sourceCommand.panelId || sourceCommand.panel_id || sourceCommand.target_panel),
    targetId: normalizeText(sourceCommand.targetId || sourceCommand.target_id || sourceCommand.target_target_id),
    actionId: normalizeText(sourceCommand.actionId || sourceCommand.action_id),
    draft: normalizeText(sourceCommand.draft),
    source: normalizeText(sourceCommand.source) || 'demo-frontend',
    focus: sourceCommand.focus !== false,
    appendToChat: sourceCommand.appendToChat === true || sourceCommand.insertToChat === true,
    params: clonePayload(sourceCommand.params),
  };
};

export const emitMissionCommand = (input = {}) => {
  const command = normalizeMissionCommand(input);

  if (typeof window === 'undefined') {
    pendingCommands.push(command);
    return command;
  }

  if (listenerCount > 0) {
    window.dispatchEvent(new CustomEvent(COMMAND_EVENT_NAME, { detail: command }));
  } else {
    pendingCommands.push(command);
  }

  return command;
};

export const subscribeMissionCommands = (handler) => {
  if (typeof handler !== 'function') {
    return () => {};
  }

  const handleCommand = (event) => {
    void handler(normalizeMissionCommand(event?.detail || {}));
  };

  listenerCount += 1;
  if (typeof window !== 'undefined') {
    window.addEventListener(COMMAND_EVENT_NAME, handleCommand);
  }

  while (pendingCommands.length) {
    const command = pendingCommands.shift();
    void handler(command);
  }

  return () => {
    listenerCount = Math.max(0, listenerCount - 1);
    if (typeof window !== 'undefined') {
      window.removeEventListener(COMMAND_EVENT_NAME, handleCommand);
    }
  };
};
