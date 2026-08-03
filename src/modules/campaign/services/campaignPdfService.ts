import { jsPDF } from 'jspdf';
import { APP_NAME, APP_VERSION } from '@shared/constants/version';
import type { StarSystemDocument } from '../types/campaignSaveFile';
import type { CityTownLocation, CivilizationDesign, InstallationLocation } from '../types/worldbuilding';
import {
  INSTALLATION_FACILITIES,
  TRADE_COMMODITIES,
  getCivilizationLevel,
  getLawLevel,
  validateCivilizationDesign,
} from './civilizationDesignService';
import { formatGraphCode, GRAPH_LABELS } from './gmgScienceTranslationService';

interface PdfContext {
  pdf: jsPDF;
  y: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
}

const LINE_HEIGHT = 4.5;

function createContext(): PdfContext {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  return { pdf, y: margin, margin, pageWidth, pageHeight, contentWidth: pageWidth - margin * 2 };
}

function ensureSpace(ctx: PdfContext, needed: number): void {
  if (ctx.y + needed > ctx.pageHeight - 14) {
    ctx.pdf.addPage();
    ctx.y = ctx.margin;
  }
}

function title(ctx: PdfContext, text: string, subtitle?: string): void {
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(17);
  ctx.pdf.text(text, ctx.margin, ctx.y);
  ctx.y += 7;
  if (subtitle) {
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(9);
    ctx.pdf.text(subtitle, ctx.margin, ctx.y);
    ctx.y += 7;
  }
}

function heading(ctx: PdfContext, text: string, size = 11): void {
  ensureSpace(ctx, 11);
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(size);
  ctx.pdf.text(text, ctx.margin, ctx.y);
  ctx.y += size * 0.45;
  ctx.pdf.setDrawColor(185);
  ctx.pdf.line(ctx.margin, ctx.y, ctx.margin + ctx.contentWidth, ctx.y);
  ctx.y += 4;
}

function body(ctx: PdfContext, text: string, size = 8.5): void {
  if (!text.trim()) return;
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(size);
  const lines = ctx.pdf.splitTextToSize(text, ctx.contentWidth) as string[];
  for (const line of lines) {
    ensureSpace(ctx, LINE_HEIGHT);
    ctx.pdf.text(line, ctx.margin, ctx.y);
    ctx.y += LINE_HEIGHT;
  }
}

function labeled(ctx: PdfContext, label: string, value: string): void {
  if (!value.trim()) return;
  body(ctx, `${label}: ${value}`);
}

function table(ctx: PdfContext, headers: string[], widths: number[], rows: string[][]): void {
  const drawRow = (cells: string[], bold: boolean) => {
    ensureSpace(ctx, LINE_HEIGHT + 1);
    ctx.pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    ctx.pdf.setFontSize(7.5);
    let x = ctx.margin;
    cells.forEach((cell, index) => {
      const text = (ctx.pdf.splitTextToSize(cell, widths[index] - 2) as string[])[0] ?? '';
      ctx.pdf.text(text, x, ctx.y);
      x += widths[index];
    });
    ctx.y += LINE_HEIGHT + 1;
  };
  drawRow(headers, true);
  ctx.pdf.setDrawColor(205);
  ctx.pdf.line(ctx.margin, ctx.y - LINE_HEIGHT + 1, ctx.margin + ctx.contentWidth, ctx.y - LINE_HEIGHT + 1);
  rows.forEach((row) => drawRow(row, false));
  ctx.y += 2;
}

function footer(ctx: PdfContext): void {
  const pageCount = ctx.pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    ctx.pdf.setPage(page);
    ctx.pdf.setFont('helvetica', 'italic');
    ctx.pdf.setFontSize(6);
    ctx.pdf.setTextColor(120);
    ctx.pdf.text(`${APP_NAME} v${APP_VERSION}`, ctx.margin, ctx.pageHeight - 6);
    ctx.pdf.text(`Page ${page}/${pageCount}`, ctx.pageWidth / 2, ctx.pageHeight - 6, { align: 'center' });
    ctx.pdf.setTextColor(0);
  }
}

