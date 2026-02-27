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
  Tabs,
  Tab,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import BlurCircularIcon from '@mui/icons-material/BlurCircular';
import { headerCellSx, configFormSx, scrollableTableContainerSx, stickyFirstColumnHeaderSx, stickyFirstColumnCellSx } from '../constants/tableStyles';
import { ArcRadarSelector } from './shared/ArcRadarSelector';
import { OrdnanceSelection, InstalledLaunchSystems } from './OrdnanceSelection';
import type { Hull } from '../types/hull';
import type { ProgressLevel, TechTrack } from '../types/common';
import type {
  WeaponType,
  WeaponCategory,
  InstalledWeapon,
  MountType,
  MountModifier,
  GunConfiguration,
  FiringArc,
} from '../types/weapon';
import type { OrdnanceDesign, InstalledLaunchSystem } from '../types/ordnance';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import {
  getAllBeamWeaponTypes,
  getAllProjectileWeaponTypes,
  getAllTorpedoWeaponTypes,
  getAllSpecialWeaponTypes,
  sortWeapons,
  calculateWeaponStats,
  createInstalledWeapon,
  updateInstalledWeapon,
  calculateWeaponHullPoints,
  calculateWeaponPower,
  calculateWeaponCost,
  getMountTypeName,
  getGunConfigurationName,
  canUseZeroArcs,
  getDefaultArcs,
  getFreeArcCount,
  formatArcs,
  validateArcs,
  generateWeaponId,
} from '../services/weaponService';
import { filterByDesignConstraints } from '../services/utilities';
import { getGunConfigurationsData, getMountModifiersData } from '../services/dataLoader';
import { formatCost, formatAccuracyModifier, getAreaEffectTooltip } from '../services/formatters';
import { TechTrackCell, TruncatedDescription } from './shared';
import { createWeaponBatteryKey, batteryHasFireControl, getFireControlsForBattery } from '../services/commandControlService';

interface WeaponSelectionProps {
  hull: Hull;
  installedWeapons: InstalledWeapon[];
  installedCommandControl: InstalledCommandControlSystem[];
  ordnanceDesigns: OrdnanceDesign[];
  launchSystems: InstalledLaunchSystem[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onWeaponsChange: (weapons: InstalledWeapon[]) => void;
  onOrdnanceDesignsChange: (designs: OrdnanceDesign[]) => void;
  onLaunchSystemsChange: (systems: InstalledLaunchSystem[]) => void;
}

export function WeaponSelection({
  hull,
  installedWeapons,
  installedCommandControl,
  ordnanceDesigns,
  launchSystems,
  designProgressLevel,
  designTechTracks,
  onWeaponsChange,
  onOrdnanceDesignsChange,
  onLaunchSystemsChange,
}: WeaponSelectionProps) {
  const [activeTab, setActiveTab] = useState<WeaponCategory>('beam');
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

  // Category → getter mapping for available weapons
  const weaponGettersByCategory: Record<string, () => WeaponType[]> = useMemo(() => ({
    beam: getAllBeamWeaponTypes,
    projectile: getAllProjectileWeaponTypes,
    torpedo: getAllTorpedoWeaponTypes,
    special: getAllSpecialWeaponTypes,
  }), []);

  // Get filtered weapons for all categories in one memo
  const weaponsByCategory = useMemo(() => {
    const result: Record<string, WeaponType[]> = {};
    for (const [category, getter] of Object.entries(weaponGettersByCategory)) {
      result[category] = sortWeapons(filterByDesignConstraints(getter(), designProgressLevel, designTechTracks, false));
    }
    return result;
  }, [weaponGettersByCategory, designProgressLevel, designTechTracks]);

  // Calculate stats
  const stats = useMemo(
    () => calculateWeaponStats(installedWeapons),
    [installedWeapons]
  );

  // Check for launchers without ordnance
  const launchersWithoutOrdnance = useMemo(() => {
    return launchSystems.filter(ls => !ls.loadout || ls.loadout.length === 0).length;
  }, [launchSystems]);

  // Get gun configurations
  const gunConfigurations = useMemo(() => {
    return getGunConfigurationsData() || {
      single: { effectiveGunCount: 1, actualGunCount: 1 },
      twin: { effectiveGunCount: 1.5, actualGunCount: 2 },
      triple: { effectiveGunCount: 2, actualGunCount: 3 },
      quadruple: { effectiveGunCount: 2.5, actualGunCount: 4 },
    };
  }, []);

  // Get mount modifiers
  const mountModifiers: Record<string, MountModifier> = useMemo(() => {
    return getMountModifiersData() || {
      standard: { costMultiplier: 1, hpMultiplier: 1, standardArcs: 1, allowsZeroArc: true },
      fixed: { costMultiplier: 0.75, hpMultiplier: 0.75, standardArcs: 1, allowsZeroArc: false },
      turret: { costMultiplier: 1.25, hpMultiplier: 1.25, standardArcs: 3, allowsZeroArc: true },
      sponson: { costMultiplier: 1.25, hpMultiplier: 1, standardArcs: 2, allowsZeroArc: true },
      bank: { costMultiplier: 1.25, hpMultiplier: 1, standardArcs: 3, allowsZeroArc: true, allowedCategories: ['beam'], minProgressLevel: 8 }
    };
  }, []);

  // Check if selected weapon can use zero arcs
  const weaponCanUseZero = selectedWeapon ? canUseZeroArcs(selectedWeapon) : false;
  
  // Get free arc counts for current mount type
  const freeArcCount = getFreeArcCount(mountType, shipClass);
  
  // Validate current arc selection
  const arcValidationError = selectedWeapon
    ? validateArcs(selectedArcs, mountType, shipClass, weaponCanUseZero)
    : '';

  // Handler for mount type change - also resets arcs to defaults
  const handleMountTypeChange = (newMountType: MountType) => {
    setMountType(newMountType);
    // Reset arcs to defaults for the new mount type (only for new weapons, not when editing)
    if (selectedWeapon && !editingWeaponId) {
      setSelectedArcs(getDefaultArcs(newMountType, shipClass, canUseZeroArcs(selectedWeapon)));
    }
  };

  // Handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: WeaponCategory) => {
    setActiveTab(newValue);
    setSelectedWeapon(null);
    setEditingWeaponId(null);
  };

