import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { AbilityId } from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';
import {
  buildCharacterSheetModel,
  type CharacterSheetModel,
  type CharacterSheetSkillGroup,
  type CharacterSheetSkillRow,
} from './characterSheetService';

const INK: [number, number, number] = [31, 53, 66];
const ACCENT: [number, number, number] = [35, 119, 143];
const MUTED: [number, number, number] = [92, 104, 110];
const ERROR: [number, number, number] = [176, 48, 48];
const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;
const MARGIN = 12;
const COLUMN_WIDTH = 91;
const COLUMN_GAP = 10;
// Each column is a half-page-wide PHB fast-play template; the second column holds overflow
// or extended sections (psionics/mutations/cybertech/FX) so most characters use only column 1.
const COLUMNS = [MARGIN, MARGIN + COLUMN_WIDTH + COLUMN_GAP];
const TOP_Y = 14;
const BOTTOM_Y = PAGE_HEIGHT - 10;
const INDENT_BROAD = 3;
const INDENT_SPECIALTY = 6;
const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wil: 'WIL', per: 'PER',
};

interface Cursor { column: number; y: number }

function setText(
  pdf: jsPDF,
  size: number,
  style: 'normal' | 'bold' | 'italic' = 'normal',
  color: [number, number, number] = INK,
): void {
  pdf.setFont('helvetica', style);
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
}

function fittedLines(pdf: jsPDF, value: string, width: number, maxLines: number): string[] {
  const text = value.trim() || '-';
  let size = pdf.getFontSize();
  let lines = pdf.splitTextToSize(text, width) as string[];
  while (lines.length > maxLines && size > 4.5) {
    size -= 0.25;
    pdf.setFontSize(size);
    lines = pdf.splitTextToSize(text, width) as string[];
  }
  if (lines.length <= maxLines) return lines;
  const clipped = lines.slice(0, maxLines);
  let last = clipped[maxLines - 1] || '';
  while (last.length > 0 && pdf.getTextWidth(`${last}...`) > width) last = last.slice(0, -1);
  clipped[maxLines - 1] = `${last.trimEnd()}...`;
  return clipped;
}

