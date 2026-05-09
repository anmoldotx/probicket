'use client'

import { useMutation } from '@tanstack/react-query'
import { gameApi } from '@/lib/api/game'
import type { RejectGuessResult } from '@/types/game'

export function useRejectGuess(
  sessionId: string,
  onSuccess: (data: RejectGuessResult) => void
) {
  return useMutation({
    mutationFn: () => gameApi.rejectGuess(sessionId),
    retry: 0,
    onSuccess,
  })
}
