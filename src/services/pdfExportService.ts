import { jsPDF } from 'jspdf';
import type { Hull } from '../types/hull';
import type { ShipArmor } from '../types/armor';
import type { InstalledPowerPlant, InstalledFuelTank } from '../types/powerPlant';
import type { InstalledEngine, InstalledEngineFuelTank } from '../types/engine';
import type { InstalledFTLDrive, InstalledFTLFuelTank } from '../types/ftlDrive';
import type { InstalledLifeSupport, InstalledAccommodation, InstalledStoreSystem, InstalledGravitySystem } from '../types/supportSystem';
import type { InstalledWeapon } from '../types/weapon';
import type { InstalledDefenseSystem } from '../types/defense';
import type { InstalledCommandControlSystem } from '../types/commandControl';
import type { InstalledSensor } from '../types/sensor';
import type { InstalledHangarMiscSystem } from '../types/hangarMisc';
import type { EmbarkedCraft } from '../types/embarkedCraft';
import type { InstalledLaunchSystem, OrdnanceDesign, MissileDesign } from '../types/ordnance';
import type { DamageZone, ZoneCode, HitLocationChart } from '../types/damageDiagram';
import type { ShipDescription } from '../types/summary';
import type { ProgressLevel, DesignType, StationType } from '../types/common';
import { ZONE_NAMES } from '../types/damageDiagram';
import { getZoneConfigForHull, createDefaultHitLocationChart } from './damageDiagramService';
import { calculateMultiLayerArmorHP, calculateMultiLayerArmorCost } from './armorService';
import { calculateTotalPowerPlantStats, calculatePowerPlantCost, calculatePowerGenerated, calculateFuelTankCost } from './powerPlantService';
import { calculateTotalEngineStats, calculateEnginePowerRequired, calculateEngineCost, calculateEngineFuelTankCost } from './engineService';
import { calculateTotalFTLStats, calculateTotalFTLFuelTankStats, calculateFTLPowerRequired, calculateFTLCost, calculateFTLFuelTankCost } from './ftlDriveService';
import { calculateSupportSystemsStats } from './supportSystemService';
import { calculateWeaponStats } from './weaponService';
import type { FiringArc } from '../types/weapon';
import { calculateOrdnanceStats, getWarheads, getPropulsionSystems, getLaunchSystems } from './ordnanceService';
import { calculateDefenseStats } from './defenseService';
import { calculateCommandControlStats } from './commandControlService';
import { calculateSensorStats } from './sensorService';
import { calculateHangarMiscStats } from './hangarMiscService';
import { calculateEmbarkedCraftStats } from './embarkedCraftService';
import { formatCost, formatAccuracyModifier, formatAcceleration, getStationTypeDisplayName } from './formatters';
import { capitalize, logger } from './utilities';

/**
 * Format arcs as short single-letter abbreviations separated by spaces.
 * Standard arcs: F S A P. Zero arcs: ZF ZS ZA ZP.
 */
function formatArcsShort(arcs: FiringArc[]): string {
  if (arcs.length === 0) return '-';
  return arcs.map(a => {
    if (a.startsWith('zero-')) return 'Z' + a.replace('zero-', '').charAt(0).toUpperCase();
    return a.charAt(0).toUpperCase();
  }).join(' ');
}

// ============ INTERFACES ============

export interface ShipData {
  warshipName: string;
  hull: Hull;
  shipDescription: ShipDescription;
  armorLayers: ShipArmor[];
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
  embarkedCraft?: EmbarkedCraft[];
  damageDiagramZones: DamageZone[];
  hitLocationChart?: HitLocationChart | null;
  designProgressLevel: ProgressLevel;
  designType?: DesignType;
  stationType?: StationType | null;
  targetDirectory?: string;
}

export interface PdfExportOptions {
  includeCombat: boolean;
  includeDamageDiagram: boolean;
  includeDetailedSystems: boolean;
}

export const defaultExportOptions: PdfExportOptions = {
  includeCombat: true,
  includeDamageDiagram: true,
  includeDetailedSystems: false,
};

// ============ CONSTANTS ============

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

// ============ PDF CONTEXT ============

/** Mutable context passed through all PDF rendering functions. */
interface PdfContext {
  readonly pdf: jsPDF;
  y: number;
  readonly margin: number;
  readonly contentWidth: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
}

// ============ PDF HELPER FUNCTIONS ============

function addSectionTitle(ctx: PdfContext, text: string): void {
  ctx.pdf.setFontSize(11);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFillColor(50, 50, 50);
  ctx.pdf.rect(ctx.margin, ctx.y - 4, ctx.contentWidth, 6, 'F');
  ctx.pdf.setTextColor(255, 255, 255);
  ctx.pdf.text(text.toUpperCase(), ctx.margin + 2, ctx.y);
  ctx.pdf.setTextColor(0, 0, 0);
  ctx.y += 5;
}

function addLabel(ctx: PdfContext, label: string, value: string, x: number): void {
  ctx.pdf.setFontSize(8);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(label + ':', x, ctx.y);
  const labelWidth = ctx.pdf.getTextWidth(label + ':  ');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.text(value, x + labelWidth, ctx.y);
}

function checkNewPage(ctx: PdfContext, needed: number = 20): boolean {
  if (ctx.y + needed > ctx.pageHeight - ctx.margin) {
    ctx.pdf.addPage();
    ctx.y = ctx.margin;
    return true;
  }
  return false;
}

function startNewPage(ctx: PdfContext): void {
  ctx.pdf.addPage();
  ctx.y = ctx.margin;
}

function drawDamageTrackBoxes(ctx: PdfContext, label: string, count: number, x: number, maxWidth: number): number {
  const boxSize = 4;
  const boxGap = 1;
  const labelY = ctx.y;

  ctx.pdf.setFontSize(7);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(label, x, labelY);

  const labelWidth = ctx.pdf.getTextWidth(label) + 2;
  const startX = x + labelWidth;
  const boxTotalWidth = boxSize + boxGap;
  const availableWidth = maxWidth - labelWidth - 5;
  const boxesPerRow = Math.max(1, Math.floor(availableWidth / boxTotalWidth));

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / boxesPerRow);
    const col = i % boxesPerRow;
    const boxX = startX + col * boxTotalWidth;
    const boxY = labelY - 3 + row * (boxSize + boxGap);
    ctx.pdf.rect(boxX, boxY, boxSize, boxSize);
  }

  return Math.ceil(count / boxesPerRow);
}

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
  embarkedCraft: { cost: number };
}

function computeShipStats(data: ShipData): ShipStats {
  const { hull } = data;
  const totalHP = hull.hullPoints + hull.bonusHullPoints;

  const armorHP = calculateMultiLayerArmorHP(hull, data.armorLayers);
  const armorCost = calculateMultiLayerArmorCost(hull, data.armorLayers);

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
  const ecStats = calculateEmbarkedCraftStats(data.embarkedCraft || []);

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
    + hmStats.totalCost
    + ecStats.totalEmbarkedCost;

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
    embarkedCraft: { cost: ecStats.totalEmbarkedCost },
  };
}

// ============ DIAGRAM RENDERERS ============

/**
 * Enrich a launch system's display name with loaded ordnance abbreviations.
 * Used by zone box rendering and zone height calculation.
 */
function enrichLaunchSystemDisplayName(
  sysName: string,
  installedSystemId: string,
  installedLaunchSystems: InstalledLaunchSystem[],
  ordnanceDesigns: OrdnanceDesign[],
): string {
  const launchId = installedSystemId.startsWith('launch-') ? installedSystemId.slice(7) : installedSystemId;
  const matchedLS = (installedLaunchSystems || []).find(ls => ls.id === launchId);
  if (matchedLS && (matchedLS.loadout || []).length > 0) {
    const ordAbbrevs = (matchedLS.loadout || []).map(lo => {
      const design = (ordnanceDesigns || []).find(d => d.id === lo.designId);
      if (!design) return null;
      const abbr = design.name.split(/\s+/).map(w => w.charAt(0).toUpperCase()).join('');
      return `${lo.quantity}x${abbr}`;
    }).filter(Boolean);
    if (ordAbbrevs.length > 0) {
      return `${sysName} (${ordAbbrevs.join(', ')})`;
    }
  }
  return sysName;
}

/**
 * Draw a pie sector (annular arc) on the PDF document.
 */
