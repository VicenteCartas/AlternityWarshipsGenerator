/**
 * Dialog for picking a craft design from the Ship Library to embark on a carrier.
 * Reuses the library scanning/filtering logic but within a dialog context.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  CircularProgress,
  Alert,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import type { LibraryEntry } from '../types/library';
import type { ProgressLevel } from '../types/common';
import type { BerthingType } from '../types/embarkedCraft';
import { PL_NAMES, getShipClassDisplayName } from '../services/formatters';
import {
  toLibraryEntries,
  filterLibraryEntries,
  sortLibraryEntries,
  getSavedLibraryPath,
  saveLibraryPath,
} from '../services/libraryService';
import { HANGAR_MAX_CRAFT_HP } from '../services/embarkedCraftService';

export interface CraftPickerResult {
  filePath: string;
  name: string;
  hullHp: number;
  hullName: string;
  designCost: number;
}

interface CraftPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (craft: CraftPickerResult) => void;
  berthing: BerthingType;
  carrierHullHp: number;
}

/**
 * Loads the full design from a .warship.json file and extracts
 * the hull HP and total cost for the embarked craft snapshot.
 */
async function loadDesignDetails(filePath: string): Promise<{ hullHp: number; designCost: number; hullName: string } | null> {
  if (!window.electronAPI) return null;
  try {
    const result = await window.electronAPI.readFile(filePath);
    if (!result.success || !result.content) return null;
    const save = JSON.parse(result.content);
    if (!save.hull?.id) return null;

    // Dynamically import to avoid circular deps
    const { deserializeWarship } = await import('../services/saveService');
    const { jsonToSaveFile } = await import('../services/saveService');
    const saveFile = jsonToSaveFile(result.content);
    if (!saveFile) return null;

    const loadResult = deserializeWarship(saveFile);
    if (!loadResult.success || !loadResult.state?.hull) return null;

    const state = loadResult.state;
    const hull = state.hull;

    // Replicate cost calculation from useDesignCalculations
    const { calculateMultiLayerArmorCost } = await import('../services/armorService');
    const { calculateTotalPowerPlantStats } = await import('../services/powerPlantService');
    const { calculateTotalEngineStats } = await import('../services/engineService');
    const { calculateTotalFTLStats, calculateTotalFTLFuelTankStats } = await import('../services/ftlDriveService');
    const { calculateSupportSystemsStats } = await import('../services/supportSystemService');
    const { calculateWeaponStats } = await import('../services/weaponService');
    const { calculateOrdnanceStats } = await import('../services/ordnanceService');
    const { calculateDefenseStats } = await import('../services/defenseService');
    const { calculateCommandControlStats } = await import('../services/commandControlService');
    const { calculateSensorStats } = await import('../services/sensorService');
    const { calculateHangarMiscStats } = await import('../services/hangarMiscService');

    const armorCost = calculateMultiLayerArmorCost(hull, state.armorLayers);
    const ppStats = calculateTotalPowerPlantStats(state.powerPlants, state.fuelTanks);
    const engStats = calculateTotalEngineStats(state.engines, state.engineFuelTanks, hull);
    const ftlStats = state.ftlDrive ? calculateTotalFTLStats(state.ftlDrive, hull) : { totalCost: 0 };
    const ftlFuelStats = calculateTotalFTLFuelTankStats(state.ftlFuelTanks);
    const supportStats = calculateSupportSystemsStats(state.lifeSupport, state.accommodations, state.storeSystems, state.gravitySystems, state.designProgressLevel, []);
    const weaponStats = calculateWeaponStats(state.weapons);
    const ordnanceStats = calculateOrdnanceStats(state.launchSystems, state.ordnanceDesigns);
    const defenseStats = calculateDefenseStats(state.defenses);
    const ccStats = calculateCommandControlStats(state.commandControl, hull.hullPoints);
    const sensorStats = calculateSensorStats(state.sensors);
    const hmStats = calculateHangarMiscStats(state.hangarMisc);

    const designCost = hull.cost + armorCost + ppStats.totalCost + engStats.totalCost
      + ftlStats.totalCost + ftlFuelStats.totalCost + supportStats.totalCost
      + weaponStats.totalCost + ordnanceStats.totalCost
      + defenseStats.totalCost + ccStats.totalCost
      + sensorStats.totalCost + hmStats.totalCost;

    return { hullHp: hull.hullPoints + (hull.bonusHullPoints || 0), designCost, hullName: hull.name };
  } catch {
    return null;
  }
}

