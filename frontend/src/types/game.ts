export type AnswerValue = 'yes' | 'no' | 'maybe' | "don't_know"

export type GameStatus = 'in_progress' | 'guessed' | 'failed'

export interface AskedQuestion {
  question: string
  answer: AnswerValue
  attribute: string
}

export interface GuessResult {
  name: string
  team: string
  confidence: number
  reasoning: string
}

export interface StartGameResult {
  sessionId: string
  question: string
  candidateCount: number
  questionNumber: number
}

export interface AnswerResult {
  status: GameStatus
  question?: string
  questionNumber?: number
  candidateCount?: number
  guess?: GuessResult | null
  questionsAsked?: number
}

export interface RejectGuessResult {
  status: 'in_progress'
  question: string
  questionNumber: number
  candidateCount: number
}

export interface GameStateResult {
  sessionId: string
  status: GameStatus
  currentQuestion: string | null
  questionNumber: number
  askedQuestions: AskedQuestion[]
  candidateCount: number
  guess: GuessResult | null
}
