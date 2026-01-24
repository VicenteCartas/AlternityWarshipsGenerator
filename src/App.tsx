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
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import { WelcomePage } from './components/WelcomePage';
import { HullSelection } from './components/HullSelection';
import { ArmorSelection } from './components/ArmorSelection';
import { PowerPlantSelection } from './components/PowerPlantSelection';
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import type { InstalledPowerPlant } from './types/powerPlant';
import './types/electron.d.ts';
import { calculateHullStats } from './types/hull';
import { calculateArmorHullPoints, calculateArmorCost } from './services/armorService';
import { calculateTotalPowerPlantStats } from './services/powerPlantService';
import { 
  serializeWarship, 
  saveFileToJson, 
  jsonToSaveFile, 
  deserializeWarship, 
  getDefaultFileName,
  type WarshipState 
} from './services/saveService';

type AppMode = 'welcome' | 'builder';

const steps = [
  { label: 'Hull', required: true },
  { label: 'Armor', required: false },
  { label: 'Power Plant', required: true },
  { label: 'Engines', required: true },
  { label: 'FTL Drive', required: false },
  { label: 'Systems', required: false },
];

function App() {
  const [mode, setMode] = useState<AppMode>('welcome');
  const [activeStep, setActiveStep] = useState(0);
  const [selectedHull, setSelectedHull] = useState<Hull | null>(null);
  const [selectedArmorWeight, setSelectedArmorWeight] = useState<ArmorWeight | null>(null);
  const [selectedArmorType, setSelectedArmorType] = useState<ArmorType | null>(null);
  const [installedPowerPlants, setInstalledPowerPlants] = useState<InstalledPowerPlant[]>([]);
  const [warshipName, setWarshipName] = useState<string>('New Ship');
  
  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

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
    setWarshipName('New Ship');
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
      setInstalledPowerPlants(loadResult.state.powerPlants);
      setWarshipName(loadResult.state.name);
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

  const handleSaveWarship = useCallback(async () => {
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
    };

    try {
      const defaultFileName = getDefaultFileName(state);
      const dialogResult = await window.electronAPI.showSaveDialog(defaultFileName);
      
      if (dialogResult.canceled || !dialogResult.filePath) {
        return;
      }

      const saveFile = serializeWarship(state);
      const json = saveFileToJson(saveFile);
      const saveResult = await window.electronAPI.saveFile(dialogResult.filePath, json);

      if (saveResult.success) {
        showNotification('Warship saved successfully', 'success');
      } else {
        showNotification(`Failed to save: ${saveResult.error}`, 'error');
      }
    } catch (error) {
      showNotification(`Error saving file: ${error}`, 'error');
    }
  }, [selectedHull, selectedArmorWeight, selectedArmorType, installedPowerPlants, warshipName]);

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

      return () => {
        window.electronAPI?.removeAllListeners('menu-new-warship');
        window.electronAPI?.removeAllListeners('menu-load-warship');
        window.electronAPI?.removeAllListeners('menu-save-warship');
      };
    }
  }, [handleNewWarship, handleLoadWarship, handleSaveWarship]);

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

  // Calculate remaining hull points
  const getRemainingHullPoints = () => {
    if (!selectedHull) return 0;
    let remaining = selectedHull.hullPoints + selectedHull.bonusHullPoints;
    if (selectedArmorWeight) {
      remaining -= calculateArmorHullPoints(selectedHull, selectedArmorWeight);
    }
    const powerPlantStats = calculateTotalPowerPlantStats(installedPowerPlants);
    remaining -= powerPlantStats.totalHullPoints;
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
    return cost;
  };

  // Format cost for display
  const formatCost = (cost: number): string => {
    if (cost >= 1_000_000_000) {
      return `$${(cost / 1_000_000_000).toFixed(1)}B`;
    } else if (cost >= 1_000_000) {
      return `$${(cost / 1_000_000).toFixed(1)}M`;
    } else if (cost >= 1_000) {
      return `$${(cost / 1_000).toFixed(0)}K`;
    }
    return `$${cost}`;
  };

  // Get maximum progress level across all components
  const getMaxProgressLevel = (): number => {
    const levels: number[] = [];
    if (selectedArmorType) {
      levels.push(selectedArmorType.progressLevel);
    }
    installedPowerPlants.forEach((pp) => {
      levels.push(pp.type.progressLevel);
    });
    return levels.length > 0 ? Math.max(...levels) : 0;
  };

  // Get unique tech tracks across all components
  const getUniqueTechTracks = (): string[] => {
    const tracks = new Set<string>();
    if (selectedArmorType && selectedArmorType.techTrack !== '-') {
      tracks.add(selectedArmorType.techTrack);
    }
    installedPowerPlants.forEach((pp) => {
      if (pp.type.techTrack !== '-') {
        tracks.add(pp.type.techTrack);
      }
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
            onPowerPlantsChange={handlePowerPlantsChange}
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
          <RocketLaunchIcon sx={{ mr: 2, color: 'primary.main' }} />
          <TextField
            value={warshipName}
            onChange={(e) => setWarshipName(e.target.value)}
            variant="standard"
            placeholder="Ship Name"
            sx={{
              flexGrow: 1,
              maxWidth: 300,
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
                label={`Power: ${getTotalPower()}`}
                color={getTotalPower() > 0 ? 'primary' : 'default'}
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Cost: ${formatCost(getTotalCost())}`}
                color="default"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`PL: ${getMaxProgressLevel()}`}
                color="default"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Tech: ${getUniqueTechTracks().length > 0 ? getUniqueTechTracks().join(', ') : 'None'}`}
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
              // Mandatory but not completed
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
