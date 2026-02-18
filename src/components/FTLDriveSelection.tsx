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
import WarningIcon from '@mui/icons-material/Warning';
import { headerCellSx } from '../constants/tableStyles';
import type { Hull } from '../types/hull';
import type { FTLDriveType, InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledPowerPlant } from '../types/powerPlant';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getAllFTLDriveTypes,
  filterByDesignConstraints,
  calculateFTLHullPercentage,
  getFTLRatingForPercentage,
  calculateFTLPowerRequired,
  calculateFTLCost,
  calculateMinHullPointsForDrive,
  calculateTotalFTLStats,
  validateFTLInstallation,
  generateFTLInstallationId,
  formatFTLRating,
  generateFTLFuelTankId,
  calculateFTLFuelTankCost,
  getTotalFTLFuelTankHP,
  calculateTotalFTLFuelTankStats,
  calculateJumpDriveMaxDistance,
  isFixedSizeDrive,
  calculateFixedSizeHullPoints,
  calculateMinFuelTankHP,
} from '../services/ftlDriveService';
import { formatCost, getTechTrackName } from '../services/formatters';
import { getPowerPlantTypeById } from '../services/powerPlantService';

interface FTLDriveSelectionProps {
  hull: Hull;
  installedFTLDrive: InstalledFTLDrive | null;
  installedFTLFuelTanks: InstalledFTLFuelTank[];
  installedPowerPlants: InstalledPowerPlant[];
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onFTLDriveChange: (drive: InstalledFTLDrive | null) => void;
  onFTLFuelTanksChange: (fuelTanks: InstalledFTLFuelTank[]) => void;
}

