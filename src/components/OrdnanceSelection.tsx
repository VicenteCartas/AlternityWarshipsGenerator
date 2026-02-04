import React, { useState, useMemo, useRef } from 'react';
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
  TextField,
  Tooltip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BlurCircularIcon from '@mui/icons-material/BlurCircular';
import { headerCellSx } from '../constants/tableStyles';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  OrdnanceCategory,
  OrdnanceDesign,
  MissileDesign,
  MineDesign,
  InstalledLaunchSystem,
  LaunchSystem,
} from '../types/ordnance';
import {
  getLaunchSystems,
  getWarheads,
  getPropulsionSystems,
  getGuidanceSystems,
  filterLaunchSystemsByConstraints,
  calculateLaunchSystemStats,
  createInstalledLaunchSystem,
  getUsedCapacity,
  canLoadOrdnance,
  addOrdnanceToLoadout,
  removeOrdnanceFromLoadout,
} from '../services/ordnanceService';
import { formatCost, formatAccuracyModifier, getAreaEffectTooltip, formatAcceleration } from '../services/formatters';
import { TruncatedDescription, TechTrackCell } from './shared';
import { LaunchSystemEditForm } from './LaunchSystemEditForm';
import { OrdnanceDesignDialog } from './OrdnanceDesignDialog';

// Exported component for rendering installed launch systems (used by WeaponSelection)
interface InstalledLaunchSystemsProps {
  launchSystems: InstalledLaunchSystem[];
  ordnanceDesigns: OrdnanceDesign[];
  onEdit: (ls: InstalledLaunchSystem) => void;
  onRemove: (id: string) => void;
  editingId: string | null;
  /** Additional props for inline editing */
  onLaunchSystemsChange?: (systems: InstalledLaunchSystem[]) => void;
  onOrdnanceDesignsChange?: (designs: OrdnanceDesign[]) => void;
  onEditComplete?: () => void;
  designProgressLevel?: ProgressLevel;
  designTechTracks?: TechTrack[];
}

