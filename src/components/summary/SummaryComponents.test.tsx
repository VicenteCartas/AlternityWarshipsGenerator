import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { FireDiagram } from './FireDiagram';
import { DamageZonesOverview } from './DamageZonesOverview';

vi.mock('../../services/utilities', () => ({
  createSectorPath: () => 'M0,0 L1,1 Z',
}));

vi.mock('../../services/damageDiagramService', () => ({
  getZoneLimitForHull: () => 50,
}));

const theme = createTheme();

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// ============== FireDiagram ==============

describe('FireDiagram', () => {
  it('shows info alert when no weapons installed', () => {
    wrap(<FireDiagram weapons={[]} warshipName="Test Ship" hullName="Corvette" />);
    expect(screen.getByText(/No weapons installed/)).toBeInTheDocument();
  });

  it('renders diagram when weapons are provided', () => {
    const weapon = {
      id: 'w1',
      weaponType: { name: 'Laser Cannon', progressLevel: 7, hullPoints: 2, powerDraw: 1, cost: 100, techTracks: [] },
      gunConfiguration: 'single',
      quantity: 1,
      arcs: ['forward'],
      hullPointsUsed: 2,
      powerUsed: 1,
      cost: 100,
    };
    wrap(<FireDiagram weapons={[weapon as any]} warshipName="Test Ship" hullName="Corvette" />);
    // Should not show the no-weapons alert
    expect(screen.queryByText(/No weapons installed/)).not.toBeInTheDocument();
    // Should show the fire diagram description containing ship name
    expect(screen.getByText(/Fire diagram for the/)).toBeInTheDocument();
  });
});

// ============== DamageZonesOverview ==============

describe('DamageZonesOverview', () => {
  const minHull = {
    id: 'corvette',
    name: 'Corvette',
    toughness: 10,
    damageTrack: { stun: 2, wound: 4, mortal: 6, critical: 8 },
    hullPoints: 50,
    progressLevel: 6,
    cost: 1000,
    techTracks: [],
    shipClass: 'light',
  } as any;

  it('shows info alert when zones are empty', () => {
    wrap(
      <DamageZonesOverview
        zones={[]}
        hull={minHull}
        warshipName="Test Ship"
        armorLayers={[]}
      />
    );
    expect(screen.getByText(/No damage zones configured/)).toBeInTheDocument();
  });

  it('shows "No Armor" chip when armorLayers is empty', () => {
    wrap(
      <DamageZonesOverview
        zones={[]}
        hull={minHull}
        warshipName="Test Ship"
        armorLayers={[]}
      />
    );
    expect(screen.getByText(/No Armor/)).toBeInTheDocument();
  });

  it('renders zone cards when zones are provided', () => {
    const zones = [
      {
        code: 'F',
        systems: [{ id: 's1', name: 'Laser Cannon', hullPoints: 5 }],
        totalHullPoints: 5,
        maxHullPoints: 50,
      },
    ];
    wrap(
      <DamageZonesOverview
        zones={zones as any}
        hull={minHull}
        warshipName="Test Ship"
        armorLayers={[]}
      />
    );
    // Zone header should render ("Zone F" is split across elements)
    expect(screen.getByText(/Zone/)).toBeInTheDocument();
    // System name
    expect(screen.getByText(/Laser Cannon/)).toBeInTheDocument();
  });

  it('renders toughness from hull', () => {
    wrap(
      <DamageZonesOverview
        zones={[]}
        hull={minHull}
        warshipName="Test Ship"
        armorLayers={[]}
      />
    );
    expect(screen.getByText(/Toughness/)).toBeInTheDocument();
  });

  it('renders armor layer info when provided', () => {
    const armorLayers = [
      {
        weight: 'heavy',
        type: { name: 'Durasteel', protectionLI: 'd6+2', protectionHI: 'd6', protectionEn: 'd4' },
      },
    ];
    wrap(
      <DamageZonesOverview
        zones={[]}
        hull={minHull}
        warshipName="Test Ship"
        armorLayers={armorLayers as any}
      />
    );
    expect(screen.getByText(/Durasteel/)).toBeInTheDocument();
  });
});