function drawPieSector(
  doc: jsPDF,
  centerX: number, centerY: number,
  innerR: number, outerR: number,
  startAngleDeg: number, endAngleDeg: number,
  fillColor: number[], stroke = true,
): void {
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
  data: ShipData,
): void {
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
      const displayName = enrichLaunchSystemDisplayName(
        sys.name, sys.installedSystemId,
        data.installedLaunchSystems || [], data.ordnanceDesigns || [],
      );
      const fullText = `${j + 1}. ${displayName} (${sys.hullPoints})`;
      const maxTextWidth = w - 3;
      const lines = doc.splitTextToSize(fullText, maxTextWidth);
      for (let li = 0; li < lines.length; li++) {
        doc.text(lines[li], x + 1.5, sysY);
        if (li < lines.length - 1) sysY += sysLineH;
      }
      sysY += sysLineH;
    }
  }
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
  margin: number,
  data: ShipData,
): number {
  const numZones = zones.length;
  const layout = ZONE_GRID_LAYOUTS[numZones];

  if (!layout) {
    return renderZoneFallbackGrid(doc, zones, startY, marginLeft, contentW, pgHeight, margin, data);
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
    // Calculate tallest zone in this row (account for text wrapping)
    let maxLineCount = 0;
    const rowZones: (DamageZone | null)[] = [];

    // Determine column positions first so we know available width
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

    for (let ci = 0; ci < row.length; ci++) {
      const code = row[ci];
      if (code === null) {
        rowZones.push(null);
        continue;
      }
      const zone = zoneMap.get(code) || null;
      rowZones.push(zone);
      if (zone && zone.systems.length > 0) {
        // Count total lines including wrapping
        doc.setFontSize(systemFontSize);
        const boxW = positions[ci]?.w ?? colWidth;
        const maxTextWidth = boxW - 3;
        let lineCount = 0;
        for (let j = 0; j < zone.systems.length; j++) {
          const sys = zone.systems[j];
          const displayName = enrichLaunchSystemDisplayName(
            sys.name, sys.installedSystemId,
            data.installedLaunchSystems || [], data.ordnanceDesigns || [],
          );
          const fullText = `${j + 1}. ${displayName} (${sys.hullPoints})`;
          const lines = doc.splitTextToSize(fullText, maxTextWidth);
          lineCount += lines.length;
        }
        maxLineCount = Math.max(maxLineCount, lineCount);
      }
    }

    const boxHeight = headerHeight + Math.max(1, maxLineCount) * systemLineHeight + 2;

    // Page break if needed
    if (currentY + boxHeight > pgHeight - margin - 10) {
      doc.addPage();
      currentY = margin;
    }

    for (let i = 0; i < rowZones.length; i++) {
      const zone = rowZones[i];
      if (!zone) continue;
      const pos = positions[i];
      drawZoneBox(doc, zone, pos.x, currentY, pos.w, boxHeight, headerHeight, headerFontSize, systemFontSize, systemLineHeight, data);
    }

    currentY += boxHeight + 2;
  }

  return currentY;
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
  margin: number,
  data: ShipData,
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
    drawZoneBox(doc, zone, x, curY, zoneWidth, boxH, headerH, 6, systemFont, sysLineH, data);
  }

  return curY + 30;
}

// ============ SECTION RENDERERS ============

/**
 * SECTION 1: Lore & Identity — title, ship image, metadata, lore text, notes.
 * The "flavor" page with worldbuilding content, no crunch.
 */
function renderLoreSection(
  ctx: PdfContext,
  data: ShipData,
): void {
  const { hull, warshipName } = data;
  const isStation = data.designType === 'station';

  // --- Title ---
  const shipName = warshipName || hull.name;
  ctx.pdf.setFontSize(22);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(shipName, ctx.pageWidth / 2, ctx.y + 4, { align: 'center' });
  ctx.y += 9;

  ctx.pdf.setFontSize(11);
  ctx.pdf.setFont('helvetica', 'normal');
  const subtitle = isStation && data.stationType
    ? `${getStationTypeDisplayName(data.stationType)} – ${hull.name}`
    : `${capitalize(hull.shipClass)} Class – ${hull.name}`;
  ctx.pdf.text(subtitle, ctx.pageWidth / 2, ctx.y, { align: 'center' });
  ctx.y += 8;

  // --- Ship Image (prominent, centered) ---
  renderShipImage(ctx, data.shipDescription);

  // --- Description (metadata + lore) ---
  renderDescriptionSection(ctx, data);

  // --- Notes ---
  renderNotesSection(ctx);
}

/**
 * SECTION 2: Systems Detail — overview stats and systems summary table.
 * The "what's on the ship" page with all installed components.
 */
function renderSystemsDetailSection(
  ctx: PdfContext,
  data: ShipData,
  stats: ShipStats,
  options: PdfExportOptions,
): void {
  const { hull } = data;
  const isStation = data.designType === 'station';
  const hasEngines = data.installedEngines.length > 0 || data.installedEngineFuelTanks.length > 0;

  const supportStats = calculateSupportSystemsStats(
    data.installedLifeSupport, data.installedAccommodations,
    data.installedStoreSystems, data.installedGravitySystems,
    data.designProgressLevel, [],
  );

  // --- Title ---
  const shipName = data.warshipName || hull.name;
  ctx.pdf.setFontSize(16);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text(`${shipName} — Systems`, ctx.pageWidth / 2, ctx.y + 2, { align: 'center' });
  ctx.y += 8;

  // --- Key Stats ---
  addSectionTitle(ctx, isStation ? 'Station Overview' : 'Ship Overview');
  ctx.y += 3;

  const col3W = ctx.contentWidth / 3;

  // Row 1: HP, Power, Cost
  addLabel(ctx, 'Hull Points', `${stats.usedHP} / ${stats.totalHP} (${stats.remainingHP} free)`, ctx.margin);
  addLabel(ctx, 'Power', `${stats.powerGenerated} generated, ${stats.powerConsumed} consumed`, ctx.margin + col3W + 10);
  addLabel(ctx, 'Cost', formatCost(stats.totalCost), ctx.margin + 2 * col3W + 10);
  ctx.y += 5;

  // Row 2: Crew, Personnel
  addLabel(ctx, 'Crew', hull.crew.toString(), ctx.margin);
  const personnelExtras: string[] = [];
  if (supportStats.troopCapacity > 0) personnelExtras.push(`Troops: ${supportStats.troopCapacity}`);
  if (supportStats.passengerCapacity > 0) personnelExtras.push(`Passengers: ${supportStats.passengerCapacity}`);
  if (supportStats.suspendedCapacity > 0) personnelExtras.push(`Stasis: ${supportStats.suspendedCapacity}`);
  if (personnelExtras.length > 0) {
    addLabel(ctx, 'Personnel', personnelExtras.join(', '), ctx.margin + col3W + 10);
  }
  ctx.y += 5;

  // Row 3: Toughness, Target Modifier
  addLabel(ctx, 'Toughness', hull.toughness.toString(), ctx.margin);
  addLabel(ctx, 'Target Modifier', hull.targetModifier >= 0 ? `+${hull.targetModifier}` : hull.targetModifier.toString(), ctx.margin + col3W + 10);
  ctx.y += 5;

  // Row 4: Armor
  if (data.armorLayers.length > 0) {
    const armorLabel = data.armorLayers.map(l => `${capitalize(l.weight)} ${l.type.name}`).join(' + ');
    addLabel(ctx, 'Armor', armorLabel, ctx.margin);
  } else {
    addLabel(ctx, 'Armor', 'None', ctx.margin);
  }
  ctx.y += 5;

  // Row 5: Acceleration, FTL (only if design has engines or FTL)
  if (hasEngines || data.installedFTLDrive) {
    addLabel(ctx, 'Acceleration', hasEngines ? stats.totalAcceleration.toString() : 'N/A', ctx.margin);
    if (data.installedFTLDrive) {
      addLabel(ctx, 'FTL', data.installedFTLDrive.type.name, ctx.margin + col3W + 10);
    } else {
      addLabel(ctx, 'FTL', 'None', ctx.margin + col3W + 10);
    }
    ctx.y += 8;
  } else {
    ctx.y += 3;
  }

  // --- Systems Summary Table ---
  renderSystemsSummaryTable(ctx, data, stats, options);
}

/**
 * Systems Summary table with optional detailed sub-rows.
 */
