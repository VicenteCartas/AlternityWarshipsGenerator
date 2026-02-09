import { jsPDF } from 'jspdf';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { InstalledLaunchSystem, OrdnanceDesign, MissileDesign } from '../types/ordnance';
import type { DamageZone, ZoneCode, HitLocationChart } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';
import type { ProgressLevel } from '../types/common';
import { ZONE_NAMES } from '../types/damageDiagram';
import { getZoneConfigForHull, createDefaultHitLocationChart } from './damageDiagramService';
import { calculateArmorHullPoints, calculateArmorCost } from './armorService';
import { calculateTotalPowerPlantStats } from './powerPlantService';
import { calculateTotalEngineStats } from './engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats } from './ftlDriveService';
import { calculateSupportSystemsStats } from './supportSystemService';
import { calculateWeaponStats } from './weaponService';
import { calculateOrdnanceStats, getWarheads, getPropulsionSystems } from './ordnanceService';
import { calculateDefenseStats } from './defenseService';
import { calculateCommandControlStats } from './commandControlService';
import { calculateSensorStats } from './sensorService';
import { calculateHangarMiscStats } from './hangarMiscService';
import { formatCost, formatAccuracyModifier, formatAcceleration } from './formatters';

// ============ INTERFACES ============

export interface ShipData {
  warshipName: string;
  hull: Hull;
  shipDescription: ShipDescription;
  selectedArmorWeight: ArmorWeight | null;
  selectedArmorType: ArmorType | null;
  installedPowerPlants: InstalledPowerPlant[];
  installedFuelTanks: InstalledFuelTank[];
  installedEngines: InstalledEngine[];
  installedEngineFuelTanks: InstalledEngineFuelTank[];
  installedFTLDrive: InstalledFTLDrive | null;
  installedFTLFuelTanks: InstalledFTLFuelTank[];
  installedLifeSupport: InstalledLifeSupport[];
  installedAccommodations: InstalledAccommodation[];
  installedStoreSystems: InstalledStoreSystem[];
  installedGravitySystems: InstalledGravitySystem[];
  installedWeapons: InstalledWeapon[];
  installedLaunchSystems: InstalledLaunchSystem[];
  ordnanceDesigns: OrdnanceDesign[];
  installedDefenses: InstalledDefenseSystem[];
  installedCommandControl: InstalledCommandControlSystem[];
  installedSensors: InstalledSensor[];
  installedHangarMisc: InstalledHangarMiscSystem[];
  damageDiagramZones: DamageZone[];
  hitLocationChart?: HitLocationChart | null;
  designProgressLevel: ProgressLevel;
  targetDirectory?: string;
}

export interface PdfExportOptions {
  includeDamageDiagram: boolean;
  includeDefenses: boolean;
  includeOffense: boolean;
}

export const defaultExportOptions: PdfExportOptions = {
  includeDamageDiagram: true,
  includeDefenses: true,
  includeOffense: true,
};

// ============ CONSTANTS ============

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Spatial zone grid layouts per zone count (fore at top, aft at bottom) */
const ZONE_GRID_LAYOUTS: Record<number, (ZoneCode | null)[][]> = {
  2: [['F'], ['A']],
  4: [['F'], ['FC'], ['AC'], ['A']],
  6: [['F'], ['P', 'FC', 'S'], ['AC'], ['A']],
  8: [['F'], ['FP', 'FC', 'FS'], ['AP', 'AC', 'AS'], ['A']],
  12: [['F'], ['FP', 'FC', 'FS'], ['P', 'CF', 'S'], ['CA'], ['AP', 'AC', 'AS'], ['A']],
  20: [
    ['F'],
    ['FFP', 'FFC', 'FFS'],
    ['FP', 'FC', 'FS'],
    ['P', 'CF', 'S'],
    ['PC', null, 'SC'],
    ['CA'],
    ['AP', 'AC', 'AS'],
    ['AAP', 'AAC', 'AAS'],
    ['A'],
  ],
};

// ============ STATS CALCULATION ============

interface ShipStats {
  totalHP: number;
  usedHP: number;
  remainingHP: number;
  powerGenerated: number;
  powerConsumed: number;
  powerBalance: number;
  totalCost: number;
  totalAcceleration: number;
  armor: { hp: number; cost: number };
  powerPlants: { hp: number; power: number; cost: number };
  engines: { hp: number; power: number; cost: number };
  ftl: { hp: number; power: number; cost: number } | null;
  support: { hp: number; power: number; cost: number };
  weapons: { hp: number; power: number; cost: number };
  defenses: { hp: number; power: number; cost: number };
  commandControl: { hp: number; power: number; cost: number };
  sensors: { hp: number; power: number; cost: number };
  hangarMisc: { hp: number; power: number; cost: number };
}

