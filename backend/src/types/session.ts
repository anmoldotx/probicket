import type { IPLPlayer } from './player';
import type { GuessResult } from './ai';

export type AnswerValue = 'yes' | 'no' | 'maybe' | "don't_know";

export type GameStatus = 'in_progress' | 'guessed' | 'failed';

export interface AskedQuestion {
  question: string;
  answer: AnswerValue;
  attribute: string; // the IPLPlayer field this question targeted
}

export interface GameSession {
  id: string;
  status: GameStatus;
  candidates: IPLPlayer[];
  askedQuestions: AskedQuestion[];
  currentQuestion: string | null;
  currentAttribute: string | null; // attribute targeted by currentQuestion
  guess: GuessResult | null;
  totalPlayersAtStart: number;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}
