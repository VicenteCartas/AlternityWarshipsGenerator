import { useState, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Popover,
  Checkbox,
  FormControlLabel,
  Divider,
  Badge,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

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
import { AboutDialog } from './components/AboutDialog';
import { KeyboardShortcutsDialog } from './components/KeyboardShortcutsDialog';
import { ModManager } from './components/ModManager';
import { DesignTypeDialog } from './components/DesignTypeDialog';
import { ShipLibrary } from './components/library';
import { ResourceBarChip } from './components/shared/ResourceBarChip';
import { BUDGET_CATEGORY_COLORS } from './constants/domainColors';
import type { Mod } from './types/mod';
import { StepHeader } from './components/shared/StepHeader';
import { ConfirmDialog } from './components/shared';
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import type { ProgressLevel, DesignType, StationType, AppMode } from './types/common';
import './types/electron.d.ts';
import { buildShipArmor, sortArmorLayers, isMultipleArmorLayersAllowed } from './services/armorService';
import { formatCost, getTechTrackName, getStationTypeDisplayName, ALL_TECH_TRACK_CODES, PL_NAMES } from './services/formatters';
import { loadAllGameData, reloadAllGameData, reloadWithSpecificMods, type DataLoadResult } from './services/dataLoader';
import { jsonToSaveFile, deserializeWarship, type WarshipState } from './services/saveService';
import { getInstalledMods } from './services/modService';
import { STEP_FULL_NAMES, getStepsForDesign } from './constants/steps';
import { useNotification } from './hooks/useNotification';
import { useStepperScroll } from './hooks/useStepperScroll';
import { useElectronMenuHandlers } from './hooks/useElectronMenuHandlers';
import { useDesignCalculations, type PowerScenario } from './hooks/useDesignCalculations';
import { useSaveLoad } from './hooks/useSaveLoad';
import { useWarshipState } from './hooks/useWarshipState';
import { useAutoSave, clearAutoSave } from './hooks/useAutoSave';
import type { ThemeMode } from './theme';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

interface AppProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}

