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
  Button,
  IconButton,
  Chip,
  Stack,
  Tabs,
  Tab,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  OrdnanceCategory,
  OrdnanceSize,
  OrdnanceDesign,
  MissileDesign,
  BombDesign,
  MineDesign,
  InstalledLaunchSystem,
} from '../types/ordnance';
import {
  getLaunchSystems,
  getPropulsionSystems,
  getWarheads,
  getGuidanceSystems,
  filterLaunchSystemsByConstraints,
  filterPropulsionByConstraints,
  filterWarheadsByConstraints,
  filterGuidanceByConstraints,
  calculateMissileDesign,
  calculateBombDesign,
  calculateMineDesign,
  calculateLaunchSystemStats,
  calculateOrdnanceStats,
  createInstalledLaunchSystem,
  getUsedCapacity,
  canLoadOrdnance,
  addOrdnanceToLoadout,
  removeOrdnanceFromLoadout,
  generateOrdnanceDesignId,
} from '../services/ordnanceService';
import { formatCost, formatAccuracyModifier } from '../services/formatters';
import { TruncatedDescription } from './shared';

interface OrdnanceSelectionProps {
  hull: Hull;  // Reserved for future use (hull-specific restrictions)
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onOrdnanceDesignsChange: (designs: OrdnanceDesign[]) => void;
  onLaunchSystemsChange: (systems: InstalledLaunchSystem[]) => void;
}

type OrdnanceTab = 'missiles' | 'bombs' | 'mines';

const TAB_TO_CATEGORY: Record<OrdnanceTab, OrdnanceCategory> = {
  missiles: 'missile',
  bombs: 'bomb',
  mines: 'mine',
};

