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
import type { Mod } from './types/mod';
import { StepHeader } from './components/shared/StepHeader';
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import type { ProgressLevel, DesignType, StationType, AppMode } from './types/common';
import './types/electron.d.ts';
import { buildShipArmor, sortArmorLayers, isMultipleArmorLayersAllowed } from './services/armorService';
import { formatCost, getTechTrackName, getStationTypeDisplayName, ALL_TECH_TRACK_CODES, PL_NAMES } from './services/formatters';
import { loadAllGameData, reloadAllGameData, reloadWithSpecificMods, type DataLoadResult } from './services/dataLoader';
import type { WarshipState } from './services/saveService';
import { STEP_FULL_NAMES, getStepsForDesign } from './constants/steps';
import { useNotification } from './hooks/useNotification';
import { useStepperScroll } from './hooks/useStepperScroll';
import { useElectronMenuHandlers } from './hooks/useElectronMenuHandlers';
import { useDesignCalculations, type PowerScenario } from './hooks/useDesignCalculations';
import { useSaveLoad } from './hooks/useSaveLoad';
import { useWarshipState } from './hooks/useWarshipState';

function App() {
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
    installedDefenses, installedCommandControl, installedSensors, installedHangarMisc,
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
    setDamageDiagramZones,
    setShipDescription, setWarshipName,
    setDesignProgressLevel, setDesignTechTracks,
    buildCurrentState, applyState,
    handleUndo, handleRedo, undoHistory,
    hasUnsavedChanges, setHasUnsavedChanges, skipDirtyCheck,
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

  // Track the mode to return to when leaving the mod manager
  const [preModeForMods, setPreModeForMods] = useState<AppMode>('welcome');

  // Per-design active mods (set at creation time or on load, locked during design)
  const [designActiveMods, setDesignActiveMods] = useState<Mod[]>([]);

  // Tech track popover anchor
  const [techAnchorEl, setTechAnchorEl] = useState<HTMLElement | null>(null);

  // Power scenario popover and toggles
  const [powerAnchorEl, setPowerAnchorEl] = useState<HTMLElement | null>(null);

  // HP and Cost breakdown popover anchors
  const [hpAnchorEl, setHpAnchorEl] = useState<HTMLElement | null>(null);
  const [costAnchorEl, setCostAnchorEl] = useState<HTMLElement | null>(null);

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
    designProgressLevel,
    designTechTracks,
    powerScenario,
    steps,
    surfaceProvidesLifeSupport,
  });

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
    skipDirtyCheck,
    setDesignActiveMods,
    setHasUnsavedChanges,
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
    skipDirtyCheck.current = true;
    setActiveStep(0);
    const defaultName = newDesignType === 'warship' ? 'New Ship'
      : newStationType === 'ground-base' ? 'New Base'
      : newStationType === 'outpost' ? 'New Outpost'
      : 'New Station';
    const freshState: WarshipState = {
      name: defaultName,
      shipDescription: { lore: '', imageData: null, imageMimeType: null },
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
  }, [applyState, showNotification]);

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
  }, []);

  const handleHullSelect = (hull: Hull) => {
    setSelectedHull(hull);
    // Reset armor and power plants if hull changes
    setArmorLayers([]);
    setInstalledPowerPlants([]);
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
            onSystemsChange={setInstalledHangarMisc}
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
          onLoadFile={loadFromFile}
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
            <Chip
              label={`HP: ${remainingHullPoints} / ${totalHullPoints}`}
              color={remainingHullPoints < 0 ? 'error' : 'success'}
              variant="outlined"
              size="small"
              onClick={(e) => setHpAnchorEl(e.currentTarget)}
              aria-label="Show hull points breakdown"
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
                  <span>Armor</span><span>{hpBreakdown.armor} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Power Plants</span><span>{hpBreakdown.powerPlants} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Engines</span><span>{hpBreakdown.engines} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>FTL Drive</span><span>{hpBreakdown.ftlDrive} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Support Systems</span><span>{hpBreakdown.supportSystems} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Weapons</span><span>{hpBreakdown.weapons} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Defenses</span><span>{hpBreakdown.defenses} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>C4</span><span>{hpBreakdown.commandControl} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sensors</span><span>{hpBreakdown.sensors} HP</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hangars & Misc</span><span>{hpBreakdown.hangarMisc} HP</span>
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Total Used</span><span>{totalHullPoints - remainingHullPoints} HP</span>
                </Typography>
              </Box>
            </Popover>
            <Chip
              label={`Power: ${totalPower - totalPowerConsumed} / ${totalPower}`}
              color={totalPowerConsumed > totalPower ? 'warning' : 'success'}
              variant="outlined"
              size="small"
              onClick={(e) => setPowerAnchorEl(e.currentTarget)}
              aria-label="Show power breakdown"
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
                  label={`Engines (${powerBreakdown.engines} PP)`}
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
                  label={`FTL Drive (${powerBreakdown.ftlDrive} PP)`}
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
                  label={`Support Systems (${powerBreakdown.supportSystems} PP)`}
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
                  label={`Weapons (${powerBreakdown.weapons} PP)`}
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
                  label={`Defenses (${powerBreakdown.defenses} PP)`}
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
                  label={`C4 (${powerBreakdown.commandControl} PP)`}
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
                  label={`Sensors (${powerBreakdown.sensors} PP)`}
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
                  label={`Hangars & Misc (${powerBreakdown.hangarMisc} PP)`}
                  sx={{ display: 'block', m: 0 }}
                />
              </Box>
            </Popover>
            <Chip
              label={`Cost: ${formatCost(totalCost)}`}
              color="default"
              variant="outlined"
              size="small"
              onClick={(e) => setCostAnchorEl(e.currentTarget)}
              aria-label="Show cost breakdown"
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
                  <span>Hull</span><span>{formatCost(costBreakdown.hull)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Armor</span><span>{formatCost(costBreakdown.armor)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Power Plants</span><span>{formatCost(costBreakdown.powerPlants)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Engines</span><span>{formatCost(costBreakdown.engines)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>FTL Drive</span><span>{formatCost(costBreakdown.ftlDrive)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Support Systems</span><span>{formatCost(costBreakdown.supportSystems)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Weapons</span><span>{formatCost(costBreakdown.weapons)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Defenses</span><span>{formatCost(costBreakdown.defenses)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>C4</span><span>{formatCost(costBreakdown.commandControl)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sensors</span><span>{formatCost(costBreakdown.sensors)}</span>
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Hangars & Misc</span><span>{formatCost(costBreakdown.hangarMisc)}</span>
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Total</span><span>{formatCost(totalCost)}</span>
                </Typography>
              </Box>
            </Popover>
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
            // Determine if step is completed
            const isStepCompleted = (() => {
              switch (step.id) {
                case 'hull': return selectedHull !== null;
                case 'armor': return armorLayers.length > 0;
                case 'power': return installedPowerPlants.length > 0;
                case 'engines': return installedEngines.length > 0;
                case 'ftl': return installedFTLDrive !== null;
                case 'support': return installedLifeSupport.length > 0 || installedAccommodations.length > 0 || installedStoreSystems.length > 0;
                case 'weapons': return installedWeapons.length > 0;
                case 'defenses': return installedDefenses.length > 0;
                case 'sensors': return installedSensors.length > 0;
                case 'c4': return installedCommandControl.some(s => s.type.isRequired);
                case 'hangars': return installedHangarMisc.length > 0;
                case 'damage': {
                  if (damageDiagramZones.length === 0) return false;
                  const totalAssigned = damageDiagramZones.reduce((sum, z) => sum + z.systems.length, 0);
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
                case 'summary': return summaryValidationState === 'valid';
                default: return false;
              }
            })();

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
    </Box>
  );
}

export default App;