export function InstalledLaunchSystems({
  launchSystems,
  ordnanceDesigns,
  onEdit,
  onRemove,
  editingId,
  onLaunchSystemsChange,
  onOrdnanceDesignsChange,
  onEditComplete,
  designProgressLevel = 6,
  designTechTracks = [],
}: InstalledLaunchSystemsProps) {
  const allLaunchSystems = useMemo(() => getLaunchSystems(), []);

  const getLaunchSystemType = (typeId: string) => allLaunchSystems.find(ls => ls.id === typeId);

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

  // Check if we can do inline editing (all required props provided)
  const canInlineEdit = onLaunchSystemsChange && onOrdnanceDesignsChange && onEditComplete;

  if (launchSystems.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Installed Launch Systems
      </Typography>
      <Stack spacing={1}>
        {launchSystems.map((ls) => {
          const lsType = getLaunchSystemType(ls.launchSystemType);
          const usedCap = getUsedCapacity(ls.loadout, ordnanceDesigns);
          const isEditing = editingId === ls.id;
          return (
            <React.Fragment key={ls.id}>
              <Box
                id={`launch-system-${ls.id}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: isEditing ? 'action.selected' : 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {`${ls.quantity}× `}
                  {lsType?.name ?? ls.launchSystemType}
                  {' — '}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {formatLoadoutContents(ls)}
                  </Typography>
                </Typography>
                <Chip label={`${ls.hullPoints} HP`} size="small" variant="outlined" />
                <Chip label={`${ls.powerRequired} Power`} size="small" variant="outlined" />
                <Chip label={`${usedCap}/${ls.totalCapacity} Cap`} size="small" variant="outlined" color={usedCap >= ls.totalCapacity ? 'success' : 'warning'} />
                <Chip label={formatCost(ls.cost)} size="small" variant="outlined" />
                <IconButton size="small" onClick={() => onEdit(ls)} color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => onRemove(ls.id)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              {/* Render inline edit form when this launch system is being edited */}
              {isEditing && canInlineEdit && (
                <LaunchSystemEditForm
                  launchSystem={ls}
                  allLaunchSystems={launchSystems}
                  ordnanceDesigns={ordnanceDesigns}
                  designProgressLevel={designProgressLevel}
                  designTechTracks={designTechTracks}
                  onSave={(updatedSystems) => {
                    onLaunchSystemsChange(updatedSystems);
                    onEditComplete();
                  }}
                  onCancel={onEditComplete}
                  onOrdnanceDesignsChange={onOrdnanceDesignsChange}
                />
              )}
            </React.Fragment>
          );
        })}
      </Stack>
    </Paper>
  );
}

interface OrdnanceSelectionProps {
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onOrdnanceDesignsChange: (designs: OrdnanceDesign[]) => void;
  onLaunchSystemsChange: (systems: InstalledLaunchSystem[]) => void;
  /** Called when edit is complete or cancelled */
  onEditComplete?: () => void;
}

export function OrdnanceSelection({
  ordnanceDesigns,
  launchSystems,
  designProgressLevel,
  designTechTracks,
  onOrdnanceDesignsChange,
  onLaunchSystemsChange,
  onEditComplete,
}: OrdnanceSelectionProps) {
  // Configuration panel state
  const [selectedLaunchSystem, setSelectedLaunchSystem] = useState<LaunchSystem | null>(null);
  const [editingLaunchSystemId, setEditingLaunchSystemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [extraHp, setExtraHp] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  // Design dialog state
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [designCategory, setDesignCategory] = useState<OrdnanceCategory>('missile');
  const [editingDesign, setEditingDesign] = useState<OrdnanceDesign | null>(null);

  // Get all data
  const allLaunchSystems = useMemo(() => getLaunchSystems(), []);
  const allWarheads = useMemo(() => getWarheads(), []);
  const allPropulsion = useMemo(() => getPropulsionSystems(), []);
  const allGuidance = useMemo(() => getGuidanceSystems(), []);

  // Filter launch systems by design constraints
  const filteredLaunchSystems = useMemo(() => {
    return filterLaunchSystemsByConstraints(
      allLaunchSystems,
      designProgressLevel,
      designTechTracks
    ).sort((a, b) => a.progressLevel - b.progressLevel);
  }, [allLaunchSystems, designProgressLevel, designTechTracks]);

  // Get ordnance types supported by installed launchers
  const supportedOrdnanceTypes = useMemo(() => {
    const types = new Set<OrdnanceCategory>();
    launchSystems.forEach(ls => {
      const lsType = allLaunchSystems.find(t => t.id === ls.launchSystemType);
      lsType?.ordnanceTypes.forEach(t => types.add(t));
    });
    return types;
  }, [launchSystems, allLaunchSystems]);

  // Get applicable ordnance designs for the selected launch system
  const applicableDesigns = useMemo(() => {
    if (!selectedLaunchSystem) return [];
    return ordnanceDesigns.filter(d =>
      selectedLaunchSystem.ordnanceTypes.includes(d.category)
    );
  }, [selectedLaunchSystem, ordnanceDesigns]);

  // Calculate preview for launch system
  const previewStats = useMemo(() => {
    if (!selectedLaunchSystem) return null;
    return calculateLaunchSystemStats(selectedLaunchSystem, quantity, extraHp);
  }, [selectedLaunchSystem, quantity, extraHp]);

  // Handlers
  const handleSelectLaunchSystem = (ls: LaunchSystem) => {
    setSelectedLaunchSystem(ls);
    setQuantity(1);
    setExtraHp(0);
    setEditingLaunchSystemId(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleCancelEdit = () => {
    setSelectedLaunchSystem(null);
    setQuantity(1);
    setExtraHp(0);
    setEditingLaunchSystemId(null);
    onEditComplete?.();
  };

  const handleAddOrUpdateLaunchSystem = () => {
    if (!selectedLaunchSystem) return;

    if (editingLaunchSystemId) {
      // Update existing launch system
      const existingLS = launchSystems.find(ls => ls.id === editingLaunchSystemId);
      if (!existingLS) return;

      const stats = calculateLaunchSystemStats(selectedLaunchSystem, quantity, extraHp);
      const updatedLS: InstalledLaunchSystem = {
        ...existingLS,
        quantity,
        extraHp,
        hullPoints: stats.hullPoints,
        powerRequired: stats.powerRequired,
        totalCapacity: stats.totalCapacity,
        cost: stats.cost,
      };
      onLaunchSystemsChange(
        launchSystems.map(ls => ls.id === editingLaunchSystemId ? updatedLS : ls)
      );
    } else {
      // Add new launch system
      const newLS = createInstalledLaunchSystem(
        selectedLaunchSystem.id,
        quantity,
        extraHp
      );
      if (newLS) {
        onLaunchSystemsChange([...launchSystems, newLS]);
      }
    }

    handleCancelEdit();
  };

  // Ordnance loading handlers
  const handleLoadOrdnance = (designId: string, qty: number) => {
    if (!editingLaunchSystemId) return;

    const design = ordnanceDesigns.find(d => d.id === designId);
    const ls = launchSystems.find(l => l.id === editingLaunchSystemId);
    if (!design || !ls) return;

    if (!canLoadOrdnance(ls, design, qty, ordnanceDesigns)) {
      alert('Not enough capacity to load this ordnance.');
      return;
    }

    const updatedLS = addOrdnanceToLoadout(ls, designId, qty);
    onLaunchSystemsChange(
      launchSystems.map(l => (l.id === editingLaunchSystemId ? updatedLS : l))
    );
  };

  const handleUnloadOrdnance = (designId: string) => {
    if (!editingLaunchSystemId) return;

    const ls = launchSystems.find(l => l.id === editingLaunchSystemId);
    if (!ls) return;

    const updatedLS = removeOrdnanceFromLoadout(ls, designId);
    onLaunchSystemsChange(
      launchSystems.map(l => (l.id === editingLaunchSystemId ? updatedLS : l))
    );
  };

  // Design dialog handlers
  const openNewDesignDialog = (category: OrdnanceCategory) => {
    setDesignCategory(category);
    setEditingDesign(null);
    setDesignDialogOpen(true);
  };

  const openEditDesignDialog = (design: OrdnanceDesign) => {
    setDesignCategory(design.category);
    setEditingDesign(design);
    setDesignDialogOpen(true);
  };

  const handleSaveDesign = (newDesign: OrdnanceDesign) => {
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
    const isLoaded = launchSystems.some(ls =>
      ls.loadout.some(item => item.designId === designId)
    );
    if (isLoaded) {
      alert('Cannot delete design that is loaded in a launcher. Remove it from all launchers first.');
      return;
    }
    onOrdnanceDesignsChange(ordnanceDesigns.filter(d => d.id !== designId));
  };

  // Helper functions
  const getWarheadInfo = (warheadId: string) => allWarheads.find(w => w.id === warheadId);
  const getPropulsionInfo = (propulsionId: string) => allPropulsion.find(p => p.id === propulsionId);
  const getGuidanceInfo = (guidanceId: string) => allGuidance.find(g => g.id === guidanceId);

  const getDesignTechTracks = (design: OrdnanceDesign): TechTrack[] => {
    const techTracks = new Set<TechTrack>();
    const warhead = getWarheadInfo(design.warheadId);
    warhead?.techTracks.forEach(t => techTracks.add(t));
    if (design.category === 'missile') {
      const propulsion = getPropulsionInfo((design as MissileDesign).propulsionId);
      propulsion?.techTracks.forEach(t => techTracks.add(t));
      const guidance = getGuidanceInfo((design as MissileDesign).guidanceId);
      guidance?.techTracks.forEach(t => techTracks.add(t));
    } else if (design.category === 'mine') {
      const guidance = getGuidanceInfo((design as MineDesign).guidanceId);
      guidance?.techTracks.forEach(t => techTracks.add(t));
    }
    return Array.from(techTracks).sort();
  };

  // Render configuration panel
  const renderConfigureForm = () => {
    if (!selectedLaunchSystem) return null;

    const isEditing = !!editingLaunchSystemId;
    const currentLS = isEditing ? launchSystems.find(ls => ls.id === editingLaunchSystemId) : null;
    const usedCap = currentLS ? getUsedCapacity(currentLS.loadout, ordnanceDesigns) : 0;
    const totalCap = previewStats?.totalCapacity ?? 0;
    const remainingCap = totalCap - usedCap;

    return (
      <Box ref={formRef} sx={{ pt: 1, mb: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          {/* Column 1: Quantity + Name + Stats */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
            <TextField
              type="number"
              size="small"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              inputProps={{ min: 1, max: 99, style: { textAlign: 'center', width: 40 } }}
              sx={{ width: 70 }}
              label="Quantity"
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {selectedLaunchSystem.name}
            </Typography>
            {selectedLaunchSystem.expandable && (
              <TextField
                type="number"
                size="small"
                value={extraHp}
                onChange={(e) => setExtraHp(Math.max(0, parseInt(e.target.value, 10) || 0))}
                inputProps={{ min: 0, style: { textAlign: 'center', width: 40 } }}
                sx={{ width: 100 }}
                label="Extra HP"
              />
            )}
            {previewStats && (
              <Typography variant="caption" color="text.secondary">
                {previewStats.hullPoints} HP | {previewStats.powerRequired} Power | {previewStats.totalCapacity} Cap | ROF {selectedLaunchSystem.rateOfFire} | {formatCost(previewStats.cost)}
              </Typography>
            )}
          </Box>

          {/* Column 2: Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
              onClick={handleAddOrUpdateLaunchSystem}
            >
              {isEditing ? 'Update' : 'Add'}
            </Button>
          </Box>
        </Box>

        {/* Ordnance Loading Section - Only when editing */}
        {isEditing && currentLS && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Ordnance Loadout (Capacity: {usedCap}/{totalCap})
            </Typography>

            {/* Current loadout */}
            {currentLS.loadout.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Design</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Capacity</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {currentLS.loadout.map(item => {
                      const design = ordnanceDesigns.find(d => d.id === item.designId);
                      return (
                        <TableRow key={item.designId}>
                          <TableCell>{design?.name ?? 'Unknown'}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{design ? design.capacityRequired * item.quantity : '?'}</TableCell>
                          <TableCell>{design ? formatCost(design.totalCost * item.quantity) : '?'}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleUnloadOrdnance(item.designId)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Available designs to load */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Available Designs (Remaining capacity: {remainingCap})
            </Typography>
            {applicableDesigns.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                No designs available. Create a design first.
              </Typography>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 250 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Design</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cap</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {applicableDesigns.map(design => {
                      const canLoad = design.capacityRequired <= remainingCap;
                      const maxQty = Math.floor(remainingCap / design.capacityRequired);
                      const isLoaded = currentLS.loadout.some(item => item.designId === design.id);
                      return (
                        <TableRow key={design.id}>
                          <TableCell>{design.name}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{design.category}</TableCell>
                          <TableCell sx={{ textTransform: 'capitalize' }}>{design.size}</TableCell>
                          <TableCell>{design.capacityRequired}</TableCell>
                          <TableCell>{formatCost(design.totalCost)}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Button size="small" variant="outlined" disabled={!canLoad} onClick={() => handleLoadOrdnance(design.id, 1)}>+1</Button>
                              {maxQty >= 5 && <Button size="small" variant="outlined" onClick={() => handleLoadOrdnance(design.id, 5)}>+5</Button>}
                              {maxQty >= 10 && <Button size="small" variant="outlined" onClick={() => handleLoadOrdnance(design.id, 10)}>+10</Button>}
                              <Button size="small" variant="outlined" color="primary" disabled={!canLoad || maxQty === 0} onClick={() => handleLoadOrdnance(design.id, maxQty)}>Max</Button>
                              {isLoaded && <Button size="small" variant="outlined" color="error" onClick={() => handleUnloadOrdnance(design.id)}>Clear</Button>}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Create new design buttons */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {selectedLaunchSystem.ordnanceTypes.includes('missile') && (
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('missile')}>
                  New Missile Design
                </Button>
              )}
              {selectedLaunchSystem.ordnanceTypes.includes('bomb') && (
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('bomb')}>
                  New Bomb Design
                </Button>
              )}
              {selectedLaunchSystem.ordnanceTypes.includes('mine') && (
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('mine')}>
                  New Mine Design
                </Button>
              )}
            </Stack>
          </>
        )}
      </Box>
    );
  };

  // Render launch systems grid
  const renderLaunchSystemsGrid = () => {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1200 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={headerCellSx}>PL</TableCell>
              <TableCell sx={headerCellSx}>Tech</TableCell>
              <TableCell sx={headerCellSx}>HP</TableCell>
              <TableCell sx={headerCellSx}>Power</TableCell>
              <TableCell sx={headerCellSx}>Cap</TableCell>
              <TableCell sx={headerCellSx}>ROF</TableCell>
              <TableCell sx={headerCellSx}>Reload</TableCell>
              <TableCell sx={headerCellSx}>Cost</TableCell>
              <TableCell sx={headerCellSx}>Types</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLaunchSystems.map((ls) => (
              <TableRow
                key={ls.id}
                hover
                selected={selectedLaunchSystem?.id === ls.id}
                onClick={() => handleSelectLaunchSystem(ls)}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': { backgroundColor: 'action.selected' },
                  '&.Mui-selected:hover': { backgroundColor: 'action.selected' },
                }}
              >
                <TableCell sx={{ minWidth: 180 }}>{ls.name}</TableCell>
                <TableCell>{ls.progressLevel}</TableCell>
                <TechTrackCell techTracks={ls.techTracks} />
                <TableCell>{ls.hullPoints}</TableCell>
                <TableCell>{ls.powerRequired}</TableCell>
                <TableCell>{ls.capacity}{ls.expandable && '+'}</TableCell>
                <TableCell>{ls.rateOfFire}</TableCell>
                <TableCell>{ls.spaceReload ? 'Yes' : 'No'}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(ls.cost)}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{ls.ordnanceTypes.join(', ')}</TableCell>
                <TableCell sx={{ maxWidth: 250 }}>
                  <TruncatedDescription text={ls.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render ordnance designs section
  const renderOrdnanceDesigns = () => {
    if (ordnanceDesigns.length === 0) return null;

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 2, '& .MuiTable-root': { minWidth: 900 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Name</TableCell>
              <TableCell sx={headerCellSx}>Type</TableCell>
              <TableCell sx={headerCellSx}>Size</TableCell>
              <TableCell sx={headerCellSx}>Tech</TableCell>
              <TableCell sx={headerCellSx}>Warhead</TableCell>
              <TableCell sx={headerCellSx}>End</TableCell>
              <TableCell sx={headerCellSx}>Acel</TableCell>
              <TableCell sx={headerCellSx}>Acc</TableCell>
              <TableCell sx={headerCellSx}>Type/FP</TableCell>
              <TableCell sx={headerCellSx}>Damage</TableCell>
              <TableCell sx={headerCellSx}>Area</TableCell>
              <TableCell sx={headerCellSx}>Cost</TableCell>
              <TableCell sx={headerCellSx}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordnanceDesigns.map(design => {
              const warhead = getWarheadInfo(design.warheadId);
              const techTracks = getDesignTechTracks(design);
              const propulsion = design.category === 'missile' ? getPropulsionInfo((design as MissileDesign).propulsionId) : null;
              return (
                <TableRow key={design.id} hover>
                  <TableCell>{design.name}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{design.category}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{design.size} ({design.capacityRequired})</TableCell>
                  <TechTrackCell techTracks={techTracks} />
                  <TableCell>{warhead?.name ?? '?'}</TableCell>
                  <TableCell>{propulsion?.endurance ?? '-'}</TableCell>
                  <TableCell>{propulsion?.acceleration != null ? formatAcceleration(propulsion.acceleration, propulsion.isPL6Scale ?? false) : '-'}</TableCell>
                  <TableCell>{formatAccuracyModifier(design.totalAccuracy)}</TableCell>
                  <TableCell>{warhead ? `${warhead.damageType}/${warhead.firepower}` : '?'}</TableCell>
                  <TableCell>{warhead?.damage ?? '?'}</TableCell>
                  <TableCell>
                    {warhead?.area ? (
                      <Tooltip title={getAreaEffectTooltip(warhead.area)}>
                        <BlurCircularIcon fontSize="small" color="primary" />
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(design.totalCost)}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEditDesignDialog(design)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteDesign(design.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render ordnance design buttons section
  const renderDesignButtons = () => {
    // Show buttons for ordnance types supported by installed launchers
    const hasMissile = supportedOrdnanceTypes.has('missile');
    const hasBomb = supportedOrdnanceTypes.has('bomb');
    const hasMine = supportedOrdnanceTypes.has('mine');

    // Don't show if no launchers installed
    if (!hasMissile && !hasBomb && !hasMine) return null;

    return (
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {hasMissile && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('missile')}>
            New Missile Design
          </Button>
        )}
        {hasBomb && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('bomb')}>
            New Bomb Design
          </Button>
        )}
        {hasMine && (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('mine')}>
            New Mine Design
          </Button>
        )}
      </Stack>
    );
  };

  return (
    <Box>
      {/* Configuration Panel */}
      {renderConfigureForm()}

      {renderLaunchSystemsGrid()}

      {/* Ordnance Designs Section */}
      {supportedOrdnanceTypes.size > 0 && (
        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          Ordnance Designs
        </Typography>
      )}

      {renderOrdnanceDesigns()}

      {/* Design Buttons */}
      {renderDesignButtons()}

      {/* Ordnance Design Dialog */}
      <OrdnanceDesignDialog
        open={designDialogOpen}
        category={designCategory}
        editingDesign={editingDesign}
        designProgressLevel={designProgressLevel}
        designTechTracks={designTechTracks}
        onSave={handleSaveDesign}
        onCancel={() => setDesignDialogOpen(false)}
      />
    </Box>
  );
}
