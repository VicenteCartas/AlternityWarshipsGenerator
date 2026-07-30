import { describe, it, expect } from 'vitest';
import {
  filterBattleEntries, sortBattleEntries, toBattleLibraryEntries,
  formatFileSize, formatLibraryDate,
} from './battleLibraryService';
import type { ScannedBattleFile } from '@shared/types/electron';

function file(overrides: Partial<ScannedBattleFile>): ScannedBattleFile {
  return {
    filePath: 'C:/battles/engagement.battle.json',
    scenarioName: 'Engagement',
    sideAName: 'Concord',
    sideBName: 'Exeat',
    theatreCount: 1,
    roundCount: 0,
    totalCombatStrength: 1000,
    modifiedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    fileSizeBytes: 2048,
    ...overrides,
  };
}

describe('toBattleLibraryEntries', () => {
  it('derives a file name from the path', () => {
    const [entry] = toBattleLibraryEntries([file({ filePath: 'C:/saves/Fall of Spes.battle.json' })]);
    expect(entry.fileName).toBe('Fall of Spes');
  });

  it('handles a null file list', () => {
    expect(toBattleLibraryEntries(null as unknown as ScannedBattleFile[])).toEqual([]);
  });
});

describe('filterBattleEntries', () => {
  const entries = toBattleLibraryEntries([
    file({ scenarioName: 'Fall of Spes', filePath: 'a.battle.json' }),
    file({ scenarioName: 'Tendril Relief', sideBName: 'I’krl Armada', filePath: 'b.battle.json' }),
  ]);

  it('returns everything for an empty query', () => {
    expect(filterBattleEntries(entries, '   ')).toHaveLength(2);
  });

  it('matches the scenario name case-insensitively', () => {
    expect(filterBattleEntries(entries, 'spes')).toHaveLength(1);
  });

  it('matches side names', () => {
    const result = filterBattleEntries(entries, 'armada');
    expect(result).toHaveLength(1);
    expect(result[0].scenarioName).toBe('Tendril Relief');
  });

  it('returns nothing when there is no match', () => {
    expect(filterBattleEntries(entries, 'zzzz')).toHaveLength(0);
  });
});

describe('sortBattleEntries', () => {
  const entries = toBattleLibraryEntries([
    file({ scenarioName: 'Bravo', totalCombatStrength: 500, roundCount: 5, modifiedAt: '2026-03-01T00:00:00.000Z', filePath: 'b.battle.json' }),
    file({ scenarioName: 'Alpha', totalCombatStrength: 900, roundCount: 2, modifiedAt: '2026-01-01T00:00:00.000Z', filePath: 'a.battle.json' }),
  ]);

  it('sorts by name ascending', () => {
    const sorted = sortBattleEntries(entries, { field: 'name', direction: 'asc' });
    expect(sorted.map((e) => e.scenarioName)).toEqual(['Alpha', 'Bravo']);
  });

  it('sorts by combat strength descending', () => {
    const sorted = sortBattleEntries(entries, { field: 'strength', direction: 'desc' });
    expect(sorted[0].totalCombatStrength).toBe(900);
  });

  it('sorts by rounds fought', () => {
    const sorted = sortBattleEntries(entries, { field: 'rounds', direction: 'asc' });
    expect(sorted.map((e) => e.roundCount)).toEqual([2, 5]);
  });

  it('sorts by last modified, newest first', () => {
    const sorted = sortBattleEntries(entries, { field: 'modified', direction: 'desc' });
    expect(sorted[0].scenarioName).toBe('Bravo');
  });

  it('does not mutate the input array', () => {
    const before = entries.map((e) => e.scenarioName);
    sortBattleEntries(entries, { field: 'name', direction: 'asc' });
    expect(entries.map((e) => e.scenarioName)).toEqual(before);
  });
});

describe('formatFileSize', () => {
  it('formats bytes, kilobytes and megabytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

describe('formatLibraryDate', () => {
  it('returns an em dash for missing or invalid dates', () => {
    expect(formatLibraryDate(null)).toBe('—');
    expect(formatLibraryDate('not a date')).toBe('—');
  });

  it('formats a valid ISO date', () => {
    expect(formatLibraryDate('2026-03-17T12:00:00.000Z')).not.toBe('—');
  });
});
