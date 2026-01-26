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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import type { Hull } from '../types/hull';
import type { FTLDriveType, InstalledFTLDrive } from '../types/ftlDrive';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getAllFTLDriveTypes,
  calculateFTLHullPercentage,
  getFTLRatingForPercentage,
  calculateFTLPowerRequired,
  calculateFTLCost,
  calculateMinHullPointsForDrive,
  calculateTotalFTLStats,
  validateFTLInstallation,
  generateFTLInstallationId,
  formatFTLCost,
  formatFTLRating,
} from '../services/ftlDriveService';
import { formatCost, getTechTrackName } from '../services/formatters';

interface FTLDriveSelectionProps {
  hull: Hull;
  installedFTLDrive: InstalledFTLDrive | null;
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onFTLDriveChange: (drive: InstalledFTLDrive | null) => void;
}

export function FTLDriveSelection({
  hull,
  installedFTLDrive,
  usedHullPoints,
  availablePower,
  designProgressLevel,
  designTechTracks,
  onFTLDriveChange,
}: FTLDriveSelectionProps) {
  const [selectedType, setSelectedType] = useState<FTLDriveType | null>(null);
  const [hullPointsInput, setHullPointsInput] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Get all FTL drives, then filter by design constraints
  const availableDrives = useMemo(() => {
    const allDrives = getAllFTLDriveTypes();
    return allDrives.filter((drive) => {
      // Filter by progress level
      if (drive.progressLevel > designProgressLevel) {
        return false;
      }
      // Filter by tech tracks (if any are selected)
      if (designTechTracks.length > 0 && drive.techTracks.length > 0) {
        const hasAllowedTech = drive.techTracks.every((track) =>
          designTechTracks.includes(track)
        );
        if (!hasAllowedTech) {
          return false;
        }
      }
      return true;
    });
  }, [designProgressLevel, designTechTracks]);

  const totalStats = useMemo(
    () => calculateTotalFTLStats(installedFTLDrive, hull),
    [installedFTLDrive, hull]
  );

  // ============== Handlers ==============

  const handleTypeSelect = (drive: FTLDriveType) => {
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
    setSelectedType(null);
    setHullPointsInput('');
    setIsEditing(false);
  };

  const handleEditFTLDrive = () => {
    if (!installedFTLDrive) return;
    setSelectedType(installedFTLDrive.type);
    setHullPointsInput(installedFTLDrive.hullPoints.toString());
    setIsEditing(true);
  };

  // ============== Validation ==============

  const validationErrors = useMemo(() => {
    if (!selectedType) return [];
    const hullPoints = parseInt(hullPointsInput, 10) || 0;
    const validation = validateFTLInstallation(selectedType, hullPoints, hull);
    return validation.errors;
  }, [selectedType, hullPointsInput, hull]);

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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
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
                icon={<RocketLaunchIcon />}
                label={installedFTLDrive.type.name}
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`HP: ${totalStats.totalHullPoints} (${totalStats.hullPercentage.toFixed(1)}%)`}
                color="default"
                variant="outlined"
              />
              <Chip
                label={`Power: ${totalStats.totalPowerRequired}`}
                color="default"
                variant="outlined"
              />
              <Chip
                label={`Cost: ${formatFTLCost(totalStats.totalCost)}`}
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
              {totalStats.ftlRating === null && installedFTLDrive.type.performanceType === 'variable' && (
                <Chip
                  label={`Performance: ${installedFTLDrive.type.performanceUnit}`}
                  color="default"
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
            <Chip
              label={formatFTLRating(totalStats.ftlRating, installedFTLDrive.type.performanceUnit)}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={formatFTLCost(totalStats.totalCost)}
              size="small"
              variant="outlined"
            />
            <IconButton
              size="small"
              color="primary"
              onClick={handleEditFTLDrive}
            >
              <EditIcon fontSize="small" />
            </IconButton>
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

      {/* Configure FTL Drive Form */}
      {selectedType && (
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
              helperText={`Min: ${calculateMinHullPointsForDrive(selectedType, hull)}${selectedType.fixedHullPercentage ? ` (${selectedType.fixedHullPercentage}% of hull)` : ''}`}
              sx={{ width: 160 }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {previewStats && (
                <Typography variant="caption" color="text.secondary">
                  {previewStats.hullPercentage.toFixed(1)}% hull | 
                  Power: {previewStats.powerRequired} | 
                  Cost: {formatFTLCost(previewStats.cost)} | 
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
      {!installedFTLDrive && !selectedType && (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            overflowX: 'auto',
            '& .MuiTable-root': {
              minWidth: 1000,
            }
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power/HP</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 90 }}>Min Size</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Base Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Performance</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
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
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTypeSelect(drive);
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
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
                    <TableCell align="center">
                      <Typography variant="body2">
                        {minHP}{drive.fixedHullPercentage ? ` (${drive.fixedHullPercentage}%)` : ''}
                      </Typography>
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
                    <TableCell>
                      <Typography variant="body2">
                        {drive.performanceUnit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={drive.description + (drive.notes ? ` (${drive.notes})` : '')}>
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
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
                minWidth: 700,
              }
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power/HP</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 90 }}>Min Size</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Base Cost</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Performance</TableCell>
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
                      <TableCell align="center">
                        <Typography variant="body2">
                          {minHP}
                          {drive.fixedHullPercentage && ` (${drive.fixedHullPercentage}%)`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatCost(drive.baseCost)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{drive.performanceUnit}</Typography>
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
