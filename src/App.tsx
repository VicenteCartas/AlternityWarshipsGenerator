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
import { HullSelection } from './components/HullSelection';
import { ArmorSelection } from './components/ArmorSelection';
import type { Hull } from './types/hull';
import type { ArmorType, ArmorWeight } from './types/armor';
import { calculateHullStats } from './types/hull';
import { calculateArmorHullPoints, calculateArmorCost } from './services/armorService';

const steps = ['Hull', 'Armor', 'Power Plant', 'Engines', 'FTL Drive', 'Systems'];

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedHull, setSelectedHull] = useState<Hull | null>(null);
  const [selectedArmorWeight, setSelectedArmorWeight] = useState<ArmorWeight | null>(null);
  const [selectedArmorType, setSelectedArmorType] = useState<ArmorType | null>(null);

  const handleHullSelect = (hull: Hull) => {
    setSelectedHull(hull);
    // Reset armor if hull changes
    setSelectedArmorWeight(null);
    setSelectedArmorType(null);
  };

  const handleArmorSelect = (weight: ArmorWeight, type: ArmorType) => {
    setSelectedArmorWeight(weight);
    setSelectedArmorType(type);
  };

  const handleArmorClear = () => {
    setSelectedArmorWeight(null);
    setSelectedArmorType(null);
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

  // Calculate remaining hull points
  const getRemainingHullPoints = () => {
    if (!selectedHull) return 0;
    let remaining = selectedHull.hullPoints + selectedHull.bonusHullPoints;
    if (selectedArmorWeight) {
      remaining -= calculateArmorHullPoints(selectedHull, selectedArmorWeight);
    }
    return remaining;
  };

  // Calculate total cost
  const getTotalCost = () => {
    if (!selectedHull) return 0;
    let cost = selectedHull.cost;
    if (selectedArmorWeight && selectedArmorType) {
      cost += calculateArmorCost(selectedHull, selectedArmorWeight, selectedArmorType);
    }
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
      <AppBar position="static" color="default" elevation={1}>
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
              label={`Power: 0 / 0`}
              color="default"
              variant="outlined"
              size="small"
            />
            <Chip
              label={selectedHull ? `Cost: ${formatCost(getTotalCost())}` : 'Cost: -'}
              color="default"
              variant="outlined"
              size="small"
            />
          </Box>
        </Toolbar>
      </AppBar>

      {/* Stepper */}
      <Paper sx={{ px: 3, py: 2, minHeight: 72 }} elevation={0}>
        <Stepper activeStep={activeStep} nonLinear>
          {steps.map((label, index) => (
            <Step key={label} completed={false}>
              <StepButton onClick={() => handleStepClick(index)}>
                <StepLabel>{label}</StepLabel>
              </StepButton>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ flex: 1, py: 2, width: '100%', display: 'flex', flexDirection: 'column' }}>
        <Paper sx={{ p: 3, flex: 1, minHeight: 400, width: '100%', boxSizing: 'border-box' }}>
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
