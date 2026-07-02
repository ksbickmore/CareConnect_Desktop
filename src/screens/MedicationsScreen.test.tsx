jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MedicationsScreen } from './MedicationsScreen';
import { createMedicationsRepository } from '@/data/medications-repository';
import { useMedicationsStore } from '@/stores/medications-store';
import { useAnnouncerStore } from '@/stores/announcer-store';
import type { Medication } from '@/models/types';
import { renderAt, signIn } from '@/test-utils/render';
import { fakeSpeech } from '@/test-utils/fake-speech';

const med = (
  id: string,
  name: string,
  dose: string,
  status: Medication['status'],
): Medication => ({
  id,
  name,
  dose,
  schedule: 'Once daily',
  instructions: 'Take as directed.',
  status,
  lastTakenAt: null,
});

const seed: readonly Medication[] = [
  med('lisinopril-10-mg', 'Lisinopril', '10 mg', 'dueSoon'),
  med('vitamin-b6-50-mg', 'Vitamin B6', '50 mg', 'scheduled'),
  med('aspirin-81-mg', 'Aspirin', '81 mg', 'taken'),
];

async function renderSeeded() {
  useMedicationsStore.getState().reset(createMedicationsRepository(seed));
  await useMedicationsStore.getState().load();
  return render(<MedicationsScreen />);
}

const options = () => screen.getAllByRole('option');
const selectedNames = () =>
  options()
    .filter((o) => o.getAttribute('aria-selected') === 'true')
    .map((o) => o.textContent);

