import type { IPlayerRepository } from '../interfaces/IPlayerRepository';
import type { IPLPlayer } from '../types';
import { logger } from '../utils/logger';

export class PlayerCacheService {
  private cache: IPLPlayer[] = [];
  private lastFetchedAt = 0;

  constructor(
    private readonly repository: IPlayerRepository,
    private readonly ttlMs: number
  ) {}

  async getAll(): Promise<IPLPlayer[]> {
    const isStale = Date.now() - this.lastFetchedAt >= this.ttlMs;
    if (!isStale && this.cache.length > 0) {
      return this.cache;
    }

    logger.info('Refreshing player cache from Sheets');
    this.cache = await this.repository.getAllPlayers();
    this.lastFetchedAt = Date.now();
    return this.cache;
  }

  get count(): number {
    return this.cache.length;
  }
}
