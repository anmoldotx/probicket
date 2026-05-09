import { apiClient } from './client'
import type {
  AnswerValue,
  AnswerResult,
  StartGameResult,
  GameStateResult,
  RejectGuessResult,
} from '@/types/game'

export const gameApi = {
  startGame(): Promise<StartGameResult> {
    return apiClient.post<StartGameResult>('/game/start')
  },

  answerQuestion(sessionId: string, answer: AnswerValue): Promise<AnswerResult> {
    return apiClient.post<AnswerResult>(`/game/${sessionId}/answer`, { answer })
  },

  submitFeedback(sessionId: string, actualName?: string): Promise<void> {
    return apiClient.post<void>(`/game/${sessionId}/feedback`, { actualName })
  },

  rejectGuess(sessionId: string): Promise<RejectGuessResult> {
    return apiClient.post<RejectGuessResult>(`/game/${sessionId}/reject-guess`)
  },

  getState(sessionId: string): Promise<GameStateResult> {
    return apiClient.get<GameStateResult>(`/game/${sessionId}/state`)
  },
}
