import { useState, useMemo, useCallback } from 'react';
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
  Chip,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { Hull } from '../types/hull';
import type { ArmorType, ArmorWeight, ShipArmor } from '../types/armor';
import type { ProgressLevel, TechTrack } from '../types/common';
import {
  getArmorWeightsForShipClass,
  getArmorTypesByWeight,
  calculateArmorHullPoints,
  calculateArmorCost,
  calculateMultiLayerArmorHP,
  calculateMultiLayerArmorCost,
  isMultipleArmorLayersAllowed,
} from '../services/armorService';
import { filterByDesignConstraints } from '../services/utilities';
import { formatCost, getTechTrackName } from '../services/formatters';
import { headerCellSx, scrollableTableContainerSx } from '../constants/tableStyles';
import { TruncatedDescription, ConfirmDialog } from './shared';

interface ArmorSelectionProps {
  hull: Hull;
  armorLayers: ShipArmor[];
  designProgressLevel: ProgressLevel;
  designTechTracks: TechTrack[];
  onArmorSelect: (weight: ArmorWeight, type: ArmorType) => void;
  onArmorClear: () => void;
  onArmorRemoveLayer: (weight: ArmorWeight) => void;
}

export function ArmorSelection({
  hull,
  armorLayers,
  designProgressLevel,
  designTechTracks,
  onArmorSelect,
  onArmorClear,
  onArmorRemoveLayer,
}: ArmorSelectionProps) {
  // Filter for armor weight categories (All, Light, Medium, Heavy, Super-Heavy)
  const [weightFilter, setWeightFilter] = useState<ArmorWeight | 'all'>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const multiLayerAllowed = useMemo(() => isMultipleArmorLayersAllowed(), []);
  const usedWeights = useMemo(() => new Set(armorLayers.map(l => l.weight)), [armorLayers]);

  const availableWeights = useMemo(
    () => getArmorWeightsForShipClass(hull.shipClass),
    [hull.shipClass]
  );

  // Get all armor types that pass design constraints (before weight filter)
  const allFilteredByConstraints = useMemo(() => {
    const byWeight = getArmorTypesByWeight(hull.shipClass, 'all');
    return filterByDesignConstraints(byWeight, designProgressLevel, designTechTracks);
  }, [hull.shipClass, designProgressLevel, designTechTracks]);

  // Count armors by weight
  const weightCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allFilteredByConstraints.length };
    for (const w of availableWeights) {
      counts[w.id] = allFilteredByConstraints.filter((a) => a.armorWeight === w.id).length;
    }
    return counts;
  }, [allFilteredByConstraints, availableWeights]);

  // Get armor types filtered by weight, then apply design constraints
  const filteredTypes = useMemo(() => {
    const byWeight = getArmorTypesByWeight(hull.shipClass, weightFilter);
    const byConstraints = filterByDesignConstraints(byWeight, designProgressLevel, designTechTracks);
    if (multiLayerAllowed) {
      return byConstraints.filter(t => !usedWeights.has(t.armorWeight) || armorLayers.some(l => l.type.id === t.id));
    }
    return byConstraints;
  }, [hull.shipClass, weightFilter, designProgressLevel, designTechTracks, multiLayerAllowed, usedWeights, armorLayers]);

  const handleWeightFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newWeight: ArmorWeight | 'all' | null
  ) => {
    if (newWeight !== null) {
      setWeightFilter(newWeight);
    }
  };

  const handleTypeSelect = (armorType: ArmorType) => {
    onArmorSelect(armorType.armorWeight, armorType);
  };

  const totalHP = calculateMultiLayerArmorHP(hull, armorLayers);
  const totalCostValue = calculateMultiLayerArmorCost(hull, armorLayers);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
        {armorLayers.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={() => setConfirmClearOpen(true)}
          >
            Remove All Armor
          </Button>
        )}
      </Box>

      {/* Armor Summary */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {[...armorLayers]
            .sort((a, b) => a.hullPointsUsed - b.hullPointsUsed)
            .map((layer) => {
            const weightConfig = availableWeights.find(w => w.id === layer.weight);
            const weightName = weightConfig ? weightConfig.name : layer.weight;
            return (
            <Chip
              key={layer.weight}
              label={`${layer.type.name} (${weightName})`}
              color="primary"
              variant="filled"
              onDelete={multiLayerAllowed ? () => onArmorRemoveLayer(layer.weight) : undefined}
            />
          )})}
          <Chip
            label={`HP: ${totalHP > 0 ? `${totalHP} (${((totalHP / hull.hullPoints) * 100).toFixed(1)}%)` : '0'}`}
            color="default"
            variant="outlined"
          />
          <Chip
            label={`Cost: ${totalCostValue > 0 ? formatCost(totalCostValue) : '$0'}`}
            color="default"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Installed Layers (multi-layer only) */}
      {multiLayerAllowed && armorLayers.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Installed Layers</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Weight</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>LI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>HI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>En</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>HP</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 50 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...armorLayers]
                .sort((a, b) => a.hullPointsUsed - b.hullPointsUsed)
                .map((layer) => {
                const weightConfig = availableWeights.find(w => w.id === layer.weight);
                const weightName = weightConfig ? weightConfig.name : layer.weight.charAt(0).toUpperCase() + layer.weight.slice(1);
                return (
                <TableRow key={layer.weight}>
                  <TableCell>{weightName}</TableCell>
                  <TableCell>{layer.type.name}</TableCell>
                  <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{layer.type.protectionLI}</TableCell>
                  <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{layer.type.protectionHI}</TableCell>
                  <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{layer.type.protectionEn}</TableCell>
                  <TableCell align="right">{layer.hullPointsUsed}</TableCell>
                  <TableCell align="right">{formatCost(layer.cost)}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onArmorRemoveLayer(layer.weight)} aria-label="Remove armor layer">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Weight Filter */}
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={weightFilter}
          exclusive
          onChange={handleWeightFilterChange}
          size="small"
          aria-label="Filter by armor weight"
        >
          <ToggleButton value="all">All ({weightCounts.all})</ToggleButton>
          {availableWeights.map((w) => (
            <ToggleButton key={w.id} value={w.id}>
              {w.name} ({weightCounts[w.id]})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Armor Type Selection */}
      <TableContainer component={Paper} variant="outlined" sx={scrollableTableContainerSx}>
          <Table size="small" sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: 30, p: 0 }}></TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 120, whiteSpace: 'nowrap' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 120, whiteSpace: 'nowrap' }}>Weight</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 50, whiteSpace: 'nowrap' }}>PL</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>Tech</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>LI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HI</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>En</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 70, whiteSpace: 'nowrap' }}>HP Cost</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Cost/HP</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: 90, whiteSpace: 'nowrap' }}>Total Cost</TableCell>
                <TableCell sx={headerCellSx}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTypes.map((armorType) => {
                const isSelected = armorLayers.some(l => l.type.id === armorType.id);
                const hullPointsCost = calculateArmorHullPoints(hull, armorType.armorWeight);
                const rowTotalCost = calculateArmorCost(hull, armorType.armorWeight, armorType);
                const weightConfig = availableWeights.find(w => w.id === armorType.armorWeight);

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
                    <TableCell sx={{ p: 0, textAlign: 'center', width: 30 }}>
                      {isSelected
                        ? <CheckCircleIcon color="success" sx={{ fontSize: 18, verticalAlign: 'middle' }} />
                        : <RadioButtonUncheckedIcon sx={{ fontSize: 18, verticalAlign: 'middle', opacity: 0.4 }} />}
                    </TableCell>
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
                      <Tooltip title={armorType.techTracks.map(t => getTechTrackName(t)).join(', ') || 'None'}>
                        <Typography variant="caption">
                          {armorType.techTracks.length > 0 ? armorType.techTracks.join(', ') : 'None'}
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
                      <Typography variant="body2">{hullPointsCost}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatCost(armorType.costPerHullPoint)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{formatCost(rowTotalCost)}</Typography>
                    </TableCell>
                    <TableCell>
                      <TruncatedDescription text={armorType.description} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Remove All Armor"
        message="This will remove all installed armor layers. This action cannot be undone."
        confirmLabel="Remove All"
        onConfirm={() => { onArmorClear(); setConfirmClearOpen(false); }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </Box>
  );
}