function renderSystemsSummaryTable(
  ctx: PdfContext,
  data: ShipData,
  stats: ShipStats,
  options: PdfExportOptions,
): void {
  const { hull } = data;
  const hasEngines = data.installedEngines.length > 0 || data.installedEngineFuelTanks.length > 0;

  addSectionTitle(ctx, 'Systems Summary');
  ctx.y += 3;

  const colName = ctx.margin;
  const colHP = ctx.margin + 65;
  const colPower = ctx.margin + 95;
  const colCost = ctx.margin + 130;

  ctx.pdf.setFontSize(7.5);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text('System', colName, ctx.y);
  ctx.pdf.text('Hull Points', colHP, ctx.y);
  ctx.pdf.text('Power', colPower, ctx.y);
  ctx.pdf.text('Cost', colCost, ctx.y);
  ctx.y += 1;
  ctx.pdf.setDrawColor(80);
  ctx.pdf.setLineWidth(0.3);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 3;

  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(7.5);

  const addStatsRow = (name: string, hp: string, power: string, cost: number) => {
    checkNewPage(ctx, 6);
    ctx.pdf.setFontSize(7.5);
    if (options.includeDetailedSystems) {
      ctx.pdf.setFillColor(230, 230, 230);
      ctx.pdf.rect(ctx.margin, ctx.y - 3.5, ctx.contentWidth, 4.5, 'F');
      ctx.pdf.setFont('helvetica', 'bold');
    } else {
      ctx.pdf.setFont('helvetica', 'normal');
    }
    ctx.pdf.text(name, colName, ctx.y);
    ctx.pdf.text(hp, colHP, ctx.y);
    ctx.pdf.text(power, colPower, ctx.y);
    ctx.pdf.text(formatCost(cost), colCost, ctx.y);
    ctx.y += 4;
  };

  // Detail row helpers (used when detailed systems are enabled)
  const detailIndent = ctx.margin + 6;
  const detailColHP = colHP;
  const detailColPower = colPower;
  const detailColCost = colCost;

  const addDetailColumnHeaders = () => {
    checkNewPage(ctx, 6);
    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Component', detailIndent, ctx.y);
    ctx.pdf.text('HP', detailColHP, ctx.y);
    ctx.pdf.text('Power', detailColPower, ctx.y);
    ctx.pdf.text('Cost', detailColCost, ctx.y);
    ctx.y += 1;
    ctx.pdf.setDrawColor(160);
    ctx.pdf.setLineWidth(0.15);
    ctx.pdf.line(detailIndent, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
    ctx.y += 2.5;
  };

  const addDetailRow = (name: string, hp: string, power: string, cost: string) => {
    checkNewPage(ctx, 5);
    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(name, detailIndent, ctx.y);
    ctx.pdf.text(hp, detailColHP, ctx.y);
    ctx.pdf.text(power, detailColPower, ctx.y);
    ctx.pdf.text(cost, detailColCost, ctx.y);
    ctx.y += 3.5;
  };

  addStatsRow('Hull', stats.totalHP.toString(), '-', hull.cost);

  // Armor
  addStatsRow('Armor', stats.armor.hp > 0 ? stats.armor.hp.toString() : '-', '-', stats.armor.cost);
  if (options.includeDetailedSystems && data.armorLayers.length > 0) {
    addDetailColumnHeaders();
    for (const layer of data.armorLayers) {
      addDetailRow(
        `${capitalize(layer.weight)} ${layer.type.name}`,
        layer.hullPointsUsed.toString(), '-', formatCost(layer.cost)
      );
    }
    ctx.y += 1;
  }

  // Power Plants
  addStatsRow('Power Plants', stats.powerPlants.hp.toString(), `+${stats.powerPlants.power}`, stats.powerPlants.cost);
  if (options.includeDetailedSystems && (data.installedPowerPlants.length > 0 || data.installedFuelTanks.length > 0)) {
    addDetailColumnHeaders();
    for (const pp of data.installedPowerPlants) {
      const ppCost = calculatePowerPlantCost(pp.type, pp.hullPoints);
      const ppPower = calculatePowerGenerated(pp.type, pp.hullPoints);
      addDetailRow(
        `${pp.type.name} (${pp.hullPoints} HP)`,
        pp.hullPoints.toString(), `+${ppPower}`, formatCost(ppCost)
      );
    }
    for (const tank of data.installedFuelTanks) {
      const tankCost = calculateFuelTankCost(tank.forPowerPlantType, tank.hullPoints);
      addDetailRow(
        `Fuel Tank for ${tank.forPowerPlantType.name} (${tank.hullPoints} HP)`,
        tank.hullPoints.toString(), '-', formatCost(tankCost)
      );
    }
    ctx.y += 1;
  }

  // Engines (skip entirely if no engines installed)
  if (hasEngines) {
    addStatsRow('Engines', stats.engines.hp.toString(), stats.engines.power.toString(), stats.engines.cost);
    if (options.includeDetailedSystems) {
      addDetailColumnHeaders();
      for (const eng of data.installedEngines) {
        const engPower = calculateEnginePowerRequired(eng.type, eng.hullPoints);
        const engCost = calculateEngineCost(eng.type, eng.hullPoints);
        addDetailRow(
          `${eng.type.name} (${eng.hullPoints} HP)`,
          eng.hullPoints.toString(), engPower.toString(), formatCost(engCost)
        );
      }
      for (const tank of data.installedEngineFuelTanks) {
        const tankCost = calculateEngineFuelTankCost(tank.forEngineType, tank.hullPoints);
        addDetailRow(
          `Fuel Tank for ${tank.forEngineType.name} (${tank.hullPoints} HP)`,
          tank.hullPoints.toString(), '-', formatCost(tankCost)
        );
      }
      ctx.y += 1;
    }
  }

  // FTL Drive
  if (stats.ftl) {
    addStatsRow('FTL Drive', stats.ftl.hp.toString(), stats.ftl.power.toString(), stats.ftl.cost);
    if (options.includeDetailedSystems && data.installedFTLDrive) {
      addDetailColumnHeaders();
      const ftlPower = calculateFTLPowerRequired(data.installedFTLDrive.type, data.installedFTLDrive.hullPoints);
      const ftlCostVal = calculateFTLCost(data.installedFTLDrive.type, data.installedFTLDrive.hullPoints);
      addDetailRow(
        `${data.installedFTLDrive.type.name} (${data.installedFTLDrive.hullPoints} HP)`,
        data.installedFTLDrive.hullPoints.toString(), ftlPower.toString(), formatCost(ftlCostVal)
      );
      for (const tank of data.installedFTLFuelTanks) {
        const tankCost = calculateFTLFuelTankCost(tank.forFTLDriveType, tank.hullPoints);
        addDetailRow(
          `FTL Fuel Tank (${tank.hullPoints} HP)`,
          tank.hullPoints.toString(), '-', formatCost(tankCost)
        );
      }
      ctx.y += 1;
    }
  }

  // Support Systems
  addStatsRow('Support Systems', stats.support.hp.toString(), stats.support.power > 0 ? stats.support.power.toString() : '-', stats.support.cost);
  if (options.includeDetailedSystems) {
    const hasSupport = data.installedLifeSupport.length > 0 || data.installedAccommodations.length > 0
      || data.installedStoreSystems.length > 0 || data.installedGravitySystems.length > 0;
    if (hasSupport) {
      addDetailColumnHeaders();
      for (const ls of data.installedLifeSupport) {
        const qty = ls.quantity > 1 ? ` x${ls.quantity}` : '';
        addDetailRow(
          `${ls.type.name}${qty}`,
          (ls.type.hullPoints * ls.quantity).toString(),
          ls.type.powerRequired * ls.quantity > 0 ? (ls.type.powerRequired * ls.quantity).toString() : '-',
          formatCost(ls.type.cost * ls.quantity)
        );
      }
      for (const acc of data.installedAccommodations) {
        const qty = acc.quantity > 1 ? ` x${acc.quantity}` : '';
        addDetailRow(
          `${acc.type.name}${qty}`,
          (acc.type.hullPoints * acc.quantity).toString(),
          acc.type.powerRequired * acc.quantity > 0 ? (acc.type.powerRequired * acc.quantity).toString() : '-',
          formatCost(acc.type.cost * acc.quantity)
        );
      }
      for (const store of data.installedStoreSystems) {
        const qty = store.quantity > 1 ? ` x${store.quantity}` : '';
        addDetailRow(
          `${store.type.name}${qty}`,
          (store.type.hullPoints * store.quantity).toString(),
          store.type.powerRequired * store.quantity > 0 ? (store.type.powerRequired * store.quantity).toString() : '-',
          formatCost(store.type.cost * store.quantity)
        );
      }
      for (const grav of data.installedGravitySystems) {
        addDetailRow(
          grav.type.name,
          grav.hullPoints.toString(),
          grav.type.powerRequired > 0 ? grav.type.powerRequired.toString() : '-',
          formatCost(grav.cost)
        );
      }
      ctx.y += 1;
    }
  }

  // Weapons
  addStatsRow('Weapons', stats.weapons.hp.toString(), stats.weapons.power > 0 ? stats.weapons.power.toString() : '-', stats.weapons.cost);
  if (options.includeDetailedSystems) {
    const hasWeapons = data.installedWeapons.length > 0 || data.installedLaunchSystems.length > 0;
    if (hasWeapons) {
      addDetailColumnHeaders();
      for (const w of data.installedWeapons) {
        const qty = w.quantity > 1 ? ` x${w.quantity}` : '';
        const mount = w.mountType !== 'standard' ? ` (${capitalize(w.mountType)})` : '';
        const config = w.gunConfiguration !== 'single' ? ` ${capitalize(w.gunConfiguration)}` : '';
        addDetailRow(
          `${w.weaponType.name}${config}${mount}${qty}`,
          w.hullPoints.toString(), w.powerRequired.toString(), formatCost(w.cost)
        );
      }
      const launchSystemDefs = getLaunchSystems();
      for (const ls of data.installedLaunchSystems) {
        const lsDef = launchSystemDefs.find(d => d.id === ls.launchSystemType);
        const name = lsDef ? lsDef.name : ls.launchSystemType;
        const qty = ls.quantity > 1 ? ` x${ls.quantity}` : '';
        addDetailRow(
          `${name}${qty}`,
          ls.hullPoints.toString(), ls.powerRequired.toString(), formatCost(ls.cost)
        );
        for (const loadedItem of ls.loadout || []) {
          const design = data.ordnanceDesigns.find(d => d.id === loadedItem.designId);
          if (design) {
            checkNewPage(ctx, 5);
            ctx.pdf.setFontSize(6);
            ctx.pdf.setFont('helvetica', 'italic');
            ctx.pdf.text(`    > ${design.name} x${loadedItem.quantity}`, detailIndent, ctx.y);
            ctx.pdf.setFont('helvetica', 'normal');
            ctx.y += 3;
          }
        }
      }
      ctx.y += 1;
    }
  }

  // Defenses
  addStatsRow('Defenses', stats.defenses.hp.toString(), stats.defenses.power > 0 ? stats.defenses.power.toString() : '-', stats.defenses.cost);
  if (options.includeDetailedSystems && data.installedDefenses.length > 0) {
    addDetailColumnHeaders();
    for (const def of data.installedDefenses) {
      const qty = def.quantity > 1 ? ` x${def.quantity}` : '';
      addDetailRow(
        `${def.type.name}${qty}`,
        def.hullPoints.toString(),
        def.powerRequired > 0 ? def.powerRequired.toString() : '-',
        formatCost(def.cost)
      );
    }
    ctx.y += 1;
  }

  // Command & Control
  addStatsRow('Command & Control', stats.commandControl.hp.toString(), stats.commandControl.power > 0 ? stats.commandControl.power.toString() : '-', stats.commandControl.cost);
  if (options.includeDetailedSystems && data.installedCommandControl.length > 0) {
    addDetailColumnHeaders();
    for (const cc of data.installedCommandControl) {
      const qty = cc.quantity > 1 ? ` x${cc.quantity}` : '';
      addDetailRow(
        `${cc.type.name}${qty}`,
        cc.hullPoints.toString(),
        cc.powerRequired > 0 ? cc.powerRequired.toString() : '-',
        formatCost(cc.cost)
      );
    }
    ctx.y += 1;
  }

  // Sensors
  addStatsRow('Sensors', stats.sensors.hp.toString(), stats.sensors.power > 0 ? stats.sensors.power.toString() : '-', stats.sensors.cost);
  if (options.includeDetailedSystems && data.installedSensors.length > 0) {
    addDetailColumnHeaders();
    for (const s of data.installedSensors) {
      const qty = s.quantity > 1 ? ` x${s.quantity}` : '';
      addDetailRow(
        `${s.type.name}${qty}`,
        s.hullPoints.toString(),
        s.powerRequired > 0 ? s.powerRequired.toString() : '-',
        formatCost(s.cost)
      );
    }
    ctx.y += 1;
  }

  // Hangar & Misc
  addStatsRow('Hangar & Misc', stats.hangarMisc.hp.toString(), stats.hangarMisc.power > 0 ? stats.hangarMisc.power.toString() : '-', stats.hangarMisc.cost);
  if (options.includeDetailedSystems && data.installedHangarMisc.length > 0) {
    addDetailColumnHeaders();
    for (const hm of data.installedHangarMisc) {
      const qty = hm.quantity > 1 ? ` x${hm.quantity}` : '';
      addDetailRow(
        `${hm.type.name}${qty}`,
        hm.hullPoints.toString(),
        hm.powerRequired > 0 ? hm.powerRequired.toString() : '-',
        formatCost(hm.cost)
      );
    }
    ctx.y += 1;
  }

  // Embarked Craft
  const embarkedCraft = data.embarkedCraft || [];
  if (embarkedCraft.length > 0) {
    addStatsRow('Embarked Craft', '-', '-', stats.embarkedCraft.cost);
    if (options.includeDetailedSystems) {
      addDetailColumnHeaders();
      for (const craft of embarkedCraft) {
        const qty = craft.quantity > 1 ? ` x${craft.quantity}` : '';
        addDetailRow(
          `${craft.name}${qty} (${craft.berthing})`,
          `${craft.hullHp * craft.quantity}`,
          '-',
          formatCost(craft.designCost * craft.quantity)
        );
      }
      ctx.y += 1;
    }
  }

  // Totals row
  ctx.pdf.setLineWidth(0.3);
  ctx.pdf.setDrawColor(80);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 3;
  ctx.pdf.setFontSize(7.5);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text('TOTAL', colName, ctx.y);
  ctx.pdf.text(`${stats.usedHP} / ${stats.totalHP}`, colHP, ctx.y);
  const balancePrefix = stats.powerBalance >= 0 ? '+' : '';
  ctx.pdf.text(`${balancePrefix}${stats.powerBalance}`, colPower, ctx.y);
  ctx.pdf.text(formatCost(stats.totalCost), colCost, ctx.y);
  ctx.y += 6;
}

/**
 * Render the Description section with metadata and lore text.
 */
function renderDescriptionSection(ctx: PdfContext, data: ShipData): void {
  const { shipDescription } = data;
  const hasLore = shipDescription.lore && shipDescription.lore.trim().length > 0;

  // Build metadata entries (only non-empty fields)
  const metadataEntries: { label: string; value: string }[] = [];
  if (shipDescription.faction?.trim()) metadataEntries.push({ label: 'Faction', value: shipDescription.faction.trim() });
  if (shipDescription.classification?.trim()) metadataEntries.push({ label: 'Classification', value: shipDescription.classification.trim() });
  if (shipDescription.role?.trim()) metadataEntries.push({ label: 'Role', value: shipDescription.role.trim() });
  if (shipDescription.manufacturer?.trim()) metadataEntries.push({ label: 'Manufacturer', value: shipDescription.manufacturer.trim() });
  if (shipDescription.commissioningDate?.trim()) metadataEntries.push({ label: 'Commissioned', value: shipDescription.commissioningDate.trim() });

  const hasMetadata = metadataEntries.length > 0;

  if (hasMetadata || hasLore) {
    checkNewPage(ctx, 20);
    addSectionTitle(ctx, 'Description');
    ctx.y += 3;

    // Print metadata in two columns: left (Faction, Manufacturer, Commissioned), right (Classification, Role)
    if (hasMetadata) {
      ctx.pdf.setFontSize(8);
      const metaLineHeight = 4;
      const colWidth = ctx.contentWidth / 2;
      const leftCol = metadataEntries.filter(e => e.label === 'Faction' || e.label === 'Manufacturer' || e.label === 'Commissioned');
      const rightCol = metadataEntries.filter(e => e.label === 'Classification' || e.label === 'Role');
      const maxRows = Math.max(leftCol.length, rightCol.length);

      for (let i = 0; i < maxRows; i++) {
        if (ctx.y + metaLineHeight > ctx.pageHeight - ctx.margin - 10) {
          ctx.pdf.addPage();
          ctx.y = ctx.margin;
        }
        if (i < leftCol.length) {
          ctx.pdf.setFont('helvetica', 'bold');
          ctx.pdf.text(`${leftCol[i].label}: `, ctx.margin, ctx.y);
          const lw = ctx.pdf.getTextWidth(`${leftCol[i].label}: `);
          ctx.pdf.setFont('helvetica', 'normal');
          ctx.pdf.text(leftCol[i].value, ctx.margin + lw, ctx.y);
        }
        if (i < rightCol.length) {
          ctx.pdf.setFont('helvetica', 'bold');
          ctx.pdf.text(`${rightCol[i].label}: `, ctx.margin + colWidth, ctx.y);
          const rw = ctx.pdf.getTextWidth(`${rightCol[i].label}: `);
          ctx.pdf.setFont('helvetica', 'normal');
          ctx.pdf.text(rightCol[i].value, ctx.margin + colWidth + rw, ctx.y);
        }
        ctx.y += metaLineHeight;
      }
      ctx.y += 2;
    }

    // Print lore text
    if (hasLore) {
      ctx.pdf.setFontSize(8);
      ctx.pdf.setFont('helvetica', 'normal');
      const loreLines = ctx.pdf.splitTextToSize(shipDescription.lore, ctx.contentWidth);
      const lineHeight = 4;
      for (const line of loreLines) {
        if (ctx.y + lineHeight > ctx.pageHeight - ctx.margin - 10) {
          ctx.pdf.addPage();
          ctx.y = ctx.margin;
        }
        ctx.pdf.text(line, ctx.margin, ctx.y);
        ctx.y += lineHeight;
      }
    }
    ctx.y += 3;
  }
}

/**
 * Render the Notes section with ruled lines.
 */
function renderNotesSection(ctx: PdfContext): void {
  checkNewPage(ctx, 25);
  ctx.pdf.setFontSize(9);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text('GAME NOTES', ctx.margin, ctx.y);
  ctx.y += 4;

  ctx.pdf.setDrawColor(180, 180, 180);
  ctx.pdf.setLineWidth(0.15);
  const notesLineCount = 6;
  for (let i = 0; i < notesLineCount; i++) {
    ctx.pdf.line(ctx.margin, ctx.y + i * 5, ctx.pageWidth - ctx.margin, ctx.y + i * 5);
  }
  ctx.y += notesLineCount * 5 + 3;
}

/**
 * Render the ship image from the description if available.
 */
function renderShipImage(ctx: PdfContext, shipDescription: ShipDescription): void {
  const hasImage = shipDescription.imageData && shipDescription.imageMimeType;
  if (!hasImage) return;

  checkNewPage(ctx, 60);
  try {
    const imageFormat = shipDescription.imageMimeType!.split('/')[1].toUpperCase() as 'PNG' | 'JPEG' | 'JPG';
    const imageData = `data:${shipDescription.imageMimeType};base64,${shipDescription.imageData}`;
    const imgProps = ctx.pdf.getImageProperties(imageData);
    const aspectRatio = imgProps.width / imgProps.height;

    const maxImageWidth = ctx.contentWidth * 0.6;
    const maxImageHeight = 60;
    let displayWidth = maxImageWidth;
    let displayHeight = displayWidth / aspectRatio;
    if (displayHeight > maxImageHeight) {
      displayHeight = maxImageHeight;
      displayWidth = displayHeight * aspectRatio;
    }

    ctx.pdf.addImage(imageData, imageFormat === 'JPG' ? 'JPEG' : imageFormat, ctx.margin, ctx.y, displayWidth, displayHeight);
    ctx.y += displayHeight + 5;
  } catch (e) {
    logger.error('Failed to add image to PDF:', e);
    ctx.pdf.setFontSize(7);
    ctx.pdf.setFont('helvetica', 'italic');
    ctx.pdf.text('(Image could not be rendered)', ctx.margin, ctx.y);
    ctx.y += 5;
  }
}

/**
 * SECTION 2: Damage Diagram — hit location table and zone boxes.
 */
function renderDamageDiagramSection(ctx: PdfContext, data: ShipData): void {
  if (data.damageDiagramZones.length === 0) return;

  startNewPage(ctx);
  addSectionTitle(ctx, 'Damage Diagram');
  ctx.y += 3;

  // --- Hit Location Table ---
  const hitChart: HitLocationChart = data.hitLocationChart
    || createDefaultHitLocationChart(
      getZoneConfigForHull(data.hull).zones,
      getZoneConfigForHull(data.hull).hitDie,
    );

  ctx.pdf.setFontSize(9);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text('HIT LOCATION TABLE', ctx.margin, ctx.y);
  ctx.y += 4;

  ctx.pdf.setFontSize(7);
  ctx.pdf.setFont('helvetica', 'bold');
  const hitColW = ctx.contentWidth / 5;
  ctx.pdf.text(`d${hitChart.hitDie}`, ctx.margin, ctx.y);
  ctx.pdf.text('Forward', ctx.margin + hitColW, ctx.y);
  ctx.pdf.text('Port', ctx.margin + hitColW * 2, ctx.y);
  ctx.pdf.text('Starboard', ctx.margin + hitColW * 3, ctx.y);
  ctx.pdf.text('Aft', ctx.margin + hitColW * 4, ctx.y);
  ctx.y += 1;
  ctx.pdf.setDrawColor(100);
  ctx.pdf.setLineWidth(0.2);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
  ctx.y += 3;

  const directionMap: Record<string, { minRoll: number; maxRoll: number; zone: ZoneCode }[]> = {};
  for (const col of hitChart.columns) {
    directionMap[col.direction] = col.entries;
  }

  const forwardEntries = directionMap['forward'] || [];
  ctx.pdf.setFont('helvetica', 'normal');
  for (const entry of forwardEntries) {
    const rollText = entry.minRoll === entry.maxRoll
      ? `${entry.minRoll}`
      : `${entry.minRoll}-${entry.maxRoll}`;
    ctx.pdf.text(rollText, ctx.margin, ctx.y);

    const directions = ['forward', 'port', 'starboard', 'aft'];
    for (let d = 0; d < directions.length; d++) {
      const entries = directionMap[directions[d]] || [];
      const matchEntry = entries.find(e => e.minRoll === entry.minRoll);
      if (matchEntry) {
        ctx.pdf.text(matchEntry.zone, ctx.margin + hitColW * (d + 1), ctx.y);
      }
    }
    ctx.y += 3.5;
  }
  ctx.y += 6;

  // --- Zone Diagram ---
  ctx.pdf.setFontSize(9);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text('DAMAGE ZONES', ctx.margin, ctx.y);
  ctx.y += 5;

  ctx.y = renderZoneDiagram(ctx.pdf, data.damageDiagramZones, ctx.y, ctx.margin, ctx.contentWidth, ctx.pageHeight, ctx.margin, data);
}

/**
 * SECTION 3: Combat Sheet — weapons, fire arcs, sensors, ordnance,
 * armor protection, damage track, active defenses.
 * Groups everything needed during combat resolution on one section.
 */
function renderCombatSection(ctx: PdfContext, data: ShipData): void {
  const { hull } = data;

  startNewPage(ctx);
  addSectionTitle(ctx, 'Combat Sheet');
  ctx.y += 3;

  // --- Sensors ---
  if (data.installedSensors.length > 0) {
    checkNewPage(ctx, 25);
    ctx.pdf.setFontSize(9);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('SENSORS', ctx.margin, ctx.y);
    ctx.y += 4;

    const sensorControls = data.installedCommandControl.filter(cc =>
      cc.type.category === 'computer' && cc.linkedSensorId,
    );

    const sCols = [ctx.margin, ctx.margin + 42, ctx.margin + 68, ctx.margin + 90, ctx.margin + 110, ctx.margin + 130, ctx.margin + 155];
    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Sensor', sCols[0], ctx.y);
    ctx.pdf.text('Range S/M/L', sCols[1], ctx.y);
    ctx.pdf.text('Tracking', sCols[2], ctx.y);
    ctx.pdf.text('Accuracy', sCols[3], ctx.y);
    ctx.pdf.text('Arcs', sCols[4], ctx.y);
    ctx.pdf.text('Control', sCols[5], ctx.y);
    ctx.pdf.text('Qty', sCols[6], ctx.y);
    ctx.y += 1;
    ctx.pdf.setDrawColor(100);
    ctx.pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
    ctx.y += 3;

    ctx.pdf.setFont('helvetica', 'normal');
    for (const sensor of data.installedSensors) {
      checkNewPage(ctx, 8);
      const st = sensor.type;
      const rangeText = st.rangeSpecial || `${st.rangeShort}/${st.rangeMedium}/${st.rangeLong}`;
      const linkedSC = sensorControls.find(sc => sc.linkedSensorId === sensor.id);
      const scText = linkedSC ? (linkedSC.type.stepBonus ? linkedSC.type.stepBonus.toString() : 'Yes') : '-';

      ctx.pdf.text(st.name.substring(0, 22), sCols[0], ctx.y);
      ctx.pdf.text(rangeText.substring(0, 14), sCols[1], ctx.y);
      ctx.pdf.text(st.trackingCapability.toString(), sCols[2], ctx.y);
      ctx.pdf.text(st.accuracyDescription.substring(0, 10), sCols[3], ctx.y);
      ctx.pdf.text(formatArcsShort(sensor.arcs), sCols[4], ctx.y);
      ctx.pdf.text(scText, sCols[5], ctx.y);
      ctx.pdf.text(sensor.quantity.toString(), sCols[6], ctx.y);
      ctx.y += 4;
    }
    ctx.y += 4;
  }

  // --- Weapons ---
  if (data.installedWeapons.length > 0 || data.installedLaunchSystems.length > 0) {
    checkNewPage(ctx, 25);
    ctx.pdf.setFontSize(9);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('WEAPONS', ctx.margin, ctx.y);
    ctx.y += 4;

    const fireControls = data.installedCommandControl.filter(cc =>
      cc.type.category === 'computer' && cc.linkedWeaponBatteryKey,
    );

    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setFont('helvetica', 'bold');
    const wCols = [ctx.margin, ctx.margin + 48, ctx.margin + 70, ctx.margin + 84, ctx.margin + 114, ctx.margin + 134, ctx.margin + 152, ctx.margin + 170];
    ctx.pdf.text('Weapon', wCols[0], ctx.y);
    ctx.pdf.text('Range S/M/L', wCols[1], ctx.y);
    ctx.pdf.text('Type/FP', wCols[2], ctx.y);
    ctx.pdf.text('Damage', wCols[3], ctx.y);
    ctx.pdf.text('Accuracy', wCols[4], ctx.y);
    ctx.pdf.text('Arcs', wCols[5], ctx.y);
    ctx.pdf.text('FC', wCols[6], ctx.y);
    ctx.pdf.text('Qty', wCols[7], ctx.y);
    ctx.y += 1;
    ctx.pdf.setDrawColor(100);
    ctx.pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
    ctx.y += 3;

    ctx.pdf.setFont('helvetica', 'normal');
    for (const weapon of data.installedWeapons) {
      checkNewPage(ctx, 8);
      const wt = weapon.weaponType;
      const rangeText = `${wt.rangeShort}/${wt.rangeMedium}/${wt.rangeLong}`;
      const typeText = `${wt.damageType}/${wt.firepower}`;
      const batteryKey = `${wt.id}:${weapon.mountType}`;
      const linkedFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === batteryKey);
      const fcText = linkedFC ? (linkedFC.type.stepBonus ? linkedFC.type.stepBonus.toString() : 'Yes') : '-';

      const weaponName = `${capitalize(weapon.gunConfiguration)} ${wt.name}`;
      const accText = wt.accuracyModifier >= 0 ? `+${wt.accuracyModifier}` : wt.accuracyModifier.toString();

      ctx.pdf.text(weaponName.substring(0, 26), wCols[0], ctx.y);
      ctx.pdf.text(rangeText, wCols[1], ctx.y);
      ctx.pdf.text(typeText, wCols[2], ctx.y);
      ctx.pdf.text(wt.damage.substring(0, 17), wCols[3], ctx.y);
      ctx.pdf.text(accText, wCols[4], ctx.y);
      ctx.pdf.text(formatArcsShort(weapon.arcs), wCols[5], ctx.y);
      ctx.pdf.text(fcText, wCols[6], ctx.y);
      ctx.pdf.text(weapon.quantity.toString(), wCols[7], ctx.y);
      ctx.y += 4;
    }

    // Launch systems
    for (const ls of data.installedLaunchSystems) {
      checkNewPage(ctx, 8);
      const lsName = capitalize(ls.launchSystemType.replace(/-/g, ' '));
      const lsFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === `launch:${ls.launchSystemType}`);
      const fcText = lsFC ? (lsFC.type.stepBonus ? lsFC.type.stepBonus.toString() : 'Yes') : '-';

      ctx.pdf.text(lsName, wCols[0], ctx.y);
      ctx.pdf.text('-', wCols[1], ctx.y);
      ctx.pdf.text('-', wCols[2], ctx.y);
      ctx.pdf.text('(ordnance)', wCols[3], ctx.y);
      ctx.pdf.text('-', wCols[4], ctx.y);
      ctx.pdf.text('-', wCols[5], ctx.y);
      ctx.pdf.text(fcText, wCols[6], ctx.y);
      ctx.pdf.text(ls.quantity.toString(), wCols[7], ctx.y);
      ctx.y += 4;

      // List loaded ordnance under the launcher
      for (const loadedItem of ls.loadout || []) {
        const design = (data.ordnanceDesigns || []).find(d => d.id === loadedItem.designId);
        if (design) {
          checkNewPage(ctx, 6);
          ctx.pdf.setFontSize(5.5);
          ctx.pdf.setFont('helvetica', 'italic');
          ctx.pdf.text(`    > ${design.name} x${loadedItem.quantity}`, wCols[0], ctx.y);
          ctx.pdf.setFontSize(6.5);
          ctx.pdf.setFont('helvetica', 'normal');
          ctx.y += 3.5;
        }
      }
    }
  }

  // --- Ordnance Designs ---
  if ((data.ordnanceDesigns || []).length > 0) {
    ctx.y += 4;
    checkNewPage(ctx, 25);
    ctx.pdf.setFontSize(9);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('ORDNANCE', ctx.margin, ctx.y);
    ctx.y += 4;

    const allWarheads = getWarheads();
    const allPropulsion = getPropulsionSystems();
    const getWarheadInfo = (id: string) => allWarheads.find(w => w.id === id);
    const getPropulsionInfo = (id: string) => allPropulsion.find(p => p.id === id);

    const oCols = [ctx.margin, ctx.margin + 36, ctx.margin + 50, ctx.margin + 64, ctx.margin + 78, ctx.margin + 92, ctx.margin + 106, ctx.margin + 126, ctx.margin + 152, ctx.margin + 170];
    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Name', oCols[0], ctx.y);
    ctx.pdf.text('Type', oCols[1], ctx.y);
    ctx.pdf.text('Size', oCols[2], ctx.y);
    ctx.pdf.text('End', oCols[3], ctx.y);
    ctx.pdf.text('Acel', oCols[4], ctx.y);
    ctx.pdf.text('Acc', oCols[5], ctx.y);
    ctx.pdf.text('Type/FP', oCols[6], ctx.y);
    ctx.pdf.text('Damage', oCols[7], ctx.y);
    ctx.pdf.text('Area', oCols[8], ctx.y);
    ctx.pdf.text('Cost', oCols[9], ctx.y);
    ctx.y += 1;
    ctx.pdf.setDrawColor(100);
    ctx.pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
    ctx.y += 3;

    ctx.pdf.setFont('helvetica', 'normal');
    for (const design of data.ordnanceDesigns) {
      checkNewPage(ctx, 8);
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
      const areaText = warhead?.area ? `${warhead.area.rangeOrdinary}/${warhead.area.rangeGood}/${warhead.area.rangeAmazing}` : '-';
      const costText = formatCost(design.totalCost);

      ctx.pdf.text(design.name.substring(0, 20), oCols[0], ctx.y);
      ctx.pdf.text(typeText, oCols[1], ctx.y);
      ctx.pdf.text(sizeText.substring(0, 10), oCols[2], ctx.y);
      ctx.pdf.text(endText, oCols[3], ctx.y);
      ctx.pdf.text(accelText.substring(0, 10), oCols[4], ctx.y);
      ctx.pdf.text(accText, oCols[5], ctx.y);
      ctx.pdf.text(typeFpText, oCols[6], ctx.y);
      ctx.pdf.text(damageText.substring(0, 17), oCols[7], ctx.y);
      ctx.pdf.text(areaText.substring(0, 17), oCols[8], ctx.y);
      ctx.pdf.text(costText, oCols[9], ctx.y);
      ctx.y += 4;
    }
  }

  // --- Defenses & Armor ---
  ctx.y += 4;
  checkNewPage(ctx, 30);

  // Toughness & Target Modifier
  addSectionTitle(ctx, 'Defenses');
  ctx.y += 3;

  addLabel(ctx, 'Toughness', hull.toughness.toString(), ctx.margin);
  addLabel(ctx, 'Target Modifier', hull.targetModifier >= 0 ? `+${hull.targetModifier}` : hull.targetModifier.toString(), ctx.margin + 60);
  ctx.y += 5;

  // Armor
  if (data.armorLayers.length > 0) {
    for (const layer of data.armorLayers) {
      addLabel(ctx, 'Armor', `${capitalize(layer.weight)} ${layer.type.name}`, ctx.margin);
      ctx.y += 4;
      ctx.pdf.setFontSize(8);
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.text(
        `Protection – LI: ${layer.type.protectionLI}  |  HI: ${layer.type.protectionHI}  |  En: ${layer.type.protectionEn}`,
        ctx.margin, ctx.y,
      );
      ctx.y += 5;
    }
  } else {
    addLabel(ctx, 'Armor', 'None', ctx.margin);
    ctx.y += 5;
  }

  // Damage Track
  ctx.y += 2;
  checkNewPage(ctx, 25);
  ctx.pdf.setFontSize(9);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.text('DAMAGE TRACK', ctx.margin, ctx.y);
  ctx.y += 5;

  const trackWidth = ctx.contentWidth / 2 - 5;
  const dCol1 = ctx.margin;
  const dCol2 = ctx.margin + trackWidth + 10;

  const stunRows = drawDamageTrackBoxes(ctx, `Stun (${hull.damageTrack.stun})`, hull.damageTrack.stun, dCol1, trackWidth);
  const woundRows = drawDamageTrackBoxes(ctx, `Wound (${hull.damageTrack.wound})`, hull.damageTrack.wound, dCol2, trackWidth);
  ctx.y += Math.max(stunRows, woundRows) * 5 + 3;

  const mortalRows = drawDamageTrackBoxes(ctx, `Mortal (${hull.damageTrack.mortal})`, hull.damageTrack.mortal, dCol1, trackWidth);
  const critRows = drawDamageTrackBoxes(ctx, `Critical (${hull.damageTrack.critical})`, hull.damageTrack.critical, dCol2, trackWidth);
  ctx.y += Math.max(mortalRows, critRows) * 5 + 5;

  // Active Defenses
  if (data.installedDefenses.length > 0) {
    checkNewPage(ctx, 20);
    ctx.pdf.setFontSize(9);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('ACTIVE DEFENSES', ctx.margin, ctx.y);
    ctx.y += 4;

    const defCols = [ctx.margin, ctx.margin + 55, ctx.margin + 80, ctx.margin + 105, ctx.margin + 140];
    ctx.pdf.setFontSize(7);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.text('Defense', defCols[0], ctx.y);
    ctx.pdf.text('PL', defCols[1], ctx.y);
    ctx.pdf.text('HP', defCols[2], ctx.y);
    ctx.pdf.text('Power', defCols[3], ctx.y);
    ctx.pdf.text('Effect', defCols[4], ctx.y);
    ctx.y += 1;
    ctx.pdf.setDrawColor(100);
    ctx.pdf.line(ctx.margin, ctx.y, ctx.pageWidth - ctx.margin, ctx.y);
    ctx.y += 3;

    ctx.pdf.setFont('helvetica', 'normal');
    for (const d of data.installedDefenses) {
      checkNewPage(ctx, 8);
      ctx.pdf.text(`${d.quantity}× ${d.type.name}`, defCols[0], ctx.y);
      ctx.pdf.text(d.type.progressLevel.toString(), defCols[1], ctx.y);
      ctx.pdf.text(d.hullPoints.toString(), defCols[2], ctx.y);
      ctx.pdf.text(d.powerRequired > 0 ? d.powerRequired.toString() : '-', defCols[3], ctx.y);
      if (d.type.effect) {
        const effectWidth = ctx.contentWidth - (defCols[4] - ctx.margin);
        const effectLines = ctx.pdf.splitTextToSize(d.type.effect, effectWidth);
        for (let i = 0; i < effectLines.length; i++) {
          ctx.pdf.text(effectLines[i], defCols[4], ctx.y);
          if (i < effectLines.length - 1) ctx.y += 3;
        }
      }
      ctx.y += 4;
    }
  }
}

