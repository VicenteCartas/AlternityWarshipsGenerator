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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { SensorType, InstalledSensor, SensorCategory } from '../types/sensor';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import {
  getAllSensorTypes,
  filterByDesignConstraints,
  calculateSensorStats,
  createInstalledSensor,
  updateInstalledSensor,
  calculateUnitsForFullCoverage,
  calculateTrackingCapability,
  type ComputerQuality,
} from '../services/sensorService';
import { formatCost, formatSensorRange } from '../services/formatters';
import { TechTrackCell, TruncatedDescription } from './shared';

interface SensorSelectionProps {
  hull: Hull;
  installedSensors: InstalledSensor[];
  installedCommandControl: InstalledCommandControlSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onSensorsChange: (sensors: InstalledSensor[]) => void;
}

type CategoryFilter = 'all' | SensorCategory;

export function SensorSelection({
  hull: _hull,
  installedSensors,
  installedCommandControl,
  designProgressLevel,
  designTechTracks,
  onSensorsChange,
}: SensorSelectionProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [selectedSensor, setSelectedSensor] = useState<SensorType | null>(null);
  const [sensorQuantity, setSensorQuantity] = useState<string>('1');
  const [selectedSensorControl, setSelectedSensorControl] = useState<string>('none');
  const [editingSensorId, setEditingSensorId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get available sensor control computers (not already assigned to other sensors)
  const availableSensorControls = useMemo(() => {
    const assignedIds = installedSensors
      .filter(s => s.assignedSensorControlId && s.id !== editingSensorId)
      .map(s => s.assignedSensorControlId);
    
    return installedCommandControl.filter(cc => 
      cc.type.linkedSystemType === 'sensor' && 
      !assignedIds.includes(cc.id)
    );
  }, [installedCommandControl, installedSensors, editingSensorId]);

  // Helper to get computer quality from a sensor control ID
  const getComputerQuality = (sensorControlId: string | undefined): ComputerQuality => {
    if (!sensorControlId || sensorControlId === 'none') return 'none';
    const control = installedCommandControl.find(cc => cc.id === sensorControlId);
    return (control?.type.quality as ComputerQuality) || 'none';
  };

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
    newCategory: CategoryFilter | null
  ) => {
    if (newCategory !== null) {
      setCategoryFilter(newCategory);
    }
  };

  const handleSelectSensor = (type: SensorType) => {
    setSelectedSensor(type);
    // Default to 1 unit
    setSensorQuantity('1');
    setSelectedSensorControl('none');
    setEditingSensorId(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddSensor = () => {
    if (!selectedSensor) return;
    const quantity = parseInt(sensorQuantity, 10) || 1;
    const computerQuality = getComputerQuality(selectedSensorControl);
    const assignedId = selectedSensorControl === 'none' ? undefined : selectedSensorControl;

    if (editingSensorId) {
      onSensorsChange(
        installedSensors.map((s) =>
          s.id === editingSensorId
            ? updateInstalledSensor(s, quantity, designProgressLevel, computerQuality, assignedId)
            : s
        )
      );
    } else {
      // Always create a new sensor installation (allows separate computers for same sensor type)
      onSensorsChange([
        ...installedSensors,
        createInstalledSensor(selectedSensor, quantity, designProgressLevel, computerQuality, assignedId),
      ]);
    }

    setSelectedSensor(null);
    setSensorQuantity('1');
    setSelectedSensorControl('none');
    setEditingSensorId(null);
  };

  const handleEditSensor = (installed: InstalledSensor) => {
    setSelectedSensor(installed.type);
    setSensorQuantity(installed.quantity.toString());
    setSelectedSensorControl(installed.assignedSensorControlId || 'none');
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
  const previewComputerQuality = getComputerQuality(selectedSensorControl);
  const previewTracking = selectedSensor 
    ? calculateTrackingCapability(designProgressLevel, previewComputerQuality, previewQuantity)
    : 0;

  // Helper to format tracking capability
  const formatTracking = (tracking: number): string => {
    return tracking === -1 ? 'Unlimited' : tracking.toString();
  };

  // Get sensor control name for display
  const getSensorControlName = (controlId: string | undefined): string | null => {
    if (!controlId) return null;
    const control = installedCommandControl.find(cc => cc.id === controlId);
    return control?.type.name || null;
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
          {installedSensors.map((sensor) => (
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
                {sensor.assignedSensorControlId && (
                  <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                    + {getSensorControlName(sensor.assignedSensorControlId)}
                  </Typography>
                )}
              </Typography>
              <Chip label={`${sensor.hullPoints} HP`} size="small" variant="outlined" />
              <Chip label={`${sensor.powerRequired} Power`} size="small" variant="outlined" />
              <Chip label={formatCost(sensor.cost)} size="small" variant="outlined" />
              <Chip label={`${sensor.arcsCovered} arc${sensor.arcsCovered !== 1 ? 's' : ''}`} size="small" color="primary" variant="outlined" />
              <Chip label={`Track: ${formatTracking(sensor.trackingCapability)} contacts`} size="small" color="primary" variant="outlined" />
              <IconButton size="small" onClick={() => handleEditSensor(sensor)} color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleRemoveSensor(sensor.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="sensor-control-label">Sensor Control</InputLabel>
            <Select
              labelId="sensor-control-label"
              value={selectedSensorControl}
              label="Sensor Control"
              onChange={(e) => setSelectedSensorControl(e.target.value)}
            >
              <MenuItem value="none">None</MenuItem>
              {availableSensorControls.map((cc) => (
                <MenuItem key={cc.id} value={cc.id}>
                  {cc.type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} |
              Power: {previewPower} |
              Cost: {formatCost(previewCost)} |
              Arcs: {previewArcs}/4 |
              Track: {formatTracking(previewTracking)}
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
                  setSelectedSensorControl('none');
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
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range (S/M/L)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Arcs</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Targeting</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Effect</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
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
