import type { CivilizationDesign, GeneratedStarSystem } from './worldbuilding';
import type { ArtifactDesign } from './artifact';
import type { SectorDocument } from './sector';

export const SYSTEM_SAVE_FILE_VERSION = '1.0';
export const CIVILIZATION_SAVE_FILE_VERSION = '1.0';
export const ARTIFACT_SAVE_FILE_VERSION = '1.0';
export const SECTOR_SAVE_FILE_VERSION = '1.0';
export const SYSTEM_FILE_EXTENSION = '.system.json';
export const CIVILIZATION_FILE_EXTENSION = '.civilization.json';
export const ARTIFACT_FILE_EXTENSION = '.artifact.json';
export const SECTOR_FILE_EXTENSION = '.sector.json';

export interface StarSystemDocument {
  name: string;
  system: GeneratedStarSystem;
}

export interface StarSystemSaveFile {
  version: string;
  appVersion: string;
  createdAt: string;
  modifiedAt: string;
  document: StarSystemDocument;
}

export interface CivilizationSaveFile {
  version: string;
  appVersion: string;
  createdAt: string;
  modifiedAt: string;
  civilization: CivilizationDesign;
}

export interface ArtifactSaveFile {
  version: string;
  appVersion: string;
  createdAt: string;
  modifiedAt: string;
  artifact: ArtifactDesign;
}

export interface SectorSaveFile {
  version: string;
  appVersion: string;
  createdAt: string;
  modifiedAt: string;
  sector: SectorDocument;
}