/**
 * Add page footers to all pages.
 */
function renderFooter(ctx: PdfContext): void {
  const totalPages = ctx.pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    ctx.pdf.setPage(i);
    const footerY = ctx.pageHeight - 6;
    ctx.pdf.setFontSize(6);
    ctx.pdf.setFont('helvetica', 'italic');
    ctx.pdf.setTextColor(128);
    ctx.pdf.text('Alternity Warship Generator', ctx.margin, footerY);
    ctx.pdf.text(`Page ${i}/${totalPages}`, ctx.pageWidth / 2, footerY, { align: 'center' });
    ctx.pdf.text(new Date().toLocaleDateString(), ctx.pageWidth - ctx.margin, footerY, { align: 'right' });
  }
  ctx.pdf.setTextColor(0);
}

/**
 * Save the PDF to disk (Electron) or trigger download (web).
 */
async function savePdf(ctx: PdfContext, data: ShipData, shipName: string): Promise<string> {
  const isStation = data.designType === 'station';
  const sheetType = isStation ? 'station_sheet' : 'ship_sheet';
  const filename = `${shipName.replace(/[^a-zA-Z0-9]/g, '_')}_${sheetType}.pdf`;

  if (window.electronAPI && data.targetDirectory) {
    const separator = data.targetDirectory.includes('\\') ? '\\' : '/';
    const fullPath = `${data.targetDirectory}${separator}${filename}`;
    const base64Data = ctx.pdf.output('datauristring').split(',')[1];
    const result = await window.electronAPI.savePdfFile(fullPath, base64Data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save PDF');
    }
    return fullPath;
  } else {
    ctx.pdf.save(filename);
    return filename;
  }
}

