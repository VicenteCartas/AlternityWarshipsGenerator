import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme, Table, TableBody, TableRow } from '@mui/material';
import { ConfirmDialog } from './ConfirmDialog';
import { StepHeader } from './StepHeader';
import { TabPanel } from './TabPanel';
import { TruncatedDescription } from './TruncatedDescription';
import { TechTrackCell } from './TechTrackCell';

vi.mock('../../services/formatters', () => ({
  getTechTrackName: (code: string) => ({ G: 'Gravity', D: 'Dimensional', A: 'Atomic' }[code] ?? code),
}));

const theme = createTheme();

function wrap(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

// ============== ConfirmDialog ==============

describe('ConfirmDialog', () => {
  const defaults = {
    open: true,
    title: 'Delete Item',
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and message', () => {
    wrap(<ConfirmDialog {...defaults} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    wrap(<ConfirmDialog {...defaults} open={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });

  it('calls onConfirm when Confirm is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    wrap(<ConfirmDialog {...defaults} onConfirm={onConfirm} />);
    await user.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    wrap(<ConfirmDialog {...defaults} onCancel={onCancel} />);
    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom labels', () => {
    wrap(<ConfirmDialog {...defaults} confirmLabel="Yes, delete" cancelLabel="No" />);
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });
});

// ============== StepHeader ==============

describe('StepHeader', () => {
  it('renders step number and name', () => {
    wrap(<StepHeader stepNumber={3} name="Power Plant" />);
    expect(screen.getByText(/Step 3: Power Plant/)).toBeInTheDocument();
  });

  it('shows Required chip when isRequired is true', () => {
    wrap(<StepHeader stepNumber={1} name="Hull" isRequired />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('shows Optional chip when isRequired is false', () => {
    wrap(<StepHeader stepNumber={5} name="FTL Drive" isRequired={false} />);
    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});

// ============== TabPanel ==============

describe('TabPanel', () => {
  it('renders children when value matches index', () => {
    wrap(
      <TabPanel value={0} index={0}>
        <div>Tab Content</div>
      </TabPanel>
    );
    expect(screen.getByText('Tab Content')).toBeInTheDocument();
  });

  it('hides children when value does not match index', () => {
    wrap(
      <TabPanel value={1} index={0}>
        <div>Tab Content</div>
      </TabPanel>
    );
    expect(screen.queryByText('Tab Content')).not.toBeInTheDocument();
  });

  it('has correct ARIA attributes', () => {
    const { container } = wrap(
      <TabPanel value={0} index={0} id="test">
        <div>Content</div>
      </TabPanel>
    );
    const panel = container.querySelector('[role="tabpanel"]');
    expect(panel).toBeInTheDocument();
  });
});

// ============== TruncatedDescription ==============

describe('TruncatedDescription', () => {
  it('renders text', () => {
    wrap(<TruncatedDescription text="A long description for testing" />);
    expect(screen.getByText('A long description for testing')).toBeInTheDocument();
  });

  it('renders empty when text is empty', () => {
    const { container } = wrap(<TruncatedDescription text="" />);
    // Should render but be empty
    expect(container.querySelector('.MuiTypography-root')).toBeInTheDocument();
  });
});

// ============== TechTrackCell ==============

describe('TechTrackCell', () => {
  it('renders dash for empty tech tracks', () => {
    wrap(
      <Table><TableBody><TableRow>
        <TechTrackCell techTracks={[]} />
      </TableRow></TableBody></Table>
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders tech track codes', () => {
    wrap(
      <Table><TableBody><TableRow>
        <TechTrackCell techTracks={['G', 'D']} />
      </TableRow></TableBody></Table>
    );
    expect(screen.getByText(/G/)).toBeInTheDocument();
    expect(screen.getByText(/D/)).toBeInTheDocument();
  });
});