function safeFileBase(value: string, fallback: string): string {
  return (value || fallback).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '') || fallback;
}

function drawOrbitDiagram(ctx: PdfContext, document: StarSystemDocument): void {
  ensureSpace(ctx, 74);
  const centerX = ctx.pageWidth / 2;
  const centerY = ctx.y + 34;
  const maxRadius = 31;
  const distances = document.system.planets.map((planet) => planet.distanceAu).filter((distance) => distance > 0);
  const minimumDistance = distances.length > 0 ? Math.min(...distances) : 0;
  const maximumDistance = distances.length > 0 ? Math.max(...distances) : 0;
  ctx.pdf.setDrawColor(155, 170, 190);
  document.system.planets.forEach((planet) => {
    const scienceFraction = maximumDistance > minimumDistance
      ? (Math.log(planet.distanceAu) - Math.log(minimumDistance)) / (Math.log(maximumDistance) - Math.log(minimumDistance))
      : 0.5;
    const radius = document.system.generationModel === 'science'
      ? 7 + scienceFraction * maxRadius
      : 6 + planet.ring / 16 * maxRadius;
    ctx.pdf.circle(centerX, centerY, radius, 'S');
    const angle = planet.ring * 137.5 * Math.PI / 180;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    ctx.pdf.setFillColor(75, 115, 150);
    ctx.pdf.circle(x, y, planet.type.includes('Gas giant') ? 1.8 : 1.2, 'F');
    ctx.pdf.setFontSize(5.5);
    ctx.pdf.text(String(planet.ring), x + 2, y + 1);
  });
  ctx.pdf.setFillColor(245, 188, 65);
  ctx.pdf.circle(centerX, centerY, 2.5, 'F');
  ctx.y += 72;
}

