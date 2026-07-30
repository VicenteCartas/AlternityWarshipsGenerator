/**
 * Warship import — convert a design from the Warships module into a battle unit.
 *
 * "The Externals" gives no formula for turning a constructed ship into a combat
 * strength, so this is a house rule. It is anchored on the observation that the
 * book's combat strengths track total hull points closely for fully-armed
 * warships: a Warships fighter has 10 hull points and the Hornisse light fighter
 * has a combat strength of 10; a heavy cruiser has 480 and the Invader has 500;
 * a battleship has 1,560 and the Tyrant has 1,500.
 *
 * Total hull points alone would rate an unarmed freighter as a battleship, so
 * the baseline is scaled by how much of the hull is devoted to fighting:
 *
 *   combat strength = total hull points x firepower factor x armor factor
 *
 *   firepower factor = (weapon HP + defense HP) / total HP / reference share
 *   armor factor     = 1 + armor HP / total HP
 *
 * Both factors are clamped, and every input is reported so a Gamemaster can see
 * where the number came from and override it.
 */

import type { BattleRules, UnitStack } from '../types/battle';
import type { WarshipSaveFile } from '@warships/types/saveFile';
import { deserializeWarship, jsonToSaveFile } from '@warships/services/saveService';
import { computeDesignSnapshot } from '@warships/services/designSnapshotService';
import { createCustomStack } from './battleResolutionService';

export interface WarshipCombatProfile {
  /** Design name from the save file. */
  name: string;
  /** Hull class name, for display. */
  hullName: string | null;
  totalHullPoints: number;
  weaponHullPoints: number;
  defenseHullPoints: number;
  armorHullPoints: number;
  /** Share of the hull devoted to weapons and defenses. */
  combatShare: number;
  firepowerFactor: number;
  armorFactor: number;
  /** The derived combat strength, rounded. */
  combatStrength: number;
  /** Non-fatal problems encountered while reading the design. */
  warnings: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Derive a combat strength from a Warships save file.
 * Returns null when the file cannot be read as a design.
 */
export function deriveCombatProfile(
  saveFile: WarshipSaveFile,
  rules: BattleRules,
): WarshipCombatProfile | null {
  const loaded = deserializeWarship(saveFile);
  if (!loaded.success || !loaded.state || !loaded.state.hull) return null;
  const state = loaded.state;
  const hull = state.hull!;

  const snapshot = computeDesignSnapshot({
    hull,
    armorLayers: state.armorLayers,
    installedPowerPlants: state.powerPlants,
    installedFuelTanks: state.fuelTanks,
    installedEngines: state.engines,
    installedEngineFuelTanks: state.engineFuelTanks,
    installedFTLDrive: state.ftlDrive,
    installedFTLFuelTanks: state.ftlFuelTanks,
    installedLifeSupport: state.lifeSupport,
    installedAccommodations: state.accommodations,
    installedStoreSystems: state.storeSystems,
    installedGravitySystems: state.gravitySystems,
    installedWeapons: state.weapons,
    ordnanceDesigns: state.ordnanceDesigns,
    installedLaunchSystems: state.launchSystems,
    installedDefenses: state.defenses,
    installedCommandControl: state.commandControl,
    installedSensors: state.sensors,
    installedHangarMisc: state.hangarMisc,
    designProgressLevel: state.designProgressLevel,
    designTechTracks: state.designTechTracks,
  });

  const config = rules.warshipImport;
  const totalHullPoints = snapshot.totalHP;
  const weaponHullPoints = snapshot.hpBreakdown.weapons;
  const defenseHullPoints = snapshot.hpBreakdown.defenses;
  const armorHullPoints = snapshot.hpBreakdown.armor;

  const combatShare = totalHullPoints > 0
    ? (weaponHullPoints + defenseHullPoints) / totalHullPoints
    : 0;
  const firepowerFactor = clamp(
    config.referenceCombatShare > 0 ? combatShare / config.referenceCombatShare : 0,
    config.minFirepowerFactor,
    config.maxFirepowerFactor,
  );
  const armorFactor = clamp(
    totalHullPoints > 0 ? 1 + armorHullPoints / totalHullPoints : 1,
    1,
    config.maxArmorFactor,
  );

  const warnings: string[] = [];
  if (loaded.warnings?.length) warnings.push(...loaded.warnings);
  if (weaponHullPoints + defenseHullPoints === 0) {
    warnings.push('This design carries no weapons or defenses, so its combat strength is at the floor of the house rule.');
  }

  return {
    name: saveFile.name || hull.name,
    hullName: hull.name,
    totalHullPoints,
    weaponHullPoints,
    defenseHullPoints,
    armorHullPoints,
    combatShare,
    firepowerFactor,
    armorFactor,
    combatStrength: Math.max(1, Math.round(totalHullPoints * firepowerFactor * armorFactor)),
    warnings,
  };
}

/** Read a .warship.json file and derive its combat profile. */
export async function loadWarshipCombatProfile(
  filePath: string,
  rules: BattleRules,
): Promise<{ profile: WarshipCombatProfile | null; error?: string }> {
  const api = window.electronAPI;
  if (!api) return { profile: null, error: 'Importing designs is only available in the desktop app.' };

  const fileResult = await api.readFile(filePath);
  if (!fileResult.success || !fileResult.content) {
    return { profile: null, error: fileResult.error || 'Could not read that design file.' };
  }
  const saveFile = jsonToSaveFile(fileResult.content);
  if (!saveFile) {
    return { profile: null, error: 'That file is not a valid warship design.' };
  }
  const profile = deriveCombatProfile(saveFile, rules);
  if (!profile) {
    return { profile: null, error: 'The design could not be read — it may be missing a hull.' };
  }
  return { profile };
}

/** Build an order-of-battle stack from an imported design. */
export function createStackFromWarshipProfile(params: {
  profile: WarshipCombatProfile;
  combatStrength: number;
  quantity: number;
  theatreId: string;
  rules: BattleRules;
}): UnitStack {
  const stack = createCustomStack({
    name: params.profile.name,
    combatStrength: Math.max(1, Math.round(params.combatStrength)),
    quantity: params.quantity,
    domain: 'space',
    crossDomainFactor: params.rules.crossDomain.shipBombardmentFactor,
    theatreId: params.theatreId,
    notes: params.profile.hullName
      ? `Imported design · ${params.profile.hullName} · ${params.profile.totalHullPoints} HP`
      : 'Imported design',
  });
  return { ...stack, source: 'warshipDesign' };
}
