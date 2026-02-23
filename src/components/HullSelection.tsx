import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from '@mui/material';
import type { Hull, ShipClass, HullCategory } from '../types/hull';
import type { DesignType } from '../types/common';
import {
  getAllHulls,
  getAllStationHulls,
  getShipClasses,
} from '../services/hullService';
import { formatCost, formatTargetModifier, getShipClassDisplayName } from '../services/formatters';
import { headerCellSx, columnWidths, stickyFirstColumnHeaderSx, stickyFirstColumnCellSx, scrollableTableContainerSx } from '../constants/tableStyles';
import { TruncatedDescription } from './shared';

interface HullSelectionProps {
  selectedHull: Hull | null;
  onHullSelect: (hull: Hull) => void;
  designType: DesignType;
}

export function HullSelection({ selectedHull, onHullSelect, designType }: HullSelectionProps) {
  const [shipClassFilter, setShipClassFilter] = useState<ShipClass | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<HullCategory | 'all'>('all');

  const allHulls = useMemo(() => designType === 'station' ? getAllStationHulls() : getAllHulls(), [designType]);

  const isStation = designType === 'station';

  const hulls = useMemo(() => {
    let filtered = allHulls;

    if (shipClassFilter !== 'all') {
      filtered = filtered.filter((h) => h.shipClass === shipClassFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((h) => h.category === categoryFilter);
    }

    return filtered;
  }, [allHulls, shipClassFilter, categoryFilter]);

  // Count hulls by ship class (respecting category filter)
  const shipClassCounts = useMemo(() => {
    const filtered = categoryFilter === 'all' 
      ? allHulls 
      : allHulls.filter((h) => h.category === categoryFilter);
    const counts: Record<string, number> = { all: filtered.length };
    for (const sc of getShipClasses()) {
      counts[sc] = filtered.filter((h) => h.shipClass === sc).length;
    }
    return counts;
  }, [allHulls, categoryFilter]);

  // Count hulls by category (respecting ship class filter)
  const categoryCounts = useMemo(() => {
    const filtered = shipClassFilter === 'all' 
      ? allHulls 
      : allHulls.filter((h) => h.shipClass === shipClassFilter);
    return {
      all: filtered.length,
      military: filtered.filter((h) => h.category === 'military').length,
      civilian: filtered.filter((h) => h.category === 'civilian').length,
    };
  }, [allHulls, shipClassFilter]);

  const handleShipClassChange = (
    _event: React.MouseEvent<HTMLElement>,
    newClass: ShipClass | 'all'
  ) => {
    if (newClass !== null) {
      setShipClassFilter(newClass);
    }
  };

  const handleCategoryChange = (
    _event: React.MouseEvent<HTMLElement>,
    newCategory: HullCategory | 'all'
  ) => {
    if (newCategory !== null) {
      setCategoryFilter(newCategory);
    }
  };

  return (
    <Box>
      {/* Hull Summary */}
      {selectedHull && (
        <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={selectedHull.name}
              color="primary"
              variant="filled"
            />
            <Chip
              label={`HP: ${selectedHull.hullPoints + selectedHull.bonusHullPoints}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Crew: ${selectedHull.crew}`}
              color="default"
              variant="outlined"
            />
            <Chip
              label={`Cost: ${formatCost(selectedHull.cost)}`}
              color="default"
              variant="outlined"
            />
          </Box>
        </Paper>
      )}

      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={shipClassFilter}
          exclusive
          onChange={handleShipClassChange}
          size="small"
        >
          <ToggleButton value="all">All ({shipClassCounts.all})</ToggleButton>
          {getShipClasses().map((sc) => (
            <ToggleButton key={sc} value={sc}>
              {getShipClassDisplayName(sc)} ({shipClassCounts[sc]})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {!isStation && (
          <ToggleButtonGroup
            value={categoryFilter}
            exclusive
            onChange={handleCategoryChange}
            size="small"
          >
            <ToggleButton value="all">All ({categoryCounts.all})</ToggleButton>
            <ToggleButton value="military">Military ({categoryCounts.military})</ToggleButton>
            <ToggleButton value="civilian">Civilian ({categoryCounts.civilian})</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Hull Table */}
      <TableContainer component={Paper} variant="outlined" sx={scrollableTableContainerSx}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headerCellSx, ...stickyFirstColumnHeaderSx, width: columnWidths.name }}>Name</TableCell>
              <TableCell sx={{ ...headerCellSx, width: 100 }}>Class</TableCell>
              <TableCell sx={{ ...headerCellSx, width: 70 }}>Type</TableCell>
              <TableCell align="right" sx={{ ...headerCellSx, width: columnWidths.hp }}>HP</TableCell>
              <TableCell align="right" sx={{ ...headerCellSx, width: 60 }}>Bonus</TableCell>
              <TableCell sx={{ ...headerCellSx, width: 80 }}>Tough</TableCell>
              <TableCell sx={{ ...headerCellSx, width: 90 }}>Target</TableCell>
              <TableCell align="center" sx={{ ...headerCellSx, width: 45 }}>Mvr</TableCell>
              <TableCell sx={{ ...headerCellSx, width: 115 }}>Damage Track</TableCell>
              <TableCell align="right" sx={{ ...headerCellSx, width: 70 }}>Crew</TableCell>
              <TableCell align="right" sx={{ ...headerCellSx, width: columnWidths.cost }}>Cost</TableCell>
              <TableCell sx={headerCellSx}>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hulls.map((hull) => {
              const isSelected = selectedHull?.id === hull.id;

              return (
                <TableRow
                  key={hull.id}
                  hover
                  selected={isSelected}
                  onClick={() => onHullSelect(hull)}
                  sx={{ 
                    cursor: 'pointer',
                    '&.Mui-selected': {
                      backgroundColor: 'action.selected',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'action.selected',
                    },
                  }}
                >
                  <TableCell sx={stickyFirstColumnCellSx}>
                    <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                      {hull.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {getShipClassDisplayName(hull.shipClass)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={hull.category === 'military' ? 'Mil' : 'Civ'}
                      size="small"
                      color={hull.category === 'military' ? 'error' : 'info'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{hull.hullPoints}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {hull.bonusHullPoints > 0 ? `+${hull.bonusHullPoints}` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{hull.toughness}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{formatTargetModifier(hull.targetModifier)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{hull.maneuverability}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`Stun: ${hull.damageTrack.stun}, Wound: ${hull.damageTrack.wound}, Mortal: ${hull.damageTrack.mortal}, Critical: ${hull.damageTrack.critical}`}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {hull.damageTrack.stun}/{hull.damageTrack.wound}/{hull.damageTrack.mortal}/{hull.damageTrack.critical}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{hull.crew.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{formatCost(hull.cost)}</Typography>
                  </TableCell>
                  <TableCell>
                    <TruncatedDescription text={hull.description} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {hulls.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          No hulls match the selected filters.
        </Typography>
      )}
    </Box>
  );
}
