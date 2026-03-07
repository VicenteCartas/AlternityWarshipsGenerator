/**
 * Inline edit form for managing craft loaded in a specific hangar or docking clamp system.
 * Modeled after LaunchSystemEditForm — shows capacity, current loadout, and add/remove controls.
 */

import { useState, useCallback, useMemo } from 'react';
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
  TextField,
  Stack,
  Tooltip,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { BerthingType } from '../types/embarkedCraft';
import { formatCost } from '../services/formatters';
import {
  getSystemBerthingType,
  getSystemCraftCapacity,
  getSystemUsedCapacity,
  getSystemRemainingCapacity,
  validateCraftForSystem,
  createLoadedCraft,
  removeCraftFromSystem,
  updateCraftQuantity,
  addCraftToSystem,
} from '../services/embarkedCraftService';
import { CraftPickerDialog, type CraftPickerResult } from './CraftPickerDialog';
import { ConfirmDialog } from './shared';

interface HangarCraftEditFormProps {
  system: InstalledHangarMiscSystem;
  carrierHullHp: number;
  /** Update the parent's systems array with the modified system */
  onSystemChange: (updatedSystem: InstalledHangarMiscSystem) => void;
}

export function HangarCraftEditForm({
  system,
  carrierHullHp,
  onSystemChange,
}: HangarCraftEditFormProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingCraftId, setEditingCraftId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const berthing = getSystemBerthingType(system) as BerthingType;
  const capacity = getSystemCraftCapacity(system);
  const used = getSystemUsedCapacity(system);
  const remaining = getSystemRemainingCapacity(system);
  const loadout = system.loadout || [];

  const invalidCraft = useMemo(() => loadout.filter(c => !c.fileValid), [loadout]);

  const handleCraftSelected = useCallback((result: CraftPickerResult) => {
    const err = validateCraftForSystem(result.hullHp, result.name, 1, system, carrierHullHp);
    if (err) return; // CraftPickerDialog already filters, but safety check

    const craft = createLoadedCraft(
      result.filePath,
      result.name,
      result.hullHp,
      result.hullName,
      1,
      result.designCost,
    );
    onSystemChange(addCraftToSystem(system, craft));
  }, [system, carrierHullHp, onSystemChange]);

  const handleRemove = useCallback((craftId: string) => {
    onSystemChange(removeCraftFromSystem(system, craftId));
  }, [system, onSystemChange]);

  const handleStartEdit = useCallback((craftId: string, currentQty: number) => {
    setEditingCraftId(craftId);
    setEditQuantity(currentQty);
  }, []);

  const handleSaveEdit = useCallback((craftId: string) => {
    const craft = loadout.find(c => c.id === craftId);
    if (!craft) { setEditingCraftId(null); return; }

    // Validate: check capacity with new quantity (subtract old, add new)
    const oldHp = craft.hullHp * craft.quantity;
    const newHp = craft.hullHp * editQuantity;
    const delta = newHp - oldHp;
    if (delta > remaining) {
      // Not enough capacity — revert
      setEditingCraftId(null);
      return;
    }

    onSystemChange(updateCraftQuantity(system, craftId, editQuantity));
    setEditingCraftId(null);
  }, [loadout, editQuantity, remaining, system, onSystemChange]);

  const handleClearAll = useCallback(() => {
    onSystemChange({ ...system, loadout: [] });
    setClearAllOpen(false);
  }, [system, onSystemChange]);

  return (
    <Box sx={{ mt: 1.5, mb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="subtitle2">
          Embarked Craft (Capacity: {used}/{capacity})
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setPickerOpen(true)}
          disabled={remaining <= 0}
        >
          Add Craft
        </Button>
        {loadout.length > 0 && (
          <Tooltip title="Remove all craft from this system">
            <Button
              size="small"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={() => setClearAllOpen(true)}
            >
              Clear
            </Button>
          </Tooltip>
        )}
      </Stack>

      {invalidCraft.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          {invalidCraft.length} design file{invalidCraft.length !== 1 ? 's' : ''} not found.
          Cost data may be stale.
        </Alert>
      )}

      {loadout.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mb: 1 }}>
          No craft loaded. Click "Add Craft" to assign designs.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 160 }}>Name</TableCell>
                <TableCell>Hull</TableCell>
                <TableCell align="right">HP</TableCell>
                <TableCell align="right">Qty</TableCell>
                <TableCell align="right">Total HP</TableCell>
                <TableCell align="right">Unit Cost</TableCell>
                <TableCell align="right">Total Cost</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadout.map(craft => (
                <TableRow key={craft.id}>
                  <TableCell sx={{ minWidth: 160 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {!craft.fileValid && (
                        <Tooltip title="Design file not found — cost and details may be stale">
                          <WarningAmberIcon fontSize="small" color="warning" />
                        </Tooltip>
                      )}
                      <Typography variant="body2" noWrap>
                        {craft.name}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>{craft.hullName}</Typography>
                  </TableCell>
                  <TableCell align="right">{craft.hullHp}</TableCell>
                  <TableCell align="right">
                    {editingCraftId === craft.id ? (
                      <TextField
                        size="small"
                        type="number"
                        value={editQuantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const otherHpUsed = used - craft.hullHp * craft.quantity;
                          const maxQty = Math.floor((capacity - otherHpUsed) / craft.hullHp);
                          setEditQuantity(Math.max(1, Math.min(val, maxQty)));
                        }}
                        onBlur={() => handleSaveEdit(craft.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(craft.id);
                          if (e.key === 'Escape') setEditingCraftId(null);
                        }}
                        autoFocus
                        sx={{ width: 60 }}
                        slotProps={{ htmlInput: { min: 1, max: Math.floor((capacity - (used - craft.hullHp * craft.quantity)) / craft.hullHp) } }}
                      />
                    ) : (
                      craft.quantity
                    )}
                  </TableCell>
                  <TableCell align="right">{craft.hullHp * craft.quantity}</TableCell>
                  <TableCell align="right">{formatCost(craft.designCost)}</TableCell>
                  <TableCell align="right">{formatCost(craft.designCost * craft.quantity)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0} justifyContent="center">
                      <Tooltip title="Edit quantity">
                        <IconButton size="small" onClick={() => handleStartEdit(craft.id, craft.quantity)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remove">
                        <IconButton size="small" onClick={() => handleRemove(craft.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CraftPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCraftSelected}
        berthing={berthing}
        carrierHullHp={carrierHullHp}
        systemCapacity={remaining}
      />

      <ConfirmDialog
        open={clearAllOpen}
        title="Clear Craft"
        message={`Remove all craft from this ${berthing === 'hangar' ? 'hangar' : 'docking clamp'}?`}
        confirmLabel="Clear"
        onConfirm={handleClearAll}
        onCancel={() => setClearAllOpen(false)}
      />
    </Box>
  );
}
