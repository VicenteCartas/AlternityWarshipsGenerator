import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import {
  buildCharacterSheetModel,
  type CharacterSheetModel,
  type CharacterSheetSkillGroup,
  type CharacterSheetSkillRow,
} from './characterSheetService';
import type { AbilityId } from '../types/character';
import type { CharacterState, CharacterValidationResult } from '../types/characterState';

const ABILITY_LABELS: Record<AbilityId, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wil: 'WIL', per: 'PER',
};


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
    field(pdf, 'Level / PL', `${model.level} / ${model.progressLevel}`, 184, 30, 19);
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
  field(pdf, 'Age / Height / Weight', `${model.age || '-'} / ${model.height || '-'} / ${model.weight || '-'}`, 112, 163, 88);
  field(pdf, 'Appearance', model.appearance, 112, 171, 88);
  field(pdf, 'Allegiance / Status', `${model.allegiance || '-'} / ${model.socialStatus || '-'}`, 112, 179, 88);
  field(pdf, 'Contacts / Enemies', `${model.contacts || '-'} / ${model.enemies || '-'}`, 112, 187, 88);
  field(pdf, 'Wealth', `${model.remainingFunds} cr (started ${model.startingFunds} cr)`, 112, 195, 88);

  panel(pdf, 9, 206, 198, 61, 'Attack Forms & Armor');
  setText(pdf, 5.5, true, MUTED);
  pdf.text('ATTACK', 12, 216); pdf.text('SKILL', 50, 216); pdf.text('SCORE', 85, 216); pdf.text('ACC', 105, 216);
  pdf.text('ACT', 117, 216); pdf.text('RANGE', 128, 216); pdf.text('TYPE', 152, 216); pdf.text('DAMAGE', 165, 216);
  const attackRows = model.attacks.slice(0, 7);
  attackRows.forEach((attack, index) => {
    const rowY = 222 + index * 5.2;
    setText(pdf, 6.2);
    drawFittedText(pdf, attack.name, 12, rowY, 34);
    drawFittedText(pdf, attack.skill, 50, rowY, 31);
    pdf.text(attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-', 85, rowY);
    pdf.text(attack.accuracy, 106, rowY); pdf.text(attack.actions, 119, rowY);
    drawFittedText(pdf, attack.range, 128, rowY, 22);
    drawFittedText(pdf, attack.damageType, 152, rowY, 11);
    drawFittedText(pdf, attack.damage, 165, rowY, 39);
  });
  const armorTop = 222 + attackRows.length * 5.2 + 3;
  setText(pdf, 5.7, true, MUTED);
  pdf.text('ARMOR', 12, armorTop);
  pdf.text('LI / HI / EN', 50, armorTop);
  if (model.armor.length === 0) {
    setText(pdf, 6.5);
    pdf.text('No armor', 12, armorTop + 4);
  } else {
    model.armor.forEach((entry, index) => {
      const rowY = armorTop + 4.5 + index * 3.8;
      setText(pdf, 6.2);
      drawFittedText(pdf, entry.name, 12, rowY, 34);
      drawFittedText(pdf, `${entry.lowImpact} / ${entry.highImpact} / ${entry.energy}`, 50, rowY, 154);
    });
  }
}

function getPrintableItems(model: CharacterSheetModel): CharacterSheetModel['equipment'] {
  return [
    ...model.equipment,
    ...model.computers.map((entry) => ({ ...entry, name: `Computer: ${entry.name}` })),
    ...model.cybergear.map((entry) => ({ ...entry, name: `Cybergear: ${entry.name}` })),
    ...model.armor.map((entry) => ({
      name: `Armor: ${entry.name}`,
      quantity: entry.quantity,
      details: `LI ${entry.lowImpact} / HI ${entry.highImpact} / En ${entry.energy}`,
      mass: entry.mass,
    })),
  ];
}

/** Counts the display rows a set of skill groups will occupy (one row per ability header, broad, and specialty). */
function countRows(groups: CharacterSheetSkillGroup[]): number {
  let lastAbility: AbilityId | null = null;
  let rows = 0;
  for (const group of groups) {
    if (group.ability !== lastAbility) {
      rows += 1;
      lastAbility = group.ability;
    }
    rows += 1 + group.specialties.length;
  }
  return rows;
}

