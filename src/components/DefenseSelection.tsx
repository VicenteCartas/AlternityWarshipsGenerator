import { useState, useMemo, useRef } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WarningIcon from '@mui/icons-material/Warning';
import { TabPanel } from './shared';
import { headerCellSx } from '../constants/tableStyles';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { DefenseSystemType, InstalledDefenseSystem } from '../types/defense';
import {
  getAllDefenseSystemTypes,
  calculateDefenseStats,
  calculateDefenseHullPoints,
  calculateDefensePower,
  calculateDefenseCost,
  calculateUnitsForFullCoverage,
  generateDefenseId,
  hasScreenConflict,
  getInstalledScreenNames,
} from '../services/defenseService';
import { filterByDesignConstraints } from '../services/utilities';
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
  const [activeTab, setActiveTab] = useState(0);
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

  // Count installed defenses by category
  const installedByCategory = useMemo(() => {
    const counts = { screen: 0, countermeasure: 0, repair: 0 };
    for (const defense of installedDefenses) {
      if (defense.type.category === 'screen' || defense.type.category === 'shield-component') {
        counts.screen++;
      } else if (defense.type.category === 'countermeasure') {
        counts.countermeasure++;
      } else if (defense.type.category === 'repair') {
        counts.repair++;
      }
    }
    return counts;
  }, [installedDefenses]);

  // Handlers
  const handleSelectDefense = (type: DefenseSystemType) => {
    setSelectedDefense(type);
    // Default to full coverage for fixed-coverage screen types (quantity = raw unit count)
    // For coverageMultiples, quantity means "number of sets" so default to 1
    if (type.fixedCoverage && type.coverage > 0) {
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
        // For percentage-based systems, don't stack - just ignore re-add
        if (selectedDefense.hullPercentage > 0) {
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

  const handleDuplicateDefense = (defense: InstalledDefenseSystem) => {
    const newDefense: InstalledDefenseSystem = {
      ...defense,
      id: generateDefenseId(),
    };
    const index = installedDefenses.findIndex((d) => d.id === defense.id);
    const updated = [...installedDefenses];
    updated.splice(index + 1, 0, newDefense);
    onDefensesChange(updated);
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

  // Helper to render installed defenses for a specific category
  const renderInstalledDefenses = (category: 'screen' | 'countermeasure' | 'repair') => {
    const categoryDefenses = installedDefenses.filter((d) => 
      category === 'screen' 
        ? (d.type.category === 'screen' || d.type.category === 'shield-component')
        : d.type.category === category
    );
    
    if (categoryDefenses.length === 0) return null;

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed {getCategoryLabel(category)}
        </Typography>
        <Stack spacing={1}>
          {categoryDefenses.map((defense) => (
            <Box
              key={defense.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: editingDefenseId === defense.id ? 'action.selected' : 'action.hover',
                borderRadius: 1,
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {defense.type.name}
                {defense.quantity > 1 && !defense.type.fixedCoverage && ` (×${defense.quantity})`}
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
                label={defense.type.shieldPoints 
                  ? `${defense.type.shieldPoints * defense.quantity} shield points`
                  : defense.type.effect
                }
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={formatCost(defense.cost)}
                size="small"
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
              {/* Edit button - not shown for percentage-based or fixed coverage systems */}
              {!(defense.type.hullPercentage > 0) && !defense.type.fixedCoverage && (
                <IconButton
                  size="small"
                  onClick={() => handleEditDefense(defense)}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              {/* Duplicate button - not shown for percentage-based or fixed coverage systems */}
              {!(defense.type.hullPercentage > 0) && !defense.type.fixedCoverage && (
                <IconButton
                  size="small"
                  onClick={() => handleDuplicateDefense(defense)}
                >
                  <ContentCopyIcon fontSize="small" />
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
    );
  };

  // Helper to render configure form (only if selected defense matches category)
  const renderConfigureForm = (category: 'screen' | 'countermeasure' | 'repair') => {
    if (!selectedDefense) return null;
    
    const defenseCategory = selectedDefense.category === 'shield-component' ? 'screen' : selectedDefense.category;
    if (defenseCategory !== category) return null;

    // Simple quantity change handler
    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDefenseQuantity(e.target.value);
    };

    // Determine if quantity input should be shown
    const showQuantityInput = !(selectedDefense.hullPercentage > 0) && !selectedDefense.fixedCoverage;

    return (
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          {editingDefenseId ? 'Edit' : 'Add'} {selectedDefense.name}
        </Typography>

        {/* Warnings */}
        {screenConflict && (
          <Alert severity="warning" sx={{ mb: 1 }} icon={<WarningIcon />}>
            Only one screen type may be active at a time. You already have: {installedScreenNames.join(', ')}
          </Alert>
        )}
        {repairConflict && (
          <Alert severity="warning" sx={{ mb: 1 }} icon={<WarningIcon />}>
            Only one repair system can be installed. Adding this will replace: {installedRepairSystem?.type.name}
          </Alert>
        )}
        {incompatibleCountermeasures.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1 }} icon={<WarningIcon />}>
            Cannot be used at the same time as: {incompatibleCountermeasures.join(', ')}
          </Alert>
        )}

        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          {/* Quantity/Size input - not shown for percentage-based or fixed coverage */}
          {showQuantityInput && (
            <TextField
              type="number"
              size="small"
              value={defenseQuantity}
              onChange={handleQuantityChange}
              inputProps={{ 
                min: 1, 
                max: 99,
                style: { textAlign: 'center', width: 40 } 
              }}
              sx={{ width: 90 }}
              label={selectedDefense.allowVariableSize ? "Size" : "Quantity"}
            />
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} | Power: {previewPower}
              {selectedDefense.fixedCoverage && ` | Qty: ${calculateUnitsForFullCoverage(selectedDefense, hull.hullPoints)}`}
              {' | '}
              {selectedDefense.shieldPoints 
                ? `${selectedDefense.shieldPoints * (selectedDefense.fixedCoverage ? calculateUnitsForFullCoverage(selectedDefense, hull.hullPoints) : previewQuantity)} shield points`
                : selectedDefense.effect}
              {` | Cost: ${formatCost(previewCost)}`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
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
              <Button
                variant="contained"
                size="small"
                startIcon={editingDefenseId ? <SaveIcon /> : <AddIcon />}
                onClick={handleAddDefense}
              >
                {editingDefenseId ? 'Save' : 'Add'}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Helper to render the defense grid for a category
  const renderDefenseGrid = (category: 'screen' | 'countermeasure' | 'repair') => {
    // For screens, include both screen and shield-component categories
    const defenses = category === 'screen' 
      ? [...(defensesByCategory.screen || []), ...(defensesByCategory['shield-component'] || [])]
      : defensesByCategory[category] || [];
    
    if (defenses.length === 0) return null;

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1100 } }}>
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
            {defenses
              .sort((a, b) => a.progressLevel - b.progressLevel)
              .map((defense) => {
                const isSelected = selectedDefense?.id === defense.id;
                const hpDisplay = defense.hullPercentage > 0 ? `${defense.hullPercentage}%` : defense.hullPoints;
                const powerDisplay = defense.powerPer === 'systemHp' ? `${defense.powerRequired}/HP` : defense.powerRequired;
                const costDisplay = defense.costPer === 'systemHp' ? `${formatCost(defense.cost)}/HP` : formatCost(defense.cost);
                const coverageDisplay = defense.coverage > 0 ? `${defense.coverage} HP` : '-';

                // Check if this is a shield component and indent if parent is installed
                const isShieldComponent = defense.category === 'shield-component';
                const parentInstalled = isShieldComponent && defense.requiresInstalled && 
                  installedDefenses.some((d) => d.type.id === defense.requiresInstalled);

                return (
                  <TableRow
                    key={defense.id}
                    hover
                    selected={isSelected}
                    sx={{
                      cursor: 'pointer',
                      '&.Mui-selected': { backgroundColor: 'action.selected' },
                      '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                    }}
                    onClick={() => handleSelectDefense(defense)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap', pl: parentInstalled ? 2 : 0 }}>
                        {parentInstalled && '↳ '}{defense.name}
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
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Tab render functions
  const renderScreensTab = () => (
    <Box>
      {renderInstalledDefenses('screen')}
      {renderConfigureForm('screen')}
      {renderDefenseGrid('screen')}
    </Box>
  );

  const renderCountermeasuresTab = () => (
    <Box>
      {renderInstalledDefenses('countermeasure')}
      {renderConfigureForm('countermeasure')}
      {renderDefenseGrid('countermeasure')}
    </Box>
  );

  const renderRepairTab = () => (
    <Box>
      {renderInstalledDefenses('repair')}
      {renderConfigureForm('repair')}
      {renderDefenseGrid('repair')}
    </Box>
  );

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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label={`Screens (${installedByCategory.screen})`} />
          <Tab label={`Countermeasures (${installedByCategory.countermeasure})`} />
          <Tab label={`Repair Systems (${installedByCategory.repair})`} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderScreensTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        {renderCountermeasuresTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        {renderRepairTab()}
      </TabPanel>
    </Box>
  );
}
