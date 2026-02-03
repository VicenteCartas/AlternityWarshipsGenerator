import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  TextField,
  InputAdornment,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Popover,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import { WelcomePage } from './components/WelcomePage';
import { HullSelection } from './components/HullSelection';
import { ArmorSelection } from './components/ArmorSelection';
import { PowerPlantSelection } from './components/PowerPlantSelection';
import { EngineSelection } from './components/EngineSelection';
import { FTLDriveSelection } from './components/FTLDriveSelection';
import { SupportSystemsSelection } from './components/SupportSystemsSelection';
import { WeaponSelection } from './components/WeaponSelection';
import { DefenseSelection } from './components/DefenseSelection';
import { CommandControlSelection } from './components/CommandControlSelection';
import { SensorSelection } from './components/SensorSelection';
import { HangarMiscSelection } from './components/HangarMiscSelection';
import { DamageDiagramSelection } from './components/DamageDiagramSelection';
import { SummarySelection } from './components/SummarySelection';
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from './types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from './types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from './types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from './types/supportSystem';
import type { InstalledWeapon } from './types/weapon';
import type { InstalledDefenseSystem } from './types/defense';
import type { InstalledCommandControlSystem } from './types/commandControl';
import type { InstalledSensor } from './types/sensor';
import type { InstalledHangarMiscSystem } from './types/hangarMisc';
import type { OrdnanceDesign, InstalledLaunchSystem } from './types/ordnance';
import type { ProgressLevel, TechTrack } from './types/common';
import type { DamageZone, HitLocationChart } from './types/damageDiagram';
import type { ShipDescription } from './types/summary';
import './types/electron.d.ts';
import { calculateHullStats } from './types/hull';
import { calculateArmorHullPoints, calculateArmorCost } from './services/armorService';
import { calculateTotalPowerPlantStats } from './services/powerPlantService';
import { calculateTotalEngineStats } from './services/engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats } from './services/ftlDriveService';
import { calculateSupportSystemsStats } from './services/supportSystemService';
import { calculateWeaponStats } from './services/weaponService';
import { calculateOrdnanceStats } from './services/ordnanceService';
import { calculateDefenseStats } from './services/defenseService';
import { calculateCommandControlStats } from './services/commandControlService';
import { calculateSensorStats } from './services/sensorService';
import { calculateHangarMiscStats } from './services/hangarMiscService';
import { formatCost, getTechTrackName, ALL_TECH_TRACK_CODES } from './services/formatters';
import { loadAllGameData } from './services/dataLoader';
import { 
  serializeWarship, 
  saveFileToJson, 
  jsonToSaveFile, 
  deserializeWarship, 
  getDefaultFileName,
  type WarshipState 
} from './services/saveService';

type AppMode = 'welcome' | 'builder' | 'loading';

const steps = [
  { label: 'Hull', required: true },
  { label: 'Armor', required: false },
  { label: 'Power', required: true },
  { label: 'Engines', required: true },
  { label: 'FTL', required: false },
  { label: 'Support', required: false },
  { label: 'Weapons', required: false },
  { label: 'Defense', required: false },
  { label: 'Sensors', required: true },  // Moved before C4 so sensor controls can reference sensors
  { label: 'C4', required: true },       // Command & Control now comes after Sensors
  { label: 'Misc', required: false },
  { label: 'Zones', required: true },   // Damage Diagram - all systems must be assigned
  { label: 'Summary', required: false }, // Final summary
];

// Progress level display names
const PL_NAMES: Record<ProgressLevel, string> = {
  6: 'PL6 - Fusion Age',
  7: 'PL7 - Gravity Age',
  8: 'PL8 - Energy Age',
  9: 'PL9 - Matter Age',
};

