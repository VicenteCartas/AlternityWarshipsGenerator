import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import { buildCharacterSheetModel, type CharacterSheetModel } from './characterSheetService';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

const INK: [number, number, number] = [31, 53, 66];
const ACCENT: [number, number, number] = [35, 119, 143];
const PALE: [number, number, number] = [229, 240, 243];
const MUTED: [number, number, number] = [92, 104, 110];
const ERROR: [number, number, number] = [176, 48, 48];

function setText(pdf: jsPDF, size: number, bold = false, color: [number, number, number] = INK): void {
  pdf.setFont('helvetica', bold ? 'bold' : 'normal');
  pdf.setFontSize(size);
  pdf.setTextColor(...color);
}

function drawFittedText(
  pdf: jsPDF,
  value: string,
  x: number,
  y: number,
  width: number,
  maxLines = 1,
): void {
  const text = value || '-';
  const originalSize = pdf.getFontSize();
  let size = originalSize;
  let lines = pdf.splitTextToSize(text, width) as string[];
  while (lines.length > maxLines && size > 3.5) {
    size -= 0.2;
    pdf.setFontSize(size);
    lines = pdf.splitTextToSize(text, width) as string[];
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let finalLine = lines[maxLines - 1] || '';
    while (finalLine.length > 0 && pdf.getTextWidth(`${finalLine}...`) > width) {
      finalLine = finalLine.slice(0, -1);
    }
    lines[maxLines - 1] = `${finalLine.trimEnd()}...`;
  }
  pdf.text(lines, x, y, { lineHeightFactor: 1.05 });
  pdf.setFontSize(originalSize);
}

function panel(pdf: jsPDF, x: number, y: number, width: number, height: number, title: string): void {
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.35);
  pdf.rect(x, y, width, height);
  pdf.setFillColor(...PALE);
  pdf.rect(x, y, width, 6, 'F');
  setText(pdf, 8, true, ACCENT);
  pdf.text(title.toUpperCase(), x + 2, y + 4.2);
}

function field(
  pdf: jsPDF,
  label: string,
  value: string | number,
  x: number,
  y: number,
  width: number,
  maxLines = 1,
): void {
  setText(pdf, 5.7, true, MUTED);
  pdf.text(label.toUpperCase(), x, y);
  setText(pdf, 7.2);
  const displayedValue = value === '' || value === null || value === undefined ? '-' : String(value);
  drawFittedText(pdf, displayedValue, x, y + 3.7, width, maxLines);
}

function title(pdf: jsPDF, model: CharacterSheetModel, pageLabel: string): void {
  setText(pdf, 15, true, ACCENT);
  drawFittedText(pdf, model.heroName, 9, 14, 125);
  setText(pdf, 7, true, MUTED);
  pdf.text(`${pageLabel} | ${APP_NAME}`, 207, model.valid ? 13 : 10.5, { align: 'right' });
  if (!model.valid) {
    setText(pdf, 6, true, ERROR);
    pdf.text(`INCOMPLETE: ${model.errors.length} ${model.errors.length === 1 ? 'ISSUE' : 'ISSUES'}`, 207, 14.5, { align: 'right' });
  }
  pdf.setDrawColor(...ACCENT);
  pdf.setLineWidth(0.6);
  pdf.line(9, 17, 207, 17);
}

function footer(pdf: jsPDF, page: number, pages: number): void {
  setText(pdf, 5.5, false, MUTED);
  pdf.text(`${APP_NAME} v${APP_VERSION}`, 9, 274);
  pdf.text(`Page ${page}/${pages}`, 207, 274, { align: 'right' });
}

