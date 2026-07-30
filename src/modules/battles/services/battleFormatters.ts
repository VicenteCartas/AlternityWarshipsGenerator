/**
 * Display formatting for the battles module.
 * All user-facing labels for battle enums live here.
 */

import type {
  BattleDomain,
  BattleUnitCategory,
  CheckResult,
  TheatreKind,
  UnitSpecialization,
} from '../types/battle';

const CATEGORY_LABELS: Record<BattleUnitCategory, string> = {
  fighter: 'Fighters',
  cutter: 'Cutters & Scouts',
  destroyer: 'Destroyers',
  escort: 'Escorts',
  cruiser: 'Cruisers',
  carrier: 'Carriers',
  battleship: 'Battleships',
  dreadnought: 'Dreadnoughts',
  fortress: 'Fortress Ships',
  monitor: 'Monitors',
  cathedral: 'Cathedral Ships',
  systemDefense: 'System Defenses',
  infantry: 'Infantry',
  armor: 'Armor',
  artillery: 'Artillery',
  fortification: 'Fixed Fortifications',
  custom: 'Custom',
};

/** Display order for catalogue groupings. */
export const SPACE_CATEGORY_ORDER: BattleUnitCategory[] = [
  'fighter', 'cutter', 'destroyer', 'escort', 'cruiser',
  'carrier', 'battleship', 'dreadnought', 'fortress', 'monitor', 'cathedral',
];

export const GROUND_CATEGORY_ORDER: BattleUnitCategory[] = [
  'infantry', 'armor', 'artillery', 'fortification',
];

export function getUnitCategoryLabel(category: BattleUnitCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

const THEATRE_KIND_LABELS: Record<TheatreKind, string> = {
  space: 'Space Battle',
  bombardment: 'Orbital Bombardment',
  ground: 'Ground Battle',
};

export function getTheatreKindLabel(kind: TheatreKind): string {
  return THEATRE_KIND_LABELS[kind];
}

const THEATRE_KIND_DESCRIPTIONS: Record<TheatreKind, string> = {
  space: 'Fleets engaging each other in space. Ground units only contribute if they can fire on orbiting craft.',
  bombardment: 'Spacecraft firing on planetary targets. Ships fight at reduced strength unless designated bombers.',
  ground: 'Surface forces engaging each other. Resolved with Tactics–ground tactics.',
};

export function getTheatreKindDescription(kind: TheatreKind): string {
  return THEATRE_KIND_DESCRIPTIONS[kind];
}

const SPECIALIZATION_LABELS: Record<UnitSpecialization, string> = {
  none: 'Standard',
  bomber: 'Planet Bomber',
  planetaryDefenseBattery: 'Planetary Defense Battery',
};

export function getSpecializationLabel(spec: UnitSpecialization): string {
  return SPECIALIZATION_LABELS[spec];
}

export const CHECK_RESULT_LABELS: Record<CheckResult, string> = {
  criticalFailure: 'Critical Failure',
  failure: 'Failure',
  ordinary: 'Ordinary Success',
  good: 'Good Success',
  amazing: 'Amazing Success',
};

export function getCheckResultLabel(result: CheckResult): string {
  return CHECK_RESULT_LABELS[result];
}

export function getDomainLabel(domain: BattleDomain): string {
  return domain === 'space' ? 'Space' : 'Ground';
}

/** Short description of how a stack performs in a theatre, for tooltips. */
export function describeEffectiveness(factor: number | null): string {
  if (factor === null) return 'Cannot engage in this theatre';
  if (factor === 1) return 'Full combat strength';
  return `${Math.round(factor * 100)}% of combat strength`;
}

/** Format a combat strength for display, rounding away fractional attrition. */
export function formatCombatStrength(value: number): string {
  return Math.round(value).toLocaleString();
}

/** Format an Alternity step with an explicit sign. */
export function formatStepModifier(step: number): string {
  if (step < 0) return `-${Math.abs(step)}`;
  if (step > 0) return `+${step}`;
  return '0';
}

/** Format the full control-die expression for an Alternity step. */
export function formatTacticsDice(step: number, situationDie: number): string {
  if (situationDie <= 0 || step === 0) return 'd20';
  return `d20 ${step < 0 ? '-' : '+'} d${situationDie}`;
}
