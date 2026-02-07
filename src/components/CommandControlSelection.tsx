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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import WarningIcon from '@mui/icons-material/Warning';
import { TabPanel } from './shared';
import { headerCellSx } from '../constants/tableStyles';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type { CommandControlSystemType, InstalledCommandControlSystem, CommandControlCategory, WeaponBatteryKey } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledLaunchSystem } from '../types/ordnance';
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
  getWeaponBatteries,
  calculateFireControlCost,
  calculateSensorControlCost,
  batteryHasFireControl,
  sensorHasSensorControl,
  getOrphanedFireControls,
  getOrphanedSensorControls,
} from '../services/commandControlService';
import { formatCost, formatCommandControlCost } from '../services/formatters';
import { TechTrackCell } from './shared';

// Quality order for comparison
const QUALITY_ORDER: Record<string, number> = { 'Ordinary': 1, 'Good': 2, 'Amazing': 3 };

interface CommandControlSelectionProps {
  hull: Hull;
  installedSystems: InstalledCommandControlSystem[];
  installedSensors: InstalledSensor[];
  installedWeapons: InstalledWeapon[];
  installedLaunchSystems: InstalledLaunchSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onSystemsChange: (systems: InstalledCommandControlSystem[]) => void;
}

export function CommandControlSelection({
  hull,
  installedSystems,
  installedSensors,
  installedWeapons,
  installedLaunchSystems,
  designProgressLevel,
  designTechTracks,
  onSystemsChange,
}: CommandControlSelectionProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSystem, setSelectedSystem] = useState<CommandControlSystemType | null>(null);
  const [systemQuantity, setSystemQuantity] = useState<string>('1');
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  // For Fire Control: selected weapon battery
  const [selectedBattery, setSelectedBattery] = useState<WeaponBatteryKey | ''>('');
  // For Sensor Control: selected sensor
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
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

  // Get weapon batteries for Fire Control assignment
  const weaponBatteries = useMemo(() => {
    return getWeaponBatteries(installedWeapons, installedLaunchSystems);
  }, [installedWeapons, installedLaunchSystems]);

  // Get available weapon batteries (not already assigned to a Fire Control, or the one being edited)
  const availableWeaponBatteries = useMemo(() => {
    return weaponBatteries.filter((battery) => {
      // If editing, include the battery currently assigned to the system being edited
      if (editingSystemId) {
        const editingSystem = installedSystems.find(s => s.id === editingSystemId);
        if (editingSystem?.linkedWeaponBatteryKey === battery.key) {
          return true;
        }
      }
      return !batteryHasFireControl(battery.key, installedSystems);
    });
  }, [weaponBatteries, installedSystems, editingSystemId]);

  // Get available sensors (not already assigned to a Sensor Control, or the one being edited)
  const availableSensorsForControl = useMemo(() => {
    return installedSensors.filter((sensor) => {
      // If editing, include the sensor currently assigned to the system being edited
      if (editingSystemId) {
        const editingSystem = installedSystems.find(s => s.id === editingSystemId);
        if (editingSystem?.linkedSensorId === sensor.id) {
          return true;
        }
      }
      return !sensorHasSensorControl(sensor.id, installedSystems);
    });
  }, [installedSensors, installedSystems, editingSystemId]);

  // Get orphaned Fire Controls (battery no longer exists)
  const orphanedFireControls = useMemo(() => {
    return getOrphanedFireControls(installedSystems, installedWeapons, installedLaunchSystems);
  }, [installedSystems, installedWeapons, installedLaunchSystems]);

  // Get orphaned Sensor Controls (sensor no longer exists)
  const orphanedSensorControls = useMemo(() => {
    return getOrphanedSensorControls(installedSystems, installedSensors);
  }, [installedSystems, installedSensors]);

  // Handlers
  const handleSelectSystem = (type: CommandControlSystemType) => {
    // Fire Control: show form to select battery
    if (type.linkedSystemType === 'weapon') {
      setSelectedSystem(type);
      setSelectedBattery('');
      setEditingSystemId(null);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    
    // Sensor Control: show form to select sensor
    if (type.linkedSystemType === 'sensor') {
      setSelectedSystem(type);
      setSelectedSensorId('');
      setEditingSystemId(null);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }

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
    
    // Handle Fire Control
    if (selectedSystem.linkedSystemType === 'weapon') {
      if (!selectedBattery) return;
      const cost = calculateFireControlCost(selectedSystem, selectedBattery, installedWeapons, installedLaunchSystems);
      const hullPts = calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, 1);
      const power = calculateCommandControlPower(selectedSystem, 1);
      
      if (editingSystemId) {
        // Update existing Fire Control with new battery assignment
        onSystemsChange(
          installedSystems.map((s) =>
            s.id === editingSystemId
              ? { ...s, linkedWeaponBatteryKey: selectedBattery, cost }
              : s
          )
        );
      } else {
        // Add new Fire Control
        onSystemsChange([
          ...installedSystems,
          {
            id: generateCommandControlId(),
            type: selectedSystem,
            quantity: 1,
            hullPoints: hullPts,
            powerRequired: power,
            cost,
            linkedWeaponBatteryKey: selectedBattery,
          },
        ]);
      }
      setSelectedSystem(null);
      setSelectedBattery('');
      setEditingSystemId(null);
      return;
    }
    
    // Handle Sensor Control
    if (selectedSystem.linkedSystemType === 'sensor') {
      if (!selectedSensorId) return;
      const cost = calculateSensorControlCost(selectedSystem, selectedSensorId, installedSensors);
      const hullPts = calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, 1);
      const power = calculateCommandControlPower(selectedSystem, 1);
      
      if (editingSystemId) {
        // Update existing Sensor Control with new sensor assignment
        onSystemsChange(
          installedSystems.map((s) =>
            s.id === editingSystemId
              ? { ...s, linkedSensorId: selectedSensorId, cost }
              : s
          )
        );
      } else {
        // Add new Sensor Control
        onSystemsChange([
          ...installedSystems,
          {
            id: generateCommandControlId(),
            type: selectedSystem,
            quantity: 1,
            hullPoints: hullPts,
            powerRequired: power,
            cost,
            linkedSensorId: selectedSensorId,
          },
        ]);
      }
      setSelectedSystem(null);
      setSelectedSensorId('');
      setEditingSystemId(null);
      return;
    }
    
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
      const updatedSystems = installedSystems;

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
    setEditingSystemId(installed.id);
    
    // For Fire Control: pre-select the current battery if it still exists
    if (installed.type.linkedSystemType === 'weapon') {
      const batteryStillExists = installed.linkedWeaponBatteryKey && 
        weaponBatteries.some(b => b.key === installed.linkedWeaponBatteryKey);
      setSelectedBattery(batteryStillExists ? installed.linkedWeaponBatteryKey! : '');
      setSelectedSensorId('');
      return;
    }
    
    // For Sensor Control: pre-select the current sensor if it still exists
    if (installed.type.linkedSystemType === 'sensor') {
      const sensorStillExists = installed.linkedSensorId && 
        installedSensors.some(s => s.id === installed.linkedSensorId);
      setSelectedSensorId(sensorStillExists ? installed.linkedSensorId! : '');
      setSelectedBattery('');
      return;
    }
    
    // Standard systems
    setSystemQuantity(installed.quantity.toString());
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

  // Calculate preview values for non-linked systems
  const previewQuantity = parseInt(systemQuantity, 10) || 1;
  const previewHullPts = selectedSystem && !selectedSystem.linkedSystemType
    ? calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, previewQuantity)
    : (selectedSystem ? calculateCommandControlHullPoints(selectedSystem, hull.hullPoints, 1) : 0);
  const previewPower = selectedSystem && !selectedSystem.linkedSystemType
    ? calculateCommandControlPower(selectedSystem, previewQuantity)
    : (selectedSystem ? calculateCommandControlPower(selectedSystem, 1) : 0);
  // For Fire Control: calculate cost based on selected battery
  // For Sensor Control: calculate cost based on selected sensor
  const previewCost = useMemo(() => {
    if (!selectedSystem) return 0;
    if (selectedSystem.linkedSystemType === 'weapon') {
      return selectedBattery ? calculateFireControlCost(selectedSystem, selectedBattery, installedWeapons, installedLaunchSystems) : 0;
    }
    if (selectedSystem.linkedSystemType === 'sensor') {
      return selectedSensorId ? calculateSensorControlCost(selectedSystem, selectedSensorId, installedSensors) : 0;
    }
    return calculateCommandControlCost(selectedSystem, hull.hullPoints, previewQuantity);
  }, [selectedSystem, selectedBattery, selectedSensorId, installedWeapons, installedLaunchSystems, installedSensors, hull.hullPoints, previewQuantity]);

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
            const isFireControl = system.type.linkedSystemType === 'weapon';
            const isSensorControl = system.type.linkedSystemType === 'sensor';
            const isEditing = editingSystemId === system.id;
            
            // Determine linked system info
            let linkedSystemName: string | undefined;
            let isOrphaned = false;
            
            if (isFireControl) {
              if (system.linkedWeaponBatteryKey) {
                const battery = weaponBatteries.find(b => b.key === system.linkedWeaponBatteryKey);
                if (battery) {
                  const mountLabel = battery.mountType.charAt(0).toUpperCase() + battery.mountType.slice(1);
                  linkedSystemName = `${battery.weaponTypeName} ${mountLabel}`;
                } else {
                  isOrphaned = true;
                }
              } else {
                isOrphaned = true;
              }
            } else if (isSensorControl) {
              if (system.linkedSensorId) {
                const sensor = installedSensors.find(s => s.id === system.linkedSensorId);
                if (sensor) {
                  linkedSystemName = sensor.type.name;
                } else {
                  isOrphaned = true;
                }
              } else {
                isOrphaned = true;
              }
            }
            
            return (
              <Fragment key={system.id}>
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
                    {system.type.name}
                    {system.quantity > 1 && ` (×${system.quantity})`}
                  </Typography>
                  <Chip label={`${system.hullPoints} HP`} size="small" variant="outlined" />
                  <Chip label={`${system.powerRequired} Power`} size="small" variant="outlined" />
                  <Chip label={formatCost(system.cost)} size="small" variant="outlined" />
                  {system.type.requiresCore && system.type.effect && (
                    <Chip label={system.type.effect} size="small" color="primary" variant="outlined" />
                  )}
                  {isOrphaned && (
                    <Chip
                      icon={<WarningIcon />}
                      label="Orphaned"
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                  )}
                  {linkedSystemName && (
                    <Chip
                      label={linkedSystemName}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
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
    if (!selectedSystem || !editingSystemId) return null;

    const isFireControl = selectedSystem.linkedSystemType === 'weapon';
    const isSensorControl = selectedSystem.linkedSystemType === 'sensor';
    const isLinkedControl = isFireControl || isSensorControl;

    return (
      <Box ref={formRef} sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
        {controlQualityWarning && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            {coreQuality 
              ? `This ${selectedSystem.quality} control requires a ${selectedSystem.quality} or better computer core (you have ${coreQuality}).`
              : 'This control computer requires a computer core to be installed.'}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Fire Control: weapon battery selection */}
          {isFireControl && (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel id="edit-battery-select-label">Weapon Battery</InputLabel>
              <Select
                labelId="edit-battery-select-label"
                value={selectedBattery}
                onChange={(e) => setSelectedBattery(e.target.value as WeaponBatteryKey)}
                label="Weapon Battery"
              >
                {(() => {
                  // Filter batteries by max size if the control has a limit
                  const maxSize = selectedSystem.maximumLinkedSystemSize;
                  const filteredBatteries = maxSize !== undefined
                    ? availableWeaponBatteries.filter(b => b.totalHullPoints <= maxSize)
                    : availableWeaponBatteries;
                  
                  if (filteredBatteries.length === 0) {
                    return <MenuItem disabled>No eligible batteries{maxSize ? ` (max ${maxSize} HP)` : ''}</MenuItem>;
                  }
                  return filteredBatteries.map((battery) => {
                    const mountLabel = battery.mountType.charAt(0).toUpperCase() + battery.mountType.slice(1);
                    return (
                      <MenuItem key={battery.key} value={battery.key}>
                        {battery.weaponTypeName} {mountLabel} ({battery.totalHullPoints} HP)
                      </MenuItem>
                    );
                  });
                })()}
              </Select>
              {selectedSystem.maximumLinkedSystemSize && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Max weapon size: {selectedSystem.maximumLinkedSystemSize} HP
                </Typography>
              )}
            </FormControl>
          )}

          {/* Sensor Control: sensor selection */}
          {isSensorControl && (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel id="edit-sensor-select-label">Sensor</InputLabel>
              <Select
                labelId="edit-sensor-select-label"
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
                label="Sensor"
              >
                {availableSensorsForControl.length === 0 ? (
                  <MenuItem disabled>No unassigned sensors</MenuItem>
                ) : (
                  availableSensorsForControl.map((sensor) => (
                    <MenuItem key={sensor.id} value={sensor.id}>
                      {sensor.type.name} ({sensor.hullPoints} HP)
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          {/* Systems with coverage-based HP (command deck) - computer cores have fixed size */}
          {!isLinkedControl && selectedSystem.coveragePerHullPoint && !selectedSystem.id.startsWith('computer-core') && (
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
          {/* Standard systems: simple quantity */}
          {!isLinkedControl && !selectedSystem.coveragePerHullPoint && (
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
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedSystem(null);
                  setSystemQuantity('1');
                  setEditingSystemId(null);
                  setSelectedBattery('');
                  setSelectedSensorId('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleAddSystem}
                disabled={isLinkedControl && (isFireControl ? selectedBattery === '' : selectedSensorId === '')}
              >
                Save
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  // Render the add form (shown above the grid when adding new)
  const renderAddForm = () => {
    if (!selectedSystem || editingSystemId) return null;

    const isFireControl = selectedSystem.linkedSystemType === 'weapon';
    const isSensorControl = selectedSystem.linkedSystemType === 'sensor';
    const isLinkedControl = isFireControl || isSensorControl;

    // For linked controls (fire/sensor), disable Add if no target selected
    const canAdd = isLinkedControl 
      ? (isFireControl ? selectedBattery !== '' : selectedSensorId !== '')
      : true;

    return (
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        {controlQualityWarning && (
          <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
            {coreQuality 
              ? `This ${selectedSystem.quality} control requires a ${selectedSystem.quality} or better computer core (you have ${coreQuality}).`
              : 'This control computer requires a computer core to be installed.'}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Fire Control: weapon battery selection */}
          {isFireControl && (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel id="battery-select-label">Weapon Battery</InputLabel>
              <Select
                labelId="battery-select-label"
                value={selectedBattery}
                onChange={(e) => setSelectedBattery(e.target.value as WeaponBatteryKey)}
                label="Weapon Battery"
              >
                {(() => {
                  // Filter batteries by max size if the control has a limit
                  const maxSize = selectedSystem.maximumLinkedSystemSize;
                  const filteredBatteries = maxSize !== undefined
                    ? availableWeaponBatteries.filter(b => b.totalHullPoints <= maxSize)
                    : availableWeaponBatteries;
                  
                  if (filteredBatteries.length === 0) {
                    return <MenuItem disabled>No eligible batteries{maxSize ? ` (max ${maxSize} HP)` : ''}</MenuItem>;
                  }
                  return filteredBatteries.map((battery) => {
                    const mountLabel = battery.mountType.charAt(0).toUpperCase() + battery.mountType.slice(1);
                    return (
                      <MenuItem key={battery.key} value={battery.key}>
                        {battery.weaponTypeName} {mountLabel} ({battery.totalHullPoints} HP)
                      </MenuItem>
                    );
                  });
                })()}
              </Select>
              {selectedSystem.maximumLinkedSystemSize && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Max weapon size: {selectedSystem.maximumLinkedSystemSize} HP
                </Typography>
              )}
            </FormControl>
          )}

          {/* Sensor Control: sensor selection */}
          {isSensorControl && (
            <FormControl size="small" sx={{ minWidth: 250 }}>
              <InputLabel id="sensor-select-label">Sensor</InputLabel>
              <Select
                labelId="sensor-select-label"
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
                label="Sensor"
              >
                {availableSensorsForControl.length === 0 ? (
                  <MenuItem disabled>No unassigned sensors</MenuItem>
                ) : (
                  availableSensorsForControl.map((sensor) => (
                    <MenuItem key={sensor.id} value={sensor.id}>
                      {sensor.type.name} ({sensor.hullPoints} HP)
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          {/* Systems with coverage-based HP (command deck) - computer cores have fixed size */}
          {!isLinkedControl && selectedSystem.coveragePerHullPoint && !selectedSystem.id.startsWith('computer-core') && (
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
          {!isLinkedControl && !selectedSystem.coveragePerHullPoint && (
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
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedSystem(null);
                  setSystemQuantity('1');
                  setEditingSystemId(null);
                  setSelectedBattery('');
                  setSelectedSensorId('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddSystem}
                disabled={!canAdd}
              >
                Add
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
              <TableCell sx={headerCellSx}>Description</TableCell>
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
              <TableCell sx={headerCellSx}>Description</TableCell>
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
          {orphanedFireControls.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${orphanedFireControls.length} Orphaned Fire Control${orphanedFireControls.length > 1 ? 's' : ''}`}
              color="error"
              variant="outlined"
            />
          )}
          {orphanedSensorControls.length > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${orphanedSensorControls.length} Orphaned Sensor Control${orphanedSensorControls.length > 1 ? 's' : ''}`}
              color="error"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={`Command (${getInstalledByCategory('command').length})`} />
          <Tab label={`Communications (${getInstalledByCategory('communication').length})`} />
          <Tab label={`Computers (${getInstalledByCategory('computer').length})`} />
        </Tabs>
      </Box>

      {/* Command Tab */}
      <TabPanel value={activeTab} index={0}>
        {renderInstalledSystems('command')}
        {selectedSystem?.category === 'command' && renderAddForm()}
        {renderSystemTable(systemsByCategory.command)}
      </TabPanel>

      {/* Communications Tab */}
      <TabPanel value={activeTab} index={1}>
        {renderInstalledSystems('communication')}
        {selectedSystem?.category === 'communication' && renderAddForm()}
        {renderSystemTable(systemsByCategory.communication)}
      </TabPanel>

      {/* Computers Tab */}
      <TabPanel value={activeTab} index={2}>
        {renderInstalledSystems('computer')}
        {selectedSystem?.category === 'computer' && renderAddForm()}
        {renderComputerTable()}
      </TabPanel>
    </Box>
  );
}
