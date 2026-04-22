import exampleManifest from '../modules/example/manifest';
import coordinationManifest from '../modules/coordination/manifest';

export const MISSION_MODULE_IDS = {
  example: 'example',
  coordination: 'coordination',
};

export const missionModuleManifests = [
  exampleManifest,
  coordinationManifest,
].sort((left, right) => (left.order || 0) - (right.order || 0));

const normalizeModuleSpecifier = (value) => String(value ?? '').trim().toLowerCase();

const missionModuleIdAliasMap = new Map(
  missionModuleManifests.flatMap((manifest) => {
    const aliases = [manifest.id, manifest.label]
      .map((item) => normalizeModuleSpecifier(item))
      .filter(Boolean);

    return [...new Set(aliases)].map((alias) => [alias, manifest.id]);
  })
);

export const resolveMissionModuleId = (moduleSpecifier) =>
  missionModuleIdAliasMap.get(normalizeModuleSpecifier(moduleSpecifier)) || '';

export const resolveMissionModuleManifest = (moduleId) =>
  missionModuleManifests.find((manifest) => manifest.id === resolveMissionModuleId(moduleId)) || missionModuleManifests[0];
