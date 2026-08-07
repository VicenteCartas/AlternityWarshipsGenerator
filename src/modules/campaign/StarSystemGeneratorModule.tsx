import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, IconButton, MenuItem, Paper, Snackbar, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FlareIcon from '@mui/icons-material/Flare';
import PublicIcon from '@mui/icons-material/Public';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import type { ThemeMode } from '@app/theme';
import { useNotification } from '@shared/hooks/useNotification';
import { generateStarSystem } from './services/starSystemGenerationService';
import type {
  GeneratedPlanet, GeneratedStarSystem, ScienceGenerationSettings, StarSystemGenerationModel,
} from './types/worldbuilding';
import { CampaignToolShell } from './components/CampaignToolShell';
import { useStarSystemSaveLoad } from './hooks/useCampaignSaveLoad';
import { exportStarSystemPdf } from './services/campaignPdfService';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { DocumentWelcome } from '@shared/components';
import {
  DEFAULT_SCIENCE_SETTINGS,
  generateScienceStarSystem,
} from './services/scienceStarSystemService';
import { formatGraphCode, GRAPH_LABELS } from './services/gmgScienceTranslationService';

interface StarSystemGeneratorModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type PendingSystemAction =
  | { type: 'generate' | 'new' | 'open' | 'welcome' | 'hub' }
  | { type: 'openPath'; filePath: string };

function planetColor(planet: GeneratedPlanet): string {
  if (planet.type.includes('Gas giant')) return '#d6a756';
  if (planet.type === 'Ocean world') return '#48a9d4';
  if (planet.type === 'Ice giant' || planet.type === 'Dwarf planet') return '#8fc6d6';
  if (planet.type.includes('hot')) return '#d66b4c';
  if (planet.type.includes('temperate')) return '#4e9c78';
  if (planet.type.includes('cold')) return '#77a9c7';
  return '#9b93a7';
}

function orbitRadius(system: GeneratedStarSystem, planet: GeneratedPlanet): number {
  if (system.generationModel !== 'science' || system.planets.length < 2) return 9 + planet.ring / 16 * 37;
  const distances = system.planets.map((entry) => entry.distanceAu).filter((distance) => distance > 0);
  const minimum = Math.min(...distances);
  const maximum = Math.max(...distances);
  if (maximum <= minimum) return 28;
  const fraction = (Math.log(planet.distanceAu) - Math.log(minimum)) / (Math.log(maximum) - Math.log(minimum));
  return 12 + fraction * 34;
}

function OrbitDiagram({
  system,
  selectedPlanetId,
  onSelect,
}: {
  system: GeneratedStarSystem;
  selectedPlanetId: string | null;
  onSelect: (planetId: string) => void;
}) {
  return (
    <Box
      aria-label="Generated orbit diagram"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 440,
        aspectRatio: '1',
        mx: 'auto',
        overflow: 'hidden',
        bgcolor: '#090d16',
        border: 1,
        borderColor: 'divider',
      }}
    >
      {system.planets.map((planet) => {
        const size = orbitRadius(system, planet) * 2;
        return (
          <Box
            key={`orbit-${planet.id}`}
            sx={{
              position: 'absolute',
              width: `${size}%`,
              height: `${size}%`,
              left: `${50 - size / 2}%`,
              top: `${50 - size / 2}%`,
              border: '1px solid rgba(180, 205, 230, 0.22)',
              borderRadius: '50%',
            }}
          />
        );
      })}
      <FlareIcon
        aria-label={`${system.stars.length} star system`}
        sx={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          color: '#ffd166', fontSize: 38, filter: 'drop-shadow(0 0 8px rgba(255,209,102,.7))',
        }}
      />
      {system.planets.map((planet) => {
        const radius = orbitRadius(system, planet);
        const angle = planet.ring * 137.5 * Math.PI / 180;
        const left = 50 + Math.cos(angle) * radius;
        const top = 50 + Math.sin(angle) * radius;
        return (
          <Tooltip key={planet.id} title={`${system.generationModel === 'science' ? 'Planet' : 'Ring'} ${planet.ring}: ${planet.type}`}>
            <IconButton
              size="small"
              aria-label={`Select ${system.generationModel === 'science' ? 'Planet' : 'Ring'} ${planet.ring} ${planet.type}`}
              onClick={() => onSelect(planet.id)}
              sx={{
                position: 'absolute', left: `${left}%`, top: `${top}%`, transform: 'translate(-50%, -50%)',
                color: planetColor(planet), p: 0.25,
                outline: selectedPlanetId === planet.id ? '2px solid #fff' : 'none',
                outlineOffset: 1,
              }}
            >
              <FiberManualRecordIcon sx={{ fontSize: planet.type.includes('Gas giant') ? 20 : 14 }} />
            </IconButton>
          </Tooltip>
        );
      })}
      {system.planets.length === 0 && (
        <Typography
          variant="body2"
          sx={{ position: 'absolute', left: 16, right: 16, bottom: 16, color: 'rgba(255,255,255,.7)', textAlign: 'center' }}
        >
          No occupied orbit tracks
        </Typography>
      )}
    </Box>
  );
}

