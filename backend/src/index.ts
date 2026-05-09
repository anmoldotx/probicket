import { config } from './config/env';
import { createSheetsClient } from './utils/sheetsClient';
import { SheetsPlayerRepository } from './repositories/SheetsPlayerRepository';
import { PlayerCacheService } from './services/PlayerCacheService';
import { InMemorySessionStore } from './services/InMemorySessionStore';
import { GeminiAIService } from './services/GeminiAIService';
import { GameService } from './services/GameService';
import { GameController } from './controllers/game.controller';
import { createApp } from './app';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  const sheetsClient = createSheetsClient(config);

  const playerRepository = new SheetsPlayerRepository(
    sheetsClient,
    config.SHEETS_SPREADSHEET_ID,
    config.SHEETS_PLAYERS_TAB
  );

  const playerCache = new PlayerCacheService(playerRepository, config.PLAYER_CACHE_TTL_MS);

  logger.info('Warming player cache...');
  await playerCache.getAll();
  logger.info(`Player cache ready — ${playerCache.count} players loaded`);

  const sessionStore = new InMemorySessionStore();
  const aiService = new GeminiAIService(config);

  const gameService = new GameService(
    playerCache,
    aiService,
    sessionStore,
    playerRepository,
    config.SESSION_TTL_MS
  );

  const gameController = new GameController(gameService);

  const app = createApp(gameController, playerCache, config.ALLOWED_ORIGIN);

  app.listen(config.PORT, () => {
    logger.info(
      `Server running on port ${config.PORT} [${config.NODE_ENV}] with ${playerCache.count} players`
    );
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
