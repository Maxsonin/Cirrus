import { useCallback, useEffect, useRef, useState } from 'react';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { ANON_MESSAGE_LIMIT, type ChatMessage } from '@cirrus/shared';

import AuthForm from './components/AuthForm';
import { authClient } from './lib/auth-client';

type Model = {
  id: string;
  name: string;
  thinking: { supported: boolean };
};

type ChatSummary = {
  id: string;
  title: string;
  unread: boolean;
  generating: boolean;
};

type View = { key: number; chatId: string | null; temporary: boolean };

const API_URL = import.meta.env.VITE_API_URL;
const CHATS_POLL_MS = 3000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The chat id lives in the URL: /<chatId>
function chatIdFromUrl() {
  const id = location.pathname.slice(1);
  return UUID.test(id) ? id : null;
}

function setUrl(chatId: string | null, replace = false) {
  const path = chatId ? `/${chatId}` : '/';
  if (location.pathname === path) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', path);
}

function api(path: string, init?: RequestInit) {
  return fetch(`${API_URL}${path}`, { credentials: 'include', ...init });
}

function App() {
  const { data: session, isPending } = authClient.useSession();
  const [showAuth, setShowAuth] = useState(false);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [view, setView] = useState<View>({
    key: 0,
    chatId: chatIdFromUrl(),
    temporary: false,
  });

  const [notice, setNotice] = useState<string>();
  const anonChannel = useRef<BroadcastChannel | null>(null);

  const signedIn = !!session;

  const refreshChats = useCallback(() => {
    if (!signedIn) return;
    api('/chats')
      .then((res) => res.json())
      .then((data: { chats: ChatSummary[] }) => setChats(data.chats))
      .catch(console.error);
  }, [signedIn]);

  const open = (chatId: string | null, temporary = false) => {
    setNotice(undefined);
    setUrl(chatId);
    setView((v) => ({ key: v.key + 1, chatId, temporary }));
  };

  useEffect(refreshChats, [refreshChats]);

  // Generations finish in the background, poll until none are left.
  const anyGenerating = chats.some((c) => c.generating);
  useEffect(() => {
    if (!anyGenerating) return;
    const id = setInterval(refreshChats, CHATS_POLL_MS);
    return () => clearInterval(id);
  }, [anyGenerating, refreshChats]);

  // Back/forward buttons.
  useEffect(() => {
    const onPopState = () =>
      setView((v) => ({
        key: v.key + 1,
        chatId: chatIdFromUrl(),
        temporary: false,
      }));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Saved chats need a session: signed-out visitors always see "/".
  useEffect(() => {
    if (!isPending && !signedIn) setUrl(null, true);
  }, [isPending, signedIn]);

  // Anonymous users keep one live chat: when another tab starts chatting,
  // this tab goes back to the default page (remounting aborts its stream).
  // Only a signal is sent between tabs, no chat data.
  useEffect(() => {
    if (signedIn) return;

    const channel = new BroadcastChannel('cirrus-anonymous-chat');
    anonChannel.current = channel;
    channel.onmessage = () => {
      setView((v) => ({ key: v.key + 1, chatId: null, temporary: false }));
      setNotice('Your chat was continued in another tab.');
    };

    return () => {
      channel.close();
      anonChannel.current = null;
    };
  }, [signedIn]);

  const visibleChats = signedIn ? chats : [];

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 flex-col gap-1 border-r border-gray-300 p-3">
        <button onClick={() => open(null)} className="border p-1">
          New chat
        </button>
        {signedIn && (
          <button onClick={() => open(null, true)} className="border p-1">
            Temporary chat
          </button>
        )}

        <div className="mt-2 flex-1 overflow-y-auto">
          {visibleChats.map((c) => (
            <button
              key={c.id}
              onClick={() => open(c.id)}
              className={`block w-full truncate text-left ${c.id === view.chatId ? 'font-bold' : ''}`}
            >
              {c.generating ? '⏳ ' : c.unread ? '● ' : ''}
              {c.title}
            </button>
          ))}
        </div>

        {session ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{session.user.name}</span>
            <button onClick={() => authClient.signOut()}>Sign out</button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="border border-gray-600 p-1"
          >
            Sign up
          </button>
        )}
      </aside>

      <main className="flex-1 overflow-y-auto p-4">
        {view.temporary && <div className="text-gray-500">Temporary chat</div>}
        {notice && <div className="text-gray-500">{notice}</div>}
        {!isPending && (
          <Chat
            key={`${view.key}-${signedIn}`}
            initialChatId={signedIn ? view.chatId : null}
            temporary={view.temporary}
            anonymous={!signedIn}
            onCreated={(chatId) => {
              setUrl(chatId, true);
              setView((v) => ({ ...v, chatId }));
              refreshChats();
            }}
            onMissing={() => {
              setUrl(null, true);
              setView((v) => ({ ...v, chatId: null }));
            }}
            onChange={refreshChats}
            onNewChat={() => open(null)}
            onAnonymousSend={() => anonChannel.current?.postMessage('claim')}
          />
        )}
      </main>

      {showAuth && !session && (
        <div
          className="fixed inset-0 bg-black/40"
          onClick={() => setShowAuth(false)}
        >
          <div
            className="mx-auto mt-20 w-80 bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthForm />
          </div>
        </div>
      )}
    </div>
  );
}

