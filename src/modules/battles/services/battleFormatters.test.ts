import { describe, expect, it } from 'vitest';
import { formatStepModifier, formatTacticsDice } from './battleFormatters';

describe('formatStepModifier', () => {
  it('shows an explicit sign', () => {
    expect(formatStepModifier(-5)).toBe('-5');
    expect(formatStepModifier(2)).toBe('+2');
    expect(formatStepModifier(0)).toBe('0');
  });
});

describe('formatTacticsDice', () => {
  it('shows bonuses as subtraction and penalties as addition', () => {
    expect(formatTacticsDice(-5, 20)).toBe('d20 - d20');
    expect(formatTacticsDice(2, 6)).toBe('d20 + d6');
  });

  it('shows only the control die at step zero', () => {
    expect(formatTacticsDice(0, 0)).toBe('d20');
  });
});