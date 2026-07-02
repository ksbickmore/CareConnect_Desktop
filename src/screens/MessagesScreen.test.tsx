jest.mock('@/lib/speech/speech-recognition', () =>
  jest.requireActual<typeof import('@/test-utils/fake-speech')>(
    '@/test-utils/fake-speech',
  ).fakeSpeechModule,
);

import { act, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { MessagesScreen } from './MessagesScreen';
import { createMessagesRepository } from '@/data/messages-repository';
import { useMessagesStore } from '@/stores/messages-store';
import type { Conversation } from '@/models/types';
import { renderAt, signIn } from '@/test-utils/render';
import { fakeSpeech } from '@/test-utils/fake-speech';

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
  return render(
    // The screen calls useNavigate (voice contact switching), so it needs a router.
    <MemoryRouter>
      <MessagesScreen />
    </MemoryRouter>,
  ); // the screen loads the store on mount
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

const pressedConvo = () => {
  const list = screen.getByRole('list', { name: 'Conversations' });
  return within(list)
    .getAllByRole('button')
    .find((b) => b.getAttribute('aria-pressed') === 'true');
};

describe('voice commands', () => {
  beforeEach(() => {
    signIn();
    useMessagesStore.getState().reset(createMessagesRepository(seed));
  });

  afterEach(() => {
    fakeSpeech.reset();
  });

  it('moves between conversations', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    const first = pressedConvo();
    act(() => fakeSpeech.emitFinal('next conversation'));
    expect(pressedConvo()).not.toBe(first);
    act(() => fakeSpeech.emitFinal('previous conversation'));
    expect(pressedConvo()).toBe(first);
  });

  it('steps between conversations with the contact aliases', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    const first = pressedConvo();
    act(() => fakeSpeech.emitFinal('next contact'));
    expect(pressedConvo()).not.toBe(first);
    act(() => fakeSpeech.emitFinal('previous contact'));
    expect(pressedConvo()).toBe(first);
  });

  it('switches conversations by contact name, honorifics included', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('open nurse'));
    expect(pressedConvo()).toHaveTextContent('Nurse');
    act(() => fakeSpeech.emitFinal('switch to doctor park'));
    expect(pressedConvo()).toHaveTextContent('Dr. Park');
  });

  it('keeps the selection and says so when no contact matches', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('open zorro'));
    expect(pressedConvo()).toHaveTextContent('Dr. Park');
    // The live-region announcement lands in a microtask.
    expect(await screen.findByText(/No contact matching zorro/)).toBeInTheDocument();
  });

  it('clears an active search filter that hides the named contact', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    const search = screen.getByRole('searchbox', { name: 'Search messages' });
    await user.type(search, 'nurse');
    const list = screen.getByRole('list', { name: 'Conversations' });
    expect(within(list).queryByText('Dr. Park')).not.toBeInTheDocument();

    act(() => fakeSpeech.emitFinal('open doctor park'));
    expect(search).toHaveValue('');
    expect(pressedConvo()).toHaveTextContent('Dr. Park');
  });

  it('still navigates to other screens when "open" names no contact', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('open medications'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Medications' }),
    ).toBeInTheDocument();
  });

  it('dictates a reply and sends it', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('reply see you at three'));
    expect(screen.getByPlaceholderText(/Voice reply/)).toHaveValue('see you at three');
    act(() => fakeSpeech.emitFinal('send'));
    expect(await screen.findAllByText('see you at three')).toHaveLength(2);
  });

  it('composes a new message by voice', async () => {
    const user = userEvent.setup();
    renderAt('/messages');
    await screen.findByRole('heading', { level: 1, name: 'Messages' });
    await user.click(screen.getByRole('button', { name: 'Start voice command' }));

    act(() => fakeSpeech.emitFinal('new message'));
    expect(await screen.findByRole('dialog', { name: 'New message' })).toBeInTheDocument();
    act(() => fakeSpeech.emitFinal('message hello from voice'));
    expect(screen.getByLabelText('Message')).toHaveValue('hello from voice');
    act(() => fakeSpeech.emitFinal('send'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect((await screen.findAllByText('hello from voice')).length).toBeGreaterThan(0);
  });
});