function drawCatalogRow(
  pdf: jsPDF,
  row: CharacterSheetSkillRow,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  indented: boolean,
): void {
  setText(pdf, fontSize, false, INK);
  pdf.setFont('helvetica', indented ? 'italic' : 'normal');
  const nameX = x + (indented ? 3 : 0);
  drawFittedText(pdf, row.name, nameX, y, width - 20 - (indented ? 3 : 0));
  pdf.setFont('helvetica', indented ? 'italic' : 'normal');
  pdf.setFontSize(fontSize);
  if (row.rank !== null) pdf.text(String(row.rank), x + width - 16, y, { align: 'right' });
  pdf.text(row.usable ? `${row.ordinary}/${row.good}/${row.amazing}` : '-', x + width, y, { align: 'right' });
}

/** Renders a hierarchical skill catalogue column: ability headers, broad skills, and their indented specialties. */
function drawSkillCatalogColumn(
  pdf: jsPDF,
  groups: CharacterSheetSkillGroup[],
  x: number,
  startY: number,
  width: number,
  availableHeight: number,
): void {
  const totalRows = countRows(groups);
  const rowHeight = totalRows > 0 ? Math.max(2.5, Math.min(3.8, availableHeight / totalRows)) : 3.8;
  const fontSize = Math.max(4.3, Math.min(5.8, rowHeight * 1.5));
  let y = startY;
  let lastAbility: AbilityId | null = null;
  for (const group of groups) {
    if (group.ability !== lastAbility) {
      setText(pdf, fontSize, true, ACCENT);
      pdf.text(ABILITY_LABELS[group.ability], x, y);
      y += rowHeight;
      lastAbility = group.ability;
    }
    drawCatalogRow(pdf, group.broad, x, y, width, fontSize, false);
    y += rowHeight;
    for (const specialty of group.specialties) {
      drawCatalogRow(pdf, specialty, x, y, width, fontSize, true);
      y += rowHeight;
    }
  }
}

function abilitySkillGroups(model: CharacterSheetModel, abilities: AbilityId[]): CharacterSheetSkillGroup[] {
  return model.fullSkillCatalog.filter((group) => abilities.includes(group.ability));
}

/** Full pre-filled skill catalogue (page 257 style): every skill shown, trained or not, so it's easy to see what to roll. */
function drawSkillsPage(pdf: jsPDF, model: CharacterSheetModel): void {
  title(pdf, model, 'Skills');
  panel(pdf, 9, 21, 198, 246, 'Skills');
  const columns: Array<{ x: number; abilities: AbilityId[] }> = [
    { x: 12, abilities: ['str', 'dex', 'con'] },
    { x: 78, abilities: ['int'] },
    { x: 144, abilities: ['wil', 'per'] },
  ];
  setText(pdf, 5.5, true, MUTED);
  columns.forEach(({ x }) => {
    pdf.text('SKILL', x, 29);
    pdf.text('RANK', x + 44, 29, { align: 'right' });
    pdf.text('SCORE', x + 60, 29, { align: 'right' });
  });
  const startY = 34;
  const availableHeight = 262 - startY;
  columns.forEach(({ x, abilities }) => {
    drawSkillCatalogColumn(pdf, abilitySkillGroups(model, abilities), x, startY, 60, availableHeight);
  });
}

