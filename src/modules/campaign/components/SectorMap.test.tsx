import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SECTOR_SETTINGS, generateSector } from '../services/sectorGenerationService';
import { SectorMap } from './SectorMap';

describe('SectorMap', () => {
  it('renders adjacent hexes with a shared edge', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    const { container } = render(
      <SectorMap sector={sector} selectedSystemId={null} onSelectSystem={vi.fn()} />,
    );
    const polygons = [...container.querySelectorAll('polygon')];
    const parsePoints = (polygon: Element) => (polygon.getAttribute('points') || '')
      .split(' ')
      .map((point) => point.split(',').map(Number));
    const firstPoints = parsePoints(polygons[0]);
    const nextRowPoints = parsePoints(polygons[1]);
    const sharedPoints = firstPoints.filter(([firstX, firstY]) => nextRowPoints.some(
      ([secondX, secondY]) => Math.abs(firstX - secondX) < 0.000_001
        && Math.abs(firstY - secondY) < 0.000_001,
    ));

    expect(sharedPoints).toHaveLength(2);
  });

  it('keeps unclaimed hexes visible across the map', () => {
    const sector = { ...generateSector(DEFAULT_SECTOR_SETTINGS), factions: [] };
    const { container } = render(
      <SectorMap sector={sector} selectedSystemId={null} onSelectSystem={vi.fn()} />,
    );
    const unclaimedHex = container.querySelector('polygon');

    expect(unclaimedHex).toHaveAttribute('stroke', '#52677c');
    expect(unclaimedHex).toHaveAttribute('stroke-opacity', '0.42');
  });

  it('explains every map marker and includes system details on hover', () => {
    const sector = generateSector(DEFAULT_SECTOR_SETTINGS);
    render(<SectorMap sector={sector} selectedSystemId={null} onSelectSystem={vi.fn()} />);

    expect(screen.getByText(/color = faction ownership/)).toBeInTheDocument();
    expect(screen.getByText(/C capital \| N naval base \| R ruin \| \? anomaly/)).toBeInTheDocument();
    const firstSystem = sector.systems[0];
    const factionName = sector.factions.find((faction) => faction.id === firstSystem.factionId)?.name ?? 'Unclaimed';
    const marker = screen.getByRole('button', { name: `Select ${firstSystem.name}` });
    expect(marker.querySelector('title'))
      .toHaveTextContent(`${firstSystem.name}; ${firstSystem.spectralClass}; ${firstSystem.role}; ${factionName}`);
  });

  it('separates feature labels that would otherwise overlap', () => {
    const generated = generateSector({ ...DEFAULT_SECTOR_SETTINGS, featureCount: 2 });
    const sector = {
      ...generated,
      features: generated.features.map((feature, index) => ({
        ...feature,
        name: index === 0 ? 'First Feature' : 'Second Feature',
        xLy: 0,
        yLy: 0,
        radiusLy: 8,
      })),
    };

    render(<SectorMap sector={sector} selectedSystemId={null} onSelectSystem={vi.fn()} />);

    const first = screen.getByText('First Feature');
    const second = screen.getByText('Second Feature');
    expect([first.getAttribute('x'), first.getAttribute('y')])
      .not.toEqual([second.getAttribute('x'), second.getAttribute('y')]);
  });
});