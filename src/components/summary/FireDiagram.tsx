import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import type { InstalledWeapon } from '../../types/weapon';

interface FireDiagramProps {
  weapons: InstalledWeapon[];
  warshipName: string;
  hullName: string;
}

// Arc angle definitions for SVG rendering
const ARC_ANGLES: Record<string, { start: number; end: number }> = {
  forward: { start: -135, end: -45 },
  starboard: { start: -45, end: 45 },
  aft: { start: 45, end: 135 },
  port: { start: 135, end: 225 },
  'zero-forward': { start: -135, end: -45 },
  'zero-starboard': { start: -45, end: 45 },
  'zero-aft': { start: 45, end: 135 },
  'zero-port': { start: 135, end: 225 },
};

// Generate SVG path for a pie sector
function createArcPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startAngleRad = (startAngle * Math.PI) / 180;
  const endAngleRad = (endAngle * Math.PI) / 180;

  const x1 = centerX + outerRadius * Math.cos(startAngleRad);
  const y1 = centerY + outerRadius * Math.sin(startAngleRad);
  const x2 = centerX + outerRadius * Math.cos(endAngleRad);
  const y2 = centerY + outerRadius * Math.sin(endAngleRad);
  const x3 = centerX + innerRadius * Math.cos(endAngleRad);
  const y3 = centerY + innerRadius * Math.sin(endAngleRad);
  const x4 = centerX + innerRadius * Math.cos(startAngleRad);
  const y4 = centerY + innerRadius * Math.sin(startAngleRad);

  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
}