export function createStarSystemPdf(document: StarSystemDocument): jsPDF {
  const ctx = createContext();
  const scienceMode = document.system.generationModel === 'science';
  title(
    ctx,
    document.name || 'Unnamed System',
    scienceMode ? 'Science-informed Star System Report' : 'Star System Report - Gamemaster Guide tables G58-G68',
  );
  heading(ctx, 'System Overview');
  if (scienceMode && document.system.science) {
    const settings = document.system.scienceSettings;
    body(ctx, `${document.system.starCountLabel} star(s); ${document.system.planets.length} planet(s); ${document.system.science.architecture}. Seed: ${document.system.seed}.`);
    body(ctx, `Assumptions: ${settings?.systemDensity || 'typical'} density; ${settings?.planetOccurrence || 'observed'} planet occurrence; ${settings?.lifeFrequency || 'rare'} life.`);
    body(ctx, `Age ${document.system.science.ageGyr} Gyr; metallicity ${document.system.science.metallicityDex} dex; stable zone ${document.system.science.stableInnerAu}-${document.system.science.stableOuterAu} AU; conservative habitable zone ${document.system.science.habitableZoneInnerAu}-${document.system.science.habitableZoneOuterAu} AU; snow line ${document.system.science.snowLineAu} AU.`);
    body(ctx, 'Science-informed results use simplified physical and occurrence models and are not a full planet-formation simulation.');
    table(ctx, ['Role', 'Class', 'Mass', 'Radius', 'Luminosity', 'Temp.'], [30, 30, 30, 30, 45, 25], document.system.stars.map((star) => [
      star.role,
      star.classification,
      `${star.science?.massSolar || 0} M Sun`,
      `${star.science?.radiusSolar || 0} R Sun`,
      `${star.science?.luminositySolar || 0} L Sun`,
      `${star.science?.temperatureK || 0} K`,
    ]));
  } else {
    body(ctx, `${document.system.starCountLabel} star(s); Orbit Track ${document.system.orbitTrack}; ${document.system.planets.length} of ${document.system.potentialPlanetCount} potential bodies placed.`);
    table(ctx, ['Group', 'Role', 'Classification', 'Color'], [25, 35, 65, 55], document.system.stars.map((star) => [
      String(star.group), star.role, star.classification, star.color,
    ]));
  }
  drawOrbitDiagram(ctx, document);
  heading(ctx, 'Orbital Bodies');
  if (scienceMode) {
    table(ctx, ['Distance', 'Body', 'Mass', 'Radius', 'Temp.', 'Year', 'Life', 'GMG'], [23, 34, 24, 24, 18, 24, 18, 25], document.system.planets.map((planet) => [
      `${planet.distanceAu} AU`,
      planet.type,
      `${planet.science?.massEarth || 0} M Earth`,
      `${planet.science?.radiusEarth || 0} R Earth`,
      `${planet.science?.equilibriumTempK || 0} K`,
      `${planet.science?.orbitalPeriodDays || 0} d`,
      planet.science?.life || 'none',
      planet.gmgTranslation ? `C${planet.gmgTranslation.environmentClass} ${formatGraphCode(planet.gmgTranslation)}` : '-',
    ]));
  } else {
    table(ctx, ['Orbit', 'Distance', 'Body', 'Moons', 'Environment', 'Life'], [20, 25, 55, 18, 32, 30], document.system.planets.map((planet) => {
      const life = planet.environment?.life.filter((entry) => entry.present).map((entry) => entry.series).join(', ') || '-';
      return [
        String(planet.ring), `${planet.distanceAu} AU`, planet.type, String(planet.moons.length),
        planet.environment ? `Class ${planet.environment.environmentClass}` : '-', life,
      ];
    }));
  }
  for (const planet of document.system.planets) {
    heading(ctx, scienceMode ? `${planet.distanceAu} AU: ${planet.type}` : `Ring ${planet.ring}: ${planet.type}`, 10);
    body(ctx, scienceMode
      ? `${planet.science?.massEarth || 0} Earth masses; ${planet.science?.radiusEarth || 0} Earth radii; ${planet.moons.length} major moon(s).`
      : `${planet.distanceAu} AU; planet roll ${planet.typeRoll}; ${planet.moons.length} moon(s).`);
    if (planet.science) {
      const science = planet.science;
      body(ctx, `Density ${science.densityGcm3} g/cm3; gravity ${science.gravityEarth} g; year ${science.orbitalPeriodDays} days; eccentricity ${science.eccentricity}; equilibrium temperature ${science.equilibriumTempK} K; albedo ${science.albedo}.`);
      body(ctx, `${science.tidallyLocked ? 'Tidally locked' : `Rotation ${science.rotationHours} hours`}; ${science.habitableZonePosition} of conservative HZ; ${science.habitability}.`);
      labeled(ctx, 'Atmosphere', `${science.atmosphere} (${science.surfacePressureAtm} atm)`);
      labeled(ctx, 'Water', science.water);
      labeled(ctx, 'Life', science.life);
    }
    if (planet.gmgTranslation) {
      const translation = planet.gmgTranslation;
      heading(ctx, 'GMG Game Translation', 9);
      body(ctx, `${translation.planetType}; Environment Class ${translation.environmentClass}; ${formatGraphCode(translation)}.`);
      body(ctx, `G${translation.gravity} ${GRAPH_LABELS.gravity[translation.gravity]}; R${translation.radiation} ${GRAPH_LABELS.radiation[translation.radiation]}; A${translation.atmosphere} ${GRAPH_LABELS.atmosphere[translation.atmosphere]}; P${translation.pressure} ${GRAPH_LABELS.pressure[translation.pressure]}; H${translation.heat} ${GRAPH_LABELS.heat[translation.heat]}.`);
      labeled(ctx, 'Oceans', translation.oceanExtent || 'None');
      labeled(ctx, 'Climate', translation.climate || 'Not applicable');
      labeled(ctx, 'Landforms', translation.landforms || 'Not applicable');
      labeled(ctx, 'Life series', translation.lifeSeries.length > 0 ? translation.lifeSeries.join(', ') : 'None');
      body(ctx, `Approximation notes: ${translation.assumptions.join(' ')}`, 7.5);
    }
    if (planet.environment) {
      const environment = planet.environment;
      body(ctx, `Environment Class ${environment.environmentClass}; G${environment.gravity} / R${environment.radiation} / A${environment.atmosphere} / P${environment.pressure} / H${environment.heat}.`);
      labeled(ctx, 'Oceans', environment.oceanExtent || 'None');
      labeled(ctx, 'Climate', environment.climate || 'Not applicable');
      labeled(ctx, 'Landforms', environment.landforms || 'Not applicable');
      const life = environment.life.filter((entry) => entry.present);
      labeled(ctx, 'Life', life.length > 0
        ? life.map((entry) => `Series ${entry.series} (${entry.base}, breathes ${entry.breathes})`).join('; ')
        : 'None detected');
    }
    if (planet.moons.length > 0) labeled(ctx, 'Moons', planet.moons.map((moon) => moon.science
      ? `${moon.type} (${moon.science.massEarth} M Earth; ${moon.science.orbitalPeriodDays} d orbit)`
      : `${moon.type} (roll ${moon.roll})`).join(', '));
  }
  footer(ctx);
  return ctx.pdf;
}

