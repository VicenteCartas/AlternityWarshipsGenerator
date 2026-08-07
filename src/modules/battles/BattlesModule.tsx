import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, AppBar, Toolbar, Typography, IconButton, Tooltip, Container,
  Stepper, Step, StepLabel, StepButton, Button, Stack, Chip, Paper,
  CircularProgress, Snackbar, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import ExtensionIcon from '@mui/icons-material/Extension';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SaveIcon from '@mui/icons-material/Save';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import { getEnabledMods } from '@shared/services/modService';
import { useUndoHistory } from '@shared/hooks/useUndoHistory';
import { useNotification } from '@shared/hooks/useNotification';
import { ConfirmDialog } from '@shared/components';
import { ModManager } from '@app/ModManager';
import type { ThemeMode } from '@app/theme';
import { BattlesWelcome } from './components/BattlesWelcome';
import { BattleLibrary } from './components/BattleLibrary';
import { ScenarioStep } from './components/ScenarioStep';
import { ForcesStep } from './components/ForcesStep';
import { ResolveStep } from './components/ResolveStep';
import { ResultsStep } from './components/ResultsStep';
import { ALL_BATTLE_STEPS } from './constants/steps';
import { createEmptyBattle } from './constants/battleDefaults';
import type { BattleState, BattleStepId } from './types/battle';
import { computeTotalStrength, isBattleStarted } from './services/battleResolutionService';
import { loadBattlesData, reloadBattlesDataWithMods, getBattleRules } from './services/battlesDataLoader';
import { formatCombatStrength } from './services/battleFormatters';
import { deserializeBattle, jsonToBattleSaveFile } from './services/battleSaveService';
import { exportBattleReport } from './services/battleReportService';
import { summarizeBattleResults } from './services/battleResultsService';
import { useBattleSaveLoad } from './hooks/useBattleSaveLoad';
import {
  checkForBattleAutoSave, clearBattleAutoSave, useBattleAutoSave,
} from './hooks/useBattleAutoSave';

interface BattlesModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type Mode = 'loading' | 'welcome' | 'builder' | 'mods' | 'library';

/** What to do once the user resolves an unsaved-changes prompt. */
type PendingAction = 'new' | 'open' | 'welcome' | 'library' | 'hub' | null;

