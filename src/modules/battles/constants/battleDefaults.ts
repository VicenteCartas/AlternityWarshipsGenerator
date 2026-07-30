import type { BattleState, Theatre, TheatreKind } from '../types/battle';
import { getTheatreKindLabel } from '../services/battleFormatters';

/** Default withdraw thresholds from the book (human 40%, External 60%). */
export const DEFAULT_HUMAN_WITHDRAW_THRESHOLD = 0.4;
export const DEFAULT_EXTERNAL_WITHDRAW_THRESHOLD = 0.6;

/** Default Alternity skill score used for a competent commander. */
export const DEFAULT_TACTICS_SCORE = 12;

let theatreCounter = 0;

export function createTheatre(kind: TheatreKind, name?: string): Theatre {
  theatreCounter += 1;
  return {
    id: `theatre-${Date.now().toString(36)}-${theatreCounter}`,
    name: name?.trim() || getTheatreKindLabel(kind),
    kind,
    rounds: [],
  };
}

export function createEmptyBattle(): BattleState {
  return {
    scenarioName: 'New Engagement',
    sideA: {
      id: 'A',
      name: 'Verge Alliance',
      tacticsSpaceScore: DEFAULT_TACTICS_SCORE,
      tacticsGroundScore: DEFAULT_TACTICS_SCORE,
      stacks: [],
      withdrawThreshold: DEFAULT_HUMAN_WITHDRAW_THRESHOLD,
    },
    sideB: {
      id: 'B',
      name: 'I’krl Exeat',
      tacticsSpaceScore: DEFAULT_TACTICS_SCORE,
      tacticsGroundScore: DEFAULT_TACTICS_SCORE,
      stacks: [],
      withdrawThreshold: DEFAULT_EXTERNAL_WITHDRAW_THRESHOLD,
    },
    theatres: [createTheatre('space')],
  };
}
