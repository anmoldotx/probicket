import { Router } from 'express';
import type { GameController } from '../controllers/game.controller';
import type { PlayerCacheService } from '../services/PlayerCacheService';
import { validateBody } from '../middleware/validateBody';
import { startGameLimiter, answerLimiter } from '../middleware/rateLimiter';
import { AnswerRequestSchema, FeedbackRequestSchema } from '../schemas/request.schema';

export function createV1Router(
  gameController: GameController,
  playerCache: PlayerCacheService
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', playersLoaded: playerCache.count });
  });

  // Warmup endpoint — call this from a cron job (e.g. every 10 min on Render free tier)
  // to prevent cold starts and ensure the player cache is populated.
  router.get('/warmup', async (_req, res) => {
    const before = playerCache.count;
    await playerCache.getAll();           // forces a cache refresh if stale
    const after = playerCache.count;
    res.json({
      status: 'warm',
      playersLoaded: after,
      cacheRefreshed: before === 0 && after > 0,
      timestamp: new Date().toISOString(),
    });
  });

  router.post('/game/start', startGameLimiter, gameController.startGame);

  router.post(
    '/game/:id/answer',
    answerLimiter,
    validateBody(AnswerRequestSchema),
    gameController.answerQuestion
  );

  router.post(
    '/game/:id/feedback',
    validateBody(FeedbackRequestSchema),
    gameController.submitFeedback
  );

  router.post('/game/:id/reject-guess', answerLimiter, gameController.rejectGuess);

  router.get('/game/:id/state', gameController.getState);

  return router;
}
