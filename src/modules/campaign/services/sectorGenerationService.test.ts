import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SECTOR_SETTINGS,
  SECTOR_SCALES,
  calculateSectorClaims,
  findSectorHexAtPosition,
  generateSector,
  getSectorClaimAtPosition,
  regenerateSectorSystem,
  rebuildSectorNetwork,
  regenerateSectorFactions,
  regenerateSectorFeatures,
  scaleSectorRouteRange,
  sectorDistance,
  sectorRoutesAreConnected,
  setSectorSystemFaction,
} from './sectorGenerationService';

describe('sector scales', () => {
  it('matches GMG Table G57', () => {
    expect(SECTOR_SCALES).toEqual({
      province: { id: 'province', name: 'Province', diameterLy: 10, gmgEstimatedStars: 50, mapScaleLyPerHex: 1 },
      cluster: { id: 'cluster', name: 'Cluster', diameterLy: 100, gmgEstimatedStars: 5_000, mapScaleLyPerHex: 5 },
      region: { id: 'region', name: 'Region', diameterLy: 1_000, gmgEstimatedStars: 500_000, mapScaleLyPerHex: 50 },
      arm: { id: 'arm', name: 'Arm', diameterLy: 10_000, gmgEstimatedStars: 50_000_000, mapScaleLyPerHex: 500 },
      galaxy: { id: 'galaxy', name: 'Galaxy', diameterLy: 100_000, gmgEstimatedStars: 5_000_000_000, mapScaleLyPerHex: 5_000 },
    });
  });

  it('preserves relative route range when changing scale', () => {
    expect(scaleSectorRouteRange('cluster', 'province', 20)).toBe(2);
    expect(scaleSectorRouteRange('province', 'cluster', 2)).toBe(20);
    expect(scaleSectorRouteRange('cluster', 'region', 20)).toBe(200);

    const province = generateSector({
      ...DEFAULT_SECTOR_SETTINGS,
      scaleId: 'province',
      routeRangeLy: scaleSectorRouteRange('cluster', 'province', DEFAULT_SECTOR_SETTINGS.routeRangeLy),
    });
    expect(province.routes.length).toBeLessThan(50);
  });
});