function drawExtrasPage(pdf: jsPDF, model: CharacterSheetModel): void {
  title(pdf, model, 'Extras');
  const weaponRows = 12;
  panel(pdf, 9, 21, 198, 12 + weaponRows * 4.2, 'Weapon Data');
  setText(pdf, 5.5, true, MUTED);
  pdf.text('WEAPON', 12, 31); pdf.text('SKILL', 50, 31); pdf.text('ACC', 84, 31);
  pdf.text('ACT', 96, 31); pdf.text('CLIP/AMMO', 108, 31); pdf.text('RANGE', 128, 31); pdf.text('TYPE', 156, 31); pdf.text('DAMAGE', 170, 31);
  model.attacks.slice(0, weaponRows).forEach((attack, index) => {
    const rowY = 36.5 + index * 4.2;
    setText(pdf, 6.2);
    drawFittedText(pdf, attack.name, 12, rowY, 36);
    drawFittedText(pdf, attack.skill, 50, rowY, 32);
    pdf.text(attack.accuracy, 86, rowY, { align: 'right' });
    pdf.text(attack.actions, 98, rowY, { align: 'right' });
    pdf.text(`${attack.quantity}/${attack.clips}`, 122, rowY, { align: 'right' });
    drawFittedText(pdf, attack.range, 128, rowY, 26);
    drawFittedText(pdf, attack.damageType, 156, rowY, 12);
    drawFittedText(pdf, attack.damage, 170, rowY, 36);
  });

  const equipmentTop = 21 + 12 + weaponRows * 4.2 + 6;
  const equipmentHeight = 70;
  panel(pdf, 9, equipmentTop, 198, equipmentHeight, 'Equipment');
  const items = getPrintableItems(model);
  const equipmentColumns = 3;
  const equipmentRowsPerPage = 15;
  items.slice(0, equipmentColumns * equipmentRowsPerPage).forEach((item, index) => {
    const column = index % equipmentColumns;
    const row = Math.floor(index / equipmentColumns);
    const x = 12 + column * 64;
    const y = equipmentTop + 10 + row * 3.6;
    setText(pdf, 6.2);
    drawFittedText(pdf, `${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''}`, x, y, 60);
  });

  const notesTop = equipmentTop + equipmentHeight + 6;
  panel(pdf, 9, notesTop, 198, 267 - notesTop, 'Notes');
  field(pdf, 'Contacts', model.contacts, 12, notesTop + 10, 91, 2);
  field(pdf, 'Enemies', model.enemies, 109, notesTop + 10, 91, 2);
  const narrative = [
    model.background ? `Background: ${model.background}` : '',
    model.notes ? `Notes: ${model.notes}` : '',
  ].filter(Boolean).join(' | ');
  field(pdf, 'Background / Notes', narrative, 12, notesTop + 24, 188, 3);
}


function ensureRoom(pdf: jsPDF, model: CharacterSheetModel, cursor: { y: number }, needed: number): void {
  if (cursor.y + needed <= 267) return;
  pdf.addPage();
  title(pdf, model, 'Supplemental Sheet Continued');
  cursor.y = 21;
}

function drawPsionicsSection(pdf: jsPDF, model: CharacterSheetModel, cursor: { y: number }): void {
  if (model.psionicSkillGroups.length === 0) return;
  const rows = countRows(model.psionicSkillGroups);
  const bodyHeight = 11 + rows * 3.8 + 3;
  ensureRoom(pdf, model, cursor, bodyHeight + 6);
  panel(pdf, 9, cursor.y, 198, bodyHeight, 'Psionics');
  setText(pdf, 6.2, true, MUTED);
  pdf.text(`Access: ${model.psionicAccessPath}   Energy: ${model.psionicEnergy}`, 12, cursor.y + 11);
  drawSkillCatalogColumn(pdf, model.psionicSkillGroups, 12, cursor.y + 11 + 3.8, 186, rows * 3.8);
  cursor.y += bodyHeight + 6;
}

function drawMutationsSection(pdf: jsPDF, model: CharacterSheetModel, cursor: { y: number }): void {
  if (model.mutations.length === 0) return;
  const bodyHeight = 11 + model.mutations.length * 3.8 + 3;
  ensureRoom(pdf, model, cursor, bodyHeight + 6);
  panel(pdf, 9, cursor.y, 198, bodyHeight, 'Mutations');
  setText(pdf, 6.2, true, MUTED);
  pdf.text(`Origin: ${model.mutationOrigin}   Scope: ${model.mutationScope}`, 12, cursor.y + 11);
  let y = cursor.y + 11 + 3.8;
  model.mutations.forEach((entry) => {
    setText(pdf, 6.2);
    drawFittedText(pdf, `${entry.name}${entry.details ? ` (${entry.details})` : ''}`, 12, y, 186);
    y += 3.8;
  });
  cursor.y += bodyHeight + 6;
}

