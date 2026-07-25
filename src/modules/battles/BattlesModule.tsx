import { useState, useEffect, useCallback } from 'react';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Tooltip, Container,
  Stepper, Step, StepLabel, StepButton, Button, Stack, Chip, Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { ThemeMode } from '@app/theme';
import { BattlesWelcome } from './components/BattlesWelcome';
import { ScenarioStep } from './components/ScenarioStep';
import { ForcesStep } from './components/ForcesStep';
import { ResolveStep } from './components/ResolveStep';
import type { BattleState } from './types/battle';
import { computeForceStrength } from './services/battleResolutionService';

interface BattlesModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type Mode = 'welcome' | 'builder';

const STEPS = ['Scenario', 'Side A Forces', 'Side B Forces', 'Resolve'];

function emptyBattle(): BattleState {
  return {
    scenarioName: 'New Engagement',
    sideA: {
      id: 'A',
      name: 'Verge Alliance',
      tacticsScore: 12,
      stacks: [],
      initialForceStrength: 0,
      withdrawThreshold: 0.4,
    },
    sideB: {
      id: 'B',
      name: 'I’krl Exeat',
      tacticsScore: 12,
      stacks: [],
      initialForceStrength: 0,
      withdrawThreshold: 0.6,
    },
    rounds: [],
  };
}

export function BattlesModule({ themeMode, onThemeModeChange, onReturnToHub }: BattlesModuleProps) {
  const [mode, setMode] = useState<Mode>('welcome');
  const [state, setState] = useState<BattleState>(emptyBattle);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    window.electronAPI?.setBuilderMode?.(mode === 'builder' ? 'builder' : 'welcome');
  }, [mode]);

  const cycleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    const idx = modes.indexOf(themeMode);
    onThemeModeChange(modes[(idx + 1) % modes.length]);
  }, [themeMode, onThemeModeChange]);

  const themeIcon = themeMode === 'dark' ? <DarkModeIcon /> : themeMode === 'light' ? <LightModeIcon /> : <SettingsBrightnessIcon />;

  if (mode === 'welcome') {
    return (
      <BattlesWelcome
        onNewBattle={() => { setState(emptyBattle()); setActiveStep(0); setMode('builder'); }}
        onReturnToHub={onReturnToHub}
      />
    );
  }

  const fsA = computeForceStrength(state.sideA);
  const fsB = computeForceStrength(state.sideB);

  const stepCompletion: boolean[] = [
    state.scenarioName.trim().length > 0,
    state.sideA.stacks.length > 0,
    state.sideB.stacks.length > 0,
    state.rounds.length > 0,
  ];

  const renderStep = () => {
    switch (activeStep) {
      case 0: return <ScenarioStep state={state} onChange={setState} />;
      case 1: return <ForcesStep state={state} side="A" stepNumber={2} onChange={setState} />;
      case 2: return <ForcesStep state={state} side="B" stepNumber={3} onChange={setState} />;
      case 3: return <ResolveStep state={state} stepNumber={4} onChange={setState} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Tooltip title="Back to Welcome">
            <IconButton color="inherit" onClick={() => setMode('welcome')} aria-label="Back to welcome">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            {APP_NAME} — Battle Resolution
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mr: 2 }}>
            <Chip label={`${state.sideA.name}: ${fsA.toLocaleString()}`} size="small" color="primary" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' }} />
            <Chip label={`${state.sideB.name}: ${fsB.toLocaleString()}`} size="small" color="primary" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' }} />
            <Chip label={`Round ${state.rounds.length}`} size="small" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' }} />
          </Stack>
          <Tooltip title={`Theme: ${themeMode}`}>
            <IconButton color="inherit" onClick={cycleTheme} aria-label="Toggle theme">{themeIcon}</IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ flexGrow: 1, py: 3 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stepper nonLinear activeStep={activeStep}>
            {STEPS.map((label, idx) => (
              <Step key={label} completed={stepCompletion[idx]}>
                <StepButton onClick={() => setActiveStep(idx)}>
                  <StepLabel>{label}</StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>{renderStep()}</Paper>

        <Stack direction="row" justifyContent="space-between">
          <Button disabled={activeStep === 0} onClick={() => setActiveStep((s) => s - 1)}>
            Back
          </Button>
          <Button
            variant="contained"
            disabled={activeStep === STEPS.length - 1}
            onClick={() => setActiveStep((s) => s + 1)}
          >
            Next
          </Button>
        </Stack>
      </Container>

      <Box component="footer" sx={{ py: 1, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">{APP_NAME} v{APP_VERSION}</Typography>
      </Box>
    </Box>
  );
}

export default BattlesModule;
