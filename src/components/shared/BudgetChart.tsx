import { Box, Typography, Tooltip } from '@mui/material';
import { formatCost } from '../../services/formatters';

/** One segment in a stacked bar */
export interface BudgetSegment {
  label: string;
  value: number;
  color: string;
}

/** Consistent colors for each system category */
export const CATEGORY_COLORS: Record<string, string> = {
  armor: '#78909c',       // blue-grey
  powerPlants: '#ff9800', // orange
  engines: '#009688',     // teal
  ftl: '#9c27b0',         // purple
  support: '#795548',     // brown
  weapons: '#f44336',     // red
  defenses: '#4caf50',    // green
  commandControl: '#2196f3', // blue
  sensors: '#00bcd4',     // cyan
  hangarMisc: '#607d8b',  // grey
  hull: '#455a64',        // dark grey (cost-only)
};

interface StackedBarProps {
  label: string;
  segments: BudgetSegment[];
  /** The max capacity (e.g., total HP or total power generated). Bar fills relative to this. */
  capacity: number;
  /** Display value as cost using formatCost, otherwise plain number */
  isCost?: boolean;
}

function StackedBar({ label, segments, capacity, isCost = false }: StackedBarProps) {
  const totalUsed = segments.reduce((sum, s) => sum + s.value, 0);
  const overBudget = totalUsed > capacity && capacity > 0;
  const barMax = Math.max(totalUsed, capacity);
  const fmt = (v: number) => isCost ? formatCost(v) : String(v);

  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" fontWeight="bold">{label}</Typography>
        <Typography
          variant="caption"
          color={overBudget ? 'error' : 'text.secondary'}
          fontWeight={overBudget ? 'bold' : undefined}
        >
          {fmt(totalUsed)} / {fmt(capacity)}
          {overBudget && ` (${fmt(totalUsed - capacity)} over)`}
        </Typography>
      </Box>

      {/* Bar track */}
      <Box
        sx={{
          width: '100%',
          height: 18,
          bgcolor: 'action.hover',
          borderRadius: 1,
          overflow: 'hidden',
          display: 'flex',
          border: overBudget ? '1px solid' : '1px solid transparent',
          borderColor: overBudget ? 'error.main' : 'transparent',
        }}
      >
        {segments.map((seg) => {
          if (seg.value === 0 || barMax === 0) return null;
          const widthPct = (seg.value / barMax) * 100;
          return (
            <Tooltip
              key={seg.label}
              title={`${seg.label}: ${fmt(seg.value)}`}
              arrow
              placement="top"
            >
              <Box
                sx={{
                  width: `${widthPct}%`,
                  height: '100%',
                  bgcolor: seg.color,
                  minWidth: widthPct > 0 ? 2 : 0,
                  transition: 'width 0.3s ease',
                  '&:hover': { opacity: 0.8 },
                }}
              />
            </Tooltip>
          );
        })}

        {/* Capacity marker line when under budget */}
        {!overBudget && totalUsed < capacity && capacity > 0 && (
          <Box sx={{ flex: 1 }} />
        )}
      </Box>
    </Box>
  );
}

interface BudgetLegendProps {
  segments: BudgetSegment[];
  isCost?: boolean;
}

