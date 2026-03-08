/**
 * Mod Validation Service
 *
 * Provides field-level and file-level validation for mod data.
 */

import type { ColumnDef } from './modEditorSchemas';
import { getAllTechTrackCodes } from './formatters';

export interface ValidationError {
  rowIndex: number;
  columnKey: string;
  message: string;
}

/**
 * Validate a single field value against its column definition.
 * Returns an error message or null if valid.
 */
export function validateField(value: unknown, column: ColumnDef): string | null {
  // Required check
  if (column.required) {
    if (value === undefined || value === null || value === '') {
      return `${column.label} is required`;
    }
  }

  // Skip further checks if empty and not required
  if (value === undefined || value === null || value === '') return null;

  switch (column.type) {
    case 'text': {
      if (typeof value !== 'string') return 'Must be text';
      if (column.key === 'id') {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
          return 'ID must be lowercase kebab-case (e.g., "my-item")';
        }
      }
      if (column.key === 'code') {
        if (!/^[A-Z]$/.test(value)) {
          return 'Must be a single uppercase letter (A-Z)';
        }
      }
      break;
    }
    case 'number': {
      const num = typeof value === 'string' ? parseFloat(value) : value;
      if (typeof num !== 'number' || isNaN(num)) return 'Must be a number';
      if (column.min !== undefined && num < column.min) return `Minimum: ${column.min}`;
      if (column.max !== undefined && num > column.max) return `Maximum: ${column.max}`;
      break;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') return 'Must be true or false';
      break;
    }
    case 'select':
    case 'progressLevel': {
      if (column.options && !column.options.some(o => o.value === String(value))) {
        return 'Invalid selection';
      }
      break;
    }
    case 'techTracks':
    case 'multiselect': {
      if (!Array.isArray(value)) return 'Must be an array';
      break;
    }
    case 'json': {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          return 'Invalid JSON';
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Validate all rows for a section. Returns all errors found.
 */
export function validateRows(rows: Record<string, unknown>[], columns: ColumnDef[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for duplicate IDs
  const ids = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    const id = rows[i].id as string;
    if (id) {
      if (ids.has(id)) {
        errors.push({ rowIndex: i, columnKey: 'id', message: `Duplicate ID "${id}" (also on row ${ids.get(id)! + 1})` });
      } else {
        ids.set(id, i);
      }
    }
  }

  // Validate each cell
  for (let i = 0; i < rows.length; i++) {
    for (const col of columns) {
      const value = rows[i][col.key];
      const error = validateField(value, col);
      if (error) {
        errors.push({ rowIndex: i, columnKey: col.key, message: error });
      }
    }
  }

  return errors;
}

/**
 * Check if a specific cell has a validation error.
 */
export function getCellError(errors: ValidationError[], rowIndex: number, columnKey: string): string | undefined {
  return errors.find(e => e.rowIndex === rowIndex && e.columnKey === columnKey)?.message;
}

/**
 * Cross-validate techTracks fields in equipment rows against known track codes.
 * Known codes = base tracks + any tracks defined in the same mod's techTracks section.
 * Returns additional validation errors for unknown track references.
 */
export function validateTechTrackReferences(
  rows: Record<string, unknown>[],
  columns: ColumnDef[],
  modTechTrackRows?: Record<string, unknown>[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const techTrackColumns = columns.filter(c => c.type === 'techTracks');
  if (techTrackColumns.length === 0) return errors;

  // Build set of known track codes: base + mod-defined
  const knownCodes = new Set(getAllTechTrackCodes());
  if (modTechTrackRows) {
    for (const row of modTechTrackRows) {
      const code = row.code as string;
      if (code && /^[A-Z]$/.test(code)) {
        knownCodes.add(code);
      }
    }
  }

  for (let i = 0; i < rows.length; i++) {
    for (const col of techTrackColumns) {
      const value = rows[i][col.key];
      if (Array.isArray(value)) {
        for (const track of value) {
          if (typeof track === 'string' && !knownCodes.has(track)) {
            errors.push({ rowIndex: i, columnKey: col.key, message: `Unknown tech track "${track}". Define it in the Tech Tracks section first.` });
          }
        }
      }
    }
  }

  return errors;
}
