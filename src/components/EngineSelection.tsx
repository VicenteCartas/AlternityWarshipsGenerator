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
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import SpeedIcon from '@mui/icons-material/Speed';
import WarningIcon from '@mui/icons-material/Warning';
import type { Hull } from '../types/hull';
import type { EngineType, InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getEngineTypesForShipClass,
  calculateEnginePowerRequired,
  calculateEngineCost,
  calculateEngineFuelTankCost,
  calculateEngineFuelTankEndurance,
  calculateTotalEngineStats,
  calculateHullPercentage,
  getAccelerationForPercentage,
  validateEngineInstallation,
  validateEngineFuelTankInstallation,
  validateEngineDesign,
  generateEngineInstallationId,
  generateEngineFuelTankId,
  formatEngineCost,
  getUniqueFuelRequiringEngineTypes,
  getTotalEngineFuelTankHPForEngineType,
  getTotalEngineHPForEngineType,
} from '../services/engineService';
import { formatCost, getTechTrackName, formatAcceleration } from '../services/formatters';

interface EngineSelectionProps {
  hull: Hull;
  installedEngines: InstalledEngine[];
  installedFuelTanks: InstalledEngineFuelTank[];
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onEnginesChange: (engines: InstalledEngine[]) => void;
  onFuelTanksChange: (fuelTanks: InstalledEngineFuelTank[]) => void;
}

