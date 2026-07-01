import { create } from 'zustand';

import {
  createMessagesRepository,
  type MessagesRepository,
} from '@/data/messages-repository';
import { clockLabel } from '@/lib/format';
import type { Conversation, Message } from '@/models/types';
import { guard, loading, type Async } from './async';

/**
 * Messages store for the desktop chat master-detail. Follows the medications
 * store shape (Async wrapper + repository). `send` stamps the message with the
 * current time and appends it to the thread.
 */
interface MessagesStore {
  readonly conversations: Async<readonly Conversation[]>;

  load(): Promise<void>;
  /** Append a message the user typed/dictated to conversation `id`. */
  send(conversationId: string, body: string): Promise<void>;
  /** Clear the unread dot on a thread when it is opened. */
  markRead(conversationId: string): Promise<void>;
  /** `null` while loading / in error / unknown id. */
  byId(id: string): Conversation | null;
  /** Replace the backing repository and reset state. Used by tests. */
  reset(repo?: MessagesRepository): void;
}

let repository = createMessagesRepository();

export const useMessagesStore = create<MessagesStore>()((set, get) => ({
  conversations: loading(),

  async load() {
    set({ conversations: loading() });
    set({ conversations: await guard(async () => repository.getAll()) });
  },

  async send(conversationId, body) {
    const message: Message = {
      id: `${conversationId}-${Date.now()}`,
      fromMe: true,
      body: body.trim(),
      at: clockLabel(Date.now()),
    };
    set({
      conversations: await guard(async () =>
        repository.appendMessage(conversationId, message),
      ),
    });
  },

  async markRead(conversationId) {
    set({
      conversations: await guard(async () => repository.markRead(conversationId)),
    });
  },

  byId(id) {
    const state = get().conversations;
    if (state.status !== 'success') return null;
    return state.data.find((c) => c.id === id) ?? null;
  },

  reset(repo) {
    repository = repo ?? createMessagesRepository();
    set({ conversations: loading() });
  },
}));