describe('MedicationsScreen', () => {
  it('renders the ledger with the first row selected', async () => {
    await renderSeeded();
    expect(options()).toHaveLength(3);
    expect(selectedNames()[0]).toContain('Lisinopril');
    // Detail panel mirrors the selection.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Lisinopril 10 mg' }),
    ).toBeInTheDocument();
  });

  it('moves the selection with ArrowDown/ArrowUp and clamps at both ends', async () => {
    await renderSeeded();
    const listbox = screen.getByRole('listbox', { name: 'Medications' });

    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(selectedNames()[0]).toContain('Vitamin B6');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(selectedNames()[0]).toContain('Aspirin');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }); // clamp at the end
    expect(selectedNames()[0]).toContain('Aspirin');

    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expect(selectedNames()[0]).toContain('Lisinopril');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' }); // clamp at the start
    expect(selectedNames()[0]).toContain('Lisinopril');
  });

  it('filters the ledger with the All / Due / Taken tabs', async () => {
    const user = userEvent.setup();
    await renderSeeded();

    await user.click(screen.getByRole('tab', { name: 'Taken' }));
    expect(options()).toHaveLength(1);
    expect(options()[0].textContent).toContain('Aspirin');
    expect(screen.getByText('Nothing due with this filter.')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Due' }));
    expect(options()).toHaveLength(2);

    await user.click(screen.getByRole('tab', { name: 'All' }));
    expect(options()).toHaveLength(3);
  });

  it('marks the selected medication taken via the two-tap confirm', async () => {
    const user = userEvent.setup();
    await renderSeeded();

    // Pin the selection to Lisinopril so the detail panel keeps following it
    // after the row moves to the completed group.
    await user.click(screen.getByRole('option', { name: /Lisinopril/ }));
    await user.click(screen.getByRole('button', { name: 'Confirm taken' }));
    await user.click(screen.getByRole('button', { name: 'Tap again to confirm' }));

    // Detail panel flips to the disabled "Taken" state.
    expect(await screen.findByRole('button', { name: 'Taken' })).toBeDisabled();
    expect(useMedicationsStore.getState().byId('lisinopril-10-mg')?.status).toBe(
      'taken',
    );
  });

  it('validates the add-medication form', async () => {
    const user = userEvent.setup();
    await renderSeeded();

    await user.click(screen.getByRole('button', { name: 'Add medication' }));
    const dialog = screen.getByRole('dialog', { name: 'New medication' });
    await user.click(within(dialog).getByRole('button', { name: 'Save medication' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Name and dose are both required.',
    );
  });

  it('adds a new medication to the ledger', async () => {
    const user = userEvent.setup();
    await renderSeeded();

    await user.click(screen.getByRole('button', { name: 'Add medication' }));
    const dialog = screen.getByRole('dialog', { name: 'New medication' });
    await user.type(within(dialog).getByLabelText('Name'), 'Metformin');
    await user.type(within(dialog).getByLabelText('Dose'), '500 mg');
    await user.click(within(dialog).getByRole('button', { name: 'Save medication' }));

    expect(await screen.findByText('Metformin 500 mg')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('surfaces the repository error for a duplicate medication', async () => {
    const user = userEvent.setup();
    await renderSeeded();

    await user.click(screen.getByRole('button', { name: 'Add medication' }));
    const dialog = screen.getByRole('dialog', { name: 'New medication' });
    // slugify("Lisinopril 10 mg") collides with the seeded id.
    await user.type(within(dialog).getByLabelText('Name'), 'Lisinopril');
    await user.type(within(dialog).getByLabelText('Dose'), '10 mg');
    await user.click(within(dialog).getByRole('button', { name: 'Save medication' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'already exists',
    );
  });

  it('opens the voice-note dialog for the selected medication', async () => {
    const user = userEvent.setup();
    await renderSeeded();

    await user.click(screen.getByRole('button', { name: 'Voice note' }));
    expect(
      screen.getByRole('dialog', { name: 'Voice note — Lisinopril' }),
    ).toBeInTheDocument();
  });
});

const startVoice = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Start voice command' }));
};

describe('voice commands', () => {
  beforeEach(() => {
    signIn();
  });

  afterEach(() => {
    fakeSpeech.reset();
  });

  it('moves the selection with next/previous medication', async () => {
    const user = userEvent.setup();
    renderAt('/medications');
    await screen.findByRole('heading', { level: 1, name: 'Medications' });
    await startVoice(user);

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    act(() => fakeSpeech.emitFinal('next medication'));
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    act(() => fakeSpeech.emitFinal('previous medication'));
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('confirms taken via two-step voice confirmation', async () => {
    const user = userEvent.setup();
    renderAt('/medications');
    await screen.findByRole('heading', { level: 1, name: 'Medications' });
    await startVoice(user);

    act(() => fakeSpeech.emitFinal('confirm taken'));
    expect(screen.getByRole('button', { name: 'Tap again to confirm' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('confirm'));
    expect(await screen.findByRole('button', { name: 'Taken' })).toBeInTheDocument();
  });

  it('adds a medication end-to-end by voice', async () => {
    const user = userEvent.setup();
    renderAt('/medications');
    await screen.findByRole('heading', { level: 1, name: 'Medications' });
    await startVoice(user);

    act(() => fakeSpeech.emitFinal('add medication'));
    expect(await screen.findByRole('dialog', { name: 'New medication' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('name Aspirin'));
    act(() => fakeSpeech.emitFinal('dose 81 mg'));
    act(() => fakeSpeech.emitFinal('save'));
    expect(await screen.findByText(/Aspirin 81 mg/)).toBeInTheDocument();
  });

  it('filters by voice', async () => {
    const user = userEvent.setup();
    renderAt('/medications');
    await screen.findByRole('heading', { level: 1, name: 'Medications' });
    await startVoice(user);

    act(() => fakeSpeech.emitFinal('filter taken'));
    expect(screen.getByRole('tab', { name: 'Taken' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('blocks voice save when required fields are empty', async () => {
    const user = userEvent.setup();
    renderAt('/medications');
    await screen.findByRole('heading', { level: 1, name: 'Medications' });
    await startVoice(user);

    act(() => fakeSpeech.emitFinal('add medication'));
    expect(await screen.findByRole('dialog', { name: 'New medication' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('save'));
    await waitFor(() =>
      expect(useAnnouncerStore.getState().polite).toBe('Name and dose are both required.'),
    );
    expect(screen.getByRole('dialog', { name: 'New medication' })).toBeInTheDocument();
  });
});
