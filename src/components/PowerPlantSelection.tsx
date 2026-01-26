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
import type { PowerPlantType, InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getPowerPlantTypesForShipClass,
  calculatePowerGenerated,
  calculatePowerPlantCost,
  calculateFuelTankCost,
  calculateFuelTankEndurance,
  calculateTotalPowerPlantStats,
  getTotalFuelTankHPForPlantType,
  validatePowerPlantInstallation,
  validateFuelTankInstallation,
  validatePowerPlantDesign,
  generateInstallationId,
  generateFuelTankId,
  formatPowerPlantCost,
  getFuelRequiringInstallations,
} from '../services/powerPlantService';
import { formatCost, getTechTrackName } from '../services/formatters';

interface PowerPlantSelectionProps {
  hull: Hull;
  installedPowerPlants: InstalledPowerPlant[];
  installedFuelTanks: InstalledFuelTank[];
  usedHullPoints: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onPowerPlantsChange: (powerPlants: InstalledPowerPlant[]) => void;
  onFuelTanksChange: (fuelTanks: InstalledFuelTank[]) => void;
}

export function PowerPlantSelection({
  hull,
  installedPowerPlants,
  installedFuelTanks,
  usedHullPoints,
  designProgressLevel,
  designTechTracks,
  onPowerPlantsChange,
  onFuelTanksChange,
}: PowerPlantSelectionProps) {
  // Power plant state
  const [selectedType, setSelectedType] = useState<PowerPlantType | null>(null);
  const [hullPointsInput, setHullPointsInput] = useState<string>('');
  const [editingInstallationId, setEditingInstallationId] = useState<string | null>(null);

  // Fuel tank state
  const [addingFuelTankForType, setAddingFuelTankForType] = useState<PowerPlantType | null>(null);
  const [fuelTankHullPointsInput, setFuelTankHullPointsInput] = useState<string>('1');
  const [editingFuelTankId, setEditingFuelTankId] = useState<string | null>(null);

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

  // Get installed power plants that require fuel (for the fuel tank dropdown)
  const fuelRequiringPlants = useMemo(
    () => getFuelRequiringInstallations(installedPowerPlants),
    [installedPowerPlants]
  );

  // Get unique power plant types that require fuel (for fuel tank selection)
  const fuelRequiringTypes = useMemo(() => {
    const typeMap = new Map<string, PowerPlantType>();
    for (const plant of fuelRequiringPlants) {
      typeMap.set(plant.type.id, plant.type);
    }
    return Array.from(typeMap.values());
  }, [fuelRequiringPlants]);

  const totalStats = useMemo(
    () => calculateTotalPowerPlantStats(installedPowerPlants, installedFuelTanks),
    [installedPowerPlants, installedFuelTanks]
  );

  // Design-level validation (e.g., fuel-requiring plants need fuel tanks)
  const designValidation = useMemo(
    () => validatePowerPlantDesign(installedPowerPlants, installedFuelTanks),
    [installedPowerPlants, installedFuelTanks]
  );

  // ============== Power Plant Handlers ==============

  const handleTypeSelect = (plant: PowerPlantType) => {
    setSelectedType(plant);
    setHullPointsInput(plant.minSize.toString());
  };

  const handleAddPowerPlant = () => {
    if (!selectedType) return;

    const hullPoints = parseInt(hullPointsInput, 10) || 0;

    // When editing, exclude the current installation from validation
    const plantsForValidation = editingInstallationId
      ? installedPowerPlants.filter((p) => p.installationId !== editingInstallationId)
      : installedPowerPlants;
    
    const hpUsedByOtherPlants = editingInstallationId
      ? calculateTotalPowerPlantStats(plantsForValidation, installedFuelTanks).totalHullPoints
      : totalStats.totalHullPoints;

    const validation = validatePowerPlantInstallation(
      selectedType,
      hullPoints,
      hull,
      plantsForValidation,
      usedHullPoints + hpUsedByOtherPlants
    );

    if (!validation.valid) {
      return;
    }

    if (editingInstallationId) {
      const updatedInstallation: InstalledPowerPlant = {
        installationId: editingInstallationId,
        type: selectedType,
        hullPoints,
      };
      onPowerPlantsChange(
        installedPowerPlants.map((p) =>
          p.installationId === editingInstallationId ? updatedInstallation : p
        )
      );
    } else {
      const newInstallation: InstalledPowerPlant = {
        installationId: generateInstallationId(),
        type: selectedType,
        hullPoints,
      };
      onPowerPlantsChange([...installedPowerPlants, newInstallation]);
    }
    
    setSelectedType(null);
    setHullPointsInput('');
    setEditingInstallationId(null);
  };

  const handleRemovePowerPlant = (installationId: string) => {
    const plantToRemove = installedPowerPlants.find(p => p.installationId === installationId);
    onPowerPlantsChange(
      installedPowerPlants.filter((p) => p.installationId !== installationId)
    );
    // Also remove any fuel tanks associated with this power plant type if no other plants of that type exist
    if (plantToRemove) {
      const otherPlantsOfSameType = installedPowerPlants.filter(
        p => p.installationId !== installationId && p.type.id === plantToRemove.type.id
      );
      if (otherPlantsOfSameType.length === 0) {
        onFuelTanksChange(
          installedFuelTanks.filter(ft => ft.forPowerPlantType.id !== plantToRemove.type.id)
        );
      }
    }
  };

  const handleEditPowerPlant = (installation: InstalledPowerPlant) => {
    setSelectedType(installation.type);
    setHullPointsInput(installation.hullPoints.toString());
    setEditingInstallationId(installation.installationId);
  };

  const handleClearAll = () => {
    onPowerPlantsChange([]);
    onFuelTanksChange([]);
    setSelectedType(null);
    setHullPointsInput('');
    setEditingInstallationId(null);
    setAddingFuelTankForType(null);
    setEditingFuelTankId(null);
  };

  // ============== Fuel Tank Handlers ==============

  const handleStartAddFuelTank = (plantType: PowerPlantType) => {
    setAddingFuelTankForType(plantType);
    setFuelTankHullPointsInput('1');
    setEditingFuelTankId(null);
  };

  const handleAddFuelTank = () => {
    if (!addingFuelTankForType) return;

    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;

    // When editing, exclude the current fuel tank from HP calculation
    const tanksForValidation = editingFuelTankId
      ? installedFuelTanks.filter(ft => ft.installationId !== editingFuelTankId)
      : installedFuelTanks;
    
    const fuelTankHP = tanksForValidation.reduce((sum, ft) => sum + ft.hullPoints, 0);
    const plantHP = installedPowerPlants.reduce((sum, p) => sum + p.hullPoints, 0);

    const validation = validateFuelTankInstallation(
      hullPoints,
      hull,
      usedHullPoints + plantHP + fuelTankHP
    );

    if (!validation.valid) {
      return;
    }

    if (editingFuelTankId) {
      const updatedFuelTank: InstalledFuelTank = {
        installationId: editingFuelTankId,
        forPowerPlantType: addingFuelTankForType,
        hullPoints,
      };
      onFuelTanksChange(
        installedFuelTanks.map(ft =>
          ft.installationId === editingFuelTankId ? updatedFuelTank : ft
        )
      );
    } else {
      const newFuelTank: InstalledFuelTank = {
        installationId: generateFuelTankId(),
        forPowerPlantType: addingFuelTankForType,
        hullPoints,
      };
      onFuelTanksChange([...installedFuelTanks, newFuelTank]);
    }

    setAddingFuelTankForType(null);
    setFuelTankHullPointsInput('1');
    setEditingFuelTankId(null);
  };

  const handleEditFuelTank = (fuelTank: InstalledFuelTank) => {
    setAddingFuelTankForType(fuelTank.forPowerPlantType);
    setFuelTankHullPointsInput(fuelTank.hullPoints.toString());
    setEditingFuelTankId(fuelTank.installationId);
  };

  const handleRemoveFuelTank = (installationId: string) => {
    onFuelTanksChange(
      installedFuelTanks.filter(ft => ft.installationId !== installationId)
    );
  };

  // ============== Validation ==============

  const validationErrors = useMemo(() => {
    if (!selectedType) return [];
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    
    const plantsForValidation = editingInstallationId
      ? installedPowerPlants.filter((p) => p.installationId !== editingInstallationId)
      : installedPowerPlants;
    
    const hpUsedByOtherPlants = editingInstallationId
      ? calculateTotalPowerPlantStats(plantsForValidation, installedFuelTanks).totalHullPoints
      : totalStats.totalHullPoints;
    
    const validation = validatePowerPlantInstallation(
      selectedType,
      hullPoints,
      hull,
      plantsForValidation,
      usedHullPoints + hpUsedByOtherPlants
    );
    return validation.errors;
  }, [selectedType, hullPointsInput, hull, installedPowerPlants, installedFuelTanks, usedHullPoints, totalStats.totalHullPoints, editingInstallationId]);

  const fuelTankValidationErrors = useMemo(() => {
    if (!addingFuelTankForType) return [];
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    
    const tanksForValidation = editingFuelTankId
      ? installedFuelTanks.filter(ft => ft.installationId !== editingFuelTankId)
      : installedFuelTanks;
    
    const fuelTankHP = tanksForValidation.reduce((sum, ft) => sum + ft.hullPoints, 0);
    const plantHP = installedPowerPlants.reduce((sum, p) => sum + p.hullPoints, 0);

    const validation = validateFuelTankInstallation(
      hullPoints,
      hull,
      usedHullPoints + plantHP + fuelTankHP
    );
    return validation.errors;
  }, [addingFuelTankForType, fuelTankHullPointsInput, hull, installedPowerPlants, installedFuelTanks, usedHullPoints, editingFuelTankId]);

  // Preview stats for selected power plant
  const previewStats = useMemo(() => {
    if (!selectedType) return null;
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    
    return {
      power: calculatePowerGenerated(selectedType, hullPoints),
      totalCost: calculatePowerPlantCost(selectedType, hullPoints),
      totalHullPoints: hullPoints,
    };
  }, [selectedType, hullPointsInput]);

  // Preview stats for fuel tank being added
  const fuelTankPreviewStats = useMemo(() => {
    if (!addingFuelTankForType) return null;
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    
    // Find total HP for this plant type to calculate endurance
    const plantTypeHP = installedPowerPlants
      .filter(p => p.type.id === addingFuelTankForType.id)
      .reduce((sum, p) => sum + p.hullPoints, 0);
    
    return {
      cost: calculateFuelTankCost(addingFuelTankForType, hullPoints),
      endurance: calculateFuelTankEndurance(addingFuelTankForType, hullPoints, plantTypeHP),
    };
  }, [addingFuelTankForType, fuelTankHullPointsInput, installedPowerPlants]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Step 3: Power Plant (Required)
        </Typography>
        {(installedPowerPlants.length > 0 || installedFuelTanks.length > 0) && (
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
          {!designValidation.valid && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {designValidation.errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}
          <Stack spacing={1}>
            {installedPowerPlants.map((installation) => {
              const power = calculatePowerGenerated(installation.type, installation.hullPoints);
              const cost = calculatePowerPlantCost(installation.type, installation.hullPoints);
              const fuelTankHP = getTotalFuelTankHPForPlantType(installedFuelTanks, installation.type.id);
              const endurance = installation.type.requiresFuel && fuelTankHP > 0
                ? calculateFuelTankEndurance(installation.type, fuelTankHP, installation.hullPoints)
                : null;
              
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
                  {installation.type.requiresFuel && (
                    <Tooltip title={fuelTankHP > 0 ? `${fuelTankHP} HP of fuel (${endurance} days)` : 'No fuel tank installed'}>
                      <Chip
                        icon={<LocalGasStationIcon />}
                        label={fuelTankHP > 0 ? `${endurance} days` : 'Need fuel'}
                        size="small"
                        color={fuelTankHP > 0 ? 'success' : 'warning'}
                        variant="outlined"
                        onClick={() => handleStartAddFuelTank(installation.type)}
                      />
                    </Tooltip>
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

      {/* Fuel Tanks Section */}
      {installedFuelTanks.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Fuel Tanks
          </Typography>
          <Stack spacing={1}>
            {installedFuelTanks.map((fuelTank) => {
              const cost = calculateFuelTankCost(fuelTank.forPowerPlantType, fuelTank.hullPoints);
              const plantHP = installedPowerPlants
                .filter(p => p.type.id === fuelTank.forPowerPlantType.id)
                .reduce((sum, p) => sum + p.hullPoints, 0);
              const endurance = calculateFuelTankEndurance(fuelTank.forPowerPlantType, fuelTank.hullPoints, plantHP);
              
              return (
                <Box
                  key={fuelTank.installationId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  }}
                >
                  <LocalGasStationIcon fontSize="small" color="warning" />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    Fuel Tank ({fuelTank.forPowerPlantType.name})
                  </Typography>
                  <Chip
                    label={`${fuelTank.hullPoints} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${endurance} days`}
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label={formatPowerPlantCost(cost)}
                    size="small"
                    variant="outlined"
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleEditFuelTank(fuelTank)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleRemoveFuelTank(fuelTank.installationId)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Add Fuel Tank Form */}
      {addingFuelTankForType && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingFuelTankId ? 'Edit' : 'Add'} Fuel Tank for {addingFuelTankForType.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Hull Points"
              type="number"
              size="small"
              value={fuelTankHullPointsInput}
              onChange={(e) => setFuelTankHullPointsInput(e.target.value)}
              inputProps={{ min: 1 }}
              helperText={`Efficiency: ${addingFuelTankForType.fuelEfficiency} days/HP`}
              sx={{ width: 140 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {fuelTankPreviewStats && (
                <Typography variant="caption" color="text.secondary">
                  Cost: {formatPowerPlantCost(fuelTankPreviewStats.cost)} | Endurance: {fuelTankPreviewStats.endurance} days
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={editingFuelTankId ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddFuelTank}
                  disabled={fuelTankValidationErrors.length > 0}
                >
                  {editingFuelTankId ? 'Update' : 'Add'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setAddingFuelTankForType(null);
                    setEditingFuelTankId(null);
                  }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </Box>
          {fuelTankValidationErrors.length > 0 && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {fuelTankValidationErrors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </Alert>
          )}
        </Paper>
      )}

      {/* Quick Add Fuel Tank (when fuel-requiring plants exist but no form is open) */}
      {fuelRequiringTypes.length > 0 && !addingFuelTankForType && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LocalGasStationIcon color="warning" />
            <Typography variant="body2" sx={{ flex: 1 }}>
              Add fuel tank for:
            </Typography>
            {fuelRequiringTypes.map(plantType => (
              <Button
                key={plantType.id}
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleStartAddFuelTank(plantType)}
              >
                {plantType.name}
              </Button>
            ))}
          </Box>
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
                min: selectedType.minSize
              }}
              helperText={`Min: ${selectedType.minSize}`}
              sx={{ width: 120 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {previewStats && (
                <Typography variant="caption" color="text.secondary">
                  Power: {previewStats.power} | Cost: {formatPowerPlantCost(previewStats.totalCost)}
                  {selectedType.requiresFuel && ' | Requires fuel tank'}
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
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 80, whiteSpace: 'nowrap' }}>Min Size</TableCell>
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
                      {plant.minSize}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {plant.requiresFuel ? (
                      <Tooltip title={`Requires fuel - Efficiency: ${plant.fuelEfficiency} power-days/HP, Fuel cost: ${formatCost(plant.fuelCostPerHullPoint)}/HP`}>
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
          • A good guideline for a power plant is 10 to 15% of the hull, or a power output equal to about half the ship's hull
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          • Power plants that require fuel also require one or more fuel tanks (5 to 10% of the hull is recommended)
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          • Each fuel tank is associated with a specific power plant type and uses that plant's fuel cost and efficiency
        </Typography>
      </Paper>
    </Box>
  );
}
