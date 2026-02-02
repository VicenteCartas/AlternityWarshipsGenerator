import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { ArcRadarSelector } from './shared/ArcRadarSelector';
import { OrdnanceSelection, InstalledLaunchSystems } from './OrdnanceSelection';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  WeaponType,
  WeaponCategory,
  InstalledWeapon,
  MountType,
  GunConfiguration,
  FiringArc,
} from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem } from '../types/ordnance';
import {
  getAllBeamWeaponTypes,
  getAllProjectileWeaponTypes,
  getAllTorpedoWeaponTypes,
  getAllSpecialWeaponTypes,
  filterByDesignConstraints,
  calculateWeaponStats,
  createInstalledWeapon,
  updateInstalledWeapon,
  calculateWeaponHullPoints,
  calculateWeaponPower,
  calculateWeaponCost,
  getMountTypeName,
  getGunConfigurationName,
  isBankMountAvailable,
  canUseZeroArcs,
  getDefaultArcs,
  getFreeArcCount,
  formatArcs,
  validateArcs,
} from '../services/weaponService';
import { formatCost, formatAccuracyModifier } from '../services/formatters';
import { TechTrackCell, TruncatedDescription } from './shared';

interface WeaponSelectionProps {
  hull: Hull;
  installedWeapons: InstalledWeapon[];
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onWeaponsChange: (weapons: InstalledWeapon[]) => void;
  onOrdnanceDesignsChange: (designs: OrdnanceDesign[]) => void;
  onLaunchSystemsChange: (systems: InstalledLaunchSystem[]) => void;
}

type WeaponTab = 'beam' | 'projectile' | 'torpedo' | 'special' | 'ordnance';

// Map tab to weapon category
const TAB_TO_CATEGORY: Record<WeaponTab, WeaponCategory> = {
  beam: 'beam',
  projectile: 'projectile',
  torpedo: 'torpedo',
  special: 'special',
  ordnance: 'ordnance',
};

