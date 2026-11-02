import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { fetchChats, fetchModels } from './api';

const CHATS_POLL_MS = 3000;

export const chatKeys = {
  all: ['chats'] as const,
  list: (userId: string) => [...chatKeys.all, userId] as const,
};

export function useChats(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: chatKeys.list(userId ?? ''),
    queryFn: ({ pageParam }) => fetchChats(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!userId,
    refetchInterval: ({ state }) =>
      state.data?.pages.some((p) => p.chats.some((c) => c.generating))
        ? CHATS_POLL_MS
        : false,
  });
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
    staleTime: Infinity,
  });
}
