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
  Tabs,
  Tab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WarningIcon from '@mui/icons-material/Warning';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { CommandControlSystemType, InstalledCommandControlSystem, CommandControlCategory } from '../types/commandControl';
import {
  getAllCommandControlSystemTypes,
  filterByDesignConstraints,
  filterCommandSystemsByShipSize,
  calculateCommandControlStats,
  calculateCommandControlHullPoints,
  calculateCommandControlPower,
  calculateCommandControlCost,
  calculateCoverageBasedHullPoints,
  generateCommandControlId,
  hasCommandSystemInstalled,
  hasComputerCoreInstalled,
  getInstalledComputerCoreQuality,
  calculateRequiredComputerCoreHullPoints,
} from '../services/commandControlService';
import { formatCost, formatCommandControlCost } from '../services/formatters';
import { TechTrackCell } from './shared';

// Quality order for comparison
const QUALITY_ORDER: Record<string, number> = { 'Ordinary': 1, 'Good': 2, 'Amazing': 3 };

interface CommandControlSelectionProps {
  hull: Hull;
  installedSystems: InstalledCommandControlSystem[];
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onSystemsChange: (systems: InstalledCommandControlSystem[]) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState(0);
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
    const groups: Record<CommandControlCategory, CommandControlSystemType[]> = {
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

  // Separate computer cores from control computers
  const computerCores = useMemo(() => {
    return systemsByCategory.computer.filter((s) => s.id.startsWith('computer-core'));
  }, [systemsByCategory.computer]);

  // Get control computers that can be shown based on installed core quality
  const availableControlComputers = useMemo(() => {
    // Control computers require a core to be installed
    const controls = systemsByCategory.computer.filter((s) => s.requiresCore);
    if (!hasCore || !coreQuality) return []; // No core installed, no controls available
    // Filter by quality - only show controls where maxQuality <= coreQuality
    return controls.filter((s) => {
      if (!s.maxQuality) return true;
      return QUALITY_ORDER[s.maxQuality] <= QUALITY_ORDER[coreQuality];
    });
  }, [systemsByCategory.computer, hasCore, coreQuality]);

  // Get other computer systems (like Attack Computer that doesn't require core)
  const otherComputerSystems = useMemo(() => {
    return systemsByCategory.computer.filter(
      (s) => !s.id.startsWith('computer-core') && !s.requiresCore
    );
  }, [systemsByCategory.computer]);

  // Check installed control computers for quality issues
  const controlsWithQualityIssues = useMemo(() => {
    if (!coreQuality) {
      // No core - all control computers that require core have issues
      return installedSystems.filter((s) => s.type.requiresCore);
    }
    return installedSystems.filter((s) => {
      if (!s.type.requiresCore || !s.type.maxQuality) return false;
      return QUALITY_ORDER[s.type.maxQuality] > QUALITY_ORDER[coreQuality];
    });
  }, [installedSystems, coreQuality]);

  // Handlers
  const handleSelectSystem = (type: CommandControlSystemType) => {
    setSelectedSystem(type);
    // Default quantity handling
    if (type.id === 'command-deck') {
      setSystemQuantity('1');
    } else if (type.id === 'cockpit') {
      setSystemQuantity('1');
    } else if (type.coveragePerHullPoint) {
      setSystemQuantity(requiredCoreHP.toString());
    } else {
      setSystemQuantity('1');
    }
    setEditingSystemId(null);
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
      onSystemsChange(
        installedSystems.map((s) =>
          s.id === editingSystemId
            ? { ...s, type: selectedSystem, quantity, hullPoints: hullPts, powerRequired: power, cost }
            : s
        )
      );
    } else {
      let updatedSystems = installedSystems;

      // Computer cores: only one type allowed
      if (selectedSystem.id.startsWith('computer-core')) {
        updatedSystems = installedSystems.filter((s) => !s.type.id.startsWith('computer-core'));
      }

      // Check if same type already exists (for stackable items)
      const existing = updatedSystems.find((s) => s.type.id === selectedSystem.id);
      if (existing && !selectedSystem.isRequired && !selectedSystem.coveragePerHullPoint) {
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

  // Compute warnings for selected system
  const controlQualityWarning = useMemo(() => {
    if (!selectedSystem?.isDedicated) return false;
    if (!selectedSystem.quality) return false;
    if (!coreQuality) return true;
    const qualityOrder = { 'Ordinary': 1, 'Good': 2, 'Amazing': 3 };
    return qualityOrder[selectedSystem.quality] > qualityOrder[coreQuality];
  }, [selectedSystem, coreQuality]);

  // Calculate preview values
  const previewQuantity = parseInt(systemQuantity, 10) || 1;
  const previewHullPts = selectedSystem ? calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, previewQuantity) : 0;
  const previewPower = selectedSystem ? calculateCommandControlPower(selectedSystem, previewQuantity) : 0;
  const previewCost = selectedSystem ? calculateCommandControlCost(selectedSystem, hull.hullPoints, previewQuantity) : 0;

  const getCategoryLabel = (category: CommandControlCategory): string => {
    switch (category) {
      case 'command': return 'Command';
      case 'communication': return 'Communications';
      case 'computer': return 'Computers';
      default: return category;
    }
  };

  // Get installed systems for a specific category
  const getInstalledByCategory = (category: CommandControlCategory) => {
    return installedSystems.filter((s) => s.type.category === category);
  };

  // Render the installed systems list for a category
  const renderInstalledSystems = (category: CommandControlCategory) => {
    const installed = getInstalledByCategory(category);
    if (installed.length === 0) return null;

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed {getCategoryLabel(category)}
        </Typography>
        <Stack spacing={1}>
          {installed.map((system) => {
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
                  {system.quantity > 1 && ` (×${system.quantity})`}
                </Typography>
                <Chip label={`${system.hullPoints} HP`} size="small" variant="outlined" />
                <Chip label={`${system.powerRequired} Power`} size="small" variant="outlined" />
                <Chip label={formatCost(system.cost)} size="small" variant="outlined" />
                {system.type.requiresCore && system.type.effect && (
                  <Chip label={system.type.effect} size="small" color="primary" variant="outlined" />
                )}
                {hasQualityIssue && (
                  <Chip
                    icon={<WarningIcon />}
                    label={hasCore ? "Exceeds Core" : "No Core"}
                    size="small"
                    color="warning"
                    variant="outlined"
                  />
                )}
                <IconButton size="small" onClick={() => handleEditSystem(system)} color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleRemoveSystem(system.id)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
        </Stack>
      </Paper>
    );
  };

  // Render the configure form
  const renderConfigureForm = () => {
    if (!selectedSystem) return null;

    return (
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: '10px' }}>
          {editingSystemId ? 'Edit' : 'Add'} {selectedSystem.name}
        </Typography>

        {controlQualityWarning && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            {coreQuality 
              ? `This ${selectedSystem.quality} control requires a ${selectedSystem.quality} or better computer core (you have ${coreQuality}).`
              : 'This control computer requires a computer core to be installed.'}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Systems with coverage-based HP (command deck, computer cores) */}
          {selectedSystem.coveragePerHullPoint && (
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={systemQuantity}
              onChange={(e) => setSystemQuantity(e.target.value)}
              inputProps={{ min: 1 }}
              helperText={`${calculateCoverageBasedHullPoints(hull.hullPoints, selectedSystem)} HP each`}
              sx={{ width: 150 }}
            />
          )}
          {/* Standard systems: simple quantity */}
          {!selectedSystem.coveragePerHullPoint && (
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={systemQuantity}
              onChange={(e) => setSystemQuantity(e.target.value)}
              inputProps={{ min: 1, ...(selectedSystem.maxQuantity && { max: selectedSystem.maxQuantity }) }}
              helperText={selectedSystem.maxQuantity ? `Max ${selectedSystem.maxQuantity}` : undefined}
              sx={{ width: 100 }}
            />
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} |
              Power: {previewPower} |
              Cost: {formatCost(previewCost)}
            </Typography>
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
        </Box>
      </Paper>
    );
  };

  // Render table for a category (command, communication)
  const renderSystemTable = (systems: CommandControlSystemType[]) => {
    if (systems.length === 0) return null;

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1000 } }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: 180, whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 150, whiteSpace: 'nowrap' }}>Cost</TableCell>
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
                    '&.Mui-selected': { backgroundColor: 'action.selected' },
                    '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                  }}
                  onClick={() => handleSelectSystem(system)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                      {system.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{system.progressLevel}</TableCell>
                  <TechTrackCell techTracks={system.techTracks} />
                  <TableCell align="right">
                    {system.coveragePerHullPoint
                      ? calculateCoverageBasedHullPoints(hull.hullPoints, system)
                      : system.hullPoints
                    }
                  </TableCell>
                  <TableCell align="right">{system.powerRequired}</TableCell>
                  <TableCell align="right">
                    {formatCommandControlCost(system)}
                  </TableCell>
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
    );
  };

