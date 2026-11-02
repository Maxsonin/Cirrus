import { Link } from 'react-router';

import { Spinner } from '@/components/ui/spinner';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useChats } from '@/features/chat/queries';
import { useEffect, useRef } from 'react';

type ChatListProps = {
  userId: string;
  activeChatId: string | undefined;
  onNavigate: () => void;
};

const PREFETCH_OFFSET = 5;

export function ChatList({ userId, activeChatId, onNavigate }: ChatListProps) {
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useChats(userId);
  const chats = data?.pages.flatMap((page) => page.chats) ?? [];

  const sentinelIndex = Math.max(chats.length - PREFETCH_OFFSET, 0);
  const sentinel = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const entry = sentinel.current;
    if (!entry || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void fetchNextPage();
    });
    observer.observe(entry);
    return () => observer.disconnect();
  }, [sentinelIndex, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!chats.length) return null;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat, i) => (
            <SidebarMenuItem
              key={chat.id}
              ref={i === sentinelIndex ? sentinel : undefined}
            >
              <SidebarMenuButton
                isActive={chat.id === activeChatId}
                render={<Link to={`/${chat.id}`} onClick={onNavigate} />}
              >
                <span className="truncate">{chat.title}</span>
              </SidebarMenuButton>

              {chat.generating ? (
                <SidebarMenuBadge>
                  <Spinner className="size-3.5" aria-label="Generating" />
                </SidebarMenuBadge>
              ) : (
                chat.unread && (
                  <SidebarMenuBadge>
                    <span
                      className="size-2 rounded-full bg-primary"
                      aria-label="Unread"
                    />
                  </SidebarMenuBadge>
                )
              )}
            </SidebarMenuItem>
          ))}
          {isFetchingNextPage && (
            <SidebarMenuItem className="flex justify-center py-2">
              <Spinner className="text-muted-foreground" />
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
