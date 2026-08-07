import { describe, expect, it } from 'vitest';
import { DEFAULT_ARTIFACT_DESIGN } from './artifactDesignService';
import {
  deserializeArtifact,
  getDefaultArtifactFileName,
  jsonToArtifactSaveFile,
  serializeArtifact,
} from './artifactSaveService';

function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

describe('artifactSaveService', () => {
  it('round-trips a complete artifact design', () => {
    const artifact = {
      ...DEFAULT_ARTIFACT_DESIGN,
      name: 'Gate of Glass',
      creator: 'The vanished Saruun',
      campaignHooks: 'Three factions seek the activation key.',
    };
    const parsed = jsonToArtifactSaveFile(toJson(serializeArtifact(artifact)));
    const loaded = parsed ? deserializeArtifact(parsed) : null;

    expect(loaded?.success).toBe(true);
    expect(loaded?.value).toEqual(artifact);
    expect(getDefaultArtifactFileName('Gate: of / Glass')).toBe('Gate of Glass.artifact.json');
  });

  it('removes unknown catalogue entries defensively', () => {
    const saveFile = serializeArtifact(DEFAULT_ARTIFACT_DESIGN);
    const loaded = deserializeArtifact({
      ...saveFile,
      artifact: {
        ...DEFAULT_ARTIFACT_DESIGN,
        powers: [{ ...DEFAULT_ARTIFACT_DESIGN.powers[0], powerId: 'removed-power' }],
        drawbacks: [{ id: 'bad', drawbackId: 'removed-drawback', severity: 'slight', notes: '' }],
      },
    });

    expect(loaded.value?.powers).toEqual([]);
    expect(loaded.value?.drawbacks).toEqual([]);
    expect(loaded.warnings).toHaveLength(2);
  });

  it('rejects malformed and incompatible files', () => {
    expect(jsonToArtifactSaveFile('not json')).toBeNull();
    const incompatible = deserializeArtifact({
      ...serializeArtifact(DEFAULT_ARTIFACT_DESIGN),
      version: '2.0',
    });
    expect(incompatible.success).toBe(false);
  });
});
