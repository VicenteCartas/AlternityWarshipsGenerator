import { useState, useMemo, useEffect } from 'react';
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
  Tooltip,
} from '@mui/material';
import BlurCircularIcon from '@mui/icons-material/BlurCircular';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  OrdnanceCategory,
  OrdnanceSize,
  OrdnanceDesign,
  MissileDesign,
  BombDesign,
  MineDesign,
} from '../types/ordnance';
import {
  getPropulsionSystems,
  getWarheads,
  getGuidanceSystems,
  filterPropulsionByConstraints,
  filterWarheadsByConstraints,
  filterGuidanceByConstraints,
  calculateMissileDesign,
  calculateBombDesign,
  calculateMineDesign,
  generateOrdnanceDesignId,
} from '../services/ordnanceService';
import { formatCost, formatAccuracyModifier, getAreaEffectTooltip } from '../services/formatters';

interface OrdnanceDesignDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** The category of ordnance being designed */
  category: OrdnanceCategory;
  /** Design being edited (null for new design) */
  editingDesign: OrdnanceDesign | null;
  /** Design constraints */
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  /** Callbacks */
  onSave: (design: OrdnanceDesign) => void;
  onCancel: () => void;
}

export function OrdnanceDesignDialog({
  open,
  category,
  editingDesign,
  designProgressLevel,
  designTechTracks,
  onSave,
  onCancel,
}: OrdnanceDesignDialogProps) {
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

  // Reset state when dialog opens or category changes
  useEffect(() => {
    if (open) {
      if (editingDesign) {
        setDesignName(editingDesign.name);
        if ('propulsionId' in editingDesign && editingDesign.propulsionId) {
          setSelectedPropulsion(editingDesign.propulsionId);
        }
        if ('guidanceId' in editingDesign && editingDesign.guidanceId) {
          setSelectedGuidance(editingDesign.guidanceId);
        }
        setSelectedWarhead(editingDesign.warheadId);
        // Go to summary step when editing
        if (category === 'missile') setMissileDesignStep(3);
        else if (category === 'bomb') setBombDesignStep(2);
        else setMineDesignStep(3);
      } else {
        setDesignName('');
        setSelectedPropulsion('');
        setSelectedGuidance('');
        setSelectedWarhead('');
        setMissileDesignStep(0);
        setBombDesignStep(0);
        setMineDesignStep(0);
      }
    }
  }, [open, editingDesign, category]);

  // Filter propulsion systems for current design category
  const filteredPropulsion = useMemo(() => {
    return filterPropulsionByConstraints(
      allPropulsion,
      designProgressLevel,
      designTechTracks,
      category
    );
  }, [allPropulsion, designProgressLevel, designTechTracks, category]);

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
      category
    );
  }, [allGuidance, designProgressLevel, designTechTracks, category]);

  // Calculate design preview
  const designPreview = useMemo(() => {
    if (category === 'missile') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && guidance && warhead) {
        return calculateMissileDesign(propulsion, guidance, warhead);
      }
    } else if (category === 'bomb') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && warhead) {
        return calculateBombDesign(propulsion, warhead);
      }
    } else if (category === 'mine') {
      const propulsion = allPropulsion.find(p => p.id === selectedPropulsion);
      const guidance = allGuidance.find(g => g.id === selectedGuidance);
      const warhead = allWarheads.find(w => w.id === selectedWarhead);
      if (propulsion && guidance && warhead) {
        return calculateMineDesign(propulsion, guidance, warhead);
      }
    }
    return null;
  }, [category, selectedPropulsion, selectedGuidance, selectedWarhead, allPropulsion, allGuidance, allWarheads]);

  const handleSaveDesign = () => {
    const warhead = allWarheads.find(w => w.id === selectedWarhead);
    if (!warhead) return;

    let newDesign: OrdnanceDesign;

    if (category === 'missile') {
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
    } else if (category === 'bomb') {
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

    onSave(newDesign);
  };

  // Render Missile Design Dialog content
  const renderMissileDialog = () => (
    <Dialog
      open={open && category === 'missile'}
      onClose={(_event, reason) => {
        if (reason !== 'backdropClick') {
          onCancel();
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
                        <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Area</TableCell>
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
                          <TableCell>{`${w.damageType}/${w.firepower}`}</TableCell>
                          <TableCell>{w.damage}</TableCell>
                          <TableCell>
                            {w.area ? (
                              <Tooltip title={getAreaEffectTooltip(w.area)}>
                                <BlurCircularIcon fontSize="small" color="primary" />
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
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
                      <Chip label={`Size: ${designPreview.capacityRequired}`} size="small" />
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
        <Button onClick={onCancel}>Cancel</Button>
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
  );

  // Render Bomb Design Dialog content
  const renderBombDialog = () => (
    <Dialog
      open={open && category === 'bomb'}
      onClose={(_event, reason) => {
        if (reason !== 'backdropClick') {
          onCancel();
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
                        <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Area</TableCell>
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
                          <TableCell>{`${w.damageType}/${w.firepower}`}</TableCell>
                          <TableCell>{w.damage}</TableCell>
                          <TableCell>
                            {w.area ? (
                              <Tooltip title={getAreaEffectTooltip(w.area)}>
                                <BlurCircularIcon fontSize="small" color="primary" />
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
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
                      <Chip label={`Size: ${designPreview.capacityRequired}`} size="small" />
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
        <Button onClick={onCancel}>Cancel</Button>
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
  );

  // Render Mine Design Dialog content
  const renderMineDialog = () => (
    <Dialog
      open={open && category === 'mine'}
      onClose={(_event, reason) => {
        if (reason !== 'backdropClick') {
          onCancel();
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
                        <TableCell sx={{ fontWeight: 'bold' }}>Type/FP</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Area</TableCell>
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
                          <TableCell>{`${w.damageType}/${w.firepower}`}</TableCell>
                          <TableCell>{w.damage}</TableCell>
                          <TableCell>
                            {w.area ? (
                              <Tooltip title={getAreaEffectTooltip(w.area)}>
                                <BlurCircularIcon fontSize="small" color="primary" />
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
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
                      <Chip label={`Size: ${designPreview.capacityRequired}`} size="small" />
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
        <Button onClick={onCancel}>Cancel</Button>
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
  );

  return (
    <>
      {renderMissileDialog()}
      {renderBombDialog()}
      {renderMineDialog()}
    </>
  );
}
