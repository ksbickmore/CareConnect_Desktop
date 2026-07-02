import { useEffect, useMemo, useState } from 'react';
import { Search, Mic, Send, Volume2, Pencil } from 'lucide-react';
import { Toolbar } from '@/components/Toolbar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { useSpeechRecognition } from '@/lib/speech/use-speech-recognition';
import { useVoiceCommands } from '@/lib/voice/use-voice-commands';
import { useMessagesStore } from '@/stores/messages-store';
import { dataOrNull } from '@/stores/async';
import { useAnnouncer } from '@/stores/announcer-store';
import styles from './MessagesScreen.module.css';

export function MessagesScreen() {
  const conversations = useMessagesStore((s) => s.conversations);
  const load = useMessagesStore((s) => s.load);
  const send = useMessagesStore((s) => s.send);
  const markRead = useMessagesStore((s) => s.markRead);
  const announce = useAnnouncer();

  const list = dataOrNull(conversations) ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      list.filter((c) =>
        c.contactName.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [list, query],
  );

  const selected =
    filtered.find((c) => c.id === selectedId) ??
    list.find((c) => c.id === selectedId) ??
    filtered[0] ??
    list[0] ??
    null;

  // Mark a thread read once it becomes the selected one.
  useEffect(() => {
    if (selected?.unread) void markRead(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  const { listening, available, start, stop } = useSpeechRecognition((final) => {
    setDraft((prev) => (prev ? `${prev} ${final}` : final));
  });

  const dictate = () => {
    if (!available) return;
    if (listening) stop();
    else void start();
  };

  const submit = () => {
    if (!selected || draft.trim().length === 0) return;
    void send(selected.id, draft);
    setDraft('');
    announce('Message sent.');
  };

  const readAloud = (text: string) => {
    if (typeof speechSynthesis === 'undefined') return;
    speechSynthesis.cancel();
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const moveConversation = (dir: 1 | -1) => {
    if (filtered.length === 0) return;
    const idx = Math.max(0, filtered.findIndex((c) => c.id === selected?.id));
    const next = Math.min(filtered.length - 1, Math.max(0, idx + dir));
    setSelectedId(filtered[next].id);
    return `${filtered[next].contactName}.`;
  };

  useVoiceCommands('screen', [
    { phrases: ['next conversation'], hint: 'next conversation', run: () => moveConversation(1) },
    {
      phrases: ['previous conversation'],
      hint: 'previous conversation',
      run: () => moveConversation(-1),
    },
    {
      phrases: ['search *'],
      hint: 'search <name>',
      run: (v) => {
        setQuery(v ?? '');
        return `Searching ${v}.`;
      },
    },
    {
      phrases: ['reply *', 'message *'],
      hint: 'reply <text>',
      run: (v) => {
        setDraft((prev) => (prev ? `${prev} ${v}` : v ?? ''));
      },
    },
    {
      phrases: ['send', 'send message'],
      hint: 'send',
      run: () => {
        submit();
      },
    },
    {
      phrases: ['read aloud', 'read message aloud'],
      hint: 'read aloud',
      run: () => {
        const lastReceived = selected?.messages.filter((m) => !m.fromMe).at(-1);
        if (lastReceived) readAloud(lastReceived.body);
        else return 'No received message to read.';
      },
    },
    {
      phrases: ['new message', 'compose'],
      hint: 'new message',
      run: () => {
        setComposeOpen(true);
        return 'New message. Say "to <name>", then "message <text>", then send.';
      },
    },
  ]);

  return (
    <>
      <Toolbar
        title="Messages"
        actions={
          <>
            <label className={styles.search}>
              <Search size={16} aria-hidden="true" />
              <span className="visually-hidden">Search messages</span>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search messages…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <Button icon={<Pencil size={16} />} onClick={() => setComposeOpen(true)}>
              New message
            </Button>
          </>
        }
      />

      <div className={styles.layout}>
        {/* Conversation list */}
        <ul className={styles.list} aria-label="Conversations">
          {filtered.length === 0 && <li className={styles.empty}>No conversations.</li>}
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={`${styles.convo} ${selected?.id === c.id ? styles.convoActive : ''}`}
                onClick={() => setSelectedId(c.id)}
                aria-pressed={selected?.id === c.id}
              >
                <span className={styles.avatar} aria-hidden="true">
                  {c.initials}
                </span>
                <span className={styles.convoText}>
                  <span className={styles.convoTop}>
                    <span className={styles.convoName}>{c.contactName}</span>
                    <span className={styles.convoTime}>
                      {c.messages[c.messages.length - 1]?.at ?? ''}
                    </span>
                  </span>
                  <span className={styles.convoPreview}>
                    {c.messages[c.messages.length - 1]?.body ?? ''}
                  </span>
                </span>
                {c.unread && <span className={styles.unread} aria-label="Unread" />}
              </button>
            </li>
          ))}
        </ul>

        {/* Thread */}
        <div className={styles.thread}>
          {selected == null ? (
            <p className={styles.threadEmpty}>Select a conversation.</p>
          ) : (
            <>
              <div className={styles.threadHead}>
                <span className={styles.avatar} aria-hidden="true">
                  {selected.initials}
                </span>
                <div>
                  <div className={styles.threadName}>{selected.contactName}</div>
                  <div className={styles.threadSub}>{selected.subtitle}</div>
                </div>
              </div>

              <div className={styles.messages}>
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`${styles.bubbleRow} ${m.fromMe ? styles.mine : styles.theirs}`}
                  >
                    <div className={styles.bubble}>
                      <p className={styles.bubbleBody}>{m.body}</p>
                      <span className={styles.bubbleTime}>{m.at}</span>
                    </div>
                    {!m.fromMe && (
                      <button
                        type="button"
                        className={styles.readAloud}
                        onClick={() => readAloud(m.body)}
                        aria-label="Read message aloud"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form
                className={styles.composer}
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <button
                  type="button"
                  className={`${styles.compMic} ${listening ? styles.listening : ''}`}
                  onClick={dictate}
                  aria-pressed={listening}
                  aria-label={listening ? 'Stop dictation' : 'Dictate reply'}
                >
                  <Mic size={20} />
                </button>
                <label className="visually-hidden" htmlFor="msg-draft">
                  Message to {selected.contactName}
                </label>
                <input
                  id="msg-draft"
                  className={styles.compInput}
                  placeholder="Voice reply…  (or type)"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button
                  type="submit"
                  className={styles.compSend}
                  disabled={draft.trim().length === 0}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {composeOpen && (
        <ComposeDialog
          conversations={list.map((c) => ({ id: c.id, name: c.contactName }))}
          onClose={() => setComposeOpen(false)}
          onSend={(id, body) => {
            void send(id, body);
            setSelectedId(id);
            setComposeOpen(false);
            announce('Message sent.');
          }}
        />
      )}
    </>
  );
}

function ComposeDialog({
  conversations,
  onClose,
  onSend,
}: {
  conversations: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
  onSend: (conversationId: string, body: string) => void;
}) {
  const [to, setTo] = useState(conversations[0]?.id ?? '');
  const [body, setBody] = useState('');
  const { listening, available, start, stop } = useSpeechRecognition((final) =>
    setBody((prev) => (prev ? `${prev} ${final}` : final)),
  );

  useVoiceCommands('dialog', [
    {
      phrases: ['to *'],
      hint: 'to <contact>',
      run: (v) => {
        const target = conversations.find((c) =>
          c.name.toLowerCase().includes((v ?? '').toLowerCase()),
        );
        if (!target) return `No contact matching ${v}.`;
        setTo(target.id);
        return `To ${target.name}.`;
      },
    },
    {
      phrases: ['message *'],
      hint: 'message <text>',
      run: (v) => {
        setBody((prev) => (prev ? `${prev} ${v}` : v ?? ''));
      },
    },
    {
      phrases: ['send', 'send message'],
      hint: 'send',
      run: () => {
        if (to !== '' && body.trim().length > 0) onSend(to, body);
        else return 'Pick a recipient and dictate a message first.';
      },
    },
  ]);

  return (
    <Dialog
      title="New message"
      description="Pick a recipient, then dictate or type — voice is the default."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon={<Send size={16} />}
            disabled={to === '' || body.trim().length === 0}
            onClick={() => onSend(to, body)}
          >
            Send
          </Button>
        </>
      }
    >
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="compose-to">
          To
        </label>
        <select
          id="compose-to"
          className={styles.select}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        >
          {conversations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.formField}>
        <label className={styles.formLabel} htmlFor="compose-body">
          Message
        </label>
        <div className={styles.composeRow}>
          <textarea
            id="compose-body"
            className={styles.textarea}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What would you like to say?"
          />
          <button
            type="button"
            className={`${styles.compMic} ${listening ? styles.listening : ''}`}
            onClick={() => (listening ? stop() : available && void start())}
            aria-label={listening ? 'Stop dictation' : 'Dictate message'}
          >
            <Mic size={20} />
          </button>
        </div>
      </div>
    </Dialog>
  );
}
