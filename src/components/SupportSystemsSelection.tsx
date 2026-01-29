import { useState, useMemo } from 'react';
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
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
  filterByDesignConstraints,
  calculateSupportSystemsStats,
  generateLifeSupportId,
  generateAccommodationId,
  generateStoreSystemId,
  generateGravitySystemId,
  calculateGravitySystemHullPoints,
  calculateGravitySystemCost,
} from '../services/supportSystemService';
import { formatCost, getTechTrackName } from '../services/formatters';

interface SupportSystemsSelectionProps {
  hull: Hull;
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  installedGravitySystems: InstalledGravitySystem[];
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onLifeSupportChange: (lifeSupport: InstalledLifeSupport[]) => void;
  onAccommodationsChange: (accommodations: InstalledAccommodation[]) => void;
  onStoreSystemsChange: (storeSystems: InstalledStoreSystem[]) => void;
  onGravitySystemsChange: (gravitySystems: InstalledGravitySystem[]) => void;
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

export function SupportSystemsSelection({
  hull,
  installedLifeSupport,
  installedAccommodations,
  installedStoreSystems,
  installedGravitySystems,
  usedHullPoints: _usedHullPoints,
  availablePower: _availablePower,
  designProgressLevel,
  designTechTracks,
  onLifeSupportChange,
  onAccommodationsChange,
  onStoreSystemsChange,
  onGravitySystemsChange,
}: SupportSystemsSelectionProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Life Support state
  const [selectedLifeSupport, setSelectedLifeSupport] = useState<LifeSupportType | null>(null);
  const [lifeSupportQuantity, setLifeSupportQuantity] = useState<string>('1');
  const [editingLifeSupportId, setEditingLifeSupportId] = useState<string | null>(null);

  // Accommodation state
  const [selectedAccommodation, setSelectedAccommodation] = useState<AccommodationType | null>(null);
  const [accommodationQuantity, setAccommodationQuantity] = useState<string>('1');
  const [editingAccommodationId, setEditingAccommodationId] = useState<string | null>(null);

  // Store System state
  const [selectedStoreSystem, setSelectedStoreSystem] = useState<StoreSystemType | null>(null);
  const [storeSystemQuantity, setStoreSystemQuantity] = useState<string>('1');
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
    setEditingLifeSupportId(null);
  };

  const handleAddLifeSupport = () => {
    if (!selectedLifeSupport) return;
    const quantity = parseInt(lifeSupportQuantity, 10) || 1;

    if (editingLifeSupportId) {
      onLifeSupportChange(
        installedLifeSupport.map((ls) =>
          ls.id === editingLifeSupportId
            ? { ...ls, type: selectedLifeSupport, quantity }
            : ls
        )
      );
    } else {
      // Check if same type already exists
      const existing = installedLifeSupport.find((ls) => ls.type.id === selectedLifeSupport.id);
      if (existing) {
        onLifeSupportChange(
          installedLifeSupport.map((ls) =>
            ls.id === existing.id
              ? { ...ls, quantity: ls.quantity + quantity }
              : ls
          )
        );
      } else {
        onLifeSupportChange([
          ...installedLifeSupport,
          { id: generateLifeSupportId(), type: selectedLifeSupport, quantity },
        ]);
      }
    }

    setSelectedLifeSupport(null);
    setLifeSupportQuantity('1');
    setEditingLifeSupportId(null);
  };

  const handleEditLifeSupport = (installed: InstalledLifeSupport) => {
    setSelectedLifeSupport(installed.type);
    setLifeSupportQuantity(installed.quantity.toString());
    setEditingLifeSupportId(installed.id);
  };

  const handleRemoveLifeSupport = (id: string) => {
    onLifeSupportChange(installedLifeSupport.filter((ls) => ls.id !== id));
  };

  // ============== Accommodation Handlers ==============

  const handleSelectAccommodation = (type: AccommodationType) => {
    setSelectedAccommodation(type);
    setAccommodationQuantity('1');
    setEditingAccommodationId(null);
  };

  const handleAddAccommodation = () => {
    if (!selectedAccommodation) return;
    const quantity = parseInt(accommodationQuantity, 10) || 1;

    if (editingAccommodationId) {
      onAccommodationsChange(
        installedAccommodations.map((acc) =>
          acc.id === editingAccommodationId
            ? { ...acc, type: selectedAccommodation, quantity }
            : acc
        )
      );
    } else {
      const existing = installedAccommodations.find((acc) => acc.type.id === selectedAccommodation.id);
      if (existing) {
        onAccommodationsChange(
          installedAccommodations.map((acc) =>
            acc.id === existing.id
              ? { ...acc, quantity: acc.quantity + quantity }
              : acc
          )
        );
      } else {
        onAccommodationsChange([
          ...installedAccommodations,
          { id: generateAccommodationId(), type: selectedAccommodation, quantity },
        ]);
      }
    }

    setSelectedAccommodation(null);
    setAccommodationQuantity('1');
    setEditingAccommodationId(null);
  };

