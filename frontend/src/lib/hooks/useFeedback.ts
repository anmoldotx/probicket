'use client'

import { useMutation } from '@tanstack/react-query'
import { gameApi } from '@/lib/api/game'

export function useFeedback(sessionId: string) {
  return useMutation({
    mutationFn: (actualName?: string) =>
      gameApi.submitFeedback(sessionId, actualName),
    retry: 0,
  })
}
