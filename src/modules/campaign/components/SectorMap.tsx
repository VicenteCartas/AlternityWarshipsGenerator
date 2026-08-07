import { Box } from '@mui/material';
import type { SectorDocument, SectorSystem } from '../types/sector';
import {
  SECTOR_MAP_HEIGHT as HEIGHT,
  SECTOR_MAP_WIDTH as WIDTH,
  calculateSectorClaims,
  getSectorHexCenter,
  getSectorHexPoints,
  getSectorMapGeometry,
  getSectorMapPoint,
} from '../services/sectorGenerationService';

interface SectorMapProps {
  sector: SectorDocument;
  selectedSystemId: string | null;
  onSelectSystem: (systemId: string) => void;
}

const LABEL_HEIGHT = 14;

interface LabelPosition {
  x: number;
  y: number;
}

interface LabelBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function labelWidth(text: string): number {
  return Math.max(42, text.length * 6.6);
}

function labelBounds(position: LabelPosition, width: number): LabelBounds {
  return {
    left: position.x - width / 2,
    right: position.x + width / 2,
    top: position.y - LABEL_HEIGHT + 2,
    bottom: position.y + 3,
  };
}

function boundsOverlap(first: LabelBounds, second: LabelBounds): boolean {
  const gap = 4;
  return first.left < second.right + gap
    && first.right + gap > second.left
    && first.top < second.bottom + gap
    && first.bottom + gap > second.top;
}

function reserveLabel(width: number, candidates: LabelPosition[], occupied: LabelBounds[]): LabelPosition {
  const inBounds = (bounds: LabelBounds) => bounds.left >= 4
    && bounds.right <= WIDTH - 4
    && bounds.top >= 4
    && bounds.bottom <= HEIGHT - 4;
  for (const candidate of candidates) {
    const bounds = labelBounds(candidate, width);
    if (inBounds(bounds) && occupied.every((entry) => !boundsOverlap(bounds, entry))) {
      occupied.push(bounds);
      return candidate;
    }
  }

  const first = candidates[0];
  const fallback = {
    x: Math.min(WIDTH - width / 2 - 4, Math.max(width / 2 + 4, first.x)),
    y: Math.min(HEIGHT - 4, Math.max(LABEL_HEIGHT + 2, first.y)),
  };
  occupied.push(labelBounds(fallback, width));
  return fallback;
}

function roleSymbol(system: SectorSystem): string {
  if (system.role === 'capital') return 'C';
  if (system.role === 'naval-base') return 'N';
  if (system.role === 'ruin') return 'R';
  if (system.role === 'anomaly') return '?';
  return '';
}