export function FireDiagram({ weapons, warshipName, hullName }: FireDiagramProps) {
  // Group weapons by their arcs
  const arcWeapons = useMemo(() => {
    const result: Record<string, { standard: InstalledWeapon[]; zero: InstalledWeapon[] }> = {
      forward: { standard: [], zero: [] },
      starboard: { standard: [], zero: [] },
      aft: { standard: [], zero: [] },
      port: { standard: [], zero: [] },
    };

    for (const weapon of weapons) {
      for (const arc of weapon.arcs) {
        if (arc.startsWith('zero-')) {
          const baseArc = arc.replace('zero-', '');
          if (result[baseArc]) {
            result[baseArc].zero.push(weapon);
          }
        } else {
          if (result[arc]) {
            result[arc].standard.push(weapon);
          }
        }
      }
    }

    return result;
  }, [weapons]);

  // Check if any zero-range arcs are used
  const hasZeroArcs = weapons.some(w => w.arcs.some(a => a.startsWith('zero-')));

  const size = 400;
  const center = size / 2;
  const outerRadius = 180;
  const innerRadius = hasZeroArcs ? 80 : 0;
  const zeroOuterRadius = 75;
  const zeroInnerRadius = 20;

  // Colors for arcs based on weapon count
  const getArcColor = (count: number): string => {
    if (count === 0) return '#e0e0e0'; // grey
    if (count <= 4) return '#90caf9'; // light blue (1-4)
    if (count <= 8) return '#42a5f5'; // blue (5-8)
    if (count <= 12) return '#1976d2'; // darker blue (9-12)
    return '#0d47a1'; // very dark blue for 13+
  };

  const getZeroArcColor = (count: number): string => {
    if (count === 0) return '#e0e0e0'; // grey
    if (count <= 2) return '#ffcc80'; // light orange (1-2)
    if (count <= 4) return '#ffa726'; // orange (3-4)
    if (count <= 6) return '#f57c00'; // darker orange (5-6)
    return '#e65100'; // very dark orange for 7+
  };

  const standardArcs: Array<{ key: string; label: string }> = [
    { key: 'forward', label: 'Forward' },
    { key: 'starboard', label: 'Starboard' },
    { key: 'aft', label: 'Aft' },
    { key: 'port', label: 'Port' },
  ];

  if (weapons.length === 0) {
    return (
      <Alert severity="info">
        No weapons installed. Add weapons to see the fire diagram.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Fire diagram for the {warshipName || hullName}. Standard arcs (blue) show weapons that can fire at range. 
        {hasZeroArcs && ' Zero-range arcs (orange) show weapons that can engage targets in the same hex (fighters, missiles, etc.).'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {/* Fire Diagram SVG */}
        <Paper sx={{ p: 2 }}>
          <Box
            component="svg"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
          >
            {/* Standard arc sectors (outer ring) */}
            {standardArcs.map(({ key, label }) => {
              const angles = ARC_ANGLES[key];
              const weaponCount = arcWeapons[key].standard.reduce((sum, w) => sum + w.quantity, 0);
              const path = createArcPath(center, center, innerRadius, outerRadius, angles.start, angles.end);
              
              // Label position (middle of the sector)
              const midAngle = ((angles.start + angles.end) / 2) * Math.PI / 180;
              const labelRadius = (innerRadius + outerRadius) / 2;
              const labelX = center + labelRadius * Math.cos(midAngle);
              const labelY = center + labelRadius * Math.sin(midAngle);

              return (
                <g key={key}>
                  <path
                    d={path}
                    fill={getArcColor(weaponCount)}
                    stroke="#666"
                    strokeWidth={2}
                  />
                  <text
                    x={labelX}
                    y={labelY - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={weaponCount > 0 ? '#fff' : '#666'}
                    fontSize={14}
                    fontWeight="bold"
                  >
                    {label}
                  </text>
                  <text
                    x={labelX}
                    y={labelY + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={weaponCount > 0 ? '#fff' : '#666'}
                    fontSize={12}
                  >
                    {weaponCount} weapon{weaponCount !== 1 ? 's' : ''}
                  </text>
                </g>
              );
            })}

            {/* Zero arc sectors (inner ring) - only if zero arcs are used */}
            {hasZeroArcs && standardArcs.map(({ key }) => {
              const angles = ARC_ANGLES[key];
              const weaponCount = arcWeapons[key].zero.reduce((sum, w) => sum + w.quantity, 0);
              const path = createArcPath(center, center, zeroInnerRadius, zeroOuterRadius, angles.start, angles.end);
              
              // Label position for the zero arc count
              const midAngle = ((angles.start + angles.end) / 2) * Math.PI / 180;
              const labelRadius = (zeroInnerRadius + zeroOuterRadius) / 2;
              const labelX = center + labelRadius * Math.cos(midAngle);
              const labelY = center + labelRadius * Math.sin(midAngle);

              return (
                <g key={`zero-${key}`}>
                  <path
                    d={path}
                    fill={getZeroArcColor(weaponCount)}
                    stroke="#666"
                    strokeWidth={1}
                  />
                  {weaponCount > 0 && (
                    <text
                      x={labelX}
                      y={labelY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      fontSize={14}
                      fontWeight="bold"
                    >
                      {weaponCount}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Ship icon in center */}
            <polygon
              points={`${center},${center - 15} ${center - 8},${center + 10} ${center + 8},${center + 10}`}
              fill="#333"
              stroke="#000"
              strokeWidth={1}
            />
          </Box>
        </Paper>

        {/* Weapons list by arc - 2x2 grid */}
        <Box sx={{ flex: 1, minWidth: 300 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Weapons by Arc
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', gap: 1 }}>
            {/* Row 1: Forward and Port, Row 2: Aft and Starboard */}
            {['forward', 'port', 'aft', 'starboard'].map((actualKey) => {
              // Order: forward (top-left), port (top-right), aft (bottom-left), starboard (bottom-right)
              const label = actualKey.charAt(0).toUpperCase() + actualKey.slice(1);
              const standardWeapons = arcWeapons[actualKey].standard;
              const zeroWeapons = arcWeapons[actualKey].zero;
              const hasWeapons = standardWeapons.length > 0 || zeroWeapons.length > 0;

              return (
                <Paper key={actualKey} sx={{ p: 1.5, bgcolor: hasWeapons ? 'background.paper' : 'action.disabledBackground' }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    {label}
                  </Typography>
                  {!hasWeapons ? (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                      No weapons
                    </Typography>
                  ) : (
                    <>
                      {standardWeapons.length > 0 && (
                        <Box sx={{ mb: zeroWeapons.length > 0 ? 1 : 0 }}>
                          {standardWeapons.map((w, idx) => (
                            <Typography key={`${w.id}-std-${idx}`} variant="body2" sx={{ fontSize: '0.85rem', pl: 1 }}>
                              • {w.quantity}x {w.gunConfiguration.charAt(0).toUpperCase() + w.gunConfiguration.slice(1)} {w.weaponType.name}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {zeroWeapons.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">Zero-range:</Typography>
                          {zeroWeapons.map((w, idx) => (
                            <Typography key={`${w.id}-zero-${idx}`} variant="body2" sx={{ fontSize: '0.85rem', pl: 1 }}>
                              • {w.quantity}x {w.gunConfiguration.charAt(0).toUpperCase() + w.gunConfiguration.slice(1)} {w.weaponType.name}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary">
          Standard arcs (range):
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#e0e0e0', border: '1px solid #666' }} />
          <Typography variant="caption">0</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#90caf9', border: '1px solid #666' }} />
          <Typography variant="caption">1</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#42a5f5', border: '1px solid #666' }} />
          <Typography variant="caption">2</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#1976d2', border: '1px solid #666' }} />
          <Typography variant="caption">3</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Box sx={{ width: 16, height: 16, bgcolor: '#0d47a1', border: '1px solid #666' }} />
          <Typography variant="caption">4+</Typography>
        </Box>
        {hasZeroArcs && (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
              Zero-range:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#ffcc80', border: '1px solid #666' }} />
              <Typography variant="caption">1</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#ffa726', border: '1px solid #666' }} />
              <Typography variant="caption">2</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box sx={{ width: 16, height: 16, bgcolor: '#f57c00', border: '1px solid #666' }} />
              <Typography variant="caption">3+</Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
