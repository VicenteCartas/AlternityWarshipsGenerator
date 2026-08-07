import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, IconButton, MenuItem, Paper,
  Snackbar, Stack, Switch, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { ThemeMode } from '@app/theme';
import { useNotification } from '@shared/hooks/useNotification';
import {
  CIVILIZATION_LEVELS,
  DEFAULT_CIVILIZATION_DESIGN,
  LAW_LEVELS,
  PROGRESS_LEVELS,
  TRADE_COMMODITIES,
  createCityTown,
  createInstallation,
  formatCivilizationSummary,
  getCivilizationLevel,
  getLawLevel,
  validateCivilizationDesign,
} from './services/civilizationDesignService';
import type {
  CityTownLocation, CivilizationDesign, InstallationLocation, SocietyOrigin,
} from './types/worldbuilding';
import { CampaignToolShell } from './components/CampaignToolShell';
import { CityTownEditor, InstallationEditor } from './components/CivilizationLocationEditors';
import { useCivilizationSaveLoad } from './hooks/useCampaignSaveLoad';
import { exportCivilizationPdf, exportLocationPdf } from './services/campaignPdfService';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { DocumentWelcome } from '@shared/components';

interface CivilizationBuilderModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type PendingCivilizationAction =
  | { type: 'new' | 'open' | 'welcome' | 'hub' }
  | { type: 'openPath'; filePath: string };

type CivilizationTab = 'culture' | 'economy' | 'cities' | 'installations' | 'society';
type SelectionKey = 'tradeImportIds' | 'tradeExportIds';

const FIELD_SX = { '& .MuiInputBase-root': { alignItems: 'flex-start' } } as const;
const COMMODITIES_PER_PAGE = 10;

