import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_BALANCE_PACKAGES,
  ARTIFACT_DRAWBACKS,
  ARTIFACT_FORMS,
  ARTIFACT_POWERS,
  ARTIFACT_PURPOSES,
} from '../data/artifactCatalogue';
import {
  DEFAULT_ARTIFACT_DESIGN,
  generateArtifact,
  regenerateArtifactSection,
  rollArtifactBalancePackage,
  rollArtifactForm,
  rollArtifactPurpose,
  validateArtifact,
} from './artifactDesignService';

function rngForRoll(result: number, sides = 20): () => number {
  return () => (result - 0.5) / sides;
}

describe('artifact catalogue', () => {
  it('contains every GMG form, purpose, power, drawback, and balance package', () => {
    expect(ARTIFACT_FORMS).toHaveLength(7);
    expect(ARTIFACT_PURPOSES).toHaveLength(11);
    expect(ARTIFACT_POWERS).toHaveLength(44);
    expect(ARTIFACT_DRAWBACKS).toHaveLength(12);
    expect(ARTIFACT_BALANCE_PACKAGES).toHaveLength(16);
    expect(new Set(ARTIFACT_POWERS.map((entry) => entry.id)).size).toBe(44);
  });

  it('maps every d20 result for primary form and purpose', () => {
    for (let result = 1; result <= 20; result += 1) {
      expect(rollArtifactForm(rngForRoll(result)).formCategory).toBeTruthy();
      expect(rollArtifactPurpose('primary', rngForRoll(result))).not.toBeNull();
    }
  });

  it('maps secondary purpose 13-20 to none', () => {
    for (let result = 13; result <= 20; result += 1) {
      expect(rollArtifactPurpose('secondary', rngForRoll(result))).toBeNull();
    }
  });
});

describe('artifact generation and validation', () => {
  it('rolls the selected perk or flaw table on d8', () => {
    expect(rollArtifactBalancePackage('perk', rngForRoll(7, 8))).toBe(7);
    expect(rollArtifactBalancePackage('flaw', rngForRoll(3, 8))).toBe(3);
    expect(rollArtifactBalancePackage('story', rngForRoll(8, 8))).toBeNull();
  });

  it.each(['perk', 'flaw'] as const)('generates a valid %s package', (acquisition) => {
    let value = 0;
    const rng = () => {
      value = (value + 0.173) % 1;
      return value;
    };
    const artifact = generateArtifact({ ...DEFAULT_ARTIFACT_DESIGN, acquisition }, rng);
    const validation = validateArtifact(artifact);

    expect(validation.valid).toBe(true);
    expect(validation.expectedPackage?.acquisition).toBe(acquisition);
  });

  it('preserves locked sections while regenerating the rest', () => {
    const locked = {
      ...DEFAULT_ARTIFACT_DESIGN,
      formCategory: 'vehicle' as const,
      formSubtype: 'space',
      balanceRoll: 4,
      powers: [{ ...DEFAULT_ARTIFACT_DESIGN.powers[0], powerId: 'analysis' }],
      locks: { form: true, purpose: false, powers: true, drawbacks: false },
    };
    const generated = generateArtifact(locked, () => 0.6);

    expect(generated).toMatchObject({ formCategory: 'vehicle', formSubtype: 'space' });
    expect(generated.balanceRoll).toBe(4);
    expect(generated.powers).toEqual(locked.powers);
  });

  it('identifies package count and purpose mismatches', () => {
    const invalid = {
      ...DEFAULT_ARTIFACT_DESIGN,
      primaryPurpose: 'offense' as const,
      powers: DEFAULT_ARTIFACT_DESIGN.powers,
    };
    const validation = validateArtifact(invalid);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((error) => error.includes('does not match'))).toBe(true);
  });

  it('rolls a secondary purpose when generated package powers require one', () => {
    const artifact = {
      ...DEFAULT_ARTIFACT_DESIGN,
      balanceRoll: 2,
      secondaryPurpose: null,
      powers: [],
    };
    const generated = regenerateArtifactSection(artifact, 'powers', () => 0);

    expect(generated.secondaryPurpose).toBe('communication');
    expect(generated.powers).toHaveLength(2);
    expect(validateArtifact(generated).valid).toBe(true);
  });
});
