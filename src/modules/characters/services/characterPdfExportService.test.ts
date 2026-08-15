import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyCharacter } from '../constants/characterDefaults';
import { validateCharacter } from './characterValidationService';
import { createCharacterPdf, exportCharacterPdf, getCharacterPdfFileName } from './characterPdfExportService';
import { createPrintableCharacterSheetPdf } from './characterSheetPdfService';
import { createNpcCharacterPdf } from './characterNpcPdfService';
import { getAllEquipment } from './characterDataService';
import { installMockElectronAPI } from '@shared/test/electronMock';

afterEach(() => {
  Reflect.deleteProperty(window, 'electronAPI');
});

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
    expect(getCharacterPdfFileName('Jordan / Kade', 'npc')).toBe('Jordan___Kade_npc_profile.pdf');
  });

  it('creates a three-page printable sheet plus a supplemental page when needed', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';
    state.skillPlan.nativeLanguage = 'English';
    let validation = validateCharacter(state);
    expect(createPrintableCharacterSheetPdf(state, validation).getNumberOfPages()).toBe(3);

    state.cybergearSelections = [{ gearId: 'bioart', quality: 'ordinary', quantity: 1 }];
    validation = validateCharacter(state);
    const supplemental = createPrintableCharacterSheetPdf(state, validation);
    expect(supplemental.getNumberOfPages()).toBe(4);
    expect(supplemental.output('arraybuffer').byteLength).toBeGreaterThan(8000);
  });

  it('creates a compact PHB-style NPC profile', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';
    state.identity.career = 'Scout';
    state.professionId = 'free-agent';
    state.skillPlan.nativeLanguage = 'English';
    const pdf = createNpcCharacterPdf(state, validateCharacter(state));

    expect(pdf.getNumberOfPages()).toBe(1);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(4000);
    expect(pdf.output()).toContain('Jordan Kade');
    expect(pdf.output()).toContain('ACTION CHECK SCORE');
  });

  it('adds FX to compact NPC and printable character exports', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Miracle Worker';
    state.selectedSourcePackIds.push('gmg-fx');
    state.fxPlan = {
      campaignTone: 'heroic',
      broadSkill: 'faith',
      faithFocus: 'Silver sunburst',
      designs: [],
      abilityPurchases: [],
      faithPurchases: [{ quality: 'ordinary', rank: 1 }],
    };
    const validation = validateCharacter(state);
    const npc = createNpcCharacterPdf(state, validation);
    const printable = createPrintableCharacterSheetPdf(state, validation);

    expect(npc.getNumberOfPages()).toBe(1);
    expect(npc.output()).toContain('Ordinary-quality miracles');
    expect(printable.getNumberOfPages()).toBe(4);
    expect(printable.output()).toContain('Ordinary-quality miracles');
  });

  it('asks where to save a desktop export and writes the chosen path', async () => {
    const electron = installMockElectronAPI();
    electron.api.showPdfSaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Exports\\Jordan_Kade_npc_profile.pdf',
    });
    const state = createEmptyCharacter();
    state.identity.heroName = 'Jordan Kade';

    const savedPath = await exportCharacterPdf(
      state,
      validateCharacter(state),
      'npc',
      'C:\\Characters',
    );

    expect(electron.api.showPdfSaveDialog).toHaveBeenCalledWith(
      'Jordan_Kade_npc_profile.pdf',
      'C:\\Characters',
    );
    expect(electron.api.savePdfFile).toHaveBeenCalledWith(
      'C:\\Exports\\Jordan_Kade_npc_profile.pdf',
      expect.any(String),
    );
    expect(savedPath).toBe('C:\\Exports\\Jordan_Kade_npc_profile.pdf');
  });

  it('does not write a PDF when Save As is canceled', async () => {
    const electron = installMockElectronAPI();
    electron.api.showPdfSaveDialog = vi.fn().mockResolvedValue({ canceled: true });
    const state = createEmptyCharacter();

    await expect(exportCharacterPdf(state, validateCharacter(state), 'pc')).resolves.toBeNull();
    expect(electron.api.savePdfFile).not.toHaveBeenCalled();
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

  it('adds advancement history pages for an advanced character', () => {
    const state = createEmptyCharacter();
    state.identity.heroName = 'Advanced Hero';
    state.skillPlan.nativeLanguage = 'English';
    state.level = 3;
    state.advancementPlan.levels = [
      { level: 2, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
      { level: 3, broadSkills: [], specialtySkills: [], benefits: [], lastResortPointsSpent: 0, lastResortPointsPurchased: 0, creditsAwarded: 0, acquisitions: [], notes: '' },
    ];
    const validation = validateCharacter(state);

    expect(createPrintableCharacterSheetPdf(state, validation).getNumberOfPages()).toBe(4);
    expect(createCharacterPdf(state, validation).getNumberOfPages()).toBeGreaterThanOrEqual(5);
  });
});