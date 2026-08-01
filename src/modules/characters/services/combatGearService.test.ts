import { describe, expect, it } from 'vitest';
import { getAllArmor, getAllWeapons } from './characterDataService';
import { evaluateCombatGear } from './combatGearService';

const weapons = getAllWeapons();
const armor = getAllArmor();

describe('PHB combat gear', () => {
  it('contains all weapon and armor rows from tables P38-P41', () => {
    expect(weapons).toHaveLength(100);
    expect(weapons.filter((weapon) => weapon.category === 'melee')).toHaveLength(27);
    expect(weapons.filter((weapon) => weapon.category === 'ranged')).toHaveLength(44);
    expect(weapons.filter((weapon) => weapon.category === 'heavy')).toHaveLength(29);
    expect(armor).toHaveLength(31);
    expect(new Set(weapons.map((weapon) => weapon.id)).size).toBe(100);
    expect(new Set(armor.map((entry) => entry.id)).size).toBe(31);
  });

  it('preserves representative combat and purchase statistics', () => {
    expect(weapons.find((weapon) => weapon.id === 'star-sword')).toMatchObject({
      progressLevel: 8,
      accuracy: 0,
      damageType: 'En/G',
      damage: 'd6+1w/2d6w/d4+3m',
      clipSize: '10',
      clipCost: 250,
      cost: 7000,
    });
    expect(weapons.find((weapon) => weapon.id === 'rifle-laser')).toMatchObject({
      accuracy: -1,
      range: '100/400/1000',
      damage: 'd6+1w/d6+3w/d4+1m',
    });
    expect(armor.find((entry) => entry.id === 'body-tank')).toMatchObject({
      toughness: 'good',
      actionCheckPenalty: 4,
      lowImpact: '2d4+1',
      mass: 60,
      cost: 25000,
    });
  });

  it('totals weapons, ammunition, armor, mass, and armor penalties', () => {
    const result = evaluateCombatGear([
      { weaponId: 'combat-knife', quantity: 1, spareClips: 0 },
      { weaponId: 'pistol-9mm-charge', quantity: 1, spareClips: 2 },
    ], [
      { armorId: 'battle-jacket', quantity: 1 },
    ], weapons, armor, 4000, 6);
    expect(result.valid).toBe(true);
    expect(result).toMatchObject({
      weaponCost: 435,
      ammunitionCost: 100,
      armorCost: 1500,
      totalCost: 2035,
      totalMass: 10,
      armorActionCheckPenalty: 1,
      remainingFunds: 1965,
    });
  });

  it('reports PL, quantity, ammunition, unavailable cost, and budget errors together', () => {
    const result = evaluateCombatGear([
      { weaponId: 'star-sword', quantity: 0, spareClips: -1 },
      { weaponId: 'tri-staff', quantity: 1, spareClips: 1 },
    ], [
      { armorId: 'body-tank', quantity: 1 },
    ], weapons, armor, 100, 6);
    expect(result.errors).toEqual(expect.arrayContaining([
      'Star sword quantity must be a positive whole number.',
      'Tri-staff requires Progress Level 8.',
      'Tri-staff has no listed purchase cost.',
      'Tri-staff has no separately priced ammunition clip.',
      'Body tank requires Progress Level 7.',
      expect.stringContaining('Combat gear exceeds the available funds'),
    ]));
  });

  it('reduces armor penalties with broad and matching specialty training', () => {
    const untrained = evaluateCombatGear([], [
      { armorId: 'plate-full', quantity: 1 },
    ], weapons, armor, 5000, 6);
    expect(untrained.armorActionCheckPenalty).toBe(3);
    expect(untrained.valid).toBe(true);
    expect(untrained.warnings).toContain('Plate, full is cumbersome without Armor Operation training.');

    const broadTrained = evaluateCombatGear([], [
      { armorId: 'plate-full', quantity: 1 },
    ], weapons, armor, 5000, 6, ['armor-operation']);
    expect(broadTrained.armorActionCheckPenalty).toBe(2);

    const combatTrained = evaluateCombatGear([], [
      { armorId: 'plate-full', quantity: 1 },
    ], weapons, armor, 5000, 6, ['armor-operation'], [{ skillId: 'combat-armor', rank: 1 }]);
    expect(combatTrained.armorActionCheckPenalty).toBe(1);
  });
});