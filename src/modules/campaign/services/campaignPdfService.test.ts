import { describe, expect, it } from 'vitest';
import { generateStarSystem } from './starSystemGenerationService';
import { generateScienceStarSystem } from './scienceStarSystemService';
import { DEFAULT_CIVILIZATION_DESIGN, createCityTown, createInstallation } from './civilizationDesignService';
import {
  createCivilizationPdf,
  createLocationPdf,
  createStarSystemPdf,
  getCivilizationPdfFileName,
  getLocationPdfFileName,
  getStarSystemPdfFileName,
} from './campaignPdfService';

describe('campaign PDF export', () => {
  it('creates a star-system report with orbit and body details', () => {
    const pdf = createStarSystemPdf({ name: 'Horizon', system: generateStarSystem({ starCount: 1, rng: () => 0.2 }) });
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(4000);
    expect(pdf.output()).toContain('Horizon');
    expect(getStarSystemPdfFileName('Alpha / Test')).toBe('Alpha_Test_system_report.pdf');
  });

  it('creates a science-informed report with seed, assumptions, and physical values', () => {
    const pdf = createStarSystemPdf({ name: 'Kepler', system: generateScienceStarSystem({ seed: 'Kepler', starCount: 1 }) });
    const output = pdf.output();
    expect(output).toContain('Science-informed Star System Report');
    expect(output).toContain('Seed: Kepler');
    expect(output).toContain('habitable zone');
    expect(output).toContain('Earth masses');
    expect(output).toContain('GMG Game Translation');
    expect(output).toContain('Environment Class');
    expect(output).toContain('Approximation notes');
  });

  it('creates a full civilization report with repeated locations and trade', () => {
    const city = { ...createCityTown('city-1'), name: 'Port Meridian', lodging: 'Dockside hostels' };
    const station = { ...createInstallation('station-1'), name: 'Gateway', facilityIds: ['power'] };
    const pdf = createCivilizationPdf({
      ...DEFAULT_CIVILIZATION_DESIGN,
      name: 'Helios Compact',
      tradeExportIds: ['stardrive-units'],
      cities: [city],
      installations: [station],
    });
    const output = pdf.output();
    expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(pdf.output('arraybuffer').byteLength).toBeGreaterThan(5000);
    expect(output).toContain('Helios Compact');
    expect(output).toContain('Port Meridian');
    expect(output).toContain('Gateway');
    expect(getCivilizationPdfFileName('Helios Compact')).toBe('Helios_Compact_civilization_report.pdf');
  });

  it('creates individual city and installation location sheets', () => {
    const cityPdf = createLocationPdf('Helios', { ...createCityTown('city-1'), name: 'Port Meridian' });
    const stationPdf = createLocationPdf('Helios', { ...createInstallation('station-1'), name: 'Gateway' });
    expect(cityPdf.output()).toContain('Port Meridian');
    expect(stationPdf.output()).toContain('Gateway');
    expect(getLocationPdfFileName('Gateway / One')).toBe('Gateway_One_location_sheet.pdf');
  });
});
