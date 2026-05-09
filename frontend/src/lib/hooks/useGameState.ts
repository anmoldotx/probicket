'use client'

import { useQuery } from '@tanstack/react-query'
import { gameApi } from '@/lib/api/game'

// Only used for session recovery on page reload.
// Normal game flow derives state from mutation responses.
export function useGameState(sessionId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['game', sessionId],
    queryFn: () => gameApi.getState(sessionId!),
    enabled: !!sessionId && enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  })
}
