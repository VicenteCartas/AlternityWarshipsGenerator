import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import {
  Alert, AppBar, Box, Button, Container, IconButton, Paper, Snackbar, Stack,
  Step, StepButton, StepLabel, Stepper, Toolbar, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import AddIcon from '@mui/icons-material/Add';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import { APP_NAME } from '@shared/constants/version';
import { ConfirmDialog } from '@shared/components';
import { useUndoHistory } from '@shared/hooks/useUndoHistory';
import { useHorizontalStepperScroll } from '@shared/hooks/useHorizontalStepperScroll';
import type { ThemeMode } from '@app/theme';
import { createEmptyCharacter } from './constants/characterDefaults';
import { getCharacterStepCompletion, getCharacterSteps } from './constants/steps';
import { validateCharacter } from './services/characterValidationService';
import type { CharacterState, CharacterStepId } from './types/characterState';
import { AbilitiesStep } from './components/AbilitiesStep';
import { CharacterSummary } from './components/CharacterSummary';
import { IdentityStep } from './components/IdentityStep';
import { ProfessionStep } from './components/ProfessionStep';
import { RulesOverviewStep } from './components/RulesOverviewStep';
import { SpeciesStep } from './components/SpeciesStep';
import { SkillsStep } from './components/SkillsStep';
import { CharacterOptionsStep } from './components/CharacterOptionsStep';
import { PsionicsStep } from './components/PsionicsStep';
import { FxStep } from './components/FxStep';
import { MutationsStep } from './components/MutationsStep';
import { CybergearStep } from './components/CybergearStep';
import { LoadoutStep } from './components/LoadoutStep';
import { AdvancementStep } from './components/AdvancementStep';
import { CharactersWelcome } from './components/CharactersWelcome';
import { CharacterPdfExportDialog } from './components/CharacterPdfExportDialog';
import { CharacterSourcesDialog } from './components/CharacterSourcesDialog';
import { useNotification } from '@shared/hooks/useNotification';
import { useCharacterSaveLoad } from './hooks/useCharacterSaveLoad';
import { exportCharacterPdf, type CharacterPdfFormat } from './services/characterPdfExportService';
import { normalizeAdvancementPlan } from './services/advancementService';
import type { CharacterSkillRules } from './types/character';

interface CharactersModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type PendingAction = 'new' | 'open' | 'welcome' | 'hub' | null;
type CharacterMode = 'welcome' | 'builder';
type SourceDialogTarget = 'new-character' | 'current-character' | null;

export function CharactersModule({ themeMode, onThemeModeChange, onReturnToHub }: CharactersModuleProps) {
  const [mode, setMode] = useState<CharacterMode>('welcome');
  const [state, setState] = useState<CharacterState>(createEmptyCharacter);
  const [activeStepId, setActiveStepId] = useState<CharacterStepId>('identity');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [pendingSkillRules, setPendingSkillRules] = useState<CharacterSkillRules | null>(null);
  const [newCharacterSourcePackIds, setNewCharacterSourcePackIds] = useState<string[]>(['phb']);
  const [sourceDialogTarget, setSourceDialogTarget] = useState<SourceDialogTarget>(null);
  const [pendingSourcePackIds, setPendingSourcePackIds] = useState<string[] | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();
  const saveLoad = useCharacterSaveLoad();
  const {
    canUndo,
    canRedo,
    clear: clearUndoHistory,
    finishRestore,
    pushImmediate,
    pushState: pushHistoryState,
    redo,
    undo,
  } = useUndoHistory<CharacterState>();
  const steps = useMemo(() => getCharacterSteps(state), [state]);
  const validation = useMemo(() => validateCharacter(state), [state]);
  const activeStepIndex = steps.findIndex((step) => step.id === activeStepId);
  const stepCompletion = useMemo(
    () => getCharacterStepCompletion(state, validation),
    [state, validation],
  );
  const completedStepCount = steps.filter((step) => stepCompletion.get(step.id)).length;
  const {
    stepperRef,
    canScrollLeft,
    canScrollRight,
    updateScrollArrows,
  } = useHorizontalStepperScroll(activeStepIndex, steps.map((step) => `${step.id}:${step.required}`).join('|'));

  useEffect(() => {
    window.electronAPI?.setBuilderMode?.(mode === 'builder' ? 'characters-builder' : 'characters-welcome');
  }, [mode]);

  useEffect(() => {
    clearUndoHistory();
    pushImmediate(createEmptyCharacter());
  }, [clearUndoHistory, pushImmediate]);

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    onThemeModeChange(modes[(modes.indexOf(themeMode) + 1) % modes.length]);
  };

  const updateState = useCallback((updates: Partial<CharacterState>) => {
    const next = { ...state, ...updates };
    setState(next);
    setHasUnsavedChanges(true);
    pushHistoryState(next);
  }, [state, pushHistoryState]);

  const requestSkillRulesChange = (skillRules: CharacterSkillRules) => {
    const hasSkillPurchases = state.skillPlan.cashedInFreeBroadSkillIds.length > 0
      || state.skillPlan.purchasedBroadSkillIds.length > 0
      || state.skillPlan.specialtySkills.length > 0
      || state.psionicPlan.purchasedBroadSkillIds.length > 0
      || state.psionicPlan.specialtySkills.length > 0
      || state.advancementPlan.levels.some((level) => (
        level.broadSkills.length > 0 || level.specialtySkills.length > 0
      ));
    if (hasSkillPurchases) {
      setPendingSkillRules(skillRules);
      return;
    }
    updateState({ skillRules });
  };

  const applyCurrentSources = (selectedSourcePackIds: string[]) => {
    const disablingFx = state.selectedSourcePackIds.includes('gmg-fx')
      && !selectedSourcePackIds.includes('gmg-fx');
    const hasFxData = state.fxPlan.campaignTone !== null
      || state.fxPlan.broadSkill !== null
      || Boolean(state.fxPlan.faithFocus?.trim())
      || state.fxPlan.designs.length > 0
      || state.fxPlan.abilityPurchases.length > 0
      || state.fxPlan.faithPurchases.length > 0;
    if (disablingFx && hasFxData) {
      setPendingSourcePackIds(selectedSourcePackIds);
      return;
    }
    if (disablingFx && activeStepId === 'fx') setActiveStepId('skills');
    updateState({ selectedSourcePackIds });
  };

  const selectProfession = (professionId: string) => {
    const leavingDiplomat = state.professionId === 'diplomat' && professionId !== 'diplomat';
    const psionicPlan = professionId === 'mindwalker'
      ? { accessPath: 'mindwalker' as const, purchasedBroadSkillIds: [], specialtySkills: [] }
      : state.psionicPlan.accessPath === 'mindwalker' || leavingDiplomat
        ? { accessPath: 'none' as const, purchasedBroadSkillIds: [], specialtySkills: [] }
        : state.psionicPlan;
    updateState({
      professionId,
      professionBenefits: {},
      resistanceBonusAbility: undefined,
      psionicPlan,
      ...(leavingDiplomat
        ? { skillPlan: { ...state.skillPlan, additionalDiscountProfessionIds: [] } }
        : {}),
    });
  };

  const adoptCharacter = (character: CharacterState, dirty: boolean) => {
    setState(character);
    setActiveStepId('identity');
    setHasUnsavedChanges(dirty);
    clearUndoHistory();
    pushImmediate(character);
    finishRestore();
    setMode('builder');
  };

  const handleNew = () => {
    const character = createEmptyCharacter();
    character.selectedSourcePackIds = [...newCharacterSourcePackIds];
    adoptCharacter(character, false);
    saveLoad.setCurrentFilePath(null);
  };

  const handleOpen = async () => {
    const result = await saveLoad.open();
    if (result.ok && result.character) {
      adoptCharacter(result.character, false);
    }
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleOpenPath = async (filePath: string) => {
    const result = await saveLoad.openPath(filePath);
    if (result.ok && result.character) adoptCharacter(result.character, false);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleUndo = () => {
    const restored = undo();
    if (!restored) return;
    setState(restored);
    setHasUnsavedChanges(true);
    queueMicrotask(finishRestore);
  };

  const handleRedo = () => {
    const restored = redo();
    if (!restored) return;
    setState(restored);
    setHasUnsavedChanges(true);
    queueMicrotask(finishRestore);
  };

  const runAction = (action: Exclude<PendingAction, null>) => {
    if (action === 'new') handleNew();
    else if (action === 'open') void handleOpen();
    else if (action === 'welcome') setMode('welcome');
    else onReturnToHub();
  };

  const requestAction = (action: Exclude<PendingAction, null>) => {
    if (mode === 'builder' && hasUnsavedChanges) setPendingAction(action);
    else runAction(action);
  };

  const handleSave = async (saveAs = false) => {
    const result = saveAs ? await saveLoad.saveAs(state) : await saveLoad.save(state);
    if (result.ok) setHasUnsavedChanges(false);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleExportPdf = async (format: CharacterPdfFormat) => {
    try {
      const currentFilePath = saveLoad.currentFilePath;
      const separatorIndex = currentFilePath
        ? Math.max(currentFilePath.lastIndexOf('\\'), currentFilePath.lastIndexOf('/'))
        : -1;
      const defaultDirectory = separatorIndex >= 0
        ? currentFilePath!.slice(0, separatorIndex)
        : undefined;
      const filePath = await exportCharacterPdf(state, validation, format, defaultDirectory);
      if (!filePath) return;
      showNotification(`Character PDF saved to ${filePath}`, 'success', window.electronAPI ? {
        label: 'Open',
        onClick: () => { void window.electronAPI?.openPath(filePath); },
      } : undefined);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to export character PDF.', 'error');
    }
  };

  const handleCharacterMenuAction = useEffectEvent((action: 'new' | 'open' | 'welcome') => {
    requestAction(action);
  });

  const handleRecentCharacter = useEffectEvent((filePath: string) => {
    if (mode === 'welcome') void handleOpenPath(filePath);
  });

  const handleCharacterReturnToHub = useEffectEvent(() => {
    requestAction('hub');
  });

  const handleCharacterMenuCommand = useEffectEvent((command: 'save' | 'saveAs' | 'exportPdf') => {
    if (mode !== 'builder') return;
    if (command === 'save') void handleSave(false);
    else if (command === 'saveAs') void handleSave(true);
    else setPdfDialogOpen(true);
  });

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onNewCharacter) return;
    api.onNewCharacter(() => handleCharacterMenuAction('new'));
    api.onOpenCharacter(() => handleCharacterMenuAction('open'));
    api.onSaveCharacter(() => handleCharacterMenuCommand('save'));
    api.onSaveCharacterAs(() => handleCharacterMenuCommand('saveAs'));
    api.onExportCharacterPdf(() => handleCharacterMenuCommand('exportPdf'));
    api.onOpenRecent((filePath) => handleRecentCharacter(filePath));
    api.onReturnToStart(() => handleCharacterMenuAction('welcome'));
    api.onReturnToHub(() => handleCharacterReturnToHub());
    return () => {
      api.removeAllListeners('menu-new-character');
      api.removeAllListeners('menu-open-character');
      api.removeAllListeners('menu-save-character');
      api.removeAllListeners('menu-save-character-as');
      api.removeAllListeners('menu-export-character-pdf');
      api.removeAllListeners('menu-open-recent');
      api.removeAllListeners('menu-return-to-start');
      api.removeAllListeners('menu-return-to-hub');
    };
  }, []);

  const renderStep = () => {
    switch (activeStepId) {
      case 'identity':
        return (
          <IdentityStep
            identity={state.identity}
            progressLevel={state.progressLevel}
            targetLevel={state.level}
            onIdentityChange={(identity) => updateState({ identity })}
            onProgressLevelChange={(progressLevel) => updateState({ progressLevel })}
            onTargetLevelChange={(level) => {
              const normalizedLevel = Math.min(30, Math.max(1, Math.floor(level || 1)));
              updateState({
                level: normalizedLevel,
                advancementPlan: normalizeAdvancementPlan(state.advancementPlan, normalizedLevel),
              });
            }}
          />
        );
      case 'species':
        return (
          <SpeciesStep
            selectedSpeciesId={state.speciesId}
            selectedSpeciesBenefits={validation.speciesBenefits}
            onSelect={(speciesId) => updateState({ speciesId })}
          />
        );
      case 'profession':
        return (
          <ProfessionStep
            selectedProfessionId={state.professionId}
            abilityScores={state.abilityScores}
            benefits={state.professionBenefits}
            resistanceBonusAbility={state.resistanceBonusAbility}
            skillPlan={state.skillPlan}
            psionicPlan={state.psionicPlan}
            errors={validation.professionErrors}
            onSelect={selectProfession}
            onBenefitsChange={(professionBenefits) => updateState({ professionBenefits })}
            onResistanceBonusChange={(resistanceBonusAbility) => updateState({ resistanceBonusAbility })}
            onSkillPlanChange={(skillPlan) => updateState({ skillPlan })}
            onPsionicPlanChange={(psionicPlan) => updateState({ psionicPlan })}
          />
        );
      case 'abilities':
        return <AbilitiesStep scores={state.abilityScores} speciesId={state.speciesId} errors={validation.abilities.errors} onChange={(abilityScores) => updateState({ abilityScores })} />;
      case 'skills':
        return (
          <SkillsStep
            speciesId={state.speciesId}
            plan={state.skillPlan}
            skillRules={state.skillRules}
            validation={validation}
            onChange={(skillPlan) => updateState({ skillPlan })}
            onSkillRulesChange={requestSkillRulesChange}
          />
        );
      case 'options':
        return <CharacterOptionsStep selections={state.optionSelections} validation={validation} onChange={(optionSelections) => updateState({ optionSelections })} />;
      case 'psionics':
        return (
          <PsionicsStep
            speciesId={state.speciesId}
            professionId={state.professionId}
            plan={state.psionicPlan}
            coreSkillPlan={state.skillPlan}
            validation={validation}
            onChange={(psionicPlan) => updateState({ psionicPlan })}
            onCoreSkillPlanChange={(skillPlan) => updateState({ skillPlan })}
          />
        );
      case 'fx':
        return <FxStep plan={state.fxPlan} validation={validation} onChange={(fxPlan) => updateState({ fxPlan })} />;
      case 'mutations':
        return <MutationsStep speciesId={state.speciesId} plan={state.mutationPlan} validation={validation} onChange={(mutationPlan) => updateState({ mutationPlan })} />;
      case 'cybergear':
        return <CybergearStep speciesId={state.speciesId} selections={state.cybergearSelections} progressLevel={state.progressLevel} validation={validation} onChange={(cybergearSelections) => updateState({ cybergearSelections })} />;
      case 'equipment':
        return (
          <LoadoutStep
            equipmentSelections={state.equipmentSelections}
            weaponSelections={state.weaponSelections}
            armorSelections={state.armorSelections}
            dieRolls={state.startingFundsDieRolls}
            wealthDegree={state.wealthDegree}
            progressLevel={state.progressLevel}
            validation={validation}
            onEquipmentSelectionsChange={(equipmentSelections) => updateState({ equipmentSelections })}
            onWeaponSelectionsChange={(weaponSelections) => updateState({ weaponSelections })}
            onArmorSelectionsChange={(armorSelections) => updateState({ armorSelections })}
            onDieRollsChange={(startingFundsDieRolls) => updateState({ startingFundsDieRolls })}
            onWealthDegreeChange={(wealthDegree) => updateState({ wealthDegree })}
          />
        );
      case 'advancement':
        return <AdvancementStep state={state} validation={validation} onChange={(advancementPlan) => updateState({ advancementPlan })} />;
      case 'summary':
        return <CharacterSummary state={state} validation={validation} />;
      default:
        return <RulesOverviewStep stepId={activeStepId} validation={validation} />;
    }
  };

  const overlays = (
    <>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          action={snackbar.action ? (
            <Button color="inherit" size="small" onClick={snackbar.action.onClick}>{snackbar.action.label}</Button>
          ) : undefined}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved character changes?"
        message="Your unsaved changes will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action) runAction(action);
        }}
        onCancel={() => setPendingAction(null)}
      />
      <ConfirmDialog
        open={pendingSkillRules !== null}
        title="Change skill rules?"
        message="Changing these rules recalculates existing core, psionic, and advancement skill costs. The character may need additional changes to remain valid."
        confirmLabel="Change Rules"
        confirmColor="primary"
        onConfirm={() => {
          const skillRules = pendingSkillRules;
          setPendingSkillRules(null);
          if (skillRules) updateState({ skillRules });
        }}
        onCancel={() => setPendingSkillRules(null)}
      />
      <ConfirmDialog
        open={pendingSourcePackIds !== null}
        title="Disable GMG FX rules?"
        message="This character contains FX data. The data will be retained but remain invalid until GMG FX is enabled again."
        confirmLabel="Disable FX Rules"
        confirmColor="warning"
        onConfirm={() => {
          const selectedSourcePackIds = pendingSourcePackIds;
          setPendingSourcePackIds(null);
          if (selectedSourcePackIds) updateState({ selectedSourcePackIds });
        }}
        onCancel={() => setPendingSourcePackIds(null)}
      />
      <CharacterPdfExportDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        onExport={handleExportPdf}
      />
      <CharacterSourcesDialog
        key={`${sourceDialogTarget || 'closed'}:${(sourceDialogTarget === 'current-character'
          ? state.selectedSourcePackIds
          : newCharacterSourcePackIds).join('|')}`}
        open={sourceDialogTarget !== null}
        selectedSourcePackIds={sourceDialogTarget === 'current-character'
          ? state.selectedSourcePackIds
          : newCharacterSourcePackIds}
        onApply={(selectedSourcePackIds) => {
          if (sourceDialogTarget === 'current-character') applyCurrentSources(selectedSourcePackIds);
          else setNewCharacterSourcePackIds(selectedSourcePackIds);
          setSourceDialogTarget(null);
        }}
        onCancel={() => setSourceDialogTarget(null)}
      />
    </>
  );

  if (mode === 'welcome') {
    return (
      <>
        <CharactersWelcome
          onNewCharacter={() => requestAction('new')}
          onOpenCharacter={() => requestAction('open')}
          onOpenRecent={(filePath) => { void handleOpenPath(filePath); }}
          onConfigureSources={() => setSourceDialogTarget('new-character')}
          onReturnToHub={() => requestAction('hub')}
        />
        {overlays}
      </>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar sx={{ minWidth: 0, overflowX: 'auto', px: { xs: 0.5, sm: 2 }, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
          <Tooltip title="Back to Character Creator"><IconButton color="inherit" onClick={() => requestAction('welcome')} aria-label="Back to Character Creator"><ArrowBackIcon /></IconButton></Tooltip>
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1, whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>{APP_NAME} - Character Creator</Typography>
          <Tooltip title="Undo"><span><IconButton color="inherit" onClick={handleUndo} disabled={!canUndo} aria-label="Undo"><UndoIcon /></IconButton></span></Tooltip>
          <Tooltip title="Redo"><span><IconButton color="inherit" onClick={handleRedo} disabled={!canRedo} aria-label="Redo"><RedoIcon /></IconButton></span></Tooltip>
          <Tooltip title="New Character"><IconButton color="inherit" onClick={() => requestAction('new')} aria-label="New Character"><AddIcon /></IconButton></Tooltip>
          <Tooltip title="Open Character"><IconButton color="inherit" onClick={() => requestAction('open')} aria-label="Open Character"><FolderOpenIcon /></IconButton></Tooltip>
          <Tooltip title={hasUnsavedChanges ? 'Save Character (unsaved changes)' : 'Save Character'}><IconButton color="inherit" onClick={() => handleSave(false)} aria-label="Save Character"><SaveIcon /></IconButton></Tooltip>
          <Tooltip title="Save Character As"><IconButton color="inherit" onClick={() => handleSave(true)} aria-label="Save Character As"><SaveAsIcon /></IconButton></Tooltip>
          <Tooltip title="Export Character PDF"><IconButton color="inherit" onClick={() => setPdfDialogOpen(true)} aria-label="Export Character PDF"><PictureAsPdfIcon /></IconButton></Tooltip>
          <Tooltip title="Rules Sources"><IconButton color="inherit" onClick={() => setSourceDialogTarget('current-character')} aria-label="Rules Sources"><MenuBookOutlinedIcon /></IconButton></Tooltip>
          <Tooltip title="Cycle theme">
            <IconButton color="inherit" onClick={cycleTheme} aria-label="Cycle theme">
              {themeMode === 'dark' ? <DarkModeIcon /> : themeMode === 'light' ? <LightModeIcon /> : <SettingsBrightnessIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Paper
        elevation={0}
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          borderRadius: 0,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Box
          role="button"
          aria-label="Scroll steps left"
          tabIndex={canScrollLeft ? 0 : -1}
          onClick={() => stepperRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
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
            nonLinear
            activeStep={activeStepIndex}
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
              '& .MuiStepLabel-label': { whiteSpace: 'nowrap' },
            }}
          >
            {steps.map((step, index) => {
              const completed = stepCompletion.get(step.id) ?? false;
              const iconLabel = completed
                ? `${step.label} complete`
                : step.required
                  ? `${step.label} required incomplete`
                  : `${step.label} optional incomplete`;
              const StepStatusIcon = () => {
                if (completed) return <CheckCircleIcon color="success" aria-label={iconLabel} />;
                if (!step.required) {
                  return (
                    <RemoveCircleOutlineIcon
                      color={activeStepIndex === index ? 'primary' : 'disabled'}
                      aria-label={iconLabel}
                    />
                  );
                }
                return (
                  <ErrorOutlineIcon
                    color={activeStepIndex === index ? 'warning' : 'error'}
                    aria-label={iconLabel}
                  />
                );
              };

              return (
                <Step key={step.id} completed={completed}>
                  <Tooltip title={`${step.label} (${step.required ? 'Required' : 'Optional'})`} enterDelay={400} arrow>
                    <StepButton onClick={() => setActiveStepId(step.id)}>
                      <StepLabel StepIconComponent={StepStatusIcon}>{step.label}</StepLabel>
                    </StepButton>
                  </Tooltip>
                </Step>
              );
            })}
          </Stepper>
        </Box>
        <Box
          role="button"
          aria-label="Scroll steps right"
          tabIndex={canScrollRight ? 0 : -1}
          onClick={() => stepperRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
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

      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>{renderStep()}</Paper>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Button disabled={activeStepIndex <= 0} onClick={() => setActiveStepId(steps[activeStepIndex - 1].id)}>Back</Button>
          <Button variant="contained" disabled={activeStepIndex >= steps.length - 1} onClick={() => setActiveStepId(steps[activeStepIndex + 1].id)}>Next</Button>
        </Stack>
      </Container>
      {overlays}
    </Box>
  );
}

export default CharactersModule;