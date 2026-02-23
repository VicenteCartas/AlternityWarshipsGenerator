import { useState, useMemo, Fragment } from 'react';
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
  Tabs,
  Tab,
  Stack,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import { TabPanel, TruncatedDescription } from './shared';
import { headerCellSx } from '../constants/tableStyles';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  LifeSupportType,
  AccommodationType,
  StoreSystemType,
  GravitySystemType,
  InstalledLifeSupport,
  InstalledAccommodation,
  InstalledStoreSystem,
  InstalledGravitySystem,
} from '../types/supportSystem';
import {
  getAllLifeSupportTypes,
  getAllAccommodationTypes,
  getAllStoreSystemTypes,
  getAllGravitySystemTypes,
  calculateSupportSystemsStats,
  generateLifeSupportId,
  generateAccommodationId,
  generateStoreSystemId,
  generateGravitySystemId,
  calculateGravitySystemHullPoints,
  calculateGravitySystemCost,
} from '../services/supportSystemService';
import { filterByDesignConstraints } from '../services/utilities';
import { formatCost, getTechTrackName } from '../services/formatters';

interface SupportSystemsSelectionProps {
  hull: Hull;
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  installedGravitySystems: InstalledGravitySystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  surfaceProvidesLifeSupport?: boolean;
  surfaceProvidesGravity?: boolean;
  onLifeSupportChange: (lifeSupport: InstalledLifeSupport[]) => void;
  onAccommodationsChange: (accommodations: InstalledAccommodation[]) => void;
  onStoreSystemsChange: (storeSystems: InstalledStoreSystem[]) => void;
  onGravitySystemsChange: (gravitySystems: InstalledGravitySystem[]) => void;
}

