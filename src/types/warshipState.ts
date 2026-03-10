import type { Hull } from './hull';
import type { ShipArmor } from './armor';
import type { InstalledPowerPlant, InstalledFuelTank } from './powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from './engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from './ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from './supportSystem';
import type { InstalledDefenseSystem } from './defense';
import type { InstalledCommandControlSystem } from './commandControl';
import type { InstalledSensor } from './sensor';
import type { InstalledHangarMiscSystem } from './hangarMisc';
import type { InstalledWeapon } from './weapon';
import type { OrdnanceDesign, InstalledLaunchSystem } from './ordnance';
import type { ProgressLevel, TechTrack, DesignType, StationType } from './common';
import type { DamageZone, HitLocationChart } from './damageDiagram';
import type { ShipDescription } from './summary';
import type { Mod } from './mod';

/**
 * State representing the current warship configuration
 */
export interface WarshipState {
  name: string;
  createdAt: string | null;
  shipDescription: ShipDescription;
  designType: DesignType;
  stationType: StationType | null;
  surfaceProvidesLifeSupport: boolean;
  surfaceProvidesGravity: boolean;
  hull: Hull | null;
  armorLayers: ShipArmor[];
  powerPlants: InstalledPowerPlant[];
  fuelTanks: InstalledFuelTank[];
  engines: InstalledEngine[];
  engineFuelTanks: InstalledEngineFuelTank[];
  ftlDrive: InstalledFTLDrive | null;
  ftlFuelTanks: InstalledFTLFuelTank[];
  lifeSupport: InstalledLifeSupport[];
  accommodations: InstalledAccommodation[];
  storeSystems: InstalledStoreSystem[];
  gravitySystems: InstalledGravitySystem[];
  defenses: InstalledDefenseSystem[];
  commandControl: InstalledCommandControlSystem[];
  sensors: InstalledSensor[];
  hangarMisc: InstalledHangarMiscSystem[];
  weapons: InstalledWeapon[];
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  damageDiagramZones: DamageZone[];
  hitLocationChart: HitLocationChart | null;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  activeMods: Mod[];
}
