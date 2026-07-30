/**
 * Battle save service — serialize, parse and migrate .battle.json files.
 *
 * Battle state is already plain data, so serializing is a snapshot. Loading is
 * where the work happens: older files are migrated forward and every field is
 * defensively defaulted so a hand-edited or truncated file cannot crash the app.
 */

import { APP_VERSION } from '@shared/constants/version';
import type { Mod, SavedModReference } from '@shared/types/mod';
import type {
  BattleDomain, BattleState, BattleUnitCategory, CheckResult, RoundResult,
  Side, SideId, Theatre, TheatreKind, UnitSpecialization, UnitStack,
} from '../types/battle';
import type { BattleSaveFile } from '../types/battleSaveFile';
import { BATTLE_FILE_EXTENSION, BATTLE_SAVE_FILE_VERSION } from '../types/battleSaveFile';
import {
  DEFAULT_EXTERNAL_WITHDRAW_THRESHOLD, DEFAULT_HUMAN_WITHDRAW_THRESHOLD,
  DEFAULT_TACTICS_SCORE, createTheatre,
} from '../constants/battleDefaults';

export interface BattleLoadResult {
  success: boolean;
  battle?: BattleState;
  errors?: string[];
  warnings?: string[];
}

const THEATRE_KINDS: TheatreKind[] = ['space', 'bombardment', 'ground'];
const SPECIALIZATIONS: UnitSpecialization[] = ['none', 'bomber', 'planetaryDefenseBattery'];
const CHECK_RESULTS: CheckResult[] = ['criticalFailure', 'failure', 'ordinary', 'good', 'amazing'];

// ============== Serialize ==============

export function serializeBattle(battle: BattleState, activeMods: Mod[] = [], createdAt?: string): BattleSaveFile {
  const now = new Date().toISOString();
  const mods: SavedModReference[] = activeMods.map((m) => ({
    name: m.manifest.name,
    version: m.manifest.version,
  }));
  return {
    version: BATTLE_SAVE_FILE_VERSION,
    appVersion: APP_VERSION,
    createdAt: createdAt || now,
    modifiedAt: now,
    ...(mods.length > 0 ? { activeMods: mods } : {}),
    battle,
  };
}

export function battleSaveFileToJson(saveFile: BattleSaveFile): string {
  return JSON.stringify(saveFile, null, 2);
}

export function jsonToBattleSaveFile(json: string): BattleSaveFile | null {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const candidate = parsed as Partial<BattleSaveFile>;
    if (!candidate.battle || typeof candidate.battle !== 'object') return null;
    return candidate as BattleSaveFile;
  } catch {
    return null;
  }
}

// ============== Deserialize ==============

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readTheatres(raw: unknown, warnings: string[]): Theatre[] {
  const list = Array.isArray(raw) ? raw : [];
  const theatres: Theatre[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Partial<Theatre>;
    const kind = THEATRE_KINDS.includes(t.kind as TheatreKind) ? (t.kind as TheatreKind) : 'space';
    if (t.kind && kind !== t.kind) {
      warnings.push(`Unknown theatre type "${String(t.kind)}" — treated as a space battle.`);
    }
    theatres.push({
      id: str(t.id, `theatre-${theatres.length + 1}`),
      name: str(t.name, 'Engagement'),
      kind,
      rounds: readRounds(t.rounds),
    });
  }

  if (theatres.length === 0) {
    warnings.push('The file had no theatres, so a space battle was created.');
    theatres.push(createTheatre('space'));
  }
  return theatres;
}

function readRounds(raw: unknown): RoundResult[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r, idx) => ({
      round: num(r.round, idx + 1),
      attackerSide: r.attackerSide === 'B' ? 'B' : 'A',
      defenderSide: r.defenderSide === 'A' ? 'A' : 'B',
      attackerStrengthBefore: num(r.attackerStrengthBefore, 0),
      defenderStrengthBefore: num(r.defenderStrengthBefore, 0),
      ratio: num(r.ratio, 0),
      stepModifier: num(r.stepModifier, -1),
      checkResult: CHECK_RESULTS.includes(r.checkResult as CheckResult)
        ? (r.checkResult as CheckResult)
        : 'ordinary',
      attackerLossPct: num(r.attackerLossPct, 0),
      defenderLossPct: num(r.defenderLossPct, 0),
      attackerStrengthAfter: num(r.attackerStrengthAfter, 0),
      defenderStrengthAfter: num(r.defenderStrengthAfter, 0),
      ...(typeof r.notes === 'string' ? { notes: r.notes } : {}),
    }));
}

