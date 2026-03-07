/**
 * Inline edit form for managing ordnance loaded in a Magazine system.
 * Follows the same pattern as LaunchSystemEditForm ordnance loading.
 */

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
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { OrdnanceDesign, LoadedOrdnance } from '../types/ordnance';
import { formatCost } from '../services/formatters';
import { getUsedCapacity } from '../services/ordnanceService';

interface MagazineOrdnanceEditFormProps {
  system: InstalledHangarMiscSystem;
  ordnanceDesigns: OrdnanceDesign[];
  onSystemChange: (updatedSystem: InstalledHangarMiscSystem) => void;
}

export function MagazineOrdnanceEditForm({
  system,
  ordnanceDesigns,
  onSystemChange,
}: MagazineOrdnanceEditFormProps) {
  const [currentLoadout, setCurrentLoadout] = useState<LoadedOrdnance[]>(system.ordnanceLoadout || []);
  const totalCapacity = system.capacity || 0;
  const usedCap = getUsedCapacity(currentLoadout, ordnanceDesigns);
  const remainingCap = totalCapacity - usedCap;

  // All ordnance designs are applicable (magazines accept missiles, bombs, and mines)
  const applicableDesigns = ordnanceDesigns;

  // Sync loadout changes to parent immediately
  const updateLoadout = (newLoadout: LoadedOrdnance[]) => {
    setCurrentLoadout(newLoadout);
    onSystemChange({ ...system, ordnanceLoadout: newLoadout.length > 0 ? newLoadout : undefined });
  };

  const handleLoad = (designId: string, qty: number) => {
    const design = ordnanceDesigns.find(d => d.id === designId);
    if (!design || design.capacityRequired * qty > remainingCap) return;

    const existing = currentLoadout.find(item => item.designId === designId);
    if (existing) {
      updateLoadout(currentLoadout.map(item =>
        item.designId === designId ? { ...item, quantity: item.quantity + qty } : item
      ));
    } else {
      updateLoadout([...currentLoadout, { designId, quantity: qty }]);
    }
  };

  const handleUnload = (designId: string) => {
    updateLoadout(currentLoadout.filter(item => item.designId !== designId));
  };

  // Format loadout contents for display (used externally too)
  const formatLoadoutSummary = useMemo(() => {
    if (currentLoadout.length === 0) return '';
    return currentLoadout
      .map(item => {
        const design = ordnanceDesigns.find(d => d.id === item.designId);
        return design ? `${item.quantity}× ${design.name}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }, [currentLoadout, ordnanceDesigns]);

  return (
    <Box sx={{ mt: 1.5, mb: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Ordnance Loadout (Capacity: {usedCap}/{totalCapacity})
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
                        onClick={() => handleUnload(item.designId)}
                        aria-label="Unload ordnance"
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
          No ordnance designs available. Create designs in the Weapons step.
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
                        <Button size="small" variant="outlined" disabled={!canLoad} onClick={() => handleLoad(design.id, 1)}>+1</Button>
                        {maxQty >= 5 && <Button size="small" variant="outlined" onClick={() => handleLoad(design.id, 5)}>+5</Button>}
                        {maxQty >= 10 && <Button size="small" variant="outlined" onClick={() => handleLoad(design.id, 10)}>+10</Button>}
                        <Button size="small" variant="outlined" color="primary" disabled={!canLoad || maxQty === 0} onClick={() => handleLoad(design.id, maxQty)}>Max</Button>
                        {isLoaded && <Button size="small" variant="outlined" color="error" onClick={() => handleUnload(design.id)}>Clear</Button>}
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
 * Format the ordnance loadout contents of a magazine for display in the installed row.
 */
export function formatMagazineLoadout(system: InstalledHangarMiscSystem, ordnanceDesigns: OrdnanceDesign[]): string {
  const loadout = system.ordnanceLoadout || [];
  if (loadout.length === 0) return 'Empty';
  return loadout
    .map(item => {
      const design = ordnanceDesigns.find(d => d.id === item.designId);
      return design ? `${item.quantity}× ${design.name}` : '';
    })
    .filter(Boolean)
    .join(', ');
}
