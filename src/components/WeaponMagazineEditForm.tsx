/**
 * Inline edit form for managing warheads loaded in an accelerator-type weapon's magazine.
 * Follows the same pattern as MagazineOrdnanceEditForm.
 */

import { useState } from 'react';
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
  Stack,
  TextField,
  Chip,
} from '@mui/material';
import type { InstalledWeapon } from '../types/weapon';
import type { LoadedOrdnance, Warhead } from '../types/ordnance';
import { formatCost } from '../services/formatters';
import { getWarheads } from '../services/ordnanceService';
import { filterByDesignConstraints } from '../services/utilities';
import {
  calculateWeaponMagazineCapacity,
  calculateWeaponMagazineExtraCost,
  calculateWeaponHullPoints,
  calculateWeaponCost,
} from '../services/weaponService';
import type { ProgressLevel, TechTrack } from '../types/common';

interface WeaponMagazineEditFormProps {
  weapon: InstalledWeapon;
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onWeaponChange: (updatedWeapon: InstalledWeapon) => void;
}

export function WeaponMagazineEditForm({
  weapon,
  designProgressLevel,
  designTechTracks,
  onWeaponChange,
}: WeaponMagazineEditFormProps) {
  const weaponType = weapon.weaponType;
  const maxWarheadSize = weaponType.maxWarheadSize || 0;
  const [extraHp, setExtraHp] = useState<number>(weapon.extraHp || 0);
  const [currentLoadout, setCurrentLoadout] = useState<LoadedOrdnance[]>(weapon.magazineLoadout || []);

  const totalCapacity = calculateWeaponMagazineCapacity(weaponType, extraHp);
  const usedCap = currentLoadout.reduce((sum, item) => {
    const wh = getWarheads().find(w => w.id === item.designId);
    return sum + (wh ? wh.size * item.quantity : 0);
  }, 0);
  const remainingCap = totalCapacity - usedCap;

  // Get available warheads filtered by design constraints and max warhead size
  const availableWarheads = filterByDesignConstraints(
    getWarheads().filter(w => w.size <= maxWarheadSize),
    designProgressLevel,
    designTechTracks,
    false
  ) as Warhead[];

  const magazineExtraCost = calculateWeaponMagazineExtraCost(weaponType, extraHp);

  // Sync changes to parent
  const updateState = (newLoadout: LoadedOrdnance[], newExtraHp: number) => {
    setCurrentLoadout(newLoadout);
    setExtraHp(newExtraHp);

    const newCapacity = calculateWeaponMagazineCapacity(weaponType, newExtraHp);
    const newExtraCost = calculateWeaponMagazineExtraCost(weaponType, newExtraHp);


    const baseHp = calculateWeaponHullPoints(weaponType, weapon.mountType, weapon.gunConfiguration, weapon.concealed);
    const baseCost = calculateWeaponCost(weaponType, weapon.mountType, weapon.gunConfiguration, weapon.concealed);

    onWeaponChange({
      ...weapon,
      extraHp: newExtraHp,
      magazineLoadout: newLoadout.length > 0 ? newLoadout : [],
      totalMagazineCapacity: newCapacity,
      hullPoints: baseHp + newExtraHp,
      cost: baseCost + newExtraCost,
    });
  };

  const handleExtraHpChange = (newExtraHp: number) => {
    const clamped = Math.max(0, newExtraHp);
    // Check if reducing extra HP would make current loadout exceed capacity
    const newCapacity = calculateWeaponMagazineCapacity(weaponType, clamped);
    if (usedCap > newCapacity) return; // Don't allow reducing below loaded capacity
    updateState(currentLoadout, clamped);
  };

  const handleLoad = (warheadId: string, qty: number) => {
    const wh = getWarheads().find(w => w.id === warheadId);
    if (!wh || wh.size * qty > remainingCap) return;

    const existing = currentLoadout.find(item => item.designId === warheadId);
    let newLoadout: LoadedOrdnance[];
    if (existing) {
      newLoadout = currentLoadout.map(item =>
        item.designId === warheadId ? { ...item, quantity: item.quantity + qty } : item
      );
    } else {
      newLoadout = [...currentLoadout, { designId: warheadId, quantity: qty }];
    }
    updateState(newLoadout, extraHp);
  };

  const handleUnload = (warheadId: string) => {
    updateState(currentLoadout.filter(item => item.designId !== warheadId), extraHp);
  };

  const handleReduceQuantity = (warheadId: string, qty: number) => {
    const existing = currentLoadout.find(item => item.designId === warheadId);
    if (!existing) return;
    if (existing.quantity <= qty) {
      handleUnload(warheadId);
    } else {
      updateState(
        currentLoadout.map(item =>
          item.designId === warheadId ? { ...item, quantity: item.quantity - qty } : item
        ),
        extraHp
      );
    }
  };

  return (
    <Box sx={{ mt: 1.5, mb: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Magazine (Capacity: {usedCap}/{totalCapacity} warhead size pts)
      </Typography>

      {/* Magazine expansion */}
      {weaponType.expandable && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
          <TextField
            type="number"
            size="small"
            value={extraHp}
            onChange={(e) => handleExtraHpChange(parseInt(e.target.value, 10) || 0)}
            inputProps={{ min: 0, max: 99, style: { textAlign: 'center', width: 40 } }}
            sx={{ width: 90 }}
            label="Extra HP"
          />
          <Typography variant="caption" color="text.secondary">
            +{weaponType.expansionValuePerHp || 0} capacity per HP
          </Typography>
          {magazineExtraCost > 0 && (
            <Chip label={`+${formatCost(magazineExtraCost)}`} size="small" variant="outlined" />
          )}
          {extraHp > 0 && (
            <Chip label={`+${extraHp} HP`} size="small" variant="outlined" />
          )}
        </Stack>
      )}

      {/* Current loadout */}
      {currentLoadout.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Warhead</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentLoadout.map(item => {
                const wh = availableWarheads.find(w => w.id === item.designId)
                  || getWarheads().find(w => w.id === item.designId);
                const canLoadMore = wh ? wh.size <= remainingCap : false;
                const maxMore = wh ? Math.floor(remainingCap / wh.size) : 0;
                return (
                  <TableRow key={item.designId}>
                    <TableCell>{wh?.name ?? 'Unknown'}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{wh ? wh.size * item.quantity : '?'}</TableCell>
                    <TableCell>{wh ? formatCost(wh.cost * item.quantity) : '?'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="outlined" onClick={() => handleReduceQuantity(item.designId, 1)}>-1</Button>
                        <Button size="small" variant="outlined" disabled={!canLoadMore} onClick={() => handleLoad(item.designId, 1)}>+1</Button>
                        {maxMore >= 5 && <Button size="small" variant="outlined" onClick={() => handleLoad(item.designId, 5)}>+5</Button>}
                        <Button size="small" variant="outlined" color="error" onClick={() => handleUnload(item.designId)}>Clear</Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Available warheads to load */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Available Warheads (Max size: {maxWarheadSize}, Remaining: {remainingCap} pts)
      </Typography>
      {availableWarheads.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          No warheads available at current design constraints.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 250 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Warhead</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>PL</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Dmg Type/FP</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Damage</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {availableWarheads.map(wh => {
                const canLoad = wh.size <= remainingCap;
                const maxQty = Math.floor(remainingCap / wh.size);
                const isLoaded = currentLoadout.some(item => item.designId === wh.id);
                return (
                  <TableRow key={wh.id}>
                    <TableCell>{wh.name}</TableCell>
                    <TableCell>{wh.progressLevel}</TableCell>
                    <TableCell>{wh.size}</TableCell>
                    <TableCell>{wh.damageType}/{wh.firepower}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{wh.damage}</TableCell>
                    <TableCell>{formatCost(wh.cost)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Button size="small" variant="outlined" disabled={!canLoad} onClick={() => handleLoad(wh.id, 1)}>+1</Button>
                        {maxQty >= 5 && <Button size="small" variant="outlined" onClick={() => handleLoad(wh.id, 5)}>+5</Button>}
                        {maxQty >= 10 && <Button size="small" variant="outlined" onClick={() => handleLoad(wh.id, 10)}>+10</Button>}
                        <Button size="small" variant="outlined" color="primary" disabled={!canLoad || maxQty === 0} onClick={() => handleLoad(wh.id, maxQty)}>Max</Button>
                        {isLoaded && <Button size="small" variant="outlined" color="error" onClick={() => handleUnload(wh.id)}>Clear</Button>}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

/**
 * Format the magazine loadout of an accelerator weapon for display.
 */
export function formatWeaponMagazineLoadout(weapon: InstalledWeapon): string {
  const loadout = weapon.magazineLoadout || [];
  if (loadout.length === 0) return 'Empty';
  const warheads = getWarheads();
  return loadout
    .map(item => {
      const wh = warheads.find(w => w.id === item.designId);
      return wh ? `${item.quantity}× ${wh.name}` : '';
    })
    .filter(Boolean)
    .join(', ');
}

/**
 * Get used capacity (in warhead size points) for a weapon's magazine.
 */
export function getWeaponMagazineUsedCapacity(weapon: InstalledWeapon): number {
  const loadout = weapon.magazineLoadout || [];
  if (loadout.length === 0) return 0;
  const warheads = getWarheads();
  return loadout.reduce((sum, item) => {
    const wh = warheads.find(w => w.id === item.designId);
    return sum + (wh ? wh.size * item.quantity : 0);
  }, 0);
}
