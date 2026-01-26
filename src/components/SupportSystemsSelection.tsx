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
  InstalledLifeSupport,
  InstalledAccommodation,
  InstalledStoreSystem,
} from '../types/supportSystem';
import {
  getAllLifeSupportTypes,
  getAllAccommodationTypes,
  getAllStoreSystemTypes,
  filterByDesignConstraints,
  calculateSupportSystemsStats,
  generateLifeSupportId,
  generateAccommodationId,
  generateStoreSystemId,
  formatSupportSystemCost,
} from '../services/supportSystemService';
import { formatCost, getTechTrackName } from '../services/formatters';

interface SupportSystemsSelectionProps {
  hull: Hull;
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  usedHullPoints: number;
  availablePower: number;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onLifeSupportChange: (lifeSupport: InstalledLifeSupport[]) => void;
  onAccommodationsChange: (accommodations: InstalledAccommodation[]) => void;
  onStoreSystemsChange: (storeSystems: InstalledStoreSystem[]) => void;
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
  hull: _hull,
  installedLifeSupport,
  installedAccommodations,
  installedStoreSystems,
  usedHullPoints: _usedHullPoints,
  availablePower: _availablePower,
  designProgressLevel,
  designTechTracks,
  onLifeSupportChange,
  onAccommodationsChange,
  onStoreSystemsChange,
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

  // Calculate stats
  const stats = useMemo(
    () => calculateSupportSystemsStats(
      installedLifeSupport,
      installedAccommodations,
      installedStoreSystems,
      designProgressLevel,
      designTechTracks
    ),
    [installedLifeSupport, installedAccommodations, installedStoreSystems, designProgressLevel, designTechTracks]
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
                Cost: {formatSupportSystemCost(selectedLifeSupport.cost * (parseInt(lifeSupportQuantity, 10) || 1))} |
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
                label={formatSupportSystemCost(installed.type.cost * installed.quantity)}
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
                Cost: {formatSupportSystemCost(selectedAccommodation.cost * (parseInt(accommodationQuantity, 10) || 1))} |
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
                color="primary"
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
                label={formatSupportSystemCost(installed.type.cost * installed.quantity)}
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
                  <Chip label={type.category} size="small" variant="outlined" />
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
                Cost: {formatSupportSystemCost(selectedStoreSystem.cost * (parseInt(storeSystemQuantity, 10) || 1))}
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
                label={formatSupportSystemCost(installed.type.cost * installed.quantity)}
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

  const renderGravityTab = () => (
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
        ) : (
          <Box>
            <Chip label="No Artificial Gravity" color="warning" sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Artificial gravity requires Progress Level 7+ with Gravity (G) technology, or Progress Level 8+ with Energy Transformation (X) technology.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Without artificial gravity, the ship can simulate gravity through constant acceleration (thrust gravity).
              Maintaining 1G acceleration provides gravity equivalent to standing on Earth's surface.
              Acceleration couches in life support systems protect crew from acceleration effects.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );

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
            label={`Cost: ${formatSupportSystemCost(stats.totalCost)}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Life Support: ${stats.totalHullPointsCovered} HP covered`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Crew: ${stats.crewCapacity}`}
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
          {stats.freeAirlocks > 0 && (
            <Chip
              label={`Airlocks: ${stats.freeAirlocks}`}
              color="success"
              variant="outlined"
            />
          )}
          {stats.hasArtificialGravity && (
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