  const handleEditAccommodation = (installed: InstalledAccommodation) => {
    setSelectedAccommodation(installed.type);
    setAccommodationQuantity(installed.quantity.toString());
    setEditingAccommodationId(installed.id);
  };

  const handleRemoveAccommodation = (id: string) => {
    onAccommodationsChange(installedAccommodations.filter((acc) => acc.id !== id));
  };

  // ============== Store System Handlers ==============

  const handleSelectStoreSystem = (type: StoreSystemType) => {
    setSelectedStoreSystem(type);
    setStoreSystemQuantity('1');
    setEditingStoreSystemId(null);
  };

  const handleAddStoreSystem = () => {
    if (!selectedStoreSystem) return;
    const quantity = parseInt(storeSystemQuantity, 10) || 1;

    if (editingStoreSystemId) {
      onStoreSystemsChange(
        installedStoreSystems.map((store) =>
          store.id === editingStoreSystemId
            ? { ...store, type: selectedStoreSystem, quantity }
            : store
        )
      );
    } else {
      const existing = installedStoreSystems.find((store) => store.type.id === selectedStoreSystem.id);
      if (existing) {
        onStoreSystemsChange(
          installedStoreSystems.map((store) =>
            store.id === existing.id
              ? { ...store, quantity: store.quantity + quantity }
              : store
          )
        );
      } else {
        onStoreSystemsChange([
          ...installedStoreSystems,
          { id: generateStoreSystemId(), type: selectedStoreSystem, quantity },
        ]);
      }
    }

    setSelectedStoreSystem(null);
    setStoreSystemQuantity('1');
    setEditingStoreSystemId(null);
  };

  const handleEditStoreSystem = (installed: InstalledStoreSystem) => {
    setSelectedStoreSystem(installed.type);
    setStoreSystemQuantity(installed.quantity.toString());
    setEditingStoreSystemId(installed.id);
  };

  const handleRemoveStoreSystem = (id: string) => {
    onStoreSystemsChange(installedStoreSystems.filter((store) => store.id !== id));
  };

  // ============== Render Helpers ==============