function PlanetDetails({ planet }: { planet: GeneratedPlanet | null }) {
  if (!planet) {
    return <Typography color="text.secondary">Generate a system with occupied orbit tracks to inspect a body.</Typography>;
  }
  const environment = planet.environment;
  const science = planet.science;
  const translation = planet.gmgTranslation;
  const presentLife = environment?.life.filter((life) => life.present) ?? [];
  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography variant="h6">{science ? 'Planet' : 'Ring'} {planet.ring}: {planet.type}</Typography>
        <Typography variant="body2" color="text.secondary">
          {planet.distanceAu} AU{science ? ` | ${science.orbitalPeriodDays.toLocaleString()} day year` : ` | Planet roll ${planet.typeRoll}`}
        </Typography>
      </Box>
      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        <Chip label={`${planet.moons.length} moon${planet.moons.length === 1 ? '' : 's'}`} variant="outlined" />
        {science && <Chip label={`${science.massEarth.toLocaleString()} M Earth`} variant="outlined" />}
        {science && <Chip label={`${science.radiusEarth.toLocaleString()} R Earth`} variant="outlined" />}
        {science && <Chip label={`${science.gravityEarth.toLocaleString()} g`} variant="outlined" />}
        {science && <Chip label={`HZ: ${science.habitableZonePosition}`} color={science.habitableZonePosition === 'within' ? 'success' : 'default'} variant="outlined" />}
        {science && <Chip label={science.habitability} color={science.habitability === 'potentially habitable' ? 'success' : science.habitability === 'marginal' ? 'warning' : 'default'} variant="outlined" />}
        {environment && <Chip label={`Environment Class ${environment.environmentClass}`} color={environment.environmentClass <= 2 ? 'success' : 'warning'} variant="outlined" />}
        {environment?.oceanExtent && <Chip label={`${environment.oceanExtent} oceans`} color="primary" variant="outlined" />}
        {environment?.climate && <Chip label={`${environment.climate} climate`} variant="outlined" />}
        {environment?.landforms && <Chip label={`${environment.landforms} landforms`} variant="outlined" />}
      </Stack>
      {environment && (
        <Typography variant="body2">
          G{environment.gravity} / R{environment.radiation} / A{environment.atmosphere} / P{environment.pressure} / H{environment.heat}
          {' '} (environment roll {environment.roll})
        </Typography>
      )}
      {science && (
        <Typography variant="body2">
          {science.composition}; {science.densityGcm3} g/cm3; {science.equilibriumTempK} K; eccentricity {science.eccentricity}.
          {' '}{science.tidallyLocked ? 'Tidally locked.' : `Rotation ${science.rotationHours} hours.`}
        </Typography>
      )}
      {science && (
        <Typography variant="body2" color="text.secondary">
          Atmosphere: {science.atmosphere} ({science.surfacePressureAtm.toLocaleString()} atm). Water: {science.water}. Life: {science.life}.
        </Typography>
      )}
      {translation && (
        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
              <Box>
                <Typography variant="subtitle2">GMG game translation</Typography>
                <Typography variant="body2" color="text.secondary">{translation.planetType}</Typography>
              </Box>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
                <Chip label={`Class ${translation.environmentClass}`} color={translation.environmentClass <= 2 ? 'success' : 'warning'} size="small" variant="outlined" />
                <Chip label={formatGraphCode(translation)} size="small" variant="outlined" />
              </Stack>
            </Stack>
            <Typography variant="body2">
              G{translation.gravity} {GRAPH_LABELS.gravity[translation.gravity]};
              {' '}R{translation.radiation} {GRAPH_LABELS.radiation[translation.radiation]};
              {' '}A{translation.atmosphere} {GRAPH_LABELS.atmosphere[translation.atmosphere]};
              {' '}P{translation.pressure} {GRAPH_LABELS.pressure[translation.pressure]};
              {' '}H{translation.heat} {GRAPH_LABELS.heat[translation.heat]}.
            </Typography>
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              {translation.oceanExtent && <Chip label={`${translation.oceanExtent} oceans`} size="small" variant="outlined" />}
              {translation.climate && <Chip label={`${translation.climate} climate`} size="small" variant="outlined" />}
              {translation.landforms && <Chip label={`${translation.landforms} landforms`} size="small" variant="outlined" />}
              {translation.lifeSeries.length > 0 && <Chip label={`Life Series ${translation.lifeSeries.join(', ')}`} size="small" color="success" variant="outlined" />}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Approximate adapter: radiation, magnetic protection, atmospheric breathability, and greenhouse warming are inferred from the simplified physical model.
            </Typography>
          </Stack>
        </Box>
      )}
      {planet.moons.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          Moons: {planet.moons.map((moon) => moon.science
            ? `${moon.type} (${moon.science.massEarth} M Earth, ${moon.science.orbitalPeriodDays} days)`
            : `${moon.type} (${moon.roll})`).join(', ')}
        </Typography>
      )}
      {environment && (
        <Typography variant="body2" color="text.secondary">
          Life: {presentLife.length > 0
            ? presentLife.map((life) => `Series ${life.series}, ${life.base}/${life.breathes} (d8 ${life.roll})`).join('; ')
            : environment.life.length > 0 ? 'Candidate series failed their life rolls' : 'No supported life series'}
        </Typography>
      )}
    </Stack>
  );
}

