import type { IPLPlayer, AskedQuestion, AnswerValue } from '../types';
import type { QuestionResult, FilterResult, GuessResult } from '../types';

export interface IAIService {
  generateQuestion(
    candidates: IPLPlayer[],
    history: AskedQuestion[]
  ): Promise<QuestionResult>;

  filterCandidates(
    candidates: IPLPlayer[],
    question: string,
    attribute: string,
    answer: AnswerValue,
    history: AskedQuestion[]
  ): Promise<FilterResult>;

  makeGuess(
    candidates: IPLPlayer[],
    history: AskedQuestion[]
  ): Promise<GuessResult>;
}
