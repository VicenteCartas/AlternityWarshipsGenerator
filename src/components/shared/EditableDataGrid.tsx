import { useState, useCallback, useEffect } from 'react';
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
}

type EditingCell = { rowIndex: number; columnKey: string } | null;

/**
 * Generic editable data grid for the mod editor.
 * Supports inline cell editing, add/delete/duplicate rows, and import from base.
 */
export function EditableDataGrid({ columns, rows, onChange, defaultItem, baseData, activeModsData, disableAdd, disableDelete }: EditableDataGridProps) {
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<unknown>('');
  const [importAnchor, setImportAnchor] = useState<HTMLElement | null>(null);
  const [importSource, setImportSource] = useState<'base' | 'active'>('base');

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
    onChange(updated);
    setEditingCell(null);
  }, [editingCell, editValue, columns, rows, onChange]);

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
    onChange([...rows, newRow]);
  }, [defaultItem, rows, onChange]);

  const handleDeleteRow = useCallback((index: number) => {
    const updated = rows.filter((_, i) => i !== index);
    onChange(updated);
  }, [rows, onChange]);

  const handleDuplicateRow = useCallback((index: number) => {
    const source = rows[index];
    const copy = { ...source, id: `${source.id}-copy-${Date.now()}` };
    const updated = [...rows];
    updated.splice(index + 1, 0, copy);
    onChange(updated);
  }, [rows, onChange]);

  const handleImportFromBase = useCallback((item: Record<string, unknown>) => {
    // Strip _source tag when importing
    const { _source, ...cleanItem } = item;
    void _source;
    const exists = rows.some(r => r.id === cleanItem.id);
    if (exists) {
      // Override existing
      const updated = rows.map(r => r.id === cleanItem.id ? { ...cleanItem } : r);
      onChange(updated);
    } else {
      onChange([...rows, { ...cleanItem }]);
    }
    setImportAnchor(null);
  }, [rows, onChange]);

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
    onChange(updated);
  }, [columns, rows, onChange]);

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
        return <Typography variant="body2">{opt?.label ?? String(value ?? '')}</Typography>;
      }
      default:
        return <Typography variant="body2" noWrap>{String(value)}</Typography>;
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
    setEditingCell(null);
    setPopoverAnchor(null);
    setPopoverRowIndex(-1);
    setPopoverColumnKey('');
  }, [columns]);

  const handlePopoverClick = (e: React.MouseEvent<HTMLElement>, rowIndex: number, columnKey: string) => {
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
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        {!disableAdd && (
          <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} variant="outlined">
            Add Row
          </Button>
        )}
        {baseData && baseData.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={e => { setImportSource('base'); setImportAnchor(e.currentTarget); }}
          >
            Import from Base Game ({baseData.length})
          </Button>
        )}
        {activeModsData && activeModsData.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={e => { setImportSource('active'); setImportAnchor(e.currentTarget); }}
          >
            Import from Active Mods ({activeModsData.length})
          </Button>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {rows.length} item{rows.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
        <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 90, fontWeight: 600, minWidth: 90, maxWidth: 90 }} align="center">Actions</TableCell>
              {columns.map(col => (
                <TableCell key={col.key} sx={{ fontWeight: 600, width: col.width || 80, minWidth: col.width || 80, maxWidth: col.width || 80, whiteSpace: 'nowrap' }}>
                  {col.label}
                  {col.required && <Typography component="span" color="error" sx={{ ml: 0.5 }}>*</Typography>}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    No items. Click &quot;Add Row&quot; to create one.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow key={rowIndex} hover sx={{ height: 37 }}>
                  <TableCell align="center" sx={{ py: 0.5, whiteSpace: 'nowrap', width: 90, minWidth: 90, maxWidth: 90 }}>
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
                  </TableCell>
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
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              handleCellChange(rowIndex, col.key, !cellValue);
                            }
                          }}
                          sx={{ 
                            py: 0.5, 
                            cursor: 'pointer',
                            '&:focus': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' }
                          }}
                        >
                          <Checkbox
                            checked={!!cellValue}
                            size="small"
                            onChange={e => handleCellChange(rowIndex, col.key, e.target.checked)}
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
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              handlePopoverClick(e as unknown as React.MouseEvent<HTMLElement>, rowIndex, col.key);
                            }
                          }}
                          sx={{ 
                            py: 0.5, 
                            cursor: 'pointer', 
                            border: cellError ? '1px solid red' : undefined,
                            '&:focus': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' }
                          }}
                          onClick={e => handlePopoverClick(e, rowIndex, col.key)}
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
                        tabIndex={0}
                        onFocus={() => !isEditing(rowIndex, col.key) && startEdit(rowIndex, col.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            startEdit(rowIndex, col.key);
                          }
                        }}
                        sx={{
                          py: 0.5,
                          cursor: 'pointer',
                          border: cellError && !isEditing(rowIndex, col.key) ? '1px solid' : undefined,
                          borderColor: cellError && !isEditing(rowIndex, col.key) ? 'error.main' : undefined,
                          '&:hover': { backgroundColor: 'action.hover' },
                          '&:focus': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '-2px' },
                          width: col.width || 80,
                          minWidth: col.width || 80,
                          maxWidth: col.width || 80,
                          overflow: 'hidden',
                        }}
                        onClick={() => !isEditing(rowIndex, col.key) && startEdit(rowIndex, col.key)}
                      >
                        {isEditing(rowIndex, col.key)
                          ? renderCellEditor(rowIndex, col)
                          : (
                            <Tooltip title={cellError || ''} placement="top">
                              <span>{renderCellDisplay(cellValue, col)}</span>
                            </Tooltip>
                          )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
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
            Select an item to import
          </Typography>
          <Table size="small" sx={{ minWidth: 400 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ py: 0.5, width: 60, fontWeight: 600, fontSize: '0.75rem' }}>Status</TableCell>
                {columns.filter(c => c.key !== 'description').map(col => (
                  <TableCell key={col.key} sx={{ py: 0.5, fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {((importSource === 'base' ? baseData : activeModsData) || []).map((item, i) => {
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