function renderCity(ctx: PdfContext, city: CityTownLocation): void {
  heading(ctx, `${city.kind === 'city' ? 'City' : 'Town'}: ${city.name || 'Unnamed'}`, 10);
  labeled(ctx, 'Population', city.population);
  labeled(ctx, 'Overview', city.overview);
  labeled(ctx, 'Layout', city.layout);
  labeled(ctx, 'Lodging', city.lodging);
  labeled(ctx, 'Food and drink', city.foodAndDrink);
  labeled(ctx, 'Equipment and services', city.equipmentAccess);
  labeled(ctx, 'Criminal underworld', city.criminalUnderworld);
  labeled(ctx, 'Law enforcement', city.lawEnforcement);
  labeled(ctx, 'Special facilities', city.specialFacilities);
  labeled(ctx, 'Campaign role', city.campaignRole);
  labeled(ctx, 'Notes', city.notes);
}

function installationFacilityNames(installation: InstallationLocation): string {
  const selected = new Set(installation.facilityIds);
  return INSTALLATION_FACILITIES.filter((facility) => selected.has(facility.id)).map((facility) => facility.name).join(', ');
}

function renderInstallation(ctx: PdfContext, installation: InstallationLocation): void {
  heading(ctx, `${installation.kind === 'station' ? 'Station' : 'Installation'}: ${installation.name || 'Unnamed'}`, 10);
  labeled(ctx, 'Purpose', installation.purpose);
  labeled(ctx, 'Location', installation.location);
  labeled(ctx, 'Occupants', installation.occupants);
  labeled(ctx, 'Isolation', installation.isolation);
  labeled(ctx, 'Facilities', installationFacilityNames(installation));
  labeled(ctx, 'Layout', installation.layout);
  labeled(ctx, 'Contacts', installation.contacts);
  labeled(ctx, 'Rivals and threats', installation.rivals);
  labeled(ctx, 'Campaign role', installation.campaignRole);
  labeled(ctx, 'Notes', installation.notes);
}

