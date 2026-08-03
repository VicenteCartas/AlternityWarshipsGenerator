import { useState } from 'react';
import {
  Alert, Checkbox, Chip, Stack, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs,
  TablePagination, TextField, Typography,
} from '@mui/material';
import { scrollableTableContainerSx } from '@shared/constants/tableStyles';
import {
  getAllArmor,
  getAllCharacterSourcePacks,
  getAllWeapons,
} from '../services/characterDataService';
import {
  getCharacterDefinitionSource,
  getCharacterDefinitionSources,
} from '../services/characterDefinitionSourceService';
import type {
  ArmorSelection,
  WeaponCategory,
  WeaponSelection,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';
import { CharacterSourceFilter } from './CharacterSourceFilter';
import { EquipmentProgressLevelFilter } from './EquipmentProgressLevelFilter';

interface CombatGearStepProps {
  weaponSelections: WeaponSelection[];
  armorSelections: ArmorSelection[];
  progressLevel: number;
  progressLevelFilter: number[];
  availableProgressLevels: number[];
  validation: CharacterValidationResult;
  onWeaponSelectionsChange: (selections: WeaponSelection[]) => void;
  onArmorSelectionsChange: (selections: ArmorSelection[]) => void;
  onProgressLevelFilterChange: (levels: number[]) => void;
}

type CombatGearTab = WeaponCategory | 'armor';
const ROWS_PER_PAGE = 20;

export function CombatGearStep({
  weaponSelections,
  armorSelections,
  progressLevel,
  progressLevelFilter,
  availableProgressLevels,
  validation,
  onWeaponSelectionsChange,
  onArmorSelectionsChange,
  onProgressLevelFilterChange,
}: CombatGearStepProps) {
  const [tab, setTab] = useState<CombatGearTab>('melee');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const weapons = getAllWeapons();
  const armor = getAllArmor();
  const sourcePacks = getAllCharacterSourcePacks();
  const sourceOptions = getCharacterDefinitionSources([...weapons, ...armor], sourcePacks);
  const weaponSelectionById = new Map(weaponSelections.map((selection) => [selection.weaponId, selection]));
  const armorSelectionById = new Map(armorSelections.map((selection) => [selection.armorId, selection]));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleWeapons = weapons.filter((weapon) => (
    weapon.category === tab
    && (progressLevelFilter.length === 0 || progressLevelFilter.includes(weapon.progressLevel))
    && (sourceFilter === 'all' || getCharacterDefinitionSource(weapon, sourcePacks).key === sourceFilter)
    && (!normalizedSearch || weapon.name.toLocaleLowerCase().includes(normalizedSearch))
  ));
  const visibleArmor = armor.filter((definition) => (
    (progressLevelFilter.length === 0 || progressLevelFilter.includes(definition.progressLevel))
    && (sourceFilter === 'all' || getCharacterDefinitionSource(definition, sourcePacks).key === sourceFilter)
    && (!normalizedSearch || definition.name.toLocaleLowerCase().includes(normalizedSearch))
  ));
  const visibleCount = tab === 'armor' ? visibleArmor.length : visibleWeapons.length;
  const effectivePage = Math.min(page, Math.max(0, Math.ceil(visibleCount / ROWS_PER_PAGE) - 1));
  const pageWeapons = visibleWeapons.slice(effectivePage * ROWS_PER_PAGE, (effectivePage + 1) * ROWS_PER_PAGE);
  const pageArmor = visibleArmor.slice(effectivePage * ROWS_PER_PAGE, (effectivePage + 1) * ROWS_PER_PAGE);
  const fundsReady = validation.startingFunds.valid;

  const updateWeapon = (selection: WeaponSelection) => {
    onWeaponSelectionsChange([
      ...weaponSelections.filter((entry) => entry.weaponId !== selection.weaponId),
      selection,
    ]);
  };

  const updateArmor = (selection: ArmorSelection) => {
    onArmorSelectionsChange([
      ...armorSelections.filter((entry) => entry.armorId !== selection.armorId),
      selection,
    ]);
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent="space-between" gap={2}>
        <Typography variant="h5">Weapons & Armor</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${validation.combatGear.totalCost} credits`} variant="outlined" />
          <Chip label={`${validation.combatGear.totalMass} kg`} variant="outlined" />
          <Chip label={`${validation.combatGear.armorActionCheckPenalty >= 0 ? '+' : ''}${validation.combatGear.armorActionCheckPenalty} armor penalty`} variant="outlined" />
          <Chip
            label={fundsReady ? `${validation.remainingFunds} credits remaining` : 'Starting credits not rolled'}
            color={fundsReady ? (validation.remainingFunds >= 0 ? 'success' : 'error') : 'default'}
            variant="outlined"
          />
        </Stack>
      </Stack>
      {!fundsReady && (
        <Alert severity="info">
          Return to General Equipment and roll starting credits before buying weapons or armor.
        </Alert>
      )}
      {validation.combatGear.errors.length > 0 && <Alert severity="error">{validation.combatGear.errors.join(' ')}</Alert>}
      {validation.combatGear.warnings.length > 0 && <Alert severity="warning">{validation.combatGear.warnings.join(' ')}</Alert>}
      <Tabs
        value={tab}
        onChange={(_event, value: CombatGearTab) => { setTab(value); setPage(0); }}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Combat gear categories"
      >
        <Tab value="melee" label="Melee" />
        <Tab value="ranged" label="Ranged" />
        <Tab value="heavy" label="Heavy" />
        <Tab value="armor" label="Armor" />
      </Tabs>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        gap={2}
        role="group"
        aria-label="Combat gear catalogue filters"
      >
        <TextField
          size="small"
          label="Search combat gear"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          fullWidth
        />
        <EquipmentProgressLevelFilter
          id="combat-gear-progress-level"
          availableLevels={availableProgressLevels}
          selectedLevels={progressLevelFilter}
          onChange={onProgressLevelFilterChange}
        />
        <CharacterSourceFilter
          id="combat-gear-source"
          value={sourceFilter}
          options={sourceOptions}
          onChange={(value) => { setSourceFilter(value); setPage(0); }}
        />
      </Stack>
      {tab !== 'armor' ? (
        <TableContainer sx={scrollableTableContainerSx}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 64 }}>Buy</TableCell>
                <TableCell>Weapon</TableCell>
                <TableCell sx={{ width: 64 }}>PL</TableCell>
                <TableCell sx={{ width: 100 }}>Skill</TableCell>
                <TableCell sx={{ width: 70 }}>Acc</TableCell>
                <TableCell sx={{ width: 90 }}>Mode</TableCell>
                <TableCell sx={{ width: 130 }}>Range</TableCell>
                <TableCell sx={{ width: 190 }}>Damage</TableCell>
                <TableCell sx={{ width: 90 }}>Qty</TableCell>
                <TableCell sx={{ width: 100 }}>Clips</TableCell>
                <TableCell sx={{ width: 110 }}>Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageWeapons.map((weapon) => {
                const selection = weaponSelectionById.get(weapon.id);
                const unavailable = weapon.progressLevel > progressLevel;
                const lineCost = (weapon.cost || 0) * (selection?.quantity || 1)
                  + (weapon.clipCost || 0) * (selection?.spareClips || 0);
                return (
                  <TableRow key={weapon.id} selected={!!selection}>
                    <TableCell>
                      <Checkbox
                        checked={!!selection}
                        disabled={!fundsReady && !selection}
                        onChange={(event) => event.target.checked
                          ? updateWeapon({ weaponId: weapon.id, quantity: 1, spareClips: 0 })
                          : onWeaponSelectionsChange(weaponSelections.filter((entry) => entry.weaponId !== weapon.id))}
                        inputProps={{ 'aria-label': `Buy ${weapon.name}` }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{weapon.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{weapon.actions ?? '-'} actions | {weapon.mass ?? 0} kg | {weapon.availability || 'not sold'}</Typography>
                    </TableCell>
                    <TableCell><Chip label={weapon.progressLevel} size="small" color={unavailable ? 'error' : 'default'} variant="outlined" /></TableCell>
                    <TableCell>{weapon.skillId}</TableCell>
                    <TableCell>{weapon.accuracy >= 0 ? `+${weapon.accuracy}` : weapon.accuracy}</TableCell>
                    <TableCell>{weapon.mode || '-'}</TableCell>
                    <TableCell>{weapon.range}</TableCell>
                    <TableCell>{weapon.damageType} {weapon.damage}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={selection?.quantity || 1}
                        disabled={!selection}
                        onChange={(event) => updateWeapon({ ...selection!, quantity: Number(event.target.value) })}
                        inputProps={{ min: 1, 'aria-label': `${weapon.name} quantity` }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={selection?.spareClips || 0}
                        disabled={!selection || weapon.clipCost === null}
                        onChange={(event) => updateWeapon({ ...selection!, spareClips: Number(event.target.value) })}
                        inputProps={{ min: 0, 'aria-label': `${weapon.name} spare clips` }}
                      />
                    </TableCell>
                    <TableCell>{weapon.cost === null ? '-' : selection ? lineCost : weapon.cost}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer sx={scrollableTableContainerSx}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 64 }}>Buy</TableCell>
                <TableCell>Armor</TableCell>
                <TableCell sx={{ width: 64 }}>PL</TableCell>
                <TableCell sx={{ width: 120 }}>Skill</TableCell>
                <TableCell sx={{ width: 70 }}>AP</TableCell>
                <TableCell sx={{ width: 90 }}>Type</TableCell>
                <TableCell sx={{ width: 190 }}>LI / HI / En</TableCell>
                <TableCell sx={{ width: 90 }}>Qty</TableCell>
                <TableCell sx={{ width: 100 }}>Mass</TableCell>
                <TableCell sx={{ width: 110 }}>Cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageArmor.map((definition) => {
                const selection = armorSelectionById.get(definition.id);
                const unavailable = definition.progressLevel > progressLevel;
                const quantity = selection?.quantity || 1;
                return (
                  <TableRow key={definition.id} selected={!!selection}>
                    <TableCell>
                      <Checkbox
                        checked={!!selection}
                        disabled={!fundsReady && !selection}
                        onChange={(event) => event.target.checked
                          ? updateArmor({ armorId: definition.id, quantity: 1 })
                          : onArmorSelectionsChange(armorSelections.filter((entry) => entry.armorId !== definition.id))}
                        inputProps={{ 'aria-label': `Buy ${definition.name}` }}
                      />
                    </TableCell>
                    <TableCell><Typography fontWeight={600}>{definition.name}</Typography></TableCell>
                    <TableCell><Chip label={definition.progressLevel} size="small" color={unavailable ? 'error' : 'default'} variant="outlined" /></TableCell>
                    <TableCell>{definition.skillId || '-'}</TableCell>
                    <TableCell>+{definition.actionCheckPenalty}</TableCell>
                    <TableCell>{definition.toughness}</TableCell>
                    <TableCell>{definition.lowImpact} / {definition.highImpact} / {definition.energy}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={quantity}
                        disabled={!selection}
                        onChange={(event) => updateArmor({ ...selection!, quantity: Number(event.target.value) })}
                        inputProps={{ min: 1, 'aria-label': `${definition.name} quantity` }}
                      />
                    </TableCell>
                    <TableCell>{definition.mass * quantity}</TableCell>
                    <TableCell>{definition.cost * quantity}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <TablePagination
        component="div"
        count={visibleCount}
        page={effectivePage}
        onPageChange={(_event, nextPage) => setPage(nextPage)}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
      />
    </Stack>
  );
}