function App() {
  const [mode, setMode] = useState<AppMode>('loading');
  const [activeStep, setActiveStep] = useState(0);
  const [selectedHull, setSelectedHull] = useState<Hull | null>(null);
  const [selectedArmorWeight, setSelectedArmorWeight] = useState<ArmorWeight | null>(null);
  const [selectedArmorType, setSelectedArmorType] = useState<ArmorType | null>(null);
  const [installedPowerPlants, setInstalledPowerPlants] = useState<InstalledPowerPlant[]>([]);
  const [installedFuelTanks, setInstalledFuelTanks] = useState<InstalledFuelTank[]>([]);
  const [installedEngines, setInstalledEngines] = useState<InstalledEngine[]>([]);
  const [installedEngineFuelTanks, setInstalledEngineFuelTanks] = useState<InstalledEngineFuelTank[]>([]);
  const [installedFTLDrive, setInstalledFTLDrive] = useState<InstalledFTLDrive | null>(null);
  const [installedFTLFuelTanks, setInstalledFTLFuelTanks] = useState<InstalledFTLFuelTank[]>([]);
  const [installedLifeSupport, setInstalledLifeSupport] = useState<InstalledLifeSupport[]>([]);
  const [installedAccommodations, setInstalledAccommodations] = useState<InstalledAccommodation[]>([]);
  const [installedStoreSystems, setInstalledStoreSystems] = useState<InstalledStoreSystem[]>([]);
  const [installedGravitySystems, setInstalledGravitySystems] = useState<InstalledGravitySystem[]>([]);
  const [installedWeapons, setInstalledWeapons] = useState<InstalledWeapon[]>([]);
  const [ordnanceDesigns, setOrdnanceDesigns] = useState<OrdnanceDesign[]>([]);
  const [installedLaunchSystems, setInstalledLaunchSystems] = useState<InstalledLaunchSystem[]>([]);
  const [installedDefenses, setInstalledDefenses] = useState<InstalledDefenseSystem[]>([]);
  const [installedCommandControl, setInstalledCommandControl] = useState<InstalledCommandControlSystem[]>([]);
  const [installedSensors, setInstalledSensors] = useState<InstalledSensor[]>([]);
  const [installedHangarMisc, setInstalledHangarMisc] = useState<InstalledHangarMiscSystem[]>([]);
  
  // Damage diagram state
  const [damageDiagramZones, setDamageDiagramZones] = useState<DamageZone[]>([]);
  const [hitLocationChart, setHitLocationChart] = useState<HitLocationChart | null>(null);
  
  // Ship description (lore and image)
  const [shipDescription, setShipDescription] = useState<ShipDescription>({
    lore: '',
    imageData: null,
    imageMimeType: null,
  });
  
  const [warshipName, setWarshipName] = useState<string>('New Ship');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  
  // Design constraints - filter available components
  const [designProgressLevel, setDesignProgressLevel] = useState<ProgressLevel>(9);
  const [designTechTracks, setDesignTechTracks] = useState<TechTrack[]>([]);
  
  // Tech track popover anchor
  const [techAnchorEl, setTechAnchorEl] = useState<HTMLElement | null>(null);
  
  // Power scenario popover and toggles
  const [powerAnchorEl, setPowerAnchorEl] = useState<HTMLElement | null>(null);
  
  // HP and Cost breakdown popover anchors
  const [hpAnchorEl, setHpAnchorEl] = useState<HTMLElement | null>(null);
  const [costAnchorEl, setCostAnchorEl] = useState<HTMLElement | null>(null);
  
  const [powerScenario, setPowerScenario] = useState({
    engines: true,
    ftlDrive: true,
    supportSystems: true,
    weapons: true,
    defenses: true,
    commandControl: true,
    sensors: true,
    hangarMisc: true,
  });
  
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Load game data on startup
  useEffect(() => {
    async function initializeApp() {
      await loadAllGameData();
      setMode('welcome');
    }
    initializeApp();
  }, []);

  const showNotification = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleNewWarship = useCallback(() => {
    // Reset all state for a new warship
    setActiveStep(0);
    setSelectedHull(null);
    setSelectedArmorWeight(null);
    setSelectedArmorType(null);
    setInstalledPowerPlants([]);
    setInstalledFuelTanks([]);
    setInstalledEngines([]);
    setInstalledEngineFuelTanks([]);
    setInstalledFTLDrive(null);
    setInstalledFTLFuelTanks([]);
    setInstalledLifeSupport([]);
    setInstalledAccommodations([]);
    setInstalledStoreSystems([]);
    setInstalledGravitySystems([]);
    setInstalledWeapons([]);
    setOrdnanceDesigns([]);
    setInstalledLaunchSystems([]);
    setInstalledDefenses([]);
    setInstalledCommandControl([]);
    setInstalledSensors([]);
    setInstalledHangarMisc([]);
    setDamageDiagramZones([]);
    setHitLocationChart(null);
    setShipDescription({ lore: '', imageData: null, imageMimeType: null });
    setWarshipName('New Ship');
    setCurrentFilePath(null);
    setDesignProgressLevel(9);
    setDesignTechTracks([]);
    setMode('builder');
  }, []);

  const handleLoadWarship = useCallback(async () => {
    if (!window.electronAPI) {
      showNotification('Load functionality requires Electron', 'error');
      return;
    }

    try {
      const dialogResult = await window.electronAPI.showOpenDialog();
      if (dialogResult.canceled || dialogResult.filePaths.length === 0) {
        return;
      }

      const filePath = dialogResult.filePaths[0];
      const readResult = await window.electronAPI.readFile(filePath);
      
      if (!readResult.success || !readResult.content) {
        showNotification(`Failed to read file: ${readResult.error}`, 'error');
        return;
      }

      const saveFile = jsonToSaveFile(readResult.content);
      if (!saveFile) {
        showNotification('Invalid warship file format', 'error');
        return;
      }

      const loadResult = deserializeWarship(saveFile);
      if (!loadResult.success || !loadResult.state) {
        showNotification(`Failed to load warship: ${loadResult.errors?.join(', ')}`, 'error');
        return;
      }

      // Apply loaded state
      setSelectedHull(loadResult.state.hull);
      setSelectedArmorWeight(loadResult.state.armorWeight);
      setSelectedArmorType(loadResult.state.armorType);
      setInstalledPowerPlants(loadResult.state.powerPlants || []);
      setInstalledFuelTanks(loadResult.state.fuelTanks || []);
      setInstalledEngines(loadResult.state.engines || []);
      setInstalledEngineFuelTanks(loadResult.state.engineFuelTanks || []);
      setInstalledFTLDrive(loadResult.state.ftlDrive || null);
      setInstalledFTLFuelTanks(loadResult.state.ftlFuelTanks || []);
      setInstalledLifeSupport(loadResult.state.lifeSupport || []);
      setInstalledAccommodations(loadResult.state.accommodations || []);
      setInstalledStoreSystems(loadResult.state.storeSystems || []);
      setInstalledGravitySystems(loadResult.state.gravitySystems || []);
      setInstalledDefenses(loadResult.state.defenses || []);
      setInstalledCommandControl(loadResult.state.commandControl || []);
      setInstalledSensors(loadResult.state.sensors || []);
      setInstalledHangarMisc(loadResult.state.hangarMisc || []);
      setInstalledWeapons(loadResult.state.weapons || []);
      setOrdnanceDesigns(loadResult.state.ordnanceDesigns || []);
      setInstalledLaunchSystems(loadResult.state.launchSystems || []);
      setDamageDiagramZones(loadResult.state.damageDiagramZones || []);
      setHitLocationChart(loadResult.state.hitLocationChart || null);
      setShipDescription(loadResult.state.shipDescription || { lore: '', imageData: null, imageMimeType: null });
      setWarshipName(loadResult.state.name);
      setDesignProgressLevel(loadResult.state.designProgressLevel);
      setDesignTechTracks(loadResult.state.designTechTracks);
      setCurrentFilePath(filePath);
      setActiveStep(0);
      setMode('builder');

      if (loadResult.warnings && loadResult.warnings.length > 0) {
        showNotification(`Loaded with warnings: ${loadResult.warnings.join(', ')}`, 'warning');
      } else {
        showNotification(`Loaded: ${loadResult.state.name}`, 'success');
      }
    } catch (error) {
      showNotification(`Error loading file: ${error}`, 'error');
    }
  }, []);

  // Helper function to perform the actual save to a file path
  const saveToFile = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.electronAPI || !selectedHull) return false;

    const state: WarshipState = {
      name: warshipName,
      shipDescription,
      hull: selectedHull,
      armorWeight: selectedArmorWeight,
      armorType: selectedArmorType,
      powerPlants: installedPowerPlants,
      fuelTanks: installedFuelTanks,
      engines: installedEngines,
      engineFuelTanks: installedEngineFuelTanks,
      ftlDrive: installedFTLDrive,
      ftlFuelTanks: installedFTLFuelTanks,
      lifeSupport: installedLifeSupport,
      accommodations: installedAccommodations,
      storeSystems: installedStoreSystems,
      gravitySystems: installedGravitySystems,
      defenses: installedDefenses,
      commandControl: installedCommandControl,
      sensors: installedSensors,
      hangarMisc: installedHangarMisc,
      weapons: installedWeapons,
      ordnanceDesigns: ordnanceDesigns,
      launchSystems: installedLaunchSystems,
      damageDiagramZones: damageDiagramZones,
      hitLocationChart: hitLocationChart,
      designProgressLevel,
      designTechTracks,
    };

    try {
      const saveFile = serializeWarship(state);
      const json = saveFileToJson(saveFile);
      const saveResult = await window.electronAPI.saveFile(filePath, json);

      if (saveResult.success) {
        setCurrentFilePath(filePath);
        showNotification('Warship saved successfully', 'success');
        return true;
      } else {
        showNotification(`Failed to save: ${saveResult.error}`, 'error');
        return false;
      }
    } catch (error) {
      showNotification(`Error saving file: ${error}`, 'error');
      return false;
    }
  }, [selectedHull, selectedArmorWeight, selectedArmorType, installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks, installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc, installedWeapons, ordnanceDesigns, installedLaunchSystems, damageDiagramZones, hitLocationChart, warshipName, shipDescription, designProgressLevel, designTechTracks]);

  // Save As - always prompts for file location
  const handleSaveWarshipAs = useCallback(async () => {
    if (!window.electronAPI) {
      showNotification('Save functionality requires Electron', 'error');
      return;
    }

    if (!selectedHull) {
      showNotification('Please select a hull before saving', 'warning');
      return;
    }

    const state: WarshipState = {
      name: warshipName,
      shipDescription,
      hull: selectedHull,
      armorWeight: selectedArmorWeight,
      armorType: selectedArmorType,
      powerPlants: installedPowerPlants,
      fuelTanks: installedFuelTanks,
      engines: installedEngines,
      engineFuelTanks: installedEngineFuelTanks,
      ftlDrive: installedFTLDrive,
      ftlFuelTanks: installedFTLFuelTanks,
      lifeSupport: installedLifeSupport,
      accommodations: installedAccommodations,
      storeSystems: installedStoreSystems,
      gravitySystems: installedGravitySystems,
      defenses: installedDefenses,
      commandControl: installedCommandControl,
      sensors: installedSensors,
      hangarMisc: installedHangarMisc,
      weapons: installedWeapons,
      ordnanceDesigns: ordnanceDesigns,
      launchSystems: installedLaunchSystems,
      damageDiagramZones: damageDiagramZones,
      hitLocationChart: hitLocationChart,
      designProgressLevel,
      designTechTracks,
    };

    try {
      const defaultFileName = getDefaultFileName(state);
      const dialogResult = await window.electronAPI.showSaveDialog(defaultFileName);
      
      if (dialogResult.canceled || !dialogResult.filePath) {
        return;
      }

      await saveToFile(dialogResult.filePath);
    } catch (error) {
      showNotification(`Error saving file: ${error}`, 'error');
    }
  }, [selectedHull, selectedArmorWeight, selectedArmorType, installedPowerPlants, installedFuelTanks, installedEngines, installedEngineFuelTanks, installedFTLDrive, installedFTLFuelTanks, installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, installedDefenses, installedCommandControl, installedSensors, installedHangarMisc, installedWeapons, ordnanceDesigns, installedLaunchSystems, damageDiagramZones, hitLocationChart, warshipName, shipDescription, designProgressLevel, designTechTracks, saveToFile]);

  // Save - saves to current file or prompts if no file yet
  const handleSaveWarship = useCallback(async () => {
    if (!window.electronAPI) {
      showNotification('Save functionality requires Electron', 'error');
      return;
    }

    if (!selectedHull) {
      showNotification('Please select a hull before saving', 'warning');
      return;
    }

    // If we have a current file path, save directly to it
    if (currentFilePath) {
      await saveToFile(currentFilePath);
      return;
    }

    // Otherwise, behave like Save As
    await handleSaveWarshipAs();
  }, [selectedHull, currentFilePath, saveToFile, handleSaveWarshipAs]);

  // Listen for Electron menu events
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onNewWarship(() => {
        handleNewWarship();
      });
      window.electronAPI.onLoadWarship(() => {
        handleLoadWarship();
      });
      window.electronAPI.onSaveWarship(() => {
        handleSaveWarship();
      });
      window.electronAPI.onSaveWarshipAs(() => {
        handleSaveWarshipAs();
      });

      return () => {
        window.electronAPI?.removeAllListeners('menu-new-warship');
        window.electronAPI?.removeAllListeners('menu-load-warship');
        window.electronAPI?.removeAllListeners('menu-save-warship');
        window.electronAPI?.removeAllListeners('menu-save-warship-as');
      };
    }
  }, [handleNewWarship, handleLoadWarship, handleSaveWarship, handleSaveWarshipAs]);

  const handleHullSelect = (hull: Hull) => {
    setSelectedHull(hull);
    // Reset armor and power plants if hull changes
    setSelectedArmorWeight(null);
    setSelectedArmorType(null);
    setInstalledPowerPlants([]);
  };

  const handleArmorSelect = (weight: ArmorWeight, type: ArmorType) => {
    setSelectedArmorWeight(weight);
    setSelectedArmorType(type);
  };

  const handleArmorClear = () => {
    setSelectedArmorWeight(null);
    setSelectedArmorType(null);
  };

  const handlePowerPlantsChange = (powerPlants: InstalledPowerPlant[]) => {
    setInstalledPowerPlants(powerPlants);
  };

  const handleEnginesChange = (engines: InstalledEngine[]) => {
    setInstalledEngines(engines);
  };

  const handleFTLDriveChange = (drive: InstalledFTLDrive | null) => {
    setInstalledFTLDrive(drive);
  };

  const handleLifeSupportChange = (lifeSupport: InstalledLifeSupport[]) => {
    setInstalledLifeSupport(lifeSupport);
  };

  const handleAccommodationsChange = (accommodations: InstalledAccommodation[]) => {
    setInstalledAccommodations(accommodations);
  };

  const handleStoreSystemsChange = (storeSystems: InstalledStoreSystem[]) => {
    setInstalledStoreSystems(storeSystems);
  };

  const handleGravitySystemsChange = (gravitySystems: InstalledGravitySystem[]) => {
    setInstalledGravitySystems(gravitySystems);
  };

  const handleWeaponsChange = (weapons: InstalledWeapon[]) => {
    setInstalledWeapons(weapons);
  };

  const handleDefensesChange = (defenses: InstalledDefenseSystem[]) => {
    setInstalledDefenses(defenses);
  };

  const handleCommandControlChange = (systems: InstalledCommandControlSystem[]) => {
    setInstalledCommandControl(systems);
  };

  const handleSensorsChange = (sensors: InstalledSensor[]) => {
    setInstalledSensors(sensors);
  };

  const handleHangarMiscChange = (systems: InstalledHangarMiscSystem[]) => {
    setInstalledHangarMisc(systems);
  };

  const handleStepClick = (step: number) => {
    // Allow navigation to any step, but show warning if prerequisites not met
    setActiveStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculate used hull points (armor + power plants)
  const getUsedHullPointsBeforePowerPlants = () => {
    if (!selectedHull) return 0;
    let used = 0;
    if (selectedArmorWeight) {
      used += calculateArmorHullPoints(selectedHull, selectedArmorWeight);
    }
    return used;
  };

  // Calculate used hull points before engines (armor + power plants)
  const getUsedHullPointsBeforeEngines = () => {
    if (!selectedHull) return 0;
    let used = getUsedHullPointsBeforePowerPlants();
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks);
    used += powerPlantStats.totalHullPoints;
    return used;
  };

  // Calculate used hull points before FTL (armor + power plants + engines)
  const getUsedHullPointsBeforeFTL = () => {
    if (!selectedHull) return 0;
    let used = getUsedHullPointsBeforeEngines();
    const engineStats = calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull);
    used += engineStats.totalHullPoints;
    return used;
  };

  // Calculate used hull points before support systems (armor + power plants + engines + FTL)
  const getUsedHullPointsBeforeSupportSystems = () => {
    if (!selectedHull) return 0;
    let used = getUsedHullPointsBeforeFTL();
    if (installedFTLDrive) {
      const ftlStats = calculateTotalFTLStats(installedFTLDrive, selectedHull);
      used += ftlStats.totalHullPoints;
    }
    return used;
  };

  // Calculate used hull points before defenses (armor + power plants + engines + FTL + support)
  const getUsedHullPointsBeforeWeapons = () => {
    if (!selectedHull) return 0;
    let used = getUsedHullPointsBeforeSupportSystems();
    const supportStats = calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks);
    used += supportStats.totalHullPoints;
    return used;
  };

  // Calculate used hull points before defenses (armor + power plants + engines + FTL + support + weapons)
  const getUsedHullPointsBeforeDefenses = () => {
    if (!selectedHull) return 0;
    let used = getUsedHullPointsBeforeWeapons();
    const weaponStats = calculateWeaponStats(installedWeapons);
    used += weaponStats.totalHullPoints;
    const ordnanceStats = calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns);
    used += ordnanceStats.totalLauncherHullPoints;
    return used;
  };

  // Calculate used hull points before C4 (armor + power plants + engines + FTL + support + weapons + defense)
  const getUsedHullPointsBeforeCC = () => {
    if (!selectedHull) return 0;
    let used = getUsedHullPointsBeforeDefenses();
    const defenseStats = calculateDefenseStats(installedDefenses, selectedHull.hullPoints);
    used += defenseStats.totalHullPoints;
    return used;
  };

  // Calculate remaining hull points
  const getRemainingHullPoints = () => {
    if (!selectedHull) return 0;
    let remaining = selectedHull.hullPoints + selectedHull.bonusHullPoints;
    if (selectedArmorWeight) {
      remaining -= calculateArmorHullPoints(selectedHull, selectedArmorWeight);
    }
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks);
    remaining -= powerPlantStats.totalHullPoints;
    const engineStats = calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull);
    remaining -= engineStats.totalHullPoints;
    if (installedFTLDrive) {
      const ftlStats = calculateTotalFTLStats(installedFTLDrive, selectedHull);
      remaining -= ftlStats.totalHullPoints;
    }
    // FTL fuel tanks
    const ftlFuelStats = calculateTotalFTLFuelTankStats(installedFTLFuelTanks);
    remaining -= ftlFuelStats.totalHullPoints;
    const supportStats = calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks);
    remaining -= supportStats.totalHullPoints;
    const weaponStats = calculateWeaponStats(installedWeapons);
    remaining -= weaponStats.totalHullPoints;
    const ordnanceStats = calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns);
    remaining -= ordnanceStats.totalLauncherHullPoints;
    const defenseStats = calculateDefenseStats(installedDefenses, selectedHull.hullPoints);
    remaining -= defenseStats.totalHullPoints;
    const ccStats = calculateCommandControlStats(installedCommandControl, selectedHull.hullPoints);
    remaining -= ccStats.totalHullPoints;
    const sensorStats = calculateSensorStats(installedSensors);
    remaining -= sensorStats.totalHullPoints;
    const hangarMiscStats = calculateHangarMiscStats(installedHangarMisc);
    remaining -= hangarMiscStats.totalHullPoints;
    return remaining;
  };

  // Calculate total power generated
  const getTotalPower = () => {
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks);
    return powerPlantStats.totalPowerGenerated;
  };

  // Calculate total power consumed by selected systems (based on scenario)
  const getTotalPowerConsumed = () => {
    if (!selectedHull) return 0;
    let consumed = 0;
    // Engines
    if (powerScenario.engines) {
      consumed += calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull).totalPowerRequired;
    }
    // FTL Drive
    if (powerScenario.ftlDrive && installedFTLDrive) {
      consumed += calculateTotalFTLStats(installedFTLDrive, selectedHull).totalPowerRequired;
    }
    // Support Systems
    if (powerScenario.supportSystems) {
      consumed += calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks).totalPowerRequired;
    }
    // Weapons
    if (powerScenario.weapons) {
      consumed += calculateWeaponStats(installedWeapons).totalPowerRequired;
      consumed += calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns).totalLauncherPower;
    }
    // Defenses
    if (powerScenario.defenses) {
      consumed += calculateDefenseStats(installedDefenses, selectedHull.hullPoints).totalPowerRequired;
    }
    // Command & Control
    if (powerScenario.commandControl) {
      consumed += calculateCommandControlStats(installedCommandControl, selectedHull.hullPoints).totalPowerRequired;
    }
    // Sensors
    if (powerScenario.sensors) {
      consumed += calculateSensorStats(installedSensors).totalPowerRequired;
    }
    // Hangars & Misc
    if (powerScenario.hangarMisc) {
      consumed += calculateHangarMiscStats(installedHangarMisc).totalPowerRequired;
    }
    return consumed;
  };

  // Get individual power consumption values for display
  const getPowerBreakdown = () => {
    if (!selectedHull) return { engines: 0, ftlDrive: 0, supportSystems: 0, weapons: 0, defenses: 0, commandControl: 0, sensors: 0, hangarMisc: 0 };
    return {
      engines: calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull).totalPowerRequired,
      ftlDrive: installedFTLDrive ? calculateTotalFTLStats(installedFTLDrive, selectedHull).totalPowerRequired : 0,
      supportSystems: calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks).totalPowerRequired,
      weapons: calculateWeaponStats(installedWeapons).totalPowerRequired + calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns).totalLauncherPower,
      defenses: calculateDefenseStats(installedDefenses, selectedHull.hullPoints).totalPowerRequired,
      commandControl: calculateCommandControlStats(installedCommandControl, selectedHull.hullPoints).totalPowerRequired,
      sensors: calculateSensorStats(installedSensors).totalPowerRequired,
      hangarMisc: calculateHangarMiscStats(installedHangarMisc).totalPowerRequired,
    };
  };

  // Get individual HP usage values for display
  const getHPBreakdown = () => {
    if (!selectedHull) return { armor: 0, powerPlants: 0, engines: 0, ftlDrive: 0, supportSystems: 0, weapons: 0, defenses: 0, commandControl: 0, sensors: 0, hangarMisc: 0 };
    return {
      armor: selectedArmorWeight ? calculateArmorHullPoints(selectedHull, selectedArmorWeight) : 0,
      powerPlants: calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks).totalHullPoints,
      engines: calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull).totalHullPoints,
      ftlDrive: installedFTLDrive ? calculateTotalFTLStats(installedFTLDrive, selectedHull).totalHullPoints + calculateTotalFTLFuelTankStats(installedFTLFuelTanks).totalHullPoints : 0,
      supportSystems: calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks).totalHullPoints,
      weapons: calculateWeaponStats(installedWeapons).totalHullPoints + calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns).totalLauncherHullPoints,
      defenses: calculateDefenseStats(installedDefenses, selectedHull.hullPoints).totalHullPoints,
      commandControl: calculateCommandControlStats(installedCommandControl, selectedHull.hullPoints).totalHullPoints,
      sensors: calculateSensorStats(installedSensors).totalHullPoints,
      hangarMisc: calculateHangarMiscStats(installedHangarMisc).totalHullPoints,
    };
  };

  // Get individual cost values for display
  const getCostBreakdown = () => {
    if (!selectedHull) return { hull: 0, armor: 0, powerPlants: 0, engines: 0, ftlDrive: 0, supportSystems: 0, weapons: 0, defenses: 0, commandControl: 0, sensors: 0, hangarMisc: 0 };
    return {
      hull: selectedHull.cost,
      armor: selectedArmorWeight && selectedArmorType ? calculateArmorCost(selectedHull, selectedArmorWeight, selectedArmorType) : 0,
      powerPlants: calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks).totalCost,
      engines: calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull).totalCost,
      ftlDrive: installedFTLDrive ? calculateTotalFTLStats(installedFTLDrive, selectedHull).totalCost + calculateTotalFTLFuelTankStats(installedFTLFuelTanks).totalCost : 0,
      supportSystems: calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks).totalCost,
      weapons: calculateWeaponStats(installedWeapons).totalCost + calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns).totalCost,
      defenses: calculateDefenseStats(installedDefenses, selectedHull.hullPoints).totalCost,
      commandControl: calculateCommandControlStats(installedCommandControl, selectedHull.hullPoints).totalCost,
      sensors: calculateSensorStats(installedSensors).totalCost,
      hangarMisc: calculateHangarMiscStats(installedHangarMisc).totalCost,
    };
  };

  // Calculate total cost
  const getTotalCost = () => {
    if (!selectedHull) return 0;
    let cost = selectedHull.cost;
    if (selectedArmorWeight && selectedArmorType) {
      cost += calculateArmorCost(selectedHull, selectedArmorWeight, selectedArmorType);
    }
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks);
    cost += powerPlantStats.totalCost;
    const engineStats = calculateTotalEngineStats(installedEngines, installedEngineFuelTanks, selectedHull);
    cost += engineStats.totalCost;
    if (installedFTLDrive) {
      const ftlStats = calculateTotalFTLStats(installedFTLDrive, selectedHull);
      cost += ftlStats.totalCost;
    }
    // FTL fuel tanks
    const ftlFuelStats = calculateTotalFTLFuelTankStats(installedFTLFuelTanks);
    cost += ftlFuelStats.totalCost;
    const supportStats = calculateSupportSystemsStats(installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks);
    cost += supportStats.totalCost;
    const weaponStats = calculateWeaponStats(installedWeapons);
    cost += weaponStats.totalCost;
    const ordnanceStats = calculateOrdnanceStats(installedLaunchSystems, ordnanceDesigns);
    cost += ordnanceStats.totalCost;
    const defenseStats = calculateDefenseStats(installedDefenses, selectedHull.hullPoints);
    cost += defenseStats.totalCost;
    const ccStats = calculateCommandControlStats(installedCommandControl, selectedHull.hullPoints);
    cost += ccStats.totalCost;
    const sensorStats = calculateSensorStats(installedSensors);
    cost += sensorStats.totalCost;
    const hangarMiscStats = calculateHangarMiscStats(installedHangarMisc);
    cost += hangarMiscStats.totalCost;
    return cost;
  };

  // Get unique tech tracks required by all selected components
  const getUniqueTechTracks = (): TechTrack[] => {
    const tracks = new Set<TechTrack>();
    if (selectedArmorType) {
      selectedArmorType.techTracks.forEach((t) => tracks.add(t));
    }
    installedPowerPlants.forEach((pp) => {
      pp.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedEngines.forEach((eng) => {
      eng.type.techTracks.forEach((t) => tracks.add(t));
    });
    if (installedFTLDrive) {
      installedFTLDrive.type.techTracks.forEach((t) => tracks.add(t));
    }
    installedLifeSupport.forEach((ls) => {
      ls.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedAccommodations.forEach((acc) => {
      acc.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedStoreSystems.forEach((ss) => {
      ss.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedDefenses.forEach((def) => {
      def.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedCommandControl.forEach((cc) => {
      cc.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedSensors.forEach((sensor) => {
      sensor.type.techTracks.forEach((t) => tracks.add(t));
    });
    installedHangarMisc.forEach((hm) => {
      hm.type.techTracks.forEach((t) => tracks.add(t));
    });
    return Array.from(tracks).sort();
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <HullSelection
            selectedHull={selectedHull}
            onHullSelect={handleHullSelect}
          />
        );
      case 1:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <ArmorSelection
            hull={selectedHull}
            selectedWeight={selectedArmorWeight}
            selectedType={selectedArmorType}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onArmorSelect={handleArmorSelect}
            onArmorClear={handleArmorClear}
          />
        );
      case 2:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <PowerPlantSelection
            hull={selectedHull}
            installedPowerPlants={installedPowerPlants}
            installedFuelTanks={installedFuelTanks}
            usedHullPoints={getUsedHullPointsBeforePowerPlants()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onPowerPlantsChange={handlePowerPlantsChange}
            onFuelTanksChange={setInstalledFuelTanks}
          />
        );
      case 3:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <EngineSelection
            hull={selectedHull}
            installedEngines={installedEngines}
            installedFuelTanks={installedEngineFuelTanks}
            usedHullPoints={getUsedHullPointsBeforeEngines()}
            availablePower={getTotalPower()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onEnginesChange={handleEnginesChange}
            onFuelTanksChange={setInstalledEngineFuelTanks}
          />
        );
      case 4:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <FTLDriveSelection
            hull={selectedHull}
            installedFTLDrive={installedFTLDrive}
            installedFTLFuelTanks={installedFTLFuelTanks}
            installedPowerPlants={installedPowerPlants}
            usedHullPoints={getUsedHullPointsBeforeFTL()}
            availablePower={getTotalPower()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onFTLDriveChange={handleFTLDriveChange}
            onFTLFuelTanksChange={setInstalledFTLFuelTanks}
          />
        );
      case 5:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <SupportSystemsSelection
            hull={selectedHull}
            installedLifeSupport={installedLifeSupport}
            installedAccommodations={installedAccommodations}
            installedStoreSystems={installedStoreSystems}
            installedGravitySystems={installedGravitySystems}
            usedHullPoints={getUsedHullPointsBeforeSupportSystems()}
            availablePower={getTotalPower()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onLifeSupportChange={handleLifeSupportChange}
            onAccommodationsChange={handleAccommodationsChange}
            onStoreSystemsChange={handleStoreSystemsChange}
            onGravitySystemsChange={handleGravitySystemsChange}
          />
        );
      case 6:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <WeaponSelection
            hull={selectedHull}
            installedWeapons={installedWeapons}
            installedCommandControl={installedCommandControl}
            ordnanceDesigns={ordnanceDesigns}
            launchSystems={installedLaunchSystems}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onWeaponsChange={handleWeaponsChange}
            onOrdnanceDesignsChange={setOrdnanceDesigns}
            onLaunchSystemsChange={setInstalledLaunchSystems}
          />
        );
      case 7:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <DefenseSelection
            hull={selectedHull}
            installedDefenses={installedDefenses}
            usedHullPoints={getUsedHullPointsBeforeDefenses()}
            availablePower={getTotalPower()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onDefensesChange={handleDefensesChange}
          />
        );
      case 8:
        // Sensors step (moved before C4)
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <SensorSelection
            hull={selectedHull}
            installedSensors={installedSensors}
            installedCommandControl={installedCommandControl}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onSensorsChange={handleSensorsChange}
          />
        );
      case 9:
        // Command & Control step (moved after Sensors)
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <CommandControlSelection
            hull={selectedHull}
            installedSystems={installedCommandControl}
            installedSensors={installedSensors}
            installedWeapons={installedWeapons}
            usedHullPoints={getUsedHullPointsBeforeCC()}
            availablePower={getTotalPower()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onSystemsChange={handleCommandControlChange}
          />
        );
      case 10:
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <HangarMiscSelection
            hull={selectedHull}
            installedSystems={installedHangarMisc}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onSystemsChange={handleHangarMiscChange}
          />
        );
      case 11:
        // Damage Diagram step
        if (!selectedHull) {
          return (
            <Typography color="text.secondary">
              Please select a hull first.
            </Typography>
          );
        }
        return (
          <DamageDiagramSelection
            hull={selectedHull}
            installedPowerPlants={installedPowerPlants}
            installedFuelTanks={installedFuelTanks}
            installedEngines={installedEngines}
            installedEngineFuelTanks={installedEngineFuelTanks}
            installedFTLDrive={installedFTLDrive}
            installedFTLFuelTanks={installedFTLFuelTanks}
            installedLifeSupport={installedLifeSupport}
            installedAccommodations={installedAccommodations}
            installedStoreSystems={installedStoreSystems}
            installedGravitySystems={installedGravitySystems}
            installedWeapons={installedWeapons}
            installedLaunchSystems={installedLaunchSystems}
            installedDefenses={installedDefenses}
            installedCommandControl={installedCommandControl}
            installedSensors={installedSensors}
            installedHangarMisc={installedHangarMisc}
            zones={damageDiagramZones}
            onZonesChange={setDamageDiagramZones}
          />
        );
      case 12:
        // Summary step
        return (
          <SummarySelection
            hull={selectedHull}
            warshipName={warshipName}
            shipDescription={shipDescription}
            onShipDescriptionChange={setShipDescription}
            selectedArmorWeight={selectedArmorWeight}
            selectedArmorType={selectedArmorType}
            installedPowerPlants={installedPowerPlants}
            installedFuelTanks={installedFuelTanks}
            installedEngines={installedEngines}
            installedEngineFuelTanks={installedEngineFuelTanks}
            installedFTLDrive={installedFTLDrive}
            installedFTLFuelTanks={installedFTLFuelTanks}
            installedLifeSupport={installedLifeSupport}
            installedAccommodations={installedAccommodations}
            installedStoreSystems={installedStoreSystems}
            installedGravitySystems={installedGravitySystems}
            installedWeapons={installedWeapons}
            installedLaunchSystems={installedLaunchSystems}
            ordnanceDesigns={ordnanceDesigns}
            installedDefenses={installedDefenses}
            installedCommandControl={installedCommandControl}
            installedSensors={installedSensors}
            installedHangarMisc={installedHangarMisc}
            damageDiagramZones={damageDiagramZones}
            designProgressLevel={designProgressLevel}
          />
        );
      default:
        return (
          <Typography color="text.secondary">
            Step {activeStep + 1}: {steps[activeStep].label} - Coming soon...
          </Typography>
        );
    }
  };

  // Show loading screen while data is being loaded
  if (mode === 'loading') {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="h6" color="text.secondary">
          Loading game data...
        </Typography>
      </Box>
    );
  }

  // Show welcome page if in welcome mode
  if (mode === 'welcome') {
    return (
      <WelcomePage
        onNewWarship={handleNewWarship}
        onLoadWarship={handleLoadWarship}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* App Bar */}
      <AppBar position="sticky" color="default" elevation={1} sx={{ top: 0, zIndex: 1200 }}>
        <Toolbar sx={{ minHeight: 64 }}>
          <TextField
            value={warshipName}
            onChange={(e) => setWarshipName(e.target.value)}
            variant="standard"
            placeholder="Ship Name"
            sx={{
              maxWidth: 250,
              '& .MuiInput-root': {
                fontSize: '1.25rem',
                fontWeight: 500,
              },
              '& .MuiInput-root:before': {
                borderBottom: '1px solid transparent',
              },
              '& .MuiInput-root:hover:not(.Mui-disabled):before': {
                borderBottom: '1px solid rgba(0, 0, 0, 0.42)',
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <EditIcon fontSize="small" sx={{ color: 'action.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          
          {/* Divider */}
          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
          
          {/* Progress Level selector */}
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <Select
              value={designProgressLevel}
              onChange={(e) => setDesignProgressLevel(e.target.value as ProgressLevel)}
              variant="outlined"
              sx={{ 
                '& .MuiSelect-select': { py: 0.75 },
                fontSize: '0.875rem',
              }}
            >
              {([6, 7, 8, 9] as ProgressLevel[]).map((pl) => (
                <MenuItem key={pl} value={pl}>
                  <Tooltip title={PL_NAMES[pl]} placement="right">
                    <span>PL {pl}</span>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Tech Track selector */}
          <Tooltip title="Select available technology tracks">
            <Chip
              label={designTechTracks.length > 0 
                ? `Tech: ${designTechTracks.join(', ')}` 
                : 'Tech: All'}
              onClick={(e) => setTechAnchorEl(e.currentTarget)}
              variant="outlined"
              size="small"
              sx={{ ml: 1, cursor: 'pointer' }}
            />
          </Tooltip>
          <Popover
            open={Boolean(techAnchorEl)}
            anchorEl={techAnchorEl}
            onClose={() => setTechAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, minWidth: 200 }}>
              <Typography variant="subtitle2" gutterBottom>
                Technology Tracks
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Leave all unchecked to show all components
              </Typography>
              {ALL_TECH_TRACK_CODES.map((code) => (
                <FormControlLabel
                  key={code}
                  control={
                    <Checkbox
                      size="small"
                      checked={designTechTracks.includes(code)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDesignTechTracks([...designTechTracks, code]);
                        } else {
                          setDesignTechTracks(designTechTracks.filter((t) => t !== code));
                        }
                      }}
                    />
                  }
                  label={`${code} - ${getTechTrackName(code)}`}
                  sx={{ display: 'block', m: 0 }}
                />
              ))}
              <Button 
                size="small" 
                onClick={() => setDesignTechTracks([])}
                sx={{ mt: 1 }}
              >
                Clear All
              </Button>
            </Box>
          </Popover>
          
          <Box sx={{ flexGrow: 1 }} />
          {selectedHull && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              <Chip
                label={selectedHull.name}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`HP: ${getRemainingHullPoints()} / ${calculateHullStats(selectedHull).totalHullPoints}`}
                color={getRemainingHullPoints() < 0 ? 'error' : 'success'}
                variant="outlined"
                size="small"
                onClick={(e) => setHpAnchorEl(e.currentTarget)}
                sx={{ cursor: 'pointer' }}
              />
              <Popover
                open={Boolean(hpAnchorEl)}
                anchorEl={hpAnchorEl}
                onClose={() => setHpAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, minWidth: 200 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Hull Points Breakdown
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Armor</span><span>{getHPBreakdown().armor} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Power Plants</span><span>{getHPBreakdown().powerPlants} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Engines</span><span>{getHPBreakdown().engines} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>FTL Drive</span><span>{getHPBreakdown().ftlDrive} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Support Systems</span><span>{getHPBreakdown().supportSystems} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Weapons</span><span>{getHPBreakdown().weapons} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Defenses</span><span>{getHPBreakdown().defenses} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>C4</span><span>{getHPBreakdown().commandControl} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sensors</span><span>{getHPBreakdown().sensors} HP</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hangars & Misc</span><span>{getHPBreakdown().hangarMisc} HP</span>
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total Used</span><span>{calculateHullStats(selectedHull).totalHullPoints - getRemainingHullPoints()} HP</span>
                  </Typography>
                </Box>
              </Popover>
              <Chip
                label={`Power: ${getTotalPower() - getTotalPowerConsumed()} / ${getTotalPower()}`}
                color={getTotalPowerConsumed() > getTotalPower() ? 'warning' : 'success'}
                variant="outlined"
                size="small"
                onClick={(e) => setPowerAnchorEl(e.currentTarget)}
                sx={{ cursor: 'pointer' }}
              />
              <Popover
                open={Boolean(powerAnchorEl)}
                anchorEl={powerAnchorEl}
                onClose={() => setPowerAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, minWidth: 220 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Power Scenario
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Select which systems to include in power calculations
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.engines}
                        onChange={(e) => setPowerScenario({ ...powerScenario, engines: e.target.checked })}
                      />
                    }
                    label={`Engines (${getPowerBreakdown().engines} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.ftlDrive}
                        onChange={(e) => setPowerScenario({ ...powerScenario, ftlDrive: e.target.checked })}
                      />
                    }
                    label={`FTL Drive (${getPowerBreakdown().ftlDrive} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.supportSystems}
                        onChange={(e) => setPowerScenario({ ...powerScenario, supportSystems: e.target.checked })}
                      />
                    }
                    label={`Support Systems (${getPowerBreakdown().supportSystems} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.weapons}
                        onChange={(e) => setPowerScenario({ ...powerScenario, weapons: e.target.checked })}
                      />
                    }
                    label={`Weapons (${getPowerBreakdown().weapons} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.defenses}
                        onChange={(e) => setPowerScenario({ ...powerScenario, defenses: e.target.checked })}
                      />
                    }
                    label={`Defenses (${getPowerBreakdown().defenses} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.commandControl}
                        onChange={(e) => setPowerScenario({ ...powerScenario, commandControl: e.target.checked })}
                      />
                    }
                    label={`C4 (${getPowerBreakdown().commandControl} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.sensors}
                        onChange={(e) => setPowerScenario({ ...powerScenario, sensors: e.target.checked })}
                      />
                    }
                    label={`Sensors (${getPowerBreakdown().sensors} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={powerScenario.hangarMisc}
                        onChange={(e) => setPowerScenario({ ...powerScenario, hangarMisc: e.target.checked })}
                      />
                    }
                    label={`Hangars & Misc (${getPowerBreakdown().hangarMisc} PP)`}
                    sx={{ display: 'block', m: 0 }}
                  />
                </Box>
              </Popover>
              <Chip
                label={`Cost: ${formatCost(getTotalCost())}`}
                color="default"
                variant="outlined"
                size="small"
                onClick={(e) => setCostAnchorEl(e.currentTarget)}
                sx={{ cursor: 'pointer' }}
              />
              <Popover
                open={Boolean(costAnchorEl)}
                anchorEl={costAnchorEl}
                onClose={() => setCostAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              >
                <Box sx={{ p: 2, minWidth: 220 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Cost Breakdown
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hull</span><span>{formatCost(getCostBreakdown().hull)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Armor</span><span>{formatCost(getCostBreakdown().armor)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Power Plants</span><span>{formatCost(getCostBreakdown().powerPlants)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Engines</span><span>{formatCost(getCostBreakdown().engines)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>FTL Drive</span><span>{formatCost(getCostBreakdown().ftlDrive)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Support Systems</span><span>{formatCost(getCostBreakdown().supportSystems)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Weapons</span><span>{formatCost(getCostBreakdown().weapons)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Defenses</span><span>{formatCost(getCostBreakdown().defenses)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>C4</span><span>{formatCost(getCostBreakdown().commandControl)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sensors</span><span>{formatCost(getCostBreakdown().sensors)}</span>
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hangars & Misc</span><span>{formatCost(getCostBreakdown().hangarMisc)}</span>
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>Total</span><span>{formatCost(getTotalCost())}</span>
                  </Typography>
                </Box>
              </Popover>
              {getUniqueTechTracks().length > 0 && (
                <Chip
                  label={`Tech: ${getUniqueTechTracks().join(', ')}`}
                  color="default"
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          )}
          <Tooltip title="Save Warship (Ctrl+S)">
            <IconButton
              color="primary"
              onClick={handleSaveWarship}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Stepper */}
      <Paper sx={{ px: 3, py: 2, minHeight: 72, position: 'sticky', top: 63, zIndex: 1100, borderRadius: 0, borderBottom: 1, borderColor: 'divider', overflowX: 'auto' }} elevation={0}>
        <Stepper activeStep={activeStep} nonLinear sx={{ '& .MuiStepButton-root': { outline: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } } }}>
          {steps.map((step, index) => {
            // Determine if step is completed
            const isStepCompleted = (() => {
              switch (index) {
                case 0: return selectedHull !== null; // Hull
                case 1: return selectedArmorWeight !== null; // Armor (optional)
                case 2: return installedPowerPlants.length > 0; // Power Plant
                case 3: return installedEngines.length > 0; // Engines
                case 4: return installedFTLDrive !== null; // FTL Drive (optional)
                case 5: return installedLifeSupport.length > 0 || installedAccommodations.length > 0 || installedStoreSystems.length > 0; // Support Systems (optional)
                case 6: return installedWeapons.length > 0; // Weapons (optional)
                case 7: return installedDefenses.length > 0; // Defenses (optional)
                case 8: return installedSensors.length > 0; // Sensors (required) - now before C4
                case 9: return installedCommandControl.some(s => s.type.isRequired); // C4 (required - needs command system)
                case 10: return installedHangarMisc.length > 0; // Misc (optional)
                case 11: {
                  // Damage Diagram (required) - all systems must be assigned to zones
                  if (damageDiagramZones.length === 0) return false;
                  const totalAssigned = damageDiagramZones.reduce((sum, z) => sum + z.systems.length, 0);
                  // Count total systems that should be assigned
                  const totalSystems = installedPowerPlants.length + installedFuelTanks.length +
                    installedEngines.length + installedEngineFuelTanks.length +
                    (installedFTLDrive ? 1 : 0) + installedFTLFuelTanks.length +
                    installedLifeSupport.length + installedAccommodations.length +
                    installedStoreSystems.length + installedGravitySystems.length +
                    installedWeapons.length + installedLaunchSystems.length +
                    installedDefenses.length + installedCommandControl.length +
                    installedSensors.length + installedHangarMisc.length;
                  return totalAssigned >= totalSystems && totalSystems > 0;
                }
                case 12: return true; // Summary (optional - always "complete")
                default: return false;
              }
            })();

            // Determine icon based on required status and completion
            const getStepIcon = () => {
              if (isStepCompleted) {
                // Completed (both mandatory and optional)
                return <CheckCircleIcon color="success" />;
              }
              if (!step.required) {
                // Optional and not completed - show neutral icon
                return <RemoveCircleOutlineIcon color={activeStep === index ? 'primary' : 'disabled'} />;
              }
              // Mandatory but not completed - show orange if selected, red otherwise
              return <ErrorOutlineIcon color={activeStep === index ? 'warning' : 'error'} />;
            };

            return (
              <Step key={step.label} completed={isStepCompleted}>
                <StepButton onClick={() => handleStepClick(index)}>
                  <StepLabel StepIconComponent={getStepIcon}>
                    {step.label}
                  </StepLabel>
                </StepButton>
              </Step>
            );
          })}
        </Stepper>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 2, width: '100%' }}>
        <Paper sx={{ p: 3, minHeight: 400, width: '100%', boxSizing: 'border-box' }}>
          {renderStepContent()}
        </Paper>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={activeStep === 0}
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === steps.length - 1}
          >
            Next
          </Button>
        </Box>
      </Container>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