export function OrdnanceSelection({
  hull: _hull,  // Reserved for future use
  ordnanceDesigns,
  launchSystems,
  designProgressLevel,
  designTechTracks,
  onOrdnanceDesignsChange,
  onLaunchSystemsChange,
}: OrdnanceSelectionProps) {
  const [activeTab, setActiveTab] = useState<OrdnanceTab>('missiles');
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<OrdnanceDesign | null>(null);
  const [loadingLaunchSystemId, setLoadingLaunchSystemId] = useState<string | null>(null);

  // Design form state
  const [designName, setDesignName] = useState('');
  const [designSize, setDesignSize] = useState<OrdnanceSize>('light');
  const [selectedPropulsion, setSelectedPropulsion] = useState<string>('');
  const [selectedGuidance, setSelectedGuidance] = useState<string>('');
  const [selectedWarhead, setSelectedWarhead] = useState<string>('');

  // Launch system form state
  const [addLaunchSystemDialogOpen, setAddLaunchSystemDialogOpen] = useState(false);
  const [selectedLaunchSystem, setSelectedLaunchSystem] = useState<string>('');
  const [launchSystemQuantity, setLaunchSystemQuantity] = useState(1);
  const [launchSystemExtraCapacity, setLaunchSystemExtraCapacity] = useState(0);

  const currentCategory = TAB_TO_CATEGORY[activeTab];

  // Get all data
  const allLaunchSystems = useMemo(() => getLaunchSystems(), []);
  const allPropulsion = useMemo(() => getPropulsionSystems(), []);
  const allWarheads = useMemo(() => getWarheads(), []);
  const allGuidance = useMemo(() => getGuidanceSystems(), []);

  // Filter designs by current tab category
  const currentDesigns = useMemo(() => {
    return ordnanceDesigns.filter(d => d.category === currentCategory);
  }, [ordnanceDesigns, currentCategory]);

  // Filter launch systems by current tab category
  const filteredLaunchSystems = useMemo(() => {
    const systems = filterLaunchSystemsByConstraints(
      allLaunchSystems,
      designProgressLevel,
      designTechTracks
    );
    return systems.filter(ls => ls.ordnanceTypes.includes(currentCategory));
  }, [allLaunchSystems, designProgressLevel, designTechTracks, currentCategory]);

  // Filter installed launch systems by current category
  const currentInstalledLaunchSystems = useMemo(() => {
    return launchSystems.filter(ls => {
      const lsType = allLaunchSystems.find(t => t.id === ls.launchSystemType);
      return lsType?.ordnanceTypes.includes(currentCategory);
    });
  }, [launchSystems, allLaunchSystems, currentCategory]);

  // Filter propulsion systems for current category
  const filteredPropulsion = useMemo(() => {
    return filterPropulsionByConstraints(
      allPropulsion,
      designProgressLevel,
      designTechTracks,
      currentCategory
    );
  }, [allPropulsion, designProgressLevel, designTechTracks, currentCategory]);

  // Get max warhead size from selected propulsion
  const maxWarheadSize = useMemo(() => {
    if (currentCategory === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      return propulsion?.maxWarheadSize ?? 4;
    }
    // For bombs/mines, size determines warhead
    return designSize === 'heavy' ? 4 : designSize === 'medium' ? 2 : 1;
  }, [selectedPropulsion, currentCategory, designSize, allPropulsion]);

  // Filter warheads by constraints and max size
  const filteredWarheads = useMemo(() => {
    return filterWarheadsByConstraints(
      allWarheads,
      designProgressLevel,
      designTechTracks,
      maxWarheadSize
    );
  }, [allWarheads, designProgressLevel, designTechTracks, maxWarheadSize]);

  // Filter guidance for current category
  const filteredGuidance = useMemo(() => {
    return filterGuidanceByConstraints(
      allGuidance,
      designProgressLevel,
      designTechTracks,
      currentCategory
    );
  }, [allGuidance, designProgressLevel, designTechTracks, currentCategory]);

  // Calculate stats
  const stats = useMemo(() => {
    return calculateOrdnanceStats(launchSystems, ordnanceDesigns);
  }, [launchSystems, ordnanceDesigns]);

  // Calculate design preview
  const designPreview = useMemo(() => {
    if (currentCategory === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && guidance && warhead) {
        return calculateMissileDesign(propulsion, guidance, warhead);
      }
    } else if (currentCategory === 'bomb') {
      const propulsion = allPropulsion.find(p => p.id === `bomb-${designSize}`);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && warhead) {
        return calculateBombDesign(propulsion, warhead);
      }
    } else if (currentCategory === 'mine') {
      const propulsion = allPropulsion.find(p => p.id === `mine-${designSize}`);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && guidance && warhead) {
        return calculateMineDesign(propulsion, guidance, warhead);
      }
    }
    return null;
  }, [currentCategory, selectedPropulsion, selectedGuidance, selectedWarhead, designSize, allPropulsion, allGuidance, allWarheads]);

  // Handlers
  const handleTabChange = (_: React.SyntheticEvent, newValue: OrdnanceTab) => {
    setActiveTab(newValue);
  };

  const openNewDesignDialog = () => {
    setEditingDesign(null);
    setDesignName('');
    setDesignSize('light');
    setSelectedPropulsion('');
    setSelectedGuidance('');
    setSelectedWarhead('');
    setDesignDialogOpen(true);
  };

  const openEditDesignDialog = (design: OrdnanceDesign) => {
    setEditingDesign(design);
    setDesignName(design.name);
    setDesignSize(design.size);
    if (design.category === 'missile') {
      const missile = design as MissileDesign;
      setSelectedPropulsion(missile.propulsionId);
      setSelectedGuidance(missile.guidanceId);
    } else if (design.category === 'mine') {
      const mine = design as MineDesign;
      setSelectedGuidance(mine.guidanceId);
    }
    setSelectedWarhead(design.warheadId);
    setDesignDialogOpen(true);
  };

  const handleSaveDesign = () => {
    const warhead = allWarheads.find(w => w.id === selectedWarhead);
    if (!warhead) return;

    let newDesign: OrdnanceDesign;

    if (currentCategory === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      if (!propulsion || !guidance) return;

      const stats = calculateMissileDesign(propulsion, guidance, warhead);
      const name = designName || `${propulsion.name} / ${guidance.name} / ${warhead.name}`;

      newDesign = {
        id: editingDesign?.id ?? generateOrdnanceDesignId(),
        name,
        category: 'missile',
        size: designSize,
        propulsionId: propulsion.id,
        guidanceId: guidance.id,
        warheadId: warhead.id,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MissileDesign;
    } else if (currentCategory === 'bomb') {
      const propulsion = allPropulsion.find(p => p.id === `bomb-${designSize}`);
      if (!propulsion) return;

      const stats = calculateBombDesign(propulsion, warhead);
      const name = designName || `${designSize} bomb / ${warhead.name}`;

      newDesign = {
        id: editingDesign?.id ?? generateOrdnanceDesignId(),
        name,
        category: 'bomb',
        size: designSize,
        warheadId: warhead.id,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as BombDesign;
    } else {
      const propulsion = allPropulsion.find(p => p.id === `mine-${designSize}`);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      if (!propulsion || !guidance) return;

      const stats = calculateMineDesign(propulsion, guidance, warhead);
      const name = designName || `${designSize} mine / ${guidance.name} / ${warhead.name}`;

      newDesign = {
        id: editingDesign?.id ?? generateOrdnanceDesignId(),
        name,
        category: 'mine',
        size: designSize,
        guidanceId: guidance.id,
        warheadId: warhead.id,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MineDesign;
    }

    if (editingDesign) {
      onOrdnanceDesignsChange(
        ordnanceDesigns.map(d => (d.id === editingDesign.id ? newDesign : d))
      );
    } else {
      onOrdnanceDesignsChange([...ordnanceDesigns, newDesign]);
    }

    setDesignDialogOpen(false);
  };

  const handleDeleteDesign = (designId: string) => {
    // Check if design is loaded in any launcher
    const isLoaded = launchSystems.some(ls =>
      ls.loadout.some(item => item.designId === designId)
    );
    if (isLoaded) {
      alert('Cannot delete design that is loaded in a launcher. Remove it from all launchers first.');
      return;
    }
    onOrdnanceDesignsChange(ordnanceDesigns.filter(d => d.id !== designId));
  };

  const handleAddLaunchSystem = () => {
    const lsType = allLaunchSystems.find(ls => ls.id === selectedLaunchSystem);
    if (!lsType) return;

    const newLS = createInstalledLaunchSystem(
      selectedLaunchSystem,
      launchSystemQuantity,
      launchSystemExtraCapacity
    );
    if (newLS) {
      onLaunchSystemsChange([...launchSystems, newLS]);
    }
    setAddLaunchSystemDialogOpen(false);
  };

  const handleRemoveLaunchSystem = (id: string) => {
    onLaunchSystemsChange(launchSystems.filter(ls => ls.id !== id));
  };

  const openLoadDialog = (launchSystemId: string) => {
    setLoadingLaunchSystemId(launchSystemId);
    setLoadDialogOpen(true);
  };

  const handleLoadOrdnance = (designId: string, quantity: number) => {
    if (!loadingLaunchSystemId) return;
    
    const design = ordnanceDesigns.find(d => d.id === designId);
    const ls = launchSystems.find(l => l.id === loadingLaunchSystemId);
    if (!design || !ls) return;

    if (!canLoadOrdnance(ls, design, quantity, ordnanceDesigns)) {
      alert('Not enough capacity to load this ordnance.');
      return;
    }

    const updatedLS = addOrdnanceToLoadout(ls, designId, quantity);
    onLaunchSystemsChange(
      launchSystems.map(l => (l.id === loadingLaunchSystemId ? updatedLS : l))
    );
  };

  const handleUnloadOrdnance = (launchSystemId: string, designId: string) => {
    const ls = launchSystems.find(l => l.id === launchSystemId);
    if (!ls) return;

    const updatedLS = removeOrdnanceFromLoadout(ls, designId);
    onLaunchSystemsChange(
      launchSystems.map(l => (l.id === launchSystemId ? updatedLS : l))
    );
  };

  // Get warhead info for display
  const getWarheadInfo = (warheadId: string) => {
    return allWarheads.find(w => w.id === warheadId);
  };

  // Get launch system type info
  const getLaunchSystemType = (typeId: string) => {
    return allLaunchSystems.find(ls => ls.id === typeId);
  };

  // Format loadout contents for display
  const formatLoadoutContents = (ls: InstalledLaunchSystem): string => {
    if (!ls.loadout || ls.loadout.length === 0) return 'Empty';
    return ls.loadout
      .map(item => {
        const design = ordnanceDesigns.find(d => d.id === item.designId);
        return design ? `${item.quantity}× ${design.name}` : '';
      })
      .filter(Boolean)
      .join(', ');
  };

  return (
    <Box>
      {/* Summary Chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip
          label={`Launchers HP: ${stats.totalLauncherHullPoints}`}
          variant="outlined"
          size="small"
        />
        <Chip
          label={`Power: ${stats.totalLauncherPower} PP`}
          variant="outlined"
          size="small"
        />
        <Chip
          label={`Launcher Cost: ${formatCost(stats.totalLauncherCost)}`}
          variant="outlined"
          size="small"
        />
        <Chip
          label={`Ordnance Cost: ${formatCost(stats.totalOrdnanceCost)}`}
          variant="outlined"
          size="small"
        />
        <Chip
          label={`Designs: ${stats.missileDesignCount}M / ${stats.bombDesignCount}B / ${stats.mineDesignCount}m`}
          variant="outlined"
          size="small"
          color="primary"
        />
      </Stack>

      {/* Category Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Missiles" value="missiles" />
          <Tab label="Bombs" value="bombs" />
          <Tab label="Mines" value="mines" />
        </Tabs>
      </Box>

      {/* Section 1: Ordnance Designs */}
      <Typography variant="h6" gutterBottom>
        {currentCategory === 'missile' ? 'Missile' : currentCategory === 'bomb' ? 'Bomb' : 'Mine'} Designs
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 3, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Actions</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Size</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Warhead</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acc</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Damage</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>FP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cap</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost/ea</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentDesigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No {currentCategory} designs created yet. Click "New Design" to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentDesigns.map(design => {
                const warhead = getWarheadInfo(design.warheadId);
                return (
                  <TableRow key={design.id}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openEditDesignDialog(design)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDesign(design.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>{design.name}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{design.size}</TableCell>
                    <TableCell>{warhead?.name ?? '?'}</TableCell>
                    <TableCell>{formatAccuracyModifier(design.totalAccuracy)}</TableCell>
                    <TableCell>{warhead?.damage ?? '?'}</TableCell>
                    <TableCell>{warhead?.firepower ?? '?'}</TableCell>
                    <TableCell>{design.capacityRequired}</TableCell>
                    <TableCell>{formatCost(design.totalCost)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={openNewDesignDialog}
        sx={{ mb: 3 }}
      >
        New {currentCategory === 'missile' ? 'Missile' : currentCategory === 'bomb' ? 'Bomb' : 'Mine'} Design
      </Button>

      <Divider sx={{ my: 2 }} />

      {/* Section 2: Launch Systems */}
      <Typography variant="h6" gutterBottom>
        Launch Systems
      </Typography>

      {/* Available Launch Systems */}
      <Typography variant="subtitle2" gutterBottom>
        Available Launch Systems
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Actions</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cap</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>ROF</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Reload</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLaunchSystems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No launch systems available for {currentCategory}s at this tech level.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredLaunchSystems
                .sort((a, b) => a.progressLevel - b.progressLevel)
                .map(ls => (
                  <TableRow key={ls.id}>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                          setSelectedLaunchSystem(ls.id);
                          setLaunchSystemQuantity(1);
                          setLaunchSystemExtraCapacity(0);
                          setAddLaunchSystemDialogOpen(true);
                        }}
                      >
                        Add
                      </Button>
                    </TableCell>
                    <TableCell>{ls.name}</TableCell>
                    <TableCell>{ls.progressLevel}</TableCell>
                    <TableCell>{ls.hullPoints}</TableCell>
                    <TableCell>{ls.powerRequired}</TableCell>
                    <TableCell>{ls.capacity}</TableCell>
                    <TableCell>{ls.rateOfFire}</TableCell>
                    <TableCell>{ls.spaceReload ? 'Yes' : 'No'}</TableCell>
                    <TableCell>{formatCost(ls.cost)}</TableCell>
                    <TableCell>
                      <TruncatedDescription text={ls.description} maxWidth={200} />
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Installed Launch Systems */}
      <Typography variant="subtitle2" gutterBottom>
        Installed Launch Systems
      </Typography>
      <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Actions</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Qty</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Capacity</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Contents</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentInstalledLaunchSystems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No launch systems installed for {currentCategory}s.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              currentInstalledLaunchSystems.map(ls => {
                const lsType = getLaunchSystemType(ls.launchSystemType);
                const usedCap = getUsedCapacity(ls.loadout, ordnanceDesigns);
                return (
                  <TableRow key={ls.id}>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Load ordnance">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openLoadDialog(ls.id)}
                          >
                            <LocalShippingIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveLaunchSystem(ls.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                    <TableCell>{lsType?.name ?? ls.launchSystemType}</TableCell>
                    <TableCell>{ls.quantity}</TableCell>
                    <TableCell>{ls.hullPoints}</TableCell>
                    <TableCell>
                      {usedCap}/{ls.totalCapacity}
                    </TableCell>
                    <TableCell>
                      <TruncatedDescription
                        text={formatLoadoutContents(ls)}
                        maxWidth={250}
                      />
                    </TableCell>
                    <TableCell>{formatCost(ls.cost)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Design Dialog */}
      <Dialog open={designDialogOpen} onClose={() => setDesignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingDesign ? 'Edit' : 'New'}{' '}
          {currentCategory === 'missile' ? 'Missile' : currentCategory === 'bomb' ? 'Bomb' : 'Mine'} Design
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Design Name (optional)"
              value={designName}
              onChange={e => setDesignName(e.target.value)}
              fullWidth
              placeholder="Auto-generated if left blank"
            />

            <FormControl fullWidth>
              <InputLabel>Size</InputLabel>
              <Select
                value={designSize}
                label="Size"
                onChange={e => setDesignSize(e.target.value as OrdnanceSize)}
              >
                <MenuItem value="light">Light (1 capacity)</MenuItem>
                <MenuItem value="medium">Medium (2 capacity)</MenuItem>
                <MenuItem value="heavy">Heavy (4 capacity)</MenuItem>
              </Select>
            </FormControl>

            {currentCategory === 'missile' && (
              <FormControl fullWidth>
                <InputLabel>Propulsion</InputLabel>
                <Select
                  value={selectedPropulsion}
                  label="Propulsion"
                  onChange={e => setSelectedPropulsion(e.target.value)}
                >
                  {filteredPropulsion.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} (PL{p.progressLevel}, Acc {formatAccuracyModifier(p.accuracyModifier)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {(currentCategory === 'missile' || currentCategory === 'mine') && (
              <FormControl fullWidth>
                <InputLabel>Guidance</InputLabel>
                <Select
                  value={selectedGuidance}
                  label="Guidance"
                  onChange={e => setSelectedGuidance(e.target.value)}
                >
                  {filteredGuidance.map(g => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.name} (PL{g.progressLevel}, Acc {formatAccuracyModifier(g.accuracyModifier)})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel>Warhead</InputLabel>
              <Select
                value={selectedWarhead}
                label="Warhead"
                onChange={e => setSelectedWarhead(e.target.value)}
              >
                {filteredWarheads.map(w => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name} (Size {w.size}, {w.firepower}, {w.damage})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {designPreview && (
              <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Typography variant="body2">
                    Accuracy: {formatAccuracyModifier(designPreview.totalAccuracy)}
                  </Typography>
                  <Typography variant="body2">
                    Cost: {formatCost(designPreview.totalCost)}
                  </Typography>
                  <Typography variant="body2">
                    Capacity: {designPreview.capacityRequired}
                  </Typography>
                </Stack>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveDesign}
            disabled={
              !selectedWarhead ||
              (currentCategory === 'missile' && (!selectedPropulsion || !selectedGuidance)) ||
              (currentCategory === 'mine' && !selectedGuidance)
            }
          >
            {editingDesign ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Launch System Dialog */}
      <Dialog
        open={addLaunchSystemDialogOpen}
        onClose={() => setAddLaunchSystemDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Launch System</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Launch System</InputLabel>
              <Select
                value={selectedLaunchSystem}
                label="Launch System"
                onChange={e => setSelectedLaunchSystem(e.target.value)}
              >
                {filteredLaunchSystems.map(ls => (
                  <MenuItem key={ls.id} value={ls.id}>
                    {ls.name} (HP: {ls.hullPoints}, Cap: {ls.capacity})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Quantity"
              type="number"
              value={launchSystemQuantity}
              onChange={e => setLaunchSystemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              fullWidth
            />

            {allLaunchSystems.find(ls => ls.id === selectedLaunchSystem)?.expandable && (
              <TextField
                label="Extra Capacity"
                type="number"
                value={launchSystemExtraCapacity}
                onChange={e =>
                  setLaunchSystemExtraCapacity(Math.max(0, parseInt(e.target.value) || 0))
                }
                inputProps={{ min: 0 }}
                fullWidth
                helperText="Additional capacity points (costs extra HP and money)"
              />
            )}

            {selectedLaunchSystem && (
              <Paper sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preview
                </Typography>
                {(() => {
                  const ls = allLaunchSystems.find(l => l.id === selectedLaunchSystem);
                  if (!ls) return null;
                  const stats = calculateLaunchSystemStats(
                    ls,
                    launchSystemQuantity,
                    launchSystemExtraCapacity
                  );
                  return (
                    <Stack direction="row" spacing={2}>
                      <Typography variant="body2">HP: {stats.hullPoints}</Typography>
                      <Typography variant="body2">Power: {stats.powerRequired}</Typography>
                      <Typography variant="body2">Capacity: {stats.totalCapacity}</Typography>
                      <Typography variant="body2">Cost: {formatCost(stats.cost)}</Typography>
                    </Stack>
                  );
                })()}
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddLaunchSystemDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddLaunchSystem}
            disabled={!selectedLaunchSystem}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Ordnance Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Load Ordnance
          {loadingLaunchSystemId && (() => {
            const ls = launchSystems.find(l => l.id === loadingLaunchSystemId);
            const lsType = ls ? getLaunchSystemType(ls.launchSystemType) : null;
            const usedCap = ls ? getUsedCapacity(ls.loadout, ordnanceDesigns) : 0;
            return ls ? (
              <Typography variant="subtitle2" color="text.secondary">
                {lsType?.name} × {ls.quantity} — Capacity: {usedCap}/{ls.totalCapacity}
              </Typography>
            ) : null;
          })()}
        </DialogTitle>
        <DialogContent>
          {loadingLaunchSystemId && (() => {
            const ls = launchSystems.find(l => l.id === loadingLaunchSystemId);
            if (!ls) return null;

            const lsType = getLaunchSystemType(ls.launchSystemType);
            const applicableDesigns = ordnanceDesigns.filter(d =>
              lsType?.ordnanceTypes.includes(d.category)
            );
            const usedCap = getUsedCapacity(ls.loadout, ordnanceDesigns);
            const remainingCap = ls.totalCapacity - usedCap;

            return (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Current loadout */}
                <Typography variant="subtitle2">Current Loadout</Typography>
                {ls.loadout.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Empty
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Remove</TableCell>
                          <TableCell>Design</TableCell>
                          <TableCell>Qty</TableCell>
                          <TableCell>Capacity</TableCell>
                          <TableCell>Cost</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ls.loadout.map(item => {
                          const design = ordnanceDesigns.find(d => d.id === item.designId);
                          return (
                            <TableRow key={item.designId}>
                              <TableCell>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleUnloadOrdnance(ls.id, item.designId)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                              <TableCell>{design?.name ?? 'Unknown'}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>
                                {design ? design.capacityRequired * item.quantity : '?'}
                              </TableCell>
                              <TableCell>
                                {design ? formatCost(design.totalCost * item.quantity) : '?'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                <Divider />

                {/* Available designs to load */}
                <Typography variant="subtitle2">
                  Add Ordnance (Remaining capacity: {remainingCap})
                </Typography>
                {applicableDesigns.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No designs available. Create a design first.
                  </Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Design</TableCell>
                          <TableCell>Size</TableCell>
                          <TableCell>Cap</TableCell>
                          <TableCell>Cost</TableCell>
                          <TableCell>Load</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {applicableDesigns.map(design => {
                          const canLoad = design.capacityRequired <= remainingCap;
                          const maxQty = Math.floor(remainingCap / design.capacityRequired);
                          return (
                            <TableRow key={design.id}>
                              <TableCell>{design.name}</TableCell>
                              <TableCell sx={{ textTransform: 'capitalize' }}>{design.size}</TableCell>
                              <TableCell>{design.capacityRequired}</TableCell>
                              <TableCell>{formatCost(design.totalCost)}</TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.5}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    disabled={!canLoad}
                                    onClick={() => handleLoadOrdnance(design.id, 1)}
                                  >
                                    +1
                                  </Button>
                                  {maxQty >= 5 && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleLoadOrdnance(design.id, 5)}
                                    >
                                      +5
                                    </Button>
                                  )}
                                  {maxQty >= 10 && (
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      onClick={() => handleLoadOrdnance(design.id, 10)}
                                    >
                                      +10
                                    </Button>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
