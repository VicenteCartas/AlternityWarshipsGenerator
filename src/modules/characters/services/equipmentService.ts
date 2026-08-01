import type {
  EquipmentDefinition,
  EquipmentPurchaseResult,
  EquipmentSelection,
  FundsDegree,
  ItemQuality,
  ProfessionDefinition,
  StartingFundsResult,
} from '../types/character';

const PROFESSION_FUNDS_DIE: Record<string, number> = {
  'combat-spec': 6,
  diplomat: 12,
  'free-agent': 8,
  'tech-op': 8,
  mindwalker: 4,
};

const FILTHY_RICH_MULTIPLIER: Record<FundsDegree, number> = {
  marginal: 10,
  ordinary: 20,
  good: 50,
  amazing: 100,
};

const DIRT_POOR_MULTIPLIER: Record<FundsDegree, number> = {
  marginal: 0.1,
  ordinary: 0.25,
  good: 0.5,
  amazing: 0.75,
};

export function calculateStartingFunds(
  profession: ProfessionDefinition,
  dieRolls: number[],
  wealthOptionId: 'filthy-rich' | 'dirt-poor' | null,
  wealthDegree?: FundsDegree,
): StartingFundsResult {
  const errors: string[] = [];
  const dieCount = 5;
  const dieSize = PROFESSION_FUNDS_DIE[profession.id];
  if (!dieSize) errors.push(`${profession.name} has no starting-funds die.`);
  if (dieRolls.length !== dieCount) errors.push(`Starting funds require exactly ${dieCount} die results.`);
  for (const roll of dieRolls) {
    if (!Number.isInteger(roll) || roll < 1 || roll > dieSize) {
      errors.push(`Each starting-funds die must be a whole number from 1 to ${dieSize}.`);
      break;
    }
  }
  if (wealthOptionId && !wealthDegree) {
    errors.push(`${wealthOptionId === 'filthy-rich' ? 'Filthy Rich' : 'Dirt Poor'} requires a perk or flaw check result.`);
  }

  const baseFunds = dieRolls.reduce((sum, roll) => sum + roll, 0) * 100;
  const wealthMultiplier = wealthOptionId === 'filthy-rich' && wealthDegree
    ? FILTHY_RICH_MULTIPLIER[wealthDegree]
    : wealthOptionId === 'dirt-poor' && wealthDegree
      ? DIRT_POOR_MULTIPLIER[wealthDegree]
      : 1;

  return {
    valid: errors.length === 0,
    errors,
    dieCount,
    dieSize,
    baseFunds,
    wealthMultiplier,
    totalFunds: Math.floor(baseFunds * wealthMultiplier),
  };
}

function resolveUnitCost(
  definition: EquipmentDefinition,
  selection: EquipmentSelection,
  errors: string[],
): number {
  if (definition.qualityCosts) {
    if (!selection.quality) {
      errors.push(`${definition.name} requires a quality.`);
      return 0;
    }
    const cost = definition.qualityCosts[selection.quality];
    if (cost === undefined) {
      errors.push(`${definition.name} is not available at ${selection.quality} quality.`);
      return 0;
    }
    return cost;
  }

  if (definition.costMode === 'fixed' && definition.cost !== null) return definition.cost;
  if (selection.unitCostOverride === undefined || selection.unitCostOverride < 0) {
    errors.push(`${definition.name} requires a nonnegative unit cost.`);
    return 0;
  }
  return selection.unitCostOverride;
}

export function getEquipmentActiveMemory(
  definition: EquipmentDefinition,
  quality: ItemQuality | undefined,
): number | null | undefined {
  return quality ? definition.activeMemory?.[quality] : undefined;
}

export function evaluateEquipmentPurchases(
  selections: EquipmentSelection[],
  definitions: EquipmentDefinition[],
  startingFunds: number,
  maximumProgressLevel: number,
  enforceBudget = true,
): EquipmentPurchaseResult {
  const errors: string[] = [];
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));
  let totalCost = 0;
  let totalMass = 0;
  let grantedValue = 0;

  for (const selection of selections) {
    const definition = definitionById.get(selection.equipmentId);
    if (!definition) {
      errors.push(`Unknown equipment ${selection.equipmentId}.`);
      continue;
    }
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
      errors.push(`${definition.name} quantity must be a positive whole number.`);
      continue;
    }
    if (definition.progressLevel > maximumProgressLevel) {
      errors.push(`${definition.name} requires Progress Level ${definition.progressLevel}.`);
    }

    const unitCost = resolveUnitCost(definition, selection, errors);
    const lineCost = unitCost * selection.quantity;
    if (selection.granted) grantedValue += lineCost;
    else totalCost += lineCost;
    totalMass += (definition.mass || 0) * selection.quantity;
  }

  const remainingFunds = startingFunds - totalCost;
  if (enforceBudget && remainingFunds < 0) {
    errors.push(`Equipment purchases exceed starting funds by ${Math.abs(remainingFunds)}.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    totalCost,
    totalMass,
    remainingFunds,
    grantedValue,
  };
}