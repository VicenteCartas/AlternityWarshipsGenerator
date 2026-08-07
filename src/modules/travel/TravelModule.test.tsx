import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { installMockElectronAPI } from '@shared/test/electronMock';
import { TravelModule } from './TravelModule';
import { serializeTravelDocument, travelSaveFileToJson } from './services/travelSaveService';
import { DEFAULT_TRAVEL_DOCUMENT } from './types/travelDocument';

function renderModule() {
  return render(
    <TravelModule
      themeMode="dark"
      onThemeModeChange={vi.fn()}
      onReturnToHub={vi.fn()}
    />,
  );
}

async function renderEditor() {
  const user = userEvent.setup();
  renderModule();
  await user.click(screen.getByRole('button', { name: 'New Trip' }));
  return user;
}

describe('TravelModule', () => {
  it('renders the default 25 AU, PL7 Acceleration 1 benchmark', async () => {
    await renderEditor();

    expect(screen.getByText('Travel Calculator', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('External elapsed').parentElement).toHaveTextContent('1 day 8 hr 25 min 2 sec');
    expect(screen.getByText('Shipboard elapsed').parentElement).toHaveTextContent('1 day 8 hr 10 min 12 sec');
    expect(screen.getByText('21.1378% c')).toBeInTheDocument();
    expect(screen.getByText('Trip rounds').parentElement).toHaveTextContent('3,890');
  });

  it('supports physical acceleration input', async () => {
    const user = await renderEditor();

    await user.click(screen.getByRole('button', { name: 'Physical' }));
    expect(screen.queryByLabelText('Acceleration calculation')).not.toBeInTheDocument();
    const accelerationInput = screen.getByLabelText('Acceleration');
    await user.clear(accelerationInput);
    await user.type(accelerationInput, '1');

    expect(screen.getByText(/9\.807 m\/s\^2 \(1 g\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cancels the acceleration felt by the crew/)).toBeInTheDocument();
  });

  it('switches between scale-derived and Warships-published acceleration', async () => {
    const user = await renderEditor();

    const calculationMethod = screen.getByLabelText('Acceleration calculation');
    expect(calculationMethod).toHaveTextContent('Scale-derived');
    expect(screen.getByText(/1,111\.111 m\/s\^2 \(113\.302 g\)/)).toBeInTheDocument();

    await user.click(calculationMethod);
    await user.click(screen.getByRole('option', { name: 'Warships published' }));

    expect(screen.getByText(/33,333\.333 m\/s\^2 \(3,399\.054 g\)/)).toBeInTheDocument();
    expect(screen.getByText(/Warships published conversion is active/)).toBeInTheDocument();
  });

  it('returns to the suite hub', async () => {
    const user = userEvent.setup();
    const onReturnToHub = vi.fn();
    render(
      <TravelModule
        themeMode="dark"
        onThemeModeChange={vi.fn()}
        onReturnToHub={onReturnToHub}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Workshop Home' }));
    expect(onReturnToHub).toHaveBeenCalledOnce();
  });

  it('saves edited inputs and opens a saved trip from the launch screen', async () => {
    const electron = installMockElectronAPI();
    electron.api.showTravelSaveDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePath: 'C:\\Trips\\Tendril.travel.json',
    });
    let savedContent = '';
    electron.api.saveFile = vi.fn().mockImplementation(async (_filePath, content) => {
      savedContent = content;
      return { success: true };
    });
    const user = await renderEditor();

    await user.clear(screen.getByLabelText('Trip name'));
    await user.type(screen.getByLabelText('Trip name'), 'Tendril Run');
    await user.clear(screen.getByLabelText('Distance'));
    await user.type(screen.getByLabelText('Distance'), '10');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(savedContent).toContain('Tendril Run'));
    expect(electron.api.addRecentFile).toHaveBeenCalledWith('C:\\Trips\\Tendril.travel.json');

    electron.api.showTravelOpenDialog = vi.fn().mockResolvedValue({
      canceled: false,
      filePaths: ['C:\\Trips\\Return.travel.json'],
    });
    electron.api.readFile = vi.fn().mockResolvedValue({
      success: true,
      content: travelSaveFileToJson(serializeTravelDocument({
        ...DEFAULT_TRAVEL_DOCUMENT,
        name: 'Return Run',
        distance: 42,
      })),
    });
    await user.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => expect(screen.getByLabelText('Trip name')).toHaveValue('Return Run'));
    expect(screen.getByLabelText('Distance')).toHaveValue(42);
  });

  it('protects unsaved inputs when returning to the Travel start screen', async () => {
    const electron = installMockElectronAPI();
    const user = await renderEditor();
    await waitFor(() => expect(electron.api.setBuilderMode).toHaveBeenCalledWith('travel-editor'));
    await user.clear(screen.getByLabelText('Distance'));
    await user.type(screen.getByLabelText('Distance'), '12');

    await act(async () => { electron.triggerMenuEvent('onReturnToStart'); });
    expect(screen.getByRole('heading', { name: 'Discard unsaved trip changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard' }));

    expect(screen.getByRole('button', { name: 'New Trip' })).toBeInTheDocument();
    await waitFor(() => expect(electron.api.setBuilderMode).toHaveBeenCalledWith('travel-welcome'));
  });
});