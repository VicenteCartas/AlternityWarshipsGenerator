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
  Button,
  IconButton,
  TextField,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { headerCellSx } from '../constants/tableStyles';
import type { ProgressLevel, TechTrack, FilterWithAll } from '../types/common';
import type { SensorType, InstalledSensor, SensorCategory } from '../types/sensor';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import {
  getAllSensorTypes,
  filterByDesignConstraints,
  calculateSensorStats,
  createInstalledSensor,
  updateInstalledSensor,
  calculateUnitsForFullCoverage,
} from '../services/sensorService';
import { formatCost, formatSensorRange } from '../services/formatters';
import { TechTrackCell, TruncatedDescription } from './shared';
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
  const [categoryFilter, setCategoryFilter] = useState<FilterWithAll<SensorCategory>>('all');
  const [selectedSensor, setSelectedSensor] = useState<SensorType | null>(null);
  const [sensorQuantity, setSensorQuantity] = useState<string>('1');
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get filtered sensor types
  const availableSensors = useMemo(() => {
    return filterByDesignConstraints(getAllSensorTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  // Apply category filter
  const filteredSensors = useMemo(() => {
    if (categoryFilter === 'all') {
      return availableSensors.sort((a, b) => a.progressLevel - b.progressLevel);
    }
    return availableSensors
      .filter((s) => s.category === categoryFilter)
      .sort((a, b) => a.progressLevel - b.progressLevel);
  }, [availableSensors, categoryFilter]);

  // Count sensors by category
  const categoryCounts = useMemo(() => {
    return {
      all: availableSensors.length,
      active: availableSensors.filter((s) => s.category === 'active').length,
      passive: availableSensors.filter((s) => s.category === 'passive').length,
      remote: availableSensors.filter((s) => s.category === 'remote').length,
      special: availableSensors.filter((s) => s.category === 'special').length,
    };
  }, [availableSensors]);

  // Calculate stats
  const stats = useMemo(
    () => calculateSensorStats(installedSensors),
    [installedSensors]
  );

  // Handlers
  const handleCategoryFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCategory: FilterWithAll<SensorCategory> | null
  ) => {
    if (newCategory !== null) {
      setCategoryFilter(newCategory);
    }
  };

  const handleSelectSensor = (type: SensorType) => {
    setSelectedSensor(type);
    // Default to 1 unit
    setSensorQuantity('1');
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
            ? updateInstalledSensor(s, quantity, designProgressLevel)
            : s
        )
      );
    } else {
      // Always create a new sensor installation
      onSensorsChange([
        ...installedSensors,
        createInstalledSensor(selectedSensor, quantity, designProgressLevel),
      ]);
    }

    setSelectedSensor(null);
    setSensorQuantity('1');
    setEditingSensorId(null);
  };

  const handleEditSensor = (installed: InstalledSensor) => {
    setSelectedSensor(installed.type);
    setSensorQuantity(installed.quantity.toString());
    setEditingSensorId(installed.id);
  };

  const handleRemoveSensor = (id: string) => {
    onSensorsChange(installedSensors.filter((s) => s.id !== id));
  };

  // Calculate preview values
  const previewQuantity = parseInt(sensorQuantity, 10) || 1;
  const previewHullPts = selectedSensor ? selectedSensor.hullPoints * previewQuantity : 0;
  const previewPower = selectedSensor ? selectedSensor.powerRequired * previewQuantity : 0;
  const previewCost = selectedSensor ? selectedSensor.cost * previewQuantity : 0;
  const previewArcs = selectedSensor ? Math.min(selectedSensor.arcsCovered * previewQuantity, 4) : 0;

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

  // Render installed sensors section
  const renderInstalledSensors = () => {
    if (installedSensors.length === 0) return null;

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed Sensors
        </Typography>
        <Stack spacing={1}>
          {installedSensors.map((sensor) => {
            // Check if this sensor has Sensor Control assigned
            const hasSensorControl = sensorHasSensorControl(sensor.id, installedCommandControl);
            const sensorControl = getSensorControlForSensor(sensor.id, installedCommandControl);
            const sensorControlName = sensorControl?.type.name;
            
            return (
              <Box
                key={sensor.id}
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
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    [{getCategoryLabel(sensor.type.category)}]
                  </Typography>
                </Typography>
                <Chip label={`${sensor.hullPoints} HP`} size="small" variant="outlined" />
                <Chip label={`${sensor.powerRequired} Power`} size="small" variant="outlined" />
                <Chip label={formatCost(sensor.cost)} size="small" variant="outlined" />
                <Chip label={`${sensor.arcsCovered} arc${sensor.arcsCovered !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" />
                <Chip label={`Track: ${formatTracking(sensor.trackingCapability)}`} size="small" color="primary" variant="outlined" />
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
                <IconButton size="small" onClick={() => handleEditSensor(sensor)} color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleRemoveSensor(sensor.id)} color="error">
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
    if (!selectedSensor) return null;

    const maxQuantity = calculateUnitsForFullCoverage(selectedSensor);

    return (
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: '10px' }}>
          {editingSensorId ? 'Edit' : 'Add'} {selectedSensor.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label="Quantity"
            type="number"
            size="small"
            value={sensorQuantity}
            onChange={(e) => setSensorQuantity(e.target.value)}
            inputProps={{ min: 1 }}
            helperText={`${maxQuantity} units for full arc coverage`}
            sx={{ width: 150 }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} |
              Power: {previewPower} |
              Cost: {formatCost(previewCost)} |
              Arcs: {previewArcs}/4
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={editingSensorId ? <SaveIcon /> : <AddIcon />}
                onClick={handleAddSensor}
              >
                {editingSensorId ? 'Save' : 'Add'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedSensor(null);
                  setSensorQuantity('1');
                  setEditingSensorId(null);
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

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 10: Sensors (Required)
      </Typography>

      {/* Summary Section */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`HP: ${stats.totalHullPoints}`} color="default" variant="outlined" />
          <Chip label={`Power: ${stats.totalPowerRequired}`} color="default" variant="outlined" />
          <Chip label={`Cost: ${formatCost(stats.totalCost)}`} color="default" variant="outlined" />
          <Chip label={`Total Tracking: ${formatTracking(stats.totalTrackingCapability)} contacts`} color="primary" variant="outlined" />
          <Chip
            label={stats.hasBasicSensors ? 'Has Active Sensors' : 'No Active Sensors'}
            color={stats.hasBasicSensors ? 'success' : 'error'}
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Installed Sensors */}
      {renderInstalledSensors()}

      {/* Configuration Form (appears when sensor selected) */}
      {renderConfigureForm()}

      {/* Category Filter */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={categoryFilter}
          exclusive
          onChange={handleCategoryFilterChange}
          size="small"
        >
          <ToggleButton value="all">All ({categoryCounts.all})</ToggleButton>
          <ToggleButton value="active">Active ({categoryCounts.active})</ToggleButton>
          <ToggleButton value="passive">Passive ({categoryCounts.passive})</ToggleButton>
          <ToggleButton value="remote">Remote ({categoryCounts.remote})</ToggleButton>
          <ToggleButton value="special">Special ({categoryCounts.special})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Sensor Table */}
      {filteredSensors.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No sensors available at current design constraints.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1100 } }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Name</TableCell>
                <TableCell sx={headerCellSx}>Category</TableCell>
                <TableCell sx={headerCellSx}>PL</TableCell>
                <TableCell sx={headerCellSx}>Tech</TableCell>
                <TableCell sx={headerCellSx}>HP</TableCell>
                <TableCell sx={headerCellSx}>Power</TableCell>
                <TableCell sx={headerCellSx}>Cost</TableCell>
                <TableCell sx={headerCellSx}>Range (S/M/L)</TableCell>
                <TableCell sx={headerCellSx}>Arcs</TableCell>
                <TableCell sx={headerCellSx}>Targeting</TableCell>
                <TableCell sx={headerCellSx}>Effect</TableCell>
                <TableCell sx={headerCellSx}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSensors.map((sensor) => {
                const isSelected = selectedSensor?.id === sensor.id;
                return (
                  <TableRow
                    key={sensor.id}
                    hover
                    selected={isSelected}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&.Mui-selected': { bgcolor: 'primary.light' },
                    }}
                    onClick={() => handleSelectSensor(sensor)}
                  >
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{sensor.name}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{getCategoryLabel(sensor.category)}</TableCell>
                    <TableCell>{sensor.progressLevel}</TableCell>
                    <TechTrackCell techTracks={sensor.techTracks} />
                    <TableCell>{sensor.hullPoints}</TableCell>
                    <TableCell>{sensor.powerRequired}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(sensor.cost)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatSensorRange(sensor)}</TableCell>
                    <TableCell>{sensor.arcsCovered}</TableCell>
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
      )}
    </Box>
  );
}
