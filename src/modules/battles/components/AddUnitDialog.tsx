import { useState, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Tabs, Tab, Box, Table, TableHead, TableBody, TableRow, TableCell, Chip,
  TextField, Stack, MenuItem, Typography, IconButton, FormControlLabel,
  Checkbox, Alert, Divider, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { TabPanel } from '@shared/components';
import {
  getShipsData, getTroopsData, getArmorUnitsData, getArtilleryData,
  getFortificationsData,
} from '../services/battlesDataLoader';
import {
  createStackFromUnitType, createCustomStack, createSystemDefenseStack,
  systemDefenseCombatStrength,
} from '../services/battleResolutionService';
import {
  createStackFromWarshipProfile, loadWarshipCombatProfile, type WarshipCombatProfile,
} from '../services/warshipImportService';
import {
  getUnitCategoryLabel, getTheatreKindLabel, formatCombatStrength,
  SPACE_CATEGORY_ORDER, GROUND_CATEGORY_ORDER,
} from '../services/battleFormatters';
import type {
  BattleDomain, BattleRules, BattleUnitCategory, BattleUnitType, Theatre, UnitStack,
} from '../types/battle';

interface AddUnitDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (stack: UnitStack) => void;
  theatres: Theatre[];
  defaultTheatreId: string;
  rules: BattleRules;
}

