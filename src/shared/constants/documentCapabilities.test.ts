import { describe, expect, it } from 'vitest';
import { WORKSHOP_DOCUMENTS, isDocumentFile } from './documentCapabilities';

describe('WORKSHOP_DOCUMENTS', () => {
  it('requires the baseline document workflow for every tool', () => {
    expect(Object.values(WORKSHOP_DOCUMENTS)).toHaveLength(8);
    for (const capabilities of Object.values(WORKSHOP_DOCUMENTS)) {
      expect(capabilities).toMatchObject({
        supportsSave: true,
        supportsSaveAs: true,
        supportsRecent: true,
      });
      expect(capabilities.newLabel).toMatch(/^New /);
      expect(capabilities.openLabel).toMatch(/^Open /);
      expect(capabilities.fileExtension).toMatch(/^\..+\.json$/);
    }
  });

  it('matches recent files only to their exact document type', () => {
    expect(isDocumentFile('star-system', 'C:\\Worlds\\Horizon.system.json')).toBe(true);
    expect(isDocumentFile('star-system', 'C:\\Worlds\\Helios.civilization.json')).toBe(false);
    expect(isDocumentFile('travel', 'C:\\Trips\\Tendril.travel.json')).toBe(true);
  });
});