function readStacks(raw: unknown, theatres: Theatre[], warnings: string[], sideName: string): UnitStack[] {
  const list = Array.isArray(raw) ? raw : [];
  const validTheatreIds = new Set(theatres.map((t) => t.id));
  const fallbackTheatreId = theatres[0].id;
  const stacks: UnitStack[] = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const s = item as Record<string, unknown>;

    const combatStrengthPerUnit = num(s.combatStrengthPerUnit, 0);
    const initialQuantity = Math.max(1, Math.floor(num(s.initialQuantity, 1)));
    const domain: BattleDomain = s.domain === 'ground' ? 'ground' : 'space';

    let theatreId = str(s.theatreId, fallbackTheatreId);
    if (!validTheatreIds.has(theatreId)) {
      warnings.push(`${sideName}: "${str(s.name, 'a unit')}" referenced a missing theatre and was moved to "${theatres[0].name}".`);
      theatreId = fallbackTheatreId;
    }

    const crossDomainFactor =
      typeof s.crossDomainFactor === 'number' && Number.isFinite(s.crossDomainFactor)
        ? s.crossDomainFactor
        : null;

    stacks.push({
      id: str(s.id, `stack-${stacks.length + 1}`),
      name: str(s.name, 'Unnamed unit'),
      combatStrengthPerUnit,
      initialQuantity,
      currentStrength: num(s.currentStrength, combatStrengthPerUnit * initialQuantity),
      category: (typeof s.category === 'string' ? s.category : 'custom') as BattleUnitCategory,
      domain,
      crossDomainFactor,
      ...(typeof s.canBePlanetaryDefenseBattery === 'boolean'
        ? { canBePlanetaryDefenseBattery: s.canBePlanetaryDefenseBattery }
        : {}),
      specialization: SPECIALIZATIONS.includes(s.specialization as UnitSpecialization)
        ? (s.specialization as UnitSpecialization)
        : 'none',
      theatreId,
      ...(typeof s.notes === 'string' ? { notes: s.notes } : {}),
      source: (['catalogue', 'custom', 'systemDefense', 'warshipDesign'] as const)
        .includes(s.source as never)
        ? (s.source as UnitStack['source'])
        : 'custom',
    });
  }
  return stacks;
}

function readSide(raw: unknown, id: SideId, theatres: Theatre[], warnings: string[]): Side {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const defaultName = id === 'A' ? 'Side A' : 'Side B';
  const defaultThreshold = id === 'A'
    ? DEFAULT_HUMAN_WITHDRAW_THRESHOLD
    : DEFAULT_EXTERNAL_WITHDRAW_THRESHOLD;
  const name = str(s.name, defaultName);

  // Pre-1.0 drafts stored a single `tacticsScore`; use it for both skills.
  const legacyTactics = num(s.tacticsScore, DEFAULT_TACTICS_SCORE);

  return {
    id,
    name,
    tacticsSpaceScore: num(s.tacticsSpaceScore, legacyTactics),
    tacticsGroundScore: num(s.tacticsGroundScore, legacyTactics),
    stacks: readStacks(s.stacks, theatres, warnings, name),
    withdrawThreshold: num(s.withdrawThreshold, defaultThreshold),
  };
}

/**
 * Rebuild a battle from a save file, migrating older formats and defaulting
 * anything missing or malformed.
 */
export function deserializeBattle(saveFile: BattleSaveFile): BattleLoadResult {
  const warnings: string[] = [];

  const raw = saveFile.battle as unknown;
  if (!raw || typeof raw !== 'object') {
    return { success: false, errors: ['The file does not contain a battle.'] };
  }
  const battle = raw as Record<string, unknown>;

  if (saveFile.version && saveFile.version !== BATTLE_SAVE_FILE_VERSION) {
    warnings.push(
      `This engagement was saved in format ${saveFile.version}; it has been migrated to ${BATTLE_SAVE_FILE_VERSION}.`,
    );
  }

  // Pre-1.0 drafts kept a single flat `rounds` array instead of theatres.
  let theatres: Theatre[];
  if (!battle.theatres && Array.isArray(battle.rounds)) {
    const legacy = createTheatre('space');
    theatres = [{ ...legacy, rounds: readRounds(battle.rounds) }];
    warnings.push('Rounds from an older engagement were moved into a single space theatre.');
  } else {
    theatres = readTheatres(battle.theatres, warnings);
  }

  const restored: BattleState = {
    scenarioName: str(battle.scenarioName, 'Untitled Engagement'),
    sideA: readSide(battle.sideA, 'A', theatres, warnings),
    sideB: readSide(battle.sideB, 'B', theatres, warnings),
    theatres,
  };

  if (theatres.some((theatre) => theatre.rounds.some((round) => round.stepModifier > 0))) {
    warnings.push(
      'Some rounds use the previous, reversed tactical-advantage sign. Reset and resolve them again to use the corrected bonus.',
    );
  }

  return { success: true, battle: restored, warnings: warnings.length > 0 ? warnings : undefined };
}

// ============== File naming ==============

/** Turn a scenario name into a safe default file name. */
export function getDefaultBattleFileName(scenarioName: string): string {
  const base = (scenarioName || 'Engagement')
    .trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'Engagement';
  return `${base}${BATTLE_FILE_EXTENSION}`;
}
