import { useEffect, useRef, useState } from 'react';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import AuthForm from './components/AuthForm';
import { authClient } from './lib/auth-client';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  error?: string;
};

type Model = {
  id: string;
  name: string;
  thinking: { supported: boolean };
};

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const { data: session } = authClient.useSession();
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="flex h-screen">
      <aside className="flex w-60 flex-col border-r border-gray-300 p-3">
        <div className="flex-1" />
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
        <Chat />
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

function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const [models, setModels] = useState<Model[]>([]);

  const [model, setModel] = useState<string>();
  const [think, setThink] = useState(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/models`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data: Model[]) => {
        setModels(data);
        setModel(data[0]?.id);
      })
      .catch(console.error);

    return () => controllerRef.current?.abort();
  }, []);

  const append = (field: 'content' | 'thinking', value: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        { ...last, [field]: (last[field] ?? '') + value },
      ];
    });
  };

  const setError = (error: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, error }];
    });
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: 'user', content: text };
    const input = [...messages, userMessage];

    setMessage('');
    setIsStreaming(true);
    setMessages([...input, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ model, think, input }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body)
        throw new Error(`Request failed: ${response.status}`);

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
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

          const v = JSON.parse(data).v;
          if (!v) continue;
          if (type === 'delta') append('content', v);
          if (type === 'thinking') append('thinking', v);
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(error);
        setError('Something went wrong.');
      }
    } finally {
      controllerRef.current = null;
      setIsStreaming(false);
    }
  };

  const supportsThinking = models.find((m) => m.id === model)?.thinking
    .supported;

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

      {messages.map((m, i) => (
        <div key={i} className="mt-5">
          <strong>{m.role === 'user' ? 'You' : 'AI'}</strong>
          {m.thinking && (
            <div className="whitespace-pre-wrap bg-neutral-200 p-2.5 text-neutral-500">
              {m.thinking}
            </div>
          )}
          <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
          {m.error && <div className="text-red-600">{m.error}</div>}
        </div>
      ))}

      <div className="mt-5 flex gap-2">
        <input
          value={message}
          disabled={isStreaming}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="border-gray-600 border"
        />
        <button disabled={isStreaming || !message.trim()} onClick={sendMessage}>
          Send
        </button>
        {isStreaming && (
          <button onClick={() => controllerRef.current?.abort()}>Abort</button>
        )}
      </div>
    </div>
  );
}

export default App;