export function SupportSystemsSelection({
  hull,
  installedLifeSupport,
  installedAccommodations,
  installedStoreSystems,
  installedGravitySystems,
  designProgressLevel,
  designTechTracks,
  surfaceProvidesLifeSupport = false,
  surfaceProvidesGravity = false,
  onLifeSupportChange,
  onAccommodationsChange,
  onStoreSystemsChange,
  onGravitySystemsChange,
}: SupportSystemsSelectionProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Life Support state
  const [selectedLifeSupport, setSelectedLifeSupport] = useState<LifeSupportType | null>(null);
  const [lifeSupportQuantity, setLifeSupportQuantity] = useState<string>('1');
  const [lifeSupportExtraHp, setLifeSupportExtraHp] = useState<number>(0);
  const [editingLifeSupportId, setEditingLifeSupportId] = useState<string | null>(null);

  // Accommodation state
  const [selectedAccommodation, setSelectedAccommodation] = useState<AccommodationType | null>(null);
  const [accommodationQuantity, setAccommodationQuantity] = useState<string>('1');
  const [accommodationExtraHp, setAccommodationExtraHp] = useState<number>(0);
  const [editingAccommodationId, setEditingAccommodationId] = useState<string | null>(null);

  // Store System state
  const [selectedStoreSystem, setSelectedStoreSystem] = useState<StoreSystemType | null>(null);
  const [storeSystemQuantity, setStoreSystemQuantity] = useState<string>('1');
  const [storeSystemExtraHp, setStoreSystemExtraHp] = useState<number>(0);
  const [editingStoreSystemId, setEditingStoreSystemId] = useState<string | null>(null);

  // Get filtered types
  const availableLifeSupport = useMemo(() => {
    return filterByDesignConstraints(getAllLifeSupportTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const availableAccommodations = useMemo(() => {
    return filterByDesignConstraints(getAllAccommodationTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const availableStoreSystems = useMemo(() => {
    return filterByDesignConstraints(getAllStoreSystemTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  const availableGravitySystems = useMemo(() => {
    return filterByDesignConstraints(getAllGravitySystemTypes(), designProgressLevel, designTechTracks);
  }, [designProgressLevel, designTechTracks]);

  // Calculate stats
  const stats = useMemo(
    () => calculateSupportSystemsStats(
      installedLifeSupport,
      installedAccommodations,
      installedStoreSystems,
      installedGravitySystems,
      designProgressLevel,
      designTechTracks
    ),
    [installedLifeSupport, installedAccommodations, installedStoreSystems, installedGravitySystems, designProgressLevel, designTechTracks]
  );

  // ============== Life Support Handlers ==============

  const handleSelectLifeSupport = (type: LifeSupportType) => {
    setSelectedLifeSupport(type);
    setLifeSupportQuantity('1');
    setLifeSupportExtraHp(0);
    setEditingLifeSupportId(null);
  };

  const handleAddLifeSupport = () => {
    if (!selectedLifeSupport) return;
    const quantity = parseInt(lifeSupportQuantity, 10) || 1;
    const extraHp = selectedLifeSupport.expandable ? lifeSupportExtraHp : undefined;

    if (editingLifeSupportId) {
      onLifeSupportChange(
        installedLifeSupport.map((ls) =>
          ls.id === editingLifeSupportId
            ? { ...ls, type: selectedLifeSupport, quantity, extraHp }
            : ls
        )
      );
    } else {
      // Always add as a new installation (don't combine with existing)
      onLifeSupportChange([
        ...installedLifeSupport,
        { id: generateLifeSupportId(), type: selectedLifeSupport, quantity, extraHp },
      ]);
    }

    setSelectedLifeSupport(null);
    setLifeSupportQuantity('1');
    setLifeSupportExtraHp(0);
    setEditingLifeSupportId(null);
  };

  const handleEditLifeSupport = (installed: InstalledLifeSupport) => {
    setSelectedLifeSupport(installed.type);
    setLifeSupportQuantity(installed.quantity.toString());
    setLifeSupportExtraHp(installed.extraHp || 0);
    setEditingLifeSupportId(installed.id);
  };

  const handleDuplicateLifeSupport = (installed: InstalledLifeSupport) => {
    const duplicate: InstalledLifeSupport = {
      id: generateLifeSupportId(),
      type: installed.type,
      quantity: installed.quantity,
      ...(installed.extraHp ? { extraHp: installed.extraHp } : {}),
    };
    const index = installedLifeSupport.findIndex(ls => ls.id === installed.id);
    const updated = [...installedLifeSupport];
    updated.splice(index + 1, 0, duplicate);
    onLifeSupportChange(updated);
  };

  const handleRemoveLifeSupport = (id: string) => {
    onLifeSupportChange(installedLifeSupport.filter((ls) => ls.id !== id));
  };

  // ============== Accommodation Handlers ==============

  const handleSelectAccommodation = (type: AccommodationType) => {
    setSelectedAccommodation(type);
    setAccommodationQuantity('1');
    setAccommodationExtraHp(0);
    setEditingAccommodationId(null);
  };

  const handleAddAccommodation = () => {
    if (!selectedAccommodation) return;
    const quantity = parseInt(accommodationQuantity, 10) || 1;
    const extraHp = selectedAccommodation.expandable ? accommodationExtraHp : undefined;

    if (editingAccommodationId) {
      onAccommodationsChange(
        installedAccommodations.map((acc) =>
          acc.id === editingAccommodationId
            ? { ...acc, type: selectedAccommodation, quantity, extraHp }
            : acc
        )
      );
    } else {
      // Always add as a new installation (don't combine with existing)
      onAccommodationsChange([
        ...installedAccommodations,
        { id: generateAccommodationId(), type: selectedAccommodation, quantity, extraHp },
      ]);
    }

    setSelectedAccommodation(null);
    setAccommodationQuantity('1');
    setAccommodationExtraHp(0);
    setEditingAccommodationId(null);
  };

  const handleEditAccommodation = (installed: InstalledAccommodation) => {
    setSelectedAccommodation(installed.type);
    setAccommodationQuantity(installed.quantity.toString());
    setAccommodationExtraHp(installed.extraHp || 0);
    setEditingAccommodationId(installed.id);
  };

  const handleDuplicateAccommodation = (installed: InstalledAccommodation) => {
    const duplicate: InstalledAccommodation = {
      id: generateAccommodationId(),
      type: installed.type,
      quantity: installed.quantity,
      ...(installed.extraHp ? { extraHp: installed.extraHp } : {}),
    };
    const index = installedAccommodations.findIndex(acc => acc.id === installed.id);
    const updated = [...installedAccommodations];
    updated.splice(index + 1, 0, duplicate);
    onAccommodationsChange(updated);
  };

  const handleRemoveAccommodation = (id: string) => {
    onAccommodationsChange(installedAccommodations.filter((acc) => acc.id !== id));
  };

  // ============== Store System Handlers ==============

  const handleSelectStoreSystem = (type: StoreSystemType) => {
    setSelectedStoreSystem(type);
    setStoreSystemQuantity('1');
    setStoreSystemExtraHp(0);
    setEditingStoreSystemId(null);
  };

  const handleAddStoreSystem = () => {
    if (!selectedStoreSystem) return;
    const quantity = parseInt(storeSystemQuantity, 10) || 1;
    const extraHp = selectedStoreSystem.expandable ? storeSystemExtraHp : undefined;

    if (editingStoreSystemId) {
      onStoreSystemsChange(
        installedStoreSystems.map((store) =>
          store.id === editingStoreSystemId
            ? { ...store, type: selectedStoreSystem, quantity, extraHp }
            : store
        )
      );
    } else {
      // Always add as a new installation (don't combine with existing)
      onStoreSystemsChange([
        ...installedStoreSystems,
        { id: generateStoreSystemId(), type: selectedStoreSystem, quantity, extraHp },
      ]);
    }

    setSelectedStoreSystem(null);
    setStoreSystemQuantity('1');
    setStoreSystemExtraHp(0);
    setEditingStoreSystemId(null);
  };

  const handleEditStoreSystem = (installed: InstalledStoreSystem) => {
    setSelectedStoreSystem(installed.type);
    setStoreSystemQuantity(installed.quantity.toString());
    setStoreSystemExtraHp(installed.extraHp || 0);
    setEditingStoreSystemId(installed.id);
  };

  const handleDuplicateStoreSystem = (installed: InstalledStoreSystem) => {
    const duplicate: InstalledStoreSystem = {
      id: generateStoreSystemId(),
      type: installed.type,
      quantity: installed.quantity,
      ...(installed.extraHp ? { extraHp: installed.extraHp } : {}),
    };
    const index = installedStoreSystems.findIndex(s => s.id === installed.id);
    const updated = [...installedStoreSystems];
    updated.splice(index + 1, 0, duplicate);
    onStoreSystemsChange(updated);
  };

  const handleRemoveStoreSystem = (id: string) => {
    onStoreSystemsChange(installedStoreSystems.filter((store) => store.id !== id));
  };

  // ============== Render Helpers ==============

  const renderLifeSupportTab = () => (
    <Box>
      {/* Installed Life Support */}
      {installedLifeSupport.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Life Support
          </Typography>
          <Stack spacing={1}>
            {installedLifeSupport.map((installed) => {
              const isEditing = editingLifeSupportId === installed.id;
              return (
                <Fragment key={installed.id}>
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
                    {installed.quantity}x {installed.type.name}{installed.extraHp ? ` (+${installed.extraHp} HP)` : ''}
                  </Typography>
                  <Chip
                    label={`${installed.type.hullPoints * installed.quantity + (installed.extraHp || 0)} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${installed.type.powerRequired * installed.quantity} Power`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Covers ${installed.type.coveragePerHullPoint * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0)} HP (${((( installed.type.coveragePerHullPoint * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0)) / hull.hullPoints) * 100).toFixed(0)}%)`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={formatCost(installed.type.cost * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionCostPerHp || 0) : 0))}
                    size="small"
                    variant="outlined"
                  />
                  <IconButton size="small" color="primary" onClick={() => handleEditLifeSupport(installed)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDuplicateLifeSupport(installed)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleRemoveLifeSupport(installed.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Inline edit form */}
                {isEditing && selectedLifeSupport && (
                  <Box sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <TextField
                        label="Quantity"
                        type="number"
                        size="small"
                        value={lifeSupportQuantity}
                        onChange={(e) => setLifeSupportQuantity(e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                      />
                      {selectedLifeSupport.expandable && (
                        <TextField
                          label="Extra HP"
                          type="number"
                          size="small"
                          value={lifeSupportExtraHp}
                          onChange={(e) => setLifeSupportExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100 }}
                        />
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          HP: {selectedLifeSupport.hullPoints * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp : 0)} |
                          Power: {selectedLifeSupport.powerRequired * (parseInt(lifeSupportQuantity, 10) || 1)} |
                          Covers: {selectedLifeSupport.coveragePerHullPoint * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp * (selectedLifeSupport.expansionValuePerHp || 0) : 0)} HP ({(((selectedLifeSupport.coveragePerHullPoint * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp * (selectedLifeSupport.expansionValuePerHp || 0) : 0)) / hull.hullPoints) * 100).toFixed(0)}%) |
                          Cost: {formatCost(selectedLifeSupport.cost * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp * (selectedLifeSupport.expansionCostPerHp || 0) : 0))}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedLifeSupport(null);
                              setEditingLifeSupportId(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={handleAddLifeSupport}
                          >
                            Update
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Fragment>
            );
          })}
          </Stack>
        </Paper>
      )}

      {/* Add new Life Support - Only show when adding new (not editing) */}
      {selectedLifeSupport && !editingLifeSupportId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            Add {selectedLifeSupport.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={lifeSupportQuantity}
              onChange={(e) => setLifeSupportQuantity(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ width: 100 }}
            />
            {selectedLifeSupport.expandable && (
              <TextField
                label="Extra HP"
                type="number"
                size="small"
                value={lifeSupportExtraHp}
                onChange={(e) => setLifeSupportExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                inputProps={{ min: 0 }}
                sx={{ width: 100 }}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                HP: {selectedLifeSupport.hullPoints * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp : 0)} |
                Power: {selectedLifeSupport.powerRequired * (parseInt(lifeSupportQuantity, 10) || 1)} |
                Covers: {selectedLifeSupport.coveragePerHullPoint * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp * (selectedLifeSupport.expansionValuePerHp || 0) : 0)} HP ({(((selectedLifeSupport.coveragePerHullPoint * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp * (selectedLifeSupport.expansionValuePerHp || 0) : 0)) / hull.hullPoints) * 100).toFixed(0)}%) |
                Cost: {formatCost(selectedLifeSupport.cost * (parseInt(lifeSupportQuantity, 10) || 1) + (selectedLifeSupport.expandable ? lifeSupportExtraHp * (selectedLifeSupport.expansionCostPerHp || 0) : 0))}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedLifeSupport(null);
                    setEditingLifeSupportId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddLifeSupport}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Available Life Support Types */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 700 } }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell align="center" sx={headerCellSx}>PL</TableCell>
              <TableCell align="center" sx={headerCellSx}>Tech</TableCell>
              <TableCell align="right" sx={headerCellSx}>HP</TableCell>
              <TableCell align="right" sx={headerCellSx}>Power</TableCell>
              <TableCell align="right" sx={headerCellSx}>Cost</TableCell>
              <TableCell align="right" sx={headerCellSx}>Covers</TableCell>
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableLifeSupport.map((type) => (
              <TableRow
                key={type.id}
                hover
                selected={selectedLifeSupport?.id === type.id}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                onClick={() => handleSelectLifeSupport(type)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    {type.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">{type.progressLevel}</TableCell>
                <TableCell align="center">
                  {type.techTracks.length > 0 ? (
                    <Tooltip title={type.techTracks.map(getTechTrackName).join(', ')}>
                      <Typography variant="caption">{type.techTracks.join(', ')}</Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="right">{type.hullPoints}</TableCell>
                <TableCell align="right">{type.powerRequired}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCost(type.cost)}</TableCell>
                <TableCell align="right">{type.coveragePerHullPoint} HP</TableCell>
                <TableCell>
                  <TruncatedDescription text={type.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderAccommodationsTab = () => (
    <Box>
      {/* Installed Accommodations */}
      {installedAccommodations.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Accommodations
          </Typography>
          <Stack spacing={1}>
            {installedAccommodations.map((installed) => {
              const isEditing = editingAccommodationId === installed.id;
              return (
                <Fragment key={installed.id}>
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
                    {installed.quantity}x {installed.type.name}{installed.extraHp ? ` (+${installed.extraHp} HP)` : ''}
                  </Typography>
                  <Chip
                    label={`${installed.type.hullPoints * installed.quantity + (installed.extraHp || 0)} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${installed.type.powerRequired * installed.quantity} Power`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${installed.type.capacity * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0)} ${installed.type.category}${installed.type.category === 'crew' ? ` (${(((installed.type.capacity * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0)) / hull.crew) * 100).toFixed(0)}%)` : ''}`}
                    size="small"
                    color={installed.type.category === 'crew' ? 'error' : installed.type.category === 'troop' ? 'error' : installed.type.category === 'passenger' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                  {installed.type.includesAirlock && (
                    <Chip
                      label={`${installed.quantity} airlock${installed.quantity > 1 ? 's' : ''}`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                  )}
                  <Chip
                    label={formatCost(installed.type.cost * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionCostPerHp || 0) : 0))}
                    size="small"
                    variant="outlined"
                  />
                  <IconButton size="small" color="primary" onClick={() => handleEditAccommodation(installed)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDuplicateAccommodation(installed)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleRemoveAccommodation(installed.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Inline edit form */}
                {isEditing && selectedAccommodation && (
                  <Box sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <TextField
                        label="Quantity"
                        type="number"
                        size="small"
                        value={accommodationQuantity}
                        onChange={(e) => setAccommodationQuantity(e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                      />
                      {selectedAccommodation.expandable && (
                        <TextField
                          label="Extra HP"
                          type="number"
                          size="small"
                          value={accommodationExtraHp}
                          onChange={(e) => setAccommodationExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100 }}
                        />
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          HP: {selectedAccommodation.hullPoints * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp : 0)} |
                          Power: {selectedAccommodation.powerRequired * (parseInt(accommodationQuantity, 10) || 1)} |
                          Capacity: {selectedAccommodation.capacity * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp * (selectedAccommodation.expansionValuePerHp || 0) : 0)}{selectedAccommodation.category === 'crew' ? ` (${(((selectedAccommodation.capacity * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp * (selectedAccommodation.expansionValuePerHp || 0) : 0)) / hull.crew) * 100).toFixed(0)}%)` : ''} |
                          Cost: {formatCost(selectedAccommodation.cost * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp * (selectedAccommodation.expansionCostPerHp || 0) : 0))}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedAccommodation(null);
                              setEditingAccommodationId(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={handleAddAccommodation}
                          >
                            Update
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Fragment>
            );
          })}
          </Stack>
        </Paper>
      )}

      {/* Add new Accommodation - Only show when adding new (not editing) */}
      {selectedAccommodation && !editingAccommodationId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            Add {selectedAccommodation.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={accommodationQuantity}
              onChange={(e) => setAccommodationQuantity(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ width: 100 }}
            />
            {selectedAccommodation.expandable && (
              <TextField
                label="Extra HP"
                type="number"
                size="small"
                value={accommodationExtraHp}
                onChange={(e) => setAccommodationExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                inputProps={{ min: 0 }}
                sx={{ width: 100 }}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                HP: {selectedAccommodation.hullPoints * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp : 0)} |
                Power: {selectedAccommodation.powerRequired * (parseInt(accommodationQuantity, 10) || 1)} |
                Capacity: {selectedAccommodation.capacity * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp * (selectedAccommodation.expansionValuePerHp || 0) : 0)}{selectedAccommodation.category === 'crew' ? ` (${(((selectedAccommodation.capacity * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp * (selectedAccommodation.expansionValuePerHp || 0) : 0)) / hull.crew) * 100).toFixed(0)}%)` : ''} |
                Cost: {formatCost(selectedAccommodation.cost * (parseInt(accommodationQuantity, 10) || 1) + (selectedAccommodation.expandable ? accommodationExtraHp * (selectedAccommodation.expansionCostPerHp || 0) : 0))}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedAccommodation(null);
                    setEditingAccommodationId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddAccommodation}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Available Accommodation Types */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 800 } }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell align="center" sx={headerCellSx}>PL</TableCell>
              <TableCell align="center" sx={headerCellSx}>Tech</TableCell>
              <TableCell align="right" sx={headerCellSx}>HP</TableCell>
              <TableCell align="right" sx={headerCellSx}>Power</TableCell>
              <TableCell align="right" sx={headerCellSx}>Cost</TableCell>
              <TableCell align="right" sx={headerCellSx}>Capacity</TableCell>
              <TableCell align="center" sx={headerCellSx}>Type</TableCell>
              <TableCell align="center" sx={headerCellSx}>Airlock</TableCell>
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableAccommodations.map((type) => (
              <TableRow
                key={type.id}
                hover
                selected={selectedAccommodation?.id === type.id}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                onClick={() => handleSelectAccommodation(type)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    {type.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">{type.progressLevel}</TableCell>
                <TableCell align="center">
                  {type.techTracks.length > 0 ? (
                    <Tooltip title={type.techTracks.map(getTechTrackName).join(', ')}>
                      <Typography variant="caption">{type.techTracks.join(', ')}</Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="right">{type.hullPoints}</TableCell>
                <TableCell align="right">{type.powerRequired}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCost(type.cost)}</TableCell>
                <TableCell align="right">{type.capacity}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={type.category}
                    size="small"
                    color={type.category === 'crew' ? 'error' : type.category === 'troop' ? 'error' : type.category === 'passenger' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  {type.includesAirlock ? (
                    <Chip label="Yes" size="small" color="success" variant="outlined" />
                  ) : (
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <TruncatedDescription text={type.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStoresTab = () => (
    <Box>
      {/* Installed Store Systems */}
      {installedStoreSystems.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Store Systems
          </Typography>
          <Stack spacing={1}>
            {installedStoreSystems.map((installed) => {
              const isEditing = editingStoreSystemId === installed.id;
              return (
                <Fragment key={installed.id}>
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
                    {installed.quantity}x {installed.type.name}{installed.extraHp ? ` (+${installed.extraHp} HP)` : ''}
                  </Typography>
                  <Chip
                    label={`${installed.type.hullPoints * installed.quantity + (installed.extraHp || 0)} HP`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`${installed.type.powerRequired * installed.quantity} Power`}
                    size="small"
                    variant="outlined"
                  />
                  {installed.type.effect === 'feeds' && (() => {
                    const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
                    const feedCount = installed.type.effectValue * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
                    return (
                      <Chip
                        label={`Feeds ${feedCount}${activePersons > 0 ? ` (${((feedCount / activePersons) * 100).toFixed(0)}%)` : ''}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    );
                  })()}
                  {installed.type.effect === 'reduces-consumption' && (() => {
                    const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
                    const recycleCount = (installed.type.affectedPeople || 0) * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0);
                    return (
                      <Chip
                        label={`Recycles for ${recycleCount}${activePersons > 0 ? ` (${((recycleCount / activePersons) * 100).toFixed(0)}%)` : ''}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    );
                  })()}
                  {installed.type.effect === 'adds-stores' && (
                    <Chip
                      label={`Stores: +${(installed.type.effectValue * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionValuePerHp || 0) : 0)).toLocaleString()} days`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  <Chip
                    label={formatCost(installed.type.cost * installed.quantity + (installed.type.expandable && installed.extraHp ? installed.extraHp * (installed.type.expansionCostPerHp || 0) : 0))}
                    size="small"
                    variant="outlined"
                  />
                  <IconButton size="small" color="primary" onClick={() => handleEditStoreSystem(installed)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDuplicateStoreSystem(installed)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleRemoveStoreSystem(installed.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Inline edit form */}
                {isEditing && selectedStoreSystem && (
                  <Box sx={{ pl: 2, pr: 2, pb: 1, pt: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <TextField
                        label="Quantity"
                        type="number"
                        size="small"
                        value={storeSystemQuantity}
                        onChange={(e) => setStoreSystemQuantity(e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 100 }}
                      />
                      {selectedStoreSystem.expandable && (
                        <TextField
                          label="Extra HP"
                          type="number"
                          size="small"
                          value={storeSystemExtraHp}
                          onChange={(e) => setStoreSystemExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          inputProps={{ min: 0 }}
                          sx={{ width: 100 }}
                        />
                      )}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          HP: {selectedStoreSystem.hullPoints * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp : 0)} |
                          Power: {selectedStoreSystem.powerRequired * (parseInt(storeSystemQuantity, 10) || 1)} |
                          {selectedStoreSystem.effect === 'feeds' && (() => {
                            const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
                            const feedCount = selectedStoreSystem.effectValue * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionValuePerHp || 0) : 0);
                            return `Feeds ${feedCount}${activePersons > 0 ? ` (${((feedCount / activePersons) * 100).toFixed(0)}%)` : ''} | `;
                          })()}
                          {selectedStoreSystem.effect === 'reduces-consumption' && (() => {
                            const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
                            const recycleCount = (selectedStoreSystem.affectedPeople || 0) * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionValuePerHp || 0) : 0);
                            return `Recycles for ${recycleCount}${activePersons > 0 ? ` (${((recycleCount / activePersons) * 100).toFixed(0)}%)` : ''} | `;
                          })()}
                          {selectedStoreSystem.effect === 'adds-stores' && `+${(selectedStoreSystem.effectValue * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionValuePerHp || 0) : 0)).toLocaleString()} days | `}
                          Cost: {formatCost(selectedStoreSystem.cost * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionCostPerHp || 0) : 0))}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setSelectedStoreSystem(null);
                              setEditingStoreSystemId(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={handleAddStoreSystem}
                          >
                            Update
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Fragment>
            );
          })}
          </Stack>
        </Paper>
      )}

      {/* Add new Store System - Only show when adding new (not editing) */}
      {selectedStoreSystem && !editingStoreSystemId && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            Add {selectedStoreSystem.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Quantity"
              type="number"
              size="small"
              value={storeSystemQuantity}
              onChange={(e) => setStoreSystemQuantity(e.target.value)}
              inputProps={{ min: 1 }}
              sx={{ width: 100 }}
            />
            {selectedStoreSystem.expandable && (
              <TextField
                label="Extra HP"
                type="number"
                size="small"
                value={storeSystemExtraHp}
                onChange={(e) => setStoreSystemExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                inputProps={{ min: 0 }}
                sx={{ width: 100 }}
              />
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                HP: {selectedStoreSystem.hullPoints * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp : 0)} |
                Power: {selectedStoreSystem.powerRequired * (parseInt(storeSystemQuantity, 10) || 1)} |
                {selectedStoreSystem.effect === 'feeds' && (() => {
                  const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
                  const feedCount = selectedStoreSystem.effectValue * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionValuePerHp || 0) : 0);
                  return `Feeds ${feedCount}${activePersons > 0 ? ` (${((feedCount / activePersons) * 100).toFixed(0)}%)` : ''} | `;
                })()}
                {selectedStoreSystem.effect === 'reduces-consumption' && (() => {
                  const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
                  const recycleCount = (selectedStoreSystem.affectedPeople || 0) * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionValuePerHp || 0) : 0);
                  return `Recycles for ${recycleCount}${activePersons > 0 ? ` (${((recycleCount / activePersons) * 100).toFixed(0)}%)` : ''} | `;
                })()}
                {selectedStoreSystem.effect === 'adds-stores' && `+${(selectedStoreSystem.effectValue * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionValuePerHp || 0) : 0)).toLocaleString()} days | `}
                Cost: {formatCost(selectedStoreSystem.cost * (parseInt(storeSystemQuantity, 10) || 1) + (selectedStoreSystem.expandable ? storeSystemExtraHp * (selectedStoreSystem.expansionCostPerHp || 0) : 0))}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setSelectedStoreSystem(null);
                    setEditingStoreSystemId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddStoreSystem}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Available Store System Types */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 700 } }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Name</TableCell>
              <TableCell align="center" sx={headerCellSx}>PL</TableCell>
              <TableCell align="center" sx={headerCellSx}>Tech</TableCell>
              <TableCell align="right" sx={headerCellSx}>HP</TableCell>
              <TableCell align="right" sx={headerCellSx}>Power</TableCell>
              <TableCell align="right" sx={headerCellSx}>Cost</TableCell>
              <TableCell sx={headerCellSx}>Effect</TableCell>
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableStoreSystems.map((type) => (
              <TableRow
                key={type.id}
                hover
                selected={selectedStoreSystem?.id === type.id}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
                onClick={() => handleSelectStoreSystem(type)}
              >
                <TableCell>
                  <Typography variant="body2" fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    {type.name}
                  </Typography>
                </TableCell>
                <TableCell align="center">{type.progressLevel}</TableCell>
                <TableCell align="center">
                  {type.techTracks.length > 0 ? (
                    <Tooltip title={type.techTracks.map(getTechTrackName).join(', ')}>
                      <Typography variant="caption">{type.techTracks.join(', ')}</Typography>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="right">{type.hullPoints}</TableCell>
                <TableCell align="right">{type.powerRequired}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCost(type.cost)}</TableCell>
                <TableCell>
                  {type.effect === 'feeds' && `Feeds ${type.effectValue}`}
                  {type.effect === 'reduces-consumption' && `Recycles for ${type.affectedPeople}`}
                  {type.effect === 'adds-stores' && `+${type.effectValue.toLocaleString()} days`}
                </TableCell>
                <TableCell>
                  <TruncatedDescription text={type.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ============== Gravity System Handlers ==============

  const handleAddGravitySystem = (gravityType: GravitySystemType) => {
    const hullPoints = calculateGravitySystemHullPoints(gravityType, hull.hullPoints);
    const cost = calculateGravitySystemCost(gravityType, hullPoints);
    
    const newSystem: InstalledGravitySystem = {
      id: generateGravitySystemId(),
      type: gravityType,
      hullPoints,
      cost,
    };
    onGravitySystemsChange([...installedGravitySystems, newSystem]);
  };

  const handleRemoveGravitySystem = (id: string) => {
    onGravitySystemsChange(installedGravitySystems.filter((gs) => gs.id !== id));
  };

  const renderGravityTab = () => {
    // Check if a gravity system is already installed
    const hasInstalledGravitySystem = installedGravitySystems.length > 0;
    
    return (
      <Box>
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Artificial Gravity Status
          </Typography>
          {stats.hasArtificialGravity ? (
            <Box>
              <Chip label="Artificial Gravity Available" color="success" sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                At Progress Level {designProgressLevel} with {designTechTracks.length > 0 ? `Tech Tracks: ${designTechTracks.join(', ')}` : 'all tech tracks available'},
                artificial gravity is automatically included in your life support systems at no extra cost.
                This protects crew from deadly accelerations and provides normal gravity throughout the ship.
              </Typography>
            </Box>
          ) : hasInstalledGravitySystem ? (
            <Box>
              <Chip label="Centrifugal Gravity Installed" color="info" sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Your ship uses centrifugal force (spin gravity) to simulate artificial gravity.
              </Typography>
            </Box>
          ) : (
            <Box>
              <Chip label="No Artificial Gravity" color="warning" sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Artificial gravity requires Progress Level 6+ with Gravity (G) technology, or Progress Level 8+ with Energy Transformation (X) technology.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Without artificial gravity, the ship can simulate gravity through constant acceleration (thrust gravity)
                or by installing a spin system.
              </Typography>
            </Box>
          )}
        </Paper>

        {/* Installed Gravity Systems */}
        {installedGravitySystems.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Installed Gravity Systems
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Action</TableCell>
                    <TableCell sx={headerCellSx}>Name</TableCell>
                    <TableCell sx={headerCellSx}>PL</TableCell>
                    <TableCell sx={headerCellSx}>Hull %</TableCell>
                    <TableCell sx={headerCellSx}>HP Used</TableCell>
                    <TableCell sx={headerCellSx}>Cost</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {installedGravitySystems.map((gs) => (
                    <TableRow key={gs.id}>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveGravitySystem(gs.id)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>{gs.type.name}</TableCell>
                      <TableCell>{gs.type.progressLevel}</TableCell>
                      <TableCell>{gs.type.hullPercentage}%</TableCell>
                      <TableCell>{gs.hullPoints}</TableCell>
                      <TableCell>{formatCost(gs.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Available Gravity Systems - only show when artificial gravity is NOT available */}
        {!stats.hasArtificialGravity && !hasInstalledGravitySystem && availableGravitySystems.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Available Gravity Systems
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headerCellSx}>Action</TableCell>
                    <TableCell sx={headerCellSx}>Name</TableCell>
                    <TableCell sx={headerCellSx}>PL</TableCell>
                    <TableCell sx={headerCellSx}>Tech</TableCell>
                    <TableCell sx={headerCellSx}>Hull %</TableCell>
                    <TableCell sx={headerCellSx}>Est. HP</TableCell>
                    <TableCell sx={headerCellSx}>Cost/HP</TableCell>
                    <TableCell sx={headerCellSx}>Est. Cost</TableCell>
                    <TableCell sx={headerCellSx}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {availableGravitySystems.map((gt) => {
                    const estHP = calculateGravitySystemHullPoints(gt, hull.hullPoints);
                    const estCost = calculateGravitySystemCost(gt, estHP);
                    return (
                      <TableRow key={gt.id} hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleAddGravitySystem(gt)}
                            color="primary"
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>{gt.name}</TableCell>
                        <TableCell>{gt.progressLevel}</TableCell>
                        <TableCell>
                          {gt.techTracks.length > 0 ? (
                            <Tooltip title={gt.techTracks.map(getTechTrackName).join(', ')}>
                              <span>{gt.techTracks.join(', ')}</span>
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{gt.hullPercentage}%</TableCell>
                        <TableCell>{estHP}</TableCell>
                        <TableCell>{formatCost(gt.costPerHullPoint)}</TableCell>
                        <TableCell>{formatCost(estCost)}</TableCell>
                        <TableCell>
                          <TruncatedDescription text={gt.description} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {/* Surface environment info banners */}
      {(surfaceProvidesLifeSupport || surfaceProvidesGravity) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {surfaceProvidesLifeSupport && (
            <Alert severity="info" variant="outlined">
              <strong>Surface provides life support</strong> — This ground base has a breathable atmosphere. Life support systems are optional but can provide backup or sealed areas.
            </Alert>
          )}
          {surfaceProvidesGravity && (
            <Alert severity="info" variant="outlined">
              <strong>Surface provides gravity</strong> — This ground base has natural gravity. Artificial gravity systems are not required.
            </Alert>
          )}
        </Stack>
      )}

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
          {surfaceProvidesLifeSupport ? (
            <Chip
              label="Life Support: Surface"
              color="success"
              variant="outlined"
            />
          ) : (
            <Chip
              label={`Life Support: ${stats.totalCoverage}/${hull.hullPoints} HP (${((stats.totalCoverage / hull.hullPoints) * 100).toFixed(0)}%)`}
              color={stats.totalCoverage >= hull.hullPoints ? 'success' : 'warning'}
              variant="outlined"
            />
          )}
          <Chip
            label={`Crew: ${stats.crewCapacity}/${hull.crew} (${((stats.crewCapacity / hull.crew) * 100).toFixed(0)}%)`}
            color={stats.crewCapacity >= hull.crew ? 'success' : 'warning'}
            variant="outlined"
          />
          {stats.troopCapacity > 0 && (
            <Chip
              label={`Troops: ${stats.troopCapacity}`}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.passengerCapacity > 0 && (
            <Chip
              label={`Passengers: ${stats.passengerCapacity}`}
              color="primary"
              variant="outlined"
            />
          )}
          {stats.suspendedCapacity > 0 && (
            <Chip
              label={`Suspended: ${stats.suspendedCapacity}`}
              color="primary"
              variant="outlined"
            />
          )}
          {(() => {
            // Calculate stores per person (only crew and passengers count, not cryo)
            // feedsReduction: "feeds" systems (e.g., hydroponics) where X people count as 1
            // recyclingReduction: "reduces-consumption" systems (e.g., recyclers) reduce consumption to Y%
            const activePersons = stats.crewCapacity + stats.passengerCapacity + stats.troopCapacity;
            // Cap recycling to not exceed remaining people after feeds
            const remainingAfterFeeds = Math.max(0, activePersons - stats.feedsReduction);
            const cappedRecyclingReduction = Math.min(stats.recyclingReduction, remainingAfterFeeds);
            const effectivePersons = Math.max(1, activePersons - stats.feedsReduction - cappedRecyclingReduction);
            if (activePersons > 0) {
              const totalStoreDays = stats.baseStoreDays + stats.additionalStoresDays;
              const storesPerPerson = Math.floor(totalStoreDays / effectivePersons);
              return (
                <Chip
                  label={`Stores: ${storesPerPerson} days/person`}
                  color="primary"
                  variant="outlined"
                />
              );
            }
            return null;
          })()}
          {!stats.hasArtificialGravity && !stats.hasGravitySystemInstalled && !surfaceProvidesGravity && (
            <Chip
              label="No Gravity"
              color="warning"
              variant="outlined"
            />
          )}
          {surfaceProvidesGravity && (
            <Chip
              label="Surface Gravity"
              color="success"
              variant="outlined"
            />
          )}
          {!surfaceProvidesGravity && (stats.hasArtificialGravity || stats.hasGravitySystemInstalled) && (
            <Chip
              label="Artificial Gravity"
              color="success"
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
          <Tab label={`Life Support (${installedLifeSupport.length})`} />
          <Tab label={`Accommodations (${installedAccommodations.length})`} />
          <Tab label={`Stores (${installedStoreSystems.length})`} />
          {!surfaceProvidesGravity && <Tab label={`Gravity (${installedGravitySystems.length})`} />}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderLifeSupportTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        {renderAccommodationsTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        {renderStoresTab()}
      </TabPanel>
      {!surfaceProvidesGravity && (
        <TabPanel value={activeTab} index={3}>
          {renderGravityTab()}
        </TabPanel>
      )}
    </Box>
  );
}