export function createCivilizationPdf(design: CivilizationDesign): jsPDF {
  const ctx = createContext();
  const civilizationLevel = getCivilizationLevel(design.civilizationLevel);
  const lawLevel = getLawLevel(design.lawLevel);
  title(ctx, design.name || 'Unnamed Civilization', 'Civilization Report - Alternity Gamemaster Guide');
  heading(ctx, 'Overview');
  body(ctx, `PL ${design.progressLevel}; CL ${civilizationLevel.level} ${civilizationLevel.name}; LL ${lawLevel.level} ${lawLevel.name}; ${design.origin} society.`);
  labeled(ctx, 'Population', design.population || civilizationLevel.population);
  labeled(ctx, 'Government', design.government);
  labeled(ctx, 'Homeland', design.homeland);
  validateCivilizationDesign(design).forEach((warning) => body(ctx, `Warning: ${warning}`));

  heading(ctx, 'Culture');
  labeled(ctx, 'Food, clothing, and shelter', design.foodAndShelter);
  labeled(ctx, 'Industries', design.industries);
  labeled(ctx, 'External contact', design.externalContact);
  labeled(ctx, 'Leisure and art', design.leisureAndArt);
  labeled(ctx, 'Values', design.values);
  labeled(ctx, 'Rivals', design.rivals);
  labeled(ctx, 'Enemies', design.enemies);
  labeled(ctx, 'Heroes', design.heroes);

  heading(ctx, 'Economy');
  labeled(ctx, 'Currency', design.currency);
  labeled(ctx, 'Resources', design.resources);
  labeled(ctx, 'Imports and demand', design.imports);
  labeled(ctx, 'Exports and supply', design.exports);
  labeled(ctx, 'Shortages', design.shortages);
  const importIds = new Set(design.tradeImportIds);
  const exportIds = new Set(design.tradeExportIds);
  const tradeRows = TRADE_COMMODITIES.filter((commodity) => importIds.has(commodity.id) || exportIds.has(commodity.id)).map((commodity) => [
    commodity.name,
    importIds.has(commodity.id) ? 'Import' : '',
    exportIds.has(commodity.id) ? 'Export' : '',
    commodity.value,
    commodity.bulk,
  ]);
  if (tradeRows.length > 0) table(ctx, ['Commodity', 'Import', 'Export', 'Value', 'Bulk'], [70, 25, 25, 30, 30], tradeRows);

  heading(ctx, 'Cities and Towns');
  labeled(ctx, 'Settlement overview', design.settlements);
  if (design.cities.length === 0) body(ctx, 'No cities or towns recorded.');
  design.cities.forEach((city) => renderCity(ctx, city));

  heading(ctx, 'Stations and Installations');
  if (design.installations.length === 0) body(ctx, 'No stations or installations recorded.');
  design.installations.forEach((installation) => renderInstallation(ctx, installation));

  heading(ctx, 'Alien and Mixed Society');
  labeled(ctx, 'Goals', design.alienGoals);
  labeled(ctx, 'Organization', design.alienOrganization);
  labeled(ctx, 'Appearance and technology', design.alienAppearance);
  labeled(ctx, 'Campaign role', design.campaignRole);
  labeled(ctx, 'Notes', design.notes);
  footer(ctx);
  return ctx.pdf;
}

export function createLocationPdf(
  civilizationName: string,
  location: CityTownLocation | InstallationLocation,
): jsPDF {
  const ctx = createContext();
  title(ctx, location.name || 'Unnamed Location', civilizationName ? `Location Sheet - ${civilizationName}` : 'Location Sheet');
  if ('facilityIds' in location) renderInstallation(ctx, location);
  else renderCity(ctx, location);
  footer(ctx);
  return ctx.pdf;
}

export function getStarSystemPdfFileName(name: string): string {
  return `${safeFileBase(name, 'Star_System')}_system_report.pdf`;
}

export function getCivilizationPdfFileName(name: string): string {
  return `${safeFileBase(name, 'Civilization')}_civilization_report.pdf`;
}

export function getLocationPdfFileName(name: string): string {
  return `${safeFileBase(name, 'Location')}_location_sheet.pdf`;
}

async function savePdf(pdf: jsPDF, fileName: string): Promise<string> {
  if (window.electronAPI) {
    const directory = await window.electronAPI.getDocumentsPath();
    const separator = directory.includes('\\') ? '\\' : '/';
    const fullPath = `${directory}${separator}${fileName}`;
    const base64Data = pdf.output('datauristring').split(',')[1];
    const result = await window.electronAPI.savePdfFile(fullPath, base64Data);
    if (!result.success) throw new Error(result.error || 'Failed to save PDF.');
    return fullPath;
  }
  pdf.save(fileName);
  return fileName;
}

export function exportStarSystemPdf(document: StarSystemDocument): Promise<string> {
  return savePdf(createStarSystemPdf(document), getStarSystemPdfFileName(document.name));
}

export function exportCivilizationPdf(design: CivilizationDesign): Promise<string> {
  return savePdf(createCivilizationPdf(design), getCivilizationPdfFileName(design.name));
}

export function exportLocationPdf(
  civilizationName: string,
  location: CityTownLocation | InstallationLocation,
): Promise<string> {
  return savePdf(createLocationPdf(civilizationName, location), getLocationPdfFileName(location.name));
}
