'use client'

import { useMutation } from '@tanstack/react-query'
import { gameApi } from '@/lib/api/game'
import type { AnswerValue, AnswerResult } from '@/types/game'

export function useAnswerQuestion(
  sessionId: string,
  onSuccess: (data: AnswerResult) => void
) {
  return useMutation({
    mutationFn: (answer: AnswerValue) =>
      gameApi.answerQuestion(sessionId, answer),
    retry: 0,
    onSuccess,
  })
}
