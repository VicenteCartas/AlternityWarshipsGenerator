import type { CivilizationDesign, GeneratedStarSystem } from './worldbuilding';

export const SYSTEM_SAVE_FILE_VERSION = '1.0';
export const CIVILIZATION_SAVE_FILE_VERSION = '1.0';
export const SYSTEM_FILE_EXTENSION = '.system.json';
export const CIVILIZATION_FILE_EXTENSION = '.civilization.json';

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
