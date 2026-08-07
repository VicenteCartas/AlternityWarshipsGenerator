import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import HubIcon from '@mui/icons-material/Hub';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PublicIcon from '@mui/icons-material/Public';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { ThemeMode } from '@app/theme';
import { ConfirmDialog, DocumentWelcome } from '@shared/components';
import { useNotification } from '@shared/hooks/useNotification';
import { CampaignToolShell } from './components/CampaignToolShell';
import { SectorMap } from './components/SectorMap';
import { SectorSystemDetailsDialog } from './components/SectorSystemDetailsDialog';
import { useSectorSaveLoad } from './hooks/useCampaignSaveLoad';
import {
  DEFAULT_SECTOR_SETTINGS,
  SECTOR_SCALES,
  generateSector,
  rebuildSectorNetwork,
  regenerateSectorFactions,
  regenerateSectorFeatures,
  regenerateSectorSystem,
  scaleSectorRouteRange,
  setSectorSystemFaction,
} from './services/sectorGenerationService';
import { exportSectorPdf } from './services/campaignPdfService';
import {
  developSectorSystem,
  exportDetailedSystem,
  importDetailedSystem,
} from './services/sectorSystemIntegrationService';
import {
  campaignSaveFileToJson,
  deserializeStarSystem,
  getDefaultSystemFileName,
  jsonToStarSystemSaveFile,
  serializeStarSystem,
} from './services/campaignSaveService';
import type {
  SectorDocument,
  SectorFaction,
  SectorFeature,
  SectorFeatureKind,
  SectorGenerationModel,
  SectorScaleId,
  SectorSettlementDensity,
  SectorSystem,
  SectorSystemRole,
} from './types/sector';

interface SectorGeneratorModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type SectorTab = 'map' | 'factions' | 'systems' | 'features' | 'gazetteer';
type PendingSectorAction =
  | { type: 'new' | 'open' | 'welcome' | 'hub' }
  | { type: 'openPath'; filePath: string };

const SYSTEM_ROLES: SectorSystemRole[] = [
  'capital', 'colony', 'outpost', 'resource-site', 'naval-base', 'ruin', 'anomaly', 'unexplored',
];
const FEATURE_KINDS: SectorFeatureKind[] = ['nebula', 'rift', 'ruins', 'anomaly'];

