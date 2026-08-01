import { describe, expect, it } from 'vitest';
import { createEmptyCharacter } from './characterDefaults';
import { getCharacterSteps } from './steps';

function required(stepId: string, state = createEmptyCharacter()): boolean {
  return getCharacterSteps(state).find((step) => step.id === stepId)?.required ?? false;
}

describe('Character Creator steps', () => {
  it('marks core creation steps as required and elective systems as optional', () => {
    const state = createEmptyCharacter();
    expect(required('identity', state)).toBe(true);
    expect(required('skills', state)).toBe(true);
    expect(required('equipment', state)).toBe(true);
    expect(required('options', state)).toBe(false);
    expect(required('cybergear', state)).toBe(false);
  });

  it('requires mutations for a Mutant Human', () => {
    const state = createEmptyCharacter();
    expect(required('mutations', state)).toBe(false);
    state.speciesId = 'mutant-human';
    expect(required('mutations', state)).toBe(true);
  });

  it('requires psionics for primary and secondary Mindwalkers', () => {
    const state = createEmptyCharacter();
    expect(required('psionics', state)).toBe(false);
    state.professionId = 'mindwalker';
    expect(required('psionics', state)).toBe(true);

    state.professionId = 'diplomat';
    state.skillPlan.additionalDiscountProfessionIds = ['mindwalker'];
    expect(required('psionics', state)).toBe(true);
  });
});