export function StarSystemGeneratorModule(props: StarSystemGeneratorModuleProps) {
  const [mode, setMode] = useState<'welcome' | 'editor'>('welcome');
  const [starCount, setStarCount] = useState<number | 'random'>('random');
  const [generationModel, setGenerationModel] = useState<StarSystemGenerationModel>('gmg');
  const [scienceSeed, setScienceSeed] = useState('Horizon');
  const [scienceSettings, setScienceSettings] = useState<ScienceGenerationSettings>(DEFAULT_SCIENCE_SETTINGS);
  const [systemName, setSystemName] = useState('Unnamed System');
  const [system, setSystem] = useState(() => generateStarSystem());
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(system.planets[0]?.id ?? null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingSystemAction | null>(null);
  const saveLoad = useStarSystemSaveLoad();
  const { snackbar, showNotification, handleCloseSnackbar } = useNotification();
  const selectedPlanet = system.planets.find((planet) => planet.id === selectedPlanetId) ?? system.planets[0] ?? null;

  const regenerate = () => {
    const next = generationModel === 'science'
      ? generateScienceStarSystem({
          seed: scienceSeed,
          ...(starCount === 'random' ? {} : { starCount }),
          settings: scienceSettings,
        })
      : generateStarSystem(starCount === 'random' ? {} : { starCount });
    setSystem(next);
    setSelectedPlanetId(next.planets[0]?.id ?? null);
    setHasUnsavedChanges(true);
  };
  const lifeBearingCount = system.planets.filter((planet) => (
    planet.science ? planet.science.life !== 'none' : planet.environment?.life.some((life) => life.present)
  )).length;
  const handleSave = async (saveAs = false) => {
    const result = saveAs
      ? await saveLoad.saveAs({ name: systemName, system })
      : await saveLoad.save({ name: systemName, system });
    if (result.ok) setHasUnsavedChanges(false);
    showNotification(result.message, result.severity);
  };
  const handleOpen = async () => {
    const result = await saveLoad.open();
    if (result.ok && result.value) {
      setSystemName(result.value.name);
      setSystem(result.value.system);
      setSelectedPlanetId(result.value.system.planets[0]?.id ?? null);
      setStarCount('random');
      setGenerationModel(result.value.system.generationModel);
      setScienceSeed(result.value.system.seed || 'Horizon');
      setScienceSettings(result.value.system.scienceSettings || DEFAULT_SCIENCE_SETTINGS);
      setHasUnsavedChanges(false);
      setMode('editor');
    }
    if (result.severity !== 'info') showNotification(result.message, result.severity);
  };
  const handleOpenPath = async (filePath: string) => {
    const result = await saveLoad.openPath(filePath);
    if (result.ok && result.value) {
      setSystemName(result.value.name);
      setSystem(result.value.system);
      setSelectedPlanetId(result.value.system.planets[0]?.id ?? null);
      setStarCount('random');
      setGenerationModel(result.value.system.generationModel);
      setScienceSeed(result.value.system.seed || 'Horizon');
      setScienceSettings(result.value.system.scienceSettings || DEFAULT_SCIENCE_SETTINGS);
      setHasUnsavedChanges(false);
      setMode('editor');
    }
    showNotification(result.message, result.severity);
  };
  const handleExportPdf = async () => {
    try {
      const savedTo = await exportStarSystemPdf({ name: systemName, system });
      showNotification(`Star system PDF saved to ${savedTo}`, 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Failed to export star system PDF.', 'error');
    }
  };
  const runAction = (action: PendingSystemAction) => {
    if (action.type === 'generate') regenerate();
    else if (action.type === 'new') {
      saveLoad.clearFile();
      setSystemName('Unnamed System');
      setStarCount('random');
      setGenerationModel('gmg');
      setScienceSeed('Horizon');
      setScienceSettings(DEFAULT_SCIENCE_SETTINGS);
      const next = generateStarSystem();
      setSystem(next);
      setSelectedPlanetId(next.planets[0]?.id ?? null);
      setHasUnsavedChanges(false);
    } else if (action.type === 'open') void handleOpen();
    else if (action.type === 'openPath') void handleOpenPath(action.filePath);
    else if (action.type === 'welcome') setMode('welcome');
    else props.onReturnToHub();
    if (action.type === 'new') setMode('editor');
  };
  const requestAction = (action: PendingSystemAction) => {
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
    if (mode === 'welcome') window.electronAPI?.setBuilderMode('star-system-welcome');
  }, [mode]);

  const overlays = (
    <>
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved star system changes?"
        message="This action replaces or closes the current star system. Unsaved changes will be lost."
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
          kind="star-system"
          title="Star System Generator"
          description="Generate stellar systems with GMG tables or a seeded science-informed model"
          icon={<PublicIcon sx={{ fontSize: 36 }} />}
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
      title="Star System Generator"
      mode="star-system-editor"
      icon={<PublicIcon />}
      {...props}
      onReturnToHub={() => requestAction({ type: 'hub' })}
    >
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h5" component="h1">Star System Generator</Typography>
            <Typography color="text.secondary">
              {system.generationModel === 'science' ? 'Seeded, science-informed generation' : 'Gamemaster Guide tables G58-G68'}
            </Typography>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            gap={1.5}
            alignItems={{ sm: 'center' }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              size="small"
              label="System name"
              value={systemName}
              onChange={(event) => { setSystemName(event.target.value); setHasUnsavedChanges(true); }}
              sx={{ minWidth: 220 }}
            />
            <TextField
              select
              size="small"
              label="Stars"
              value={starCount}
              onChange={(event) => setStarCount(event.target.value === 'random' ? 'random' : Number(event.target.value))}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="random">{generationModel === 'science' ? 'Random multiplicity' : 'Random (G58)'}</MenuItem>
              {Array.from({ length: generationModel === 'science' ? 3 : 6 }, (_value, index) => index + 1)
                .map((count) => <MenuItem key={count} value={count}>{count}</MenuItem>)}
            </TextField>
            <Button variant="contained" startIcon={<CasinoIcon />} onClick={() => requestAction({ type: 'generate' })}>Generate</Button>
            <Button startIcon={<FolderOpenIcon />} onClick={() => requestAction({ type: 'open' })}>Open</Button>
            <Button startIcon={<SaveIcon />} onClick={() => handleSave(false)}>Save</Button>
            <Tooltip title="Save As"><IconButton aria-label="Save star system as" onClick={() => handleSave(true)}><SaveAsIcon /></IconButton></Tooltip>
            <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdf}>Export PDF</Button>
          </Stack>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              value={generationModel}
              onChange={(_event, value: StarSystemGenerationModel | null) => {
                if (!value) return;
                setGenerationModel(value);
                if (value === 'science' && starCount !== 'random' && starCount > 3) setStarCount('random');
              }}
              aria-label="Generation model"
              fullWidth
            >
              <ToggleButton value="gmg">GMG Rules</ToggleButton>
              <ToggleButton value="science">Science-informed</ToggleButton>
            </ToggleButtonGroup>
            {generationModel === 'science' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
                <TextField label="Seed" value={scienceSeed} onChange={(event) => setScienceSeed(event.target.value)} />
                <TextField
                  select
                  label="System density"
                  value={scienceSettings.systemDensity}
                  onChange={(event) => setScienceSettings({ ...scienceSettings, systemDensity: event.target.value as ScienceGenerationSettings['systemDensity'] })}
                >
                  <MenuItem value="sparse">Sparse</MenuItem><MenuItem value="typical">Typical</MenuItem><MenuItem value="crowded">Crowded</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Planet occurrence"
                  value={scienceSettings.planetOccurrence}
                  onChange={(event) => setScienceSettings({ ...scienceSettings, planetOccurrence: event.target.value as ScienceGenerationSettings['planetOccurrence'] })}
                >
                  <MenuItem value="conservative">Conservative</MenuItem><MenuItem value="observed">Observed</MenuItem><MenuItem value="optimistic">Optimistic</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Life frequency"
                  value={scienceSettings.lifeFrequency}
                  onChange={(event) => setScienceSettings({ ...scienceSettings, lifeFrequency: event.target.value as ScienceGenerationSettings['lifeFrequency'] })}
                >
                  <MenuItem value="none">None</MenuItem><MenuItem value="rare">Rare</MenuItem><MenuItem value="common">Common</MenuItem>
                </TextField>
              </Box>
            )}
            {generationModel === 'science' && (
              <Alert severity="info">
                Uses observed occurrence trends and simplified stellar, orbital, atmosphere, and climate models. Results are physically constrained, not a full formation simulation.
              </Alert>
            )}
          </Stack>
        </Paper>

        <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
          <Chip label={system.generationModel === 'science' ? 'Science-informed' : 'GMG Rules'} color="primary" variant="outlined" />
          <Chip
            label={`${system.starCountLabel} ${system.starCount === 1 ? 'star' : 'stars'}`}
            color="primary"
            variant="outlined"
          />
          {system.generationModel === 'gmg' && <Chip label={`Orbit Track ${system.orbitTrack}`} variant="outlined" />}
          {system.generationModel === 'science' && <Chip label={`Seed: ${system.seed}`} variant="outlined" />}
          {system.science && <Chip label={`${system.science.ageGyr} Gyr`} variant="outlined" />}
          {system.science && <Chip label={`${system.science.metallicityDex >= 0 ? '+' : ''}${system.science.metallicityDex} dex`} variant="outlined" />}
          {system.science && <Chip label={system.science.architecture} variant="outlined" />}
          {system.science && <Chip label={`HZ ${system.science.habitableZoneInnerAu}-${system.science.habitableZoneOuterAu} AU`} variant="outlined" />}
          <Chip
            label={system.generationModel === 'science'
              ? `${system.planets.length} planets generated`
              : `${system.planets.length}/${system.potentialPlanetCount} bodies placed`}
            variant="outlined"
          />
          <Chip label={`${lifeBearingCount} life-bearing`} color={lifeBearingCount > 0 ? 'success' : 'default'} variant="outlined" />
          <Chip label={systemName || 'Unnamed System'} variant="outlined" />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(340px, .75fr) minmax(620px, 1.25fr)' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
            <OrbitDiagram system={system} selectedPlanetId={selectedPlanet?.id ?? null} onSelect={setSelectedPlanetId} />
            <Stack spacing={0.5} sx={{ mt: 2 }}>
              {system.stars.map((star) => (
                <Stack key={star.id} direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2">Group {star.group} {star.role}</Typography>
                  <Typography variant="body2" fontWeight={600} textAlign="right">
                    {star.classification} | {star.color}
                    {star.science ? ` | ${star.science.massSolar} M Sun | ${star.science.luminositySolar} L Sun` : ''}
                    {star.science?.separationAu ? ` | ${star.science.separationAu} AU` : ''}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>

          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Paper variant="outlined" sx={{ p: 2 }}><PlanetDetails planet={selectedPlanet} /></Paper>
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: system.generationModel === 'science' ? 1020 : 760 }}>
                <TableHead>
                  {system.generationModel === 'science' ? (
                    <TableRow>
                      <TableCell>Orbit</TableCell><TableCell>Body</TableCell><TableCell>Mass</TableCell>
                      <TableCell>Radius</TableCell><TableCell>Temperature</TableCell><TableCell>Year</TableCell>
                      <TableCell>HZ</TableCell><TableCell>Life</TableCell><TableCell>GMG</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell>Orbit</TableCell><TableCell>Body</TableCell><TableCell>Moons</TableCell>
                      <TableCell>Environment</TableCell><TableCell>Oceans</TableCell><TableCell>Life</TableCell>
                    </TableRow>
                  )}
                </TableHead>
                <TableBody>
                  {system.planets.map((planet) => {
                    const life = planet.environment?.life.filter((entry) => entry.present) ?? [];
                    return (
                      system.generationModel === 'science' ? (
                        <TableRow
                          key={planet.id}
                          hover
                          selected={planet.id === selectedPlanet?.id}
                          onClick={() => setSelectedPlanetId(planet.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{planet.distanceAu} AU</TableCell><TableCell>{planet.type}</TableCell>
                          <TableCell>{planet.science?.massEarth} M Earth</TableCell><TableCell>{planet.science?.radiusEarth} R Earth</TableCell>
                          <TableCell>{planet.science?.equilibriumTempK} K</TableCell><TableCell>{planet.science?.orbitalPeriodDays} d</TableCell>
                          <TableCell>{planet.science?.habitableZonePosition}</TableCell><TableCell>{planet.science?.life}</TableCell>
                          <TableCell>{planet.gmgTranslation ? `Class ${planet.gmgTranslation.environmentClass}; ${formatGraphCode(planet.gmgTranslation)}` : '-'}</TableCell>
                        </TableRow>
                      ) : <TableRow
                        key={planet.id}
                        hover
                        selected={planet.id === selectedPlanet?.id}
                        onClick={() => setSelectedPlanetId(planet.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>Ring {planet.ring}<Typography variant="caption" display="block">{planet.distanceAu} AU</Typography></TableCell>
                        <TableCell>{planet.type}</TableCell>
                        <TableCell>{planet.moons.length}</TableCell>
                        <TableCell>{planet.environment ? `Class ${planet.environment.environmentClass}` : '-'}</TableCell>
                        <TableCell>{planet.environment?.oceanExtent ?? '-'}</TableCell>
                        <TableCell>{life.length > 0 ? life.map((entry) => entry.series).join(', ') : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                  {system.planets.length === 0 && (
                    <TableRow><TableCell colSpan={system.generationModel === 'science' ? 9 : 6} align="center">No bodies occupied an orbit track.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </Box>
      </Stack>
      {overlays}
    </CampaignToolShell>
  );
}

export default StarSystemGeneratorModule;