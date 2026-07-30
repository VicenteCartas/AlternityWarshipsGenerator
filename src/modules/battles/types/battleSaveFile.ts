import type { SavedModReference } from '@shared/types/mod';
import type { BattleState } from './battle';

/**
 * Save file format for battle engagements (.battle.json).
 *
 * The battle state holds only raw values — combat strengths, quantities,
 * theatre assignments and resolved rounds — so serialization is a direct
 * snapshot. Anything derived (force strengths, effectiveness, step modifiers)
 * is recomputed from the current rules on load.
 */
export interface BattleSaveFile {
  /** File format version for future compatibility */
  version: string;
  /** App version that wrote the file, for diagnostics */
  appVersion: string;
  /** ISO timestamp when the file was created */
  createdAt: string;
  /** ISO timestamp when the file was last modified */
  modifiedAt: string;
  /** Mods that were active when this battle was saved */
  activeMods?: SavedModReference[];
  /** The engagement itself */
  battle: BattleState;
}

/** Current battle save file version */
export const BATTLE_SAVE_FILE_VERSION = '1.0';

/** File extension used for saved engagements */
export const BATTLE_FILE_EXTENSION = '.battle.json';