function App({ themeMode, onThemeModeChange }: AppProps) {
  // Local routing/UI state
  const [mode, setMode] = useState<AppMode>('loading');
  const [activeStep, setActiveStep] = useState(0);

  // All warship design state (27 variables + setters, undo/redo, dirty tracking)
  const {
    designType, stationType, surfaceProvidesLifeSupport, surfaceProvidesGravity,
    selectedHull, armorLayers,
    installedPowerPlants, installedFuelTanks,
    installedEngines, installedEngineFuelTanks,
    installedFTLDrive, installedFTLFuelTanks,
    installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems,
    installedWeapons, ordnanceDesigns, installedLaunchSystems,
    installedDefenses, installedCommandControl, installedSensors, installedHangarMisc, embarkedCraft,
    damageDiagramZones,
    shipDescription, warshipName,
    designProgressLevel, designTechTracks,
    setSelectedHull, setArmorLayers,
    setInstalledPowerPlants, setInstalledFuelTanks,
    setInstalledEngines, setInstalledEngineFuelTanks,
    setInstalledFTLDrive, setInstalledFTLFuelTanks,
    setInstalledLifeSupport, setInstalledAccommodations, setInstalledStoreSystems, setInstalledGravitySystems,
    setInstalledWeapons, setOrdnanceDesigns, setInstalledLaunchSystems,
    setInstalledDefenses, setInstalledCommandControl, setInstalledSensors, setInstalledHangarMisc,
    setEmbarkedCraft,
    setDamageDiagramZones,
    setShipDescription, setWarshipName,
    setDesignProgressLevel, setDesignTechTracks,
    buildCurrentState, applyState,
    handleUndo, handleRedo, undoHistory,
    hasUnsavedChanges, setHasUnsavedChanges, skipDirtyCheckRef,
  } = useWarshipState(mode);

  // Compute visible steps based on design type
  const steps = getStepsForDesign(designType, stationType);

  // Get the step ID for the current active index
  const activeStepId = steps[activeStep]?.id;

  // Snackbar notification state
  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();

  // Stepper scroll state
  const { stepperRef, canScrollLeft, canScrollRight, updateScrollArrows } = useStepperScroll(activeStep, designType, stationType);

  // Design type dialog
  const [showDesignTypeDialog, setShowDesignTypeDialog] = useState(false);

  // About dialog state
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  // Hull change confirmation
  const [confirmHullChangeOpen, setConfirmHullChangeOpen] = useState(false);
  const [pendingHull, setPendingHull] = useState<Hull | null>(null);

  // Track the mode to return to when leaving the mod manager
  const [preModeForMods, setPreModeForMods] = useState<AppMode>('welcome');

  // Per-design active mods (set at creation time or on load, locked during design)
  const [designActiveMods, setDesignActiveMods] = useState<Mod[]>([]);

  // Tech track popover anchor
  const [techAnchorEl, setTechAnchorEl] = useState<HTMLElement | null>(null);

  const [powerScenario, setPowerScenario] = useState<PowerScenario>({
    engines: true,
    ftlDrive: true,
    supportSystems: true,
    weapons: true,
    defenses: true,
    commandControl: true,
    sensors: true,
    hangarMisc: true,
  });

  // All derived design calculations (HP, power, cost breakdowns, validation, tech tracks)
  const {
    usedHullPointsBeforePowerPlants,
    usedHullPointsBeforeEngines,
    remainingHullPoints,
    totalHullPoints,
    totalPower,
    totalPowerConsumed,
    totalCost,
    powerBreakdown,
    hpBreakdown,
    costBreakdown,
    summaryValidationState,
    uniqueTechTracks,
    totalPassengersAndSuspended,
  } = useDesignCalculations({
    selectedHull,
    armorLayers,
    installedPowerPlants,
    installedFuelTanks,
    installedEngines,
    installedEngineFuelTanks,
    installedFTLDrive,
    installedFTLFuelTanks,
    installedLifeSupport,
    installedAccommodations,
    installedStoreSystems,
    installedGravitySystems,
    installedWeapons,
    ordnanceDesigns,
    installedLaunchSystems,
    installedDefenses,
    installedCommandControl,
    installedSensors,
    installedHangarMisc,
    embarkedCraft,
    designProgressLevel,
    designTechTracks,
    powerScenario,
    steps,
    surfaceProvidesLifeSupport,
  });

  // Compute step completion status and count
  const { stepCompletion, completedStepCount } = useMemo(() => {
    const completion = new Map<string, boolean>();
    for (const step of steps) {
      let completed = false;
      switch (step.id) {
        case 'hull': completed = selectedHull !== null; break;
        case 'armor': completed = armorLayers.length > 0; break;
        case 'power': completed = installedPowerPlants.length > 0; break;
        case 'engines': completed = installedEngines.length > 0; break;
        case 'ftl': completed = installedFTLDrive !== null; break;
        case 'support': completed = installedLifeSupport.length > 0 || installedAccommodations.length > 0 || installedStoreSystems.length > 0; break;
        case 'weapons': completed = installedWeapons.length > 0; break;
        case 'defenses': completed = installedDefenses.length > 0; break;
        case 'sensors': completed = installedSensors.length > 0; break;
        case 'c4': completed = installedCommandControl.some(s => s.type.isRequired); break;
        case 'hangars': completed = installedHangarMisc.length > 0; break;
        case 'damage': {
          if (damageDiagramZones.length === 0) { completed = false; break; }
          const totalAssigned = damageDiagramZones.reduce((sum, z) => sum + z.systems.length, 0);
          const totalSystems = installedPowerPlants.length + installedFuelTanks.length +
            installedEngines.length + installedEngineFuelTanks.length +
            (installedFTLDrive ? 1 : 0) + installedFTLFuelTanks.length +
            installedLifeSupport.length + installedAccommodations.length +
            installedStoreSystems.length + installedGravitySystems.length +
            installedWeapons.length + installedLaunchSystems.length +
            installedDefenses.length + installedCommandControl.length +
            installedSensors.length + installedHangarMisc.length;
          completed = totalAssigned >= totalSystems && totalSystems > 0;
          break;
        }
        case 'summary': completed = summaryValidationState === 'valid'; break;
      }
      completion.set(step.id, completed);
    }
    return { stepCompletion: completion, completedStepCount: [...completion.values()].filter(Boolean).length };
  }, [steps, selectedHull, armorLayers, installedPowerPlants, installedEngines, installedFTLDrive,
    installedLifeSupport, installedAccommodations, installedStoreSystems, installedWeapons,
    installedDefenses, installedSensors, installedCommandControl, installedHangarMisc,
    damageDiagramZones, installedFuelTanks, installedEngineFuelTanks, installedFTLFuelTanks,
    installedGravitySystems, installedLaunchSystems, summaryValidationState]);

  // File save/load operations
  const {
    currentFilePath,
    setCurrentFilePath,
    loadFromFile,
    handleLoadWarship,
    handleSaveWarship,
    handleSaveWarshipAs,
    handleDuplicateDesign,
  } = useSaveLoad({
    showNotification,
    buildCurrentState,
    applyState,
    undoHistory,
    selectedHull,
    setMode,
    setActiveStep,
    skipDirtyCheckRef,
    setDesignActiveMods,
    setHasUnsavedChanges,
  });

  // Auto-save to temp file periodically when there are unsaved changes
  useAutoSave({
    mode,
    hasUnsavedChanges,
    buildCurrentState,
    selectedHull,
  });

  const handleNewWarship = useCallback(() => {
    setShowDesignTypeDialog(true);
  }, []);

  const handleDesignTypeConfirm = useCallback(async (
    newDesignType: DesignType,
    newStationType: StationType | null,
    newSurfaceProvidesLifeSupport: boolean,
    newSurfaceProvidesGravity: boolean,
    selectedMods: Mod[],
  ) => {
    setShowDesignTypeDialog(false);
    // Apply selected mods for this design
    await reloadWithSpecificMods(selectedMods);
    // Reset all state for a new design
    skipDirtyCheckRef.current = true;
    setActiveStep(0);
    const defaultName = newDesignType === 'warship' ? 'New Ship'
      : newStationType === 'ground-base' ? 'New Base'
      : newStationType === 'outpost' ? 'New Outpost'
      : 'New Station';
    const freshState: WarshipState = {
      name: defaultName,
      shipDescription: { lore: '', imageData: null, imageMimeType: null, faction: '', role: '', commissioningDate: '', classification: '', manufacturer: '' },
      designType: newDesignType,
      stationType: newStationType,
      surfaceProvidesLifeSupport: newSurfaceProvidesLifeSupport,
      surfaceProvidesGravity: newSurfaceProvidesGravity,
      hull: null,
      armorLayers: [],
      powerPlants: [],
      fuelTanks: [],
      engines: [],
      engineFuelTanks: [],
      ftlDrive: null,
      ftlFuelTanks: [],
      lifeSupport: [],
      accommodations: [],
      storeSystems: [],
      gravitySystems: [],
      defenses: [],
      commandControl: [],
      sensors: [],
      hangarMisc: [],
      weapons: [],
      ordnanceDesigns: [],
      launchSystems: [],
      damageDiagramZones: [],
      hitLocationChart: null,
      designProgressLevel: 9,
      designTechTracks: [],
    };
    applyState(freshState);
    setCurrentFilePath(null);
    setDesignActiveMods(selectedMods);
    // Initialize undo history with the fresh design state
    undoHistory.clear();
    undoHistory.pushImmediate(freshState);
    setHasUnsavedChanges(false);
    setMode('builder');
  }, [applyState, setCurrentFilePath, setDesignActiveMods, setHasUnsavedChanges, skipDirtyCheckRef, undoHistory]);

  const handleManageMods = useCallback(() => {
    setPreModeForMods(mode === 'mods' ? 'welcome' : mode);
    setMode('mods');
  }, [mode]);

  const handleModsChanged = useCallback(async () => {
    await reloadAllGameData();
  }, []);

  const handleModsBack = useCallback(async () => {
    // Re-apply the current design's mods to the cache (since reloadAllGameData resets to no mods)
    if (preModeForMods === 'builder' && designActiveMods.length > 0) {
      await reloadWithSpecificMods(designActiveMods);
    }
    setMode(preModeForMods);
  }, [preModeForMods, designActiveMods]);

  const handleReturnToStart = useCallback(() => {
    setMode('welcome');
  }, []);

  // Ship Library navigation
  const handleOpenLibrary = useCallback(() => {
    setMode('library');
  }, []);

  const handleLibraryBack = useCallback(() => {
    setMode('welcome');
  }, []);

  const handleRecoverAutoSave = useCallback(async (content: string) => {
    try {
      const saveFile = jsonToSaveFile(content);
      if (!saveFile) {
        showNotification('Auto-save file is corrupted', 'error');
        return;
      }

      // Match saved mods against installed mods and apply them
      const savedModRefs = saveFile.activeMods || [];
      const modWarnings: string[] = [];
      if (savedModRefs.length > 0) {
        const installed = await getInstalledMods();
        const matchedMods: Mod[] = [];
        for (const ref of savedModRefs) {
          const match = installed.find(m => m.manifest.name === ref.name);
          if (!match) {
            modWarnings.push(`Mod "${ref.name}" (v${ref.version}) is not installed.`);
          } else {
            if (match.manifest.version !== ref.version) {
              modWarnings.push(`Mod "${ref.name}" version differs: saved v${ref.version}, current v${match.manifest.version}.`);
            }
            matchedMods.push(match);
          }
        }
        matchedMods.sort((a, b) => a.priority - b.priority);
        await reloadWithSpecificMods(matchedMods);
        setDesignActiveMods(matchedMods);
      } else {
        await reloadWithSpecificMods([]);
        setDesignActiveMods([]);
      }

      const loadResult = deserializeWarship(saveFile);
      if (!loadResult.success || !loadResult.state) {
        showNotification(`Failed to recover: ${loadResult.errors?.join(', ')}`, 'error');
        return;
      }

      skipDirtyCheckRef.current = true;
      applyState(loadResult.state);
      setCurrentFilePath(null);
      setHasUnsavedChanges(true);
      setActiveStep(0);
      undoHistory.clear();
      undoHistory.pushImmediate(loadResult.state);
      setMode('builder');
      await clearAutoSave();

      if (modWarnings.length > 0) {
        showNotification(`Recovered with warnings: ${modWarnings.join(', ')}`, 'warning');
      } else {
        showNotification(`Recovered: ${loadResult.state.name}`, 'success');
      }
    } catch (error) {
      showNotification(`Error recovering auto-save: ${error}`, 'error');
    }
  }, [applyState, showNotification, setCurrentFilePath, setHasUnsavedChanges, skipDirtyCheckRef, undoHistory]);

  // Register Electron menu event handlers
  useElectronMenuHandlers({
    handleNewWarship,
    handleLoadWarship,
    handleSaveWarship,
    handleSaveWarshipAs,
    loadFromFile,
    handleReturnToStart,
    handleDuplicateDesign,
    setAboutDialogOpen,
    setShortcutsDialogOpen,
  });

  // Keyboard shortcuts for undo/redo (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    if (mode !== 'builder') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if focus is on a text input — let native text undo handle it
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (isCtrl && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleUndo, handleRedo]);

  // Sync app mode with Electron to enable/disable menu items
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.setBuilderMode(mode);
    }
  }, [mode]);

  // Load game data on startup
  useEffect(() => {
    async function initializeApp() {
      const result: DataLoadResult = await loadAllGameData();
      setMode('welcome');
      
      // Notify user if any data files failed to load from external sources
      if (result.isElectron && result.failedFiles.length > 0) {
        const fileList = result.failedFiles.map(f => f.fileName).join(', ');
        showNotification(
          `Some data files could not be loaded from external sources and are using bundled defaults: ${fileList}. Check the resources/data folder to restore customized files.`,
          'warning'
        );
      }
    }
    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount
  }, []);

  // Check if any components are installed beyond just the hull
  const hasAnyInstalledComponents =
    armorLayers.length > 0 ||
    installedPowerPlants.length > 0 ||
    installedFuelTanks.length > 0 ||
    installedEngines.length > 0 ||
    installedEngineFuelTanks.length > 0 ||
    installedFTLDrive !== null ||
    installedFTLFuelTanks.length > 0 ||
    installedLifeSupport.length > 0 ||
    installedAccommodations.length > 0 ||
    installedStoreSystems.length > 0 ||
    installedGravitySystems.length > 0 ||
    installedWeapons.length > 0 ||
    ordnanceDesigns.length > 0 ||
    installedLaunchSystems.length > 0 ||
    installedDefenses.length > 0 ||
    installedCommandControl.length > 0 ||
    installedSensors.length > 0 ||
    installedHangarMisc.length > 0 ||
    embarkedCraft.length > 0 ||
    damageDiagramZones.length > 0;

  const clearAllComponents = () => {
    setArmorLayers([]);
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
    setEmbarkedCraft([]);
    setDamageDiagramZones([]);
  };

  const handleHullSelect = (hull: Hull) => {
    // If there's any build progress, warn before changing hull
    if (selectedHull && hasAnyInstalledComponents) {
      setPendingHull(hull);
      setConfirmHullChangeOpen(true);
      return;
    }
    setSelectedHull(hull);
    clearAllComponents();
  };

  const handleArmorSelect = (weight: ArmorWeight, type: ArmorType) => {
    if (!selectedHull) return;
    const newLayer = buildShipArmor(selectedHull, type);
    if (isMultipleArmorLayersAllowed()) {
      // Multi-layer: add/replace layer for this weight category
      setArmorLayers(prev => {
        const filtered = prev.filter(l => l.weight !== weight);
        return sortArmorLayers([...filtered, newLayer]);
      });
    } else {
      // Single layer: replace entirely
      setArmorLayers([newLayer]);
    }
  };

  const handleArmorClear = () => {
    setArmorLayers([]);
  };

  const handleArmorRemoveLayer = (weight: ArmorWeight) => {
    setArmorLayers(prev => prev.filter(l => l.weight !== weight));
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

  const renderStepContent = () => {
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
            onHullSelect={handleHullSelect}
            designType={designType}
          />
        );
      case 'armor':
        return (
          <ArmorSelection
            hull={selectedHull!}
            armorLayers={armorLayers}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onArmorSelect={handleArmorSelect}
            onArmorClear={handleArmorClear}
            onArmorRemoveLayer={handleArmorRemoveLayer}
          />
        );
      case 'power':
        return (
          <PowerPlantSelection
            hull={selectedHull!}
            installedPowerPlants={installedPowerPlants}
            installedFuelTanks={installedFuelTanks}
            usedHullPoints={usedHullPointsBeforePowerPlants}
            totalPowerConsumed={totalPowerConsumed}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onPowerPlantsChange={setInstalledPowerPlants}
            onFuelTanksChange={setInstalledFuelTanks}
          />
        );
      case 'engines':
        return (
          <EngineSelection
            hull={selectedHull!}
            installedEngines={installedEngines}
            installedFuelTanks={installedEngineFuelTanks}
            usedHullPoints={usedHullPointsBeforeEngines}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            isRequired={steps.find(s => s.id === 'engines')?.required ?? true}
            onEnginesChange={setInstalledEngines}
            onFuelTanksChange={setInstalledEngineFuelTanks}
          />
        );
      case 'ftl':
        return (
          <FTLDriveSelection
            hull={selectedHull!}
            installedFTLDrive={installedFTLDrive}
            installedFTLFuelTanks={installedFTLFuelTanks}
            installedPowerPlants={installedPowerPlants}
            availablePower={totalPower}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onFTLDriveChange={setInstalledFTLDrive}
            onFTLFuelTanksChange={setInstalledFTLFuelTanks}
          />
        );
      case 'support':
        return (
          <SupportSystemsSelection
            hull={selectedHull!}
            installedLifeSupport={installedLifeSupport}
            installedAccommodations={installedAccommodations}
            installedStoreSystems={installedStoreSystems}
            installedGravitySystems={installedGravitySystems}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            surfaceProvidesLifeSupport={surfaceProvidesLifeSupport}
            surfaceProvidesGravity={surfaceProvidesGravity}
            onLifeSupportChange={setInstalledLifeSupport}
            onAccommodationsChange={setInstalledAccommodations}
            onStoreSystemsChange={setInstalledStoreSystems}
            onGravitySystemsChange={setInstalledGravitySystems}
          />
        );
      case 'weapons':
        return (
          <WeaponSelection
            hull={selectedHull!}
            installedWeapons={installedWeapons}
            installedCommandControl={installedCommandControl}
            ordnanceDesigns={ordnanceDesigns}
            launchSystems={installedLaunchSystems}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onWeaponsChange={setInstalledWeapons}
            onOrdnanceDesignsChange={setOrdnanceDesigns}
            onLaunchSystemsChange={setInstalledLaunchSystems}
          />
        );
      case 'defenses':
        return (
          <DefenseSelection
            hull={selectedHull!}
            installedDefenses={installedDefenses}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onDefensesChange={setInstalledDefenses}
          />
        );
      case 'sensors':
        return (
          <SensorSelection
            installedSensors={installedSensors}
            installedCommandControl={installedCommandControl}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onSensorsChange={setInstalledSensors}
          />
        );
      case 'c4':
        return (
          <CommandControlSelection
            hull={selectedHull!}
            installedSystems={installedCommandControl}
            installedSensors={installedSensors}
            installedWeapons={installedWeapons}
            installedLaunchSystems={installedLaunchSystems}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onSystemsChange={setInstalledCommandControl}
          />
        );
      case 'hangars':
        return (
          <HangarMiscSelection
            hull={selectedHull!}
            installedSystems={installedHangarMisc}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            totalPassengersAndSuspended={totalPassengersAndSuspended}
            embarkedCraft={embarkedCraft}
            onSystemsChange={setInstalledHangarMisc}
            onEmbarkedCraftChange={setEmbarkedCraft}
          />
        );
      case 'damage':
        return (
          <DamageDiagramSelection
            hull={selectedHull!}
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
            zones={damageDiagramZones}
            onZonesChange={setDamageDiagramZones}
          />
        );
      case 'summary':
        return (
          <SummarySelection
            hull={selectedHull}
            warshipName={warshipName}
            shipDescription={shipDescription}
            onShipDescriptionChange={setShipDescription}
            armorLayers={armorLayers}
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
            embarkedCraft={embarkedCraft}
            damageDiagramZones={damageDiagramZones}
            designProgressLevel={designProgressLevel}
            designType={designType}
            stationType={stationType}
            currentFilePath={currentFilePath}
            onShowNotification={showNotification}
          />
        );
      default:
        return (
          <Typography color="text.secondary">
            Step {activeStep + 1}: {steps[activeStep]?.label} - Coming soon...
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
      <>
        <WelcomePage
          onNewWarship={handleNewWarship}
          onLoadWarship={handleLoadWarship}
          onManageMods={handleManageMods}
          onOpenLibrary={handleOpenLibrary}
          onRecoverAutoSave={handleRecoverAutoSave}
        />
        <DesignTypeDialog
          open={showDesignTypeDialog}
          onClose={() => setShowDesignTypeDialog(false)}
          onConfirm={handleDesignTypeConfirm}
        />
        <AboutDialog open={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />
        <KeyboardShortcutsDialog open={shortcutsDialogOpen} onClose={() => setShortcutsDialogOpen(false)} />
      </>
    );
  }

  // Show mod manager
  if (mode === 'mods') {
    return (
      <>
        <ModManager
          onBack={handleModsBack}
          onModsChanged={handleModsChanged}
        />
        <AboutDialog open={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />
        <KeyboardShortcutsDialog open={shortcutsDialogOpen} onClose={() => setShortcutsDialogOpen(false)} />
      </>
    );
  }

  // Show ship library
  if (mode === 'library') {
    return (
      <>
        <ShipLibrary
          onBack={handleLibraryBack}
          onOpenDesign={loadFromFile}
        />
        <AboutDialog open={aboutDialogOpen} onClose={() => setAboutDialogOpen(false)} />
        <KeyboardShortcutsDialog open={shortcutsDialogOpen} onClose={() => setShortcutsDialogOpen(false)} />
      </>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* App Bar */}
      <AppBar position="sticky" color="default" elevation={1} sx={{ top: 0, zIndex: 1200 }}>
        <Toolbar sx={{ minHeight: 64 }}>
          <TextField
            label="Design Name"
            value={warshipName}
            onChange={(e) => setWarshipName(e.target.value)}
            variant="standard"
            sx={{
              minWidth: 300,
              maxWidth: 400,
              '& .MuiInput-root': {
                fontSize: '1.25rem',
                fontWeight: 500,
              },
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
          <Tooltip title={`Theme: ${themeMode === 'dark' ? 'Dark' : themeMode === 'light' ? 'Light' : 'System'} (click to cycle)`}>
            <IconButton
              onClick={() => {
                const modes: ThemeMode[] = ['dark', 'light', 'system'];
                const idx = modes.indexOf(themeMode);
                onThemeModeChange(modes[(idx + 1) % modes.length]);
              }}
              size="small"
            >
              {themeMode === 'dark' ? <DarkModeIcon /> : themeMode === 'light' ? <LightModeIcon /> : <SettingsBrightnessIcon />}
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton
                onClick={handleUndo}
                disabled={!undoHistory.canUndo}
                size="small"
              >
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton
                onClick={handleRedo}
                disabled={!undoHistory.canRedo}
                size="small"
              >
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <Tooltip title={hasUnsavedChanges ? 'Save Warship (Ctrl+S) \u2022 Unsaved changes' : 'Save Warship (Ctrl+S)'}>
            <IconButton
              color="primary"
              onClick={handleSaveWarship}
            >
              <Badge
                variant="dot"
                color="warning"
                invisible={!hasUnsavedChanges}
              >
                <SaveIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Duplicate Design (Ctrl+Shift+D)">
            <IconButton
              onClick={handleDuplicateDesign}
              size="small"
            >
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        {selectedHull && (
          <Toolbar variant="dense" sx={{ minHeight: 40, gap: 1, borderTop: 1, borderColor: 'divider' }}>
            {designType === 'station' && stationType && (
              <Chip
                label={getStationTypeDisplayName(stationType)}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            <Chip
              label={selectedHull.name}
              variant="outlined"
              size="small"
            />
            <ResourceBarChip
              label={`HP: ${remainingHullPoints} / ${totalHullPoints}`}
              segments={[
                { key: 'armor', label: 'Armor', value: hpBreakdown.armor, color: BUDGET_CATEGORY_COLORS.armor },
                { key: 'powerPlants', label: 'Power Plants', value: hpBreakdown.powerPlants, color: BUDGET_CATEGORY_COLORS.powerPlants },
                { key: 'engines', label: 'Engines', value: hpBreakdown.engines, color: BUDGET_CATEGORY_COLORS.engines },
                { key: 'ftl', label: 'FTL Drive', value: hpBreakdown.ftlDrive, color: BUDGET_CATEGORY_COLORS.ftl },
                { key: 'support', label: 'Support Systems', value: hpBreakdown.supportSystems, color: BUDGET_CATEGORY_COLORS.support },
                { key: 'weapons', label: 'Weapons', value: hpBreakdown.weapons, color: BUDGET_CATEGORY_COLORS.weapons },
                { key: 'defenses', label: 'Defenses', value: hpBreakdown.defenses, color: BUDGET_CATEGORY_COLORS.defenses },
                { key: 'commandControl', label: 'C4', value: hpBreakdown.commandControl, color: BUDGET_CATEGORY_COLORS.commandControl },
                { key: 'sensors', label: 'Sensors', value: hpBreakdown.sensors, color: BUDGET_CATEGORY_COLORS.sensors },
                { key: 'hangarMisc', label: 'Hangars & Misc', value: hpBreakdown.hangarMisc, color: BUDGET_CATEGORY_COLORS.hangarMisc },
              ]}
              capacity={totalHullPoints}
              isOverBudget={remainingHullPoints < 0}
              popoverTitle="Hull Points Breakdown"
              unit="HP"
              breakdownRows={[
                { key: 'armor', label: 'Armor', value: hpBreakdown.armor, color: BUDGET_CATEGORY_COLORS.armor },
                { key: 'powerPlants', label: 'Power Plants', value: hpBreakdown.powerPlants, color: BUDGET_CATEGORY_COLORS.powerPlants },
                { key: 'engines', label: 'Engines', value: hpBreakdown.engines, color: BUDGET_CATEGORY_COLORS.engines },
                { key: 'ftl', label: 'FTL Drive', value: hpBreakdown.ftlDrive, color: BUDGET_CATEGORY_COLORS.ftl },
                { key: 'support', label: 'Support Systems', value: hpBreakdown.supportSystems, color: BUDGET_CATEGORY_COLORS.support },
                { key: 'weapons', label: 'Weapons', value: hpBreakdown.weapons, color: BUDGET_CATEGORY_COLORS.weapons },
                { key: 'defenses', label: 'Defenses', value: hpBreakdown.defenses, color: BUDGET_CATEGORY_COLORS.defenses },
                { key: 'commandControl', label: 'C4', value: hpBreakdown.commandControl, color: BUDGET_CATEGORY_COLORS.commandControl },
                { key: 'sensors', label: 'Sensors', value: hpBreakdown.sensors, color: BUDGET_CATEGORY_COLORS.sensors },
                { key: 'hangarMisc', label: 'Hangars & Misc', value: hpBreakdown.hangarMisc, color: BUDGET_CATEGORY_COLORS.hangarMisc },
              ]}
              totalLabel="Total Used"
              totalValue={totalHullPoints - remainingHullPoints}
              ariaLabel="Show hull points breakdown"
            />
            <ResourceBarChip
              label={`Power: ${totalPower - totalPowerConsumed} / ${totalPower}`}
              segments={[
                ...(powerScenario.engines ? [{ key: 'engines', label: 'Engines', value: powerBreakdown.engines, color: BUDGET_CATEGORY_COLORS.engines }] : []),
                ...(powerScenario.ftlDrive ? [{ key: 'ftl', label: 'FTL Drive', value: powerBreakdown.ftlDrive, color: BUDGET_CATEGORY_COLORS.ftl }] : []),
                ...(powerScenario.supportSystems ? [{ key: 'support', label: 'Support Systems', value: powerBreakdown.supportSystems, color: BUDGET_CATEGORY_COLORS.support }] : []),
                ...(powerScenario.weapons ? [{ key: 'weapons', label: 'Weapons', value: powerBreakdown.weapons, color: BUDGET_CATEGORY_COLORS.weapons }] : []),
                ...(powerScenario.defenses ? [{ key: 'defenses', label: 'Defenses', value: powerBreakdown.defenses, color: BUDGET_CATEGORY_COLORS.defenses }] : []),
                ...(powerScenario.commandControl ? [{ key: 'commandControl', label: 'C4', value: powerBreakdown.commandControl, color: BUDGET_CATEGORY_COLORS.commandControl }] : []),
                ...(powerScenario.sensors ? [{ key: 'sensors', label: 'Sensors', value: powerBreakdown.sensors, color: BUDGET_CATEGORY_COLORS.sensors }] : []),
                ...(powerScenario.hangarMisc ? [{ key: 'hangarMisc', label: 'Hangars & Misc', value: powerBreakdown.hangarMisc, color: BUDGET_CATEGORY_COLORS.hangarMisc }] : []),
              ]}
              capacity={totalPower}
              isOverBudget={totalPowerConsumed > totalPower}
              popoverTitle="Power Scenario"
              unit="PP"
              tooltip="Click to configure power scenario — select which systems draw power"
              popoverExtra={
                <Box sx={{ mt: 1 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                    Power scenario — select active systems
                  </Typography>
                  {([
                    { key: 'engines', label: 'Engines', field: 'engines' as const, color: BUDGET_CATEGORY_COLORS.engines },
                    { key: 'ftl', label: 'FTL Drive', field: 'ftlDrive' as const, color: BUDGET_CATEGORY_COLORS.ftl },
                    { key: 'support', label: 'Support', field: 'supportSystems' as const, color: BUDGET_CATEGORY_COLORS.support },
                    { key: 'weapons', label: 'Weapons', field: 'weapons' as const, color: BUDGET_CATEGORY_COLORS.weapons },
                    { key: 'defenses', label: 'Defenses', field: 'defenses' as const, color: BUDGET_CATEGORY_COLORS.defenses },
                    { key: 'commandControl', label: 'C4', field: 'commandControl' as const, color: BUDGET_CATEGORY_COLORS.commandControl },
                    { key: 'sensors', label: 'Sensors', field: 'sensors' as const, color: BUDGET_CATEGORY_COLORS.sensors },
                    { key: 'hangarMisc', label: 'Hangars & Misc', field: 'hangarMisc' as const, color: BUDGET_CATEGORY_COLORS.hangarMisc },
                  ] as const).map((item) => (
                    <Box
                      key={item.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        py: 0.15,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        borderRadius: 0.5,
                      }}
                      onClick={() => setPowerScenario({ ...powerScenario, [item.field]: !powerScenario[item.field] })}
                    >
                      <Checkbox
                        size="small"
                        checked={powerScenario[item.field]}
                        tabIndex={-1}
                        sx={{ p: 0.25 }}
                      />
                      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: item.color, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{item.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{powerBreakdown[item.field]} PP</Typography>
                    </Box>
                  ))}
                </Box>
              }
              ariaLabel="Show power breakdown"
            />
            <ResourceBarChip
              label={`Cost: ${formatCost(totalCost)}`}
              segments={[
                { key: 'hull', label: 'Hull', value: costBreakdown.hull, color: BUDGET_CATEGORY_COLORS.hull },
                { key: 'armor', label: 'Armor', value: costBreakdown.armor, color: BUDGET_CATEGORY_COLORS.armor },
                { key: 'powerPlants', label: 'Power Plants', value: costBreakdown.powerPlants, color: BUDGET_CATEGORY_COLORS.powerPlants },
                { key: 'engines', label: 'Engines', value: costBreakdown.engines, color: BUDGET_CATEGORY_COLORS.engines },
                { key: 'ftl', label: 'FTL Drive', value: costBreakdown.ftlDrive, color: BUDGET_CATEGORY_COLORS.ftl },
                { key: 'support', label: 'Support Systems', value: costBreakdown.supportSystems, color: BUDGET_CATEGORY_COLORS.support },
                { key: 'weapons', label: 'Weapons', value: costBreakdown.weapons, color: BUDGET_CATEGORY_COLORS.weapons },
                { key: 'defenses', label: 'Defenses', value: costBreakdown.defenses, color: BUDGET_CATEGORY_COLORS.defenses },
                { key: 'commandControl', label: 'C4', value: costBreakdown.commandControl, color: BUDGET_CATEGORY_COLORS.commandControl },
                { key: 'sensors', label: 'Sensors', value: costBreakdown.sensors, color: BUDGET_CATEGORY_COLORS.sensors },
                { key: 'hangarMisc', label: 'Hangars & Misc', value: costBreakdown.hangarMisc, color: BUDGET_CATEGORY_COLORS.hangarMisc },
              ]}
              isCost
              popoverTitle="Cost Breakdown"
              breakdownRows={[
                { key: 'hull', label: 'Hull', value: costBreakdown.hull, color: BUDGET_CATEGORY_COLORS.hull },
                { key: 'armor', label: 'Armor', value: costBreakdown.armor, color: BUDGET_CATEGORY_COLORS.armor },
                { key: 'powerPlants', label: 'Power Plants', value: costBreakdown.powerPlants, color: BUDGET_CATEGORY_COLORS.powerPlants },
                { key: 'engines', label: 'Engines', value: costBreakdown.engines, color: BUDGET_CATEGORY_COLORS.engines },
                { key: 'ftl', label: 'FTL Drive', value: costBreakdown.ftlDrive, color: BUDGET_CATEGORY_COLORS.ftl },
                { key: 'support', label: 'Support Systems', value: costBreakdown.supportSystems, color: BUDGET_CATEGORY_COLORS.support },
                { key: 'weapons', label: 'Weapons', value: costBreakdown.weapons, color: BUDGET_CATEGORY_COLORS.weapons },
                { key: 'defenses', label: 'Defenses', value: costBreakdown.defenses, color: BUDGET_CATEGORY_COLORS.defenses },
                { key: 'commandControl', label: 'C4', value: costBreakdown.commandControl, color: BUDGET_CATEGORY_COLORS.commandControl },
                { key: 'sensors', label: 'Sensors', value: costBreakdown.sensors, color: BUDGET_CATEGORY_COLORS.sensors },
                { key: 'hangarMisc', label: 'Hangars & Misc', value: costBreakdown.hangarMisc, color: BUDGET_CATEGORY_COLORS.hangarMisc },
              ]}
              totalLabel="Total"
              totalValue={totalCost}
              ariaLabel="Show cost breakdown"
            />
            {uniqueTechTracks.length > 0 && (
              <Chip
                label={`Tech: ${uniqueTechTracks.join(', ')}`}
                color="default"
                variant="outlined"
                size="small"
              />
            )}
          </Toolbar>
        )}
      </AppBar>

      {/* Stepper */}
      <Paper sx={{ position: 'sticky', top: selectedHull ? 105 : 63, zIndex: 1100, borderRadius: 0, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }} elevation={0}>
        {/* Left scroll arrow */}
        <Box
          role="button"
          aria-label="Scroll steps left"
          tabIndex={canScrollLeft ? 0 : -1}
          onClick={() => {
            stepperRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              stepperRef.current?.scrollBy({ left: -200, behavior: 'smooth' });
            }
          }}
          sx={{
            minWidth: 32,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollLeft ? 'pointer' : 'default',
            opacity: canScrollLeft ? 1 : 0.2,
            transition: 'opacity 0.2s',
            '&:hover': canScrollLeft ? { bgcolor: 'action.hover' } : {},
            pointerEvents: canScrollLeft ? 'auto' : 'none',
            borderRight: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <ChevronLeftIcon fontSize="small" />
        </Box>
        <Box
          ref={stepperRef}
          onScroll={updateScrollArrows}
          sx={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            py: 2,
            px: 1,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          <Stepper 
            activeStep={activeStep} 
            nonLinear 
            sx={{ 
              flexWrap: 'nowrap',
              minWidth: 'max-content',
              '& .MuiStepConnector-root': {
                flex: '0 0 auto',
                minWidth: 8,
                maxWidth: 16,
              },
              '& .MuiStepButton-root': { 
                outline: 'none', 
                '&:focus': { outline: 'none' }, 
                '&:focus-visible': { 
                  outline: '2px solid',
                  outlineColor: 'primary.main',
                  outlineOffset: 2,
                  borderRadius: 1,
                },
              },
              '& .MuiStepLabel-label': {
                whiteSpace: 'nowrap',
              },
            }}
          >
          {steps.map((step, index) => {
            const isStepCompleted = stepCompletion.get(step.id) ?? false;

            // Get summary validation state for special handling
            const summaryState = step.id === 'summary' ? summaryValidationState : null;

            // Determine icon based on required status and completion
            const getStepIcon = () => {
              // Special handling for Summary step
              if (step.id === 'summary') {
                if (summaryState === 'valid') {
                  return <CheckCircleIcon color="success" />;
                } else if (summaryState === 'error') {
                  return <ErrorOutlineIcon color={activeStep === index ? 'warning' : 'error'} />;
                } else {
                  // warning state
                  return <ErrorOutlineIcon color="warning" />;
                }
              }
              
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
              <Step key={step.id} completed={isStepCompleted}>
                <Tooltip title={STEP_FULL_NAMES[step.id]} enterDelay={400} arrow>
                  <StepButton onClick={() => handleStepClick(index)}>
                    <StepLabel StepIconComponent={getStepIcon}>
                      {step.label}
                    </StepLabel>
                  </StepButton>
                </Tooltip>
              </Step>
            );
          })}
          </Stepper>
        </Box>
        {/* Right scroll arrow */}
        <Box
          role="button"
          aria-label="Scroll steps right"
          tabIndex={canScrollRight ? 0 : -1}
          onClick={() => {
            stepperRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              stepperRef.current?.scrollBy({ left: 200, behavior: 'smooth' });
            }
          }}
          sx={{
            minWidth: 32,
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: canScrollRight ? 'pointer' : 'default',
            opacity: canScrollRight ? 1 : 0.2,
            transition: 'opacity 0.2s',
            '&:hover': canScrollRight ? { bgcolor: 'action.hover' } : {},
            pointerEvents: canScrollRight ? 'auto' : 'none',
            borderLeft: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <ChevronRightIcon fontSize="small" />
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            px: 1.5,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            borderLeft: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
          }}
        >
          {completedStepCount}/{steps.length}
        </Typography>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 2, width: '100%' }}>
        <Paper sx={{ p: 3, minHeight: 400, width: '100%', boxSizing: 'border-box' }}>
          {activeStepId && (
            <StepHeader
              stepNumber={activeStep + 1}
              name={STEP_FULL_NAMES[activeStepId]}
              isRequired={steps[activeStep]?.required}
            />
          )}
          {renderStepContent()}
        </Paper>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          {activeStep > 0 && (
            <Button
              variant="outlined"
              onClick={handleBack}
            >
              Back
            </Button>
          )}
          {activeStep < steps.length - 1 && (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Box>
      </Container>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
          action={snackbar.action ? (
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => {
                snackbar.action?.onClick();
                handleCloseSnackbar();
              }}
            >
              {snackbar.action.label}
            </Button>
          ) : undefined}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* About Dialog */}
      <AboutDialog 
        open={aboutDialogOpen} 
        onClose={() => setAboutDialogOpen(false)} 
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />

      {/* Design Type Dialog */}
      <DesignTypeDialog
        open={showDesignTypeDialog}
        onClose={() => setShowDesignTypeDialog(false)}
        onConfirm={handleDesignTypeConfirm}
      />

      {/* Hull Change Confirmation Dialog */}
      <ConfirmDialog
        open={confirmHullChangeOpen}
        title="Change Hull?"
        message="Changing the hull will remove all installed components (armor, power plants, engines, weapons, systems, damage zones, etc.). This action cannot be undone."
        confirmLabel="Change Hull"
        confirmColor="warning"
        onConfirm={() => {
          if (pendingHull) {
            setSelectedHull(pendingHull);
            clearAllComponents();
          }
          setPendingHull(null);
          setConfirmHullChangeOpen(false);
        }}
        onCancel={() => {
          setPendingHull(null);
          setConfirmHullChangeOpen(false);
        }}
      />
    </Box>
  );
}

export default App;
