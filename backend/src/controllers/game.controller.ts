import type { Request, Response, NextFunction } from 'express';
import type { GameService } from '../services/GameService';
import type { AnswerRequest, FeedbackRequest } from '../schemas/request.schema';

export class GameController {
  constructor(private readonly gameService: GameService) {}

  startGame = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.gameService.startGame();
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  answerQuestion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { answer } = req.body as AnswerRequest;
      const result = await this.gameService.answerQuestion(id, answer);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  submitFeedback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { actualName } = req.body as FeedbackRequest;
      await this.gameService.submitFeedback(id, actualName);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  };

  rejectGuess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.gameService.rejectGuess(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getState = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.gameService.getState(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };
}