type ChatProps = {
  initialChatId: string | null;
  temporary: boolean;
  anonymous: boolean;
  onCreated: (chatId: string) => void;
  onMissing: () => void;
  onChange: () => void;
  onNewChat: () => void;
  onAnonymousSend: () => void;
};

function Chat({
  initialChatId,
  temporary,
  anonymous,
  onCreated,
  onMissing,
  onChange,
  onNewChat,
  onAnonymousSend,
}: ChatProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [chatId, setChatId] = useState(initialChatId);

  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState<string>();
  const [think, setThink] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const stateless = anonymous || temporary;

  const appendPart = (type: 'text' | 'reasoning', value: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      const parts = [...last.parts];
      const index = parts.findIndex((p) => p.type === type);

      if (index === -1) parts.push({ type, text: value });
      else parts[index] = { type, text: parts[index].text + value };

      return [...prev.slice(0, -1), { ...last, parts }];
    });
  };

  const readStream = async (response: Response) => {
    const reader = response
      .body!.pipeThrough(new TextDecoderStream())
      .getReader();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += value;
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const raw of events) {
        let type = '';
        let data = '';
        for (const line of raw.split(/\r?\n/)) {
          if (line.startsWith('event:')) type = line.slice(6).trim();
          if (line.startsWith('data:')) data += line.slice(5).trimStart();
        }
        if (!data || data === '[DONE]') continue;

        const parsed = JSON.parse(data);
        if (type === 'chat') {
          setChatId(parsed.id);
          onCreated(parsed.id);
        }
        if (type === 'error') setError(parsed.message);
        if (type === 'delta' && parsed.v) appendPart('text', parsed.v);
        if (type === 'thinking' && parsed.v) appendPart('reasoning', parsed.v);
      }
    }
  };

  const run = async (request: (signal: AbortSignal) => Promise<Response>) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsStreaming(true);
    setError(undefined);

    try {
      const response = await request(controller.signal);

      if (response.status === 204) {
        // Nothing is generating: drop the placeholder (only if still there).
        setMessages((prev) =>
          prev.at(-1)?.parts.length === 0 ? prev.slice(0, -1) : prev,
        );
      } else if (response.status === 404) {
        setChatId(null);
        setMessages([]);
        setError('Chat not found.');
        onMissing();
      } else if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${response.status}`);
      } else {
        await readStream(response);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        setError(
          error instanceof Error ? error.message : 'Something went wrong.',
        );
      }
    } finally {
      controllerRef.current = null;
      setIsStreaming(false);
      onChange();
    }
  };

  const emptyAssistant = (): ChatMessage => ({
    id: crypto.randomUUID(),
    role: 'assistant',
    parts: [],
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    let cancelled = false;

    api('/models')
      .then((res) => res.json())
      .then((data: Model[]) => {
        setModels(data);
        setModel((current) => current ?? data[0]?.id);
      })
      .catch(console.error);

    // Open a saved chat: last page of messages, then reattach to a
    // generation that may still be running.
    if (initialChatId) {
      api(`/chats/${initialChatId}/messages`)
        .then((res) => res.json())
        .then(
          (page: { messages: ChatMessage[]; nextCursor: number | null }) => {
            if (cancelled) return;
            setMessages([...page.messages, emptyAssistant()]);
            setCursor(page.nextCursor);

            // Continue with the model that wrote the last answer.
            const lastModel = page.messages.findLast((m) => m.model)?.model;
            if (lastModel) setModel(lastModel);

            return run((signal) =>
              api(`/chats/${initialChatId}/stream`, { signal }),
            );
          },
        )
        .catch(console.error);
    }

    return () => {
      cancelled = true;
      controllerRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOlder = async () => {
    if (!chatId || !cursor) return;
    const res = await api(`/chats/${chatId}/messages?before=${cursor}`);
    const page: { messages: ChatMessage[]; nextCursor: number | null } =
      await res.json();
    setMessages((prev) => [...page.messages, ...prev]);
    setCursor(page.nextCursor);
  };

  const toInput = (m: ChatMessage) => ({
    role: m.role,
    parts: m.parts.filter((p) => p.type === 'text' && p.text),
  });

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || isStreaming) return;

    if (anonymous) onAnonymousSend();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', text }],
      createdAt: new Date().toISOString(),
    };
    const history = [...messages, userMessage];

    setMessage('');
    setMessages([...history, emptyAssistant()]);

    const body = stateless
      ? {
          temporary: !anonymous,
          model,
          think,
          messages: history.map(toInput).filter((m) => m.parts.length),
        }
      : {
          chatId: chatId ?? undefined,
          model,
          think,
          messages: [toInput(userMessage)],
        };

    await run((signal) =>
      api('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal,
      }),
    );
  };

  // Saved chats keep generating server-side, so stopping is explicit.
  const stop = () => {
    if (!stateless && chatId) {
      api(`/chats/${chatId}/abort`, { method: 'POST' }).catch(console.error);
    } else {
      controllerRef.current?.abort();
    }
  };

  const supportsThinking = models.find((m) => m.id === model)?.thinking
    .supported;
  const limitReached =
    anonymous &&
    messages.filter((m) => m.role === 'user').length >= ANON_MESSAGE_LIMIT;

  return (
    <div>
      <div className="flex gap-4">
        <select
          value={model}
          disabled={isStreaming}
          onChange={(e) => setModel(e.target.value)}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {supportsThinking && (
          <button disabled={isStreaming} onClick={() => setThink(!think)}>
            Think: {think ? 'on' : 'off'}
          </button>
        )}
      </div>

      {cursor && (
        <button onClick={loadOlder} className="mt-5 underline">
          Load older messages
        </button>
      )}

      {messages.map((m) => (
        <div key={m.id} className="mt-5">
          <strong>{m.role === 'user' ? 'You' : 'AI'}</strong>
          {m.parts.map((p, i) =>
            p.type === 'reasoning' ? (
              <div
                key={i}
                className="whitespace-pre-wrap bg-neutral-200 p-2.5 text-neutral-500"
              >
                {p.text}
              </div>
            ) : (
              <Markdown key={i} remarkPlugins={[remarkGfm]}>
                {p.text}
              </Markdown>
            ),
          )}
        </div>
      ))}

      {error && <div className="mt-2 text-red-600">{error}</div>}

      {limitReached ? (
        <div className="mt-5">
          Message limit reached. Sign in to continue, or{' '}
          <button onClick={onNewChat} className="underline">
            start a new chat
          </button>
          .
        </div>
      ) : (
        <div className="mt-5 flex gap-2">
          <input
            value={message}
            disabled={isStreaming}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            className="border-gray-600 border"
          />
          <button
            disabled={isStreaming || !message.trim()}
            onClick={sendMessage}
          >
            Send
          </button>
          {isStreaming && <button onClick={stop}>Abort</button>}
        </div>
      )}
    </div>
  );
}

export default App;

// this shi is completely vibe coded, this will be rebuild in the nearest future anyway
