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
import {
  getAllHulls,
  getShipClasses,
  getShipClassDisplayName,
} from '../services/hullService';

interface HullSelectionProps {
  selectedHull: Hull | null;
  onHullSelect: (hull: Hull) => void;
}

export function HullSelection({ selectedHull, onHullSelect }: HullSelectionProps) {
  const [shipClassFilter, setShipClassFilter] = useState<ShipClass | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<HullCategory | 'all'>('all');

  const hulls = useMemo(() => {
    let filtered = getAllHulls();

    if (shipClassFilter !== 'all') {
      filtered = filtered.filter((h) => h.shipClass === shipClassFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((h) => h.category === categoryFilter);
    }

    return filtered;
  }, [shipClassFilter, categoryFilter]);

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
      <Typography variant="h6" gutterBottom>
        Step 1: Select Hull
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={shipClassFilter}
          exclusive
          onChange={handleShipClassChange}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          {getShipClasses().map((sc) => (
            <ToggleButton key={sc} value={sc}>
              {getShipClassDisplayName(sc)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          value={categoryFilter}
          exclusive
          onChange={handleCategoryChange}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="military">Military</ToggleButton>
          <ToggleButton value="civilian">Civilian</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Hull Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: 130, whiteSpace: 'nowrap' }}>Hull</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100, whiteSpace: 'nowrap' }}>Class</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Type</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>HP</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 60, whiteSpace: 'nowrap' }}>Bonus</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 80, whiteSpace: 'nowrap' }}>Tough</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Target</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', width: 45, whiteSpace: 'nowrap' }}>Mvr</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 115, whiteSpace: 'nowrap' }}>Damage Track</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Crew</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: 80, whiteSpace: 'nowrap' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
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
                  <TableCell>
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
                    <Typography variant="caption">{hull.targetModifier}</Typography>
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
                    <Typography variant="body2">{hull.costDisplay}</Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={hull.description} placement="left">
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                        }}
                      >
                        {hull.description}
                      </Typography>
                    </Tooltip>
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
