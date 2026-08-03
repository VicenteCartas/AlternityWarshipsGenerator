import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { ThemeMode } from '@app/theme';
import {
  DISTANCE_UNITS,
  SPEED_OF_LIGHT_MPS,
  STANDARD_GRAVITY_MPS2,
  calculateTravel,
  distanceToMeters,
  getCrewAccelerationEffects,
  getWarshipsScale,
  accelerationRatingToMps2,
  mpsToSpeedRating,
  speedRatingToMps,
  type AccelerationConversionMethod,
  type DistanceUnitId,
  type TravelProfile,
  type WarshipsScaleId,
} from './services/travelCalculationService';
import {
  assessEngineFuel,
  getImportedShipAccelerationMps2,
  loadTravelShipProfile,
  type ImportedTravelShip,
} from './services/travelShipImportService';
import {
  formatAcceleration,
  formatDistance,
  formatDuration,
  formatDurationTotal,
  formatRounds,
  formatVelocity,
} from './services/travelFormatters';

interface TravelModuleProps {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onReturnToHub: () => void;
}

type AccelerationSource = 'rating' | 'physical' | 'ship';
type PhysicalAccelerationUnit = 'g' | 'mps2';
type SpeedCapUnit = 'percent-c' | 'kmps' | 'rating';

