import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  Checkbox,
  IconButton,
  Button,
  Tooltip,
  Typography,
  Chip,
  Stack,
  Popover,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import type { ColumnDef } from '../../services/modEditorSchemas';
import { validateField } from '../../services/modValidationService';
import type { TechTrack } from '../../types/common';
import { ALL_TECH_TRACK_CODES, getTechTrackName } from '../../services/formatters';

interface EditableDataGridProps {
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
  defaultItem: Record<string, unknown>;
  baseData?: Record<string, unknown>[];
  activeModsData?: Record<string, unknown>[];
  disableAdd?: boolean;
  disableDelete?: boolean;
  /** When true, hides all editing controls and makes the grid display-only. */
  readOnly?: boolean;
  /** Optional function that returns an sx color string for a row's left-border highlight, or undefined for no highlight. */
  rowHighlightColor?: (row: Record<string, unknown>, index: number) => string | undefined;
}

type EditingCell = { rowIndex: number; columnKey: string } | null;

// Helpers for dot-notation keys (e.g. "damageTrack.stun")
const getNestedValue = (obj: Record<string, unknown>, key: string): unknown => {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const setNestedValue = (obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> => {
  const parts = key.split('.');
  if (parts.length === 1) return { ...obj, [key]: value };
  const [head, ...rest] = parts;
  const child = (obj[head] && typeof obj[head] === 'object' ? obj[head] : {}) as Record<string, unknown>;
  return { ...obj, [head]: setNestedValue(child, rest.join('.'), value) };
};

/**
 * Generic editable data grid for the mod editor.
 * Supports inline cell editing, add/delete/duplicate rows, and import from base.
 */
export function EditableDataGrid({ columns, rows, onChange, defaultItem, baseData, activeModsData, disableAdd, disableDelete, readOnly, rowHighlightColor }: EditableDataGridProps) {
  // Filter activeModsData to only items that differ from base (mod-contributed items)
  const modOnlyData = useMemo(() => {
    if (!activeModsData || !baseData) return activeModsData;
    const baseMap = new Map(baseData.map(item => [item.id as string, item]));
    const stripSource = (item: Record<string, unknown>) => {
      const { _source, ...rest } = item;
      void _source;
      return rest;
    };
    return activeModsData.filter(item => {
      const baseItem = baseMap.get(item.id as string);
      if (!baseItem) return true; // New item not in base — mod-contributed
      return JSON.stringify(stripSource(item)) !== JSON.stringify(stripSource(baseItem)); // Changed from base — mod-contributed
    });
  }, [activeModsData, baseData]);

  // --- Undo / Redo ---
  const MAX_UNDO = 50;
  const undoStack = useRef<Record<string, unknown>[][]>([]);
  const redoStack = useRef<Record<string, unknown>[][]>([]);
  const [undoLen, setUndoLen] = useState(0);
  const [redoLen, setRedoLen] = useState(0);
  /** Track the latest rows so the keyboard handler always sees fresh data */
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; });

  /** Wraps onChange to push current state onto the undo stack */
  const onChangeWithHistory = useCallback((nextRows: Record<string, unknown>[]) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), rowsRef.current];
    setUndoLen(undoStack.current.length);
    redoStack.current = [];
    setRedoLen(0);
    onChange(nextRows);
  }, [onChange]);

  const canUndo = undoLen > 0;
  const canRedo = redoLen > 0;

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    setUndoLen(undoStack.current.length);
    redoStack.current = [...redoStack.current, rowsRef.current];
    setRedoLen(redoStack.current.length);
    onChange(prev);
  }, [onChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    setRedoLen(redoStack.current.length);
    undoStack.current = [...undoStack.current, rowsRef.current];
    setUndoLen(undoStack.current.length);
    onChange(next);
  }, [onChange]);

  // Reset stacks when switching sections (columns change)
  useEffect(() => {
    undoStack.current = [];
    redoStack.current = [];
    setUndoLen(0); // eslint-disable-line react-hooks/set-state-in-effect -- syncing undo tracking state
    setRedoLen(0);
  }, [columns]);

  // Keyboard shortcuts: Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); handleRedo(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<unknown>('');
  const [importAnchor, setImportAnchor] = useState<HTMLElement | null>(null);
  const [importSource, setImportSource] = useState<'base' | 'active'>('base');

  const commitEdit = useCallback((overrideValue?: unknown) => {
    if (!editingCell) return;
    const { rowIndex, columnKey } = editingCell;
    const col = columns.find(c => c.key === columnKey);
    if (!col) return;

    let finalValue = overrideValue !== undefined ? overrideValue : editValue;
    // Type coercion
    if (col.type === 'number') {
      if (finalValue === '' || finalValue === undefined || finalValue === null) {
        finalValue = undefined;
      } else {
        const num = parseFloat(String(finalValue));
        finalValue = isNaN(num) ? undefined : num;
      }
    } else if (col.type === 'progressLevel') {
      if (finalValue === '' || finalValue === undefined || finalValue === null) {
        finalValue = undefined;
      } else {
        const num = parseInt(String(finalValue), 10);
        finalValue = isNaN(num) ? undefined : num;
      }
    } else if (col.type === 'json') {
      if (typeof finalValue === 'string') {
        try { finalValue = JSON.parse(finalValue); } catch { /* keep as string, validation will catch */ }
      }
    }

    const updated = [...rows];
    updated[rowIndex] = setNestedValue(updated[rowIndex], columnKey, finalValue);
    onChangeWithHistory(updated);
    setEditingCell(null);
  }, [editingCell, editValue, columns, rows, onChangeWithHistory]);

  const startEdit = useCallback((rowIndex: number, columnKey: string) => {
    const col = columns.find(c => c.key === columnKey);
    if (!col) return;
    const value = getNestedValue(rows[rowIndex], columnKey);
    if (col.type === 'json') {
      setEditValue(typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? ''));
    } else {
      setEditValue(value ?? '');
    }
    setEditingCell({ rowIndex, columnKey });
  }, [columns, rows]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditingCell(null); }
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!editingCell) return;
      
      const { rowIndex, columnKey } = editingCell;
      const colIndex = columns.findIndex(c => c.key === columnKey);
      
      let nextColIndex = colIndex + (e.shiftKey ? -1 : 1);
      let nextRowIndex = rowIndex;
      
      let found = false;
      while (nextRowIndex >= 0 && nextRowIndex < rows.length) {
        while (nextColIndex >= 0 && nextColIndex < columns.length) {
          found = true;
          break;
        }
        if (found) break;
        nextRowIndex += e.shiftKey ? -1 : 1;
        nextColIndex = e.shiftKey ? columns.length - 1 : 0;
      }
      
      commitEdit();
      
      if (found) {
        const nextColKey = columns[nextColIndex].key;
        const nextCol = columns[nextColIndex];
        
        setTimeout(() => {
          if (nextCol.type === 'boolean' || nextCol.type === 'techTracks' || nextCol.type === 'multiselect') {
            // For these types, we don't enter "edit mode" with an input field,
            // but we want to focus the cell so the user can interact with it.
            const cellElement = document.querySelector(`td[data-row="${nextRowIndex}"][data-col="${nextColKey}"]`) as HTMLElement;
            if (cellElement) {
              cellElement.focus();
            }
          } else {
            startEdit(nextRowIndex, nextColKey);
          }
        }, 0);
      }
    }
  }, [commitEdit, editingCell, columns, rows, startEdit]);

  const handleAddRow = useCallback(() => {
    const newRow = { ...defaultItem, id: `new-item-${Date.now()}` };
    onChangeWithHistory([...rows, newRow]);
  }, [defaultItem, rows, onChangeWithHistory]);

  const handleDeleteRow = useCallback((index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChangeWithHistory(updated);
  }, [rows, onChangeWithHistory]);

  const handleDuplicateRow = useCallback((index: number) => {
    const source = rows[index];
    const copy = { ...source, id: `${source.id}-copy-${Date.now()}` };
    const updated = [...rows];
    updated.splice(index + 1, 0, copy);
    onChangeWithHistory(updated);
  }, [rows, onChangeWithHistory]);

  const handleMoveRow = useCallback((index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= rows.length) return;
    const updated = [...rows];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    onChangeWithHistory(updated);
  }, [rows, onChangeWithHistory]);

  const handleImportFromBase = useCallback((item: Record<string, unknown>) => {
    // Strip _source tag when importing
    const { _source, ...cleanItem } = item;
    void _source;
    const exists = rows.some(r => r.id === cleanItem.id);
    if (exists) {
      // Override existing
      const updated = rows.map(r => r.id === cleanItem.id ? { ...cleanItem } : r);
      onChangeWithHistory(updated);
    } else {
      onChangeWithHistory([...rows, { ...cleanItem }]);
    }
    setImportAnchor(null);
  }, [rows, onChangeWithHistory]);

  const handleCellChange = useCallback((rowIndex: number, columnKey: string, value: unknown) => {
    const col = columns.find(c => c.key === columnKey);
    if (!col) return;

    let finalValue = value;
    if (col.type === 'number' || col.type === 'progressLevel') {
      const num = parseFloat(String(value));
      finalValue = isNaN(num) ? 0 : num;
    }

    const updated = [...rows];
    updated[rowIndex] = setNestedValue(updated[rowIndex], columnKey, finalValue);
    onChangeWithHistory(updated);
  }, [columns, rows, onChangeWithHistory]);

  const renderCellDisplay = (value: unknown, col: ColumnDef) => {
    if (value === undefined || value === null) return <Typography variant="caption" color="text.disabled">—</Typography>;

    switch (col.type) {
      case 'boolean':
        return <Checkbox checked={!!value} size="small" readOnly tabIndex={-1} sx={{ p: 0 }} />;
      case 'techTracks':
      case 'multiselect': {
        const items = (Array.isArray(value) ? value : []) as string[];
        if (items.length === 0) return <Typography variant="caption" color="text.disabled">—</Typography>;
        return <Typography variant="caption">{items.join(', ')}</Typography>;
      }
      case 'json':
        return (
          <Tooltip title={<pre style={{ margin: 0, fontSize: '0.75rem' }}>{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}</pre>}>
            <Typography variant="caption" noWrap sx={{ maxWidth: col.width || 120, display: 'block' }}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Typography>
          </Tooltip>
        );
      case 'select':
      case 'progressLevel': {
        const opt = col.options?.find(o => o.value === String(value ?? ''));
        return <Typography variant="body2" noWrap>{opt?.label ?? String(value ?? '')}</Typography>;
      }
      default:
        return <Typography variant="body2" noWrap>{String(value)}</Typography>;
    }
  };

  /**
   * Returns a plain-text version of the cell value for use in truncation tooltips.
   * Returns empty string for short/non-textual values that don't benefit from tooltips.
   */
  const getCellDisplayText = (value: unknown, col: ColumnDef): string => {
    if (value === undefined || value === null) return '';
    switch (col.type) {
      case 'boolean':
        return '';
      case 'techTracks':
      case 'multiselect':
        return '';
      case 'json':
        return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      case 'select':
      case 'progressLevel': {
        const opt = col.options?.find(o => o.value === String(value ?? ''));
        return opt?.label ?? String(value ?? '');
      }
      default: {
        const text = String(value);
        // Only show tooltip for values likely to be clipped
        return text.length > 6 ? text : '';
      }
    }
  };

  const renderCellEditor = (_rowIndex: number, col: ColumnDef) => {
    const value = editValue;
    let errorMsg = validateField(value, col);

    // Add duplicate ID warning in editor
    if (col.key === 'id' && typeof value === 'string' && duplicateIds.has(value)) {
      // Only show duplicate warning if it's not the original value of the cell we're editing,
      // or if it IS the original value but it was already a duplicate.
      // Actually, since duplicateIds is computed from rows, if we type a new duplicate,
      // it won't be in duplicateIds until we commit.
      // To do real-time duplicate checking while typing, we'd need to check against other rows.
      const isDuplicate = rows.some((r, i) => i !== _rowIndex && r.id === value);
      if (isDuplicate) {
        errorMsg = errorMsg ? `${errorMsg} | Duplicate ID` : 'Duplicate ID';
      }
    }

    switch (col.type) {
      case 'boolean':
        return null; // Handled inline, not via edit mode
      case 'select':
      case 'progressLevel':
        return (
          <Select
            value={String(value ?? '')}
            onChange={e => { 
              setEditValue(e.target.value); 
              // When a value is selected, commit the edit immediately
              // This will close the editor and return focus to the cell
              // We need to pass the value directly to commitEdit because state updates are async
              setTimeout(() => commitEdit(e.target.value), 0);
            }}
            onBlur={() => commitEdit()}
            onKeyDown={handleKeyDown}
            size="small"
            autoFocus
            defaultOpen
            fullWidth
            sx={{ fontSize: '0.875rem', '& .MuiSelect-select': { py: '4px', px: '8px' } }}
          >
            {(col.options || []).map(o => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        );
      case 'techTracks':
      case 'multiselect':
        return null; // Handled via popover
      case 'json':
        return (
          <Tooltip title={errorMsg || ''} placement="top" open={!!errorMsg}>
            <TextField
              value={String(value ?? '')}
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => commitEdit()}
              onKeyDown={handleKeyDown}
              onFocus={e => e.target.select()}
              size="small"
              multiline
              maxRows={4}
              autoFocus
              fullWidth
              error={!!errorMsg}
              sx={{ fontSize: '0.75rem' }}
            />
          </Tooltip>
        );
      default:
        return (
          <Tooltip title={errorMsg || ''} placement="top" open={!!errorMsg}>
            <TextField
              value={String(value ?? '')}
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => commitEdit()}
              onKeyDown={handleKeyDown}
              onFocus={e => e.target.select()}
              size="small"
              autoFocus
              fullWidth
              error={!!errorMsg}
              slotProps={{
                htmlInput: {
                  inputMode: col.type === 'number' ? 'decimal' : undefined,
                  style: { fontSize: '0.875rem', padding: '4px 8px' },
                },
              }}
              sx={{
                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' },
                '& input[type=number]': { MozAppearance: 'textfield' },
              }}
            />
          </Tooltip>
        );
    }
  };

  // Tech tracks / Multiselect popover state
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverRowIndex, setPopoverRowIndex] = useState<number>(-1);
  const [popoverColumnKey, setPopoverColumnKey] = useState<string>('');

  // Reset transient UI state when switching sections (columns change)
  useEffect(() => {
    setEditingCell(null); // eslint-disable-line react-hooks/set-state-in-effect -- resetting UI state on section change
    setPopoverAnchor(null);
    setPopoverRowIndex(-1);
    setPopoverColumnKey('');
  }, [columns]);

  const handlePopoverClick = (e: React.SyntheticEvent<HTMLElement>, rowIndex: number, columnKey: string) => {
    setPopoverAnchor(e.currentTarget);
    setPopoverRowIndex(rowIndex);
    setPopoverColumnKey(columnKey);
  };

  const handlePopoverToggle = (item: string) => {
    if (popoverRowIndex < 0 || !popoverColumnKey || !rows[popoverRowIndex]) return;
    const current = (rows[popoverRowIndex][popoverColumnKey] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter(t => t !== item)
      : [...current, item];
    handleCellChange(popoverRowIndex, popoverColumnKey, updated);
  };

  const isEditing = (rowIndex: number, columnKey: string) =>
    editingCell?.rowIndex === rowIndex && editingCell?.columnKey === columnKey;

  // Compute duplicate IDs for validation warning
  const duplicateIds = new Set<string>();
  const idCounts = new Map<string, number>();
  for (const row of rows) {
    const id = row.id as string;
    if (id) {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }
  }
  for (const [id, count] of idCounts.entries()) {
    if (count > 1) duplicateIds.add(id);
  }

  return (
    <Box>
      {/* Toolbar */}
      {!readOnly && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          {!disableAdd && (
            <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} variant="outlined">
              Add Row
            </Button>
          )}
          {baseData && baseData.length > 0 && (
            <Tooltip title="Copy items from the unmodded base game data into your mod for editing. Items with matching IDs will be updated." arrow>
              <Button
                size="small"
                variant="outlined"
                onClick={e => { setImportSource('base'); setImportAnchor(e.currentTarget); }}
              >
                Import from Base Game ({baseData.length})
              </Button>
            </Tooltip>
          )}
          {modOnlyData && modOnlyData.length > 0 && (
            <Tooltip title="Copy items added or changed by other active mods. Only shows items that differ from the base game." arrow>
              <Button
                size="small"
                variant="outlined"
                onClick={e => { setImportSource('active'); setImportAnchor(e.currentTarget); }}
              >
                Import from Active Mods ({modOnlyData.length})
              </Button>
            </Tooltip>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            {rows.length} item{rows.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton size="small" onClick={handleUndo} disabled={!canUndo}>
                <UndoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton size="small" onClick={handleRedo} disabled={!canRedo}>
                <RedoIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      )}
      {readOnly && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          {rows.length} item{rows.length !== 1 ? 's' : ''} after merge
        </Typography>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              {!readOnly && <TableCell sx={{ width: 130, fontWeight: 600, minWidth: 130, maxWidth: 130 }} align="center">Actions</TableCell>}
              {columns.map(col => (
                <TableCell key={col.key} sx={{ fontWeight: 600, width: col.width || 80, minWidth: col.width || 80, maxWidth: col.width || 80, whiteSpace: 'nowrap' }}>
                  {col.description ? (
                    <Tooltip title={col.description} arrow placement="top">
                      <span style={{ borderBottom: '1px dotted', cursor: 'help' }}>{col.label}</span>
                    </Tooltip>
                  ) : col.label}
                  {col.required && <Typography component="span" color="error" sx={{ ml: 0.5 }}>*</Typography>}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (readOnly ? 0 : 1)} align="center">
                  <Box sx={{ py: 3, px: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {readOnly ? 'No items in this section after merge.' : 'This section is empty.'}
                    </Typography>
                    {!readOnly && (
                      <Typography variant="caption" color="text.secondary">
                        {!disableAdd && 'Click "Add Row" to create a blank item, or use '}
                        {!disableAdd && baseData && baseData.length > 0 && '"Import from Base Game" to copy existing items into your mod for editing.'}
                        {!disableAdd && (!baseData || baseData.length === 0) && '"Add Row" to get started.'}
                        {disableAdd && baseData && baseData.length > 0 && 'Use "Import from Base Game" to copy the base item into your mod for editing.'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => {
                const highlightColor = rowHighlightColor?.(row, rowIndex);
                return (
                <TableRow key={rowIndex} hover sx={{ height: 37, ...(highlightColor ? { borderLeft: `4px solid ${highlightColor}` } : {}) }}>
                  {!readOnly && <TableCell align="center" sx={{ py: 0.5, whiteSpace: 'nowrap', width: 130, minWidth: 130, maxWidth: 130 }}>
                    {!disableAdd && rows.length > 1 && (
                      <>
                        <Tooltip title="Move up">
                          <span>
                            <IconButton size="small" onClick={() => handleMoveRow(rowIndex, 'up')} disabled={rowIndex === 0}>
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Move down">
                          <span>
                            <IconButton size="small" onClick={() => handleMoveRow(rowIndex, 'down')} disabled={rowIndex === rows.length - 1}>
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    {!disableAdd && (
                      <Tooltip title="Duplicate">
                        <IconButton size="small" onClick={() => handleDuplicateRow(rowIndex)}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!disableDelete && (
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteRow(rowIndex)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>}
                  {columns.map(col => {
                    const cellValue = getNestedValue(row, col.key);
                    let cellError = validateField(cellValue, col);
                    
                    // Add duplicate ID warning
                    if (col.key === 'id' && typeof cellValue === 'string' && duplicateIds.has(cellValue)) {
                      cellError = cellError ? `${cellError} | Duplicate ID` : 'Duplicate ID';
                    }

                    // Boolean: always show checkbox inline
                    if (col.type === 'boolean') {
                      return (
                        <TableCell 
                          key={col.key} 
                          data-row={rowIndex}
                          data-col={col.key}
                          tabIndex={readOnly ? -1 : 0}
                          onKeyDown={readOnly ? undefined : (e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              handleCellChange(rowIndex, col.key, !cellValue);
                            }
                          }}
                          sx={{ 
                            py: 0.5, 
                            cursor: readOnly ? 'default' : 'pointer',
                            '&:focus': readOnly ? {} : { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' }
                          }}
                        >
                          <Checkbox
                            checked={!!cellValue}
                            size="small"
                            disabled={readOnly}
                            onChange={readOnly ? undefined : e => handleCellChange(rowIndex, col.key, e.target.checked)}
                            tabIndex={-1}
                            sx={{ p: 0 }}
                          />
                        </TableCell>
                      );
                    }

                    // TechTracks / Multiselect: chip display + popover
                    if (col.type === 'techTracks' || col.type === 'multiselect') {
                      const items = (Array.isArray(cellValue) ? cellValue : []) as string[];
                      return (
                        <TableCell
                          key={col.key}
                          data-row={rowIndex}
                          data-col={col.key}
                          tabIndex={readOnly ? -1 : 0}
                          onKeyDown={readOnly ? undefined : (e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              handlePopoverClick(e, rowIndex, col.key);
                            }
                          }}
                          sx={{ 
                            py: 0.5, 
                            cursor: readOnly ? 'default' : 'pointer', 
                            border: cellError ? '1px solid red' : undefined,
                            '&:focus': readOnly ? {} : { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' }
                          }}
                          onClick={readOnly ? undefined : e => handlePopoverClick(e, rowIndex, col.key)}
                        >
                          {items.length > 0
                            ? items.map(t => {
                                const displayLabel = col.type === 'multiselect' && col.options 
                                  ? col.options.find(o => o.value === t)?.label || t 
                                  : t;
                                return <Chip key={t} label={displayLabel} size="small" sx={{ mr: 0.25, height: 20 }} />;
                              })
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                      );
                    }

                    // Editable cell
                    return (
                      <TableCell
                        key={col.key}
                        data-row={rowIndex}
                        data-col={col.key}
                        tabIndex={readOnly ? -1 : 0}
                        onFocus={readOnly ? undefined : () => !isEditing(rowIndex, col.key) && startEdit(rowIndex, col.key)}
                        onKeyDown={readOnly ? undefined : (e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            startEdit(rowIndex, col.key);
                          }
                        }}
                        sx={{
                          py: 0.5,
                          cursor: readOnly ? 'default' : 'pointer',
                          border: !readOnly && cellError && !isEditing(rowIndex, col.key) ? '1px solid' : undefined,
                          borderColor: !readOnly && cellError && !isEditing(rowIndex, col.key) ? 'error.main' : undefined,
                          '&:hover': readOnly ? {} : { backgroundColor: 'action.hover' },
                          '&:focus': readOnly ? {} : { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
                          width: col.width || 80,
                          minWidth: col.width || 80,
                          maxWidth: col.width || 80,
                          overflow: 'hidden',
                        }}
                        onClick={readOnly ? undefined : () => !isEditing(rowIndex, col.key) && startEdit(rowIndex, col.key)}
                      >
                        {isEditing(rowIndex, col.key)
                          ? renderCellEditor(rowIndex, col)
                          : (() => {
                            const displayText = getCellDisplayText(cellValue, col);
                            const tooltipText = cellError 
                              ? (displayText ? `${cellError}\n\n${displayText}` : cellError)
                              : displayText;
                            return (
                              <Tooltip title={tooltipText || ''} placement="top" enterDelay={400}>
                                <span>{renderCellDisplay(cellValue, col)}</span>
                              </Tooltip>
                            );
                          })()}
                      </TableCell>
                    );
                  })}
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Tech Track / Multiselect Popover */}
      <Popover
        open={!!popoverAnchor}
        anchorEl={popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: 280 }}>
          <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
            {popoverColumnKey === 'techTracks' ? 'Tech Tracks' : columns.find(c => c.key === popoverColumnKey)?.label || 'Select Options'}
          </Typography>
          {popoverColumnKey === 'techTracks' ? (
            ALL_TECH_TRACK_CODES.filter(t => t !== '-').map(track => {
              const current = popoverRowIndex >= 0 ? ((rows[popoverRowIndex]?.techTracks as TechTrack[]) || []) : [];
              return (
                <FormControlLabel
                  key={track}
                  control={
                    <Checkbox
                      checked={current.includes(track)}
                      onChange={() => handlePopoverToggle(track)}
                      size="small"
                    />
                  }
                  label={`${track} — ${getTechTrackName(track)}`}
                  sx={{ display: 'block', '& .MuiTypography-root': { fontSize: '0.8rem' } }}
                />
              );
            })
          ) : (
            columns.find(c => c.key === popoverColumnKey)?.options?.map(opt => {
              const current = popoverRowIndex >= 0 && rows[popoverRowIndex] ? ((rows[popoverRowIndex][popoverColumnKey] as string[]) || []) : [];
              return (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={current.includes(opt.value)}
                      onChange={() => handlePopoverToggle(opt.value)}
                      size="small"
                    />
                  }
                  label={opt.label}
                  sx={{ display: 'block', '& .MuiTypography-root': { fontSize: '0.8rem' } }}
                />
              );
            })
          )}
        </Box>
      </Popover>

      {/* Import from Base Popover */}
      <Popover
        open={!!importAnchor}
        anchorEl={importAnchor}
        onClose={() => setImportAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ maxHeight: 450, overflow: 'auto' }}>
          <Typography variant="caption" fontWeight={600} sx={{ display: 'block', px: 1.5, pt: 1, pb: 0.5 }}>
            Select an item to import — items with matching IDs will be updated, new IDs will be added
          </Typography>
          <Table size="small" sx={{ minWidth: 400 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.5, width: 60, fontWeight: 600, fontSize: '0.75rem' }}>Status</TableCell>
                {columns.filter(c => c.key !== 'description').map(col => (
                  <TableCell key={col.key} sx={{ py: 0.5, fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {col.description ? (
                      <Tooltip title={col.description} arrow placement="top">
                        <span style={{ borderBottom: '1px dotted', cursor: 'help' }}>{col.label}</span>
                      </Tooltip>
                    ) : col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {((importSource === 'base' ? baseData : modOnlyData) || []).map((item, i) => {
                const exists = rows.some(r => r.id === item.id);
                return (
                  <TableRow
                    key={i}
                    hover
                    onClick={() => handleImportFromBase(item)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ py: 0.25 }}>
                      {exists && <Chip label="override" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />}
                    </TableCell>
                    {columns.filter(c => c.key !== 'description').map(col => (
                      <TableCell key={col.key} sx={{ py: 0.25, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {renderCellDisplay(getNestedValue(item, col.key), col)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Popover>
    </Box>
  );
}