describe('generateSector', () => {
  it('is deterministic and separates background stars from mapped systems', () => {
    const first = generateSector(DEFAULT_SECTOR_SETTINGS);
    const second = generateSector(DEFAULT_SECTOR_SETTINGS);

    expect(first).toEqual(second);
    expect(first.systems).toHaveLength(24);
    expect(first.backgroundStarCount).toBe(5_000);
    expect(first.systems.filter((system) => system.hook)).toHaveLength(8);
    expect(new Set(first.systems.map((system) => system.name)).size).toBe(first.systems.length);
    expect(first.factions).toHaveLength(3);
    expect(first.features).toHaveLength(4);
  });

  it('produces connected routes with exact 3D distances', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);

    expect(sectorRoutesAreConnected(sector)).toBe(true);
    for (const route of sector.routes) {
      const from = sector.systems.find((system) => system.id === route.fromSystemId)!;
      const to = sector.systems.find((system) => system.id === route.toSystemId)!;
      expect(route.distanceLy).toBeCloseTo(sectorDistance(from, to), 1);
    }
  });

  it('uses a distinct science-informed background estimate and spectral population', () => {
    const sector = generateSector({
      ...DEFAULT_SECTOR_SETTINGS,
      model: 'science',
      seed: 'Science Cluster',
    });

    expect(sector.backgroundStarCount).toBeGreaterThan(1_000);
    expect(sector.backgroundStarCount).toBeLessThan(5_000);
    expect(sector.backgroundEstimateLabel).toContain('Science-informed');
    expect(sector.systems.filter((system) => system.spectralClass.startsWith('M')).length)
      .toBeGreaterThan(sector.systems.filter((system) => system.spectralClass.startsWith('A')).length);
  });

  it('generates faction border claims around capital systems', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const claims = calculateSectorClaims(sector);

    expect(claims.length).toBeGreaterThan(0);
    expect(new Set(claims.map((claim) => claim.factionId)).size).toBeGreaterThan(1);
    expect(sector.factions.every((faction) => (
      sector.systems.some((system) => system.id === faction.capitalSystemId && system.factionId === faction.id)
    ))).toBe(true);
    sector.systems
      .filter((system) => !['unexplored', 'ruin', 'anomaly'].includes(system.role))
      .forEach((system) => {
        expect(getSectorClaimAtPosition(sector, system.xLy, system.yLy)?.factionId ?? null)
          .toBe(system.factionId);
      });
  });

  it('assigns ordinary systems to their projected map territory', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const [firstFaction, secondFaction] = sector.factions;
    const firstCapitalId = firstFaction.capitalSystemId;
    const secondCapitalId = secondFaction.capitalSystemId;
    const target = sector.systems.find((system) => (
      system.id !== firstCapitalId
      && system.id !== secondCapitalId
      && !['unexplored', 'ruin', 'anomaly'].includes(system.role)
    ))!;
    const positioned = {
      ...sector,
      factions: sector.factions.map((faction) => ({ ...faction, influenceRadiusLy: 200 })),
      systems: sector.systems.map((system) => {
        if (system.id === firstCapitalId) return { ...system, xLy: 0, yLy: 0, zLy: 100 };
        if (system.id === secondCapitalId) return { ...system, xLy: 20, yLy: 0, zLy: 0 };
        if (system.id === target.id) return { ...system, xLy: 1, yLy: 0, zLy: 0 };
        return system;
      }),
    };

    const rebuilt = rebuildSectorNetwork(positioned);

    expect(rebuilt.systems.find((system) => system.id === target.id)?.factionId).toBe(firstFaction.id);
  });

  it('shows a manual ownership assignment as an enclave on the hex map', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const capitalIds = new Set(sector.factions.map((faction) => faction.capitalSystemId));
    const hexCounts = new Map<string, number>();
    sector.systems.forEach((system) => {
      const hex = findSectorHexAtPosition(sector, system.xLy, system.yLy);
      if (hex) hexCounts.set(`${hex.column}:${hex.row}`, (hexCounts.get(`${hex.column}:${hex.row}`) ?? 0) + 1);
    });
    const target = sector.systems.find((system) => {
      const hex = findSectorHexAtPosition(sector, system.xLy, system.yLy);
      return !capitalIds.has(system.id)
        && !['unexplored', 'ruin', 'anomaly'].includes(system.role)
        && hexCounts.get(`${hex?.column}:${hex?.row}`) === 1;
    })!;
    const assignedFaction = sector.factions.find((faction) => faction.id !== target.factionId)!;
    const edited = setSectorSystemFaction(sector, target.id, assignedFaction.id);

    expect(getSectorClaimAtPosition(edited, target.xLy, target.yLy)?.factionId).toBe(assignedFaction.id);
  });

  it('demotes a former capital when faction capitals are rebuilt', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const faction = sector.factions[0];
    const formerCapital = sector.systems.find((system) => system.id === faction.capitalSystemId)!;
    const replacement = sector.systems.find((system) => (
      !sector.factions.some((entry) => entry.capitalSystemId === system.id)
      && !['unexplored', 'ruin', 'anomaly'].includes(system.role)
    ))!;
    const changed = {
      ...sector,
      factions: sector.factions.map((entry) => (
        entry.id === faction.id ? { ...entry, capitalSystemId: replacement.id } : entry
      )),
    };

    const rebuilt = rebuildSectorNetwork(changed);

    expect(rebuilt.systems.find((system) => system.id === replacement.id))
      .toMatchObject({ role: 'capital', factionId: faction.id });
    expect(rebuilt.systems.find((system) => system.id === formerCapital.id)?.role).toBe('colony');
  });

  it('preserves locked systems during full regeneration', () => {
    const original = generateSector(DEFAULT_SECTOR_SETTINGS);
    const lockedSystem = { ...original.systems[0], name: 'Locked Home', locked: true };
    const current = { ...original, systems: [lockedSystem, ...original.systems.slice(1)] };
    const regenerated = generateSector({ ...DEFAULT_SECTOR_SETTINGS, seed: 'Different Seed' }, current);

    expect(regenerated.systems[0]).toMatchObject({ id: lockedSystem.id, name: 'Locked Home', locked: true });
  });

  it('rerolls one unlocked system while retaining its map coordinates', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const original = sector.systems[1];
    const rerolled = regenerateSectorSystem(sector, original.id);
    const updated = rerolled.systems[1];

    expect(updated.id).toBe(original.id);
    expect(updated).toMatchObject({ xLy: original.xLy, yLy: original.yLy, zLy: original.zLy });
    expect(updated.name).not.toBe(original.name);
    expect(new Set(rerolled.systems.map((system) => system.name)).size).toBe(rerolled.systems.length);
    expect(sectorRoutesAreConnected(rerolled)).toBe(true);
  });

  it('rebuilds route distances after coordinate edits', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const moved = {
      ...sector,
      systems: sector.systems.map((system, index) => index === 0 ? { ...system, xLy: system.xLy + 5 } : system),
    };
    const rebuilt = rebuildSectorNetwork(moved);
    expect(sectorRoutesAreConnected(rebuilt)).toBe(true);
    expect(rebuilt.routes).not.toEqual(sector.routes);
  });

  it('preserves locked factions and features during targeted regeneration', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const lockedFaction = { ...sector.factions[0], name: 'Locked Faction', locked: true };
    const lockedFeature = { ...sector.features[0], name: 'Locked Feature', locked: true };
    const current = {
      ...sector,
      factions: [lockedFaction, ...sector.factions.slice(1)],
      features: [lockedFeature, ...sector.features.slice(1)],
    };

    expect(regenerateSectorFactions(current).factions[0].name).toBe('Locked Faction');
    expect(regenerateSectorFeatures(current).features[0].name).toBe('Locked Feature');
  });
});
