import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Button,
  IconButton,
  TextField,
  Chip,
  Alert,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import SpeedIcon from '@mui/icons-material/Speed';
import type { Hull } from '../types/hull';
import type { EngineType, InstalledEngine } from '../types/engine';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getEngineTypesForShipClass,
  calculateEnginePowerRequired,
  calculateEngineCost,
  calculateEngineFuelCost,
  calculateEngineEndurance,
  calculateTotalEngineStats,
  calculateHullPercentage,
  getAccelerationForPercentage,
  validateEngineInstallation,
  generateEngineInstallationId,
  formatEngineCost,
  getTechTrackName,
  formatAcceleration,
} from '../services/engineService';
import { formatCost } from '../services/formatters';

interface EngineSelectionProps {
  hull: Hull;
  installedEngines: InstalledEngine[];
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onEnginesChange: (engines: InstalledEngine[]) => void;
}

export function EngineSelection({
  hull,
  installedEngines,
  usedHullPoints,
  availablePower,
  designProgressLevel,
  designTechTracks,
  onEnginesChange,
}: EngineSelectionProps) {
  const [selectedType, setSelectedType] = useState<EngineType | null>(null);
  const [hullPointsInput, setHullPointsInput] = useState<string>('');
  const [fuelHullPointsInput, setFuelHullPointsInput] = useState<string>('');

  // Get engines filtered by ship class, then apply design constraints
  const availableEngines = useMemo(() => {
    const byShipClass = getEngineTypesForShipClass(hull.shipClass);
    return byShipClass.filter((engine) => {
      // Filter by progress level
      if (engine.progressLevel > designProgressLevel) {
        return false;
      }
      // Filter by tech tracks (if any are selected)
      if (designTechTracks.length > 0 && engine.techTracks.length > 0) {
        // Engine must have all its tech tracks in the allowed list
        const hasAllowedTech = engine.techTracks.every((track) => 
          designTechTracks.includes(track)
        );
        if (!hasAllowedTech) {
          return false;
        }
      }
      return true;
    });
  }, [hull.shipClass, designProgressLevel, designTechTracks]);

  const totalStats = useMemo(
    () => calculateTotalEngineStats(installedEngines, hull),
    [installedEngines, hull]
  );

  const handleTypeSelect = (engine: EngineType) => {
    setSelectedType(engine);
    setHullPointsInput(engine.minSize.toString());
    setFuelHullPointsInput(engine.requiresFuel ? '1' : '0');
  };

  const handleAddEngine = () => {
    if (!selectedType) return;

    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const fuelHullPoints = parseInt(fuelHullPointsInput, 10) || 0;

    // Calculate remaining power after current engines
    const remainingPower = availablePower - totalStats.totalPowerRequired;

    const validation = validateEngineInstallation(
      selectedType,
      hullPoints,
      fuelHullPoints,
      hull,
      usedHullPoints + totalStats.totalHullPoints,
      remainingPower
    );

    if (!validation.valid) {
      return;
    }

    const newInstallation: InstalledEngine = {
      id: generateEngineInstallationId(),
      type: selectedType,
      hullPoints,
      fuelHullPoints,
    };

    onEnginesChange([...installedEngines, newInstallation]);
    
    // Reset selection
    setSelectedType(null);
    setHullPointsInput('');
    setFuelHullPointsInput('');
  };

  const handleRemoveEngine = (id: string) => {
    onEnginesChange(installedEngines.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    onEnginesChange([]);
    setSelectedType(null);
    setHullPointsInput('');
    setFuelHullPointsInput('');
  };

  // Get validation errors for current selection
  const validationErrors = useMemo(() => {
    if (!selectedType) return [];
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const fuelHullPoints = parseInt(fuelHullPointsInput, 10) || 0;
    const remainingPower = availablePower - totalStats.totalPowerRequired;
    
    const validation = validateEngineInstallation(
      selectedType,
      hullPoints,
      fuelHullPoints,
      hull,
      usedHullPoints + totalStats.totalHullPoints,
      remainingPower
    );
    return validation.errors;
  }, [selectedType, hullPointsInput, fuelHullPointsInput, hull, usedHullPoints, totalStats.totalHullPoints, totalStats.totalPowerRequired, availablePower]);

  // Calculate preview stats for selected engine
  const previewStats = useMemo(() => {
    if (!selectedType) return null;
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const fuelHullPoints = parseInt(fuelHullPointsInput, 10) || 0;
    const hullPercentage = calculateHullPercentage(hull, hullPoints);
    const acceleration = getAccelerationForPercentage(selectedType.accelerationRatings, hullPercentage);
    
    return {
      powerRequired: calculateEnginePowerRequired(selectedType, hullPoints),
      engineCost: calculateEngineCost(selectedType, hullPoints),
      fuelCost: calculateEngineFuelCost(selectedType, fuelHullPoints),
      endurance: calculateEngineEndurance(selectedType, hullPoints, fuelHullPoints),
      totalHullPoints: hullPoints + fuelHullPoints,
      hullPercentage,
      acceleration,
    };
  }, [selectedType, hullPointsInput, fuelHullPointsInput, hull]);

  // Calculate remaining power
  const remainingPower = availablePower - totalStats.totalPowerRequired;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Step 4: Engines (Required)
        </Typography>
        {installedEngines.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        )}
      </Box>

      {/* Power status */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            label={`Available Power: ${availablePower}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Engines Using: ${totalStats.totalPowerRequired}`}
            color={totalStats.totalPowerRequired > availablePower ? 'error' : 'default'}
            variant="outlined"
          />
          <Chip
            label={`Remaining: ${remainingPower}`}
            color={remainingPower < 0 ? 'error' : 'success'}
            variant="outlined"
          />
          {totalStats.totalAcceleration > 0 && (
            <Chip
              icon={<SpeedIcon />}
              label={`Total Accel: ${totalStats.totalAcceleration} Mpp`}
              color="info"
            />
          )}
        </Box>
      </Paper>

      {/* Summary of installed engines */}
      {installedEngines.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Engines
          </Typography>
          <Stack spacing={1}>
            {installedEngines.map((installation) => {
              const powerRequired = calculateEnginePowerRequired(installation.type, installation.hullPoints);
              const cost = calculateEngineCost(installation.type, installation.hullPoints) + 
                          calculateEngineFuelCost(installation.type, installation.fuelHullPoints);
              const endurance = calculateEngineEndurance(
                installation.type, 
                installation.hullPoints, 
                installation.fuelHullPoints
              );
              const hullPercentage = calculateHullPercentage(hull, installation.hullPoints);
              const acceleration = getAccelerationForPercentage(installation.type.accelerationRatings, hullPercentage);
              
              return (
                <Box
                  key={installation.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    flexWrap: 'wrap',
                  }}
                >
                  <Typography variant="body2" sx={{ minWidth: 140 }}>
                    {installation.type.name}
                  </Typography>
                  <Chip
                    label={`${installation.hullPoints} HP (${hullPercentage.toFixed(1)}%)`}
                    size="small"
                    variant="outlined"
                  />
                  {installation.fuelHullPoints > 0 && (
                    <Chip
                      icon={<LocalGasStationIcon />}
                      label={`${installation.fuelHullPoints} HP fuel`}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  )}
                  <Chip
                    label={`${powerRequired} Power`}
                    size="small"
                    color="secondary"
                  />
                  <Chip
                    icon={<SpeedIcon />}
                    label={formatAcceleration(acceleration, installation.type.usesPL6Scale)}
                    size="small"
                    color="info"
                  />
                  <Chip
                    label={formatEngineCost(cost)}
                    size="small"
                    variant="outlined"
                  />
                  {endurance !== null && (
                    <Chip
                      label={`${endurance} thrust-days`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveEngine(installation.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Add new engine section */}
      {selectedType && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Configure {selectedType.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Hull Points"
              type="number"
              size="small"
              value={hullPointsInput}
              onChange={(e) => setHullPointsInput(e.target.value)}
              inputProps={{ min: selectedType.minSize }}
              helperText={`Min: ${selectedType.minSize}, Power: ${selectedType.powerPerHullPoint}/HP`}
              sx={{ width: 140 }}
            />
            {selectedType.requiresFuel && (
              <TextField
                label="Fuel HP"
                type="number"
                size="small"
                value={fuelHullPointsInput}
                onChange={(e) => setFuelHullPointsInput(e.target.value)}
                inputProps={{ min: 0 }}
                helperText={`Efficiency: ${selectedType.fuelEfficiency} days/HP`}
                sx={{ width: 140 }}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {previewStats && (
                <Typography variant="caption" color="text.secondary">
                  {previewStats.hullPercentage.toFixed(1)}% hull → {formatAcceleration(previewStats.acceleration, selectedType.usesPL6Scale)} | 
                  Power: {previewStats.powerRequired} | Cost: {formatEngineCost(previewStats.engineCost + previewStats.fuelCost)}
                  {previewStats.endurance !== null && ` | ${previewStats.endurance} thrust-days`}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddEngine}
                  disabled={validationErrors.length > 0}
                >
                  Add
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setSelectedType(null)}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Box>
          {validationErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {validationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}
        </Paper>
      )}

      {/* Engine Type Selection Table */}
      <TableContainer 
        component={Paper} 
        variant="outlined"
        sx={{ 
          overflowX: 'auto',
          '& .MuiTable-root': {
            minWidth: 1100,
          }
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Engine</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power/HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Base Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Min Size</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fuel</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Atmo</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>5%</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>10%</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>15%</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>20%</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>30%</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableEngines.map((engine) => {
              const isSelected = selectedType?.id === engine.id;
              const ratings = engine.accelerationRatings;

              return (
                <TableRow
                  key={engine.id}
                  hover
                  selected={isSelected}
                  sx={{
                    cursor: 'pointer',
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                  onClick={() => handleTypeSelect(engine)}
                >
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeSelect(engine);
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={engine.description} placement="right">
                      <Typography
                        variant="body2"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        {engine.name}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{engine.progressLevel}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={engine.techTracks.map(t => getTechTrackName(t)).join(', ') || 'None'}>
                      <Typography variant="caption">
                        {engine.techTracks.length > 0 ? engine.techTracks.join(', ') : 'None'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {engine.powerPerHullPoint}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatCost(engine.baseCost)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{formatCost(engine.costPerHullPoint)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{engine.minSize}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {engine.requiresFuel ? (
                      <Tooltip title={`Efficiency: ${engine.fuelEfficiency} thrust-days/HP, Cost: ${formatCost(engine.fuelCostPerHullPoint)}/HP`}>
                        <LocalGasStationIcon fontSize="small" color="warning" />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {engine.atmosphereSafe ? (
                      <Typography variant="caption" color="success.main">Yes</Typography>
                    ) : (
                      <Typography variant="caption" color="error.main">No</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {ratings.at5Percent || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {ratings.at10Percent || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {ratings.at15Percent || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {ratings.at20Percent || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {ratings.at30Percent || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Notes section */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Engine Notes
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          • Acceleration is based on the percentage of hull points allocated to engines (using base hull, not bonus)
          <br />
          • Multiple engines can be installed - their accelerations add together
          <br />
          • PL6 scale engines use a slower acceleration scale suitable for early tech levels
          <br />
          • Engines require power from your power plants to operate
          <br />
          • Fuel-burning engines need dedicated fuel tanks (separate from power plant fuel)
        </Typography>
      </Paper>
    </Box>
  );
}
