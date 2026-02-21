import { useState, useCallback } from 'react';
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
}

type EditingCell = { rowIndex: number; columnKey: string } | null;

/**
 * Generic editable data grid for the mod editor.
 * Supports inline cell editing, add/delete/duplicate rows, and import from base.
 */
export function EditableDataGrid({ columns, rows, onChange, defaultItem, baseData }: EditableDataGridProps) {
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<unknown>('');
  const [importAnchor, setImportAnchor] = useState<HTMLElement | null>(null);

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

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    const { rowIndex, columnKey } = editingCell;
    const col = columns.find(c => c.key === columnKey);
    if (!col) return;

    let finalValue = editValue;
    // Type coercion
    if (col.type === 'number' || col.type === 'progressLevel') {
      const num = parseFloat(String(finalValue));
      finalValue = isNaN(num) ? 0 : num;
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
  }, [commitEdit]);

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
      case 'techTracks': {
        const tracks = (Array.isArray(value) ? value : []) as string[];
        if (tracks.length === 0) return <Typography variant="caption" color="text.disabled">—</Typography>;
        return <Typography variant="caption">{tracks.join(', ')}</Typography>;
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
        const opt = col.options?.find(o => o.value === String(value));
        return <Typography variant="body2">{opt?.label ?? String(value)}</Typography>;
      }
      default:
        return <Typography variant="body2" noWrap>{String(value)}</Typography>;
    }
  };

  const renderCellEditor = (_rowIndex: number, col: ColumnDef) => {
    const value = editValue;
    const errorMsg = validateField(value, col);

    switch (col.type) {
      case 'boolean':
        return null; // Handled inline, not via edit mode
      case 'select':
      case 'progressLevel':
        return (
          <Select
            value={String(value ?? '')}
            onChange={e => { setEditValue(e.target.value); }}
            onBlur={commitEdit}
            size="small"
            autoFocus
            fullWidth
            sx={{ fontSize: '0.875rem', '& .MuiSelect-select': { py: '4px', px: '8px' } }}
          >
            {(col.options || []).map(o => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </Select>
        );
      case 'techTracks':
        return null; // Handled via popover
      case 'json':
        return (
          <TextField
            value={String(value ?? '')}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            size="small"
            multiline
            maxRows={4}
            autoFocus
            fullWidth
            error={!!errorMsg}
            sx={{ fontSize: '0.75rem' }}
          />
        );
      default:
        return (
          <TextField
            value={String(value ?? '')}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onFocus={e => { if (col.type === 'number') e.target.select(); }}
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
        );
    }
  };

  // Tech tracks popover state
  const [techTrackAnchor, setTechTrackAnchor] = useState<HTMLElement | null>(null);
  const [techTrackRowIndex, setTechTrackRowIndex] = useState<number>(-1);

  const handleTechTrackClick = (e: React.MouseEvent<HTMLElement>, rowIndex: number) => {
    setTechTrackAnchor(e.currentTarget);
    setTechTrackRowIndex(rowIndex);
  };

  const handleTechTrackToggle = (track: TechTrack) => {
    if (techTrackRowIndex < 0) return;
    const current = (rows[techTrackRowIndex].techTracks as TechTrack[]) || [];
    const updated = current.includes(track)
      ? current.filter(t => t !== track)
      : [...current, track];
    handleCellChange(techTrackRowIndex, 'techTracks', updated);
  };

  const isEditing = (rowIndex: number, columnKey: string) =>
    editingCell?.rowIndex === rowIndex && editingCell?.columnKey === columnKey;

  return (
    <Box>
      {/* Toolbar */}
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddRow} variant="outlined">
          Add Row
        </Button>
        {baseData && baseData.length > 0 && (
          <Button
            size="small"
            variant="outlined"
            onClick={e => setImportAnchor(e.currentTarget)}
          >
            Import from Base ({baseData.length})
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
              {columns.map(col => (
                <TableCell key={col.key} sx={{ fontWeight: 600, width: col.width || 80, minWidth: col.width || 80, maxWidth: col.width || 80, whiteSpace: 'nowrap' }}>
                  {col.label}
                  {col.required && <Typography component="span" color="error" sx={{ ml: 0.5 }}>*</Typography>}
                </TableCell>
              ))}
              <TableCell sx={{ width: 90, fontWeight: 600 }} align="right">Actions</TableCell>
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
                  {columns.map(col => {
                    const cellValue = getNestedValue(row, col.key);
                    const cellError = validateField(cellValue, col);

                    // Boolean: always show checkbox inline
                    if (col.type === 'boolean') {
                      return (
                        <TableCell key={col.key} sx={{ py: 0.5, cursor: 'pointer' }}>
                          <Checkbox
                            checked={!!cellValue}
                            size="small"
                            onChange={e => handleCellChange(rowIndex, col.key, e.target.checked)}
                            sx={{ p: 0 }}
                          />
                        </TableCell>
                      );
                    }

                    // TechTracks: chip display + popover
                    if (col.type === 'techTracks') {
                      const tracks = (Array.isArray(cellValue) ? cellValue : []) as string[];
                      return (
                        <TableCell
                          key={col.key}
                          sx={{ py: 0.5, cursor: 'pointer', border: cellError ? '1px solid red' : undefined }}
                          onClick={e => handleTechTrackClick(e, rowIndex)}
                        >
                          {tracks.length > 0
                            ? tracks.map(t => <Chip key={t} label={t} size="small" sx={{ mr: 0.25, height: 20 }} />)
                            : <Typography variant="caption" color="text.disabled">—</Typography>}
                        </TableCell>
                      );
                    }

                    // Editable cell
                    return (
                      <TableCell
                        key={col.key}
                        sx={{
                          py: 0.5,
                          cursor: 'pointer',
                          border: cellError && !isEditing(rowIndex, col.key) ? '1px solid' : undefined,
                          borderColor: cellError && !isEditing(rowIndex, col.key) ? 'error.main' : undefined,
                          '&:hover': { backgroundColor: 'action.hover' },
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
                  <TableCell align="right" sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                    <Tooltip title="Duplicate">
                      <IconButton size="small" onClick={() => handleDuplicateRow(rowIndex)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" onClick={() => handleDeleteRow(rowIndex)} color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Tech Track Popover */}
      <Popover
        open={!!techTrackAnchor}
        anchorEl={techTrackAnchor}
        onClose={() => setTechTrackAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: 280 }}>
          <Typography variant="caption" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>Tech Tracks</Typography>
          {ALL_TECH_TRACK_CODES.filter(t => t !== '-').map(track => {
            const current = techTrackRowIndex >= 0 ? ((rows[techTrackRowIndex]?.techTracks as TechTrack[]) || []) : [];
            return (
              <FormControlLabel
                key={track}
                control={
                  <Checkbox
                    checked={current.includes(track)}
                    onChange={() => handleTechTrackToggle(track)}
                    size="small"
                  />
                }
                label={`${track} — ${getTechTrackName(track)}`}
                sx={{ display: 'block', '& .MuiTypography-root': { fontSize: '0.8rem' } }}
              />
            );
          })}
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
            Select a base item to import
          </Typography>
          <Table size="small" sx={{ minWidth: 400 }}>
            <TableHead>
              <TableRow>
                {columns.filter(c => c.type !== 'json' && c.type !== 'techTracks').slice(0, 6).map(col => (
                  <TableCell key={col.key} sx={{ py: 0.5, fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {col.label}
                  </TableCell>
                ))}
                <TableCell sx={{ py: 0.5, width: 70 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {(baseData || []).map((item, i) => {
                const exists = rows.some(r => r.id === item.id);
                return (
                  <TableRow
                    key={i}
                    hover
                    onClick={() => handleImportFromBase(item)}
                    sx={{ cursor: 'pointer' }}
                  >
                    {columns.filter(c => c.type !== 'json' && c.type !== 'techTracks').slice(0, 6).map(col => (
                      <TableCell key={col.key} sx={{ py: 0.25, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {renderCellDisplay(getNestedValue(item, col.key), col)}
                      </TableCell>
                    ))}
                    <TableCell sx={{ py: 0.25 }}>
                      {exists && <Chip label="override" size="small" color="warning" sx={{ height: 18, fontSize: '0.65rem' }} />}
                    </TableCell>
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