export function FTLDriveSelection({
  hull,
  installedFTLDrive,
  installedFTLFuelTanks,
  installedPowerPlants,
  availablePower,
  designProgressLevel,
  designTechTracks,
  onFTLDriveChange,
  onFTLFuelTanksChange,
}: FTLDriveSelectionProps) {
  // FTL Drive state
  const [selectedType, setSelectedType] = useState<FTLDriveType | null>(null);
  const [hullPointsInput, setHullPointsInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Fuel tank state
  const [addingFuelTank, setAddingFuelTank] = useState(false);
  const [fuelTankHullPointsInput, setFuelTankHullPointsInput] = useState<string>('1');
  const [editingFuelTankId, setEditingFuelTankId] = useState<string | null>(null);

  // Get all FTL drives, then filter by design constraints
  const availableDrives = useMemo(() => {
    return filterByDesignConstraints(getAllFTLDriveTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const totalStats = useMemo(
    () => calculateTotalFTLStats(installedFTLDrive, hull),
    [installedFTLDrive, hull]
  );

  const fuelTankStats = useMemo(
    () => calculateTotalFTLFuelTankStats(installedFTLFuelTanks),
    [installedFTLFuelTanks]
  );

  // Check if installed drive requires fuel
  const driveRequiresFuel = installedFTLDrive?.type.requiresFuel ?? false;

  // Check if the required power plant type is installed
  const requiredPowerPlantMissing = useMemo(() => {
    if (!installedFTLDrive?.type.requiresPowerPlantType) return null;
    const requiredType = installedFTLDrive.type.requiresPowerPlantType;
    const hasRequiredPlant = installedPowerPlants.some(p => p.type.id === requiredType);
    if (hasRequiredPlant) return null;
    // Return the name of the required power plant type
    const plantType = getPowerPlantTypeById(requiredType);
    return plantType?.name ?? requiredType;
  }, [installedFTLDrive, installedPowerPlants]);

  // Calculate power available for the FTL drive
  // If the drive requires a specific power plant type, only count power from those plants
  const powerAvailableForFTL = useMemo(() => {
    if (!installedFTLDrive) return availablePower;
    
    const requiredType = installedFTLDrive.type.requiresPowerPlantType;
    if (!requiredType) {
      // No specific plant required - use all available power
      return availablePower;
    }
    
    // Only count power from the required power plant type
    return installedPowerPlants
      .filter(p => p.type.id === requiredType)
      .reduce((sum, p) => sum + Math.round(p.type.powerPerHullPoint * p.hullPoints), 0);
  }, [installedFTLDrive, installedPowerPlants, availablePower]);

  // Get name of required power plant type for error messages
  const requiredPowerPlantName = useMemo(() => {
    if (!installedFTLDrive?.type.requiresPowerPlantType) return null;
    const plantType = getPowerPlantTypeById(installedFTLDrive.type.requiresPowerPlantType);
    return plantType?.name ?? installedFTLDrive.type.requiresPowerPlantType;
  }, [installedFTLDrive]);

  // Design-level validation (e.g., fuel-requiring drive needs fuel tanks)
  const designValidation = useMemo(() => {
    const errors: string[] = [];
    if (installedFTLDrive?.type.requiresFuel && installedFTLFuelTanks.length === 0) {
      errors.push(`${installedFTLDrive.type.name} requires a fuel tank to operate.`);
    }
    if (requiredPowerPlantMissing) {
      errors.push(`${installedFTLDrive?.type.name} requires a ${requiredPowerPlantMissing} to operate.`);
    }
    if (installedFTLDrive && totalStats.totalPowerRequired > powerAvailableForFTL) {
      const powerSource = requiredPowerPlantName 
        ? `${requiredPowerPlantName}s`
        : 'power plants';
      errors.push(`${installedFTLDrive.type.name} requires ${totalStats.totalPowerRequired} power from ${powerSource}, but only ${powerAvailableForFTL} is available.`);
    }
    return { valid: errors.length === 0, errors };
  }, [installedFTLDrive, installedFTLFuelTanks, requiredPowerPlantMissing, totalStats.totalPowerRequired, powerAvailableForFTL, requiredPowerPlantName]);

  // ============== Handlers ==============

  const handleTypeSelect = (drive: FTLDriveType) => {
    // For fixed-size drives, install immediately without showing the config form
    if (isFixedSizeDrive(drive)) {
      const hullPoints = calculateFixedSizeHullPoints(drive, hull);
      const newInstallation: InstalledFTLDrive = {
        id: generateFTLInstallationId(),
        type: drive,
        hullPoints,
      };
      onFTLDriveChange(newInstallation);
      setSelectedType(null);
      setHullPointsInput('');
      setIsEditing(false);
      return;
    }
    
    // For variable-size drives, show the config form
    setSelectedType(drive);
    const minHP = calculateMinHullPointsForDrive(drive, hull);
    setHullPointsInput(minHP.toString());
    setIsEditing(false);
  };

  const handleAddFTLDrive = () => {
    if (!selectedType) return;

    const hullPoints = parseInt(hullPointsInput, 10) || 0;

    const validation = validateFTLInstallation(selectedType, hullPoints, hull);

    if (!validation.valid) {
      return;
    }

    const newInstallation: InstalledFTLDrive = {
      id: isEditing && installedFTLDrive ? installedFTLDrive.id : generateFTLInstallationId(),
      type: selectedType,
      hullPoints,
    };
    
    onFTLDriveChange(newInstallation);
    setSelectedType(null);
    setHullPointsInput('');
    setIsEditing(false);
  };

  const handleRemoveFTLDrive = () => {
    onFTLDriveChange(null);
    // Also remove any fuel tanks associated with this FTL drive
    onFTLFuelTanksChange([]);
    setSelectedType(null);
    setHullPointsInput('');
    setIsEditing(false);
    setAddingFuelTank(false);
    setEditingFuelTankId(null);
  };

  const handleEditFTLDrive = () => {
    if (!installedFTLDrive) return;
    // Fixed-size drives cannot be edited (their size is determined by hull)
    if (isFixedSizeDrive(installedFTLDrive.type)) return;
    
    setSelectedType(installedFTLDrive.type);
    setHullPointsInput(installedFTLDrive.hullPoints.toString());
    setIsEditing(true);
  };

  // ============== Fuel Tank Handlers ==============

  const handleStartAddFuelTank = () => {
    setAddingFuelTank(true);
    // Use minimum fuel tank HP if specified, otherwise default to 1
    const minHP = installedFTLDrive ? calculateMinFuelTankHP(installedFTLDrive.type, hull) : 1;
    setFuelTankHullPointsInput(minHP.toString());
    setEditingFuelTankId(null);
  };

  const handleAddFuelTank = () => {
    if (!installedFTLDrive) return;

    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    if (hullPoints < 1) return;

    if (editingFuelTankId) {
      const updatedFuelTank: InstalledFTLFuelTank = {
        id: editingFuelTankId,
        forFTLDriveType: installedFTLDrive.type,
        hullPoints,
      };
      onFTLFuelTanksChange(
        installedFTLFuelTanks.map(ft =>
          ft.id === editingFuelTankId ? updatedFuelTank : ft
        )
      );
    } else {
      const newFuelTank: InstalledFTLFuelTank = {
        id: generateFTLFuelTankId(),
        forFTLDriveType: installedFTLDrive.type,
        hullPoints,
      };
      onFTLFuelTanksChange([...installedFTLFuelTanks, newFuelTank]);
    }

    setAddingFuelTank(false);
    setFuelTankHullPointsInput('1');
    setEditingFuelTankId(null);
  };

  const handleEditFuelTank = (fuelTank: InstalledFTLFuelTank) => {
    setAddingFuelTank(true);
    setFuelTankHullPointsInput(fuelTank.hullPoints.toString());
    setEditingFuelTankId(fuelTank.id);
  };

  const handleRemoveFuelTank = (id: string) => {
    onFTLFuelTanksChange(
      installedFTLFuelTanks.filter(ft => ft.id !== id)
    );
  };

  // ============== Validation ==============

  const validationErrors = useMemo(() => {
    if (!selectedType) return [];
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const validation = validateFTLInstallation(selectedType, hullPoints, hull);
    return validation.errors;
  }, [selectedType, hullPointsInput, hull]);

  const fuelTankValidationErrors = useMemo(() => {
    if (!addingFuelTank || !installedFTLDrive) return [];
    const errors: string[] = [];
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    const minHP = calculateMinFuelTankHP(installedFTLDrive.type, hull);
    if (hullPoints < minHP) {
      if (installedFTLDrive.type.minFuelHullPercentage) {
        errors.push(`Fuel tank must be at least ${minHP} HP (${installedFTLDrive.type.minFuelHullPercentage}% of hull).`);
      } else {
        errors.push(`Fuel tank must be at least ${minHP} HP.`);
      }
    }
    return errors;
  }, [addingFuelTank, fuelTankHullPointsInput, installedFTLDrive, hull]);

  // Preview stats for selected FTL drive
  const previewStats = useMemo(() => {
    if (!selectedType) return null;
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const hullPercentage = calculateFTLHullPercentage(hull, hullPoints);
    
    return {
      hullPercentage,
      powerRequired: calculateFTLPowerRequired(selectedType, hullPoints),
      cost: calculateFTLCost(selectedType, hullPoints),
      ftlRating: getFTLRatingForPercentage(selectedType, hullPercentage),
    };
  }, [selectedType, hullPointsInput, hull]);

  // Preview stats for fuel tank being added/edited
  const fuelTankPreviewStats = useMemo(() => {
    if (!addingFuelTank || !installedFTLDrive) return null;
    const hullPoints = parseInt(fuelTankHullPointsInput, 10) || 0;
    const cost = calculateFTLFuelTankCost(installedFTLDrive.type, hullPoints);
    const totalFuelHP = getTotalFTLFuelTankHP(installedFTLFuelTanks, installedFTLDrive.type.id)
      + (editingFuelTankId ? -installedFTLFuelTanks.find(ft => ft.id === editingFuelTankId)!.hullPoints : 0)
      + hullPoints;
    return { cost, totalFuelHP };
  }, [addingFuelTank, installedFTLDrive, fuelTankHullPointsInput, installedFTLFuelTanks, editingFuelTankId]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Step 5: FTL Drive (Optional)
        </Typography>
        {installedFTLDrive && (
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={handleRemoveFTLDrive}
          >
            Remove FTL Drive
          </Button>
        )}
      </Box>

      {/* FTL Drive Summary */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {installedFTLDrive ? (
            <>
              <Chip
                label={`HP: ${totalStats.totalHullPoints + fuelTankStats.totalHullPoints}`}
                color="default"
                variant="outlined"
              />
              <Chip
                label={`Power: ${totalStats.totalPowerRequired}`}
                color="default"
                variant="outlined"
              />
              <Chip
                label={`Cost: ${formatCost(totalStats.totalCost + fuelTankStats.totalCost)}`}
                color="default"
                variant="outlined"
              />
              {totalStats.ftlRating !== null && (
                <Chip
                  label={formatFTLRating(totalStats.ftlRating, installedFTLDrive.type.performanceUnit)}
                  color="primary"
                  variant="outlined"
                />
              )}
              {totalStats.ftlRating === null && installedFTLDrive.type.performanceUnit === 'variable' && (
                <Chip
                  label={`Performance: ${installedFTLDrive.type.performanceUnit}`}
                  color="default"
                  variant="outlined"
                />
              )}
              {/* Fuel chip for drives that require fuel */}
              {driveRequiresFuel && (
                <Chip
                  icon={<BatteryChargingFullIcon />}
                  label={fuelTankStats.totalHullPoints > 0 
                    ? `Fuel: ${fuelTankStats.totalHullPoints} HP` 
                    : 'No fuel'}
                  color={fuelTankStats.totalHullPoints > 0 ? 'success' : 'error'}
                  variant="outlined"
                />
              )}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No FTL drive installed
            </Typography>
          )}
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

      {/* Installed FTL Drive */}
      {installedFTLDrive && !isEditing && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed FTL Drive
          </Typography>
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
              {installedFTLDrive.type.name}
            </Typography>
            <Chip
              label={`${installedFTLDrive.hullPoints} HP (${totalStats.hullPercentage.toFixed(1)}%)`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${totalStats.totalPowerRequired} Power`}
              size="small"
              variant="outlined"
            />
            {/* For fuel-requiring drives, show fuel efficiency note instead of ftlRating */}
            {installedFTLDrive.type.requiresFuel && installedFTLDrive.type.fuelEfficiencyNote ? (
              <Chip
                label={installedFTLDrive.type.fuelEfficiencyNote}
                size="small"
                color="primary"
                variant="outlined"
              />
            ) : (
              <Chip
                label={formatFTLRating(totalStats.ftlRating, installedFTLDrive.type.performanceUnit)}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label={formatCost(totalStats.totalCost)}
              size="small"
              variant="outlined"
            />
            {/* Only show edit button for variable-size drives */}
            {!isFixedSizeDrive(installedFTLDrive.type) && (
              <IconButton
                size="small"
                color="primary"
                onClick={handleEditFTLDrive}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              color="error"
              onClick={handleRemoveFTLDrive}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
          {installedFTLDrive.type.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Note: {installedFTLDrive.type.notes}
            </Typography>
          )}
        </Paper>
      )}

      {/* Installed Fuel Tanks Section */}
      {installedFTLFuelTanks.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed FTL Fuel Tanks
          </Typography>
          <Stack spacing={1}>
            {installedFTLFuelTanks.map((fuelTank) => {
              const cost = calculateFTLFuelTankCost(fuelTank.forFTLDriveType, fuelTank.hullPoints);
              const fuelPercentage = (fuelTank.hullPoints / hull.hullPoints) * 100;
              const maxJumpDistance = calculateJumpDriveMaxDistance(fuelTank.forFTLDriveType, fuelTank.hullPoints, hull.hullPoints);
              
              return (
                <Box
                  key={fuelTank.id}
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
                    FTL Fuel Tank ({fuelTank.forFTLDriveType.name})
                  </Typography>
                  <Chip
                    label={`${fuelTank.hullPoints} HP (${fuelPercentage.toFixed(1)}%)`}
                    size="small"
                    variant="outlined"
                  />
                  {maxJumpDistance !== null && maxJumpDistance > 0 && (
                    <Chip
                      label={`Max ${maxJumpDistance.toFixed(1)} LY/jump`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
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
                    color="error"
                    onClick={() => handleRemoveFuelTank(fuelTank.id)}
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
      {addingFuelTank && installedFTLDrive && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingFuelTankId ? 'Edit' : 'Add'} FTL Fuel Tank for {installedFTLDrive.type.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Hull Points"
              type="number"
              size="small"
              value={fuelTankHullPointsInput}
              onChange={(e) => setFuelTankHullPointsInput(e.target.value)}
              inputProps={{ min: calculateMinFuelTankHP(installedFTLDrive.type, hull) }}
              helperText={
                installedFTLDrive.type.minFuelHullPercentage || installedFTLDrive.type.fuelEfficiencyNote ? (
                  <>
                    {installedFTLDrive.type.minFuelHullPercentage && (
                      <>Min: {calculateMinFuelTankHP(installedFTLDrive.type, hull)} HP ({installedFTLDrive.type.minFuelHullPercentage}%)</>
                    )}
                    {installedFTLDrive.type.minFuelHullPercentage && installedFTLDrive.type.fuelEfficiencyNote && <br />}
                    {installedFTLDrive.type.fuelEfficiencyNote}
                  </>
                ) : undefined
              }
              sx={{ width: 160 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {fuelTankPreviewStats && (
                <Typography variant="caption" color="text.secondary">
                  Cost: {formatCost(fuelTankPreviewStats.cost)} | Total Fuel: {fuelTankPreviewStats.totalFuelHP} HP
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
                    setAddingFuelTank(false);
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

      {/* Quick Add Fuel Tank (when fuel-requiring drive is installed but no form is open) */}
      {driveRequiresFuel && !addingFuelTank && installedFTLDrive && !isEditing && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BatteryChargingFullIcon color={installedFTLFuelTanks.length === 0 ? 'error' : 'warning'} />
            <Typography variant="body2" sx={{ flex: 1 }}>
              {installedFTLFuelTanks.length === 0 
                ? `${installedFTLDrive.type.name} requires fuel to operate.`
                : 'Add more fuel tank capacity:'}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleStartAddFuelTank}
            >
              Add Fuel Tank
            </Button>
          </Box>
        </Paper>
      )}

      {/* Configure FTL Drive Form (only shown for variable-size drives) */}
      {selectedType && !isFixedSizeDrive(selectedType) && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {isEditing ? 'Edit' : 'Configure'} {selectedType.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Hull Points"
              type="number"
              size="small"
              value={hullPointsInput}
              onChange={(e) => setHullPointsInput(e.target.value)}
              inputProps={{ min: calculateMinHullPointsForDrive(selectedType, hull) }}
              helperText={`Min: ${calculateMinHullPointsForDrive(selectedType, hull)} (${selectedType.hullPercentage}% of hull)`}
              sx={{ width: 160 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {previewStats && (
                <Typography variant="caption" color="text.secondary">
                  {previewStats.hullPercentage.toFixed(1)}% hull | 
                  Power: {previewStats.powerRequired} | 
                  Cost: {formatCost(previewStats.cost)} | 
                  {formatFTLRating(previewStats.ftlRating, selectedType.performanceUnit)}
                </Typography>
              )}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddFTLDrive}
                  disabled={validationErrors.length > 0}
                >
                  {isEditing ? 'Save' : 'Install'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedType(null);
                    setIsEditing(false);
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

      {/* Available FTL Drives Table */}
      {!installedFTLDrive && (
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
                <TableCell sx={headerCellSx}>FTL Drive</TableCell>
                <TableCell align="center" sx={headerCellSx}>PL</TableCell>
                <TableCell align="center" sx={headerCellSx}>Tech</TableCell>
                <TableCell align="right" sx={headerCellSx}>Power/HP</TableCell>
                <TableCell align="right" sx={headerCellSx}>Base Cost</TableCell>
                <TableCell align="right" sx={headerCellSx}>Cost/HP</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 90 }}>Size</TableCell>
                <TableCell align="center" sx={headerCellSx}>Fuel</TableCell>
                <TableCell sx={headerCellSx}>Performance</TableCell>
                <TableCell sx={headerCellSx}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableDrives.map((drive) => {
                const minHP = calculateMinHullPointsForDrive(drive, hull);
                return (
                  <TableRow
                    key={drive.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleTypeSelect(drive)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                        {drive.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">{drive.progressLevel}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      {drive.techTracks.length > 0 ? (
                        <Tooltip title={drive.techTracks.map(getTechTrackName).join(', ')}>
                          <Typography variant="caption">
                            {drive.techTracks.join(', ')}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{drive.powerPerHullPoint}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                        {formatCost(drive.baseCost)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                        {formatCost(drive.costPerHullPoint)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={isFixedSizeDrive(drive) ? 'Fixed size - cannot be resized' : 'Variable size - can be increased'}>
                        <Typography variant="body2">
                          {minHP} ({drive.hullPercentage}%){isFixedSizeDrive(drive) ? '' : '+'}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      {drive.requiresFuel ? (
                        <Tooltip title={drive.fuelEfficiencyNote || 'Requires fuel tank'}>
                          <BatteryChargingFullIcon fontSize="small" color="warning" />
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">No</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {drive.performanceUnit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={drive.description + (drive.notes ? ` (${drive.notes})` : '')} placement="left">
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
                          {drive.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Show table even when drive is installed, for reference */}
      {installedFTLDrive && !selectedType && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Available FTL Drives (for reference)
          </Typography>
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              overflowX: 'auto',
              '& .MuiTable-root': {
                minWidth: 900,
              }
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Name</TableCell>
                  <TableCell align="center" sx={headerCellSx}>PL</TableCell>
                  <TableCell align="center" sx={headerCellSx}>Tech</TableCell>
                  <TableCell align="right" sx={headerCellSx}>Power/HP</TableCell>
                  <TableCell align="right" sx={headerCellSx}>Base Cost</TableCell>
                  <TableCell align="right" sx={headerCellSx}>Cost/HP</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 90 }}>Min Size</TableCell>
                  <TableCell align="center" sx={headerCellSx}>Fuel</TableCell>
                  <TableCell sx={headerCellSx}>Performance</TableCell>
                  <TableCell sx={headerCellSx}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableDrives.map((drive) => {
                  const minHP = calculateMinHullPointsForDrive(drive, hull);
                  const isInstalled = installedFTLDrive?.type.id === drive.id;
                  return (
                    <TableRow
                      key={drive.id}
                      sx={{
                        bgcolor: isInstalled ? 'action.selected' : undefined,
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={isInstalled ? 'bold' : 'medium'}>
                          {drive.name}
                          {isInstalled && ' (installed)'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{drive.progressLevel}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        {drive.techTracks.length > 0 ? (
                          <Typography variant="body2">{drive.techTracks.join(', ')}</Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{drive.powerPerHullPoint}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCost(drive.baseCost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCost(drive.costPerHullPoint)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {minHP} ({drive.hullPercentage}%){isFixedSizeDrive(drive) ? '' : '+'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {drive.requiresFuel ? (
                          <Tooltip title={drive.fuelEfficiencyNote || 'Requires fuel tank'}>
                            <BatteryChargingFullIcon fontSize="small" color="warning" />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">No</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{drive.performanceUnit}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={drive.description + (drive.notes ? ` (${drive.notes})` : '')} placement="left">
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
                            {drive.description}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
