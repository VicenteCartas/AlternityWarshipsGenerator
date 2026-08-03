import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { useCivilizationSaveLoad, useStarSystemSaveLoad } from './useCampaignSaveLoad';
import { DEFAULT_CIVILIZATION_DESIGN } from '../services/civilizationDesignService';
import { generateStarSystem } from '../services/starSystemGenerationService';
import { campaignSaveFileToJson, serializeStarSystem } from '../services/campaignSaveService';

beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', { value: undefined, writable: true, configurable: true });
});

describe('campaign save/load hooks', () => {
  it('saves a civilization through its native dialog and reuses the selected path', async () => {
    const electron = installMockElectronAPI();
    electron.api.showCampaignSaveDialog = vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/helios.civilization.json' });
    const { result } = renderHook(() => useCivilizationSaveLoad());

    await act(async () => { await result.current.save({ ...DEFAULT_CIVILIZATION_DESIGN, name: 'Helios' }); });
    expect(electron.api.showCampaignSaveDialog).toHaveBeenCalledWith('civilization', 'Helios.civilization.json');
    expect(electron.api.saveFile).toHaveBeenCalledOnce();
    expect(result.current.currentFilePath).toBe('/mock/helios.civilization.json');

    await act(async () => { await result.current.save({ ...DEFAULT_CIVILIZATION_DESIGN, name: 'Helios II' }); });
    expect(electron.api.showCampaignSaveDialog).toHaveBeenCalledOnce();
    expect(electron.api.saveFile).toHaveBeenCalledTimes(2);
  });

  it('opens and deserializes a star-system file', async () => {
    const electron = installMockElectronAPI();
    const document = { name: 'Horizon', system: generateStarSystem({ starCount: 1, rng: () => 0.2 }) };
    electron.api.showCampaignOpenDialog = vi.fn().mockResolvedValue({ canceled: false, filePaths: ['/mock/horizon.system.json'] });
    electron.api.readFile = vi.fn().mockResolvedValue({ success: true, content: campaignSaveFileToJson(serializeStarSystem(document)) });
    const { result } = renderHook(() => useStarSystemSaveLoad());

    let opened;
    await act(async () => { opened = await result.current.open(); });
    expect(opened).toMatchObject({ ok: true, value: document });
    expect(result.current.currentFilePath).toBe('/mock/horizon.system.json');
    expect(electron.api.addRecentFile).toHaveBeenCalledWith('/mock/horizon.system.json');
  });
});