function drawCybertechSection(pdf: jsPDF, model: CharacterSheetModel, cursor: { y: number }): void {
  if (model.cybergear.length === 0) return;
  const bodyHeight = 11 + model.cybergear.length * 3.8 + 3;
  ensureRoom(pdf, model, cursor, bodyHeight + 6);
  panel(pdf, 9, cursor.y, 198, bodyHeight, 'Cybertech');
  setText(pdf, 6.2, true, MUTED);
  pdf.text(`Cyber Tolerance: ${model.usedCyberTolerance}/${model.cyberTolerance}`, 12, cursor.y + 11);
  let y = cursor.y + 11 + 3.8;
  model.cybergear.forEach((item) => {
    setText(pdf, 6.2);
    drawFittedText(pdf, `${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''}`, 12, y, 186);
    y += 3.8;
  });
  cursor.y += bodyHeight + 6;
}

function drawComputersSection(pdf: jsPDF, model: CharacterSheetModel, cursor: { y: number }): void {
  if (model.computers.length === 0) return;
  const bodyHeight = 8 + model.computers.length * 3.8 + 3;
  ensureRoom(pdf, model, cursor, bodyHeight + 6);
  panel(pdf, 9, cursor.y, 198, bodyHeight, 'Computers');
  let y = cursor.y + 11;
  model.computers.forEach((item) => {
    setText(pdf, 6.2);
    drawFittedText(pdf, `${item.quantity}x ${item.name}${item.details ? ` (${item.details})` : ''}`, 12, y, 186);
    y += 3.8;
  });
  cursor.y += bodyHeight + 6;
}

function drawFxSection(pdf: jsPDF, model: CharacterSheetModel, cursor: { y: number }): void {
  if (!model.fxBroadSkill) return;
  const bodyHeight = 11 + model.fxAbilities.length * 7 + 3;
  ensureRoom(pdf, model, cursor, bodyHeight + 6);
  panel(pdf, 9, cursor.y, 198, bodyHeight, 'FX');
  setText(pdf, 6.2, true, MUTED);
  pdf.text(`${model.fxBroadSkill} | ${model.fxCampaignTone} | ${model.currentMaximumFxEnergy}/${model.maximumFxEnergy} FX energy`, 12, cursor.y + 11);
  let y = cursor.y + 11 + 4;
  model.fxAbilities.forEach((ability) => {
    setText(pdf, 6.5, true);
    drawFittedText(pdf, ability.name, 12, y, 72);
    setText(pdf, 6.2);
    pdf.text(`${ability.ability.toUpperCase()} ${ability.quality} R${ability.rank}`, 88, y);
    pdf.text(`${ability.ordinary}/${ability.good}/${ability.amazing}`, 142, y);
    pdf.text(`${ability.energyCost} FX`, 199, y, { align: 'right' });
    setText(pdf, 5.8);
    drawFittedText(pdf, `${ability.description}${ability.trappings ? ` | ${ability.trappings}` : ''}`, 12, y + 3.4, 187);
    y += 7;
  });
  cursor.y += bodyHeight + 6;
}

/** Supplemental sheet (page 254 style): psionics, mutations, cybertech, computers, and FX, each omitted entirely when unused. */
function drawSupplementalPage(pdf: jsPDF, model: CharacterSheetModel): void {
  title(pdf, model, 'Supplemental Sheet');
  const cursor = { y: 21 };
  drawPsionicsSection(pdf, model, cursor);
  drawMutationsSection(pdf, model, cursor);
  drawCybertechSection(pdf, model, cursor);
  drawComputersSection(pdf, model, cursor);
  drawFxSection(pdf, model, cursor);
}

