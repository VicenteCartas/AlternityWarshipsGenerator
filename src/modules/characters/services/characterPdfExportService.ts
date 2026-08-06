import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import { createPrintableCharacterSheetPdf } from './characterSheetPdfService';
import { createNpcCharacterPdf } from './characterNpcPdfService';
import { buildCharacterSheetModel, type CharacterSheetModel } from './characterSheetService';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

interface PdfContext {
  pdf: jsPDF;
  y: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
}

const LINE_HEIGHT = 4.8;

function ensureSpace(context: PdfContext, required: number): void {
  if (context.y + required > context.pageHeight - 14) {
    context.pdf.addPage();
    context.y = context.margin;
  }
}

function heading(context: PdfContext, text: string, size = 12): void {
  ensureSpace(context, 12);
  context.pdf.setFont('helvetica', 'bold');
  context.pdf.setFontSize(size);
  context.pdf.setTextColor(30, 64, 90);
  context.pdf.text(text, context.margin, context.y);
  context.y += size * 0.45;
  context.pdf.setDrawColor(80, 125, 150);
  context.pdf.line(context.margin, context.y, context.margin + context.contentWidth, context.y);
  context.y += 4;
  context.pdf.setTextColor(0);
}

function body(context: PdfContext, text: string, size = 8.5): void {
  context.pdf.setFont('helvetica', 'normal');
  context.pdf.setFontSize(size);
  const lines = context.pdf.splitTextToSize(text, context.contentWidth) as string[];
  for (const line of lines) {
    ensureSpace(context, LINE_HEIGHT);
    context.pdf.text(line, context.margin, context.y);
    context.y += LINE_HEIGHT;
  }
}

function keyValues(context: PdfContext, values: [string, string][], columns = 3): void {
  const columnWidth = context.contentWidth / columns;
  for (let index = 0; index < values.length; index += columns) {
    ensureSpace(context, 8);
    values.slice(index, index + columns).forEach(([label, value], columnIndex) => {
      const x = context.margin + columnWidth * columnIndex;
      context.pdf.setFont('helvetica', 'bold');
      context.pdf.setFontSize(7.5);
      context.pdf.setTextColor(90);
      context.pdf.text(label.toUpperCase(), x, context.y);
      context.pdf.setFont('helvetica', 'normal');
      context.pdf.setFontSize(9);
      context.pdf.setTextColor(0);
      context.pdf.text(value || '-', x, context.y + 4);
    });
    context.y += 10;
  }
}

function table(context: PdfContext, headers: string[], widths: number[], rows: string[][]): void {
  const drawRow = (cells: string[], header: boolean) => {
    ensureSpace(context, 6);
    context.pdf.setFont('helvetica', header ? 'bold' : 'normal');
    context.pdf.setFontSize(header ? 7.5 : 7);
    let x = context.margin;
    cells.forEach((cell, index) => {
      const line = (context.pdf.splitTextToSize(cell, widths[index] - 2) as string[])[0] || '';
      context.pdf.text(line, x, context.y);
      x += widths[index];
    });
    context.y += 5;
  };
  drawRow(headers, true);
  context.pdf.setDrawColor(180);
  context.pdf.line(context.margin, context.y - 3.8, context.margin + context.contentWidth, context.y - 3.8);
  rows.forEach((row) => drawRow(row, false));
  context.y += 2;
}

