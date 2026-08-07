import type { WarshipSaveFile } from '@warships/types/saveFile';
import { deserializeWarship, jsonToSaveFile } from '@warships/services/saveService';
import { calculateEngineStats } from '@warships/services/engineService';
import type { EngineType } from '@warships/types/engine';
import {
  accelerationRatingToMps2,
  type AccelerationConversionMethod,
  type WarshipsScaleId,
} from './travelCalculationService';
import type {
  EngineFuelAssessment,
  ImportedEngineProfile,
  ImportedTravelShip,
} from '../types/travelDocument';
export type {
  EngineFuelAssessment,
  ImportedEngineProfile,
  ImportedTravelShip,
} from '../types/travelDocument';

interface EngineAccumulator {
  type: EngineType;
  engineHullPoints: number;
}

/** Derive calculator inputs and fuel capacity from a Warships save file. */
export function deriveTravelShipProfile(saveFile: WarshipSaveFile): ImportedTravelShip | null {
  const loaded = deserializeWarship(saveFile);
  if (!loaded.success || !loaded.state?.hull) return null;

  const state = loaded.state;
  const hull = state.hull;
  if (!hull) return null;
  const grouped = new Map<string, EngineAccumulator>();

  for (const installation of state.engines) {
    const current = grouped.get(installation.type.id) ?? {
      type: installation.type,
      engineHullPoints: 0,
    };
    current.engineHullPoints += installation.hullPoints;
    grouped.set(installation.type.id, current);
  }

  const engines: ImportedEngineProfile[] = [...grouped.values()].map((group) => {
    const scaleId: WarshipsScaleId = group.type.usesPL6Scale ? 'pl6' : 'pl7plus';
    const accelerationRating = calculateEngineStats(
      { id: `travel-${group.type.id}`, type: group.type, hullPoints: group.engineHullPoints },
      hull,
    ).acceleration;
    const fuelTankHullPoints = state.engineFuelTanks
      .filter((tank) => tank.forEngineType.id === group.type.id)
      .reduce((sum, tank) => sum + tank.hullPoints, 0);
    const fuelEnduranceDays = group.type.requiresFuel && group.engineHullPoints > 0
      ? group.type.fuelEfficiency * fuelTankHullPoints / group.engineHullPoints
      : null;

    return {
      engineTypeId: group.type.id,
      name: group.type.name,
      scaleId,
      engineHullPoints: group.engineHullPoints,
      accelerationRating,
      accelerationMps2: accelerationRatingToMps2(accelerationRating, scaleId),
      requiresFuel: group.type.requiresFuel,
      fuelOptional: group.type.fuelOptional ?? false,
      fuelEfficiency: group.type.fuelEfficiency,
      fuelTankHullPoints,
      fuelEnduranceDays,
    };
  });

  const pl6AccelerationRating = engines
    .filter((engine) => engine.scaleId === 'pl6')
    .reduce((sum, engine) => sum + engine.accelerationRating, 0);
  const pl7AccelerationRating = engines
    .filter((engine) => engine.scaleId === 'pl7plus')
    .reduce((sum, engine) => sum + engine.accelerationRating, 0);
  const accelerationMps2 = engines.reduce((sum, engine) => sum + engine.accelerationMps2, 0);
  const warnings = [...(loaded.warnings ?? [])];

  if (engines.length === 0) {
    warnings.push('This design has no installed engines.');
  }
  if (pl6AccelerationRating > 0) {
    warnings.push(
      'This design includes PL6 engines. Scale-derived and Warships-published acceleration conversions produce very different results; use the selected calculation method.',
    );
  }
  if (pl6AccelerationRating > 0 && pl7AccelerationRating > 0) {
    warnings.push('This design mixes PL6 and PL7+ engine scales. Their ratings are converted separately using the selected method and combined in m/s^2.');
  }
  if (engines.some((engine) => engine.engineTypeId === 'photon-sail')) {
    warnings.push('Photon-sail acceleration varies with distance from its star; the calculator treats the imported rating as constant.');
  }
  if (engines.some((engine) => engine.engineTypeId === 'spatial-compressor')) {
    warnings.push('A spatial compressor changes distance rather than producing ordinary thrust; its real-world velocity and relativity results are illustrative only.');
  }

  return {
    name: saveFile.name || hull.name,
    hullName: hull.name,
    progressLevel: state.designProgressLevel,
    pl6AccelerationRating,
    pl7AccelerationRating,
    accelerationMps2,
    engines,
    hasAccelerationCompensation:
      engines.length > 0 && engines.every((engine) => engine.scaleId === 'pl7plus'),
    warnings,
  };
}

export function getImportedShipAccelerationMps2(
  ship: ImportedTravelShip,
  method: AccelerationConversionMethod = 'scale-derived',
): number {
  return ship.engines.reduce(
    (sum, engine) => sum + accelerationRatingToMps2(engine.accelerationRating, engine.scaleId, method),
    0,
  );
}

/** Read a .warship.json design and derive its travel profile. */
export async function loadTravelShipProfile(
  filePath: string,
): Promise<{ profile: ImportedTravelShip | null; error?: string }> {
  const api = window.electronAPI;
  if (!api) {
    return { profile: null, error: 'Importing designs is only available in the desktop app.' };
  }

  const result = await api.readFile(filePath);
  if (!result.success || !result.content) {
    return { profile: null, error: result.error || 'Could not read that design file.' };
  }
  const saveFile = jsonToSaveFile(result.content);
  if (!saveFile) {
    return { profile: null, error: 'That file is not a valid Warships design.' };
  }
  const profile = deriveTravelShipProfile(saveFile);
  if (!profile) {
    return { profile: null, error: 'The design could not be loaded or has no hull.' };
  }
  return { profile };
}

/**
 * Compare each imported engine's installed propellant against a trip's
 * shipboard thrust time. Thrust-days are measured aboard the vessel.
 */
export function assessEngineFuel(
  ship: ImportedTravelShip,
  shipBurnSeconds: number,
): EngineFuelAssessment[] {
  const thrustDays = Math.max(0, shipBurnSeconds) / 86_400;
  return ship.engines.map((engine) => {
    const requiredFuelHullPoints = engine.requiresFuel && engine.fuelEfficiency > 0
      ? thrustDays * engine.engineHullPoints / engine.fuelEfficiency
      : 0;
    const remainingFuelHullPoints = engine.fuelTankHullPoints - requiredFuelHullPoints;
    return {
      ...engine,
      requiredFuelHullPoints,
      remainingFuelHullPoints,
      hasEnoughFuel:
        !engine.requiresFuel || engine.fuelOptional || remainingFuelHullPoints >= -1e-9,
    };
  });
}
