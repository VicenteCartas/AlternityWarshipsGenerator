import { describe, it, expect } from 'vitest';
import type { ColumnDef } from './modEditorSchemas';
import { validateField, validateRows, getCellError, type ValidationError } from './modValidationService';

// ============== Test Helpers ==============

const textCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'name',
  label: 'Name',
  type: 'text',
  ...overrides,
} as ColumnDef);

const numberCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'value',
  label: 'Value',
  type: 'number',
  ...overrides,
} as ColumnDef);

const boolCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'active',
  label: 'Active',
  type: 'boolean',
  ...overrides,
} as ColumnDef);

const selectCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'category',
  label: 'Category',
  type: 'select',
  options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }],
  ...overrides,
} as ColumnDef);

const techTrackCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'techTracks',
  label: 'Tech Tracks',
  type: 'techTracks',
  ...overrides,
} as ColumnDef);

const jsonCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'data',
  label: 'Data',
  type: 'json',
  ...overrides,
} as ColumnDef);

const plCol = (overrides?: Partial<ColumnDef>): ColumnDef => ({
  key: 'progressLevel',
  label: 'PL',
  type: 'progressLevel',
  options: [
    { value: '6', label: 'PL6' },
    { value: '7', label: 'PL7' },
    { value: '8', label: 'PL8' },
  ],
  ...overrides,
} as ColumnDef);

// ============== Tests ==============

