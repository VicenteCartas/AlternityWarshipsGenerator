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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack, FilterWithAll } from '../types/common';
import type { HangarMiscSystemType, InstalledHangarMiscSystem, HangarMiscCategory } from '../types/hangarMisc';
import {
  getAllHangarMiscSystemTypes,
  filterByDesignConstraints,
  calculateHangarMiscStats,
  createInstalledHangarMiscSystem,
  updateInstalledHangarMiscSystem,
  calculateHangarMiscHullPoints,
  calculateHangarMiscPower,
  calculateHangarMiscCost,
  calculateHangarMiscCapacity,
} from '../services/hangarMiscService';
import { formatCost } from '../services/formatters';
import { TechTrackCell, TruncatedDescription } from './shared';

interface HangarMiscSelectionProps {
  hull: Hull;
  installedSystems: InstalledHangarMiscSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onSystemsChange: (systems: InstalledHangarMiscSystem[]) => void;
}

export function HangarMiscSelection({
  hull,
  installedSystems,
  designProgressLevel,
  designTechTracks,
  onSystemsChange,
}: HangarMiscSelectionProps) {
  const [categoryFilter, setCategoryFilter] = useState<FilterWithAll<HangarMiscCategory>>('all');
  const [selectedSystem, setSelectedSystem] = useState<HangarMiscSystemType | null>(null);
  const [systemQuantity, setSystemQuantity] = useState<string>('1');
  const [editingSystemId, setEditingSystemId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Get filtered system types
  const availableSystems = useMemo(() => {
    return filterByDesignConstraints(getAllHangarMiscSystemTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  // Apply category filter and exclude installed single-install systems
  const filteredSystems = useMemo(() => {
    const installedSingleInstallIds = installedSystems
      .filter((s) => s.type.hullPercentage && s.type.maxQuantity === 1)
      .map((s) => s.type.id);
    
    let systems = availableSystems.filter(
      (s) => !installedSingleInstallIds.includes(s.id)
    );
    
    if (categoryFilter !== 'all') {
      systems = systems.filter((s) => s.category === categoryFilter);
    }
    return systems.sort((a, b) => a.progressLevel - b.progressLevel);
  }, [availableSystems, categoryFilter, installedSystems]);

  // Count systems by category
  const categoryCounts = useMemo(() => {
    return {
      all: availableSystems.length,
      hangar: availableSystems.filter((s) => s.category === 'hangar').length,
      cargo: availableSystems.filter((s) => s.category === 'cargo').length,
      emergency: availableSystems.filter((s) => s.category === 'emergency').length,
      facility: availableSystems.filter((s) => s.category === 'facility').length,
      utility: availableSystems.filter((s) => s.category === 'utility').length,
    };
  }, [availableSystems]);

  // Calculate stats
  const stats = useMemo(
    () => calculateHangarMiscStats(installedSystems),
    [installedSystems]
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

  const handleSelectSystem = (type: HangarMiscSystemType) => {
    // For single-quantity percentage-based systems (like stabilizer), toggle directly
    if (type.hullPercentage && type.maxQuantity === 1) {
      const existingSystem = installedSystems.find((s) => s.type.id === type.id);
      if (existingSystem) {
        // Already installed - remove it
        onSystemsChange(installedSystems.filter((s) => s.id !== existingSystem.id));
      } else {
        // Not installed - add it
        onSystemsChange([
          ...installedSystems,
          createInstalledHangarMiscSystem(type, hull.hullPoints, 1),
        ]);
      }
      return;
    }

    setSelectedSystem(type);
    setSystemQuantity(String(type.minQuantity || 1));
    setEditingSystemId(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddSystem = () => {
    if (!selectedSystem) return;
    const quantity = parseInt(systemQuantity, 10) || 1;

    if (editingSystemId) {
      onSystemsChange(
        installedSystems.map((s) =>
          s.id === editingSystemId
            ? updateInstalledHangarMiscSystem(s, hull.hullPoints, quantity)
            : s
        )
      );
    } else {
      onSystemsChange([
        ...installedSystems,
        createInstalledHangarMiscSystem(selectedSystem, hull.hullPoints, quantity),
      ]);
    }

    setSelectedSystem(null);
    setSystemQuantity('1');
    setEditingSystemId(null);
  };

  const handleEditSystem = (installed: InstalledHangarMiscSystem) => {
    setSelectedSystem(installed.type);
    setSystemQuantity(installed.quantity.toString());
    setEditingSystemId(installed.id);
  };

  const handleRemoveSystem = (id: string) => {
    onSystemsChange(installedSystems.filter((s) => s.id !== id));
  };

  // Calculate preview values
  const previewQuantity = parseInt(systemQuantity, 10) || 1;
  const previewHullPts = selectedSystem ? calculateHangarMiscHullPoints(selectedSystem, hull.hullPoints, previewQuantity) : 0;
  const previewPower = selectedSystem ? calculateHangarMiscPower(selectedSystem, hull.hullPoints, previewQuantity) : 0;
  const previewCost = selectedSystem ? calculateHangarMiscCost(selectedSystem, hull.hullPoints, previewQuantity) : 0;
  const previewCapacity = selectedSystem ? calculateHangarMiscCapacity(selectedSystem, hull.hullPoints, previewQuantity) : 0;

  const getCategoryLabel = (category: HangarMiscCategory): string => {
    switch (category) {
      case 'hangar': return 'Hangars';
      case 'cargo': return 'Cargo';
      case 'emergency': return 'Emergency';
      case 'facility': return 'Facilities';
      case 'utility': return 'Utility';
      default: return category;
    }
  };

  // Format capacity display
  const formatCapacity = (system: HangarMiscSystemType, capacity: number): string => {
    if (capacity === 0) return '';
    
    // For evacuation systems, just show "X people"
    if (system.evacCapacity) {
      return `${capacity} people`;
    }
    
    // For brig, show "X prisoners"
    if (system.prisonersCapacity) {
      return `${capacity} prisoners`;
    }
    
    // For lab section, show "X scientists"
    if (system.scientistCapacity) {
      return `${capacity} scientists`;
    }
    
    // For sick bay, show "X beds"
    if (system.bedCapacity) {
      return `${capacity} beds`;
    }
    
    // For hangar, show "X HP craft"
    if (system.hangarCapacity) {
      return `${capacity} HP craft`;
    }
    
    // For docking clamp, show "X HP docked"
    if (system.dockCapacity) {
      return `${capacity} HP docked`;
    }
    
    // For magazine, show "X ordnance"
    if (system.ordnanceCapacity) {
      return `${capacity} ordnance`;
    }
    
    // For fuel collector, show "X HP fuel/day"
    if (system.fuelCollectionCapacity) {
      return `${capacity} HP fuel/day`;
    }
    
    // For accumulator, show "X PP stored"
    if (system.powerPointsCapacity) {
      return `${capacity} PP stored`;
    }
    
    // For boarding pod, show "X troops"
    if (system.troopCapacity) {
      return `${capacity} troops`;
    }
    
    // For coverage systems (security suite), show "Covers X HP"
    if (system.coveragePerHullPoint) {
      return `Covers ${capacity} HP`;
    }
    
    // Extract unit from capacityPerHull (e.g., "10 HP of embarked craft" -> "HP of embarked craft")
    if (system.capacityPerHull) {
      const match = system.capacityPerHull.match(/\d+\s+(.+)/);
      if (match) {
        return `${capacity} ${match[1]}`;
      }
    }
    return `${capacity}`;
  };

  // Render installed systems section
  const renderInstalledSystems = () => {
    if (installedSystems.length === 0) return null;

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed Systems
        </Typography>
        <Stack spacing={1}>
          {installedSystems.map((system) => (
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
              {system.capacity && (system.type.capacityPerHull || system.type.coveragePerHullPoint || system.type.fuelCollectionCapacity || system.type.powerPointsCapacity || system.type.troopCapacity) && (
                <Chip 
                  label={formatCapacity(system.type, system.capacity)} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              )}
              {system.capacity && system.type.cargoCapacity && (
                <Chip 
                  label={`Cargo: ${system.capacity} m³`} 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              )}
              {system.serviceCapacity && (
                <Chip 
                  label={`Services ${system.serviceCapacity} HP cargo`} 
                  size="small" 
                  color="success" 
                  variant="outlined" 
                />
              )}
              {system.type.effect && !system.type.cargoServiceCapacity && (
                <Chip label={system.type.effect} size="small" color="success" variant="outlined" />
              )}
              {/* Hide edit button for toggle systems (single-quantity percentage-based) */}
              {!(system.type.hullPercentage && system.type.maxQuantity === 1) && (
                <IconButton size="small" onClick={() => handleEditSystem(system)} color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" onClick={() => handleRemoveSystem(system.id)} color="error">
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
    if (!selectedSystem) return null;

    // Determine helper text for quantity
    let helperText = '';
    if (selectedSystem.hullPercentage) {
      const hpPer = Math.ceil((hull.hullPoints * selectedSystem.hullPercentage) / 100);
      helperText = `${hpPer} HP per unit (${selectedSystem.hullPercentage}% of hull)`;
    } else if (selectedSystem.capacityPerHull) {
      helperText = `${selectedSystem.hullPoints} HP = ${selectedSystem.capacityPerHull}`;
    } else {
      helperText = `${selectedSystem.hullPoints} HP each`;
    }

    return (
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: '10px' }}>
          {editingSystemId ? 'Edit' : 'Add'} {selectedSystem.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            label={selectedSystem.hullPercentage ? 'Units' : (selectedSystem.costPerHull ? 'Hull Points' : 'Quantity')}
            type="number"
            size="small"
            value={systemQuantity}
            onChange={(e) => setSystemQuantity(e.target.value)}
            inputProps={{ min: selectedSystem.minQuantity || 1 }}
            helperText={helperText}
            sx={{ width: 180 }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              HP: {previewHullPts} |
              Power: {previewPower} |
              Cost: {formatCost(previewCost)}
              {previewCapacity > 0 && (selectedSystem.capacityPerHull || selectedSystem.coveragePerHullPoint || selectedSystem.fuelCollectionCapacity || selectedSystem.powerPointsCapacity || selectedSystem.troopCapacity) && (
                <> | {formatCapacity(selectedSystem, previewCapacity)}</>
              )}
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

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 11: Hangars & Miscellaneous (Optional)
      </Typography>

      {/* Summary Chips */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`HP: ${stats.totalHullPoints}`} color="default" variant="outlined" />
          <Chip label={`Power: ${stats.totalPowerRequired}`} color="default" variant="outlined" />
          <Chip label={`Cost: ${formatCost(stats.totalCost)}`} color="default" variant="outlined" />
          {stats.totalHangarCapacity > 0 && (
            <Chip label={`Hangar: ${stats.totalHangarCapacity} HP`} color="primary" variant="outlined" />
          )}
          {stats.totalDockingCapacity > 0 && (
            <Chip label={`Docking: ${stats.totalDockingCapacity} HP`} color="primary" variant="outlined" />
          )}
          {stats.totalCargoCapacity > 0 && (
            <Chip label={`Cargo: ${stats.totalCargoCapacity} m³`} color="primary" variant="outlined" />
          )}
          {stats.totalEvacCapacity > 0 && (
            <Chip label={`Evac: ${stats.totalEvacCapacity} people`} color="primary" variant="outlined" />
          )}
          {stats.totalMagazineCapacity > 0 && (
            <Chip label={`Magazine: ${stats.totalMagazineCapacity} pts`} color="primary" variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Installed Systems */}
      {renderInstalledSystems()}

      {/* Configure Form */}
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
          <ToggleButton value="hangar">Hangars ({categoryCounts.hangar})</ToggleButton>
          <ToggleButton value="cargo">Cargo ({categoryCounts.cargo})</ToggleButton>
          <ToggleButton value="emergency">Emergency ({categoryCounts.emergency})</ToggleButton>
          <ToggleButton value="facility">Facilities ({categoryCounts.facility})</ToggleButton>
          <ToggleButton value="utility">Utility ({categoryCounts.utility})</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Systems Grid */}
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1200 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Capacity</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Effect</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSystems.map((system) => (
              <TableRow
                key={system.id}
                hover
                onClick={() => handleSelectSystem(system)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(selectedSystem?.id === system.id && {
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.light' },
                  }),
                }}
              >
                <TableCell sx={{ minWidth: 180 }}>{system.name}</TableCell>
                <TableCell>{system.progressLevel}</TableCell>
                <TechTrackCell techTracks={system.techTracks} />
                <TableCell>{getCategoryLabel(system.category)}</TableCell>
                <TableCell>
                  {system.hullPercentage 
                    ? `${system.hullPercentage}%` 
                    : system.hullPoints}
                </TableCell>
                <TableCell>{system.powerRequired}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatCost(system.cost)}
                  {system.costPerHull && '/HP'}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {system.cargoCapacity 
                    ? `${system.cargoCapacity} m³`
                    : system.cargoServiceCapacity
                    ? `Services ${system.cargoServiceCapacity} HP`
                    : system.fuelCollectionCapacity
                    ? `${system.fuelCollectionCapacity} HP fuel/day`
                    : system.powerPointsCapacity
                    ? `${system.powerPointsCapacity} PP stored`
                    : system.troopCapacity
                    ? `${system.troopCapacity} troops`
                    : system.capacityPerHull || '-'}
                </TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {system.effect || '-'}
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <TruncatedDescription text={system.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