function computeShipStats(data: ShipData): ShipStats {
  const { hull } = data;
  const totalHP = hull.hullPoints + hull.bonusHullPoints;

  const armorHP = data.selectedArmorWeight ? calculateArmorHullPoints(hull, data.selectedArmorWeight) : 0;
  const armorCost = data.selectedArmorWeight && data.selectedArmorType
    ? calculateArmorCost(hull, data.selectedArmorWeight, data.selectedArmorType)
    : 0;

  const ppStats = calculateTotalPowerPlantStats(data.installedPowerPlants, data.installedFuelTanks);
  const engStats = calculateTotalEngineStats(data.installedEngines, data.installedEngineFuelTanks, hull);
  const ftlStats = data.installedFTLDrive ? calculateTotalFTLStats(data.installedFTLDrive, hull) : null;
  const ftlFuelStats = calculateTotalFTLFuelTankStats(data.installedFTLFuelTanks);
  const supportStats = calculateSupportSystemsStats(
    data.installedLifeSupport, data.installedAccommodations,
    data.installedStoreSystems, data.installedGravitySystems,
    data.designProgressLevel, [],
  );
  const weaponStats = calculateWeaponStats(data.installedWeapons);
  const ordnanceStats = calculateOrdnanceStats(data.installedLaunchSystems, data.ordnanceDesigns);
  const defenseStats = calculateDefenseStats(data.installedDefenses);
  const ccStats = calculateCommandControlStats(data.installedCommandControl, hull.hullPoints);
  const sensorStats = calculateSensorStats(data.installedSensors);
  const hmStats = calculateHangarMiscStats(data.installedHangarMisc);

  const usedHP = armorHP
    + ppStats.totalHullPoints
    + engStats.totalHullPoints
    + (ftlStats?.totalHullPoints || 0)
    + ftlFuelStats.totalHullPoints
    + supportStats.totalHullPoints
    + weaponStats.totalHullPoints
    + ordnanceStats.totalLauncherHullPoints
    + defenseStats.totalHullPoints
    + ccStats.totalHullPoints
    + sensorStats.totalHullPoints
    + hmStats.totalHullPoints;

  const totalPowerConsumed = engStats.totalPowerRequired
    + (ftlStats?.totalPowerRequired || 0)
    + supportStats.totalPowerRequired
    + weaponStats.totalPowerRequired
    + ordnanceStats.totalLauncherPower
    + defenseStats.totalPowerRequired
    + ccStats.totalPowerRequired
    + sensorStats.totalPowerRequired
    + hmStats.totalPowerRequired;

  const totalCost = hull.cost
    + armorCost
    + ppStats.totalCost
    + engStats.totalCost
    + (ftlStats?.totalCost || 0)
    + ftlFuelStats.totalCost
    + supportStats.totalCost
    + weaponStats.totalCost
    + ordnanceStats.totalLauncherCost
    + defenseStats.totalCost
    + ccStats.totalCost
    + sensorStats.totalCost
    + hmStats.totalCost;

  return {
    totalHP,
    usedHP,
    remainingHP: totalHP - usedHP,
    powerGenerated: ppStats.totalPowerGenerated,
    powerConsumed: totalPowerConsumed,
    powerBalance: ppStats.totalPowerGenerated - totalPowerConsumed,
    totalCost,
    totalAcceleration: engStats.totalAcceleration,
    armor: { hp: armorHP, cost: armorCost },
    powerPlants: { hp: ppStats.totalHullPoints, power: ppStats.totalPowerGenerated, cost: ppStats.totalCost },
    engines: { hp: engStats.totalHullPoints, power: engStats.totalPowerRequired, cost: engStats.totalCost },
    ftl: ftlStats ? {
      hp: ftlStats.totalHullPoints + ftlFuelStats.totalHullPoints,
      power: ftlStats.totalPowerRequired,
      cost: ftlStats.totalCost + ftlFuelStats.totalCost,
    } : null,
    support: { hp: supportStats.totalHullPoints, power: supportStats.totalPowerRequired, cost: supportStats.totalCost },
    weapons: {
      hp: weaponStats.totalHullPoints + ordnanceStats.totalLauncherHullPoints,
      power: weaponStats.totalPowerRequired + ordnanceStats.totalLauncherPower,
      cost: weaponStats.totalCost + ordnanceStats.totalLauncherCost,
    },
    defenses: { hp: defenseStats.totalHullPoints, power: defenseStats.totalPowerRequired, cost: defenseStats.totalCost },
    commandControl: { hp: ccStats.totalHullPoints, power: ccStats.totalPowerRequired, cost: ccStats.totalCost },
    sensors: { hp: sensorStats.totalHullPoints, power: sensorStats.totalPowerRequired, cost: sensorStats.totalCost },
    hangarMisc: { hp: hmStats.totalHullPoints, power: hmStats.totalPowerRequired, cost: hmStats.totalCost },
  };
}

// ============ MAIN EXPORT FUNCTION ============

