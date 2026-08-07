import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CasinoIcon from '@mui/icons-material/Casino';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import TuneIcon from '@mui/icons-material/Tune';
import type { ThemeMode } from '@app/theme';
import { ConfirmDialog, DocumentWelcome } from '@shared/components';
import { useNotification } from '@shared/hooks/useNotification';
import {
  ARTIFACT_BALANCE_PACKAGES,
  ARTIFACT_DRAWBACKS,
  ARTIFACT_FORMS,
  ARTIFACT_POWERS,
  ARTIFACT_PURPOSES,
} from './data/artifactCatalogue';
import { CampaignToolShell } from './components/CampaignToolShell';
import { useArtifactSaveLoad } from './hooks/useCampaignSaveLoad';
import {
  DEFAULT_ARTIFACT_DESIGN,
  generateArtifact,
  getArtifactBalancePackage,
  getArtifactDrawback,
  getArtifactPower,
  regenerateArtifactSection,
  rollArtifactBalancePackage,
  validateArtifact,
} from './services/artifactDesignService';
import { exportArtifactPdf } from './services/campaignPdfService';
import type {
  ArtifactAcquisition,
  ArtifactDesign,
  ArtifactDrawbackSeverity,
  ArtifactFormCategory,
  ArtifactPowerSource,
  ArtifactPurpose,
  ArtifactQuality,
} from './types/artifact';

interface ArtifactDesignerModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type ArtifactTab = 'design' | 'powers' | 'drawbacks' | 'story';
type PendingArtifactAction =
  | { type: 'new' | 'open' | 'welcome' | 'hub' }
  | { type: 'openPath'; filePath: string };

const QUALITY_LABELS: Record<ArtifactQuality, string> = {
  ordinary: 'Ordinary', good: 'Good', amazing: 'Amazing',
};
const SEVERITY_LABELS: Record<ArtifactDrawbackSeverity, string> = {
  slight: 'Slight', moderate: 'Moderate', extreme: 'Extreme',
};

