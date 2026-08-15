import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { AbilityId } from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';
import {
  buildCharacterSheetModel,
  type CharacterSheetModel,
  type CharacterSheetSkill,
} from './characterSheetService';

const INK: [number, number, number] = [31, 53, 66];
const ACCENT: [number, number, number] = [35, 119, 143];
const PALE: [number, number, number] = [229, 240, 243];
const MUTED: [number, number, number] = [92, 104, 110];
const ERROR: [number, number, number] = [176, 48, 48];
const PAGE_WIDTH = 215.9;
const PAGE_HEIGHT = 279.4;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MAIN_SKILL_LINES = 28;

interface SkillLine {
  kind: 'ability' | 'skill';
  label: string;
  rank?: string;
  score?: string;
}

function setText(
  pdf: jsPDF,
  size: number,
  bold = false,
  color: [number, number, number] = INK,
): void {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
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

function section(pdf: jsPDF, x: number, y: number, width: number, height: number, title: string): void {
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, width, height);
  pdf.setFillColor(...PALE);
  pdf.rect(x, y, width, 5.5, 'F');
  setText(pdf, 7.5, true, ACCENT);
  pdf.text(title.toUpperCase(), x + 2, y + 3.9);
}

function field(pdf: jsPDF, label: string, value: string, x: number, y: number, width: number): void {
  setText(pdf, 5.2, true, MUTED);
  pdf.text(label.toUpperCase(), x, y);
  setText(pdf, 7);
  const lines = fittedLines(pdf, value, width, 1);
  pdf.text(lines, x, y + 3.5);
}

function header(pdf: jsPDF, model: CharacterSheetModel, label: string): void {
  setText(pdf, 7, true, MUTED);
  pdf.text(`${APP_NAME} CHARACTER TEMPLATE`, MARGIN, 10);
  setText(pdf, 15, true, ACCENT);
  pdf.text(model.heroName || 'Unnamed Character', MARGIN, 16);
  setText(pdf, 7, true, MUTED);
  pdf.text(label, PAGE_WIDTH - MARGIN, 15.5, { align: 'right' });
  if (!model.valid) {
    setText(pdf, 6, true, ERROR);
    pdf.text(`INCOMPLETE: ${model.errors.length} ISSUE${model.errors.length === 1 ? '' : 'S'}`, PAGE_WIDTH - MARGIN, 10, { align: 'right' });
  }
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, 18, PAGE_WIDTH - MARGIN, 18);
}

function score(skill: CharacterSheetSkill): string {
  return `${skill.ordinary}/${skill.good}/${skill.amazing}`;
}

function skillLines(model: CharacterSheetModel, abilities: AbilityId[]): SkillLine[] {
  const labels: Record<AbilityId, string> = {
    str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wil: 'WIL', per: 'PER',
  };
  const result: SkillLine[] = [];
  for (const ability of abilities) {
    const skills = model.skills.filter((entry) => entry.ability === ability);
    if (skills.length === 0) continue;
    result.push({ kind: 'ability', label: labels[ability] });
    for (const skill of skills) {
      result.push({
        kind: 'skill',
        label: skill.name,
        rank: skill.rank === null ? '' : String(skill.rank),
        score: score(skill),
      });
    }
  }
  return result;
}

function drawSkillColumn(
  pdf: jsPDF,
  lines: SkillLine[],
  x: number,
  y: number,
  width: number,
): void {
  const rowHeight = 3.35;
  lines.forEach((line, index) => {
    const rowY = y + index * rowHeight;
    if (line.kind === 'ability') {
      setText(pdf, 5.8, true, ACCENT);
      pdf.text(line.label, x, rowY);
      return;
    }
    setText(pdf, 5.8, line.rank === '');
    const nameX = x + (line.rank === '' ? 1.5 : 5);
    const nameWidth = width - 29 - (nameX - x);
    const name = fittedLines(pdf, line.label, nameWidth, 1)[0];
    pdf.text(name, nameX, rowY);
    if (line.rank) pdf.text(line.rank, x + width - 25, rowY, { align: 'right' });
    pdf.text(line.score || '-', x + width - 1, rowY, { align: 'right' });
  });
}