// ============ MAIN EXPORT FUNCTION ============

export async function exportShipToPDF(data: ShipData, options: PdfExportOptions = defaultExportOptions): Promise<string> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;

  const ctx: PdfContext = {
    pdf,
    y: margin,
    margin,
    contentWidth: pageWidth - margin * 2,
    pageWidth,
    pageHeight,
  };

  const stats = computeShipStats(data);
  const shipName = data.warshipName || data.hull.name;

  // Section 1: Lore & Identity (always included)
  renderLoreSection(ctx, data);

  // Section 2: Systems Detail (always included)
  startNewPage(ctx);
  renderSystemsDetailSection(ctx, data, stats, options);

  // Section 3: Combat Sheet (weapons + defenses combined)
  if (options.includeCombat) {
    renderCombatSection(ctx, data);
  }

  // Section 4: Damage Zones
  if (options.includeDamageDiagram) {
    renderDamageDiagramSection(ctx, data);
  }

  // Footer on all pages
  renderFooter(ctx);

  // Save and return path/filename
  return savePdf(ctx, data, shipName);
}

// ============ COMBAT REFERENCE SHEET ============

/**
 * Export a compact 1-page combat reference sheet optimized for game table use.
 * Includes: key stats, weapons, sensors, defenses, armor, damage tracks,
 * hit location chart, and fire arcs diagram.
 */
