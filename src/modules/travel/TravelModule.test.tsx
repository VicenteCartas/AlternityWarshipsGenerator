import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TravelModule } from './TravelModule';

function renderModule() {
  return render(
    <TravelModule
      themeMode="dark"
      onThemeModeChange={vi.fn()}
      onReturnToHub={vi.fn()}
    />,
  );
}

describe('TravelModule', () => {
  it('renders the default 25 AU, PL7 Acceleration 1 benchmark', () => {
    renderModule();

    expect(screen.getByText('Travel Calculator', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('External elapsed').parentElement).toHaveTextContent('1 day 8 hr 25 min 2 sec');
    expect(screen.getByText('Shipboard elapsed').parentElement).toHaveTextContent('1 day 8 hr 10 min 12 sec');
    expect(screen.getByText('21.1378% c')).toBeInTheDocument();
    expect(screen.getByText('Trip rounds').parentElement).toHaveTextContent('3,890');
  });

  it('supports physical acceleration input', async () => {
    const user = userEvent.setup();
    renderModule();

    await user.click(screen.getByRole('button', { name: 'Physical' }));
    expect(screen.queryByLabelText('Acceleration calculation')).not.toBeInTheDocument();
    const accelerationInput = screen.getByLabelText('Acceleration');
    await user.clear(accelerationInput);
    await user.type(accelerationInput, '1');

    expect(screen.getByText(/9\.807 m\/s\^2 \(1 g\)/)).toBeInTheDocument();
    expect(screen.getByText(/Cancels the acceleration felt by the crew/)).toBeInTheDocument();
  });

  it('switches between scale-derived and Warships-published acceleration', async () => {
    const user = userEvent.setup();
    renderModule();

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
});