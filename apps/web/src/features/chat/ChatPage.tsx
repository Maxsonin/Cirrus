import { useState } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router';
import {
  MessageCircleDashedCheckIcon,
  MessageCircleDashedIcon,
} from 'lucide-react';

import {
  ANON_MESSAGE_LIMIT,
  chatParamsSchema,
  type ModelId,
} from '@cirrus/shared';

import { buttonVariants } from '@/components/ui/button';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

import { ChatInput } from './ChatInput';
import { ChatThread } from './ChatThread';
import { useModels } from './queries';
import { useAnonymousChatLock } from './use-anonymous-chat-lock';
import { useChat } from './use-chat';

type ChatLocationState = {
  /** Keeps the chat mounted when its URL changes from "/" to "/:id" on creation. */
  sessionKey?: string;
  notice?: string;
} | null;

export function ChatPage() {
  const { chatId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const anonymous = !session;
  const state = location.state as ChatLocationState;

  const claimAnonymousChat = useAnonymousChatLock(!isPending && anonymous, () =>
    navigate('/', {
      state: { notice: 'Your chat was continued in another tab.' },
    }),
  );

  if (isPending) return null;

  // Saved chats need a session and a valid id.
  if (
    chatId &&
    (anonymous || !chatParamsSchema.safeParse({ id: chatId }).success)
  ) {
    return <Navigate to="/" replace />;
  }

  // Every navigation starts a fresh chat, except the "/" → "/:id" replace.
  const sessionKey = state?.sessionKey ?? location.key;

  return (
    <ChatView
      key={`${sessionKey}:${session?.user.id ?? 'anonymous'}`}
      sessionKey={sessionKey}
      chatId={chatId ?? null}
      temporary={!anonymous && searchParams.has('temporary')}
      anonymous={anonymous}
      notice={state?.notice}
      onBeforeSend={anonymous ? claimAnonymousChat : undefined}
      onCreated={(id) =>
        navigate(`/${id}`, { replace: true, state: { sessionKey } })
      }
      onMissing={() =>
        navigate('/', { replace: true, state: { notice: 'Chat not found.' } })
      }
    />
  );
}

type ChatViewProps = {
  sessionKey: string;
  chatId: string | null;
  temporary: boolean;
  anonymous: boolean;
  notice?: string;
  onBeforeSend?: () => void;
  onCreated: (chatId: string) => void;
  onMissing: () => void;
};

function ChatView({
  sessionKey,
  chatId,
  temporary,
  anonymous,
  notice,
  onBeforeSend,
  onCreated,
  onMissing,
}: ChatViewProps) {
  const chat = useChat({
    initialChatId: chatId,
    stateless: anonymous || temporary,
    temporary,
    onCreated,
    onMissing,
  });
  const { data: models = [] } = useModels();
  // The open sidebar has its own trigger; on mobile it's a closed sheet here.
  const { isMobile, state } = useSidebar();
  const sidebarHidden = isMobile || state === 'collapsed';

  const [selectedModel, setSelectedModel] = useState<ModelId>();
  const [think, setThink] = useState(false);

  // Continue with the model that wrote the last answer, else the default.
  const model =
    selectedModel ??
    models.find((m) => m.id === chat.lastModel)?.id ??
    models[0]?.id;
  const supportsThinking =
    models.find((m) => m.id === model)?.thinking.supported ?? false;

  const limitReached =
    anonymous &&
    chat.messages.filter((m) => m.role === 'user').length >= ANON_MESSAGE_LIMIT;
  const empty = chat.messages.length === 0 && chat.status === 'ready';
  const status = chat.error ?? (empty ? notice : undefined);
  const showTemporaryToggle = !anonymous && !chatId && empty;

  const handleSubmit = (text: string) => {
    if (!model) return;
    onBeforeSend?.();
    void chat.send(text, { model, think: think && supportsThinking });
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-12 items-center gap-2 px-3 *:pointer-events-auto">
        <SidebarTrigger
          inert={!sidebarHidden}
          className={cn(
            'transition-opacity',
            sidebarHidden ? 'delay-600 duration-300' : 'opacity-0 duration-100',
          )}
        />
        {showTemporaryToggle && (
          <Link
            to={temporary ? '/' : '/?temporary'}
            // Same session: the draft, model and thinking choice survive the switch.
            state={{ sessionKey, notice } satisfies ChatLocationState}
            aria-label="Temporary chat"
            aria-pressed={temporary}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'ml-auto',
              'py-4.5',
            )}
          >
            {temporary ? (
              <MessageCircleDashedCheckIcon />
            ) : (
              <MessageCircleDashedIcon />
            )}
          </Link>
        )}
      </header>

      {empty ? (
        <div className="flex flex-1 items-center justify-center pb-40">
          <h1 className="text-2xl font-medium">What can I help with?</h1>
        </div>
      ) : (
        <ChatThread
          messages={chat.messages}
          status={chat.status}
          hasOlder={chat.hasOlder}
          loadingOlder={chat.loadingOlder}
          onLoadOlder={chat.loadOlder}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
        <div className="pointer-events-auto mx-auto flex max-w-3xl flex-col gap-2">
          {status && (
            <p
              role={chat.error ? 'alert' : 'status'}
              className={cn(
                'text-sm',
                chat.error ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {status}
            </p>
          )}

          {limitReached ? (
            <p className="rounded-3xl border bg-muted/70 p-4 text-sm backdrop-blur-xl dark:bg-white/10">
              Message limit reached. Sign in to continue, or{' '}
              <Link to="/" className="underline underline-offset-4">
                start a new chat
              </Link>
              .
            </p>
          ) : (
            <ChatInput
              models={models}
              model={model}
              onModelChange={setSelectedModel}
              think={think}
              onThinkChange={setThink}
              streaming={chat.status === 'streaming'}
              onSubmit={handleSubmit}
              onStop={chat.stop}
            />
          )}
        </div>
      </div>
    </div>
  );
}