function numberInput(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nextId(prefix: string, ids: string[]): string {
  const used = new Set(ids);
  let index = 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function createRandomSectorSeed(): string {
  const bytes = new Uint8Array(4);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_value, index) => { bytes[index] = Math.floor(Math.random() * 256); });
  }
  return `Sector ${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function SectorGeneratorModule(props: SectorGeneratorModuleProps) {
  const [mode, setMode] = useState<'welcome' | 'editor'>('welcome');
  const [sector, setSector] = useState<SectorDocument>(() => generateSector(DEFAULT_SECTOR_SETTINGS));
  const [tab, setTab] = useState<SectorTab>('map');
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(sector.systems[0]?.id ?? null);
  const [expandedSystemId, setExpandedSystemId] = useState<string | null>(null);
  const [expandedFactionId, setExpandedFactionId] = useState<string | null>(null);
  const [expandedFeatureId, setExpandedFeatureId] = useState<string | null>(null);
  const [detailedSystemDialogId, setDetailedSystemDialogId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingSectorAction | null>(null);
  const saveLoad = useSectorSaveLoad();
  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();
  const selectedSystem = sector.systems.find((system) => system.id === selectedSystemId) ?? sector.systems[0] ?? null;
  const selectedFaction = selectedSystem?.factionId
    ? sector.factions.find((faction) => faction.id === selectedSystem.factionId)
    : null;
  const detailedSystemDialogEntry = sector.systems.find((system) => system.id === detailedSystemDialogId) ?? null;
  const highlightedSystems = useMemo(
    () => sector.systems.filter((system) => system.hook).sort((first, second) => second.importance - first.importance),
    [sector.systems],
  );

  const updateSector = (next: SectorDocument) => {
    setSector(next);
    setHasUnsavedChanges(true);
  };

  const patchSector = (patch: Partial<SectorDocument>) => updateSector({ ...sector, ...patch });

  const patchSystem = (systemId: string, patch: Partial<SectorSystem>, rebuild = false) => {
    const next = {
      ...sector,
      systems: sector.systems.map((system) => system.id === systemId ? { ...system, ...patch } : system),
    };
    updateSector(rebuild ? rebuildSectorNetwork(next) : next);
  };

  const patchFaction = (factionId: string, patch: Partial<SectorFaction>, rebuild = false) => {
    const next = {
      ...sector,
      factions: sector.factions.map((faction) => faction.id === factionId ? { ...faction, ...patch } : faction),
    };
    updateSector(rebuild ? rebuildSectorNetwork(next) : next);
  };

  const patchFeature = (featureId: string, patch: Partial<SectorFeature>) => {
    updateSector({
      ...sector,
      features: sector.features.map((feature) => feature.id === featureId ? { ...feature, ...patch } : feature),
    });
  };

  const adoptSector = (next: SectorDocument, dirty = false) => {
    setSector(next);
    setSelectedSystemId(next.systems[0]?.id ?? null);
    setExpandedSystemId(null);
    setExpandedFactionId(null);
    setExpandedFeatureId(null);
    setDetailedSystemDialogId(null);
    setTab('map');
    setHasUnsavedChanges(dirty);
    setMode('editor');
  };

  const handleSave = async (saveAs = false) => {
    const result = saveAs ? await saveLoad.saveAs(sector) : await saveLoad.save(sector);
    if (result.ok) setHasUnsavedChanges(false);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleOpen = async () => {
    const result = await saveLoad.open();
    if (result.ok && result.value) adoptSector(result.value);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleOpenPath = async (filePath: string) => {
    const result = await saveLoad.openPath(filePath);
    if (result.ok && result.value) adoptSector(result.value);
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };

  const handleExportPdf = async () => {
    try {
      const filePath = await exportSectorPdf(sector);
      showNotification(`Sector gazetteer saved to ${filePath}`, 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to export the sector gazetteer.', 'error');
    }
  };

  const runAction = (action: PendingSectorAction) => {
    if (action.type === 'new') {
      saveLoad.clearFile();
      adoptSector(generateSector(DEFAULT_SECTOR_SETTINGS));
    } else if (action.type === 'open') void handleOpen();
    else if (action.type === 'openPath') void handleOpenPath(action.filePath);
    else if (action.type === 'welcome') setMode('welcome');
    else props.onReturnToHub();
  };

  const requestAction = (action: PendingSectorAction) => {
    if (mode === 'editor' && hasUnsavedChanges) setPendingAction(action);
    else runAction(action);
  };

  useEffect(() => {
    window.electronAPI?.setBuilderMode(mode === 'welcome' ? 'sector-welcome' : 'sector-editor');
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

  const generateFromSeed = (seed: string) => {
    const next = generateSector({ ...sector.settings, seed }, sector);
    updateSector(next);
    setSelectedSystemId(next.systems[0]?.id ?? null);
    setExpandedSystemId(null);
    setExpandedFactionId(null);
    setExpandedFeatureId(null);
    setDetailedSystemDialogId(null);
  };

  const handleDevelopSystem = (systemId: string) => {
    updateSector(developSectorSystem(sector, systemId));
    setDetailedSystemDialogId(systemId);
  };

  const addSystem = () => {
    if (sector.systems.length >= 50) return;
    const generated = generateSector({
      ...sector.settings,
      seed: `${sector.settings.seed}|manual-${sector.systems.length + 1}`,
      mappedSystemCount: 5,
    });
    const source = generated.systems[0];
    const added: SectorSystem = {
      ...source,
      id: nextId('system-manual', sector.systems.map((system) => system.id)),
      name: `New System ${sector.systems.length + 1}`,
      xLy: 0,
      yLy: 0,
      zLy: 0,
      factionId: null,
      locked: false,
    };
    const next = rebuildSectorNetwork({
      ...sector,
      settings: { ...sector.settings, mappedSystemCount: sector.systems.length + 1 },
      systems: [...sector.systems, added],
    });
    updateSector(next);
    setSelectedSystemId(added.id);
  };

  const removeSystem = (systemId: string) => {
    if (sector.factions.some((faction) => faction.capitalSystemId === systemId)) return;
    const nextSystems = sector.systems.filter((system) => system.id !== systemId);
    const next = rebuildSectorNetwork({
      ...sector,
      settings: { ...sector.settings, mappedSystemCount: nextSystems.length },
      systems: nextSystems,
    });
    updateSector(next);
    setSelectedSystemId(nextSystems[0]?.id ?? null);
    if (expandedSystemId === systemId) setExpandedSystemId(null);
    if (detailedSystemDialogId === systemId) setDetailedSystemDialogId(null);
  };

  const handleImportSystem = async () => {
    if (!selectedSystem || !window.electronAPI) return;
    const dialogResult = await window.electronAPI.showCampaignOpenDialog('system');
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) return;
    const fileResult = await window.electronAPI.readFile(dialogResult.filePaths[0]);
    if (!fileResult.success || !fileResult.content) {
      showNotification(fileResult.error || 'Failed to read the star-system file.', 'error');
      return;
    }
    const saveFile = jsonToStarSystemSaveFile(fileResult.content);
    const loaded = saveFile ? deserializeStarSystem(saveFile) : null;
    if (!loaded?.success || !loaded.value) {
      showNotification(loaded?.errors?.[0] || 'That file is not a valid star-system document.', 'error');
      return;
    }
    updateSector(importDetailedSystem(sector, selectedSystem.id, loaded.value));
    showNotification(`Imported ${loaded.value.name}.`, 'success');
  };

  const handleExportSystem = async () => {
    if (!selectedSystem || !window.electronAPI) return;
    const document = exportDetailedSystem(sector, selectedSystem.id);
    if (!document) return;
    const dialogResult = await window.electronAPI.showCampaignSaveDialog('system', getDefaultSystemFileName(document.name));
    if (dialogResult.canceled || !dialogResult.filePath) return;
    const result = await window.electronAPI.saveFile(
      dialogResult.filePath,
      campaignSaveFileToJson(serializeStarSystem(document)),
    );
    showNotification(result.success ? `Exported ${document.name}.` : result.error || 'Failed to export the system.', result.success ? 'success' : 'error');
  };

  const overlays = (
    <>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved sector changes?"
        message="This action replaces or closes the current star sector. Unsaved changes will be lost."
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
          kind="sector"
          title="Star Sector Generator"
          description="Create three-dimensional campaign maps with systems, routes, factions, and borders"
          icon={<HubIcon sx={{ fontSize: 36 }} />}
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
      title="Star Sector Generator"
      mode="sector-editor"
      icon={<HubIcon />}
      {...props}
      onReturnToHub={() => requestAction({ type: 'hub' })}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1.5}
          alignItems={{ sm: 'center' }}
          flexWrap={{ sm: 'wrap' }}
          useFlexGap
        >
          <TextField label="Sector name" size="small" value={sector.name} onChange={(event) => patchSector({ name: event.target.value })} sx={{ minWidth: 260 }} />
          <Button startIcon={<FolderOpenIcon />} onClick={() => requestAction({ type: 'open' })}>Open</Button>
          <Button startIcon={<SaveIcon />} onClick={() => { void handleSave(false); }}>Save</Button>
          <Tooltip title="Save As"><IconButton aria-label="Save sector as" onClick={() => { void handleSave(true); }}><SaveAsIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={() => { void handleExportPdf(); }}>Export PDF</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Chip label={`${sector.systems.length} mapped`} variant="outlined" />
          <Chip label={`${sector.factions.length} factions`} variant="outlined" />
          <Chip label={`${sector.routes.length} routes`} variant="outlined" />
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              value={sector.settings.model}
              onChange={(_event, value: SectorGenerationModel | null) => value && patchSector({ settings: { ...sector.settings, model: value } })}
              aria-label="Sector generation model"
              fullWidth
            >
              <ToggleButton value="gmg">GMG Campaign Map</ToggleButton>
              <ToggleButton value="science">Science-informed</ToggleButton>
            </ToggleButtonGroup>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2 }}>
              <TextField label="Seed" value={sector.settings.seed} onChange={(event) => patchSector({ settings: { ...sector.settings, seed: event.target.value } })} />
              <TextField select label="Scale" value={sector.settings.scaleId} onChange={(event) => {
                const scaleId = event.target.value as SectorScaleId;
                patchSector({ settings: {
                  ...sector.settings,
                  scaleId,
                  routeRangeLy: scaleSectorRouteRange(sector.settings.scaleId, scaleId, sector.settings.routeRangeLy),
                } });
              }}>
                {Object.values(SECTOR_SCALES).map((scale) => <MenuItem key={scale.id} value={scale.id}>{scale.name}: {scale.diameterLy.toLocaleString()} LY</MenuItem>)}
              </TextField>
              <TextField type="number" label="Mapped systems" value={sector.settings.mappedSystemCount} onChange={(event) => patchSector({ settings: { ...sector.settings, mappedSystemCount: numberInput(event.target.value, 24) } })} slotProps={{ htmlInput: { min: 5, max: 50 } }} />
              <TextField type="number" label="Highlighted sites" value={sector.settings.highlightedSiteCount} onChange={(event) => patchSector({ settings: { ...sector.settings, highlightedSiteCount: numberInput(event.target.value, 8) } })} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
              <TextField type="number" label="Factions" value={sector.settings.factionCount} onChange={(event) => patchSector({ settings: { ...sector.settings, factionCount: numberInput(event.target.value, 3) } })} slotProps={{ htmlInput: { min: 0, max: 6 } }} />
              <TextField select label="Settlement density" value={sector.settings.settlementDensity} onChange={(event) => patchSector({ settings: { ...sector.settings, settlementDensity: event.target.value as SectorSettlementDensity } })}>
                <MenuItem value="sparse">Sparse</MenuItem><MenuItem value="frontier">Frontier</MenuItem><MenuItem value="settled">Settled</MenuItem>
              </TextField>
              <TextField type="number" label="Route range (LY)" value={sector.settings.routeRangeLy} onChange={(event) => patchSector({ settings: { ...sector.settings, routeRangeLy: numberInput(event.target.value, 20) } })} slotProps={{ htmlInput: { min: 0.1 } }} />
              <TextField type="number" label="Spatial features" value={sector.settings.featureCount} onChange={(event) => patchSector({ settings: { ...sector.settings, featureCount: numberInput(event.target.value, 4) } })} slotProps={{ htmlInput: { min: 0, max: 10 } }} />
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => generateFromSeed(createRandomSectorSeed())}>
                Generate with New Seed
              </Button>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => generateFromSeed(sector.settings.seed)}>
                Regenerate from Seed
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {sector.settings.model === 'gmg'
                ? 'Table G57 controls diameter, background star count, and hex scale. Only campaign-relevant systems become editable markers.'
                : 'Background count and spectral population use a simplified local-density model; mapped systems remain campaign-selected points.'}
            </Typography>
          </Stack>
        </Paper>

        <Tabs value={tab} onChange={(_event, value: SectorTab) => setTab(value)} variant="scrollable" scrollButtons="auto">
          <Tab value="map" label="Map" />
          <Tab value="factions" label={`Factions & Borders (${sector.factions.length})`} />
          <Tab value="systems" label={`Systems (${sector.systems.length})`} />
          <Tab value="features" label={`Spatial Features (${sector.features.length})`} />
          <Tab value="gazetteer" label={`Gazetteer (${highlightedSystems.length})`} />
        </Tabs>

        {tab === 'map' && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 3fr) minmax(280px, 1fr)' },
              alignItems: 'start',
              gap: 2,
            }}
          >
            <Paper variant="outlined" sx={{ p: 1, minWidth: 0 }}>
              <SectorMap sector={sector} selectedSystemId={selectedSystem?.id ?? null} onSelectSystem={setSelectedSystemId} />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, minWidth: 0, position: { md: 'sticky' }, top: { md: 16 } }}>
              {selectedSystem ? (
                <Stack spacing={1.5}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">{selectedSystem.name}</Typography>
                    <Tooltip title={selectedSystem.locked ? 'Unlock system' : 'Lock system'}>
                      <IconButton onClick={() => patchSystem(selectedSystem.id, { locked: !selectedSystem.locked })}>{selectedSystem.locked ? <LockIcon /> : <LockOpenIcon />}</IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{selectedSystem.spectralClass}; {selectedSystem.multiplicity} star(s); {selectedSystem.role}</Typography>
                  <Typography variant="body2">Coordinates: ({selectedSystem.xLy}, {selectedSystem.yLy}, {selectedSystem.zLy}) LY</Typography>
                  <Typography variant="body2">Faction: {selectedFaction?.name ?? 'Unclaimed'}</Typography>
                  {selectedSystem.hook && <Alert severity="info" icon={false}>{selectedSystem.hook}</Alert>}
                  {selectedSystem.developedSystem && (
                    <Alert severity="success" icon={false}>
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Typography variant="body2">
                          Detailed system available: {selectedSystem.developedSystem.starCount} {selectedSystem.developedSystem.starCount === 1 ? 'star' : 'stars'}, {selectedSystem.developedSystem.planets.length} {selectedSystem.developedSystem.planets.length === 1 ? 'planet' : 'planets'}.
                        </Typography>
                        <Button size="small" onClick={() => setDetailedSystemDialogId(selectedSystem.id)}>View Detailed System</Button>
                      </Stack>
                    </Alert>
                  )}
                  <Stack spacing={1} alignItems="flex-start">
                    <Box>
                      <Button size="small" sx={{ justifyContent: 'flex-start' }} startIcon={<RefreshIcon />} disabled={selectedSystem.locked} onClick={() => updateSector(regenerateSectorSystem(sector, selectedSystem.id))}>Reroll Map Entry</Button>
                      <Typography variant="caption" color="text.secondary" display="block">Replaces the sector-level name, class, role, and hook while keeping its coordinates; generated details are removed.</Typography>
                    </Box>
                    <Box>
                      <Button size="small" sx={{ justifyContent: 'flex-start' }} startIcon={<PublicIcon />} onClick={() => handleDevelopSystem(selectedSystem.id)}>{selectedSystem.developedSystem ? 'Regenerate Detailed System' : 'Generate Detailed System'}</Button>
                      <Typography variant="caption" color="text.secondary" display="block">Creates the stars, planets, and environments stored inside this sector entry.</Typography>
                    </Box>
                    <Button size="small" sx={{ justifyContent: 'flex-start' }} startIcon={<UploadFileIcon />} onClick={() => { void handleImportSystem(); }}>Import .system.json</Button>
                    <Button size="small" sx={{ justifyContent: 'flex-start' }} startIcon={<DownloadIcon />} disabled={!selectedSystem.developedSystem} onClick={() => { void handleExportSystem(); }}>Export .system.json</Button>
                  </Stack>
                </Stack>
              ) : <Typography color="text.secondary">Select a mapped system.</Typography>}
            </Paper>
          </Box>
        )}

        {tab === 'systems' && (
          <Stack spacing={1.5}>
            <Stack direction="row" gap={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
              <Button startIcon={<AddIcon />} onClick={addSystem} disabled={sector.systems.length >= 50}>Add System</Button>
              <Box>
                <Button startIcon={<RefreshIcon />} onClick={() => updateSector(rebuildSectorNetwork(sector))}>Rebuild Routes & Ownership</Button>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 1 }}>Preserves generated detailed systems.</Typography>
              </Box>
            </Stack>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900, tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 190 }}>System</TableCell>
                    <TableCell sx={{ width: 80 }}>Class</TableCell>
                    <TableCell sx={{ width: 155 }}>Role</TableCell>
                    <TableCell sx={{ width: 190 }}>Faction</TableCell>
                    <TableCell sx={{ width: 100 }}>Detail</TableCell>
                    <TableCell sx={{ width: 70 }}>Locked</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sector.systems.map((system) => {
                    const capital = sector.factions.some((faction) => faction.capitalSystemId === system.id);
                    const expanded = system.id === expandedSystemId;
                    return (
                      <Fragment key={system.id}>
                        <TableRow selected={system.id === selectedSystemId} onClick={() => setSelectedSystemId(system.id)} sx={{ cursor: 'pointer' }}>
                          <TableCell><TextField size="small" fullWidth value={system.name} onClick={(event) => event.stopPropagation()} onChange={(event) => patchSystem(system.id, { name: event.target.value })} /></TableCell>
                          <TableCell><Typography variant="body2" noWrap title={system.spectralClass}>{system.spectralClass}</Typography></TableCell>
                          <TableCell title={capital ? 'Capital role is set from the Factions & Borders tab.' : undefined}><TextField select size="small" fullWidth disabled={capital} value={system.role} onClick={(event) => event.stopPropagation()} onChange={(event) => patchSystem(system.id, { role: event.target.value as SectorSystemRole })}>{SYSTEM_ROLES.map((role) => <MenuItem key={role} value={role} disabled={role === 'capital'}>{role}</MenuItem>)}</TextField></TableCell>
                          <TableCell title={capital ? 'Capital ownership is set from the Factions & Borders tab.' : undefined}><TextField select size="small" fullWidth disabled={capital} value={system.factionId ?? 'none'} onClick={(event) => event.stopPropagation()} onChange={(event) => updateSector(setSectorSystemFaction(sector, system.id, event.target.value === 'none' ? null : event.target.value))}><MenuItem value="none">Unclaimed</MenuItem>{sector.factions.map((faction) => <MenuItem key={faction.id} value={faction.id}>{faction.name}</MenuItem>)}</TextField></TableCell>
                          <TableCell><Chip label={system.developedSystem ? 'Detailed' : 'Map only'} color={system.developedSystem ? 'success' : 'default'} variant="outlined" size="small" /></TableCell>
                          <TableCell><Checkbox checked={system.locked} onClick={(event) => event.stopPropagation()} onChange={(event) => patchSystem(system.id, { locked: event.target.checked })} inputProps={{ 'aria-label': `${system.name} locked` }} /></TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            {system.developedSystem && (
                              <Tooltip title="View detailed system">
                                <IconButton size="small" aria-label={`View detailed system for ${system.name}`} onClick={(event) => { event.stopPropagation(); setDetailedSystemDialogId(system.id); }}><PublicIcon /></IconButton>
                              </Tooltip>
                            )}
                            {!system.developedSystem && <Box component="span" sx={{ display: 'inline-block', width: 34 }} />}
                            <Tooltip title={expanded ? 'Hide coordinates and details' : 'Show coordinates and details'}>
                              <IconButton size="small" aria-label={`${expanded ? 'Hide' : 'Show'} coordinates and details for ${system.name}`} onClick={(event) => { event.stopPropagation(); setExpandedSystemId(expanded ? null : system.id); }}>
                                {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </Tooltip>
                            <IconButton size="small" aria-label={`Remove ${system.name}`} disabled={capital} onClick={(event) => { event.stopPropagation(); removeSystem(system.id); }}><DeleteIcon /></IconButton>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ py: 2, bgcolor: 'action.hover' }}>
                              <Stack direction={{ xs: 'column', md: 'row' }} gap={2} alignItems={{ md: 'flex-start' }} justifyContent="space-between">
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(90px, 1fr))' }, gap: 1.5, width: '100%', maxWidth: 600 }}>
                                  {(['xLy', 'yLy', 'zLy'] as const).map((key) => <TextField key={key} type="number" size="small" label={key === 'xLy' ? 'X' : key === 'yLy' ? 'Y' : 'Z'} value={system[key]} onChange={(event) => patchSystem(system.id, { [key]: numberInput(event.target.value, system[key]) }, true)} />)}
                                  <TextField type="number" size="small" label="Importance" value={system.importance} onChange={(event) => patchSystem(system.id, { importance: Math.max(1, Math.min(5, numberInput(event.target.value, 1))) })} />
                                </Box>
                                <Stack spacing={0.75} alignItems="flex-start" sx={{ minWidth: { md: 260 } }}>
                                  <Typography variant="subtitle2">{system.developedSystem ? `${system.developedSystem.starCount} stars; ${system.developedSystem.planets.length} planets` : 'No detailed system generated'}</Typography>
                                  {system.developedSystem ? (
                                    <Button size="small" startIcon={<PublicIcon />} onClick={() => setDetailedSystemDialogId(system.id)}>View Detailed System</Button>
                                  ) : (
                                    <Button size="small" startIcon={<PublicIcon />} onClick={() => handleDevelopSystem(system.id)}>Generate Detailed System</Button>
                                  )}
                                </Stack>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}

        {tab === 'factions' && (
          <Stack spacing={2}>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Button startIcon={<RefreshIcon />} onClick={() => updateSector(regenerateSectorFactions(sector))}>Regenerate Factions & Borders</Button>
            </Stack>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 850, tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 230 }}>Faction</TableCell>
                    <TableCell sx={{ width: 90 }}>Color</TableCell>
                    <TableCell sx={{ width: 240 }}>Capital</TableCell>
                    <TableCell sx={{ width: 150 }}>Radius (LY)</TableCell>
                    <TableCell sx={{ width: 80 }}>Locked</TableCell>
                    <TableCell align="right" sx={{ width: 60 }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sector.factions.map((faction) => {
                    const expanded = faction.id === expandedFactionId;
                    return (
                      <Fragment key={faction.id}>
                        <TableRow>
                          <TableCell><TextField size="small" fullWidth value={faction.name} onChange={(event) => patchFaction(faction.id, { name: event.target.value })} slotProps={{ htmlInput: { 'aria-label': 'Faction name' } }} /></TableCell>
                          <TableCell><TextField type="color" size="small" fullWidth value={faction.color} onChange={(event) => patchFaction(faction.id, { color: event.target.value })} slotProps={{ htmlInput: { 'aria-label': `${faction.name} color` } }} /></TableCell>
                          <TableCell><TextField select size="small" fullWidth value={faction.capitalSystemId} onChange={(event) => patchFaction(faction.id, { capitalSystemId: event.target.value }, true)} slotProps={{ select: { inputProps: { 'aria-label': `${faction.name} capital` } } }}>{sector.systems.map((system) => <MenuItem key={system.id} value={system.id}>{system.name}</MenuItem>)}</TextField></TableCell>
                          <TableCell><TextField type="number" size="small" fullWidth value={faction.influenceRadiusLy} onChange={(event) => patchFaction(faction.id, { influenceRadiusLy: Math.max(0, numberInput(event.target.value)) }, true)} slotProps={{ htmlInput: { 'aria-label': `${faction.name} influence radius` } }} /></TableCell>
                          <TableCell><Checkbox checked={faction.locked} onChange={(event) => patchFaction(faction.id, { locked: event.target.checked })} inputProps={{ 'aria-label': `${faction.name} locked` }} /></TableCell>
                          <TableCell align="right">
                            <Tooltip title={expanded ? 'Hide faction details' : 'Show faction details'}>
                              <IconButton size="small" aria-label={`${expanded ? 'Hide' : 'Show'} details for ${faction.name}`} onClick={() => setExpandedFactionId(expanded ? null : faction.id)}>
                                {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={6} sx={{ py: 2, bgcolor: 'action.hover' }}>
                              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                                <TextField label="Government" value={faction.government} onChange={(event) => patchFaction(faction.id, { government: event.target.value })} />
                                <TextField label="Goal" value={faction.goal} onChange={(event) => patchFaction(faction.id, { goal: event.target.value })} />
                                <TextField label="Notes" value={faction.notes} onChange={(event) => patchFaction(faction.id, { notes: event.target.value })} multiline minRows={3} sx={{ gridColumn: { md: '1 / -1' } }} />
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}

        {tab === 'features' && (
          <Stack spacing={2}>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              <Button startIcon={<RefreshIcon />} onClick={() => updateSector(regenerateSectorFeatures(sector))}>Regenerate Spatial Features</Button>
            </Stack>
            <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 900, tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 210 }}>Name</TableCell>
                    <TableCell sx={{ width: 150 }}>Kind</TableCell>
                    <TableCell sx={{ width: 105 }}>X</TableCell>
                    <TableCell sx={{ width: 105 }}>Y</TableCell>
                    <TableCell sx={{ width: 105 }}>Z</TableCell>
                    <TableCell sx={{ width: 105 }}>Radius</TableCell>
                    <TableCell sx={{ width: 80 }}>Locked</TableCell>
                    <TableCell align="right" sx={{ width: 60 }}>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sector.features.map((feature) => {
                    const expanded = feature.id === expandedFeatureId;
                    return (
                      <Fragment key={feature.id}>
                        <TableRow>
                          <TableCell><TextField size="small" fullWidth value={feature.name} onChange={(event) => patchFeature(feature.id, { name: event.target.value })} slotProps={{ htmlInput: { 'aria-label': `${feature.name} name` } }} /></TableCell>
                          <TableCell><TextField select size="small" fullWidth value={feature.kind} onChange={(event) => patchFeature(feature.id, { kind: event.target.value as SectorFeatureKind })} slotProps={{ select: { inputProps: { 'aria-label': `${feature.name} kind` } } }}>{FEATURE_KINDS.map((kind) => <MenuItem key={kind} value={kind}>{kind}</MenuItem>)}</TextField></TableCell>
                          {(['xLy', 'yLy', 'zLy', 'radiusLy'] as const).map((key) => (
                            <TableCell key={key} sx={{ px: 0.75 }}>
                              <TextField
                                type="number"
                                size="small"
                                fullWidth
                                value={feature[key]}
                                onChange={(event) => patchFeature(feature.id, { [key]: numberInput(event.target.value, feature[key]) })}
                                slotProps={{ htmlInput: {
                                  'aria-label': `${feature.name} ${key === 'xLy' ? 'X' : key === 'yLy' ? 'Y' : key === 'zLy' ? 'Z' : 'radius'}`,
                                  style: { paddingLeft: 8, paddingRight: 4 },
                                } }}
                              />
                            </TableCell>
                          ))}
                          <TableCell><Checkbox checked={feature.locked} onChange={(event) => patchFeature(feature.id, { locked: event.target.checked })} inputProps={{ 'aria-label': `${feature.name} locked` }} /></TableCell>
                          <TableCell align="right">
                            <Tooltip title={expanded ? 'Hide description' : 'Show description'}>
                              <IconButton size="small" aria-label={`${expanded ? 'Hide' : 'Show'} description for ${feature.name}`} onClick={() => setExpandedFeatureId(expanded ? null : feature.id)}>
                                {expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ py: 2, bgcolor: 'action.hover' }}>
                              <TextField label="Description" fullWidth multiline minRows={3} value={feature.description} onChange={(event) => patchFeature(feature.id, { description: event.target.value })} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}

        {tab === 'gazetteer' && (
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
              {([
                ['overview', 'Sector overview'], ['history', 'History'], ['currentConflicts', 'Current conflicts'],
                ['campaignHooks', 'Campaign hooks'], ['notes', 'Notes'],
              ] as const).map(([key, label]) => <TextField key={key} label={label} value={sector[key]} onChange={(event) => patchSector({ [key]: event.target.value })} multiline minRows={3} />)}
            </Box>
            <Typography variant="h6">Highlighted Sites</Typography>
            {highlightedSystems.map((system) => (
              <Paper key={system.id} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                  <Box sx={{ minWidth: 220 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{system.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{system.role}; importance {system.importance}; z {system.zLy >= 0 ? '+' : ''}{system.zLy} LY</Typography>
                  </Box>
                  <TextField label="Campaign hook" value={system.hook} onChange={(event) => patchSystem(system.id, { hook: event.target.value })} fullWidth multiline minRows={2} />
                  <TextField label="Notes" value={system.notes} onChange={(event) => patchSystem(system.id, { notes: event.target.value })} fullWidth multiline minRows={2} />
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>
      <SectorSystemDetailsDialog
        open={Boolean(detailedSystemDialogEntry?.developedSystem)}
        name={detailedSystemDialogEntry?.name ?? ''}
        system={detailedSystemDialogEntry?.developedSystem ?? null}
        onClose={() => setDetailedSystemDialogId(null)}
      />
      {overlays}
    </CampaignToolShell>
  );
}

export default SectorGeneratorModule;
