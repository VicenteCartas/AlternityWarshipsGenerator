import { Typography } from '@mui/material';
import type { Hull } from '../types/hull';
import type { ArmorWeight, ArmorType } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem } from '../types/ordnance';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { DamageZone } from '../types/damageDiagram';
import type { StepId, StepDef } from '../types/common';
import type { ShipDescription } from '../types/summary';
import type { WarshipState } from '../types/warshipState';
import { calculateCommandControlLifeSupportCoverageHp } from '../services/commandControlService';
import { HullSelection } from './HullSelection';
import { ArmorSelection } from './ArmorSelection';
import { PowerPlantSelection } from './PowerPlantSelection';
import { EngineSelection } from './EngineSelection';
import { FTLDriveSelection } from './FTLDriveSelection';
import { SupportSystemsSelection } from './SupportSystemsSelection';
import { WeaponSelection } from './WeaponSelection';
import { DefenseSelection } from './DefenseSelection';
import { CommandControlSelection } from './CommandControlSelection';
import { SensorSelection } from './SensorSelection';
import { HangarMiscSelection } from './HangarMiscSelection';
import { DamageDiagramSelection } from './DamageDiagramSelection';
import { SummarySelection } from './SummarySelection';

export interface StepContentProps {
  activeStepId: StepId | undefined;
  activeStep: number;
  steps: StepDef[];
  state: WarshipState;
  // Hull
  onHullSelect: (hull: Hull) => void;
  // Armor
  onArmorSelect: (weight: ArmorWeight, type: ArmorType) => void;
  onArmorClear: () => void;
  onArmorRemoveLayer: (weight: ArmorWeight) => void;
  // Power
  usedHullPointsBeforePowerPlants: number;
  totalPowerConsumed: number;
  onPowerPlantsChange: (v: InstalledPowerPlant[]) => void;
  onFuelTanksChange: (v: InstalledFuelTank[]) => void;
  // Engines
  usedHullPointsBeforeEngines: number;
  onEnginesChange: (v: InstalledEngine[]) => void;
  onEngineFuelTanksChange: (v: InstalledEngineFuelTank[]) => void;
  // FTL
  totalPower: number;
  onFTLDriveChange: (v: InstalledFTLDrive | null) => void;
  onFTLFuelTanksChange: (v: InstalledFTLFuelTank[]) => void;
  // Support
  onLifeSupportChange: (v: InstalledLifeSupport[]) => void;
  onAccommodationsChange: (v: InstalledAccommodation[]) => void;
  onStoreSystemsChange: (v: InstalledStoreSystem[]) => void;
  onGravitySystemsChange: (v: InstalledGravitySystem[]) => void;
  // Weapons
  onWeaponsChange: (v: InstalledWeapon[]) => void;
  onOrdnanceDesignsChange: (v: OrdnanceDesign[]) => void;
  onLaunchSystemsChange: (v: InstalledLaunchSystem[]) => void;
  // Defenses
  onDefensesChange: (v: InstalledDefenseSystem[]) => void;
  // Sensors
  onSensorsChange: (v: InstalledSensor[]) => void;
  // C4
  onCommandControlChange: (v: InstalledCommandControlSystem[]) => void;
  // Hangars
  totalPassengersAndSuspended: number;
  onHangarMiscChange: (v: InstalledHangarMiscSystem[]) => void;
  // Damage
  onZonesChange: (v: DamageZone[]) => void;
  // Summary
  onShipDescriptionChange: (v: ShipDescription) => void;
  currentFilePath: string | null;
  onShowNotification: (message: string, severity: 'success' | 'error' | 'warning' | 'info', action?: { label: string; onClick: () => void }) => void;
}