  const renderLifeSupportTab = () => (
    <Box>
      {/* Configure Form */}
      {selectedLifeSupport && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingLifeSupportId ? 'Edit' : 'Add'} {selectedLifeSupport.name}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                HP: {selectedLifeSupport.hullPoints * (parseInt(lifeSupportQuantity, 10) || 1)} |
                Power: {selectedLifeSupport.powerRequired * (parseInt(lifeSupportQuantity, 10) || 1)} |
                Cost: {formatCost(selectedLifeSupport.cost * (parseInt(lifeSupportQuantity, 10) || 1))} |
                Covers: {selectedLifeSupport.hullPointsCovered * (parseInt(lifeSupportQuantity, 10) || 1)} HP
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={editingLifeSupportId ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddLifeSupport}
                >
                  {editingLifeSupportId ? 'Save' : 'Add'}
                </Button>
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
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Installed Life Support */}
      {installedLifeSupport.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Life Support
          </Typography>
          {installedLifeSupport.map((installed) => (
            <Box
              key={installed.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {installed.quantity}x {installed.type.name}
              </Typography>
              <Chip
                label={`${installed.type.hullPoints * installed.quantity} HP`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${installed.type.powerRequired * installed.quantity} Power`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Covers ${installed.type.hullPointsCovered * installed.quantity} HP`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={formatCost(installed.type.cost * installed.quantity)}
                size="small"
                variant="outlined"
              />
              <IconButton size="small" color="primary" onClick={() => handleEditLifeSupport(installed)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleRemoveLifeSupport(installed.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
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
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Covers</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableLifeSupport.map((type) => (
              <TableRow
                key={type.id}
                hover
                sx={{ cursor: 'pointer' }}
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
                <TableCell align="right">{type.hullPointsCovered} HP</TableCell>
                <TableCell>
                  <Tooltip title={type.description}>
                    <Typography
                      variant="body2"
                      sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {type.description}
                    </Typography>
                  </Tooltip>
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
      {/* Configure Form */}
      {selectedAccommodation && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingAccommodationId ? 'Edit' : 'Add'} {selectedAccommodation.name}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                HP: {selectedAccommodation.hullPoints * (parseInt(accommodationQuantity, 10) || 1)} |
                Power: {selectedAccommodation.powerRequired * (parseInt(accommodationQuantity, 10) || 1)} |
                Cost: {formatCost(selectedAccommodation.cost * (parseInt(accommodationQuantity, 10) || 1))} |
                Capacity: {selectedAccommodation.capacity * (parseInt(accommodationQuantity, 10) || 1)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={editingAccommodationId ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddAccommodation}
                >
                  {editingAccommodationId ? 'Save' : 'Add'}
                </Button>
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
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Installed Accommodations */}
      {installedAccommodations.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Accommodations
          </Typography>
          {installedAccommodations.map((installed) => (
            <Box
              key={installed.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {installed.quantity}x {installed.type.name}
              </Typography>
              <Chip
                label={`${installed.type.hullPoints * installed.quantity} HP`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${installed.type.capacity * installed.quantity} ${installed.type.category}`}
                size="small"
                color={installed.type.category === 'crew' ? 'error' : installed.type.category === 'passenger' ? 'primary' : 'secondary'}
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
                label={formatCost(installed.type.cost * installed.quantity)}
                size="small"
                variant="outlined"
              />
              <IconButton size="small" color="primary" onClick={() => handleEditAccommodation(installed)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleRemoveAccommodation(installed.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
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
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Capacity</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Type</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Airlock</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableAccommodations.map((type) => (
              <TableRow
                key={type.id}
                hover
                sx={{ cursor: 'pointer' }}
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
                    color={type.category === 'crew' ? 'error' : type.category === 'passenger' ? 'primary' : 'secondary'}
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
                  <Tooltip title={type.description}>
                    <Typography
                      variant="body2"
                      sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {type.description}
                    </Typography>
                  </Tooltip>
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
      {/* Configure Form */}
      {selectedStoreSystem && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: '10px' }}>
            {editingStoreSystemId ? 'Edit' : 'Add'} {selectedStoreSystem.name}
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                HP: {selectedStoreSystem.hullPoints * (parseInt(storeSystemQuantity, 10) || 1)} |
                Power: {selectedStoreSystem.powerRequired * (parseInt(storeSystemQuantity, 10) || 1)} |
                Cost: {formatCost(selectedStoreSystem.cost * (parseInt(storeSystemQuantity, 10) || 1))}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={editingStoreSystemId ? <SaveIcon /> : <AddIcon />}
                  onClick={handleAddStoreSystem}
                >
                  {editingStoreSystemId ? 'Save' : 'Add'}
                </Button>
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
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Installed Store Systems */}
      {installedStoreSystems.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Installed Store Systems
          </Typography>
          {installedStoreSystems.map((installed) => (
            <Box
              key={installed.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ flex: 1 }}>
                {installed.quantity}x {installed.type.name}
              </Typography>
              <Chip
                label={`${installed.type.hullPoints * installed.quantity} HP`}
                size="small"
                variant="outlined"
              />
              {installed.type.effect === 'feeds' && (
                <Chip
                  label={`Feeds ${installed.type.effectValue * installed.quantity}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {installed.type.effect === 'reduces-consumption' && (
                <Chip
                  label={`Recycles for ${(installed.type.affectedPeople || 0) * installed.quantity}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              {installed.type.effect === 'adds-stores' && (
                <Chip
                  label={`+${(installed.type.effectValue * installed.quantity).toLocaleString()} days`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              <Chip
                label={formatCost(installed.type.cost * installed.quantity)}
                size="small"
                variant="outlined"
              />
              <IconButton size="small" color="primary" onClick={() => handleEditStoreSystem(installed)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => handleRemoveStoreSystem(installed.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
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
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Effect</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableStoreSystems.map((type) => (
              <TableRow
                key={type.id}
                hover
                sx={{ cursor: 'pointer' }}
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
                  <Tooltip title={type.description}>
                    <Typography
                      variant="body2"
                      sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {type.description}
                    </Typography>
                  </Tooltip>
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
                Artificial gravity requires Progress Level 7+ with Gravity (G) technology, or Progress Level 8+ with Energy Transformation (X) technology.
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
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Hull %</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP Used</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
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
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Hull %</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Est. HP</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Est. Cost</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
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
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Tooltip title={gt.description}>
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {gt.description}
                            </Typography>
                          </Tooltip>
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
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 6: Support Systems (Optional)
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
          <Chip
            label={`Life Support: ${stats.totalHullPointsCovered} HP covered`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Accommodations: ${stats.crewCapacity}`}
            color="primary"
            variant="outlined"
          />
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
            const activePersons = stats.crewCapacity + stats.passengerCapacity;
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
          {!stats.hasArtificialGravity && !stats.hasGravitySystemInstalled && (
            <Chip
              label="No Gravity"
              color="warning"
              variant="outlined"
            />
          )}
          {(stats.hasArtificialGravity || stats.hasGravitySystemInstalled) && (
            <Chip
              label="Artificial Gravity"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label={`Life Support (${installedLifeSupport.length})`} />
          <Tab label={`Accommodations (${installedAccommodations.length})`} />
          <Tab label={`Stores (${installedStoreSystems.length})`} />
          <Tab label="Gravity" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        {renderLifeSupportTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        {renderAccommodationsTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        {renderStoresTab()}
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        {renderGravityTab()}
      </TabPanel>
    </Box>
  );
}