function BudgetLegend({ segments, isCost = false }: BudgetLegendProps) {
  const fmt = (v: number) => isCost ? formatCost(v) : String(v);
  const nonZero = segments.filter((s) => s.value > 0);
  if (nonZero.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {nonZero.map((seg) => (
        <Box
          key={seg.label}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mr: 1,
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '2px',
              bgcolor: seg.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary" noWrap>
            {seg.label} ({fmt(seg.value)})
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/** Stats shape matching SummarySelection's computed stats */
export interface BudgetStats {
  totalHP: number;
  usedHP: number;
  powerGenerated: number;
  powerConsumed: number;
  totalCost: number;
  armor: { hp: number; cost: number };
  powerPlants: { hp: number; power?: number; cost: number };
  engines: { hp: number; power: number; cost: number };
  ftl: { hp: number; power: number; cost: number } | null;
  support: { hp: number; power: number; cost: number };
  weapons: { hp: number; power: number; cost: number };
  defenses: { hp: number; power: number; cost: number };
  commandControl: { hp: number; power: number; cost: number };
  sensors: { hp: number; power: number; cost: number };
  hangarMisc: { hp: number; power: number; cost: number };
}

interface BudgetChartProps {
  stats: BudgetStats;
  /** Cost of the hull itself (not included in category stats) */
  hullCost?: number;
}

function buildHpSegments(stats: BudgetStats): BudgetSegment[] {
  return [
    { label: 'Armor', value: stats.armor.hp, color: CATEGORY_COLORS.armor },
    { label: 'Power Plants', value: stats.powerPlants.hp, color: CATEGORY_COLORS.powerPlants },
    { label: 'Engines', value: stats.engines.hp, color: CATEGORY_COLORS.engines },
    { label: 'FTL', value: stats.ftl?.hp || 0, color: CATEGORY_COLORS.ftl },
    { label: 'Support', value: stats.support.hp, color: CATEGORY_COLORS.support },
    { label: 'Weapons', value: stats.weapons.hp, color: CATEGORY_COLORS.weapons },
    { label: 'Defenses', value: stats.defenses.hp, color: CATEGORY_COLORS.defenses },
    { label: 'C4', value: stats.commandControl.hp, color: CATEGORY_COLORS.commandControl },
    { label: 'Sensors', value: stats.sensors.hp, color: CATEGORY_COLORS.sensors },
    { label: 'Hangar/Misc', value: stats.hangarMisc.hp, color: CATEGORY_COLORS.hangarMisc },
  ];
}

function buildPowerSegments(stats: BudgetStats): BudgetSegment[] {
  return [
    { label: 'Engines', value: stats.engines.power, color: CATEGORY_COLORS.engines },
    { label: 'FTL', value: stats.ftl?.power || 0, color: CATEGORY_COLORS.ftl },
    { label: 'Support', value: stats.support.power, color: CATEGORY_COLORS.support },
    { label: 'Weapons', value: stats.weapons.power, color: CATEGORY_COLORS.weapons },
    { label: 'Defenses', value: stats.defenses.power, color: CATEGORY_COLORS.defenses },
    { label: 'C4', value: stats.commandControl.power, color: CATEGORY_COLORS.commandControl },
    { label: 'Sensors', value: stats.sensors.power, color: CATEGORY_COLORS.sensors },
    { label: 'Hangar/Misc', value: stats.hangarMisc.power, color: CATEGORY_COLORS.hangarMisc },
  ];
}

function buildCostSegments(stats: BudgetStats, hullCost: number): BudgetSegment[] {
  return [
    { label: 'Hull', value: hullCost, color: CATEGORY_COLORS.hull },
    { label: 'Armor', value: stats.armor.cost, color: CATEGORY_COLORS.armor },
    { label: 'Power Plants', value: stats.powerPlants.cost, color: CATEGORY_COLORS.powerPlants },
    { label: 'Engines', value: stats.engines.cost, color: CATEGORY_COLORS.engines },
    { label: 'FTL', value: stats.ftl?.cost || 0, color: CATEGORY_COLORS.ftl },
    { label: 'Support', value: stats.support.cost, color: CATEGORY_COLORS.support },
    { label: 'Weapons', value: stats.weapons.cost, color: CATEGORY_COLORS.weapons },
    { label: 'Defenses', value: stats.defenses.cost, color: CATEGORY_COLORS.defenses },
    { label: 'C4', value: stats.commandControl.cost, color: CATEGORY_COLORS.commandControl },
    { label: 'Sensors', value: stats.sensors.cost, color: CATEGORY_COLORS.sensors },
    { label: 'Hangar/Misc', value: stats.hangarMisc.cost, color: CATEGORY_COLORS.hangarMisc },
  ];
}

/**
 * Visual budget breakdown showing stacked horizontal bars for HP, Power, and Cost allocation.
 */
export function BudgetChart({ stats, hullCost = 0 }: BudgetChartProps) {
  const hpSegments = buildHpSegments(stats);
  const powerSegments = buildPowerSegments(stats);
  const costSegments = buildCostSegments(stats, hullCost);

  return (
    <Box>
      <StackedBar
        label="Hull Points"
        segments={hpSegments}
        capacity={stats.totalHP}
      />
      <BudgetLegend segments={hpSegments} />

      <Box sx={{ mt: 2 }} />

      <StackedBar
        label="Power"
        segments={powerSegments}
        capacity={stats.powerGenerated}
      />
      <BudgetLegend segments={powerSegments} />

      <Box sx={{ mt: 2 }} />

      <StackedBar
        label="Cost"
        segments={costSegments}
        capacity={stats.totalCost}
        isCost
      />
      <BudgetLegend segments={costSegments} isCost />
    </Box>
  );
}
