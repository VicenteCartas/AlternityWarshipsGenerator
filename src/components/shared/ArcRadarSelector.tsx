import { Box, Typography, useTheme } from '@mui/material';
import type { FiringArc, StandardArc, ZeroArc } from '../../types/weapon';

interface ArcRadarSelectorProps {
  selectedArcs: FiringArc[];
  onArcToggle: (arc: FiringArc, isZeroArc: boolean) => void;
  showZeroArcs: boolean;
  disableZeroArcs?: boolean;
  maxStandardArcs: number;
  maxZeroArcs: number;
}

// Arc definitions with SVG path data for pie sectors
// Ship points UP, so Forward is at top (-135° to -45°)
const STANDARD_ARCS: { arc: StandardArc; label: string; startAngle: number }[] = [
  { arc: 'forward', label: 'Fwd', startAngle: -135 },   // top
  { arc: 'starboard', label: 'Stbd', startAngle: -45 }, // right
  { arc: 'aft', label: 'Aft', startAngle: 45 },         // bottom
  { arc: 'port', label: 'Port', startAngle: 135 },      // left
];

const ZERO_ARCS: { arc: ZeroArc; startAngle: number }[] = [
  { arc: 'zero-forward', startAngle: -135 },   // top
  { arc: 'zero-starboard', startAngle: -45 },  // right
  { arc: 'zero-aft', startAngle: 45 },         // bottom
  { arc: 'zero-port', startAngle: 135 },       // left
];

// Generate SVG path for a pie sector
function createSectorPath(
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

export function ArcRadarSelector({
  selectedArcs,
  onArcToggle,
  showZeroArcs,
  disableZeroArcs = false,
  maxStandardArcs,
  maxZeroArcs,
}: ArcRadarSelectorProps) {
  const theme = useTheme();
  
  const size = 200;
  const center = size / 2;
  const outerRadius = 90;
  const innerRadius = showZeroArcs ? 45 : 0;
  const zeroOuterRadius = 42;
  const zeroInnerRadius = 5;

  const isSelected = (arc: FiringArc) => selectedArcs.includes(arc);

  // Colors
  const standardSelectedColor = theme.palette.primary.main;
  const standardHoverColor = theme.palette.primary.light;
  const zeroSelectedColor = theme.palette.secondary.main;
  const zeroHoverColor = theme.palette.secondary.light;
  const unselectedColor = theme.palette.action.hover;
  const borderColor = theme.palette.divider;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        Arc Selector
        <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.7 }}>
          (Std: {maxStandardArcs}{showZeroArcs ? `, Zero: ${maxZeroArcs === 4 ? 'all' : maxZeroArcs}` : ''})
        </Typography>
      </Typography>
      
      <Box
        component="svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        sx={{
          cursor: 'pointer',
          '& .arc-sector': {
            transition: 'fill 0.15s ease',
          },
          '& .arc-standard:not(.selected):hover': {
            fill: standardHoverColor,
          },
          '& .arc-zero:not(.selected):not(.disabled):hover': {
            fill: zeroHoverColor,
          },
        }}
      >
        {/* Standard arc sectors (outer ring) */}
        {STANDARD_ARCS.map(({ arc, label, startAngle }) => {
          const selected = isSelected(arc);
          const endAngle = startAngle + 90;
          const path = createSectorPath(center, center, innerRadius, outerRadius, startAngle, endAngle);
          
          // Label position (middle of the sector)
          const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
          const labelRadius = (innerRadius + outerRadius) / 2;
          const labelX = center + labelRadius * Math.cos(midAngle);
          const labelY = center + labelRadius * Math.sin(midAngle);

          return (
            <g key={arc}>
              <path
                className={`arc-sector arc-standard ${selected ? 'selected' : ''}`}
                d={path}
                fill={selected ? standardSelectedColor : unselectedColor}
                stroke={borderColor}
                strokeWidth={2}
                onClick={() => onArcToggle(arc, false)}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={selected ? theme.palette.primary.contrastText : theme.palette.text.primary}
                fontSize={12}
                fontWeight={selected ? 'bold' : 'normal'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Zero arc sectors (inner circle) */}
        {showZeroArcs && ZERO_ARCS.map(({ arc, startAngle }) => {
          const selected = isSelected(arc);
          const endAngle = startAngle + 90;
          const path = createSectorPath(center, center, zeroInnerRadius, zeroOuterRadius, startAngle, endAngle);
          const disabled = disableZeroArcs;

          return (
            <path
              key={arc}
              className={`arc-sector arc-zero ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              d={path}
              fill={disabled ? theme.palette.action.disabledBackground : selected ? zeroSelectedColor : unselectedColor}
              stroke={borderColor}
              strokeWidth={1.5}
              onClick={() => !disabled && onArcToggle(arc, true)}
              style={{ 
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
              }}
            />
          );
        })}

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={showZeroArcs ? zeroInnerRadius : 4}
          fill={theme.palette.background.paper}
          stroke={borderColor}
          strokeWidth={1}
        />

        {/* Ship indicator (small triangle pointing forward) */}
        <polygon
          points={`${center},${center - 8} ${center - 5},${center + 4} ${center + 5},${center + 4}`}
          fill={theme.palette.text.secondary}
          style={{ pointerEvents: 'none' }}
        />
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 0.5 }} />
          <Typography variant="caption">Standard</Typography>
        </Box>
        {showZeroArcs && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 12, height: 12, bgcolor: 'secondary.main', borderRadius: 0.5 }} />
            <Typography variant="caption">Zero</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
