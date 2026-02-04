import { useState, useMemo, useRef, useEffect } from 'react';
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
  Stack,
  TextField,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  OrdnanceCategory,
  OrdnanceDesign,
  InstalledLaunchSystem,
} from '../types/ordnance';
import {
  getLaunchSystems,
  calculateLaunchSystemStats,
  getUsedCapacity,
  canLoadOrdnance,
  addOrdnanceToLoadout,
  removeOrdnanceFromLoadout,
} from '../services/ordnanceService';
import { formatCost } from '../services/formatters';
import { OrdnanceDesignDialog } from './OrdnanceDesignDialog';

interface LaunchSystemEditFormProps {
  /** The installed launch system being edited */
  launchSystem: InstalledLaunchSystem;
  /** All installed launch systems (needed for updating) */
  allLaunchSystems: InstalledLaunchSystem[];
  /** Available ordnance designs */
  ordnanceDesigns: OrdnanceDesign[];
  /** Design constraints */
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  /** Callbacks */
  onSave: (updatedSystems: InstalledLaunchSystem[]) => void;
  onCancel: () => void;
  onOrdnanceDesignsChange: (designs: OrdnanceDesign[]) => void;
}

export function LaunchSystemEditForm({
  launchSystem,
  allLaunchSystems,
  ordnanceDesigns,
  designProgressLevel,
  designTechTracks,
  onSave,
  onCancel,
  onOrdnanceDesignsChange,
}: LaunchSystemEditFormProps) {
  const formRef = useRef<HTMLDivElement>(null);

  // Get the launch system type
  const allLaunchSystemTypes = useMemo(() => getLaunchSystems(), []);
  const launchSystemType = useMemo(
    () => allLaunchSystemTypes.find(ls => ls.id === launchSystem.launchSystemType),
    [allLaunchSystemTypes, launchSystem.launchSystemType]
  );

  // Local state for editing
  const [quantity, setQuantity] = useState(launchSystem.quantity);
  const [extraHp, setExtraHp] = useState(launchSystem.extraHp);

  // Local copy of the launch system with loadout changes
  const [currentLoadout, setCurrentLoadout] = useState(launchSystem.loadout);

  // Design dialog state
  const [designDialogOpen, setDesignDialogOpen] = useState(false);
  const [designCategory, setDesignCategory] = useState<OrdnanceCategory>('missile');
  const [editingDesign, setEditingDesign] = useState<OrdnanceDesign | null>(null);

  // Calculate preview stats
  const previewStats = useMemo(() => {
    if (!launchSystemType) return null;
    return calculateLaunchSystemStats(launchSystemType, quantity, extraHp);
  }, [launchSystemType, quantity, extraHp]);

  // Get applicable ordnance designs for this launch system
  const applicableDesigns = useMemo(() => {
    if (!launchSystemType) return [];
    return ordnanceDesigns.filter(d =>
      launchSystemType.ordnanceTypes.includes(d.category)
    );
  }, [launchSystemType, ordnanceDesigns]);

  // Scroll into view on mount
  useEffect(() => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }, []);

  // Calculate capacity
  const usedCap = getUsedCapacity(currentLoadout, ordnanceDesigns);
  const totalCap = previewStats?.totalCapacity ?? 0;
  const remainingCap = totalCap - usedCap;

  // Handlers
  const handleSave = () => {
    if (!launchSystemType) return;

    const stats = calculateLaunchSystemStats(launchSystemType, quantity, extraHp);
    const updatedLS: InstalledLaunchSystem = {
      ...launchSystem,
      quantity,
      extraHp,
      loadout: currentLoadout,
      hullPoints: stats.hullPoints,
      powerRequired: stats.powerRequired,
      totalCapacity: stats.totalCapacity,
      cost: stats.cost,
    };

    onSave(
      allLaunchSystems.map(ls => ls.id === launchSystem.id ? updatedLS : ls)
    );
  };

  const handleLoadOrdnance = (designId: string, qty: number) => {
    const design = ordnanceDesigns.find(d => d.id === designId);
    if (!design) return;

    // Create a temp launch system with current loadout to check capacity
    const tempLS: InstalledLaunchSystem = {
      ...launchSystem,
      loadout: currentLoadout,
      totalCapacity: totalCap,
    };

    if (!canLoadOrdnance(tempLS, design, qty, ordnanceDesigns)) {
      alert('Not enough capacity to load this ordnance.');
      return;
    }

    const updatedLS = addOrdnanceToLoadout({ ...launchSystem, loadout: currentLoadout }, designId, qty);
    setCurrentLoadout(updatedLS.loadout);
  };

  const handleUnloadOrdnance = (designId: string) => {
    const updatedLS = removeOrdnanceFromLoadout({ ...launchSystem, loadout: currentLoadout }, designId);
    setCurrentLoadout(updatedLS.loadout);
  };

  // Design dialog handlers
  const openNewDesignDialog = (category: OrdnanceCategory) => {
    setDesignCategory(category);
    setEditingDesign(null);
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

  if (!launchSystemType) {
    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography color="error">Launch system type not found</Typography>
      </Paper>
    );
  }

  return (
    <>
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
              {launchSystemType.name}
            </Typography>
            {launchSystemType.expandable && (
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
                {previewStats.hullPoints} HP | {previewStats.powerRequired} Power | {previewStats.totalCapacity} Cap | ROF {launchSystemType.rateOfFire} | {formatCost(previewStats.cost)}
              </Typography>
            )}
          </Box>

          {/* Column 2: Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" size="small" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSave}
            >
              Update
            </Button>
          </Box>
        </Box>

        {/* Ordnance Loading Section */}
        <Typography variant="subtitle2" gutterBottom>
          Ordnance Loadout (Capacity: {usedCap}/{totalCap})
        </Typography>

        {/* Current loadout */}
        {currentLoadout.length > 0 && (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Design</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentLoadout.map(item => {
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
            No designs available. Create a design using the buttons below.
          </Typography>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 250 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Design</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applicableDesigns.map(design => {
                  const canLoad = design.capacityRequired <= remainingCap;
                  const maxQty = Math.floor(remainingCap / design.capacityRequired);
                  const isLoaded = currentLoadout.some(item => item.designId === design.id);
                  return (
                    <TableRow key={design.id}>
                      <TableCell>{design.name}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{design.category}</TableCell>
                      <TableCell sx={{ textTransform: 'capitalize' }}>{design.size} ({design.capacityRequired})</TableCell>
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
          {launchSystemType.ordnanceTypes.includes('missile') && (
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('missile')}>
              New Missile Design
            </Button>
          )}
          {launchSystemType.ordnanceTypes.includes('bomb') && (
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('bomb')}>
              New Bomb Design
            </Button>
          )}
          {launchSystemType.ordnanceTypes.includes('mine') && (
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNewDesignDialog('mine')}>
              New Mine Design
            </Button>
          )}
        </Stack>
      </Box>

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
    </>
  );
}
