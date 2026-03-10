import type { StepDef, StepId } from '../types/common';
import type { WarshipState } from '../types/warshipState';

type SummaryValidationState = 'valid' | 'error' | 'warning';

type CompletionCheck = (state: WarshipState, summaryValidationState: SummaryValidationState) => boolean;

const STEP_COMPLETION_CHECKS: Record<StepId, CompletionCheck> = {
  hull: (s) => s.hull !== null,
  armor: (s) => s.armorLayers.length > 0,
  power: (s) => s.powerPlants.length > 0,
  engines: (s) => s.engines.length > 0,
  ftl: (s) => s.ftlDrive !== null,
  support: (s) => s.lifeSupport.length > 0 || s.accommodations.length > 0 || s.storeSystems.length > 0,
  weapons: (s) => s.weapons.length > 0,
  defenses: (s) => s.defenses.length > 0,
  sensors: (s) => s.sensors.length > 0,
  c4: (s) => s.commandControl.some(c => c.type.isRequired),
  hangars: (s) => s.hangarMisc.length > 0,
  damage: (s) => {
    if (s.damageDiagramZones.length === 0) return false;
    const totalAssigned = s.damageDiagramZones.reduce((sum, z) => sum + z.systems.length, 0);
    const totalSystems = s.powerPlants.length + s.fuelTanks.length +
      s.engines.length + s.engineFuelTanks.length +
      (s.ftlDrive ? 1 : 0) + s.ftlFuelTanks.length +
      s.lifeSupport.length + s.accommodations.length +
      s.storeSystems.length + s.gravitySystems.length +
      s.weapons.length + s.launchSystems.length +
      s.defenses.length + s.commandControl.length +
      s.sensors.length + s.hangarMisc.length;
    return totalAssigned >= totalSystems && totalSystems > 0;
  },
  summary: (_s, v) => v === 'valid',
};

function isStepCompleted(stepId: StepId, state: WarshipState, summaryValidationState: SummaryValidationState): boolean {
  return STEP_COMPLETION_CHECKS[stepId](state, summaryValidationState);
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
