import type { StepId, StepDef, DesignType, StationType } from '../types/common';

/**
 * Full display names for each wizard step
 */
export const STEP_FULL_NAMES: Record<StepId, string> = {
  hull: 'Hull',
  armor: 'Armor',
  power: 'Power Plant',
  engines: 'Engines',
  ftl: 'FTL Drive',
  support: 'Support Systems',
  weapons: 'Weapons',
  defenses: 'Defenses',
  sensors: 'Sensors',
  c4: 'Command & Control',
  hangars: 'Hangars & Miscellaneous',
  damage: 'Damage Zones',
  summary: 'Summary',
};

/**
 * All wizard steps with their default required status (for warships)
 */
export const ALL_STEPS: StepDef[] = [
  { id: 'hull', label: 'Hull', required: true },
  { id: 'armor', label: 'Armor', required: false },
  { id: 'power', label: 'Power', required: true },
  { id: 'engines', label: 'Engines', required: true },
  { id: 'ftl', label: 'FTL', required: false },
  { id: 'support', label: 'Support', required: false },
  { id: 'weapons', label: 'Weapons', required: false },
  { id: 'defenses', label: 'Defenses', required: false },
  { id: 'sensors', label: 'Sensors', required: true },
  { id: 'c4', label: 'C4', required: true },
  { id: 'hangars', label: 'Misc', required: false },
  { id: 'damage', label: 'Zones', required: true },
  { id: 'summary', label: 'Summary', required: false },
];

/**
 * Get the visible steps based on design type and station type.
 * - Ground bases: no Engines, no FTL
 * - Outposts: no Engines, no FTL
 * - Space stations: Engines and FTL become optional
 * - Warships: all steps shown (Engines required, FTL optional)
 */
export function getStepsForDesign(designType: DesignType, stationType: StationType | null): StepDef[] {
  if (designType === 'warship') return ALL_STEPS;

  // Station types
  if (stationType === 'ground-base' || stationType === 'outpost') {
    // No engines, no FTL for ground installations
    return ALL_STEPS.filter(s => s.id !== 'engines' && s.id !== 'ftl');
  }

  // Space station: engines and FTL are optional
  return ALL_STEPS.map(s => {
    if (s.id === 'engines') return { ...s, required: false };
    return s;
  });
}
