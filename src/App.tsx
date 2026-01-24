import { useState } from 'react';
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
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { HullSelection } from './components/HullSelection';
import { ArmorSelection } from './components/ArmorSelection';
import { PowerPlantSelection } from './components/PowerPlantSelection';
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import type { InstalledPowerPlant } from './types/powerPlant';
import { calculateHullStats } from './types/hull';
import { calculateArmorHullPoints, calculateArmorCost } from './services/armorService';
import { calculateTotalPowerPlantStats } from './services/powerPlantService';

const steps = [
  { label: 'Hull', required: true },
  { label: 'Armor', required: false },
  { label: 'Power Plant', required: true },
  { label: 'Engines', required: true },
  { label: 'FTL Drive', required: false },
  { label: 'Systems', required: false },
];

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedHull, setSelectedHull] = useState<Hull | null>(null);
  const [selectedArmorWeight, setSelectedArmorWeight] = useState<ArmorWeight | null>(null);
  const [selectedArmorType, setSelectedArmorType] = useState<ArmorType | null>(null);
  const [installedPowerPlants, setInstalledPowerPlants] = useState<InstalledPowerPlant[]>([]);

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
      levels.push(pp.powerPlantType.progressLevel);
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
      if (pp.powerPlantType.techTrack !== '-') {
        tracks.add(pp.powerPlantType.techTrack);
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
            Step {activeStep + 1}: {steps[activeStep]} - Coming soon...
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      {/* App Bar */}
      <AppBar position="sticky" color="default" elevation={1} sx={{ top: 0, zIndex: 1200 }}>
        <Toolbar sx={{ minHeight: 64 }}>
          <RocketLaunchIcon sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Alternity Warship Generator
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, visibility: selectedHull ? 'visible' : 'hidden' }}>
            <Chip
              label={selectedHull ? `HP: ${getRemainingHullPoints()} / ${calculateHullStats(selectedHull).totalHullPoints}` : 'HP: - / -'}
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
              label={selectedHull ? `Cost: ${formatCost(getTotalCost())}` : 'Cost: -'}
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
    </Box>
  );
}

export default App;
