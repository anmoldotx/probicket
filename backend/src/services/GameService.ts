import { randomUUID } from 'crypto';
import type { IAIService } from '../interfaces/IAIService';
import type { ISessionStore } from '../interfaces/ISessionStore';
import type { PlayerCacheService } from './PlayerCacheService';
import type { SheetsPlayerRepository } from '../repositories/SheetsPlayerRepository';
import type { GameSession, AnswerValue, IPLPlayer } from '../types';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

const MAX_QUESTIONS = 12;
const CONFIDENCE_THRESHOLD = 80;

export interface StartGameResult {
  sessionId: string;
  question: string;
  candidateCount: number;
  questionNumber: number;
}

export interface AnswerResult {
  status: GameSession['status'];
  question?: string;
  questionNumber?: number;
  candidateCount?: number;
  guess?: GameSession['guess'];
  questionsAsked?: number;
}

export interface RejectGuessResult {
  status: 'in_progress';
  question: string;
  questionNumber: number;
  candidateCount: number;
}

export interface GameStateResult {
  sessionId: string;
  status: GameSession['status'];
  currentQuestion: string | null;
  questionNumber: number;
  askedQuestions: GameSession['askedQuestions'];
  candidateCount: number;
  guess: GameSession['guess'];
}

export class GameService {
  constructor(
    private readonly playerCache: PlayerCacheService,
    private readonly aiService: IAIService,
    private readonly sessionStore: ISessionStore,
    private readonly repository: SheetsPlayerRepository,
    private readonly sessionTtlMs: number
  ) {}

  async startGame(): Promise<StartGameResult> {
    const players = await this.playerCache.getAll();
    if (players.length === 0) {
      throw new AppError(503, 'NO_PLAYERS_AVAILABLE');
    }

    const { question, attribute } = await this.aiService.generateQuestion(players, []);

    const now = Date.now();
    const session: GameSession = {
      id: randomUUID(),
      status: 'in_progress',
      candidates: players,
      askedQuestions: [],
      currentQuestion: question,
      currentAttribute: attribute,
      guess: null,
      totalPlayersAtStart: players.length,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.sessionTtlMs,
    };

    await this.sessionStore.create(session);
    logger.info({ sessionId: session.id, players: players.length }, 'Game started');

    return {
      sessionId: session.id,
      question,
      candidateCount: players.length,
      questionNumber: 1,
    };
  }

  async answerQuestion(sessionId: string, answer: AnswerValue): Promise<AnswerResult> {
    const session = await this.requireSession(sessionId);

    if (session.status !== 'in_progress') {
      throw new AppError(400, 'GAME_ALREADY_ENDED');
    }
    if (!session.currentQuestion || !session.currentAttribute) {
      throw new AppError(400, 'NO_CURRENT_QUESTION');
    }

    const { remainingIds, confidencePercent } = await this.aiService.filterCandidates(
      session.candidates,
      session.currentQuestion,
      session.currentAttribute,
      answer,
      session.askedQuestions
    );

    const candidateMap = new Map<string, IPLPlayer>(
      session.candidates.map((p) => [p.id, p])
    );
    const remaining = remainingIds
      .map((id) => candidateMap.get(id))
      .filter((p): p is IPLPlayer => p !== undefined);

    const updatedHistory = [
      ...session.askedQuestions,
      { question: session.currentQuestion, answer, attribute: session.currentAttribute },
    ];

    const shouldGuess =
      confidencePercent >= CONFIDENCE_THRESHOLD ||
      remaining.length === 1 ||
      updatedHistory.length >= MAX_QUESTIONS;

    if (remaining.length === 0) {
      await this.sessionStore.update(sessionId, {
        status: 'failed',
        candidates: remaining,
        askedQuestions: updatedHistory,
        currentQuestion: null,
        currentAttribute: null,
      });
      return { status: 'failed', questionsAsked: updatedHistory.length };
    }

    if (shouldGuess) {
      const guess = await this.aiService.makeGuess(remaining, updatedHistory);
      await this.sessionStore.update(sessionId, {
        status: 'guessed',
        candidates: remaining,
        askedQuestions: updatedHistory,
        currentQuestion: null,
        currentAttribute: null,
        guess,
      });
      logger.info(
        { sessionId, guess: guess.name, questions: updatedHistory.length },
        'Game guessed'
      );
      return { status: 'guessed', guess, questionsAsked: updatedHistory.length };
    }

    const { question: nextQuestion, attribute: nextAttribute } =
      await this.aiService.generateQuestion(remaining, updatedHistory);

    await this.sessionStore.update(sessionId, {
      candidates: remaining,
      askedQuestions: updatedHistory,
      currentQuestion: nextQuestion,
      currentAttribute: nextAttribute,
    });

    return {
      status: 'in_progress',
      question: nextQuestion,
      questionNumber: updatedHistory.length + 1,
      candidateCount: remaining.length,
    };
  }

  async rejectGuess(sessionId: string): Promise<RejectGuessResult> {
    const session = await this.requireSession(sessionId);

    if (session.status !== 'guessed') {
      throw new AppError(400, 'NOT_IN_GUESSED_STATE');
    }

    if (session.askedQuestions.length >= MAX_QUESTIONS) {
      throw new AppError(400, 'MAX_QUESTIONS_REACHED');
    }

    const { question, attribute } = await this.aiService.generateQuestion(
      session.candidates,
      session.askedQuestions
    );

    await this.sessionStore.update(sessionId, {
      status: 'in_progress',
      guess: null,
      currentQuestion: question,
      currentAttribute: attribute,
    });

    logger.info(
      { sessionId, questionsAsked: session.askedQuestions.length },
      'Guess rejected — continuing game'
    );

    return {
      status: 'in_progress',
      question,
      questionNumber: session.askedQuestions.length + 1,
      candidateCount: session.candidates.length,
    };
  }

  async submitFeedback(sessionId: string, actualName?: string): Promise<void> {
    const session = await this.requireSession(sessionId);

    const row = [
      [
        sessionId,
        new Date().toISOString(),
        session.guess?.name ?? '',
        actualName ?? '',
        JSON.stringify(session.askedQuestions),
        String(session.candidates.length),
      ],
    ];

    await this.repository.appendFeedbackRow(row);
    logger.info({ sessionId, actualName }, 'Feedback recorded');
  }

  async getState(sessionId: string): Promise<GameStateResult> {
    const session = await this.requireSession(sessionId);
    return {
      sessionId: session.id,
      status: session.status,
      currentQuestion: session.currentQuestion,
      questionNumber: session.askedQuestions.length + 1,
      askedQuestions: session.askedQuestions,
      candidateCount: session.candidates.length,
      guess: session.guess,
    };
  }

  private async requireSession(sessionId: string): Promise<GameSession> {
    const session = await this.sessionStore.get(sessionId);
    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND');
    }
    return session;
  }
}
