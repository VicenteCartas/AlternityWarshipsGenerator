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
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import type { InstalledPowerPlant } from './types/powerPlant';
import type { InstalledEngine } from './types/engine';
import type { ProgressLevel, TechTrack } from './types/common';
import './types/electron.d.ts';
import { calculateHullStats } from './types/hull';
import { calculateArmorHullPoints, calculateArmorCost } from './services/armorService';
import { calculateTotalPowerPlantStats } from './services/powerPlantService';
import { calculateTotalEngineStats } from './services/engineService';
import { formatCost } from './services/formatters';
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
  { label: 'Power Plant', required: true },
  { label: 'Engines', required: true },
  { label: 'FTL Drive', required: false },
  { label: 'Systems', required: false },
];

// All available tech tracks with display names
const ALL_TECH_TRACKS: { code: TechTrack; name: string }[] = [
  { code: 'G', name: 'Gravity' },
  { code: 'D', name: 'Dimensional' },
  { code: 'A', name: 'Antimatter' },
  { code: 'M', name: 'Matter' },
  { code: 'F', name: 'Fusion' },
  { code: 'Q', name: 'Quantum' },
  { code: 'T', name: 'Transport' },
  { code: 'S', name: 'Structural' },
  { code: 'P', name: 'Psionic' },
  { code: 'X', name: 'Exotic' },
  { code: 'C', name: 'Computer' },
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
  const [installedEngines, setInstalledEngines] = useState<InstalledEngine[]>([]);
  const [warshipName, setWarshipName] = useState<string>('New Ship');
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  
  // Design constraints - filter available components
  const [designProgressLevel, setDesignProgressLevel] = useState<ProgressLevel>(9);
  const [designTechTracks, setDesignTechTracks] = useState<TechTrack[]>([]);
  
  // Tech track popover anchor
  const [techAnchorEl, setTechAnchorEl] = useState<HTMLElement | null>(null);
  
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
    setInstalledEngines([]);
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
      setInstalledEngines(loadResult.state.engines || []);
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
      hull: selectedHull,
      armorWeight: selectedArmorWeight,
      armorType: selectedArmorType,
      powerPlants: installedPowerPlants,
      engines: installedEngines,
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
  }, [selectedHull, selectedArmorWeight, selectedArmorType, installedPowerPlants, installedEngines, warshipName, designProgressLevel, designTechTracks]);

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
      hull: selectedHull,
      armorWeight: selectedArmorWeight,
      armorType: selectedArmorType,
      powerPlants: installedPowerPlants,
      engines: installedEngines,
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
  }, [selectedHull, selectedArmorWeight, selectedArmorType, installedPowerPlants, installedEngines, warshipName, designProgressLevel, designTechTracks, saveToFile]);

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

  const handleStepClick = (step: number) => {
    // Allow navigation to any step, but show warning if prerequisites not met
    setActiveStep(step);
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
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
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants);
    used += powerPlantStats.totalHullPoints;
    return used;
  };

  // Calculate remaining hull points
  const getRemainingHullPoints = () => {
    if (!selectedHull) return 0;
    let remaining = selectedHull.hullPoints + selectedHull.bonusHullPoints;
    if (selectedArmorWeight) {
      remaining -= calculateArmorHullPoints(selectedHull, selectedArmorWeight);
    }
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants);
    remaining -= powerPlantStats.totalHullPoints;
    const engineStats = calculateTotalEngineStats(installedEngines, selectedHull);
    remaining -= engineStats.totalHullPoints;
    return remaining;
  };

  // Calculate total power generated
  const getTotalPower = () => {
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants);
    return powerPlantStats.totalPowerGenerated;
  };

  // Calculate total cost
  const getTotalCost = () => {
    if (!selectedHull) return 0;
    let cost = selectedHull.cost;
    if (selectedArmorWeight && selectedArmorType) {
      cost += calculateArmorCost(selectedHull, selectedArmorWeight, selectedArmorType);
    }
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants);
    cost += powerPlantStats.totalCost;
    const engineStats = calculateTotalEngineStats(installedEngines, selectedHull);
    cost += engineStats.totalCost;
    return cost;
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
            usedHullPoints={getUsedHullPointsBeforePowerPlants()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onPowerPlantsChange={handlePowerPlantsChange}
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
            usedHullPoints={getUsedHullPointsBeforeEngines()}
            availablePower={getTotalPower()}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onEnginesChange={handleEnginesChange}
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
              {ALL_TECH_TRACKS.map(({ code, name }) => (
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
                  label={`${code} - ${name}`}
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
                label={`HP: ${getRemainingHullPoints()} / ${calculateHullStats(selectedHull).totalHullPoints}`}
                color={getRemainingHullPoints() >= 0 ? 'success' : 'error'}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Power: ${getTotalPower()} / ${getTotalPower()}`}
                color={getTotalPower() > 0 ? 'success' : 'default'}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Crew: 0 / ${selectedHull.crew}`}
                color={0 >= selectedHull.crew ? 'success' : 'error'}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Cost: ${formatCost(getTotalCost())}`}
                color="default"
                variant="outlined"
                size="small"
              />
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
      <Paper sx={{ px: 3, py: 2, minHeight: 72, position: 'sticky', top: 63, zIndex: 1100, borderRadius: 0, borderBottom: 1, borderColor: 'divider' }} elevation={0}>
        <Stepper activeStep={activeStep} nonLinear sx={{ '& .MuiStepButton-root': { outline: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } } }}>
          {steps.map((step, index) => {
            // Determine if step is completed
            const isStepCompleted = (() => {
              switch (index) {
                case 0: return selectedHull !== null; // Hull
                case 1: return selectedArmorWeight !== null; // Armor (optional)
                case 2: return installedPowerPlants.length > 0; // Power Plant
                case 3: return false; // Engines (not implemented yet)
                case 4: return false; // FTL Drive (not implemented yet)
                case 5: return false; // Systems (not implemented yet)
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
              // Mandatory but not completed - always show red error icon
              return <ErrorOutlineIcon color="error" />;
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
