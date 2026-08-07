import type { StarSystemDocument } from '../types/campaignSaveFile';
import type { SectorDocument, SectorSystem } from '../types/sector';
import { generateStarSystem } from './starSystemGenerationService';
import {
  DEFAULT_SCIENCE_SETTINGS,
  createSeededRandom,
  generateScienceStarSystem,
} from './scienceStarSystemService';

function starColor(classification: string): string {
  if (classification.startsWith('O') || classification.startsWith('B')) return '#78a8ff';
  if (classification.startsWith('A')) return '#dcecff';
  if (classification.startsWith('F')) return '#fff1bd';
  if (classification.startsWith('G')) return '#f4d35e';
  if (classification.startsWith('K')) return '#eaa45b';
  if (classification.startsWith('M')) return '#e36b45';
  return '#b8d7df';
}

function updateSystem(document: SectorDocument, systemId: string, patch: Partial<SectorSystem>): SectorDocument {
  return {
    ...document,
    systems: document.systems.map((system) => system.id === systemId ? { ...system, ...patch } : system),
  };
}

export function developSectorSystem(document: SectorDocument, systemId: string): SectorDocument {
  const system = document.systems.find((entry) => entry.id === systemId);
  if (!system) return document;
  const seed = `${document.settings.seed}:${system.name}:${system.xLy},${system.yLy},${system.zLy}`;
  const developedSystem = document.settings.model === 'science'
    ? generateScienceStarSystem({
        seed,
        starCount: Math.min(3, Math.max(1, system.multiplicity)),
        settings: DEFAULT_SCIENCE_SETTINGS,
      })
    : generateStarSystem({
        starCount: Math.min(6, Math.max(1, system.multiplicity)),
        rng: createSeededRandom(seed),
      });
  const primary = developedSystem.stars[0];
  return updateSystem(document, systemId, {
    developedSystem,
    spectralClass: primary?.classification ?? system.spectralClass,
    color: primary ? starColor(primary.classification) : system.color,
    multiplicity: developedSystem.starCount,
  });
}

export function importDetailedSystem(
  document: SectorDocument,
  systemId: string,
  imported: StarSystemDocument,
): SectorDocument {
  const primary = imported.system.stars[0];
  return updateSystem(document, systemId, {
    name: imported.name || document.systems.find((entry) => entry.id === systemId)?.name || 'Imported System',
    developedSystem: imported.system,
    spectralClass: primary?.classification ?? 'Unknown',
    color: primary ? starColor(primary.classification) : '#b8d7df',
    multiplicity: imported.system.starCount,
  });
}

export function exportDetailedSystem(
  document: SectorDocument,
  systemId: string,
): StarSystemDocument | null {
  const system = document.systems.find((entry) => entry.id === systemId);
  if (!system?.developedSystem) return null;
  return { name: system.name, system: system.developedSystem };
}