export async function exportShipToPDF(data: ShipData, options: PdfExportOptions = defaultExportOptions): Promise<string> {
  const { hull, warshipName } = data;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const stats = computeShipStats(data);

  // =============================================
  // HELPER FUNCTIONS
  // =============================================

  const addSectionTitle = (text: string) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(50, 50, 50);
    pdf.rect(margin, y - 4, contentWidth, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text(text.toUpperCase(), margin + 2, y);
    pdf.setTextColor(0, 0, 0);
    y += 5;
  };

  const addLabel = (label: string, value: string, x: number) => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label + ':', x, y);
    const labelWidth = pdf.getTextWidth(label + ':  ');
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, x + labelWidth, y);
  };

  const checkNewPage = (needed: number = 20): boolean => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const startNewPage = () => {
    pdf.addPage();
    y = margin;
  };

  const drawDamageTrackBoxes = (label: string, count: number, x: number, maxWidth: number): number => {
    const boxSize = 4;
    const boxGap = 1;
    const labelY = y;

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, x, labelY);

    const labelWidth = pdf.getTextWidth(label) + 2;
    const startX = x + labelWidth;
    const boxTotalWidth = boxSize + boxGap;
    const availableWidth = maxWidth - labelWidth - 5;
    const boxesPerRow = Math.max(1, Math.floor(availableWidth / boxTotalWidth));

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / boxesPerRow);
      const col = i % boxesPerRow;
      const boxX = startX + col * boxTotalWidth;
      const boxY = labelY - 3 + row * (boxSize + boxGap);
      pdf.rect(boxX, boxY, boxSize, boxSize);
    }

    return Math.ceil(count / boxesPerRow);
  };

  // =============================================
  // SECTION 1: SHIP INFORMATION (always included)
  // =============================================

  const shipName = warshipName || hull.name;
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(shipName, pageWidth / 2, y + 4, { align: 'center' });
  y += 9;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${capitalize(hull.shipClass)} Class – ${hull.name}`, pageWidth / 2, y, { align: 'center' });
  y += 4;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Cost: ${formatCost(stats.totalCost)}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  // --- Key Stats ---
  addSectionTitle('Ship Overview');
  y += 3;

  const col3W = contentWidth / 3;
  addLabel('Hull Points', `${stats.usedHP} / ${stats.totalHP} (${stats.remainingHP} free)`, margin);
  addLabel('Power', `${stats.powerGenerated} generated, ${stats.powerConsumed} consumed`, margin + col3W + 10);
  y += 5;
  addLabel('Toughness', hull.toughness.toString(), margin);
  addLabel('Target Modifier', hull.targetModifier >= 0 ? `+${hull.targetModifier}` : hull.targetModifier.toString(), margin + col3W + 10);
  addLabel('Crew', hull.crew.toString(), margin + 2 * col3W + 10);
  y += 5;
  addLabel('Acceleration', stats.totalAcceleration.toString(), margin);
  if (data.selectedArmorWeight && data.selectedArmorType) {
    addLabel('Armor', `${capitalize(data.selectedArmorWeight)} ${data.selectedArmorType.name}`, margin + col3W + 10);
  } else {
    addLabel('Armor', 'None', margin + col3W + 10);
  }
  if (data.installedFTLDrive) {
    addLabel('FTL', data.installedFTLDrive.type.name, margin + 2 * col3W + 10);
  } else {
    addLabel('FTL', 'None', margin + 2 * col3W + 10);
  }
  y += 8;

  // --- Systems Summary Table ---
  addSectionTitle('Systems Summary');
  y += 3;

  const colName = margin;
  const colHP = margin + 65;
  const colPower = margin + 95;
  const colCost = margin + 130;

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('System', colName, y);
  pdf.text('Hull Points', colHP, y);
  pdf.text('Power', colPower, y);
  pdf.text('Cost', colCost, y);
  y += 1;
  pdf.setDrawColor(80);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentWidth, y);
  y += 3;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.5);

  const addStatsRow = (name: string, hp: string, power: string, cost: number) => {
    pdf.text(name, colName, y);
    pdf.text(hp, colHP, y);
    pdf.text(power, colPower, y);
    pdf.text(formatCost(cost), colCost, y);
    y += 4;
  };

  addStatsRow('Hull', stats.totalHP.toString(), '-', hull.cost);
  addStatsRow('Armor', stats.armor.hp > 0 ? stats.armor.hp.toString() : '-', '-', stats.armor.cost);
  addStatsRow('Power Plants', stats.powerPlants.hp.toString(), `+${stats.powerPlants.power}`, stats.powerPlants.cost);
  addStatsRow('Engines', stats.engines.hp.toString(), stats.engines.power.toString(), stats.engines.cost);
  if (stats.ftl) {
    addStatsRow('FTL Drive', stats.ftl.hp.toString(), stats.ftl.power.toString(), stats.ftl.cost);
  }
  addStatsRow('Support Systems', stats.support.hp.toString(), stats.support.power > 0 ? stats.support.power.toString() : '-', stats.support.cost);
  addStatsRow('Weapons', stats.weapons.hp.toString(), stats.weapons.power > 0 ? stats.weapons.power.toString() : '-', stats.weapons.cost);
  addStatsRow('Defenses', stats.defenses.hp.toString(), stats.defenses.power > 0 ? stats.defenses.power.toString() : '-', stats.defenses.cost);
  addStatsRow('Command & Control', stats.commandControl.hp.toString(), stats.commandControl.power > 0 ? stats.commandControl.power.toString() : '-', stats.commandControl.cost);
  addStatsRow('Sensors', stats.sensors.hp.toString(), stats.sensors.power > 0 ? stats.sensors.power.toString() : '-', stats.sensors.cost);
  addStatsRow('Hangar & Misc', stats.hangarMisc.hp.toString(), stats.hangarMisc.power > 0 ? stats.hangarMisc.power.toString() : '-', stats.hangarMisc.cost);

  // Totals row
  pdf.setLineWidth(0.3);
  pdf.line(margin, y - 1.5, margin + contentWidth, y - 1.5);
  y += 1;
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', colName, y);
  pdf.text(`${stats.usedHP} / ${stats.totalHP}`, colHP, y);
  const balancePrefix = stats.powerBalance >= 0 ? '+' : '';
  pdf.text(`${balancePrefix}${stats.powerBalance}`, colPower, y);
  pdf.text(formatCost(stats.totalCost), colCost, y);
  y += 6;

  // --- Ship Description / Lore ---
  const { shipDescription } = data;
  const hasLore = shipDescription.lore && shipDescription.lore.trim().length > 0;
  const hasImage = shipDescription.imageData && shipDescription.imageMimeType;

  if (hasLore) {
    checkNewPage(20);
    addSectionTitle('Ship Description');
    y += 3;

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const loreLines = pdf.splitTextToSize(shipDescription.lore, contentWidth);
    const lineHeight = 4;
    for (const line of loreLines) {
      if (y + lineHeight > pageHeight - margin - 10) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    }
    y += 3;
  }

  // Notes
  checkNewPage(25);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GAME NOTES', margin, y);
  y += 4;

  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.15);
  const notesLineCount = 6;
  for (let i = 0; i < notesLineCount; i++) {
    pdf.line(margin, y + i * 5, pageWidth - margin, y + i * 5);
  }
  y += notesLineCount * 5 + 3;

  // Ship image
  if (hasImage) {
    checkNewPage(60);
    try {
      const imageFormat = shipDescription.imageMimeType!.split('/')[1].toUpperCase() as 'PNG' | 'JPEG' | 'JPG';
      const imageData = `data:${shipDescription.imageMimeType};base64,${shipDescription.imageData}`;
      const imgProps = pdf.getImageProperties(imageData);
      const aspectRatio = imgProps.width / imgProps.height;

      const maxImageWidth = contentWidth * 0.6;
      const maxImageHeight = 60;
      let displayWidth = maxImageWidth;
      let displayHeight = displayWidth / aspectRatio;
      if (displayHeight > maxImageHeight) {
        displayHeight = maxImageHeight;
        displayWidth = displayHeight * aspectRatio;
      }

      pdf.addImage(imageData, imageFormat === 'JPG' ? 'JPEG' : imageFormat, margin, y, displayWidth, displayHeight);
      y += displayHeight + 5;
    } catch (e) {
      console.error('Failed to add image to PDF:', e);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.text('(Image could not be rendered)', margin, y);
      y += 5;
    }
  }

  // =============================================
  // SECTION 2: DAMAGE DIAGRAM
  // =============================================

  if (options.includeDamageDiagram && data.damageDiagramZones.length > 0) {
    startNewPage();

    addSectionTitle('Damage Diagram');
    y += 3;

    // --- Hit Location Table ---
    const hitChart: HitLocationChart = data.hitLocationChart
      || createDefaultHitLocationChart(
        getZoneConfigForHull(hull).zones,
        getZoneConfigForHull(hull).hitDie,
      );

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('HIT LOCATION TABLE', margin, y);
    y += 4;

    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    const hitColW = contentWidth / 5;
    pdf.text(`d${hitChart.hitDie}`, margin, y);
    pdf.text('Forward', margin + hitColW, y);
    pdf.text('Port', margin + hitColW * 2, y);
    pdf.text('Starboard', margin + hitColW * 3, y);
    pdf.text('Aft', margin + hitColW * 4, y);
    y += 1;
    pdf.setDrawColor(100);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 3;

    const directionMap: Record<string, { minRoll: number; maxRoll: number; zone: ZoneCode }[]> = {};
    for (const col of hitChart.columns) {
      directionMap[col.direction] = col.entries;
    }

    const forwardEntries = directionMap['forward'] || [];
    pdf.setFont('helvetica', 'normal');
    for (const entry of forwardEntries) {
      const rollText = entry.minRoll === entry.maxRoll
        ? `${entry.minRoll}`
        : `${entry.minRoll}-${entry.maxRoll}`;
      pdf.text(rollText, margin, y);

      const directions = ['forward', 'port', 'starboard', 'aft'];
      for (let d = 0; d < directions.length; d++) {
        const entries = directionMap[directions[d]] || [];
        const matchEntry = entries.find(e => e.minRoll === entry.minRoll);
        if (matchEntry) {
          pdf.text(matchEntry.zone, margin + hitColW * (d + 1), y);
        }
      }
      y += 3.5;
    }
    y += 6;

    // --- Zone Diagram ---
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DAMAGE ZONES', margin, y);
    y += 5;

    y = renderZoneDiagram(pdf, data.damageDiagramZones, y, margin, contentWidth, pageHeight);
  }

  // =============================================
  // SECTION 3: DEFENSES
  // =============================================

  if (options.includeDefenses) {
    startNewPage();

    addSectionTitle('Defenses');
    y += 3;

    // Toughness & Target Modifier
    addLabel('Toughness', hull.toughness.toString(), margin);
    addLabel('Target Modifier', hull.targetModifier >= 0 ? `+${hull.targetModifier}` : hull.targetModifier.toString(), margin + 60);
    y += 5;

    // Armor
    if (data.selectedArmorWeight && data.selectedArmorType) {
      addLabel('Armor', `${capitalize(data.selectedArmorWeight)} ${data.selectedArmorType.name}`, margin);
      y += 4;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Protection – LI: ${data.selectedArmorType.protectionLI}  |  HI: ${data.selectedArmorType.protectionHI}  |  En: ${data.selectedArmorType.protectionEn}`,
        margin, y,
      );
      y += 5;
    } else {
      addLabel('Armor', 'None', margin);
      y += 5;
    }

    // Damage Track
    y += 2;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DAMAGE TRACK', margin, y);
    y += 5;

    const trackWidth = contentWidth / 2 - 5;
    const dCol1 = margin;
    const dCol2 = margin + trackWidth + 10;

    const stunRows = drawDamageTrackBoxes(`Stun (${hull.damageTrack.stun})`, hull.damageTrack.stun, dCol1, trackWidth);
    const woundRows = drawDamageTrackBoxes(`Wound (${hull.damageTrack.wound})`, hull.damageTrack.wound, dCol2, trackWidth);
    y += Math.max(stunRows, woundRows) * 5 + 3;

    const mortalRows = drawDamageTrackBoxes(`Mortal (${hull.damageTrack.mortal})`, hull.damageTrack.mortal, dCol1, trackWidth);
    const critRows = drawDamageTrackBoxes(`Critical (${hull.damageTrack.critical})`, hull.damageTrack.critical, dCol2, trackWidth);
    y += Math.max(mortalRows, critRows) * 5 + 5;

    // Active Defenses
    if (data.installedDefenses.length > 0) {
      checkNewPage(20);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ACTIVE DEFENSES', margin, y);
      y += 4;

      const defCols = [margin, margin + 55, margin + 80, margin + 105, margin + 140];
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Defense', defCols[0], y);
      pdf.text('PL', defCols[1], y);
      pdf.text('HP', defCols[2], y);
      pdf.text('Power', defCols[3], y);
      pdf.text('Effect', defCols[4], y);
      y += 1;
      pdf.setDrawColor(100);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3;

      pdf.setFont('helvetica', 'normal');
      for (const d of data.installedDefenses) {
        checkNewPage(8);
        pdf.text(`${d.quantity}× ${d.type.name}`, defCols[0], y);
        pdf.text(d.type.progressLevel.toString(), defCols[1], y);
        pdf.text(d.hullPoints.toString(), defCols[2], y);
        pdf.text(d.powerRequired > 0 ? d.powerRequired.toString() : '-', defCols[3], y);
        if (d.type.effect) {
          const effectWidth = contentWidth - (defCols[4] - margin);
          const effectLines = pdf.splitTextToSize(d.type.effect, effectWidth);
          for (let i = 0; i < effectLines.length; i++) {
            pdf.text(effectLines[i], defCols[4], y);
            if (i < effectLines.length - 1) y += 3;
          }
        }
        y += 4;
      }
    }
  }

  // =============================================
  // SECTION 4: WEAPONS
  // =============================================

  if (options.includeOffense) {
    startNewPage();

    addSectionTitle('Weapons');
    y += 3;

    // --- Fire Arcs Diagram ---
    y = renderFireArcsDiagram(pdf, data.installedWeapons, y, margin, contentWidth);

    // --- Sensors ---
    if (data.installedSensors.length > 0) {
      checkNewPage(25);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SENSORS', margin, y);
      y += 4;

      const sensorControls = data.installedCommandControl.filter(cc =>
        cc.type.category === 'computer' && cc.linkedSensorId,
      );

      const sCols = [margin, margin + 42, margin + 68, margin + 90, margin + 110, margin + 130, margin + 155];
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sensor', sCols[0], y);
      pdf.text('Range S/M/L', sCols[1], y);
      pdf.text('Arcs', sCols[2], y);
      pdf.text('Tracking', sCols[3], y);
      pdf.text('Accuracy', sCols[4], y);
      pdf.text('Control', sCols[5], y);
      pdf.text('Qty', sCols[6], y);
      y += 1;
      pdf.setDrawColor(100);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3;

      pdf.setFont('helvetica', 'normal');
      for (const sensor of data.installedSensors) {
        checkNewPage(8);
        const st = sensor.type;
        const rangeText = st.rangeSpecial || `${st.rangeShort}/${st.rangeMedium}/${st.rangeLong}`;
        const linkedSC = sensorControls.find(sc => sc.linkedSensorId === sensor.id);
        const scText = linkedSC ? (linkedSC.type.stepBonus ? linkedSC.type.stepBonus.toString() : 'Yes') : '-';

        pdf.text(st.name.substring(0, 22), sCols[0], y);
        pdf.text(rangeText.substring(0, 14), sCols[1], y);
        pdf.text(st.arcsCovered.toString(), sCols[2], y);
        pdf.text(st.trackingCapability.toString(), sCols[3], y);
        pdf.text(st.accuracyDescription.substring(0, 10), sCols[4], y);
        pdf.text(scText, sCols[5], y);
        pdf.text(sensor.quantity.toString(), sCols[6], y);
        y += 4;
      }
      y += 4;
    }

    // --- Weapons ---
    if (data.installedWeapons.length > 0 || data.installedLaunchSystems.length > 0) {
      checkNewPage(25);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('WEAPONS', margin, y);
      y += 4;

      const fireControls = data.installedCommandControl.filter(cc =>
        cc.type.category === 'computer' && cc.linkedWeaponBatteryKey,
      );

      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      const wCols = [margin, margin + 48, margin + 76, margin + 94, margin + 118, margin + 138, margin + 156, margin + 170];
      pdf.text('Weapon', wCols[0], y);
      pdf.text('Range S/M/L', wCols[1], y);
      pdf.text('Type/FP', wCols[2], y);
      pdf.text('Damage', wCols[3], y);
      pdf.text('Accuracy', wCols[4], y);
      pdf.text('Arcs', wCols[5], y);
      pdf.text('FC', wCols[6], y);
      pdf.text('Qty', wCols[7], y);
      y += 1;
      pdf.setDrawColor(100);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3;

      pdf.setFont('helvetica', 'normal');
      for (const weapon of data.installedWeapons) {
        checkNewPage(8);
        const wt = weapon.weaponType;
        const rangeText = `${wt.rangeShort}/${wt.rangeMedium}/${wt.rangeLong}`;
        const typeText = `${wt.damageType}/${wt.firepower}`;
        const arcsText = weapon.arcs.map(a => {
          if (a.startsWith('zero-')) return 'Z' + a.replace('zero-', '').charAt(0).toUpperCase();
          return a.charAt(0).toUpperCase();
        }).join('');

        const batteryKey = `${wt.id}:${weapon.mountType}`;
        const linkedFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === batteryKey);
        const fcText = linkedFC ? (linkedFC.type.stepBonus ? linkedFC.type.stepBonus.toString() : 'Yes') : '-';

        const weaponName = `${capitalize(weapon.gunConfiguration)} ${wt.name}`;
        const accText = wt.accuracyModifier >= 0 ? `+${wt.accuracyModifier}` : wt.accuracyModifier.toString();

        pdf.text(weaponName.substring(0, 26), wCols[0], y);
        pdf.text(rangeText, wCols[1], y);
        pdf.text(typeText, wCols[2], y);
        pdf.text(wt.damage.substring(0, 12), wCols[3], y);
        pdf.text(accText, wCols[4], y);
        pdf.text(arcsText, wCols[5], y);
        pdf.text(fcText, wCols[6], y);
        pdf.text(weapon.quantity.toString(), wCols[7], y);
        y += 4;
      }

      // Launch systems
      for (const ls of data.installedLaunchSystems) {
        checkNewPage(8);
        const lsName = capitalize(ls.launchSystemType.replace(/-/g, ' '));
        const lsFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === `launch:${ls.launchSystemType}`);
        const fcText = lsFC ? (lsFC.type.stepBonus ? lsFC.type.stepBonus.toString() : 'Yes') : '-';

        pdf.text(lsName, wCols[0], y);
        pdf.text('-', wCols[1], y);
        pdf.text('-', wCols[2], y);
        pdf.text('(ordnance)', wCols[3], y);
        pdf.text('-', wCols[4], y);
        pdf.text('-', wCols[5], y);
        pdf.text(fcText, wCols[6], y);
        pdf.text(ls.quantity.toString(), wCols[7], y);
        y += 4;
      }
    }

    // --- Ordnance Designs ---
    if ((data.ordnanceDesigns || []).length > 0) {
      y += 4;
      checkNewPage(25);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ORDNANCE', margin, y);
      y += 4;

      const allWarheads = getWarheads();
      const allPropulsion = getPropulsionSystems();
      const getWarheadInfo = (id: string) => allWarheads.find(w => w.id === id);
      const getPropulsionInfo = (id: string) => allPropulsion.find(p => p.id === id);

      const oCols = [margin, margin + 36, margin + 50, margin + 64, margin + 78, margin + 92, margin + 108, margin + 128, margin + 148, margin + 170];
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Name', oCols[0], y);
      pdf.text('Type', oCols[1], y);
      pdf.text('Size', oCols[2], y);
      pdf.text('End', oCols[3], y);
      pdf.text('Acel', oCols[4], y);
      pdf.text('Acc', oCols[5], y);
      pdf.text('Type/FP', oCols[6], y);
      pdf.text('Damage', oCols[7], y);
      pdf.text('Area', oCols[8], y);
      pdf.text('Cost', oCols[9], y);
      y += 1;
      pdf.setDrawColor(100);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 3;

      pdf.setFont('helvetica', 'normal');
      for (const design of data.ordnanceDesigns) {
        checkNewPage(8);
        const warhead = getWarheadInfo(design.warheadId);
        const propulsion = design.category === 'missile'
          ? getPropulsionInfo((design as MissileDesign).propulsionId)
          : null;

        const typeText = capitalize(design.category);
        const sizeText = `${capitalize(design.size)} (${design.capacityRequired})`;
        const endText = propulsion?.endurance != null ? propulsion.endurance.toString() : '-';
        const accelText = propulsion?.acceleration != null
          ? formatAcceleration(propulsion.acceleration, propulsion.isPL6Scale ?? false)
          : '-';
        const accText = formatAccuracyModifier(design.totalAccuracy);
        const typeFpText = warhead ? `${warhead.damageType}/${warhead.firepower}` : '?';
        const damageText = warhead?.damage ?? '?';
        const areaText = warhead?.area ? `${warhead.area.type} ${warhead.area.radius}` : '-';
        const costText = formatCost(design.totalCost);

        pdf.text(design.name.substring(0, 20), oCols[0], y);
        pdf.text(typeText, oCols[1], y);
        pdf.text(sizeText.substring(0, 10), oCols[2], y);
        pdf.text(endText, oCols[3], y);
        pdf.text(accelText.substring(0, 10), oCols[4], y);
        pdf.text(accText, oCols[5], y);
        pdf.text(typeFpText, oCols[6], y);
        pdf.text(damageText.substring(0, 12), oCols[7], y);
        pdf.text(areaText.substring(0, 12), oCols[8], y);
        pdf.text(costText, oCols[9], y);
        y += 4;
      }
    }
  }

  // =============================================
  // FOOTER (all pages)
  // =============================================

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const footerY = pageHeight - 6;
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(128);
    pdf.text('Alternity Warship Generator', margin, footerY);
    pdf.text(`Page ${i}/${totalPages}`, pageWidth / 2, footerY, { align: 'center' });
    pdf.text(new Date().toLocaleDateString(), pageWidth - margin, footerY, { align: 'right' });
  }
  pdf.setTextColor(0);

  // =============================================
  // SAVE
  // =============================================

  const filename = `${shipName.replace(/[^a-zA-Z0-9]/g, '_')}_ship_sheet.pdf`;

  if (window.electronAPI && data.targetDirectory) {
    const separator = data.targetDirectory.includes('\\') ? '\\' : '/';
    const fullPath = `${data.targetDirectory}${separator}${filename}`;
    const base64Data = pdf.output('datauristring').split(',')[1];
    const result = await window.electronAPI.savePdfFile(fullPath, base64Data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save PDF');
    }
    return fullPath;
  } else {
    pdf.save(filename);
    return filename;
  }

  // =============================================
  // INNER RENDERING FUNCTIONS
  // =============================================

  /**
   * Render fire arcs diagram with concentric circles. Returns new y position.
   */
  function renderFireArcsDiagram(
    doc: jsPDF,
    weapons: InstalledWeapon[],
    startY: number,
    marginLeft: number,
    _contentW: number,
  ): number {
    const arcWeapons: Record<string, number> = { forward: 0, starboard: 0, aft: 0, port: 0 };
    const zeroArcWeapons: Record<string, number> = { forward: 0, starboard: 0, aft: 0, port: 0 };

    for (const weapon of weapons) {
      for (const arc of weapon.arcs) {
        if (arc.startsWith('zero-')) {
          const baseArc = arc.replace('zero-', '');
          if (baseArc in zeroArcWeapons) zeroArcWeapons[baseArc] += weapon.quantity;
        } else {
          if (arc in arcWeapons) arcWeapons[arc] += weapon.quantity;
        }
      }
    }

    const diagramSize = 55;
    const diagramCenterX = marginLeft + diagramSize / 2 + 10;
    const diagramCenterY = startY + diagramSize / 2;
    const outerRadius = diagramSize / 2 - 2;
    const innerRadius = outerRadius * 0.45;
    const hasZeroArcs = Object.values(zeroArcWeapons).some(v => v > 0);

    const standardArcFill = [200, 200, 200];
    const standardArcActive = [100, 149, 237];
    const zeroArcFill = [220, 220, 220];
    const zeroArcActive = [186, 85, 211];

    const drawPieSector = (
      centerX: number, centerY: number,
      innerR: number, outerR: number,
      startAngleDeg: number, endAngleDeg: number,
      fillColor: number[], stroke = true,
    ) => {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.setDrawColor(80);
      doc.setLineWidth(0.3);

      const segments = 12;
      const angleStep = (endAngleDeg - startAngleDeg) / segments;
      const startRad = (startAngleDeg * Math.PI) / 180;
      const sX = centerX + outerR * Math.cos(startRad);
      const sY = centerY + outerR * Math.sin(startRad);

      const allPoints: [number, number][] = [];
      for (let i = 1; i <= segments; i++) {
        const angle = ((startAngleDeg + i * angleStep) * Math.PI) / 180;
        allPoints.push([centerX + outerR * Math.cos(angle), centerY + outerR * Math.sin(angle)]);
      }
      const endRad = (endAngleDeg * Math.PI) / 180;
      allPoints.push([centerX + innerR * Math.cos(endRad), centerY + innerR * Math.sin(endRad)]);
      for (let i = segments - 1; i >= 0; i--) {
        const angle = ((startAngleDeg + i * angleStep) * Math.PI) / 180;
        allPoints.push([centerX + innerR * Math.cos(angle), centerY + innerR * Math.sin(angle)]);
      }

      const lines: [number, number][] = [];
      let prevX = sX;
      let prevY = sY;
      for (const [px, py] of allPoints) {
        lines.push([px - prevX, py - prevY]);
        prevX = px;
        prevY = py;
      }

      doc.lines(lines, sX, sY, [1, 1], stroke ? 'FD' : 'F', true);
    };

    const arcs = [
      { arc: 'forward', label: 'FWD', startAngle: -135 },
      { arc: 'starboard', label: 'STBD', startAngle: -45 },
      { arc: 'aft', label: 'AFT', startAngle: 45 },
      { arc: 'port', label: 'PORT', startAngle: 135 },
    ];

    for (const { arc, label, startAngle } of arcs) {
      const count = arcWeapons[arc];
      const fillColor = count > 0 ? standardArcActive : standardArcFill;
      const innerR = hasZeroArcs ? innerRadius : 3;
      drawPieSector(diagramCenterX, diagramCenterY, innerR, outerRadius, startAngle, startAngle + 90, fillColor);

      const midAngle = ((startAngle + 45) * Math.PI) / 180;
      const labelRadius = (innerR + outerRadius) / 2;
      const labelX = diagramCenterX + labelRadius * Math.cos(midAngle);
      const labelY = diagramCenterY + labelRadius * Math.sin(midAngle);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(count > 0 ? 255 : 60);
      doc.text(label, labelX, labelY - 1, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${count}`, labelX, labelY + 3, { align: 'center' });
    }

    if (hasZeroArcs) {
      const centerDotRadius = 3;
      for (const { arc, startAngle } of arcs) {
        const zeroCount = zeroArcWeapons[arc];
        const fillColor = zeroCount > 0 ? zeroArcActive : zeroArcFill;
        drawPieSector(diagramCenterX, diagramCenterY, centerDotRadius, innerRadius, startAngle, startAngle + 90, fillColor);

        if (zeroCount > 0) {
          const midAngle = ((startAngle + 45) * Math.PI) / 180;
          const labelRad = (centerDotRadius + innerRadius) / 2;
          const lx = diagramCenterX + labelRad * Math.cos(midAngle);
          const ly = diagramCenterY + labelRad * Math.sin(midAngle);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255);
          doc.text(`${zeroCount}`, lx, ly + 1, { align: 'center' });
        }
      }
      doc.setFillColor(255, 255, 255);
      doc.circle(diagramCenterX, diagramCenterY, centerDotRadius, 'F');
    }

    doc.setTextColor(0);

    // Ship triangle
    doc.setFillColor(50, 50, 50);
    const triSize = 3;
    doc.triangle(
      diagramCenterX, diagramCenterY - triSize,
      diagramCenterX - triSize * 0.7, diagramCenterY + triSize * 0.5,
      diagramCenterX + triSize * 0.7, diagramCenterY + triSize * 0.5,
      'F',
    );

    // Legend
    const legendX = diagramCenterX + diagramSize / 2 + 12;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(standardArcActive[0], standardArcActive[1], standardArcActive[2]);
    doc.rect(legendX, diagramCenterY - 12, 6, 3, 'F');
    doc.text('Standard arc (outer ring)', legendX + 8, diagramCenterY - 10);
    doc.setFillColor(zeroArcActive[0], zeroArcActive[1], zeroArcActive[2]);
    doc.rect(legendX, diagramCenterY - 6, 6, 3, 'F');
    doc.text('Zero-range arc (inner ring)', legendX + 8, diagramCenterY - 4);
    doc.text('FWD = Forward', legendX, diagramCenterY + 4);
    doc.text('AFT = Aft', legendX, diagramCenterY + 9);
    doc.text('STBD = Starboard', legendX, diagramCenterY + 14);
    doc.text('PORT = Port', legendX, diagramCenterY + 19);

    return diagramCenterY + diagramSize / 2 + 8;
  }

  /**
   * Render the zone diagram in a spatial ship layout showing ALL systems per zone.
   * Returns the new y position after rendering.
   */
  function renderZoneDiagram(
    doc: jsPDF,
    zones: DamageZone[],
    startY: number,
    marginLeft: number,
    contentW: number,
    pgHeight: number,
  ): number {
    const numZones = zones.length;
    const layout = ZONE_GRID_LAYOUTS[numZones];

    if (!layout) {
      return renderZoneFallbackGrid(doc, zones, startY, marginLeft, contentW, pgHeight);
    }

    // Build zone lookup
    const zoneMap = new Map<ZoneCode, DamageZone>();
    for (const z of zones) {
      zoneMap.set(z.code, z);
    }

    // Font sizes scale with zone count
    const headerFontSize = numZones <= 4 ? 7 : numZones <= 8 ? 6.5 : numZones <= 12 ? 6 : 5.5;
    const systemFontSize = numZones <= 4 ? 6 : numZones <= 8 ? 5.5 : numZones <= 12 ? 5 : 4.5;
    const systemLineHeight = systemFontSize * 0.55;
    const headerHeight = numZones <= 8 ? 5 : 4;
    const gap = 3;
    const colWidth = (contentW - 2 * gap) / 3;

    let currentY = startY;

    for (const row of layout) {
      // Calculate tallest zone in this row
      let maxSystemCount = 0;
      const rowZones: (DamageZone | null)[] = [];
      for (const code of row) {
        if (code === null) {
          rowZones.push(null);
          continue;
        }
        const zone = zoneMap.get(code) || null;
        rowZones.push(zone);
        if (zone) {
          maxSystemCount = Math.max(maxSystemCount, zone.systems.length);
        }
      }

      const boxHeight = headerHeight + Math.max(1, maxSystemCount) * systemLineHeight + 2;

      // Page break if needed
      if (currentY + boxHeight > pgHeight - margin - 10) {
        doc.addPage();
        currentY = margin;
      }

      // Determine column positions
      const numCols = row.length;
      let positions: { x: number; w: number }[];

      if (numCols === 1) {
        positions = [{ x: marginLeft + (contentW - colWidth) / 2, w: colWidth }];
      } else if (numCols === 2) {
        positions = [
          { x: marginLeft, w: colWidth },
          { x: marginLeft + contentW - colWidth, w: colWidth },
        ];
      } else {
        positions = [
          { x: marginLeft, w: colWidth },
          { x: marginLeft + colWidth + gap, w: colWidth },
          { x: marginLeft + 2 * (colWidth + gap), w: colWidth },
        ];
      }

      for (let i = 0; i < rowZones.length; i++) {
        const zone = rowZones[i];
        if (!zone) continue;
        const pos = positions[i];
        drawZoneBox(doc, zone, pos.x, currentY, pos.w, boxHeight, headerHeight, headerFontSize, systemFontSize, systemLineHeight);
      }

      currentY += boxHeight + 2;
    }

    return currentY;
  }

  /**
   * Draw a single zone box with header and all systems listed.
   */
  function drawZoneBox(
    doc: jsPDF,
    zone: DamageZone,
    x: number, boxY: number,
    w: number, h: number,
    headerH: number,
    headerFont: number,
    sysFont: number,
    sysLineH: number,
  ) {
    // Header bar fill first, then outline on top
    doc.setFillColor(180, 180, 180);
    doc.rect(x, boxY, w, headerH, 'F');

    // Box outline
    doc.setDrawColor(60);
    doc.setLineWidth(0.4);
    doc.rect(x, boxY, w, h);

    doc.setFontSize(headerFont);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);

    const zoneName = ZONE_NAMES[zone.code] || zone.code;
    doc.text(`${zone.code} – ${zoneName}`, x + 1.5, boxY + headerH - 1.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`${zone.totalHullPoints}/${zone.maxHullPoints}`, x + w - 1.5, boxY + headerH - 1.5, { align: 'right' });

    // Systems list
    doc.setFontSize(sysFont);
    doc.setFont('helvetica', 'normal');
    let sysY = boxY + headerH + sysLineH;

    if (zone.systems.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(140);
      doc.text('(empty)', x + 1.5, sysY);
      doc.setTextColor(0);
    } else {
      for (let j = 0; j < zone.systems.length; j++) {
        const sys = zone.systems[j];
        const maxNameLen = Math.floor((w - 16) / (sysFont * 0.32));
        const shortName = sys.name.length > maxNameLen
          ? sys.name.substring(0, maxNameLen - 2) + '..'
          : sys.name;
        doc.text(`${j + 1}. ${shortName} (${sys.hullPoints})`, x + 1.5, sysY);
        sysY += sysLineH;
      }
    }
  }

  /**
   * Fallback zone rendering for unexpected zone counts.
   * Returns the new y position.
   */
  function renderZoneFallbackGrid(
    doc: jsPDF,
    zones: DamageZone[],
    startY: number,
    marginLeft: number,
    contentW: number,
    pgHeight: number,
  ): number {
    const zonesPerRow = Math.min(zones.length, 4);
    const zoneWidth = (contentW - (zonesPerRow - 1) * 3) / zonesPerRow;
    const systemFont = 5;
    const sysLineH = 2.5;
    const headerH = 5;
    let curY = startY;

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const col = i % zonesPerRow;
      const boxH = headerH + Math.max(1, zone.systems.length) * sysLineH + 2;

      if (col === 0 && i > 0) {
        curY += boxH + 3;
      }

      if (curY + boxH > pgHeight - margin) {
        doc.addPage();
        curY = margin;
      }

      const x = marginLeft + col * (zoneWidth + 3);
      drawZoneBox(doc, zone, x, curY, zoneWidth, boxH, headerH, 6, systemFont, sysLineH);
    }

    return curY + 30;
  }
}