export async function exportCombatReferencePDF(data: ShipData): Promise<string> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;

  const ctx: PdfContext = {
    pdf,
    y: margin,
    margin,
    contentWidth: pageWidth - margin * 2,
    pageWidth,
    pageHeight,
  };

  const { hull } = data;
  const isStation = data.designType === 'station';
  const hasEngines = data.installedEngines.length > 0 || data.installedEngineFuelTanks.length > 0;
  const stats = computeShipStats(data);
  const shipName = data.warshipName || hull.name;

  // --- Header bar ---
  pdf.setFillColor(40, 40, 40);
  pdf.rect(margin, ctx.y - 2, ctx.contentWidth, 10, 'F');
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(shipName, margin + 3, ctx.y + 4);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const subtitle = isStation && data.stationType
    ? `${getStationTypeDisplayName(data.stationType)} – ${hull.name}`
    : `${capitalize(hull.shipClass)} Class – ${hull.name}`;
  pdf.text(subtitle, pageWidth - margin - 3, ctx.y + 4, { align: 'right' });
  pdf.setTextColor(0);
  ctx.y += 12;

  // --- Key Stats Row ---
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  const statItems: string[] = [
    `Toughness: ${hull.toughness}`,
    `Target Mod: ${hull.targetModifier >= 0 ? '+' : ''}${hull.targetModifier}`,
    `HP: ${stats.usedHP}/${stats.totalHP}`,
  ];
  if (hasEngines) {
    statItems.push(`Accel: ${stats.totalAcceleration}`);
    statItems.push(`Maneuver: ${hull.maneuverability}`);
  }
  if (data.installedFTLDrive) {
    statItems.push(`FTL: ${data.installedFTLDrive.type.name}`);
  }
  pdf.text(statItems.join('   |   '), margin, ctx.y);
  ctx.y += 4;

  // Horizontal divider
  pdf.setDrawColor(100);
  pdf.setLineWidth(0.3);
  pdf.line(margin, ctx.y, pageWidth - margin, ctx.y);
  ctx.y += 3;

  // --- Two-column layout ---
  const colGap = 4;
  const leftColWidth = ctx.contentWidth * 0.55;
  const rightColWidth = ctx.contentWidth - leftColWidth - colGap;
  const leftX = margin;
  const rightX = margin + leftColWidth + colGap;
  const columnStartY = ctx.y;

  // ========== LEFT COLUMN ==========
  renderCombatWeaponsColumn(ctx, data, stats, leftX, leftColWidth);

  const leftEndY = ctx.y;

  // ========== RIGHT COLUMN ==========
  ctx.y = columnStartY;
  renderCombatDefensesColumn(ctx, data, rightX, rightColWidth);

  const rightEndY = ctx.y;
  ctx.y = Math.max(leftEndY, rightEndY);

  // --- Footer ---
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(128);
  pdf.text('Alternity Warship Generator – Combat Reference Sheet', margin, pageHeight - 4);
  pdf.text(new Date().toLocaleDateString(), pageWidth - margin, pageHeight - 4, { align: 'right' });
  pdf.setTextColor(0);

  // Save
  return saveCombatPdf(ctx, data, shipName);
}

