import type { StepDef, StepId } from '../types/common';
import type { WarshipState } from './saveService';

type SummaryValidationState = 'valid' | 'error' | 'warning';

/**
 * Determines whether a single step is completed based on the current design state.
 */
function isStepCompleted(stepId: StepId, state: WarshipState, summaryValidationState: SummaryValidationState): boolean {
  switch (stepId) {
    case 'hull': return state.hull !== null;
    case 'armor': return state.armorLayers.length > 0;
    case 'power': return state.powerPlants.length > 0;
    case 'engines': return state.engines.length > 0;
    case 'ftl': return state.ftlDrive !== null;
    case 'support': return state.lifeSupport.length > 0 || state.accommodations.length > 0 || state.storeSystems.length > 0;
    case 'weapons': return state.weapons.length > 0;
    case 'defenses': return state.defenses.length > 0;
    case 'sensors': return state.sensors.length > 0;
    case 'c4': return state.commandControl.some(s => s.type.isRequired);
    case 'hangars': return state.hangarMisc.length > 0;
    case 'damage': {
      if (state.damageDiagramZones.length === 0) return false;
      const totalAssigned = state.damageDiagramZones.reduce((sum, z) => sum + z.systems.length, 0);
      const totalSystems = state.powerPlants.length + state.fuelTanks.length +
        state.engines.length + state.engineFuelTanks.length +
        (state.ftlDrive ? 1 : 0) + state.ftlFuelTanks.length +
        state.lifeSupport.length + state.accommodations.length +
        state.storeSystems.length + state.gravitySystems.length +
        state.weapons.length + state.launchSystems.length +
        state.defenses.length + state.commandControl.length +
        state.sensors.length + state.hangarMisc.length;
      return totalAssigned >= totalSystems && totalSystems > 0;
    }
    case 'summary': return summaryValidationState === 'valid';
  }
}

/**
 * Calculates step completion status for all visible steps.
 */
export function calculateStepCompletion(
  steps: StepDef[],
  state: WarshipState,
  summaryValidationState: SummaryValidationState,
): { stepCompletion: Map<string, boolean>; completedStepCount: number } {
  const completion = new Map<string, boolean>();
  for (const step of steps) {
    completion.set(step.id, isStepCompleted(step.id, state, summaryValidationState));
  }
  const completedStepCount = [...completion.values()].filter(Boolean).length;
  return { stepCompletion: completion, completedStepCount };
}

/**
 * Checks if any components are installed beyond just the hull.
 */
export function hasAnyInstalledComponents(state: WarshipState): boolean {
  return (
    state.armorLayers.length > 0 ||
    state.powerPlants.length > 0 ||
    state.fuelTanks.length > 0 ||
    state.engines.length > 0 ||
    state.engineFuelTanks.length > 0 ||
    state.ftlDrive !== null ||
    state.ftlFuelTanks.length > 0 ||
    state.lifeSupport.length > 0 ||
    state.accommodations.length > 0 ||
    state.storeSystems.length > 0 ||
    state.gravitySystems.length > 0 ||
    state.weapons.length > 0 ||
    state.ordnanceDesigns.length > 0 ||
    state.launchSystems.length > 0 ||
    state.defenses.length > 0 ||
    state.commandControl.length > 0 ||
    state.sensors.length > 0 ||
    state.hangarMisc.length > 0 ||
    state.damageDiagramZones.length > 0
  );
}
