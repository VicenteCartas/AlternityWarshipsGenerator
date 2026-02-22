import { useState, useMemo, Fragment } from 'react';
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import { headerCellSx } from '../constants/tableStyles';
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
  getFuelRequiringInstallations,
} from '../services/powerPlantService';
import { filterByDesignConstraints } from '../services/utilities';
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
  const [editingInstallationId, seteditingInstallationId] = useState<string | null>(null);

  // Fuel tank state
  const [addingFuelTankForType, setAddingFuelTankForType] = useState<PowerPlantType | null>(null);
  const [fuelTankHullPointsInput, setFuelTankHullPointsInput] = useState<string>('1');
  const [editingFuelTankId, setEditingFuelTankId] = useState<string | null>(null);

  // Get power plants filtered by ship class, then apply design constraints
  const availablePowerPlants = useMemo(() => {
    return filterByDesignConstraints(getPowerPlantTypesForShipClass(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

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
    
    const validation = validatePowerPlantInstallation(
      selectedType,
      hullPoints
    );

    if (!validation.valid) {
      return;
    }

    if (editingInstallationId) {
      const updatedInstallation: InstalledPowerPlant = {
        id: editingInstallationId,
        type: selectedType,
        hullPoints,
      };
      onPowerPlantsChange(
        installedPowerPlants.map((p) =>
          p.id === editingInstallationId ? updatedInstallation : p
        )
      );
    } else {
      const newInstallation: InstalledPowerPlant = {
        id: generateInstallationId(),
        type: selectedType,
        hullPoints,
      };
      onPowerPlantsChange([...installedPowerPlants, newInstallation]);
    }
    
    setSelectedType(null);
    setHullPointsInput('');
    seteditingInstallationId(null);
  };

  const handleRemovePowerPlant = (id: string) => {
    const plantToRemove = installedPowerPlants.find(p => p.id === id);
    onPowerPlantsChange(
      installedPowerPlants.filter((p) => p.id !== id)
    );
    // Also remove any fuel tanks associated with this power plant type if no other plants of that type exist
    if (plantToRemove) {
      const otherPlantsOfSameType = installedPowerPlants.filter(
        p => p.id !== id && p.type.id === plantToRemove.type.id
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
    seteditingInstallationId(installation.id);
  };

  const handleDuplicatePowerPlant = (installation: InstalledPowerPlant) => {
    const duplicate: InstalledPowerPlant = {
      id: generateInstallationId(),
      type: installation.type,
      hullPoints: installation.hullPoints,
    };
    // Insert after the original
    const index = installedPowerPlants.findIndex(p => p.id === installation.id);
    const updated = [...installedPowerPlants];
    updated.splice(index + 1, 0, duplicate);
    onPowerPlantsChange(updated);
  };

  const handleClearAll = () => {
    onPowerPlantsChange([]);
    onFuelTanksChange([]);
    setSelectedType(null);
    setHullPointsInput('');
    seteditingInstallationId(null);
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
      ? installedFuelTanks.filter(ft => ft.id !== editingFuelTankId)
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
        id: editingFuelTankId,
        forPowerPlantType: addingFuelTankForType,
        hullPoints,
      };
      onFuelTanksChange(
        installedFuelTanks.map(ft =>
          ft.id === editingFuelTankId ? updatedFuelTank : ft
        )
      );
    } else {
      const newFuelTank: InstalledFuelTank = {
        id: generateFuelTankId(),
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
    setEditingFuelTankId(fuelTank.id);
  };

  const handleRemoveFuelTank = (id: string) => {
    onFuelTanksChange(
      installedFuelTanks.filter(ft => ft.id !== id)
    );
  };

  const handleDuplicateFuelTank = (fuelTank: InstalledFuelTank) => {
    const duplicate: InstalledFuelTank = {
      id: generateFuelTankId(),
      forPowerPlantType: fuelTank.forPowerPlantType,
      hullPoints: fuelTank.hullPoints,
    };
    // Insert after the original
    const index = installedFuelTanks.findIndex(ft => ft.id === fuelTank.id);
    const updated = [...installedFuelTanks];
    updated.splice(index + 1, 0, duplicate);
    onFuelTanksChange(updated);
  };

  // ============== Validation ==============

  const validationErrors = useMemo(() => {
    if (!selectedType) return [];
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    
    const validation = validatePowerPlantInstallation(
      selectedType,
      hullPoints
    );
    return validation.errors;
  }, [selectedType, hullPointsInput]);

  const fuelTankValidationErrors = useMemo(() => {
    if (!addingFuelTankForType) return [];
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    
    const tanksForValidation = editingFuelTankId
      ? installedFuelTanks.filter(ft => ft.id !== editingFuelTankId)
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
        <Typography variant="h6" sx={{ mb: 1 }}>
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

      {/* Power Plant Summary */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`HP: ${totalStats.totalHullPoints}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Power: ${totalStats.totalPowerGenerated}`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Cost: ${formatCost(totalStats.totalCost)}`}
            color="default"
            variant="outlined"
          />
          {/* Fuel chips for each power plant type that requires fuel */}
          {fuelRequiringTypes.map((plantType) => {
            const plantTypeHP = installedPowerPlants
              .filter(p => p.type.id === plantType.id)
              .reduce((sum, p) => sum + p.hullPoints, 0);
            const totalFuelHP = getTotalFuelTankHPForPlantType(installedFuelTanks, plantType.id);
            const endurance = totalFuelHP > 0 ? calculateFuelTankEndurance(plantType, totalFuelHP, plantTypeHP) : 0;
            return (
              <Chip
                key={plantType.id}
                icon={<BatteryChargingFullIcon />}
                label={`${plantType.name}: ${totalFuelHP > 0 ? `${endurance} days total` : 'No fuel'}`}
                color={totalFuelHP > 0 ? 'success' : 'error'}
                variant="outlined"
              />
            );
          })}
          <Tooltip title="Each 5% of base hull points is a common reference for power plant sizing">
            <Chip
              label={`5% Hull = ${Math.floor(hull.hullPoints * 0.05)} HP`}
              color="default"
              variant="outlined"
            />
          </Tooltip>
        </Box>
      </Paper>
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
              const totalPlantTypeHP = installedPowerPlants
                .filter(p => p.type.id === installation.type.id)
                .reduce((sum, p) => sum + p.hullPoints, 0);
              const endurance = installation.type.requiresFuel && fuelTankHP > 0
                ? calculateFuelTankEndurance(installation.type, fuelTankHP, totalPlantTypeHP)
                : null;
              const isEditing = editingInstallationId === installation.id;
              
              return (
                <Fragment key={installation.id}>
                  <Box
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
                      variant="outlined"
                    />
                    <Chip
                      label={formatCost(cost)}
                      size="small"
                      variant="outlined"
                    />
                    {installation.type.requiresFuel && (
                      <Tooltip title={fuelTankHP > 0 ? `${fuelTankHP} HP of fuel (${endurance} days total)` : 'No fuel tank installed'}>
                        <Chip
                          icon={<BatteryChargingFullIcon />}
                          label={fuelTankHP > 0 ? `${endurance} days total` : 'Need fuel'}
                          size="small"
                          color={fuelTankHP > 0 ? 'success' : 'error'}
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
                      onClick={() => handleDuplicatePowerPlant(installation)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemovePowerPlant(installation.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {/* Inline edit form when editing this power plant */}
                  {isEditing && selectedType && (
                    <Box sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <TextField
                          label="Size (HP)"
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
                              Power: {previewStats.power} | Cost: {formatCost(previewStats.totalCost)}
                              {selectedType.requiresFuel && ' | Requires fuel tank'}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                setSelectedType(null);
                                seteditingInstallationId(null);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<SaveIcon />}
                              onClick={handleAddPowerPlant}
                              disabled={validationErrors.length > 0}
                            >
                              Update
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
                    </Box>
                  )}
                </Fragment>
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
              const isEditing = editingFuelTankId === fuelTank.id;
              
              return (
                <Fragment key={fuelTank.id}>
                  <Box
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
                      Fuel Tank ({fuelTank.forPowerPlantType.name})
                    </Typography>
                    <Chip
                      label={`${fuelTank.hullPoints} HP`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<BatteryChargingFullIcon />}
                      label={`+${endurance} days`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip
                      label={formatCost(cost)}
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
                      onClick={() => handleDuplicateFuelTank(fuelTank)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveFuelTank(fuelTank.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {/* Inline edit form when editing this fuel tank */}
                  {isEditing && addingFuelTankForType && (
                    <Box sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <TextField
                          label="Size (HP)"
                          type="number"
                          size="small"
                          value={fuelTankHullPointsInput}
                          onChange={(e) => setFuelTankHullPointsInput(e.target.value)}
                          inputProps={{ min: 1 }}
                          sx={{ width: 140 }}
                        />
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {fuelTankPreviewStats && (
                            <Typography variant="caption" color="text.secondary">
                              Efficiency: {addingFuelTankForType.fuelEfficiency} days/HP | Endurance: {fuelTankPreviewStats.endurance} days | Cost: {formatCost(fuelTankPreviewStats.cost)}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', gap: 1 }}>
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
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<SaveIcon />}
                              onClick={handleAddFuelTank}
                              disabled={fuelTankValidationErrors.length > 0}
                            >
                              Update
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
                    </Box>
                  )}
                </Fragment>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Add Fuel Tank Form (only when adding, not editing) */}
      {addingFuelTankForType && !editingFuelTankId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            Add Fuel Tank for {addingFuelTankForType.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Size (HP)"
              type="number"
              size="small"
              value={fuelTankHullPointsInput}
              onChange={(e) => setFuelTankHullPointsInput(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ width: 140 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {fuelTankPreviewStats && (
                <Typography variant="caption" color="text.secondary">
                  Efficiency: {addingFuelTankForType.fuelEfficiency} days/HP | Endurance: {fuelTankPreviewStats.endurance} days | Cost: {formatCost(fuelTankPreviewStats.cost)}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
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
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddFuelTank}
                  disabled={fuelTankValidationErrors.length > 0}
                >
                  Add
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
            <BatteryChargingFullIcon color="warning" />
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

      {/* Add new power plant section (only when adding, not editing) */}
      {selectedType && !editingInstallationId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            Configure {selectedType.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Size (HP)"
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
                  Power: {previewStats.power} | Cost: {formatCost(previewStats.totalCost)}
                  {selectedType.requiresFuel && ' | Requires fuel tank'}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedType(null);
                    seteditingInstallationId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddPowerPlant}
                  disabled={validationErrors.length > 0}
                >
                  Add
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
              <TableCell sx={{ fontWeight: 'bold', width: 150, whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Power/HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Base Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 80, whiteSpace: 'nowrap' }}>Min Size</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Fuel</TableCell>
              <TableCell sx={headerCellSx}>Description</TableCell>
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
                        <BatteryChargingFullIcon fontSize="small" color="warning" />
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