export function WeaponSelection({
  hull,
  installedWeapons,
  ordnanceDesigns,
  launchSystems,
  designProgressLevel,
  designTechTracks,
  onWeaponsChange,
  onOrdnanceDesignsChange,
  onLaunchSystemsChange,
}: WeaponSelectionProps) {
  const [activeTab, setActiveTab] = useState<WeaponTab>('beam');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType | null>(null);
  const [mountType, setMountType] = useState<MountType>('standard');
  const [gunConfiguration, setGunConfiguration] = useState<GunConfiguration>('single');
  const [concealed, setConcealed] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedArcs, setSelectedArcs] = useState<FiringArc[]>(['forward']);
  const [editingWeaponId, setEditingWeaponId] = useState<string | null>(null);
  const [editingLaunchSystemId, setEditingLaunchSystemId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Ship class for arc rules
  const shipClass = hull.shipClass;

  // Firepower sort order: Gd -> S -> L -> M -> H -> SH
  const firepowerOrder: Record<string, number> = { 'Gd': 0, 'S': 1, 'L': 2, 'M': 3, 'H': 4, 'SH': 5 };

  // Get filtered beam weapons
  const availableBeamWeapons = useMemo(() => {
    return filterByDesignConstraints(getAllBeamWeaponTypes(), designProgressLevel, designTechTracks)
      .sort((a, b) => {
        // Sort by PL, Firepower, Acc (negative to positive), Short, Medium, Long range, HP, Power, Cost
        if (a.progressLevel !== b.progressLevel) return a.progressLevel - b.progressLevel;
        const fpA = firepowerOrder[a.firepower] ?? 99;
        const fpB = firepowerOrder[b.firepower] ?? 99;
        if (fpA !== fpB) return fpA - fpB;
        if (a.accuracyModifier !== b.accuracyModifier) return a.accuracyModifier - b.accuracyModifier;
        if (a.rangeShort !== b.rangeShort) return a.rangeShort - b.rangeShort;
        if (a.rangeMedium !== b.rangeMedium) return a.rangeMedium - b.rangeMedium;
        if (a.rangeLong !== b.rangeLong) return a.rangeLong - b.rangeLong;
        if (a.hullPoints !== b.hullPoints) return a.hullPoints - b.hullPoints;
        if (a.powerRequired !== b.powerRequired) return a.powerRequired - b.powerRequired;
        return a.cost - b.cost;
      });
  }, [designProgressLevel, designTechTracks]);

  // Get filtered projectile weapons
  const availableProjectileWeapons = useMemo(() => {
    return filterByDesignConstraints(getAllProjectileWeaponTypes(), designProgressLevel, designTechTracks)
      .sort((a, b) => {
        // Sort by PL, Firepower, Acc (negative to positive), Short, Medium, Long range, HP, Power, Cost
        if (a.progressLevel !== b.progressLevel) return a.progressLevel - b.progressLevel;
        const fpA = firepowerOrder[a.firepower] ?? 99;
        const fpB = firepowerOrder[b.firepower] ?? 99;
        if (fpA !== fpB) return fpA - fpB;
        if (a.accuracyModifier !== b.accuracyModifier) return a.accuracyModifier - b.accuracyModifier;
        if (a.rangeShort !== b.rangeShort) return a.rangeShort - b.rangeShort;
        if (a.rangeMedium !== b.rangeMedium) return a.rangeMedium - b.rangeMedium;
        if (a.rangeLong !== b.rangeLong) return a.rangeLong - b.rangeLong;
        if (a.hullPoints !== b.hullPoints) return a.hullPoints - b.hullPoints;
        if (a.powerRequired !== b.powerRequired) return a.powerRequired - b.powerRequired;
        return a.cost - b.cost;
      });
  }, [designProgressLevel, designTechTracks]);

  // Get filtered torpedo weapons
  const availableTorpedoWeapons = useMemo(() => {
    return filterByDesignConstraints(getAllTorpedoWeaponTypes(), designProgressLevel, designTechTracks)
      .sort((a, b) => {
        // Sort by PL, Firepower, Acc (negative to positive), Short, Medium, Long range, HP, Power, Cost
        if (a.progressLevel !== b.progressLevel) return a.progressLevel - b.progressLevel;
        const fpA = firepowerOrder[a.firepower] ?? 99;
        const fpB = firepowerOrder[b.firepower] ?? 99;
        if (fpA !== fpB) return fpA - fpB;
        if (a.accuracyModifier !== b.accuracyModifier) return a.accuracyModifier - b.accuracyModifier;
        if (a.rangeShort !== b.rangeShort) return a.rangeShort - b.rangeShort;
        if (a.rangeMedium !== b.rangeMedium) return a.rangeMedium - b.rangeMedium;
        if (a.rangeLong !== b.rangeLong) return a.rangeLong - b.rangeLong;
        if (a.hullPoints !== b.hullPoints) return a.hullPoints - b.hullPoints;
        if (a.powerRequired !== b.powerRequired) return a.powerRequired - b.powerRequired;
        return a.cost - b.cost;
      });
  }, [designProgressLevel, designTechTracks]);

  // Get filtered special weapons
  const availableSpecialWeapons = useMemo(() => {
    return filterByDesignConstraints(getAllSpecialWeaponTypes(), designProgressLevel, designTechTracks)
      .sort((a, b) => {
        // Sort by PL, Firepower, Acc (negative to positive), Short, Medium, Long range, HP, Power, Cost
        if (a.progressLevel !== b.progressLevel) return a.progressLevel - b.progressLevel;
        const fpA = firepowerOrder[a.firepower] ?? 99;
        const fpB = firepowerOrder[b.firepower] ?? 99;
        if (fpA !== fpB) return fpA - fpB;
        if (a.accuracyModifier !== b.accuracyModifier) return a.accuracyModifier - b.accuracyModifier;
        if (a.rangeShort !== b.rangeShort) return a.rangeShort - b.rangeShort;
        if (a.rangeMedium !== b.rangeMedium) return a.rangeMedium - b.rangeMedium;
        if (a.rangeLong !== b.rangeLong) return a.rangeLong - b.rangeLong;
        if (a.hullPoints !== b.hullPoints) return a.hullPoints - b.hullPoints;
        if (a.powerRequired !== b.powerRequired) return a.powerRequired - b.powerRequired;
        return a.cost - b.cost;
      });
  }, [designProgressLevel, designTechTracks]);

  // Calculate stats
  const stats = useMemo(
    () => calculateWeaponStats(installedWeapons),
    [installedWeapons]
  );

  // Check if selected weapon can use zero arcs
  const weaponCanUseZero = selectedWeapon ? canUseZeroArcs(selectedWeapon) : false;
  
  // Get free arc counts for current mount type
  const freeArcCount = getFreeArcCount(mountType, shipClass);
  
  // Validate current arc selection
  const arcValidationError = selectedWeapon
    ? validateArcs(selectedArcs, mountType, shipClass, weaponCanUseZero)
    : '';

  // Update arcs when mount type changes
  useEffect(() => {
    if (selectedWeapon && !editingWeaponId) {
      setSelectedArcs(getDefaultArcs(mountType, shipClass, canUseZeroArcs(selectedWeapon)));
    }
  }, [mountType, selectedWeapon, shipClass, editingWeaponId]);

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: WeaponTab) => {
    setActiveTab(newValue);
    setSelectedWeapon(null);
    setEditingWeaponId(null);
  };

  const handleSelectWeapon = (weapon: WeaponType) => {
    setSelectedWeapon(weapon);
    setMountType('standard');
    setGunConfiguration('single');
    setConcealed(false);
    setQuantity(1);
    setSelectedArcs(getDefaultArcs('standard', shipClass, canUseZeroArcs(weapon)));
    setEditingWeaponId(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddWeapon = () => {
    if (!selectedWeapon) return;
    if (arcValidationError) return;

    const category = TAB_TO_CATEGORY[activeTab];
    const weaponIdToScrollTo = editingWeaponId;

    if (editingWeaponId) {
      // When editing, update the weapon including quantity and arcs
      onWeaponsChange(
        installedWeapons.map((w) =>
          w.id === editingWeaponId
            ? updateInstalledWeapon(w, mountType, gunConfiguration, concealed, quantity, selectedArcs)
            : w
        )
      );
    } else {
      // When adding, create a single installed weapon with quantity and arcs
      const newWeapon = createInstalledWeapon(
        selectedWeapon,
        category,
        mountType,
        gunConfiguration,
        concealed,
        quantity,
        selectedArcs
      );
      onWeaponsChange([...installedWeapons, newWeapon]);
    }

    setSelectedWeapon(null);
    setMountType('standard');
    setGunConfiguration('single');
    setConcealed(false);
    setQuantity(1);
    setSelectedArcs(['forward']);
    setEditingWeaponId(null);

    // Scroll back to the edited weapon
    if (weaponIdToScrollTo) {
      setTimeout(() => {
        document.getElementById(`weapon-${weaponIdToScrollTo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }
  };

  const handleEditWeapon = (installed: InstalledWeapon) => {
    setSelectedWeapon(installed.weaponType);
    setMountType(installed.mountType);
    setGunConfiguration(installed.gunConfiguration);
    setConcealed(installed.concealed);
    setQuantity(installed.quantity);
    setSelectedArcs(installed.arcs || ['forward']);
    setEditingWeaponId(installed.id);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleRemoveWeapon = (id: string) => {
    onWeaponsChange(installedWeapons.filter((w) => w.id !== id));
  };

  const handleCancelEdit = () => {
    const weaponIdToScrollTo = editingWeaponId;
    setSelectedWeapon(null);
    setMountType('standard');
    setGunConfiguration('single');
    setConcealed(false);
    setQuantity(1);
    setSelectedArcs(['forward']);
    setEditingWeaponId(null);
    // Scroll back to the weapon that was being edited
    if (weaponIdToScrollTo) {
      setTimeout(() => {
        document.getElementById(`weapon-${weaponIdToScrollTo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }
  };

  // Arc toggle handlers - replace mode when at max
  const handleArcToggle = (arc: FiringArc, isZero: boolean) => {
    const currentArcs = [...selectedArcs];
    const arcIndex = currentArcs.indexOf(arc);
    
    if (arcIndex >= 0) {
      // Remove arc (unless it's the last one)
      if (currentArcs.length > 1 || isZero) {
        currentArcs.splice(arcIndex, 1);
      }
    } else {
      // Add arc - check limits and replace if at max
      const zeroArcs = currentArcs.filter(a => a.startsWith('zero-'));
      const standardArcs = currentArcs.filter(a => !a.startsWith('zero-'));
      
      if (isZero) {
        // Small craft can have all zero arcs
        const maxZero = shipClass === 'small-craft' ? 4 : freeArcCount.zeroArcs;
        if (zeroArcs.length < maxZero) {
          currentArcs.push(arc);
        } else if (maxZero === 1) {
          // Replace the existing zero arc
          const oldZeroIndex = currentArcs.findIndex(a => a.startsWith('zero-'));
          if (oldZeroIndex >= 0) {
            currentArcs.splice(oldZeroIndex, 1);
          }
          currentArcs.push(arc);
        }
      } else {
        if (standardArcs.length < freeArcCount.standardArcs) {
          currentArcs.push(arc);
        } else {
          // Replace: remove all standard arcs beyond limit, add new one
          // For fixed (1 arc) or standard/sponson/bank (1 arc), replace the existing
          const arcsToKeep = currentArcs.filter(a => a.startsWith('zero-'));
          // Keep only (limit - 1) standard arcs, then add the new one
          const keptStandard = standardArcs.slice(0, freeArcCount.standardArcs - 1);
          arcsToKeep.push(...keptStandard, arc);
          setSelectedArcs(arcsToKeep);
          return;
        }
      }
    }
    
    setSelectedArcs(currentArcs);
  };

  // Calculate preview values
  const previewHullPts = selectedWeapon
    ? calculateWeaponHullPoints(selectedWeapon, mountType, gunConfiguration, concealed)
    : 0;
  const previewPower = selectedWeapon ? calculateWeaponPower(selectedWeapon, gunConfiguration) : 0;
  const previewCost = selectedWeapon
    ? calculateWeaponCost(selectedWeapon, mountType, gunConfiguration, concealed)
    : 0;

  // Check if bank mount is available for selected weapon (PL8+ beam weapons only)
  const bankAvailable = selectedWeapon ? isBankMountAvailable(selectedWeapon, TAB_TO_CATEGORY[activeTab]) : false;

  // Render installed weapons section
  const renderInstalledWeapons = () => {
    if (installedWeapons.length === 0) return null;

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed Weapons
        </Typography>
        <Stack spacing={1}>
          {installedWeapons.map((weapon) => (
            <React.Fragment key={weapon.id}>
              <Box
                id={`weapon-${weapon.id}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  bgcolor: editingWeaponId === weapon.id ? 'primary.light' : 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {weapon.quantity > 1 && `${weapon.quantity}× `}
                  {weapon.weaponType.name}
                  {' - '}
                  {getMountTypeName(weapon.mountType)}
                  {weapon.gunConfiguration !== 'single' && ` ${getGunConfigurationName(weapon.gunConfiguration)}`}
                  {weapon.concealed && ' (Concealed)'}
                  {' → '}
                  {formatArcs(weapon.arcs || ['forward'])}
                </Typography>
                <Chip label={`${weapon.hullPoints * weapon.quantity} HP`} size="small" variant="outlined" />
                <Chip label={`${weapon.powerRequired * weapon.quantity} Power`} size="small" variant="outlined" />
                <Chip label={formatCost(weapon.cost * weapon.quantity)} size="small" variant="outlined" />
                <IconButton size="small" onClick={() => handleEditWeapon(weapon)} color="primary">
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => handleRemoveWeapon(weapon.id)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              {/* Render edit form inline when this weapon is being edited */}
              {editingWeaponId === weapon.id && renderConfigureForm()}
            </React.Fragment>
          ))}
        </Stack>
      </Paper>
    );
  };

  // Render the configure form for beam weapons
  const renderConfigureForm = () => {
    if (!selectedWeapon) return null;

    // Build dynamic weapon name based on configuration
    const configuredWeaponName = [
      `${quantity}×`,
      getMountTypeName(mountType),
      gunConfiguration !== 'single' ? getGunConfigurationName(gunConfiguration) : '',
      concealed ? 'Concealed' : '',
      selectedWeapon.name,
    ].filter(Boolean).join(' ');

    return (
      <Paper ref={formRef} variant="outlined" sx={{ p: 2, mb: 2 }}>
        {/* Header with dynamic name and quantity */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              {configuredWeaponName}
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
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip label={`PL${selectedWeapon.progressLevel}`} size="small" variant="outlined" />
            <Chip label={`${selectedWeapon.damageType}/${selectedWeapon.firepower}`} size="small" variant="outlined" />
          </Stack>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Main configuration - flex layout */}
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          
          {/* Column 1: Mount, Guns & Options */}
          <Box>
            {/* Mount Type */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Mount Type
            </Typography>
            <ToggleButtonGroup
              value={mountType}
              exclusive
              onChange={(_, value) => value && setMountType(value as MountType)}
              size="small"
              sx={{ flexWrap: 'wrap', mb: 2 }}
            >
              <Tooltip title="1× cost, 1× HP — 1 zero + 1 arc">
                <ToggleButton value="standard">Standard</ToggleButton>
              </Tooltip>
              <Tooltip title="0.75× cost, 0.75× HP — 1 arc only">
                <ToggleButton value="fixed">Fixed</ToggleButton>
              </Tooltip>
              <Tooltip title="1.5× cost, 1.5× HP — 1 zero + 2 arcs">
                <ToggleButton value="turret">Turret</ToggleButton>
              </Tooltip>
              <Tooltip title="1.25× cost, 1× HP — 1 zero + 1 arc">
                <ToggleButton value="sponson">Sponson</ToggleButton>
              </Tooltip>
              <Tooltip title="1.25× cost, 1× HP — PL8+ beams only">
                <span>
                  <ToggleButton value="bank" disabled={!bankAvailable}>Bank</ToggleButton>
                </span>
              </Tooltip>
            </ToggleButtonGroup>

            {/* Gun Configuration */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Gun Configuration
            </Typography>
            <ToggleButtonGroup
              value={gunConfiguration}
              exclusive
              onChange={(_, value) => value && setGunConfiguration(value as GunConfiguration)}
              size="small"
              sx={{ flexWrap: 'wrap', mb: 2 }}
            >
              <Tooltip title="1× cost, 1× HP">
                <ToggleButton value="single">Single</ToggleButton>
              </Tooltip>
              <Tooltip title="1.5× cost, 1.5× HP">
                <ToggleButton value="twin">Twin</ToggleButton>
              </Tooltip>
              <Tooltip title="1.75× cost, 1.75× HP">
                <ToggleButton value="triple">Triple</ToggleButton>
              </Tooltip>
              <Tooltip title="2× cost, 2× HP">
                <ToggleButton value="quadruple">Quad</ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>

            {/* Options */}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Options
            </Typography>
            <Tooltip title="1.5× cost & HP">
              <Chip
                icon={<VisibilityOffIcon />}
                label="Concealed"
                size="small"
                color={concealed ? 'primary' : 'default'}
                variant={concealed ? 'filled' : 'outlined'}
                onClick={() => setConcealed(!concealed)}
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
          </Box>

          {/* Column 2: Firing Arcs Radar Selector */}
          <Box>
            <ArcRadarSelector
              selectedArcs={selectedArcs}
              onArcToggle={handleArcToggle}
              showZeroArcs={weaponCanUseZero && mountType !== 'fixed'}
              disableZeroArcs={shipClass === 'small-craft'}
              maxStandardArcs={freeArcCount.standardArcs}
              maxZeroArcs={freeArcCount.zeroArcs}
            />
            {!weaponCanUseZero && mountType !== 'fixed' && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic', display: 'block', textAlign: 'center' }}>
                Only S/L firepower can use zero arcs
              </Typography>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Summary Card */}
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="body2" color="text.secondary">
                Arcs: {formatArcs(selectedArcs)}
              </Typography>
            </Stack>
            
            <Stack direction="row" spacing={1} alignItems="center">
              {quantity > 1 ? (
                <>
                  <Chip label={`${previewHullPts * quantity} HP`} size="small" variant="outlined" color="default" />
                  <Chip label={`${previewPower * quantity} Pwr`} size="small" variant="outlined" color="primary" />
                  <Chip label={formatCost(previewCost * quantity)} size="small" variant="outlined" color="default" />
                </>
              ) : (
                <>
                  <Chip label={`${previewHullPts} HP`} size="small" variant="outlined" color="default" />
                  <Chip label={`${previewPower} Pwr`} size="small" variant="outlined" color="primary" />
                  <Chip label={formatCost(previewCost)} size="small" variant="outlined" color="default" />
                </>
              )}
            </Stack>
          </Box>
        </Paper>

        {/* Actions */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button variant="outlined" size="small" onClick={handleCancelEdit}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={editingWeaponId ? <SaveIcon /> : <AddIcon />}
            onClick={handleAddWeapon}
            disabled={!!arcValidationError}
          >
            {editingWeaponId ? 'Save Changes' : 'Add Weapon'}
          </Button>
        </Box>
      </Paper>
    );
  };

  // Render beam weapons grid
  const renderBeamWeaponsGrid = () => {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1400 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acc</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Type/FP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Damage</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fire</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableBeamWeapons.map((weapon) => (
              <TableRow
                key={weapon.id}
                hover
                onClick={() => handleSelectWeapon(weapon)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(selectedWeapon?.id === weapon.id && {
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.light' },
                  }),
                }}
              >
                <TableCell sx={{ minWidth: 180 }}>{weapon.name}</TableCell>
                <TableCell>{weapon.progressLevel}</TableCell>
                <TechTrackCell techTracks={weapon.techTracks} />
                <TableCell>{weapon.hullPoints}</TableCell>
                <TableCell>{weapon.powerRequired}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(weapon.cost)}</TableCell>
                <TableCell>{formatAccuracyModifier(weapon.accuracyModifier)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${weapon.rangeShort}/${weapon.rangeMedium}/${weapon.rangeLong}`}</TableCell>
                <TableCell>{`${weapon.damageType}/${weapon.firepower}`}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{weapon.damage}</TableCell>
                <TableCell>{weapon.fireModes.join('/')}</TableCell>
                <TableCell sx={{ maxWidth: 250 }}>
                  <TruncatedDescription text={weapon.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render projectile weapons grid
  const renderProjectileWeaponsGrid = () => {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1400 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acc</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Type/FP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Damage</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fire</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableProjectileWeapons.map((weapon) => (
              <TableRow
                key={weapon.id}
                hover
                onClick={() => handleSelectWeapon(weapon)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(selectedWeapon?.id === weapon.id && {
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.light' },
                  }),
                }}
              >
                <TableCell sx={{ minWidth: 180 }}>{weapon.name}</TableCell>
                <TableCell>{weapon.progressLevel}</TableCell>
                <TechTrackCell techTracks={weapon.techTracks} />
                <TableCell>{weapon.hullPoints}</TableCell>
                <TableCell>{weapon.powerRequired}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(weapon.cost)}</TableCell>
                <TableCell>{formatAccuracyModifier(weapon.accuracyModifier)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${weapon.rangeShort}/${weapon.rangeMedium}/${weapon.rangeLong}`}</TableCell>
                <TableCell>{`${weapon.damageType}/${weapon.firepower}`}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{weapon.damage}</TableCell>
                <TableCell>{weapon.fireModes.join('/')}</TableCell>
                <TableCell sx={{ maxWidth: 250 }}>
                  <TruncatedDescription text={weapon.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render torpedo weapons grid
  const renderTorpedoWeaponsGrid = () => {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1400 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acc</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Type/FP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Damage</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fire</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableTorpedoWeapons.map((weapon) => (
              <TableRow
                key={weapon.id}
                hover
                onClick={() => handleSelectWeapon(weapon)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(selectedWeapon?.id === weapon.id && {
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.light' },
                  }),
                }}
              >
                <TableCell sx={{ minWidth: 180 }}>{weapon.name}</TableCell>
                <TableCell>{weapon.progressLevel}</TableCell>
                <TechTrackCell techTracks={weapon.techTracks} />
                <TableCell>{weapon.hullPoints}</TableCell>
                <TableCell>{weapon.powerRequired}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(weapon.cost)}</TableCell>
                <TableCell>{formatAccuracyModifier(weapon.accuracyModifier)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${weapon.rangeShort}/${weapon.rangeMedium}/${weapon.rangeLong}`}</TableCell>
                <TableCell>{`${weapon.damageType}/${weapon.firepower}`}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{weapon.damage}</TableCell>
                <TableCell>{weapon.fireModes.join('/')}</TableCell>
                <TableCell sx={{ maxWidth: 250 }}>
                  <TruncatedDescription text={weapon.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render special weapons grid
  const renderSpecialWeaponsGrid = () => {
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', '& .MuiTable-root': { minWidth: 1500 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>PL</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Tech</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Power</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Acc</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Type/FP</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Damage</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Fire</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Special Effect</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {availableSpecialWeapons.map((weapon) => (
              <TableRow
                key={weapon.id}
                hover
                onClick={() => handleSelectWeapon(weapon)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  ...(selectedWeapon?.id === weapon.id && {
                    bgcolor: 'primary.light',
                    '&:hover': { bgcolor: 'primary.light' },
                  }),
                }}
              >
                <TableCell sx={{ minWidth: 180 }}>{weapon.name}</TableCell>
                <TableCell>{weapon.progressLevel}</TableCell>
                <TechTrackCell techTracks={weapon.techTracks} />
                <TableCell>{weapon.hullPoints}</TableCell>
                <TableCell>{weapon.powerRequired}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(weapon.cost)}</TableCell>
                <TableCell>{formatAccuracyModifier(weapon.accuracyModifier)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${weapon.rangeShort}/${weapon.rangeMedium}/${weapon.rangeLong}`}</TableCell>
                <TableCell>{`${weapon.damageType}/${weapon.firepower}`}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{weapon.damage}</TableCell>
                <TableCell>{weapon.fireModes.join('/')}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  {weapon.specialEffect && <TruncatedDescription text={weapon.specialEffect} />}
                </TableCell>
                <TableCell sx={{ maxWidth: 250 }}>
                  <TruncatedDescription text={weapon.description} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Step 7: Weapons (Optional)
      </Typography>

      {/* Summary Chips */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={`HP: ${stats.totalHullPoints}`} color="default" variant="outlined" />
          <Chip label={`Power: ${stats.totalPowerRequired}`} color="default" variant="outlined" />
          <Chip label={`Cost: ${formatCost(stats.totalCost)}`} color="default" variant="outlined" />
          {stats.beamCount > 0 && (
            <Chip label={`Beams: ${stats.beamCount}`} color="primary" variant="outlined" />
          )}
          {stats.projectileCount > 0 && (
            <Chip label={`Projectiles: ${stats.projectileCount}`} color="primary" variant="outlined" />
          )}
          {stats.torpedoCount > 0 && (
            <Chip label={`Torpedoes: ${stats.torpedoCount}`} color="primary" variant="outlined" />
          )}
          {stats.ordnanceCount > 0 && (
            <Chip label={`Ordnance: ${stats.ordnanceCount}`} color="primary" variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Installed Weapons */}
      {renderInstalledWeapons()}

      {/* Installed Launch Systems */}
      <InstalledLaunchSystems
        launchSystems={launchSystems}
        ordnanceDesigns={ordnanceDesigns}
        onEdit={(ls) => {
          setEditingLaunchSystemId(ls.id);
          setActiveTab('ordnance');
        }}
        onRemove={(id) => {
          onLaunchSystemsChange(launchSystems.filter(ls => ls.id !== id));
          if (editingLaunchSystemId === id) {
            setEditingLaunchSystemId(null);
          }
        }}
        editingId={editingLaunchSystemId}
      />

      {/* Configure Form - only shown here when adding a new weapon (not editing) */}
      {!editingWeaponId && renderConfigureForm()}

      {/* Weapon Category Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Beam" value="beam" />
          <Tab label="Projectile" value="projectile" />
          <Tab label="Ordnance" value="ordnance" />
          <Tab label="Torpedo" value="torpedo" />
          <Tab label="Special" value="special" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 'beam' && renderBeamWeaponsGrid()}
      {activeTab === 'projectile' && renderProjectileWeaponsGrid()}
      {activeTab === 'torpedo' && renderTorpedoWeaponsGrid()}
      {activeTab === 'special' && renderSpecialWeaponsGrid()}
      {activeTab === 'ordnance' && (
        <OrdnanceSelection
          hull={hull}
          ordnanceDesigns={ordnanceDesigns}
          launchSystems={launchSystems}
          designProgressLevel={designProgressLevel}
          designTechTracks={designTechTracks}
          onOrdnanceDesignsChange={onOrdnanceDesignsChange}
          onLaunchSystemsChange={onLaunchSystemsChange}
          editLaunchSystemId={editingLaunchSystemId}
          onEditComplete={() => setEditingLaunchSystemId(null)}
        />
      )}
    </Box>
  );
}

