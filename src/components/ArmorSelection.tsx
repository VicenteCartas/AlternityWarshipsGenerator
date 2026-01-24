import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Button,
} from '@mui/material';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight } from '../types/armor';
import {
  getArmorWeightsForShipClass,
  getArmorTypesByWeight,
  calculateArmorHullPoints,
  calculateArmorCost,
  formatArmorCost,
  getTechTrackName,
} from '../services/armorService';

interface ArmorSelectionProps {
  hull: Hull;
  selectedWeight: ArmorWeight | null;
  selectedType: ArmorType | null;
  onArmorSelect: (weight: ArmorWeight, type: ArmorType) => void;
  onArmorClear: () => void;
}

export function ArmorSelection({
  hull,
  selectedWeight,
  selectedType,
  onArmorSelect,
  onArmorClear,
}: ArmorSelectionProps) {
  // Filter for armor weight categories (All, Light, Medium, Heavy, Super-Heavy)
  const [weightFilter, setWeightFilter] = useState<ArmorWeight | 'all'>('all');

  const availableWeights = useMemo(
    () => getArmorWeightsForShipClass(hull.shipClass),
    [hull.shipClass]
  );

  const filteredTypes = useMemo(
    () => getArmorTypesByWeight(hull.shipClass, weightFilter),
    [hull.shipClass, weightFilter]
  );

  const handleWeightFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newWeight: ArmorWeight | 'all' | null
  ) => {
    if (newWeight !== null) {
      setWeightFilter(newWeight);
    }
  };

  const handleTypeSelect = (armorType: ArmorType) => {
    // Use the armor's own weight category
    onArmorSelect(armorType.armorWeight, armorType);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6">
          Step 2: Select Armor (Optional)
        </Typography>
        {(selectedWeight || selectedType) && (
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={onArmorClear}
          >
            Clear Armor
          </Button>
        )}
      </Box>

      {/* Weight Filter */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={weightFilter}
          exclusive
          onChange={handleWeightFilterChange}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          {availableWeights.map((w) => (
            <ToggleButton key={w.weight} value={w.weight}>
              {w.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Armor Type Selection */}
      <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: 120, whiteSpace: 'nowrap' }}>Armor Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 120, whiteSpace: 'nowrap' }}>Weight</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Tech</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>LI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>En</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HP Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Total Cost</TableCell>
                <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTypes.map((armorType) => {
                const isSelected = selectedType?.id === armorType.id;
                const hullPointsCost = calculateArmorHullPoints(hull, armorType.armorWeight);
                const totalCost = calculateArmorCost(hull, armorType.armorWeight, armorType);
                const weightConfig = availableWeights.find(w => w.weight === armorType.armorWeight);

                return (
                  <TableRow
                    key={armorType.id}
                    hover
                    selected={isSelected}
                    onClick={() => handleTypeSelect(armorType)}
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
                      <Typography
                        variant="body2"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                      >
                        {armorType.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {weightConfig?.name ?? armorType.armorWeight} ({weightConfig?.hullPercentage ?? 0}%)
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{armorType.progressLevel}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getTechTrackName(armorType.techTrack)}>
                        <Typography variant="caption">
                          {armorType.techTrack === '-' ? 'None' : armorType.techTrack}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {armorType.protectionLI}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {armorType.protectionHI}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {armorType.protectionEn}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{armorType.costDisplay}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{hullPointsCost}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatArmorCost(totalCost)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={armorType.description} placement="left">
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
                          {armorType.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
    </Box>
  );
}
