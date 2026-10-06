import { useEffect, useRef, useState } from 'react';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
};

type Model = {
  id: string;
  name: string;
  provider: string;
  thinking: {
    supported: boolean;
  };
};

type StreamEvent = {
  type: 'delta' | 'thinking' | string;
  data: {
    v?: string;
  };
};

const API_URL = import.meta.env.VITE_API_URL;

const ANIMATION = {
  WORD_DELAY_MS: 50,
  MAX_WORDS_PER_TICK: 2,
} as const;

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [model, setModel] = useState<Model['id']>();
  const [think, setThink] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  /*
   * Text waiting to be displayed.
   *
   * The server can send:
   *
   * "Hello! How can I"
   * " help you today?"
   *
   * We put both into this queue and reveal them gradually.
   */
  const textQueueRef = useRef('');
  const thinkingQueueRef = useRef('');

  const animationTimerRef = useRef<number | null>(null);

  const loadModels = async () => {
    try {
      const response = await fetch(`${API_URL}/models`);

      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.status}`);
      }

      const data: Model[] = await response.json();

      setModels(data);
      setModel(data[0]?.id);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  /*
   * Update the currently streaming assistant message.
   */
  const appendAssistantText = (
    field: 'content' | 'thinking',
    value: string,
  ) => {
    if (!value) {
      return;
    }

    setMessages((previous) => {
      const updated = [...previous];
      const last = updated.length - 1;

      const assistant = updated[last];

      if (!assistant || assistant.role !== 'assistant') {
        return previous;
      }

      updated[last] = {
        ...assistant,
        [field]: (assistant[field] ?? '') + value,
      };

      return updated;
    });
  };

  /*
   * Animates normal assistant text.
   */
  const startTextAnimation = () => {
    if (animationTimerRef.current !== null) {
      return;
    }

    const tick = () => {
      const queue = textQueueRef.current;

      if (!queue) {
        animationTimerRef.current = null;
        return;
      }

      /*
       * Take 1-2 words at a time.
       *
       * This makes the stream feel like it is being generated
       * word-by-word rather than chunk-by-chunk.
       */
      const match = queue.match(/^\s*\S+(?:\s+\S+)?/);

      if (!match) {
        appendAssistantText('content', queue);
        textQueueRef.current = '';
        animationTimerRef.current = null;
        return;
      }

      const text = match[0];

      textQueueRef.current = queue.slice(text.length);

      appendAssistantText('content', text);

      animationTimerRef.current = window.setTimeout(
        tick,
        ANIMATION.WORD_DELAY_MS,
      );
    };

    tick();
  };

  /*
   * Animates thinking text separately.
   */
  const startThinkingAnimation = () => {
    if (animationTimerRef.current !== null) {
      return;
    }

    const tick = () => {
      const queue = thinkingQueueRef.current;

      if (!queue) {
        animationTimerRef.current = null;
        return;
      }

      const match = queue.match(/^\s*\S+(?:\s+\S+)?/);

      if (!match) {
        appendAssistantText('thinking', queue);
        thinkingQueueRef.current = '';
        animationTimerRef.current = null;
        return;
      }

      const text = match[0];

      thinkingQueueRef.current = queue.slice(text.length);

      appendAssistantText('thinking', text);

      animationTimerRef.current = window.setTimeout(
        tick,
        ANIMATION.WORD_DELAY_MS,
      );
    };

    tick();
  };

  /*
   * Parse one SSE event.
   */
  const parseSseEvent = (event: string): StreamEvent | null => {
    const lines = event.split(/\r?\n/);

    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      }

      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (!dataLines.length) {
      return null;
    }

    const data = dataLines.join('\n');

    if (data === '[DONE]') {
      return {
        type: 'done',
        data: {},
      };
    }

    try {
      return {
        type: eventType,
        data: JSON.parse(data),
      };
    } catch {
      console.error('Failed to parse SSE:', data);

      return null;
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isStreaming) {
      return;
    }

    setMessage('');
    setIsStreaming(true);

    /*
     * Reset animation queues for this response.
     */
    textQueueRef.current = '';
    thinkingQueueRef.current = '';

    const controller = new AbortController();

    controllerRef.current = controller;

    const userMessage: Message = {
      role: 'user',
      content: trimmedMessage,
    };

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      thinking: '',
    };

    const nextMessages = [...messages, userMessage, assistantMessage];

    setMessages(nextMessages);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          model,
          think,
          input: [...messages, userMessage],
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();

      /*
       * IMPORTANT:
       *
       * A ReadableStream chunk does not necessarily contain
       * exactly one SSE event.
       *
       * Therefore we keep an SSE buffer across reads.
       */
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        sseBuffer += value;

        const events = sseBuffer.split(/\r?\n\r?\n/);

        sseBuffer = events.pop() ?? '';

        for (const rawEvent of events) {
          if (controller.signal.aborted) {
            break;
          }

          const event = parseSseEvent(rawEvent);

          if (!event) {
            continue;
          }

          /*
           * Normal assistant response.
           */
          if (event.type === 'delta') {
            const content = event.data.v;

            if (!content) {
              continue;
            }

            textQueueRef.current += content;

            startTextAnimation();

            continue;
          }

          /*
           * Model thinking/reasoning.
           */
          if (event.type === 'thinking') {
            const content = event.data.v;

            if (!content) {
              continue;
            }

            thinkingQueueRef.current += content;

            startThinkingAnimation();

            continue;
          }

          /*
           * Stream finished.
           */
          if (event.type === 'done') {
            continue;
          }

          /*
           * Future event types can be handled here.
           *
           * For example:
           *
           * if (event.type === 'tool') {}
           * if (event.type === 'search') {}
           * if (event.type === 'code') {}
           */
          console.log('Unknown stream event:', event);
        }
      }

      /*
       * Make sure the remaining queued text is displayed
       * before the request is considered finished.
       */
      if (textQueueRef.current) {
        appendAssistantText('content', textQueueRef.current);

        textQueueRef.current = '';
      }

      if (thinkingQueueRef.current) {
        appendAssistantText('thinking', thinkingQueueRef.current);

        thinkingQueueRef.current = '';
      }
    } catch (error) {
      if (controller.signal.aborted) {
        console.log('Request aborted');
        return;
      }

      console.error(error);

      setMessages((previous) => {
        const updated = [...previous];
        const last = updated.length - 1;

        if (updated[last]?.role === 'assistant') {
          updated[last] = {
            ...updated[last],
            content: 'Something went wrong.',
          };
        }

        return updated;
      });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }

      setIsStreaming(false);
    }
  };

  const abort = () => {
    controllerRef.current?.abort();
  };

  useEffect(() => {
    loadModels();

    return () => {
      controllerRef.current?.abort();

      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
        }}
      >
        <div>
          Model:{' '}
          <select
            value={model}
            disabled={isStreaming}
            onChange={(event) => setModel(event.target.value)}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          Think:{' '}
          {models.find((item) => item.id === model)?.thinking.supported ? (
            <button
              disabled={isStreaming}
              onClick={() => setThink((previous) => !previous)}
            >
              Think: {think ? 'on' : 'off'}
            </button>
          ) : (
            <span>Not supported</span>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          gap: '15px',
        }}
      >
        {messages.map((item, index) => (
          <div
            key={index}
            style={{
              marginBottom: '20px',
              backgroundColor: item.role === 'user' ? '' : 'lightblue',
              padding: '10px',
              borderRadius: '5px',
            }}
          >
            <strong>{item.role === 'user' ? 'You' : 'AI'}</strong>

            {item.role === 'assistant' && item.thinking && (
              <div
                style={{
                  marginTop: '8px',
                  marginBottom: '12px',
                  padding: '8px 10px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  borderLeft: '3px solid #9ca3af',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  whiteSpace: 'pre-wrap',
                  fontStyle: 'italic',
                }}
              >
                {item.thinking}
              </div>
            )}

            <Markdown remarkPlugins={[remarkGfm]}>{item.content}</Markdown>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginTop: '20px',
        }}
      >
        <input
          type="text"
          value={message}
          disabled={isStreaming}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
        />

        <button disabled={isStreaming || !message.trim()} onClick={sendMessage}>
          Send
        </button>

        {isStreaming && (
          <button
            onClick={abort}
            style={{
              backgroundColor: 'red',
            }}
          >
            Abort
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
