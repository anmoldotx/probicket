'use client'

import { useMutation } from '@tanstack/react-query'
import { gameApi } from '@/lib/api/game'
import type { StartGameResult } from '@/types/game'

export function useStartGame(onSuccess: (data: StartGameResult) => void) {
  return useMutation({
    mutationFn: () => gameApi.startGame(),
    retry: 0,
    onSuccess,
  })
}