export function SectorMap({ sector, selectedSystemId, onSelectSystem }: SectorMapProps) {
  const geometry = getSectorMapGeometry(sector);
  const { columns, rows, hexRadius, gridWidth } = geometry;
  const half = sector.diameterLy / 2;
  const mapX = (xLy: number) => getSectorMapPoint(sector, geometry, xLy, 0).x;
  const mapY = (yLy: number) => getSectorMapPoint(sector, geometry, 0, yLy).y;
  const systemById = new Map(sector.systems.map((system) => [system.id, system]));
  const factionById = new Map(sector.factions.map((faction) => [faction.id, faction]));
  const claims = calculateSectorClaims(sector);
  const claimByHex = new Map(claims.map((claim) => [`${claim.column}:${claim.row}`, claim.factionId]));
  const occupiedLabels: LabelBounds[] = [{ left: 18, right: 498, top: HEIGHT - 55, bottom: HEIGHT - 17 }];
  const systemLabels = new Map<string, LabelPosition>();
  [...sector.systems]
    .filter((system) => system.id === selectedSystemId || system.importance >= 4)
    .sort((first, second) => Number(second.id === selectedSystemId) - Number(first.id === selectedSystemId)
      || second.importance - first.importance)
    .forEach((system) => {
      const x = mapX(system.xLy);
      const y = mapY(system.yLy);
      const zLabel = `${system.zLy >= 0 ? '▲' : '▼'}${Math.abs(system.zLy)}`;
      const width = labelWidth(`${system.name} ${zLabel}`);
      systemLabels.set(system.id, reserveLabel(width, [
        { x: x + 10 + width / 2, y: y - 8 },
        { x: x + 10 + width / 2, y: y + 18 },
        { x: x - 10 - width / 2, y: y - 8 },
        { x: x - 10 - width / 2, y: y + 18 },
        { x, y: y - 17 },
        { x, y: y + 27 },
      ], occupiedLabels));
    });
  const featureLabels = new Map<string, LabelPosition>();
  sector.features.forEach((feature) => {
    const x = mapX(feature.xLy);
    const y = mapY(feature.yLy);
    const radius = Math.max(12, feature.radiusLy / sector.diameterLy * gridWidth);
    const width = labelWidth(feature.name);
    featureLabels.set(feature.id, reserveLabel(width, [
      { x, y: y - radius - 5 },
      { x, y: y + radius + 16 },
      { x: x - radius - 8 - width / 2, y: y + 4 },
      { x: x + radius + 8 + width / 2, y: y + 4 },
      { x: x - radius * 0.7, y: y - radius * 0.7 - 5 },
      { x: x + radius * 0.7, y: y + radius * 0.7 + 12 },
    ], occupiedLabels));
  });

  return (
    <Box
      sx={{
        width: '100%',
        overflowX: 'auto',
      }}
    >
      <Box
        sx={{
          width: { xs: 900, md: '100%' },
          maxWidth: 1_200,
          mx: { md: 'auto' },
          aspectRatio: `${WIDTH} / ${HEIGHT}`,
        }}
      >
        <svg
          role="img"
          aria-label="Interactive star sector map"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', background: '#070b13' }}
        >
          <rect width={WIDTH} height={HEIGHT} fill="#070b13" />
        {Array.from({ length: columns }, (_column, column) => (
          Array.from({ length: rows }, (_row, row) => {
            const center = getSectorHexCenter(geometry, column, row);
            const faction = factionById.get(claimByHex.get(`${column}:${row}`) ?? '');
            return (
              <polygon
                key={`hex-${column}-${row}`}
                points={getSectorHexPoints(center.x, center.y, hexRadius)}
                fill={faction?.color ?? 'transparent'}
                fillOpacity={faction ? 0.12 : 0}
                stroke={faction?.color ?? '#52677c'}
                strokeOpacity={faction ? 0.55 : 0.42}
                strokeWidth={faction ? 1.4 : 0.8}
              />
            );
          })
        ))}

        {sector.features.map((feature) => {
          const color = feature.kind === 'nebula' ? '#6688aa'
            : feature.kind === 'rift' ? '#2e3445'
              : feature.kind === 'ruins' ? '#b07745' : '#9c67bd';
          const radius = Math.max(12, feature.radiusLy / sector.diameterLy * gridWidth);
          const label = featureLabels.get(feature.id)!;
          return (
            <g key={feature.id}>
              <circle
                cx={mapX(feature.xLy)}
                cy={mapY(feature.yLy)}
                r={radius}
                fill={color}
                fillOpacity={feature.kind === 'rift' ? 0.22 : 0.12}
                stroke={color}
                strokeOpacity={0.7}
                strokeWidth={2}
                strokeDasharray={feature.kind === 'rift' ? '8 6' : '4 4'}
              />
              <text x={label.x} y={label.y} fill="#9eb1c3" fontSize="12" textAnchor="middle">
                {feature.name}
              </text>
            </g>
          );
        })}

        {sector.routes.map((route) => {
          const from = systemById.get(route.fromSystemId);
          const to = systemById.get(route.toSystemId);
          if (!from || !to) return null;
          return (
            <line
              key={route.id}
              x1={mapX(from.xLy)}
              y1={mapY(from.yLy)}
              x2={mapX(to.xLy)}
              y2={mapY(to.yLy)}
              stroke={route.type === 'major' ? '#e5c76b' : route.type === 'frontier' ? '#8b94a3' : '#5f86aa'}
              strokeWidth={route.type === 'major' ? 3 : 1.5}
              strokeDasharray={route.type === 'frontier' ? '5 5' : undefined}
              strokeOpacity={0.7}
            >
              <title>{`${from.name} to ${to.name}: ${route.distanceLy} light-years (${route.type})`}</title>
            </line>
          );
        })}

        {sector.systems.map((system) => {
          const selected = system.id === selectedSystemId;
          const highlighted = Boolean(system.hook);
          const x = mapX(system.xLy);
          const y = mapY(system.yLy);
          const label = systemLabels.get(system.id);
          const factionName = factionById.get(system.factionId ?? '')?.name ?? 'Unclaimed';
          return (
            <g
              key={system.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${system.name}`}
              onClick={() => onSelectSystem(system.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectSystem(system.id);
              }}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <title>{`${system.name}; ${system.spectralClass}; ${system.role}; ${factionName}; (${system.xLy}, ${system.yLy}, ${system.zLy}) light-years`}</title>
              {highlighted && <circle cx={x} cy={y} r={11} fill="none" stroke="#ef5e63" strokeWidth={2} />}
              {selected && <circle cx={x} cy={y} r={15} fill="none" stroke="#ffffff" strokeWidth={2.5} />}
              <circle cx={x} cy={y} r={system.importance >= 4 ? 6 : 4.5} fill={system.color} stroke="#10151e" strokeWidth={1.5} />
              {roleSymbol(system) && (
                <text x={x} y={y + 3} fill="#081018" fontSize="7" fontWeight="bold" textAnchor="middle">{roleSymbol(system)}</text>
              )}
              {label && (
                <text x={label.x} y={label.y} fill="#eef5fb" fontSize="12" fontWeight={selected ? 700 : 500} textAnchor="middle">
                  {system.name}
                  <tspan fill={system.zLy >= 0 ? '#ef7777' : '#78aee8'}>{` ${system.zLy >= 0 ? '▲' : '▼'}${Math.abs(system.zLy)}`}</tspan>
                </text>
              )}
            </g>
          );
        })}

        <g transform={`translate(18 ${HEIGHT - 55})`}>
          <rect width="480" height="38" rx="3" fill="rgba(8,15,25,.82)" stroke="rgba(150,175,195,.35)" />
          <text x="10" y="16" fill="#dce8f2" fontSize="11">{`1 hex = ${sector.mapScaleLyPerHex.toLocaleString()} LY | map ±${half.toLocaleString()} LY | color = faction ownership`}</text>
          <text x="10" y="31" fill="#9eb1c3" fontSize="10">Ring = highlighted site | C capital | N naval base | R ruin | ? anomaly | ▲/▼ z offset</text>
        </g>
        </svg>
      </Box>
    </Box>
  );
}
