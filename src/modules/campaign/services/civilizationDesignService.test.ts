import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CIVILIZATION_DESIGN,
  INSTALLATION_FACILITIES,
  TRADE_COMMODITIES,
  formatCivilizationSummary,
  getCivilizationLevel,
  getLawLevel,
  validateCivilizationDesign,
} from './civilizationDesignService';

describe('civilization design reference', () => {
  it('provides all GMG Civilization and Law Levels', () => {
    expect(Array.from({ length: 9 }, (_value, level) => getCivilizationLevel(level).level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Array.from({ length: 9 }, (_value, level) => getCivilizationLevel(level).resourceModifier)).toEqual([
      null, 3, 2, 1, 0, -1, -2, -3, -4,
    ]);
    expect(Array.from({ length: 9 }, (_value, level) => getLawLevel(level).lawModifier)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
    expect(TRADE_COMMODITIES).toHaveLength(40);
    expect(TRADE_COMMODITIES.find((commodity) => commodity.id === 'stardrive-units')).toEqual({
      id: 'stardrive-units', name: 'Stardrive units', value: 'Very High', bulk: 'Medium', restricted: true,
    });
    expect(INSTALLATION_FACILITIES).toHaveLength(13);
  });

  it('enforces GMG level relationships', () => {
    expect(validateCivilizationDesign({
      ...DEFAULT_CIVILIZATION_DESIGN,
      progressLevel: 4,
      civilizationLevel: 8,
      lawLevel: 8,
    })).toEqual([
      'Megapolitan World requires at least Progress Level 6.',
    ]);
    expect(validateCivilizationDesign({
      ...DEFAULT_CIVILIZATION_DESIGN,
      civilizationLevel: 5,
      lawLevel: 3,
    })[0]).toContain('falls into anarchy');
    expect(validateCivilizationDesign({
      ...DEFAULT_CIVILIZATION_DESIGN,
      origin: 'mixed',
      civilizationLevel: 6,
      alienCivilizationLevel: 5,
      lawLevel: 6,
    })).toContain('Human and alien Civilization Levels total more than the GMG mixed-society guideline of 10.');
    expect(validateCivilizationDesign({
      ...DEFAULT_CIVILIZATION_DESIGN,
      origin: 'mixed',
      progressLevel: 4,
      civilizationLevel: 2,
      alienCivilizationLevel: 7,
      lawLevel: 7,
    })).toContain('Alien Improved World requires at least Progress Level 5.');
  });

  it('formats an authored civilization summary without empty fields', () => {
    const summary = formatCivilizationSummary({
      ...DEFAULT_CIVILIZATION_DESIGN,
      name: 'Helios Compact',
      government: 'Council republic',
      exports: 'Fusion catalysts',
      tradeImportIds: ['water'],
      tradeExportIds: ['stardrive-units'],
      installations: [{
        id: 'station-1', name: 'Gateway', kind: 'station', purpose: '', location: '', occupants: '', isolation: '',
        facilityIds: ['power', 'communications'], layout: '', contacts: '', rivals: '', campaignRole: '', notes: '',
      }],
    });
    expect(summary).toContain('Helios Compact');
    expect(summary).toContain('CL 4: Nation');
    expect(summary).toContain('Government: Council republic');
    expect(summary).toContain('Exports: Fusion catalysts');
    expect(summary).toContain('Trade imports: Water');
    expect(summary).toContain('Trade exports: Stardrive units');
    expect(summary).toContain('Facilities: Power generation and distribution, Communications, surveillance, and security posts');
    expect(summary).not.toContain('Notes:');
  });
});