function positiveNumber(raw: string): number {
  const value = Number(raw);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function TravelModule({
  themeMode,
  onThemeModeChange,
  onReturnToHub,
}: TravelModuleProps) {
  const [distance, setDistance] = useState(25);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnitId>('AU');
  const [scaleId, setScaleId] = useState<WarshipsScaleId>('pl7plus');
  const [accelerationSource, setAccelerationSource] = useState<AccelerationSource>('rating');
  const [accelerationConversionMethod, setAccelerationConversionMethod] = useState<AccelerationConversionMethod>('scale-derived');
  const [accelerationRating, setAccelerationRating] = useState(1);
  const [physicalAcceleration, setPhysicalAcceleration] = useState(1);
  const [physicalAccelerationUnit, setPhysicalAccelerationUnit] = useState<PhysicalAccelerationUnit>('g');
  const [profile, setProfile] = useState<TravelProfile>('rest-to-rest');
  const [speedCapEnabled, setSpeedCapEnabled] = useState(false);
  const [speedCap, setSpeedCap] = useState(1);
  const [speedCapUnit, setSpeedCapUnit] = useState<SpeedCapUnit>('percent-c');
  const [accelerationCompensated, setAccelerationCompensated] = useState(true);
  const [importedShip, setImportedShip] = useState<ImportedTravelShip | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    window.electronAPI?.setBuilderMode('travel');
  }, []);

  const scale = getWarshipsScale(scaleId);
  const distanceMeters = distanceToMeters(distance, distanceUnit, scaleId);
  const accelerationMps2 = accelerationSource === 'ship'
    ? importedShip
      ? getImportedShipAccelerationMps2(importedShip, accelerationConversionMethod)
      : 0
    : accelerationSource === 'physical'
      ? physicalAcceleration * (physicalAccelerationUnit === 'g' ? STANDARD_GRAVITY_MPS2 : 1)
      : accelerationRatingToMps2(accelerationRating, scaleId, accelerationConversionMethod);

  let speedCapMps: number | undefined;
  if (speedCapEnabled) {
    if (speedCapUnit === 'percent-c') speedCapMps = SPEED_OF_LIGHT_MPS * speedCap / 100;
    else if (speedCapUnit === 'kmps') speedCapMps = speedCap * 1_000;
    else speedCapMps = speedRatingToMps(speedCap, scaleId);
  }

  let calculationError: string | null = null;
  let result = null;
  if (distanceMeters > 0 && accelerationMps2 > 0) {
    try {
      result = calculateTravel({
        distanceMeters,
        accelerationMps2,
        profile,
        speedCapMps,
      });
    } catch (error) {
      calculationError = error instanceof Error ? error.message : 'The trip could not be calculated.';
    }
  }

  const physicalAccelerationG = accelerationMps2 / STANDARD_GRAVITY_MPS2;
  const experiencedAccelerationG = accelerationCompensated ? 0 : physicalAccelerationG;
  const crewEffects = getCrewAccelerationEffects(experiencedAccelerationG);
  const fuelAssessments = importedShip && result && accelerationSource === 'ship'
    ? assessEngineFuel(importedShip, result.shipBurnSeconds)
    : [];

  const cycleTheme = useCallback(() => {
    const modes: ThemeMode[] = ['dark', 'light', 'system'];
    const index = modes.indexOf(themeMode);
    onThemeModeChange(modes[(index + 1) % modes.length]);
  }, [themeMode, onThemeModeChange]);

  const handleScaleChange = (nextScale: WarshipsScaleId) => {
    setScaleId(nextScale);
    if (accelerationSource !== 'ship') setAccelerationCompensated(nextScale === 'pl7plus');
  };

  const handleImport = async () => {
    const api = window.electronAPI;
    if (!api) {
      setImportError('Ship import is only available in the desktop app.');
      return;
    }

    const dialogResult = await api.showOpenDialog();
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) return;

    setImporting(true);
    setImportError(null);
    const { profile: ship, error } = await loadTravelShipProfile(dialogResult.filePaths[0]);
    setImporting(false);
    if (!ship) {
      setImportError(error ?? 'The design could not be imported.');
      return;
    }

    setImportedShip(ship);
    setAccelerationSource('ship');
    setAccelerationCompensated(ship.hasAccelerationCompensation);
    if (ship.pl7AccelerationRating > 0) setScaleId('pl7plus');
    else setScaleId('pl6');
  };

  const handleImportMenu = useEffectEvent(() => {
    void handleImport();
  });

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onImportTravelShip) return;
    api.onImportTravelShip(() => handleImportMenu());
    return () => api.removeAllListeners('menu-import-travel-ship');
  }, []);

  const themeIcon = themeMode === 'dark'
    ? <DarkModeIcon />
    : themeMode === 'light'
      ? <LightModeIcon />
      : <SettingsBrightnessIcon />;

  const distanceOptions = [
    ...DISTANCE_UNITS,
    { id: 'hex' as const, label: `${scale.label} hexes`, shortLabel: 'hex', meters: scale.hexMeters },
  ];

  const phaseRows = result
    ? [
        {
          phase: 'Accelerate',
          externalSeconds: result.externalBurnSeconds / (profile === 'rest-to-rest' ? 2 : 1),
          shipSeconds: result.shipBurnSeconds / (profile === 'rest-to-rest' ? 2 : 1),
          distanceMeters: result.accelerationDistanceMeters,
        },
        ...(result.coastDistanceMeters > 0
          ? [{
              phase: 'Coast',
              externalSeconds: result.externalCoastSeconds,
              shipSeconds: result.shipCoastSeconds,
              distanceMeters: result.coastDistanceMeters,
            }]
          : []),
        ...(profile === 'rest-to-rest'
          ? [{
              phase: 'Brake',
              externalSeconds: result.externalBurnSeconds / 2,
              shipSeconds: result.shipBurnSeconds / 2,
              distanceMeters: result.accelerationDistanceMeters,
            }]
          : []),
      ]
    : [];
  const displayedExternalElapsed = result
    ? formatDurationTotal(phaseRows.map((phaseRow) => phaseRow.externalSeconds))
    : 'N/A';
  const displayedShipElapsed = result
    ? formatDurationTotal(phaseRows.map((phaseRow) => phaseRow.shipSeconds))
    : 'N/A';
  const summaryValueSx = {
    fontSize: '1.125rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: 0,
    lineHeight: 1.35,
    whiteSpace: { xl: 'nowrap' },
  } as const;

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar>
          <Tooltip title="Return to Hub">
            <IconButton color="inherit" onClick={onReturnToHub} aria-label="Return to hub">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <RouteIcon sx={{ ml: 1, mr: 1.5 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {APP_NAME} - Travel Calculator
          </Typography>
          <Tooltip title={`Theme: ${themeMode}`}>
            <IconButton color="inherit" onClick={cycleTheme} aria-label="Toggle theme">
              {themeIcon}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Container maxWidth={false} sx={{ flexGrow: 1, py: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(400px, 0.7fr) minmax(620px, 1.3fr)' },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <Paper sx={{ p: 2.5, minWidth: 0 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6">Trip</Typography>
                <Divider sx={{ mt: 1, mb: 2 }} />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Distance"
                    type="number"
                    value={distance}
                    onChange={(event) => setDistance(positiveNumber(event.target.value))}
                    slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                    fullWidth
                  />
                  <TextField
                    select
                    label="Unit"
                    value={distanceUnit}
                    onChange={(event) => setDistanceUnit(event.target.value as DistanceUnitId)}
                    sx={{ minWidth: 190 }}
                  >
                    {distanceOptions.map((unit) => (
                      <MenuItem key={unit.id} value={unit.id}>{unit.label}</MenuItem>
                    ))}
                  </TextField>
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6">Acceleration</Typography>
                <Divider sx={{ mt: 1, mb: 2 }} />
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={accelerationSource}
                  onChange={(_event, value: AccelerationSource | null) => value && setAccelerationSource(value)}
                  aria-label="Acceleration source"
                >
                  <ToggleButton value="rating">Warships</ToggleButton>
                  <ToggleButton value="physical">Physical</ToggleButton>
                  <ToggleButton value="ship" disabled={!importedShip}>Ship</ToggleButton>
                </ToggleButtonGroup>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  {accelerationSource !== 'physical' && (
                    <TextField
                      select
                      label="Acceleration calculation"
                      value={accelerationConversionMethod}
                      onChange={(event) => setAccelerationConversionMethod(
                        event.target.value as AccelerationConversionMethod,
                      )}
                      fullWidth
                    >
                      <MenuItem value="scale-derived">Scale-derived</MenuItem>
                      <MenuItem value="warships-published">Warships published</MenuItem>
                    </TextField>
                  )}

                  <TextField
                    select
                    label={accelerationSource === 'rating' ? 'Warships scale' : 'Reporting scale'}
                    value={scaleId}
                    onChange={(event) => handleScaleChange(event.target.value as WarshipsScaleId)}
                    fullWidth
                  >
                    <MenuItem value="pl6">Fusion Age (PL6) - 50 km / 5 min</MenuItem>
                    <MenuItem value="pl7plus">Standard (PL7+) - 1,000 km / 30 sec</MenuItem>
                  </TextField>

                  {accelerationSource === 'rating' && (
                    <TextField
                      label="Acceleration rating"
                      type="number"
                      value={accelerationRating}
                      onChange={(event) => setAccelerationRating(positiveNumber(event.target.value))}
                      slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                      fullWidth
                    />
                  )}

                  {accelerationSource === 'physical' && (
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Acceleration"
                        type="number"
                        value={physicalAcceleration}
                        onChange={(event) => setPhysicalAcceleration(positiveNumber(event.target.value))}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        fullWidth
                      />
                      <TextField
                        select
                        label="Unit"
                        value={physicalAccelerationUnit}
                        onChange={(event) => setPhysicalAccelerationUnit(event.target.value as PhysicalAccelerationUnit)}
                        sx={{ minWidth: 130 }}
                      >
                        <MenuItem value="g">g</MenuItem>
                        <MenuItem value="mps2">m/s^2</MenuItem>
                      </TextField>
                    </Stack>
                  )}

                  {accelerationSource === 'ship' && importedShip && (
                    <Box>
                      <Typography variant="subtitle1">{importedShip.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {importedShip.hullName} - PL {importedShip.progressLevel}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                        {importedShip.engines.map((engine) => (
                          <Chip
                            key={engine.engineTypeId}
                            label={`${engine.name}: Acc ${engine.accelerationRating.toLocaleString(undefined, { maximumFractionDigits: 3 })}`}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={handleImport}
                    disabled={importing}
                  >
                    {importing ? 'Reading Design...' : 'Import Warships Design'}
                  </Button>
                  {importError && <Alert severity="error">{importError}</Alert>}
                </Stack>
              </Box>

              <Box>
                <Typography variant="h6">Flight profile</Typography>
                <Divider sx={{ mt: 1, mb: 2 }} />
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  value={profile}
                  onChange={(_event, value: TravelProfile | null) => value && setProfile(value)}
                  aria-label="Flight profile"
                >
                  <ToggleButton value="rest-to-rest">Arrive at rest</ToggleButton>
                  <ToggleButton value="flyby">Flyby</ToggleButton>
                </ToggleButtonGroup>

                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={speedCapEnabled}
                        onChange={(event) => setSpeedCapEnabled(event.target.checked)}
                      />
                    )}
                    label="Cruise speed limit"
                  />
                  {speedCapEnabled && (
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Maximum speed"
                        type="number"
                        value={speedCap}
                        onChange={(event) => setSpeedCap(positiveNumber(event.target.value))}
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        fullWidth
                      />
                      <TextField
                        select
                        label="Unit"
                        value={speedCapUnit}
                        onChange={(event) => setSpeedCapUnit(event.target.value as SpeedCapUnit)}
                        sx={{ minWidth: 170 }}
                      >
                        <MenuItem value="percent-c">% of light</MenuItem>
                        <MenuItem value="kmps">km/s</MenuItem>
                        <MenuItem value="rating">Warships speed</MenuItem>
                      </TextField>
                    </Stack>
                  )}
                  <FormControlLabel
                    control={(
                      <Switch
                        checked={accelerationCompensated}
                        onChange={(event) => setAccelerationCompensated(event.target.checked)}
                      />
                    )}
                    label="Acceleration compensation"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 6.5, mt: -1 }}>
                    Cancels the acceleration felt by the crew without changing the ship's motion or travel time. Standard on PL7+ engines; normally unavailable to PL6 drives.
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Paper>

          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Paper sx={{ p: 2.5, minWidth: 0 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <AccessTimeIcon color="primary" />
                <Typography variant="h6">Travel result</Typography>
              </Stack>

              {(calculationError || !result) && (
                <Alert severity={calculationError ? 'error' : 'info'}>
                  {calculationError ?? 'Enter a distance and acceleration greater than zero.'}
                </Alert>
              )}

              {result && (
                <>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="text.secondary">External elapsed</Typography>
                      <Typography variant="h5" sx={summaryValueSx}>{displayedExternalElapsed}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Shipboard elapsed</Typography>
                      <Typography variant="h5" sx={summaryValueSx}>{displayedShipElapsed}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Peak speed</Typography>
                      <Typography variant="h5" sx={summaryValueSx}>{formatVelocity(result.peakSpeedMps)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Acceleration</Typography>
                      <Typography variant="h5" sx={summaryValueSx}>
                        {formatAcceleration(accelerationMps2)}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" sx={{ minWidth: 520 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Phase</TableCell>
                          <TableCell align="right">External time</TableCell>
                          <TableCell align="right">Ship time</TableCell>
                          <TableCell align="right">Distance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {phaseRows.map((phaseRow) => (
                          <TableRow key={phaseRow.phase}>
                            <TableCell>{phaseRow.phase}</TableCell>
                            <TableCell align="right">{formatDuration(phaseRow.externalSeconds)}</TableCell>
                            <TableCell align="right">{formatDuration(phaseRow.shipSeconds)}</TableCell>
                            <TableCell align="right">{formatDistance(phaseRow.distanceMeters)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    <Chip label={`Gamma ${result.peakGamma.toLocaleString(undefined, { maximumFractionDigits: 5 })}`} variant="outlined" />
                    <Chip label={`Classical estimate ${formatDuration(result.classicalElapsedSeconds)}`} variant="outlined" />
                    <Chip label={`Arrival ${profile === 'rest-to-rest' ? 'at rest' : formatVelocity(result.peakSpeedMps)}`} variant="outlined" />
                    {result.speedCapReached && <Chip label="Cruise limit reached" color="success" variant="outlined" />}
                  </Stack>
                </>
              )}
            </Paper>

            {result && (
              <Paper sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <SpeedIcon color="primary" />
                  <Typography variant="h6">Warships scale</Typography>
                </Stack>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">Scale</Typography>
                    <Typography>{scale.progressLevel} - {scale.label}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Trip rounds</Typography>
                    <Typography>{formatRounds(result.externalElapsedSeconds / scale.roundSeconds)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Burn rounds</Typography>
                    <Typography>{formatRounds(result.externalBurnSeconds / scale.roundSeconds)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Peak speed rating</Typography>
                    <Typography>{formatRounds(mpsToSpeedRating(result.peakSpeedMps, scaleId))}</Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            {result && (
              <Paper sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ mb: 1 }}>Crew exposure</Typography>
                {accelerationCompensated ? (
                  <Alert severity="success">
                    The ship accelerates at {physicalAccelerationG.toLocaleString(undefined, { maximumFractionDigits: 2 })} g externally, while compensation removes the sustained acceleration load felt by the crew.
                  </Alert>
                ) : (
                  <Stack spacing={1.5}>
                    <Alert severity={physicalAccelerationG > 3 ? 'warning' : 'info'}>
                      Experienced acceleration: {physicalAccelerationG.toLocaleString(undefined, { maximumFractionDigits: 3 })} g ({crewEffects.graphBand}).
                    </Alert>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle2">Protected crew</Typography>
                        <Typography variant="body2" color="text.secondary">{crewEffects.protected}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2">Unprotected crew</Typography>
                        <Typography variant="body2" color="text.secondary">{crewEffects.unprotected}</Typography>
                      </Box>
                    </Box>
                  </Stack>
                )}
              </Paper>
            )}

            {fuelAssessments.length > 0 && (
              <Paper sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                  <LocalGasStationIcon color="primary" />
                  <Typography variant="h6">Engine fuel</Typography>
                </Stack>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 650 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Engine</TableCell>
                        <TableCell align="right">Installed</TableCell>
                        <TableCell align="right">Required</TableCell>
                        <TableCell align="right">Remaining</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fuelAssessments.map((fuel) => (
                        <TableRow key={fuel.engineTypeId}>
                          <TableCell>{fuel.name}</TableCell>
                          <TableCell align="right">{fuel.fuelTankHullPoints.toFixed(2)} HP</TableCell>
                          <TableCell align="right">{fuel.requiredFuelHullPoints.toFixed(2)} HP</TableCell>
                          <TableCell align="right">{fuel.remainingFuelHullPoints.toFixed(2)} HP</TableCell>
                          <TableCell>
                            <Chip
                              label={fuel.requiresFuel
                                ? fuel.fuelOptional
                                  ? 'Fuel optional'
                                  : fuel.hasEnoughFuel ? 'Sufficient' : 'Insufficient'
                                : 'No fuel required'}
                              size="small"
                              color={fuel.hasEnoughFuel ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            )}

            {(accelerationSource !== 'physical' || importedShip?.warnings.length) && (
              <Stack spacing={1}>
                {accelerationSource !== 'physical' && (
                  <Alert severity={accelerationConversionMethod === 'warships-published' ? 'warning' : 'info'}>
                    {accelerationConversionMethod === 'warships-published'
                      ? 'Warships published conversion is active. It treats velocity gained per round as acceleration: Acceleration 1 is about 17 g at PL6 and 3,399 g at PL7+.'
                      : 'Scale-derived conversion is active. It divides velocity gained by the round duration: Acceleration 1 is about 0.0567 g at PL6 and 113.3 g at PL7+.'}
                  </Alert>
                )}
                {importedShip?.warnings.map((warning) => (
                  <Alert key={warning} severity="info">{warning}</Alert>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Container>

      <Box component="footer" sx={{ py: 1, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="caption">{APP_NAME} v{APP_VERSION}</Typography>
      </Box>
    </Box>
  );
}

export default TravelModule;