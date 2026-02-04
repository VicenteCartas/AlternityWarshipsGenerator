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
  Chip,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DeleteIcon from '@mui/icons-material/Delete';
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
} from '../types/ordnance';
import {
  getLaunchSystems,
  getPropulsionSystems,
  getWarheads,
  getGuidanceSystems,
  filterPropulsionByConstraints,
  filterWarheadsByConstraints,
  filterGuidanceByConstraints,
  calculateMissileDesign,
  calculateBombDesign,
  calculateMineDesign,
  calculateLaunchSystemStats,
  getUsedCapacity,
  canLoadOrdnance,
  addOrdnanceToLoadout,
  removeOrdnanceFromLoadout,
  generateOrdnanceDesignId,
} from '../services/ordnanceService';
import { formatCost, formatAccuracyModifier } from '../services/formatters';

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

  // Design form state
  const [designName, setDesignName] = useState('');
  const [selectedPropulsion, setSelectedPropulsion] = useState<string>('');
  const [selectedGuidance, setSelectedGuidance] = useState<string>('');
  const [selectedWarhead, setSelectedWarhead] = useState<string>('');

  // Stepper states
  const [missileDesignStep, setMissileDesignStep] = useState(0);
  const [bombDesignStep, setBombDesignStep] = useState(0);
  const [mineDesignStep, setMineDesignStep] = useState(0);

  // Get all data for design dialogs
  const allPropulsion = useMemo(() => getPropulsionSystems(), []);
  const allWarheads = useMemo(() => getWarheads(), []);
  const allGuidance = useMemo(() => getGuidanceSystems(), []);

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
    setDesignName('');
    setSelectedPropulsion('');
    setSelectedGuidance('');
    setSelectedWarhead('');
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Capacity</TableCell>
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
                  <TableCell sx={{ fontWeight: 'bold' }}>Cap</TableCell>
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
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Firepower</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
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
                              <TableCell>{w.damageType}</TableCell>
                              <TableCell>{w.firepower}</TableCell>
                              <TableCell>{w.damage}</TableCell>
                              <TableCell>{formatCost(w.cost)}</TableCell>
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
                          <TableCell sx={{ maxWidth: 300 }}>{g.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Step 3: Summary */}
            {missileDesignStep === 3 && (
              <Box>
                {(!selectedPropulsion || !selectedWarhead || !selectedGuidance) ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please complete all previous steps first.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Design Summary
                    </Typography>
                    {designPreview && (
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`Accuracy: ${formatAccuracyModifier(designPreview.totalAccuracy)}`} size="small" />
                          <Chip label={`Cost: ${formatCost(designPreview.totalCost)}`} size="small" />
                          <Chip label={`Capacity: ${designPreview.capacityRequired}`} size="small" color="primary" />
                        </Stack>
                      </Paper>
                    )}
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
                onClick={() => setMissileDesignStep(s => s + 1)}
                disabled={
                  (missileDesignStep === 0 && !selectedPropulsion) ||
                  (missileDesignStep === 1 && !selectedWarhead) ||
                  (missileDesignStep === 2 && !selectedGuidance)
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
                    Size
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

            {/* Step 0: Size Selection */}
            {bombDesignStep === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Bomb Size
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
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
                          onClick={() => setSelectedPropulsion(p.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ textTransform: 'capitalize' }}>{p.name}</TableCell>
                          <TableCell>{p.progressLevel}</TableCell>
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
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please select a bomb size first.
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
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Firepower</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
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
                              <TableCell>{w.damageType}</TableCell>
                              <TableCell>{w.firepower}</TableCell>
                              <TableCell>{w.damage}</TableCell>
                              <TableCell>{formatCost(w.cost)}</TableCell>
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
                {(!selectedPropulsion || !selectedWarhead) ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please complete all previous steps first.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Design Summary
                    </Typography>
                    {designPreview && (
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`Accuracy: ${formatAccuracyModifier(designPreview.totalAccuracy)}`} size="small" />
                          <Chip label={`Cost: ${formatCost(designPreview.totalCost)}`} size="small" />
                          <Chip label={`Capacity: ${designPreview.capacityRequired}`} size="small" color="primary" />
                        </Stack>
                      </Paper>
                    )}
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
                    Size
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

            {/* Step 0: Size Selection */}
            {mineDesignStep === 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Mine Size
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 350 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
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
                          onClick={() => setSelectedPropulsion(p.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ textTransform: 'capitalize' }}>{p.name}</TableCell>
                          <TableCell>{p.progressLevel}</TableCell>
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
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please select a mine size first.
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
                            <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Firepower</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
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
                              <TableCell>{w.damageType}</TableCell>
                              <TableCell>{w.firepower}</TableCell>
                              <TableCell>{w.damage}</TableCell>
                              <TableCell>{formatCost(w.cost)}</TableCell>
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
                          <TableCell sx={{ maxWidth: 300 }}>{g.description}</TableCell>
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
                {(!selectedPropulsion || !selectedWarhead || !selectedGuidance) ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">
                      Please complete all previous steps first.
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <Typography variant="subtitle2" sx={{ mb: 2 }}>
                      Design Summary
                    </Typography>
                    {designPreview && (
                      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip label={`Accuracy: ${formatAccuracyModifier(designPreview.totalAccuracy)}`} size="small" />
                          <Chip label={`Cost: ${formatCost(designPreview.totalCost)}`} size="small" />
                          <Chip label={`Capacity: ${designPreview.capacityRequired}`} size="small" color="primary" />
                        </Stack>
                      </Paper>
                    )}
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
    </>
  );
}
