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
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import type { Hull } from '../types/hull';
import type { PowerPlantType, InstalledPowerPlant } from '../types/powerPlant';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getPowerPlantTypesForShipClass,
  calculatePowerGenerated,
  calculatePowerPlantCost,
  calculateFuelCost,
  calculateEnduranceDays,
  calculateTotalPowerPlantStats,
  validatePowerPlantInstallation,
  generateInstallationId,
  formatPowerPlantCost,
  getTechTrackName,
} from '../services/powerPlantService';
import { formatCost } from '../services/formatters';

interface PowerPlantSelectionProps {
  hull: Hull;
  installedPowerPlants: InstalledPowerPlant[];
  usedHullPoints: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onPowerPlantsChange: (powerPlants: InstalledPowerPlant[]) => void;
}

export function PowerPlantSelection({
  hull,
  installedPowerPlants,
  usedHullPoints,
  designProgressLevel,
  designTechTracks,
  onPowerPlantsChange,
}: PowerPlantSelectionProps) {
  const [selectedType, setSelectedType] = useState<PowerPlantType | null>(null);
  const [hullPointsInput, setHullPointsInput] = useState<string>('');
  const [fuelHullPointsInput, setFuelHullPointsInput] = useState<string>('');
  const [editingInstallationId, setEditingInstallationId] = useState<string | null>(null);

  // Get power plants filtered by ship class, then apply design constraints
  const availablePowerPlants = useMemo(() => {
    const byShipClass = getPowerPlantTypesForShipClass(hull.shipClass);
    return byShipClass.filter((plant) => {
      // Filter by progress level
      if (plant.progressLevel > designProgressLevel) {
        return false;
      }
      // Filter by tech tracks (if any are selected)
      if (designTechTracks.length > 0 && plant.techTracks.length > 0) {
        // Plant must have all its tech tracks in the allowed list
        const hasAllowedTech = plant.techTracks.every((track) => 
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
    () => calculateTotalPowerPlantStats(installedPowerPlants),
    [installedPowerPlants]
  );

  const handleTypeSelect = (plant: PowerPlantType) => {
    setSelectedType(plant);
    setHullPointsInput(plant.minSize.toString());
    setFuelHullPointsInput(plant.requiresFuel ? '1' : '0');
  };

  const handleAddPowerPlant = () => {
    if (!selectedType) return;

    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const fuelHullPoints = parseInt(fuelHullPointsInput, 10) || 0;

    // When editing, exclude the current installation from validation
    const plantsForValidation = editingInstallationId
      ? installedPowerPlants.filter((p) => p.installationId !== editingInstallationId)
      : installedPowerPlants;
    
    const hpUsedByOtherPlants = editingInstallationId
      ? calculateTotalPowerPlantStats(plantsForValidation).totalHullPoints
      : totalStats.totalHullPoints;

    const validation = validatePowerPlantInstallation(
      selectedType,
      hullPoints,
      fuelHullPoints,
      hull,
      plantsForValidation,
      usedHullPoints + hpUsedByOtherPlants
    );

    if (!validation.valid) {
      // Errors will be shown in the UI
      return;
    }

    if (editingInstallationId) {
      // Update existing installation
      const updatedInstallation: InstalledPowerPlant = {
        installationId: editingInstallationId,
        type: selectedType,
        hullPoints,
        fuelHullPoints,
      };
      onPowerPlantsChange(
        installedPowerPlants.map((p) =>
          p.installationId === editingInstallationId ? updatedInstallation : p
        )
      );
    } else {
      // Add new installation
      const newInstallation: InstalledPowerPlant = {
        installationId: generateInstallationId(),
        type: selectedType,
        hullPoints,
        fuelHullPoints,
      };
      onPowerPlantsChange([...installedPowerPlants, newInstallation]);
    }
    
    // Reset selection
    setSelectedType(null);
    setHullPointsInput('');
    setFuelHullPointsInput('');
    setEditingInstallationId(null);
  };

  const handleRemovePowerPlant = (installationId: string) => {
    onPowerPlantsChange(
      installedPowerPlants.filter((p) => p.installationId !== installationId)
    );
  };

  const handleEditPowerPlant = (installation: InstalledPowerPlant) => {
    setSelectedType(installation.type);
    setHullPointsInput(installation.hullPoints.toString());
    setFuelHullPointsInput(installation.fuelHullPoints.toString());
    setEditingInstallationId(installation.installationId);
  };

  const handleClearAll = () => {
    onPowerPlantsChange([]);
    setSelectedType(null);
    setHullPointsInput('');
    setFuelHullPointsInput('');
    setEditingInstallationId(null);
  };

  // Get validation errors for current selection
  const validationErrors = useMemo(() => {
    if (!selectedType) return [];
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const fuelHullPoints = parseInt(fuelHullPointsInput, 10) || 0;
    
    // When editing, exclude the current installation from validation
    const plantsForValidation = editingInstallationId
      ? installedPowerPlants.filter((p) => p.installationId !== editingInstallationId)
      : installedPowerPlants;
    
    const hpUsedByOtherPlants = editingInstallationId
      ? calculateTotalPowerPlantStats(plantsForValidation).totalHullPoints
      : totalStats.totalHullPoints;
    
    const validation = validatePowerPlantInstallation(
      selectedType,
      hullPoints,
      fuelHullPoints,
      hull,
      plantsForValidation,
      usedHullPoints + hpUsedByOtherPlants
    );
    return validation.errors;
  }, [selectedType, hullPointsInput, fuelHullPointsInput, hull, installedPowerPlants, usedHullPoints, totalStats.totalHullPoints, editingInstallationId]);

  // Calculate preview stats for selected power plant
  const previewStats = useMemo(() => {
    if (!selectedType) return null;
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const fuelHullPoints = parseInt(fuelHullPointsInput, 10) || 0;
    
    return {
      power: calculatePowerGenerated(selectedType, hullPoints),
      plantCost: calculatePowerPlantCost(selectedType, hullPoints),
      fuelCost: calculateFuelCost(selectedType, fuelHullPoints),
      endurance: calculateEnduranceDays(selectedType, hullPoints, fuelHullPoints),
      totalHullPoints: hullPoints + fuelHullPoints,
    };
  }, [selectedType, hullPointsInput, fuelHullPointsInput]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Step 3: Power Plant (Required)
        </Typography>
        {installedPowerPlants.length > 0 && (
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

      {/* Summary of installed power plants */}
      {installedPowerPlants.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Power Plants
          </Typography>
          <Stack spacing={1}>
            {installedPowerPlants.map((installation) => {
              const power = calculatePowerGenerated(installation.type, installation.hullPoints);
              const cost = calculatePowerPlantCost(installation.type, installation.hullPoints) + 
                          calculateFuelCost(installation.type, installation.fuelHullPoints);
              const endurance = calculateEnduranceDays(
                installation.type, 
                installation.hullPoints, 
                installation.fuelHullPoints
              );
              
              return (
                <Box
                  key={installation.installationId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {installation.type.name}
                  </Typography>
                  <Chip
                    label={`${installation.hullPoints} HP`}
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
                    label={`${power} Power`}
                    size="small"
                    color="primary"
                  />
                  <Chip
                    label={formatPowerPlantCost(cost)}
                    size="small"
                    variant="outlined"
                  />
                  {endurance !== null && (
                    <Chip
                      label={`${endurance} days`}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  )}
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleEditPowerPlant(installation)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemovePowerPlant(installation.installationId)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Add new power plant section */}
      {selectedType && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingInstallationId ? 'Edit' : 'Configure'} {selectedType.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Hull Points"
              type="number"
              size="small"
              value={hullPointsInput}
              onChange={(e) => setHullPointsInput(e.target.value)}
              inputProps={{ 
                min: selectedType.minSize, 
                max: selectedType.maxSize > 0 ? selectedType.maxSize : undefined 
              }}
              helperText={`Min: ${selectedType.minSize}${selectedType.maxSize > 0 ? `, Max: ${selectedType.maxSize}` : ''}`}
              sx={{ width: 120 }}
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
                sx={{ width: 120 }}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {previewStats && (
                <Typography variant="caption" color="text.secondary">
                  Power: {previewStats.power} | Cost: {formatPowerPlantCost(previewStats.plantCost + previewStats.fuelCost)}
                  {previewStats.endurance !== null && ` | Endurance: ${previewStats.endurance} days`}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={editingInstallationId ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddPowerPlant}
                  disabled={validationErrors.length > 0}
                >
                  {editingInstallationId ? 'Update' : 'Add'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedType(null);
                    setEditingInstallationId(null);
                  }}
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

      {/* Power Plant Type Selection Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 150, whiteSpace: 'nowrap' }}>Power Plant</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Power/HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Base Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 80, whiteSpace: 'nowrap' }}>Min/Max</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Fuel</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availablePowerPlants.map((plant) => {
              const isSelected = selectedType?.id === plant.id;

              return (
                <TableRow
                  key={plant.id}
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
                  onClick={() => handleTypeSelect(plant)}
                >
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTypeSelect(plant);
                      }}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                    >
                      {plant.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{plant.progressLevel}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={plant.techTracks.map(t => getTechTrackName(t)).join(', ') || 'None'}>
                      <Typography variant="caption">
                        {plant.techTracks.length > 0 ? plant.techTracks.join(', ') : 'None'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {plant.powerPerHullPoint}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{formatCost(plant.baseCost)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{formatCost(plant.costPerHullPoint)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {plant.minSize}/{plant.maxSize > 0 ? plant.maxSize : '∞'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {plant.requiresFuel ? (
                      <Tooltip title={`Efficiency: ${plant.fuelEfficiency} power-days/HP, Cost: ${formatCost(plant.fuelCostPerHullPoint)}/HP`}>
                        <LocalGasStationIcon fontSize="small" color="warning" />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">No</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={plant.description} placement="left">
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                        }}
                      >
                        {plant.description}
                      </Typography>
                    </Tooltip>
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
          Power Plant Notes
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          • A good guideline for a power plant is 10 to 15 percent of the hull, or a power output equal to about half the ship's hull
        </Typography>
      </Paper>
    </Box>
  );
}
