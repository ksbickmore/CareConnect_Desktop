import type { Conversation, Message } from '@/models/types';
import { loadJSON, saveJSON } from './storage';

const STORAGE_KEY = 'messages';

/**
 * Access to the user's care-team message threads. New to the desktop build —
 * the mobile app modeled Messages as a call grid, but the desktop Figma is a
 * split-pane chat (master list + thread), so conversations are modeled here.
 * Persisted to localStorage so sent replies survive a restart.
 */
export interface MessagesRepository {
  getAll(): readonly Conversation[];
  /** Append a message to a thread. Rejects if the conversation is unknown. */
  appendMessage(conversationId: string, message: Message): readonly Conversation[];
  /** Mark a thread read (clears the unread dot). */
  markRead(conversationId: string): readonly Conversation[];
}

// Seed threads mirror the Figma messages screen (Dr. Park unread, Nurse read).
export const defaultConversationsSeed: readonly Conversation[] = [
  {
    id: 'dr-park',
    contactName: 'Dr. Park',
    initials: 'DP',
    subtitle: 'Primary physician',
    unread: true,
    messages: [
      { id: 'p1', fromMe: false, body: 'Reminder: Your PT session is tomorrow at 2:00 PM.', at: '8:02 AM' },
      { id: 'p2', fromMe: true, body: "Thanks! I'll be there.", at: '8:15 AM' },
      { id: 'p3', fromMe: false, body: 'Please bring your symptom log. Voice reply is fine.', at: '8:16 AM' },
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

export function createMessagesRepository(
  seed: readonly Conversation[] = loadJSON(STORAGE_KEY, defaultConversationsSeed),
): MessagesRepository {
  let convos: Conversation[] = seed.map((c) => ({ ...c, messages: [...c.messages] }));
  const persist = () => saveJSON(STORAGE_KEY, convos);
  const snapshot = () => Object.freeze(convos.map((c) => ({ ...c })));

  const requireIndex = (id: string): number => {
    const i = convos.findIndex((c) => c.id === id);
    if (i < 0) throw new Error(`No conversation with id "${id}"`);
    return i;
  };

  return {
    getAll: () => snapshot(),

    appendMessage(conversationId, message) {
      const i = requireIndex(conversationId);
      const convo = convos[i];
      convos[i] = {
        ...convo,
        messages: [...convo.messages, message],
        // A message the user sends clears unread; an inbound one sets it.
        unread: message.fromMe ? false : true,
      };
      persist();
      return snapshot();
    },

    markRead(conversationId) {
      const i = requireIndex(conversationId);
      convos[i] = { ...convos[i], unread: false };
      persist();
      return snapshot();
    },
  };
}
