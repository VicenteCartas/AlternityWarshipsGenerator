import { useState } from 'react';
import { Stack, Tab, Tabs } from '@mui/material';
import { getAllArmor, getAllEquipment, getAllWeapons } from '../services/characterDataService';
import type {
  ArmorSelection,
  EquipmentSelection,
  FundsDegree,
  WeaponSelection,
} from '../types/character';
import type { CharacterValidationResult } from '../types/characterState';
import { CombatGearStep } from './CombatGearStep';
import { EquipmentStep } from './EquipmentStep';

interface LoadoutStepProps {
  equipmentSelections: EquipmentSelection[];
  weaponSelections: WeaponSelection[];
  armorSelections: ArmorSelection[];
  dieRolls: number[];
  wealthDegree?: FundsDegree;
  progressLevel: number;
  validation: CharacterValidationResult;
  onEquipmentSelectionsChange: (selections: EquipmentSelection[]) => void;
  onWeaponSelectionsChange: (selections: WeaponSelection[]) => void;
  onArmorSelectionsChange: (selections: ArmorSelection[]) => void;
  onDieRollsChange: (dieRolls: number[]) => void;
  onWealthDegreeChange: (wealthDegree?: FundsDegree) => void;
}

export function LoadoutStep(props: LoadoutStepProps) {
  const [tab, setTab] = useState<'general' | 'combat'>('general');
  const [selectedProgressLevels, setSelectedProgressLevels] = useState<number[] | null>(null);
  const progressLevelFilter = selectedProgressLevels ?? [props.progressLevel];
  const availableProgressLevels = Array.from(new Set([
    ...getAllEquipment().map((entry) => entry.progressLevel),
    ...getAllWeapons().map((entry) => entry.progressLevel),
    ...getAllArmor().map((entry) => entry.progressLevel),
    props.progressLevel,
  ])).sort((left, right) => left - right);

  return (
    <Stack spacing={2}>
      <Tabs
        value={tab}
        onChange={(_event, value: 'general' | 'combat') => setTab(value)}
        aria-label="Equipment type"
      >
        <Tab value="general" label="General Equipment" />
        <Tab value="combat" label="Weapons & Armor" />
      </Tabs>
      {tab === 'general' ? (
        <EquipmentStep
          selections={props.equipmentSelections}
          dieRolls={props.dieRolls}
          wealthDegree={props.wealthDegree}
          progressLevel={props.progressLevel}
          progressLevelFilter={progressLevelFilter}
          availableProgressLevels={availableProgressLevels}
          validation={props.validation}
          onSelectionsChange={props.onEquipmentSelectionsChange}
          onDieRollsChange={props.onDieRollsChange}
          onWealthDegreeChange={props.onWealthDegreeChange}
          onProgressLevelFilterChange={setSelectedProgressLevels}
        />
      ) : (
        <CombatGearStep
          weaponSelections={props.weaponSelections}
          armorSelections={props.armorSelections}
          progressLevel={props.progressLevel}
          progressLevelFilter={progressLevelFilter}
          availableProgressLevels={availableProgressLevels}
          validation={props.validation}
          onWeaponSelectionsChange={props.onWeaponSelectionsChange}
          onArmorSelectionsChange={props.onArmorSelectionsChange}
          onProgressLevelFilterChange={setSelectedProgressLevels}
        />
      )}
    </Stack>
  );
}