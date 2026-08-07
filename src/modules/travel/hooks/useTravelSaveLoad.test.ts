import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { DEFAULT_TRAVEL_DOCUMENT } from '../types/travelDocument';
import { serializeTravelDocument, travelSaveFileToJson } from '../services/travelSaveService';
import { useTravelSaveLoad } from './useTravelSaveLoad';

beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', { value: undefined, writable: true, configurable: true });
});

describe('useTravelSaveLoad', () => {
  it('saves through the native dialog and reuses the selected path', async () => {
    const electron = installMockElectronAPI();
    electron.api.showTravelSaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: '/mock/tendril.travel.json',
    });
    const { result } = renderHook(() => useTravelSaveLoad());

    await act(async () => {
      await result.current.save({ ...DEFAULT_TRAVEL_DOCUMENT, name: 'Tendril Run' });
    });
    expect(electron.api.showTravelSaveDialog).toHaveBeenCalledWith('Tendril Run.travel.json');
    expect(result.current.currentFilePath).toBe('/mock/tendril.travel.json');
    expect(electron.api.addRecentFile).toHaveBeenCalledWith('/mock/tendril.travel.json');

    await act(async () => {
      await result.current.save({ ...DEFAULT_TRAVEL_DOCUMENT, name: 'Return Run' });
    });
    expect(electron.api.showTravelSaveDialog).toHaveBeenCalledOnce();
    expect(electron.api.saveFile).toHaveBeenCalledTimes(2);
  });

  it('opens and deserializes a trip file', async () => {
    const electron = installMockElectronAPI();
    const document = { ...DEFAULT_TRAVEL_DOCUMENT, name: 'Horizon Run', distance: 10 };
    electron.api.showTravelOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['/mock/horizon.travel.json'],
    });
    electron.api.readFile = vi.fn().mockResolvedValue({
      success: true,
      content: travelSaveFileToJson(serializeTravelDocument(document)),
    });
    const { result } = renderHook(() => useTravelSaveLoad());

    let opened;
    await act(async () => { opened = await result.current.open(); });
    expect(opened).toMatchObject({ ok: true, document });
    expect(result.current.currentFilePath).toBe('/mock/horizon.travel.json');
  });
});