  const handleSelectWeapon = (weapon: WeaponType) => {
    setSelectedWeapon(weapon);
    const defaultMount = Object.keys(mountModifiers)[0] || 'standard';
    setMountType(defaultMount);
    setGunConfiguration('single');
    setConcealed(false);
    setQuantity(1);
    setSelectedArcs(getDefaultArcs(defaultMount, shipClass, canUseZeroArcs(weapon)));
    setEditingWeaponId(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleAddWeapon = () => {
    if (!selectedWeapon) return;
    if (arcValidationError) return;

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
        activeTab,
        mountType,
        gunConfiguration,
        concealed,
        quantity,
        selectedArcs
      );
      onWeaponsChange([...installedWeapons, newWeapon]);
    }

    setSelectedWeapon(null);
    setMountType(Object.keys(mountModifiers)[0] || 'standard');
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

  const handleDuplicateWeapon = (weapon: InstalledWeapon) => {
    const newWeapon: InstalledWeapon = {
      ...weapon,
      id: generateWeaponId(),
    };
    const index = installedWeapons.findIndex((w) => w.id === weapon.id);
    const updated = [...installedWeapons];
    updated.splice(index + 1, 0, newWeapon);
    onWeaponsChange(updated);
  };

  const handleCancelEdit = () => {
    const weaponIdToScrollTo = editingWeaponId;
    setSelectedWeapon(null);
    setMountType(Object.keys(mountModifiers)[0] || 'standard');
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
        // When removing a standard arc, also remove its corresponding zero arc
        if (!isZero) {
          const correspondingZero = `zero-${arc}` as FiringArc;
          const zeroIndex = currentArcs.indexOf(correspondingZero);
          if (zeroIndex >= 0) {
            currentArcs.splice(zeroIndex, 1);
          }
        }
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
          // Keep only (limit - 1) standard arcs, then add the new one
          const keptStandard = standardArcs.slice(0, freeArcCount.standardArcs - 1);
          const newStandardSet = new Set([...keptStandard, arc]);
          // Only keep zero arcs whose corresponding standard arc remains
          const arcsToKeep = currentArcs.filter(a =>
            a.startsWith('zero-') && newStandardSet.has(a.replace('zero-', '') as FiringArc),
          );
          arcsToKeep.push(...newStandardSet);
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

  // Filter installed weapons by category
  const getInstalledWeaponsByCategory = (category: WeaponCategory) => {
    return installedWeapons.filter((w) => w.category === category);
  };

  // Render installed weapons section for a specific category
  const renderInstalledWeaponsForCategory = (category: WeaponCategory) => {
    const categoryWeapons = getInstalledWeaponsByCategory(category);

    const categoryNames: Record<WeaponCategory, string> = {
      beam: 'Beam Weapons',
      projectile: 'Projectile Weapons',
      torpedo: 'Torpedo Weapons',
      special: 'Special Weapons',
      ordnance: 'Ordnance',
    };

    if (categoryWeapons.length === 0) return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No {categoryNames[category].toLowerCase()} installed. Select from the table below to add one.
      </Typography>
    );

    return (
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Installed {categoryNames[category]}
        </Typography>
        <Stack spacing={1}>
          {categoryWeapons.map((weapon) => {
            // Check if this weapon's battery has Fire Control
            const batteryKey = createWeaponBatteryKey(weapon.weaponType.id, weapon.mountType);
            const hasFireControl = batteryHasFireControl(batteryKey, installedCommandControl);
            const fireControls = getFireControlsForBattery(batteryKey, installedCommandControl);
            const fireControlName = fireControls.length > 0 ? fireControls[0].type.name : undefined;
            const isEditing = editingWeaponId === weapon.id;
            
            return (
              <React.Fragment key={weapon.id}>
                <Box
                  id={`weapon-${weapon.id}`}
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
                  {hasFireControl && (
                    <Tooltip title={fireControlName}>
                      <Chip 
                        label={fireControls[0].type.quality 
                          ? `${fireControls[0].type.quality} Fire Control`
                          : fireControls[0].type.name
                        } 
                        size="small" 
                        color="success" 
                        variant="outlined" 
                      />
                    </Tooltip>
                  )}
                  {weapon.weaponType.area && (
                    <Tooltip title={getAreaEffectTooltip(weapon.weaponType.area)}>
                      <Chip 
                        label="Area" 
                        size="small" 
                        color="warning" 
                        variant="outlined"
                        icon={<BlurCircularIcon />}
                      />
                    </Tooltip>
                  )}
                  <IconButton size="small" onClick={() => handleEditWeapon(weapon)} color="primary" aria-label="Edit weapon">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <Tooltip title="Duplicate">
                    <IconButton size="small" onClick={() => handleDuplicateWeapon(weapon)} aria-label="Duplicate weapon">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => handleRemoveWeapon(weapon.id)} color="error" aria-label="Remove weapon">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                {/* Render edit form inline when this weapon is being edited */}
                {isEditing && renderConfigureForm()}
              </React.Fragment>
            );
          })}
        </Stack>
      </Paper>
    );
  };