function gearNames(model: CharacterSheetModel): string {
  return [...model.equipment, ...model.computers, ...model.cybergear]
    .map((item) => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`)
    .join(', ') || 'None';
}

function drawMainPage(pdf: jsPDF, model: CharacterSheetModel): {
  leftSkills: SkillLine[];
  rightSkills: SkillLine[];
  gearContinued: boolean;
  backgroundContinued: boolean;
} {
  header(pdf, model, 'NPC PROFILE');

  section(pdf, MARGIN, 21, CONTENT_WIDTH, 14, 'Identity');
  field(pdf, "Hero's Name", model.heroName, 12, 28, 54);
  field(pdf, 'Player', model.playerName || '-', 69, 28, 40);
  field(pdf, 'Profession', model.profession, 112, 28, 38);
  field(pdf, 'Career', model.career || '-', 153, 28, 50);

  section(pdf, MARGIN, 38, 102, 42, 'Abilities');
  setText(pdf, 5.2, true, MUTED);
  pdf.text('ABILITY', 13, 47); pdf.text('SCORE', 64, 47, { align: 'right' });
  pdf.text('UNTRAINED', 86, 47, { align: 'right' }); pdf.text('RES. MOD.', 109, 47, { align: 'right' });
  model.abilities.forEach((ability, index) => {
    const y = 52 + index * 4.3;
    setText(pdf, 6.3, index % 2 === 0);
    pdf.text(ability.label, 13, y);
    pdf.text(String(ability.score), 64, y, { align: 'right' });
    pdf.text(String(ability.untrained), 86, y, { align: 'right' });
    const resistance = ability.resistance === null ? '-' : `${ability.resistance >= 0 ? '+' : ''}${ability.resistance}`;
    pdf.text(resistance, 109, y, { align: 'right' });
  });

  section(pdf, 115, 38, 91, 19, 'Action Check Score');
  const action = model.actionCheck;
  setText(pdf, 6.2);
  pdf.text(`Marginal ${action.marginal}+`, 118, 48);
  pdf.text(`Ordinary ${action.ordinary}`, 143, 48);
  pdf.text(`Good ${action.good}`, 169, 48);
  pdf.text(`Amazing ${action.amazing}`, 188, 48);
  setText(pdf, 5.5, true, MUTED);
  pdf.text(`Actions per round: ${model.actionsPerRound}`, 118, 53.5);

  section(pdf, 115, 60, 91, 20, 'Durability');
  const durability = [
    ['Stun', model.durability.stun], ['Wound', model.durability.wound],
    ['Mortal', model.durability.mortal], ['Fatigue', model.durability.fatigue],
  ] as const;
  durability.forEach(([label, value], index) => {
    const x = 119 + (index % 2) * 43;
    const y = 69 + Math.floor(index / 2) * 6;
    setText(pdf, 6.2, true);
    pdf.text(`${label} ${value}`, x, y);
    pdf.setDrawColor(145);
    for (let box = 0; box < Math.min(value, 12); box += 1) {
      pdf.rect(x + 17 + box * 1.65, y - 2.1, 1.2, 1.2);
    }
  });

  section(pdf, MARGIN, 83, CONTENT_WIDTH, 107, 'Skills');
  setText(pdf, 5.2, true, MUTED);
  pdf.text('SKILL', 13, 91); pdf.text('RANK', 82, 91, { align: 'right' }); pdf.text('SCORE', 108, 91, { align: 'right' });
  pdf.text('SKILL', 113, 91); pdf.text('RANK', 181, 91, { align: 'right' }); pdf.text('SCORE', 203, 91, { align: 'right' });
  const left = skillLines(model, ['str', 'dex', 'con']);
  const right = skillLines(model, ['int', 'wil', 'per']);
  drawSkillColumn(pdf, left.slice(0, MAIN_SKILL_LINES), 13, 96, 96);
  drawSkillColumn(pdf, right.slice(0, MAIN_SKILL_LINES), 113, 96, 91);

  section(pdf, MARGIN, 193, 118, 74, 'Weapons & Armor');
  model.attacks.slice(0, 4).forEach((attack, index) => {
    const y = 202 + index * 9;
    setText(pdf, 6.3, true);
    const attackScore = attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-';
    pdf.text(fittedLines(pdf, `${attack.name} (${attack.skill} ${attackScore})`, 111, 1), 13, y);
    setText(pdf, 5.5);
    pdf.text(fittedLines(pdf, `${attack.damage}; range ${attack.range}; ${attack.mode || attack.accuracy}`, 111, 1), 16, y + 3.6);
  });
  const armor = model.armor.slice(0, 2)
    .map((entry) => `${entry.name}: ${entry.lowImpact} LI / ${entry.highImpact} HI / ${entry.energy} En`)
    .join('; ') || 'None';
  setText(pdf, 5.2, true, MUTED);
  pdf.text('ARMOR', 13, 241);
  setText(pdf, 5.8);
  pdf.text(fittedLines(pdf, armor, 111, 3), 13, 245, { lineHeightFactor: 1.1 });
  if (model.attacks.length > 4) {
    setText(pdf, 5.2, true, ACCENT);
    pdf.text(`${model.attacks.length - 4} additional attack(s) on continuation page`, 13, 262);
  }

  section(pdf, 131, 193, 75, 32, 'Gear');
  setText(pdf, 5.7);
  const gear = gearNames(model);
  const gearLines = pdf.splitTextToSize(gear, 69) as string[];
  pdf.text(fittedLines(pdf, gear, 69, 5), 134, 202, { lineHeightFactor: 1.1 });

  section(pdf, 131, 228, 75, 39, 'Background');
  setText(pdf, 5.7);
  const background = model.background || model.notes || '-';
  const backgroundLines = pdf.splitTextToSize(background, 69) as string[];
  pdf.text(fittedLines(pdf, background, 69, 8), 134, 237, { lineHeightFactor: 1.1 });

  return {
    leftSkills: left.slice(MAIN_SKILL_LINES),
    rightSkills: right.slice(MAIN_SKILL_LINES),
    gearContinued: gearLines.length > 5 || model.armor.length > 2,
    backgroundContinued: backgroundLines.length > 8,
  };
}

function continuationHeader(pdf: jsPDF, model: CharacterSheetModel, title: string): number {
  header(pdf, model, title);
  return 26;
}

function continuationSection(pdf: jsPDF, title: string, lines: string[], startY: number): number {
  if (lines.length === 0) return startY;
  let y = startY;
  setText(pdf, 8, true, ACCENT);
  pdf.text(title.toUpperCase(), MARGIN, y);
  y += 5;
  setText(pdf, 6.5);
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line, CONTENT_WIDTH) as string[];
    for (const wrappedLine of wrapped) {
      if (y > PAGE_HEIGHT - 14) {
        pdf.addPage();
        y = MARGIN;
      }
      pdf.text(wrappedLine, MARGIN, y);
      y += 4;
    }
  }
  return y + 3;
}

function drawContinuation(
  pdf: jsPDF,
  model: CharacterSheetModel,
  leftSkills: SkillLine[],
  rightSkills: SkillLine[],
  includeGear: boolean,
  includeBackground: boolean,
): void {
  const hasContinuation = leftSkills.length > 0 || rightSkills.length > 0 || model.attacks.length > 4
    || includeGear || includeBackground || Boolean(model.fxBroadSkill);
  if (!hasContinuation) return;
  pdf.addPage();
  let y = continuationHeader(pdf, model, 'NPC PROFILE CONTINUED');
  const skills = [...leftSkills, ...rightSkills]
    .filter((line) => line.kind === 'skill')
    .map((line) => `${line.label}${line.rank ? ` (rank ${line.rank})` : ''}: ${line.score}`);
  y = continuationSection(pdf, 'Skills Continued', skills, y);
  if (model.fxBroadSkill) {
    y = continuationSection(pdf, 'FX', [
      `${model.fxBroadSkill}; ${model.fxCampaignTone}; ${model.currentMaximumFxEnergy}/${model.maximumFxEnergy} FX energy`,
      ...model.fxAbilities.map((ability) => (
        `${ability.name} (${ability.ability.toUpperCase()}, ${ability.quality}, rank ${ability.rank}, ${ability.ordinary}/${ability.good}/${ability.amazing}, ${ability.energyCost} FX): ${ability.description}`
      )),
    ], y);
  }
  y = continuationSection(
    pdf,
    'Additional Attacks',
    model.attacks.slice(4).map((attack) => {
      const attackScore = attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-';
      return `${attack.name} (${attack.skill} ${attackScore}): ${attack.damage}; range ${attack.range}; ${attack.mode || attack.accuracy}`;
    }),
    y,
  );
  if (includeGear) {
    y = continuationSection(pdf, 'Armor', model.armor.map((entry) => (
      `${entry.name}: ${entry.lowImpact} LI / ${entry.highImpact} HI / ${entry.energy} En`
    )), y);
    y = continuationSection(pdf, 'Gear', [
      ...model.equipment,
      ...model.computers,
      ...model.cybergear,
    ].map((item) => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}${item.details ? `: ${item.details}` : ''}`), y);
  }
  if (includeBackground) continuationSection(pdf, 'Background', [model.background || model.notes || '-'], y);
}

function footer(pdf: jsPDF, page: number, pages: number): void {
  setText(pdf, 5.2, false, MUTED);
  pdf.text(`${APP_NAME} v${APP_VERSION}`, MARGIN, PAGE_HEIGHT - 5);
  pdf.text(`Page ${page}/${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 5, { align: 'right' });
}

/** Create the compact PHB page-14-style profile intended for NPC reference. */
export function createNpcCharacterPdf(
  state: CharacterState,
  validation: CharacterValidationResult,
): jsPDF {
  const model = buildCharacterSheetModel(state, validation);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const continuation = drawMainPage(pdf, model);
  drawContinuation(
    pdf,
    model,
    continuation.leftSkills,
    continuation.rightSkills,
    continuation.gearContinued,
    continuation.backgroundContinued,
  );
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    footer(pdf, page, pages);
  }
  return pdf;
}
