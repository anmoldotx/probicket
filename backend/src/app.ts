import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestLogger } from './middleware/requestLogger';
import { globalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { createV1Router } from './routes/v1';
import type { GameController } from './controllers/game.controller';
import type { PlayerCacheService } from './services/PlayerCacheService';

export function createApp(
  gameController: GameController,
  playerCache: PlayerCacheService,
  allowedOrigin: string
): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: allowedOrigin, credentials: true }));
  app.use(express.json());
  app.use(requestLogger);
  app.use(globalLimiter);

  app.use('/api/v1', createV1Router(gameController, playerCache));

  app.use(errorHandler);

  return app;
}