function renderCore(context: PdfContext, model: CharacterSheetModel): void {
  context.pdf.setFont('helvetica', 'bold');
  context.pdf.setFontSize(20);
  context.pdf.setTextColor(30, 64, 90);
  context.pdf.text(model.heroName, context.margin, context.y);
  context.y += 8;
  context.pdf.setTextColor(0);
    body(context, `Level ${model.level} ${model.species} ${model.profession} | ${model.career || 'No career'} | PL ${model.progressLevel}`, 10);
  context.y += 2;
  keyValues(context, [
    ['Player', model.playerName], ['Campaign', model.setting], ['Gamemaster', model.gamemaster],
    ['Gender', model.gender], ['Age', model.age], ['Height', model.height],
    ['Weight', model.weight], ['Hair', model.hair], ['Eyes', model.eyes],
    ['Motivation', model.motivation], ['Moral Attitude', model.moralAttitude], ['Traits', model.characterTraits.join(', ')],
      ['Allegiance', model.allegiance], ['Social Status', model.socialStatus], ['Achievement Points', String(model.achievementPoints)],
      ['Status', model.valid ? 'Complete' : `${model.errors.length} issues`],
  ]);
  if (model.appearance) body(context, `Appearance: ${model.appearance}`);
  if (model.background) body(context, `Background: ${model.background}`);

  heading(context, 'Abilities & Derived Values');
  keyValues(context, model.abilities.map((ability) => [ability.id, String(ability.score)]), 6);
  keyValues(context, [
    ['Action Check', `${model.actionCheck.ordinary} / ${model.actionCheck.good} / ${model.actionCheck.amazing}`],
    ['Actions', String(model.actionsPerRound)],
    ['Last Resorts', `${model.lastResorts.initial}/${model.lastResorts.maximum}`],
    ['Stun', String(model.durability.stun)],
    ['Wound', String(model.durability.wound)],
    ['Mortal', String(model.durability.mortal)],
    ['Fatigue', String(model.durability.fatigue)],
    ['STR Damage', `${model.strengthDamageAdjustment >= 0 ? '+' : ''}${model.strengthDamageAdjustment}`],
    ['Movement', `Sprint ${model.movement.sprint}, Run ${model.movement.run}, Walk ${model.movement.walk}`],
  ]);
  keyValues(context, model.abilities.map((ability) => [
    `${ability.id} Resistance`, ability.resistance === null ? '-' : `${ability.resistance >= 0 ? '+' : ''}${ability.resistance}`,
  ]), 5);
}

function renderSkills(context: PdfContext, model: CharacterSheetModel): void {
  heading(context, 'Skills');
  body(context, `${model.remainingSkillPoints} of ${model.availableSkillPoints} skill points remaining.`);
  table(context, ['Ability', 'Skill', 'Rank', 'O/G/A', 'Source'], [20, 80, 16, 34, 34], model.skills.map((skill) => [
    skill.ability.toUpperCase(), skill.name, skill.rank === null ? '-' : String(skill.rank),
    `${skill.ordinary}/${skill.good}/${skill.amazing}`, skill.source,
  ]));
}

function renderOptions(context: PdfContext, model: CharacterSheetModel): void {
  heading(context, 'Perks, Flaws & Optional Rules');
  table(context, ['Type', 'Option', 'Details'], [28, 70, 86], [
    ...model.skillRuleLabels.map((label) => ['Skill Rule', label, '']),
    ...model.perks.map((entry) => ['Perk', entry.name, entry.details || '-']),
    ...model.flaws.map((entry) => ['Flaw', entry.name, entry.details || '-']),
  ]);
  heading(context, 'Species & Profession Benefits', 10);
  [...model.speciesAbilities, ...model.professionBenefits].forEach((entry) => body(context, `- ${entry}`));

  if (model.psionicSkills.length > 0) {
    heading(context, 'Psionics', 10);
    body(context, `Maximum energy: ${model.psionicEnergy}.`);
    table(context, ['Skill', 'Rank', 'O/G/A'], [120, 20, 44], model.psionicSkills.map((skill) => [
      skill.name, String(skill.rank ?? '-'), `${skill.ordinary}/${skill.good}/${skill.amazing}`,
    ]));
  }

  if (model.mutations.length > 0) {
    heading(context, 'Mutations', 10);
    table(context, ['Mutation', 'Details'], [90, 94], model.mutations.map((entry) => [entry.name, entry.details || '-']));
  }
  if (model.contacts) body(context, `Contacts: ${model.contacts}`);
  if (model.enemies) body(context, `Enemies: ${model.enemies}`);
  if (model.notes) body(context, `Notes: ${model.notes}`);
}

