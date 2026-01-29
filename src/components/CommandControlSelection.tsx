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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WarningIcon from '@mui/icons-material/Warning';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { CommandControlSystemType, InstalledCommandControlSystem } from '../types/commandControl';
import {
  getAllCommandControlSystemTypes,
  filterByDesignConstraints,
  filterCommandSystemsByShipSize,
  calculateCommandControlStats,
  calculateCommandControlHullPoints,
  calculateCommandControlPower,
  calculateCommandControlCost,
  generateCommandControlId,
  hasCommandSystemInstalled,
  hasComputerCoreInstalled,
  getInstalledComputerCoreQuality,
  calculateRequiredComputerCoreHullPoints,
} from '../services/commandControlService';
import { formatCost } from '../services/formatters';
import { TechTrackCell } from './shared';

interface CommandControlSelectionProps {
  hull: Hull;
  installedSystems: InstalledCommandControlSystem[];
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onSystemsChange: (systems: InstalledCommandControlSystem[]) => void;
}

export function CommandControlSelection({
  hull,
  installedSystems,
  usedHullPoints: _usedHullPoints,
  availablePower: _availablePower,
  designProgressLevel,
  designTechTracks,
  onSystemsChange,
}: CommandControlSelectionProps) {
  const [selectedSystem, setSelectedSystem] = useState<CommandControlSystemType | null>(null);
  const [systemQuantity, setSystemQuantity] = useState<string>('1');
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get filtered system types
  const availableSystems = useMemo(() => {
    let filtered = filterByDesignConstraints(getAllCommandControlSystemTypes(), designProgressLevel, designTechTracks);
    // Filter by ship size (cockpit only for small ships)
    filtered = filterCommandSystemsByShipSize(filtered, hull.hullPoints);
    return filtered;
  }, [designProgressLevel, designTechTracks, hull.hullPoints]);

  // Calculate stats
  const stats = useMemo(
    () => calculateCommandControlStats(installedSystems, hull.hullPoints),
    [installedSystems, hull.hullPoints]
  );

  // Group systems by category for display
  const systemsByCategory = useMemo(() => {
    const groups: Record<string, CommandControlSystemType[]> = {
      command: [],
      communication: [],
      computer: [],
    };
    for (const system of availableSystems) {
      groups[system.category].push(system);
    }
    return groups;
  }, [availableSystems]);

  // Check what's installed
  const hasCommand = hasCommandSystemInstalled(installedSystems);
  const hasCore = hasComputerCoreInstalled(installedSystems);
  const coreQuality = getInstalledComputerCoreQuality(installedSystems);
  const requiredCoreHP = calculateRequiredComputerCoreHullPoints(hull.hullPoints);

  // Handlers
  const handleSelectSystem = (type: CommandControlSystemType) => {
    setSelectedSystem(type);
    // Default quantity handling
    if (type.id === 'command-deck') {
      // Command deck is one unit
      setSystemQuantity('1');
    } else if (type.id === 'cockpit') {
      // Default to 1 station
      setSystemQuantity('1');
    } else if (type.hullPer200) {
      // Computer cores need HP based on ship size
      setSystemQuantity(requiredCoreHP.toString());
    } else {
      setSystemQuantity('1');
    }
    setEditingSystemId(null);
    // Scroll to form
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddSystem = () => {
    if (!selectedSystem) return;
    const quantity = parseInt(systemQuantity, 10) || 1;

    const hullPts = calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, quantity);
    const power = calculateCommandControlPower(selectedSystem, quantity);
    const cost = calculateCommandControlCost(selectedSystem, hull.hullPoints, quantity);

    if (editingSystemId) {
      // Update existing
      onSystemsChange(
        installedSystems.map((s) =>
          s.id === editingSystemId
            ? { ...s, type: selectedSystem, quantity, hullPoints: hullPts, powerRequired: power, cost }
            : s
        )
      );
    } else {
      // Check for conflicts
      let updatedSystems = installedSystems;

      // Command systems: only one cockpit OR command deck allowed
      if (selectedSystem.isRequired) {
        updatedSystems = installedSystems.filter((s) => !s.type.isRequired);
      }

      // Computer cores: only one type allowed, but can add HP
      if (selectedSystem.id.startsWith('computer-core')) {
        updatedSystems = installedSystems.filter((s) => !s.type.id.startsWith('computer-core'));
      }

      // Check if same type already exists (for stackable items)
      const existing = updatedSystems.find((s) => s.type.id === selectedSystem.id);
      if (existing && !selectedSystem.isRequired && !selectedSystem.hullPer200) {
        // Stack quantities
        const newQuantity = existing.quantity + quantity;
        const newHullPts = calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, newQuantity);
        const newPower = calculateCommandControlPower(selectedSystem, newQuantity);
        const newCost = calculateCommandControlCost(selectedSystem, hull.hullPoints, newQuantity);
        onSystemsChange(
          updatedSystems.map((s) =>
            s.id === existing.id
              ? { ...s, quantity: newQuantity, hullPoints: newHullPts, powerRequired: newPower, cost: newCost }
              : s
          )
        );
      } else {
        // Add new
        onSystemsChange([
          ...updatedSystems,
          {
            id: generateCommandControlId(),
            type: selectedSystem,
            quantity,
            hullPoints: hullPts,
            powerRequired: power,
            cost,
          },
        ]);
      }
    }

    setSelectedSystem(null);
    setSystemQuantity('1');
    setEditingSystemId(null);
  };

  const handleEditSystem = (installed: InstalledCommandControlSystem) => {
    setSelectedSystem(installed.type);
    setSystemQuantity(installed.quantity.toString());
    setEditingSystemId(installed.id);
  };

  const handleRemoveSystem = (id: string) => {
    onSystemsChange(installedSystems.filter((s) => s.id !== id));
  };

  // Compute warnings
  const commandConflict = selectedSystem?.isRequired && hasCommand;
  const coreConflict = selectedSystem?.id.startsWith('computer-core') && hasCore;

  // Check if a control computer exceeds core quality
  const controlQualityWarning = useMemo(() => {
    if (!selectedSystem?.isDedicated) return false;
    if (!selectedSystem.quality) return false;
    if (!coreQuality) return true; // No core installed
    const qualityOrder = { 'Ordinary': 1, 'Good': 2, 'Amazing': 3 };
    return qualityOrder[selectedSystem.quality] > qualityOrder[coreQuality];
  }, [selectedSystem, coreQuality]);

  // Check installed control computers for quality issues
  const controlsWithQualityIssues = useMemo(() => {
    if (!coreQuality) {
      // No core - all control computers have issues
      return installedSystems.filter((s) => s.type.isDedicated);
    }
    const qualityOrder = { 'Ordinary': 1, 'Good': 2, 'Amazing': 3 };
    return installedSystems.filter((s) => {
      if (!s.type.isDedicated || !s.type.quality) return false;
      return qualityOrder[s.type.quality] > qualityOrder[coreQuality];
    });
  }, [installedSystems, coreQuality]);

  // Calculate preview values
  const previewQuantity = parseInt(systemQuantity, 10) || 1;
  const previewHullPts = selectedSystem ? calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, previewQuantity) : 0;
  const previewPower = selectedSystem ? calculateCommandControlPower(selectedSystem, previewQuantity) : 0;
  const previewCost = selectedSystem ? calculateCommandControlCost(selectedSystem, hull.hullPoints, previewQuantity) : 0;

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'command': return 'Command Systems';
      case 'communication': return 'Communications';
      case 'computer': return 'Computers';
      default: return category;
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 9: Command & Control (Required)
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
          {stats.hasCommandSystem && (
            <Chip
              label={stats.commandSystemName}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.hasComputerCore && (
            <Chip
              label={`${stats.computerCoreQuality} Core`}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.attackBonus !== 0 && (
            <Chip
              label={`Attack: ${stats.attackBonus} step`}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.installedTransceivers.length > 0 && (
            <Chip
              label={`${stats.installedTransceivers.length} Transceiver${stats.installedTransceivers.length > 1 ? 's' : ''}`}
              color="primary"
              variant="outlined"
            />
          )}
          {/* Warning chips */}
          {!hasCommand && (
            <Chip
              icon={<WarningIcon />}
              label="No Command System"
              color="error"
              variant="outlined"
            />
          )}
          {controlsWithQualityIssues.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={hasCore ? "Control Exceeds Core" : "No Computer Core"}
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Installed Systems */}
      {installedSystems.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Systems
          </Typography>
          <Stack spacing={1}>
            {installedSystems.map((system) => {
              const hasQualityIssue = controlsWithQualityIssues.some((s) => s.id === system.id);
              return (
                <Box
                  key={system.id}
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
                    {system.type.name}
                    {system.quantity > 1 && !system.type.hullPer200 && ` (×${system.quantity})`}
                    {system.type.hullPer200 && ` (${system.quantity} HP)`}
                  </Typography>
                  <Chip
                    label={`${system.hullPoints} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${system.powerRequired} Power`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={formatCost(system.cost)}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={system.type.effect}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  {hasQualityIssue && (
                    <Chip
                      icon={<WarningIcon />}
                      label={hasCore ? "Exceeds Core" : "No Core"}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {/* Edit button for editable systems */}
                  {(system.type.id === 'cockpit' || system.type.hullPer200 || 
                    (!system.type.isRequired && !system.type.hullPer200)) && (
                    <IconButton
                      size="small"
                      onClick={() => handleEditSystem(system)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveSystem(system.id)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Configure Form */}
      {selectedSystem && (
        <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingSystemId ? 'Edit' : 'Add'} {selectedSystem.name}
          </Typography>

          {/* Command conflict warning */}
          {commandConflict && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              Adding this will replace the existing command system.
            </Alert>
          )}

          {/* Core conflict warning */}
          {coreConflict && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              Adding this will replace the existing computer core.
            </Alert>
          )}

          {/* Control quality warning */}
          {controlQualityWarning && (
            <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
              {coreQuality 
                ? `This ${selectedSystem.quality} control requires a ${selectedSystem.quality} or better computer core (you have ${coreQuality}).`
                : 'This control computer requires a computer core to be installed.'}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Quantity input - for cockpit, stackable items */}
            {selectedSystem.id === 'cockpit' && (
              <TextField
                label="Stations"
                type="number"
                size="small"
                value={systemQuantity}
                onChange={(e) => setSystemQuantity(e.target.value)}
                inputProps={{ min: 1, max: selectedSystem.maxQuantity || 3 }}
                helperText={`Max ${selectedSystem.maxQuantity || 3} stations`}
                sx={{ width: 120 }}
              />
            )}
            {selectedSystem.hullPer200 && (
              <TextField
                label="Hull Points"
                type="number"
                size="small"
                value={systemQuantity}
                onChange={(e) => setSystemQuantity(e.target.value)}
                inputProps={{ min: requiredCoreHP }}
                helperText={`Min ${requiredCoreHP} HP (1 per 200 hull)`}
                sx={{ width: 180 }}
              />
            )}
            {!selectedSystem.isRequired && !selectedSystem.hullPer200 && selectedSystem.id !== 'cockpit' && (
              <TextField
                label="Quantity"
                type="number"
                size="small"
                value={systemQuantity}
                onChange={(e) => setSystemQuantity(e.target.value)}
                inputProps={{ min: 1 }}
                sx={{ width: 100 }}
              />
            )}
            {/* Command deck shows auto-calculated size */}
            {selectedSystem.id === 'command-deck' && (
              <Chip
                label={`Size: ${previewHullPts} HP (auto-calculated)`}
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
                startIcon={editingSystemId ? <SaveIcon /> : <AddIcon />}
                onClick={handleAddSystem}
              >
                {editingSystemId ? 'Save' : 'Add'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedSystem(null);
                  setSystemQuantity('1');
                  setEditingSystemId(null);
                }}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Available Systems by Category */}
      {(['command', 'communication', 'computer'] as const).map((category) => {
        const systems = systemsByCategory[category];
        if (systems.length === 0) return null;

        return (
          <Box key={category} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
              {getCategoryLabel(category)}
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1000 } }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: 180, whiteSpace: 'nowrap' }}>Name</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Tech</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HP</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Power</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', width: 100, whiteSpace: 'nowrap' }}>Cost</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: 250, whiteSpace: 'nowrap' }}>Effect</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {systems.map((system) => {
                    const isSelected = selectedSystem?.id === system.id;

                    return (
                      <TableRow
                        key={system.id}
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
                        onClick={() => handleSelectSystem(system)}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={isSelected ? 'bold' : 'normal'}
                          >
                            {system.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{system.progressLevel}</TableCell>
                        <TechTrackCell techTracks={system.techTracks} />
                        <TableCell align="right">
                          {system.id === 'command-deck' 
                            ? `${calculateCommandControlHullPoints(system, hull.hullPoints, 1)}`
                            : system.hullPer200
                              ? `${requiredCoreHP}+`
                              : system.hullPoints
                          }
                        </TableCell>
                        <TableCell align="right">{system.powerRequired}</TableCell>
                        <TableCell align="right">
                          {system.costPerHull 
                            ? formatCost(system.cost * hull.hullPoints)
                            : formatCost(system.cost)
                          }
                        </TableCell>
                        <TableCell>{system.effect}</TableCell>
                        <TableCell>
                          <Tooltip title={system.description} placement="left">
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
                              {system.description}
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
        );
      })}
    </Box>
  );
}