export function StepContentRenderer(props: StepContentProps) {
  const { activeStepId, activeStep, steps, state } = props;
  const selectedHull = state.hull;

  // Most steps require a hull to be selected first
  const requiresHull = activeStepId !== 'hull' && activeStepId !== 'summary';
  if (requiresHull && !selectedHull) {
    return (
      <Typography color="text.secondary">
        Please select a hull first.
      </Typography>
    );
  }

  switch (activeStepId) {
    case 'hull':
      return (
        <HullSelection
          selectedHull={selectedHull}
          onHullSelect={props.onHullSelect}
          designType={state.designType}
        />
      );
    case 'armor':
      return (
        <ArmorSelection
          hull={selectedHull!}
          armorLayers={state.armorLayers}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onArmorSelect={props.onArmorSelect}
          onArmorClear={props.onArmorClear}
          onArmorRemoveLayer={props.onArmorRemoveLayer}
        />
      );
    case 'power':
      return (
        <PowerPlantSelection
          hull={selectedHull!}
          installedPowerPlants={state.powerPlants}
          installedFuelTanks={state.fuelTanks}
          usedHullPoints={props.usedHullPointsBeforePowerPlants}
          totalPowerConsumed={props.totalPowerConsumed}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onPowerPlantsChange={props.onPowerPlantsChange}
          onFuelTanksChange={props.onFuelTanksChange}
        />
      );
    case 'engines':
      return (
        <EngineSelection
          hull={selectedHull!}
          installedEngines={state.engines}
          installedFuelTanks={state.engineFuelTanks}
          usedHullPoints={props.usedHullPointsBeforeEngines}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          isRequired={steps.find(s => s.id === 'engines')?.required ?? true}
          onEnginesChange={props.onEnginesChange}
          onFuelTanksChange={props.onEngineFuelTanksChange}
        />
      );
    case 'ftl':
      return (
        <FTLDriveSelection
          hull={selectedHull!}
          installedFTLDrive={state.ftlDrive}
          installedFTLFuelTanks={state.ftlFuelTanks}
          installedPowerPlants={state.powerPlants}
          availablePower={props.totalPower}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onFTLDriveChange={props.onFTLDriveChange}
          onFTLFuelTanksChange={props.onFTLFuelTanksChange}
        />
      );
    case 'support':
      return (
        <SupportSystemsSelection
          hull={selectedHull!}
          installedLifeSupport={state.lifeSupport}
          installedAccommodations={state.accommodations}
          installedStoreSystems={state.storeSystems}
          installedGravitySystems={state.gravitySystems}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          surfaceProvidesLifeSupport={state.surfaceProvidesLifeSupport}
          surfaceProvidesGravity={state.surfaceProvidesGravity}
          cockpitLifeSupportCoverageHp={calculateCommandControlLifeSupportCoverageHp(state.commandControl)}
          onLifeSupportChange={props.onLifeSupportChange}
          onAccommodationsChange={props.onAccommodationsChange}
          onStoreSystemsChange={props.onStoreSystemsChange}
          onGravitySystemsChange={props.onGravitySystemsChange}
        />
      );
    case 'weapons':
      return (
        <WeaponSelection
          hull={selectedHull!}
          installedWeapons={state.weapons}
          installedCommandControl={state.commandControl}
          ordnanceDesigns={state.ordnanceDesigns}
          launchSystems={state.launchSystems}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onWeaponsChange={props.onWeaponsChange}
          onOrdnanceDesignsChange={props.onOrdnanceDesignsChange}
          onLaunchSystemsChange={props.onLaunchSystemsChange}
        />
      );
    case 'defenses':
      return (
        <DefenseSelection
          hull={selectedHull!}
          installedDefenses={state.defenses}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onDefensesChange={props.onDefensesChange}
        />
      );
    case 'sensors':
      return (
        <SensorSelection
          installedSensors={state.sensors}
          installedCommandControl={state.commandControl}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onSensorsChange={props.onSensorsChange}
        />
      );
    case 'c4':
      return (
        <CommandControlSelection
          hull={selectedHull!}
          installedSystems={state.commandControl}
          installedSensors={state.sensors}
          installedWeapons={state.weapons}
          installedLaunchSystems={state.launchSystems}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          onSystemsChange={props.onCommandControlChange}
        />
      );
    case 'hangars':
      return (
        <HangarMiscSelection
          hull={selectedHull!}
          installedSystems={state.hangarMisc}
          designProgressLevel={state.designProgressLevel}
          designTechTracks={state.designTechTracks}
          totalPassengersAndSuspended={props.totalPassengersAndSuspended}
          ordnanceDesigns={state.ordnanceDesigns}
          onSystemsChange={props.onHangarMiscChange}
        />
      );
    case 'damage':
      return (
        <DamageDiagramSelection
          state={state}
          zones={state.damageDiagramZones}
          onZonesChange={props.onZonesChange}
        />
      );
    case 'summary':
      return (
        <SummarySelection
          state={state}
          onShipDescriptionChange={props.onShipDescriptionChange}
          currentFilePath={props.currentFilePath}
          onShowNotification={props.onShowNotification}
        />
      );
    default:
      return (
        <Typography color="text.secondary">
          Step {activeStep + 1}: {steps[activeStep]?.label} - Coming soon...
        </Typography>
      );
  }
}
