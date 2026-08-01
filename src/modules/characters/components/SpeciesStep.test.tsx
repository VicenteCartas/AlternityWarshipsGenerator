import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import {
  getAllCharacterSourcePacks,
  getAllSpecies,
} from '../services/characterDataService';
import type { SpeciesDefinition } from '../types/character';
import { SpeciesStep } from './SpeciesStep';

const modSpecies: SpeciesDefinition = {
  ...getAllSpecies()[0],
  id: 'modling',
  name: 'Modling',
  _source: 'Outer Rim Species',
  freeBroadSkillIds: ['athletics', 'knowledge', 'awareness', 'interaction', 'stamina', 'survival'],
  specialAbilityIds: ['adaptive-form'],
};

function TestSpeciesStep() {
  const [selectedSpeciesId, setSelectedSpeciesId] = useState('human');
  return (
    <SpeciesStep
      selectedSpeciesId={selectedSpeciesId}
      onSelect={setSelectedSpeciesId}
      speciesDefinitions={[...getAllSpecies(), modSpecies]}
      sourcePackDefinitions={getAllCharacterSourcePacks()}
    />
  );
}

function renderStep() {
  return render(
    <ThemeProvider theme={createTheme()}>
      <TestSpeciesStep />
    </ThemeProvider>,
  );
}

describe('SpeciesStep', () => {
  it('renders selected details above a comparison table', () => {
    renderStep();
    const table = screen.getByRole('table', { name: 'Species comparison' });
    expect(within(table).getAllByRole('row')).toHaveLength(9);
    expect(screen.getByRole('heading', { name: 'Human' })).toBeInTheDocument();
    expect(screen.getByText('8 available from 2 sources')).toBeInTheDocument();
    expect(screen.getByText('+5 starting skill points and +1 purchased broad-skill allowance.')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'STR' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'Select Human' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('Selected')).not.toBeInTheDocument();
  });

  it('searches the table and selects a mod species', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.type(screen.getByLabelText('Search species'), 'modling');
    const table = screen.getByRole('table', { name: 'Species comparison' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await user.click(within(table).getByRole('row', { name: 'Select Modling' }));
    expect(screen.getByRole('heading', { name: 'Modling' })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: 'Select Modling' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('Mod').length).toBeGreaterThan(0);
    expect(screen.getByText('Adaptive Form')).toBeInTheDocument();
  });

  it('filters catalogue entries by book or mod source', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByLabelText('Source'));
    await user.click(screen.getByRole('option', { name: 'Outer Rim Species (Mod)' }));
    const table = screen.getByRole('table', { name: 'Species comparison' });
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).getByRole('row', { name: 'Select Modling' })).toBeInTheDocument();
  });

  it('sorts the comparison table by species name', async () => {
    const user = userEvent.setup();
    renderStep();
    const table = screen.getByRole('table', { name: 'Species comparison' });
    const rowsBefore = within(table).getAllByRole('row');
    expect(rowsBefore[1]).toHaveTextContent('Fraal');
    await user.click(within(table).getByRole('button', { name: 'Name' }));
    const rowsAfter = within(table).getAllByRole('row');
    expect(rowsAfter[1]).toHaveTextContent('Weren');
  });
});