export function EngineSelection({
  hull,
  installedEngines,
  installedFuelTanks,
  usedHullPoints,
  availablePower,
  designProgressLevel,
  designTechTracks,
  onEnginesChange,
  onFuelTanksChange,
}: EngineSelectionProps) {
  // Engine state
  const [selectedType, setSelectedType] = useState<EngineType | null>(null);
  const [hullPointsInput, setHullPointsInput] = useState<string>('');
  const [editingInstallationId, setEditingInstallationId] = useState<string | null>(null);

  // Fuel tank state
  const [addingFuelTankForType, setAddingFuelTankForType] = useState<EngineType | null>(null);
  const [fuelTankHullPointsInput, setFuelTankHullPointsInput] = useState<string>('1');
  const [editingFuelTankId, setEditingFuelTankId] = useState<string | null>(null);

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

  // Get unique engine types that require fuel (from installed engines)
  const fuelRequiringTypes = useMemo(
    () => getUniqueFuelRequiringEngineTypes(installedEngines),
    [installedEngines]
  );

  const totalStats = useMemo(
    () => calculateTotalEngineStats(installedEngines, installedFuelTanks, hull),
    [installedEngines, installedFuelTanks, hull]
  );

  // Design-level validation (e.g., fuel-requiring engines need fuel tanks)
  const designValidation = useMemo(
    () => validateEngineDesign(installedEngines, installedFuelTanks),
    [installedEngines, installedFuelTanks]
  );

  // ============== Engine Handlers ==============

  const handleTypeSelect = (engine: EngineType) => {
    setSelectedType(engine);
    setHullPointsInput(engine.minSize.toString());
    setEditingInstallationId(null);
  };

  const handleAddEngine = () => {
    if (!selectedType) return;

    const hullPoints = parseInt(hullPointsInput, 10) || 0;

    // When editing, exclude the current installation from validation
    const enginesForValidation = editingInstallationId
      ? installedEngines.filter((e) => e.id !== editingInstallationId)
      : installedEngines;
    
    const hpUsedByOtherEngines = editingInstallationId
      ? calculateTotalEngineStats(enginesForValidation, installedFuelTanks, hull).totalHullPoints
      : totalStats.totalHullPoints;

    // Calculate remaining power after current engines
    const powerUsedByOthers = enginesForValidation.reduce(
      (sum, e) => sum + calculateEnginePowerRequired(e.type, e.hullPoints),
      0
    );
    const remainingPower = availablePower - powerUsedByOthers;

    const validation = validateEngineInstallation(
      selectedType,
      hullPoints,
      hull,
      usedHullPoints + hpUsedByOtherEngines,
      remainingPower
    );

    if (!validation.valid) {
      return;
    }

    if (editingInstallationId) {
      const updatedInstallation: InstalledEngine = {
        id: editingInstallationId,
        type: selectedType,
        hullPoints,
      };
      onEnginesChange(
        installedEngines.map((e) =>
          e.id === editingInstallationId ? updatedInstallation : e
        )
      );
    } else {
      const newInstallation: InstalledEngine = {
        id: generateEngineInstallationId(),
        type: selectedType,
        hullPoints,
      };
      onEnginesChange([...installedEngines, newInstallation]);
    }
    
    setSelectedType(null);
    setHullPointsInput('');
    setEditingInstallationId(null);
  };

  const handleRemoveEngine = (id: string) => {
    const engineToRemove = installedEngines.find(e => e.id === id);
    onEnginesChange(installedEngines.filter((e) => e.id !== id));
    
    // Also remove any fuel tanks associated with this engine type if no other engines of that type exist
    if (engineToRemove) {
      const otherEnginesOfSameType = installedEngines.filter(
        e => e.id !== id && e.type.id === engineToRemove.type.id
      );
      if (otherEnginesOfSameType.length === 0) {
        onFuelTanksChange(
          installedFuelTanks.filter(ft => ft.forEngineType.id !== engineToRemove.type.id)
        );
      }
    }
  };

  const handleEditEngine = (installation: InstalledEngine) => {
    setSelectedType(installation.type);
    setHullPointsInput(installation.hullPoints.toString());
    setEditingInstallationId(installation.id);
  };

  const handleClearAll = () => {
    onEnginesChange([]);
    onFuelTanksChange([]);
    setSelectedType(null);
    setHullPointsInput('');
    setEditingInstallationId(null);
    setAddingFuelTankForType(null);
    setEditingFuelTankId(null);
  };

  // ============== Fuel Tank Handlers ==============

  const handleStartAddFuelTank = (engineType: EngineType) => {
    setAddingFuelTankForType(engineType);
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
    const engineHP = installedEngines.reduce((sum, e) => sum + e.hullPoints, 0);

    const validation = validateEngineFuelTankInstallation(
      hullPoints,
      hull,
      usedHullPoints + engineHP + fuelTankHP
    );

    if (!validation.valid) {
      return;
    }

    if (editingFuelTankId) {
      const updatedFuelTank: InstalledEngineFuelTank = {
        installationId: editingFuelTankId,
        forEngineType: addingFuelTankForType,
        hullPoints,
      };
      onFuelTanksChange(
        installedFuelTanks.map(ft =>
          ft.installationId === editingFuelTankId ? updatedFuelTank : ft
        )
      );
    } else {
      const newFuelTank: InstalledEngineFuelTank = {
        installationId: generateEngineFuelTankId(),
        forEngineType: addingFuelTankForType,
        hullPoints,
      };
      onFuelTanksChange([...installedFuelTanks, newFuelTank]);
    }

    setAddingFuelTankForType(null);
    setFuelTankHullPointsInput('1');
    setEditingFuelTankId(null);
  };

  const handleEditFuelTank = (fuelTank: InstalledEngineFuelTank) => {
    setAddingFuelTankForType(fuelTank.forEngineType);
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
    
    const enginesForValidation = editingInstallationId
      ? installedEngines.filter((e) => e.id !== editingInstallationId)
      : installedEngines;
    
    const hpUsedByOtherEngines = editingInstallationId
      ? calculateTotalEngineStats(enginesForValidation, installedFuelTanks, hull).totalHullPoints
      : totalStats.totalHullPoints;
    
    const powerUsedByOthers = enginesForValidation.reduce(
      (sum, e) => sum + calculateEnginePowerRequired(e.type, e.hullPoints),
      0
    );
    const remainingPower = availablePower - powerUsedByOthers;
    
    const validation = validateEngineInstallation(
      selectedType,
      hullPoints,
      hull,
      usedHullPoints + hpUsedByOtherEngines,
      remainingPower
    );
    return validation.errors;
  }, [selectedType, hullPointsInput, hull, usedHullPoints, totalStats.totalHullPoints, availablePower, installedEngines, installedFuelTanks, editingInstallationId]);

  const fuelTankValidationErrors = useMemo(() => {
    if (!addingFuelTankForType) return [];
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    
    const tanksForValidation = editingFuelTankId
      ? installedFuelTanks.filter(ft => ft.installationId !== editingFuelTankId)
      : installedFuelTanks;
    
    const fuelTankHP = tanksForValidation.reduce((sum, ft) => sum + ft.hullPoints, 0);
    const engineHP = installedEngines.reduce((sum, e) => sum + e.hullPoints, 0);
    
    const validation = validateEngineFuelTankInstallation(
      hullPoints,
      hull,
      usedHullPoints + engineHP + fuelTankHP
    );
    return validation.errors;
  }, [addingFuelTankForType, fuelTankHullPointsInput, hull, usedHullPoints, installedEngines, installedFuelTanks, editingFuelTankId]);

  // Calculate preview stats for selected engine
  const previewStats = useMemo(() => {
    if (!selectedType) return null;
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const hullPercentage = calculateHullPercentage(hull, hullPoints);
    const acceleration = getAccelerationForPercentage(selectedType.accelerationRatings, hullPercentage);
    
    return {
      powerRequired: calculateEnginePowerRequired(selectedType, hullPoints),
      engineCost: calculateEngineCost(selectedType, hullPoints),
      totalHullPoints: hullPoints,
      hullPercentage,
      acceleration,
    };
  }, [selectedType, hullPointsInput, hull]);

  // Calculate preview stats for fuel tank
  const fuelTankPreviewStats = useMemo(() => {
    if (!addingFuelTankForType) return null;
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    const totalEngineHP = getTotalEngineHPForEngineType(installedEngines, addingFuelTankForType.id);
    const existingFuelHP = getTotalEngineFuelTankHPForEngineType(installedFuelTanks, addingFuelTankForType.id);
    // Exclude current tank HP if editing
    const effectiveExistingFuelHP = editingFuelTankId
      ? existingFuelHP - (installedFuelTanks.find(ft => ft.installationId === editingFuelTankId)?.hullPoints || 0)
      : existingFuelHP;
    const totalFuelHP = effectiveExistingFuelHP + hullPoints;
    
    return {
      cost: calculateEngineFuelTankCost(addingFuelTankForType, hullPoints),
      endurance: calculateEngineFuelTankEndurance(addingFuelTankForType, totalFuelHP, totalEngineHP),
    };
  }, [addingFuelTankForType, fuelTankHullPointsInput, installedEngines, installedFuelTanks, editingFuelTankId]);

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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`HP: ${totalStats.totalHullPoints}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Power: ${totalStats.totalPowerRequired}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Cost: ${formatEngineCost(totalStats.totalCost)}`}
            color="default"
            variant="outlined"
          />
          {/* Separate acceleration chips for PL6 and non-PL6 engines */}
          {(() => {
            const pl6Accel = installedEngines
              .filter(e => e.type.usesPL6Scale)
              .reduce((sum, e) => {
                const percentage = calculateHullPercentage(e.hullPoints, hull);
                return sum + getAccelerationForPercentage(e.type, percentage);
              }, 0);
            const nonPL6Accel = installedEngines
              .filter(e => !e.type.usesPL6Scale)
              .reduce((sum, e) => {
                const percentage = calculateHullPercentage(e.hullPoints, hull);
                return sum + getAccelerationForPercentage(e.type, percentage);
              }, 0);
            return (
              <>
                {pl6Accel > 0 && (
                  <Chip
                    icon={<SpeedIcon />}
                    label={`Accel: ${formatAcceleration(pl6Accel, true)}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
                {nonPL6Accel > 0 && (
                  <Chip
                    icon={<SpeedIcon />}
                    label={`Accel: ${formatAcceleration(nonPL6Accel, false)}`}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </>
            );
          })()}
          {/* Fuel chips for each engine type that requires fuel */}
          {fuelRequiringTypes.map((engineType) => {
            const totalEngineHP = getTotalEngineHPForEngineType(installedEngines, engineType.id);
            const totalFuelHP = getTotalEngineFuelTankHPForEngineType(installedFuelTanks, engineType.id);
            const endurance = totalFuelHP > 0 ? calculateEngineFuelTankEndurance(engineType, totalFuelHP, totalEngineHP) : 0;
            return (
              <Chip
                key={engineType.id}
                icon={<BatteryChargingFullIcon />}
                label={`${engineType.name}: ${totalFuelHP > 0 ? `${endurance} thrust-days` : 'No fuel'}`}
                color={totalFuelHP > 0 ? 'success' : 'error'}
                variant="outlined"
              />
            );
          })}
        </Box>
      </Paper>

      {/* Design validation warnings (e.g., missing fuel) */}
      {!designValidation.valid && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          {designValidation.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      {/* Summary of installed engines */}
      {installedEngines.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Engines
          </Typography>
          <Stack spacing={1}>
            {installedEngines.map((installation) => {
              const powerRequired = calculateEnginePowerRequired(installation.type, installation.hullPoints);
              const cost = calculateEngineCost(installation.type, installation.hullPoints);
              const hullPercentage = calculateHullPercentage(hull, installation.hullPoints);
              const acceleration = getAccelerationForPercentage(installation.type.accelerationRatings, hullPercentage);
              const needsFuel = installation.type.requiresFuel;
              const fuelTankHP = getTotalEngineFuelTankHPForEngineType(installedFuelTanks, installation.type.id);
              const totalEngineHP = getTotalEngineHPForEngineType(installedEngines, installation.type.id);
              const endurance = fuelTankHP > 0 ? calculateEngineFuelTankEndurance(installation.type, fuelTankHP, totalEngineHP) : 0;
              
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
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {installation.type.name}
                  </Typography>
                  <Chip
                    label={`${installation.hullPoints} HP (${hullPercentage.toFixed(1)}%)`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${powerRequired} Power`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<SpeedIcon />}
                    label={formatAcceleration(acceleration, installation.type.usesPL6Scale)}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={formatEngineCost(cost)}
                    size="small"
                    variant="outlined"
                  />
                  {needsFuel && (
                    <Tooltip title={fuelTankHP > 0 ? `${fuelTankHP} HP of fuel (${endurance} thrust-days)` : 'No fuel tank installed'}>
                      <Chip
                        icon={<BatteryChargingFullIcon />}
                        label={fuelTankHP > 0 ? `${endurance} thrust-days` : 'Need fuel'}
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
                    onClick={() => handleEditEngine(installation)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
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

      {/* Installed Fuel Tanks Section */}
      {installedFuelTanks.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Fuel Tanks
          </Typography>
          <Stack spacing={1}>
            {installedFuelTanks.map((fuelTank) => {
              const cost = calculateEngineFuelTankCost(fuelTank.forEngineType, fuelTank.hullPoints);
              const engineHP = installedEngines
                .filter(e => e.type.id === fuelTank.forEngineType.id)
                .reduce((sum, e) => sum + e.hullPoints, 0);
              const totalFuelHP = getTotalEngineFuelTankHPForEngineType(installedFuelTanks, fuelTank.forEngineType.id);
              const endurance = calculateEngineFuelTankEndurance(fuelTank.forEngineType, totalFuelHP, engineHP);
              
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
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    Fuel Tank ({fuelTank.forEngineType.name})
                  </Typography>
                  <Chip
                    label={`${fuelTank.hullPoints} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${endurance} thrust-days`}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={formatEngineCost(cost)}
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
              helperText={`Efficiency: ${addingFuelTankForType.fuelEfficiency} thrust-days/HP`}
              sx={{ width: 140 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {fuelTankPreviewStats && (
                <Typography variant="caption" color="text.secondary">
                  Cost: {formatEngineCost(fuelTankPreviewStats.cost)} | Endurance: {fuelTankPreviewStats.endurance} thrust-days
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

      {/* Quick Add Fuel Tank (when fuel-requiring engines exist but no form is open) */}
      {fuelRequiringTypes.length > 0 && !addingFuelTankForType && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BatteryChargingFullIcon color="warning" />
            <Typography variant="body2" sx={{ flex: 1 }}>
              Add fuel tank for:
            </Typography>
            {fuelRequiringTypes.map(engineType => (
              <Button
                key={engineType.id}
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleStartAddFuelTank(engineType)}
              >
                {engineType.name}
              </Button>
            ))}
          </Box>
        </Paper>
      )}

      {/* Add/Edit Engine Section */}
      {selectedType && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {editingInstallationId ? 'Edit' : 'Configure'} {selectedType.name}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {previewStats && (
                <Typography variant="caption" color="text.secondary">
                  {previewStats.hullPercentage.toFixed(1)}% hull → {formatAcceleration(previewStats.acceleration, selectedType.usesPL6Scale)} | 
                  Power: {previewStats.powerRequired} | Cost: {formatEngineCost(previewStats.engineCost)}
                  {selectedType.requiresFuel && ' | Needs fuel tank'}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={editingInstallationId ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddEngine}
                  disabled={validationErrors.length > 0}
                >
                  {editingInstallationId ? 'Save' : 'Add'}
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
                        <BatteryChargingFullIcon fontSize="small" color="warning" />
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