export function CraftPickerDialog({
  open,
  onClose,
  onSelect,
  berthing,
  carrierHullHp,
}: CraftPickerDialogProps) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDesign, setLoadingDesign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryPath, setLibraryPath] = useState<string | null>(null);
  const [plFilter, setPlFilter] = useState<ProgressLevel | ''>('');

  const scanDirectory = useCallback(async (dirPath: string) => {
    if (!window.electronAPI) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.scanWarshipFiles(dirPath);
      if (result.success) {
        const libraryEntries = toLibraryEntries(result.files);
        setEntries(libraryEntries);
      } else {
        setError(result.error || 'Failed to scan directory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load saved library path on open
  useEffect(() => {
    if (open) {
      const savedPath = getSavedLibraryPath();
      if (savedPath) {
        setLibraryPath(savedPath);
        scanDirectory(savedPath);
      }
    }
  }, [open, scanDirectory]);

  const handleBrowse = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.selectDirectory();
    if (!result.canceled && result.filePath) {
      setLibraryPath(result.filePath);
      saveLibraryPath(result.filePath);
      scanDirectory(result.filePath);
    }
  }, [scanDirectory]);

  // Filter: only warships (not stations), and for hangars only craft < 100 HP
  const filteredEntries = useMemo(() => {
    let results = filterLibraryEntries(entries, {
      searchText,
      designType: 'warship',
      shipClass: null,
      progressLevel: plFilter || null,
    });

    // For hangars, filter out craft >= 100 HP (only small-craft class can fit, but also corvettes < 100 HP)
    if (berthing === 'hangar') {
      // We can't filter by HP from library metadata since it doesn't have HP.
      // Filter by ship class — only small-craft are guaranteed < 100 HP.
      // Light hulls start at 80 HP, which could fit. We'll allow all and validate on selection.
    }

    // For docking clamps, filter out craft > 10% of carrier hull
    // Can't filter precisely — will validate on selection.

    results = sortLibraryEntries(results, { field: 'name', direction: 'asc' });
    return results;
  }, [entries, searchText, plFilter, berthing]);

  const handleSelectEntry = useCallback(async (entry: LibraryEntry) => {
    setLoadingDesign(true);
    try {
      const details = await loadDesignDetails(entry.filePath);
      if (!details) {
        setError(`Could not load design details from "${entry.name}"`);
        return;
      }

      // Validate rules
      if (berthing === 'hangar' && details.hullHp >= HANGAR_MAX_CRAFT_HP) {
        setError(`${entry.name} (${details.hullHp} HP) is too large for a hangar. Only craft under ${HANGAR_MAX_CRAFT_HP} HP can use hangars.`);
        return;
      }
      if (berthing === 'docking') {
        const maxCraftHp = Math.floor(carrierHullHp * 0.1);
        if (details.hullHp > maxCraftHp) {
          setError(`${entry.name} (${details.hullHp} HP) exceeds the docking clamp limit of ${maxCraftHp} HP (10% of carrier's ${carrierHullHp} HP hull).`);
          return;
        }
      }

      onSelect({
        filePath: entry.filePath,
        name: entry.name,
        hullHp: details.hullHp,
        hullName: details.hullName,
        designCost: details.designCost,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load design');
    } finally {
      setLoadingDesign(false);
    }
  }, [berthing, carrierHullHp, onSelect, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Select Craft — {berthing === 'hangar' ? 'Hangar' : 'Docking Clamp'}
      </DialogTitle>
      <DialogContent dividers>
        {/* Filter bar */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
          <TextField
            size="small"
            placeholder="Search designs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>PL</InputLabel>
            <Select
              value={plFilter}
              onChange={(e) => setPlFilter(e.target.value as ProgressLevel | '')}
              label="PL"
            >
              <MenuItem value=""><em>All</em></MenuItem>
              {([6, 7, 8, 9] as ProgressLevel[]).map(pl => (
                <MenuItem key={pl} value={pl}>PL {pl} — {PL_NAMES[pl]}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            startIcon={<FolderOpenIcon />}
            onClick={handleBrowse}
            variant="outlined"
          >
            Browse
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {filteredEntries.length} design{filteredEntries.length !== 1 ? 's' : ''}
          </Typography>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : loadingDesign ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, gap: 2, alignItems: 'center' }}>
            <CircularProgress size={24} />
            <Typography>Loading design details...</Typography>
          </Box>
        ) : !libraryPath ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary" gutterBottom>
              No library folder selected. Click "Browse" to choose a folder with saved designs.
            </Typography>
          </Box>
        ) : filteredEntries.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No matching warship designs found.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 1.5, maxHeight: 400, overflow: 'auto' }}>
            {filteredEntries.map(entry => (
              <Card key={entry.filePath} variant="outlined" sx={{
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
              }}>
                <CardActionArea onClick={() => handleSelectEntry(entry)}>
                  <CardContent sx={{ py: 1.5, px: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <RocketLaunchIcon fontSize="small" color="action" />
                      <Typography variant="subtitle2" noWrap sx={{ flexGrow: 1 }}>
                        {entry.name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {entry.hullName && (
                        <Chip label={entry.hullName} size="small" variant="outlined" />
                      )}
                      {entry.shipClass && (
                        <Chip label={getShipClassDisplayName(entry.shipClass)} size="small" variant="outlined" color="primary" />
                      )}
                      {entry.designProgressLevel && (
                        <Chip label={`PL ${entry.designProgressLevel}`} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