export function BattlesModule({ themeMode, onThemeModeChange, onReturnToHub }: BattlesModuleProps) {
  const [mode, setMode] = useState<Mode>('loading');
  const [state, setState] = useState<BattleState>(createEmptyBattle);
  const [activeStepId, setActiveStepId] = useState<BattleStepId>('scenario');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [recoveryJson, setRecoveryJson] = useState<string | null>(null);

  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();
  const undoHistory = useUndoHistory<BattleState>();
  const saveLoad = useBattleSaveLoad();

  // Keep the latest state reachable from the stable menu-event callbacks.
  const stateRef = useRef(state);
  const modeRef = useRef(mode);

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // ---- Data loading & crash recovery ----

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mods = await getEnabledMods();
        await loadBattlesData(mods);
      } catch (err) {
        console.error('Failed to load battle data:', err);
      }
      const autoSave = await checkForBattleAutoSave();
      if (cancelled) return;
      if (autoSave) setRecoveryJson(autoSave);
      setMode('welcome');
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (mode === 'loading') return;
    const menuMode = mode === 'builder' ? 'battles'
      : mode === 'library' ? 'battles-library'
        : mode === 'mods' ? 'battles-mods'
          : 'battles-welcome';
    window.electronAPI?.setBuilderMode?.(menuMode);
  }, [mode]);

  useBattleAutoSave({
    active: mode === 'builder',
    hasUnsavedChanges,
    getBattle: useCallback(() => stateRef.current, []),
  });

  // ---- State updates with undo tracking ----

  const updateState = useCallback((next: BattleState) => {
    setState(next);
    setHasUnsavedChanges(true);
    undoHistory.pushState(next);
  }, [undoHistory]);

  const adoptBattle = useCallback((battle: BattleState, dirty: boolean) => {
    setState(battle);
    setHasUnsavedChanges(dirty);
    undoHistory.clear();
    undoHistory.pushImmediate(battle);
    undoHistory.finishRestore();
    setActiveStepId('scenario');
    setMode('builder');
  }, [undoHistory]);

  const handleUndo = useCallback(() => {
    const restored = undoHistory.undo();
    if (!restored) return;
    setState(restored);
    setHasUnsavedChanges(true);
    // Release the restoring guard once the restored state has been applied.
    queueMicrotask(undoHistory.finishRestore);
  }, [undoHistory]);

  const handleRedo = useCallback(() => {
    const restored = undoHistory.redo();
    if (!restored) return;
    setState(restored);
    setHasUnsavedChanges(true);
    queueMicrotask(undoHistory.finishRestore);
  }, [undoHistory]);

  // ---- Save / load ----

  const handleSave = useCallback(async () => {
    const result = await saveLoad.save(stateRef.current);
    if (result.ok) setHasUnsavedChanges(false);
    showNotification(result.message, result.severity);
  }, [saveLoad, showNotification]);

  const handleSaveAs = useCallback(async () => {
    const result = await saveLoad.saveAs(stateRef.current);
    if (result.ok) setHasUnsavedChanges(false);
    showNotification(result.message, result.severity);
  }, [saveLoad, showNotification]);

  const doOpen = useCallback(async () => {
    const result = await saveLoad.open();
    if (result.ok && result.battle) {
      adoptBattle(result.battle, false);
      await clearBattleAutoSave();
    }
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  }, [saveLoad, adoptBattle, showNotification]);

  const doOpenPath = useCallback(async (filePath: string) => {
    const result = await saveLoad.openPath(filePath);
    if (result.ok && result.battle) {
      adoptBattle(result.battle, false);
      await clearBattleAutoSave();
    }
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  }, [saveLoad, adoptBattle, showNotification]);

  const doNewBattle = useCallback(() => {
    saveLoad.setCurrentFilePath(null);
    adoptBattle(createEmptyBattle(), false);
    clearBattleAutoSave();
  }, [saveLoad, adoptBattle]);

  const runAction = useCallback((action: Exclude<PendingAction, null>) => {
    switch (action) {
      case 'new': doNewBattle(); break;
      case 'open': doOpen(); break;
      case 'welcome': setMode('welcome'); break;
      case 'library': setMode('library'); break;
      case 'hub': onReturnToHub(); break;
    }
  }, [doNewBattle, doOpen, onReturnToHub]);

  /** Run an action, asking first when the current engagement has unsaved changes. */
  const requestAction = useCallback((action: Exclude<PendingAction, null>) => {
    if (modeRef.current === 'builder' && hasUnsavedChanges) {
      setPendingAction(action);
      return;
    }
    runAction(action);
  }, [hasUnsavedChanges, runAction]);

  const handleExportReport = useCallback(async () => {
    try {
      const directory = window.electronAPI ? await window.electronAPI.getDocumentsPath() : undefined;
      const savedTo = await exportBattleReport(stateRef.current, getBattleRules(), directory);
      showNotification(`Battle report saved to ${savedTo}`, 'success');
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to export the battle report.', 'error');
    }
  }, [showNotification]);

  // ---- Menu events ----

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onNewBattle) return;

    api.onNewBattle(() => requestAction('new'));
    api.onOpenBattle(() => requestAction('open'));
    api.onBattleLibrary(() => requestAction('library'));
    api.onSaveBattle(() => { if (modeRef.current === 'builder') handleSave(); });
    api.onSaveBattleAs(() => { if (modeRef.current === 'builder') handleSaveAs(); });
    api.onExportBattleReport(() => { if (modeRef.current === 'builder') handleExportReport(); });
    api.onOpenRecent((filePath) => { if (modeRef.current === 'welcome') void doOpenPath(filePath); });
    api.onReturnToStart(() => requestAction('welcome'));
    api.onReturnToHub(() => requestAction('hub'));

    return () => {
      api.removeAllListeners('menu-new-battle');
      api.removeAllListeners('menu-open-battle');
      api.removeAllListeners('menu-battle-library');
      api.removeAllListeners('menu-save-battle');
      api.removeAllListeners('menu-save-battle-as');
      api.removeAllListeners('menu-export-battle-report');
      api.removeAllListeners('menu-open-recent');
      api.removeAllListeners('menu-return-to-start');
      api.removeAllListeners('menu-return-to-hub');
    };
  }, [requestAction, handleSave, handleSaveAs, handleExportReport, doOpenPath]);

  const handleModsChanged = useCallback(async () => {
    const mods = await getEnabledMods();
    await reloadBattlesDataWithMods(mods);
  }, []);

  const handleRecover = useCallback(() => {
    if (!recoveryJson) return;
    const saveFile = jsonToBattleSaveFile(recoveryJson);
    const loaded = saveFile ? deserializeBattle(saveFile) : null;
    setRecoveryJson(null);
    if (loaded?.success && loaded.battle) {
      adoptBattle(loaded.battle, true);
      showNotification('Recovered the engagement from the last auto-save.', 'success');
    } else {
      clearBattleAutoSave();
      showNotification('The recovery file could not be read.', 'error');
    }
  }, [recoveryJson, adoptBattle, showNotification]);

  const handleDiscardRecovery = useCallback(() => {
    setRecoveryJson(null);
    clearBattleAutoSave();
  }, []);

  const cycleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    const idx = modes.indexOf(themeMode);
    onThemeModeChange(modes[(idx + 1) % modes.length]);
  }, [themeMode, onThemeModeChange]);

  const themeIcon = themeMode === 'dark' ? <DarkModeIcon /> : themeMode === 'light' ? <LightModeIcon /> : <SettingsBrightnessIcon />;

  const notifications = (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmDialog
        open={recoveryJson !== null}
        title="Recover unsaved engagement?"
        message="An engagement was auto-saved but never saved to a file. Would you like to recover it?"
        confirmLabel="Recover"
        cancelLabel="Discard"
        confirmColor="primary"
        onConfirm={handleRecover}
        onCancel={handleDiscardRecovery}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved changes?"
        message="This engagement has unsaved changes. Continue and lose them?"
        confirmLabel="Discard"
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action) runAction(action);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );

  if (mode === 'loading') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body1" color="text.secondary">Loading battle data...</Typography>
        </Stack>
      </Box>
    );
  }

  if (mode === 'welcome') {
    return (
      <>
        <BattlesWelcome
          onNewBattle={doNewBattle}
          onOpenBattle={doOpen}
          onOpenRecent={(filePath) => { void doOpenPath(filePath); }}
          onOpenLibrary={() => setMode('library')}
          onManageMods={() => setMode('mods')}
          onReturnToHub={onReturnToHub}
        />
        {notifications}
      </>
    );
  }

  if (mode === 'mods') {
    return (
      <ModManager
        module="battles"
        onBack={() => setMode('welcome')}
        onModsChanged={handleModsChanged}
      />
    );
  }

  if (mode === 'library') {
    return (
      <>
        <BattleLibrary onBack={() => setMode('welcome')} onOpenBattle={doOpenPath} />
        {notifications}
      </>
    );
  }

  const rules = getBattleRules();
  const fsA = computeTotalStrength(state.sideA);
  const fsB = computeTotalStrength(state.sideB);
  const totalRounds = state.theatres.reduce((sum, t) => sum + t.rounds.length, 0);
  const battleResults = summarizeBattleResults(state, rules);
  const withdrawalNames = [...new Set(battleResults.theatres.flatMap((theatre) => [
    theatre.sideA.shouldWithdraw ? state.sideA.name : null,
    theatre.sideB.shouldWithdraw ? state.sideB.name : null,
  ]).filter((name): name is string => name !== null))];
  const achievedObjectives = battleResults.objectiveResults.filter((objective) => objective.status === 'achieved').length;
  const failedObjectives = battleResults.objectiveResults.filter((objective) => objective.status === 'failed').length;

  const stepCompletion: Record<BattleStepId, boolean> = {
    scenario: state.scenarioName.trim().length > 0 && state.theatres.length > 0,
    forcesA: state.sideA.stacks.length > 0,
    forcesB: state.sideB.stacks.length > 0,
    resolve: isBattleStarted(state),
    results: state.theatres.length > 0 && state.theatres.every((theatre) => !!theatre.conclusion),
  };

  const activeStepIndex = ALL_BATTLE_STEPS.findIndex((s) => s.id === activeStepId);
  const isFirstStep = activeStepIndex <= 0;
  const isLastStep = activeStepIndex === ALL_BATTLE_STEPS.length - 1;

  const goToStepOffset = (offset: number) => {
    const next = ALL_BATTLE_STEPS[activeStepIndex + offset];
    if (next) setActiveStepId(next.id);
  };

  const renderStep = () => {
    switch (activeStepId) {
      case 'scenario': return <ScenarioStep state={state} rules={rules} onChange={updateState} />;
      case 'forcesA': return <ForcesStep state={state} side="A" stepNumber={2} rules={rules} onChange={updateState} />;
      case 'forcesB': return <ForcesStep state={state} side="B" stepNumber={3} rules={rules} onChange={updateState} />;
      case 'resolve': return <ResolveStep state={state} stepNumber={4} rules={rules} onChange={updateState} />;
      case 'results': return <ResultsStep state={state} stepNumber={5} rules={rules} />;
      default: return null;
    }
  };

  const appBarChipSx = { color: 'inherit', borderColor: 'rgba(255,255,255,0.6)' };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Tooltip title="Back to Welcome">
            <IconButton color="inherit" onClick={() => requestAction('welcome')} aria-label="Back to welcome">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, ml: 1, minWidth: 0 }}>
            {APP_NAME} — Battle Resolution
            {hasUnsavedChanges && ' •'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mr: 2, display: { xs: 'none', lg: 'flex' } }}>
            <Chip label={`${state.sideA.name}: ${formatCombatStrength(fsA)}`} size="small" color="primary" variant="outlined" sx={appBarChipSx} />
            <Chip label={`${state.sideB.name}: ${formatCombatStrength(fsB)}`} size="small" color="primary" variant="outlined" sx={appBarChipSx} />
            <Chip label={`${totalRounds} round(s)`} size="small" variant="outlined" sx={appBarChipSx} />
            {withdrawalNames.length > 0 && (
              <Chip label={`Withdraw: ${withdrawalNames.join(', ')}`} size="small" color="warning" variant="outlined" />
            )}
            {achievedObjectives > 0 && (
              <Chip label={`${achievedObjectives} objective(s) achieved`} size="small" color="success" variant="outlined" />
            )}
            {failedObjectives > 0 && (
              <Chip label={`${failedObjectives} objective(s) failed`} size="small" color="error" variant="outlined" />
            )}
            {battleResults.casualtiesPending && (
              <Chip label="Casualties pending" size="small" color="error" variant="outlined" />
            )}
          </Stack>
          <Tooltip title="Undo">
            <span>
              <IconButton color="inherit" onClick={handleUndo} disabled={!undoHistory.canUndo} aria-label="Undo">
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo">
            <span>
              <IconButton color="inherit" onClick={handleRedo} disabled={!undoHistory.canRedo} aria-label="Redo">
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Save Battle">
            <IconButton color="inherit" onClick={handleSave} aria-label="Save battle">
              <SaveIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={`Theme: ${themeMode}`}>
            <IconButton color="inherit" onClick={cycleTheme} aria-label="Toggle theme">{themeIcon}</IconButton>
          </Tooltip>
          <Tooltip title="Manage Mods">
            <IconButton color="inherit" onClick={() => setMode('mods')} aria-label="Manage mods">
              <ExtensionIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ flexGrow: 1, py: 3 }}>
        <Paper sx={{ p: 2, mb: 2, overflowX: 'auto', overflowY: 'hidden' }}>
          <Stepper nonLinear activeStep={activeStepIndex} sx={{ minWidth: 720 }}>
            {ALL_BATTLE_STEPS.map((step) => (
              <Step key={step.id} completed={stepCompletion[step.id]}>
                <StepButton onClick={() => setActiveStepId(step.id)}>
                  <StepLabel>{step.label}</StepLabel>
                </StepButton>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Paper sx={{ p: 3, mb: 2 }}>{renderStep()}</Paper>

        <Stack direction="row" justifyContent="space-between">
          <Button disabled={isFirstStep} onClick={() => goToStepOffset(-1)}>
            Back
          </Button>
          <Button
            variant="contained"
            disabled={isLastStep}
            onClick={() => goToStepOffset(1)}
          >
            Next
          </Button>
        </Stack>
      </Container>

      <Box component="footer" sx={{ py: 1, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">
          {APP_NAME} v{APP_VERSION}
          {saveLoad.currentFilePath && ` — ${saveLoad.currentFilePath}`}
        </Typography>
      </Box>

      {notifications}
    </Box>
  );
}

export default BattlesModule;