function renderEquipment(context: PdfContext, model: CharacterSheetModel): void {
  heading(context, 'Equipment & Funds');
  body(context, `Starting funds ${model.startingFunds}; remaining ${model.remainingFunds}; total carried mass ${model.totalCarriedMass} kg.`);
  table(context, ['General Equipment', 'Qty', 'Details'], [105, 24, 55], [...model.equipment, ...model.computers].map((item) => [item.name, String(item.quantity), item.details || '-']));
  table(context, ['Cybergear', 'Qty', 'Details'], [105, 24, 55], model.cybergear.map((item) => [item.name, String(item.quantity), item.details || '-']));
  heading(context, 'Weapons', 10);
  table(context, ['Weapon', 'Qty', 'Clips', 'Range / Damage'], [65, 16, 18, 85], model.attacks.map((attack) => [
    attack.name, String(attack.quantity), String(attack.clips), `${attack.range} | ${attack.damage}`,
  ]));
  heading(context, 'Armor', 10);
  table(context, ['Armor', 'Qty', 'AP', 'LI / HI / En'], [75, 18, 18, 73], model.armor.map((armor) => [
    armor.name, String(armor.quantity), `+${armor.actionCheckPenalty}`, `${armor.lowImpact} / ${armor.highImpact} / ${armor.energy}`,
  ]));
}

function renderFooters(context: PdfContext): void {
  const pages = context.pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    context.pdf.setPage(page);
    context.pdf.setFont('helvetica', 'italic');
    context.pdf.setFontSize(6.5);
    context.pdf.setTextColor(110);
    context.pdf.text(`${APP_NAME} v${APP_VERSION}`, context.margin, context.pageHeight - 6);
    context.pdf.text(`Page ${page}/${pages}`, context.pageWidth / 2, context.pageHeight - 6, { align: 'center' });
    context.pdf.text(new Date().toLocaleDateString(), context.pageWidth - context.margin, context.pageHeight - 6, { align: 'right' });
  }
}

export function createCharacterPdf(state: CharacterState, validation: CharacterValidationResult): jsPDF {
  const model = buildCharacterSheetModel(state, validation);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const context: PdfContext = { pdf, y: 14, pageWidth, pageHeight, margin: 13, contentWidth: pageWidth - 26 };
  renderCore(context, model);
  pdf.addPage(); context.y = context.margin; renderSkills(context, model);
    if (model.level > 1) {
      pdf.addPage(); context.y = context.margin; renderAdvancement(context, model);
    }
  pdf.addPage(); context.y = context.margin; renderOptions(context, model);
  pdf.addPage(); context.y = context.margin; renderEquipment(context, model);
  renderFooters(context);
  return pdf;
}
  function renderAdvancement(context: PdfContext, model: CharacterSheetModel): void {
    heading(context, 'Advancement History');
    body(context, `Level ${model.level}; ${model.achievementPoints} Achievement Points; ${model.remainingSkillPoints} stored skill points.`);
    for (const level of model.advancementLevels) {
      heading(context, `Level ${level.level}`, 10);
      body(context, `Earned ${level.skillPointsEarned} SP; spent ${level.skillPointsSpent}; stored ${level.skillPointsRemaining}; credits ${level.creditsRemaining}.`);
      for (const purchase of level.purchases) body(context, `- ${purchase}`, 7.5);
      if (level.notes) body(context, `Notes: ${level.notes}`, 7.5);
    }
  }

export type CharacterPdfFormat = 'npc' | 'pc';

export function getCharacterPdfFileName(heroName: string, format: CharacterPdfFormat = 'pc'): string {
  const base = (heroName || 'New Character').replace(/[^a-zA-Z0-9_-]/g, '_') || 'New_Character';
  return `${base}_${format === 'npc' ? 'npc_profile' : 'character_sheet'}.pdf`;
}

export async function exportCharacterPdf(
  state: CharacterState,
  validation: CharacterValidationResult,
  format: CharacterPdfFormat = 'pc',
  defaultDirectory?: string,
): Promise<string | null> {
  const pdf = format === 'npc'
    ? createNpcCharacterPdf(state, validation)
    : createPrintableCharacterSheetPdf(state, validation);
  const filename = getCharacterPdfFileName(state.identity.heroName, format);
  if (window.electronAPI) {
    const dialogResult = await window.electronAPI.showPdfSaveDialog(filename, defaultDirectory);
    if (dialogResult.canceled || !dialogResult.filePath) return null;
    const base64Data = pdf.output('datauristring').split(',')[1];
    const result = await window.electronAPI.savePdfFile(dialogResult.filePath, base64Data);
    if (!result.success) throw new Error(result.error || 'Failed to save character PDF.');
    return dialogResult.filePath;
  }
  pdf.save(filename);
  return filename;
}