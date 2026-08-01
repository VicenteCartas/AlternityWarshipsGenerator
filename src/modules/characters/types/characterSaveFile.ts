import type { SavedModReference } from '@shared/types/mod';
import type { CharacterState } from './characterState';
import type { SavedCharacterSourcePackReference } from './sourcePack';

export const CHARACTER_SAVE_FILE_VERSION = '1.1';
export const CHARACTER_FILE_EXTENSION = '.character.json';

export interface CharacterSaveFile {
  version: string;
  appVersion: string;
  createdAt: string;
  modifiedAt: string;
  sourcePacks: SavedCharacterSourcePackReference[];
  activeMods?: SavedModReference[];
  character: CharacterState;
}