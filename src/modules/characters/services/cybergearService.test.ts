import { describe, expect, it } from 'vitest';
import {
  getAllCybergear,
  getCybergearTrainingSkillPointCost,
  getSpeciesById,
} from './characterDataService';
import { calculateCyberTolerance, evaluateCybergear } from './cybergearService';

const cybergear = getAllCybergear();
const trainingCost = getCybergearTrainingSkillPointCost();

describe('PHB cybergear', () => {
  it('contains all 23 gear entries from table P53', () => {
    expect(cybergear).toHaveLength(23);
    expect(new Set(cybergear.map((gear) => gear.id)).size).toBe(23);
    expect(cybergear.filter((gear) => gear.progressLevel === 6)).toHaveLength(14);
    expect(cybergear.filter((gear) => gear.progressLevel === 7)).toHaveLength(9);
  });

  it('calculates normal and Mechalus tolerance and natural nanocomputer access', () => {
    expect(calculateCyberTolerance(11, getSpeciesById('human')!)).toBe(11);
    expect(calculateCyberTolerance(11, getSpeciesById('mechalus')!)).toBe(15);

    const result = evaluateCybergear([
      { gearId: 'cyberoptics', quality: 'good', quantity: 1 },
    ], 11, getSpeciesById('mechalus')!, cybergear, trainingCost, true);
    expect(result.valid).toBe(true);
    expect(result.trainingSkillPointCost).toBe(10);
  });

  it('totals quality-specific cost, tolerance, mass, durability, and ability effects', () => {
    const result = evaluateCybergear([
      { gearId: 'nanocomputer', quality: 'good', quantity: 1 },
      { gearId: 'body-plating', quality: 'amazing', quantity: 1 },
      { gearId: 'cf-skinweave', quality: 'good', quantity: 1 },
    ], 14, getSpeciesById('human')!, cybergear, trainingCost, true);

    expect(result.valid).toBe(true);
    expect(result.usedTolerance).toBe(6);
    expect(result.remainingTolerance).toBe(8);
    expect(result.equipmentCost).toBe(9500);
    expect(result.totalMass).toBe(60);
    expect(result.trainingSkillPointCost).toBe(10);
    expect(result.durabilityBonuses).toEqual({ stun: 2, wound: 1, mortal: 0, fatigue: 0 });
    expect(result.abilityAdjustments).toEqual({ dex: -2 });
  });

  it('waives training only when every selected item is free and reports dependencies and limits', () => {
    const freeResult = evaluateCybergear([
      { gearId: 'bioart', quality: 'ordinary', quantity: 1 },
      { gearId: 'data-slot-passive', quality: 'good', quantity: 1 },
    ], 8, getSpeciesById('human')!, cybergear, trainingCost, true);
    expect(freeResult.trainingSkillPointCost).toBe(0);

    const invalid = evaluateCybergear([
      { gearId: 'muscleplus', quality: 'amazing', quantity: 1 },
      { gearId: 'body-plating', quality: 'amazing', quantity: 2 },
    ], 8, getSpeciesById('human')!, cybergear, trainingCost, false);
    expect(invalid.errors).toEqual(expect.arrayContaining([
      'Cybertech must be enabled to install cybergear.',
      'MusclePlus requires a nanocomputer.',
      'The selected cybergear requires an Exoskeleton.',
      'The selected cybergear requires a Cyberlimb.',
      'Cybergear uses 10 tolerance, exceeding the limit of 8.',
    ]));
  });

  it('flags installations above half tolerance for a non-Mechalus acceptance check', () => {
    const result = evaluateCybergear([
      { gearId: 'body-plating', quality: 'good', quantity: 1 },
      { gearId: 'cf-skinweave', quality: 'ordinary', quantity: 1 },
      { gearId: 'bioart', quality: 'ordinary', quantity: 1 },
    ], 7, getSpeciesById('human')!, cybergear, trainingCost, true);
    expect(result.valid).toBe(true);
    expect(result.usedTolerance).toBe(4);
    expect(result.requiresAcceptanceCheck).toBe(true);
  });

  it('rejects cybergear above the campaign Progress Level', () => {
    const result = evaluateCybergear([
      { gearId: 'cf-skinweave', quality: 'ordinary', quantity: 1 },
    ], 10, getSpeciesById('human')!, cybergear, trainingCost, true, 6);
    expect(result.errors).toContain('CF Skinweave requires Progress Level 7.');
  });
});