/**
 * Left column of combat reference: weapons, ordnance, sensors.
 */
function renderCombatWeaponsColumn(
  ctx: PdfContext,
  data: ShipData,
  stats: ShipStats,
  colX: number,
  colWidth: number,
): void {
  const { pdf } = ctx;

  // --- Weapons ---
  if (data.installedWeapons.length > 0 || data.installedLaunchSystems.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(220, 220, 220);
    pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
    pdf.text('WEAPONS', colX + 1, ctx.y);
    ctx.y += 3;

    const fireControls = data.installedCommandControl.filter(cc =>
      cc.type.category === 'computer' && cc.linkedWeaponBatteryKey,
    );

    // Header
    const wCols = [colX, colX + 26, colX + 42, colX + 52, colX + 66, colX + 76, colX + 86, colX + 94];
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Weapon', wCols[0], ctx.y);
    pdf.text('Range', wCols[1], ctx.y);
    pdf.text('T/FP', wCols[2], ctx.y);
    pdf.text('Damage', wCols[3], ctx.y);
    pdf.text('Acc', wCols[4], ctx.y);
    pdf.text('Arcs', wCols[5], ctx.y);
    pdf.text('FC', wCols[6], ctx.y);
    pdf.text('Qty', wCols[7], ctx.y);
    ctx.y += 1;
    pdf.setDrawColor(120);
    pdf.setLineWidth(0.15);
    pdf.line(colX, ctx.y, colX + colWidth, ctx.y);
    ctx.y += 2;

    pdf.setFont('helvetica', 'normal');
    for (const weapon of data.installedWeapons) {
      const wt = weapon.weaponType;
      const rangeText = `${wt.rangeShort}/${wt.rangeMedium}/${wt.rangeLong}`;
      const typeText = `${wt.damageType}/${wt.firepower}`;
      const batteryKey = `${wt.id}:${weapon.mountType}`;
      const linkedFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === batteryKey);
      const fcText = linkedFC ? (linkedFC.type.stepBonus ? linkedFC.type.stepBonus.toString() : 'Y') : '-';
      const config = weapon.gunConfiguration !== 'single' ? capitalize(weapon.gunConfiguration) + ' ' : '';
      const accText = wt.accuracyModifier >= 0 ? `+${wt.accuracyModifier}` : wt.accuracyModifier.toString();

      pdf.text(`${config}${wt.name}`.substring(0, 18), wCols[0], ctx.y);
      pdf.text(rangeText.substring(0, 12), wCols[1], ctx.y);
      pdf.text(typeText, wCols[2], ctx.y);
      pdf.text(wt.damage.substring(0, 12), wCols[3], ctx.y);
      pdf.text(accText, wCols[4], ctx.y);
      pdf.text(formatArcsShort(weapon.arcs), wCols[5], ctx.y);
      pdf.text(fcText, wCols[6], ctx.y);
      pdf.text(weapon.quantity.toString(), wCols[7], ctx.y);
      ctx.y += 3;
    }

    // Launch systems
    for (const ls of data.installedLaunchSystems) {
      const lsName = capitalize(ls.launchSystemType.replace(/-/g, ' '));
      const lsFC = fireControls.find(fc => fc.linkedWeaponBatteryKey === `launch:${ls.launchSystemType}`);
      const fcText = lsFC ? (lsFC.type.stepBonus ? lsFC.type.stepBonus.toString() : 'Y') : '-';

      pdf.text(lsName.substring(0, 18), wCols[0], ctx.y);
      pdf.text('-', wCols[1], ctx.y);
      pdf.text('-', wCols[2], ctx.y);
      pdf.text('ordnance', wCols[3], ctx.y);
      pdf.text('-', wCols[4], ctx.y);
      pdf.text('-', wCols[5], ctx.y);
      pdf.text(fcText, wCols[6], ctx.y);
      pdf.text(ls.quantity.toString(), wCols[7], ctx.y);
      ctx.y += 3;
    }
    ctx.y += 2;
  }

  // --- Ordnance ---
  if ((data.ordnanceDesigns || []).length > 0) {
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(220, 220, 220);
    pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
    pdf.text('ORDNANCE', colX + 1, ctx.y);
    ctx.y += 3;

    const allWarheads = getWarheads();
    const allPropulsion = getPropulsionSystems();

    const oCols = [colX, colX + 22, colX + 34, colX + 46, colX + 58, colX + 72, colX + 86];
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Name', oCols[0], ctx.y);
    pdf.text('Type', oCols[1], ctx.y);
    pdf.text('Acc', oCols[2], ctx.y);
    pdf.text('T/FP', oCols[3], ctx.y);
    pdf.text('Damage', oCols[4], ctx.y);
    pdf.text('Area', oCols[5], ctx.y);
    pdf.text('End/Acl', oCols[6], ctx.y);
    ctx.y += 1;
    pdf.setDrawColor(120);
    pdf.line(colX, ctx.y, colX + colWidth, ctx.y);
    ctx.y += 2;

    pdf.setFont('helvetica', 'normal');
    for (const design of data.ordnanceDesigns) {
      const warhead = allWarheads.find(w => w.id === design.warheadId);
      const propulsion = design.category === 'missile'
        ? allPropulsion.find(p => p.id === (design as MissileDesign).propulsionId)
        : null;

      const accText = formatAccuracyModifier(design.totalAccuracy);
      const typeFpText = warhead ? `${warhead.damageType}/${warhead.firepower}` : '?';
      const damageText = warhead?.damage ?? '?';
      const areaText = warhead?.area ? `${warhead.area.rangeOrdinary}/${warhead.area.rangeGood}/${warhead.area.rangeAmazing}` : '-';
      const endAccelText = propulsion
        ? `${propulsion.endurance}/${formatAcceleration(propulsion.acceleration, propulsion.isPL6Scale ?? false)}`
        : '-';

      pdf.text(design.name.substring(0, 14), oCols[0], ctx.y);
      pdf.text(capitalize(design.category).substring(0, 6), oCols[1], ctx.y);
      pdf.text(accText, oCols[2], ctx.y);
      pdf.text(typeFpText, oCols[3], ctx.y);
      pdf.text(damageText.substring(0, 12), oCols[4], ctx.y);
      pdf.text(areaText.substring(0, 12), oCols[5], ctx.y);
      pdf.text(endAccelText.substring(0, 10), oCols[6], ctx.y);
      ctx.y += 3;
    }
    ctx.y += 2;
  }

  // --- Sensors ---
  if (data.installedSensors.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(220, 220, 220);
    pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
    pdf.text('SENSORS', colX + 1, ctx.y);
    ctx.y += 3;

    const sensorControls = data.installedCommandControl.filter(cc =>
      cc.type.category === 'computer' && cc.linkedSensorId,
    );

    const sCols = [colX, colX + 26, colX + 42, colX + 52, colX + 62, colX + 74, colX + 86];
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sensor', sCols[0], ctx.y);
    pdf.text('Range', sCols[1], ctx.y);
    pdf.text('Track', sCols[2], ctx.y);
    pdf.text('Acc', sCols[3], ctx.y);
    pdf.text('Arcs', sCols[4], ctx.y);
    pdf.text('Ctrl', sCols[5], ctx.y);
    pdf.text('Qty', sCols[6], ctx.y);
    ctx.y += 1;
    pdf.setDrawColor(120);
    pdf.line(colX, ctx.y, colX + colWidth, ctx.y);
    ctx.y += 2;

    pdf.setFont('helvetica', 'normal');
    for (const sensor of data.installedSensors) {
      const st = sensor.type;
      const rangeText = st.rangeSpecial || `${st.rangeShort}/${st.rangeMedium}/${st.rangeLong}`;
      const linkedSC = sensorControls.find(sc => sc.linkedSensorId === sensor.id);
      const scText = linkedSC ? (linkedSC.type.stepBonus ? linkedSC.type.stepBonus.toString() : 'Y') : '-';

      pdf.text(st.name.substring(0, 18), sCols[0], ctx.y);
      pdf.text(rangeText.substring(0, 12), sCols[1], ctx.y);
      pdf.text(st.trackingCapability.toString(), sCols[2], ctx.y);
      pdf.text(st.accuracyDescription.substring(0, 8), sCols[3], ctx.y);
      pdf.text(formatArcsShort(sensor.arcs), sCols[4], ctx.y);
      pdf.text(scText, sCols[5], ctx.y);
      pdf.text(sensor.quantity.toString(), sCols[6], ctx.y);
      ctx.y += 3;
    }
    ctx.y += 2;
  }

  // --- Fire arcs mini-diagram ---
  renderCombatFireArcDiagram(ctx, data.installedWeapons, colX, colWidth);
}

