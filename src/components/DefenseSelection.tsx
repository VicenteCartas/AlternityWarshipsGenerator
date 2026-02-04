import { useState, useMemo, useRef, Fragment } from 'react';
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
  Stack,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WarningIcon from '@mui/icons-material/Warning';
import { headerCellSx } from '../constants/tableStyles';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { DefenseSystemType, InstalledDefenseSystem } from '../types/defense';
import {
  getAllDefenseSystemTypes,
  filterByDesignConstraints,
  calculateDefenseStats,
  calculateDefenseHullPoints,
  calculateDefensePower,
  calculateDefenseCost,
  calculateUnitsForFullCoverage,
  generateDefenseId,
  hasScreenConflict,
  getInstalledScreenNames,
} from '../services/defenseService';
import { formatCost, getTechTrackName } from '../services/formatters';

interface DefenseSelectionProps {
  hull: Hull;
  installedDefenses: InstalledDefenseSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onDefensesChange: (defenses: InstalledDefenseSystem[]) => void;
}

export function DefenseSelection({
  hull,
  installedDefenses,
  designProgressLevel,
  designTechTracks,
  onDefensesChange,
}: DefenseSelectionProps) {
  const [selectedDefense, setSelectedDefense] = useState<DefenseSystemType | null>(null);
  const [defenseQuantity, setDefenseQuantity] = useState<string>('1');
  const [editingDefenseId, setEditingDefenseId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get filtered defense types
  const availableDefenses = useMemo(() => {
    const filtered = filterByDesignConstraints(getAllDefenseSystemTypes(), designProgressLevel, designTechTracks);
    // Further filter by requiresInstalled - only show if prerequisite is installed
    return filtered.filter((defense) => {
      if (!defense.requiresInstalled) return true;
      return installedDefenses.some((d) => d.type.id === defense.requiresInstalled);
    });
  }, [designProgressLevel, designTechTracks, installedDefenses]);

  // Calculate stats
  const stats = useMemo(
    () => calculateDefenseStats(installedDefenses),
    [installedDefenses]
  );

  // Group defenses by category for display
  const defensesByCategory = useMemo(() => {
    const groups: Record<string, DefenseSystemType[]> = {
      screen: [],
      countermeasure: [],
      repair: [],
      'shield-component': [],
    };
    for (const defense of availableDefenses) {
      groups[defense.category].push(defense);
    }
    return groups;
  }, [availableDefenses]);

  // Handlers
  const handleSelectDefense = (type: DefenseSystemType) => {
    setSelectedDefense(type);
    // Default to full coverage for screen types
    if (type.coverage > 0) {
      const fullCoverage = calculateUnitsForFullCoverage(type, hull.hullPoints);
      setDefenseQuantity(fullCoverage.toString());
    } else {
      setDefenseQuantity('1');
    }
    setEditingDefenseId(null);
    // Scroll to form - use center to show the form in the middle of the viewport
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddDefense = () => {
    if (!selectedDefense) return;
    const quantity = parseInt(defenseQuantity, 10) || 1;

    const hullPts = calculateDefenseHullPoints(selectedDefense, hull.hullPoints, quantity);
    const power = calculateDefensePower(selectedDefense, hull.hullPoints, quantity);
    const cost = calculateDefenseCost(selectedDefense, hull.hullPoints, quantity);

    if (editingDefenseId) {
      // Update existing
      onDefensesChange(
        installedDefenses.map((d) =>
          d.id === editingDefenseId
            ? { ...d, type: selectedDefense, quantity, hullPoints: hullPts, powerRequired: power, cost }
            : d
        )
      );
    } else {
      // Check if same type already exists
      const existing = installedDefenses.find((d) => d.type.id === selectedDefense.id);
      if (existing) {
        // For coverage-based or percentage-based systems, don't stack - just ignore re-add
        if (selectedDefense.coverage > 0 || selectedDefense.hullPercentage) {
          // Already installed at full coverage, nothing to do
          setSelectedDefense(null);
          setDefenseQuantity('1');
          setEditingDefenseId(null);
          return;
        }
        // Update quantity for stackable systems
        const newQuantity = existing.quantity + quantity;
        const newHullPts = calculateDefenseHullPoints(selectedDefense, hull.hullPoints, newQuantity);
        const newPower = calculateDefensePower(selectedDefense, hull.hullPoints, newQuantity);
        const newCost = calculateDefenseCost(selectedDefense, hull.hullPoints, newQuantity);
        onDefensesChange(
          installedDefenses.map((d) =>
            d.id === existing.id
              ? { ...d, quantity: newQuantity, hullPoints: newHullPts, powerRequired: newPower, cost: newCost }
              : d
          )
        );
      } else {
        // For repair systems, replace existing if there is one
        let updatedDefenses = installedDefenses;
        if (selectedDefense.category === 'repair' && installedRepairSystem) {
          updatedDefenses = installedDefenses.filter((d) => d.type.category !== 'repair');
        }
        // Add new
        onDefensesChange([
          ...updatedDefenses,
          {
            id: generateDefenseId(),
            type: selectedDefense,
            quantity,
            hullPoints: hullPts,
            powerRequired: power,
            cost,
          },
        ]);
      }
    }

    setSelectedDefense(null);
    setDefenseQuantity('1');
    setEditingDefenseId(null);
  };

  const handleEditDefense = (installed: InstalledDefenseSystem) => {
    setSelectedDefense(installed.type);
    setDefenseQuantity(installed.quantity.toString());
    setEditingDefenseId(installed.id);
  };

  const handleRemoveDefense = (id: string) => {
    onDefensesChange(installedDefenses.filter((d) => d.id !== id));
  };

  // Check for screen conflicts
  const screenConflict = selectedDefense ? hasScreenConflict(installedDefenses, selectedDefense) : false;
  const installedScreenNames = getInstalledScreenNames(installedDefenses);

  // Check for repair system conflicts (only one repair system allowed)
  const installedRepairSystem = installedDefenses.find((d) => d.type.category === 'repair');
  const repairConflict = selectedDefense?.category === 'repair' && installedRepairSystem && installedRepairSystem.type.id !== selectedDefense.id;

  // Check for installed countermeasures
  const installedCountermeasures = installedDefenses.filter((d) => d.type.category === 'countermeasure');

  // Check if any installed countermeasures are incompatible with each other
  const hasIncompatibleCountermeasures = useMemo(() => {
    for (const cm of installedCountermeasures) {
      if (cm.type.incompatibleWith?.some((id) => 
        installedCountermeasures.some((other) => other.type.id === id)
      )) {
        return true;
      }
    }
    return false;
  }, [installedCountermeasures]);

  // Check for countermeasure incompatibilities when adding new one
  const incompatibleCountermeasures = useMemo(() => {
    if (!selectedDefense?.incompatibleWith?.length) return [];
    return installedDefenses
      .filter((d) => selectedDefense.incompatibleWith?.includes(d.type.id))
      .map((d) => d.type.name);
  }, [selectedDefense, installedDefenses]);

  // Check for systems with missing required components
  const systemsMissingComponents = useMemo(() => {
    return installedDefenses.filter((defense) => {
      if (!defense.type.requiresComponents?.length) return false;
      // Check if at least one of the required components is installed
      return !defense.type.requiresComponents.some((reqId) =>
        installedDefenses.some((d) => d.type.id === reqId)
      );
    });
  }, [installedDefenses]);

  // Calculate preview values
  const previewQuantity = parseInt(defenseQuantity, 10) || 1;
  const previewHullPts = selectedDefense ? calculateDefenseHullPoints(selectedDefense, hull.hullPoints, previewQuantity) : 0;
  const previewPower = selectedDefense ? calculateDefensePower(selectedDefense, hull.hullPoints, previewQuantity) : 0;
  const previewCost = selectedDefense ? calculateDefenseCost(selectedDefense, hull.hullPoints, previewQuantity) : 0;

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'screen': return 'Screens';
      case 'countermeasure': return 'Countermeasures';
      case 'repair': return 'Repair Systems';
      case 'shield-component': return 'Shield Components';
      default: return category;
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 8: Defenses (Optional)
      </Typography>

      {/* Summary Chips */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip
            label={`HP: ${stats.totalHullPoints}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Power: ${stats.totalPowerRequired}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Cost: ${formatCost(stats.totalCost)}`}
            color="default"
            variant="outlined"
          />
          {installedScreenNames.length > 0 && (
            <Chip
              label="Screens"
              color="primary"
              variant="outlined"
            />
          )}
          {installedCountermeasures.length > 0 && (
            <Chip
              label="Countermeasures"
              color="primary"
              variant="outlined"
            />
          )}
          {installedRepairSystem && (
            <Chip
              label="Repair System"
              color="primary"
              variant="outlined"
            />
          )}
          {/* Warning chips at the end */}
          {installedDefenses.length === 0 && (
            <Chip
              icon={<WarningIcon />}
              label="No Defenses"
              color="warning"
              variant="outlined"
            />
          )}
          {installedScreenNames.length > 1 && (
            <Chip
              icon={<WarningIcon />}
              label="Multiple Screens"
              color="warning"
              variant="outlined"
            />
          )}
          {hasIncompatibleCountermeasures && (
            <Chip
              icon={<WarningIcon />}
              label="Incompatible"
              color="warning"
              variant="outlined"
            />
          )}
          {systemsMissingComponents.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label="Missing Components"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Installed Defenses */}
      {installedDefenses.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Defenses
          </Typography>
          <Stack spacing={1}>
            {installedDefenses.map((defense) => (
              <Box
                key={defense.id}
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
                  {defense.type.name}
                  {defense.quantity > 1 && ` (×${defense.quantity})`}
                </Typography>
                <Chip
                  label={`${defense.hullPoints} HP`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={`${defense.powerRequired} Power`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={formatCost(defense.cost)}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={defense.type.shieldPoints 
                    ? `${defense.type.shieldPoints * defense.quantity} shield points`
                    : defense.type.effect
                  }
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {/* Multiple screens warning */}
                {defense.type.category === 'screen' && installedScreenNames.length > 1 && (
                  <Chip
                    icon={<WarningIcon />}
                    label="Multiple Screens"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {/* Countermeasure incompatibility warning */}
                {defense.type.incompatibleWith?.some((id) => 
                  installedDefenses.some((d) => d.type.id === id)
                ) && (
                  <Chip
                    icon={<WarningIcon />}
                    label="Incompatible"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {/* Missing required components warning */}
                {defense.type.requiresComponents?.length && !defense.type.requiresComponents.some((reqId) =>
                  installedDefenses.some((d) => d.type.id === reqId)
                ) && (
                  <Chip
                    icon={<WarningIcon />}
                    label="Missing Components"
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                {/* Edit button only for defenses where quantity/size can be changed */}
                {!defense.type.hullPercentage && (!defense.type.coverage || defense.type.allowVariableSize) && (
                  <IconButton
                    size="small"
                    onClick={() => handleEditDefense(defense)}
                    color="primary"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={() => handleRemoveDefense(defense.id)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Configure Form - appears when a defense is selected */}
      {selectedDefense && (
        <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingDefenseId ? 'Edit' : 'Add'} {selectedDefense.name}
          </Typography>

          {/* Screen conflict warning */}
          {screenConflict && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              Only one screen type may be active at a time. You already have: {installedScreenNames.join(', ')}
            </Alert>
          )}

          {/* Repair system conflict warning */}
          {repairConflict && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              Only one repair system can be installed. Adding this will replace: {installedRepairSystem?.type.name}
            </Alert>
          )}

          {/* Countermeasure incompatibility warning */}
          {incompatibleCountermeasures.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              Cannot be used at the same time as: {incompatibleCountermeasures.join(', ')}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Quantity input - for non-percentage, non-coverage systems, or coverage systems with allowVariableSize */}
            {!selectedDefense.hullPercentage && (!selectedDefense.coverage || selectedDefense.allowVariableSize) && (
              <TextField
                label={selectedDefense.allowVariableSize ? "Size" : "Quantity"}
                type="number"
                size="small"
                value={defenseQuantity}
                onChange={(e) => setDefenseQuantity(e.target.value)}
                inputProps={{ min: selectedDefense.allowVariableSize ? calculateUnitsForFullCoverage(selectedDefense, hull.hullPoints) : 1 }}
                helperText={selectedDefense.allowVariableSize ? `Min: ${calculateUnitsForFullCoverage(selectedDefense, hull.hullPoints)} (full coverage)` : undefined}
                sx={{ width: selectedDefense.allowVariableSize ? 180 : 100 }}
              />
            )}
            {/* Coverage-based systems without variable size show auto-calculated size */}
            {selectedDefense.coverage > 0 && !selectedDefense.allowVariableSize && (
              <Chip
                label={`Size: ${previewQuantity} (auto-calculated for full coverage)`}
                size="small"
                color="info"
                variant="outlined"
              />
            )}

            {/* Preview stats */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Chip label={`HP: ${previewHullPts}`} size="small" variant="outlined" />
              <Chip label={`Power: ${previewPower}`} size="small" variant="outlined" />
              <Chip label={`Cost: ${formatCost(previewCost)}`} size="small" variant="outlined" />
            </Box>

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={editingDefenseId ? <SaveIcon /> : <AddIcon />}
                onClick={handleAddDefense}
              >
                {editingDefenseId ? 'Save' : 'Add'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedDefense(null);
                  setDefenseQuantity('1');
                  setEditingDefenseId(null);
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>

          {/* Description */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {selectedDefense.description}
          </Typography>
          <Typography variant="body2" color="primary" sx={{ mt: 0.5 }}>
            Effect: {selectedDefense.effect}
          </Typography>
        </Paper>
      )}

      {/* Available Defenses by Category */}
      {Object.entries(defensesByCategory).map(([category, defenses]) => {
        // Skip shield-component category - these are shown inline under their parent system
        if (category === 'shield-component' || defenses.length === 0) return null;
        
        return (
          <Paper key={category} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {getCategoryLabel(category)}
            </Typography>
            <TableContainer sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1100 } }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: 180, whiteSpace: 'nowrap' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }} align="center">PL</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Tech</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }} align="right">HP</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }} align="right">Power</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 100, whiteSpace: 'nowrap' }} align="right">Cost</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 80, whiteSpace: 'nowrap' }} align="right">Coverage</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 250, whiteSpace: 'nowrap' }}>Effect</TableCell>
                    <TableCell sx={headerCellSx}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {defenses.map((defense) => {
                    const isSelected = selectedDefense?.id === defense.id;
                    const hpDisplay = defense.hullPercentage ? `${defense.hullPoints}%` : defense.hullPoints;
                    const powerDisplay = defense.powerPerHull ? `${defense.powerRequired}/HP` : defense.powerRequired;
                    const costDisplay = defense.costPerHull ? `${formatCost(defense.cost)}/HP` : formatCost(defense.cost);
                    const coverageDisplay = defense.coverage > 0 ? `${defense.coverage} HP` : '-';

                    // Get required components for this defense (if any and if the defense is installed)
                    const requiredComponents = defense.requiresComponents && 
                      installedDefenses.some((d) => d.type.id === defense.id)
                        ? availableDefenses.filter((d) => defense.requiresComponents?.includes(d.id))
                        : [];

                    return (
                      <Fragment key={defense.id}>
                        <TableRow
                          hover
                          selected={isSelected}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => handleSelectDefense(defense)}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                              {defense.name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{defense.progressLevel}</TableCell>
                          <TableCell>
                            <Tooltip title={defense.techTracks.map(t => getTechTrackName(t)).join(', ') || 'None'}>
                              <Typography variant="caption">
                                {defense.techTracks.length > 0 ? defense.techTracks.join(', ') : 'None'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">{hpDisplay}</TableCell>
                          <TableCell align="right">{powerDisplay}</TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{costDisplay}</TableCell>
                          <TableCell align="right">{coverageDisplay}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{defense.effect}</TableCell>
                          <TableCell>
                            <Tooltip title={defense.description} placement="left">
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
                                {defense.description}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                        {/* Render required components inline under parent */}
                        {requiredComponents.map((comp) => {
                          const compIsSelected = selectedDefense?.id === comp.id;
                          const compHpDisplay = comp.hullPercentage ? `${comp.hullPoints}%` : comp.hullPoints;
                          const compPowerDisplay = comp.powerPerHull ? `${comp.powerRequired}/HP` : comp.powerRequired;
                          const compCostDisplay = comp.costPerHull ? `${formatCost(comp.cost)}/HP` : formatCost(comp.cost);
                          const compCoverageDisplay = comp.coverage > 0 ? `${comp.coverage} HP` : '-';

                          return (
                            <TableRow
                              key={comp.id}
                              hover
                              selected={compIsSelected}
                              sx={{ cursor: 'pointer', bgcolor: 'action.hover' }}
                              onClick={() => handleSelectDefense(comp)}
                            >
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap', pl: 2 }}>
                                  ↳ {comp.name}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">{comp.progressLevel}</TableCell>
                              <TableCell>
                                <Tooltip title={comp.techTracks.map(t => getTechTrackName(t)).join(', ') || 'None'}>
                                  <Typography variant="caption">
                                    {comp.techTracks.length > 0 ? comp.techTracks.join(', ') : 'None'}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell align="right">{compHpDisplay}</TableCell>
                              <TableCell align="right">{compPowerDisplay}</TableCell>
                              <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{compCostDisplay}</TableCell>
                              <TableCell align="right">{compCoverageDisplay}</TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap' }}>{comp.effect}</TableCell>
                              <TableCell>
                                <Tooltip title={comp.description} placement="left">
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
                                    {comp.description}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        );
      })}
    </Box>
  );
}
