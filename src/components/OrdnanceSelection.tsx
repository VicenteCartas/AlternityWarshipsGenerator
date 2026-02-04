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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { headerCellSx } from '../constants/tableStyles';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  OrdnanceCategory,
  OrdnanceSize,
  OrdnanceDesign,
  MissileDesign,
  BombDesign,
  MineDesign,
  InstalledLaunchSystem,
  LaunchSystem,
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
  createInstalledLaunchSystem,
  getUsedCapacity,
  canLoadOrdnance,
  addOrdnanceToLoadout,
  removeOrdnanceFromLoadout,
  generateOrdnanceDesignId,
} from '../services/ordnanceService';
import { formatCost, formatAccuracyModifier } from '../services/formatters';
import { TruncatedDescription, TechTrackCell } from './shared';
import { LaunchSystemEditForm } from './LaunchSystemEditForm';

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
                  bgcolor: isEditing ? 'primary.light' : 'action.hover',
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
                <Chip label={`${usedCap}/${ls.totalCapacity} Cap`} size="small" variant="outlined" color={usedCap > 0 ? 'primary' : 'default'} />
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

  // Design form state
  const [designName, setDesignName] = useState('');
  const [selectedPropulsion, setSelectedPropulsion] = useState<string>('');
  const [selectedGuidance, setSelectedGuidance] = useState<string>('');
  const [selectedWarhead, setSelectedWarhead] = useState<string>('');

  // Stepper states
  const [missileDesignStep, setMissileDesignStep] = useState(0);
  const [bombDesignStep, setBombDesignStep] = useState(0);
  const [mineDesignStep, setMineDesignStep] = useState(0);

  // Get all data
  const allLaunchSystems = useMemo(() => getLaunchSystems(), []);
  const allPropulsion = useMemo(() => getPropulsionSystems(), []);
  const allWarheads = useMemo(() => getWarheads(), []);
  const allGuidance = useMemo(() => getGuidanceSystems(), []);

  // Filter launch systems by design constraints
  const filteredLaunchSystems = useMemo(() => {
    return filterLaunchSystemsByConstraints(
      allLaunchSystems,
      designProgressLevel,
      designTechTracks
    ).sort((a, b) => a.progressLevel - b.progressLevel);
  }, [allLaunchSystems, designProgressLevel, designTechTracks]);

  // Get applicable ordnance designs for the selected launch system
  const applicableDesigns = useMemo(() => {
    if (!selectedLaunchSystem) return [];
    return ordnanceDesigns.filter(d =>
      selectedLaunchSystem.ordnanceTypes.includes(d.category)
    );
  }, [selectedLaunchSystem, ordnanceDesigns]);

  // Filter propulsion systems for current design category
  const filteredPropulsion = useMemo(() => {
    return filterPropulsionByConstraints(
      allPropulsion,
      designProgressLevel,
      designTechTracks,
      designCategory
    );
  }, [allPropulsion, designProgressLevel, designTechTracks, designCategory]);

  // Get max warhead size from selected propulsion
  const maxWarheadSize = useMemo(() => {
    const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
    return propulsion?.maxWarheadSize ?? 4;
  }, [selectedPropulsion, allPropulsion]);

  // Filter warheads by constraints and max size
  const filteredWarheads = useMemo(() => {
    return filterWarheadsByConstraints(
      allWarheads,
      designProgressLevel,
      designTechTracks,
      maxWarheadSize
    );
  }, [allWarheads, designProgressLevel, designTechTracks, maxWarheadSize]);

  // Filter guidance for current design category
  const filteredGuidance = useMemo(() => {
    return filterGuidanceByConstraints(
      allGuidance,
      designProgressLevel,
      designTechTracks,
      designCategory
    );
  }, [allGuidance, designProgressLevel, designTechTracks, designCategory]);

  // Calculate design preview
  const designPreview = useMemo(() => {
    if (designCategory === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && guidance && warhead) {
        return calculateMissileDesign(propulsion, guidance, warhead);
      }
    } else if (designCategory === 'bomb') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && warhead) {
        return calculateBombDesign(propulsion, warhead);
      }
    } else if (designCategory === 'mine') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && guidance && warhead) {
        return calculateMineDesign(propulsion, guidance, warhead);
      }
    }
    return null;
  }, [designCategory, selectedPropulsion, selectedGuidance, selectedWarhead, allPropulsion, allGuidance, allWarheads]);

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
    setDesignName('');
    setSelectedPropulsion('');
    setSelectedGuidance('');
    setSelectedWarhead('');
    setMissileDesignStep(0);
    setBombDesignStep(0);
    setMineDesignStep(0);
    setDesignDialogOpen(true);
  };

  const openEditDesignDialog = (design: OrdnanceDesign) => {
    setDesignCategory(design.category);
    setEditingDesign(design);
    setDesignName(design.name);
    if (design.category === 'missile') {
      const missile = design as MissileDesign;
      setSelectedPropulsion(missile.propulsionId);
      setSelectedGuidance(missile.guidanceId);
    } else if (design.category === 'bomb') {
      setSelectedPropulsion(`bomb-${design.size}`);
    } else if (design.category === 'mine') {
      const mine = design as MineDesign;
      setSelectedPropulsion(`mine-${design.size}`);
      setSelectedGuidance(mine.guidanceId);
    }
    setSelectedWarhead(design.warheadId);
    setMissileDesignStep(0);
    setBombDesignStep(0);
    setMineDesignStep(0);
    setDesignDialogOpen(true);
  };

  const handleSaveDesign = () => {
    const warhead = allWarheads.find(w => w.id === selectedWarhead);
    if (!warhead) return;

    let newDesign: OrdnanceDesign;

    if (designCategory === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      if (!propulsion || !guidance) return;
      if (!designName.trim()) return;

      const stats = calculateMissileDesign(propulsion, guidance, warhead);
      const sizeFromPropulsion: OrdnanceSize = propulsion.size >= 4 ? 'heavy' : propulsion.size >= 2 ? 'medium' : 'light';

      newDesign = {
        id: editingDesign?.id ?? generateOrdnanceDesignId(),
        name: designName.trim(),
        category: 'missile',
        size: sizeFromPropulsion,
        propulsionId: propulsion.id,
        guidanceId: guidance.id,
        warheadId: warhead.id,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as MissileDesign;
    } else if (designCategory === 'bomb') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      if (!propulsion) return;
      if (!designName.trim()) return;

      const stats = calculateBombDesign(propulsion, warhead);
      const sizeFromPropulsion: OrdnanceSize = propulsion.size === 1 ? 'light' : propulsion.size === 2 ? 'medium' : 'heavy';

      newDesign = {
        id: editingDesign?.id ?? generateOrdnanceDesignId(),
        name: designName.trim(),
        category: 'bomb',
        size: sizeFromPropulsion,
        warheadId: warhead.id,
        totalAccuracy: stats.totalAccuracy,
        totalCost: stats.totalCost,
        capacityRequired: stats.capacityRequired,
      } as BombDesign;
    } else {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      if (!propulsion || !guidance) return;
      if (!designName.trim()) return;

      const stats = calculateMineDesign(propulsion, guidance, warhead);
      const sizeFromPropulsion: OrdnanceSize = propulsion.size === 1 ? 'light' : propulsion.size === 2 ? 'medium' : 'heavy';

      newDesign = {
        id: editingDesign?.id ?? generateOrdnanceDesignId(),
        name: designName.trim(),
        category: 'mine',
        size: sizeFromPropulsion,
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
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {`${quantity}× `}{selectedLaunchSystem.name}
            </Typography>
            <TextField
              type="number"
              size="small"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              inputProps={{ min: 1, max: 99, style: { textAlign: 'center', width: 40 } }}
              sx={{ width: 70 }}
              label="Qty"
            />
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
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip label={`PL${selectedLaunchSystem.progressLevel}`} size="small" variant="outlined" />
            <Chip label={`ROF: ${selectedLaunchSystem.rateOfFire}`} size="small" variant="outlined" />
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Summary */}
        {previewStats && (
          <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip label={`${previewStats.hullPoints} HP`} size="small" variant="outlined" />
              <Chip label={`${previewStats.powerRequired} Power`} size="small" variant="outlined" />
              <Chip label={`${previewStats.totalCapacity} Capacity`} size="small" variant="outlined" color="primary" />
              <Chip label={formatCost(previewStats.cost)} size="small" variant="outlined" />
              <Chip label={selectedLaunchSystem.spaceReload ? 'Space Reload' : 'No Space Reload'} size="small" variant="outlined" color={selectedLaunchSystem.spaceReload ? 'success' : 'default'} />
            </Stack>
          </Paper>
        )}

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

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant="outlined" size="small" onClick={handleCancelEdit}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={isEditing ? <SaveIcon /> : <AddIcon />}
            onClick={handleAddOrUpdateLaunchSystem}
          >
            {isEditing ? 'Save Changes' : 'Add Launch System'}
          </Button>
        </Box>
      </Paper>
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
                onClick={() => handleSelectLaunchSystem(ls)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(selectedLaunchSystem?.id === ls.id && {
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.light' },
                  }),
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
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Warhead</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordnanceDesigns.map(design => {
                const warhead = getWarheadInfo(design.warheadId);
                const techTracks = getDesignTechTracks(design);
                return (
                  <TableRow key={design.id}>
                    <TableCell>{design.name}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{design.category}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{design.size}</TableCell>
                    <TechTrackCell techTracks={techTracks} />
                    <TableCell>{warhead?.name ?? '?'}</TableCell>
                    <TableCell>{formatAccuracyModifier(design.totalAccuracy)}</TableCell>
                    <TableCell>{warhead?.damage ?? '?'}</TableCell>
                    <TableCell>{warhead ? `${warhead.damageType}/${warhead.firepower}` : '?'}</TableCell>
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
      </Paper>
    );
  };

  return (
    <Box>
      {/* Configuration Panel */}
      {renderConfigureForm()}

      {renderLaunchSystemsGrid()}

      {/* Ordnance Designs */}
      {renderOrdnanceDesigns()}
      
      {/* Missile Design Dialog */}
      {designCategory === 'missile' && (
        <Dialog
          open={designDialogOpen}
          onClose={(_event, reason) => {
            if (reason !== 'backdropClick') {
              setDesignDialogOpen(false);
            }
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingDesign ? 'Edit' : 'New'} Missile Design
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={missileDesignStep} nonLinear sx={{ mt: 2, mb: 3, '& .MuiStepButton-root': { outline: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } } }}>
              <Step completed={!!selectedPropulsion}>
                <StepButton onClick={() => setMissileDesignStep(0)}>
                  <StepLabel StepIconComponent={() =>
                    selectedPropulsion
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={missileDesignStep === 0 ? 'warning' : 'error'} />
                  }>
                    Propulsion
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedWarhead}>
                <StepButton onClick={() => setMissileDesignStep(1)}>
                  <StepLabel StepIconComponent={() =>
                    selectedWarhead
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={missileDesignStep === 1 ? 'warning' : 'error'} />
                  }>
                    Warhead
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedGuidance}>
                <StepButton onClick={() => setMissileDesignStep(2)}>
                  <StepLabel StepIconComponent={() =>
                    selectedGuidance
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={missileDesignStep === 2 ? 'warning' : 'error'} />
                  }>
                    Guidance
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedPropulsion && !!selectedWarhead && !!selectedGuidance && !!designName.trim()}>
                <StepButton onClick={() => setMissileDesignStep(3)}>
                  <StepLabel StepIconComponent={() =>
                    selectedPropulsion && selectedWarhead && selectedGuidance && designName.trim()
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={missileDesignStep === 3 ? 'warning' : 'error'} />
                  }>
                    Summary
                  </StepLabel>
                </StepButton>
              </Step>
            </Stepper>

            {/* Step 0: Propulsion Selection */}
            {missileDesignStep === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Propulsion System
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Max WH</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>End</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Accel</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPropulsion.map(p => (
                        <TableRow
                          key={p.id}
                          hover
                          selected={selectedPropulsion === p.id}
                          onClick={() => setSelectedPropulsion(p.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.progressLevel}</TableCell>
                          <TableCell>{p.techTracks.join(', ') || '-'}</TableCell>
                          <TableCell>{p.size}</TableCell>
                          <TableCell>{p.maxWarheadSize}</TableCell>
                          <TableCell>{formatAccuracyModifier(p.accuracyModifier)}</TableCell>
                          <TableCell>{p.endurance ?? '-'}</TableCell>
                          <TableCell>{p.acceleration ?? '-'}{p.isPL6Scale ? '*' : ''}</TableCell>
                          <TableCell>{formatCost(p.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {filteredPropulsion.some(p => p.isPL6Scale) && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    * PL6 scale acceleration (divide by 10 for PL7+ encounters)
                  </Typography>
                )}
              </Box>
            )}

            {/* Step 1: Warhead Selection */}
            {missileDesignStep === 1 && (
              <Box>
                {!selectedPropulsion ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please select a Propulsion system first.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Select Warhead (Max size: {maxWarheadSize})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>AoE</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredWarheads.map(w => (
                            <TableRow
                              key={w.id}
                              hover
                              selected={selectedWarhead === w.id}
                              onClick={() => setSelectedWarhead(w.id)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>{w.name}</TableCell>
                              <TableCell>{w.progressLevel}</TableCell>
                              <TableCell>{w.techTracks.join(', ') || '-'}</TableCell>
                              <TableCell>{w.size}</TableCell>
                              <TableCell>{formatAccuracyModifier(w.accuracyModifier)}</TableCell>
                              <TableCell>{`${w.damageType}/${w.firepower}`}</TableCell>
                              <TableCell>{w.damage}</TableCell>
                              <TableCell>{formatCost(w.cost)}</TableCell>
                              <TableCell>{w.isAreaEffect ? 'Yes' : 'No'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            {/* Step 2: Guidance Selection */}
            {missileDesignStep === 2 && (
              <Box>
                {!selectedPropulsion || !selectedWarhead ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please select {!selectedPropulsion ? 'a Propulsion system' : 'a Warhead'} first.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Select Guidance System
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredGuidance.map(g => (
                            <TableRow
                              key={g.id}
                              hover
                              selected={selectedGuidance === g.id}
                              onClick={() => setSelectedGuidance(g.id)}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>{g.name}</TableCell>
                              <TableCell>{g.progressLevel}</TableCell>
                              <TableCell>{g.techTracks.join(', ') || '-'}</TableCell>
                              <TableCell>{formatAccuracyModifier(g.accuracyModifier)}</TableCell>
                              <TableCell>{formatCost(g.cost)}</TableCell>
                              <TableCell>
                                <TruncatedDescription text={g.description} maxWidth={200} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            {/* Step 3: Summary */}
            {missileDesignStep === 3 && (
              <Box>
                {!selectedPropulsion || !selectedWarhead || !selectedGuidance ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please complete all previous steps first.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Missile Summary
                    </Typography>

                    {designPreview && (() => {
                      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
                      const warhead = allWarheads.find(w => w.id === selectedWarhead);
                      const guidance = allGuidance.find(g => g.id === selectedGuidance);

                      return (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Propulsion</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Warhead</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Guidance</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>End</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Accel</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', minWidth: 90 }}>Cost</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell>{propulsion?.name}</TableCell>
                                <TableCell>{warhead?.name}</TableCell>
                                <TableCell>{guidance?.name}</TableCell>
                                <TableCell>{propulsion?.size}</TableCell>
                                <TableCell>{formatAccuracyModifier(designPreview.totalAccuracy)}</TableCell>
                                <TableCell>{warhead ? `${warhead.damageType}/${warhead.firepower}` : '?'}</TableCell>
                                <TableCell>{warhead?.damage}</TableCell>
                                <TableCell>{propulsion?.endurance ?? '-'}</TableCell>
                                <TableCell>{propulsion?.acceleration ?? '-'}{propulsion?.isPL6Scale ? '*' : ''}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(designPreview.totalCost)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    })()}

                    <TextField
                      label="Design Name"
                      value={designName}
                      onChange={e => setDesignName(e.target.value)}
                      fullWidth
                      required
                      autoFocus
                      error={!designName.trim()}
                      helperText={!designName.trim() ? 'Name is required to create the design' : ''}
                    />
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
            <Button disabled={missileDesignStep === 0} onClick={() => setMissileDesignStep(s => s - 1)}>
              Back
            </Button>
            {missileDesignStep < 3 ? (
              <Button
                variant="contained"
                disabled={
                  (missileDesignStep === 0 && !selectedPropulsion) ||
                  (missileDesignStep === 1 && !selectedWarhead) ||
                  (missileDesignStep === 2 && !selectedGuidance)
                }
                onClick={() => setMissileDesignStep(s => s + 1)}
              >
                Next
              </Button>
            ) : (
              <Button variant="contained" disabled={!designName.trim()} onClick={handleSaveDesign}>
                {editingDesign ? 'Save' : 'Create'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* Bomb Design Dialog */}
      {designCategory === 'bomb' && (
        <Dialog
          open={designDialogOpen}
          onClose={(_event, reason) => {
            if (reason !== 'backdropClick') {
              setDesignDialogOpen(false);
            }
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingDesign ? 'Edit' : 'New'} Bomb Design
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={bombDesignStep} nonLinear sx={{ mt: 2, mb: 3, '& .MuiStepButton-root': { outline: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } } }}>
              <Step completed={!!selectedPropulsion}>
                <StepButton onClick={() => setBombDesignStep(0)}>
                  <StepLabel StepIconComponent={() =>
                    selectedPropulsion
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={bombDesignStep === 0 ? 'warning' : 'error'} />
                  }>
                    Casing
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedWarhead}>
                <StepButton onClick={() => setBombDesignStep(1)}>
                  <StepLabel StepIconComponent={() =>
                    selectedWarhead
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={bombDesignStep === 1 ? 'warning' : 'error'} />
                  }>
                    Warhead
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedPropulsion && !!selectedWarhead && !!designName.trim()}>
                <StepButton onClick={() => setBombDesignStep(2)}>
                  <StepLabel StepIconComponent={() =>
                    selectedPropulsion && selectedWarhead && designName.trim()
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={bombDesignStep === 2 ? 'warning' : 'error'} />
                  }>
                    Summary
                  </StepLabel>
                </StepButton>
              </Step>
            </Stepper>

            {/* Step 0: Casing Selection */}
            {bombDesignStep === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Bomb Casing
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Max WH</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPropulsion.map(p => (
                        <TableRow
                          key={p.id}
                          hover
                          selected={selectedPropulsion === p.id}
                          onClick={() => {
                            setSelectedPropulsion(p.id);
                            setSelectedWarhead('');
                            setBombDesignStep(1);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.progressLevel}</TableCell>
                          <TableCell>{p.techTracks.join(', ') || '-'}</TableCell>
                          <TableCell>{p.size}</TableCell>
                          <TableCell>{p.maxWarheadSize}</TableCell>
                          <TableCell>{formatAccuracyModifier(p.accuracyModifier)}</TableCell>
                          <TableCell>{formatCost(p.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Step 1: Warhead Selection */}
            {bombDesignStep === 1 && (
              <Box>
                {!selectedPropulsion ? (
                  <Typography color="text.secondary">Please select a bomb casing first.</Typography>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Select Warhead (max size {maxWarheadSize})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>AoE</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredWarheads.map(w => (
                            <TableRow
                              key={w.id}
                              hover
                              selected={selectedWarhead === w.id}
                              onClick={() => {
                                setSelectedWarhead(w.id);
                                setBombDesignStep(2);
                              }}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>{w.name}</TableCell>
                              <TableCell>{w.progressLevel}</TableCell>
                              <TableCell>{w.techTracks.join(', ') || '-'}</TableCell>
                              <TableCell>{w.size}</TableCell>
                              <TableCell>{formatAccuracyModifier(w.accuracyModifier)}</TableCell>
                              <TableCell>{`${w.damageType}/${w.firepower}`}</TableCell>
                              <TableCell>{w.damage}</TableCell>
                              <TableCell>{formatCost(w.cost)}</TableCell>
                              <TableCell>{w.isAreaEffect ? 'Yes' : 'No'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            {/* Step 2: Summary */}
            {bombDesignStep === 2 && (
              <Box>
                {!selectedPropulsion || !selectedWarhead ? (
                  <Typography color="text.secondary">
                    Please select {!selectedPropulsion ? 'a bomb casing' : ''}{!selectedPropulsion && !selectedWarhead ? ' and ' : ''}{!selectedWarhead ? 'a warhead' : ''} first.
                  </Typography>
                ) : (
                  <>
                    {(() => {
                      const warhead = allWarheads.find(w => w.id === selectedWarhead);
                      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
                      if (!warhead || !propulsion) return null;
                      const preview = calculateBombDesign(propulsion, warhead);
                      return (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Casing</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Warhead</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', minWidth: 90 }}>Cost</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell>{propulsion.name}</TableCell>
                                <TableCell>{warhead.name}</TableCell>
                                <TableCell>{propulsion.size}</TableCell>
                                <TableCell>{formatAccuracyModifier(preview.totalAccuracy)}</TableCell>
                                <TableCell>{`${warhead.damageType}/${warhead.firepower}`}</TableCell>
                                <TableCell>{warhead.damage}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(preview.totalCost)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    })()}

                    <TextField
                      label="Design Name"
                      value={designName}
                      onChange={e => setDesignName(e.target.value)}
                      fullWidth
                      required
                      autoFocus
                      error={!designName.trim()}
                      helperText={!designName.trim() ? 'Name is required to create the design' : ''}
                    />
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
            <Button disabled={bombDesignStep === 0} onClick={() => setBombDesignStep(s => s - 1)}>
              Back
            </Button>
            {bombDesignStep < 2 ? (
              <Button
                variant="contained"
                onClick={() => setBombDesignStep(s => s + 1)}
                disabled={
                  (bombDesignStep === 0 && !selectedPropulsion) ||
                  (bombDesignStep === 1 && !selectedWarhead)
                }
              >
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSaveDesign} disabled={!designName.trim()}>
                {editingDesign ? 'Save' : 'Create'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* Mine Design Dialog */}
      {designCategory === 'mine' && (
        <Dialog
          open={designDialogOpen}
          onClose={(_event, reason) => {
            if (reason !== 'backdropClick') {
              setDesignDialogOpen(false);
            }
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {editingDesign ? 'Edit' : 'New'} Mine Design
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={mineDesignStep} nonLinear sx={{ mt: 2, mb: 3, '& .MuiStepButton-root': { outline: 'none', '&:focus': { outline: 'none' }, '&:focus-visible': { outline: 'none' } } }}>
              <Step completed={!!selectedPropulsion}>
                <StepButton onClick={() => setMineDesignStep(0)}>
                  <StepLabel StepIconComponent={() =>
                    selectedPropulsion
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={mineDesignStep === 0 ? 'warning' : 'error'} />
                  }>
                    Casing
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedWarhead}>
                <StepButton onClick={() => setMineDesignStep(1)}>
                  <StepLabel StepIconComponent={() =>
                    selectedWarhead
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={mineDesignStep === 1 ? 'warning' : 'error'} />
                  }>
                    Warhead
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedGuidance}>
                <StepButton onClick={() => setMineDesignStep(2)}>
                  <StepLabel StepIconComponent={() =>
                    selectedGuidance
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={mineDesignStep === 2 ? 'warning' : 'error'} />
                  }>
                    Guidance
                  </StepLabel>
                </StepButton>
              </Step>
              <Step completed={!!selectedPropulsion && !!selectedWarhead && !!selectedGuidance && !!designName.trim()}>
                <StepButton onClick={() => setMineDesignStep(3)}>
                  <StepLabel StepIconComponent={() =>
                    selectedPropulsion && selectedWarhead && selectedGuidance && designName.trim()
                      ? <CheckCircleIcon color="success" />
                      : <ErrorOutlineIcon color={mineDesignStep === 3 ? 'warning' : 'error'} />
                  }>
                    Summary
                  </StepLabel>
                </StepButton>
              </Step>
            </Stepper>

            {/* Step 0: Casing Selection */}
            {mineDesignStep === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Mine Casing
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Max WH</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPropulsion.map(p => (
                        <TableRow
                          key={p.id}
                          hover
                          selected={selectedPropulsion === p.id}
                          onClick={() => {
                            setSelectedPropulsion(p.id);
                            setSelectedWarhead('');
                            setMineDesignStep(1);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.progressLevel}</TableCell>
                          <TableCell>{p.techTracks.join(', ') || '-'}</TableCell>
                          <TableCell>{p.size}</TableCell>
                          <TableCell>{p.maxWarheadSize}</TableCell>
                          <TableCell>{formatAccuracyModifier(p.accuracyModifier)}</TableCell>
                          <TableCell>{formatCost(p.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Step 1: Warhead Selection */}
            {mineDesignStep === 1 && (
              <Box>
                {!selectedPropulsion ? (
                  <Typography color="text.secondary">Please select a mine casing first.</Typography>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Select Warhead (max size {maxWarheadSize})
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>AoE</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredWarheads.map(w => (
                            <TableRow
                              key={w.id}
                              hover
                              selected={selectedWarhead === w.id}
                              onClick={() => {
                                setSelectedWarhead(w.id);
                                setMineDesignStep(2);
                              }}
                              sx={{ cursor: 'pointer' }}
                            >
                              <TableCell>{w.name}</TableCell>
                              <TableCell>{w.progressLevel}</TableCell>
                              <TableCell>{w.techTracks.join(', ') || '-'}</TableCell>
                              <TableCell>{w.size}</TableCell>
                              <TableCell>{formatAccuracyModifier(w.accuracyModifier)}</TableCell>
                              <TableCell>{`${w.damageType}/${w.firepower}`}</TableCell>
                              <TableCell>{w.damage}</TableCell>
                              <TableCell>{formatCost(w.cost)}</TableCell>
                              <TableCell>{w.isAreaEffect ? 'Yes' : 'No'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                )}
              </Box>
            )}

            {/* Step 2: Guidance Selection */}
            {mineDesignStep === 2 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Guidance System
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Tech</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredGuidance.map(g => (
                        <TableRow
                          key={g.id}
                          hover
                          selected={selectedGuidance === g.id}
                          onClick={() => {
                            setSelectedGuidance(g.id);
                            setMineDesignStep(3);
                          }}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{g.name}</TableCell>
                          <TableCell>{g.progressLevel}</TableCell>
                          <TableCell>{g.techTracks.join(', ') || '-'}</TableCell>
                          <TableCell>{formatAccuracyModifier(g.accuracyModifier)}</TableCell>
                          <TableCell>{formatCost(g.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Step 3: Summary */}
            {mineDesignStep === 3 && (
              <Box>
                {!selectedPropulsion || !selectedWarhead || !selectedGuidance ? (
                  <Typography color="text.secondary">
                    Please select {!selectedPropulsion ? 'a mine casing' : ''}{!selectedPropulsion && (!selectedWarhead || !selectedGuidance) ? ', ' : ''}{!selectedWarhead ? 'a warhead' : ''}{!selectedWarhead && !selectedGuidance ? ' and ' : ''}{!selectedGuidance ? 'a guidance system' : ''} first.
                  </Typography>
                ) : (
                  <>
                    {(() => {
                      const warhead = allWarheads.find(w => w.id === selectedWarhead);
                      const guidance = allGuidance.find(g => g.id === selectedGuidance);
                      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
                      if (!warhead || !guidance || !propulsion) return null;
                      const preview = calculateMineDesign(propulsion, guidance, warhead);
                      return (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Casing</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Warhead</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Guidance</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Acc</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', minWidth: 90 }}>Cost</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              <TableRow>
                                <TableCell>{propulsion.name}</TableCell>
                                <TableCell>{warhead.name}</TableCell>
                                <TableCell>{guidance.name}</TableCell>
                                <TableCell>{propulsion.size}</TableCell>
                                <TableCell>{formatAccuracyModifier(preview.totalAccuracy)}</TableCell>
                                <TableCell>{`${warhead.damageType}/${warhead.firepower}`}</TableCell>
                                <TableCell>{warhead.damage}</TableCell>
                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(preview.totalCost)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    })()}

                    <TextField
                      label="Design Name"
                      value={designName}
                      onChange={e => setDesignName(e.target.value)}
                      fullWidth
                      required
                      autoFocus
                      error={!designName.trim()}
                      helperText={!designName.trim() ? 'Name is required to create the design' : ''}
                    />
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDesignDialogOpen(false)}>Cancel</Button>
            <Button disabled={mineDesignStep === 0} onClick={() => setMineDesignStep(s => s - 1)}>
              Back
            </Button>
            {mineDesignStep < 3 ? (
              <Button
                variant="contained"
                onClick={() => setMineDesignStep(s => s + 1)}
                disabled={
                  (mineDesignStep === 0 && !selectedPropulsion) ||
                  (mineDesignStep === 1 && !selectedWarhead) ||
                  (mineDesignStep === 2 && !selectedGuidance)
                }
              >
                Next
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSaveDesign} disabled={!designName.trim()}>
                {editingDesign ? 'Save' : 'Create'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