export function CivilizationBuilderModule(props: CivilizationBuilderModuleProps) {
  const [mode, setMode] = useState<'welcome' | 'editor'>('welcome');
  const [design, setDesign] = useState<CivilizationDesign>(DEFAULT_CIVILIZATION_DESIGN);
  const [tab, setTab] = useState<CivilizationTab>('culture');
  const [copied, setCopied] = useState(false);
  const [commoditySearch, setCommoditySearch] = useState('');
  const [commodityPage, setCommodityPage] = useState(0);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedInstallationId, setSelectedInstallationId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingCivilizationAction | null>(null);
  const saveLoad = useCivilizationSaveLoad();
  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();
  const civilizationLevel = getCivilizationLevel(design.civilizationLevel);
  const alienCivilizationLevel = getCivilizationLevel(design.alienCivilizationLevel);
  const lawLevel = getLawLevel(design.lawLevel);
  const warnings = validateCivilizationDesign(design);
  const update = <K extends keyof CivilizationDesign>(key: K, value: CivilizationDesign[K]) => {
    setDesign((current) => ({ ...current, [key]: value }));
    setCopied(false);
    setHasUnsavedChanges(true);
  };
  const toggleSelection = (key: SelectionKey, id: string, checked: boolean) => {
    const current = design[key];
    update(key, checked ? [...current, id] : current.filter((entry) => entry !== id));
  };
  const textArea = (key: keyof CivilizationDesign, label: string) => (
    <TextField
      label={label}
      value={String(design[key])}
      onChange={(event) => update(key, event.target.value as never)}
      multiline
      minRows={3}
      fullWidth
      sx={FIELD_SX}
    />
  );
  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatCivilizationSummary(design));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const normalizedCommoditySearch = commoditySearch.trim().toLocaleLowerCase();
  const filteredCommodities = TRADE_COMMODITIES.filter((commodity) => (
    !normalizedCommoditySearch || commodity.name.toLocaleLowerCase().includes(normalizedCommoditySearch)
  ));
  const effectiveCommodityPage = Math.min(
    commodityPage,
    Math.max(0, Math.ceil(filteredCommodities.length / COMMODITIES_PER_PAGE) - 1),
  );
  const commodityRows = filteredCommodities.slice(
    effectiveCommodityPage * COMMODITIES_PER_PAGE,
    (effectiveCommodityPage + 1) * COMMODITIES_PER_PAGE,
  );
  const reset = () => {
    setDesign(DEFAULT_CIVILIZATION_DESIGN);
    setCommoditySearch('');
    setCommodityPage(0);
    setCopied(false);
    setSelectedCityId(null);
    setSelectedInstallationId(null);
    saveLoad.clearFile();
    setHasUnsavedChanges(false);
  };
  const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const addCity = () => {
    const city = createCityTown(createId('city'));
    update('cities', [...design.cities, city]);
    setSelectedCityId(city.id);
  };
  const updateCity = (city: CityTownLocation) => update(
    'cities',
    design.cities.map((entry) => entry.id === city.id ? city : entry),
  );
  const duplicateCity = (city: CityTownLocation) => {
    const copy = { ...city, id: createId('city'), name: `${city.name} Copy` };
    update('cities', [...design.cities, copy]);
    setSelectedCityId(copy.id);
  };
  const removeCity = (id: string) => {
    const next = design.cities.filter((city) => city.id !== id);
    update('cities', next);
    setSelectedCityId(next[0]?.id ?? null);
  };
  const addInstallation = () => {
    const installation = createInstallation(createId('installation'));
    update('installations', [...design.installations, installation]);
    setSelectedInstallationId(installation.id);
  };
  const updateInstallation = (installation: InstallationLocation) => update(
    'installations',
    design.installations.map((entry) => entry.id === installation.id ? installation : entry),
  );
  const duplicateInstallation = (installation: InstallationLocation) => {
    const copy = {
      ...installation,
      id: createId('installation'),
      name: `${installation.name} Copy`,
      facilityIds: [...installation.facilityIds],
    };
    update('installations', [...design.installations, copy]);
    setSelectedInstallationId(copy.id);
  };
  const removeInstallation = (id: string) => {
    const next = design.installations.filter((installation) => installation.id !== id);
    update('installations', next);
    setSelectedInstallationId(next[0]?.id ?? null);
  };
  const handleSave = async (saveAs = false) => {
    const result = saveAs ? await saveLoad.saveAs(design) : await saveLoad.save(design);
    if (result.ok) setHasUnsavedChanges(false);
    showNotification(result.message, result.severity);
  };
  const handleOpen = async () => {
    const result = await saveLoad.open();
    if (result.ok && result.value) {
      setDesign(result.value);
      setSelectedCityId(result.value.cities[0]?.id ?? null);
      setSelectedInstallationId(result.value.installations[0]?.id ?? null);
      setCommoditySearch('');
      setCommodityPage(0);
      setHasUnsavedChanges(false);
      setMode('editor');
    }
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };
  const adoptCivilization = (civilization: CivilizationDesign) => {
    setDesign(civilization);
    setSelectedCityId(civilization.cities[0]?.id ?? null);
    setSelectedInstallationId(civilization.installations[0]?.id ?? null);
    setCommoditySearch('');
    setCommodityPage(0);
    setHasUnsavedChanges(false);
    setMode('editor');
  };
  const handleOpenPath = async (filePath: string) => {
    const result = await saveLoad.openPath(filePath);
    if (result.ok && result.value) adoptCivilization(result.value);
    showNotification(result.message, result.severity);
  };
  const handleExportPdf = async () => {
    try {
      const savedTo = await exportCivilizationPdf(design);
      showNotification(`Civilization PDF saved to ${savedTo}`, 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to export civilization PDF.', 'error');
    }
  };
  const handleExportLocation = async (location: CityTownLocation | InstallationLocation) => {
    try {
      const savedTo = await exportLocationPdf(design.name, location);
      showNotification(`Location PDF saved to ${savedTo}`, 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to export location PDF.', 'error');
    }
  };
  const runAction = (action: PendingCivilizationAction) => {
    if (action.type === 'new') {
      reset();
      setMode('editor');
    }
    else if (action.type === 'open') void handleOpen();
    else if (action.type === 'openPath') void handleOpenPath(action.filePath);
    else if (action.type === 'welcome') setMode('welcome');
    else props.onReturnToHub();
  };
  const requestAction = (action: PendingCivilizationAction) => {
    if (hasUnsavedChanges) setPendingAction(action);
    else runAction(action);
  };
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

  useEffect(() => {
    if (mode === 'welcome') window.electronAPI?.setBuilderMode('civilization-welcome');
  }, [mode]);

  const overlays = (
    <>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved civilization changes?"
        message="This action replaces or closes the current civilization. Unsaved changes will be lost."
        confirmLabel="Discard"
        confirmColor="warning"
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
          kind="civilization"
          title="Civilization Builder"
          description="Define Progress, Civilization, and Law Levels, culture, economy, and settlements"
          icon={<AccountBalanceIcon sx={{ fontSize: 36 }} />}
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
      title="Civilization Builder"
      mode="civilization-editor"
      icon={<AccountBalanceIcon />}
      {...props}
      onReturnToHub={() => requestAction({ type: 'hub' })}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h5" component="h1">Civilization Builder</Typography>
            <Typography color="text.secondary">Gamemaster Guide, Creating Civilizations</Typography>
          </Box>
          <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
            <Button startIcon={<RestartAltIcon />} onClick={() => requestAction({ type: 'new' })}>Reset</Button>
            <Button startIcon={<FolderOpenIcon />} onClick={() => requestAction({ type: 'open' })}>Open</Button>
            <Button startIcon={<SaveIcon />} onClick={() => handleSave(false)}>Save</Button>
            <Tooltip title="Save As"><IconButton aria-label="Save civilization as" onClick={() => handleSave(true)}><SaveAsIcon /></IconButton></Tooltip>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdf}>Export PDF</Button>
            <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={copySummary}>
              {copied ? 'Copied' : 'Copy Summary'}
            </Button>
          </Stack>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
            <TextField label="Civilization name" value={design.name} onChange={(event) => update('name', event.target.value)} />
            <TextField select label="Society" value={design.origin} onChange={(event) => update('origin', event.target.value as SocietyOrigin)}>
              <MenuItem value="human">Human</MenuItem><MenuItem value="alien">Alien</MenuItem><MenuItem value="mixed">Mixed</MenuItem>
            </TextField>
            <TextField select label="Progress Level" value={design.progressLevel} onChange={(event) => update('progressLevel', Number(event.target.value))}>
              {PROGRESS_LEVELS.map((level) => <MenuItem key={level.level} value={level.level}>{level.label}</MenuItem>)}
            </TextField>
            <TextField
              select
              label={design.origin === 'mixed' ? 'Human Civilization Level' : 'Civilization Level'}
              value={design.civilizationLevel}
              onChange={(event) => update('civilizationLevel', Number(event.target.value))}
            >
              {CIVILIZATION_LEVELS.map((level) => <MenuItem key={level.level} value={level.level}>CL {level.level}: {level.name}</MenuItem>)}
            </TextField>
            {design.origin === 'mixed' && (
              <TextField
                select
                label="Alien Civilization Level"
                value={design.alienCivilizationLevel}
                onChange={(event) => update('alienCivilizationLevel', Number(event.target.value))}
              >
                {CIVILIZATION_LEVELS.map((level) => <MenuItem key={level.level} value={level.level}>CL {level.level}: {level.name}</MenuItem>)}
              </TextField>
            )}
            <TextField select label="Law Level" value={design.lawLevel} onChange={(event) => update('lawLevel', Number(event.target.value))}>
              {LAW_LEVELS.map((level) => <MenuItem key={level.level} value={level.level}>LL {level.level}: {level.name}</MenuItem>)}
            </TextField>
          </Box>
          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Switch checked={design.hostileWorld} onChange={(event) => update('hostileWorld', event.target.checked)} />}
            label="World is extremely hostile to human life"
          />
        </Paper>

        {warnings.map((warning) => <Alert key={warning} severity="warning">{warning}</Alert>)}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.45fr) minmax(300px, .55fr)' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ minWidth: 0 }}>
            <Tabs value={tab} onChange={(_event, value: CivilizationTab) => setTab(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="culture" label="Culture" /><Tab value="economy" label="Economy" />
              <Tab value="cities" label="Cities & Towns" /><Tab value="installations" label="Stations & Installations" />
              <Tab value="society" label="Alien & Mixed" />
            </Tabs>
            <Box sx={{ p: 2 }}>
              {tab === 'culture' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {textArea('population', 'Population and demographics')}{textArea('government', 'Government and authority')}
                  {textArea('homeland', 'Homeland and physical geography')}{textArea('foodAndShelter', 'Food, clothing, and shelter')}
                  {textArea('industries', 'Industries and occupations')}{textArea('externalContact', 'Contact with other societies')}
                  {textArea('leisureAndArt', 'Leisure and art')}{textArea('values', 'Values and admired traits')}
                  {textArea('rivals', 'Rival cultures')}{textArea('enemies', 'Enemies and threats')}
                  {textArea('heroes', 'Heroes and their social role')}
                </Box>
              )}
              {tab === 'economy' && (
                <Stack spacing={2}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                    {textArea('currency', 'Currency and exchange')}{textArea('resources', 'Available resources')}
                    {textArea('imports', 'Imports and demand')}{textArea('exports', 'Exports and supply')}
                    {textArea('shortages', 'Scarce, regulated, or contraband goods')}
                  </Box>
                  <Divider />
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5}>
                    <Box>
                      <Typography variant="h6">Possible Trade Commodities</Typography>
                      <Typography variant="body2" color="text.secondary">Gamemaster Guide, page 206</Typography>
                    </Box>
                    <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                      <Chip label={`${design.tradeImportIds.length} ${design.tradeImportIds.length === 1 ? 'import' : 'imports'}`} variant="outlined" />
                      <Chip label={`${design.tradeExportIds.length} ${design.tradeExportIds.length === 1 ? 'export' : 'exports'}`} variant="outlined" />
                    </Stack>
                  </Stack>
                  <TextField
                    size="small"
                    label="Search commodities"
                    value={commoditySearch}
                    onChange={(event) => { setCommoditySearch(event.target.value); setCommodityPage(0); }}
                    fullWidth
                  />
                  <TableContainer sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 660 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ width: 72 }}>Import</TableCell>
                          <TableCell sx={{ width: 72 }}>Export</TableCell>
                          <TableCell>Commodity</TableCell>
                          <TableCell sx={{ width: 120 }}>Value</TableCell>
                          <TableCell sx={{ width: 120 }}>Bulk</TableCell>
                          <TableCell sx={{ width: 110 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {commodityRows.map((commodity) => (
                          <TableRow key={commodity.id}>
                            <TableCell>
                              <Checkbox
                                checked={design.tradeImportIds.includes(commodity.id)}
                                onChange={(event) => toggleSelection('tradeImportIds', commodity.id, event.target.checked)}
                                inputProps={{ 'aria-label': `Import ${commodity.name}` }}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={design.tradeExportIds.includes(commodity.id)}
                                onChange={(event) => toggleSelection('tradeExportIds', commodity.id, event.target.checked)}
                                inputProps={{ 'aria-label': `Export ${commodity.name}` }}
                              />
                            </TableCell>
                            <TableCell><Typography fontWeight={600}>{commodity.name}</Typography></TableCell>
                            <TableCell>{commodity.value}</TableCell>
                            <TableCell>{commodity.bulk}</TableCell>
                            <TableCell>
                              {commodity.restricted ? (
                                <Tooltip title="The GMG marks this commodity as difficult to procure or potentially regulated.">
                                  <Chip label="Restricted" size="small" color="warning" variant="outlined" />
                                </Tooltip>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                        {commodityRows.length === 0 && (
                          <TableRow><TableCell colSpan={6} align="center">No matching commodities</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={filteredCommodities.length}
                    page={effectiveCommodityPage}
                    onPageChange={(_event, nextPage) => setCommodityPage(nextPage)}
                    rowsPerPage={COMMODITIES_PER_PAGE}
                    rowsPerPageOptions={[COMMODITIES_PER_PAGE]}
                  />
                </Stack>
              )}
              {tab === 'cities' && (
                <Stack spacing={2}>
                  {textArea('settlements', 'Civilization-wide settlement overview')}
                  <CityTownEditor
                    records={design.cities}
                    selectedId={selectedCityId}
                    onSelectedIdChange={setSelectedCityId}
                    onAdd={addCity}
                    onChange={updateCity}
                    onExport={handleExportLocation}
                    onDuplicate={duplicateCity}
                    onRemove={removeCity}
                  />
                </Stack>
              )}
              {tab === 'installations' && (
                <InstallationEditor
                  records={design.installations}
                  selectedId={selectedInstallationId}
                  onSelectedIdChange={setSelectedInstallationId}
                  onAdd={addInstallation}
                  onChange={updateInstallation}
                  onExport={handleExportLocation}
                  onDuplicate={duplicateInstallation}
                  onRemove={removeInstallation}
                />
              )}
              {tab === 'society' && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {textArea('alienGoals', 'What do they want from humans or the heroes?')}
                  {textArea('alienOrganization', 'How are they organized?')}
                  {textArea('alienAppearance', 'Appearance, settlements, ships, and technology')}
                  {textArea('campaignRole', 'Why are they part of the campaign?')}
                </Box>
              )}
            </Box>
          </Paper>

          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Civilization Level</Typography>
              <Typography variant="h5">CL {civilizationLevel.level}: {civilizationLevel.name}</Typography>
              <Typography sx={{ mt: 1 }}>{civilizationLevel.scale}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{civilizationLevel.population}</Typography>
              <Chip
                sx={{ mt: 1.5 }}
                label={civilizationLevel.resourceModifier === null
                  ? 'Resources unavailable'
                  : `${civilizationLevel.resourceModifier >= 0 ? '+' : ''}${civilizationLevel.resourceModifier} resource modifier`}
                color={civilizationLevel.resourceModifier !== null && civilizationLevel.resourceModifier < 0 ? 'success' : 'default'}
                variant="outlined"
              />
            </Paper>
            {design.origin === 'mixed' && (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary">Alien Civilization Level</Typography>
                <Typography variant="h5">CL {alienCivilizationLevel.level}: {alienCivilizationLevel.name}</Typography>
                <Typography sx={{ mt: 1 }}>{alienCivilizationLevel.scale}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{alienCivilizationLevel.population}</Typography>
              </Paper>
            )}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">Law Level</Typography>
              <Typography variant="h5">LL {lawLevel.level}: {lawLevel.name}</Typography>
              <Typography sx={{ mt: 1 }}>{lawLevel.description}</Typography>
              <Chip sx={{ mt: 1.5 }} label={`${lawLevel.lawModifier >= 0 ? '+' : ''}${lawLevel.lawModifier} law modifier`} variant="outlined" />
            </Paper>
          </Stack>
        </Box>
      </Stack>
      {overlays}
    </CampaignToolShell>
  );
}

export default CivilizationBuilderModule;