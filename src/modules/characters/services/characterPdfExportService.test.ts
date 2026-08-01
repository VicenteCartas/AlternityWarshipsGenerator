import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { validateCharacter } from './characterValidationService';
import { createCharacterPdf, getCharacterPdfFileName } from './characterPdfExportService';
import { createPrintableCharacterSheetPdf } from './characterSheetPdfService';
import { getAllEquipment } from './characterDataService';

describe('character PDF export', () => {
  it('creates a clean four-section character sheet and safe filename', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';
    state.identity.career = 'Scout';
    state.identity.motivation = 'Discovery';
    state.identity.moralAttitude = 'Ethical';
    state.identity.characterTraits = ['Curious'];
    state.professionId = 'free-agent';
    state.resistanceBonusAbility = 'dex';
    state.abilityScores = { str: 8, dex: 12, con: 10, int: 12, wil: 9, per: 9 };
    state.skillPlan.nativeLanguage = 'English';
    state.startingFundsDieRolls = [8, 7, 6, 5, 4];
    state.weaponSelections = [{ weaponId: 'combat-knife', quantity: 1, spareClips: 0 }];
    const validation = validateCharacter(state);
    const pdf = createCharacterPdf(state, validation);
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(4);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(5000);
    expect(getCharacterPdfFileName('Jordan / Kade')).toBe('Jordan___Kade_character_sheet.pdf');
    expect(getCharacterPdfFileName('Jordan / Kade', 'report')).toBe('Jordan___Kade_character_report.pdf');
  });

  it('creates a two-page printable sheet plus a supplemental page when needed', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';
    state.skillPlan.nativeLanguage = 'English';
    let validation = validateCharacter(state);
    expect(createPrintableCharacterSheetPdf(state, validation).getNumberOfPages()).toBe(2);

    state.cybergearSelections = [{ gearId: 'bioart', quality: 'ordinary', quantity: 1 }];
    validation = validateCharacter(state);
    const supplemental = createPrintableCharacterSheetPdf(state, validation);
    expect(supplemental.getNumberOfPages()).toBe(3);
    expect(supplemental.output('arraybuffer').byteLength).toBeGreaterThan(8000);
  });

  it('adds continuation pages instead of dropping inventory beyond the main sheet capacity', () => {
    const state = createEmptyCharacter();
    state.skillPlan.nativeLanguage = 'English';
    state.equipmentSelections = getAllEquipment()
      .filter((item) => item.category !== 'computer')
      .slice(0, 25)
      .map((item) => ({ equipmentId: item.id, quantity: 1 }));

    const pdf = createPrintableCharacterSheetPdf(state, validateCharacter(state));
    expect(pdf.getNumberOfPages()).toBe(3);
  });

  it('marks an invalid printable character as incomplete', () => {
    const state = createEmptyCharacter();
    const pdf = createPrintableCharacterSheetPdf(state, validateCharacter(state));
    expect(pdf.output()).toContain('INCOMPLETE: 8 ISSUES');
  });
});