function drawAttackContinuationPages(pdf: jsPDF, model: CharacterSheetModel, attacks: CharacterSheetModel['attacks']): void {
  const rowsPerPage = 40;
  for (let offset = 0; offset < attacks.length; offset += rowsPerPage) {
    pdf.addPage();
    title(pdf, model, 'Attacks Continued');
    panel(pdf, 9, 21, 198, 246, 'Attack Forms');
    setText(pdf, 5.5, true, MUTED);
    pdf.text('ATTACK', 12, 31); pdf.text('SKILL', 50, 31); pdf.text('SCORE', 84, 31);
    pdf.text('QTY', 105, 31); pdf.text('CLIPS', 118, 31); pdf.text('RANGE', 131, 31); pdf.text('TYPE', 159, 31); pdf.text('DAMAGE', 173, 31);
    attacks.slice(offset, offset + rowsPerPage).forEach((attack, index) => {
      const rowY = 38 + index * 5.3;
      setText(pdf, 6.2);
      drawFittedText(pdf, attack.name, 12, rowY, 34);
      drawFittedText(pdf, attack.skill, 50, rowY, 30);
      pdf.text(attack.score ? `${attack.score.ordinary}/${attack.score.good}/${attack.score.amazing}` : '-', 84, rowY);
      pdf.text(String(attack.quantity), 108, rowY);
      pdf.text(String(attack.clips), 122, rowY);
      drawFittedText(pdf, attack.range, 131, rowY, 24);
      drawFittedText(pdf, attack.damageType, 159, rowY, 12);
      drawFittedText(pdf, attack.damage, 173, rowY, 31);
    });
  }
}

function drawItemContinuationPages(pdf: jsPDF, model: CharacterSheetModel, items: CharacterSheetModel['equipment']): void {
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

function drawAdvancementPages(pdf: jsPDF, model: CharacterSheetModel): void {
  const levelsPerPage = 18;
  for (let offset = 0; offset < model.advancementLevels.length; offset += levelsPerPage) {
    pdf.addPage();
    title(pdf, model, offset === 0 ? 'Advancement History' : 'Advancement Continued');
    panel(pdf, 9, 21, 198, 246, 'Advancement');
    field(pdf, 'Current Level / Achievement Points', `${model.level} / ${model.achievementPoints}`, 12, 31, 85);
    field(pdf, 'Stored Skill Points / Credits', `${model.remainingSkillPoints} / ${model.remainingFunds}`, 109, 31, 88);
    model.advancementLevels.slice(offset, offset + levelsPerPage).forEach((level, index) => {
      const y = 43 + index * 12.2;
      setText(pdf, 7, true, ACCENT);
      pdf.text(`LEVEL ${level.level}`, 12, y);
      setText(pdf, 5.8, true, MUTED);
      pdf.text(`+${level.skillPointsEarned} SP | ${level.skillPointsSpent} spent | ${level.skillPointsRemaining} stored | ${level.creditsRemaining} credits`, 42, y);
      setText(pdf, 6.1);
      drawFittedText(pdf, level.purchases.join('; ') || 'No purchases; points carried forward.', 12, y + 4, 190, 2);
    });
  }
}

export function createPrintableCharacterSheetPdf(
  state: CharacterState,
  validation: CharacterValidationResult,
): jsPDF {
  const model = buildCharacterSheetModel(state, validation);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const weaponPageLimit = 12;
  const equipmentPageLimit = 45;
  drawCorePage(pdf, model);
  pdf.addPage();
  drawSkillsPage(pdf, model);
  pdf.addPage();
  drawExtrasPage(pdf, model);
  drawAttackContinuationPages(pdf, model, model.attacks.slice(weaponPageLimit));
  drawItemContinuationPages(pdf, model, getPrintableItems(model).slice(equipmentPageLimit));
  if (model.level > 1) drawAdvancementPages(pdf, model);
  const hasSupplement = model.psionicSkillGroups.length > 0 || model.mutations.length > 0
    || model.cybergear.length > 0 || model.computers.length > 0 || Boolean(model.fxBroadSkill);
  if (hasSupplement) {
    pdf.addPage();
    drawSupplementalPage(pdf, model);
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    footer(pdf, page, pages);
  }
  return pdf;
}