/**
 * Embarked Craft Section — shows assigned craft within the Hangars & Misc step.
 * Only visible when hangars or docking clamps are installed.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  Stack,
  Alert,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import type { EmbarkedCraft, BerthingType } from '../types/embarkedCraft';
import type { HangarMiscStats } from '../types/hangarMisc';
import { calculateEmbarkedCraftStats, validateCraftAssignment, createEmbarkedCraft } from '../services/embarkedCraftService';
import { formatCost } from '../services/formatters';
import { CraftPickerDialog, type CraftPickerResult } from './CraftPickerDialog';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { scrollableTableContainerSx, stickyFirstColumnHeaderSx, stickyFirstColumnCellSx } from '../constants/tableStyles';

interface EmbarkedCraftSectionProps {
  embarkedCraft: EmbarkedCraft[];
  onEmbarkedCraftChange: (craft: EmbarkedCraft[]) => void;
  hangarMiscStats: HangarMiscStats;
  carrierHullHp: number;
}

export function EmbarkedCraftSection({
  embarkedCraft,
  onEmbarkedCraftChange,
  hangarMiscStats,
  carrierHullHp,
}: EmbarkedCraftSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBerthing, setPickerBerthing] = useState<BerthingType>('hangar');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const stats = useMemo(() => calculateEmbarkedCraftStats(embarkedCraft), [embarkedCraft]);

  const hasHangars = hangarMiscStats.totalHangarCapacity > 0;
  const hasDocking = hangarMiscStats.totalDockingCapacity > 0;

  const hangarCraftList = useMemo(() => embarkedCraft.filter(c => c.berthing === 'hangar'), [embarkedCraft]);
  const dockingCraftList = useMemo(() => embarkedCraft.filter(c => c.berthing === 'docking'), [embarkedCraft]);

  const handleOpenPicker = useCallback((berthing: BerthingType) => {
    setPickerBerthing(berthing);
    setPickerOpen(true);
  }, []);

  const handleCraftSelected = useCallback((result: CraftPickerResult) => {
    const newCraft = createEmbarkedCraft(
      result.filePath,
      result.name,
      result.hullHp,
      result.hullName,
      1,
      pickerBerthing,
      result.designCost,
    );
    onEmbarkedCraftChange([...embarkedCraft, newCraft]);
  }, [embarkedCraft, onEmbarkedCraftChange, pickerBerthing]);

  const handleRemove = useCallback((id: string) => {
    onEmbarkedCraftChange(embarkedCraft.filter(c => c.id !== id));
  }, [embarkedCraft, onEmbarkedCraftChange]);

  const handleStartEdit = useCallback((craft: EmbarkedCraft) => {
    setEditingId(craft.id);
    setEditQuantity(craft.quantity);
  }, []);

  const handleSaveEdit = useCallback((craft: EmbarkedCraft) => {
    const validationError = validateCraftAssignment(
      craft.hullHp,
      craft.name,
      editQuantity,
      craft.berthing,
      carrierHullHp,
      hangarMiscStats,
      embarkedCraft,
      craft.id,
    );
    if (validationError) {
      // Revert — keep old quantity
      setEditingId(null);
      return;
    }
    onEmbarkedCraftChange(
      embarkedCraft.map(c => c.id === craft.id ? { ...c, quantity: editQuantity } : c),
    );
    setEditingId(null);
  }, [editQuantity, carrierHullHp, hangarMiscStats, embarkedCraft, onEmbarkedCraftChange]);

  const handleClearAll = useCallback(() => {
    onEmbarkedCraftChange([]);
    setClearAllOpen(false);
  }, [onEmbarkedCraftChange]);

  const renderCraftTable = (craftList: EmbarkedCraft[], berthing: BerthingType) => {
    const capacity = berthing === 'hangar' ? hangarMiscStats.totalHangarCapacity : hangarMiscStats.totalDockingCapacity;
    const used = berthing === 'hangar' ? stats.totalHangarHpUsed : stats.totalDockingHpUsed;

    return (
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="subtitle2">
            {berthing === 'hangar' ? 'Hangar Bay' : 'Docking Clamps'}
          </Typography>
          <Chip
            label={`${used} / ${capacity} HP`}
            size="small"
            color={used > capacity ? 'error' : used === capacity ? 'success' : 'default'}
            variant="outlined"
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => handleOpenPicker(berthing)}
            disabled={used >= capacity}
          >
            Add Craft
          </Button>
        </Stack>

        {craftList.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1, mb: 1 }}>
            No craft assigned to {berthing === 'hangar' ? 'hangars' : 'docking clamps'}.
          </Typography>
        ) : (
          <TableContainer sx={{ ...scrollableTableContainerSx }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...stickyFirstColumnHeaderSx, minWidth: 160 }}>Name</TableCell>
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
                {craftList.map(craft => (
                  <TableRow key={craft.id} hover>
                    <TableCell sx={{ ...stickyFirstColumnCellSx, minWidth: 160 }}>
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
                      {editingId === craft.id ? (
                        <TextField
                          size="small"
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          onBlur={() => handleSaveEdit(craft)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(craft); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                          sx={{ width: 60 }}
                          slotProps={{ htmlInput: { min: 1 } }}
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
                          <IconButton size="small" onClick={() => handleStartEdit(craft)}>
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
      </Box>
    );
  };

  const invalidCraft = embarkedCraft.filter(c => !c.fileValid);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Embarked Craft
        </Typography>
        <Chip
          label={`Cost: ${formatCost(stats.totalEmbarkedCost)}`}
          size="small"
          color="default"
          variant="outlined"
        />
        {embarkedCraft.length > 0 && (
          <Box sx={{ flexGrow: 1 }} />
        )}
        {embarkedCraft.length > 0 && (
          <Tooltip title="Remove all embarked craft">
            <Button
              size="small"
              color="error"
              startIcon={<ClearAllIcon />}
              onClick={() => setClearAllOpen(true)}
            >
              Clear All
            </Button>
          </Tooltip>
        )}
      </Stack>

      {invalidCraft.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {invalidCraft.length} design file{invalidCraft.length !== 1 ? 's' : ''} not found.
          Cost data may be stale. Re-save the design to update.
        </Alert>
      )}

      {hasHangars && renderCraftTable(hangarCraftList, 'hangar')}
      {hasDocking && renderCraftTable(dockingCraftList, 'docking')}

      <CraftPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleCraftSelected}
        berthing={pickerBerthing}
        carrierHullHp={carrierHullHp}
      />

      <ConfirmDialog
        open={clearAllOpen}
        title="Clear All Embarked Craft"
        message="Remove all embarked craft assignments? This cannot be undone."
        confirmLabel="Clear All"
        onConfirm={handleClearAll}
        onCancel={() => setClearAllOpen(false)}
      />
    </Paper>
  );
}