/**
 * Right column of combat reference: armor, defenses, damage track, hit location.
 */
function renderCombatDefensesColumn(
  ctx: PdfContext,
  data: ShipData,
  colX: number,
  colWidth: number,
): void {
  const { pdf } = ctx;
  const { hull } = data;

  // --- Armor ---
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(220, 220, 220);
  pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
  pdf.text('ARMOR', colX + 1, ctx.y);
  ctx.y += 3;

  pdf.setFontSize(5.5);
  if (data.armorLayers.length > 0) {
    for (const layer of data.armorLayers) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${capitalize(layer.weight)} ${layer.type.name}`, colX, ctx.y);
      ctx.y += 2.5;
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `LI: ${layer.type.protectionLI}   HI: ${layer.type.protectionHI}   En: ${layer.type.protectionEn}`,
        colX + 2, ctx.y,
      );
      ctx.y += 3;
    }
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.text('None', colX, ctx.y);
    ctx.y += 3;
  }
  ctx.y += 1;

  // --- Active Defenses ---
  if (data.installedDefenses.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(220, 220, 220);
    pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
    pdf.text('DEFENSES', colX + 1, ctx.y);
    ctx.y += 3;

    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    for (const d of data.installedDefenses) {
      const effectText = d.type.effect ? ` – ${d.type.effect}` : '';
      const line = `${d.quantity}× ${d.type.name}${effectText}`;
      const lines = pdf.splitTextToSize(line, colWidth - 2);
      for (const l of lines) {
        pdf.text(l, colX, ctx.y);
        ctx.y += 2.5;
      }
    }
    ctx.y += 1;
  }

  // --- Damage Track ---
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(220, 220, 220);
  pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
  pdf.text('DAMAGE TRACK', colX + 1, ctx.y);
  ctx.y += 3;

  const trackHalfWidth = colWidth / 2 - 1;

  const stunRows = drawDamageTrackBoxes(ctx, `S (${hull.damageTrack.stun})`, hull.damageTrack.stun, colX, trackHalfWidth);
  const woundRows = drawDamageTrackBoxes(ctx, `W (${hull.damageTrack.wound})`, hull.damageTrack.wound, colX + trackHalfWidth + 2, trackHalfWidth);
  ctx.y += Math.max(stunRows, woundRows) * 5 + 2;

  const mortalRows = drawDamageTrackBoxes(ctx, `M (${hull.damageTrack.mortal})`, hull.damageTrack.mortal, colX, trackHalfWidth);
  const critRows = drawDamageTrackBoxes(ctx, `C (${hull.damageTrack.critical})`, hull.damageTrack.critical, colX + trackHalfWidth + 2, trackHalfWidth);
  ctx.y += Math.max(mortalRows, critRows) * 5 + 2;

  // --- Hit Location Table ---
  if (data.damageDiagramZones.length > 0) {
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(220, 220, 220);
    pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
    pdf.text('HIT LOCATION', colX + 1, ctx.y);
    ctx.y += 3;

    const hitChart: HitLocationChart = data.hitLocationChart
      || createDefaultHitLocationChart(
        getZoneConfigForHull(hull).zones,
        getZoneConfigForHull(hull).hitDie,
      );

    const hitColW = colWidth / 5;
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`d${hitChart.hitDie}`, colX, ctx.y);
    pdf.text('Fwd', colX + hitColW, ctx.y);
    pdf.text('Port', colX + hitColW * 2, ctx.y);
    pdf.text('Stbd', colX + hitColW * 3, ctx.y);
    pdf.text('Aft', colX + hitColW * 4, ctx.y);
    ctx.y += 1;
    pdf.setDrawColor(120);
    pdf.setLineWidth(0.15);
    pdf.line(colX, ctx.y, colX + colWidth, ctx.y);
    ctx.y += 2;

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
      pdf.text(rollText, colX, ctx.y);

      const directions = ['forward', 'port', 'starboard', 'aft'];
      for (let di = 0; di < directions.length; di++) {
        const entries = directionMap[directions[di]] || [];
        const matchEntry = entries.find(e => e.minRoll === entry.minRoll);
        if (matchEntry) {
          pdf.text(matchEntry.zone, colX + hitColW * (di + 1), ctx.y);
        }
      }
      ctx.y += 2.5;
    }
    ctx.y += 2;
  }
}

/**
 * Compact fire arcs mini-diagram for the combat reference sheet.
 */
function renderCombatFireArcDiagram(
  ctx: PdfContext,
  weapons: InstalledWeapon[],
  colX: number,
  colWidth: number,
): void {
  const { pdf } = ctx;

  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFillColor(220, 220, 220);
  pdf.rect(colX, ctx.y - 3, colWidth, 4.5, 'F');
  pdf.text('FIRE ARCS', colX + 1, ctx.y);
  ctx.y += 4;

  const arcWeapons: Record<string, number> = { forward: 0, starboard: 0, aft: 0, port: 0 };
  for (const weapon of weapons) {
    for (const arc of weapon.arcs) {
      const baseArc = arc.startsWith('zero-') ? arc.replace('zero-', '') : arc;
      if (baseArc in arcWeapons) arcWeapons[baseArc] += weapon.quantity;
    }
  }

  const diagramSize = 30;
  const diagramCenterX = colX + colWidth / 2;
  const diagramCenterY = ctx.y + diagramSize / 2;
  const outerRadius = diagramSize / 2 - 1;

  const standardArcFill = [200, 200, 200];
  const standardArcActive = [100, 149, 237];

  const arcs = [
    { arc: 'forward', label: 'F', startAngle: -135 },
    { arc: 'starboard', label: 'S', startAngle: -45 },
    { arc: 'aft', label: 'A', startAngle: 45 },
    { arc: 'port', label: 'P', startAngle: 135 },
  ];

  for (const { arc, label, startAngle } of arcs) {
    const count = arcWeapons[arc];
    const fillColor = count > 0 ? standardArcActive : standardArcFill;
    drawPieSector(pdf, diagramCenterX, diagramCenterY, 2, outerRadius, startAngle, startAngle + 90, fillColor);

    const midAngle = ((startAngle + 45) * Math.PI) / 180;
    const labelRadius = outerRadius * 0.6;
    const labelX = diagramCenterX + labelRadius * Math.cos(midAngle);
    const labelY = diagramCenterY + labelRadius * Math.sin(midAngle);

    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(count > 0 ? 255 : 60);
    pdf.text(`${label}:${count}`, labelX, labelY + 1, { align: 'center' });
  }

  // Ship triangle
  pdf.setTextColor(0);
  pdf.setFillColor(50, 50, 50);
  const triSize = 2;
  pdf.triangle(
    diagramCenterX, diagramCenterY - triSize,
    diagramCenterX - triSize * 0.7, diagramCenterY + triSize * 0.5,
    diagramCenterX + triSize * 0.7, diagramCenterY + triSize * 0.5,
    'F',
  );

  ctx.y += diagramSize + 3;
}

/**
 * Save the combat reference PDF to disk.
 */
async function saveCombatPdf(ctx: PdfContext, data: ShipData, shipName: string): Promise<string> {
  const isStation = data.designType === 'station';
  const sheetType = isStation ? 'station_combat_ref' : 'combat_ref';
  const filename = `${shipName.replace(/[^a-zA-Z0-9]/g, '_')}_${sheetType}.pdf`;

  if (window.electronAPI && data.targetDirectory) {
    const separator = data.targetDirectory.includes('\\') ? '\\' : '/';
    const fullPath = `${data.targetDirectory}${separator}${filename}`;
    const base64Data = ctx.pdf.output('datauristring').split(',')[1];
    const result = await window.electronAPI.savePdfFile(fullPath, base64Data);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save PDF');
    }
    return fullPath;
  } else {
    ctx.pdf.save(filename);
    return filename;
  }
}