  // Render the configure form for beam weapons
  const renderConfigureForm = () => {
    if (!selectedWeapon) return null;

    // Build dynamic weapon name based on configuration (without quantity prefix)
    const configuredWeaponName = [
      getMountTypeName(mountType),
      gunConfiguration !== 'single' ? getGunConfigurationName(gunConfiguration) : '',
      concealed ? 'Concealed' : '',
      selectedWeapon.name,
    ].filter(Boolean).join(' ');

    return (
      <Paper ref={formRef} variant="outlined" sx={configFormSx}>
        <form onSubmit={(e) => { e.preventDefault(); handleAddWeapon(); }}>
        {/* Header with quantity spinner, name, and stats */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
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
            {configuredWeaponName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {quantity > 1 
              ? `HP: ${previewHullPts * quantity} | Power: ${previewPower * quantity} | Cost: ${formatCost(previewCost * quantity)}`
              : `HP: ${previewHullPts} | Power: ${previewPower} | Cost: ${formatCost(previewCost)}`
            }
          </Typography>
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
              onChange={(_, value) => value && handleMountTypeChange(value as MountType)}
              size="small"
              sx={{ flexWrap: 'wrap', mb: 2 }}
              aria-label="Mount type"
            >
              {Object.entries(mountModifiers).map(([key, mod]) => {
                const isAvailable = selectedWeapon ? (
                  (!mod.allowedCategories || mod.allowedCategories.includes(activeTab)) &&
                  (!mod.minProgressLevel || selectedWeapon.progressLevel >= mod.minProgressLevel)
                ) : true;
                
                const tooltipText = `${mod.costMultiplier}× cost, ${mod.hpMultiplier}× HP — ${mod.allowsZeroArc ? '1 zero + ' : ''}${mod.standardArcs ?? 1} arc${(mod.standardArcs ?? 1) > 1 ? 's' : ''}${mod.allowedCategories ? ` (${mod.allowedCategories.join(', ')} only)` : ''}${mod.minProgressLevel ? ` (PL${mod.minProgressLevel}+)` : ''}`;
                
                return (
                  <Tooltip key={key} title={tooltipText}>
                    <span>
                      <ToggleButton value={key} disabled={!isAvailable}>
                        {getMountTypeName(key)}
                      </ToggleButton>
                    </span>
                  </Tooltip>
                );
              })}
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
              aria-label="Gun configuration"
            >
              {Object.entries(gunConfigurations).map(([key, config]) => (
                <Tooltip key={key} title={`${config.effectiveGunCount}× cost, ${config.effectiveGunCount}× HP`}>
                  <ToggleButton value={key}>{getGunConfigurationName(key)}</ToggleButton>
                </Tooltip>
              ))}
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
              showZeroArcs={weaponCanUseZero && (mountModifiers[mountType]?.allowsZeroArc ?? false)}
              disableZeroArcs={shipClass === 'small-craft'}
              maxStandardArcs={freeArcCount.standardArcs}
              maxZeroArcs={freeArcCount.zeroArcs}
            />
            {!weaponCanUseZero && mountModifiers[mountType]?.allowsZeroArc && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic', display: 'block', textAlign: 'center' }}>
                Only S/L firepower can use zero arcs
              </Typography>
            )}
          </Box>

          {/* Column 3: Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button type="button" variant="outlined" size="small" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="small"
                startIcon={editingWeaponId ? <SaveIcon /> : <AddIcon />}
                disabled={!!arcValidationError}
              >
                {editingWeaponId ? 'Update' : 'Add'}
              </Button>
            </Box>
          </Box>
        </Box>
        </form>
      </Paper>
    );
  };

  // Render weapon grid for any category
  const renderWeaponGrid = (category: WeaponCategory) => {
    const weapons = weaponsByCategory[category] || [];
    const isSpecial = category === 'special';

    if (weapons.length === 0) {
      return (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          No {category} weapons available at current design constraints.
        </Typography>
      );
    }

    return (
      <TableContainer component={Paper} variant="outlined" sx={{ ...scrollableTableContainerSx, '& .MuiTable-root': { minWidth: isSpecial ? 1500 : 1400 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, ...stickyFirstColumnHeaderSx, minWidth: 180 }}>Name</TableCell>
              <TableCell sx={headerCellSx}>PL</TableCell>
              <TableCell sx={headerCellSx}>Tech</TableCell>
              <TableCell sx={headerCellSx}>HP</TableCell>
              <TableCell sx={headerCellSx}>Power</TableCell>
              <TableCell sx={headerCellSx}>Cost</TableCell>
              <TableCell sx={headerCellSx}>Acc</TableCell>
              <TableCell sx={headerCellSx}>Range</TableCell>
              <TableCell sx={headerCellSx}>Area</TableCell>
              <TableCell sx={headerCellSx}>Type/FP</TableCell>
              <TableCell sx={headerCellSx}>Damage</TableCell>
              <TableCell sx={headerCellSx}>Fire</TableCell>
              {isSpecial && <TableCell sx={headerCellSx}>Special Effect</TableCell>}
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weapons.map((weapon) => (
              <TableRow
                key={weapon.id}
                hover
                selected={selectedWeapon?.id === weapon.id}
                onClick={() => handleSelectWeapon(weapon)}
                sx={{
                  cursor: 'pointer',
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <TableCell sx={{ ...stickyFirstColumnCellSx, minWidth: 180 }}>{weapon.name}</TableCell>
                <TableCell>{weapon.progressLevel}</TableCell>
                <TechTrackCell techTracks={weapon.techTracks} />
                <TableCell>{weapon.hullPoints}</TableCell>
                <TableCell>{weapon.powerRequired}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatCost(weapon.cost)}</TableCell>
                <TableCell>{formatAccuracyModifier(weapon.accuracyModifier)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{`${weapon.rangeShort}/${weapon.rangeMedium}/${weapon.rangeLong}`}</TableCell>
                <TableCell>
                  {weapon.area ? (
                    <Tooltip title={getAreaEffectTooltip(weapon.area)}>
                      <BlurCircularIcon fontSize="small" color="primary" />
                    </Tooltip>
                  ) : '-'}
                </TableCell>
                <TableCell>{`${weapon.damageType}/${weapon.firepower}`}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{weapon.damage}</TableCell>
                <TableCell>{weapon.fireModes.join('/')}</TableCell>
                {isSpecial && (
                  <TableCell sx={{ maxWidth: 200 }}>
                    {weapon.specialEffect && <TruncatedDescription text={weapon.specialEffect} />}
                  </TableCell>
                )}
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

  // Render weapon tab content for any category (beam, projectile, torpedo, special)
  const renderWeaponTab = (category: WeaponCategory) => (
    <Box>
      {renderInstalledWeaponsForCategory(category)}
      {!editingWeaponId && renderConfigureForm()}
      {renderWeaponGrid(category)}
    </Box>
  );

  return (
    <Box>
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
          {launchSystems.length > 0 && (
            <Chip label={`Launchers: ${launchSystems.length}`} color="primary" variant="outlined" />
          )}
          {launchersWithoutOrdnance > 0 && (
            <Chip icon={<WarningAmberIcon />} label={`${launchersWithoutOrdnance} Launcher${launchersWithoutOrdnance !== 1 ? 's' : ''} without ordnance`} color="warning" variant="outlined" />
          )}
          {stats.torpedoCount > 0 && (
            <Chip label={`Torpedoes: ${stats.torpedoCount}`} color="primary" variant="outlined" />
          )}
          {stats.ordnanceCount > 0 && (
            <Chip label={`Ordnance: ${stats.ordnanceCount}`} color="primary" variant="outlined" />
          )}
        </Box>
      </Paper>

      {/* Weapon Category Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label={`Beam (${getInstalledWeaponsByCategory('beam').length})`} value="beam" />
          <Tab label={`Projectile (${getInstalledWeaponsByCategory('projectile').length})`} value="projectile" />
          <Tab label={`Ordnance (${launchSystems.length})`} value="ordnance" />
          <Tab label={`Torpedo (${getInstalledWeaponsByCategory('torpedo').length})`} value="torpedo" />
          <Tab label={`Special (${getInstalledWeaponsByCategory('special').length})`} value="special" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab !== 'ordnance' && renderWeaponTab(activeTab)}
      {activeTab === 'ordnance' && (
        <>
          {/* Installed Launch Systems */}
          <InstalledLaunchSystems
            launchSystems={launchSystems}
            ordnanceDesigns={ordnanceDesigns}
            installedCommandControl={installedCommandControl}
            onEdit={(ls) => {
              setEditingLaunchSystemId(ls.id);
              // Don't switch tabs - edit form renders inline
            }}
            onRemove={(id) => {
              onLaunchSystemsChange(launchSystems.filter(ls => ls.id !== id));
              if (editingLaunchSystemId === id) {
                setEditingLaunchSystemId(null);
              }
            }}
            editingId={editingLaunchSystemId}
            onLaunchSystemsChange={onLaunchSystemsChange}
            onOrdnanceDesignsChange={onOrdnanceDesignsChange}
            onEditComplete={() => setEditingLaunchSystemId(null)}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
          />
          <OrdnanceSelection
            ordnanceDesigns={ordnanceDesigns}
            launchSystems={launchSystems}
            designProgressLevel={designProgressLevel}
            designTechTracks={designTechTracks}
            onOrdnanceDesignsChange={onOrdnanceDesignsChange}
            onLaunchSystemsChange={onLaunchSystemsChange}
            onEditComplete={() => setEditingLaunchSystemId(null)}
          />
        </>
      )}
    </Box>
  );
}