function drawCorePage(pdf: jsPDF, model: CharacterSheetModel): void {
  title(pdf, model, 'Hero Sheet');
  panel(pdf, 9, 21, 198, 26, 'Identity');
  field(pdf, 'Player', model.playerName, 12, 30, 42);
  field(pdf, 'Species', model.species, 57, 30, 30);
  field(pdf, 'Profession', model.profession, 90, 30, 34);
  field(pdf, 'Career', model.career, 127, 30, 35, 2);
  field(pdf, 'Gender', model.gender, 165, 30, 18);
  field(pdf, 'PL', model.progressLevel, 187, 30, 14);
  field(pdf, 'Attributes', model.attributes, 12, 40, 73);
  field(pdf, 'Setting', model.setting, 90, 40, 38);
  field(pdf, 'Gamemaster', model.gamemaster, 132, 40, 40);
  field(pdf, 'Last Resorts', `${model.lastResorts.initial}/${model.lastResorts.maximum}`, 176, 40, 25);

  panel(pdf, 9, 51, 72, 70, 'Abilities');
  setText(pdf, 5.7, true, MUTED);
  pdf.text('ABILITY', 12, 61); pdf.text('SCORE', 46, 61); pdf.text('UNTRAINED', 57, 61); pdf.text('RES.', 75, 61, { align: 'right' });
  model.abilities.forEach((ability, index) => {
    const rowY = 68 + index * 8;
    setText(pdf, 7, index % 2 === 0);
    pdf.text(ability.label, 12, rowY);
    pdf.text(String(ability.score), 49, rowY, { align: 'center' });
    pdf.text(String(ability.untrained), 65, rowY, { align: 'center' });
    pdf.text(ability.resistance === null ? '-' : `${ability.resistance >= 0 ? '+' : ''}${ability.resistance}`, 77, rowY, { align: 'center' });
  });

  panel(pdf, 85, 51, 122, 31, 'Action Check');
  const actionValues = [
    ['Marginal', model.actionCheck.marginal], ['Ordinary', model.actionCheck.ordinary],
    ['Good', model.actionCheck.good], ['Amazing', model.actionCheck.amazing],
  ] as const;
  actionValues.forEach(([label, value], index) => field(pdf, label, value, 89 + index * 28, 62, 24));
  field(pdf, 'Situation Die', model.actionCheck.dieStep >= 0 ? `+${model.actionCheck.dieStep} steps` : `${model.actionCheck.dieStep} steps`, 89, 74, 45);
  field(pdf, 'Actions / Round', model.actionsPerRound, 148, 74, 40);

  panel(pdf, 85, 86, 122, 35, 'Combat Movement');
  const movement = [
    ['Sprint', model.movement.sprint], ['Run', model.movement.run], ['Walk', model.movement.walk],
    ['Easy Swim', model.movement.easySwim], ['Swim', model.movement.swim],
    ['Glide', model.movement.glide], ['Fly', model.movement.fly],
  ] as const;
  movement.forEach(([label, value], index) => field(pdf, label, value, 89 + (index % 4) * 28, 97 + Math.floor(index / 4) * 11, 24));

  panel(pdf, 9, 125, 198, 25, 'Durability');
  const durability = [
    ['Stun', model.durability.stun], ['Wound', model.durability.wound],
    ['Mortal', model.durability.mortal], ['Fatigue', model.durability.fatigue],
  ] as const;
  durability.forEach(([label, value], index) => {
    const x = 14 + index * 48;
    field(pdf, label, value, x, 137, 15);
    pdf.setDrawColor(145);
    for (let box = 0; box < Math.min(value, 18); box += 1) pdf.rect(x + 14 + box * 1.7, 134.2, 1.3, 1.3);
  });

  panel(pdf, 9, 154, 96, 48, 'Game Data');
  field(pdf, 'Species Abilities', model.speciesAbilities.join('; '), 12, 164, 88, 2);
  field(pdf, 'Profession Benefits', model.professionBenefits.join('; '), 12, 176, 88, 2);
  field(pdf, 'Perks', model.perks.map((entry) => entry.name).join(', '), 12, 188, 88);
  field(pdf, 'Flaws', model.flaws.map((entry) => entry.name).join(', '), 12, 196, 88);

  panel(pdf, 109, 154, 98, 48, 'Personal Data');
  field(pdf, 'Age / Height / Weight', `${model.age || '-'} / ${model.height || '-'} / ${model.weight || '-'}`, 112, 164, 88);
  field(pdf, 'Hair / Eyes', `${model.hair || '-'} / ${model.eyes || '-'}`, 112, 174, 88);
  field(pdf, 'Appearance', model.appearance, 112, 184, 88, 2);
  field(pdf, 'Allegiance / Status', `${model.allegiance || '-'} / ${model.socialStatus || '-'}`, 112, 196, 88);

  panel(pdf, 9, 206, 198, 61, 'Attack Forms & Armor');
  setText(pdf, 5.5, true, MUTED);
  pdf.text('ATTACK', 12, 216); pdf.text('SKILL', 50, 216); pdf.text('SCORE', 85, 216); pdf.text('ACC', 105, 216);
  pdf.text('ACT', 117, 216); pdf.text('RANGE', 130, 216); pdf.text('DAMAGE', 166, 216);
  model.attacks.slice(0, 7).forEach((attack, index) => {
    const rowY = 222 + index * 5.2;
    setText(pdf, 6.2);
    drawFittedText(pdf, attack.name, 12, rowY, 34);
    drawFittedText(pdf, attack.skill, 50, rowY, 31);
    pdf.text(attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-', 85, rowY);
    pdf.text(attack.accuracy, 106, rowY); pdf.text(attack.actions, 119, rowY);
    drawFittedText(pdf, attack.range, 130, rowY, 31); drawFittedText(pdf, attack.damage, 166, rowY, 38);
  });
  const armorText = model.armor.map((entry) => `${entry.name}: ${entry.lowImpact}/${entry.highImpact}/${entry.energy}`).join('; ') || 'No armor';
  field(pdf, 'Armor', armorText, 12, 260, 188, 2);
}

function getPrintableItems(model: CharacterSheetModel): CharacterSheetModel['equipment'] {
  return [
    ...model.equipment,
    ...model.computers.map((entry) => ({ ...entry, name: `Computer: ${entry.name}` })),
    ...model.cybergear.map((entry) => ({ ...entry, name: `Cybergear: ${entry.name}` })),
    ...model.armor.map((entry) => ({
      name: `Armor: ${entry.name}`,
      quantity: entry.quantity,
      details: `${entry.lowImpact}/${entry.highImpact}/${entry.energy}`,
      mass: entry.mass,
    })),
  ];
}

function drawSkillsAndGearPage(pdf: jsPDF, model: CharacterSheetModel): void {
  title(pdf, model, 'Skills & Equipment');
  panel(pdf, 9, 21, 198, 36, 'Weapons');
  setText(pdf, 5.5, true, MUTED);
  pdf.text('WEAPON', 12, 31); pdf.text('SKILL', 46, 31); pdf.text('QTY', 76, 31); pdf.text('CLIPS', 88, 31);
  pdf.text('ACC', 105, 31); pdf.text('ACT', 117, 31); pdf.text('MODE', 129, 31); pdf.text('RANGE', 148, 31); pdf.text('DAMAGE', 176, 31);
  model.attacks.slice(1, 7).forEach((attack, index) => {
    const rowY = 36.5 + index * 3.8;
    setText(pdf, 6.2);
    drawFittedText(pdf, attack.name, 12, rowY, 30); drawFittedText(pdf, attack.skill, 46, rowY, 26);
    pdf.text(String(attack.quantity), 78, rowY); pdf.text(String(attack.clips), 91, rowY);
    pdf.text(attack.accuracy, 106, rowY); pdf.text(attack.actions, 119, rowY); drawFittedText(pdf, attack.mode, 129, rowY, 15);
    drawFittedText(pdf, attack.range, 148, rowY, 25); drawFittedText(pdf, attack.damage, 176, rowY, 28);
  });

  panel(pdf, 9, 61, 198, 40, 'Equipment');
  const items = getPrintableItems(model);
  const equipmentColumns = 3;
  items.slice(0, 24).forEach((item, index) => {
    const column = index % equipmentColumns;
    const row = Math.floor(index / equipmentColumns);
    const x = 12 + column * 64;
    const y = 71 + row * 3.4;
    setText(pdf, 6.2);
    drawFittedText(pdf, `${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''}`, x, y, 60);
  });

  panel(pdf, 9, 105, 198, 133, 'Skills');
  const skills = model.skills;
  const rowsPerColumn = 30;
  skills.slice(0, rowsPerColumn * 2).forEach((skill, index) => {
    const column = Math.floor(index / rowsPerColumn);
    const row = index % rowsPerColumn;
    const x = 12 + column * 97;
    const y = 116 + row * 4;
    setText(pdf, 5.9);
    pdf.text(skill.ability.toUpperCase(), x, y);
    drawFittedText(pdf, skill.name, x + 10, y, 57);
    pdf.text(skill.rank === null ? '-' : String(skill.rank), x + 70, y, { align: 'center' });
    pdf.text(`${skill.ordinary}/${skill.good}/${skill.amazing}`, x + 94, y, { align: 'right' });
  });

  panel(pdf, 9, 242, 198, 25, 'Contacts & Notes');
  field(pdf, 'Contacts', model.contacts, 12, 251, 91);
  field(pdf, 'Enemies', model.enemies, 109, 251, 91);
  const narrative = [
    model.background ? `Background: ${model.background}` : '',
    model.notes ? `Notes: ${model.notes}` : '',
  ].filter(Boolean).join(' | ');
  field(pdf, 'Background / Notes', narrative, 12, 260, 188, 2);
}

function drawSupplementalPage(pdf: jsPDF, model: CharacterSheetModel): void {
  title(pdf, model, 'Supplemental Sheet');
  panel(pdf, 9, 21, 96, 105, 'Psionics');
  field(pdf, 'Access / Energy', `${model.psionicAccessPath} / ${model.psionicEnergy}`, 12, 31, 45);
  model.psionicSkills.slice(0, 20).forEach((skill, index) => {
    const rowY = 42 + index * 4;
    setText(pdf, 6.2);
    drawFittedText(pdf, skill.name, 12, rowY, 54);
    pdf.text(String(skill.rank ?? '-'), 76, rowY, { align: 'center' });
    pdf.text(`${skill.ordinary}/${skill.good}/${skill.amazing}`, 101, rowY, { align: 'right' });
  });

  panel(pdf, 109, 21, 98, 105, 'Mutations');
  field(pdf, 'Origin / Scope', `${model.mutationOrigin} / ${model.mutationScope}`, 112, 31, 88);
  model.mutations.slice(0, 18).forEach((entry, index) => {
    const rowY = 42 + index * 4.3;
    setText(pdf, 6.2);
    drawFittedText(pdf, `${entry.name}${entry.details ? ` (${entry.details})` : ''}`, 112, rowY, 90);
  });

  panel(pdf, 9, 130, 96, 72, 'Cybertech');
  field(pdf, 'Cyber Tolerance', `${model.usedCyberTolerance}/${model.cyberTolerance}`, 12, 140, 40);
  model.cybergear.slice(0, 12).forEach((item, index) => {
    const rowY = 151 + index * 4;
    setText(pdf, 6.2);
    drawFittedText(pdf, `${item.quantity}x ${item.name} (${item.details})`, 12, rowY, 88);
  });

  panel(pdf, 109, 130, 98, 72, 'Computers');
  model.computers.slice(0, 12).forEach((item, index) => {
    const rowY = 142 + index * 4.5;
    setText(pdf, 6.2);
    drawFittedText(pdf, `${item.quantity}x ${item.name} (${item.details})`, 112, rowY, 90);
  });

  panel(pdf, 9, 206, 198, 57, 'Perks, Flaws & Notes');
  field(pdf, 'Perks', model.perks.map((entry) => entry.name).join(', '), 12, 216, 91, 2);
  field(pdf, 'Flaws', model.flaws.map((entry) => entry.name).join(', '), 109, 216, 91, 2);
  field(pdf, 'Contacts', model.contacts, 12, 228, 91, 2);
  field(pdf, 'Enemies', model.enemies, 109, 228, 91, 2);
  const narrative = [
    model.background ? `Background: ${model.background}` : '',
    model.notes ? `Notes: ${model.notes}` : '',
  ].filter(Boolean).join(' | ');
  field(pdf, 'Background / Notes', narrative, 12, 242, 188, 2);
}

function drawAttackContinuationPages(pdf: jsPDF, model: CharacterSheetModel): void {
  const attacks = model.attacks.slice(7);
  const rowsPerPage = 40;
  for (let offset = 0; offset < attacks.length; offset += rowsPerPage) {
    pdf.addPage();
    title(pdf, model, 'Attacks Continued');
    panel(pdf, 9, 21, 198, 246, 'Attack Forms');
    setText(pdf, 5.5, true, MUTED);
    pdf.text('ATTACK', 12, 31); pdf.text('SKILL', 50, 31); pdf.text('SCORE', 84, 31);
    pdf.text('QTY', 105, 31); pdf.text('CLIPS', 118, 31); pdf.text('RANGE', 137, 31); pdf.text('DAMAGE', 171, 31);
    attacks.slice(offset, offset + rowsPerPage).forEach((attack, index) => {
      const rowY = 38 + index * 5.3;
      setText(pdf, 6.2);
      drawFittedText(pdf, attack.name, 12, rowY, 34);
      drawFittedText(pdf, attack.skill, 50, rowY, 30);
      pdf.text(attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-', 84, rowY);
      pdf.text(String(attack.quantity), 108, rowY);
      pdf.text(String(attack.clips), 122, rowY);
      drawFittedText(pdf, attack.range, 137, rowY, 30);
      drawFittedText(pdf, attack.damage, 171, rowY, 33);
    });
  }
}

function drawItemContinuationPages(pdf: jsPDF, model: CharacterSheetModel): void {
  const items = getPrintableItems(model).slice(24);
  const rowsPerColumn = 60;
  const itemsPerPage = rowsPerColumn * 3;
  for (let offset = 0; offset < items.length; offset += itemsPerPage) {
    pdf.addPage();
    title(pdf, model, 'Equipment Continued');
    panel(pdf, 9, 21, 198, 246, 'Equipment');
    items.slice(offset, offset + itemsPerPage).forEach((item, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const x = 12 + column * 64;
      const y = 32 + row * 3.8;
      setText(pdf, 6.2);
      drawFittedText(pdf, `${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''}`, x, y, 60);
    });
  }
}

function drawSkillContinuationPages(
  pdf: jsPDF,
  model: CharacterSheetModel,
  skills: CharacterSheetModel['skills'],
  pageLabel: string,
): void {
  const rowsPerColumn = 56;
  const skillsPerPage = rowsPerColumn * 2;
  for (let offset = 0; offset < skills.length; offset += skillsPerPage) {
    pdf.addPage();
    title(pdf, model, pageLabel);
    panel(pdf, 9, 21, 198, 246, pageLabel);
    skills.slice(offset, offset + skillsPerPage).forEach((skill, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const x = 12 + column * 97;
      const y = 32 + row * 4;
      setText(pdf, 5.9);
      pdf.text(skill.ability.toUpperCase(), x, y);
      drawFittedText(pdf, skill.name, x + 10, y, 57);
      pdf.text(skill.rank === null ? '-' : String(skill.rank), x + 70, y, { align: 'center' });
      pdf.text(`${skill.ordinary}/${skill.good}/${skill.amazing}`, x + 94, y, { align: 'right' });
    });
  }
}

function drawMutationContinuationPages(pdf: jsPDF, model: CharacterSheetModel): void {
  const mutations = model.mutations.slice(18);
  const rowsPerPage = 54;
  for (let offset = 0; offset < mutations.length; offset += rowsPerPage) {
    pdf.addPage();
    title(pdf, model, 'Mutations Continued');
    panel(pdf, 9, 21, 198, 246, 'Mutations');
    mutations.slice(offset, offset + rowsPerPage).forEach((entry, index) => {
      setText(pdf, 6.3);
      drawFittedText(pdf, `${entry.name}${entry.details ? ` (${entry.details})` : ''}`, 12, 32 + index * 4.2, 190);
    });
  }
}

export function createPrintableCharacterSheetPdf(
  state: CharacterState,
  validation: CharacterValidationResult,
): jsPDF {
  const model = buildCharacterSheetModel(state, validation);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  drawCorePage(pdf, model);
  pdf.addPage();
  drawSkillsAndGearPage(pdf, model);
  drawAttackContinuationPages(pdf, model);
  drawItemContinuationPages(pdf, model);
  drawSkillContinuationPages(pdf, model, model.skills.slice(60), 'Skills Continued');
  const hasSupplement = model.psionicSkills.length > 0 || model.mutations.length > 0
    || model.cybergear.length > 0 || model.computers.length > 0;
  if (hasSupplement) {
    pdf.addPage();
    drawSupplementalPage(pdf, model);
    drawSkillContinuationPages(pdf, model, model.psionicSkills.slice(20), 'Psionics Continued');
    drawMutationContinuationPages(pdf, model);
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    footer(pdf, page, pages);
  }
  return pdf;
}