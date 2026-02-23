import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Collapse,
  Divider,
  CircularProgress,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type { DesignType, StationType } from '../types/common';
import type { Mod } from '../types/mod';
import { getInstalledMods } from '../services/modService';

const LAST_SELECTED_MODS_KEY = 'alternity-warships-last-selected-mods';

interface DesignTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (
    designType: DesignType,
    stationType: StationType | null,
    surfaceProvidesLifeSupport: boolean,
    surfaceProvidesGravity: boolean,
    selectedMods: Mod[],
  ) => void;
}

const STATION_TYPE_DESCRIPTIONS: Record<StationType, string> = {
  'ground-base': 'A surface installation with buildings and structures. The local environment may provide life support and gravity, reducing construction costs.',
  'outpost': 'A sealed structure on a hostile surface (airless moon, extreme environment). Must provide its own life support and gravity, like a ship built on the ground.',
  'space-station': 'An orbital or deep-space installation. More expensive and vulnerable than ground installations, but mobile and tactically flexible.',
};

export function DesignTypeDialog({ open, onClose, onConfirm }: DesignTypeDialogProps) {
  const [designType, setDesignType] = useState<DesignType>('warship');
  const [stationType, setStationType] = useState<StationType>('space-station');
  const [surfaceProvidesLifeSupport, setSurfaceProvidesLifeSupport] = useState(true);
  const [surfaceProvidesGravity, setSurfaceProvidesGravity] = useState(true);

  // Mod selection state
  const [installedMods, setInstalledMods] = useState<Mod[]>([]);
  const [selectedModFolders, setSelectedModFolders] = useState<Set<string>>(new Set());
  const [modsLoading, setModsLoading] = useState(false);

  // Load installed mods when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setModsLoading(true);
    getInstalledMods().then(mods => {
      if (cancelled) return;
      // Sort by priority
      mods.sort((a, b) => a.priority - b.priority);
      setInstalledMods(mods);
      // Restore last selection from localStorage, filtered to currently installed
      try {
        const stored = localStorage.getItem(LAST_SELECTED_MODS_KEY);
        if (stored) {
          const lastFolders: string[] = JSON.parse(stored);
          const installedFolderSet = new Set(mods.map(m => m.folderName));
          const validFolders = lastFolders.filter(f => installedFolderSet.has(f));
          setSelectedModFolders(new Set(validFolders));
        } else {
          setSelectedModFolders(new Set());
        }
      } catch {
        setSelectedModFolders(new Set());
      }
      setModsLoading(false);
    });
    return () => { cancelled = true; };
  }, [open]);

  const handleToggleMod = useCallback((folderName: string) => {
    setSelectedModFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderName)) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      return next;
    });
  }, []);

  const handleConfirm = () => {
    // Persist last mod selection
    localStorage.setItem(LAST_SELECTED_MODS_KEY, JSON.stringify([...selectedModFolders]));
    // Build the selected Mod[] sorted by priority
    const selectedMods = installedMods
      .filter(m => selectedModFolders.has(m.folderName))
      .sort((a, b) => a.priority - b.priority);
    onConfirm(
      designType,
      designType === 'station' ? stationType : null,
      designType === 'station' && stationType === 'ground-base' ? surfaceProvidesLifeSupport : false,
      designType === 'station' && stationType === 'ground-base' ? surfaceProvidesGravity : false,
      selectedMods,
    );
  };

  const handleDesignTypeChange = (_: React.MouseEvent<HTMLElement>, value: DesignType | null) => {
    if (value !== null) {
      setDesignType(value);
    }
  };

  const handleStationTypeChange = (_: React.MouseEvent<HTMLElement>, value: StationType | null) => {
    if (value !== null) {
      setStationType(value);
      // Reset surface flags when switching away from ground base
      if (value !== 'ground-base') {
        setSurfaceProvidesLifeSupport(false);
        setSurfaceProvidesGravity(false);
      } else {
        setSurfaceProvidesLifeSupport(true);
        setSurfaceProvidesGravity(true);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Design</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose what type of installation to design.
        </Typography>

        {/* Design Type selection */}
        <ToggleButtonGroup
          value={designType}
          exclusive
          onChange={handleDesignTypeChange}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton value="warship">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RocketLaunchIcon fontSize="small" />
              Warship
            </Box>
          </ToggleButton>
          <ToggleButton value="station">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AccountBalanceIcon fontSize="small" />
              Station / Base
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>

        {designType === 'warship' && (
          <Typography variant="body2" color="text.secondary">
            A mobile vessel — fighter, warship, freighter, or any craft with engines.
            Engines and power plants are required.
          </Typography>
        )}

        {/* Station type sub-selection */}
        <Collapse in={designType === 'station'}>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
            Station Type
          </Typography>
          <ToggleButtonGroup
            value={stationType}
            exclusive
            onChange={handleStationTypeChange}
            fullWidth
            size="small"
            sx={{ mb: 1 }}
          >
            <ToggleButton value="ground-base">Ground Base</ToggleButton>
            <ToggleButton value="outpost">Outpost</ToggleButton>
            <ToggleButton value="space-station">Space Station</ToggleButton>
          </ToggleButtonGroup>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {STATION_TYPE_DESCRIPTIONS[stationType]}
          </Typography>

          {/* Ground base surface flags */}
          <Collapse in={stationType === 'ground-base'}>
            <Box sx={{ mt: 1, pl: 1, borderLeft: 2, borderColor: 'primary.main' }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Surface Environment
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={surfaceProvidesLifeSupport}
                    onChange={(e) => setSurfaceProvidesLifeSupport(e.target.checked)}
                  />
                }
                label="Surface provides breathable atmosphere (life support optional)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={surfaceProvidesGravity}
                    onChange={(e) => setSurfaceProvidesGravity(e.target.checked)}
                  />
                }
                label="Surface provides suitable gravity (gravity systems optional)"
              />
            </Box>
          </Collapse>
        </Collapse>

        {/* Mod Selection */}
        {installedMods.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Mods
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Select which mods to use for this design. Mods cannot be changed after creation.
            </Typography>
            {modsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={20} />
              </Box>
            ) : (
              <Box sx={{ pl: 1 }}>
                {installedMods.map(mod => (
                  <FormControlLabel
                    key={mod.folderName}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedModFolders.has(mod.folderName)}
                        onChange={() => handleToggleMod(mod.folderName)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" component="span">
                          {mod.manifest.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1 }}>
                          v{mod.manifest.version}
                        </Typography>
                        {mod.manifest.description && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 0 }}>
                            {mod.manifest.description}
                          </Typography>
                        )}
                      </Box>
                    }
                    sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
