import type { BarSegment } from '../components/shared/ResourceBarChip';
import type { PowerScenario } from '../hooks/useDesignCalculations';
import { BUDGET_CATEGORY_COLORS } from './domainColors';

/** Breakdown shape for HP (no 'hull' key) */
interface HpBreakdown {
  armor: number;
  powerPlants: number;
  engines: number;
  ftlDrive: number;
  supportSystems: number;
  weapons: number;
  defenses: number;
  commandControl: number;
  sensors: number;
  hangarMisc: number;
}

/** Breakdown shape for power */
interface PowerBreakdown {
  engines: number;
  ftlDrive: number;
  supportSystems: number;
  weapons: number;
  defenses: number;
  commandControl: number;
  sensors: number;
  hangarMisc: number;
}

/** Breakdown shape for cost (includes 'hull') */
interface CostBreakdown {
  hull: number;
  armor: number;
  powerPlants: number;
  engines: number;
  ftlDrive: number;
  supportSystems: number;
  weapons: number;
  defenses: number;
  commandControl: number;
  sensors: number;
  hangarMisc: number;
}

/** Shared category definitions — order matches the app bar display */
const HP_CATEGORIES: { key: string; label: string; field: keyof HpBreakdown; colorKey: string }[] = [
  { key: 'armor', label: 'Armor', field: 'armor', colorKey: 'armor' },
  { key: 'powerPlants', label: 'Power Plants', field: 'powerPlants', colorKey: 'powerPlants' },
  { key: 'engines', label: 'Engines', field: 'engines', colorKey: 'engines' },
  { key: 'ftl', label: 'FTL Drive', field: 'ftlDrive', colorKey: 'ftl' },
  { key: 'support', label: 'Support Systems', field: 'supportSystems', colorKey: 'support' },
  { key: 'weapons', label: 'Weapons', field: 'weapons', colorKey: 'weapons' },
  { key: 'defenses', label: 'Defenses', field: 'defenses', colorKey: 'defenses' },
  { key: 'commandControl', label: 'C4', field: 'commandControl', colorKey: 'commandControl' },
  { key: 'sensors', label: 'Sensors', field: 'sensors', colorKey: 'sensors' },
  { key: 'hangarMisc', label: 'Hangars & Misc', field: 'hangarMisc', colorKey: 'hangarMisc' },
];

const COST_CATEGORIES: { key: string; label: string; field: keyof CostBreakdown; colorKey: string }[] = [
  { key: 'hull', label: 'Hull', field: 'hull', colorKey: 'hull' },
  ...HP_CATEGORIES.map(c => ({ ...c, field: c.field as keyof CostBreakdown })),
];

/** Power categories — same order as HP but without 'armor' */
const POWER_CATEGORIES: { key: string; label: string; field: keyof PowerBreakdown; scenarioField: keyof PowerScenario; colorKey: string }[] = [
  { key: 'engines', label: 'Engines', field: 'engines', scenarioField: 'engines', colorKey: 'engines' },
  { key: 'ftl', label: 'FTL Drive', field: 'ftlDrive', scenarioField: 'ftlDrive', colorKey: 'ftl' },
  { key: 'support', label: 'Support Systems', field: 'supportSystems', scenarioField: 'supportSystems', colorKey: 'support' },
  { key: 'weapons', label: 'Weapons', field: 'weapons', scenarioField: 'weapons', colorKey: 'weapons' },
  { key: 'defenses', label: 'Defenses', field: 'defenses', scenarioField: 'defenses', colorKey: 'defenses' },
  { key: 'commandControl', label: 'C4', field: 'commandControl', scenarioField: 'commandControl', colorKey: 'commandControl' },
  { key: 'sensors', label: 'Sensors', field: 'sensors', scenarioField: 'sensors', colorKey: 'sensors' },
  { key: 'hangarMisc', label: 'Hangars & Misc', field: 'hangarMisc', scenarioField: 'hangarMisc', colorKey: 'hangarMisc' },
];

export function buildHpSegments(breakdown: HpBreakdown): BarSegment[] {
  return HP_CATEGORIES.map(c => ({
    key: c.key,
    label: c.label,
    value: breakdown[c.field],
    color: BUDGET_CATEGORY_COLORS[c.colorKey],
  }));
}

export function buildCostSegments(breakdown: CostBreakdown): BarSegment[] {
  return COST_CATEGORIES.map(c => ({
    key: c.key,
    label: c.label,
    value: breakdown[c.field],
    color: BUDGET_CATEGORY_COLORS[c.colorKey],
  }));
}

export function buildPowerSegments(breakdown: PowerBreakdown, scenario: PowerScenario): BarSegment[] {
  return POWER_CATEGORIES
    .filter(c => scenario[c.scenarioField])
    .map(c => ({
      key: c.key,
      label: c.label,
      value: breakdown[c.field],
      color: BUDGET_CATEGORY_COLORS[c.colorKey],
    }));
}

export { POWER_CATEGORIES };
