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
  Button,
  IconButton,
  TextField,
  Chip,
  Stack,
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { headerCellSx, configFormSx, scrollableTableContainerSx, stickyFirstColumnHeaderSx, stickyFirstColumnCellSx } from '../constants/tableStyles';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { SensorType, InstalledSensor, SensorCategory } from '../types/sensor';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { StandardArc, FiringArc } from '../types/weapon';
import {
  getAllSensorTypes,
  calculateSensorStats,
  createInstalledSensor,
  updateInstalledSensor,
  calculateTrackingCapability,
  getMaxArcsForQuantity,
  defaultArcsForSensor,
} from '../services/sensorService';
import { filterByDesignConstraints } from '../services/utilities';
import { formatCost, formatSensorRange } from '../services/formatters';
import { formatArcs } from '../services/weaponService';
import { TechTrackCell, TruncatedDescription } from './shared';
import { ArcRadarSelector } from './shared/ArcRadarSelector';
import { sensorHasSensorControl, getSensorControlForSensor } from '../services/commandControlService';

interface SensorSelectionProps {
  installedSensors: InstalledSensor[];
  installedCommandControl: InstalledCommandControlSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onSensorsChange: (sensors: InstalledSensor[]) => void;
}

export function SensorSelection({
  installedSensors,
  installedCommandControl,
  designProgressLevel,
  designTechTracks,
  onSensorsChange,
}: SensorSelectionProps) {
  const [activeTab, setActiveTab] = useState<SensorCategory>('active');
  const [selectedSensor, setSelectedSensor] = useState<SensorType | null>(null);
  const [sensorQuantity, setSensorQuantity] = useState<string>('1');
  const [selectedArcs, setSelectedArcs] = useState<StandardArc[]>(['forward']);
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get filtered sensor types
  const availableSensors = useMemo(() => {
    return filterByDesignConstraints(getAllSensorTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  // Get sensors by category
  const getSensorsByCategory = (category: SensorCategory) => {
    return availableSensors
      .filter((s) => s.category === category)
      .sort((a, b) => a.progressLevel - b.progressLevel);
  };

  // Get installed sensors by category
  const getInstalledSensorsByCategory = (category: SensorCategory) => {
    return installedSensors.filter((s) => s.type.category === category);
  };

  // Calculate stats
  const stats = useMemo(
    () => calculateSensorStats(installedSensors),
    [installedSensors]
  );

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: SensorCategory) => {
    setActiveTab(newValue);
    // Clear selection when switching tabs
    setSelectedSensor(null);
    setSensorQuantity('1');
    setEditingSensorId(null);
  };

  const handleSelectSensor = (type: SensorType) => {
    setSelectedSensor(type);
    // Default to 1 unit
    setSensorQuantity('1');
    setSelectedArcs(defaultArcsForSensor(type, 1));
    setEditingSensorId(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddSensor = () => {
    if (!selectedSensor) return;
    const quantity = parseInt(sensorQuantity, 10) || 1;

    if (editingSensorId) {
      onSensorsChange(
        installedSensors.map((s) =>
          s.id === editingSensorId
            ? updateInstalledSensor(s, quantity, designProgressLevel, selectedArcs)
            : s
        )
      );
    } else {
      // Always create a new sensor installation
      onSensorsChange([
        ...installedSensors,
        createInstalledSensor(selectedSensor, quantity, designProgressLevel, selectedArcs),
      ]);
    }

    setSelectedSensor(null);
    setSensorQuantity('1');
    setSelectedArcs(['forward']);
    setEditingSensorId(null);
  };

  const handleEditSensor = (installed: InstalledSensor) => {
    setSelectedSensor(installed.type);
    setSensorQuantity(installed.quantity.toString());
    setSelectedArcs(installed.arcs);
    setEditingSensorId(installed.id);
  };

  const handleRemoveSensor = (id: string) => {
    onSensorsChange(installedSensors.filter((s) => s.id !== id));
  };

  const handleDuplicateSensor = (sensor: InstalledSensor) => {
    const duplicate = createInstalledSensor(sensor.type, sensor.quantity, designProgressLevel, sensor.arcs);
    const index = installedSensors.findIndex((s) => s.id === sensor.id);
    const updated = [...installedSensors];
    updated.splice(index + 1, 0, duplicate);
    onSensorsChange(updated);
  };

  // Calculate preview values
  const previewQuantity = parseInt(sensorQuantity, 10) || 1;
  const previewHullPts = selectedSensor ? selectedSensor.hullPoints * previewQuantity : 0;
  const previewPower = selectedSensor ? selectedSensor.powerRequired * previewQuantity : 0;
  const previewCost = selectedSensor ? selectedSensor.cost * previewQuantity : 0;
  const previewArcs = selectedSensor ? Math.min(selectedSensor.arcsCovered * previewQuantity, 4) : 0;
  const previewTracking = selectedSensor ? calculateTrackingCapability(designProgressLevel, 'none', previewQuantity) : 0;

  // Arc toggle handler for sensors (no zero arcs)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleArcToggle = (arc: FiringArc, _isZero: boolean) => {
    if (!selectedSensor) return;
    const stdArc = arc as StandardArc;
    const currentArcs = [...selectedArcs];
    const arcIndex = currentArcs.indexOf(stdArc);
    const maxArcs = getMaxArcsForQuantity(selectedSensor, previewQuantity);

    if (arcIndex >= 0) {
      // Remove arc (unless it's the last one)
      if (currentArcs.length > 1) {
        currentArcs.splice(arcIndex, 1);
      }
    } else {
      if (currentArcs.length < maxArcs) {
        currentArcs.push(stdArc);
      } else {
        // Replace: remove oldest, add new
        currentArcs.shift();
        currentArcs.push(stdArc);
      }
    }
    setSelectedArcs(currentArcs);
  };

  // Helper to format tracking capability
  const formatTracking = (tracking: number): string => {
    return tracking === -1 ? 'Unlimited' : tracking.toString();
  };

  const getCategoryLabel = (category: SensorCategory): string => {
    switch (category) {
      case 'active': return 'Active';
      case 'passive': return 'Passive';
      case 'remote': return 'Remote';
      case 'special': return 'Special';
      default: return category;
    }
  };

  // Render installed sensors section for a specific category
  const renderInstalledSensorsForCategory = (category: SensorCategory) => {
    const categorySensors = getInstalledSensorsByCategory(category);

    const categoryNames: Record<SensorCategory, string> = {
      active: 'Active Sensors',
      passive: 'Passive Sensors',
      remote: 'Remote Sensors',
      special: 'Special Sensors',
    };

    if (categorySensors.length === 0) return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No {categoryNames[category].toLowerCase()} installed. Select from the table below to add one.
      </Typography>
    );

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed {categoryNames[category]}
        </Typography>
        <Stack spacing={1}>
          {categorySensors.map((sensor) => {
            // Check if this sensor has Sensor Control assigned
            const hasSensorControl = sensorHasSensorControl(sensor.id, installedCommandControl);
            const sensorControl = getSensorControlForSensor(sensor.id, installedCommandControl);
            const sensorControlName = sensorControl?.type.name;
            const isEditing = editingSensorId === sensor.id;
            
            return (
              <Fragment key={sensor.id}>
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
                    {sensor.type.name}
                    {sensor.quantity > 1 && ` (×${sensor.quantity})`}
                  </Typography>
                  <Chip label={`${sensor.hullPoints} HP`} size="small" variant="outlined" />
                  <Chip label={`${sensor.powerRequired} Power`} size="small" variant="outlined" />
                  <Chip label={formatArcs(sensor.arcs)} size="small" color="primary" variant="outlined" />
                  <Chip label={`Track: ${formatTracking(sensor.trackingCapability)}`} size="small" color="primary" variant="outlined" />
                  <Chip label={formatCost(sensor.cost)} size="small" variant="outlined" />
                  {hasSensorControl && (
                    <Tooltip title={sensorControlName}>
                      <Chip 
                        label={`${sensorControl!.type.quality} Sensor Control`} 
                        size="small" 
                        color="success" 
                        variant="outlined" 
                      />
                    </Tooltip>
                  )}
                  <IconButton size="small" aria-label="Edit sensor" onClick={() => handleEditSensor(sensor)} color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Duplicate sensor" onClick={() => handleDuplicateSensor(sensor)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Remove sensor" onClick={() => handleRemoveSensor(sensor.id)} color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Inline edit form */}
                {isEditing && renderInlineEditForm()}
              </Fragment>
            );
          })}
        </Stack>
      </Paper>
    );
  };

  // Render inline edit form (shown under the item being edited)
  const renderInlineEditForm = () => {
    if (!selectedSensor || !editingSensorId) return null;

    return (
      <Box ref={formRef} sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
        <form onSubmit={(e) => { e.preventDefault(); handleAddSensor(); }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Quantity"
            type="number"
            size="small"
            value={sensorQuantity}
            onChange={(e) => {
              setSensorQuantity(e.target.value);
              // Adjust arcs if new quantity changes max arcs
              const newQty = parseInt(e.target.value, 10) || 1;
              if (selectedSensor) {
                const newMax = getMaxArcsForQuantity(selectedSensor, newQty);
                if (selectedArcs.length > newMax) {
                  setSelectedArcs(selectedArcs.slice(0, newMax));
                }
              }
            }}
            inputProps={{ min: 1 }}
            sx={{ width: 150 }}
          />
          <ArcRadarSelector
            selectedArcs={selectedArcs}
            onArcToggle={handleArcToggle}
            showZeroArcs={false}
            maxStandardArcs={previewArcs}
            maxZeroArcs={0}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} |
              Power: {previewPower} |
              Arcs: {formatArcs(selectedArcs)} |
              Track: {formatTracking(previewTracking)} |
              Cost: {formatCost(previewCost)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedSensor(null);
                  setSensorQuantity('1');
                  setSelectedArcs(['forward']);
                  setEditingSensorId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
              >
                Save
              </Button>
            </Box>
          </Box>
        </Box>
        </form>
      </Box>
    );
  };

  // Render the add form (shown below installed sensors when adding new)
  const renderAddForm = () => {
    if (!selectedSensor || editingSensorId) return null;

    return (
      <Paper ref={formRef} variant="outlined" sx={configFormSx}>
        <form onSubmit={(e) => { e.preventDefault(); handleAddSensor(); }}>
        <Typography variant="subtitle2" sx={{ mb: '10px' }}>
          Add {selectedSensor.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Quantity"
            type="number"
            size="small"
            value={sensorQuantity}
            onChange={(e) => {
              setSensorQuantity(e.target.value);
              const newQty = parseInt(e.target.value, 10) || 1;
              if (selectedSensor) {
                const newMax = getMaxArcsForQuantity(selectedSensor, newQty);
                if (selectedArcs.length > newMax) {
                  setSelectedArcs(selectedArcs.slice(0, newMax));
                }
              }
            }}
            inputProps={{ min: 1 }}
            sx={{ width: 150 }}
          />
          <ArcRadarSelector
            selectedArcs={selectedArcs}
            onArcToggle={handleArcToggle}
            showZeroArcs={false}
            maxStandardArcs={previewArcs}
            maxZeroArcs={0}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} |
              Power: {previewPower} |
              Arcs: {formatArcs(selectedArcs)} |
              Track: {formatTracking(previewTracking)} |
              Cost: {formatCost(previewCost)}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedSensor(null);
                  setSensorQuantity('1');
                  setSelectedArcs(['forward']);
                  setEditingSensorId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
              >
                Add
              </Button>
            </Box>
          </Box>
        </Box>
        </form>
      </Paper>
    );
  };

  // Render sensor grid for a category
  const renderSensorGrid = (category: SensorCategory) => {
    const sensors = getSensorsByCategory(category);

    if (sensors.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No {getCategoryLabel(category).toLowerCase()} sensors available at current design constraints.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ ...scrollableTableContainerSx, '& .MuiTable-root': { minWidth: 1100 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, ...stickyFirstColumnHeaderSx }}>Name</TableCell>
              <TableCell sx={headerCellSx}>PL</TableCell>
              <TableCell sx={headerCellSx}>Tech</TableCell>
              <TableCell sx={headerCellSx}>HP</TableCell>
              <TableCell sx={headerCellSx}>Power</TableCell>
              <TableCell sx={headerCellSx}>Cost</TableCell>
              <TableCell sx={headerCellSx}>Range (S/M/L)</TableCell>
              <TableCell sx={headerCellSx}>Arcs</TableCell>
              <TableCell sx={headerCellSx}>Tracking</TableCell>
              <TableCell sx={headerCellSx}>Targeting</TableCell>
              <TableCell sx={headerCellSx}>Effect</TableCell>
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sensors.map((sensor) => {
              const isSelected = selectedSensor?.id === sensor.id;
              return (
                <TableRow
                  key={sensor.id}
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
                  onClick={() => handleSelectSensor(sensor)}
                >
                  <TableCell sx={{ ...stickyFirstColumnCellSx, whiteSpace: 'nowrap' }}>{sensor.name}</TableCell>
                  <TableCell>{sensor.progressLevel}</TableCell>
                  <TechTrackCell techTracks={sensor.techTracks} />
                  <TableCell>{sensor.hullPoints}</TableCell>
                  <TableCell>{sensor.powerRequired}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(sensor.cost)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatSensorRange(sensor)}</TableCell>
                  <TableCell>{sensor.arcsCovered}</TableCell>
                  <TableCell>{formatTracking(sensor.trackingCapability)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{sensor.accuracyDescription}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{sensor.effect}</TableCell>
                  <TableCell>
                    <TruncatedDescription text={sensor.description} maxWidth={200} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render tab content for a category
  const renderTabContent = (category: SensorCategory) => {
    return (
      <Box>
        {/* Installed sensors for this category */}
        {renderInstalledSensorsForCategory(category)}

        {/* Add new sensor form - only show when adding (not editing) */}
        {!editingSensorId && renderAddForm()}

        {/* Available sensors grid */}
        {renderSensorGrid(category)}
      </Box>
    );
  };

  return (
    <Box>
      {/* Summary Section */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`HP: ${stats.totalHullPoints}`} color="default" variant="outlined" />
          <Chip label={`Power: ${stats.totalPowerRequired}`} color="default" variant="outlined" />
          <Chip label={`Cost: ${formatCost(stats.totalCost)}`} color="default" variant="outlined" />
          <Chip label={`Total Tracking: ${formatTracking(stats.totalTrackingCapability)} contacts`} color="primary" variant="outlined" />
          <Chip
            icon={stats.hasBasicSensors ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
            label={stats.hasBasicSensors ? 'Has Active Sensors' : 'No Active Sensors'}
            color={stats.hasBasicSensors ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Sensor Category Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={`Active (${getInstalledSensorsByCategory('active').length})`} value="active" />
          <Tab label={`Passive (${getInstalledSensorsByCategory('passive').length})`} value="passive" />
          <Tab label={`Remote (${getInstalledSensorsByCategory('remote').length})`} value="remote" />
          <Tab label={`Special (${getInstalledSensorsByCategory('special').length})`} value="special" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 'active' && renderTabContent('active')}
      {activeTab === 'passive' && renderTabContent('passive')}
      {activeTab === 'remote' && renderTabContent('remote')}
      {activeTab === 'special' && renderTabContent('special')}
    </Box>
  );
}