describe('modValidationService', () => {
  describe('validateField', () => {
    // Required checks
    it('returns error for required field with undefined value', () => {
      const col = textCol({ required: true });
      expect(validateField(undefined, col)).toBe('Name is required');
    });

    it('returns error for required field with null value', () => {
      const col = textCol({ required: true });
      expect(validateField(null, col)).toBe('Name is required');
    });

    it('returns error for required field with empty string', () => {
      const col = textCol({ required: true });
      expect(validateField('', col)).toBe('Name is required');
    });

    it('returns null for optional empty field', () => {
      const col = textCol({ required: false });
      expect(validateField('', col)).toBeNull();
      expect(validateField(undefined, col)).toBeNull();
      expect(validateField(null, col)).toBeNull();
    });

    // Text validation
    it('accepts valid text', () => {
      expect(validateField('hello', textCol())).toBeNull();
    });

    it('rejects non-string for text column', () => {
      expect(validateField(123, textCol())).toBe('Must be text');
    });

    it('validates ID format (kebab-case)', () => {
      const col = textCol({ key: 'id' });
      expect(validateField('my-item', col)).toBeNull();
      expect(validateField('item123', col)).toBeNull();
      expect(validateField('My Item', col)).toBe('ID must be lowercase kebab-case (e.g., "my-item")');
      expect(validateField('CAPS', col)).toBe('ID must be lowercase kebab-case (e.g., "my-item")');
      expect(validateField('has_underscore', col)).toBe('ID must be lowercase kebab-case (e.g., "my-item")');
    });

    // Number validation
    it('accepts valid numbers', () => {
      expect(validateField(42, numberCol())).toBeNull();
      expect(validateField(0, numberCol())).toBeNull();
      expect(validateField(-5, numberCol())).toBeNull();
    });

    it('parses numeric strings', () => {
      expect(validateField('42', numberCol())).toBeNull();
    });

    it('rejects non-numeric values', () => {
      expect(validateField('abc', numberCol())).toBe('Must be a number');
    });

    it('enforces minimum', () => {
      const col = numberCol({ min: 0 });
      expect(validateField(-1, col)).toBe('Minimum: 0');
      expect(validateField(0, col)).toBeNull();
    });

    it('enforces maximum', () => {
      const col = numberCol({ max: 100 });
      expect(validateField(101, col)).toBe('Maximum: 100');
      expect(validateField(100, col)).toBeNull();
    });

    // Boolean validation
    it('accepts booleans', () => {
      expect(validateField(true, boolCol())).toBeNull();
      expect(validateField(false, boolCol())).toBeNull();
    });

    it('rejects non-booleans', () => {
      expect(validateField('true', boolCol())).toBe('Must be true or false');
      expect(validateField(1, boolCol())).toBe('Must be true or false');
    });

    // Select validation
    it('accepts valid selection', () => {
      expect(validateField('a', selectCol())).toBeNull();
    });

    it('rejects invalid selection', () => {
      expect(validateField('c', selectCol())).toBe('Invalid selection');
    });

    // Progress level validation
    it('accepts valid progress level', () => {
      expect(validateField('7', plCol())).toBeNull();
    });

    it('rejects invalid progress level', () => {
      expect(validateField('5', plCol())).toBe('Invalid selection');
    });

    // Tech tracks validation
    it('accepts arrays for techTracks', () => {
      expect(validateField([], techTrackCol())).toBeNull();
      expect(validateField(['G', 'D'], techTrackCol())).toBeNull();
    });

    it('rejects non-arrays for techTracks', () => {
      expect(validateField('G', techTrackCol())).toBe('Must be an array');
    });

    // JSON validation
    it('accepts valid JSON strings', () => {
      expect(validateField('{"key": "value"}', jsonCol())).toBeNull();
      expect(validateField('[1,2,3]', jsonCol())).toBeNull();
    });

    it('rejects invalid JSON strings', () => {
      expect(validateField('{invalid}', jsonCol())).toBe('Invalid JSON');
    });

    it('accepts non-string JSON values (already parsed)', () => {
      expect(validateField({ key: 'value' }, jsonCol())).toBeNull();
    });
  });

  describe('validateRows', () => {
    const columns: ColumnDef[] = [
      textCol({ key: 'id', label: 'ID', required: true }) as ColumnDef,
      textCol({ key: 'name', label: 'Name', required: true }) as ColumnDef,
      numberCol({ key: 'value', label: 'Value' }) as ColumnDef,
    ];

    it('returns empty errors for valid rows', () => {
      const rows = [
        { id: 'item-1', name: 'First', value: 10 },
        { id: 'item-2', name: 'Second', value: 20 },
      ];
      expect(validateRows(rows, columns)).toHaveLength(0);
    });

    it('detects duplicate IDs', () => {
      const rows = [
        { id: 'item-1', name: 'First', value: 10 },
        { id: 'item-1', name: 'Duplicate', value: 20 },
      ];
      const errors = validateRows(rows, columns);
      const dupeErrors = errors.filter(e => e.columnKey === 'id' && e.message.includes('Duplicate'));
      expect(dupeErrors.length).toBe(1);
      expect(dupeErrors[0].rowIndex).toBe(1);
    });

    it('detects field validation errors', () => {
      const rows = [
        { id: 'item-1', name: '', value: 10 },
      ];
      const errors = validateRows(rows, columns);
      expect(errors.some(e => e.columnKey === 'name' && e.message.includes('required'))).toBe(true);
    });

    it('reports correct row indices', () => {
      const rows = [
        { id: 'item-1', name: 'Valid', value: 10 },
        { id: 'item-2', name: '', value: 20 },
      ];
      const errors = validateRows(rows, columns);
      expect(errors[0].rowIndex).toBe(1);
    });
  });

  describe('getCellError', () => {
    const errors: ValidationError[] = [
      { rowIndex: 0, columnKey: 'name', message: 'Name is required' },
      { rowIndex: 1, columnKey: 'id', message: 'Duplicate ID' },
    ];

    it('finds error for matching row and column', () => {
      expect(getCellError(errors, 0, 'name')).toBe('Name is required');
    });

    it('returns undefined for non-matching cell', () => {
      expect(getCellError(errors, 0, 'id')).toBeUndefined();
      expect(getCellError(errors, 2, 'name')).toBeUndefined();
    });
  });
});
