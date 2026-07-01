import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagesScreen } from './MessagesScreen';
import { createMessagesRepository } from '@/data/messages-repository';
import { useMessagesStore } from '@/stores/messages-store';
import type { Conversation } from '@/models/types';

const seed: readonly Conversation[] = [
  {
    id: 'dr-park',
    contactName: 'Dr. Park',
    initials: 'DP',
    subtitle: 'Primary physician',
    unread: true,
    messages: [
      { id: 'p1', fromMe: false, body: 'Bring your symptom log.', at: '8:02 AM' },
    ],
  },
  {
    id: 'nurse',
    contactName: 'Nurse',
    initials: 'N',
    subtitle: 'Clinic Nurse Desk',
    unread: false,
    messages: [
      { id: 'n1', fromMe: false, body: 'Great progress this week!', at: '2d' },
    ],
  },
];

function renderSeeded() {
  useMessagesStore.getState().reset(createMessagesRepository(seed));
  return render(<MessagesScreen />); // the screen loads the store on mount
}

describe('MessagesScreen', () => {
  it('lists conversations, auto-selects the first, and marks it read', async () => {
    renderSeeded();
    const list = await screen.findByRole('list', { name: 'Conversations' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);

    // Dr. Park is auto-selected and its unread dot clears via markRead.
    expect(
      within(list).getByRole('button', { name: /Dr\. Park/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument(),
    );
  });

  it('filters conversations by contact name', async () => {
    const user = userEvent.setup();
    renderSeeded();
    await screen.findByRole('list', { name: 'Conversations' });

    await user.type(
      screen.getByRole('searchbox', { name: 'Search messages' }),
      'nurse',
    );
    const list = screen.getByRole('list', { name: 'Conversations' });
    expect(within(list).queryByText('Dr. Park')).not.toBeInTheDocument();
    expect(within(list).getByText('Nurse')).toBeInTheDocument();
  });

  it('disables send for an empty draft and sends a typed reply', async () => {
    const user = userEvent.setup();
    renderSeeded();
    await screen.findByRole('list', { name: 'Conversations' });

    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send).toBeDisabled();

    const draft = screen.getByLabelText('Message to Dr. Park');
    await user.type(draft, 'See you tomorrow');
    expect(send).toBeEnabled();
    await user.click(send);

    // Appears both as the thread bubble and as the conversation preview.
    expect(await screen.findAllByText('See you tomorrow')).toHaveLength(2);
    expect(draft).toHaveValue('');
  });

  it('reads a received message aloud via speech synthesis', async () => {
    const user = userEvent.setup();
    renderSeeded();
    await screen.findByRole('list', { name: 'Conversations' });

    await user.click(screen.getByRole('button', { name: 'Read message aloud' }));
    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1);
    expect(window.speechSynthesis.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Bring your symptom log.' }),
    );
  });

  it('composes a new message from the dialog', async () => {
    const user = userEvent.setup();
    renderSeeded();
    await screen.findByRole('list', { name: 'Conversations' });

    await user.click(screen.getByRole('button', { name: 'New message' }));
    const dialog = screen.getByRole('dialog', { name: 'New message' });

    expect(within(dialog).getByRole('button', { name: 'Send' })).toBeDisabled();
    await user.selectOptions(within(dialog).getByLabelText('To'), 'nurse');
    await user.type(within(dialog).getByLabelText('Message'), 'Thank you!');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await screen.findAllByText('Thank you!')).length).toBeGreaterThan(0);
  });
});
