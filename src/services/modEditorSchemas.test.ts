import { describe, it, expect } from 'vitest';
import { EDITOR_SECTIONS, type EditorSection, type ColumnType } from './modEditorSchemas';

const VALID_TYPES: ColumnType[] = ['text', 'number', 'boolean', 'select', 'progressLevel', 'techTracks', 'multiselect', 'json'];

describe('modEditorSchemas', () => {
  describe('EDITOR_SECTIONS', () => {
    it('exports a non-empty array of sections', () => {
      expect(Array.isArray(EDITOR_SECTIONS)).toBe(true);
      expect(EDITOR_SECTIONS.length).toBeGreaterThan(0);
    });

    it('has unique section IDs', () => {
      const ids = EDITOR_SECTIONS.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe.each(EDITOR_SECTIONS.map(s => [s.id, s] as const))('section "%s"', (_id, section: EditorSection) => {
    it('has required fields', () => {
      expect(section.id).toBeTruthy();
      expect(section.label).toBeTruthy();
      expect(section.fileName).toBeTruthy();
      expect(section.rootKey).toBeTruthy();
    });

    it('fileName ends with .json', () => {
      expect(section.fileName).toMatch(/\.json$/);
    });

    it('has at least one column', () => {
      expect(section.columns.length).toBeGreaterThan(0);
    });

    it('all columns have key, label, and valid type', () => {
      for (const col of section.columns) {
        expect(col.key).toBeTruthy();
        expect(col.label).toBeTruthy();
        expect(VALID_TYPES).toContain(col.type);
      }
    });

    it('column keys are unique within the section', () => {
      const keys = section.columns.map(c => c.key);
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('select/progressLevel columns have options', () => {
      for (const col of section.columns) {
        if (col.type === 'select' || col.type === 'progressLevel') {
          expect(col.options).toBeDefined();
          expect(col.options!.length).toBeGreaterThan(0);
        }
      }
    });

    it('number columns have non-negative min when min is set', () => {
      for (const col of section.columns) {
        if (col.type === 'number' && col.min !== undefined) {
          expect(col.min).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('has a defaultItem', () => {
      expect(section.defaultItem).toBeDefined();
      expect(typeof section.defaultItem).toBe('object');
    });
  });
});