function footer(pdf: jsPDF, page: number, pages: number): void {
  setText(pdf, 5.2, 'normal', MUTED);
  pdf.text(`${APP_NAME} v${APP_VERSION}`, MARGIN, PAGE_HEIGHT - 5);
  pdf.text(`Page ${page}/${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 5, { align: 'right' });
}

/** Tiny orientation label drawn only when content spills onto a genuinely new page. */
function continuedPageLabel(pdf: jsPDF, model: CharacterSheetModel): void {
  setText(pdf, 6.5, 'bold', ACCENT);
  pdf.text(`${model.heroName || 'Unnamed Character'} \u2014 NPC Profile (continued)`, MARGIN, 10);
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, 11.5, PAGE_WIDTH - MARGIN, 11.5);
}

function ensureSpace(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor, needed: number): void {
  if (cursor.y + needed <= BOTTOM_Y) return;
  if (cursor.column === 0) {
    cursor.column = 1;
    cursor.y = TOP_Y;
    return;
  }
  pdf.addPage();
  continuedPageLabel(pdf, model);
  cursor.column = 0;
  cursor.y = TOP_Y;
}

/** Plain bold label with a thin accent rule, matching the fast-play template's unboxed section headers. */
function sectionLabel(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor, title: string, columns?: [string, string]): void {
  ensureSpace(pdf, model, cursor, 6);
  const x = COLUMNS[cursor.column];
  setText(pdf, 7, 'bold', ACCENT);
  pdf.text(title.toUpperCase(), x, cursor.y);
  if (columns) {
    setText(pdf, 5, 'bold', MUTED);
    pdf.text(columns[0], x + COLUMN_WIDTH - 18, cursor.y, { align: 'right' });
    pdf.text(columns[1], x + COLUMN_WIDTH, cursor.y, { align: 'right' });
  }
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.3);
  pdf.line(x, cursor.y + 1, x + COLUMN_WIDTH, cursor.y + 1);
  cursor.y += 4.6;
}

function incompleteMarker(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  if (model.valid) return;
  ensureSpace(pdf, model, cursor, 4);
  const x = COLUMNS[cursor.column];
  setText(pdf, 6, 'bold', ERROR);
  pdf.text(`INCOMPLETE: ${model.errors.length} ISSUE${model.errors.length === 1 ? '' : 'S'}`, x, cursor.y);
  cursor.y += 4.5;
}

function identityLines(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  ensureSpace(pdf, model, cursor, 4);
  let x = COLUMNS[cursor.column];
  setText(pdf, 6.8, 'bold', ACCENT);
  pdf.text(model.heroName || 'Unnamed Character', x, cursor.y);
  cursor.y += 4;
  ensureSpace(pdf, model, cursor, 4);
  x = COLUMNS[cursor.column];
  setText(pdf, 6.3);
  pdf.text(`Player: ${model.playerName || '-'}`, x, cursor.y);
  cursor.y += 4;
  ensureSpace(pdf, model, cursor, 4);
  x = COLUMNS[cursor.column];
  pdf.text(`Profession: ${model.profession}     Career: ${model.career || '-'}`, x, cursor.y);
  cursor.y += 5.5;
}

function abilitiesBlock(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  sectionLabel(pdf, model, cursor, 'Abilities');
  let x = COLUMNS[cursor.column];
  setText(pdf, 5, 'bold', MUTED);
  pdf.text('ABILITY', x, cursor.y);
  pdf.text('SCORE', x + 45, cursor.y, { align: 'right' });
  pdf.text('UNTR.', x + 65, cursor.y, { align: 'right' });
  pdf.text('RES.', x + 91, cursor.y, { align: 'right' });
  cursor.y += 3.6;
  model.abilities.forEach((ability) => {
    ensureSpace(pdf, model, cursor, 3.4);
    x = COLUMNS[cursor.column];
    setText(pdf, 6.3);
    pdf.text(ability.label, x, cursor.y);
    pdf.text(String(ability.score), x + 45, cursor.y, { align: 'right' });
    pdf.text(String(ability.untrained), x + 65, cursor.y, { align: 'right' });
    const resistance = ability.resistance === null ? '-' : `${ability.resistance >= 0 ? '+' : ''}${ability.resistance}`;
    pdf.text(resistance, x + 91, cursor.y, { align: 'right' });
    cursor.y += 3.4;
  });
  cursor.y += 2;
}

function actionCheckBlock(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  sectionLabel(pdf, model, cursor, 'Action Check Score');
  const x = COLUMNS[cursor.column];
  const action = model.actionCheck;
  setText(pdf, 6.1);
  pdf.text(`Marginal ${action.marginal}+  Ordinary ${action.ordinary}  Good ${action.good}  Amazing ${action.amazing}`, x, cursor.y);
  cursor.y += 4;
  setText(pdf, 5.8, 'bold', MUTED);
  pdf.text(`Actions per round: ${model.actionsPerRound}`, x, cursor.y);
  cursor.y += 5.5;
}

/** Stun/Wound and Mortal/Fatigue render as two side-by-side sub-columns to halve the row count. */
function durabilityBlock(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  sectionLabel(pdf, model, cursor, 'Durability');
  const subWidth = (COLUMN_WIDTH - 4) / 2;
  const rows = [
    [['Stun', model.durability.stun], ['Mortal', model.durability.mortal]],
    [['Wound', model.durability.wound], ['Fatigue', model.durability.fatigue]],
  ] as const;
  rows.forEach((pair) => {
    ensureSpace(pdf, model, cursor, 4);
    const x = COLUMNS[cursor.column];
    pair.forEach(([label, value], subIndex) => {
      const subX = x + subIndex * (subWidth + 4);
      setText(pdf, 6.1, 'bold');
      const text = `${label} ${value}`;
      pdf.text(text, subX, cursor.y);
      pdf.setDrawColor(145);
      const pipCount = Math.min(value, 9);
      const textWidth = pdf.getTextWidth(`${text} `);
      for (let box = 0; box < pipCount; box += 1) {
        pdf.rect(subX + textWidth + box * 1.35, cursor.y - 2, 1, 1);
      }
    });
    cursor.y += 4;
  });
  cursor.y += 1.5;
}

function skillRowScoreText(row: CharacterSheetSkillRow): string {
  return row.usable ? `${row.ordinary}/${row.good}/${row.amazing}` : '-';
}

function drawSkillRow(pdf: jsPDF, cursor: Cursor, row: CharacterSheetSkillRow, indent: number): void {
  const style: 'normal' | 'italic' = indent > 0 ? 'italic' : 'normal';
  const x = COLUMNS[cursor.column];
  setText(pdf, 5.8, style);
  const nameX = x + indent;
  const nameWidth = COLUMN_WIDTH - 22 - indent;
  pdf.text(fittedLines(pdf, row.name, nameWidth, 1), nameX, cursor.y);
  if (row.rank !== null) {
    setText(pdf, 5.8, style);
    pdf.text(String(row.rank), x + COLUMN_WIDTH - 18, cursor.y, { align: 'right' });
  }
  setText(pdf, 5.8, style);
  pdf.text(skillRowScoreText(row), x + COLUMN_WIDTH, cursor.y, { align: 'right' });
}

/** Ability header flush left, broad skills indented once, and their specialties indented a second level. */
function skillGroupsBlock(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor, groups: CharacterSheetSkillGroup[], title: string): void {
  if (groups.length === 0) return;
  sectionLabel(pdf, model, cursor, title, ['RANK', 'SCORE']);
  let lastAbility: AbilityId | null = null;
  for (const group of groups) {
    if (group.ability !== lastAbility) {
      ensureSpace(pdf, model, cursor, 3.8);
      const x = COLUMNS[cursor.column];
      setText(pdf, 6, 'bold', ACCENT);
      pdf.text(ABILITY_LABELS[group.ability], x, cursor.y);
      cursor.y += 3.6;
      lastAbility = group.ability;
    }
    ensureSpace(pdf, model, cursor, 3.4);
    drawSkillRow(pdf, cursor, group.broad, INDENT_BROAD);
    cursor.y += 3.4;
    for (const specialty of group.specialties) {
      ensureSpace(pdf, model, cursor, 3.4);
      drawSkillRow(pdf, cursor, specialty, INDENT_SPECIALTY);
      cursor.y += 3.4;
    }
  }
  cursor.y += 1.5;
}

function weaponsSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  if (model.attacks.length === 0) return;
  sectionLabel(pdf, model, cursor, 'Weapons');
  for (const attack of model.attacks) {
    ensureSpace(pdf, model, cursor, 7);
    const x = COLUMNS[cursor.column];
    const attackScore = attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-';
    setText(pdf, 6.1, 'bold');
    pdf.text(fittedLines(pdf, `${attack.name} (${attack.skill} ${attackScore})`, COLUMN_WIDTH, 1), x, cursor.y);
    cursor.y += 3.4;
    setText(pdf, 5.4);
    pdf.text(fittedLines(pdf, `${attack.damageType} ${attack.damage}; range ${attack.range}; ${attack.mode || attack.accuracy}`, COLUMN_WIDTH - 3, 1), x + 3, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

function armorSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  if (model.armor.length === 0) return;
  sectionLabel(pdf, model, cursor, 'Armor');
  for (const entry of model.armor) {
    ensureSpace(pdf, model, cursor, 3.6);
    const x = COLUMNS[cursor.column];
    setText(pdf, 5.6);
    pdf.text(fittedLines(pdf, `${entry.name}: ${entry.lowImpact} LI / ${entry.highImpact} HI / ${entry.energy} En`, COLUMN_WIDTH, 1), x, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

function gearSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  const gear = [...model.equipment, ...model.computers, ...model.cybergear]
    .map((item) => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`)
    .join(', ');
  if (!gear) return;
  sectionLabel(pdf, model, cursor, 'Gear');
  setText(pdf, 5.6);
  const lines = pdf.splitTextToSize(gear, COLUMN_WIDTH) as string[];
  for (const line of lines) {
    ensureSpace(pdf, model, cursor, 3.6);
    const x = COLUMNS[cursor.column];
    pdf.text(line, x, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

function backgroundSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  const background = model.background || model.notes;
  if (!background) return;
  sectionLabel(pdf, model, cursor, 'Background');
  setText(pdf, 5.6);
  const lines = pdf.splitTextToSize(background, COLUMN_WIDTH) as string[];
  for (const line of lines) {
    ensureSpace(pdf, model, cursor, 3.6);
    const x = COLUMNS[cursor.column];
    pdf.text(line, x, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

function mutationsSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  if (model.mutations.length === 0) return;
  sectionLabel(pdf, model, cursor, 'Mutations');
  for (const entry of model.mutations) {
    ensureSpace(pdf, model, cursor, 3.6);
    const x = COLUMNS[cursor.column];
    setText(pdf, 5.6);
    pdf.text(fittedLines(pdf, `${entry.name}${entry.details ? ` (${entry.details})` : ''}`, COLUMN_WIDTH, 1), x, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

function cybertechSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  if (model.cybergear.length === 0) return;
  sectionLabel(pdf, model, cursor, 'Cybertech');
  for (const item of model.cybergear) {
    ensureSpace(pdf, model, cursor, 3.6);
    const x = COLUMNS[cursor.column];
    setText(pdf, 5.6);
    pdf.text(fittedLines(pdf, `${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''}`, COLUMN_WIDTH, 1), x, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

function fxSection(pdf: jsPDF, model: CharacterSheetModel, cursor: Cursor): void {
  if (!model.fxBroadSkill) return;
  sectionLabel(pdf, model, cursor, 'FX');
  ensureSpace(pdf, model, cursor, 3.6);
  let x = COLUMNS[cursor.column];
  setText(pdf, 5.6, 'bold');
  pdf.text(fittedLines(pdf, `${model.fxBroadSkill}; ${model.fxCampaignTone}; ${model.currentMaximumFxEnergy}/${model.maximumFxEnergy} FX energy`, COLUMN_WIDTH, 1), x, cursor.y);
  cursor.y += 3.8;
  for (const ability of model.fxAbilities) {
    ensureSpace(pdf, model, cursor, 3.6);
    x = COLUMNS[cursor.column];
    setText(pdf, 5.6);
    pdf.text(fittedLines(
      pdf,
      `${ability.name} (${ability.ability.toUpperCase()}, ${ability.quality}, R${ability.rank}, ${ability.ordinary}/${ability.good}/${ability.amazing}, ${ability.energyCost} FX)`,
      COLUMN_WIDTH,
      1,
    ), x, cursor.y);
    cursor.y += 3.6;
  }
  cursor.y += 1.5;
}

/** Create the compact PHB fast-play-template-style profile intended for NPC/quick reference use. */
export function createNpcCharacterPdf(
  state: CharacterState,
  validation: CharacterValidationResult,
): jsPDF {
  const model = buildCharacterSheetModel(state, validation);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const cursor: Cursor = { column: 0, y: TOP_Y };
  incompleteMarker(pdf, model, cursor);
  identityLines(pdf, model, cursor);
  abilitiesBlock(pdf, model, cursor);
  actionCheckBlock(pdf, model, cursor);
  durabilityBlock(pdf, model, cursor);
  skillGroupsBlock(pdf, model, cursor, model.skillGroups, 'Skills');
  weaponsSection(pdf, model, cursor);
  armorSection(pdf, model, cursor);
  gearSection(pdf, model, cursor);
  backgroundSection(pdf, model, cursor);
  skillGroupsBlock(pdf, model, cursor, model.psionicSkillGroups, 'Psionics');
  mutationsSection(pdf, model, cursor);
  cybertechSection(pdf, model, cursor);
  fxSection(pdf, model, cursor);

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    footer(pdf, page, pages);
  }
  return pdf;
}