  // Render a single system row (for computers table)
  const renderSystemRow = (system: CommandControlSystemType, isNested: boolean = false) => {
    const isSelected = selectedSystem?.id === system.id;
    return (
      <TableRow
        key={system.id}
        hover
        selected={isSelected}
        sx={{
          cursor: 'pointer',
          bgcolor: isNested ? 'action.hover' : undefined,
          '&.Mui-selected': { backgroundColor: 'action.selected' },
          '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
        }}
        onClick={() => handleSelectSystem(system)}
      >
        <TableCell>
          <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'} sx={{ pl: isNested ? 2 : 0 }}>
            {isNested ? '↳ ' : ''}{system.name}
          </Typography>
        </TableCell>
        <TableCell align="center">{system.progressLevel}</TableCell>
        <TechTrackCell techTracks={system.techTracks} />
        <TableCell align="right">
          {system.coveragePerHullPoint 
            ? calculateCoverageBasedHullPoints(hull.hullPoints, system) 
            : system.hullPoints}
        </TableCell>
        <TableCell align="right">{system.powerRequired}</TableCell>
        <TableCell align="right">
          {system.costPerHull 
            ? formatCost(system.cost * hull.hullPoints)
            : formatCost(system.cost)
          }
        </TableCell>
        <TableCell>{system.effect || '-'}</TableCell>
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
  };

  // Render computer table with cores and nested control computers
  const renderComputerTable = () => {
    if (computerCores.length === 0 && otherComputerSystems.length === 0) return null;

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1000 } }}>
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: 180, whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 120, whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 250, whiteSpace: 'nowrap' }}>Effect</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Render computer cores with nested control computers */}
            {computerCores.map((core) => {
              const isCoreInstalled = installedSystems.some((s) => s.type.id === core.id);
              // Get control computers available for this core quality
              const controlsForCore = isCoreInstalled && core.quality
                ? availableControlComputers.filter((c) => {
                    if (!c.maxQuality) return true;
                    return QUALITY_ORDER[c.maxQuality] <= QUALITY_ORDER[core.quality!];
                  })
                : [];

              return (
                <Fragment key={core.id}>
                  {renderSystemRow(core, false)}
                  {/* Show control computers nested under this core if it's installed */}
                  {controlsForCore.map((control) => renderSystemRow(control, true))}
                </Fragment>
              );
            })}
            {/* Render other computer systems (like Attack Computer) */}
            {otherComputerSystems.map((system) => renderSystemRow(system, false))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 9: Command & Control (Required)
      </Typography>

      {/* Summary Chips */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`HP: ${stats.totalHullPoints}`} color="default" variant="outlined" />
          <Chip label={`Power: ${stats.totalPowerRequired}`} color="default" variant="outlined" />
          <Chip label={`Cost: ${formatCost(stats.totalCost)}`} color="default" variant="outlined" />
          {stats.hasCommandSystem && (
            <Chip label={stats.commandSystemName} color="primary" variant="outlined" />
          )}
          {stats.hasComputerCore && (
            <Chip label={`${stats.computerCoreQuality} Core`} color="primary" variant="outlined" />
          )}
          {stats.attackBonus !== 0 && (
            <Chip label={`Attack: ${stats.attackBonus} step`} color="primary" variant="outlined" />
          )}
          {stats.installedTransceivers.length > 0 && (
            <Chip
              label={`${stats.installedTransceivers.length} Transceiver${stats.installedTransceivers.length > 1 ? 's' : ''}`}
              color="primary"
              variant="outlined"
            />
          )}
          {!hasCommand && (
            <Chip icon={<WarningIcon />} label="No Command System" color="error" variant="outlined" />
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

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Command (${getInstalledByCategory('command').length})`} />
          <Tab label={`Communications (${getInstalledByCategory('communication').length})`} />
          <Tab label={`Computers (${getInstalledByCategory('computer').length})`} />
        </Tabs>
      </Paper>

      {/* Command Tab */}
      <TabPanel value={activeTab} index={0}>
        {renderInstalledSystems('command')}
        {selectedSystem?.category === 'command' && renderConfigureForm()}
        {renderSystemTable(systemsByCategory.command)}
      </TabPanel>

      {/* Communications Tab */}
      <TabPanel value={activeTab} index={1}>
        {renderInstalledSystems('communication')}
        {selectedSystem?.category === 'communication' && renderConfigureForm()}
        {renderSystemTable(systemsByCategory.communication)}
      </TabPanel>

      {/* Computers Tab */}
      <TabPanel value={activeTab} index={2}>
        {renderInstalledSystems('computer')}
        {selectedSystem?.category === 'computer' && renderConfigureForm()}
        {renderComputerTable()}
      </TabPanel>
    </Box>
  );
}