interface CatalogueTableProps {
  units: BattleUnitType[];
  categoryOrder: BattleUnitCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function CatalogueTable({ units, categoryOrder, selectedId, onSelect }: CatalogueTableProps) {
  const grouped = useMemo(() => {
    const m = new Map<BattleUnitCategory, BattleUnitType[]>();
    for (const u of units) {
      const arr = m.get(u.category) ?? [];
      arr.push(u);
      m.set(u.category, arr);
    }
    return m;
  }, [units]);

  const orderedCategories = [
    ...categoryOrder.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <Box sx={{ maxHeight: 380, overflow: 'auto' }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Role</TableCell>
            <TableCell align="right">CS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orderedCategories.map((cat) => {
            const list = grouped.get(cat) ?? [];
            return [
              <TableRow key={`hdr-${cat}`}>
                <TableCell colSpan={3} sx={{ bgcolor: 'action.hover', fontWeight: 600 }}>
                  {getUnitCategoryLabel(cat)}
                </TableCell>
              </TableRow>,
              ...list.map((u) => (
                <TableRow
                  key={u.id}
                  hover
                  selected={selectedId === u.id}
                  onClick={() => onSelect(u.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    {u.name}
                    {u._source && u._source !== 'base' && (
                      <Chip label={u._source} size="small" variant="outlined" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">{u.role}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip label={u.combatStrength.toLocaleString()} size="small" variant="outlined" />
                  </TableCell>
                </TableRow>
              )),
            ];
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

interface QuantityFieldProps {
  value: number;
  onChange: (value: number) => void;
}

function QuantityField({ value, onChange }: QuantityFieldProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2">Quantity:</Typography>
      <IconButton size="small" onClick={() => onChange(Math.max(1, value - 1))} aria-label="Decrease quantity">
        <RemoveIcon />
      </IconButton>
      <TextField
        size="small"
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        sx={{ width: 90 }}
        slotProps={{ htmlInput: { min: 1 } }}
      />
      <IconButton size="small" onClick={() => onChange(value + 1)} aria-label="Increase quantity">
        <AddIcon />
      </IconButton>
    </Stack>
  );
}

export function AddUnitDialog({
  open, onClose, onAdd, theatres, defaultTheatreId, rules,
}: AddUnitDialogProps) {
  const [tab, setTab] = useState(0);
  // Null means "follow the default theatre"; the dialog resets to it after each add.
  const [chosenTheatreId, setChosenTheatreId] = useState<string | null>(null);

  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [spaceQty, setSpaceQty] = useState(1);
  const [isBomber, setIsBomber] = useState(false);

  const [groundId, setGroundId] = useState<string | null>(null);
  const [groundQty, setGroundQty] = useState(1);
  const [isPdb, setIsPdb] = useState(false);

  const [systemName, setSystemName] = useState('');
  const [systemRating, setSystemRating] = useState(3);

  const [customName, setCustomName] = useState('');
  const [customCS, setCustomCS] = useState(100);
  const [customQty, setCustomQty] = useState(1);
  const [customDomain, setCustomDomain] = useState<BattleDomain>('space');
  const [customCanCross, setCustomCanCross] = useState(true);
  const [customCrossPct, setCustomCrossPct] = useState(50);

  const [designProfile, setDesignProfile] = useState<WarshipCombatProfile | null>(null);
  const [designCS, setDesignCS] = useState(0);
  const [designQty, setDesignQty] = useState(1);
  const [designError, setDesignError] = useState<string | null>(null);
  const [designLoading, setDesignLoading] = useState(false);

  const theatreId =
    chosenTheatreId && theatres.some((t) => t.id === chosenTheatreId)
      ? chosenTheatreId
      : defaultTheatreId;

  const handleClose = () => {
    setChosenTheatreId(null);
    onClose();
  };

  const ships = getShipsData();
  const groundUnits = useMemo(
    () => [...getTroopsData(), ...getArmorUnitsData(), ...getArtilleryData(), ...getFortificationsData()],
    [],
  );

  const selectedGround = groundUnits.find((u) => u.id === groundId) ?? null;
  const canDesignatePdb = selectedGround?.canBePlanetaryDefenseBattery === true;

  const systemDefenseCS = systemDefenseCombatStrength(systemRating, rules);

  const theatreSelector = (
    <TextField
      select
      label="Commit to theatre"
      value={theatreId}
      onChange={(e) => setChosenTheatreId(e.target.value)}
      sx={{ minWidth: 240 }}
      size="small"
    >
      {theatres.map((t) => (
        <MenuItem key={t.id} value={t.id}>
          {t.name} — {getTheatreKindLabel(t.kind)}
        </MenuItem>
      ))}
    </TextField>
  );

  const handleAddSpace = () => {
    const unit = ships.find((s) => s.id === spaceId);
    if (!unit) return;
    onAdd(createStackFromUnitType(unit, 'space', spaceQty, theatreId, rules, isBomber ? 'bomber' : 'none'));
    setSpaceId(null);
    setSpaceQty(1);
    setIsBomber(false);
    handleClose();
  };

  const handleAddGround = () => {
    if (!selectedGround) return;
    onAdd(createStackFromUnitType(
      selectedGround, 'ground', groundQty, theatreId, rules,
      canDesignatePdb && isPdb ? 'planetaryDefenseBattery' : 'none',
    ));
    setGroundId(null);
    setGroundQty(1);
    setIsPdb(false);
    handleClose();
  };

  const handleAddSystemDefense = () => {
    onAdd(createSystemDefenseStack(systemName, systemRating, theatreId, rules));
    setSystemName('');
    handleClose();
  };

  const handleAddCustom = () => {
    if (!customName.trim() || customCS <= 0) return;
    onAdd(createCustomStack({
      name: customName.trim(),
      combatStrength: customCS,
      quantity: customQty,
      domain: customDomain,
      crossDomainFactor: customCanCross ? customCrossPct / 100 : null,
      theatreId,
    }));
    setCustomName('');
    setCustomCS(100);
    setCustomQty(1);
    handleClose();
  };

  const handleBrowseDesign = async () => {
    const api = window.electronAPI;
    if (!api) {
      setDesignError('Importing designs is only available in the desktop app.');
      return;
    }
    const dialogResult = await api.showOpenDialog();
    if (dialogResult.canceled || dialogResult.filePaths.length === 0) return;

    setDesignLoading(true);
    setDesignError(null);
    const { profile, error } = await loadWarshipCombatProfile(dialogResult.filePaths[0], rules);
    setDesignLoading(false);
    if (!profile) {
      setDesignProfile(null);
      setDesignError(error ?? 'The design could not be read.');
      return;
    }
    setDesignProfile(profile);
    setDesignCS(profile.combatStrength);
  };

  const handleAddDesign = () => {
    if (!designProfile || designCS <= 0) return;
    onAdd(createStackFromWarshipProfile({
      profile: designProfile,
      combatStrength: designCS,
      quantity: designQty,
      theatreId,
      rules,
    }));
    setDesignProfile(null);
    setDesignCS(0);
    setDesignQty(1);
    setDesignError(null);
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Unit Stack</DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
          <Tab label="Spacecraft" />
          <Tab label="Ground Forces" />
          <Tab label="System Defenses" />
          <Tab label="Warship Designs" />
          <Tab label="Custom" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <CatalogueTable
            units={ships}
            categoryOrder={SPACE_CATEGORY_ORDER}
            selectedId={spaceId}
            onSelect={setSpaceId}
          />
          <Divider sx={{ my: 2 }} />
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              {theatreSelector}
              <QuantityField value={spaceQty} onChange={setSpaceQty} />
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="contained" startIcon={<AddIcon />} disabled={!spaceId} onClick={handleAddSpace}>
                Add Stack
              </Button>
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={isBomber} onChange={(e) => setIsBomber(e.target.checked)} />}
              label="Built as a planet bomber (full strength against ground targets, half against ships)"
            />
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <CatalogueTable
            units={groundUnits}
            categoryOrder={GROUND_CATEGORY_ORDER}
            selectedId={groundId}
            onSelect={setGroundId}
          />
          <Divider sx={{ my: 2 }} />
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              {theatreSelector}
              <QuantityField value={groundQty} onChange={setGroundQty} />
              <Box sx={{ flexGrow: 1 }} />
              <Button variant="contained" startIcon={<AddIcon />} disabled={!groundId} onClick={handleAddGround}>
                Add Stack
              </Button>
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={canDesignatePdb && isPdb}
                  disabled={!canDesignatePdb}
                  onChange={(e) => setIsPdb(e.target.checked)}
                />
              }
              label="Built as a planetary defense battery (full strength against spacecraft, half against ground forces)"
            />
            {selectedGround && selectedGround.spaceFactor === undefined && (
              <Alert severity="info">
                {selectedGround.name} cannot fire on orbiting craft, so it contributes nothing to a
                space battle.
              </Alert>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              A system's standing defenses convert to combat strength by squaring its STAR*DRIVE
              defense rating and multiplying by {rules.systemDefenses.combatStrengthPerRatingSquared.toLocaleString()}.
            </Alert>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="System name"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Defense rating"
                value={systemRating}
                onChange={(e) => setSystemRating(parseInt(e.target.value))}
                sx={{ minWidth: 180 }}
              >
                {Array.from({ length: rules.systemDefenses.maxRating + 1 }, (_, i) => (
                  <MenuItem key={i} value={i}>Type {i}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              {theatreSelector}
              <Chip
                label={`Combat strength: ${systemDefenseCS.toLocaleString()}`}
                color="primary"
                variant="outlined"
              />
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={systemDefenseCS <= 0}
                onClick={handleAddSystemDefense}
              >
                Add Defenses
              </Button>
            </Stack>
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              The Externals gives no way to convert a constructed ship into a combat strength, so
              this is a house rule: total hull points, scaled by the share of the hull given over to
              weapons and defenses and by how heavily it is armored. Adjust the result freely.
            </Alert>

            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<RocketLaunchIcon />}
                onClick={handleBrowseDesign}
                disabled={designLoading}
              >
                {designLoading ? 'Reading design...' : 'Choose Design File'}
              </Button>
              <Typography variant="body2" color="text.secondary">
                Pick any <code>.warship.json</code> saved from the Warships Generator.
              </Typography>
            </Stack>

            {designError && <Alert severity="error">{designError}</Alert>}

            {designProfile && (
              <>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {designProfile.name}
                    {designProfile.hullName && (
                      <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                        ({designProfile.hullName})
                      </Typography>
                    )}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip label={`${designProfile.totalHullPoints.toLocaleString()} total HP`} size="small" variant="outlined" />
                    <Chip label={`${designProfile.weaponHullPoints.toLocaleString()} HP weapons`} size="small" variant="outlined" />
                    <Chip label={`${designProfile.defenseHullPoints.toLocaleString()} HP defenses`} size="small" variant="outlined" />
                    <Chip label={`${designProfile.armorHullPoints.toLocaleString()} HP armor`} size="small" variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    {Math.round(designProfile.combatShare * 100)}% of the hull is weapons and defenses
                    → firepower ×{designProfile.firepowerFactor.toFixed(2)}, armor ×{designProfile.armorFactor.toFixed(2)}
                    → suggested combat strength {formatCombatStrength(designProfile.combatStrength)}.
                  </Typography>
                  {designProfile.warnings.map((w) => (
                    <Alert key={w} severity="warning" sx={{ mt: 1.5 }}>{w}</Alert>
                  ))}
                </Paper>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                  <TextField
                    label="Combat strength per unit"
                    type="number"
                    value={designCS}
                    onChange={(e) => setDesignCS(Math.max(1, parseInt(e.target.value) || 0))}
                    slotProps={{ htmlInput: { min: 1 } }}
                    sx={{ width: 240 }}
                  />
                  <QuantityField value={designQty} onChange={setDesignQty} />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                  {theatreSelector}
                  <Box sx={{ flexGrow: 1 }} />
                  <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddDesign}>
                    Add Design
                  </Button>
                </Stack>
              </>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Unit name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              fullWidth
              autoFocus
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Combat strength per unit"
                type="number"
                value={customCS}
                onChange={(e) => setCustomCS(Math.max(1, parseInt(e.target.value) || 0))}
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
              <TextField
                label="Quantity"
                type="number"
                value={customQty}
                onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 0))}
                slotProps={{ htmlInput: { min: 1 } }}
                fullWidth
              />
              <TextField
                select
                label="Fights in"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value as BattleDomain)}
                fullWidth
              >
                <MenuItem value="space">Space</MenuItem>
                <MenuItem value="ground">Ground</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox checked={customCanCross} onChange={(e) => setCustomCanCross(e.target.checked)} />
                }
                label={customDomain === 'space' ? 'Can bombard ground targets' : 'Can fire on orbiting craft'}
              />
              <TextField
                label="Effectiveness there (%)"
                type="number"
                value={customCrossPct}
                disabled={!customCanCross}
                onChange={(e) => setCustomCrossPct(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                slotProps={{ htmlInput: { min: 0, max: 100 } }}
                sx={{ width: 220 }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
              {theatreSelector}
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCustom}
                disabled={!customName.trim()}
              >
                Add Custom Stack
              </Button>
            </Stack>
          </Stack>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