function nextManualId(prefix: string, existingIds: string[]): string {
  const usedIds = new Set(existingIds);
  let index = 1;
  while (usedIds.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function packageSummary(artifact: ArtifactDesign): string {
  const artifactPackage = getArtifactBalancePackage(artifact.acquisition, artifact.balanceRoll);
  if (!artifactPackage) return 'Story artifacts use any combination appropriate to the campaign.';
  const powers = [...artifactPackage.primaryPowers.map((entry) => `${entry.count} ${QUALITY_LABELS[entry.quality]} primary`),
    ...artifactPackage.secondaryPowers.map((entry) => `${entry.count} ${QUALITY_LABELS[entry.quality]} secondary`)];
  const drawbacks = artifactPackage.drawbacks.map((entry) => `${entry.count} ${SEVERITY_LABELS[entry.severity]}`);
  return `${powers.length > 0 ? powers.join(', ') : 'No powers'}; ${drawbacks.length > 0 ? `${drawbacks.join(', ')} drawbacks` : 'no drawbacks'}.`;
}

function powerGenerationExplanation(artifact: ArtifactDesign): string {
  const artifactPackage = getArtifactBalancePackage(artifact.acquisition, artifact.balanceRoll);
  if (!artifactPackage) {
    const secondary = artifact.secondaryPurpose
      ? ' It also adds one random secondary power from the selected secondary purpose.'
      : '';
    return `Replaces the current power list by rolling 1d3 primary powers from ${ARTIFACT_PURPOSES.find((entry) => entry.id === artifact.primaryPurpose)?.name ?? artifact.primaryPurpose}, with a random quality for each.${secondary}`;
  }
  const requirements = [
    ...artifactPackage.primaryPowers.map((entry) => `${entry.count} ${QUALITY_LABELS[entry.quality]} primary`),
    ...artifactPackage.secondaryPowers.map((entry) => `${entry.count} ${QUALITY_LABELS[entry.quality]} secondary`),
  ].join(', ');
  const secondary = artifactPackage.secondaryPowers.some((entry) => entry.count > 0) && !artifact.secondaryPurpose
    ? ' A secondary purpose is rolled from G52 first.'
    : '';
  return `Replaces the current power list with random powers matching balance roll ${artifact.balanceRoll}: ${requirements || 'none'}. Primary powers come from ${ARTIFACT_PURPOSES.find((entry) => entry.id === artifact.primaryPurpose)?.name ?? artifact.primaryPurpose}; secondary powers use the selected secondary purpose.${secondary}`;
}

function drawbackGenerationExplanation(artifact: ArtifactDesign): string {
  const artifactPackage = getArtifactBalancePackage(artifact.acquisition, artifact.balanceRoll);
  if (!artifactPackage) {
    return 'Replaces the current drawback list by rolling 1d3-1 random drawbacks from G56, each with a random severity.';
  }
  const requirements = artifactPackage.drawbacks
    .map((entry) => `${entry.count} ${SEVERITY_LABELS[entry.severity]}`)
    .join(', ');
  return `Replaces the current drawback list with random G56 entries matching balance roll ${artifact.balanceRoll}: ${requirements || 'no drawbacks'}.`;
}

export function ArtifactDesignerModule(props: ArtifactDesignerModuleProps) {
  const [mode, setMode] = useState<'welcome' | 'editor'>('welcome');
  const [artifact, setArtifact] = useState<ArtifactDesign>(DEFAULT_ARTIFACT_DESIGN);
  const [tab, setTab] = useState<ArtifactTab>('design');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingArtifactAction | null>(null);
  const [newPowerSource, setNewPowerSource] = useState<ArtifactPowerSource>('primary');
  const [newPowerId, setNewPowerId] = useState('');
  const [newPowerQuality, setNewPowerQuality] = useState<ArtifactQuality>('ordinary');
  const [newDrawbackId, setNewDrawbackId] = useState('blackouts');
  const [newDrawbackSeverity, setNewDrawbackSeverity] = useState<ArtifactDrawbackSeverity>('slight');
  const saveLoad = useArtifactSaveLoad();
  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();
  const validation = useMemo(() => validateArtifact(artifact), [artifact]);
  const form = ARTIFACT_FORMS.find((entry) => entry.id === artifact.formCategory)!;
  const primaryPurpose = ARTIFACT_PURPOSES.find((entry) => entry.id === artifact.primaryPurpose)!;
  const secondaryPurpose = ARTIFACT_PURPOSES.find((entry) => entry.id === artifact.secondaryPurpose);
  const selectedNewPurpose = newPowerSource === 'primary' ? artifact.primaryPurpose : artifact.secondaryPurpose;
  const availableNewPowers = ARTIFACT_POWERS.filter((entry) => entry.purpose === selectedNewPurpose);

  const update = (patch: Partial<ArtifactDesign>) => {
    setArtifact((current) => ({ ...current, ...patch }));
    setHasUnsavedChanges(true);
  };

  const adoptArtifact = (next: ArtifactDesign, dirty = false) => {
    setArtifact(next);
    setTab('design');
    setHasUnsavedChanges(dirty);
    setMode('editor');
  };

  const handleSave = async (saveAs = false) => {
    const result = saveAs ? await saveLoad.saveAs(artifact) : await saveLoad.save(artifact);
    if (result.ok) setHasUnsavedChanges(false);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleOpen = async () => {
    const result = await saveLoad.open();
    if (result.ok && result.value) adoptArtifact(result.value);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleOpenPath = async (filePath: string) => {
    const result = await saveLoad.openPath(filePath);
    if (result.ok && result.value) adoptArtifact(result.value);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleExportPdf = async () => {
    try {
      const filePath = await exportArtifactPdf(artifact);
      showNotification(`Artifact dossier saved to ${filePath}`, 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to export artifact dossier.', 'error');
    }
  };

  const runAction = (action: PendingArtifactAction) => {
    if (action.type === 'new') {
      saveLoad.clearFile();
      adoptArtifact(DEFAULT_ARTIFACT_DESIGN);
    } else if (action.type === 'open') void handleOpen();
    else if (action.type === 'openPath') void handleOpenPath(action.filePath);
    else if (action.type === 'welcome') setMode('welcome');
    else props.onReturnToHub();
  };

  const requestAction = (action: PendingArtifactAction) => {
    if (mode === 'editor' && hasUnsavedChanges) setPendingAction(action);
    else runAction(action);
  };

  useEffect(() => {
    window.electronAPI?.setBuilderMode(mode === 'welcome' ? 'artifact-welcome' : 'artifact-editor');
  }, [mode]);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onNewCampaignDocument) return;
    api.onNewCampaignDocument(() => requestAction({ type: 'new' }));
    api.onOpenCampaignDocument(() => requestAction({ type: 'open' }));
    api.onSaveCampaignDocument(() => { void handleSave(false); });
    api.onSaveCampaignDocumentAs(() => { void handleSave(true); });
    api.onExportCampaignPdf(() => { void handleExportPdf(); });
    api.onOpenRecent((filePath) => requestAction({ type: 'openPath', filePath }));
    api.onReturnToStart(() => requestAction({ type: 'welcome' }));
    api.onReturnToHub(() => requestAction({ type: 'hub' }));
    return () => {
      api.removeAllListeners('menu-new-campaign-document');
      api.removeAllListeners('menu-open-campaign-document');
      api.removeAllListeners('menu-save-campaign-document');
      api.removeAllListeners('menu-save-campaign-document-as');
      api.removeAllListeners('menu-export-campaign-pdf');
      api.removeAllListeners('menu-open-recent');
      api.removeAllListeners('menu-return-to-start');
      api.removeAllListeners('menu-return-to-hub');
    };
  });

  const toggleLock = (key: keyof ArtifactDesign['locks']) => {
    update({ locks: { ...artifact.locks, [key]: !artifact.locks[key] } });
  };

  const rerollSection = (section: keyof ArtifactDesign['locks']) => {
    update(regenerateArtifactSection(artifact, section));
  };

  const addPower = () => {
    const definition = ARTIFACT_POWERS.find((entry) => entry.id === newPowerId) ?? availableNewPowers[0];
    if (!definition || !selectedNewPurpose) return;
    update({
      powers: [...artifact.powers, {
        id: nextManualId('power-manual', artifact.powers.map((entry) => entry.id)),
        powerId: definition.id,
        quality: newPowerQuality,
        source: newPowerSource,
        notes: '',
      }],
    });
  };

  const addDrawback = () => {
    update({
      drawbacks: [...artifact.drawbacks, {
        id: nextManualId('drawback-manual', artifact.drawbacks.map((entry) => entry.id)),
        drawbackId: newDrawbackId,
        severity: newDrawbackSeverity,
        notes: '',
      }],
    });
  };

  const overlays = (
    <>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved artifact changes?"
        message="This action replaces or closes the current artifact. Unsaved changes will be lost."
        confirmLabel="Discard"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action) runAction(action);
        }}
      />
    </>
  );

  if (mode === 'welcome') {
    return (
      <>
        <DocumentWelcome
          kind="artifact"
          title="Alien Artifact Designer"
          description="Design or generate alien artifacts with GMG tables G51-G56"
          icon={<TuneIcon sx={{ fontSize: 36 }} />}
          onNew={() => requestAction({ type: 'new' })}
          onOpen={() => requestAction({ type: 'open' })}
          onOpenRecent={(filePath) => requestAction({ type: 'openPath', filePath })}
          onReturnToHub={props.onReturnToHub}
        />
        {overlays}
      </>
    );
  }

  return (
    <CampaignToolShell
      title="Alien Artifact Designer"
      mode="artifact-editor"
      icon={<TuneIcon />}
      {...props}
      onReturnToHub={() => requestAction({ type: 'hub' })}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', lg: 'row' }} gap={1.5} alignItems={{ lg: 'center' }}>
          <TextField
            label="Artifact name"
            size="small"
            value={artifact.name}
            onChange={(event) => update({ name: event.target.value })}
            sx={{ minWidth: 280 }}
          />
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => update(generateArtifact(artifact))}
          >
            Generate Artifact
          </Button>
          <Button startIcon={<FolderOpenIcon />} onClick={() => requestAction({ type: 'open' })}>Open</Button>
          <Button startIcon={<SaveIcon />} onClick={() => { void handleSave(false); }}>Save</Button>
          <Tooltip title="Save As">
            <IconButton aria-label="Save artifact as" onClick={() => { void handleSave(true); }}><SaveAsIcon /></IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => { void handleExportPdf(); }}>Export PDF</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Chip label={validation.valid ? 'Design valid' : `${validation.errors.length} issue(s)`} color={validation.valid ? 'success' : 'error'} variant="outlined" />
          <Chip label={`${artifact.powers.length} power(s)`} variant="outlined" />
          <Chip label={`${artifact.drawbacks.length} drawback(s)`} variant="outlined" />
        </Stack>

        <Tabs value={tab} onChange={(_event, value: ArtifactTab) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab value="design" label="Form & Purpose" />
          <Tab value="powers" label={`Powers (${artifact.powers.length})`} />
          <Tab value="drawbacks" label={`Drawbacks (${artifact.drawbacks.length})`} />
          <Tab value="story" label="Story & Summary" />
        </Tabs>

        {tab === 'design' && (
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Acquisition & Balance</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) minmax(220px, 1fr)' }, gap: 2 }}>
                <TextField
                  select
                  label="Acquisition"
                  value={artifact.acquisition}
                  onChange={(event) => {
                    const acquisition = event.target.value as ArtifactAcquisition;
                    update({ acquisition, balanceRoll: acquisition === 'story' ? null : artifact.balanceRoll ?? 1 });
                  }}
                >
                  <MenuItem value="story">Found during the story</MenuItem>
                  <MenuItem value="perk">Alien Artifact perk</MenuItem>
                  <MenuItem value="flaw">Alien Artifact flaw</MenuItem>
                </TextField>
                <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
                  <TextField
                    select
                    label="Balance package (d8)"
                    value={artifact.balanceRoll ?? ''}
                    disabled={artifact.acquisition === 'story'}
                    onChange={(event) => update({ balanceRoll: Number(event.target.value) })}
                    sx={{ flexGrow: 1 }}
                  >
                    {ARTIFACT_BALANCE_PACKAGES
                      .filter((entry) => entry.acquisition === artifact.acquisition)
                      .map((entry) => <MenuItem key={entry.roll} value={entry.roll}>Roll {entry.roll}</MenuItem>)}
                  </TextField>
                  <Button
                    variant="outlined"
                    startIcon={<CasinoIcon />}
                    disabled={artifact.acquisition === 'story'}
                    onClick={() => update({
                      balanceRoll: rollArtifactBalancePackage(artifact.acquisition),
                    })}
                    sx={{ flexShrink: 0 }}
                  >
                    Roll d8
                  </Button>
                </Stack>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{packageSummary(artifact)}</Typography>
              {artifact.acquisition !== 'story' && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  Roll d8 selects a G53 or G54 package. Use the Powers and Drawbacks tabs to roll the specific entries required by that package.
                </Typography>
              )}
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6">1. Form</Typography>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title={artifact.locks.form ? 'Unlock form' : 'Lock form'}>
                      <IconButton onClick={() => toggleLock('form')}>{artifact.locks.form ? <LockIcon /> : <LockOpenIcon />}</IconButton>
                    </Tooltip>
                    <Button aria-label="Roll form" startIcon={<AutoAwesomeIcon />} disabled={artifact.locks.form} onClick={() => rerollSection('form')}>Roll</Button>
                  </Stack>
                </Stack>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Form category"
                    value={artifact.formCategory}
                    onChange={(event) => {
                      const formCategory = event.target.value as ArtifactFormCategory;
                      const nextForm = ARTIFACT_FORMS.find((entry) => entry.id === formCategory)!;
                      update({ formCategory, formSubtype: nextForm.subtypes[0]?.id ?? '' });
                    }}
                  >
                    {ARTIFACT_FORMS.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                  </TextField>
                  {form.subtypes.length > 0 && (
                    <TextField select label="Subtype" value={artifact.formSubtype} onChange={(event) => update({ formSubtype: event.target.value })}>
                      {form.subtypes.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                    </TextField>
                  )}
                  <Typography variant="body2" color="text.secondary">{form.description}</Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                  <Typography variant="h6">2. Purpose</Typography>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title={artifact.locks.purpose ? 'Unlock purpose' : 'Lock purpose'}>
                      <IconButton onClick={() => toggleLock('purpose')}>{artifact.locks.purpose ? <LockIcon /> : <LockOpenIcon />}</IconButton>
                    </Tooltip>
                    <Button aria-label="Roll purpose" startIcon={<AutoAwesomeIcon />} disabled={artifact.locks.purpose} onClick={() => rerollSection('purpose')}>Roll</Button>
                  </Stack>
                </Stack>
                <Stack spacing={2}>
                  <TextField select label="Primary purpose" value={artifact.primaryPurpose} onChange={(event) => update({ primaryPurpose: event.target.value as ArtifactPurpose })}>
                    {ARTIFACT_PURPOSES.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                  </TextField>
                  <TextField select label="Secondary purpose" value={artifact.secondaryPurpose ?? 'none'} onChange={(event) => update({ secondaryPurpose: event.target.value === 'none' ? null : event.target.value as ArtifactPurpose })}>
                    <MenuItem value="none">None</MenuItem>
                    {ARTIFACT_PURPOSES.filter((entry) => entry.secondaryRolls.length > 0).map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                  </TextField>
                  <Typography variant="body2" color="text.secondary">{primaryPurpose.description}</Typography>
                  {secondaryPurpose && <Typography variant="body2" color="text.secondary">Secondary: {secondaryPurpose.description}</Typography>}
                </Stack>
              </Paper>
            </Box>
          </Stack>
        )}

        {tab === 'powers' && (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
              <FormControlLabel control={<Checkbox checked={artifact.locks.powers} onChange={() => toggleLock('powers')} />} label="Lock powers during full generation" />
              <Button startIcon={<CasinoIcon />} disabled={artifact.locks.powers} onClick={() => rerollSection('powers')}>
                {artifact.acquisition === 'story' ? 'Roll Story Powers' : 'Roll Package Powers'}
              </Button>
            </Stack>
            <Alert severity="info" icon={false}>
              <strong>What this rolls:</strong> {powerGenerationExplanation(artifact)}
            </Alert>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Add Power</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
                <TextField select label="Source" value={newPowerSource} onChange={(event) => { setNewPowerSource(event.target.value as ArtifactPowerSource); setNewPowerId(''); }} sx={{ minWidth: 150 }}>
                  <MenuItem value="primary">Primary</MenuItem>
                  <MenuItem value="secondary" disabled={!artifact.secondaryPurpose}>Secondary</MenuItem>
                </TextField>
                <TextField select label="Power" value={newPowerId || availableNewPowers[0]?.id || ''} onChange={(event) => setNewPowerId(event.target.value)} sx={{ minWidth: 240, flexGrow: 1 }}>
                  {availableNewPowers.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                </TextField>
                <TextField select label="Quality" value={newPowerQuality} onChange={(event) => setNewPowerQuality(event.target.value as ArtifactQuality)} sx={{ minWidth: 150 }}>
                  {Object.entries(QUALITY_LABELS).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
                </TextField>
                <Button variant="contained" onClick={addPower} disabled={!selectedNewPurpose}>Add</Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 850 }}>
                <TableHead><TableRow><TableCell>Power</TableCell><TableCell>Source</TableCell><TableCell>Quality</TableCell><TableCell>Effect</TableCell><TableCell>Notes</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {artifact.powers.map((selection) => {
                    const definition = getArtifactPower(selection.powerId)!;
                    return (
                      <TableRow key={selection.id}>
                        <TableCell><Typography fontWeight={600}>{definition.name}</Typography><Typography variant="caption" color="text.secondary">{definition.summary}</Typography></TableCell>
                        <TableCell>{selection.source}</TableCell>
                        <TableCell><TextField select size="small" value={selection.quality} onChange={(event) => update({ powers: artifact.powers.map((entry) => entry.id === selection.id ? { ...entry, quality: event.target.value as ArtifactQuality } : entry) })}>{Object.entries(QUALITY_LABELS).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}</TextField></TableCell>
                        <TableCell>{definition.effects[selection.quality]}</TableCell>
                        <TableCell><TextField size="small" value={selection.notes} onChange={(event) => update({ powers: artifact.powers.map((entry) => entry.id === selection.id ? { ...entry, notes: event.target.value } : entry) })} /></TableCell>
                        <TableCell align="right"><IconButton aria-label={`Remove ${definition.name}`} onClick={() => update({ powers: artifact.powers.filter((entry) => entry.id !== selection.id) })}><DeleteIcon /></IconButton></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}

        {tab === 'drawbacks' && (
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'center' }}>
              <FormControlLabel control={<Checkbox checked={artifact.locks.drawbacks} onChange={() => toggleLock('drawbacks')} />} label="Lock drawbacks during full generation" />
              <Button startIcon={<CasinoIcon />} disabled={artifact.locks.drawbacks} onClick={() => rerollSection('drawbacks')}>
                {artifact.acquisition === 'story' ? 'Roll Story Drawbacks' : 'Roll Package Drawbacks'}
              </Button>
            </Stack>
            <Alert severity="info" icon={false}>
              <strong>What this rolls:</strong> {drawbackGenerationExplanation(artifact)}
            </Alert>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Add Drawback</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
                <TextField select label="Drawback" value={newDrawbackId} onChange={(event) => setNewDrawbackId(event.target.value)} sx={{ minWidth: 260, flexGrow: 1 }}>
                  {ARTIFACT_DRAWBACKS.map((entry) => <MenuItem key={entry.id} value={entry.id}>{entry.name}</MenuItem>)}
                </TextField>
                <TextField select label="Severity" value={newDrawbackSeverity} onChange={(event) => setNewDrawbackSeverity(event.target.value as ArtifactDrawbackSeverity)} sx={{ minWidth: 160 }}>
                  {Object.entries(SEVERITY_LABELS).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}
                </TextField>
                <Button variant="contained" onClick={addDrawback}>Add</Button>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead><TableRow><TableCell>Drawback</TableCell><TableCell>Severity</TableCell><TableCell>Effect</TableCell><TableCell>Notes</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>
                  {artifact.drawbacks.map((selection) => {
                    const definition = getArtifactDrawback(selection.drawbackId)!;
                    return (
                      <TableRow key={selection.id}>
                        <TableCell><Typography fontWeight={600}>{definition.name}</Typography><Typography variant="caption" color="text.secondary">{definition.summary}</Typography></TableCell>
                        <TableCell><TextField select size="small" value={selection.severity} onChange={(event) => update({ drawbacks: artifact.drawbacks.map((entry) => entry.id === selection.id ? { ...entry, severity: event.target.value as ArtifactDrawbackSeverity } : entry) })}>{Object.entries(SEVERITY_LABELS).map(([id, label]) => <MenuItem key={id} value={id}>{label}</MenuItem>)}</TextField></TableCell>
                        <TableCell>{definition.effects[selection.severity]}</TableCell>
                        <TableCell><TextField size="small" value={selection.notes} onChange={(event) => update({ drawbacks: artifact.drawbacks.map((entry) => entry.id === selection.id ? { ...entry, notes: event.target.value } : entry) })} /></TableCell>
                        <TableCell align="right"><IconButton aria-label={`Remove ${definition.name}`} onClick={() => update({ drawbacks: artifact.drawbacks.filter((entry) => entry.id !== selection.id) })}><DeleteIcon /></IconButton></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}

        {tab === 'story' && (
          <Stack spacing={2}>
            {!validation.valid && <Alert severity="error">{validation.errors.join(' ')}</Alert>}
            {validation.warnings.map((warning) => <Alert key={warning} severity="info">{warning}</Alert>)}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              {([
                ['creator', 'Creator or civilization'], ['origin', 'Origin or discovery site'],
                ['appearance', 'Appearance and physical traits'], ['activation', 'Activation and control'],
                ['history', 'History and prior uses'], ['currentOwner', 'Current owner or custodian'],
                ['interestedFactions', 'Interested factions'], ['secrets', 'Secrets and hidden functions'],
                ['campaignHooks', 'Campaign hooks'], ['notes', 'Notes'],
              ] as const).map(([key, label]) => (
                <TextField
                  key={key}
                  label={label}
                  value={artifact[key]}
                  onChange={(event) => update({ [key]: event.target.value })}
                  multiline
                  minRows={3}
                  fullWidth
                />
              ))}
            </Box>
          </Stack>
        )}
      </Stack>
      {overlays}
    </CampaignToolShell>
  );
}

export default ArtifactDesignerModule;
